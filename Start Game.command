#!/bin/bash
# Double-click to run the tech demo locally. Close this window to stop it.
cd "$(dirname "$0")"

if ! command -v npm >/dev/null 2>&1; then
  echo "Node.js is not installed. Download the LTS version from https://nodejs.org"
  read -r -p "Press Enter to close..."
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "First run: installing dependencies (takes a minute)..."
  npm install || { read -r -p "Install failed. Press Enter to close..."; exit 1; }
fi

echo "Starting the game. Your browser will open automatically."
echo "Leave this window open while playing; close it to stop the game."
npm run dev
