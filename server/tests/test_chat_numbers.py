"""Every figure in a chat answer should come from the calculator (Windy's tools) or from Mia herself."""

import guardrails as G

TOOLS = ['{"total": -486.0, "avg_same_days": 136.7, "low": {"date": "2026-12-10", "balance": -477.56}, "matches": 18}']


def test_figures_from_tools_pass_in_any_format():
    check = G.check_chat_numbers("You spent $486.00 vs a usual $136.70. Low of -$477.56 on 10 Dec, 18 orders.", TOOLS)
    assert check["ok"] is True
    assert check["name"] == "Financial check: numbers come from the calculator"


def test_figure_windy_worked_out_is_flagged():
    check = G.check_chat_numbers("That's $349.30 above usual.", TOOLS)
    assert check["ok"] is False
    assert "349.30" in check["detail"]


def test_numbers_mia_typed_are_allowed():
    check = G.check_chat_numbers("Saving $160 a payday gets you there.", TOOLS, user_text="If I save $160 a payday?")
    assert check["ok"] is True


def test_small_counts_and_answers_without_numbers_pass():
    assert G.check_chat_numbers("Here are 2 ways to help.", TOOLS)["ok"] is True
    assert G.check_chat_numbers("No, you're fine.", [])["ok"] is True
