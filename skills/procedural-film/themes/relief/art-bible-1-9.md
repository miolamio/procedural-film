<!-- Theme: relief (a heat map of a surface: a false-colour mesh on black in wire of one width, one amber isoline, pixel labels, ruler brackets; plate B the same surface as an isoline map). Sections 1–9 of docs/art-bible.md; step 3 of SKILL.md copies them in verbatim. -->

## 1. Frame

The canvas is 1080 px wide and 1920 px tall at 24 fps: set `width: 1080, height: 1920` in the timeline. The surface is a square map with a title block above it and a legend under it, so the tall frame is a map sheet. A film may pick 1920×1080 instead; then the map box is 860 px square at (530, 110), the title block and the readout move to a column at x 1440 to 1830, the legend runs down that column, and line widths and font cells stay as below.
Every pixel value in this file assumes 1080×1920. The origin is the top-left corner and y grows downward.

- Must-read content (the title, the callouts, the legend's heights) sits inside x 60–950, y 180–1540: Shorts covers the top 180 px, the bottom 380 px and a button column on the right from y 1000 down.
- The map box, the footprint the surface stands on, is 900 px square at (90, 520): x 90–990, y 520–1420. It is the same box on both plates, and on every shot of the film.
- The title block: the word in `pixelText` cell 7 at (90, 214), the sheet line (`SHEET 01  PERSPECTIVE`) in cell 3 at y 290, coordinates right-aligned at x 990 in cell 3, a ruler under it all at y 340 from x 90 to 990, and one readout line in cell 2 at y 384 (pitch and yaw on plate A, the contour interval on plate B).
- The legend: the ramp in 18 steps from 0.25 to 1 of the range, a bar 16 px tall at y 1448, heights in metres under it in cell 2 every third step.
- The surface fills 55 to 70 percent of the box's width, centred; the sea round it is left black (`cut`), so the land is an island on the void.

## 2. Palettes

Names below are the keys of `FILM.lib.pal`. The theme's colours (2.1) and the film's subject colours (2.2) both go into the marked 2.2 block of `src/lib.js`: paste `themes/relief/palette.js` first, then the subject rows. The house palettes stay in `lib.pal` for the engine and are not used by scenes.

Black, a four-colour height ramp, one pale wire, one amber thread.

### 2.1 The void, the ramp, the wire, the thread

| Name | Hex | Use |
|---|---|---|
| reliefVoid | #000000 | Plate A and plate B base, and every knock-out behind a label |
| reliefBlue | #1E3F9A | The ramp's foot: the shallows round the island; plate B's coast line |
| reliefSand | #D8C48A | The coast, a hard step up from the blue |
| reliefRed | #901B20 | The slopes |
| reliefSun | #DFC505 | The summit, the top of the ramp |
| reliefWire | #E6E1D3 | The mesh wire, the brackets, the title, callouts and leaders |
| reliefDim | #6E7280 | Secondary text, the rulers' ticks, the graticule and the readout |
| amber | #FF9F1C | The accent: the thread |
| amberHot | #FFE2A8 | The thread's head while it draws on |

The ramp is blue to a hard sand coast at 0.3, then sand to red at 0.7, then red to yellow at the top. Add it as a row of the ramps table in `src/lib.js` (beside `heat` and `terrain`):

```js
    relief: [[0, 'reliefBlue'], [0.3, 'reliefBlue'], [0.3, 'reliefSand'], [0.7, 'reliefRed'], [1, 'reliefSun']],
```

and pass `ramp: 'relief'` to `lib.heightfield`, `lib.ramp('relief', v)` for a level's colour.

### 2.2 Subject palette

REWRITE PER FILM. None by default: a subject is a surface, and its colours are its heights. A film that maps something other than ground (a temperature, a population, a sound level) keeps the ramp and changes the labels. Add at most one name, for a marker the story needs (a camp, a station); it is small, square, and never amber. Enter it into the marked block in `src/lib.js` after the theme rows.

| Name | Hex | Use |
|---|---|---|
| … | #… | … |

### 2.3 The accent

Amber is the thread: one isoline of the surface, the height the story is about (a snow line, a flood level, a threshold), 4 px wide on both plates, with an `amberHot` head while it draws on. Nothing else is amber: not a label, not a marker, not the summit. It covers at most 1 percent of the frame (`accent.budget.area` 0.01). A film that recolours it with `--accent` keeps it one line.

## 3. Line

Wire of one width, near and far alike: the mesh does not thin with depth, so the far slopes pack into a dense weave and the near ones open up, as a vector landscape does.

| Element | Width | Colour |
|---|---|---|
| Mesh wire, every edge of every quad | 1.4 px, alpha 1 | reliefWire |
| Isolines (plate B) | 2 px | the ramp at the level's height (`lib.ramp('relief', h)`) |
| The thread, both plates | 4 px, round caps | amber |
| Brackets, rulers, leaders, the north arrow | 2 px (ticks 1.5 px) | reliefWire (ticks reliefDim) |
| Graticule (plate B) | 1 px, alpha 0.35 | reliefDim |
| Section line (plate B) | 2 px, dashed 10 / 8 | reliefWire |

No stroke is ever wobbled, tapered or boiled: `inkPath`, `glow` and `shadowBlur` do not belong here. The mesh is 48 quads across the box.

## 4. Tone

- The surface is the ramp, one flat colour per quad from its mean height, times a lambert shade from a light up and to the left behind the massif (`[-0.45, 0.8, -0.4]` in mesh space): `0.74 + 0.36 · max(0, n · l)`, capped at 1.06. The shade is soft; the colour says the height, the shade only says the slope.
- Below `cut` 0.2 nothing is drawn: the sea is the void. Between 0.2 and 0.3 the blue shallows ring the island.
- No gradients anywhere else, no glow, no grain: `post: 0` on both plates.
- Plate B has no fill at all: black, the lines and a faint graticule. A film that needs the colour on plate B draws `lib.heightfield` `fill` with `steps: 18` at 25 percent under the lines, once, and says so in the storyboard.

## 5. Plate language

- **The relief** (recipe 51): the surface as a perspective mesh, pitched 0.9 rad (about 52°) and yawing a few degrees, `persp` 2.4 × the box width, the view centred on the box, 50 px low and 12 percent large while it stands in perspective. `lift` 340 px for the whole range. The field is a massif, not a dome: a warped mass, a main summit and two lower tops, ridged crests (`1 − |fbm2|` cubed), a little roughness; built once into a grid (`{ w, h, data }`) that every picture reads.
- **The thread**: the isoline at the story's height, the longest loop of `lib.isolines` over the grid, drawn on over 60 percent of the first shot it appears in, from the loop's nearest point round the mountain. On the mesh it rides in the quads it crosses (each segment drawn right after its quad's fill), so the near ridges hide the far side of the loop.
- **Pins**: the summit gets a 10 px `reliefWire` square and a callout (`SUMMIT 2450 M`), the thread a callout from its west side (`ISO 1610 M`) once it has closed. Callouts are `pixelText` cell 3 on a `reliefVoid` knock-out, on a 2 px leader with a 24 px foot. A pin is placed with `lib.heightPoint` (or the same projection) so it sits on the surface in every view.
- **Plate B** is the same surface from above: the levels from 0.3 to 0.94 every 0.04 in one `lib.heightfield` call (`mode: 'contour'`, `ramp: 'relief'`, `width: 2`, the thread's level left out), then the thread's level alone with `color: pal.amber, width: 4`, heights on every third level in cell 2 in the level's colour on a black knock-out, in a column down one slope; the graticule every 1/12 of the box; the north arrow in the box's top right corner; the section A–A′, a dashed line across the map that drifts down, and its profile, a 2 px line 620 px wide and 64 px tall above the map (y 452–516).
- The surface is our own: a field of noise and bumps, never a traced map of a real place or a copied landscape. Coordinates and scales on the title block are set dressing.

## 6. Overlays

- **Ruler brackets**: four L-shaped corners round the box, 20 px outside it and 80 px above, their arms 130 px long with a tick every 10 px (every fifth one 14 px, the rest 7), and a 24 px tick at the middle of each side. Both plates, every shot, the same pixels.
- **The ruler** under the title block: `lib.ticks` linear, 90 ticks over 900 px, a major every 10.
- **Callouts** as in section 5, at most three on a plate.
- **The legend** (section 1) on both plates.
- Nothing else: no vignette, no scanlines, no frame.

## 7. Motion

### 7.1 Weightless, on ones

Everything moves on 24 fps: the camera's yaw drifts about 8 degrees a second, the thread draws on with `inOutSine`, the camera descends, the section slides. Nothing steps on twos, nothing boils, nothing shakes. The readout's numbers change with the camera, frame by frame.

### 7.2 Timing

A perspective hold drifts for at least a bar. The descent to plate B takes the last half of the shot before the cut: the pitch eases (smoothstep) from 0.9 to π/2, the yaw to 0, `1 / persp` to 0 and the scale and the offset to 1 and 0, all on one ease, landing on the shot's last frame; the cut to plate B lands on a beat. The section crosses 40 percent of the map in a second.

### 7.3 Determinism

The view is a closed form of the shot's `t`; the section's place a closed form of global `T`. The field, the mesh and the isolines are built once from constants and seeds and cached by level; nothing is kept from the last frame.

## 8. Match cuts and continuity

The cut holds on the isoline. On the last frame of plate A the camera looks straight down (`rot [π/2, 0, 0]`, `persp` 0, scale 1, centred on the box), where every point of the mesh lands on the map (`lib.heightfield` puts it there); plate B draws the same field in the same box, so the amber thread keeps every pixel, the summit pin and both callouts keep their places, the title block, the brackets and the legend do not change, and only the colour drops out of the surface. List the thread's loop at the cut frame in the storyboard's Shared geometry. A cut between two plate A shots holds on the box instead: the same footprint, a new view.

## 9. Wordmark

The film's title in `lib.pixelText`, cell 7, upper case, in `reliefWire`, at the title block's place (90, 214), on both plates, holding still. It never types on, never takes the accent and never sits on the surface. Never `lib.text`, never `strokeText`.
