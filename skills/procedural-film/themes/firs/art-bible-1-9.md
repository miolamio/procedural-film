<!-- Theme: firs (a night collage: a flat ember sky, one pitch fir edge, a swarm of cut-paper eyes, lollipop figures on the snow). Sections 1–9 of docs/art-bible.md; step 3 of SKILL.md copies them in verbatim. -->

## 1. Frame

The canvas is 1920 px wide and 1080 px tall at 24 fps: set `width: 1920, height: 1080` in the timeline. A film may pick 1080×1920 instead; the bands below are fractions of the height and hold on either frame, and the sizes in px are for 1920×1080 (the fixture, `tools/fixtures/scenes/42-fx-firs.js`, gives the vertical numbers).
The origin is the top-left corner and y grows downward.

- Must-read content sits inside the title-safe box: x 96–1824, y 54–1026.
- The frame is three flat bands, like paper cut and laid on paper: the ember sky, the pitch fir edge, the snow. The foot of the forest (the snow line) sits between 0.66 and 0.72 of the height. The fir tops rise from it by 0.1 to 0.3 of the height, so the edge fills a band from about 0.4 to 0.7.
- The sky above the edge belongs to the swarm (section 5). Leave the top tenth of the frame and a clearing round the lead eye empty: the ember must read as a field, not as gaps between eyes.
- The snow below belongs to the row of figures, standing on a line at 0.86 to 0.9 of the height. Nothing else stands on the snow.
- One thing carries the shot: the lead eye in the sky, or one figure in the row. It is the only shape that breaks the repeat: the largest eye, or the one figure that moves differently.

## 2. Palettes

Names below are the keys of `FILM.lib.pal`. The theme's colours (2.1) and the film's subject colours (2.2) both go into the marked 2.2 block of `src/lib.js`: paste `themes/firs/palette.js` first, then the subject rows. The house palettes stay in `lib.pal` for the engine and are not used by scenes.

Six flat inks and one accent. Every pixel of a finished plate A is one of the seven; the only in-between pixels are antialiased edges.

### 2.1 Inks

| Name | Hex | Use |
|---|---|---|
| ember | #E2701E | The sky: plate A's base, one flat fill |
| rust | #A8440F | The far fir row, behind the pitch one; nothing else |
| pitch | #0E0B09 | The fir edge and its mass, the figures, pupils, the lids of the eyes |
| snow | #F3EFE6 | The snow field |
| bone | #E8D2A8 | The whites of the eyes (cut paper), the glint cut in an iris |
| sepia | #74461F | Irises |
| ice | #58B4E0 | The one accent |

### 2.2 Subject palette

REWRITE PER FILM. None by default: a subject is cut from the inks above. Add at most one name, and only when the subject cannot be read without its own colour; it takes the place of sepia or bone on the subject, never of ember, pitch or snow. Never a second accent. Enter it into the marked block in `src/lib.js` after the theme rows.

| Name | Hex | Use |
|---|---|---|
| … | #… | … |

### 2.3 The accent

Ice fills one iris per shot: the lead eye's, the one that looks straight at the viewer while every other eye looks at the figures. It covers 0.2 to 1 percent of the frame (`accent.budget.area` 0.01). In plate B the invert turns it to a burnt orange; that is the same accent, not a second one.

## 3. Line

None. This is a collage: every shape is a flat piece of cut paper with no contour, and an edge is where one ink meets the next.

| Element | How it is drawn |
|---|---|
| Fir edge, fir mass, eye lids | filled pitch polygons; no `stroke()` |
| Eyes, irises, pupils, glints | filled polygons of 7 to 9 straight scissor cuts, jittered once per eye |
| Figures | `stickFigure` in pitch: a solid disc head and a stick about 0.034 of the figure's height wide, arms cut to stubs; the only strokes in the theme |

Never `inkPath`, `hatch` or an outline round a filled shape: a contour turns the cut paper into a drawing.

## 4. Tone

- None. A shape is one flat ink. No gradient, no shadow, no grain, no hatching.
- Depth is a second silhouette: a rust fir row, taller and sparser, stands behind the pitch one and shows only above and between it. Eyes that drift over the edge knock it out, and larger eyes are nearer and drawn later.
- The plate: flat `ember` over flat `snow`. The carrier is clean: `post: 0`.

## 5. Plate language

- **The fir edge** (recipe 45) is one silhouette across the frame, not a row of separate trees: narrow spires packed so they overlap (the next spire 0.16 to 0.36 of a spire's width along), each a jagged outline of drooping branch tips and inner notches, one branch in three split into two points, the skyline swelling and dipping on a slow `noise1`, and a solid pitch mass under the tiers down to the snow. Heights from a seeded `rng`, built once per frame size and seed. It never moves, and it is the shape the cuts hold on.
- **The far row** is the same construction in rust, from its own seed, 0.14 to 0.3 of the height tall and spaced about half a spire apart, standing a little above the pitch foot.
- **The snow line** is the top of the snow field: low drifts, 10 to 30 px, laid over the foot of the mass so the forest stands in the snow.
- **The swarm** (recipe 45) is 16 to 24 almond eyes, scattered once with `scatter` inside a lopsided cloud over the edge and carried on one slow `flow` (speed about 70, scale about 900 px) with `advect`. Widths run 80 to 240 px, most of them small; a few overlap the edge. Each eye is a bone almond (the upper lid arches higher than the lower), a sepia iris with a pitch pupil and a bone glint, clipped to the almond, and a pitch lid: a sliver along the upper cut, thickest over the iris, with a short upswept tail at the outer corner. Eyes tilt up to ±0.45 rad and face either way.
- **The gaze**: every eye turns its iris toward the lead figure; the lead eye (380 to 480 px wide, in a clearing near the middle of the sky) looks at the viewer with the ice iris.
- **Blinks**: `blinkAt` with long gaps (`gapMin` 40, `gapMax` 150, `loop` 288), so at most one or two eyes are shut at a time. A shut eye is the lid sliver on a flattened almond, with no iris.
- **The figures** (recipe 38 on this plate) are lollipops: `stickFigure` with `head: 'solid'`, `joint: 0` and `body { head 1, neck 0.05, torso 1.3, upperArm 0.7, forearm 0.55, thigh 1.2, shin 1.2, foot 0 }`, legs at 0 so they read as one stick. Ten of them, 110 to 150 px tall, spaced evenly with a little jitter along the row, alternately facing. They sway; one raises its arms to the eyes. They are our own people: a disc on a stick, no faces, no reference to any known figure.
- No text in any shot.

## 6. Overlays

None, on either plate.

## 7. Motion

### 7.1 Two clocks

The swarm drifts at 24 fps: every frame is a new position, from a closed form of time (`advect` from the scatter point over the plate clock, plus a small bob). The figures move on twos: poses from `onTwos(t)` and the stick trembling on the boil clock, so the row holds each drawing two frames. The fir edge holds for the whole shot.

### 7.2 Timing

The swarm crosses about 70 px a second on its current; an eye bobs 10 px on a period of 3 to 4 s. A figure's sway is one swing a bar; a gesture (arms up) takes a beat to rise and a beat to fall and lands on a beat. Blinks are two frames.

### 7.3 Determinism

Positions are closed forms of a clock that runs across the plate cut (plate B starts where plate A stopped), so a cut lands every eye one frame on from where it was. The edge and the eye cuts are built from constants and seeds and cached only by frame size and seed; nothing is kept from the last frame.

## 8. Match cuts and continuity

The cut holds on the fir edge's silhouette. Plate A to plate B (`grade: { invert: 1 }`) keeps every pixel of the edge and swaps the inks: the ember sky becomes blue, the pitch edge a white frost, the snow a black field and the figures white. The swarm continues on one clock across the cut. Between shots of one act the edge keeps its seed and foot, so the skyline is the same place.

Why plate B is the negative and not a schematic: the theme has no line, so a schematic would bring a wire into a collage that has none; the invert is the same cut paper turned to night, it needs no second drawing, and it keeps the edge exactly, which is the match cut. List the edge's seed, foot and height range in the storyboard's Shared geometry.

## 9. Wordmark

None. The collage carries no text; never `lib.text`. If a film must be titled, the title goes on its own card outside this theme's plates.
