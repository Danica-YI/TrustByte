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
  data/mia.ts        all mock numbers in one place
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

## Fake bank data

`data/generate.py` builds 6 months of Mia's banking history (1 Jun – 14 Nov 2026, ~450 transactions
across 5 accounts). Python 3, no installs:

```bash
python3 data/generate.py
```

It writes `data/mia/`:

| file | what's in it |
|---|---|
| `accounts.json` | Everyday, Westpac Life, three goal savers, with opening and closing balances |
| `transactions.json` / `.csv` | every transaction: raw statement text, cleaned merchant, category, amount, running balance, pending/posted, and tags such as `signal: "life-event"` or `receipt_id` (CSV is for opening in Excel / Sheets) |
| `receipts.json` | itemised receipts for two grocery shops (Receipt Lens) |
| `upcoming.json` | bills and pay already known for the next 5 weeks (for the forecast) |

The output is the same on every machine (fixed seed). Don't edit the JSON by hand: change the
script and rerun. The script ends with checks that fail loudly if the data drifts from the story
(closing balances, receipt totals, Spotify/Amazon dates, November delivery count, no overdrawn history,
"safe to spend" close to the wireframe's $180).

Story built into the data: fortnightly salary + ABN side income; moving home in November
(removalist, IKEA, Bunnings, $500 from savings, $2,400 RTA bond, first $620 rent to Ray White);
Spotify starting in Sep and Amazon Prime in Oct (for "Windy found 2"); Netflix up $2 in Nov;
14 food deliveries in Nov vs ~8 usually; a $142.30 Coles shop on 12 Nov with a receipt.

The **Accounts** tab in the app shows this data (search and filter by category).

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

- Rent is $620/week in LP-02 but $1,200 in the Harbour 03 forecast.
- LP-05 only details option B; options A and C have no breakdown yet (they fall back to B).
- LP-09 and DC-01 reused the LP-05 template, so some leftover numbers (e.g. "$3,500 →") were dropped.
- Income is $3,303/fortnight in B-01 but $1,450/fortnight in LP-09.
- More tab was not designed; it is a placeholder. Accounts shows the generated data.
- In 2026, 22 Nov is a Sunday (LP-02 says "Sat 22 Nov"). Payday is 27 Nov in most screens but 28 Nov in Harbour 03.
- Harbour 02 compares November *so far* with full-month averages. With the generated data, Subscriptions
  and Bills for 1–14 Nov are well below their monthly averages, so a data-driven Insights screen would
  show November total *below* average. Either compare against the same days of previous months, or use
  "last 30 days".
- Generated averages differ slightly from the wireframe: Subscriptions $84 (wireframe $96), Bills $571 ($576).
  Jun–Oct averages for Eating out, Shopping, Transport and Groceries match exactly. For 1–14 Nov the data
  keeps the wireframe's Eating out ($486) and Shopping ($390), but Transport is $120 and Groceries $260
  (the wireframe's $238 / $412 were full-month sized and made half a month look doubled).
- B-05 shows savings of $495 a fortnight; the data saves $165 + $139 to goals plus $600 to Westpac Life.
- Counting known bills only, Everyday's low is +$197 on 25 Nov (that's the "safe to spend"). Add Mia's
  usual day-to-day spending (~$60 a day) and she dips below $0 *before* the 27 Nov payday, earlier than
  the wireframe's −$120 on 3 Dec. The forecast needs a spending assumption the team agrees on.
