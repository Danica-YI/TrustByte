"""Plan State: everything Mia has approved or told Windy, saved between requests.

This is the "Customer reviews and approves -> only the simulated financial plan is updated" box in the
architecture. The bank data in data/mia/*.json is never edited. The engine (engine.py) reads the base data
plus this state and works out what every screen should show.

Saved in SQLite, server/plan_state.db (gitignored), created on first use. Tables (server/schema.sql):
  consent        one row per consent switch
  plan_sections  one row per part of the plan (autosave, life_event, budgets, ...), the value as JSON
  history        every change Mia approved, with the plan before it (so it can be undone)
  usage          every time Windy used Mia's data
Each save is one transaction. POST /api/reset puts it back to the start of the demo story.
"""

from __future__ import annotations

import copy
import json
import sqlite3
import threading
import uuid
from datetime import datetime
from pathlib import Path

DB_PATH = Path(__file__).parent / "plan_state.db"
SCHEMA = (Path(__file__).parent / "schema.sql").read_text(encoding="utf-8")
_lock = threading.Lock()
MAX_USAGE = 200

# Consent keys, shown on the "Your data and consent" screen. Each feature checks its key before it runs.
CONSENT_LABELS = {
    "life_events": "Spot life changes (moving, new job)",
    "goals": "Plan my savings goals",
    "cash_flow": "Warn me before I run short",
    "regular_payments": "Track bills, subscriptions and pay-later",
    "receipts": "Read receipts I add",
    "spending_insights": "Coach me on my spending",
    "chat": "Answer my questions in chat",
    "connected_receipts": "Get itemised receipts from connected stores",
}
# Opt-in switches that start OFF (everything else starts on for the demo story)
OFF_BY_DEFAULT = {"connected_receipts"}


def default_state() -> dict:
    return {
        "version": 3,
        "consent": {k: k not in OFF_BY_DEFAULT for k in CONSENT_LABELS},
        # Idea 1: detected -> confirmed (with rent frequency) or dismissed
        "life_event": {"status": "detected", "rent_frequency": None},
        # Permanent auto-save amounts per payday, by account id (overrides the bank's schedule)
        "autosave": {},
        # Temporary changes: {"account", "delta", "paydays"} for the next N paydays
        "temp_autosave": [],
        # One-off moves between Mia's own goal accounts (simulated, inside the plan)
        "moves": [],
        # Auto-saves skipped on one date: {"account", "date"}
        "skips": [],
        # Scheduled payments put on hold (by label)
        "paused": [],
        # Weekly spending limits by category
        "budgets": {},
        # Idea 9+15: regular payments Windy found
        "recurring": {"confirmed": [], "dismissed": []},
        "insurance_reviewed": False,
        # Idea 10: receipts looked at and quick splits saved
        "receipts_reviewed": [],
        "splits": {},
        "dismissed_cards": [],
        # Joint savings: people Mia invited to save for a goal with her, by goal account id.
        # Each is {"name", "per_payday", "status": "invited" | "joined"}. Simulated: no message is sent.
        "shared_goals": {},
        # Goal details Mia edited herself, by goal account id: {"target": amount, "goal_date": "YYYY-MM-DD"}
        "goal_overrides": {},
        # Time machine: notes Mia wrote to her future self. Each is {"id", "year", "text", "written",
        # "opened", "answer": None | "done" | "not_yet" | "dropped"}. Only she can read and answer them.
        "capsules": [],
        # Goals Mia added herself: {"id", "name", "target", "goal_date"}; they start at $0
        "new_goals": [],
        # The trade-off option or Japan plan Mia approved, for the home screen
        "plan_choice": None,
        # Every change, newest last. Each entry keeps the state before it, so it can be undone.
        "history": [],
        # Every time Windy used Mia's data (for the consent screen's "Your record")
        "usage": [],
    }


def _strip(state: dict) -> dict:
    """State without the logs, used for undo snapshots."""
    return {k: copy.deepcopy(v) for k, v in state.items() if k not in ("history", "usage")}


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.executescript(SCHEMA)
    return conn


def load() -> dict:
    """Mia's plan as one dict (the shape of default_state). A missing or older plan starts the story fresh."""
    with _lock:
        conn = _connect()
        try:
            sections = {r["key"]: json.loads(r["value_json"]) for r in conn.execute("SELECT * FROM plan_sections")}
            if sections.get("version") != default_state()["version"]:
                return default_state()
            state = {**default_state(), **sections}
            state["consent"] = {**state["consent"], **{
                r["key"]: bool(r["enabled"]) for r in conn.execute("SELECT key, enabled FROM consent")}}
            state["history"] = [
                {"id": r["id"], "time": r["time"], "kind": r["kind"], "title": r["title"],
                 "changes": json.loads(r["changes_json"]), "undoable": bool(r["undoable"]),
                 "before": json.loads(r["before_json"])}
                for r in conn.execute("SELECT * FROM history ORDER BY seq")]
            state["usage"] = [{"time": r["time"], "feature": r["feature"], "what": r["what"]}
                              for r in conn.execute("SELECT * FROM usage ORDER BY seq")]
            return state
        finally:
            conn.close()


def save(state: dict) -> None:
    """Write the whole plan in one transaction: either all of it is saved or none of it."""
    with _lock:
        conn = _connect()
        try:
            with conn:
                for table in ("consent", "plan_sections", "history", "usage"):
                    conn.execute(f"DELETE FROM {table}")
                conn.executemany("INSERT INTO consent (key, label, enabled) VALUES (?, ?, ?)",
                                 [(k, CONSENT_LABELS.get(k, k), int(v)) for k, v in state["consent"].items()])
                conn.executemany("INSERT INTO plan_sections (key, value_json) VALUES (?, ?)",
                                 [(k, json.dumps(v)) for k, v in state.items()
                                  if k not in ("consent", "history", "usage")])
                conn.executemany(
                    "INSERT INTO history (id, time, kind, title, changes_json, undoable, before_json)"
                    " VALUES (?, ?, ?, ?, ?, ?, ?)",
                    [(h["id"], h["time"], h["kind"], h["title"], json.dumps(h["changes"]), int(h["undoable"]),
                      json.dumps(h["before"])) for h in state["history"]])
                conn.executemany("INSERT INTO usage (time, feature, what) VALUES (?, ?, ?)",
                                 [(u["time"], u["feature"], u["what"]) for u in state["usage"][-MAX_USAGE:]])
        finally:
            conn.close()


def reset() -> dict:
    """Back to the start of the demo story, including Windy's notes and earlier chats (memory.py)."""
    state = default_state()
    save(state)
    with _lock:
        conn = _connect()
        try:
            with conn:
                for table in ("memory", "chat_log", "chat_messages", "chat_sessions"):
                    conn.execute(f"DELETE FROM {table}")
        finally:
            conn.close()
    return state


def record(state: dict, before: dict, kind: str, title: str, changes: list[dict] | None = None,
           undoable: bool = True) -> dict:
    """Add a history entry. `before` is the state before the change (from _strip)."""
    entry = {
        "id": uuid.uuid4().hex[:8],
        "time": datetime.now().isoformat(timespec="seconds"),
        "kind": kind,
        "title": title,
        "changes": changes or [],
        "undoable": undoable,
        "before": before,
    }
    state["history"].append(entry)
    return entry


def undo(state: dict, entry_id: str) -> dict:
    """Roll back to the state before `entry_id`. Later changes are undone too."""
    idx = next((i for i, h in enumerate(state["history"]) if h["id"] == entry_id), None)
    if idx is None:
        raise KeyError(entry_id)
    entry = state["history"][idx]
    restored = copy.deepcopy(entry["before"])
    restored["history"] = state["history"][:idx]
    restored["usage"] = state["usage"]
    return restored


def log_usage(state: dict, feature: str, what: str) -> None:
    state["usage"].append({"time": datetime.now().isoformat(timespec="seconds"), "feature": feature, "what": what})
    del state["usage"][:-MAX_USAGE]


snapshot_before = _strip
