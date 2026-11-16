"""Windy's next-step buttons: plan changes Windy can offer after an answer (the `suggest_next` tool).

Windy only suggests. Each suggestion is checked here with the same guardrails as the app's own screens
(permission, consent, allowed values) before Mia sees it; anything they'd reject is dropped. Tapping a
button opens the normal review screen, where Mia approves or not, and she can undo it later.
"""

from __future__ import annotations

import guardrails as G

MAX_ACTIONS = 2
MAX_LABEL = 40

SUGGEST_TOOL = {
    "name": "suggest_next",
    "description": (
        "Offer Mia up to 2 buttons for plan changes that would clearly help with what she asked. Each button opens "
        "a review screen where she decides; nothing changes until she approves. When there are two different "
        "ways to help, make them two separate actions (a choice), e.g. a shortfall_fix with [\"skip-life\"] and "
        "a budget for Eating out, rather than one combined action. Kinds and params:\n"
        "- budget: {\"category\": \"Eating out\", \"weekly\": 10-500}\n"
        "- shortfall_fix: {\"fixes\": [one or more of \"skip-life\" (skip the next Westpac Life auto-save), "
        "\"eating-out\" (keep Eating out under $60 a week), \"hold-subs\" (hold the 2 new subscriptions)]}\n"
        "- insurance_topup: {} (cover the car insurance renewal rise from the Bills set-aside)\n"
        "- goal_plan: {\"option\": \"A\" | \"B\" | \"C\"} (A travel first, B balanced, C home first, after the move)\n"
        "- japan_sooner: {\"variant\": \"bali\" | \"home\"} (Japan in 3 months, using the Bali fund or Home deposit)\n"
        "Label: what the button does, under 40 characters, e.g. 'Limit Eating out to $60 a week'."),
    "input_schema": {
        "type": "object",
        "properties": {"actions": {"type": "array", "maxItems": MAX_ACTIONS, "items": {
            "type": "object",
            "properties": {"label": {"type": "string"},
                           "kind": {"type": "string", "enum": sorted(G.PROPOSALS)},
                           "params": {"type": "object"}},
            "required": ["label", "kind", "params"], "additionalProperties": False}}},
        "required": ["actions"], "additionalProperties": False,
    },
}


def validate(args: object, state: dict) -> tuple[list[dict], list[dict]]:
    """Split Windy's suggestions into (kept, dropped). Kept ones passed every guardrail."""
    actions = args.get("actions") if isinstance(args, dict) else None
    if not isinstance(actions, list):
        return [], []
    kept: list[dict] = []
    dropped: list[dict] = []
    for a in actions:
        label = a.get("label") if isinstance(a, dict) else None
        kind, params = (a.get("kind"), a.get("params")) if isinstance(a, dict) else (None, None)
        if not isinstance(label, str) or not 1 <= len(label.strip()) <= MAX_LABEL:
            dropped.append({"label": label, "reason": f"label must be 1 to {MAX_LABEL} characters"})
        elif not isinstance(kind, str) or not isinstance(params, dict):
            dropped.append({"label": label, "reason": "needs a kind and params"})
        elif len(kept) >= MAX_ACTIONS:
            dropped.append({"label": label, "reason": f"at most {MAX_ACTIONS} suggestions"})
        else:
            try:
                G.check_input(kind, params, state, G.PROPOSALS)
            except G.GuardrailError as e:
                dropped.append({"label": label, "reason": str(e)})
            else:
                kept.append({"label": label.strip(), "kind": kind, "params": params})
    return kept, dropped
