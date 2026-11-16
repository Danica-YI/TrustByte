"""Windy chat backend: FastAPI + Claude tool use over Mia's fake bank data.

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
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

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
You are talking with the customer, Mia. Today is {TODAY.strftime('%A %-d %B %Y')}. All data is synthetic.

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
- Signals like a new rent payee only suggest a life change; ask Mia rather than assume."""

client = anthropic.Anthropic()
app = FastAPI(title="Windy chat backend")

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
    cid = body.conversation_id or uuid.uuid4().hex
    if body.conversation_id and body.conversation_id not in conversations:
        raise HTTPException(404, "unknown conversation_id (the server may have restarted); start a new chat")
    messages = conversations.setdefault(cid, [])
    turn_start = len(messages)
    messages.append({"role": "user", "content": body.message})

    def events():
        yield _sse({"type": "start", "conversation_id": cid})
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
                    output, is_error = run_tool(block.name, block.input)
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
