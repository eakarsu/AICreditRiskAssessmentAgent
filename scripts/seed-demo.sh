#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
[[ "${CONFIRM_DEMO_SEED:-}" == "yes" ]] || { echo "Set CONFIRM_DEMO_SEED=yes to replace local data with demo fixtures." >&2; exit 1; }
[[ "${NODE_ENV:-development}" != "production" ]] || { echo "Demo seed is disabled in production." >&2; exit 1; }
set -a; source "$root/.env"; set +a
(cd "$root/backend" && node src/seeds/seed.js)
