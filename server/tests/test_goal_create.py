"""Mia can add her own goal: proposed, reviewed, approved, and then counted everywhere like the others."""

import pytest

import engine as E
import guardrails as G
import planner
import state
import windy_ai

LAPTOP = {"name": "New laptop", "target": 2000, "per_payday": 50}


@pytest.fixture(autouse=True)
def no_ai(monkeypatch):
    monkeypatch.setattr(windy_ai, "_has_key", lambda: False)  # use the built-in explanation in tests


def _create(params=LAPTOP):
    p = planner.propose("goal_create", params)
    planner.approve(p["id"])
    return p


def test_review_shows_the_new_goal_and_its_cost():
    p = planner.propose("goal_create", LAPTOP)
    labels = {c["label"]: c for c in p["changes"]}
    assert labels["New laptop each payday"]["to"] == "$50"
    assert labels["New laptop each payday"]["from"] == "None"
    assert "Everyday lowest point" in labels  # $50 more leaves Everyday each payday
    assert p["title"] == "New goal: New laptop"


def test_approved_goal_appears_with_its_auto_save():
    _create()
    s = state.load()
    goal = next(g for g in E.goals(s) if g["name"] == "New laptop")
    assert goal["id"] == "goal-newlaptop"
    assert (goal["saved"], goal["target"], goal["per_payday"]) == (0, 2000, 50)
    assert goal["reached"] is not None
    saves = [u for u in E.effective_upcoming(s) if u["kind"] == "auto_save" and u["to_account"] == "goal-newlaptop"]
    assert saves and all(u["amount"] == -50 and u["account"] == "everyday" for u in saves)


def test_goal_lowers_the_forecast():
    before = E.forecast(state.load())["low"]["balance"]
    _create()
    assert E.forecast(state.load())["low"]["balance"] == pytest.approx(before - 50)


def test_same_name_twice_gets_its_own_id():
    _create()
    _create()
    ids = [g["id"] for g in E.goals(state.load()) if g["name"] == "New laptop"]
    assert len(set(ids)) == 2


def test_undo_removes_the_goal():
    _create()
    s = state.load()
    state.save(state.undo(s, s["history"][-1]["id"]))
    assert all(g["name"] != "New laptop" for g in E.goals(state.load()))


def test_the_new_goal_can_be_edited():
    _create()
    p = planner.propose("goal_edit", {"goal": "goal-newlaptop", "per_payday": 80})
    planner.approve(p["id"])
    assert next(g for g in E.goals(state.load()) if g["id"] == "goal-newlaptop")["per_payday"] == 80


@pytest.mark.parametrize("bad", [
    {**LAPTOP, "name": ""},
    {**LAPTOP, "name": "x" * 31},
    {**LAPTOP, "name": "<script>"},
    {**LAPTOP, "target": 0},
    {**LAPTOP, "per_payday": -5},
    {**LAPTOP, "goal_date": "2020-01-01"},
])
def test_bad_input_is_refused(bad):
    with pytest.raises(G.GuardrailError):
        planner.propose("goal_create", bad)
