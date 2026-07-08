# Dockerized Ralph loop for VIVED projects.
# node:22 matches the standard VIVED toolchain (vite / vitest / typescript).
FROM node:22-bookworm-slim

# git is needed because the loop commits each green slice.
# ca-certificates keeps the Anthropic API TLS handshake happy.
# gosu lets the entrypoint drop from root to the `node` user after fixing
# volume ownership (see entrypoint.sh).
RUN apt-get update \
    && apt-get install -y --no-install-recommends git ca-certificates gosu \
    && rm -rf /var/lib/apt/lists/*

# Claude Code CLI — the agent that runs each iteration.
RUN npm install -g @anthropic-ai/claude-code

# Put ALL Claude config (OAuth credentials + onboarding state) in one dir so a
# single named-volume mount persists your Team-account login across runs.
ENV CLAUDE_CONFIG_DIR=/home/node/.claude

# Pre-create the config dir owned by `node`. When the named volume is first
# mounted here, Docker initializes it from this path AND inherits its ownership,
# so the non-root `node` user can write credentials into the volume.
RUN mkdir -p /home/node/.claude && chown -R node:node /home/node/.claude

COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# NOTE: we do NOT `USER node` here. The container starts as root so the
# entrypoint can chown the (root-owned) node_modules volume, then drops to the
# non-root `node` user via gosu before running anything — Claude Code refuses
# --dangerously-skip-permissions as root, so the actual work runs as `node`.
WORKDIR /workspace

ENTRYPOINT ["entrypoint.sh"]
CMD ["bash"]
