# Art bible: Zero Gravity and No Attraction

The visual rules every scene follows.
Where this file and a scene brief disagree on a colour, weight or rule, this file wins.
Where this file and `docs/storyboard.md` disagree on a position or a time, the storyboard wins.

## 0. Departure from the house style

The user asked for a dark concert screen, not the paper-and-blueprint house style. The reference is the user's brief plus the scenario (`docs/reference-analysis.md`), and sections 1–9 below replace the house rules for this film:

1. One plate only, the **void plate**: deep near-black, light lines. No paper, no stripes, no blueprint grid.
2. Everything is line. Bodies, shells, orbit, fields and trails are contours; nothing is filled except the plate.
3. One accent colour, on the thread alone (and the single ring where it breaks). Everything else is cool grey-white.
4. No text, no wordmark: the concert program carries the titles.
5. Weightless motion: positions glide at 24 fps; only line boil runs on the 12 fps clock.

## 1. Frame

1920×1080 at 24 fps, a landscape concert screen. Origin top-left, y down.

- Title-safe box (must-read content): x 96–1824, y 54–1026.
- The shared centre C is the frame centre (960, 540). The world is composed around it and the camera never moves.
- Bodies stay inside the safe box until the end of shot 07 (from bar 92, T 158.676), where they leave the frame on purpose, once.
- Keep a lot of dark: in shots 01–05 the lit elements cover the middle 60% of the width; in 07 the middle 70% is void.

## 2. Palette

Names are keys of `FILM.lib.pal`. The block marked 2.2 in `src/lib.js` mirrors this table exactly.

### 2.2 Film palette

| Name | Hex | Use |
|---|---|---|
| void | #05060A | Plate base |
| voidLift | #0C1019 | Soft radial lift of the plate around C (radius 900 px) |
| voidEdge | #010102 | Corner vignette |
| dust | #8C96AA | Dust motes, 0.6–1.6 px, alpha 10–35% |
| line | #E4E9F2 | Body outer contours, the centre glyph, lit orbit ticks |
| lineSoft | #A7B1C4 | Inner body contours, orbit dashes, trails |
| lineFaint | #5B6579 | Guide ellipses, diagonals, brackets, the gap rule |
| lineDim | #262D3B | Faintest construction |
| shell | #C9D4E6 | Shell contours |
| fieldA | #B4C3DC | Body A's field rings (cool) |
| fieldB | #DCC6A8 | Body B's field rings (warm grey, so the crossing reads; not an accent) |
| thread | #FF9442 | The thread — the only accent |
| threadHot | #FFD8A8 | The thread's tension core, the break wave and sparks |
| threadGlow | #B8501A | The thread's halo |

The house palettes (2.1, 2.3, 2.4) stay in `lib.pal` for the engine but are not used by this film.

## 3. Line

All widths at 1920×1080.

| Element | Width | Colour and opacity |
|---|---|---|
| Body outer contour | 2.2 px | line 95% |
| Body inner contours (5) | 1.6 → 0.9 px | lineSoft 75% → 25% |
| Body core dot | r 3 px | line 90% |
| Shell inner | 1.3 px | shell 75% |
| Shell outer, dashed 12/9 | 1.1 px | shell 50% |
| Orbit, dashed 10/8 | 1.4 px | lineSoft 55% |
| Orbit ticks (72, hidden under the bodies) | 1.2 px, 8 px (every 6th 16 px) | lineSoft 40% |
| Centre heartbeat ring (01), orbit-plane aspect 0.56 | 1.6 px | line 45%, 70% on downbeats, fading over the beat |
| Centre glyph | ring r 6 px, cross ±16 px, dotted ring r 40 px, 1.5 px | line 70% |
| Guide ellipses and diagonals | 1 px | lineFaint 14–20% |
| Trails (last 2.8 s of path, over the shells) | 1.4 px | lineSoft 55% → 0, linear |
| Field rings | 1.2 px | fieldA / fieldB, 50% at the body → 0 at 900 px |
| Thread core | 2.4 px (2.6 px in 08) | thread 100% |
| Thread halo | 9 px | threadGlow 22% (lighter blend) |
| Thread tension core | 1 px | threadHot, 0–80% by tension |
| Break wave | 2 px, 6 → 130 px | threadHot 100% → 0 over 6 frames, under the bodies |
| Brackets and the gap rule | 1.4 px, end ticks 14 px | lineFaint 50% |

Every body, shell and trail line wobbles on the 12 fps boil (`lib.boil(T)`), 0.6–1.2 px. The orbit, the field rings and the thread are exact curves (they are forces, not drawings).

## 4. Tone

- No hatching, no stipple fills, no gradients on forms.
- Glow is allowed on the thread only (a halo stroke in `lighter` blend) and on the break wave.
- The plate: `void` base, a radial lift to `voidLift` around C, `voidEdge` in the corners. The engine's schematic noise sits on top at 55% (every shot is `mode: 'schematic', post: 0.55`).
- Dust: ~140 motes, seeded, drifting ≤ 6 px/s, twinkling on the boil clock. The same field in every shot (keyed by global T).

## 5. Void plate language

- The shared centre is shown as an instrument: the centre glyph, the dashed orbit ellipse with ticks, faint guide ellipses at 1.6× and 2.4× the orbit and two long diagonals through C. As the centre is lost (shots 03–05) the instrument dims, breaks and disappears. From shot 06 on there is no centre at all.
- Measurement is brackets and rules, never numbers.
- Depth: the orbit plane is seen at an angle (ellipse aspect 0.56). A body on the near half is drawn 10% larger and brighter than on the far half; the effect fades out once the orbit is gone.

## 6. Overlays

At most one overlay per shot besides the permanent instrument: the centre's heartbeat ring (01), the breath ticks (02), the distance bracket (03), the phase marks (05), the break wave (06), the gap rule (07). None in 04 and 08.

## 7. Motion

- Positions come from the World block (a closed form of global T) and move at 24 fps: weightless, no on-twos stepping. Contours boil at 12 fps.
- The film runs the full song (172.042 s) on the recording's grid: 140 bpm, first beat T 0.105, bar n's downbeat at T 0.962 + n·12/7 (storyboard, Numbers).
- Events land on beats with `lib.hit(..., lead = 1)` so they are visible on the beat frame. At 140 bpm a beat is 10.29 frames, so a beat time falls between frames; the first frame at or after the beat carries the event.
- Every shot runs a loop: 16 pulses (two bars, 3.429 s; a pulse is an 8th) in 01–05 and 07, 8 pulses (one bar) in 06 and 08. Breathing, bends, sways, drifts and tremble repeat on it, so no shot ever holds still. The one-off events sit outside the loop: the shells' birth (T 14.676), the thread's reveal (T 42.105), the phase flip (T 93.534), the snap (T 120.962), the bodies' exit (from T 158.676).
- Breathing: one breath per 16-pulse loop, peaks on the even downbeats (scale 1 ± 0.12).
- The only abrupt motion in the film is the snap (T 120.962, the bar-70 downbeat) and its recoil.

## 8. Continuity

- The same bodies stay on screen across every cut. Every scene copies the World block verbatim from `01-shared-orbit.js` and never re-derives positions.
- A layer arrives or leaves on a downbeat and is ramped by the World block's global layer functions, so the frame on each side of a cut agrees except for the one layer that the incoming shot adds.

## 9. Wordmark

None.

## 10. Subject reference

Source checked on 2026-09-25: the concert scenario `scenario-05.md` and the visualization note `visualization-readme.md` in `.tmp/research/` (the research step was shortened by agreement: the subject is abstract).

### 10.1 The bodies

Two outlined bodies, different in shape so the eye tells them apart without colour.

- A: a lens — a superellipse (exponent 2.6), width 160 px, height 124 px (outer contour), turning +0.25 rad/s.
- B: a rounded three-lobe — base radius 65 px, lobe amplitude 0.14, outer extent ≈ 150 px, turning −0.18 rad/s.
- The outer contour is filled with `void` at 88% so the orbit, rings and trails pass behind the body, not through it.
- Six nested contours each, spaced toward the core (scales 1, 0.8, 0.62, 0.46, 0.31, 0.17), and a core dot.
- **Measure**: A width : height = 1.3; the bodies' outer extent is 8% of the frame width; in shot 01 their centres are 620 px apart horizontally at most (2r), 347 px vertically at most (2kr).

### 10.2 The common orbit and the centre

- One ellipse about C, semi-axes r and 0.56 r (r = 310 in Act 1). One turn per 8 bars (13.7 s), clockwise on screen, until T 93.534; then the turning dies away (time constant 6 s).
- Visible in shots 01–02, fading through 03. The centre glyph: full in 01–02, 45% in 03, flickering and broken in 04, fragments in 05, gone from 06.
- **Measure**: orbit width : height = 1 : 0.56; the bodies sit on the ellipse (within 3 px) while it is drawn.

### 10.3 The shells

- Two contours per body following its outline at 1.7× and 2.0× its size, breathing ±12% once per loop (two bars); after the snap they draw in to 75%.
- In sync in 02–04. From T 93.534 the breathing slides to opposite phase over two beats: in 05 one shell is at full expansion while the other is at full contraction.
- **Measure**: in 05 on an even downbeat, shell A's scale : shell B's scale ≈ 1.12 : 0.88.

### 10.4 The fields

- Concentric rings from each body, 88 px apart, travelling 205 px/s to 900 px. A's rings leave on the beats, B's on the off-beat 8ths (half a spacing out of phase), so where they cross they make a moiré band.
- From 05 B's rings flow inward. They fade out over the two bars after the snap.
- **Measure**: ring spacing 88 px; A's and B's rings at the midpoint between the bodies interleave (offset ≈ 44 px) until B's field reverses.

### 10.5 The thread

- Visible from T 42.105 (draws on over two beats), rim to rim, bending ±40 px on the loop as the bodies turn.
- Taut and trembling through bars 68–69; breaks once at B's rim at T 120.962; afterwards hangs from A only: a whip that dies within two seconds, then the free end swings once per bar.
- In 06–07 it trails 690 → 720 px behind A, its free end holding near x 1100–1130 in 07, at least 440 px short of B, and never reaches B. A drags it off-frame at the end of 07; in 08 it lies across the frame from the left edge to (1740, 522), 38 px higher at the right: about 1.1° from horizontal. Its residual vibration is about 3 px, with a soft re-excitation of 4 px on each downbeat (the 8-pulse loop), to the last frame.
- **Measure**: last-frame tilt ≈ 1.1°; free end within 10 px of (1740, 522).

### 10.6 Mistakes to avoid

- A second accent colour (a coloured body, a coloured field) — never. Only the thread is amber.
- The thread snapping twice, flickering, or reconnecting — it breaks once, at T 120.962, and never touches B again.
- The bodies approaching each other after the centre is gone — the separation only grows from T 117.5 on (the loop's ±12 px wobble ends there).
- A full-frame flash at the snap — the accent is one thin wave at the break point (photosensitivity, and the tone of the song).
- Filled, shaded bodies — they are contours only.
- A perfectly horizontal, perfectly still final line — it is nearly horizontal (≈1°) and still trembling a little.
- A shot that freezes on its last frame — every shot keeps its loop running to the cut, and the last shot to the end of the song.
- Bodies re-positioned per scene — always read them from the World block, or the cut jumps.
