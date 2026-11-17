"""Windy's tools: plain Python over Mia's generated data (data/mia/*.json).

Principle from the team board: code does the maths, the model only explains.
Every tool returns totals already computed, so Claude never has to add numbers up.
No account numbers or card numbers are ever returned.
"""

from __future__ import annotations

import json
import math
from collections import defaultdict
from datetime import date, timedelta
from pathlib import Path
from statistics import median

DATA = Path(__file__).resolve().parent.parent / "data" / "mia"


def _load(name: str) -> dict:
    return json.loads((DATA / name).read_text())


_tx_file = _load("transactions.json")
TODAY = date.fromisoformat(_tx_file["meta"]["today"])
START = date.fromisoformat(_tx_file["meta"]["from"])
TRANSACTIONS: list[dict] = _tx_file["transactions"]
ACCOUNTS: list[dict] = _load("accounts.json")["accounts"]
RECEIPTS: list[dict] = _load("receipts.json")["receipts"]
UPCOMING: list[dict] = _load("upcoming.json")["upcoming"]

# The six categories on the Insights screen
INSIGHT_CATEGORIES = ["Eating out", "Shopping", "Transport", "Subscriptions", "Groceries", "Bills and utilities"]
FLEXIBLE = ["Eating out", "Shopping", "Transport", "Groceries"]
PUBLIC_FIELDS = ["date", "merchant", "description", "category", "amount", "status"]


def _d(s: str) -> date:
    return date.fromisoformat(s)


def _money(x: float) -> float:
    return round(x, 2)


def _everyday_outflows(start: date, end: date) -> list[dict]:
    """Money leaving Everyday, excluding moves between Mia's own accounts."""
    return [t for t in TRANSACTIONS
            if t["account"] == "everyday" and t["amount"] < 0 and t["type"] != "transfer"
            and start <= _d(t["date"]) <= end]


def _public(t: dict) -> dict:
    return {k: t[k] for k in PUBLIC_FIELDS if k in t}


# ------------------------------------------------------------------ tools

def get_accounts() -> dict:
    out = []
    for a in ACCOUNTS:
        row = {"id": a["id"], "name": a["name"], "type": a["product"], "balance": a["closing_balance"]}
        if a.get("goal_target"):
            row["goal_target"] = a["goal_target"]
            row["goal_progress_pct"] = round(100 * a["closing_balance"] / a["goal_target"], 1)
        out.append(row)
    pending = sum(t["amount"] for t in TRANSACTIONS if t["account"] == "everyday" and t["status"] == "pending")
    return {"as_of": TODAY.isoformat(), "accounts": out,
            "everyday_pending_card_payments": _money(pending),
            "note": "Balances already include pending card payments."}


def spending_by_category(start_date: str, end_date: str) -> dict:
    start, end = _d(start_date), min(_d(end_date), TODAY)
    rows = _everyday_outflows(start, end)
    cats: dict[str, dict] = defaultdict(lambda: {"total": 0.0, "count": 0})
    for t in rows:
        cats[t["category"]]["total"] += -t["amount"]
        cats[t["category"]]["count"] += 1
    ordered = sorted(({"category": c, "total": _money(v["total"]), "count": v["count"]} for c, v in cats.items()),
                     key=lambda r: -r["total"])
    return {"from": start.isoformat(), "to": end.isoformat(), "days": (end - start).days + 1,
            "total_out": _money(sum(r["total"] for r in ordered)), "by_category": ordered,
            "excludes": "transfers between Mia's own accounts"}


def compare_month(month: str, category: str | None = None) -> dict:
    """Compare a month with the previous full months, both full-month and same-days-so-far."""
    y, m = map(int, month.split("-"))
    first = date(y, m, 1)
    last = (date(y + (m == 12), m % 12 + 1, 1) - timedelta(days=1))
    partial = last > TODAY
    cutoff_day = TODAY.day if partial else last.day
    cats = [category] if category else INSIGHT_CATEGORIES

    def total(a: date, b: date) -> dict[str, float]:
        out = {c: 0.0 for c in cats}
        for t in _everyday_outflows(a, b):
            if t["category"] in out:
                out[t["category"]] += -t["amount"]
        return out

    this = total(first, min(last, TODAY))
    prev_full, prev_same = [], []
    pm, py = m, y
    while True:
        pm, py = (pm - 1, py) if pm > 1 else (12, py - 1)
        pf = date(py, pm, 1)
        if pf < START or len(prev_full) >= 6:  # up to 6 previous full months
            break
        pl = date(py + (pm == 12), pm % 12 + 1, 1) - timedelta(days=1)
        prev_full.append(total(pf, pl))
        prev_same.append(total(pf, date(py, pm, min(cutoff_day, pl.day))))

    def avg(rows: list[dict], c: str) -> float:
        return _money(sum(r[c] for r in rows) / len(rows)) if rows else 0.0

    result = []
    for c in cats:
        result.append({
            "category": c,
            "this_month": _money(this[c]),
            "avg_full_month": avg(prev_full, c),
            "avg_same_days": avg(prev_same, c),
            "diff_vs_same_days": _money(this[c] - avg(prev_same, c)),
        })
    return {
        "month": month, "month_is_partial": partial,
        "days_counted": cutoff_day if partial else last.day,
        "compared_with_months": len(prev_full),
        "categories": sorted(result, key=lambda r: -r["diff_vs_same_days"]),
        "totals": {
            "this_month": _money(sum(this.values())),
            "avg_full_month": _money(sum(r["avg_full_month"] for r in result)),
            "avg_same_days": _money(sum(r["avg_same_days"] for r in result)),
        },
        "note": "For a month that isn't over, avg_same_days (days 1 to today's day in earlier months) is the fair comparison.",
    }


def search_transactions(query: str | None = None, category: str | None = None,
                        start_date: str | None = None, end_date: str | None = None,
                        direction: str = "any", limit: int = 20) -> dict:
    start = _d(start_date) if start_date else START
    end = _d(end_date) if end_date else TODAY
    q = (query or "").lower()
    rows = [t for t in TRANSACTIONS
            if t["account"] == "everyday" and start <= _d(t["date"]) <= end
            and (not category or t["category"].lower() == category.lower())
            and (not q or q in t["merchant"].lower() or q in t["description"].lower())
            and (direction == "any" or (direction == "out") == (t["amount"] < 0))]
    rows.sort(key=lambda t: t["date"], reverse=True)
    limit = max(1, min(int(limit), 50))
    return {"matches": len(rows), "total": _money(sum(t["amount"] for t in rows)),
            "total_note": "negative = money out",
            "showing": min(limit, len(rows)), "transactions": [_public(t) for t in rows[:limit]]}


CADENCES = [("weekly", 6, 8), ("fortnightly", 13, 15), ("monthly", 27, 32), ("quarterly", 85, 95)]
# yearly bills seen once in 12 months are flagged with yearly=True in the data


def recurring_payments() -> dict:
    """Detect regular payments from history: same merchant, similar amount, regular gap."""
    by_merchant: dict[str, list[dict]] = defaultdict(list)
    for t in TRANSACTIONS:
        if (t["account"] in ("everyday", "bills-saver") and t["amount"] < 0 and t["type"] not in ("transfer", "atm")
                and not t.get("provider")):
            by_merchant[t["merchant"]].append(t)
    found = []
    for merchant, ts in by_merchant.items():
        if len(ts) == 1 and ts[0].get("yearly"):
            found.append({"merchant": merchant, "category": ts[0]["category"], "cadence": "yearly",
                          "latest_amount": -ts[0]["amount"], "times_seen": 1, "first_seen": ts[0]["date"],
                          "last_seen": ts[0]["date"], "status": "ongoing", "paid_from": "Bills set-aside",
                          "note": ts[0].get("note", "")})
            continue
        if len(ts) < 2:
            continue
        ts.sort(key=lambda t: t["date"])
        gaps = [(_d(b["date"]) - _d(a["date"])).days for a, b in zip(ts, ts[1:])]
        gap = median(gaps)
        cadence = next((name for name, lo, hi in CADENCES if lo <= gap <= hi), None)
        amounts = [-t["amount"] for t in ts]
        if not cadence or any(abs(g - gap) > 3 for g in gaps):
            continue
        tol = 0.25 if ts[0]["category"] == "Bills and utilities" else 0.15  # energy and water bills vary
        if (max(amounts) - min(amounts)) / max(amounts) > tol:
            continue
        first, last = _d(ts[0]["date"]), _d(ts[-1]["date"])
        row = {"merchant": merchant, "category": ts[0]["category"], "cadence": cadence,
               "latest_amount": amounts[-1], "times_seen": len(ts),
               "first_seen": first.isoformat(), "last_seen": last.isoformat(),
               "next_expected": (last + timedelta(days=round(gap))).isoformat()}
        if (TODAY - last).days > gap * 1.25:
            row["status"] = "stopped"
        elif (TODAY - first).days <= 100:
            row["status"] = "new"
        else:
            row["status"] = "ongoing"
        if len(amounts) >= 2 and abs(amounts[-1] - amounts[-2]) >= 0.5 and row["category"] == "Subscriptions":
            row["price_change"] = _money(amounts[-1] - amounts[-2])
        found.append(row)
    found.sort(key=lambda r: (r["status"] != "new", -r["latest_amount"]))
    return {"as_of": TODAY.isoformat(), "recurring": found,
            "how": "Same merchant, amount within 15%, regular gap (weekly/fortnightly/monthly/quarterly)."}


def _daily_flexible_spend(days: int = 90) -> float:
    rows = [t for t in _everyday_outflows(TODAY - timedelta(days=days - 1), TODAY) if t["category"] in FLEXIBLE]
    return _money(sum(-t["amount"] for t in rows) / days)


def cash_flow_forecast(days_ahead: int = 35) -> dict:
    """Everyday projection, same model as the app's forecast screen.

    Before the next payday Mia spends only her safe-to-spend, evenly; from payday on, her usual
    daily spend. Every scheduled item on Everyday (rent, bills, auto-saves, pay-later) is applied.
    Yearly bills come out of the Bills set-aside, not Everyday.
    """
    days_ahead = max(7, min(int(days_ahead), 35))
    horizon = TODAY + timedelta(days=days_ahead)
    items = [u for u in UPCOMING if TODAY < _d(u["date"]) <= horizon]
    every = [u for u in items if u["account"] == "everyday"]
    balance = next(a["closing_balance"] for a in ACCOUNTS if a["id"] == "everyday")
    next_pay = min(_d(u["date"]) for u in every if u["kind"] == "pay")
    committed = -sum(u["amount"] for u in every if _d(u["date"]) < next_pay and u["amount"] < 0)
    safe = balance - committed
    pre_days = max(1, (next_pay - TODAY).days - 1)
    daily = _daily_flexible_spend()
    b = balance
    low = (balance, TODAY)
    for i in range(1, days_ahead + 1):
        d = TODAY + timedelta(days=i)
        b += sum(u["amount"] for u in every if _d(u["date"]) == d)
        b -= max(0.0, safe) / pre_days if d < next_pay else daily
        if b < low[0]:
            low = (b, d)
    life_save = next((-u["amount"] for u in every if u["kind"] == "auto_save" and u.get("to_account") == "life"
                      and _d(u["date"]) == next_pay), 0)
    return {
        "everyday_balance_now": balance,
        "next_payday": next_pay.isoformat(),
        "bills_before_payday": _money(committed),
        "safe_to_spend_until_payday": _money(safe),
        "assumption": "Spends only safe-to-spend until payday, then the usual daily amount",
        "typical_daily_spend": daily,
        "typical_daily_spend_basis": "average of Groceries, Eating out, Shopping, Transport over the last 90 days",
        "lowest_point": {"balance": _money(low[0]), "date": low[1].isoformat()},
        "one_fix": {"skip_next_westpac_life_auto_save": life_save},
        "scheduled_everyday_items": every,
        "yearly_bills_from_set_aside": [u for u in items if u["account"] == "bills-saver"],
    }


def pay_later_plans() -> dict:
    """Afterpay plans: active ones, what each payday takes, what's still owed."""
    plans: dict[str, dict] = {}
    for t in TRANSACTIONS:
        if t.get("plan_id"):
            p = plans.setdefault(t["plan_id"], {"merchant": t["merchant"].replace("Afterpay · ", ""),
                                                "total": t["plan_total"], "instalment": -t["amount"], "paid": []})
            p["paid"].append(t["date"])
    for u in UPCOMING:
        if u.get("plan_id") in plans:
            plans[u["plan_id"]].setdefault("upcoming", []).append(u["date"])
    out = []
    for pid, p in plans.items():
        remaining = 4 - len(p["paid"])
        first = _d(p["paid"][0])
        p["all_due_dates"] = [(first + timedelta(days=14 * k)).isoformat() for k in range(4)]  # fortnightly
        p.pop("upcoming", None)
        out.append({**p, "plan_id": pid, "instalments_left": remaining, "still_owed": _money(p["instalment"] * remaining)})
    active = [p for p in out if p["instalments_left"] > 0]
    last_payday = max(t["date"] for t in TRANSACTIONS if t["merchant"] == "Harbour Health")
    return {"active_plans": active, "finished_plans": [p for p in out if p["instalments_left"] == 0],
            "taken_on_last_payday": _money(sum(-t["amount"] for t in TRANSACTIONS
                                               if t.get("plan_id") and t["date"] == last_payday)),
            "still_owed_total": _money(sum(p["still_owed"] for p in active))}


def goal_projection(goal_id: str, amount_per_payday: float | None = None) -> dict:
    goal = next((a for a in ACCOUNTS if a["id"] == goal_id and a.get("goal_target")), None)
    if not goal:
        return {"error": f"unknown goal_id {goal_id}",
                "valid_goal_ids": [a["id"] for a in ACCOUNTS if a.get("goal_target")]}
    current = next((-u["amount"] for u in UPCOMING if u["kind"] == "auto_save" and u.get("to_account") == goal_id), 0)
    per = float(amount_per_payday) if amount_per_payday is not None else current
    remaining = goal["goal_target"] - goal["closing_balance"]
    pays = sorted(_d(u["date"]) for u in UPCOMING if u["kind"] == "pay")
    next_pay = pays[0] if pays else TODAY + timedelta(days=13)
    out = {"goal": goal["name"], "saved": goal["closing_balance"], "target": goal["goal_target"],
           "remaining": _money(remaining), "current_amount_per_payday": current, "amount_per_payday_used": per,
           "paydays_are": "fortnightly"}
    if per <= 0:
        out["reached_on"] = None
        out["note"] = "No regular saving into this goal."
    else:
        n = math.ceil(remaining / per)
        out["paydays_needed"] = n
        out["reached_on"] = (next_pay + timedelta(days=14 * (n - 1))).isoformat()
    return out


def life_events() -> dict:
    """Signals that something changed in Mia's life (used by the Life Event Detector)."""
    recent = [t for t in TRANSACTIONS if t["account"] in ("everyday", "life") and _d(t["date"]) >= TODAY - timedelta(days=30)]
    seen_before = {t["merchant"] for t in TRANSACTIONS if _d(t["date"]) < TODAY - timedelta(days=30)}
    tagged = [_public(t) for t in recent if t.get("signal") == "life-event"]
    new_payees = sorted({t["merchant"] for t in recent if t["amount"] < 0 and t["type"] in ("direct_debit", "bpay")
                         and t["merchant"] not in seen_before})
    old_rent = [t for t in TRANSACTIONS if t["merchant"] == "Northside Realty"]
    return {"signals": tagged, "new_payees_last_30_days": new_payees,
            "previous_rent": {"merchant": "Northside Realty", "amount_weekly": -old_rent[-1]["amount"],
                              "last_paid": old_rent[-1]["date"]} if old_rent else None,
            "note": "Signals suggest an event; Windy should ask the customer to confirm, not assume."}


def get_receipt(date_: str | None = None, merchant: str | None = None) -> dict:
    rs = [r for r in RECEIPTS if (not date_ or r["date"] == date_)
          and (not merchant or merchant.lower() in r["merchant"].lower())]
    out = []
    for r in rs:
        groups: dict[str, float] = defaultdict(float)
        for i in r["items"]:
            groups[i["group"]] += i["price"]
        out.append({"merchant": r["merchant"], "store": r["store"], "date": r["date"], "total": r["total"],
                    "groups": {g: _money(v) for g, v in groups.items()},
                    "groups_add_up": abs(sum(groups.values()) - r["total"]) < 0.01,
                    "items": r["items"]})
    return {"receipts": out, "note": "Talk about money only, never health or diet."}


# ------------------------------------------------------------------ tool definitions for Claude

def _tool(name: str, description: str, props: dict, required: list[str]) -> dict:
    return {"name": name, "description": description, "eager_input_streaming": True,
            "input_schema": {"type": "object", "properties": props, "required": required,
                             "additionalProperties": False}}


DATE = {"type": "string", "description": "YYYY-MM-DD"}

TOOLS = [
    _tool("get_accounts", "Balances of all of Mia's accounts and progress on her savings goals.", {}, []),
    _tool("spending_by_category",
          "Money out of Everyday between two dates, totalled by category (own-account transfers excluded). "
          "Use for 'how much did I spend on X' over a period.",
          {"start_date": DATE, "end_date": DATE}, ["start_date", "end_date"]),
    _tool("compare_month",
          "Compare one month's spending with earlier months, by Insights category. Gives both the full-month "
          "average and the fair same-days-so-far average for a month that isn't over.",
          {"month": {"type": "string", "description": "YYYY-MM"},
           "category": {"type": "string", "description": "Optional: one of " + ", ".join(INSIGHT_CATEGORIES)}},
          ["month"]),
    _tool("search_transactions",
          "Find Everyday transactions by merchant text and/or category and date range. Returns the match count "
          "and the total already summed, plus the most recent rows.",
          {"query": {"type": "string", "description": "Merchant or statement text, e.g. 'uber eats'"},
           "category": {"type": "string"}, "start_date": DATE, "end_date": DATE,
           "direction": {"type": "string", "enum": ["in", "out", "any"]},
           "limit": {"type": "integer", "description": "Rows to return, max 50"}}, []),
    _tool("recurring_payments",
          "Regular payments detected from history (subscriptions, bills, rent): cadence, latest amount, "
          "status new/ongoing/stopped, and price changes.", {}, []),
    _tool("cash_flow_forecast",
          "Everything scheduled on Everyday (pay, rent, bills, auto-saves, pay-later), safe-to-spend until next "
          "payday, and the projected lowest Everyday balance (safe-to-spend before payday, usual spending after). "
          "Includes ready-made totals (next payday in/out, money in/out per date): quote those instead of adding.",
          {"days_ahead": {"type": "integer", "description": "7 to 35, default 35"}}, []),
    _tool("pay_later_plans", "Afterpay plans: active plans, amount taken each payday, what's still owed, finished plans.",
          {}, []),
    _tool("goal_projection",
          "When a savings goal will be reached at the current or a given amount per fortnightly payday.",
          {"goal_id": {"type": "string", "enum": [a["id"] for a in ACCOUNTS if a.get("goal_target")]},
           "amount_per_payday": {"type": "number", "description": "Optional what-if amount"}}, ["goal_id"]),
    _tool("life_events", "Recent signals of a life change (e.g. moving home): tagged transactions and new payees.",
          {}, []),
    _tool("get_receipt", "Itemised receipts linked to card payments, with totals per group.",
          {"date": DATE, "merchant": {"type": "string"}}, []),
]

_FUNCS = {
    "get_accounts": lambda a: get_accounts(),
    "spending_by_category": lambda a: spending_by_category(a["start_date"], a["end_date"]),
    "compare_month": lambda a: compare_month(a["month"], a.get("category")),
    "search_transactions": lambda a: search_transactions(a.get("query"), a.get("category"), a.get("start_date"),
                                                         a.get("end_date"), a.get("direction", "any"),
                                                         a.get("limit", 20)),
    "recurring_payments": lambda a: recurring_payments(),
    "cash_flow_forecast": lambda a: cash_flow_forecast(a.get("days_ahead", 35)),
    "pay_later_plans": lambda a: pay_later_plans(),
    "goal_projection": lambda a: goal_projection(a["goal_id"], a.get("amount_per_payday")),
    "life_events": lambda a: life_events(),
    "get_receipt": lambda a: get_receipt(a.get("date"), a.get("merchant")),
}


def run_tool(name: str, args: object) -> tuple[str, bool]:
    """Validate the (possibly partial) input, run the tool, return (json_text, is_error)."""
    schema = next((t["input_schema"] for t in TOOLS if t["name"] == name), None)
    if schema is None:
        return json.dumps({"error": f"unknown tool {name}"}), True
    if not isinstance(args, dict):
        return json.dumps({"INVALID_JSON": json.dumps(args, default=str)}), True
    missing = [k for k in schema["required"] if k not in args]
    extra = [k for k in args if k not in schema["properties"]]
    if missing or extra:
        return json.dumps({"error": "invalid input", "missing": missing, "unexpected": extra}), True
    try:
        result = _FUNCS[name](args)
        return json.dumps(result), "error" in result
    except (ValueError, TypeError, KeyError) as e:
        return json.dumps({"error": f"{type(e).__name__}: {e}"}), True
