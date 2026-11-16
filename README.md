# TrustByte · harbour + Windy

Westpac Innovation and Coding Competition 2026 entry. **harbour** is a banking web app with **Windy**, an AI
assistant that notices changes in your money, works out your options with a calculator, explains them, and
lets you approve a change to your plan. Built from our FigJam board (Draft / Draft 2).

All data is synthetic (demo user **Mia**). No real bank APIs, and no money ever moves: approving only updates
Mia's simulated plan.

## Run it

Needs Node 18+ and Python 3.10+. From the repo root:

```bash
./run.sh
```

Open http://localhost:8787. The first run sets everything up. To get live AI explanations and the chat, put
your key in `server/.env` (`ANTHROPIC_API_KEY=...`). Without a key everything still works: Windy uses its
built-in explanation templates, which pass the same checks.

### Develop (hot reload)

```bash
cd app && npm run server   # terminal 1: backend on :8787
cd app && npm run dev      # terminal 2: frontend on :5173 (proxies /api to the backend)
```

## What you see

On a laptop: the app in a phone frame, the **demo story** on the left (each step of the pitch, plus
**Reset demo**), and **Behind the scenes** on the right, which lights up our architecture for every request and
lists every check that ran. Press **P** to hide both panels for a clean recording. On a real phone the app goes
full screen.

Every screen reads one live snapshot from the backend, so a change made on one screen shows up everywhere,
and it survives going back to Home or refreshing the page. **Reset demo** starts the story again.

## Architecture (how a change flows)

```
Harbour web app (React)
  -> Input guardrails      consent switch on? allowed action? valid values?      server/guardrails.py
  -> FastAPI backend       coordinates the services                              server/main.py, planner.py
  -> Python engine         works out the new plan, goal dates, 5-week forecast   server/engine.py
     AI model              explains the result in 2-3 sentences (Claude)          server/windy_ai.py
  -> Output guardrails     schema, financial checks, numbers match, safe text    server/guardrails.py
  -> Customer approves     only the simulated plan is updated (with undo)        server/state.py
```

- **Code does the maths, the AI only explains.** The AI gets a summary of the change, never raw transactions
  or account numbers. Its words are checked: every figure must come from the engine, no product advice, no
  health or diet talk. If a check fails, or there's no key or no network, a safe template is used instead.
- **Financial checks** on every proposal: emergency fund untouched, no savings account below $0, moves between
  Mia's accounts add up to zero, no negative auto-saves.
- **Plan state** (SQLite, `server/plan_state.db`, gitignored, created on first run): everything Mia approved or confirmed, with history and the log of what Windy used. Tables: `consent`, `plan_sections`, `history`, `usage` (see `server/state.py`). Tests: `server/.venv/bin/python -m pytest server/tests`.
  Any change can be undone from **Your plan**.
- **Consent**: each feature checks its switch first. Turn one off and its card disappears and the backend
  refuses to run it.

### API

| endpoint | what it does |
|---|---|
| `GET /api/snapshot` | everything the app shows, worked out from the bank data + plan state |
| `POST /api/propose` `{kind, params}` | guardrails, engine, AI explanation; returns a proposal to review |
| `POST /api/approve/{id}` | Mia approves: the plan state is updated |
| `POST /api/action` `{kind, params}` | small confirmations (rent frequency, "that's a bill", receipt saved, consent) |
| `POST /api/undo/{id}` | roll back a change (and any after it) |
| `POST /api/reset` | back to the start of the demo story |
| `POST /api/chat` | Ask Windy (Claude with tools over the same live plan) |

## Features in the demo

| Idea | Feature | Where | What changes when Mia acts |
|---|---|---|---|
| 1 | Life Event Detector | Home card → `/life-event` | Confirming the rent frequency rebuilds the rent schedule used everywhere |
| 2 | Goal Trade-off Simulator | `/goals/options`, `/goals/japan-sooner` | Approving an option changes auto-saves; goal dates, forecast and home update |
| 4 | Shortfall Early Warning | Home card → `/forecast` | Approving fixes (skip an auto-save, limit, hold subscriptions) lifts the low; the warning goes away |
| 9+15 | Commitments Watch | `/payments`, `/pay-later` | Confirm or dismiss found subscriptions; covering the insurance rise raises the Bills set-aside |
| 10 | Receipt Lens | Home card → `/receipt`, `/receipt/quick-split`, `/receipt/settings` | Connected receipts switch (opt-in); saving a breakdown or quick split is recorded and the card goes away |
| 5+6 | Spending Behaviour Coach | `/insights` | A weekly Eating out limit lowers the spending the forecast plans for |
| 14 | Your Data and Consent | `/consent` | Switches are enforced by the input guardrails; usage log is real |
| | Your plan | `/plan` | History of every change, with undo |
| | Ask Windy | `/chat` | Live Claude chat; its tools see the approved plan |

### Suggested demo order (about 4 minutes)

1. Home: Windy has noticed 4 things. Point at the right-hand panel.
2. "Yes, check my plan" → confirm weekly rent → options A/B/C → review B → approve. Watch the checks.
3. Back on Home: the move card is gone, the December low improved (−$478 → −$318).
4. Forecast → tick "Skip one Westpac Life auto-save" → review → approve. Home: warning gone.
5. Regular payments: add Spotify, dismiss Amazon Prime, cover the insurance rise.
6. Receipt Lens: see the breakdown, save it. Insights: set an Eating out limit.
7. Your plan: show the history and undo one change. Consent: turn goals off and show the refusal.

### Connected receipts (Idea 10)

We don't build a connector to Coles or Woolworths (no public API; that's a business deal). The pitch is that
Westpac plugs into receipt networks that already exist (e.g. Slyp, card-network digital receipts); see
`docs/share/LifePilot-Connected-Receipts` in the planning repo. In the demo:

- `/receipt/settings` has the **Connected merchant receipts** switch, **off by default**. It's a consent
  switch saved in the plan state, so it also shows on the consent screen and **Reset demo** turns it off again.
- Off: the home card offers *Scan receipt* (simulated photo read, `?source=scan`) or *Quick split*; opening a
  receipt shows "Connected receipts are off" with those options instead of the items.
- On: the home card says the store sent the receipt; the breakdown is labelled "Sent by Coles · connected
  receipts"; the Accounts list shows a Receipt chip on linked payments.
- Receipts are the synthetic ones in `data/mia/receipts.json`, linked to card payments by `receipt_id`.
- For the video: start with it off, turn it on in the setting, then open the receipt.

## Where things are

```
server/
  main.py        FastAPI app: endpoints, chat, serves the built frontend
  planner.py     one change: guardrails -> engine -> AI -> checks -> held for approval
  engine.py      Python engine: all calculations from base data + plan state
  guardrails.py  input and output guardrails
  windy_ai.py    AI explanations (Claude) with safe template fallback
  state.py       plan state: saved changes, history, undo, consent, usage log
  tools.py       chat tools (Claude tool use) over the data
app/src/
  api.ts         backend calls and types
  store.tsx      shared app state (snapshot, propose/approve/undo, request log)
  components/    Shell (panels), ui (Card, Chip, TopBar...)
  screens/       one file per screen; Review.tsx is the shared review-and-approve screen
data/            generate.py and the generated JSON
```

## Fake bank data

`data/generate.py` builds 12 months of Mia's banking history (1 Dec 2025 – 14 Nov 2026, ~1,060
transactions across 7 accounts). Python 3, no installs:

```bash
python3 data/generate.py
```

It writes `data/mia/`:

| file | what's in it |
|---|---|
| `accounts.json` | Everyday, Westpac Life, Bills set-aside, and four goal savers (Japan, Emergency, Home deposit, Bali 2027) |
| `transactions.json` / `.csv` | every transaction: raw statement text, cleaned merchant, category, amount, running balance, pending/posted, and tags: `signal: "life-event"`, `receipt_id`, `plan_id` / `instalment` (Afterpay), `auto_save`, `yearly` (CSV is for Excel / Sheets) |
| `receipts.json` | itemised receipts for four grocery shops (Receipt Lens) |
| `upcoming.json` | everything already scheduled for the next 5 weeks: pay, rent, bills, auto-saves, pay-later instalments, yearly bills, each with the account that pays it |

The output is the same on every machine (fixed seed). Don't edit the JSON by hand: change the
script and rerun. The script ends with checks that fail loudly if the data drifts from the story
(closing balances, no overdrawn history, receipt totals, Spotify/Amazon dates, 4 Afterpay plans = $186
on the last payday, November delivery count, "safe to spend" close to the wireframe's $180).

Story built into the data:
- Fortnightly salary + ABN side income; auto-saves every payday to Home deposit, Japan (from Aug), Bali 2027
  (from Mar), Westpac Life, and a Bills set-aside that pays rego and insurance.
- **Idea 1**: moving home in November (removalist, IKEA, Bunnings, $500 from savings, $2,400 RTA bond,
  first $620 rent to Ray White; old rent was $540/wk).
- **Idea 4**: after the move, early December is tight. Projection: about −$478 around 10 Dec; skipping one
  Westpac Life auto-save covers it.
- **Idea 9+15**: Spotify (from Sep) and Amazon Prime (from Oct) to "discover"; Disney+ cancelled in May;
  Netflix up $2; car insurance renewal $720 → $806 (set-aside ends up $8 short); 4 Afterpay plans.
- **Idea 10**: a $142.30 Coles shop on 12 Nov with a receipt; usual main shop about $75.

The **Accounts** tab in the app shows all of it (search and filter by category).

The JSON files are never changed by the app. Everything Mia approves is saved separately in the plan state (below).

## Ask Windy: live AI chat (Claude)

The **Ask Windy** screen (`/chat`) talks to Claude through the backend. Claude doesn't see the raw data and
doesn't do arithmetic: it calls **tools** that compute over the data and the approved plan, then explains. Each
reply shows the tools it used. Chat input goes through the input guardrails too (consent, card or account
numbers removed).

| tool | answers questions like |
|---|---|
| `get_accounts` | "How much is in my accounts?" |
| `spending_by_category` | "What did I spend in October?" |
| `compare_month` | "Am I spending more than usual?" |
| `search_transactions` | "How much on Uber Eats this month?" |
| `recurring_payments` | "What subscriptions do I have?" |
| `cash_flow_forecast` | "Will I run short before payday?" (uses the approved plan) |
| `goal_projection` | "If I save $160 a payday, when do I reach Japan?" (uses the approved plan) |
| `life_events` | "Has anything changed?" |
| `get_receipt` | "What was in my Coles shop?" |
| `pay_later_plans` | "How much do I owe on Afterpay?" |

`server/.env` is gitignored: **never commit the key**, and never put it in `app/` (anything in the frontend
ends up in the browser). Settings: `WINDY_MODEL` (default `claude-opus-5-5`), `WINDY_EFFORT` for chat
(`low` / `medium` / `high`), `WINDY_EXPLAIN_TIMEOUT` (seconds before falling back to the template, default 20).

## Known simplifications

- Today is fixed at 14 Nov 2026 (the end of the generated data), and paydays are fortnightly from 27 Nov.
- The forecast assumes Mia spends only her safe-to-spend until payday, then her usual daily amount.
- Moves between goal accounts are applied to the plan straight away (simulated). Auto-save changes apply from
  the next payday.
- The receipt items are already in the data; in a real app a multimodal model would read the photo and the
  same engine code would group and check the totals.
