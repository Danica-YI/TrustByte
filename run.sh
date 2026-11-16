#!/usr/bin/env bash
# One command to run the whole demo on one URL: ./run.sh  then open http://localhost:8787
# (For live-editing the frontend, use two terminals instead: see README "Develop".)
set -e
cd "$(dirname "$0")"
if [ ! -d server/.venv ]; then
  echo "Setting up Python backend (first run only)…"
  python3 -m venv server/.venv
  server/.venv/bin/pip install -q -r server/requirements.txt
fi
[ -f server/.env ] || cp server/.env.example server/.env
if [ ! -d app/node_modules ]; then (cd app && npm install); fi
(cd app && npm run build)
echo ""
echo "  harbour + Windy is running at  http://localhost:8787"
echo "  (Add ANTHROPIC_API_KEY to server/.env for live AI explanations and chat.)"
echo ""
exec server/.venv/bin/uvicorn main:app --app-dir server --port 8787
