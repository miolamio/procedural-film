<!-- Theme: blob (liquid bodies on a flat pool, relief maps). Sections 1–9 of docs/art-bible.md; step 3 of SKILL.md copies them in verbatim. -->

## 1. Frame

The canvas is 1920 px wide and 1080 px tall at 24 fps: set `width: 1920, height: 1080` in the timeline. A film may pick 1080×1920 instead; then scale every pixel value below by 1080/1920 and keep the ratios.
Every pixel value in this file assumes 1920×1080. The origin is the top-left corner and y grows downward.

- Must-read content sits inside the title-safe box: x 96–1824, y 54–1026.
- One body carries the shot. It fills 25 to 45 percent of the frame height and stands on the lower third, with room below it to drip.
- The pool is flat and empty: no horizon, no ground line. A body is grounded by its drips and its shadow of nothing.

## 2. Palettes

Names below are the keys of `FILM.lib.pal`. The theme's colours (2.1) and the film's subject colours (2.2) both go into the marked 2.2 block of `src/lib.js`: paste `themes/blob/palette.js` first, then the subject rows. The house palettes stay in `lib.pal` for the engine and are not used by scenes.

Colour is flat: one blue ground, white bodies, tar outlines.

### 2.1 Pool palette

| Name | Hex | Use |
|---|---|---|
| pool | #2F7FD8 | Plate base |
| poolDeep | #235FA6 | Relief plate base; the deepest relief band |
| poolPale | #7FB3EC | Marble contours inside a body; relief lines |
| body | #F6F1E6 | Body fill |
| bodyShade | #DDD5C6 | A second body behind the first, a detached drop |
| tar | #141217 | Outlines, heads, pupils |
| yolk | #FFC83D | The one accent |

### 2.2 Subject palette

REWRITE PER FILM. Bodies stay body-white; a subject adds 0 to 3 names at most (a second body colour for a second character, say). Never a second accent. Enter every one into the marked block in `src/lib.js` after the theme rows.

| Name | Hex | Use |
|---|---|---|
| … | #… | … |

### 2.3 The accent

Yolk marks one small thing per act: a drop, an eye, a seed inside a body. Never a whole body.

## 3. Line

All widths at 1920 px wide.

| Element | Width | Colour and opacity |
|---|---|---|
| Body rim | 4 px (3 px on bodies under 120 px) | tar 100% |
| Marble contours, 2 to 4 inside a body | rim × 0.45 | poolPale 60% |
| Head and face (`lineIcon` on a tar disc) | 0.03 of the head size | body 100% on tar |
| Relief lines (plate B) | 1.5 px, every 5th 2.5 px | poolPale 35 → 80% by level |

The rim is the field's level-1 contour (`lib.blob`), smoothed; it boils through the warp phase, not through `inkPath`.

## 4. Tone

- No hatching, no stipple, no gradients. A body is flat `body` with marble contours; nothing else shades it.
- Marble contours come from the same field at higher levels (`blob` with `marble` 2 to 4): they follow the body's inner lobes and show where it will split.
- The plate: flat `pool`. Grain at 50% (`post: 0.5`).
- The relief plate (plan B): `poolDeep` base, isolines of the same field (or of `lib.fbm2` for terrain) at 6 to 12 levels.

## 5. Liquid language

- **Bodies** (recipe 37) are metaballs: a list of `[x, y, r]` balls. A body is 3 to 10 balls: a core, a head ball or none, limbs and drips. Merging, splitting, dripping and melting are the balls moving; never redraw an outline by hand.
- **Melting**: drip balls slide down and shrink, the core sinks and widens. A drip that leaves detaches on its own when its ball moves far enough away.
- **Faces**: a head is a tar disc with a `lib.lineIcon` face in `body` colour (eyes with dot pupils, a mouth line, teeth). It sits on the body's top ball and moves with it. It blinks with `lib.blinkAt`.
- **Flow**: `warp` 8 to 16 px with `phase` running on T keeps every rim alive; a still body is still wobbling.
- No text in any shot.

## 6. Overlays

None. The relief plate is how this theme explains: the same field as a map.

## 7. Motion

### 7.1 Liquid time

Balls move at a full 24 fps and ease with `inOutCubic` over a beat or longer. Nothing snaps except a drop landing (`outBack`, 4 frames). Faces hold and blink.

### 7.2 Timing

A merge or a split lands on a beat: plan the balls' paths so the rims touch (or part) on that frame. `lib.hit(..., lead = 1)` for the landing of a drop.

### 7.3 Determinism

Ball positions are closed forms of `t` (or of global T when a body crosses a cut). Seed warps from `lib.hash(shotId)`. A scene never keeps the last frame's balls.

## 8. Match cuts and continuity

A body keeps its balls across a cut, so the rim lands on the same pixels; list the rim at the cut frame in the storyboard's Shared geometry. A cut between two bodies of different shape is a `morph` transition between their rims.

## 9. Wordmark

None by default. If the film has one, the word is written as blobs: one ball chain per stroke, merged, in body with a tar rim, melting once at the end.
