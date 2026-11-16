"""Windy's memory between chats, stored in SQLite. Two kinds, both read before every answer:

- Notes (`memory` table): lasting facts Windy saves by itself with the `remember` tool when Mia shares
  a goal, a preference or her situation.
- Earlier conversations (`chat_log` table): each question Mia asked and the start of Windy's answer,
  so a new chat knows what she asked before.

Mia can list and delete both (GET / DELETE /api/memory...); resetting the demo clears them.
"""

from __future__ import annotations

from datetime import datetime

import state

MAX_CHARS = 200
MAX_MEMORIES = 30  # the oldest note goes when a new one would pass this
RECALL_EXCHANGES = 10  # earlier questions shown to Windy before each answer
MAX_QUESTION_CHARS = 300
MAX_ANSWER_CHARS = 300
KEEP_EXCHANGES = 200  # rows kept in chat_log

REMEMBER_TOOL = {
    "name": "remember",
    "description": (
        "Save a short note about Mia to remember in future chats: a lasting goal, preference or circumstance "
        "she told you (e.g. 'Wants to visit Japan in February', 'Prefers replies in Mandarin', 'Paid fortnightly "
        "on Fridays'). One fact per note, in third person, under 200 characters. Don't save numbers the tools "
        "already give, one-off questions, or anything about health, religion, relationships or other sensitive "
        "topics."),
    "input_schema": {"type": "object", "properties": {"note": {"type": "string"}}, "required": ["note"],
                     "additionalProperties": False},
}


def timestamp() -> str:
    """When something was saved (real time, shown to Mia). Windy isn't shown these dates: Mia's bank data is
    frozen at the demo's 'today' (14 Nov 2026), and a real date next to it would only confuse the timeline."""
    return datetime.now().isoformat(timespec="seconds")


def all_memories() -> list[dict]:
    with state._lock:
        conn = state._connect()
        try:
            return [dict(r) for r in conn.execute("SELECT id, text, created_at FROM memory ORDER BY id")]
        finally:
            conn.close()


def remember(text: str) -> dict:
    """Save one note (tidied and cut to MAX_CHARS). Saving the same note again changes nothing."""
    text = " ".join(text.split())[:MAX_CHARS]
    if not text:
        raise ValueError("empty note")
    with state._lock:
        conn = state._connect()
        try:
            with conn:
                conn.execute("INSERT OR IGNORE INTO memory (text, created_at) VALUES (?, ?)",
                             (text, timestamp()))
                conn.execute("DELETE FROM memory WHERE id NOT IN"
                             " (SELECT id FROM memory ORDER BY id DESC LIMIT ?)", (MAX_MEMORIES,))
            return dict(conn.execute("SELECT id, text, created_at FROM memory WHERE text = ?", (text,)).fetchone())
        finally:
            conn.close()


def forget(memory_id: int) -> bool:
    """Delete one note. False if there was no such note."""
    with state._lock:
        conn = state._connect()
        try:
            with conn:
                return conn.execute("DELETE FROM memory WHERE id = ?", (memory_id,)).rowcount > 0
        finally:
            conn.close()


def log_exchange(conversation_id: str, question: str, answer: str) -> None:
    """Save one question and the start of Windy's answer."""
    with state._lock:
        conn = state._connect()
        try:
            with conn:
                conn.execute("INSERT INTO chat_log (conversation_id, time, question, answer) VALUES (?, ?, ?, ?)",
                             (conversation_id, timestamp(),
                              question.strip()[:MAX_QUESTION_CHARS], " ".join(answer.split())[:MAX_ANSWER_CHARS]))
                conn.execute("DELETE FROM chat_log WHERE id NOT IN"
                             " (SELECT id FROM chat_log ORDER BY id DESC LIMIT ?)", (KEEP_EXCHANGES,))
        finally:
            conn.close()


def recent_exchanges(exclude_conversation: str | None = None, limit: int = RECALL_EXCHANGES) -> list[dict]:
    """The latest questions and answers, oldest first, leaving out one conversation (the current one)."""
    with state._lock:
        conn = state._connect()
        try:
            rows = conn.execute("SELECT id, conversation_id, time, question, answer FROM chat_log"
                                " WHERE conversation_id IS NOT ? ORDER BY id DESC LIMIT ?",
                                (exclude_conversation, limit)).fetchall()
            return [dict(r) for r in reversed(rows)]
        finally:
            conn.close()


def forget_chats() -> None:
    with state._lock:
        conn = state._connect()
        try:
            with conn:
                conn.execute("DELETE FROM chat_log")
        finally:
            conn.close()


def prompt_block(current_conversation: str | None = None) -> str:
    """Notes and earlier conversations as text for Windy's instructions; empty when there are none."""
    parts = []
    notes = all_memories()
    if notes:
        parts.append("What you remember about Mia (she can see and delete these in the app). Use them where "
                     "they help; the tools are still the source for every number:\n"
                     + "\n".join(f"- {m['text']}" for m in notes))
    earlier = recent_exchanges(exclude_conversation=current_conversation)
    if earlier:
        parts.append("Mia's questions in earlier chats, oldest first, with the start of your answer. If she "
                     "refers to them, use them; numbers may have changed since, so check with the tools:\n"
                     + "\n".join(f"- Q: {e['question']} | A: {e['answer']}" for e in earlier))
    return "\n\n".join(parts)
