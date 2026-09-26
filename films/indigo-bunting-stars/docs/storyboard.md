# Storyboard: North Is Where the Sky Stands Still

## Logline

A young indigo bunting watches the night sky turn all summer, learns that north is the one star that does not move, and in autumn hops away from it; when a planetarium turns the sky around Betelgeuse instead, the bird's inked footprints follow the false pole. Drawn as constellations of light on the void, with the funnel's paper as the negative.

## Numbers

- 120 bpm: beat 0.5 s = 12 frames, bar 2 s = 48 frames.
- 12 s = 6 bars of 4/4 = 288 frames at 24 fps, 1920×1080 (theme `negative`).
- 7 shots, each 1.5 to 2 s.

## Summary

| Order | Id | Start | End | Mode | Plate | Title |
|---|---|---|---|---|---|---|
| 01 | first-summer | 0 | 2 | schematic | A void | The first summer |
| 02 | sky-turns | 2 | 4 | schematic | A void | The sky turns |
| 03 | still-point | 4 | 5.5 | schematic | A void | The star that stays |
| 04 | funnel-autumn | 5.5 | 7 | schematic | B negative | Footprints away from the pole |
| 05 | false-pole | 7 | 8.5 | schematic | A void | A sky turned around Betelgeuse |
| 06 | funnel-false | 8.5 | 10 | schematic | B negative | Footprints away from Betelgeuse |
| 07 | night-flight | 10 | 12 | schematic | A void | South |

Every shot is `mode: 'schematic', post: 0.55`; the B shots add `grade: { invert: 1 }`. Plate switches at 5.5, 7, 8.5 and 10 s: never two within a second (check 9).

## Structure

- Act 1, bar 1 to bar 3 beat 2 (0 to 5.5 s): learning. The bird, the sky, the sky turning, the still point found.
- Act 2, bar 3 beat 3 to bar 5 (5.5 to 10 s): the test. Autumn funnel under the true sky; the planetarium's false pole; the funnel again, footprints rotated. The hinge — the false pole — lands on T 7.0, beat 3 of bar 4.
- Act 3, bar 6 (10 to 12 s): flight south under the true sky.
- Match cut 01 > 02: the same frame; 02 adds only the star trails on the downbeat. The bird, the sky and Polaris do not move across the cut.
- Match cut 04 … 06: the funnel is the same drawing; only the pole marker and the print cluster turn.
- Push-in: 03, zoom 1 to 1.45 about Polaris (1240, 280), `inOutSine` over the shot.
- Time device: the sky's turn angle (40° in 2 s: hours in time-lapse), then a planetarium's turn.
- The ending: 07 returns to 01's sky (the same stars at the same angle, Polaris lit), so the film loops.

## Conventions

- `T` is global seconds, `t` is shot-local seconds. Every timestamp in a shot entry is global T; convert to shot-local t (t = T − start) when animating, and check the beat arithmetic twice.
- Camera moves use `lib.camera(ctx, { x, y, zoom, rot }, fn)`: the world point (x, y) maps to the frame centre.
- Palette names come from the art bible (theme 2.1 and subject 2.2).
- Hard cuts everywhere.
- Scenes clamp `t` past their duration during transitions.

## World (owned by 01, copied verbatim into 02, 03 and 07)

- **Sky.** The named stars of G1, plus 420 background stars seeded `lib.hash('sky', i)` and a Milky Way band of 2600 faint motes from beyond Capella up through Cassiopeia: uniform over a disc of radius 1500 px about Polaris, r 0.6–2.2 px, alpha 25–85%, `star`, no halo under r 1.4. Named stars r 1.8–3 px with a `glowDot` halo (`rays: 0`) r 10 px.
- **Turn.** The sky turns counter-clockwise on screen about Polaris by `phi(T)` (radians). Every sky point p is drawn at `rot(p - P, -phi(T)) + P` (y-down screen: a negative angle is counter-clockwise).
  - `phi = 0` for T < 2;
  - `phi = 40° · inOutSine((T − 2) / 2)` for 2 ≤ T < 4;
  - `phi = 40° + 4° · (T − 4) / 1.5` for 4 ≤ T < 5.5;
  - `phi = −6° + 6° · (T − 10) / 2` for T ≥ 10 (a new night; 07 ends on 01's phi 0, so the loop seam holds).
- **Dust.** The theme's 140 motes keyed by global T (art bible 4).
- **Bunting, perched.** The constellation constructor of 10.1: bill tip (640, 690), body axis 40° down to the left, tail tip (380, 909), feet on the twig at (470, 866). The twig: one `lineSoft` contour from (150, 892) to (790, 846), 2 small side twigs.
- **Blink.** The bird's eye blinks with `lib.blinkAt(info.frame, lib.hash('bunting'))`.

## Shared geometry

All four tables are `points`: anchors that several shots read with `lib.geo(id).pt(name)`. Check 7 measures only profiles and outlines, so these hold nothing by themselves; the scenes that share them must read them, never copy the numbers.

### G1: the northern sky at phi = 0 (shots 01, 02, 03, 07; cut 01 > 02)

Azimuthal projection about Polaris, 16.6 px per degree, Dubhe at 150.6° from Polaris (y-down), from real RA and Dec. Polaris (1240, 280). Big Dipper: Dubhe (820.1, 505.3), Merak (744.7, 553), Phecda (651.9, 449.9), Megrez (692.3, 383.9), Alioth (663.9, 293), Mizar (649.3, 217.7), Alkaid (567.1, 139.7). Little Dipper: Yildun (1207.3, 222.8), ε UMi (1155.2, 165.5), ζ UMi (1075.2, 143.1), η UMi (1073.8, 96.6), Kochab (995.2, 154.4), Pherkad (981.4, 102.8). Cassiopeia: Caph (1727.7, 160.1), Schedar (1781.9, 225.2), γ Cas (1714.7, 265.8), Ruchbah (1720, 328.3), Segin (1654.1, 375.8). Thuban (819.4, 159.5), Capella (1550.4, 931.1). Off-frame at phi 0 and entering as the sky turns: Eltanin (1050.9, −338.8), Rastaban (987.3, −302.1), Alderamin (1485.5, −100.4).

Dubhe–Polaris over Merak–Dubhe: 5.34 (10.3 asks 4.5–5.5).

### G2: Orion on the planetarium dome (shot 05)

28 px per degree, Betelgeuse fixed at (760, 330): Betelgeuse (760, 330), Bellatrix (968.9, 359.6), Meissa (898.1, 259.2), Mintaka (922.2, 544.9), Alnilam (892.6, 571), Alnitak (860.7, 591.8), Saiph (811.2, 808.1), Rigel (1041.5, 767). Polaris on this dome, a plain star: (1490, 150).

### G3: the funnel (shots 04, 06)

Centre (960, 560), rim radius 400 px, pad radius 90 px. Pole markers: true north (960, 110) in 04; false north, towards Betelgeuse's side, 450 px from the centre up and to the left: (570, 335) in 06 (the vector (−390, −225)). Print clusters, 290 px from the centre opposite the marker: 04 (960, 850); 06 (1211, 705).

### G4: the perch (shots 01, 02, 03)

Bill tip (640, 690), eye (598, 706), tail tip (380, 909), feet (470, 866), twig ends (150, 892) and (790, 846).

## Shots

## 01 first-summer: The first summer

T 0 to 2, schematic void plate, hard cut in (film start).

### Composition

A landscape of night. The young bunting perched lower left (G4), head up, looking at the pole. The sky of G1 at phi 0 fills the frame; the Big Dipper upper left-centre, Polaris upper right-centre at (1240, 280), Cassiopeia at the right edge. Open void above and to the right of the bird: where it looks.

### Forms

- Plate: `void`, `voidLift` radial about (900, 500) radius 900, `voidEdge` corners; dust.
- Sky: G1 and the 260 background stars (World). Polaris carries the accent: `accent` core r 3, `accentGlow` halo r 14 (`lighter`), a `accentHot` pinpoint.
- Big Dipper edges: Alkaid–Mizar–Alioth–Megrez–Dubhe–Merak–Phecda–Megrez, `line` 1.2 px 55%. Little Dipper edges: Polaris–Yildun–ε–ζ–η–Pherkad–Kochab–ζ, `lineSoft` 1.2 px 40%.
- The bunting constellation (10.1), 16–22 nodes, `bird` edges, knocked out with `void` 88%, `birdSoft` inner contours for the folded wing (4 covert lines) and tail (3 lines), eye ring r 7 with a star pupil. `lib.glowFigure` for the contour, boiling on 12 fps.
- The twig, `lineSoft` 1.6 px, boiling.

### Overlays

A faint dashed sight line from the eye (598, 706) toward Polaris, `lineFaint` 1 px 10/8, drawing on over the last bar-half (T 1.0 to 2.0), stopping 60 px short of Polaris.

### Motion

- T 0: the whole sky is there; the Big Dipper edges draw on one per 8th from T 0 (6 frames each, `outExpo`), the last at T 1.5. Little Dipper edges draw on from T 0.25, one per 8th.
- Loop: the bird breathes (scale 1 ± 0.03 about the feet, one breath per bar); the head tilts 3° up on T 1.0 over one beat.
- Blinks on `blinkAt`.
- Nodes never move (phi = 0).

### Camera

Locked.

### Enter and exit

Opens the film; its first frame is 07's last composition. Exits into 02 on an identical frame.

### Subject

Young buntings learn the star pattern in their first summer; they learn the stars near the pole (10.1, 10.3).

### Sound

- T 0: night pad opens (sine-triangle, A minor add9, slow attack); a single glass ping A5 for Polaris.
- T 0, 0.5, 1.0, 1.5: soft glass plucks E5, G5, A5, C6 as the Dipper edges draw.

---

## 02 sky-turns: The sky turns

T 2 to 4, schematic void plate, hard cut in (match: the identical frame).

### Composition

The same frame as 01's last: the bird on the perch, the same stars. The sky turns about Polaris by `phi(T)` and every star draws its trail.

### Forms

As 01, plus trails: each star's arc about Polaris from its phi-0 place to its current place, `trail` 1.2 px, alpha 50% at the head fading linearly to 0 at the tail; named stars 1.4 px. The Dipper edges ride with their stars. Polaris draws no trail (it is the pivot).

### Overlays

A dashed guide ellipse about Polaris (radius 150, aspect 1), `lineFaint` 1 px 16%, with ticks every 10°, one tick lit (`lineSoft` 60%) at the current phi.

### Motion

- T 2.0 (downbeat): trails begin, phi eases `inOutSine` 0 → 40° by T 4.
- The bird holds the perch, breathing; its head follows Polaris (no head move, it already looks there). Blinks continue.
- The sight line from 01 stays drawn.

### Camera

Locked.

### Enter and exit

Enters on 01's frame with only the trails added. Exits on the turned sky at phi 40° with full trails.

### Subject

All stars turn around Polaris, counter-clockwise facing north; trails are concentric arcs, longer the farther out (10.3).

### Sound

- T 2: a low swell under the pad; a ticking of soft clicks on 16ths that accelerates with the turn and eases to T 4.
- T 3: pad chord moves to F maj7.

---

## 03 still-point: The star that stays

T 4 to 5.5, schematic void plate, hard cut in.

### Composition

Push-in about Polaris. The turned sky (phi 40°, drifting to 44°), faint trails, and the instrument on Polaris: the pivot found. The bird slides toward the lower-left corner as the camera closes in, half out of frame by the last frame.

### Forms

- Sky and trails as 02 at phi(T), trails at 30% of 02's alpha.
- Instrument on Polaris: ring r 6, cross ±16, dotted ring r 40, dashed ellipse r 150 with ticks every 10° (`lineSoft` 55%), two long diagonals through Polaris (`lineFaint` 16%).
- Pointer line: dashed `lineSoft` 1.4 px from Merak through Dubhe to Polaris, at their turned positions.

### Overlays

The instrument is the overlay.

### Motion

- T 4.0: the instrument's ring and cross snap on (`lib.hit`, 3 frames, `outBack`).
- T 4.5: the pointer line draws from Merak to Polaris over one beat (`outExpo`).
- T 5.0: the dotted ring pulses once (scale 1 → 1.25 → 1 over one beat), accentHot flash on the core.
- Loop: the instrument's dashed ellipse rotates slowly with phi.

### Camera

zoom 1 → 1.45 about (1240, 280), `inOutSine` over the shot.

### Enter and exit

Enters on the turned sky. Exits on a close instrument; the next shot is the negative.

### Subject

The pointers Merak–Dubhe lead to Polaris, 5 gaps beyond Dubhe; Polaris is a medium star picked out by stillness (10.3).

### Sound

- T 4: bell hit on Polaris (A5 + E6, long decay).
- T 4.5: a rising three-note glass figure E5 A5 E6 on 8ths with the pointer line.
- T 5: soft pulse thump.

---

## 04 funnel-autumn: Footprints away from the pole

T 5.5 to 7, schematic void plate under `grade: { invert: 1 }`, hard cut in (a plate switch).

### Composition

The Emlen funnel from above, centred (G3): rim r 400, pad r 90. The pole marker (instrument glyph at small size: ring r 6, cross ±12) outside the rim at the top (960, 110), accent. Prints cluster on the lower wall, away from the pole. Inverted: white paper, black ink.

### Forms

- The funnel: rim circle `line` 2.2 px; an inner lip circle r 384 `lineSoft` 1.2; pad circle r 90 `lineSoft` 1.6 and 26 short `lineFaint` stroke marks across it (the ink pad's texture); 24 radial guide rules from pad to rim `lineDim`.
- Screen top: a very faint mesh over the funnel, `lineDim` 1 px 12%, 22 px grid clipped to the rim (the see-through top).
- Prints: three-toed prints (3 forward toes 9–12 px, 1 hind toe 7 px, `line` 1.4 px) and short smudge strokes, 40 to 60 by the end, in a sector of 70° centred on straight down, between radius 110 and 390, seeded `lib.hash('funnel-autumn', i)`. Each print points outward.
- The bird, top view, small (110 px long): a `bird` contour, round head, short tail, drawn with the theme's line; it hops on beats from the pad into the lower sector and slides back.

### Overlays

A bracket from the pad edge to the print cluster's centre, `lineFaint` 1.4, end ticks 14 px: the direction measured, no numbers.

### Motion

- T 5.5: the funnel is there with 12 prints already down.
- T 6.0, 6.5 (beats): the bird hops to the wall (`lib.hit`, 4 frames, `outBack`) and 8–10 new prints appear on each hop (on the hop frame, each with a 2-frame ink spread).
- Loop: the bird's slide back takes one beat, ease `inOutSine`.
- T 6.75: the bracket draws on over 6 frames.

### Camera

Locked.

### Enter and exit

Enters as a plate switch to the negative. Exits on the full cluster. 06 is the same drawing with the marker and cluster turned.

### Subject

Emlen funnel: inverted paper cone, ink pad, see-through top; the restless bird's inked prints mark the direction; in autumn under the true sky they point away from Polaris (10.5).

### Sound

- T 5.5: paper thump (filtered noise burst, 90 Hz body) as the plate inverts; pad drops to a single low A2.
- T 6.0, 6.5: dry ink taps (short clicks, band 2–3 kHz), two per hop, the second 1/16 after.

---

## 05 false-pole: A sky turned around Betelgeuse

T 7 to 8.5, schematic void plate, hard cut in (a plate switch back).

### Composition

A planetarium. The dome's meridian ribs arc over the frame (5 arcs from the horizon line y 1000 to an apex above the frame, `dome` 1.2 px); the projector at bottom centre (960, 1000): two star balls (r 34) on a dumbbell stand, `lineSoft`. Orion (G2) upper left-centre, turning about Betelgeuse, which carries the accent. Polaris a plain star at (1490, 150), turning with the rest. The young bird small at lower left (a scaled copy of the perched constellation, 200 px long, at (300, 880)), looking up at Betelgeuse.

### Forms

- Orion edges: Betelgeuse–Bellatrix, Betelgeuse–Alnitak, Bellatrix–Mintaka, Mintaka–Alnilam–Alnitak, Alnitak–Saiph, Mintaka–Rigel, Meissa–Betelgeuse, Meissa–Bellatrix; `line` 1.2 px 55%.
- 180 background stars seeded `lib.hash('dome', i)` within the dome.
- Trails about Betelgeuse as in 02, `trail`.
- Projector beams: 6 very faint straight `dome` lines from the star balls to stars, 8% alpha.

### Overlays

The instrument glyph on Betelgeuse (ring r 6, cross ±16, dotted ring r 40), no ellipse.

### Motion

- T 7.0: the sky starts turning about Betelgeuse: psi = 30° · inOutSine((T − 7) / 1.5), counter-clockwise; trails grow.
- T 7.5: the instrument lands on Betelgeuse (`outBack`, 3 frames).
- The bird blinks, breathes.

### Camera

Locked.

### Enter and exit

Enters from the negative funnel. Exits into the funnel again.

### Subject

Emlen raised young buntings under a planetarium sky turning about Betelgeuse; they took Betelgeuse for north (10.4).

### Sound

- T 7: planetarium hum (two detuned sines, 55 Hz and 55.4 Hz) and a projector click; the pad returns in D minor.
- T 7.5: bell hit on Betelgeuse, a tritone away from 03's (D#5 + A5).

---

## 06 funnel-false: Footprints away from Betelgeuse

T 8.5 to 10, schematic void plate under `grade: { invert: 1 }`, hard cut in.

### Composition

04's funnel, identical. The pole marker now at (570, 335), towards Betelgeuse's side; the print cluster centred on the opposite wall toward (1211, 705).

### Forms

As 04 (copy the funnel constructor verbatim from 04). Prints in a 70° sector centred on the direction from the marker through the centre, seeded `lib.hash('funnel-false', i)`. The marker is drawn with the accent.

### Overlays

The same bracket as 04, now toward the new cluster.

### Motion

- T 8.5: 12 prints already down.
- T 9.0, 9.5: hops and new prints as in 04.
- T 9.75: the bracket draws on.

### Camera

Locked.

### Enter and exit

Enters as a plate switch; reads as 04 with the world turned. Exits into the flight.

### Subject

Birds raised under the Betelgeuse sky hopped away from Betelgeuse (10.4, 10.5).

### Sound

- T 8.5: paper thump.
- T 9.0, 9.5: ink taps.

---

## 07 night-flight: South

T 10 to 12, schematic void plate, hard cut in.

### Composition

01's sky at phi(T) = −6° → 0, Polaris lit with the accent. The bunting in flight (10.2), a constellation of 20–26 nodes, span 420 px, crosses from (1180, 470) to (560, 840): away from the pole, down and left. A dashed trail follows it.

### Forms

- Sky as 01 (World).
- The flying bunting, seen from below: `bird` edges and nodes, `birdSoft` primaries (4–5 lines per wing), knocked out.
- Trail: `lineSoft` 1.4 px 10/8 dashes behind the tail, fading to 0 over 500 px.

### Overlays

The instrument's small glyph on Polaris (ring r 6, cross ±16) at 40%.

### Motion

- T 10.0: the bird enters at (1180, 470) mid-stroke.
- Wings beat at 4 per second on 24 fps (a flap is 6 frames: 3 down, 3 up), full glide.
- The path eases `inOutSine` from T 10 to T 12, ending with the bird at (560, 840).
- T 11.5: Polaris pulses once, accentHot.

### Camera

Locked.

### Enter and exit

Enters from the negative funnel onto the night. The last frame is 01's sky with the bird near its perch, so the film loops.

### Subject

Buntings migrate at night by the stars, up to about 2,000 miles, heading south: away from the pole (10.2).

### Sound

- T 10: wing whoosh (filtered noise swept 400 → 2 kHz) on each beat; pad resolves to A minor add9.
- T 11.5: the Polaris ping A5 again, long tail into the loop.
