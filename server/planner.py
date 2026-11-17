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
    if kind == "goal_edit":
        goal = next((g for g in E.goals(s) if g["id"] == p.goal), None)
        if not goal:
            raise G.GuardrailError("That goal doesn't exist.",
                                   [G.check("input", "Input validation", False, f"unknown goal '{p.goal}'")], 422)
        new = copy.deepcopy(s)
        override = dict(new["goal_overrides"].get(p.goal, {}))
        if p.target is not None:
            override["target"] = E.r2(p.target)
        if p.goal_date is not None:
            override["goal_date"] = _future_date(p.goal_date)
        if override:
            new["goal_overrides"][p.goal] = override
        # Her own number replaces any temporary change or skipped payday on this goal
        new["autosave"][p.goal] = E.r2(p.per_payday)
        new["temp_autosave"] = [t for t in new["temp_autosave"] if t["account"] != p.goal]
        new["skips"] = [x for x in new["skips"] if x["account"] != p.goal]
        return (new, f"{goal['name']}: your changes", "You set these yourself",
                {"goal": goal["name"], "amount_before": E.money(goal["per_payday"]), "amount_now": E.money(p.per_payday)})
    if kind == "goal_create":
        # A new goal saver of Mia's own: starts at $0, with an auto-save every payday from Everyday
        new = copy.deepcopy(s)
        gid = E.new_goal_id(new, p.name)
        new.setdefault("new_goals", []).append({
            "id": gid, "name": p.name.strip(), "target": E.r2(p.target),
            "goal_date": _future_date(p.goal_date) if p.goal_date else None})
        new["autosave"][gid] = E.r2(p.per_payday)
        return (new, f"New goal: {p.name.strip()}", f"{E.money(p.target)} · {E.money(p.per_payday)} each payday",
                {"goal": p.name.strip(), "target": E.money(p.target), "each_payday": E.money(p.per_payday)})
    raise KeyError(kind)


def _future_date(value: str) -> str:
    """A goal's target date must be a real date after today (and within 30 years)."""
    try:
        when = E._d(value)
    except ValueError:
        when = None
    if not when or when <= E.TODAY or when.year > E.TODAY.year + 30:
        raise G.GuardrailError("Pick a target date in the future.",
                               [G.check("input", "Input validation", False, f"target date '{value}' isn't a future date")], 422)
    return when.isoformat()


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
    elif kind in ("goal_invite", "goal_member_accept", "goal_member_remove"):
        goal = next((g for g in E.goals(s) if g["id"] == parsed.goal), None)
        if not goal:
            checks.append(G.check("input", "Input validation", False, f"unknown goal '{parsed.goal}'"))
            raise G.GuardrailError("That goal doesn't exist.", checks, 422)
        members = s["shared_goals"].setdefault(parsed.goal, [])
        who = G.masked_payee(parsed) if kind == "goal_invite" else parsed.name.strip()
        member = next((m for m in members if m["name"].lower() == who.lower()), None)
        if kind == "goal_invite":
            if member or len(members) >= 5:
                why = f"{who} is already on this goal" if member else "A goal can have up to 5 other people"
                checks.append(G.check("input", "Input validation", False, why))
                raise G.GuardrailError(why + ".", checks, 422)
            members.append({"name": who, "per_payday": E.r2(parsed.per_payday), "status": "invited"})
            title = f"Invited {who} to save for {goal['name']} together"
        elif not member:
            checks.append(G.check("input", "Input validation", False, f"{who} isn't on this goal"))
            raise G.GuardrailError(f"{who} isn't on this goal.", checks, 422)
        elif kind == "goal_member_accept":
            member["status"] = "joined"
            title = f"{member['name']} joined {goal['name']}"
        else:
            members.remove(member)
            title = f"Removed {member['name']} from {goal['name']}"
        checks.append(G.check("engine", "Sharing boundary", True,
                              "They only see this goal. No other account or transaction is shared."))
    elif kind == "capsule_write":
        try:
            when = E._d(parsed.open_date)
        except ValueError:
            when = None
        if not when or when <= E.TODAY or when.year > E.TODAY.year + 40:
            checks.append(G.check("input", "Input validation", False, "The opening date has to be in the future"))
            raise G.GuardrailError("Pick an opening date in the future.", checks, 422)
        text, removed = G._CARD_OR_ACCOUNT.subn("[number removed]", parsed.text.strip())
        checks.append(G.check("input", "Private details", True, f"Removed {removed} card or account numbers" if removed else "No card or account numbers"))
        seen = E.capsule_check(s, text, when.isoformat())  # goal or message, and which goal it is about
        s.setdefault("capsules", []).append({"id": uuid.uuid4().hex[:8], "open_date": when.isoformat(), "year": when.year,
                                             "text": text, "written": E.TODAY.isoformat(), "opened": False,
                                             "answer": None, "from": parsed.from_name,
                                             "kind": parsed.kind or seen["kind"],
                                             "goal_id": parsed.goal_id if parsed.kind else (seen["goal"] or {}).get("id")})
        title = (f"{parsed.from_name} sent you a note for {E.short_date(when)} {when.year}" if parsed.from_name
                 else f"Wrote a note to yourself for {E.short_date(when)} {when.year}")
    elif kind == "capsule_delete":
        cap = next((c for c in s.get("capsules", []) if c["id"] == parsed.id), None)
        if not cap:
            checks.append(G.check("input", "Input validation", False, "No such note"))
            raise G.GuardrailError("That note doesn't exist.", checks, 422)
        if not cap["opened"]:
            checks.append(G.check("input", "Input validation", False, "Sealed notes can't be deleted before they open"))
            raise G.GuardrailError("You can only delete a note after you've opened it.", checks, 409)
        s["capsules"].remove(cap)
        title = f"Deleted your {cap['year']} note"
    elif kind in ("capsule_open", "capsule_answer"):
        cap = next((c for c in s.get("capsules", []) if c["id"] == parsed.id), None)
        if not cap:
            checks.append(G.check("input", "Input validation", False, "No such note"))
            raise G.GuardrailError("That note doesn't exist.", checks, 422)
        if kind == "capsule_open":
            cap["opened"] = True
            title = f"Opened your note for {cap['year']}"
        else:
            if not cap["opened"]:
                checks.append(G.check("input", "Input validation", False, "The note is still sealed"))
                raise G.GuardrailError("Open the note first.", checks, 409)
            cap["answer"] = parsed.answer
            reply = G._CARD_OR_ACCOUNT.sub("[number removed]", (parsed.reply or "").strip())
            cap["reply"] = reply or None
            title = f"Answered your {cap['year']} note"
    elif kind == "consent":
        s["consent"][parsed.key] = parsed.on
        title = f"Turned {S.CONSENT_LABELS[parsed.key].lower()} {'on' if parsed.on else 'off'}"
    if record:
        S.record(s, before, kind, title)
    S.save(s)
    checks.append(G.check("approve", "Plan state updated", True, title))
    return {"title": title, "checks": checks}
