#!/bin/bash
# macOS launcher: start the smart-fridge H5 dev server on 127.0.0.1:5173.

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

if [ ! -d "node_modules" ]; then
  npm install
fi

osascript <<EOF
tell application "Terminal"
  activate
  do script "cd \"$PROJECT_DIR\"; npm run dev:client -- --host 127.0.0.1"
end tell
EOF
