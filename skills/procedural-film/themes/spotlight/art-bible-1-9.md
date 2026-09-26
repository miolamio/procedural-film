<!-- Theme: spotlight (thick brush ink on a pool of cyan light in a dark teal void, violet joints). Sections 1–9 of docs/art-bible.md; step 3 of SKILL.md copies them in verbatim. -->

## 1. Frame

The canvas is 1080 px wide and 1920 px tall at 24 fps: set `width: 1080, height: 1920` in the timeline. The beam falls from the top of the frame, so the tall frame is the theme's own. A film may pick 1920×1080 instead; then move the pool's centre to (960, 500), keep its radius at 0.22 of the long side, and scale every other position below by 1920/1080 along x and 1080/1920 along y. Line widths (section 3) do not scale.
Every pixel value in this file assumes 1080×1920. The origin is the top-left corner and y grows downward.

- Shorts safe area as in `house`: anything the viewer must read sits inside x 60 to 940 and y 220 to 1540. The beam, the void, the audience and the guides run full bleed.
- One pool of light per shot, a disc of radius 380 to 460 px, centred on x 480 to 600 and y 760 to 980. It is the only lit thing in the frame, and the subject lives in it.
- The beam comes from a lamp above the frame, a little off the centre line (x 560 to 680), and widens to the pool's tangents.
- The subject enters the pool from outside it: from below (a hand, a head), from the dark at a side, or down the beam. Its far end stays in the void, where black ink on dark teal barely reads.
- The foot of the frame may hold a row of heads and shoulders, the audience, in silhouette with a rim of light on top (recipe 42). They sit in the Shorts interface band, so they are scenery, never must-read.

## 2. Palettes

Names below are the keys of `FILM.lib.pal`. The theme's colours (2.1) and the film's subject colours (2.2) both go into the marked 2.2 block of `src/lib.js`: paste `themes/spotlight/palette.js` first, then the subject rows. The house palettes stay in `lib.pal` for the engine and are not used by scenes.

### 2.1 Void, beam, ink, one accent

| Name | Hex | Use |
|---|---|---|
| tealVoid | #192A2C | Plate A and plate B base: the dark around the light |
| beamDeep | #2A6F6D | The halo outside the pool's edge, shadows cast on the pool, plate B's pool disc |
| beam | #43B8B4 | The pool at its edge, rim light, plate B guides and the audience's wire |
| beamHot | #7EF7DC | The pool's heart, dust in the beam, the light through a moth's wing, the reticle, plate B wire and text |
| sumi | #0B1011 | Every brush stroke and every silhouette |
| violet | #8E4FC2 | The one accent: joints |

The pool is a ramp, not a flat fill. Add one row to the ramps table in `src/lib.js` (beside `heat` and `terrain`):

```js
    spot: [[0, 'beamHot'], [0.28, 'beamHot'], [0.93, 'beam'], [1, 'beam']],
```

and paint the pool with `lib.rampStops('spot')` as the stops of one radial gradient (section 4).

### 2.2 Subject palette

REWRITE PER FILM. None by default: a subject is sumi ink on the light. Add at most one name, and only for a thing that must glow on its own (a lit window, a match flame); it lives in the pool like `beamHot`, never on the ink. Never a second accent. Enter it into the marked block in `src/lib.js` after the theme rows.

| Name | Hex | Use |
|---|---|---|
| … | #… | … |

### 2.3 The accent

Violet marks the joints of the one figure that acts: knuckles, the joints of the fingers, a wrist, a jaw hinge. Flat discs 16 to 20 px across, no contour, sitting in the gaps between the bones. It covers at most 1 percent of the frame (`accent.budget.area` 0.01), and it keeps its place across a plate cut (section 8). `--accent` swaps the colour (the lookbook suggests magenta); the discs stay.

## 3. Line

Thick black brush with pressure: `lib.inkPath` with a `pressure(u)` function, `color: pal.sumi`, a small `taper` ([3, 3]) so the ends stay blunt, `wobble` 2.2, `tremble` 0.8, `widthJitter` 0.45. The ink boils on the 12 fps clock (inkPath's default).

| Element | Width | Pressure |
|---|---|---|
| A long bone (forearm, shin) | 44 to 50 px | `0.42 + 0.86·e⁴`, e = \|2u − 1\|: thin shaft, swollen heads |
| A metacarpal or a phalanx | 24 to 36 px, thinner toward the tip | the same bone profile |
| A fingertip | 24 px | `0.4 + 0.85·(1 − u)⁴ + 0.4·u⁸`: a head at the joint, a small tuft at the tip |
| A closed silhouette (carpal pebbles, a moth's wing, a head) | 6 to 8 px contour over a `fill: pal.sumi` | none |
| Antennae, hair, a whisker | 4 px, `taper: [0, 10]` | none |
| Plate B wire | 2.2 to 3 px, `taper: 0`, `wobble` 0.8 | none |

Bones stop 9 px short of each joint on both sides, so every joint is a break in the ink, and the violet disc sits in the break.

## 4. Tone

- Light is the only tone. The pool is one radial gradient from `lib.rampStops('spot')`, its focus 40 px left and 70 px above the pool's centre (the lamp is up and to the right), reaching `beam` at the pool's edge.
- The halo: past the edge the same gradient steps to `beamDeep` at 95% and fades to nothing over 150 px. That ring is the glow of the beam; nothing else in the frame glows.
- The beam: a trapezoid from the lamp (70 px wide) to the pool's tangents, a linear gradient from `beamHot` at 20% to `beam` at 7%, under everything. Dust: 40 to 50 motes of 1 to 3.4 px in `beamHot` at 55%, drifting down the beam on twos, twinkling by `noise1`.
- Shadows: the figure's bones again, offset 46, 64 px away from the lamp, in `beamDeep` at 55%, clipped to the pool. Only on the pool, never on the void.
- Silhouettes in the void (the audience) take `lib.rimLight` in `beam`, `dir` pointing from the pool to the silhouette, width 5, threshold 0.35.
- No hatching, no stipple, no paper grain: `post: 0` on both plates.
- A memory or a dream may print the frame in two inks: `grade: { threshold: 1, duotone: ['sumi', 'beamHot'] }` on the shot. It drops the violet with every other colour, so a duotone shot spends no accent.

## 5. Plate language

- **The pool** (recipe 42) is the set: beam, pool, halo, dust, and the subject inside it. One pool per shot; a cut may move it, a shot never does.
- **Bone figures** (recipe 43) are built from bones, not outlines: each bone one pressure stroke between two joints, pebble carpals as filled ovals, violet joints in the breaks. A hand has four fingers of a metacarpal and three phalanges and a thumb of three; a skull is a long filled oval with two sumi eye holes that hold `beamHot` pupils; ribs are horizontal bone strokes, curved 10 degrees at the ends. Proportions are the film's own: long, thin, a little too many joints is fine, never an anatomy plate.
- **A moth or a small flyer** gives the light something to look at: four filled sumi wings that open and close once a beat, a `beamHot` eye on each upper wing, a thick body stroke, two thin antennae.
- **The audience**: 5 to 7 heads and shoulders in one or two rows along the foot of the frame, the front row larger, filled sumi, rimmed in `beam`.
- The frame outside the pool stays empty. No second light, no texture in the void.

## 6. Overlays

- **The reticle**: a 2 px `beamHot` ring (radius 80 to 110), four ticks across it and a broken centre cross, trailing the figure it watches by one drawing (1/6 s). On plate A at 60% and without crosshair lines; on plate B at 95% with dashed crosshairs to the frame's edges. At most one reticle per shot.
- Plate B adds the explanation: the pool as three dashed isolux rings (1, 0.72, 0.44 of the radius, each shifted toward the lamp), the beam's edges and axis dotted, a dimension bar with end ticks over the pool, and labels in the thin stroke font (section 9) inside the safe area.

## 7. Motion

### 7.1 On twos, the ink on 12 fps

Every pose, the moth's wings, the dust and the reticle come from `lib.onTwos(t)`; the ink boils on the 12 fps clock (inkPath's default boil), so each drawing is held two frames and the line changes with it. Nothing moves on 24 fps.

### 7.2 Timing

A hand rises 30 to 40 px over a bar and closes its fingers over the next one: each joint folds 10 to 40 degrees toward the hand's axis, the spread narrows. A moth circles once every 3 to 4 s and beats its wings twice a second. Beats land on a pose: a hit on a quarter note is a finger snapping to a new drawing, never an ease.

### 7.3 Determinism

Poses are closed forms of a clock that spans both plates (seconds from the first plate's start), so a cut keeps every joint. Dust, the audience and the carpals are rebuilt from seeds and constants each frame.

## 8. Match cuts and continuity

The cut holds on the silhouette: the figure's joints keep their place and their violet across plate A and plate B, and everything around them turns into wire. List the joints (or the figure's outline) at the cut frame in the storyboard's Shared geometry. A cut between two plate A shots holds on the pool instead: the pool keeps its centre and radius, the subject inside changes.

## 9. Wordmark

A thin sans in light: `lib.strokeText(ctx, word, x, y, { style: 'hand', size: 30 to 48, weight: size × 0.085, slant: 0, jitter: 0, boil: false, tracking: 2, color: pal.beamHot })`, upper case, on the void outside the pool, inside the safe area. On plate A only the wordmark; plate B uses the same setting for its labels and one dimension. Never `lib.text`, never on the pool, never in sumi.
