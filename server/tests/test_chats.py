"""Whole conversations are saved, listed, reopened (to carry on) and deleted."""

import chats
import state


class FakeBlock:
    """Stands in for an Anthropic SDK content block (they have model_dump)."""

    def __init__(self, **fields):
        self.fields = fields

    def model_dump(self, **_):
        return dict(self.fields)


def _conversation():
    return [
        {"role": "user", "content": "How much did I spend on Uber Eats?"},
        {"role": "assistant", "content": [
            FakeBlock(type="text", text="Let me check."),
            FakeBlock(type="tool_use", id="t1", name="search_transactions", input={"query": "uber eats"})]},
        {"role": "user", "content": [{"type": "tool_result", "tool_use_id": "t1", "content": "{\"total\": -49.47}"}]},
        {"role": "assistant", "content": [FakeBlock(type="text", text="You spent $49.47.")]},
    ]


def test_save_and_load_round_trip():
    chats.save("c1", _conversation())
    loaded = chats.load("c1")
    assert loaded[0] == {"role": "user", "content": "How much did I spend on Uber Eats?"}
    assert loaded[1]["content"][1] == {"type": "tool_use", "id": "t1", "name": "search_transactions",
                                       "input": {"query": "uber eats"}}
    assert len(loaded) == 4


def test_unknown_chat_is_none():
    assert chats.load("nope") is None


def test_saving_again_replaces_the_messages():
    chats.save("c1", _conversation()[:1])
    chats.save("c1", _conversation())
    assert len(chats.load("c1")) == 4


def test_sessions_list_newest_first_with_titles():
    chats.save("c1", _conversation())
    chats.save("c2", [{"role": "user", "content": "When is rent due?"}])
    sessions = chats.sessions()
    assert [s["id"] for s in sessions] == ["c2", "c1"]
    assert sessions[1]["title"] == "How much did I spend on Uber Eats?"
    assert sessions[1]["questions"] == 1


def test_transcript_is_what_the_screen_shows():
    chats.save("c1", _conversation())
    assert chats.transcript("c1") == [
        {"role": "user", "text": "How much did I spend on Uber Eats?", "tools": []},
        {"role": "assistant", "text": "Let me check.You spent $49.47.",
         "tools": [{"name": "search_transactions", "input": {"query": "uber eats"}}]},
    ]


def test_delete_and_reset():
    chats.save("c1", _conversation())
    chats.save("c2", _conversation())
    assert chats.delete("c1") is True
    assert chats.load("c1") is None and chats.delete("c1") is False
    state.reset()
    assert chats.sessions() == []
