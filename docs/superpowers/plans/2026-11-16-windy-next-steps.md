# Windy Next-Step Buttons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After an answer Windy can offer up to 2 guardrail-checked action buttons that open the existing review screen, and every answer gets a "How did you work this out?" panel built from what actually happened.

**Architecture:** A `suggest_next` tool (new `server/suggest.py`) whose actions are validated with `guardrails.check_input(..., PROPOSALS)` before an SSE `suggestions` event reaches the app. `Chat.tsx` renders the buttons (tap → `propose()` → `/review/{id}`) and the trust panel from the recorded tool calls and input checks.

**Tech Stack:** FastAPI, Anthropic SDK tool use, pytest; React + TypeScript.

**Spec:** `docs/superpowers/specs/2026-11-16-windy-next-steps-design.md`

## Global Constraints

- Actions reuse only the five existing proposal kinds: `budget`, `shortfall_fix`, `insurance_topup`, `goal_plan`, `japan_sooner`.
- At most 2 actions per answer; label 1–40 characters.
- Nothing changes without the review screen; Windy must never say a change is done.
- The trust panel is built by code from recorded tool calls and checks, never written by the AI.
- Branch from the latest `origin/main`.

## Review Focus

1. Windy suggests an action while its feature's consent is off → dropped (test in Task 1).
2. Windy calls `suggest_next` with malformed input (not a list, missing `params`) → error result to Windy, nothing shown (test in Task 1).
3. The plan changed between the suggestion and the tap → `propose()` recomputes from the current plan; the review screen shows today's numbers (existing behaviour; checked live in Task 3).
4. Reopening a past chat → no stale action buttons; tool chips don't show `suggest_next` (test in Task 2).
5. Backend error while proposing from a button → the existing store error/toast shows; the chat stays usable (browser check in Task 3).

---

### Task 1: `suggest.py` with validation

**Files:** Create `server/suggest.py`, `server/tests/test_suggest.py`

**Interfaces:**
- Produces: `SUGGEST_TOOL: dict` (name `suggest_next`, input `{"actions": [{"label": str, "kind": str, "params": object}]}`, `maxItems` 2);
  `validate(args: object, state: dict) -> tuple[list[dict], list[dict]]` returning `(kept, dropped)`; kept items are `{"label", "kind", "params"}`; dropped items are `{"label", "reason"}`.

- [ ] **Step 1: Failing tests** in `test_suggest.py` (state from `state.default_state()`):
  `test_valid_budget_is_kept` (`{"label": "Limit Eating out to $60 a week", "kind": "budget", "params": {"category": "Eating out", "weekly": 60}}` → kept 1);
  `test_out_of_range_is_dropped` (weekly 5000 → kept 0, dropped 1);
  `test_unknown_kind_is_dropped` (`kind: "transfer_money"`);
  `test_consent_off_is_dropped` (state `consent["spending_insights"] = False`);
  `test_only_two_are_kept` (3 valid → kept 2);
  `test_bad_label_is_dropped` (`""` and 41 chars);
  `test_malformed_input` (`validate("nope", s)` and `validate({"actions": [{"label": "x"}]}, s)` → kept `[]`, no exception).
- [ ] **Step 2:** `server/.venv/Scripts/python -m pytest server/tests/test_suggest.py -q` → FAIL (no module).
- [ ] **Step 3:** Implement; `validate` catches `guardrails.GuardrailError` per action and uses its message as `reason`.
- [ ] **Step 4:** Same command → PASS; full suite `server/.venv/Scripts/python -m pytest server/tests -q` green.

### Task 2: Wire into the chat

**Files:** Modify `server/main.py`, `server/chats.py`, `server/tests/test_chats.py`

**Interfaces:**
- Consumes: `suggest.SUGGEST_TOOL`, `suggest.validate`.
- Produces: SSE event `{"type": "suggestions", "actions": [kept...]}` (sent when kept is non-empty); `CHAT_TOOLS` includes `SUGGEST_TOOL`; tool result to Windy `{"shown": kept, "dropped": dropped}`.
- System prompt adds: offer an action with `suggest_next` only when a plan change would clearly help; it opens a review screen where Mia decides; never say a change is made.

- [ ] **Step 1: Failing test** `test_transcript_hides_suggest_next` in `test_chats.py`: a conversation whose assistant message has a `suggest_next` tool_use → `transcript` tools list excludes it.
- [ ] **Step 2:** run → FAIL. **Step 3:** implement (main.py handles `suggest_next` in `_run_tool_on_live_plan` like `remember`, but the SSE event is yielded from the chat loop). **Step 4:** suite green.
- [ ] **Step 5: Live check:** restart backend; chat "I keep spending on takeaway, can you help?" → stream contains a `suggestions` event with a `budget` action.

### Task 3: Chat screen

**Files:** Modify `app/src/screens/Chat.tsx`

- `Msg` gains `actions: { label: string; kind: string; params: Record<string, unknown> }[]` and `checks: Check[]` (from the `start` event; `Check` from `../api`).
- The last assistant message shows its action buttons (`btn outline`); tap → `propose(kind, params)` from `useApp()` → `nav(\`/review/${p.id}\`)`.
- Every assistant message with tools shows a `link` "How did you work this out?" toggling a panel: one row per tool (`TOOL_LABELS` name + `TOOL_DATA[name]` plain description + inputs), the line "Numbers: worked out by the Python engine. Words: written by Windy (AI).", and the passed input checks.
- `TOOL_DATA` maps each of the 12 tools to what it reads (e.g. `search_transactions`: "Your Everyday transactions").

- [ ] **Step 1:** implement. **Step 2:** `cd app && npx tsc -b && npx eslint src` clean.
- [ ] **Step 3: Browser:** ask the takeaway question → action button shows → tap → review screen opens → approve → undo available on "Your plan"; "How did you work this out?" lists the tools and checks.
- [ ] **Step 4:** Leave changes uncommitted for Danica to commit and push (her preference).
