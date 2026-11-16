-- Plan State tables (server/plan_state.db). Created by state.py on first use.
-- Mia's bank data stays in data/mia/*.json and is never edited; these tables hold what she approved.

-- One row per consent switch on the "Your data and consent" screen
CREATE TABLE IF NOT EXISTS consent (
    key     TEXT PRIMARY KEY,
    label   TEXT NOT NULL,
    enabled INTEGER NOT NULL            -- 1 = on, 0 = off
);

-- One row per part of Mia's plan (autosave, life_event, budgets, ...); the value is JSON
CREATE TABLE IF NOT EXISTS plan_sections (
    key        TEXT PRIMARY KEY,
    value_json TEXT NOT NULL
);

-- Every change Mia approved, oldest first, with the plan before it so it can be undone
CREATE TABLE IF NOT EXISTS history (
    seq          INTEGER PRIMARY KEY,
    id           TEXT NOT NULL UNIQUE,
    time         TEXT NOT NULL,
    kind         TEXT NOT NULL,
    title        TEXT NOT NULL,
    changes_json TEXT NOT NULL,
    undoable     INTEGER NOT NULL,
    before_json  TEXT NOT NULL
);

-- Every time Windy used Mia's data (the consent screen's "Your record"); the latest 200 are kept
CREATE TABLE IF NOT EXISTS usage (
    seq     INTEGER PRIMARY KEY,
    time    TEXT NOT NULL,
    feature TEXT NOT NULL,
    what    TEXT NOT NULL
);

-- What Windy remembers about Mia between chats (goals, preferences, circumstances she shared).
-- Read before every answer; Mia can see and delete each one.
CREATE TABLE IF NOT EXISTS memory (
    id         INTEGER PRIMARY KEY,
    text       TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL
);

-- Every question Mia asked Windy and the start of its answer, so a new chat knows what was asked before.
-- The latest ones from other chats are read before every answer; Mia can clear them.
CREATE TABLE IF NOT EXISTS chat_log (
    id              INTEGER PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    time            TEXT NOT NULL,
    question        TEXT NOT NULL,
    answer          TEXT NOT NULL
);

-- Whole Windy conversations, so Mia can reopen a past chat and carry on (even after a restart).
CREATE TABLE IF NOT EXISTS chat_sessions (
    id         TEXT PRIMARY KEY,           -- the conversation_id the app sends
    title      TEXT NOT NULL,              -- Mia's first question
    started_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Every message in a conversation, in order, exactly as sent to Claude (including tool calls and results)
CREATE TABLE IF NOT EXISTS chat_messages (
    id              INTEGER PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    seq             INTEGER NOT NULL,
    message_json    TEXT NOT NULL
);
