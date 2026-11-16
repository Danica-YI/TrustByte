"""harbour + Windy backend (FastAPI): coordinates the services in the architecture.

  Harbour web app -> input guardrails -> FastAPI -> AI model + Python engine -> output guardrails
  -> customer reviews and approves -> only the simulated financial plan is updated

  GET  /api/snapshot        everything the app shows, worked out by the engine from base data + plan state
  POST /api/propose         a plan change: guardrails, engine, AI explanation, held for approval
  POST /api/approve/{id}    Mia approves: the plan state is updated
  POST /api/action          small confirmations (consent, "yes that's a bill", receipt saved...)
  POST /api/undo/{id}       roll a change back
  POST /api/reset           start the demo story again
  POST /api/chat            Ask Windy: Claude with tools over the same live plan, reading its memory first
  GET  /api/memory          what Windy remembers (notes + earlier chats);  DELETE /api/memory/{id}, /api/memory/chats
  GET  /api/chats           past conversations;  GET /api/chats/{id} reopen one;  DELETE /api/chats/{id}

Run (from the repo root):
    server/.venv/bin/uvicorn main:app --app-dir server --port 8787 --reload

The API key is read from the ANTHROPIC_API_KEY environment variable, or from server/.env
(gitignored). The frontend dev server proxies /api to this server.
"""

from __future__ import annotations

import json
import os
import uuid
from datetime import datetime
from pathlib import Path

import anthropic
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

import chats
import engine
import guardrails as G
import memory
import planner
import state as plan_state
import suggest
import tools
from tools import TODAY, TOOLS, run_tool


def _load_dotenv(path: Path) -> None:
    """Tiny .env reader so we don't need python-dotenv. Existing env vars win."""
    if not path.exists():
        return
    for line in path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


_load_dotenv(Path(__file__).parent / ".env")

MODEL = os.environ.get("WINDY_MODEL", "claude-opus-5-5")
EFFORT = os.environ.get("WINDY_EFFORT", "medium")  # low | medium | high (chat: lower = faster)
MAX_TOOL_ROUNDS = 8

# Kept stable (no timestamps) so the prompt prefix can be cached between requests.
SYSTEM = f"""You are Windy, the AI assistant inside a demo of the Westpac app built for a hackathon.
You are talking with the customer, Mia. Today is {TODAY:%A} {TODAY.day} {TODAY:%B %Y}. All data is synthetic.

How to answer:
- Get every fact and number from your tools. When a tool returns a total, quote it; don't add numbers up yourself.
- If the tools can't show something (cash, cards at other banks, anything outside this app), say so plainly.
- Write for a phone screen: 2 to 5 short sentences, or a short list using "-". No headings, tables or bold.
- Money as $1,234.56 (AUD). Dates like 3 Dec.
- Reply in the language the customer writes in.
- When a month isn't over yet, compare it with the same days of earlier months, not with whole months.

Boundaries:
- You explain and lay out options; Mia decides. Don't recommend specific financial products, providers or
  investments, and don't make lending decisions. Loan figures are estimates, not offers.
- You can't move money, change settings or submit applications in this demo. Point to the screen she'd use.
- Spending insights are about money only. Never comment on health, diet, religion or lifestyle from purchases.
- Signals like a new rent payee only suggest a life change; ask Mia rather than assume.
- Every plan change Mia has approved (auto-saves, limits, payments on hold) is already in the tool results.

Next steps:
- When a plan change would clearly help with what she asked, offer it with suggest_next. Each action becomes
  a button under your answer that opens a review screen; she decides there. Don't offer one when nothing
  needs changing. Always write your answer to Mia in words too: the buttons never replace it.
- Give her a choice: when there are two different ways to help (e.g. skip one Westpac Life auto-save, or
  limit Eating out), offer them as two separate buttons, not one combined change. Name both in your answer
  so she can compare them. Combine fixes into one button only if neither works on its own.
- Never say a change is made or set up: you can only suggest it. Say she can review it with the button below.
- After most answers, also give 2 or 3 follow-up questions in suggest_next's questions (things she'd likely
  ask next that your tools can answer). She taps one to ask it, so don't list them in your text.
- If her question is unclear (which month? which goal?), ask one short clarifying question in your answer
  and put its possible answers in questions, instead of guessing.

Memory:
- When Mia tells you something lasting about herself (a goal, a preference, how she gets paid, how she likes
  answers), save it with the remember tool without asking, then mention in a few words that you'll remember it.
- Never save health, religion, relationships or other sensitive details, even if she mentions them.
- Her questions from earlier chats, if any, are listed after these instructions. When she asks what she
  asked or said before, answer from that list."""
CHAT_TOOLS = TOOLS + [memory.REMEMBER_TOOL, suggest.SUGGEST_TOOL]


def _system(conversation_id: str) -> list[dict]:
    """Windy's instructions plus its notes about Mia and her earlier chats, read fresh before every answer."""
    blocks = [{"type": "text", "text": SYSTEM}]
    notes = memory.prompt_block(current_conversation=conversation_id)
    if notes:
        blocks.append({"type": "text", "text": notes})
    return blocks

client = anthropic.Anthropic()
app = FastAPI(title="Westpac + Windy demo backend")


@app.exception_handler(G.GuardrailError)
def _guardrail_error(_: Request, e: G.GuardrailError) -> JSONResponse:
    return JSONResponse({"error": e.message, "checks": e.checks}, status_code=e.status)


def _snapshot() -> dict:
    return engine.snapshot(plan_state.load())


@app.get("/api/snapshot")
def snapshot() -> dict:
    return _snapshot()


class ProposeIn(BaseModel):
    kind: str
    params: dict = {}


@app.post("/api/propose")
def propose(body: ProposeIn) -> dict:
    return planner.propose(body.kind, body.params)


@app.post("/api/approve/{pid}")
def approve(pid: str) -> dict:
    out = planner.approve(pid)
    return {**out, "snapshot": _snapshot()}


@app.post("/api/action")
def action(body: ProposeIn) -> dict:
    out = planner.act(body.kind, body.params)
    return {**out, "snapshot": _snapshot()}


@app.post("/api/undo/{entry_id}")
def undo(entry_id: str) -> dict:
    s = plan_state.load()
    try:
        restored = plan_state.undo(s, entry_id)
    except KeyError:
        raise HTTPException(404, "unknown change")
    plan_state.save(restored)
    return {"snapshot": _snapshot(), "checks": [G.check("approve", "Change undone", True, "Plan rolled back")]}


@app.post("/api/reset")
def reset() -> dict:
    plan_state.reset()
    conversations.clear()
    usage_log.clear()
    return {"snapshot": _snapshot()}


def _run_tool_on_live_plan(name: str, args: object) -> tuple[str, bool]:
    """Chat tools see the same plan as the screens: approved moves, auto-saves, holds and limits."""
    if name == "remember":
        if not isinstance(args, dict) or not isinstance(args.get("note"), str):
            return json.dumps({"error": "remember needs a 'note' string"}), True
        try:
            return json.dumps({"saved": memory.remember(args["note"])}), False
        except ValueError as e:
            return json.dumps({"error": str(e)}), True
    s = plan_state.load()
    tools.ACCOUNTS = engine.effective_accounts(s)
    tools.UPCOMING = engine.effective_upcoming(s)
    if isinstance(args, dict) and name == "cash_flow_forecast":
        return json.dumps(engine.forecast_for_chat(s), default=str), False
    if isinstance(args, dict) and name == "goal_projection" and "goal_id" in args:
        return json.dumps(engine.goal_projection_for_chat(s, args["goal_id"], args.get("amount_per_payday"))), False
    plan_state.log_usage(s, "chat", name.replace("_", " "))
    plan_state.save(s)
    return run_tool(name, args)

# conversation_id -> full message history (append-only, including tool calls and thinking blocks)
conversations: dict[str, list] = {}
# What Windy looked at, for the "Your record" part of the consent screen (DC-01)
usage_log: list[dict] = []


class ChatIn(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    conversation_id: str | None = None


def _sse(payload: dict) -> str:
    return f"data: {json.dumps(payload)}\n\n"


def _has_credentials() -> bool:
    return bool(os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN"))


@app.get("/api/health")
def health() -> dict:
    return {"ok": True, "model": MODEL, "effort": EFFORT, "has_credentials": _has_credentials(),
            "data_today": TODAY.isoformat()}


@app.get("/api/usage")
def usage() -> dict:
    return {"entries": usage_log[-100:]}


@app.get("/api/memory")
def get_memory() -> dict:
    return {"memories": memory.all_memories(), "earlier_chats": memory.recent_exchanges()}


@app.delete("/api/memory/chats")
def forget_chats() -> dict:
    memory.forget_chats()
    return {"memories": memory.all_memories(), "earlier_chats": []}


@app.delete("/api/memory/{memory_id}")
def forget_memory(memory_id: int) -> dict:
    if not memory.forget(memory_id):
        raise HTTPException(404, "unknown memory")
    return {"memories": memory.all_memories()}


@app.get("/api/chats")
def list_chats() -> dict:
    """Mia's past conversations, most recent first."""
    return {"chats": chats.sessions()}


@app.get("/api/chats/{conversation_id}")
def open_chat(conversation_id: str) -> dict:
    messages = chats.transcript(conversation_id)
    if messages is None:
        raise HTTPException(404, "unknown chat")
    return {"id": conversation_id, "messages": messages}


@app.delete("/api/chats/{conversation_id}")
def delete_chat(conversation_id: str) -> dict:
    if not chats.delete(conversation_id):
        raise HTTPException(404, "unknown chat")
    conversations.pop(conversation_id, None)
    return {"chats": chats.sessions()}


@app.post("/api/chat")
def chat(body: ChatIn) -> StreamingResponse:
    message, _checks = G.clean_chat_input(body.message, plan_state.load())
    cid = body.conversation_id or uuid.uuid4().hex
    if body.conversation_id and body.conversation_id not in conversations:
        # A past chat Mia reopened: carry on from what was saved (also works after a restart)
        saved = chats.load(body.conversation_id)
        if saved is None:
            raise HTTPException(404, "unknown conversation_id; start a new chat")
        conversations[cid] = saved
    messages = conversations.setdefault(cid, [])
    turn_start = len(messages)
    messages.append({"role": "user", "content": message})

    def events():
        yield _sse({"type": "start", "conversation_id": cid, "checks": _checks})
        if not _has_credentials():
            del messages[turn_start:]
            yield _sse({"type": "error", "message": "No API key on the server. Put ANTHROPIC_API_KEY in server/.env and restart it."})
            return
        system = _system(cid)  # read Windy's memory before answering
        answer: list[str] = []
        tool_outputs: list[str] = []  # what the calculator returned this turn, to check Windy's figures against
        try:
            for _ in range(MAX_TOOL_ROUNDS):
                with client.beta.messages.stream(
                    model=MODEL,
                    max_tokens=16000,
                    system=system,
                    tools=CHAT_TOOLS,
                    messages=messages,
                    output_config={"effort": EFFORT},
                    cache_control={"type": "ephemeral"},
                    # If the model declines for policy reasons, the API retries on a fallback model.
                    betas=["server-side-fallback-2026-07-01"],
                    fallbacks="default",
                ) as stream:
                    first_text = True
                    for event in stream:
                        if event.type == "text":
                            so_far = "".join(answer)
                            if first_text and so_far and not so_far[-1].isspace():
                                # Text written before and after a tool call: keep them apart
                                answer.append("\n\n")
                                yield _sse({"type": "text", "text": "\n\n"})
                            first_text = False
                            answer.append(event.text)
                            yield _sse({"type": "text", "text": event.text})
                    response = stream.get_final_message()

                messages.append({"role": "assistant", "content": response.content})

                if response.stop_reason == "refusal":
                    yield _sse({"type": "text", "text": "Sorry, I can't help with that one."})
                    break
                if response.stop_reason == "pause_turn":
                    continue
                tool_uses = [b for b in response.content if b.type == "tool_use"]
                if not tool_uses:
                    break
                if response.stop_reason == "max_tokens":
                    raise RuntimeError("response cut off at max_tokens during a tool call")

                results = []
                for block in tool_uses:
                    if block.name == "suggest_next":
                        # Only suggestions the guardrails accept reach the app, as buttons
                        kept, dropped = suggest.validate(block.input, plan_state.load())
                        questions = suggest.follow_ups(block.input)
                        if kept or questions:
                            yield _sse({"type": "suggestions", "actions": kept, "questions": questions})
                        result_for_windy = {"shown_as_buttons": kept, "dropped": dropped, "quick_replies": questions}
                        if not "".join(answer).strip():
                            # Buttons never replace an answer
                            result_for_windy["next"] = ("The buttons are ready and appear under your reply, but your "
                                                        "reply to Mia is still empty. Write it now: answer her question "
                                                        "in 2 to 5 sentences, then mention she can review the change "
                                                        "with the button below if there is one. Don't call suggest_next again.")
                        output, is_error = json.dumps(result_for_windy), False
                    else:
                        yield _sse({"type": "tool", "name": block.name, "input": block.input})
                        output, is_error = _run_tool_on_live_plan(block.name, block.input)
                    usage_log.append({"time": datetime.now().isoformat(timespec="seconds"),
                                      "tool": block.name, "input": block.input, "error": is_error})
                    tool_outputs.append(output)
                    result = {"type": "tool_result", "tool_use_id": block.id, "content": output}
                    if is_error:
                        result["is_error"] = True
                    results.append(result)
                # all results for one assistant turn go back in a single user message
                messages.append({"role": "user", "content": results})
            else:
                yield _sse({"type": "text", "text": "\n\n(Stopped after too many steps.)"})
            # Output guardrail: every figure in the answer should come from the tools (or from Mia / Windy's notes)
            known_context = message + " " + " ".join(b["text"] for b in system[1:])
            yield _sse({"type": "checks", "checks": [G.check_chat_numbers("".join(answer), tool_outputs, known_context)]})
            memory.log_exchange(cid, message, "".join(answer))  # so the next chat knows what was asked
            chats.save(cid, messages)  # so Mia can reopen this chat and carry on
            yield _sse({"type": "done"})
        except ValueError:
            # Tool input JSON the SDK couldn't parse at all (eager input streaming)
            del messages[turn_start:]
            yield _sse({"type": "error", "message": "Windy got muddled. Please ask again."})
        except anthropic.AuthenticationError:
            del messages[turn_start:]
            yield _sse({"type": "error", "message": "No valid API key on the server (set ANTHROPIC_API_KEY)."})
        except anthropic.RateLimitError:
            del messages[turn_start:]
            yield _sse({"type": "error", "message": "Rate limited. Wait a moment and try again."})
        except anthropic.APIStatusError as e:
            del messages[turn_start:]
            yield _sse({"type": "error", "message": f"API error {e.status_code}: {e.message}"})
        except anthropic.APIConnectionError:
            del messages[turn_start:]
            yield _sse({"type": "error", "message": "Can't reach the Claude API. Check the network."})
        except RuntimeError as e:
            del messages[turn_start:]
            yield _sse({"type": "error", "message": str(e)})

    return StreamingResponse(events(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


# ------------------------------------------------------------------ serve the built web app (npm run build)
# One process, one URL: handy for hosting and for the awards-day demo.
DIST = Path(__file__).resolve().parent.parent / "app" / "dist"


@app.get("/{path:path}", include_in_schema=False)
def web_app(path: str):
    if path.startswith("api/"):
        raise HTTPException(404)
    target = DIST / path
    if path and target.is_file():
        return FileResponse(target)
    if (DIST / "index.html").exists():
        return FileResponse(DIST / "index.html")
    return JSONResponse({"message": "Backend is running. Build the app (cd app && npm run build) or use npm run dev."})
