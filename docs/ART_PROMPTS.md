# Art prompts (ChatGPT image generation)

These prompts produce the art for the tech demo. The game already runs with placeholder
art that uses **exactly the same sheet layout**, so each finished PNG can be dropped in
without any code change.

## How it works (read this first)

ChatGPT can't output a true pixel-exact sprite sheet. It paints a large image (1024×1024,
1536×1024 or 1024×1536) made of *fake* pixels, which are uneven, slightly blurry and noisy.
So the workflow is:

1. **Generate** with the prompts below. Each prompt is sized so that the image divides
   evenly into the real pixel grid.
2. **Save** the raw image to `art-source/` (e.g. `art-source/player_raw.png`).
3. **Build** with `python3 scripts/build_assets.py` (needs `pip3 install pillow numpy`).
   It turns the four raw images into `tileset.png` + `player.png`: majority-vote
   resampling onto the exact pixel grid, magenta → transparent, purple shadows → soft
   shadows, and every sprite trimmed and fitted into its cell.
4. **Clean up** by hand in a pixel editor ([Aseprite](https://www.aseprite.org/),
   [LibreSprite](https://libresprite.github.io/) or [Piskel](https://www.piskelapp.com/), which is free and browser-based).
   Expect to fix stray pixels, tile seams and walk-cycle consistency. Budget 15–45 minutes per sheet.
5. **Enable** the asset in `src/config.js` (`enabled: true`) and reload.

Tips:
- Do everything in **one ChatGPT conversation** and start with Prompt 0 (style guide),
  so the style stays consistent between sheets.
- If an image comes back wrong (wrong grid, smooth gradients, perspective drift), don't
  argue with it. Regenerate, or reply with one short correction such as *"same image, but
  strictly 4 columns × 4 rows, flat magenta background, no gradients"*.
- AI models rarely make tiles that repeat seamlessly. Check them in-game (tiles repeat
  across the whole map) and fix the edges in the pixel editor.

---

## Technical spec (what the game expects)

| File | Size | Grid | Notes |
|---|---|---|---|
| `public/assets/sprites/player.png` | 128×192 px | 4 cols × 4 rows, each frame **32×48** | Transparent background |
| `public/assets/sprites/tileset.png` | 256×256 px | 8 × 8 tiles of **32×32** | Built from 3 quadrant images |

> The game uses **32 px tiles**: ChatGPT's images carry about 32 art pixels per tile, so
> going down to 16 px threw away half the detail. The prompts below still say "16x16 at 16x
> scale"; leave them as they are, because they produce exactly the grid the build script expects.

**Player sheet rows:** 1 = walking down (towards camera), 2 = walking left, 3 = walking right,
4 = walking up (back view). **Columns:** frame 1 = standing/idle, 2 = left foot forward,
3 = passing/neutral, 4 = right foot forward. Feet touch the bottom of each 16×24 cell.

**Tileset quadrants** (each one is a 4×4 grid of tiles):

```
            cols 0-3                    cols 4-7
rows 0-3  [ A: TERRAIN      ]        [ B: NATURE         ]
rows 4-7  [ C: VILLAGE      ]        [ D: reserved/empty ]
```

**A: Terrain** (row by row, left → right)
1. grass · grass variant · grass with small flowers · tall grass *(transparent top half)*
2. dirt path · dirt path with pebbles · beach sand · wooden bridge planks (planks run left-right)
3. deep water · deep water variant · shallow water · cobblestone
4. dark grass · mud · gravel · ploughed dirt

**B: Nature**
1–2. a round leafy tree **filling a 2×2 block** (cols 1-2) · a pine tree **filling a 2×2 block** (cols 3-4)
3. bush · boulder · tree stump · a few tiny pebbles *(transparent background)*
4. wooden fence segment · wooden signpost · fallen log · small red mushrooms *(transparent)*

**C: Village** (a house is built 5 tiles wide: ridge row, roof row, wall row, door row)
1. roof ridge (top edge, upper part transparent) · roof ridge with chimney · roof ridge left end · roof ridge right end
2. roof shingles · roof with small dormer window · roof left edge · roof right edge
3. timber-framed wall · wall with window · wooden door · wall with diagonal beam
4. wooden crate · barrel · stone well (seen from above) · hay bale

---

## Prompt 0: style guide (send first, once per conversation)

```text
We are making art for a top-down 2D action-adventure game tech demo. Please follow this
style guide for every image I ask for in this conversation:

- 16-bit console era pixel art (early 1990s action RPG look), crisp and readable.
- Camera: top-down "three-quarter" view. The ground is seen from above, while trees,
  characters, walls and objects show their front face slightly, so you see both the
  top and the front. No isometric angle, no true perspective, no vanishing points.
- Base unit: 16x16 pixel tiles. Characters are 16 pixels wide and 24 pixels tall.
- Hard pixel edges only: no anti-aliasing, no blur, no gradients, no soft shading,
  no dithering noise, no painterly texture. Flat colour clusters with 2-3 shading steps.
- Light comes from the top-left. Shadows fall to the bottom-right as small, flat,
  dark ovals under objects.
- 1 pixel dark outline (#1a1c2c) on characters and objects, not on ground tiles.
- Use only this palette:
  outline #1a1c2c | greens #1f4e2c #2e6b2a #3f8a34 #5aab3e #8ccf5a |
  browns #4a2a14 #6b4422 #8c5a2e #b07a42 #d4a464 | sand/skin #e8d498 #f0c090 #f8e0b8 |
  water #1e3a78 #2e5aa8 #3a78c8 #6aa0e8 #b4dcf8 |
  greys #3c3c4a #5a5a66 #8a8a96 #b4b4c0 #e0e0e8 | reds #8c2c1c #b8402c #e06040 |
  yellow #f8d848 | white #ffffff
- Mood: cheerful, bright fantasy countryside, a small village by a forest and a lake.
- Whenever I ask for a sprite sheet or tiles: flat solid magenta (#FF00FF) background,
  no text, no labels, no grid lines, no frame or border around the image, and every item
  kept strictly inside its own grid cell.

Reply only with "OK" for now, I will send the image requests next.
```

---

## Prompt 1: mood / concept shot (optional, for direction)

Generate this first to agree on the look. It is **not** used in the game.

```text
Create a 16:9 concept screenshot of the game (1536x1024). Top-down three-quarter view,
16-bit pixel art following the style guide. Scene: a small fantasy village of three
timber-framed houses with red tiled roofs around a cobblestone square with a stone well,
a dirt road crossing the image, a fenced farm field with hay bales, a forest of round
leafy trees and pines, and the edge of a blue lake with a wooden bridge. A small hero in
a green tunic with brown hair stands on the road. No UI, no text. The whole image should
look like it is built from a 16x16 tile grid, like a real game screen.
```

---

## Prompt 2: hero character concept (optional)

```text
Create a character reference sheet for the hero (1536x1024), 16-bit pixel art per the
style guide, on a flat magenta (#FF00FF) background. A young adventurer: brown messy hair,
green tunic with a brown belt and gold buckle, brown boots, skin tone #f0c090, friendly
face with simple dot eyes. Show the same character standing in 4 directions side by side:
facing down (towards camera), facing left, facing right, facing up (back view). Large and
clear, each pose identical in proportions. No text.
```

---

## Prompt 3: player sprite sheet → `player.png`

```text
Create a pixel art walk-cycle sprite sheet of the hero (same character as before:
brown hair, green tunic, brown belt with gold buckle, brown boots).

Image size: 1024x1536 (portrait). Layout: an exact grid of 4 columns x 4 rows of equal
cells (each cell 256x384, which represents a 16x24 pixel sprite scaled up 16 times, so
every art pixel must be a crisp 16x16 block of solid colour).

Rows (top to bottom):
1. walking DOWN (facing the camera)
2. walking LEFT (side view)
3. walking RIGHT (side view)
4. walking UP (back view, no face visible)

Columns (left to right) = a 4-frame walk cycle:
1. standing still, feet together
2. left foot forward, right arm forward
3. passing pose, feet together (like frame 1 but slightly bobbing)
4. right foot forward, left arm forward

Rules: the character is centred horizontally in each cell with feet touching the bottom
of the cell, identical size and proportions in every frame, small flat dark oval shadow
under the feet, 1px dark outline, flat magenta (#FF00FF) background everywhere else,
no text, no grid lines, no borders. Top-down three-quarter game view, 16-bit style.
```

Save as the file name in the table below, then run `python3 scripts/build_assets.py` once all are in place.

---

## Prompt 4: terrain tiles → quadrant A

```text
Create a pixel art tileset for the ground (1024x1024, square). Layout: an exact grid of
4 x 4 square cells, each 256x256, representing one 16x16 pixel tile scaled up 16 times
(each art pixel is a crisp 16x16 block). Every tile fills its whole cell edge to edge and
must tile seamlessly with copies of itself. Seen from directly above, no outlines on
ground tiles.

Row 1: lush grass | grass variant with slightly different blade pattern | grass with a
few tiny white, red and blue flowers | tall grass blades (only the bottom 60% of the cell
has blades, the top is magenta #FF00FF background)
Row 2: light brown dirt path | dirt path with small grey pebbles | pale beach sand |
wooden bridge of horizontal planks with darker side rails on the left and right
Row 3: deep blue water with small light wave marks | deep water variant | light shallow
water with a hint of sand | grey cobblestone pavement
Row 4: dark shaded grass | wet brown mud | grey gravel | ploughed dark brown soil with
horizontal furrows

No text, no labels, no grid lines between the cells.
```

Save as the file name in the table below, then run `python3 scripts/build_assets.py` once all are in place.

---

## Prompt 5: nature tiles → quadrant B

```text
Create a pixel art sheet of nature objects (1024x1024, square), top-down three-quarter
view, 16-bit style per the style guide. Layout: an exact 4 x 4 grid of square cells
(each 256x256 = one 16x16 pixel tile at 16x scale). Flat magenta (#FF00FF) background
behind every object.

The top half of the image (rows 1-2) contains two BIG trees, each filling a 2x2 block of
cells (512x512):
- left 2x2 block (columns 1-2): a round, leafy deciduous tree with a full green crown in
  the upper part and a short brown trunk at the bottom centre, flat dark oval shadow at
  the base
- right 2x2 block (columns 3-4): a tall pine tree made of stacked dark green triangular
  tiers, short trunk at the bottom centre, shadow at the base
Both trunks must touch the bottom edge of their 2x2 block.

Row 3, one object per cell: a round green bush with a few red berries | a grey boulder |
a cut tree stump showing rings on top | a few tiny scattered pebbles
Row 4, one object per cell: a horizontal wooden fence segment with two posts and two
rails, spanning the full width of the cell | a small wooden signpost | a fallen log lying
horizontally | two small red mushrooms with white spots

Each object sits near the bottom of its cell with a small flat shadow, 1px dark outline.
No text, no labels, no grid lines.
```

Save as the file name in the table below, then run `python3 scripts/build_assets.py` once all are in place.

---

## Prompt 6: village tiles → quadrant C

```text
Create a pixel art tileset for building a small timber-framed village house (1024x1024,
square), top-down three-quarter view, 16-bit style per the style guide. Layout: an exact
4 x 4 grid of square cells (each 256x256 = one 16x16 pixel tile at 16x scale). These are
modular pieces: a house is assembled as 5 tiles wide, from top to bottom: ridge row,
roof row, wall row, door row. Roof and wall tiles must fill their cells edge to edge and
connect seamlessly with each other horizontally.

Row 1 (roof ridge, the top edge of a red tiled roof; the upper third of each cell is
magenta #FF00FF background): ridge middle piece | ridge middle piece with a small grey
stone chimney | ridge left end | ridge right end
Row 2 (red clay roof shingles in horizontal rows): roof middle | roof middle with a small
dormer window | roof left edge | roof right edge
Row 3 (cream plaster wall with dark brown timber beams): plain wall | wall with a small
blue glass window with a cross frame | wooden plank door with a gold knob | wall with a
diagonal timber beam
Row 4 (props, each on magenta background with a small flat shadow): wooden crate | wooden
barrel with dark metal bands | round stone well seen from above with dark water inside |
round golden hay bale

No text, no labels, no grid lines.
```

Save as the file name in the table below, then run `python3 scripts/build_assets.py` once all are in place.

---

## After generating

Save the raw images as `art-source/player_raw.png`, `terrain_raw.png`, `nature_raw.png`,
`village_raw.png`, then run:

```bash
python3 scripts/build_assets.py
```

1. Open `public/assets/sprites/tileset.png` and `player.png` in the pixel editor and clean up.
2. Make sure `ASSETS.tileset.enabled` and `ASSETS.player.enabled` are `true` in `src/config.js` (already on).
3. `npm run dev`, then walk around. Press **G** to see collision boxes and **H** to hide the
   overlay layer, which shows whether tree crowns and roofs are cut correctly.

## Later (not needed for this demo)

- **Quadrant D (cols 4-7, rows 4-7)** is free: water edge/shore transitions (autotiles),
  more props, or animated water frames.
- NPC sprite sheets: reuse Prompt 3 with a different character description.
