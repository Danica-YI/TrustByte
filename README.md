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

## Adding real AI later

See the comment at the top of `app/src/ai/windy.ts`. Short version: put the API key in a small backend,
never in the frontend, and point `VITE_WINDY_API` at it. If the backend fails, the scripted copy shows instead.

## Known gaps in the wireframes (decide as a team)

- Rent is $620/week in LP-02 but $1,200 in the Harbour 03 forecast.
- LP-05 only details option B; options A and C have no breakdown yet (they fall back to B).
- LP-09 and DC-01 reused the LP-05 template, so some leftover numbers (e.g. "$3,500 →") were dropped.
- Income is $3,303/fortnight in B-01 but $1,450/fortnight in LP-09.
- Accounts and More tabs were not designed; they are placeholders.
