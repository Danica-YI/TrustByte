"""AI Model: interprets the context and explains the engine's results (the brain box in the architecture).

Claude gets a short summary of the proposed change (never raw transactions or account numbers) and writes
2 to 3 plain sentences on why it fits. The output guardrails then check those sentences. If there's no API key,
the network is down, the call is slow, or the text fails a check, Windy uses a template built from the same
numbers, so the demo never breaks.
"""

from __future__ import annotations

import json
import os

import anthropic

import guardrails as G

MODEL = os.environ.get("WINDY_EXPLAIN_MODEL") or os.environ.get("WINDY_MODEL", "claude-opus-5-5")
TIMEOUT = float(os.environ.get("WINDY_EXPLAIN_TIMEOUT", "20"))

SYSTEM = """You are Windy, the assistant inside a demo of the Westpac app. Mia is looking at a change to her
savings plan that a calculator has already worked out. Explain it to her.

Rules:
- 2 or 3 short sentences, plain English, for a phone screen. No lists, headings or bold.
- Use only figures and dates that appear in the facts. Don't calculate anything new.
- Say what she gains and what it costs her. Don't tell her what to do: she decides.
- Never recommend a product, provider or lender. Never mention health, diet or lifestyle.
- No money moves when she approves; only her plan changes. You may say so."""


NOTE_SYSTEM = """You sort short notes that a bank customer writes to her future self. Reply with JSON only:
{"kind": "goal" or "question" or "message", "goal_id": one of the given goal ids or null}
"goal" means she wants to achieve, buy, save for or become something. "question" means she is asking for a fact
or a figure, such as how much she could save. "message" is anything else, such as encouragement or a memory. Pick a goal_id only if the note is clearly about that existing goal."""


def classify_note(text: str, goal_names: dict[str, str]) -> dict | None:
    """Ask Claude whether a note is a goal and which existing goal it is about. None if unavailable or unclear."""
    if not _has_key():
        return None
    try:
        client = anthropic.Anthropic(timeout=min(TIMEOUT, 8), max_retries=0)
        resp = client.messages.create(
            model=MODEL, max_tokens=100, system=NOTE_SYSTEM,
            messages=[{"role": "user", "content": json.dumps({"note": text, "goals": goal_names}, ensure_ascii=False)}],
            output_config={"effort": "low"},
        )
        raw = "".join(b.text for b in resp.content if b.type == "text").strip()
        data = json.loads(raw[raw.index("{"): raw.rindex("}") + 1])
        if data.get("kind") not in ("goal", "question", "message") or data.get("goal_id") not in (None, *goal_names):
            return None
        return {"kind": data["kind"], "goal_id": data.get("goal_id")}
    except Exception:  # network, auth, timeout, odd JSON: the rules answer stands
        return None


def _has_key() -> bool:
    return bool(os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN"))


def template(kind: str, title: str, changes: list[dict], facts: dict) -> str:
    by = {c["label"]: c for c in changes}
    bits = []
    if kind == "goal_plan":
        bits.append(f"Your rent is up {facts.get('rent_rise', '')} a fortnight, so your auto-saves have to cover it.")
    if kind == "japan_sooner":
        bits.append("You asked for Japan within 3 months, so Windy used money set aside for plans that aren't due soon "
                    "before touching your everyday money.")
    if kind == "shortfall_fix":
        bits.append("These changes keep Everyday from going below zero before your next pay.")
    if kind == "insurance_topup":
        bits.append("Your car insurance renewal went up, so the Bills set-aside needs a little more each payday.")
    if kind == "goal_edit":
        bits.append(f"You edited {facts.get('goal', 'this goal')} yourself.")
    if kind == "goal_create":
        bits.append(f"You're adding a new goal, {facts.get('goal', '')}, saving {facts.get('each_payday', '')} each payday.")
    if kind == "budget":
        bits.append("A weekly Eating out limit lowers the usual spending Windy plans for.")
    if "Everyday lowest point" in by:
        c = by["Everyday lowest point"]
        bits.append(f"Your lowest Everyday balance goes from {c['from']} to {c['to']}.")
    for g in ("Japan trip", "Home deposit", "Bali 2027"):
        c = by.get(f"{g} reached")
        if c:
            bits.append(f"{g} moves from {c['from']} to {c['to']}.")
            break
    bits.append("Nothing moves until you approve, and you can undo it.")
    return " ".join(bits)


def explain(kind: str, title: str, changes: list[dict], same: list[dict], facts: dict) -> dict:
    """Returns {"text", "source": "claude" | "template", "checks": [...], "note"}."""
    payload = {"change": title, "what_changes": changes, "stays_the_same": same, **facts}
    facts_text = json.dumps(payload, ensure_ascii=False)
    fallback = template(kind, title, changes, facts)

    if not _has_key():
        _, checks = G.check_explanation(fallback, facts_text + " 0")
        return {"text": fallback, "source": "template", "checks": checks,
                "note": "No API key on the server, so Windy used its built-in template."}
    try:
        client = anthropic.Anthropic(timeout=TIMEOUT, max_retries=1)
        resp = client.messages.create(
            model=MODEL, max_tokens=600, system=SYSTEM,
            messages=[{"role": "user", "content": "Facts (JSON):\n" + facts_text}],
            output_config={"effort": "low"},
        )
        text = "".join(b.text for b in resp.content if b.type == "text").strip()
    except Exception as e:  # network, auth, timeout: never break the demo
        _, checks = G.check_explanation(fallback, facts_text + " 0")
        return {"text": fallback, "source": "template", "checks": checks,
                "note": f"AI model unavailable ({type(e).__name__}), so Windy used its built-in template."}

    ok, checks = G.check_explanation(text, facts_text)
    if ok:
        return {"text": text, "source": "claude", "checks": checks, "note": f"Written by {MODEL}"}
    _, tchecks = G.check_explanation(fallback, facts_text + " 0")
    checks.append(G.check("output", "Replaced with safe template", True, "The AI's reply failed a check above"))
    return {"text": fallback, "source": "template", "checks": checks + tchecks[1:2],
            "note": "The AI's reply failed an output check, so Windy used its built-in template."}
