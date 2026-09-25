<!-- Theme: phosphor (terminal, vector screen). Sections 1–9 of docs/art-bible.md; step 3 of SKILL.md copies them in verbatim. -->

## 1. Frame

The canvas is 1920 px wide and 1080 px tall at 24 fps: set `width: 1920, height: 1080` in the timeline. A film may pick 1080×1920 instead; then scale every pixel value below by 1080/1920 and keep the ratios.
Every pixel value in this file assumes 1920×1080. The origin is the top-left corner and y grows downward.

- Must-read content sits inside the title-safe box: x 96–1824, y 54–1026. The carrier's rounded screen darkens the corners, so nothing that matters goes within 80 px of a corner.
- The screen is a grid: text and sprites sit on a 6 px cell grid (a glyph is 5×7 cells on a 6-cell advance, a text line 9 cells). Choose the cell once per film (5 or 6 px for body text, 10 to 14 px for a title or a sprite) and keep it.
- Compose like a terminal or an instrument: a text column on the left third, the picture (trace, wireframe, sprite) in the middle or right, generous black between.

## 2. Palettes

Names below are the keys of `FILM.lib.pal`. The theme's colours (2.1) and the film's subject colours (2.2) both go into the marked 2.2 block of `src/lib.js`: paste `themes/phosphor/palette.js` first, then the subject rows. The house palettes stay in `lib.pal` for the engine and are not used by scenes.

Colour is light on black, in one hue. Brightness is the only tone.

### 2.1 Screen palette

| Name | Hex | Use |
|---|---|---|
| screen | #020A04 | Plate base |
| screenLift | #06140A | Soft radial lift at the centre of the screen |
| screenEdge | #000200 | Edges, under the carrier's mask |
| phos | #7CFF9A | Primary strokes, text that matters, sprites |
| phosHot | #D8FFE0 | The hot core of a trace, the cursor, the brightest point |
| phosSoft | #3FBF62 | Body text, secondary strokes |
| phosDim | #1C6B35 | Graticules, scales, labels |
| phosFaint | #0E3A1C | Afterglow tails, the faintest construction |
| amber | #FFB347 | The one accent: an alert |
| amberHot | #FFE0A8 | The accent's hot core |

### 2.2 Subject palette

REWRITE PER FILM. On this theme the subject is drawn in the screen hues: 0 to 4 extra names is typical (a second green for a second channel, say). Never a second accent hue. Enter every one into the marked block in `src/lib.js` after the theme rows.

| Name | Hex | Use |
|---|---|---|
| … | #… | … |

### 2.3 The accent

Amber marks an alert: one per act, on one element, at most 2 seconds. Everything else is green.

## 3. Line

All widths at 1920 px wide.

| Element | Width | Colour and opacity |
|---|---|---|
| Primary trace or vector stroke | 2.5 px, halo radius 9 px (`lib.glow`) | phos 100%, halo phos 22% |
| Hot core of a trace (its newest part) | 1.2 px | phosHot 90% |
| Secondary strokes, wireframe back edges | 1.5 px, halo 5 px | phosSoft 70% |
| Graticule, 10 divisions | 1 px, no halo | phosDim 45% |
| Scale ticks | 1 px, 8 px (every 5th 16 px) | phosDim 60% |
| Afterglow tail | the stroke's width | phosFaint → 0 over 6 to 10 drawings |
| Text and sprites | cell 5–6 px (body), 10–14 px (title, sprite) | phosSoft (body), phos (what matters) |

Strokes are exact: no boil, no pressure. The screen is a machine.

## 4. Tone

- No fills, no hatching, no gradients on forms. A sprite is lit cells; a wireframe is edges.
- Glow comes from `lib.glow` (strokes) and `lib.glowDot` with `rays: 0` (a beam spot); never `shadowBlur` or `ctx.filter` on a full frame (check 6).
- The plate: `screen` base, a radial lift to `screenLift` in the middle. Grain at 30% (`post: 0.3`) under the carrier.
- The carrier is the timeline's `carrier: { kind: 'crt' }`: scanlines, the rounded screen, a slow hum bar, a faint flicker. Scenes never draw their own scanlines or mask.
- Afterglow: a moving beam leaves a tail. Draw it from the beam's closed-form positions at earlier times (T − k/24 for k = 1..8) with falling alpha, never from a previous frame. `lib.smear` with `mode: 'ghosts'` does this for a moving shape.

## 5. Screen language

- **Terminal** (recipe 34). Text is always `lib.pixelText`: the system monospace renders differently on every machine. Text types on at 20 to 40 characters a second (`chars` from global T), with a block cursor blinking on the 3 fps clock (`lib.boil(T, 3) % 2`).
- **Vector plate** (plan B). An oscilloscope or a vector monitor: traces (`lib.glow` on a sampled curve), wireframes (`lib.wire3d`, back edges dashed and dim), a graticule, readouts in the pixel font.
- **Sprites.** `lib.sprite` on a 10 to 14 px cell. A sprite has at most 3 drawings and changes drawing on twos; a character that holds still blinks with `lib.blinkAt`.
- Numbers and words are allowed here, unlike the house style: readouts, labels, a log. Keep each line to 32 characters, and at most 8 lines on screen.

## 6. Overlays

Instrument furniture: the graticule, scale ticks, a frame counter or timecode in the pixel font, a status line. At most two per shot besides the text column. Only the alert uses amber.

## 7. Motion

### 7.1 Machine time

Traces sweep and wireframes turn at a full 24 fps. Text appears on the frame (a character per frame at most). Sprites step on twos (`lib.onTwos`). Nothing eases except the camera, and the camera rarely moves: a terminal is locked off.

### 7.2 Timing

Events land on beats with `lib.hit(..., lead = 1)`. A line of text finishes typing on a beat; a trace's peak lands on a beat.
An act ends with the `crtoff` transition (0.4 to 0.6 s): the picture collapses to a line, the line to a dot, the next picture opens out of a line. Every other cut is hard.

### 7.3 Determinism

Seed every random choice from `lib.hash(shotId, ...)` through `lib.rng`. A scene draws from `t` alone and never depends on a previous frame; clamp `t` to the final pose past the shot's end. Typing and cursors run from global T so a cut in the middle of a line keeps the text.

## 8. Match cuts and continuity

A trace, a sprite or a line of text keeps its place and its cell grid across a cut between the terminal plate and the vector plate. Shapes that survive a cut live in the storyboard's Shared geometry and `src/geo.js`; check 7 measures them with the carrier off.

## 9. Wordmark

The film's word in upper case, `lib.pixelText` on a 12 px cell, phos, centred on x = 960 with its top at y = 900, typed on over one bar with the cursor, then the cursor blinks to the end.
