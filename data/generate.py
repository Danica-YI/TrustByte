"""Generate Mia's fake bank data (12 months of transactions) for the LifePilot demo.

    python3 data/generate.py        # writes data/mia/*.json + transactions.csv, then runs checks

Deterministic: a fixed random seed, so every teammate gets identical output.
Stdlib only, no installs needed.

The story built into the data (see the Figma wireframes):
  - "today" is Sat 14 Nov 2026; history starts Mon 1 Dec 2025
  - fortnightly salary (Harbour Health, Fridays) + variable ABN side income
  - auto-saves every payday: Home deposit, Japan trip (from Aug), Bali 2027 (from Mar),
    Westpac Life, and a Bills set-aside that pays yearly bills (rego, insurance)
  - Idea 1 · moving home: removalist, IKEA, $500 from savings, $2,400 RTA bond on 10 Nov,
    first rent to Ray White on 11 Nov ($620/wk, was $540/wk)
  - Idea 9+15 · commitments: Spotify (from Sep) and Amazon Prime (from Oct) to "discover",
    Disney+ cancelled in May, Netflix up $2 in Nov, car insurance renewal up 12%,
    four Afterpay plans taking $186 each payday
  - Idea 10 · receipts: itemised receipts for several grocery shops, incl. the $142.30 Coles shop
  - Idea 4 · upcoming.json lists everything already scheduled for the next 5 weeks, so the
    forecast can show early December getting tight after the move
"""

from __future__ import annotations

import csv
import json
import random
from collections import defaultdict
from datetime import date, timedelta
from pathlib import Path

SEED = 20261116
START = date(2025, 12, 1)
TODAY = date(2026, 11, 14)
OUT = Path(__file__).parent / "mia"
CARD = "7089"

rng = random.Random(SEED)

# The six categories shown on the Insights screen. Everything else (rent, transfers, income,
# cash, moving, pay later, travel...) is tracked but not counted as "spending" there.
SPENDING = ["Eating out", "Shopping", "Transport", "Subscriptions", "Groceries", "Bills and utilities"]
MONTHS = [(2025, 12)] + [(2026, m) for m in range(1, 12)]

# Flexible categories are scaled to hit these monthly totals exactly.
# Jun–Oct averages match the Insights wireframe: Eating out 310, Shopping 260, Transport 220, Groceries 430.
# Dec 2025 is Christmas. Nov 2026 is month-to-date (1–14 Nov), and moving week: no kitchen, new furniture.
TARGETS = {
    "Eating out": {12: 380, 1: 300, 2: 285, 3: 310, 4: 300, 5: 315, 6: 295, 7: 330, 8: 300, 9: 320, 10: 305, 11: 486},
    "Shopping":   {12: 430, 1: 230, 2: 240, 3: 250, 4: 260, 5: 250, 6: 240, 7: 290, 8: 250, 9: 270, 10: 250, 11: 390},
    "Transport":  {12: 200, 1: 190, 2: 215, 3: 220, 4: 225, 5: 210, 6: 210, 7: 230, 8: 215, 9: 225, 10: 220, 11: 120},
    "Groceries":  {12: 470, 1: 430, 2: 420, 3: 425, 4: 430, 5: 420, 6: 420, 7: 445, 8: 425, 9: 440, 10: 420, 11: 260},
}

ACCOUNTS = [
    {"id": "everyday", "name": "Everyday", "product": "Choice", "closing_balance": 1678.25},
    {"id": "life", "name": "Westpac Life", "product": "Savings", "closing_balance": 12240.40},
    {"id": "bills-saver", "name": "Bills set-aside", "product": "Savings",
     "closing_balance": 1150.00, "note": "Pays yearly bills: car rego, car insurance, contents insurance"},
    {"id": "goal-japan", "name": "Japan trip", "product": "Goal saver", "closing_balance": 1140.00, "goal_target": 3500},
    {"id": "goal-emergency", "name": "Emergency fund", "product": "Goal saver", "closing_balance": 2600.00, "goal_target": 6000},
    {"id": "goal-home", "name": "Home deposit", "product": "Goal saver", "closing_balance": 8000.00, "goal_target": 40000},
    {"id": "goal-bali", "name": "Bali 2027", "product": "Goal saver", "closing_balance": 900.00, "goal_target": 2500,
     "goal_date": "2027-09-01"},
]
NAMES = {a["id"]: a["name"] for a in ACCOUNTS}

# Auto-saves on every payday (account, amount, first payday it applies to, last payday)
AUTO_SAVES = [
    ("goal-home", 165, date(2025, 12, 1), None),
    ("goal-emergency", 50, date(2025, 12, 1), date(2026, 7, 31)),  # stopped at the 3-month minimum
    ("goal-japan", 139, date(2026, 8, 1), None),
    ("goal-bali", 50, date(2026, 3, 20), None),
    ("bills-saver", 60, date(2025, 12, 1), None),
    ("life", 480, date(2025, 12, 1), None),
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


def transfer(d: date, frm: str, to: str, amount: float, label: str, **extra) -> None:
    add(d, f"TFR TO {NAMES[to].upper()}", NAMES[to], "Transfers", -amount, "transfer", account=frm,
        transfer_to=to, note=label, **extra)
    add(d, f"TFR FROM {NAMES[frm].upper()}", NAMES[frm], "Transfers", amount, "transfer", account=to,
        transfer_from=frm, note=label, **extra)


def days(start: date, end: date, step: int):
    d = start
    while d <= end:
        if d >= START:
            yield d
        d += timedelta(days=step)


def monthly(day: int, first: date = START, last: date = TODAY):
    for y, m in MONTHS:
        d = date(y, m, day)
        if max(START, first) <= d <= min(TODAY, last):
            yield d


def month_days(y: int, m: int) -> list[date]:
    nxt = date(y + (m == 12), m % 12 + 1, 1)
    last = min(nxt - timedelta(days=1), TODAY)
    return [date(y, m, i) for i in range(1, last.day + 1)]


# ---------------------------------------------------------------- income + auto-saves
PAYDAYS = list(days(date(2025, 12, 12), TODAY, 14))  # Fridays; last one 13 Nov, next 27 Nov
for d in PAYDAYS:
    add(d, "SALARY HARBOUR HEALTH PTY LTD", "Harbour Health", "Income", 2883.24, "salary")
    for acct, amt, first, last in AUTO_SAVES:
        if d >= first and (last is None or d <= last):
            transfer(d, "everyday", acct, amt, "Auto-save each payday", auto_save=True)

# ABN side income: varies. B-01 says "avg of last 6 payments $420", lower end $380.
side = [(date(2026, 9, 9), 455.00), (date(2026, 9, 24), 380.00), (date(2026, 10, 7), 410.00),
        (date(2026, 10, 21), 470.00), (date(2026, 11, 4), 395.00), (date(2026, 11, 11), 410.00)]
d = date(2025, 12, 3)
while d < date(2026, 9, 1):
    side.append((d, round(rng.uniform(340, 480) / 5) * 5 + rng.choice([0, 0.5])))
    d += timedelta(days=rng.choice([13, 14, 14, 15]))
for d, a in sorted(side):
    add(d, "BRIGHTSIDE STUDIO INV", "Brightside Studio (ABN invoice)", "Income", a, "deposit")

# Own money moved back from savings (B-01: "your own money, not income")
for d in [date(2026, 1, 9), date(2026, 9, 20), date(2026, 11, 2)]:
    transfer(d, "life", "everyday", 300, "Manual transfer")
# Dipping into savings to cover the bond is itself a life-event signal
transfer(date(2026, 11, 10), "life", "everyday", 500, "Manual transfer · bond", signal="life-event")
transfer(date(2026, 11, 13), "everyday", "life", 500, "Paying back the bond top-up")

# ---------------------------------------------------------------- housing / life event (Idea 1)
for d in days(date(2025, 12, 4), date(2026, 11, 5), 7):  # old rent, Thursdays
    add(d, "DD NORTHSIDE REALTY RENT 4417", "Northside Realty", "Housing", -540, "direct_debit")
add(date(2026, 11, 8), "SQ *SWIFT MOVERS BRISBANE", "Swift Movers", "Moving", -480, "card", signal="life-event")
add(date(2026, 11, 10), "BPAY RTA QLD BOND LODGEMENT", "RTA Queensland (bond)", "Housing", -2400, "bpay",
    signal="life-event")
add(date(2026, 11, 11), "DD RAY WHITE RENTALS NEW TENANCY", "Ray White Rentals", "Housing", -620, "direct_debit",
    signal="life-event", note="New payee, first payment")

# ---------------------------------------------------------------- bills (Everyday)
for d in monthly(5):
    add(d, "DD TELSTRA 1300 PREPAY", "Telstra", "Bills and utilities", -98, "direct_debit")
for d in monthly(15):
    add(d, "DD BUPA HEALTH INSURANCE", "Bupa", "Bills and utilities", -132.40, "direct_debit")
for d in monthly(24):
    add(d, "DD AUSSIE BROADBAND", "Aussie Broadband", "Bills and utilities", -79, "direct_debit")
for d, a in [(date(2026, 1, 18), 612.40), (date(2026, 4, 18), 498.75), (date(2026, 7, 18), 548.20),
             (date(2026, 10, 18), 571.35)]:
    add(d, "BPAY ORIGIN ENERGY ELEC", "Origin Energy", "Bills and utilities", -a, "bpay")
for d, a in [(date(2026, 2, 27), 178.60), (date(2026, 5, 28), 181.20), (date(2026, 8, 28), 186.90)]:
    add(d, "BPAY URBAN UTILITIES WATER", "Urban Utilities", "Bills and utilities", -a, "bpay")

# ---------------------------------------------------------------- yearly bills (Bills set-aside)
add(date(2025, 12, 3), "BPAY QLD TMR VEHICLE REGO", "Car rego · QLD TMR", "Bills and utilities", -398.00, "bpay",
    account="bills-saver", yearly=True)
add(date(2025, 12, 5), "BPAY AAMI CAR INSURANCE RENEWAL", "Car insurance · AAMI", "Bills and utilities", -720.00,
    "bpay", account="bills-saver", yearly=True, note="2024 renewal was $650")
add(date(2026, 3, 2), "BPAY YOUI CONTENTS INSURANCE", "Contents insurance · Youi", "Bills and utilities", -416.00,
    "bpay", account="bills-saver", yearly=True)

# ---------------------------------------------------------------- subscriptions
for d in monthly(10):
    add(d, "NETFLIX.COM MELBOURNE", "Netflix", "Subscriptions", -(18.99 if d.month == 11 else 16.99), "card")
for d in monthly(2, first=date(2026, 9, 1)):
    add(d, "SPOTIFY P2F4A8 SYDNEY", "Spotify Premium", "Subscriptions", -13.99, "card")
for d in monthly(14, first=date(2026, 10, 1)):
    add(d, "AMAZON PRIME AU MEMBERSHIP", "Amazon Prime", "Subscriptions", -9.99, "card")
for d in monthly(22):
    add(d, "APPLE.COM/BILL ICLOUD", "iCloud+", "Subscriptions", -4.49, "card")
for d in monthly(19, last=date(2026, 5, 31)):  # cancelled after May
    add(d, "DISNEY PLUS AU", "Disney+", "Subscriptions", -15.99, "card")
for d in days(date(2025, 12, 9), TODAY, 14):  # Tuesdays; next one 24 Nov, then 8 Dec
    add(d, "DD FITNESS FIRST AUST", "Fitness First", "Subscriptions", -25, "direct_debit")

# ---------------------------------------------------------------- pay later (Idea 9+15)
# Each plan: 4 instalments a fortnight apart. The current ones fall on paydays.
PLANS = [
    ("ap-myer-2512", "Myer", 280.00, date(2025, 12, 12)),
    ("ap-iconic-2606", "THE ICONIC", 160.00, date(2026, 6, 12)),
    ("ap-chemist-2610", "Chemist Warehouse", 39.00, date(2026, 10, 16)),
    ("ap-jbhifi-2610", "JB Hi-Fi", 349.00, date(2026, 10, 30)),
    ("ap-uniqlo-2611", "Uniqlo", 120.00, date(2026, 11, 13)),
    ("ap-fantastic-2611", "Fantastic Furniture", 236.00, date(2026, 11, 13)),
]
UPCOMING: list[dict] = []


def up(d: date, label: str, amount: float, source: str, account: str = "everyday", kind: str = "bill",
       estimate: bool = False, **extra) -> None:
    UPCOMING.append({"date": d.isoformat(), "label": label, "amount": round(amount, 2), "account": account,
                     "kind": kind, "source": source, "estimate": estimate, **extra})


HORIZON = TODAY + timedelta(days=35)
for pid, merchant, total, first in PLANS:
    inst = round(total / 4, 2)
    for k in range(4):
        d = first + timedelta(days=14 * k)
        extra = {"plan_id": pid, "plan_total": total, "instalment": f"{k + 1} of 4", "provider": "Afterpay"}
        if d <= TODAY:
            add(d, f"AFTERPAY *{merchant.upper()}", f"Afterpay · {merchant}", "Pay later", -inst, "direct_debit", **extra)
        elif d <= HORIZON:
            up(d, f"Afterpay · {merchant} ({k + 1} of 4)", -inst, "pay-later plan", kind="pay_later", **extra)

# ---------------------------------------------------------------- cash and friends
for y, m in MONTHS:
    if date(y, m, 6) <= TODAY:
        add(date(y, m, 6), "ATM WDL WESTPAC QUEEN ST", "ATM", "Cash", -50, "atm")
for d, desc, who, a in [(date(2026, 1, 24), "PAYID SAM NGUYEN BEACH HOUSE", "Sam Nguyen", -180),
                        (date(2026, 7, 11), "PAYID SAM NGUYEN DINNER SPLIT", "Sam Nguyen", 42.50),
                        (date(2026, 9, 13), "PAYID TO PRIYA K BDAY GIFT", "Priya K", -35),
                        (date(2026, 10, 25), "PAYID JORDAN LEE CONCERT TIX", "Jordan Lee", 89)]:
    add(d, desc, who, "Transfers", a, "payid")

# ---------------------------------------------------------------- flexible spending
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
EXTRA_POOLS = {
    "Entertainment": [("EVENT CINEMAS MYER CENTRE", "Event Cinemas", 18, 32), ("TICKETEK AUSTRALIA", "Ticketek", 60, 140),
                      ("STEAM PURCHASE", "Steam", 15, 60), ("THE TIVOLI BRISBANE", "The Tivoli", 40, 80)],
    "Health": [("PRICELINE PHARMACY TOOWONG", "Priceline", 12, 40), ("SQ *TOOWONG PHYSIO", "Toowong Physio", 65, 95),
               ("SMILE DENTAL TARINGA", "Smile Dental (gap)", 60, 120)],
    "Personal care": [("SQ *SALON NINE PADDINGTON", "Salon Nine", 55, 90), ("MECCA BRISBANE", "Mecca", 25, 70)],
    "Home": [("BUNNINGS 6390 MILTON", "Bunnings", 20, 80), ("ADAIRS INDOOROOPILLY", "Adairs", 30, 110),
             ("KMART HOME TOOWONG", "Kmart", 15, 50)],
}
EXTRA_TARGETS = {"Entertainment": 280, "Health": 140, "Personal care": 120, "Home": 150}
ONE_OFFS = [
    (date(2025, 12, 13), "DAVID JONES QUEEN ST", "David Jones (gifts)", "Gifts", 214.50),
    (date(2025, 12, 20), "SQ *BRISBANE XMAS MARKETS", "Christmas markets", "Gifts", 86.00),
    (date(2026, 1, 23), "AIRBNB * HM2P8 BYRON BAY", "Airbnb", "Travel", 365.00),
    (date(2026, 4, 4), "QANTAS AIRWAYS LTD", "Qantas", "Travel", 298.40),
    (date(2026, 7, 3), "VIRGIN AUSTRALIA AIRLINES", "Virgin Australia", "Travel", 389.00),
    (date(2026, 7, 18), "AIRBNB * HM4K2Q MELBOURNE", "Airbnb", "Travel", 412.60),
    (date(2026, 9, 12), "SEA WORLD RESORT MAIN BEACH", "Sea World Resort", "Travel", 318.00),
    (date(2026, 8, 22), "DAVID JONES QUEEN ST", "David Jones (gift)", "Gifts", 124.95),
    (date(2026, 10, 3), "LIFELINE AUSTRALIA DONATION", "Lifeline (donation)", "Gifts", 50.00),
]

# Card payments that must appear exactly; receipt_id links to receipts.json
FIXED = {
    (2026, 11): [
        dict(d=date(2026, 11, 12), desc="COLES 0734 TARINGA", merchant="Coles", cat="Groceries", amt=142.30,
             receipt_id="rcpt-coles-20261112"),
        dict(d=date(2026, 11, 7), desc="WOOLWORTHS 1234 TOOWONG", merchant="Woolworths", cat="Groceries", amt=88.15,
             receipt_id="rcpt-woolies-20261107"),
        dict(d=date(2026, 11, 8), desc="IKEA LOGAN", merchant="IKEA", cat="Shopping", amt=189.00, signal="life-event"),
        dict(d=date(2026, 11, 9), desc="BUNNINGS 6390 MILTON", merchant="Bunnings", cat="Shopping", amt=64.85,
             signal="life-event"),
    ],
    (2026, 10): [
        dict(d=date(2026, 10, 24), desc="COLES 0734 TARINGA", merchant="Coles", cat="Groceries", amt=91.40,
             receipt_id="rcpt-coles-20261024"),
        dict(d=date(2026, 10, 17), desc="ALDI STORES MILTON", merchant="Aldi", cat="Groceries", amt=52.75,
             receipt_id="rcpt-aldi-20261017"),
    ],
}


def pick_count(cat: str, partial: bool) -> int:
    if cat == "Groceries":
        return 3 if partial else rng.randint(6, 8)
    if cat == "Transport":
        return rng.randint(4, 6) if partial else rng.randint(7, 10)
    return rng.randint(3, 4) if partial else rng.randint(4, 6)


def scaled(items: list[list], target: float) -> None:
    """Scale amounts so they sum to target exactly (to the cent)."""
    total = sum(i[3] for i in items)
    for i in items:
        i[3] = round(i[3] * target / total, 2)
    diff = round(target - sum(i[3] for i in items), 2)
    big = max(items, key=lambda i: i[3])
    big[3] = round(big[3] + diff, 2)


for y, m in MONTHS:
    mdays = month_days(y, m)
    partial = (y, m) == (TODAY.year, TODAY.month)
    fixed = FIXED.get((y, m), [])
    for cat, targets in TARGETS.items():
        target = targets[m] - sum(f["amt"] for f in fixed if f["cat"] == cat)
        busy = {f["d"] for f in fixed if f["cat"] == cat}  # no second shop on a fixed receipt day
        free = [d for d in mdays if d not in busy]
        items: list[list] = []
        if cat == "Eating out":
            n_delivery = 14 if partial else rng.randint(7, 9) + (2 if m == 12 else 0)
            for _ in range(n_delivery):
                desc, merch, lo, hi = rng.choice([p for p in POOLS[cat] if p[1] in DELIVERY])
                items.append([rng.choice(free), desc, merch, rng.uniform(lo, hi)])
            for _ in range(4 if partial else rng.randint(6, 9)):
                desc, merch, lo, hi = rng.choice([p for p in POOLS[cat] if p[1] not in DELIVERY])
                items.append([rng.choice(free), desc, merch, rng.uniform(lo, hi)])
        else:
            for _ in range(pick_count(cat, partial)):
                desc, merch, lo, hi = rng.choice(POOLS[cat])
                items.append([rng.choice(free), desc, merch, rng.uniform(lo, hi)])
        scaled(items, target)
        for d, desc, merch, amt in items:
            add(d, desc, merch, cat, -amt, "card")
    for cat, base in EXTRA_TARGETS.items():
        target = round(base * (0.5 if partial else rng.uniform(0.8, 1.2)), 2)
        items = []
        for _ in range(2 if partial else rng.randint(2, 4)):
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
             "status", "card_last4", "signal", "receipt_id", "plan_id", "plan_total", "instalment", "provider",
             "auto_save", "yearly", "transfer_to", "transfer_from", "note"]
txs = [{k: t[k] for k in KEY_ORDER if k in t} for t in txs]

# ---------------------------------------------------------------- receipts (Idea 10, RL-02)
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
    {
        "id": "rcpt-coles-20261024", "merchant": "Coles", "store": "Coles Taringa", "date": "2026-10-24",
        "total": 91.40,
        "items": [
            ("Coles Full Cream Milk 3L", 4.65, "Essentials"), ("Wholemeal Wraps 8pk", 4.00, "Essentials"),
            ("Pork Loin Steaks 500g", 9.50, "Essentials"), ("Mixed Salad Leaves 300g", 4.50, "Essentials"),
            ("Avocados 3pk", 6.00, "Essentials"), ("Brown Onions 1kg", 2.90, "Essentials"),
            ("Potatoes 2kg", 4.50, "Essentials"), ("Natural Yoghurt 1kg", 5.20, "Essentials"),
            ("Peanut Butter 780g", 6.00, "Essentials"), ("Canned Tuna 4pk", 7.50, "Essentials"),
            ("Frozen Berries 1kg", 9.00, "Essentials"),
            ("Kettle Chips 165g", 4.50, "Extras and snacks"), ("Lindt Excellence 100g", 5.00, "Extras and snacks"),
            ("Kombucha 4pk", 9.00, "Extras and snacks"),
            ("Sponges 10pk", 3.50, "Household"), ("Bin Liners 50pk", 5.65, "Household"),
        ],
    },
    {
        "id": "rcpt-aldi-20261017", "merchant": "Aldi", "store": "Aldi Milton", "date": "2026-10-17",
        "total": 52.75,
        "items": [
            ("Milk 2L", 2.79, "Essentials"), ("Bread Rolls 6pk", 2.99, "Essentials"),
            ("Chicken Drumsticks 1kg", 6.99, "Essentials"), ("Eggs 12pk", 5.49, "Essentials"),
            ("Broccolini", 2.99, "Essentials"), ("Pasta 500g", 1.29, "Essentials"), ("Mince 500g", 6.99, "Essentials"),
            ("Cheese Slices", 3.99, "Essentials"), ("Bananas 1kg", 3.49, "Essentials"),
            ("Corn Chips", 2.49, "Extras and snacks"), ("Chocolate Biscuits", 2.79, "Extras and snacks"),
            ("Dishwasher Tablets", 7.99, "Household"), ("Hand Wash", 2.47, "Household"),
        ],
    },
]
receipts_out = [
    {**{k: v for k, v in r.items() if k != "items"},
     "items": [{"name": n, "price": p, "group": g} for n, p, g in r["items"]]}
    for r in RECEIPTS
]

# ---------------------------------------------------------------- upcoming (next 5 weeks, Idea 4)
# Everything already scheduled. kind: pay | rent | bill | auto_save | pay_later | yearly_bill
next_paydays = list(days(date(2026, 11, 27), HORIZON, 14))
for d in next_paydays:
    up(d, "Salary · Harbour Health", 2883.24, "detected fortnightly", kind="pay")
    for acct, amt, first, last in AUTO_SAVES:
        if last is None:
            up(d, f"Auto-save to {NAMES[acct]}", -amt, "your auto-save", kind="auto_save", to_account=acct)
for d in days(date(2026, 11, 18), HORIZON, 7):
    up(d, "Rent · Ray White", -620, "detected weekly from 11 Nov", kind="rent")
for d in days(date(2026, 11, 24), HORIZON, 14):
    up(d, "Gym · Fitness First", -25, "detected fortnightly")
for d, label, amt, src in [
    (date(2026, 11, 15), "Bupa health insurance", -132.40, "detected monthly"),
    (date(2026, 11, 22), "iCloud+", -4.49, "detected monthly"),
    (date(2026, 11, 24), "Aussie Broadband", -79, "detected monthly"),
    (date(2026, 11, 28), "Urban Utilities water", -190, "detected quarterly"),
    (date(2026, 12, 2), "Spotify Premium", -13.99, "Windy found (not confirmed)"),
    (date(2026, 12, 5), "Telstra", -98, "detected monthly"),
    (date(2026, 12, 10), "Netflix", -18.99, "detected monthly"),
    (date(2026, 12, 14), "Amazon Prime", -9.99, "Windy found (not confirmed)"),
    (date(2026, 12, 15), "Bupa health insurance", -132.40, "detected monthly"),
]:
    up(d, label, amt, src, estimate=label.startswith("Urban"))
up(date(2026, 11, 28), "Urban Utilities water", 0, "")  # placeholder removed below
UPCOMING[:] = [u for u in UPCOMING if u["amount"] != 0]
up(date(2026, 12, 3), "Car rego · QLD TMR", -412, "added by you", account="bills-saver", kind="yearly_bill")
up(date(2026, 12, 5), "Car insurance · AAMI", -806, "renewal notice (was $720)", account="bills-saver",
   kind="yearly_bill")
UPCOMING.sort(key=lambda u: (u["date"], u["amount"] < 0, u["label"]))

# ---------------------------------------------------------------- write
OUT.mkdir(parents=True, exist_ok=True)
meta = {"user": "Mia", "today": TODAY.isoformat(), "from": START.isoformat(), "seed": SEED,
        "note": "Synthetic data for a hackathon demo. Not real people or accounts."}
(OUT / "accounts.json").write_text(json.dumps({"meta": meta, "accounts": ACCOUNTS}, indent=2) + "\n")
(OUT / "transactions.json").write_text(json.dumps({"meta": meta, "transactions": txs}, indent=2) + "\n")
(OUT / "receipts.json").write_text(json.dumps({"meta": meta, "receipts": receipts_out}, indent=2) + "\n")
(OUT / "upcoming.json").write_text(json.dumps({"today": TODAY.isoformat(), "upcoming": UPCOMING}, indent=2) + "\n")
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
    rows = [t for t in txs if t["account"] == a["id"]]
    check(abs(rows[-1]["balance_after"] - a["closing_balance"]) < 0.005, f"{a['id']} closing mismatch")
    check(a["opening_balance"] >= 0, f"{a['id']} opening balance negative: {a['opening_balance']}")
    neg = [t for t in rows if t["balance_after"] < 0]
    check(not neg, f"{a['id']} goes negative: {neg[0]['balance_after'] if neg else 0} on {neg[0]['date'] if neg else ''}")

for r in receipts_out:
    s = round(sum(i["price"] for i in r["items"]), 2)
    check(abs(s - r["total"]) < 0.005, f"receipt {r['id']} items sum {s} != total {r['total']}")
    tx = [t for t in txs if t.get("receipt_id") == r["id"]]
    check(len(tx) == 1 and abs(-tx[0]["amount"] - r["total"]) < 0.005, f"receipt {r['id']} not linked to one matching tx")
coles = next(r for r in receipts_out if r["id"] == "rcpt-coles-20261112")
groups: dict[str, float] = defaultdict(float)
for i in coles["items"]:
    groups[i["group"]] += i["price"]
for g, want in {"Essentials": 86.40, "Extras and snacks": 38.20, "Household": 17.70}.items():
    check(abs(groups[g] - want) < 0.005, f"Coles group {g} = {groups[g]:.2f}, wireframe says {want}")


def dates_of(merchant: str) -> list[str]:
    return [t["date"] for t in txs if t["merchant"] == merchant]


check(dates_of("Spotify Premium") == ["2026-09-02", "2026-10-02", "2026-11-02"], "Spotify dates differ from R-02")
check(dates_of("Amazon Prime") == ["2026-10-14", "2026-11-14"], "Amazon Prime dates differ from R-02")
check(max(dates_of("Harbour Health")) == "2026-11-13", "last salary should be 13 Nov (B-01)")

active = [t for t in txs if t.get("provider") == "Afterpay" and t["date"] == "2026-11-13"]
check(len(active) == 4 and abs(sum(-t["amount"] for t in active) - 186) < 0.005,
      f"pay-later on 13 Nov: {len(active)} plans, ${sum(-t['amount'] for t in active):.2f} (board: 4 plans, $186)")

monthly_cat: dict[tuple, dict[str, float]] = defaultdict(lambda: defaultdict(float))
delivery: dict[tuple, int] = defaultdict(int)
for t in txs:
    ym = (int(t["date"][:4]), int(t["date"][5:7]))
    if t["account"] == "everyday" and t["category"] in SPENDING:
        monthly_cat[ym][t["category"]] += -t["amount"]
    if t["merchant"] in DELIVERY:
        delivery[ym] += 1
for cat, targets in TARGETS.items():
    for y, m in MONTHS:
        check(abs(monthly_cat[(y, m)][cat] - targets[m]) < 0.005, f"{cat} {y}-{m}: {monthly_cat[(y, m)][cat]:.2f}")
check(delivery[(2026, 11)] == 14, f"Nov delivery orders {delivery[(2026, 11)]} != 14 (Westpac 02)")

everyday = [t for t in txs if t["account"] == "everyday"]
low = min(everyday, key=lambda t: t["balance_after"])
next_pay = min(u["date"] for u in UPCOMING if u["kind"] == "pay")
committed = -sum(u["amount"] for u in UPCOMING if u["date"] < next_pay and u["account"] == "everyday")
safe = ACCOUNTS[0]["closing_balance"] - committed
check(150 <= safe <= 220, f"safe-to-spend {safe:.2f} drifted far from the wireframe's $180")

print(f"Wrote {len(txs)} transactions ({len(everyday)} on Everyday), {len(receipts_out)} receipts, "
      f"{len(UPCOMING)} upcoming items to {OUT}/")
print("\nOpening balances on", START, opening)
print(f"Everyday lowest point: {low['balance_after']:.2f} on {low['date']} ({low['description']})")
print(f"Safe to spend until payday {next_pay}: {safe:.2f} (balance minus {committed:.2f} of known bills; wireframe $180)")
print("\nSpending by month (Everyday):")
print("         " + "".join(f"{c[:12]:>13}" for c in SPENDING) + "        Total  Delivery")
for y, m in MONTHS:
    row = monthly_cat[(y, m)]
    print(f"  {y}-{m:02d}" + "".join(f"{row[c]:>13.2f}" for c in SPENDING) + f"{sum(row.values()):>13.2f}{delivery[(y, m)]:>10}")

if errors:
    print("\nCHECKS FAILED:")
    for e in errors:
        print("  ✗", e)
    raise SystemExit(1)
print("\nAll checks passed.")
