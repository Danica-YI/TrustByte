"""Input and output guardrails (the two shield boxes in the architecture).

Input guardrails run before anything is calculated:
  - Validation: the request has the right shape and sensible values (pydantic models below).
  - Permissions: Windy can only change the simulated plan. Anything else is refused.
  - Consent: each feature checks Mia's consent switch first. Off means off.

Output guardrails run before anything reaches the screen:
  - Schema: the proposal has every field the app needs, with real numbers.
  - Financial checks: the emergency fund isn't touched, no account goes below $0, moves between Mia's
    own accounts add up to zero, and no money leaves her accounts.
  - Safe responses: the AI's explanation only uses numbers the engine produced, stays short, and
    doesn't recommend products or talk about health. If it fails, a safe template is used instead.

Every check is returned to the app so the "behind the scenes" panel can show it.
"""

from __future__ import annotations

import math
import re
from typing import Literal

from pydantic import BaseModel, Field, ValidationError


# ------------------------------------------------------------------ input: request shapes

class GoalPlan(BaseModel):
    option: Literal["A", "B", "C"]


class JapanSooner(BaseModel):
    variant: Literal["bali", "home"]


class ShortfallFix(BaseModel):
    fixes: list[Literal["skip-life", "eating-out", "hold-subs"]] = Field(min_length=1, max_length=3)


class InsuranceTopup(BaseModel):
    pass


class Budget(BaseModel):
    category: Literal["Eating out"]
    weekly: float = Field(ge=10, le=500)


class GoalEdit(BaseModel):
    goal: str = Field(pattern=r"^goal-[a-z]+$")
    per_payday: float = Field(ge=0, le=2000)
    target: float | None = Field(default=None, ge=50, le=1_000_000)
    goal_date: str | None = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$")


class LifeEventConfirm(BaseModel):
    rent_frequency: Literal["weekly", "fortnightly", "monthly"]


class Empty(BaseModel):
    pass


class Merchant(BaseModel):
    merchant: str = Field(min_length=1, max_length=80)


class ReceiptSave(BaseModel):
    receipt_id: str = Field(pattern=r"^rcpt-[a-z0-9-]+$")


class SplitRow(BaseModel):
    name: str = Field(min_length=1, max_length=40)
    amount: float | None = Field(default=None, ge=0, le=10000)


class QuickSplit(BaseModel):
    shop_id: str = Field(min_length=1, max_length=40)
    rows: list[SplitRow] = Field(max_length=12)


class DismissCard(BaseModel):
    card: Literal["life-event", "commitments", "grocery-check"]


class Consent(BaseModel):
    key: str
    on: bool


class GoalInvite(BaseModel):
    goal: str = Field(pattern=r"^goal-[a-z]+$")
    name: str = Field(min_length=1, max_length=30, pattern=r"^[A-Za-z][A-Za-z .'-]*$")
    per_payday: float = Field(ge=0, le=2000)


class GoalMember(BaseModel):
    goal: str = Field(pattern=r"^goal-[a-z]+$")
    name: str = Field(min_length=1, max_length=30)


# kind -> (model, consent key needed, needs Mia's approval?)
PROPOSALS = {
    "goal_plan": (GoalPlan, "goals"),
    "japan_sooner": (JapanSooner, "goals"),
    "shortfall_fix": (ShortfallFix, "cash_flow"),
    "insurance_topup": (InsuranceTopup, "regular_payments"),
    "budget": (Budget, "spending_insights"),
    # Mia sets a goal's auto-save herself (goal detail screen)
    "goal_edit": (GoalEdit, "goals"),
}
ACTIONS = {
    "life_event_confirm": (LifeEventConfirm, "life_events"),
    "life_event_dismiss": (Empty, "life_events"),
    "recurring_confirm": (Merchant, "regular_payments"),
    "recurring_dismiss": (Merchant, "regular_payments"),
    "receipt_save": (ReceiptSave, "receipts"),
    "quick_split": (QuickSplit, "receipts"),
    "dismiss_card": (DismissCard, None),
    "consent": (Consent, None),
    # Joint savings: invite someone to a goal, (demo) they accept, or remove them
    "goal_invite": (GoalInvite, "goals"),
    "goal_member_accept": (GoalMember, "goals"),
    "goal_member_remove": (GoalMember, "goals"),
}


class GuardrailError(Exception):
    def __init__(self, message: str, checks: list[dict], status: int = 400):
        super().__init__(message)
        self.message, self.checks, self.status = message, checks, status


def check(layer: str, name: str, ok: bool, detail: str = "") -> dict:
    return {"layer": layer, "name": name, "ok": ok, "detail": detail}


def check_input(kind: str, params: dict, state: dict, table: dict) -> tuple[BaseModel, list[dict]]:
    checks = []
    if kind not in table:
        checks.append(check("input", "Permission", False,
                            f"'{kind}' isn't something Windy is allowed to do. It can only update your simulated plan."))
        raise GuardrailError("Windy can't do that. It can only update your simulated plan.", checks, 403)
    checks.append(check("input", "Permission", True, "Only changes the simulated plan. No money moves."))
    model, consent_key = table[kind]
    if consent_key:
        on = state["consent"].get(consent_key, False)
        checks.append(check("input", "Consent", on, f"'{consent_key}' is {'on' if on else 'off'}"))
        if not on:
            raise GuardrailError("You've turned this feature off in Your data and consent.", checks, 403)
    else:
        checks.append(check("input", "Consent", True, "No personal data used"))
    try:
        parsed = model(**params)
    except ValidationError as e:
        msg = "; ".join(f"{'.'.join(map(str, x['loc']))}: {x['msg']}" for x in e.errors())
        checks.append(check("input", "Input validation", False, msg))
        raise GuardrailError("That request didn't look right.", checks, 422)
    if kind == "consent" and parsed.key not in state["consent"]:
        checks.append(check("input", "Input validation", False, f"unknown consent '{parsed.key}'"))
        raise GuardrailError("Unknown setting.", checks, 422)
    checks.append(check("input", "Input validation", True, "Request shape and values are valid"))
    return parsed, checks


# ------------------------------------------------------------------ chat input

_CARD_OR_ACCOUNT = re.compile(r"\b(?:\d[ -]?){8,19}\b")


def clean_chat_input(text: str, state: dict) -> tuple[str, list[dict]]:
    checks = []
    if not state["consent"].get("chat", False):
        checks.append(check("input", "Consent", False, "'chat' is off"))
        raise GuardrailError("You've turned chat off in Your data and consent.", checks, 403)
    checks.append(check("input", "Consent", True, "'chat' is on"))
    cleaned, n = _CARD_OR_ACCOUNT.subn("[number removed]", text)
    checks.append(check("input", "Input validation", True,
                        f"Removed {n} card or account number{'s' if n != 1 else ''}" if n else "No card or account numbers"))
    return cleaned, checks


# ------------------------------------------------------------------ output: proposals

def check_proposal(before: dict, after: dict, changes: list[dict], engine) -> list[dict]:
    checks = []
    ok_schema = all(isinstance(c.get("label"), str) and isinstance(c.get("from"), str) and isinstance(c.get("to"), str)
                    for c in changes)
    fc = engine.forecast(after)
    ok_schema = ok_schema and all(math.isfinite(p["balance"]) for p in fc["points"])
    checks.append(check("output", "Schema validation", ok_schema, f"{len(changes)} changes, all values present"))
    if not changes:
        checks.append(check("output", "Something changes", False, "This would change nothing in your plan"))

    acc_b = {a["id"]: a["closing_balance"] for a in engine.effective_accounts(before)}
    acc_a = {a["id"]: a["closing_balance"] for a in engine.effective_accounts(after)}
    em_ok = acc_a["goal-emergency"] >= acc_b["goal-emergency"] and \
        engine.autosave_amount(after, "goal-emergency", 0) >= engine.autosave_amount(before, "goal-emergency", 0)
    checks.append(check("output", "Emergency fund untouched", em_ok, "Keeps its balance and its auto-save"))
    neg = [k for k, v in acc_a.items() if k != "everyday" and v < 0]
    checks.append(check("output", "No savings account below $0", not neg, ", ".join(neg) or "All at or above $0"))
    conserved = abs(sum(acc_a.values()) - sum(acc_b.values())) < 0.01
    checks.append(check("output", "Moves add up", conserved, "Money only moves between Mia's own accounts"))
    neg_save = [k for k, v in after["autosave"].items() if v < 0]
    checks.append(check("output", "No negative auto-saves", not neg_save, ", ".join(neg_save) or "All auto-saves valid"))
    return checks


# ------------------------------------------------------------------ output: the AI's words

_NUM = re.compile(r"\d[\d,]*(?:\.\d+)?")
_BANNED = re.compile(
    r"\b(you should (buy|invest|switch|take out|apply)|we recommend|i recommend (a|an|the)?\s*(product|provider|loan|card|fund)|"
    r"guarantee[ds]?|diet|weight loss|unhealthy|health(y)? eating|religio\w*|credit score)\b",
    re.I,
)


def _numbers(text: str) -> set[str]:
    return {n.replace(",", "").rstrip(".").removesuffix(".0").removesuffix(".00") for n in _NUM.findall(text)}


def check_explanation(text: str, facts_text: str) -> tuple[bool, list[dict]]:
    checks = []
    text = (text or "").strip()
    ok_len = 0 < len(text) <= 700
    checks.append(check("output", "Safe response: length", ok_len, f"{len(text)} characters"))
    allowed = _numbers(facts_text)
    unknown = sorted(_numbers(text) - allowed - {"1", "2", "3"})
    checks.append(check("output", "Financial check: numbers come from the engine", not unknown,
                        "All figures match the calculator" if not unknown else f"Unknown figures: {', '.join(unknown[:5])}"))
    bad = _BANNED.search(text)
    checks.append(check("output", "Safe response: no product advice or health talk", not bad,
                        f"Found '{bad.group(0)}'" if bad else "Clean"))
    return ok_len and not unknown and not bad, checks
