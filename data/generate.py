"""Generate Mia's fake bank data (6 months of transactions) for the LifePilot demo.

    python3 data/generate.py        # writes data/mia/*.json + transactions.csv, then runs checks

Deterministic: a fixed random seed, so every teammate gets identical output.
Stdlib only, no installs needed.

The data is built around the story in the Figma wireframes:
  - "today" is Sat 14 Nov 2026; history starts Mon 1 Jun 2026
  - fortnightly salary (Harbour Health) + variable ABN side income
  - moving home: bond to RTA on 10 Nov, first rent to Ray White on 11 Nov ($620/wk, was $540/wk)
  - new subscriptions Windy can "discover": Spotify from Sep, Amazon Prime from Oct
  - Netflix price rise in Nov, a big Coles shop on 12 Nov with an itemised receipt
  - November spending is up: more food delivery, moving-related shopping

Monthly totals for the six "spending" categories are pinned to the numbers on the
Insights wireframe (Harbour 02) for the flexible categories; fixed bills and
subscriptions come out of the recurring items. The checks at the bottom print the
real numbers so screens can be driven from data instead of hard-coded copy.
"""

from __future__ import annotations

import csv
import json
import random
from collections import defaultdict
from datetime import date, timedelta
from pathlib import Path

SEED = 20261116
START = date(2026, 6, 1)
TODAY = date(2026, 11, 14)
OUT = Path(__file__).parent / "mia"
CARD = "7089"

rng = random.Random(SEED)

# The six categories shown on the Insights screen. Everything else (rent, loans,
# transfers, income, cash, moving) is tracked but not counted as "spending".
SPENDING = ["Eating out", "Shopping", "Transport", "Subscriptions", "Groceries", "Bills and utilities"]

# Flexible categories are scaled to hit these monthly totals exactly.
# Jun–Oct averages match the wireframe: Eating out 310, Shopping 260, Transport 220, Groceries 430.
# Nov is month-to-date (1–14 Nov) and matches the wireframe's November figures.
TARGETS = {
    "Eating out": {6: 295, 7: 330, 8: 300, 9: 320, 10: 305, 11: 486},
    "Shopping":   {6: 240, 7: 290, 8: 250, 9: 270, 10: 250, 11: 390},
    "Transport":  {6: 210, 7: 230, 8: 215, 9: 225, 10: 220, 11: 238},
    "Groceries":  {6: 420, 7: 445, 8: 425, 9: 440, 10: 420, 11: 412},
}

ACCOUNTS = [
    {"id": "everyday", "name": "Everyday", "product": "Choice", "closing_balance": 1678.25},
    {"id": "life", "name": "Westpac Life", "product": "Savings", "closing_balance": 8112.40},
    {"id": "goal-japan", "name": "Japan trip", "product": "Goal saver", "closing_balance": 1140.00, "goal_target": 3500},
    {"id": "goal-emergency", "name": "Emergency fund", "product": "Goal saver", "closing_balance": 2600.00, "goal_target": 6000},
    {"id": "goal-home", "name": "Home deposit", "product": "Goal saver", "closing_balance": 8000.00, "goal_target": 40000},
]

txs: list[dict] = []


def add(d: date, desc: str, merchant: str, category: str, amount: float, kind: str,
        account: str = "everyday", **extra) -> dict:
    t = {
        "date": d.isoformat(),
        "account": account,
        "description": desc,          # raw bank-statement text (messy on purpose)
        "merchant": merchant,         # cleaned name
        "category": category,
        "amount": round(amount, 2),   # negative = money out
        "type": kind,                 # card | direct_debit | bpay | transfer | salary | deposit | atm | payid
    }
    if kind == "card":
        t["card_last4"] = CARD
    t.update(extra)
    txs.append(t)
    return t


def transfer(d: date, frm: str, to: str, amount: float, label: str) -> None:
    names = {a["id"]: a["name"] for a in ACCOUNTS}
    add(d, f"TFR TO {names[to].upper()}", names[to], "Transfers", -amount, "transfer", account=frm, transfer_to=to)
    add(d, f"TFR FROM {names[frm].upper()}", names[frm], "Transfers", amount, "transfer", account=to,
        transfer_from=frm, note=label)


def days(start: date, end: date, step: int):
    d = start
    while d <= end:
        if d >= START:
            yield d
        d += timedelta(days=step)


def monthly(day: int, first_month: int = 6):
    for m in range(first_month, 12):
        d = date(2026, m, day)
        if START <= d <= TODAY:
            yield d


def month_days(m: int):
    last = (date(2026, m + 1, 1) - timedelta(days=1)) if m < 12 else date(2026, 12, 31)
    last = min(last, TODAY)
    return [date(2026, m, i) for i in range(1, last.day + 1)]


# ---------------------------------------------------------------- income
PAYDAYS = list(days(date(2026, 6, 12), TODAY, 14))  # Fridays, last one 13 Nov
for d in PAYDAYS:
    add(d, "SALARY HARBOUR HEALTH PTY LTD", "Harbour Health", "Income", 2883.24, "salary")
    transfer(d, "everyday", "goal-home", 165, "Auto-save each payday")
    transfer(d, "everyday", "life", 600, "Auto-save each payday")
    if d >= date(2026, 8, 7):
        transfer(d, "everyday", "goal-japan", 139, "Auto-save each payday")
    else:
        transfer(d, "everyday", "goal-emergency", 50, "Auto-save each payday")

# ABN side income: varies. B-01 says "avg of last 6 payments $420", lower end $380.
side_dates = [date(2026, 6, 17), date(2026, 7, 1), date(2026, 7, 16), date(2026, 7, 29), date(2026, 8, 13),
              date(2026, 8, 26), date(2026, 9, 9), date(2026, 9, 24), date(2026, 10, 7), date(2026, 10, 21),
              date(2026, 11, 4), date(2026, 11, 11)]
side_amounts = [360.00, 445.50, 398.00, 472.00, 350.00, 415.00, 455.00, 380.00, 410.00, 470.00, 395.00, 410.00]
for d, a in zip(side_dates, side_amounts):
    add(d, "BRIGHTSIDE STUDIO INV", "Brightside Studio (ABN invoice)", "Income", a, "deposit")

# Occasional top-ups from her own savings (B-01: "your own money, not income")
for d in [date(2026, 9, 20), date(2026, 11, 2)]:
    transfer(d, "life", "everyday", 300, "Manual transfer")
# Dipping into savings to cover the bond is itself a life-event signal
transfer(date(2026, 11, 10), "life", "everyday", 500, "Manual transfer · bond")
txs[-2]["signal"] = txs[-1]["signal"] = "life-event"
transfer(date(2026, 11, 13), "everyday", "life", 500, "Paying back the bond top-up")

# ---------------------------------------------------------------- housing / life event
for d in days(date(2026, 6, 4), date(2026, 11, 5), 7):  # old rent, Thursdays
    add(d, "DD NORTHSIDE REALTY RENT 4417", "Northside Realty", "Housing", -540, "direct_debit")
add(date(2026, 11, 8), "SQ *SWIFT MOVERS BRISBANE", "Swift Movers", "Moving", -480, "card", signal="life-event")
add(date(2026, 11, 10), "BPAY RTA QLD BOND LODGEMENT", "RTA Queensland (bond)", "Housing", -2400, "bpay",
    signal="life-event")
add(date(2026, 11, 11), "DD RAY WHITE RENTALS NEW TENANCY", "Ray White Rentals", "Housing", -620, "direct_debit",
    signal="life-event", note="New payee, first payment")

# ---------------------------------------------------------------- bills
for d in monthly(5):
    add(d, "DD TELSTRA 1300 PREPAY", "Telstra", "Bills and utilities", -98, "direct_debit")
for d in monthly(15):
    add(d, "DD BUPA HEALTH INSURANCE", "Bupa", "Bills and utilities", -132.40, "direct_debit")
for d in monthly(24):
    add(d, "DD AUSSIE BROADBAND", "Aussie Broadband", "Bills and utilities", -79, "direct_debit")
add(date(2026, 7, 18), "BPAY ORIGIN ENERGY ELEC", "Origin Energy", "Bills and utilities", -548.20, "bpay")
add(date(2026, 10, 18), "BPAY ORIGIN ENERGY ELEC", "Origin Energy", "Bills and utilities", -571.35, "bpay")
add(date(2026, 8, 28), "BPAY URBAN UTILITIES WATER", "Urban Utilities", "Bills and utilities", -186.90, "bpay")

# ---------------------------------------------------------------- subscriptions
for d in monthly(10):
    add(d, "NETFLIX.COM MELBOURNE", "Netflix", "Subscriptions", -(18.99 if d.month == 11 else 16.99), "card")
for d in monthly(2, first_month=9):
    add(d, "SPOTIFY P2F4A8 SYDNEY", "Spotify Premium", "Subscriptions", -13.99, "card")
for d in monthly(14, first_month=10):
    add(d, "AMAZON PRIME AU MEMBERSHIP", "Amazon Prime", "Subscriptions", -9.99, "card")
for d in monthly(22):
    add(d, "APPLE.COM/BILL ICLOUD", "iCloud+", "Subscriptions", -4.49, "card")
for d in days(date(2026, 6, 2), TODAY, 14):  # Tuesdays; next one 24 Nov, then 8 Dec
    add(d, "DD FITNESS FIRST AUST", "Fitness First", "Subscriptions", -25, "direct_debit")

# ---------------------------------------------------------------- cash and friends
for m in range(6, 12):
    add(date(2026, m, 6), "ATM WDL WESTPAC QUEEN ST", "ATM", "Cash", -50, "atm")
add(date(2026, 7, 11), "PAYID SAM NGUYEN DINNER SPLIT", "Sam Nguyen", "Transfers", 42.50, "payid")
add(date(2026, 9, 13), "PAYID TO PRIYA K BDAY GIFT", "Priya K", "Transfers", -35, "payid")
add(date(2026, 10, 25), "PAYID JORDAN LEE CONCERT TIX", "Jordan Lee", "Transfers", 89, "payid")

# ---------------------------------------------------------------- flexible spending
# Each entry: (description, merchant, typical low, typical high)
POOLS = {
    "Groceries": [("WOOLWORTHS 1234 TOOWONG", "Woolworths", 60, 110), ("COLES 0734 TARINGA", "Coles", 55, 105),
                  ("ALDI STORES MILTON", "Aldi", 35, 70), ("WOOLWORTHS METRO ROMA ST", "Woolworths", 8, 25)],
    "Eating out": [("UBER *EATS HELP.UBER.COM", "Uber Eats", 22, 38), ("MENULOG PTY LTD", "Menulog", 20, 34),
                   ("DOORDASH*AUSTRALIA", "DoorDash", 21, 36), ("SQ *BEAN THERE CAFE", "Bean There Cafe", 5, 14),
                   ("GUZMAN Y GOMEZ TOOWONG", "Guzman y Gomez", 14, 22), ("SQ *SAKURA RAMEN BAR", "Sakura Ramen", 24, 48),
                   ("THE GLASSHOUSE BAR BRIS", "The Glasshouse", 35, 70)],
    "Transport": [("AMPOL TOOWONG 4066", "Ampol", 50, 78), ("BP CONNECT INDOOROOPILLY", "BP", 45, 72),
                  ("TRANSLINK GOCARD TOPUP", "Translink go card", 20, 30), ("UBER *TRIP HELP.UBER.COM", "Uber", 12, 28),
                  ("SECURE PARKING ADELAIDE ST", "Secure Parking", 8, 22)],
    "Shopping": [("KMART TOOWONG", "Kmart", 15, 60), ("UNIQLO BRISBANE CBD", "Uniqlo", 30, 80),
                 ("CHEMIST WAREHOUSE TOOWONG", "Chemist Warehouse", 12, 45), ("AMAZON MKTPLC AU", "Amazon", 18, 70),
                 ("JB HI-FI BRISBANE", "JB Hi-Fi", 25, 90), ("TARGET INDOOROOPILLY", "Target", 20, 60)],
}
DELIVERY = {"Uber Eats", "Menulog", "DoorDash"}

# Other everyday spending that isn't one of the six Insights categories (keeps the data lifelike)
EXTRA_POOLS = {
    "Entertainment": [("EVENT CINEMAS MYER CENTRE", "Event Cinemas", 18, 32), ("TICKETEK AUSTRALIA", "Ticketek", 60, 140),
                      ("STEAM PURCHASE", "Steam", 15, 60), ("THE TIVOLI BRISBANE", "The Tivoli", 40, 80)],
    "Health": [("PRICELINE PHARMACY TOOWONG", "Priceline", 12, 40), ("SQ *TOOWONG PHYSIO", "Toowong Physio", 65, 95),
               ("SMILE DENTAL TARINGA", "Smile Dental (gap)", 60, 120)],
    "Personal care": [("SQ *SALON NINE PADDINGTON", "Salon Nine", 55, 90), ("MECCA BRISBANE", "Mecca", 25, 70)],
}
EXTRA_TARGETS = {"Entertainment": 160, "Health": 110, "Personal care": 85}
ONE_OFFS = [
    (date(2026, 7, 3), "VIRGIN AUSTRALIA AIRLINES", "Virgin Australia", "Travel", 389.00),
    (date(2026, 7, 18), "AIRBNB * HM4K2Q MELBOURNE", "Airbnb", "Travel", 412.60),
    (date(2026, 9, 12), "SEA WORLD RESORT MAIN BEACH", "Sea World Resort", "Travel", 318.00),
    (date(2026, 8, 22), "DAVID JONES QUEEN ST", "David Jones (gift)", "Gifts", 124.95),
    (date(2026, 10, 3), "LIFELINE AUSTRALIA DONATION", "Lifeline (donation)", "Gifts", 50.00),
]

# Fixed items that must appear exactly as on the wireframes
FIXED = {
    11: [
        dict(d=date(2026, 11, 12), desc="COLES 0734 TARINGA", merchant="Coles", cat="Groceries", amt=142.30,
             receipt_id="rcpt-coles-20261112"),
        dict(d=date(2026, 11, 7), desc="WOOLWORTHS 1234 TOOWONG", merchant="Woolworths", cat="Groceries", amt=88.15,
             receipt_id="rcpt-woolies-20261107"),
        dict(d=date(2026, 11, 8), desc="IKEA LOGAN", merchant="IKEA", cat="Shopping", amt=189.00, signal="life-event"),
        dict(d=date(2026, 11, 9), desc="BUNNINGS 6390 MILTON", merchant="Bunnings", cat="Shopping", amt=64.85,
             signal="life-event"),
    ],
}


def pick_count(cat: str, m: int) -> int:
    if cat == "Groceries":
        return 3 if m == 11 else rng.randint(6, 8)  # + fixed Nov shops
    if cat == "Eating out":
        return 0  # handled separately (delivery count matters)
    if cat == "Transport":
        return rng.randint(4, 6) if m == 11 else rng.randint(7, 10)
    return rng.randint(3, 4) if m == 11 else rng.randint(4, 6)


def scaled(items: list[list], target: float) -> None:
    """Scale amounts so they sum to target exactly (to the cent)."""
    total = sum(i[3] for i in items)
    for i in items:
        i[3] = round(i[3] * target / total, 2)
    diff = round(target - sum(i[3] for i in items), 2)
    max(items, key=lambda i: i[3])[3] = round(max(i[3] for i in items) + diff, 2)


for m in range(6, 12):
    mdays = month_days(m)
    fixed = FIXED.get(m, [])
    for cat, targets in TARGETS.items():
        target = targets[m] - sum(f["amt"] for f in fixed if f["cat"] == cat)
        items: list[list] = []
        if cat == "Eating out":
            n_delivery = 14 if m == 11 else rng.randint(7, 9)
            n_other = 4 if m == 11 else rng.randint(6, 9)
            pool = POOLS[cat]
            for _ in range(n_delivery):
                desc, merch, lo, hi = rng.choice([p for p in pool if p[1] in DELIVERY])
                items.append([rng.choice(mdays), desc, merch, rng.uniform(lo, hi)])
            for _ in range(n_other):
                desc, merch, lo, hi = rng.choice([p for p in pool if p[1] not in DELIVERY])
                items.append([rng.choice(mdays), desc, merch, rng.uniform(lo, hi)])
        else:
            busy = {f["d"] for f in fixed if f["cat"] == cat}  # no second shop on a fixed receipt day
            free = [d for d in mdays if d not in busy]
            for _ in range(pick_count(cat, m)):
                desc, merch, lo, hi = rng.choice(POOLS[cat])
                items.append([rng.choice(free), desc, merch, rng.uniform(lo, hi)])
        scaled(items, target)
        for d, desc, merch, amt in items:
            add(d, desc, merch, cat, -amt, "card")
    for cat, base in EXTRA_TARGETS.items():
        target = round(base * (0.5 if m == 11 else rng.uniform(0.8, 1.2)), 2)  # Nov is half a month
        items = []
        for _ in range(2 if m == 11 else rng.randint(2, 4)):
            desc, merch, lo, hi = rng.choice(EXTRA_POOLS[cat])
            items.append([rng.choice(mdays), desc, merch, rng.uniform(lo, hi)])
        scaled(items, target)
        for d, desc, merch, amt in items:
            add(d, desc, merch, cat, -amt, "card")
    for f in fixed:
        extra = {k: f[k] for k in ("receipt_id", "signal") if k in f}
        add(f["d"], f["desc"], f["merchant"], f["cat"], -f["amt"], "card", **extra)

for d, desc, merch, cat, amt in ONE_OFFS:
    add(d, desc, merch, cat, -amt, "card")

# ---------------------------------------------------------------- finalise
KIND_ORDER = {"salary": 0, "deposit": 1, "transfer": 2, "direct_debit": 3, "bpay": 4, "payid": 5, "atm": 6, "card": 7}
txs.sort(key=lambda t: (t["date"], KIND_ORDER[t["type"]], t["description"]))

opening = {}
for a in ACCOUNTS:
    flows = sum(t["amount"] for t in txs if t["account"] == a["id"])
    opening[a["id"]] = round(a["closing_balance"] - flows, 2)
    a["opening_balance"] = opening[a["id"]]
    a["opening_date"] = START.isoformat()

running = dict(opening)
counters: dict[str, int] = defaultdict(int)
for t in txs:
    running[t["account"]] = round(running[t["account"]] + t["amount"], 2)
    t["balance_after"] = running[t["account"]]
    counters[t["date"]] += 1
    t["id"] = f"tx-{t['date'].replace('-', '')}-{counters[t['date']]:03d}"
    # card payments in the last two days haven't settled yet
    t["status"] = "pending" if t["type"] == "card" and t["date"] >= "2026-11-13" else "posted"

KEY_ORDER = ["id", "date", "account", "description", "merchant", "category", "amount", "balance_after", "type",
             "status", "card_last4", "signal", "receipt_id", "transfer_to", "transfer_from", "note"]
txs = [{k: t[k] for k in KEY_ORDER if k in t} for t in txs]

# ---------------------------------------------------------------- receipts (Receipt Lens, RL-02)
RECEIPTS = [
    {
        "id": "rcpt-coles-20261112", "merchant": "Coles", "store": "Coles Taringa", "date": "2026-11-12",
        "total": 142.30,
        "items": [
            # Essentials 86.40
            ("Coles Full Cream Milk 3L", 4.65, "Essentials"), ("Helga's Wholemeal Bread 750g", 5.50, "Essentials"),
            ("Free Range Eggs 12pk", 7.20, "Essentials"), ("Chicken Breast Fillets 1kg", 13.00, "Essentials"),
            ("Beef Mince 500g", 8.50, "Essentials"), ("Bananas 1kg", 3.90, "Essentials"),
            ("Broccoli each", 2.50, "Essentials"), ("Carrots 1kg", 2.20, "Essentials"),
            ("Jasmine Rice 5kg", 12.50, "Essentials"), ("Greek Yoghurt 1kg", 6.50, "Essentials"),
            ("Tasty Cheese Block 500g", 8.95, "Essentials"), ("Baby Spinach 280g", 5.00, "Essentials"),
            ("Tinned Tomatoes 4pk", 6.00, "Essentials"),
            # Extras and snacks 38.20
            ("Tim Tam Original", 5.50, "Extras and snacks"), ("Smith's Chips Party Pack", 9.00, "Extras and snacks"),
            ("Ben & Jerry's 458ml", 12.50, "Extras and snacks"), ("Coca-Cola 10x375ml", 11.20, "Extras and snacks"),
            # Household 17.70
            ("Dishwashing Liquid 900ml", 4.20, "Household"), ("Paper Towel 4pk", 6.50, "Household"),
            ("Laundry Liquid 2L", 7.00, "Household"),
        ],
    },
    {
        "id": "rcpt-woolies-20261107", "merchant": "Woolworths", "store": "Woolworths Toowong", "date": "2026-11-07",
        "total": 88.15,
        "items": [
            ("Woolworths Milk 2L", 3.10, "Essentials"), ("Sourdough Loaf", 6.00, "Essentials"),
            ("Chicken Thigh Fillets 1kg", 14.00, "Essentials"), ("Salmon Fillets 2pk", 18.50, "Essentials"),
            ("Apples 1kg", 5.90, "Essentials"), ("Tomatoes 500g", 4.50, "Essentials"),
            ("Pasta 500g x2", 3.60, "Essentials"), ("Pasta Sauce 500g", 3.50, "Essentials"),
            ("Oats 1kg", 3.80, "Essentials"), ("Frozen Peas 1kg", 3.25, "Essentials"),
            ("Dark Chocolate Block", 5.00, "Extras and snacks"), ("Sparkling Water 10pk", 7.00, "Extras and snacks"),
            ("Toilet Paper 12pk", 10.00, "Household"),
        ],
    },
]
receipts_out = [
    {**{k: v for k, v in r.items() if k != "items"},
     "items": [{"name": n, "price": p, "group": g} for n, p, g in r["items"]]}
    for r in RECEIPTS
]

# ---------------------------------------------------------------- upcoming (next 5 weeks, for the forecast)
# What the bank already knows is coming: schedules from the history above plus yearly bills
# the customer added (R-02). estimate=True means the amount is a guess.
UPCOMING = []


def up(d: date, label: str, amount: float, source: str, estimate: bool = False) -> None:
    UPCOMING.append({"date": d.isoformat(), "label": label, "amount": amount, "source": source, "estimate": estimate})


for d in days(date(2026, 11, 18), date(2026, 12, 19), 7):
    up(d, "Rent · Ray White", -620, "detected weekly from 11 Nov")
for d in days(date(2026, 11, 27), date(2026, 12, 19), 14):
    up(d, "Salary · Harbour Health", 2883.24, "detected fortnightly")
for d in days(date(2026, 11, 24), date(2026, 12, 19), 14):
    up(d, "Gym · Fitness First", -25, "detected fortnightly")
up(date(2026, 11, 15), "Bupa health insurance", -132.40, "detected monthly")
up(date(2026, 11, 22), "iCloud+", -4.49, "detected monthly")
up(date(2026, 11, 24), "Aussie Broadband", -79, "detected monthly")
up(date(2026, 12, 2), "Spotify Premium", -13.99, "Windy found (not confirmed)")
up(date(2026, 12, 3), "Car rego · QLD TMR", -412, "added by customer")
up(date(2026, 12, 5), "Telstra", -98, "detected monthly")
up(date(2026, 12, 5), "Car insurance · AAMI", -806, "renewal notice (was $720)")
up(date(2026, 12, 10), "Netflix", -18.99, "detected monthly")
up(date(2026, 12, 14), "Amazon Prime", -9.99, "Windy found (not confirmed)")
up(date(2026, 12, 15), "Bupa health insurance", -132.40, "detected monthly")
UPCOMING.sort(key=lambda u: u["date"])

# ---------------------------------------------------------------- write
OUT.mkdir(parents=True, exist_ok=True)
(OUT / "upcoming.json").write_text(json.dumps({"today": TODAY.isoformat(), "upcoming": UPCOMING}, indent=2) + "\n")
meta = {"user": "Mia", "today": TODAY.isoformat(), "from": START.isoformat(), "seed": SEED,
        "note": "Synthetic data for a hackathon demo. Not real people or accounts."}
(OUT / "accounts.json").write_text(json.dumps({"meta": meta, "accounts": ACCOUNTS}, indent=2) + "\n")
(OUT / "transactions.json").write_text(json.dumps({"meta": meta, "transactions": txs}, indent=2) + "\n")
(OUT / "receipts.json").write_text(json.dumps({"meta": meta, "receipts": receipts_out}, indent=2) + "\n")
with (OUT / "transactions.csv").open("w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=KEY_ORDER)
    w.writeheader()
    w.writerows(txs)

# ---------------------------------------------------------------- checks + report
errors: list[str] = []


def check(cond: bool, msg: str) -> None:
    if not cond:
        errors.append(msg)


for a in ACCOUNTS:
    last = [t for t in txs if t["account"] == a["id"]][-1]["balance_after"]
    check(abs(last - a["closing_balance"]) < 0.005, f"{a['id']} closing {last} != {a['closing_balance']}")
    check(a["opening_balance"] >= 0, f"{a['id']} opening balance negative: {a['opening_balance']}")

for r in receipts_out:
    s = round(sum(i["price"] for i in r["items"]), 2)
    check(abs(s - r["total"]) < 0.005, f"receipt {r['id']} items sum {s} != total {r['total']}")
    tx = [t for t in txs if t.get("receipt_id") == r["id"]]
    check(len(tx) == 1 and abs(-tx[0]["amount"] - r["total"]) < 0.005, f"receipt {r['id']} not linked to one matching tx")
coles = next(r for r in receipts_out if r["id"] == "rcpt-coles-20261112")
groups = defaultdict(float)
for i in coles["items"]:
    groups[i["group"]] += i["price"]
for g, want in {"Essentials": 86.40, "Extras and snacks": 38.20, "Household": 17.70}.items():
    check(abs(groups[g] - want) < 0.005, f"Coles group {g} = {groups[g]:.2f}, wireframe says {want}")


def dates_of(merchant: str) -> list[str]:
    return [t["date"] for t in txs if t["merchant"] == merchant]


check(dates_of("Spotify Premium") == ["2026-09-02", "2026-10-02", "2026-11-02"], "Spotify dates differ from R-02")
check(dates_of("Amazon Prime") == ["2026-10-14", "2026-11-14"], "Amazon Prime dates differ from R-02")
check(max(dates_of("Harbour Health")) == "2026-11-13", "last salary should be 13 Nov (B-01)")

monthly_cat: dict[int, dict[str, float]] = defaultdict(lambda: defaultdict(float))
delivery: dict[int, int] = defaultdict(int)
for t in txs:
    if t["account"] == "everyday" and t["category"] in SPENDING:
        monthly_cat[int(t["date"][5:7])][t["category"]] += -t["amount"]
    if t["merchant"] in DELIVERY:
        delivery[int(t["date"][5:7])] += 1
for cat, targets in TARGETS.items():
    for m, want in targets.items():
        check(abs(monthly_cat[m][cat] - want) < 0.005, f"{cat} month {m}: {monthly_cat[m][cat]:.2f} != {want}")
check(delivery[11] == 14, f"Nov delivery orders {delivery[11]} != 14 (Harbour 02)")

everyday = [t for t in txs if t["account"] == "everyday"]
low = min(everyday, key=lambda t: t["balance_after"])
for a in ACCOUNTS:
    neg = [t for t in txs if t["account"] == a["id"] and t["balance_after"] < 0]
    check(not neg, f"{a['id']} goes negative: {neg[0]['balance_after'] if neg else 0} on {neg[0]['date'] if neg else ''}")

print(f"Wrote {len(txs)} transactions ({len(everyday)} on Everyday), {len(receipts_out)} receipts to {OUT}/")
print("\nOpening balances on", START, {k: v for k, v in opening.items()})
print(f"Everyday lowest point: {low['balance_after']:.2f} on {low['date']} ({low['description']})")
next_pay = min(u["date"] for u in UPCOMING if u["amount"] > 0)
committed = -sum(u["amount"] for u in UPCOMING if u["date"] < next_pay)
safe = ACCOUNTS[0]["closing_balance"] - committed
print(f"Safe to spend until payday {next_pay}: {safe:.2f} (balance minus {committed:.2f} of known bills; wireframe says $180)")
check(150 <= safe <= 220, f"safe-to-spend {safe:.2f} drifted far from the wireframe's $180")
print("\nSpending by month (Everyday):")
print("      " + "".join(f"{c[:12]:>13}" for c in SPENDING) + "        Total  Delivery")
for m in range(6, 12):
    row = monthly_cat[m]
    print(f"  {m:>2}  " + "".join(f"{row[c]:>13.2f}" for c in SPENDING) + f"{sum(row.values()):>13.2f}{delivery[m]:>10}")
avg = {c: sum(monthly_cat[m][c] for m in range(6, 11)) / 5 for c in SPENDING}
print("  avg " + "".join(f"{avg[c]:>13.2f}" for c in SPENDING) + f"{sum(avg.values()):>13.2f}"
      + f"{sum(delivery[m] for m in range(6, 11)) / 5:>10.1f}")

if errors:
    print("\nCHECKS FAILED:")
    for e in errors:
        print("  ✗", e)
    raise SystemExit(1)
print("\nAll checks passed.")
