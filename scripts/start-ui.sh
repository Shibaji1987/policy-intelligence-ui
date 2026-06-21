#!/usr/bin/env sh
set -eu

PORT="${PORT:-4200}"

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
cd "$PROJECT_ROOT"

WORKSPACE_ROOT=$(CDPATH= cd -- "$PROJECT_ROOT/.." && pwd)
BUNDLED_NODE="$WORKSPACE_ROOT/work/node-v22.22.3-win-x64"
if [ -x "$BUNDLED_NODE/node.exe" ]; then
  echo "Using bundled Node.js from $BUNDLED_NODE"
  PATH="$BUNDLED_NODE:$BUNDLED_NODE/node_modules/npm/bin:$PATH"
  export PATH
fi

"$SCRIPT_DIR/free-ui-port.sh" "$PORT"

if [ ! -d node_modules ]; then
  npm ci
fi

echo "Starting Policy Intelligence UI on http://127.0.0.1:$PORT"
npm start -- --port "$PORT"
