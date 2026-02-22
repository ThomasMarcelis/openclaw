#!/usr/bin/env bash
# update-fork.sh — one-command updater for the ThomasMarcelis/openclaw fork.
#
# This script is intentionally boring:
# - points OPENCLAW_FORK_* env vars at this checkout
# - delegates to `openclaw update`, which (in our fork build) runs the fork update flow
#
# Usage:
#   ./scripts/update-fork.sh
#   ./scripts/update-fork.sh --no-restart
#   OPENCLAW_FORK_UPSTREAM_REF=upstream/v2026.2.21 ./scripts/update-fork.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

export OPENCLAW_FORK_ROOT="${OPENCLAW_FORK_ROOT:-$ROOT}"
export OPENCLAW_FORK_REPO="${OPENCLAW_FORK_REPO:-ThomasMarcelis/openclaw}"
export OPENCLAW_FORK_BRANCH="${OPENCLAW_FORK_BRANCH:-jd-bot-effectiveness-fixes}"
export OPENCLAW_FORK_UPSTREAM_REMOTE="${OPENCLAW_FORK_UPSTREAM_REMOTE:-upstream}"
export OPENCLAW_FORK_UPSTREAM_REF="${OPENCLAW_FORK_UPSTREAM_REF:-${OPENCLAW_FORK_UPSTREAM_REMOTE}/main}"
export OPENCLAW_FORK_PUSH="${OPENCLAW_FORK_PUSH:-1}"

openclaw update "$@"
