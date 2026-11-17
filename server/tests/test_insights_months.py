"""Insights chart: each of the last 6 months split by category, with its dates, so bars can be stacked."""

import engine as E
import state
import tools as T


def test_each_month_is_split_by_category():
    months = E.insights(state.load())["months"]
    assert len(months) == 6
    for m in months:
        assert set(m["by_category"]) <= set(T.INSIGHT_CATEGORIES)
        assert round(sum(m["by_category"].values()), 2) == m["v"]
        assert all(v > 0 for v in m["by_category"].values())


def test_months_have_their_date_range():
    months = E.insights(state.load())["months"]
    last = months[-1]
    assert last["start"] == f"{E.TODAY:%Y-%m}-01"
    assert last["end"] == E.TODAY.isoformat()  # this month only counts up to today
    assert months[0]["start"] < months[0]["end"] < months[1]["start"]
