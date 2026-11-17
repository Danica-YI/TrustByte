"""Python Engine: calculates forecasts and financial scenarios.

Reads Mia's base bank data (data/mia/*.json, loaded by tools.py) and the saved Plan State (state.py),
and works out every number the app shows. Nothing here calls the AI model: code does the maths, Windy
only explains (team principle from the board).

The idea: base data + plan state -> "effective" accounts and schedule -> everything else.
So when Mia approves a change, every screen and the chat see it at once.
"""

from __future__ import annotations

import copy
import math
from collections import defaultdict
from datetime import date, timedelta
from statistics import median

import tools as T

TODAY: date = T.TODAY
TRANSACTIONS: list[dict] = T.TRANSACTIONS
RECEIPTS: list[dict] = T.RECEIPTS
BASE_ACCOUNTS: list[dict] = copy.deepcopy(T.ACCOUNTS)
BASE_UPCOMING: list[dict] = copy.deepcopy(T.UPCOMING)
HORIZON_DAYS = 35

GOAL_COLORS = {"goal-japan": "#6d28d9", "goal-emergency": "#15803d", "goal-home": "#d4002a", "goal-bali": "#0e7490"}
SHORT_NAMES = {"goal-japan": "Japan trip", "goal-emergency": "Emergency fund", "goal-home": "Home deposit",
               "goal-bali": "Bali 2027", "life": "Westpac Life", "bills-saver": "Bills set-aside", "everyday": "Everyday"}


def _d(s: str) -> date:
    return date.fromisoformat(s)


def r2(x: float) -> float:
    return round(x + 0.0, 2)


def money(x: float, cents: bool = False) -> str:
    sign = "−" if x < 0 else ""
    v = abs(x)
    return f"{sign}${v:,.2f}" if cents or (v != int(v) and v < 100) else f"{sign}${v:,.0f}"


def short_date(d: date | str) -> str:
    d = _d(d) if isinstance(d, str) else d
    return f"{d.day} {d:%b}"


def month_year(d: date | str | None) -> str:
    if d is None:
        return "not set"
    d = _d(d) if isinstance(d, str) else d
    return f"{d:%b %Y}"


# ------------------------------------------------------------------ paydays and the auto-save schedule

PAYDAYS = sorted({_d(u["date"]) for u in BASE_UPCOMING if u["kind"] == "pay"})
NEXT_PAY = PAYDAYS[0]


def payday(k: int) -> date:
    return NEXT_PAY + timedelta(days=14 * k)


def payday_index(d: date) -> int | None:
    diff = (d - NEXT_PAY).days
    return diff // 14 if diff >= 0 and diff % 14 == 0 else None


BASE_AUTOSAVE: dict[str, float] = {}
for _u in BASE_UPCOMING:
    if _u["kind"] == "auto_save":
        BASE_AUTOSAVE.setdefault(_u["to_account"], -_u["amount"])

_rent_items = [u for u in BASE_UPCOMING if u["kind"] == "rent"]
RENT_AMOUNT = -_rent_items[0]["amount"]
FIRST_UPCOMING_RENT = _d(_rent_items[0]["date"])
OLD_RENT_WEEKLY = -[t for t in TRANSACTIONS if t["merchant"] == "Northside Realty"][-1]["amount"]


def autosave_amount(s: dict, account: str, k: int) -> float:
    """What goes into `account` on the k-th payday from now, after Mia's approved changes."""
    if any(x["account"] == account and x["date"] == payday(k).isoformat() for x in s["skips"]):
        return 0.0
    amount = s["autosave"].get(account, BASE_AUTOSAVE.get(account, 0.0))
    for t in s["temp_autosave"]:
        if t["account"] == account and k < t["paydays"]:
            amount += t["delta"]
    return r2(max(0.0, amount))


def effective_accounts(s: dict) -> list[dict]:
    accs = copy.deepcopy(BASE_ACCOUNTS)
    by_id = {a["id"]: a for a in accs}
    for m in s["moves"]:
        by_id[m["from"]]["closing_balance"] = r2(by_id[m["from"]]["closing_balance"] - m["amount"])
        by_id[m["to"]]["closing_balance"] = r2(by_id[m["to"]]["closing_balance"] + m["amount"])
    for gid, o in s.get("goal_overrides", {}).items():
        if gid in by_id:
            if o.get("target"):
                by_id[gid]["goal_target"] = o["target"]
            if o.get("goal_date"):
                by_id[gid]["goal_date"] = o["goal_date"]
    return accs


def account(s: dict, acc_id: str) -> dict:
    return next(a for a in effective_accounts(s) if a["id"] == acc_id)


def rent_frequency(s: dict) -> str:
    return s["life_event"].get("rent_frequency") or "weekly"


def rent_per_fortnight(s: dict) -> float:
    f = rent_frequency(s)
    return r2(RENT_AMOUNT * {"weekly": 2, "fortnightly": 1, "monthly": 12 / 26}[f])


def effective_upcoming(s: dict) -> list[dict]:
    """The bank's schedule for the next 5 weeks, with Mia's approved plan applied."""
    horizon = TODAY + timedelta(days=HORIZON_DAYS)
    out = []
    seen_autosave: set[tuple[str, str]] = set()
    for u in BASE_UPCOMING:
        u = dict(u)
        if u["label"] in s["paused"] or u["kind"] == "rent":
            continue
        if u["kind"] == "auto_save":
            k = payday_index(_d(u["date"]))
            amt = autosave_amount(s, u["to_account"], k if k is not None else 0)
            seen_autosave.add((u["to_account"], u["date"]))
            if amt <= 0:
                continue
            u["amount"] = -amt
            if amt != BASE_AUTOSAVE.get(u["to_account"]):
                u["source"] = "your plan"
        out.append(u)
    # Rent: one payment seen so far; the frequency comes from what Mia confirmed (LP-02)
    freq = rent_frequency(s)
    d = FIRST_UPCOMING_RENT
    while d <= horizon:
        out.append({"date": d.isoformat(), "label": "Rent · Ray White", "amount": -RENT_AMOUNT, "account": "everyday",
                    "kind": "rent", "source": f"{freq}, confirmed by you" if s["life_event"]["status"] == "confirmed"
                    else "detected weekly from 11 Nov", "estimate": False})
        if freq == "weekly":
            d += timedelta(days=7)
        elif freq == "fortnightly":
            d += timedelta(days=14)
        else:
            d = date(d.year + (d.month == 12), d.month % 12 + 1, d.day)
    out.sort(key=lambda u: (u["date"], u["kind"] != "pay", u["label"]))
    return out


# ------------------------------------------------------------------ spending basis

def _everyday_out(start: date, end: date = TODAY) -> list[dict]:
    return [t for t in TRANSACTIONS if t["account"] == "everyday" and t["amount"] < 0 and t["type"] != "transfer"
            and start <= _d(t["date"]) <= end]


def daily_spend(categories=("Groceries", "Eating out", "Shopping", "Transport"), days: int = 90) -> float:
    rows = [t for t in _everyday_out(TODAY - timedelta(days=days - 1)) if t["category"] in categories]
    return r2(sum(-t["amount"] for t in rows) / days)


EATING_OUT_DAILY = daily_spend(("Eating out",))


def daily_with_budgets(s: dict) -> float:
    daily = daily_spend()
    cap = s["budgets"].get("Eating out")
    if cap is not None:
        daily -= max(0.0, EATING_OUT_DAILY - cap / 7)
    return r2(daily)


# ------------------------------------------------------------------ Idea 4 · Shortfall Early Warning

def safe_to_spend(s: dict) -> dict:
    every = [u for u in effective_upcoming(s) if u["account"] == "everyday"]
    bal = account(s, "everyday")["closing_balance"]
    items = [u for u in every if TODAY < _d(u["date"]) < NEXT_PAY and u["amount"] < 0]
    committed = -sum(u["amount"] for u in items)
    return {"safe": r2(bal - committed), "committed": r2(committed), "items": items,
            "balance": bal, "next_payday": NEXT_PAY.isoformat()}


def forecast(s: dict) -> dict:
    """Everyday for the next 5 weeks. Until payday Mia spends only her safe-to-spend, evenly;
    from payday on she spends her usual daily amount. Every scheduled item is applied on its date."""
    every = [u for u in effective_upcoming(s) if u["account"] == "everyday"]
    sts = safe_to_spend(s)
    pre_days = max(1, (NEXT_PAY - TODAY).days - 1)
    daily = daily_with_budgets(s)
    bal = sts["balance"]
    points = [{"date": TODAY.isoformat(), "balance": r2(bal)}]
    low = {"date": TODAY.isoformat(), "balance": r2(bal)}
    for i in range(1, HORIZON_DAYS + 1):
        d = TODAY + timedelta(days=i)
        bal += sum(u["amount"] for u in every if _d(u["date"]) == d)
        bal -= max(0.0, sts["safe"]) / pre_days if d < NEXT_PAY else daily
        points.append({"date": d.isoformat(), "balance": r2(bal)})
        # Before payday the balance only reaches $0 because the model assumes the whole safe-to-spend is
        # spent, so the low that matters is from payday on (unless safe-to-spend is already negative).
        counts = d >= NEXT_PAY or sts["safe"] < 0
        if counts and (low["date"] == TODAY.isoformat() or bal < low["balance"]):
            low = {"date": d.isoformat(), "balance": r2(bal)}
    low_d = _d(low["date"])
    on_payday = [u for u in every if _d(u["date"]) == NEXT_PAY]
    causes = [u for u in every if NEXT_PAY < _d(u["date"]) <= low_d and abs(u["amount"]) >= 50]
    usual = r2(daily * (1 + max(0, (low_d - NEXT_PAY).days))) if low_d >= NEXT_PAY else 0.0
    return {
        "points": points, "low": low, "daily": daily, "safe": sts["safe"], "next_payday": NEXT_PAY.isoformat(),
        "payday": {
            "pay": r2(sum(u["amount"] for u in on_payday if u["kind"] == "pay")),
            "auto_saves": r2(sum(u["amount"] for u in on_payday if u["kind"] == "auto_save")),
            "pay_later": r2(sum(u["amount"] for u in on_payday if u["kind"] == "pay_later")),
        },
        "causes": causes, "usual_after_payday": usual,
        "assumption": f"Spends only the safe-to-spend ({money(sts['safe'])}) until payday, then the usual "
                      f"{money(daily, True)} a day (groceries, eating out, shopping, transport over the last 90 days"
                      + (", with your Eating out limit" if "Eating out" in s["budgets"] else "") + ").",
    }


FIX_LABELS = {
    "skip-life": "Skip one Westpac Life auto-save",
    "eating-out": "Keep Eating out under $60 a week",
    "hold-subs": "Hold off on 2 new subscriptions",
}


def apply_fix(s: dict, fix: str) -> dict:
    s = copy.deepcopy(s)
    if fix == "skip-life":
        s["skips"].append({"account": "life", "date": NEXT_PAY.isoformat()})
    elif fix == "eating-out":
        s["budgets"]["Eating out"] = 60
    elif fix == "hold-subs":
        s["paused"] += [x for x in ("Spotify Premium", "Amazon Prime") if x not in s["paused"]]
    return s


def forecast_fixes(s: dict) -> list[dict]:
    base_low = forecast(s)["low"]["balance"]
    out = []
    life_now = autosave_amount(s, "life", 0)
    if life_now > 0:
        out.append({"id": "skip-life", "label": FIX_LABELS["skip-life"],
                    "note": f"The {money(life_now)} on {short_date(NEXT_PAY)} stays in Everyday"})
    if "Eating out" not in s["budgets"]:
        out.append({"id": "eating-out", "label": FIX_LABELS["eating-out"],
                    "note": f"You’ve averaged {money(round(EATING_OUT_DAILY * 7))} a week lately"})
    if not {"Spotify Premium", "Amazon Prime"} <= set(s["paused"]):
        out.append({"id": "hold-subs", "label": FIX_LABELS["hold-subs"],
                    "note": "Spotify and Amazon Prime, started in the last 3 months"})
    for f in out:
        f["gain"] = r2(forecast(apply_fix(s, f["id"]))["low"]["balance"] - base_low)
    return out


# ------------------------------------------------------------------ goals (Idea 2)

def goal_members(s: dict, acc_id: str) -> list[dict]:
    """People saving for this goal with Mia (joint savings). Only the ones who joined add money."""
    return s.get("shared_goals", {}).get(acc_id, [])


def partner_per_payday(s: dict, acc_id: str) -> float:
    return r2(sum(m["per_payday"] for m in goal_members(s, acc_id) if m["status"] == "joined"))


def goal_date(s: dict, acc_id: str, solo: bool = False) -> date | None:
    """When the goal is reached. Joined partners' amounts count unless solo=True (Mia saving alone)."""
    a = account(s, acc_id)
    remaining = a["goal_target"] - a["closing_balance"]
    if remaining <= 0:
        return TODAY
    partners = 0.0 if solo else partner_per_payday(s, acc_id)
    for k in range(0, 26 * 30):
        step = autosave_amount(s, acc_id, k) + partners
        remaining -= step
        if remaining <= 0:
            return payday(k)
        if k > 30 and step <= 0:
            return None
    return None


def goals(s: dict) -> list[dict]:
    out = []
    for a in effective_accounts(s):
        if not a.get("goal_target"):
            continue
        reached = goal_date(s, a["id"])
        solo = goal_date(s, a["id"], solo=True)
        out.append({"members": goal_members(s, a["id"]), "partner_per_payday": partner_per_payday(s, a["id"]),
                    "reached_solo": solo.isoformat() if solo else None,
                    "id": a["id"], "name": a["name"], "saved": a["closing_balance"], "target": a["goal_target"],
                    "per_payday": autosave_amount(s, a["id"], 0), "reached": reached.isoformat() if reached else None,
                    "reached_label": month_year(reached) if reached else "No regular saving",
                    "color": GOAL_COLORS.get(a["id"], "#6d28d9"), "goal_date": a.get("goal_date"),
                    # With a target date: is the current plan in time for it?
                    "on_track": (reached is not None and reached <= _d(a["goal_date"])) if a.get("goal_date") else None})
    return out


TRADEOFF_WEIGHTS = {
    "A": ("Japan first", {"goal-japan": 0, "goal-home": 0.25, "life": 0.75},
          "Japan keeps its pace. Home deposit and Westpac Life slow down."),
    "B": ("Balanced", {"goal-japan": 0.125, "goal-home": 0.125, "life": 0.75},
          "Every goal gives a little, so none moves far."),
    "C": ("Home first", {"goal-japan": 0.5, "goal-home": 0, "life": 0.5},
          "Home deposit keeps its pace. Japan and Westpac Life slow down."),
}


def rent_rise_per_fortnight(s: dict) -> float:
    return r2(rent_per_fortnight(s) - OLD_RENT_WEEKLY * 2)


def tradeoff_state(s: dict, option: str) -> dict:
    """State after a trade-off option: auto-saves cut to cover the rent rise."""
    rise = rent_rise_per_fortnight(s)
    _, weights, _ = TRADEOFF_WEIGHTS[option]
    new = copy.deepcopy(s)
    remaining = max(0.0, rise)
    accs = list(weights)
    for i, acc in enumerate(accs):
        now = autosave_amount(s, acc, 0)
        cut = remaining if i == len(accs) - 1 and weights[acc] > 0 else min(now, 5 * math.ceil(rise * weights[acc] / 5))
        cut = min(now, max(0.0, cut))
        remaining -= cut
        if cut:
            new["autosave"][acc] = r2(s["autosave"].get(acc, BASE_AUTOSAVE.get(acc, 0)) - cut)
    new["plan_choice"] = {"kind": "goal_plan", "option": option, "name": TRADEOFF_WEIGHTS[option][0]}
    return new


def tradeoff_options(s: dict) -> dict:
    rise = rent_rise_per_fortnight(s)
    base_low = forecast(s)["low"]["balance"]
    opts = []
    for oid, (name, weights, summary) in TRADEOFF_WEIGHTS.items():
        after = tradeoff_state(s, oid)
        rows = []
        for acc in ("goal-japan", "goal-home"):
            before_d, after_d = goal_date(s, acc), goal_date(after, acc)
            moved = (after_d - before_d).days // 30 if before_d and after_d else None
            tone = "good" if not moved else "warn" if moved <= 3 else "bad"
            shift = "" if not moved else f" (+{moved} mo)" if moved < 12 else f" (+{moved / 12:.1f} yrs)"
            rows.append({"label": SHORT_NAMES[acc], "value": month_year(after_d) + (shift or " (on time)"),
                         "tone": tone})
        life_b, life_a = autosave_amount(s, "life", 0), autosave_amount(after, "life", 0)
        rows.append({"label": "Westpac Life each payday", "value": money(life_a),
                     "tone": "good" if life_a == life_b else "warn"})
        rows.append({"label": "Emergency fund", "value": "Untouched", "tone": "good"})
        opts.append({"id": oid, "name": name, "summary": summary, "rows": rows,
                     "low_after": forecast(after)["low"]["balance"]})
    return {"rent_rise_per_fortnight": rise, "rent_per_fortnight": rent_per_fortnight(s),
            "old_rent_per_fortnight": OLD_RENT_WEEKLY * 2, "options": opts, "low_now": base_low,
            "no_conflict": rise <= 0}


def japan_sooner(s: dict, variant: str) -> dict:
    """JP-01 / JP-02: reach the Japan goal within 6 paydays (about 3 months)."""
    jp, bali = account(s, "goal-japan"), account(s, "goal-bali")
    n = 6
    needed = r2(jp["goal_target"] - jp["closing_balance"])
    per = autosave_amount(s, "goal-japan", 0)
    keep = per * n
    from_bali = min(bali["closing_balance"], max(0.0, needed - keep)) if variant == "bali" else 0.0
    home_per = autosave_amount(s, "goal-home", 0)
    rest = max(0.0, needed - keep - from_bali)
    from_home_per = min(home_per, 5 * math.ceil(rest / n / 5)) if rest > 0 else 0
    from_every_per = max(0, math.ceil((rest - from_home_per * n) / n))
    total = keep + from_bali + from_home_per * n + from_every_per * n
    return {"variant": variant, "target": jp["goal_target"], "saved": jp["closing_balance"], "needed": needed,
            "per": per, "keep": r2(keep), "from_bali": r2(from_bali), "from_home_per": from_home_per,
            "from_everyday_per": from_every_per, "total": r2(total), "spare": r2(total - needed),
            "trip_by": payday(n - 1).isoformat(), "paydays": n, "bali_balance": bali["closing_balance"],
            "home_per": home_per, "japan_before": (goal_date(s, "goal-japan") or TODAY).isoformat(),
            "home_before": (d.isoformat() if (d := goal_date(s, "goal-home")) else None)}


def japan_state(s: dict, variant: str) -> dict:
    p = japan_sooner(s, variant)
    new = copy.deepcopy(s)
    if p["from_bali"] > 0:
        new["moves"].append({"from": "goal-bali", "to": "goal-japan", "amount": p["from_bali"],
                             "date": TODAY.isoformat(), "why": "Japan in 3 months"})
    if p["from_home_per"] or p["from_everyday_per"]:
        new["temp_autosave"].append({"account": "goal-japan", "delta": p["from_home_per"] + p["from_everyday_per"],
                                     "paydays": p["paydays"]})
    if p["from_home_per"]:
        new["temp_autosave"].append({"account": "goal-home", "delta": -p["from_home_per"], "paydays": p["paydays"]})
    new["plan_choice"] = {"kind": "japan_sooner", "variant": variant, "name": f"Japan by {month_year(p['trip_by'])}"}
    return new


# ------------------------------------------------------------------ Idea 1 · Life Event Detector

def life_event(s: dict) -> dict:
    signals = [t for t in TRANSACTIONS if t.get("signal") == "life-event" and t["account"] == "everyday"
               and t["type"] != "transfer"]
    bond = next(t for t in signals if t["merchant"].startswith("RTA"))
    new_rent = next(t for t in signals if t["category"] == "Housing" and t is not bond)
    mover = next((t for t in signals if t["category"] == "Moving"), None)
    old = [t for t in TRANSACTIONS if t["merchant"] == "Northside Realty"][-1]
    from_savings = next((t for t in TRANSACTIONS if t.get("signal") == "life-event" and t["account"] == "everyday"
                         and t["type"] == "transfer"), None)
    pub = lambda t: t and {k: t.get(k) for k in ("id", "date", "merchant", "category", "amount", "note")}
    return {"status": s["life_event"]["status"], "rent_frequency": s["life_event"]["rent_frequency"],
            "evidence": [pub(t) for t in (mover, bond, new_rent) if t], "bond": pub(bond), "new_rent": pub(new_rent),
            "old_rent": pub(old), "from_savings": pub(from_savings), "moving_date": mover["date"] if mover else None,
            "rent_rise_weekly": r2(-new_rent["amount"] + old["amount"])}


# ------------------------------------------------------------------ Idea 9+15 · Commitments Watch

CADENCES = [("weekly", 6, 8), ("fortnightly", 13, 15), ("monthly", 27, 32), ("quarterly", 85, 95), ("yearly", 350, 380)]
PER_FORTNIGHT = {"weekly": 2, "fortnightly": 1, "monthly": 12 / 26, "quarterly": 4 / 26, "yearly": 1 / 26}


def _detect_recurring() -> list[dict]:
    by: dict[str, list[dict]] = defaultdict(list)
    for t in TRANSACTIONS:
        if t["amount"] >= 0 or t["type"] in ("transfer", "atm") or t.get("provider"):
            continue
        if t["account"] not in ("everyday", "bills-saver"):
            continue
        by[t["merchant"]].append(t)
    out = []
    for merchant, ts in by.items():
        ts.sort(key=lambda t: t["date"])
        amounts = [-t["amount"] for t in ts]
        if len(ts) == 1 and ts[0].get("yearly"):
            cadence, gap = "yearly", 365
        elif len(ts) >= 2:
            gaps = sorted((_d(b["date"]) - _d(a["date"])).days for a, b in zip(ts, ts[1:]))
            gap = gaps[len(gaps) // 2]
            cadence = next((c for c, lo, hi in CADENCES if lo <= gap <= hi), None)
            if not cadence or any(abs(g - gap) > 3 for g in gaps):
                continue
            tol = 0.25 if ts[0]["category"] == "Bills and utilities" else 0.15
            if (max(amounts) - min(amounts)) / max(amounts) > tol:
                continue
        else:
            continue
        first, last = _d(ts[0]["date"]), _d(ts[-1]["date"])
        status = ("stopped" if (TODAY - last).days > gap * 1.25
                  else "new" if (TODAY - first).days <= 100 and cadence != "yearly" else "ongoing")
        change = r2(amounts[-1] - amounts[-2]) if len(amounts) >= 2 else 0
        out.append({"merchant": merchant, "category": ts[0]["category"], "cadence": cadence, "latest": amounts[-1],
                    "seen": [t["date"] for t in ts], "status": status,
                    "price_change": change if abs(change) >= 0.5 else None,
                    "next_expected": (last + timedelta(days=gap)).isoformat(), "account": ts[0]["account"],
                    "per_fortnight": r2(amounts[-1] * PER_FORTNIGHT[cadence])})
    return sorted(out, key=lambda r: -r["latest"])


RECURRING = _detect_recurring()


def yearly_bills(s: dict) -> dict:
    up = effective_upcoming(s)
    pot = account(s, "bills-saver")
    due = [u for u in up if u["account"] == "bills-saver"]
    tops = [u for u in up if u["kind"] == "auto_save" and u.get("to_account") == "bills-saver"]
    bal, short = pot["closing_balance"], 0.0
    for d in sorted({u["date"] for u in due + tops}):
        bal += sum(-u["amount"] for u in tops if u["date"] == d)
        bal += sum(u["amount"] for u in due if u["date"] == d)
        short = min(short, bal)
    ins_due = next((u for u in due if "insurance" in u["label"].lower()), None)
    last = [t for t in TRANSACTIONS if t["merchant"] == "Car insurance · AAMI" and t["account"] == "bills-saver"]
    prev_year = None
    if last and last[-1].get("note"):
        import re
        m = re.search(r"\$(\d+)", last[-1]["note"])
        prev_year = float(m.group(1)) if m else None
    insurance = None
    if ins_due and last:
        now, was = -ins_due["amount"], -last[-1]["amount"]
        insurance = {"due": ins_due["date"], "now": now, "was": was, "prev_year": prev_year,
                     "pct": round(100 * (now - was) / was), "rise": r2(now - was),
                     "reviewed": s["insurance_reviewed"]}
    return {"balance": pot["closing_balance"], "due": due, "short_by": r2(-short),
            "per_payday": autosave_amount(s, "bills-saver", 0), "insurance": insurance}


def insurance_state(s: dict) -> dict:
    """Smallest Bills set-aside auto-save that covers the renewal on time and the yearly rise after it."""
    yb = yearly_bills(s)
    base = autosave_amount(s, "bills-saver", 0)
    rise = yb["insurance"]["rise"] if yb["insurance"] else 0
    amount = base + math.ceil(rise / 26)
    while True:
        new = copy.deepcopy(s)
        new["autosave"]["bills-saver"] = amount
        new["insurance_reviewed"] = True
        if yearly_bills(new)["short_by"] <= 0 or amount > base + 500:
            return new
        amount += 1


def pay_later(s: dict) -> dict:
    p = T.pay_later_plans()
    up = effective_upcoming(s)
    nxt = r2(-sum(u["amount"] for u in up if u["kind"] == "pay_later" and _d(u["date"]) == NEXT_PAY))
    active = [{"id": x["plan_id"], "merchant": x["merchant"], "total": x["total"], "instalment": x["instalment"],
               "paid": len(x["paid"]), "remaining": x["instalments_left"], "owed": x["still_owed"],
               "dates": x["all_due_dates"]} for x in p["active_plans"]]
    done = [{"id": x["plan_id"], "merchant": x["merchant"], "total": x["total"], "finished": x["all_due_dates"][-1]}
            for x in p["finished_plans"]]
    fc = forecast(s)
    impacts = {}
    for size in (100, 200, 400):
        inst, extra, low = size / 4, 0.0, fc["low"]["balance"]
        for pt in fc["points"]:
            if payday_index(_d(pt["date"])) is not None:
                extra += inst
            low = min(low, pt["balance"] - extra)
        impacts[str(size)] = {"instalment": r2(inst), "low": r2(low)}
    return {"active": active, "done": done, "last_payday_total": p["taken_on_last_payday"],
            "next_payday_total": nxt, "owed": p["still_owed_total"], "what_if": impacts,
            "low": fc["low"]}


def commitments(s: dict) -> dict:
    conf, dism = set(s["recurring"]["confirmed"]), set(s["recurring"]["dismissed"])
    rows = []
    for r in RECURRING:
        r = dict(r)
        if r["status"] == "new":
            r["state"] = "confirmed" if r["merchant"] in conf else "dismissed" if r["merchant"] in dism else "found"
        else:
            r["state"] = r["status"]
        r["paused"] = any(r["merchant"].split()[0] in p for p in s["paused"])
        rows.append(r)
    counted = [r for r in rows if r["account"] == "everyday" and r["state"] in ("ongoing", "confirmed")
               and r["category"] != "Housing"]
    yb = yearly_bills(s)
    yearly_per_fn = r2(sum(-u["amount"] for u in yb["due"]) / 26)
    per_fn = r2(sum(r["per_fortnight"] for r in counted) + rent_per_fortnight(s) + yearly_per_fn)
    found = [r for r in rows if r["state"] == "found"]
    return {"rows": rows, "found": found, "per_fortnight": per_fn, "count": len(counted) + 1,
            "rent": {"label": "Rent · Ray White", "amount": RENT_AMOUNT, "frequency": rent_frequency(s),
                     "per_fortnight": rent_per_fortnight(s)},
            "yearly": yb, "pay_later": pay_later(s),
            "price_rises": [r for r in rows if r["price_change"] and r["price_change"] > 0 and r["category"] == "Subscriptions"
                            and r["state"] != "stopped"],
            "stopped": [r for r in rows if r["state"] == "stopped" and r["category"] == "Subscriptions"]}


# ------------------------------------------------------------------ Idea 10 · Receipt Lens

def receipt_groups(rid: str) -> dict:
    r = next(x for x in RECEIPTS if x["id"] == rid)
    groups: dict[str, float] = defaultdict(float)
    for i in r["items"]:
        groups[i["group"]] += i["price"]
    groups = {g: r2(v) for g, v in groups.items()}
    total = r2(sum(groups.values()))
    paid = next((t for t in TRANSACTIONS if t.get("receipt_id") == rid), None)
    return {"receipt": r, "groups": groups, "sum": total, "matches": abs(total - r["total"]) < 0.01,
            "paid_merchant": paid["merchant"] if paid else None}


BIG_SHOP_RECEIPT = "rcpt-coles-20261112"


def grocery_check(s: dict) -> dict:
    shop = next(t for t in TRANSACTIONS if t.get("receipt_id") == BIG_SHOP_RECEIPT)
    shops = sorted(-t["amount"] for t in _everyday_out(TODAY - timedelta(days=89))
                   if t["category"] == "Groceries" and -t["amount"] >= 40 and t["id"] != shop["id"])
    usual = round(shops[len(shops) // 2])
    month = TODAY.strftime("%Y-%m")
    total = sum(-t["amount"] for t in _everyday_out(_d(month + "-01")) if t["category"] == "Groceries")
    items = [i for r in RECEIPTS if r["date"].startswith(month) for i in r["items"]]
    extras = sum(i["price"] for i in items if i["group"] == "Extras and snacks")
    share = extras / sum(i["price"] for i in items) if items else 0
    return {"shop": {"id": shop["id"], "merchant": shop["merchant"], "date": shop["date"], "amount": -shop["amount"],
                     "receipt_id": BIG_SHOP_RECEIPT},
            "usual": usual, "above": r2(-shop["amount"] - usual),
            "reviewed": BIG_SHOP_RECEIPT in s["receipts_reviewed"] or shop["id"] in s["splits"],
            "split": s["splits"].get(shop["id"]),
            "month": {"total": r2(total), "extras_share": round(share, 3), "extras_estimate": r2(total * share)}}


# ------------------------------------------------------------------ Ideas 5+6 · Spending Behaviour Coach

def insights(s: dict) -> dict:
    cm = T.compare_month(TODAY.strftime("%Y-%m"))
    cats = [c for c in cm["categories"] if c["avg_same_days"] > 0]
    months = []
    y, m = TODAY.year, TODAY.month
    for _ in range(6):
        first = date(y, m, 1)
        last = date(y + (m == 12), m % 12 + 1, 1) - timedelta(days=1)
        v = sum(-t["amount"] for t in _everyday_out(first, min(last, TODAY)) if t["category"] in T.INSIGHT_CATEGORIES)
        months.append({"m": f"{first:%b}", "v": r2(v), "partial": last > TODAY})
        y, m = (y, m - 1) if m > 1 else (y - 1, 12)
    months.reverse()
    full = [x["v"] for x in months if not x["partial"]]
    up = sorted((c for c in cats if c["diff_vs_same_days"] > 0), key=lambda c: -c["diff_vs_same_days"])
    down = [c["category"] for c in cats if c["diff_vs_same_days"] < 0]
    # delivery orders this month vs the same days of earlier months
    def orders(a: date, b: date) -> int:
        return sum(1 for t in _everyday_out(a, b) if t["category"] == "Eating out"
                   and any(k in t["merchant"].lower() for k in ("uber eats", "menulog", "doordash", "deliveroo")))
    this_orders = orders(date(TODAY.year, TODAY.month, 1), TODAY)
    prev = []
    yy, mm = TODAY.year, TODAY.month
    for _ in range(3):
        yy, mm = (yy, mm - 1) if mm > 1 else (yy - 1, 12)
        prev.append(orders(date(yy, mm, 1), date(yy, mm, min(TODAY.day, 28))))
    usual_orders = round(sum(prev) / len(prev)) if prev else 0
    parts = [f"{c['category']} ({money(c['diff_vs_same_days'], False).replace('$', '+$', 1)})" for c in up[:2]]
    coach = (f"{' and '.join(parts)} are above your usual by now."
             if parts else "Your spending is in line with earlier months.")
    if this_orders:
        coach += f" {this_orders} food delivery orders, usually {usual_orders}."
    if down:
        coach += f" {', '.join(down[:2])} {'is' if len(down[:2]) == 1 else 'are'} under your average."
    return {"spent": cm["totals"]["this_month"], "avg_same_days": cm["totals"]["avg_same_days"],
            "vs_same_days": r2(cm["totals"]["this_month"] - cm["totals"]["avg_same_days"]),
            "avg_full": r2(sum(full) / len(full)) if full else 0, "months": months, "categories": cats,
            "coach": coach, "eating_out_weekly": r2(EATING_OUT_DAILY * 7), "budgets": s["budgets"],
            "days_counted": cm["days_counted"]}


# ------------------------------------------------------------------ ideas for next time (shown under the shortfall fixes)

OPTIONAL_CATEGORIES = ("Eating out", "Shopping", "Entertainment")  # choices, not bills, rent, health or groceries
_DELIVERY = ("uber eats", "menulog", "doordash", "deliveroo")


def cut_ideas(s: dict) -> list[dict]:
    """Optional spending that ran above Mia's usual this month, as ideas she could trim next time.

    Not a fix and not part of the forecast: nothing here changes her plan. Only repeat spending counts
    (2+ purchases), one-off costs of the move are left out, and it respects the spending-insights consent.
    """
    if not s["consent"].get("spending_insights"):
        return []

    def bucket(t: dict) -> str:
        return "Food delivery" if any(k in t["merchant"].lower() for k in _DELIVERY) else t["merchant"]

    def totals(a: date, b: date) -> dict[str, list]:
        out: dict[str, list] = {}
        for t in _everyday_out(a, b):
            if t["category"] in OPTIONAL_CATEGORIES and not t.get("signal"):
                row = out.setdefault(bucket(t), [0, 0.0, t["category"]])
                row[0] += 1
                row[1] += -t["amount"]
        return out

    this = totals(date(TODAY.year, TODAY.month, 1), TODAY)
    prev, (yy, mm) = [], (TODAY.year, TODAY.month)
    for _ in range(3):
        yy, mm = (yy, mm - 1) if mm > 1 else (yy - 1, 12)
        prev.append(totals(date(yy, mm, 1), date(yy, mm, min(TODAY.day, 28))))
    ideas = []
    for name, (count, spent, category) in this.items():
        usual = sum(p.get(name, [0, 0.0])[1] for p in prev) / len(prev)
        usual_count = round(sum(p.get(name, [0, 0.0])[0] for p in prev) / len(prev))
        extra = spent - usual
        if count >= 2 and extra >= 15:
            ideas.append({"id": name.lower().replace(" ", "-"), "label": name, "category": category, "count": count,
                          "usual_count": usual_count, "spent": r2(spent), "usual": r2(usual), "extra": float(round(extra)),
                          # Windy can act on eating out today (a weekly limit, through review and approve)
                          "action": "limit" if category == "Eating out" and "Eating out" not in s["budgets"] else "ask"})
    ideas.sort(key=lambda i: -i["extra"])
    return ideas[:3]


# ------------------------------------------------------------------ home screen

def home_cards(s: dict) -> list[dict]:
    c, cards = s["consent"], []
    dismissed = set(s["dismissed_cards"])
    if c["life_events"] and s["life_event"]["status"] == "detected" and "life-event" not in dismissed:
        le = life_event(s)
        cards.append({"id": "life-event", "bond": -le["bond"]["amount"]})
    fc = forecast(s)
    if c["cash_flow"] and fc["low"]["balance"] < 0:
        cards.append({"id": "shortfall", "low": fc["low"]})
    cm = commitments(s)
    if c["regular_payments"] and "commitments" not in dismissed and (cm["found"] or (cm["yearly"]["insurance"] and not s["insurance_reviewed"])):
        cards.append({"id": "commitments", "found": [f["merchant"] for f in cm["found"]],
                      "insurance": cm["yearly"]["insurance"], "pay_later": {"count": len(cm["pay_later"]["active"]),
                      "next": cm["pay_later"]["next_payday_total"], "owed": cm["pay_later"]["owed"]}})
    gc = grocery_check(s)
    if c["receipts"] and not gc["reviewed"] and "grocery-check" not in dismissed:
        cards.append({"id": "grocery-check", "shop": gc["shop"], "usual": gc["usual"]})
    return cards


def metrics(s: dict) -> dict[str, tuple[str, float | str]]:
    """Key figures used to show what a change does (before -> after)."""
    out: dict[str, tuple[str, float | str]] = {}
    fc, sts = forecast(s), safe_to_spend(s)
    out["Everyday lowest point"] = (f"{money(round(fc['low']['balance']))} ({short_date(fc['low']['date'])})", fc["low"]["balance"])
    out["Safe to spend until payday"] = (money(sts["safe"]), sts["safe"])
    def per(acc: str) -> tuple[str, str]:
        now, later = autosave_amount(s, acc, 0), autosave_amount(s, acc, 8)
        text = money(now) if now == later else f"{money(now)} next payday, then {money(later)}"
        return text, f"{now}/{later}"

    for g in goals(s):
        out[f"{g['name']} balance"] = (money(g["saved"]), g["saved"])
        out[f"{g['name']} each payday"] = per(g["id"])
        out[f"{g['name']} reached"] = (g["reached_label"], g["reached"] or "")
        out[f"{g['name']} target"] = (money(g["target"]), g["target"])
        out[f"{g['name']} target date"] = (month_year(g["goal_date"]) if g["goal_date"] else "None", g["goal_date"] or "")
    for acc in ("life", "bills-saver"):
        out[f"{SHORT_NAMES[acc]} each payday"] = per(acc)
    yb = yearly_bills(s)
    out["Bills set-aside short by"] = (money(yb["short_by"]) if yb["short_by"] > 0 else "Covered", yb["short_by"])
    cap = s["budgets"].get("Eating out")
    out["Eating out limit"] = (f"{money(cap)} a week" if cap is not None else "None", cap or 0)
    paused = [p for p in s["paused"]]
    out["On hold"] = (", ".join(paused) if paused else "Nothing", ",".join(paused))
    return out


def diff(before: dict, after: dict) -> tuple[list[dict], list[dict]]:
    mb, ma = metrics(before), metrics(after)
    changes, same = [], []
    for k in mb:
        if mb[k][1] != ma[k][1]:
            changes.append({"label": k, "from": mb[k][0], "to": ma[k][0]})
    for k in ("Emergency fund balance", "Emergency fund each payday", "Safe to spend until payday"):
        if k in mb and mb[k][1] == ma[k][1] and mb[k][1] not in (0, "0.0/0.0"):
            same.append({"label": k, "value": mb[k][0]})
    return changes, same


def snapshot(s: dict) -> dict:
    accs = effective_accounts(s)
    fc = forecast(s)
    return {
        "today": TODAY.isoformat(),
        "user": {"first_name": "Mia"},
        "accounts": [{"id": a["id"], "name": a["name"], "product": a["product"], "balance": a["closing_balance"],
                      "goal_target": a.get("goal_target"), "note": a.get("note")} for a in accs],
        "everyday": {"balance": account(s, "everyday")["closing_balance"], **{k: v for k, v in safe_to_spend(s).items() if k != "items"}},
        "safe_items": safe_to_spend(s)["items"],
        "goals": goals(s),
        "cut_ideas": cut_ideas(s),
        "cards": home_cards(s),
        "forecast": fc,
        "fixes": forecast_fixes(s),
        "life_event": life_event(s),
        "tradeoff": tradeoff_options(s),
        "japan": {"bali": japan_sooner(s, "bali"), "home": japan_sooner(s, "home")},
        "commitments": commitments(s),
        "grocery": grocery_check(s),
        "receipts": [{**receipt_groups(r["id"]), "reviewed": r["id"] in s["receipts_reviewed"]} for r in RECEIPTS],
        "insights": insights(s),
        "consent": s["consent"],
        "plan_choice": s["plan_choice"],
        "budgets": s["budgets"],
        "history": [{k: v for k, v in h.items() if k != "before"} for h in s["history"]][::-1],
        "usage": s["usage"][::-1][:50],
        "usage_count": len(s["usage"]),
        "upcoming": [u for u in effective_upcoming(s) if u["account"] == "everyday"],
    }


# ------------------------------------------------------------------ for the chat tools

def forecast_for_chat(s: dict) -> dict:
    fc = forecast(s)
    return {"everyday_balance_now": account(s, "everyday")["closing_balance"], "next_payday": fc["next_payday"],
            "safe_to_spend_until_payday": fc["safe"], "typical_daily_spend": fc["daily"],
            "assumption": fc["assumption"], "lowest_point": fc["low"],
            "ways_to_fix": [{k: f[k] for k in ("label", "gain")} for f in forecast_fixes(s)],
            "scheduled_everyday_items": [u for u in effective_upcoming(s) if u["account"] == "everyday"],
            "note": "Includes every plan change Mia has approved."}


def goal_projection_for_chat(s: dict, goal_id: str, amount_per_payday: float | None = None) -> dict:
    g = next((x for x in goals(s) if x["id"] == goal_id), None)
    if not g:
        return {"error": f"unknown goal_id {goal_id}", "valid_goal_ids": [x["id"] for x in goals(s)]}
    out = {"goal": g["name"], "saved": g["saved"], "target": g["target"], "current_amount_per_payday": g["per_payday"],
           "reached_on_current_plan": g["reached"], "paydays_are": "fortnightly"}
    if amount_per_payday is not None:
        what_if = copy.deepcopy(s)
        what_if["autosave"][goal_id] = float(amount_per_payday)
        what_if["temp_autosave"] = [t for t in what_if["temp_autosave"] if t["account"] != goal_id]
        d = goal_date(what_if, goal_id)
        out["what_if_amount_per_payday"] = amount_per_payday
        out["what_if_reached_on"] = d.isoformat() if d else None
    return out
