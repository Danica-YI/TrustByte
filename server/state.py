"""Plan State: everything Mia has approved or told Windy, saved between requests.

This is the "Customer reviews and approves -> only the simulated financial plan is updated" box in the
architecture. The bank data in data/mia/*.json is never edited. The engine (engine.py) reads the base data
plus this state and works out what every screen should show.

Saved to server/plan_state.json (gitignored). POST /api/reset puts it back to the start of the demo story.
"""

from __future__ import annotations

import copy
import json
import threading
import uuid
from datetime import datetime
from pathlib import Path

PATH = Path(__file__).parent / "plan_state.json"
_lock = threading.Lock()

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


def load() -> dict:
    with _lock:
        if PATH.exists():
            try:
                data = json.loads(PATH.read_text())
                if data.get("version") == default_state()["version"]:
                    return data
            except json.JSONDecodeError:
                pass
        return default_state()


def save(state: dict) -> None:
    with _lock:
        tmp = PATH.with_suffix(".tmp")
        tmp.write_text(json.dumps(state, indent=1))
        tmp.replace(PATH)


def reset() -> dict:
    state = default_state()
    save(state)
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
    del state["usage"][:-200]


snapshot_before = _strip
