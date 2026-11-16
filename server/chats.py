"""Past Windy conversations, saved whole in SQLite (`chat_sessions`, `chat_messages`).

Every message is stored exactly as it was sent to Claude, including Windy's tool calls and their results,
so Mia can reopen a past chat and carry on, even after the backend restarts. The screen gets a simpler
transcript (her questions, Windy's answers, which tools it used). Reset clears all of it.
"""

from __future__ import annotations

import json

import state
from memory import timestamp

TITLE_CHARS = 80


def _plain(block: object) -> object:
    """A content block as plain JSON data (Anthropic SDK blocks are pydantic models)."""
    if hasattr(block, "model_dump"):
        return block.model_dump(mode="json", exclude_none=True)
    return block


def _plain_message(message: dict) -> dict:
    content = message["content"]
    return {"role": message["role"], "content": content if isinstance(content, str) else [_plain(b) for b in content]}


def save(conversation_id: str, messages: list[dict]) -> None:
    """Store the whole conversation, replacing what was saved for it before."""
    if not messages:
        return
    plain = [_plain_message(m) for m in messages]
    title = next((m["content"] for m in plain if m["role"] == "user" and isinstance(m["content"], str)), "Chat")
    now = timestamp()
    with state._lock:
        conn = state._connect()
        try:
            with conn:
                conn.execute("INSERT INTO chat_sessions (id, title, started_at, updated_at) VALUES (?, ?, ?, ?)"
                             " ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at",
                             (conversation_id, title[:TITLE_CHARS], now, now))
                conn.execute("DELETE FROM chat_messages WHERE conversation_id = ?", (conversation_id,))
                conn.executemany("INSERT INTO chat_messages (conversation_id, seq, message_json) VALUES (?, ?, ?)",
                                 [(conversation_id, i, json.dumps(m)) for i, m in enumerate(plain)])
        finally:
            conn.close()


def load(conversation_id: str) -> list[dict] | None:
    """The saved messages, ready to send to Claude again. None if there is no such chat."""
    with state._lock:
        conn = state._connect()
        try:
            if conn.execute("SELECT 1 FROM chat_sessions WHERE id = ?", (conversation_id,)).fetchone() is None:
                return None
            rows = conn.execute("SELECT message_json FROM chat_messages WHERE conversation_id = ? ORDER BY seq",
                                (conversation_id,))
            return [json.loads(r["message_json"]) for r in rows]
        finally:
            conn.close()


def sessions() -> list[dict]:
    """Past chats, most recently used first, with how many questions each has."""
    with state._lock:
        conn = state._connect()
        try:
            rows = conn.execute("SELECT id, title, started_at, updated_at FROM chat_sessions"
                                " ORDER BY updated_at DESC, rowid DESC").fetchall()
            out = []
            for r in rows:
                messages = [json.loads(m[0]) for m in conn.execute(
                    "SELECT message_json FROM chat_messages WHERE conversation_id = ?", (r["id"],))]
                questions = sum(1 for m in messages if m["role"] == "user" and isinstance(m["content"], str))
                out.append({**dict(r), "questions": questions})
            return out
        finally:
            conn.close()


def transcript(conversation_id: str) -> list[dict] | None:
    """What the chat screen shows: each question, then Windy's answer text and the tools it used."""
    messages = load(conversation_id)
    if messages is None:
        return None
    out: list[dict] = []
    for m in messages:
        if m["role"] == "user" and isinstance(m["content"], str):
            out.append({"role": "user", "text": m["content"], "tools": []})
        elif m["role"] == "assistant":
            if not out or out[-1]["role"] != "assistant":
                out.append({"role": "assistant", "text": "", "tools": []})
            for block in m["content"]:
                if block.get("type") == "text":
                    if out[-1]["text"] and not out[-1]["text"][-1].isspace():
                        out[-1]["text"] += "\n\n"  # text written before and after a tool call
                    out[-1]["text"] += block["text"]
                elif block.get("type") == "tool_use" and block["name"] != "suggest_next":
                    out[-1]["tools"].append({"name": block["name"], "input": block["input"]})
        # tool results (user messages with a list) are Windy's working, not shown
    return out


def delete(conversation_id: str) -> bool:
    with state._lock:
        conn = state._connect()
        try:
            with conn:
                conn.execute("DELETE FROM chat_messages WHERE conversation_id = ?", (conversation_id,))
                return conn.execute("DELETE FROM chat_sessions WHERE id = ?", (conversation_id,)).rowcount > 0
        finally:
            conn.close()
