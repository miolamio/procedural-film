<!-- Theme: negative (void plate, constellation). Sections 1–9 of docs/art-bible.md; step 3 of SKILL.md copies them in verbatim. First proved by films/zero-gravity. -->

## 1. Frame

The canvas is 1920 px wide and 1080 px tall at 24 fps: set `width: 1920, height: 1080` in the timeline. A film may pick 1080×1920 instead; then scale every pixel value below by 1080/1920 and keep the ratios.
Every pixel value in this file assumes 1920×1080. The origin is the top-left corner and y grows downward.

- Must-read content (the subject, a match-cut shape, a glyph that carries meaning) sits inside the title-safe box: x 96–1824, y 54–1026.
- The frame centre (960, 540) is the default axis. Compose a landscape: the subject left or right of centre, open void ahead of where it travels.
- Keep a lot of dark: lit elements cover at most the middle 60% of the width in an ordinary shot. Emptiness is the material of this theme, not a gap to fill.

## 2. Palettes

Names below are the keys of `FILM.lib.pal`. The theme's colours (2.1) and the film's subject colours (2.2) both go into the marked 2.2 block of `src/lib.js`: paste `themes/negative/palette.js` first, then the subject rows. The house palettes stay in `lib.pal` for the engine and are not used by scenes.

Colour is light on black. Nothing is filled except the plate and the dark knock-out inside a figure's contour.

### 2.1 Void palette

| Name | Hex | Use |
|---|---|---|
| void | #05060A | Plate base |
| voidLift | #0C1019 | Soft radial lift of the plate around the subject (radius about 900 px) |
| voidEdge | #010102 | Corner vignette |
| dust | #8C96AA | Dust motes, 0.6–1.6 px, alpha 10–35% |
| line | #E4E9F2 | Primary contours, constellation edges that carry meaning |
| lineSoft | #A7B1C4 | Inner contours, dashes, trails |
| lineFaint | #5B6579 | Guide ellipses, diagonals, brackets, rules |
| lineDim | #262D3B | Faintest construction |
| star | #F4F6FF | Constellation nodes and point sources |
| accent | #FF9442 | The one accent (see 2.3) |
| accentHot | #FFD8A8 | The accent's hot core, its sparks and its break wave |
| accentGlow | #B8501A | The accent's halo |

### 2.2 Subject palette

REWRITE PER FILM. One row per subject colour, named for what it colours (`hero`, `heroSoft`, …). On this theme the subject is cool grey-white line: 2 to 8 names is typical, and none of them may be a second warm hue. This table publishes the final values — enter every one into the marked block in `src/lib.js` after the theme rows.

| Name | Hex | Use |
|---|---|---|
| … | #… | … |

### 2.3 The accent

One accent per film, on one thing only (a thread, a spark, a single figure's heart). Everything else is grey-white. A film may retint `accent`, `accentHot` and `accentGlow` together as one family; it may not add a second accent.

## 3. Line

All widths at 1920 px wide. Contours come from `lib.inkPath` with little pressure variation (±10%): they read as drawn light, not ink.

| Element | Width | Colour and opacity |
|---|---|---|
| Primary contour | 2.2 px | line 95% |
| Inner contours, nested toward the core | 1.6 → 0.9 px | lineSoft 75% → 25% |
| Core dot | r 3 px | line 90% |
| Constellation edge | 1.2 px | line 55%, 80% while it draws on |
| Constellation node | r 1.5–3 px, halo r 8–14 px | star 100%, halo star 18% (lighter blend) |
| Dashed paths, 10/8 | 1.4 px | lineSoft 55% |
| Ticks | 1.2 px, 8 px (every 6th 16 px) | lineSoft 40% |
| Guide ellipses and diagonals | 1 px | lineFaint 14–20% |
| Trails, fading to nothing | 1.4 px | lineSoft 55% → 0, linear |
| Accent core | 2.4 px | accent 100% |
| Accent halo | 9 px | accentGlow 22% (lighter blend) |
| Brackets and rules | 1.4 px, end ticks 14 px | lineFaint 50% |

Figures, shells and trails wobble on the 12 fps boil (`lib.boil(T)`), 0.6–1.2 px. Forces, orbits and the accent are exact curves.

## 4. Tone

- No hatching, no stipple fills, no gradients on forms. Tone comes from nested contours and from how many lines meet.
- Glow is allowed on the accent, on constellation nodes and on point sources only: a halo stroke or `lib.glowDot` in `lighter` blend, never `shadowBlur` or `ctx.filter` on a full frame (check 6).
- The plate: `void` base, a radial lift to `voidLift` around the subject, `voidEdge` in the corners. The engine's schematic noise sits on top at 55%: every shot is `mode: 'schematic', post: 0.55`.
- Dust: about 140 motes, seeded, drifting at most 6 px/s, twinkling on the boil clock, keyed by global T so the field is the same in every shot.
- A figure's contour is knocked out with `void` at 88% so paths, rings and trails pass behind it, not through it.

## 5. Void plate language

- **Constellation.** A figure is a set of star nodes joined by thin edges. Edges draw on node to node (`outExpo`, 6 frames each) and may unlink; a node never moves off its place in the figure. A constellation needs 7 to 30 nodes to read, and one edge in five may be missing.
- **Instrument.** Relationships are shown as an instrument: a centre glyph (ring r 6 px, cross ±16 px, dotted ring r 40 px), a dashed ellipse with ticks, faint guide ellipses and two long diagonals. As the relation weakens, the instrument dims, breaks and disappears.
- Measurement is brackets and rules, never numbers. No text in any shot except the optional wordmark (section 9).
- Depth is an ellipse seen at an angle (aspect about 0.56): what is on the near half is drawn 10% larger and brighter.
- **Plan B — the negative.** The second plate is the same frame inverted: void turns to paper-white, light lines to black. It needs `grade: { invert: true }` (engine slice 2); until then a film on this theme runs on the void plate alone. An inverted plate lasts at least a beat, and a film switches between plates at most once per second (check 9 counts every switch as a full-frame flash).

## 6. Overlays

At most one overlay per shot besides the permanent instrument: a heartbeat ring, breath ticks, a distance bracket, phase marks, a break wave or a gap rule. Overlays use lineFaint or line; only the accent's own event may use accent colours.

## 7. Motion

### 7.1 Weightless

Positions move at a full 24 fps and glide: no on-twos stepping. Only contours boil, on the 12 fps clock.
Characters hold still and blink: a blink is exactly 2 frames with no in-between, on an uneven schedule seeded from `lib.hash` (gaps of 7 to 38 frames, never a regular period).

### 7.2 Timing

Events land on beats with `lib.hit(..., lead = 1)` so they show on the beat frame. When a beat falls between frames, the first frame at or after the beat carries the event.
Every shot runs a loop (two bars is typical) so no shot ever holds still: breathing (scale 1 ± 0.12, once per loop), drift, sway, tremble. One-off events sit outside the loop.
There is at most one abrupt motion per act; everything else eases over one beat or longer.

### 7.3 Determinism

Seed every random choice from `lib.hash(shotId, ...)` through `lib.rng`. A scene draws from `t` alone and never depends on a previous frame; clamp `t` to the final pose past the shot's end.
Anything that continues across cuts (positions, dust, an accent) is a closed form of global T, written once in the first scene as a World block and copied verbatim by every other scene.

## 8. Match cuts and continuity

The same figures stay on screen across a cut unless the storyboard removes them: the frames on each side of a cut agree except for the one layer the incoming shot adds, and that layer arrives on a downbeat.
Shapes that survive a cut live in the storyboard's Shared geometry and `src/geo.js`; scenes read them with `lib.geo(id)`, and check 7 measures them.
A match cut between the void plate and its negative keeps every pixel of the figure in place.

## 9. Wordmark

Optional. If the film has one: the film's word in lowercase, `lib.text` in a thin system sans-serif (ask for weight 200), 36 px, letter-spacing 0.2 em, line at 70%, centred on x = 960 with its baseline at y = 980.
