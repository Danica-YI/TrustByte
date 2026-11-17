# Windy · video and demo script

Deck: `Windy-pitch.pptx` (PDF copy beside it). Speaker notes in the deck carry the same lines as below.
Numbers below were checked against the running app on 17 Nov (after **Reset demo**).

**Submission (handbook p.2):** email `GoldCoastEngineeringHub@westpac.com.au` by **4:00 pm today, 17 Nov**,
with university, team name, team member names (min 2), a summary of the idea (what we want to achieve, why
it's a good idea), a **YouTube link to a video of the team presenting with a software demo (10 min max)**, and
any other links. Draft email at the bottom.

---

## Before you record (5 minutes)

1. `./run.sh` from the repo root (or `cd app && npm run server` + `npm run dev`). Open http://localhost:8787
   in a full-width browser window, zoom 100%.
2. Check `server/.env` has the API key, so the review screens say **AI explained** (without a key they use
   templates, which still work).
3. Click **Reset demo** (left panel). Home should show: *Looks like you're moving home*, *Early December looks
   tight (−$478)*, *Found 2 new regular payments*, *Bigger grocery shop than usual*, and the Dream Nudge card
   (*$30 a week could take you somewhere*).
4. Keep both side panels visible. The right-hand **Behind the scenes** panel is our proof of the architecture
   and guardrails. (P hides them if you want a phone-only shot.)
5. Record screen + voice (QuickTime: File › New Screen Recording, or OBS). Upload to YouTube as **Unlisted**.
6. Rehearse steps 5–8 of the demo once: they weren't run end to end in this check.
7. If you pulled the latest `main` before 12:05 on 17 Nov, pull again: a merge left a line in `Home.tsx` that
   stopped `npm run build` (and so `./run.sh`). Fixed in the commit that added this folder.

## Run of show (about 9½ minutes)

| Time | Slide / screen | Who | What to say (short) |
|---|---|---|---|
| 0:00 | 1 · Windy | — | We're Team TrustByte. Windy is an AI assistant inside the Westpac app: it notices when life changes your money, works out the options, explains them, and you decide. |
| 0:25 | 2 · Problem | — | 35% of adults find it hard to get by; 11.2 years to save a deposit, rents at a record 33.1% of income; 45.2% of people entering insolvency had BNPL debt. Apps show where money went, not what it can do next. |
| 1:15 | 3 · Key question | — | "We have the transactions. But then what can we do with them?" |
| 1:30 | 4 · Windy | — | Notices → works it out (Python engine) → explains (AI) → you decide. |
| 2:10 | 5 · Six features | — | All six built: life events, goal trade-offs, shortfall warning, commitments, Receipt Lens, Dream Nudge. Plus live chat, plan history with undo, save together. |
| 3:00 | 6 · How it works | — | Code does the maths, the AI explains, the customer decides. AI sees summaries only. 76 tests. |
| 3:40 | 7 · Guardrails | — | Consent switches, numbers must match the calculator, financial checks, no advice or health talk, nothing moves without approval. |
| 4:20 | 8 · What's new | — | Today vs with Windy. Builds on Savings Goals, Bills Calendar, Budget Planner. |
| 4:50 | 9 · Mia | — | Meet Mia, 24. Detect, decide, free up money. "Let us show you." |
| 5:15 | **Live demo** (below) | — | about 3½ minutes |
| 8:45 | 11 · Criteria | — | One line per criterion. |
| 9:20 | 12 · Close | — | The wind behind your plans. Next steps. Thank you. |

Fill the **Who** column when you split the talking (the handbook asks for the team presenting).

## Live demo, click by click

Start on Home after **Reset demo**.

1. **Home.** "Windy has noticed four things" (plus a Dream Nudge invitation at the bottom). Point at the right panel: "Every
   request goes through these layers."
2. **Confirm the move.** *Yes, check my plan* → evidence: Swift Movers −$480, RTA bond −$2,400,
   Ray White −$620, $500 from Westpac Life. "Windy asks; it never assumes." Leave **Weekly** →
   *Confirm and see my options*.
3. **Goal options.** "Rent is up $160 a fortnight ($1,080 → $1,240). Three options; Windy won't pick."
   *Review option B* → wait for **13 of 13 checks passed** and **AI explained** → point at the right panel
   checks ("every number in that sentence matches the calculator") → *Approve plan*.
   Result: December low **−$478 → −$318**, Japan **Jul → Aug 2027**, home deposit **Apr 2034 → May 2035**.
4. **Forecast.** Home → *See forecast and fixes*. "On payday $734 of auto-saves and $186 of
   pay-later go out." *Skip one Westpac Life auto-save* is ticked → *Review selected fixes* → low **−$318 → $42**
   → *Approve plan*. Back on Home: the December warning is gone.
5. **Regular payments.** Home → *Review* on the Commitments card. Spotify: *Yes, add to regular
   payments*. Amazon Prime: *Not a regular payment*. Car insurance up 12% to $806 (was $720): cover the rise
   in the Bills set-aside. Open *Pay-later*: 4 plans, $186 next payday.
6. **Receipt Lens.** Home → grocery card (Coles $142.30, usually about $75). Off by default: show
   *Get receipts automatically ›* → turn on **Connected merchant receipts** → open the receipt: *Sent by Coles ·
   connected receipts*, Essentials $86.40 / Extras $38.20 / Household $17.70, total matches → *Save breakdown*.
   Say: "We don't build a connector to Coles; this plugs into receipt networks banks already use."
7. **Dream Nudge, then Your plan.** Home → Dream Nudge card → *Show me*: pick $30 a week and see what it
   adds up to (it doesn't read Mia's spending). Then More → *Your plan and history*: every change, with *Undo*.
   Undo one to show it.
8. **Consent, then Ask Windy.** More → *Your data and consent*: switch one feature off, try to use it, show the
   refusal in Behind the scenes ("the backend refuses, not just the screen"). Switch it back on. Then *Ask
   Windy*: "Will I run short before payday?" Windy answers from the live plan, shows which data it used, and
   offers follow-ups.

**If something breaks on camera:** Reset demo and cut the clip. If the AI is slow, wait: the review screen
falls back to a safe template on its own, which is still a valid demo of the guardrails.

## 5-minute version (awards day, if shortlisted)

1. Slide 2, problem: 30 s
2. Slides 4 + 6, Windy and how it works: 60 s
3. Demo steps 1–4 only (move → plan B → forecast fix): 2 min
4. Slide 7, guardrails: 45 s
5. Slide 12, close and next steps: 30 s

Bring the laptop with the app running locally; don't rely on the venue network (the review screens fall back to
templates without it).

## Draft submission email

> **To:** GoldCoastEngineeringHub@westpac.com.au
> **Subject:** Hackathon 2026 submission · Team TrustByte · Windy
>
> University: [fill in]
> Team name: TrustByte
> Team members: [fill in, full names]
>
> **What we are trying to achieve**
> Windy is an AI assistant inside the Westpac app that notices when a life change affects a customer's money
> and helps them act before it becomes a problem. It reads signals the bank already holds (for example a
> rental bond and a new rent payee mean "you moved"), works out what that does to every savings goal and to
> the balance before payday, explains the options in plain language, and lets the customer approve a change.
> In our demo, Mia sees her account dip to −$478 three weeks ahead and fixes it in two approvals.
>
> **Why we believe it's a good idea**
> - Money pressure is widespread: about 1 in 3 adults find it hard to get by on their income, and plans
>   usually break after one change. Banking apps show where money went, not what it can do next.
> - It builds on what Westpac already has (Savings Goals, Bills Calendar, Budget Planner) and on data the
>   bank already holds.
> - It's safe by design: a Python engine does every calculation, the AI only explains, every AI sentence is
>   checked against the engine, each feature has a consent switch, and nothing changes without approval.
> - It works today on synthetic data: React, FastAPI, a Python engine, SQLite plan state and an AI model with
>   tool use, with 76 automated tests.
>
> Video (10 min): [YouTube link]
> Code: [repo link, or "available on request" if the repo stays private]
> Slides: attached
