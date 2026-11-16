"""Coordinates one change from request to plan state (the middle of the architecture diagram).

propose(): input guardrails -> Python engine works out the new plan -> output guardrails (financial checks)
           -> AI model explains it -> output guardrails (safe response) -> held until Mia approves.
approve(): the plan state is updated. Only the simulated plan; no money moves.
act():     small confirmations that don't need a review screen (e.g. "yes, Spotify is a regular payment").
"""

from __future__ import annotations

import copy
import hashlib
import json
import uuid

import engine as E
import guardrails as G
import state as S
import windy_ai

_pending: dict[str, dict] = {}


def _fingerprint(s: dict) -> str:
    return hashlib.sha1(json.dumps(S.snapshot_before(s), sort_keys=True).encode()).hexdigest()


def _build(kind: str, p, s: dict) -> tuple[dict, str, str, dict]:
    """Returns (new_state, title, subtitle, extra facts for the AI)."""
    if kind == "goal_plan":
        t = E.tradeoff_options(s)
        if t["no_conflict"]:
            raise G.GuardrailError("Your new rent costs less than before, so no goal needs to change.",
                                   [G.check("output", "Something changes", False, "No rent rise to cover")], 409)
        name = E.TRADEOFF_WEIGHTS[p.option][0]
        return (E.tradeoff_state(s, p.option), f"Plan {p.option} · {name}",
                E.TRADEOFF_WEIGHTS[p.option][2],
                {"rent_rise": E.money(t["rent_rise_per_fortnight"]), "rent_now_per_fortnight": E.money(t["rent_per_fortnight"]),
                 "rent_before_per_fortnight": E.money(t["old_rent_per_fortnight"])})
    if kind == "japan_sooner":
        j = E.japan_sooner(s, p.variant)
        return (E.japan_state(s, p.variant), f"Japan by {E.month_year(j['trip_by'])}",
                "Uses the Bali fund" if p.variant == "bali" else "Leaves the Bali fund alone",
                {"still_needed": E.money(j["needed"]), "paydays": j["paydays"], "trip_by": E.short_date(j["trip_by"]),
                 "moved_from_bali": E.money(j["from_bali"]), "redirected_from_home_each_payday": E.money(j["from_home_per"]),
                 "extra_from_everyday_each_payday": E.money(j["from_everyday_per"]), "spare": E.money(j["spare"])})
    if kind == "shortfall_fix":
        new = s
        for f in p.fixes:
            new = E.apply_fix(new, f)
        return (new, "Stay above $0 before payday", ", ".join(E.FIX_LABELS[f] for f in p.fixes),
                {"fixes": [E.FIX_LABELS[f] for f in p.fixes], "next_payday": E.short_date(E.NEXT_PAY)})
    if kind == "insurance_topup":
        ins = E.yearly_bills(s)["insurance"]
        return (E.insurance_state(s), "Cover the insurance renewal",
                f"Renews {E.short_date(ins['due'])} at {E.money(ins['now'])}, up from {E.money(ins['was'])}",
                {"renewal_now": E.money(ins["now"]), "renewal_last_year": E.money(ins["was"]), "rise_percent": ins["pct"]})
    if kind == "budget":
        new = copy.deepcopy(s)
        new["budgets"][p.category] = p.weekly
        return (new, f"{p.category} limit: {E.money(p.weekly)} a week",
                f"You've averaged {E.money(round(E.EATING_OUT_DAILY * 7))} a week lately",
                {"limit_weekly": E.money(p.weekly), "average_weekly": E.money(round(E.EATING_OUT_DAILY * 7))})
    raise KeyError(kind)


def propose(kind: str, params: dict) -> dict:
    s = S.load()
    parsed, checks = G.check_input(kind, params, s, G.PROPOSALS)
    new, title, subtitle, facts = _build(kind, parsed, s)
    checks.append(G.check("engine", "Python engine", True, "Worked out the new plan, goal dates and 5-week forecast"))
    changes, same = E.diff(s, new)
    out_checks = G.check_proposal(s, new, changes, E)
    checks += out_checks
    if not all(c["ok"] for c in out_checks):
        raise G.GuardrailError("Windy stopped this plan because it failed a safety check.", checks, 409)
    ai = windy_ai.explain(kind, title, changes, same, facts)
    checks.append(G.check("ai", "AI model", True, ai["note"]))
    checks += ai["checks"]
    pid = uuid.uuid4().hex[:10]
    _pending[pid] = {"kind": kind, "params": params, "new": new, "fingerprint": _fingerprint(s),
                     "title": title, "changes": changes}
    S.log_usage(s, kind, f"Summaries for: {title}")
    S.save(s)
    return {"id": pid, "kind": kind, "params": params, "title": title, "subtitle": subtitle, "changes": changes,
            "unchanged": same, "explanation": ai["text"], "explanation_source": ai["source"], "checks": checks}


def approve(pid: str) -> dict:
    p = _pending.pop(pid, None)
    if not p:
        raise G.GuardrailError("This proposal has expired. Please review it again.",
                               [G.check("output", "Proposal still valid", False, "Unknown or already used")], 404)
    s = S.load()
    if _fingerprint(s) != p["fingerprint"]:
        raise G.GuardrailError("Your plan changed since you reviewed this. Please review it again.",
                               [G.check("output", "Plan unchanged since review", False, "Plan state moved on")], 409)
    before = S.snapshot_before(s)
    new = p["new"]
    new["history"], new["usage"] = s["history"], s["usage"]
    entry = S.record(new, before, p["kind"], p["title"], p["changes"])
    S.save(new)
    return {"entry": {k: v for k, v in entry.items() if k != "before"},
            "checks": [G.check("approve", "Customer approved", True, "Only the simulated plan was updated")]}


def act(kind: str, params: dict) -> dict:
    s = S.load()
    parsed, checks = G.check_input(kind, params, s, G.ACTIONS)
    before = S.snapshot_before(s)
    title, record = "", True
    if kind == "life_event_confirm":
        s["life_event"] = {"status": "confirmed", "rent_frequency": parsed.rent_frequency}
        title = f"Confirmed you moved home (rent {parsed.rent_frequency})"
    elif kind == "life_event_dismiss":
        s["life_event"] = {"status": "dismissed", "rent_frequency": None}
        title = "Told Windy you're not moving"
    elif kind == "recurring_confirm":
        s["recurring"]["confirmed"].append(parsed.merchant)
        title = f"Added {parsed.merchant} to regular payments"
    elif kind == "recurring_dismiss":
        s["recurring"]["dismissed"].append(parsed.merchant)
        title = f"{parsed.merchant} isn't a regular payment"
    elif kind == "receipt_save":
        if parsed.receipt_id not in s["receipts_reviewed"]:
            s["receipts_reviewed"].append(parsed.receipt_id)
        title = "Saved a receipt breakdown"
    elif kind == "quick_split":
        s["splits"][parsed.shop_id] = [r.model_dump() for r in parsed.rows]
        title = "Saved what was in a shop"
    elif kind == "dismiss_card":
        s["dismissed_cards"].append(parsed.card)
        title, record = f"Hid the {parsed.card.replace('-', ' ')} card", True
    elif kind == "consent":
        s["consent"][parsed.key] = parsed.on
        title = f"Turned {S.CONSENT_LABELS[parsed.key].lower()} {'on' if parsed.on else 'off'}"
    if record:
        S.record(s, before, kind, title)
    S.save(s)
    checks.append(G.check("approve", "Plan state updated", True, title))
    return {"title": title, "checks": checks}
