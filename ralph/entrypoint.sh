#!/usr/bin/env bash
# Runs as ROOT, fixes volume ownership, then drops to the `node` user.
set -e

# A fresh Docker named volume mounted at /workspace/node_modules is created
# owned by root:root (the path isn't in the image, so it can't inherit `node`
# ownership). The container otherwise runs as non-root `node`, so without this
# `npm ci` into the volume fails with EACCES. Only chown while deps are absent
# — once vitest is present the volume is already node-owned, so skip the costly
# recursive chown on every start.
if [ -d /workspace/node_modules ] && [ ! -d /workspace/node_modules/vitest ]; then
  chown -R node:node /workspace/node_modules || true
fi

# Drop to `node` for the real work (Claude Code refuses
# --dangerously-skip-permissions as root). Mark the bind-mounted repo git-safe
# as `node`, then exec the passed command.
exec gosu node bash -c \
  'git config --global --add safe.directory /workspace 2>/dev/null || true; exec "$@"' \
  bash "$@"
