#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")"

if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm is required. Install Node.js 22.12+ and run: corepack enable" >&2
  exit 1
fi

if [ ! -d node_modules ]; then
  pnpm install --frozen-lockfile
fi

if [ ! -f .env.local ]; then
  cp .env.example .env.local
  echo "Created .env.local. Configure it before using generation services."
fi

exec pnpm dev
