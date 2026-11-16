"""Windy's memory lives in SQLite: saved between chats, read before every answer, deletable by Mia."""

import memory
import state


def test_starts_empty():
    assert memory.all_memories() == []


def test_remember_and_list():
    memory.remember("Wants to go to Japan in February")
    memory.remember("Prefers answers in Mandarin")
    assert [m["text"] for m in memory.all_memories()] == ["Wants to go to Japan in February",
                                                           "Prefers answers in Mandarin"]


def test_duplicates_are_skipped():
    memory.remember("Prefers answers in Mandarin")
    memory.remember("  Prefers answers in Mandarin ")
    assert len(memory.all_memories()) == 1


def test_text_is_cleaned_and_limited():
    saved = memory.remember("x" * 500)
    assert len(saved["text"]) == memory.MAX_CHARS
    try:
        memory.remember("   ")
        raise AssertionError("empty memory should be rejected")
    except ValueError:
        pass


def test_keeps_the_latest_30():
    for i in range(35):
        memory.remember(f"note {i}")
    texts = [m["text"] for m in memory.all_memories()]
    assert len(texts) == memory.MAX_MEMORIES
    assert texts[0] == "note 5" and texts[-1] == "note 34"


def test_forget_one():
    keep = memory.remember("Saving for a home deposit")
    drop = memory.remember("Paid rent weekly")
    assert memory.forget(drop["id"]) is True
    assert [m["id"] for m in memory.all_memories()] == [keep["id"]]
    assert memory.forget(9999) is False


def test_reset_clears_memory():
    memory.remember("Wants to go to Japan in February")
    state.reset()
    assert memory.all_memories() == []


def test_prompt_block():
    assert memory.prompt_block() == ""
    memory.remember("Wants to go to Japan in February")
    block = memory.prompt_block()
    assert "What you remember about Mia" in block
    assert "- Wants to go to Japan in February" in block


# ---------------------------------------------------------------- earlier conversations

def test_log_and_recall_earlier_chats():
    memory.log_exchange("chat-1", "How much did I spend on Uber Eats?", "You spent $86.40 on Uber Eats this month.")
    memory.log_exchange("chat-2", "When is rent due?", "Next rent is $620 on 18 Nov.")
    block = memory.prompt_block(current_conversation="chat-2")
    assert "How much did I spend on Uber Eats?" in block
    assert "You spent $86.40" in block
    assert "When is rent due?" not in block  # the current chat is already in Windy's messages


def test_only_the_latest_chats_are_recalled():
    for i in range(15):
        memory.log_exchange(f"c{i}", f"question {i}", f"answer {i}")
    recent = memory.recent_exchanges(exclude_conversation="other")
    assert len(recent) == memory.RECALL_EXCHANGES
    assert recent[-1]["question"] == "question 14"


def test_long_answers_are_shortened():
    memory.log_exchange("c", "q", "a" * 2000)
    assert len(memory.recent_exchanges()[0]["answer"]) == memory.MAX_ANSWER_CHARS


def test_forget_chats_and_reset():
    memory.log_exchange("c", "q", "a")
    memory.forget_chats()
    assert memory.recent_exchanges() == []
    memory.log_exchange("c", "q", "a")
    state.reset()
    assert memory.recent_exchanges() == []


def test_timestamps_are_the_real_time():
    from datetime import date
    memory.log_exchange("c", "q", "a")
    note = memory.remember("Wants to go to Japan in February")
    today = date.today().isoformat()
    assert memory.recent_exchanges()[0]["time"].startswith(today)
    assert note["created_at"].startswith(today)


def test_windy_is_not_shown_dates_of_earlier_chats():
    # Mia's bank data is frozen at the demo date, so a real date here would confuse Windy
    memory.log_exchange("c", "When is rent due?", "18 Nov.")
    block = memory.prompt_block()
    assert "- Q: When is rent due? | A: 18 Nov." in block
    assert memory.recent_exchanges()[0]["time"][:10] not in block
