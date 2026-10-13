# Techdemo 2: top-down 2D

A small tech demo for testing a **top-down (3/4 view) 2D game**: WASD movement, tile
collision, a large world with camera follow, and the layering trick that makes the player walk
*behind* trees and roofs. 16-bit pixel art style, built with **Phaser 3 + Vite**, deployed
as a static site on **Cloudflare**.

It runs straight away with procedurally drawn placeholder art. The real art (made with
ChatGPT, see [`docs/ART_PROMPTS.md`](docs/ART_PROMPTS.md)) uses the same sheet layout, so
it drops in without any code changes.

## Run without the Terminal (macOS)

- **`Start Game.command`**: double-click to run the game. It installs dependencies on the
  first run, then opens the browser. Close its window to stop the game.
- **`Build Art.command`**: double-click after putting new raw images in `art-source/`.
- **Deploy**: no local build needed. Push with GitHub Desktop and Cloudflare builds and
  publishes automatically.

The first time, macOS may block the file: right-click it → **Open** → **Open**.

## Run locally (Terminal)

Requires Node.js 20+ (22 recommended).

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build into dist/
npm run preview    # serve dist/ locally
```

## Controls

| Key | Action |
|---|---|
| W A S D / arrow keys | Move (8 directions, 4-direction sprite) |
| Shift | Run |
| Z | Cycle camera zoom 1× → 2× → 0.5× |
| G | Collision debug: red = solid tiles, boxes = physics bodies |
| H | Hide/show the overlay layer (tree crowns, roof ridges, tall grass) |
| R | New random map (`?seed=` in the URL makes a map reproducible) |

## What the demo tests

- **Feet-only hitbox.** The player's collision box is just 20×10 px at the feet, so the
  head can overlap the object above. This is what makes 3/4 view read correctly.
- **Three render layers.** `ground` → `obstacles` (collide, drawn under the player) →
  player → `above` (drawn over the player). Tree crowns, roof ridges and tall grass sit on
  `above`. Press **H** to see the difference.
- **Diagonal movement** normalised (no faster diagonals), with 4-direction facing that
  doesn't flicker on diagonals.
- **Camera.** Smooth follow (lerp), clamped to the map edges, zoom levels.
- **Pixel-perfect scaling.** 32 px tiles, 640×360 internal resolution (20×11 tiles) scaled
  up with nearest-neighbour (an exact 2× at 720p, 3× at 1080p and 4× at 1440p).
- **Seeded world generator.** A 100×75 tile world (≈ 5×7 screens): forest border,
  crossroads, a village, a fenced field, and a lake with a bridge.

Tuning values (speeds, hitbox, camera lerp, resolution, map size) live in
[`src/config.js`](src/config.js).

## Project structure

```
Techdemo_2/
├─ index.html               # page shell + HUD/help overlay
├─ package.json             # phaser + vite
├─ vite.config.js           # relative base, dist/ output
├─ .node-version            # Node version for the Cloudflare build
├─ public/
│  └─ assets/sprites/       # tileset.png, player.png go here (copied to dist as-is)
├─ src/
│  ├─ main.js               # Phaser game config
│  ├─ config.js             # ALL tuning knobs + asset switches
│  ├─ style.css
│  ├─ scenes/
│  │  ├─ BootScene.js       # loads real art or builds placeholders
│  │  └─ GameScene.js       # map, layers, collision, camera, debug toggles
│  ├─ entities/Player.js    # WASD movement, facing, animation
│  ├─ world/
│  │  ├─ tiles.js           # tile index map + which tiles collide
│  │  ├─ mapGenerator.js    # seeded world builder (3 layers)
│  │  └─ rng.js
│  ├─ gfx/
│  │  ├─ palette.js         # shared 30-colour palette
│  │  └─ placeholderArt.js  # pixel-drawn stand-in art (same layout as real art)
│  └─ ui/hud.js             # DOM debug HUD
├─ docs/
│  ├─ ART_PROMPTS.md        # ChatGPT prompts + asset spec + pipeline
│  └─ palette.hex
├─ scripts/
│  ├─ build_assets.py       # art-source/*_raw.png → tileset.png + player.png
│  └─ pixelate.py           # generic single-image version (any grid size)
└─ art-source/              # raw ChatGPT images (input to build_assets.py)
```

## Swapping in the real art

1. Generate the images with the prompts in [`docs/ART_PROMPTS.md`](docs/ART_PROMPTS.md) and save them to `art-source/`.
2. Run `python3 scripts/build_assets.py` (needs `pip3 install pillow numpy`). It writes `public/assets/sprites/tileset.png` and `player.png`.
3. The assets are switched on in `src/config.js` (`enabled: true`). Set them to `false` to go back to the placeholders.

## GitHub + Cloudflare deploy

```bash
git init
git add .
git commit -m "Top-down tech demo scaffold"
git branch -M main
git remote add origin git@github.com:<you>/<repo>.git
git push -u origin main
```

Then, in the Cloudflare dashboard, go to **Workers & Pages → Create → Pages → Connect to Git** and pick the repo:

| Setting | Value |
|---|---|
| Framework preset | `Vite` (or *None*) |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node version | picked up from `.node-version` (22) |

Every push to `main` deploys to production, and other branches get preview URLs.

## Possible next steps

- Real tile maps made in [Tiled](https://www.mapeditor.org/) (Phaser loads Tiled JSON directly).
- NPCs with simple interaction, enemies, or y-sorted props.
- Water/shore autotiles (quadrant D of the tileset is free for these).
- Touch controls (virtual joystick) for mobile.
