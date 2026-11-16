# TrustByte · LifePilot demo (harbour + Windy)

Westpac Innovation and Coding Competition 2026 entry. A clickable phone-sized web app built from the
wireframes on our FigJam board ("Westpac Hackathon 2026 · Idea Board", Draft / Draft 2 sections).

All data is fake (demo user **Mia**). No real bank APIs, no login, and no LLM calls yet: Windy's text is scripted
so the video recording and the live demo work offline.

## Run it

Needs Node 18+.

```bash
cd app
npm install
npm run dev
```

Open http://localhost:5173. On a laptop you see a phone frame plus a **demo navigator** on the left that jumps
to any screen. Press **P** to hide the navigator when recording. On a real phone the app goes full screen.

## Deciding which features to keep

Everything is in **`app/src/features.ts`**. Each feature has:

| field | what it does |
|---|---|
| `enabled` | `false` removes its card from the home page and greys it out in the navigator (still clickable to preview) |
| `hero` | tags it as a headline feature in the navigator |
| `figma` | the wireframe code (LP-01, RL-02, …) so you can compare with the board |

The home page shows one Windy card at a time: the first enabled feature that has a `homeCard`,
or the one in the URL, e.g. `/?card=dream-nudge`. Reorder the list to change the default.

## Where things are

```
app/src/
  features.ts        feature switches + navigator list  ← start here
  data/bank.ts       loads the generated data (data/mia/*.json)
  data/analysis.ts   all calculations (forecast, commitments, goals, receipts)
  data/mia.ts        remaining wireframe copy (LP-04/05 options, unselected screens)
  ai/windy.ts        AI entry point (scripted now, backend later)
  components/ui.tsx  Card, Chip, Toggle, TopBar, BottomNav …
  screens/           one file per wireframe
  styles.css         colours and layout (design tokens at the top)
```

| Screen | Route | Wireframe |
|---|---|---|
| Home (5 card variants) | `/?card=life-event \| dream-nudge \| money-health \| grocery-check \| goal-pace` | LP-01, LP-07, LP-08, RL-01, GP-01 |
| Confirm life event | `/life-event` | LP-02 |
| Goal options | `/goals/options` | LP-04 |
| Review & approve | `/goals/review/B` | LP-05 |
| Cash flow forecast | `/forecast` | Harbour 03 |
| Insights | `/insights` | Harbour 02 |
| Data and consent | `/consent` | DC-01 |
| Confirm income / Budget | `/budget/income`, `/budget` | B-01, B-05 |
| Regular payments | `/payments?found=spotify \| insurance` | R-02, R-03 |
| Receipt breakdown | `/receipt` | RL-02 |
| Loan readiness | `/loan-readiness` | LP-09 |
| Feature Finder | `/ask` | FF-01 |
| Pre-filled home loan | `/home-loan/apply` | PA-01 |

## Selected features (team, 16 Nov)

Ideas **1, 2, 3, 4, 9+15, 10** from the FigJam board, plus the live Windy chat. All other ideas are switched
off in `features.ts` but still open from the navigator for preview.

| Idea | Feature | Screens (route) | Driven by data? |
|---|---|---|---|
| 1 | Life Event Detector | LP-01 `/?card=life-event`, LP-02 `/life-event` | yes: bond, new rent payee, removalist, savings top-up |
| 2 | Goal Trade-off Simulator | LP-04 `/goals/options`, LP-05 `/goals/review/B`, **JP-01** `/goals/japan-sooner`, **JP-02** `/goals/japan-sooner/review?variant=bali\|home` | JP-01/02 yes (goal balances, auto-saves, paydays); LP-04/05 still wireframe copy |
| 3 | Dream Nudge | LP-07 `/?card=dream-nudge` | no (same copy for everyone by design) |
| 4 | Shortfall Early Warning | Harbour 03 `/forecast`, home card | yes: scheduled items + usual spending; fixes re-run the projection |
| 9+15 | Commitments Watch | home card `/?card=commitments`, R-02 `/payments?found=spotify`, R-03 `/payments?found=insurance`, **pay-later** `/pay-later` | yes: recurring payments detected from history, price rises, yearly bills set-aside, Afterpay plans |
| 10 | Receipt Lens | RL-01 `/?card=grocery-check`, RL-02 `/receipt[/:id]`, **RL-03** `/receipt/quick-split` | yes: receipts, usual shop size |

Calculations live in `app/src/data/analysis.ts` (the chat backend has the same logic in `server/tools.py`).

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

## Ask Windy: live AI chat (Claude)

The **Ask Windy** screen (`/chat`, also under More) talks to Claude through a small Python backend.
Claude doesn't see the raw data and doesn't do arithmetic: it calls **tools** (`server/tools.py`) that
compute over `data/mia/*.json` and return totals, then explains them. Each reply shows the tools it used.

| tool | answers questions like |
|---|---|
| `get_accounts` | "How much is in my accounts?" |
| `spending_by_category` | "What did I spend in October?" |
| `compare_month` | "Am I spending more than usual?" (fair same-days comparison for a month that isn't over) |
| `search_transactions` | "How much on Uber Eats this month?" (count and total computed in Python) |
| `recurring_payments` | "What subscriptions do I have?" (detected from history: new / ongoing / stopped, price changes) |
| `cash_flow_forecast` | "Will I run short before payday?" (safe to spend, projected low) |
| `goal_projection` | "If I save $160 a payday, when do I reach Japan?" |
| `life_events` | "Has anything changed?" (moving-home signals) |
| `get_receipt` | "What was in my Coles shop?" |
| `pay_later_plans` | "How much do I owe on Afterpay?" |

Why tools and not RAG: transactions are numbers in a table. Retrieving rows and letting the model add
them up gets totals wrong; code gets them right, and the model only sends summaries back.

### Run it

One-time setup (Python 3.10+):

```bash
python3 -m venv server/.venv
server/.venv/bin/pip install -r server/requirements.txt
cp server/.env.example server/.env    # then put your key after ANTHROPIC_API_KEY=
```

Then, in two terminals:

```bash
cd app && npm run server   # backend on :8787
cd app && npm run dev      # frontend on :5173, proxies /api to the backend
```

`server/.env` is gitignored: **never commit the key**, and never put it in `app/` (anything in the
frontend ends up in the browser). Settings: `WINDY_MODEL` (default `claude-opus-5-5`) and `WINDY_EFFORT`
(`low` / `medium` / `high`, default `medium`; lower is faster and cheaper).

If the model declines a request for policy reasons, the API retries on a fallback model (`fallbacks="default"`).
`GET /api/usage` lists every tool call Windy made (for the "Your record" part of the consent screen).
Conversations live in memory, so restarting the backend starts fresh.

The other screens still use scripted copy from `app/src/ai/windy.ts`, so the demo works with no backend.

## Known gaps in the wireframes (decide as a team)

- Screens now driven by data show different numbers from some wireframe copy. The data is internally
  consistent; the wireframes disagree with each other in places:
  - Forecast (Harbour 03): wireframe −$120 on 3 Dec; data −$478 around 10 Dec. Model: Mia spends only her
    safe-to-spend until payday, then her usual $50/day; auto-saves and Afterpay come out on payday; yearly
    bills come from the set-aside.
  - JP-01/02: wireframe saves $118 a payday for Japan (after plan B); data uses the current $139, so the
    Home deposit redirect is $105 a payday (wireframe $130) and the deposit date is in 2034 (as LP-09), not 2029.
  - RL-01: usual shop is $75 in the data (median of shops over $40), wireframe says about $90.
- LP-04/05 (options A/B/C) are still wireframe copy; LP-05 only details option B.
- Payday is 27 Nov in most screens but 28 Nov in Harbour 03. In 2026, 22 Nov is a Sunday (LP-02 "Sat 22 Nov");
  the app shows the removalist date (Sun 8 Nov) as the moving date.
- The pay-later screen and the Commitments home card are new (the board describes them, no wireframe yet).
- Insights (Harbour 02, not selected) compares November so far with full-month averages; the chat's
  `compare_month` tool uses the fair same-days comparison.
