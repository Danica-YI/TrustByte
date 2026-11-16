# Windy chat: next-step buttons and "How did you work this out?"

Date: 16 Nov 2026 · Status: draft for approval

## Why

Team task "Chatbot: better interaction with the user". Danica chose two goals for what a judge should feel:
**it gets things done safely** and **I can trust it**. Today Windy answers and stops; to change anything Mia
has to find the right screen herself, and the only trust signal is the tool chips.

## Goals

- After an answer, Windy can offer **up to 2 action buttons** (e.g. "Set an Eating out limit of $60").
  Tapping one opens the app's existing **review screen**; Mia approves there; it can be undone.
- Every answer gets a **"How did you work this out?"** button showing what data Windy looked at, that the
  numbers came from the Python engine (not the AI), and which guardrail checks passed.
- Windy never changes anything itself. "Ask before any change" holds by construction.

## Non-goals

- Follow-up *question* buttons (judge goal 1, not chosen).
- New kinds of plan change. Actions reuse the five that exist: `budget`, `shortfall_fix`,
  `insurance_topup`, `goal_plan`, `japan_sooner`.
- Buttons on reopened past chats (only the latest live answer shows them).

## Anti-goals

- A button that does something without the review screen.
- A suggestion Mia sees that the guardrails would reject.
- A trust panel that the AI writes (it must be built from what actually happened).

## Approaches considered

| | Approach | Decision |
|---|---|---|
| **A** | Windy proposes actions with a `suggest_next` tool; the server validates each against the existing guardrails before the app sees it; code always adds the trust button | **Chosen** (Danica) |
| B | Code picks buttons from which tools were used | Predictable but can't react to what Mia asked |
| C | Windy writes buttons into its text; the app parses them | Fragile, and nothing checks them first |

## Design

**Backend**
- `server/suggest.py`: the `suggest_next` tool definition (input: up to 2 `{label, kind, params}`) and
  `validate(actions, state)`: keeps an action only if `guardrails.check_input(kind, params, state, PROPOSALS)`
  passes (so consent and parameter limits apply), the label is 1–40 characters, and there are at most 2.
  Dropped ones are reported back to Windy, never shown.
- `main.py`: handles `suggest_next` like `remember`; sends the kept actions to the app as an SSE event
  `{"type": "suggestions", "actions": [...]}`; sends the input-guardrail checks already computed per message
  (they are in the `start` event today). System prompt: offer an action only when a plan change would
  clearly help; never say it is done; Mia approves on the review screen.
- `chats.transcript` leaves `suggest_next` out of the tool chips.

**Frontend (`Chat.tsx`)**
- The latest Windy answer shows its action buttons. Tap → `propose(kind, params)` → `/review/{id}`
  (existing flow, existing guardrail panel, existing undo).
- Every answer has "How did you work this out?", which expands a panel built from the recorded tool calls:
  data looked at (each tool with a plain description and its inputs), "Numbers: worked out by the Python
  engine. Words: written by Windy (AI).", and the input checks that passed.

**Tests**: `server/tests/test_suggest.py`: a valid budget kept; weekly $5,000 dropped; unknown kind dropped;
consent off → dropped; a third action dropped; a bad label dropped. Frontend: tsc + eslint + a browser check,
plus one live chat where Windy offers an action and tapping it opens the review screen.
