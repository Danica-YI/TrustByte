"""harbour + Windy backend (FastAPI): coordinates the services in the architecture.

  Harbour web app -> input guardrails -> FastAPI -> AI model + Python engine -> output guardrails
  -> customer reviews and approves -> only the simulated financial plan is updated

  GET  /api/snapshot        everything the app shows, worked out by the engine from base data + plan state
  POST /api/propose         a plan change: guardrails, engine, AI explanation, held for approval
  POST /api/approve/{id}    Mia approves: the plan state is updated
  POST /api/action          small confirmations (consent, "yes that's a bill", receipt saved...)
  POST /api/undo/{id}       roll a change back
  POST /api/reset           start the demo story again
  POST /api/chat            Ask Windy: Claude with tools over the same live plan

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

import engine
import guardrails as G
import planner
import state as plan_state
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
SYSTEM = f"""You are Windy, the AI assistant inside harbour, a demo banking app built for a hackathon.
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
  To change her plan, point her to the screen: Windy proposes, Mia approves there."""

client = anthropic.Anthropic()
app = FastAPI(title="harbour + Windy backend")


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


@app.post("/api/chat")
def chat(body: ChatIn) -> StreamingResponse:
    message, _checks = G.clean_chat_input(body.message, plan_state.load())
    cid = body.conversation_id or uuid.uuid4().hex
    if body.conversation_id and body.conversation_id not in conversations:
        raise HTTPException(404, "unknown conversation_id (the server may have restarted); start a new chat")
    messages = conversations.setdefault(cid, [])
    turn_start = len(messages)
    messages.append({"role": "user", "content": message})

    def events():
        yield _sse({"type": "start", "conversation_id": cid, "checks": _checks})
        if not _has_credentials():
            del messages[turn_start:]
            yield _sse({"type": "error", "message": "No API key on the server. Put ANTHROPIC_API_KEY in server/.env and restart it."})
            return
        try:
            for _ in range(MAX_TOOL_ROUNDS):
                with client.beta.messages.stream(
                    model=MODEL,
                    max_tokens=16000,
                    system=SYSTEM,
                    tools=TOOLS,
                    messages=messages,
                    output_config={"effort": EFFORT},
                    cache_control={"type": "ephemeral"},
                    # If the model declines for policy reasons, the API retries on a fallback model.
                    betas=["server-side-fallback-2026-07-01"],
                    fallbacks="default",
                ) as stream:
                    for event in stream:
                        if event.type == "text":
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
                    yield _sse({"type": "tool", "name": block.name, "input": block.input})
                    output, is_error = _run_tool_on_live_plan(block.name, block.input)
                    usage_log.append({"time": datetime.now().isoformat(timespec="seconds"),
                                      "tool": block.name, "input": block.input, "error": is_error})
                    result = {"type": "tool_result", "tool_use_id": block.id, "content": output}
                    if is_error:
                        result["is_error"] = True
                    results.append(result)
                # all results for one assistant turn go back in a single user message
                messages.append({"role": "user", "content": results})
            else:
                yield _sse({"type": "text", "text": "\n\n(Stopped after too many steps.)"})
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
