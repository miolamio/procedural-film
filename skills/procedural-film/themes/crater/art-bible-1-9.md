<!-- Theme: crater (red paper: a glowing throat at the bottom of a well, a rim of hanging hair, scrawled figures falling in). Sections 1–9 of docs/art-bible.md; step 3 of SKILL.md copies them in verbatim. -->

## 1. Frame

The canvas is 1080 px wide and 1920 px tall at 24 fps: set `width: 1080, height: 1920` in the timeline. The fall is vertical, so the tall frame is the well. A film may pick 1920×1080 instead; then the throat sits at 0.85 of the height and the bowl is wider than deep: scale every position below by 1080/1920 on y and keep the ratios on x. Line widths (section 3) are set on the figure's height, not the frame.
Every pixel value in this file assumes 1080×1920. The origin is the top-left corner and y grows downward.

- Must-read content (the wordmark, a line of text) sits inside x 60–950, y 180–1540: Shorts covers the top 180 px, the bottom 380 px and a button column on the right from y 1000 down.
- The frame is one well seen from its mouth. Hair hangs from the top edge and down both walls, and its lower end draws a U: about y 360 in the middle, down to y 1500 at the edges. The throat glows at the bottom middle, centred near (540, 1640). A ragged lip closes the bowl near y 1850 and rises up the walls.
- The vanishing point is just above the throat, near (540, 1500). Every figure falls toward it.
- One figure carries the shot. It is 0.4 to 0.55 of the frame height, near the camera, overlapping the hair with its raised hands. Two to four more fall behind it, each smaller and nearer the vanishing point; the smallest are a few pixels tall.

## 2. Palettes

Names below are the keys of `FILM.lib.pal`. The theme's colours (2.1) and the film's subject colours (2.2) both go into the marked 2.2 block of `src/lib.js`: paste `themes/crater/palette.js` first, then the subject rows. The house palettes stay in `lib.pal` for the engine and are not used by scenes.

Red paper, one black line, and the heat of the throat. The only colour that moves is the heat.

### 2.1 Red paper and the throat

| Name | Hex | Use |
|---|---|---|
| craterDeep | #6B070C | The coldest step of the ramp: plate B's hair region, pits in the grain |
| crater | #B31214 | Plate A base: the red paper, and the rim of the glow |
| craterHot | #E2641A | The middle of the ramp: the throat's orange ring |
| yolk | #DFC505 | The accent: the throat's core |
| yolkHot | #F4EE8A | The hottest point, the centre of the core |
| scrawl | #170605 | Every line: hair, lip, figures, isotherms |
| scratch | #F2D2BA | The wordmark and any text, scratched through the red |

The crater ramp is `['craterDeep', 'crater', 'craterHot', 'yolk', 'yolkHot']` at stops `0, 0.3, 0.62, 0.84, 1`. Call it as an inline list, `lib.ramp(CRATER, v)` with `const CRATER = [[0, 'craterDeep'], [0.3, 'crater'], [0.62, 'craterHot'], [0.84, 'yolk'], [1, 'yolkHot']]`, or add it as a row of the `ramps` table in `lib.js` next to the 2.2 rows.

### 2.2 Subject palette

REWRITE PER FILM. None by default: a subject is drawn in scrawl on red. Add at most one name, and only for a prop the story cannot tell without (a hat, a ball); it is small and never yellow. Enter it into the marked block in `src/lib.js` after the theme rows.

| Name | Hex | Use |
|---|---|---|
| … | #… | … |

### 2.3 The accent

Yolk is the throat's core and nothing else: never a figure, never a prop, never text. It shows only in the lower 40 percent of the frame and covers 1 to 8 percent of it. A film that recolours it with `--accent` keeps it at the bottom of the well.

## 3. Line

One line, scrawl, thin and trembling, never clean. A figure is drawn in two or three passes a hair apart, so every limb is a bundle of near-parallel strokes. No fills on figures: a head is an outline over the red.

| Element | Width | Colour |
|---|---|---|
| Figure, first pass (`stickFigure`, `head: 'face'`, `joint: 0`) | height × 0.0075, at least 1.2 px | scrawl 100% |
| Figure, second and third passes (other seeds, more tremble, the same joints) | × 0.7 and × 0.5 | scrawl 100% |
| Torso scribble (`springLimb`, `zigzag`, hip to neck, `amp` height × 0.026, `step` × 0.011) | × 0.7 | scrawl 100% |
| Hair loops (plain `ctx` path) | 1.8 px | scrawl 78% (40% on plate B) |
| Lip saw, two passes | 1.8 px | scrawl 78% |
| Isotherms (plate B) | 2.5 px | scrawl 100% |
| Wordmark (`strokeText`, `style: 'hand'`, `ink: { double: true }`) | size × 0.075 | scratch 100% |

Tremble on a figure is height × 0.014 on the first pass, × 0.02 and × 0.024 on the others; the joint jitter stays under height × 0.01 on every pass, so the face's two dots and mouth stay one face.

## 4. Tone

- The paper: flat `crater` over the whole frame, then grain: a fresh scatter each boil drawing of about 5200 pits in scrawl at 20% and 3600 fibres in scratch at 16%, 1 to 3 px, plus the core's paper grain (`post: 0.8`).
- The throat: one radial gradient centred at (540, 1640), radius 600, stretched 1.15 on y, with the stops `yolkHot` 0, `yolk` 0.12 to 0.22, `craterHot` 0.5, `crater` 0.86 to 1. It breathes by 4 percent of its radius on the beat.
- No hatching, no stipple, no shadow. The hair is the only dark mass, and it is made of lines.

## 5. Plate language

- **The fall** (recipe 41): each figure has a clock `p = (onTwos(T) · 0.032 + phase) mod 1`, a scale `s = exp(−2.6 p)`, and a place `vp + (start − vp) · s`, so it shrinks toward the throat along a straight line and fades in over the first 4 percent of `p` and out over the last 6. Height is `s` times the figure's full size. Arms up in a V (`armL` about 2.45, `armR` about −2.4, from `stickPose`), legs nearly straight and a little apart; the arms wave by ±0.18 rad on a slow sine. One figure in three falls head first (`rot` π + 0.35).
- **The hair**: loops hang from y −6: each goes down to the bowl, curls back up (a `quadraticCurveTo` 18 px past the end) and runs back up to a random 0 to 55 percent of its length. A strand every 3.6 to 7.8 px, two passes. The bowl is `360 + 80 · noise1(x · 0.006) + 1250 · |x − 540|/540 ^ 2.3`, and every end jitters by up to 30 px per boil drawing.
- **The lip**: a saw of short strokes along `1850 − 420 · |x − 540|/540 ^ 4`, teeth 4 to 48 px up and 14 to 54 px down, two passes 14 px apart.
- **Figures** are our own: stick bodies with a small round face (two dots and a dash), no hair, no clothes, no animal heads. No copies of a known figure or of a record-sleeve drawing.
- **Plate B** is the same frame as a heat map: the throat's field (distance from the centre, cold where the hair hangs, a little `fbm2`) stepped into 8 bands of the crater ramp on a 12 px grid, the 7 isotherms between them from `lib.isolines`, the hair at 40 percent, the same figures, and a banded scale 36 px wide down the right side (x 984, y 520–1280) with a tick at each isotherm.

## 6. Overlays

None on plate A. Plate B carries the banded scale and nothing else: no numbers, no labels.

## 7. Motion

### 7.1 On twos, boiling at 12

Figures, the throat's pulse and the wordmark's reveal step on twos: `lib.onTwos(T)`. The hair, the lip, the grain and the tremble of every line boil on the same 12 fps clock (`lib.boil(T, 12)`), so every second frame is a new drawing and the frame between is a held copy. Nothing moves at 24 fps.

### 7.2 Timing

The fall is slow: a figure loses about 14 percent of its height a second. The throat breathes once a beat. The wordmark writes itself on in 0.75 s, from the first frame of the shot, and holds. A cut lands on a beat.

### 7.3 Determinism

Every figure's place is a closed form of global `T`, so a fall that spans a cut keeps one clock. Hair, lip and grain come from `lib.h3` of the strand index and the boil drawing; nothing is kept from the last frame.

## 8. Match cuts and continuity

The cut holds on a silhouette: the hero keeps its outline and its place, and the ground changes under it. Plate A to plate B keeps the frame and swaps the paper for the heat map; the figures are drawn exactly as on plate A. List the hero's outline at the cut frame in the storyboard's Shared geometry.

## 9. Wordmark

Hand-scratched capitals: `lib.strokeText` in the default `hand` style with `ink: { double: true }`, in `scratch` on red, 56 to 72 px cap height, `tracking` 1.4, inside the bowl above the throat, clear of the hero's hands. It writes on with `reveal` over 0.75 s and then holds, boiling with the line. Never `lib.text`, never on plate B.
