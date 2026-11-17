"""Inviting someone to a goal by PayID or BSB + account number. Only a masked version is ever kept."""

import json

import pytest

import engine as E
import guardrails as G
import planner
import state


def _invite(**who):
    return planner.act("goal_invite", {"goal": "goal-japan", "per_payday": 50, **who})


def _members():
    return E.goal_members(state.load(), "goal-japan")


@pytest.mark.parametrize("who, label", [
    ({"method": "payid", "payid": "alex.chen@gmail.com"}, "PayID a•••@gmail.com"),
    ({"method": "payid", "payid": "0412 345 678"}, "PayID mobile ••• ••• 678"),
    ({"method": "payid", "payid": "+61412345678"}, "PayID mobile ••• ••• 678"),
    ({"method": "payid", "payid": "51 824 753 556"}, "PayID ABN ••• 556"),
    ({"method": "account", "bsb": "032-001", "account": "12345678"}, "BSB 032-••• · Acct ••••5678"),
])
def test_valid_invites_are_saved_masked(who, label):
    _invite(**who)
    assert [m["name"] for m in _members()] == [label]


def test_full_details_are_never_saved():
    _invite(method="account", bsb="032-001", account="12345678")
    _invite(method="payid", payid="alex.chen@gmail.com")
    saved = json.dumps(state.load())
    for secret in ("12345678", "032001", "032-001", "alex.chen"):
        assert secret not in saved


@pytest.mark.parametrize("who", [
    {"method": "payid", "payid": "not-an-id"},
    {"method": "payid", "payid": "0512 345 678"},
    {"method": "payid"},
    {"method": "account", "bsb": "03200", "account": "12345678"},
    {"method": "account", "bsb": "032-001", "account": "123"},
    {"method": "account", "bsb": "032-001"},
    {"method": "fax", "payid": "x@y.com"},
])
def test_bad_details_are_refused(who):
    with pytest.raises(G.GuardrailError):
        _invite(**who)
    assert _members() == []


def test_same_person_twice_is_refused():
    _invite(method="payid", payid="0412 345 678")
    with pytest.raises(G.GuardrailError):
        _invite(method="payid", payid="+61 412 345 678")


def test_accept_and_remove_use_the_masked_label():
    _invite(method="account", bsb="032-001", account="12345678")
    label = _members()[0]["name"]
    planner.act("goal_member_accept", {"goal": "goal-japan", "name": label})
    assert _members()[0]["status"] == "joined"
    planner.act("goal_member_remove", {"goal": "goal-japan", "name": label})
    assert _members() == []
