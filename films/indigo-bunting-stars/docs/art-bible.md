# Art bible: North Is Where the Sky Stands Still

The visual rules every scene follows.
Where this file and a scene brief disagree on a colour, weight or rule, this file wins.
Where this file and `docs/storyboard.md` disagree on a position or a time, the storyboard wins.

Theme: negative (`themes/negative/` in the skill; its `theme.json` is copied to `docs/theme.json`).

Sections 1 to 9 are the theme, copied verbatim from `themes/<id>/art-bible-1-9.md` — change them only after a fresh reference analysis (the skill's `templates/reference-analysis.md` shows the method). Section 2.2, the identity tints the theme asks for, and 10 are rewritten per film from the captured research.

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

The bunting and the sky it learns. All cool: the bird is a faint indigo-white, never a warm hue. The accent (2.3) stays the theme's.

| Name | Hex | Use |
|---|---|---|
| bird | #D8E1FF | The bunting's primary contour and its constellation edges |
| birdSoft | #93A4DA | The bunting's inner contours (wing coverts, tail feathers), its eye ring |
| birdDeep | #4E5FA0 | The faintest inner construction of the bunting |
| trail | #B9C3DA | Star trails, the arcs the sky draws as it turns |
| dome | #39435E | Planetarium dome ribs and the projector's guide lines |

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
- Glow is allowed on the accent, on constellation nodes, on glowing figures and on point sources only: `lib.glow` (a lit path), `lib.glowFigure` (a lit contour figure) or `lib.glowDot` (`rays: 0` for a star), all in `lighter` blend, never `shadowBlur` or `ctx.filter` on a full frame (check 6).
- The plate: `void` base, a radial lift to `voidLift` around the subject, `voidEdge` in the corners. The engine's schematic noise sits on top at 55%: every shot is `mode: 'schematic', post: 0.55`.
- Dust: about 140 motes, seeded, drifting at most 6 px/s, twinkling on the boil clock, keyed by global T so the field is the same in every shot.
- A figure's contour is knocked out with `void` at 88% so paths, rings and trails pass behind it, not through it.

## 5. Void plate language

- **Constellation** (shot-types recipe 32). A figure is a set of star nodes joined by thin edges. Edges draw on node to node (`outExpo`, 6 frames each) and may unlink; a node never moves off its place in the figure. A constellation needs 7 to 30 nodes to read, and one edge in five may be missing.
- **Instrument.** Relationships are shown as an instrument: a centre glyph (ring r 6 px, cross ±16 px, dotted ring r 40 px), a dashed ellipse with ticks, faint guide ellipses and two long diagonals. As the relation weakens, the instrument dims, breaks and disappears.
- Measurement is brackets and rules, never numbers. No text in any shot except the optional wordmark (section 9).
- Depth is an ellipse seen at an angle (aspect about 0.56): what is on the near half is drawn 10% larger and brighter.
- **Plan B — the negative.** The second plate is the same frame inverted: void turns to paper-white, light lines to black. It is the timeline field `grade: { invert: 1 }` on the shot; the scene draws the void plate as usual. Every colour inverts with it, the accent included: orange reads as its complement, a clear blue, on plate B. That is the look, not a bug; do not pre-invert the accent to keep it warm. An inverted plate lasts at least a beat, and a film switches between plates at most once per second (check 9 counts every switch as a full-frame flash).

## 6. Overlays

At most one overlay per shot besides the permanent instrument: a heartbeat ring, breath ticks, a distance bracket, phase marks, a break wave or a gap rule. Overlays use lineFaint or line; only the accent's own event may use accent colours.

## 7. Motion

### 7.1 Weightless

Positions move at a full 24 fps and glide: no on-twos stepping. Only contours boil, on the 12 fps clock.
Characters hold still and blink: a blink is exactly 2 frames with no in-between, on an uneven schedule (gaps of 7 to 38 frames, never a regular period): `lib.blinkAt(info.frame, lib.hash(<name>))`. A line-icon character (`lib.lineIcon`, recipe 33) is flat line and does not boil; a glowing figure (`lib.glowFigure`) boils.

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

**Film note on 2.3.** The accent is the still point of the sky: Polaris in every shot except 05 and 06, where Betelgeuse is the false pole and takes it. Only one of the two carries the accent in any frame; the other is a plain `star` node.

## 10. Subject reference

Sources checked on 2026-09-26: `.tmp/research/stellar-migrant.txt` (Smithsonian's National Zoo, "A Stellar Migrant"), `.tmp/research/stars-of-navigation.txt` (Diane Porter, birdwatching.com), `.tmp/research/indigo-bunting.txt` (Wikipedia), `.tmp/research/emlen-funnel.txt` (Wikipedia; Emlen & Emlen 1966); primary papers Emlen 1967 (Auk 84) and Emlen 1970 (Science 170:1198). Index: `.tmp/research/SUMMARY.md`.

### 10.1 The bunting, perched (shots 01, 02, 03)

A small finch-shaped songbird, 12–14 cm long. It is drawn as a constellation (recipe 32): star nodes on its outline joined by thin `bird` edges, a knocked-out body, a few `birdSoft` inner contours for the wing and tail feathers.

- Side view facing right, perched on a twig, head tilted up 20–30° towards the pole.
- Length bill tip to tail tip 340 px. Bill 8% of the length (27 px): short, conical, deep at the base. Head about 20% (68 px across), round, no crest. Body depth 26% (88 px). Tail 38% (130 px), straight, a shallow notch at the tip.
- The folded wing tip reaches the base of the tail. Legs short; the toes wrap the twig.
- 16 to 22 nodes: bill tip, forehead, crown, nape, back ×2, wing shoulder, wing tip, tail base, the two tail tips, undertail, belly, breast, throat, chin; the eye is a ring (r 7 px, `birdSoft`) with a star pupil.
- A young bird: it is learning in its first summer. On this theme it has no colour, only line.

**Measure:** bill length to total length 0.07–0.09; tail to total 0.35–0.40; body depth to total 0.24–0.28.

### 10.2 The bunting in flight (shot 07)

- Seen from below at a slight angle, wings spread in a downstroke-up pose.
- Wingspan 19–22 cm against 12–14 cm length: span to length 1.55–1.65. Drawn span 420 px, length 260 px.
- Wings broad and rounded at the tip, 9 primaries suggested by 4–5 inner lines; tail closed, notched.
- It flies away from the pole: in the frame, down and to the left of Polaris.

**Measure:** span to length 1.55–1.65.

### 10.3 The northern sky

- All stars turn around Polaris, the one star that stays still. Seen facing north they turn **counter-clockwise**, 15° per hour.
- Big Dipper, 7 stars: bowl Dubhe, Merak, Phecda, Megrez; handle Alioth, Mizar, Alkaid. The two outer bowl stars, Merak then Dubhe, point at Polaris; Polaris lies about 5 times the Merak–Dubhe gap beyond Dubhe.
- Little Dipper, 7 stars: Polaris is the end of its handle; its bowl (Kochab, Pherkad) is the far end.
- Polaris is a medium-bright star, not the brightest in the sky. It is picked out by being still and by the accent, not by size.
- Star trails are concentric circular arcs about Polaris; each arc's length is the same angle for every star, so outer arcs are longer.
- Birds learn from the stars near the pole: covering the northern sky breaks their orientation.

**Measure:** Dubhe-to-Polaris distance over Merak-to-Dubhe 4.5–5.5; every trail arc centred on Polaris within 2 px.

### 10.4 Orion and the false pole (shot 05)

- Orion as seen: Betelgeuse upper left (the shoulder), Bellatrix upper right, the belt of three (Alnitak, Alnilam, Mintaka) slanting across the middle, Saiph lower left, Rigel lower right.
- Emlen's planetarium turned the projected sky around Betelgeuse instead of Polaris. Young birds raised under it treated Betelgeuse as north.
- The planetarium: a dome (ribs as meridian arcs) and a projector at the bottom centre, a dumbbell of two star balls on a stand.

**Measure:** belt spacing even within 10%; Betelgeuse above and left of the belt, Rigel below and right.

### 10.5 The Emlen funnel (shots 04, 06)

- An inverted cone of blotting paper, an ink pad on its floor, a see-through top so the bird sees the sky. The restless bird (Zugunruhe) hops onto the sloping wall and slides back, leaving inked footprints.
- Drawn from above: rim circle r 400 px, ink pad r 90 px, both centred; faint radial guide lines on the wall. The footprints are small three-toed prints and short smudge strokes, clustered in one sector of about 70°: the direction the bird wants to fly.
- Autumn under the true sky: the cluster is on the side away from Polaris (south). Under the Betelgeuse sky: the cluster is on the side away from Betelgeuse.
- Printed on plate B (the negative), so the paper is white and the ink is black: draw paper as the void plate and ink in `line`.

**Measure:** cluster's middle direction opposite the pole marker within 10°; prints lie between the pad and the rim.

### 10.6 Mistakes to avoid

- The pole star drawn huge and bright — it is ordinary in brightness; the accent and its stillness mark it.
- The sky turning clockwise — facing north it turns counter-clockwise.
- Polaris moving, or a trail arc not centred on it — nothing moves at the pole.
- A long thin warbler bill or a crest — the bunting has a short conical seed bill and a round head.
- A deeply forked swallow tail — the tail is straight with a shallow notch.
- Footprints spread evenly round the funnel — they cluster in one sector away from the pole.
- Betelgeuse on the right of Orion — it is the upper-left shoulder, Rigel is lower right.
- Colouring the bird blue — the young bird is line only on this theme, `bird` and `birdSoft`.
