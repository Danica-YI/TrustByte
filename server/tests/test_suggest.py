"""Windy's suggested actions are checked by the same guardrails as the screens before Mia sees them."""

import copy

import state
import suggest

BUDGET = {"label": "Limit Eating out to $60 a week", "kind": "budget", "params": {"category": "Eating out", "weekly": 60}}


def _state():
    return state.default_state()


def test_valid_budget_is_kept():
    kept, dropped = suggest.validate({"actions": [BUDGET]}, _state())
    assert kept == [BUDGET] and dropped == []


def test_out_of_range_is_dropped():
    bad = copy.deepcopy(BUDGET)
    bad["params"]["weekly"] = 5000
    kept, dropped = suggest.validate({"actions": [bad]}, _state())
    assert kept == [] and len(dropped) == 1


def test_unknown_kind_is_dropped():
    kept, dropped = suggest.validate({"actions": [{"label": "Send $500", "kind": "transfer_money", "params": {}}]}, _state())
    assert kept == [] and dropped[0]["label"] == "Send $500"


def test_consent_off_is_dropped():
    s = _state()
    s["consent"]["spending_insights"] = False
    kept, _ = suggest.validate({"actions": [BUDGET]}, s)
    assert kept == []


def test_only_two_are_kept():
    fix = {"label": "Skip one Westpac Life auto-save", "kind": "shortfall_fix", "params": {"fixes": ["skip-life"]}}
    ins = {"label": "Cover the insurance rise", "kind": "insurance_topup", "params": {}}
    kept, dropped = suggest.validate({"actions": [BUDGET, fix, ins]}, _state())
    assert [k["kind"] for k in kept] == ["budget", "shortfall_fix"] and len(dropped) == 1


def test_bad_label_is_dropped():
    empty = {**BUDGET, "label": ""}
    long = {**BUDGET, "label": "x" * 41}
    kept, dropped = suggest.validate({"actions": [empty, long]}, _state())
    assert kept == [] and len(dropped) == 2


def test_malformed_input():
    assert suggest.validate("nope", _state()) == ([], [])
    kept, dropped = suggest.validate({"actions": [{"label": "x"}]}, _state())
    assert kept == [] and len(dropped) == 1


# ---------------------------------------------------------------- follow-up questions (quick replies)

def test_follow_ups_are_kept():
    qs = ["Which nights do I order most?", "Compare with October"]
    assert suggest.follow_ups({"questions": qs}) == qs


def test_follow_ups_are_tidied_and_limited_to_three():
    qs = ["  Compare   with October ", "A", "x" * 81, "Q2?", "Q3?", "Q4?", 42]
    assert suggest.follow_ups({"questions": qs}) == ["Compare with October", "Q2?", "Q3?"]


def test_follow_ups_skip_duplicates_and_bad_input():
    assert suggest.follow_ups({"questions": ["This month?", "this month?"]}) == ["This month?"]
    assert suggest.follow_ups({"actions": []}) == []
    assert suggest.follow_ups("nope") == []


def test_questions_only_is_valid_for_actions():
    assert suggest.validate({"questions": ["Compare with October"]}, _state()) == ([], [])
