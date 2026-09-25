# Storyboard: Zero Gravity and No Attraction

The plan every agent works from. Source: the concert scenario S05_01…S05_08 (`.tmp/research/SUMMARY.md`).

## Logline

Two outlined bodies turn around a shared centre, tied by a thread; the centre fades, the thread snaps once on a downbeat, and the bodies drift apart into the void until one taut, trembling line is all that is left.
Every line is computed on a canvas and every sound is synthesised in Web Audio. The film runs the whole song, 2:52.042, on the song's own beat grid, and the whole film is one continuous world clock under hard cuts. On stage the video runs under the live song, so the grid matters more than the draft score.

## Numbers

### The grid, measured from the recording

Measured on `oxygenic/visualizations/zero-gravity/audio.mp3` (172.042 s) with librosa (onset envelope, low band under 120 Hz, beat-synchronous chroma, checkerboard novelty):

- **140.00 bpm.** A comb sweep of the onset envelope peaks at 140.01–140.05; the beat phase drifts under 15 ms over the whole song, so the grid is exactly 140.
- **First beat at T 0.105.** The first sample above −40 dBFS is at 0.104 s; onsets folded on the beat peak at 0.089–0.107 s.
- **Bar 0's downbeat at T 0.962.** The song opens on a two-beat pickup. The downbeat is the beat with the most sub-bass (kick) and the most chord change; the bass entry (42.105), the crashes (93.534, 144.962) and the re-entries after the breaks (66.105, 117.534) all fall on it.
- Beat = 3/7 s (10.29 frames), bar = 12/7 s = 1.714286 s, 16th = 0.107143 s. **Bar n starts at T 0.962 + 12n/7.**
- The music ends on the hit of bar 96 (165.534) and decays to silence by about 170 s; the file runs to 172.042.

### Windows on the grid

The scenario's windows were snapped to the nearest bar line except where the music marks a bar on the other side (agreed with the user):

| Command | Scenario | On the grid | Bar | Δ | What the music does there |
|---|---|---|---|---|---|
| S05_01 | 0:00.0 | 0 | pickup | 0 | first sound 0.104 |
| S05_02 | 0:14.0 | 14.676 | 8 | +0.68 | texture change, mids +3 dB |
| S05_03 | 0:42.0 | 42.105 | 24 | +0.11 | the bass enters, crash |
| S05_04 | 1:07.0 | **66.105** | 38 | −0.90 | re-entry hit after the break 63.1–66.1 (the nearest bar, 67.819, is a bar late) |
| S05_05 | 1:33.5 | 93.534 | 54 | +0.03 | crash |
| S05_06 | 1:58.5 | **117.534** | 68 | −0.97 | downbeat after the break 114.5–116.6 (the nearest bar, 119.248, is a bar late) |
| S05_07 | 2:25.5 | 144.962 | 84 | −0.54 | crash |
| S05_08 | 2:45.0 | 165.534 | 96 | +0.53 | the last hit, then the decay |
| end | 2:52.042 | 172.042449 | — | 0 | the end of the file |

Window lengths in bars: 8.56 (with the pickup) | 16 | 14 | 16 | 14 | 16 | 12 | 3.8.

- 172.042449 s = 4129 frames at 24 fps, 1920×1080.
- **Loops.** A pulse is an 8th, so the 16-pulse loop is two bars (3.428571 s, the scenario's working period) and the 8-pulse loop is one bar. Every loop is phased on bar 0: its cycles start on the even downbeats, and every window starts on an even bar, so each shot opens on a loop start.
- **One-off events**, each exactly once and outside every loop: the shells' birth (T 14.676), the thread's reveal (T 42.105, two beats), the phase flip (T 93.534, two beats), the snap (T 120.962, bar 70, agreed with the user: two bars of tension after the window opens, no stronger accent inside the window), the bodies' exit (from T 158.676, bar 92).
- The grid is offset from T 0 by 0.105 s and 140 bpm puts 16ths between frames, so the gate's check 4 warns on every boundary. The boundaries are exact on the song's grid; the warning is accepted.
- One shot per window, 6.5 to 27.4 s, longer than the house 1–3 s: the scenario fixes one command per window and the camera never moves, so a split would be an invisible cut. Each shot keeps its loop running to the cut and never holds a frame.

## Summary

| Order | Id | Start (T) | End (T) | Bars | Loop | Mode | Title | Scenario |
|---|---|---|---|---|---|---|---|---|
| 01 | shared-orbit | 0 | 14.676429 | pickup, 0–7 | 16 pulses | schematic | A shared centre | S05_01 |
| 02 | breathing-shells | 14.676429 | 42.105 | 8–23 | 16 pulses | schematic | Shells breathe together | S05_02 |
| 03 | visible-thread | 42.105 | 66.105 | 24–37 | 16 pulses | schematic | The thread shows | S05_03 |
| 04 | crossing-fields | 66.105 | 93.533571 | 38–53 | 16 pulses | schematic | Fields pass through | S05_04 |
| 05 | out-of-phase | 93.533571 | 117.533571 | 54–67 | 16 pulses | schematic | Out of phase | S05_05 |
| 06 | thread-release | 117.533571 | 144.962143 | 68–83 | 8 pulses | schematic | The thread lets go | S05_06 |
| 07 | far-drift | 144.962143 | 165.533571 | 84–95 | 16 pulses | schematic | Far apart | S05_07 |
| 08 | last-string | 165.533571 | 172.042449 | 96–end | 8 pulses | schematic | One string | S05_08 |

Every shot is on the **void plate** (art bible §5). The engine's `schematic` mode gives the fine light-and-dark noise that suits the dark plate; the paper plate is not used (the user asked for a dark screen, see art bible §0).

## Structure

- Act 1, S05_01–S05_02 (T 0–42.105): together. The shared centre and the common orbit hold the pair; shells arrive and breathe in sync.
- Act 2, S05_03–S05_05 (T 42.105–117.534): coming apart. The thread becomes visible and bends, the trails diverge, the fields cross, the centre dissolves (gone by bar 62, T 107.248), the breathing falls out of phase. The hinge is T 93.534 (bar 54): the turning starts to die away and the breathing flips.
- Act 3, S05_06–S05_08 (T 117.534–172.042): release. Tension for two bars, **the snap on the downbeat of bar 70, T 120.962**, then drift to the edges, the bodies leave the frame at the end of S05_07, and the thread alone lies nearly horizontal and trembles to the end of the song.
- One continuous world: every element is a closed-form function of global T (the World block, §Shared geometry). Cuts are hard cuts on the downbeats between continuous states; each shot adds or removes a layer on its downbeat. The camera never moves, so every cut is a continuity cut.
- Time device: the orbit angle itself (one turn per 8 bars until the hinge), the trails (the last 2.8 s of each body's path), and the breathing shells (one breath per loop).
- The film does not loop: it hands over to the next song. The last frame is the string (exit image for My Iron Lung).

## Conventions

- `T` is global seconds, `t` is shot-local seconds (t = T − start). Beat i of the song starts at T 0.105 + 3i/7; bar n at T 0.962 + 12n/7. In the World block these are `B(n)`, `W[i]` (window starts), `loopPh(T, period)`.
- The camera is static (identity) for the whole film.
- Palette names come from the art bible §2.
- Hard cuts only (`transitionIn` omitted). Scenes clamp `t` past their duration.

## Shared geometry

There is no silhouette match cut: the same bodies stay on screen across every cut, driven by one kinematic model that every scene copies verbatim (the **World block**, owned by `01-shared-orbit.js`, marked `// ==== WORLD ====` … `// ==== /WORLD ====`). A scene never re-derives positions; it copies the block and reads `WORLD.state(T)`. The anchors it uses are in `src/geo.js`.

### G1: frame anchors (all shots)

| Point | Pixels | Use |
|---|---|---|
| centre | (960, 540) | the shared centre C; orbit centre |
| farA | (299, 514) | body A's rest position in shot 07 (T 145–158.7, within ~25 px) |
| farB | (1581, 437) | body B's rest position in shot 07 |
| stringA | (−240, 560) | the thread's anchor (body A, off-frame) from T 164.676 |
| stringEnd | (1740, 522) | the thread's free end in shot 08 |

### World model (the World block implements exactly this)

B(n) = 0.962 + 12n/7 is the downbeat of bar n; W = [0, B(8), B(24), B(38), B(54), B(68), B(84), B(96), 172.042449] are the window starts. LOOP = two bars; loop phase = (T − B(0)) / LOOP.

- Orbit plane seen at an angle: position = C + (r·cos θ, k·r·sin θ), k = 0.56. Screen y grows down, so θ increasing turns clockwise on screen.
- Half-separation r(T), monotone cubic through keys (T, r): (0, 310), (W2, 310), (W3, 380), (W4, 420), (W5, 450), (T_SNAP, 460), (B(76), 530), (W6, 590), (end, 600). Plus a breath of ±4 px per loop until W2, a wobble of ±12 px per loop from W2 to W5 (the distance "changes smoothly"), and after the snap a kick of +50 px (time constant 0.35 s).
- Angle: θA = θ0 + Φ(T), Φ = ω0·T up to the hinge W4, then ω0·(W4 + τ(1 − e^−(T−W4)/τ)), ω0 = 2π per 8 bars, τ = 6 s, so the turning has all but stopped by the snap. θ0 is solved so θA(B(88)) = π: A sits left, B right in shot 07.
- θB = θA + π − δ(T): δ = 0.35·smoothstep over W4–W5 (B lags once the centre goes).
- Depth: scale = 1 + 0.1·sin θ·g(T), alpha likewise; g = 1 until W4, falling to 0 by W6.
- After the snap each body drifts on its own: A up (−32 px), B down (+35 px) by bar 90, plus a loop figure per body (A: ±6 px x once per loop, ±7 px y twice per loop; B: ±6 px x, ±8 px y, once per loop, other phases), never back toward the other.
- The exit, once: B leaves toward (2160, 700) with an ease-in over bars 92–94.5 (T 158.676–162.962); A eases to stringA over bars 92.5–95.5 (T 159.533–164.676). Shells, trails and the gap rule fade over 2.4 s from bar 92; the bodies themselves fade over bars 94.5–95.5, by which time both are at or past the frame edge.
- Body A a lens 160 × 124 px, body B a rounded three-lobe of base radius 65 px, each with 6 nested contours, own spin 0.25 and −0.18 rad/s. A body's outer contour is filled with the plate colour (88%) so lines behind it are hidden.
- The thread attaches where the ray between the bodies' centres leaves each outer contour.
- Thread: attached A↔B rim to rim from its reveal (W2) until the snap (T 120.962). Its bow (26 ± 14 px) and sway (±8 px) repeat every loop; from W5 it straightens and trembles. After the snap it hangs from A only: a three-mode whip decaying within about 2 s, then a swing that repeats every bar (8 pulses), 45% smaller from W6. Its chord turns to −0.019 rad (rising to the right) by B(95.5). Its length: the snap length (recoiling 30% and back within 1 s), 690 px at B(76), 720 px from W6 to B(92.5) (the free end stays ≥ 440 px short of B: no approach), then the full string length by B(95.5), so its free end reaches stringEnd while A is off-frame at stringA.
- The string, from B(94): a settle transient (22 px, time constant 0.8 s), then a residual tremble of 3 px on modes at 3, 7 and 19 cycles per bar, and from W7 a soft 4 px re-excitation on every downbeat: an 8-pulse loop that runs to the last frame.

## Shots

## 01 shared-orbit: A shared centre

T 0 to 14.676429 (the two-beat pickup and bars 0–7), schematic (void plate), first shot.

### Composition

The void plate, a faint dust field. The centre glyph on C (960, 540). The common orbit, a dashed ellipse 620 × 347 px about C. Body A and body B on opposite sides of the ellipse, turning clockwise. Large faint guide ellipses at 1.6× and 2.4× the orbit, two long diagonals crossing at C.

### Forms

Bodies: lens A and three-lobe B, six nested contours each in `line` (outer 2.2 px) fading to `lineSoft`, a 3 px core dot. Orbit: `lineSoft` 1.4 px dashes 10/8 with 72 ticks, the ticks nearest A lit on every beat. Centre glyph: 6 px ring, ±16 px cross, dotted 40 px ring, in `line` 70%.

### Overlays

Guide ellipses and diagonals in `lineFaint` 14–20%. The centre's heartbeat: one ring per beat of the song out of the centre glyph, from the first beat (T 0.105), in the orbit plane (aspect 0.56, 8 → 98 px, 1.6 px, outExpo over 9 frames, fading over the beat; brighter on each downbeat). No accent colour on screen yet.

### Motion

Loop (16 pulses): the separation breathes ±4 px once per loop; the heartbeat ring and the lit tick come on every beat. A and B turn together, one turn per 8 bars (about 385° over the shot). The bodies' contours boil on the 12 fps clock.

### Camera

Static.

### Enter and exit

Opens full: frame 0 is the complete composition (the heartbeat starts on the first beat). Exits into 02 with every element in place.

### Subject

Two bodies on one soft common path; a slow joint turn; distance almost constant.

### Sound

- T 0.105 (swell): the first beat. A low D drone and an airy pad fade in over one bar from T 0; a soft felt pulse on every beat, low in the mix — the orbit's heartbeat.

---

## 02 breathing-shells: Shells breathe together

T 14.676429 to 42.105 (bars 8–23), schematic, hard cut.

### Composition

As 01. Around each body its own shell: two contour lines following the body's outline at 1.7× and 2.0×, the outer dashed.

### Forms

Shells in `shell` (outer dashed 1.1 px, 12/9; inner solid 1.3 px), 12 short radial ticks outside the inner shell, brightest at full inhale.

### Overlays

Guide ellipses at 10%. Orbit and centre glyph stay.

### Motion

Once, T 14.676 (downbeat of bar 8): both shells grow out of the bodies' rims, outBack over 6 frames.
Loop (16 pulses): the shells breathe one breath per loop (scale 1 ± 0.12), peaks on the even downbeats, in sync; the orbit keeps turning.

### Camera

Static.

### Enter and exit

Enters on the shells' birth. Leaves both shells at full inhale on the cut into 03 (bar 24 is an even downbeat).

### Subject

Each body gets its own shell; the shells breathe in sync; the shared centre holds.

### Sound

- T 14.676429 (cut): a soft chime (D6, A5); the pad opens and breathes with the shells, one filter swell per loop; the chords turn every loop (Dm9, Bbmaj7, Gm9, A7sus4).

---

## 03 visible-thread: The thread shows

T 42.105 to 66.105 (bars 24–37), schematic, hard cut.

### Composition

The orbit fades out over four bars and each body leaves a trail (its last 2.8 s of path, drawn over the shells). The trails spiral outward: the paths diverge. The thread appears between the bodies' rims in the accent colour and bends. A distance bracket runs parallel to the thread, 44 px off it on the side away from the bow, with a small tick every 60 px.

### Forms

Thread: `thread` 2.4 px core with a `threadGlow` halo 9 px at 22%. Trails: `lineSoft` fading from 60% to 0 along their length. Bracket: `lineFaint` 1.4 px with 14 px end ticks.

### Overlays

The distance bracket (no numbers). The centre glyph dims to 45%.

### Motion

Once, T 42.105 (downbeat of bar 24): the thread draws from A's rim to B's over two beats (reveal, inOutSine), with a bright nib on the tip.
Loop (16 pulses): a sideways bow (26 ± 14 px) and a sway (±8 px) repeat every loop; the separation wobbles ±12 px on the same loop while it grows 310 → 380 px.

### Camera

Static.

### Enter and exit

Enters on the thread's first stroke. Exits with the thread whole, the orbit gone.

### Subject

Trajectories diverge; the connection becomes visible; the thread bends; the distance changes smoothly.

### Sound

- T 42.105 (hit): the thread appears — one glassy pluck on A4 with a long tail; a high harmonic on the reveal's end (T 42.962). A faint pluck on each even downbeat after (the loop's bend).

---

## 04 crossing-fields: Fields pass through

T 66.105 to 93.533571 (bars 38–53), schematic, hard cut.

### Composition

Each body emits a field: concentric rings expanding outward, one ring per beat, 88 px apart, to 900 px. A's rings leave on the beats, B's on the off-beat 8ths, so the two fields cross in a moiré band between the bodies. Thread, shells and trails stay.

### Forms

Field rings: `fieldA` and `fieldB`, 1.2 px, alpha 50% at the body falling to 0 at 900 px. Centre glyph 30%, broken ring.

### Overlays

None added.

### Motion

Once, T 66.105 (downbeat of bar 38): the first ring of A's field leaves its shell; B's first ring on the next off-beat 8th.
Loop (16 pulses; one ring per beat each): rings travel 205 px/s (88 px per beat); the shells breathe; the thread bends. The centre glyph flickers on every downbeat and its dotted ring loses dots across the window.

### Camera

Static.

### Enter and exit

Enters on the first ring. Exits with both fields full.

### Subject

Each body makes its own field of lines; the fields pass through each other with a different phase.

### Sound

- T 66.105 (cut): two soft arpeggio voices enter in 8ths, one on the beats, one on the off-beats, panned left and right (the two fields), a four-bar pattern.

---

## 05 out-of-phase: Out of phase

T 93.533571 to 117.533571 (bars 54–67), schematic, hard cut (the hinge).

### Composition

The centre glyph breaks into fragments that drift out and vanish by bar 62. B falls behind A (θ lag grows to 0.35 rad), the turning dies away. B's field reverses and flows inward.

### Forms

As 04. Centre fragments: the cross and ring cut into short arcs and dashes in `line`.

### Overlays

A thin phase mark: a short arc beside each shell, lit when that shell is at its widest.

### Motion

Once, T 93.534 (downbeat of bar 54): the shells' breathing slides from in phase to opposite phase over two beats; B's field reverses.
Loop (16 pulses): one shell is at full expansion while the other is at full contraction, every loop; the phase marks light in turn. Centre fragments drift outward about 100 px over eight bars, fading.

### Camera

Static.

### Enter and exit

Enters on the hinge downbeat. Exits with no centre left and the pair almost still, turned horizontal.

### Subject

Coordinated motion is broken: one contour reaches full expansion while the other contracts.

### Sound

- T 93.533571 (cut): a two-note chime; the pad splits into two detuned layers beating against each other, breathing a bar apart; the felt pulse drops out; the arpeggios lag a 16th and thin out by bar 62.

---

## 06 thread-release: The thread lets go

T 117.533571 to 144.962143 (bars 68–83), schematic, hard cut.

### Composition

Bars 68–69: the thread straightens and trembles. Bar 70 downbeat: the thread breaks at B's rim. Its free end whips back, then swings, hanging from A. The bodies are kicked apart and keep drifting to the edges.

### Forms

At the break: one thin accent wave (`threadHot` 2 px) centred 20 px inside the break point toward A, 6 → 130 px over 6 frames, fading, drawn under the bodies; 9 sparks. The thread after the break: the same line, its free end tapering over its last 8%.

### Overlays

None besides the break wave.

### Motion

T 117.534–120.962: tremble amplitude grows 0 → 5 px; the bow flattens; a bright core runs along the thread (tension).
**Once, T 120.962143 (downbeat of bar 70): the snap.** The thread detaches from B, visible on frame 2904, the first frame after the beat. The free end recoils 30% toward A in 6 frames and whips with a damped wave (3 modes, gone within about 2 s). The fields slow and fade out over two bars; the shells draw in to 75%.
Loop (8 pulses): from bar 70 the free end swings from A once per bar (two modes); each body drifts on its own 16-pulse figure. Separation 460 → 640 px by the shot end (spline plus kick).

### Camera

Static.

### Enter and exit

Enters in tension. Exits with the thread hanging free from A, the bodies far apart.

### Subject

The thread detaches from one body, once, on the agreed accent; the free end oscillates; the bodies keep drifting.

### Sound

- T 117.533571 (swell): a riser for two bars — a tick, a bowed tone climbing A3 → A4 and a noise swell.
- T 120.962143 (hit): the snap — a bright string pluck with a noise crack and a sub drop into a long reverb; the riser, the drone and the pad cut dead. The only hit of its kind in the film. From bar 72 a soft low pluck on every downbeat (the swing) and a high fifth opening under it.

---

## 07 far-drift: Far apart

T 144.962143 to 165.533571 (bars 84–95), schematic, hard cut.

### Composition

A on the left near farA (299, 514), B on the right near farB (1581, 437): about 1280 px of void between them, dust only. The thread trails from A toward the right, 720 px, its free end near x 1100–1130, at least 440 px short of B. Shells drawn in and slow. From bar 92 both bodies leave the frame, B right, A left, and A's pull lays the thread across the frame.

### Forms

Bodies as before, shells at 50%. Thread as before, free end tapered. A faint dotted rule 190 px below the pair (`lineFaint` 55%, dash 4/9, end ticks) marks the gap.

### Overlays

The gap rule only; it fades with the shells as the bodies leave.

### Motion

Loop (16 pulses): each body drifts on its own figure, barely turning; the thread's free end swings once per bar, smaller than in 06. No approach.
Once, from T 158.676 (bar 92): B eases out to the right (off-frame by bar 94.5); A eases out to the left (bars 92.5–95.5), dragging the thread until it lies across the frame to stringEnd; the string's settle transient starts at bar 94.

### Camera

Static.

### Enter and exit

Enters in the void. Exits with both bodies gone and the thread across the frame, still settling.

### Subject

The bodies at the edges, much emptiness between; slow independent drift; no coming back. Then they leave.

### Sound

- T 144.962143 (cut): the void — the high held fifth; one soft bell per bar, D6 and A5 in turn.
- T 158.676429 (sfx): the bodies leave — a tick and a slow falling glide.

---

## 08 last-string: One string

T 165.533571 to 172.042449 (bar 96 to the end of the song), schematic, hard cut.

### Composition

Only the thread: from the left edge (its anchor at stringA, off-frame) to its free end at stringEnd (1740, 522), rising about 38 px over its length: nearly horizontal. Nothing else but dust at half strength.

### Forms

Thread only: `thread` core 2.4 → 2.6 px, halo 9 px.

### Overlays

None.

### Motion

Loop (8 pulses): a residual tremble of about 3 px (modes at 3, 7 and 19 cycles per bar) with a soft 4 px re-excitation on every downbeat. It never stops before the last frame.

### Camera

Static.

### Enter and exit

Enters with the string settled. The last frame: one taut line with a small residual vibration — the hand-off to the strings of My Iron Lung.

### Subject

Only the thread remains, stretched almost horizontally; small residual oscillation.

### Sound

- T 165.533571 (cut): a single sustained string tone on D3 with decaying vibrato; it rings to the end.
