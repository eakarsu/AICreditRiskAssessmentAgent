#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$root"
[[ -f .env ]] || { echo "Missing .env; copy .env.example." >&2; exit 1; }
[[ -d backend/node_modules && -d frontend/node_modules ]] || { echo "Run ./scripts/bootstrap.sh first." >&2; exit 1; }
set -a; source .env; set +a
if [[ "${MIGRATE_ON_START:-false}" == true ]]; then node backend/src/scripts/prepare-runtime.js; fi
(cd backend && npm start) & backend_pid=$!
(cd frontend && npm run dev -- --host "${FRONTEND_HOST:-127.0.0.1}" --port "${FRONTEND_PORT:-5173}") & frontend_pid=$!
cleanup() { kill "$backend_pid" "$frontend_pid" 2>/dev/null || true; }
trap cleanup EXIT INT TERM
wait "$backend_pid" "$frontend_pid"
