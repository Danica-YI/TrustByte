"""The plan state survives in SQLite: load, save, reset, undo and the usage log behave like before."""

import sqlite3

import state


def _rows(table: str) -> int:
    with sqlite3.connect(state.DB_PATH) as conn:
        return conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]


def test_first_load_is_the_start_of_the_story():
    assert state.load() == state.default_state()


def test_save_then_load_round_trips():
    s = state.load()
    s["life_event"] = {"status": "confirmed", "rent_frequency": "weekly"}
    s["autosave"] = {"goal-japan": 103}
    s["consent"]["connected_receipts"] = True
    state.save(s)
    assert state.load() == s


def test_tables_hold_the_data():
    s = state.load()
    before = state.snapshot_before(s)
    s["autosave"] = {"goal-home": 60}
    state.record(s, before, "goal_plan", "Approved plan C")
    state.log_usage(s, "chat", "get accounts")
    state.save(s)
    assert _rows("history") == 1
    assert _rows("usage") == 1
    assert _rows("consent") == len(state.CONSENT_LABELS)


def test_undo_restores_the_earlier_plan_and_trims_history():
    s = state.load()
    before = state.snapshot_before(s)
    s["autosave"] = {"goal-home": 60}
    first = state.record(s, before, "goal_plan", "Approved plan C")
    before = state.snapshot_before(s)
    s["budgets"] = {"Eating out": 60}
    state.record(s, before, "budget", "Eating out under $60 a week")
    state.save(s)

    restored = state.undo(state.load(), first["id"])
    state.save(restored)
    loaded = state.load()
    assert loaded["autosave"] == {} and loaded["budgets"] == {}
    assert loaded["history"] == []
    assert _rows("history") == 0


def test_reset_clears_everything():
    s = state.load()
    s["dismissed_cards"] = ["life-event"]
    state.log_usage(s, "chat", "get accounts")
    state.save(s)
    assert state.reset() == state.default_state()
    assert state.load() == state.default_state()
    assert _rows("usage") == 0


def test_usage_log_keeps_the_latest_200():
    s = state.load()
    for i in range(250):
        state.log_usage(s, "chat", f"call {i}")
    state.save(s)
    usage = state.load()["usage"]
    assert len(usage) == 200
    assert usage[-1]["what"] == "call 249"


def test_old_version_starts_fresh():
    s = state.load()
    s["version"] = 1
    s["dismissed_cards"] = ["life-event"]
    state.save(s)
    assert state.load() == state.default_state()
