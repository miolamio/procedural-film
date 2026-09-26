<!-- Theme: snow (bare ink trees and stick figures in an overexposed white, snow on ones, one red drop for the whole film). Sections 1–9 of docs/art-bible.md; step 3 of SKILL.md copies them in verbatim. -->

## 1. Frame

The canvas is 1920 px wide and 1080 px tall at 24 fps: set `width: 1920, height: 1080` in the timeline. A film may pick 1080×1920 instead; then scale every position and size below by 1080/1920 and keep the ratios. Line widths (section 3) do not scale: they are set on the short side, which is 1080 px either way.
Every pixel value in this file assumes 1920×1080. The origin is the top-left corner and y grows downward.

- Must-read content sits inside the title-safe box: x 96–1824, y 54–1026.
- The frame is white with ink in it, not ink with white around it. Ink (trees, a bough, figures) covers 5 to 20 percent of the frame; the rest is snow.
- There is no drawn ground and no horizon line. The overexposure (section 4) eats the ground, so figures stand on their own footprints at 0.8 to 0.9 of the height and far trees fade out at about 0.7.
- The top of the frame holds the heavy ink: a bough that hangs in from a top corner, the crowns of the near trees. The lower third stays open, so the figure and the drop read against white.
- One figure carries the shot, a third of the height tall (330 to 390 px), placed on a third of the width and walking into the open side.

## 2. Palettes

Names below are the keys of `FILM.lib.pal`. The theme's colours (2.1) and the film's subject colours (2.2) both go into the marked 2.2 block of `src/lib.js`: paste `themes/snow/palette.js` first, then the subject rows. The house palettes stay in `lib.pal` for the engine and are not used by scenes.

Almost a monochrome: an overexposed white, a fog grey, an ash grey, one ink and one drop of red.

### 2.1 Snow palette

| Name | Hex | Use |
|---|---|---|
| snow | #F5F2EF | Plate A base, the overexposure, falling snow, the light inside a scribbled head |
| fog | #CECAC6 | The top of the sky only, fading to snow by half the height |
| ash | #7C7A80 | The far row of trees, at 80% |
| crow | #171820 | Every line: trunks, limbs, twigs, figures, scarves, footprints; the stipple |
| drop | #B31214 | The one drop (section 2.3) |

### 2.2 Subject palette

REWRITE PER FILM. None by default: a subject is drawn in crow on snow. Add at most one name, and only a grey between fog and crow (a coat, a far hill). Never a second colour: the drop is the only hue in the film. Enter it into the marked block in `src/lib.js` after the theme rows.

| Name | Hex | Use |
|---|---|---|
| … | #… | … |

### 2.3 The drop

One red drop for the whole film. It forms on a twig tip or a fingertip, falls, and lands as a flat mark in the snow with a few specks thrown forward; after that it stays where it fell, the same mark, until the film ends or the plate changes. Nothing else is ever red: no red tint, no red wash, no second drop. It is a filled shape with no contour, 8 to 10 px across while it falls, the mark at most 60 × 14 px. Draw it last, over the snow, so no flake crosses it.
The budget (check 12): the drop shows on at most 20% of the film's frames and never covers more than 0.2% of a frame.

## 3. Line

All ink is crow. Trunks, limbs, scarves and footprints go through `lib.inkPath` with pressure and a long taper; twigs are hairlines, stroked in one path per width, so a tree of two hundred limbs stays cheap.

| Element | Width | Colour |
|---|---|---|
| Near trunk | 18 to 30 px at the base, taper to the first split | crow 100% |
| Limbs | ×0.62 per split, `inkPath` down to 3.2 px, `taper` [2w, 9w] | crow 100% |
| Twigs | 2.2, 1.5 and 1.05 px hairlines, round caps | crow 100% |
| Far row | 5 px trunks down to 1 px twigs | ash 80% |
| Figure | `stickFigure` default (0.075 of a head diameter), joint dots 1.3 widths | crow |
| Scarf | 9 px, `taper` [2, 60] | crow |
| Footprints | filled ellipses 24 × 8 px | crow 70% at the heel, fading to 0 over 600 px behind |

Trunks and limbs boil on the 12 fps clock (`inkPath`'s default); twigs hold still. Nothing has a double stroke.

## 4. Tone

- **Overexposure.** The plate is `snow`, with a linear gradient from `fog` at the top edge to `snow` at half the height. Over the trees, a white `lib.noisePlate` (scale 170 px, threshold 0.42, soft 0.35, alpha 0.93, `boil: true`) eats their lower half in irregular patches, and a solid snow gradient from 0.68 to 0.77 of the height takes the ground and the foot of every trunk. Draw both after the trees and before the figure: a figure is never overexposed.
- **Stipple snow.** One fine ink speckle over the whole frame: `noisePlate` with `grain: 1`, scale 5, threshold 0.955, crow at 26%, `res: 0.5`, `boil: true`. It is the only tone. No hatching, no gradients on forms, no fills except the drop and a scribbled head.
- **Snow.** Two layers of `snow` discs, r 2 to 4 px, drawn after the stipple: a falling layer (170 flakes whose position is a closed form of global T, 110 to 260 px/s, drifting with the wind) and a scatter of 320 flakes placed by `lib.rng(lib.hash('snow', info.frame))`, new on every frame. On white they vanish; they show only over ink and fog, which is the look.
- The carrier is clean: every shot is `post: 0`, no grain. The stipple and the snow are the texture.

## 5. Plate language

- **Bare trees** (recipe 44). A tree is a seeded recursion: a trunk 2 to 2.6 times as long as its first limbs, each limb 5 segments that bend a little and curl toward the sky (×0.93 per segment), splitting in two (one time in three, three) with a side twig from the middle. Six levels for a near tree, four for the far row. Heights and splits come from `lib.rng(lib.hash(...))`, so the tree is the same in every frame; keep the polylines in a Map keyed by the tree's parameters.
- **The bough.** One heavy limb hangs in from a top corner with its twigs curling up, across 30 to 60 percent of the width. The drop forms on one of its tips.
- **The far row.** Eight or nine small trees in ash along 0.7 of the height, half gone in the overexposure.
- **Figures** (recipe 38). `stickFigure` with `head: 'scribble'`: a crow disc with snow scribbles inside, straight limbs with joint dots. Give each film's people their own act and one attribute of their own (here, a scarf blown back by the wind); do not copy a known figure. Walks are `stickPoses` walk1–walk4 mixed on twos, one stride a second; lean into the wind (`lean` 0.2).
- **Plate B — the negative.** The same frame with every colour inverted: crow ground, snow trees and figures, a fog-dark sky. The scene draws it (a `neg` flag through one colour function, `#rrggbb ^ 0xFFFFFF`) and leaves the drop red. Do not use `grade: { invert: 1 }`: the grade would turn the drop cyan. A negative plate lasts at least a beat; check 9 counts every switch as a full-frame flash, so switch at most once a second.
- No text in any shot except the wordmark (section 9).

## 6. Overlays

None. No guides, rings, labels or brackets on either plate.

## 7. Motion

### 7.1 Weightless 24

Snow and the drop move on ones (every frame at 24 fps): the falling flakes glide and the scatter is new each frame. Figures hold each pose for two frames (`lib.onTwos` of the shot time, added to the shot's start for a global clock). Trunks, limbs and scribbled heads boil on 12 (`lib.boil(T)`); twigs and the plate do not move.

### 7.2 Timing

A walker crosses at 100 to 140 px a second, one stride a second. The drop forms over about half a second, falls under gravity (y as the square of the fall time) in about 0.7 s, and lands on a beat. Snow falls at 110 to 260 px a second and drifts with the wind at 0.45 of that; the scarf waves with the same wind.

### 7.3 Determinism

Everything is a closed form of global T: the walker's x, the drop, the falling snow, the scarf. The per-frame scatter is keyed by `info.frame`, never by `Math.random`. Trees are rebuilt from seeds (or read from the Map); nothing is kept from the last frame.

## 8. Match cuts and continuity

The cut holds on a silhouette: the figure keeps its outline and its place, and everything around it changes. Plate A to plate B keeps the frame and inverts it; the figure's pose on the two sides of the cut is one drawing of the walk apart, and the drop, if it is on screen, stays red and stays where it is. List the figure's outline at the cut frame in the storyboard's Shared geometry.
Across free cuts the drop keeps its mark: once it has fallen, every later shot of the same place shows it where it landed.

## 9. Wordmark

Thin hand capitals: `lib.strokeText` with `style: 'hand'`, `size` 40, `weight` 2 (a hairline), `slant` 0, `jitter` 0.4, `tracking` 3, crow on plate A and snow on plate B, centred on x = 960 with its cap line at y = 960. It writes on with `reveal` over one bar and holds. Never red, never `lib.text`.
