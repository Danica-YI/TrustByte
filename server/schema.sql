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
