#!/bin/bash
# Double-click after saving new raw images into art-source/.
# Rebuilds public/assets/sprites/tileset.png and player.png.
cd "$(dirname "$0")"

if ! python3 -c "import PIL, numpy" >/dev/null 2>&1; then
  echo "Installing Pillow and NumPy (one time only)..."
  python3 -m pip install --user pillow numpy || { read -r -p "Install failed. Press Enter to close..."; exit 1; }
fi

python3 scripts/build_assets.py
echo
echo "Done. If the game is running, refresh the browser to see the new art."
read -r -p "Press Enter to close..."
