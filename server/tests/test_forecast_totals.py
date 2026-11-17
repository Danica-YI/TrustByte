"""Ask Windy gets totals from the calculator, so it never has to add numbers up itself (and get them wrong)."""

import engine
import state


def test_payday_totals_match_the_items():
    s = state.load()
    out = engine.forecast_for_chat(s)
    t = out["next_payday_totals"]
    items = [u for u in out["scheduled_everyday_items"] if u["date"] == out["next_payday"]]
    assert t["auto_saves_out"] == round(-sum(u["amount"] for u in items if u["kind"] == "auto_save"), 2)
    assert t["pay_later_out"] == round(-sum(u["amount"] for u in items if u["kind"] == "pay_later"), 2)
    assert t["left_after_auto_saves_and_pay_later"] == round(t["pay_in"] - t["auto_saves_out"] - t["pay_later_out"], 2)
    assert sum(a["amount"] for a in t["auto_saves"]) == t["auto_saves_out"]


def test_totals_follow_an_approved_plan():
    s = state.load()
    before = engine.forecast_for_chat(s)["next_payday_totals"]["auto_saves_out"]
    s["autosave"]["life"] = 360  # e.g. plan B lowers Westpac Life from $480
    after = engine.forecast_for_chat(s)["next_payday_totals"]["auto_saves_out"]
    assert round(before - after, 2) == 120


def test_totals_by_date_add_up():
    out = engine.forecast_for_chat(state.load())
    for day in out["totals_by_date"]:
        items = [u for u in out["scheduled_everyday_items"] if u["date"] == day["date"]]
        assert day["money_out"] == round(sum(-u["amount"] for u in items if u["amount"] < 0), 2)
        assert day["money_in"] == round(sum(u["amount"] for u in items if u["amount"] > 0), 2)


def test_each_fix_says_where_the_low_ends_up():
    out = engine.forecast_for_chat(state.load())
    low = out["lowest_point"]["balance"]
    for f in out["ways_to_fix"]:
        assert f["lowest_point_after"] == round(low + f["gain"], 2)
        assert f["covers_the_gap"] == (f["lowest_point_after"] >= 0)
