<!-- Theme: xerox (a stencil poster run through a photocopier: bold black stencil with bridges on white paper, cut to pure black and white, stencil type, on threes under a jittering copy; plate B is the negative). Sections 1–9 of docs/art-bible.md; step 3 of SKILL.md copies them in verbatim. -->

## 1. Frame

The canvas is 1080 px wide and 1920 px tall at 24 fps: set `width: 1080, height: 1920` in the timeline. It is a flyer, a sheet of paper stood on end. A film may pick 1920×1080 instead; then scale every position and size below by 1080/1920 and recompose the column into a row (the wordmark left, the figure centre, the band as a column on the right). Bars, bridges and keylines (section 3) do not scale: they are set on the short side, which is 1080 px either way.
Every pixel value in this file assumes 1080×1920. The origin is the top-left corner and y grows downward.

- Must-read content sits inside the title-safe box: x 54–1026, y 96–1824.
- The sheet is a poster in three stacked zones: the wordmark and one line under it in the top sixth (cap lines at y 100 to 290), one stencil figure in the middle (its head at y 560 to 820, its soles on y 1510), and a torn toner band across the foot (from y 1600 to the edge) with a knocked-out line, a counter and a grey scale in it.
- Toner covers 25 to 45 percent of plate A. The figure and its ring are the heaviest mass; paper shows round them on both sides, so the silhouette reads at thumbnail size.
- One figure carries the shot, 900 to 1150 px from the antenna tips to the soles, centred on x = 540. A second figure is smaller and stands to one side, never overlapping the first.

## 2. Palettes

Names below are the keys of `FILM.lib.pal`. The theme's colours (2.1) and the film's subject colours (2.2) both go into the marked 2.2 block of `src/lib.js`: paste `themes/xerox/palette.js` first, then the subject rows. The house palettes stay in `lib.pal` for the engine and are not used by scenes.

Two inks and two greys. The greys never reach the screen: the threshold (section 4) turns `smudge` to toner and `glare` to paper, so they are how a scene tells the copier which way a soft thing falls.

### 2.1 Copy palette

| Name | Hex | Use |
|---|---|---|
| sheet | #FFFFFF | Plate A base, bridges, keylines, knocked-out type; the carrier's paper |
| toner | #141414 | Every stencil fill and bar, type on paper, the band; the carrier's toner |
| smudge | #4A4A4A | The dark end of a ramp the threshold cuts: the near end of a cast shadow, the dark side of static |
| glare | #C4C4C4 | The light end of such a ramp: the far end of a shadow, a rolling bar in static |

### 2.2 Subject palette

REWRITE PER FILM. None by default: a subject is toner on sheet. Add greys only, as more ramp ends, and say on which side of mid grey (`#808080`) each falls. Never a hue: the threshold grade drops it before the copy does. Enter it into the marked block in `src/lib.js` after the theme rows.

| Name | Hex | Use |
|---|---|---|
| … | #… | … |

### 2.3 No accent

The theme has none: a copy has no colour, and `grade: { threshold: 1 }` and the carrier's `mono` both drop it. The budget (check 12) holds the engine's `magenta` to one frame at most, so a stray house burst or flash shows up as a warning.

## 3. Line

There is no line. Everything is a stencil: a flat toner shape, or a bar (a thick stroke with round ends, drawn as one fill), cut by two kinds of white gap.

| Element | Size | Colour |
|---|---|---|
| Limbs, neck | bars 58 to 70 px | toner |
| Antenna, cable | bars 16 to 18 px, ball ends r 19 | toner |
| Bodies, heads, feet | filled polygons and rounded rects, corner r 18 to 36 | toner |
| Ring | a 58 px band, r 280 to 330 round the head | toner |
| Bridge | a 16 to 20 px white cut straight across a bar or band | sheet |
| Keyline | an 11 px white margin round every shape laid over another | sheet |

- **Bridges** break every loop a real stencil could not hold: the ring (six, stepping round), the counter of a letter (`strokeText` stencil cuts its own), a limb at the knee and elbow, a coat down its front and across its hem, the base of each antenna. A white island inside toner (a knob, a screen, an eye) is allowed only if it is small; anything larger opens to the edge.
- **Keylines** separate overlapping shapes: stroke the front shape in `sheet` at the bar width plus 22 px (or 22 px round a fill), then fill it in toner. Where an arm lies on a coat, a cable crosses the ring or the head sits in the ring, the white gap is the drawing.
- Never `inkPath`, `hatch`, `stipple` or `lib.text`: pressure, wobble and hatching are a pen's, and this is a knife.

## 4. Tone

- **Threshold.** Plate A is `grade: { threshold: 1 }`, plate B `grade: { invert: 1, threshold: 1 }`: every pixel goes to toner or paper at mid grey, with a few grey steps on edges only. The carrier then adds its own greys (pale dropout bands, faint streaks); nothing else is grey on screen.
- **Ramps for the cut.** A soft thing is drawn as a ramp between `smudge` and `glare` and left to the threshold: a cast shadow is the figure's own parts flattened onto the ground (y × −0.085 about the sole line, skewed 0.42 away from the light) and filled with a ramp from `smudge` at the feet to `glare` at the head, so it ends in a hard edge a little past halfway. Static is a `lib.noisePlate` (scale 7, threshold 0.5, soft 0.5, grain 0.75, `res` 0.5) in toner, with a `smudge` and a `glare` bar rolling through it.
- **The grey scale.** A copier's test strip, ten steps from black to white in a white frame, sits in the band: the threshold cuts it in half, and the dark half merges with the band so only its white ticks remain. It says what the copy does to tone, in the frame.
- **The carrier** (the timeline's, from `theme.json`): `xerox` with contrast 0.8, exposure 0.4, speckle 0.5, toner 0.55, dropouts 0.7, streaks 0.6, jitter 3. Toner skips break the big fills into white flecks, pale dropout bands run down the whole sheet, thin streaks hold their place. Plate B shots set `carrier: { kind: 'xerox', ..., toner: 0.3, dropouts: 0.5 }`: on the negative every skip is a white fleck on black paper, and at 0.55 they read as snow, not as a copy.
- No grain: every shot is `post: 0`. The copy is the texture.

## 5. Plate language

- **The stencil figure** (recipe 48). Built from parts, back to front: two leg bars with rounded feet, a coat (a trapezoid, shoulders narrower than the hem, a collar notch cut out), two arm bars ending in round hands, a neck bar, then the head. Every part gets a keyline; the bridges are cut after all the parts are down. Give a film's figure its own head and one object of its own. The fixture's figure has a television for a head, static on the screen, knobs and a grille knocked out of the box, and holds its own unplugged cord: a cable from the back of the set to one hand, and a plug swinging below it. Do not copy a known character or any band's artwork: the figure is the film's own.
- **The ring.** One broken ring behind the head, the figure's halo and the signal that is no longer there. Its six bridges step round by 6° a drawing.
- **The screen.** A white window knocked out of the head, clipped: static (a new noise field every drawing, from six seeds in turn) with a rolling bar, or, for one drawing each half second, a pair of eyes, two upright toner ovals and one lid, the only sign that someone is still inside.
- **The band.** A toner block across the foot of the sheet with a torn top edge (`noise1` plus a hash, fixed), and printed matter knocked out of it in sheet: one line of stencil type (92 px caps), a counter, the grey scale.
- **The counter** (recipe 48) runs in frames towards midnight, `HH:MM:SS:FF`, stepping a drawing at a time; in the fixture it reads `00:00:00:00` on the cut to plate B. Dead air is a time as much as a place.
- **Plate B — the negative.** The same scene under `grade: { invert: 1, threshold: 1 }`: toner paper, white figure, white type, a white band with toner type in it. The scene draws nothing different.

## 6. Overlays

None. Type, the counter and the grey scale are printed on the sheet and copied with it; there are no guides, rings of data or labels over the picture.

## 7. Motion

### 7.1 On threes, under a copy on 12

Every drawing holds three frames: the drawing index is `floor((T − T0) · 8)` on the global clock, and every moving thing (the plug's swing, the ring's bridges, the static seed, the eyes, the wordmark, the counter) is a function of it. The carrier moves on its own 12 fps clock: each boil drawing is a new copy that lands up to 3 px off with new toner skips. The two clocks beat against each other (a copy changes inside a drawing and a drawing inside a copy), which is the theme's shake. Nothing moves at 24 fps.

### 7.2 Timing

- **The wordmark** comes in letter by letter in a shuffled order, four letters on frame 0 and the word whole by the fifth drawing, then on any later drawing a letter drops out (7 percent, a toner skip in the type) or feeds 10 px wide (6 percent) for that drawing only. Stencil type at 132 px caps, `tracking` 0.6, centred; the line under it at 40 px, `tracking` 2.
- **The plug** swings as a pendulum with two sines of the drawing index (0.32 rad at 0.95 per drawing plus 0.12 rad at 2.3), 150 px below the hand.
- **Eyes** in the screen show on drawings where `n mod 4 = 2`: once a half second, three frames.
- A cut lands on a drawing boundary: shot starts are on a multiple of 1/8 s.

### 7.3 Determinism

Every value is a function of the drawing index, seeds and constants. The static cycles six seeds, each plate cached by `noisePlate`; the carrier keys its copies by the boil clock. Nothing is kept from the last frame.

## 8. Match cuts and continuity

The cut holds on the figure's silhouette. Plate A to plate B keeps the scene and inverts it: every toner pixel of the figure is a paper pixel on the other side of the cut, and the drawing index runs on (the ring's bridges and the plug take their next step, the counter ticks). List the figure's parts and T0 in the storyboard's Shared geometry. A negative plate lasts at least a beat; check 9 counts each switch as a full-frame flash, so switch at most once a second.
Across free cuts the figure keeps its head, its object and the ring; the band keeps its line of type.

## 9. Wordmark

Stencil capitals: `lib.strokeText` with `style: 'stencil'`, `size` 132, `tracking` 0.6, toner on sheet (sheet on the toner band, and inverted with the plate), centred on x = 540 with its cap line at y = 104. Place the letters one by one from `lib.strokeFont` widths (`w · size/10`, plus a gap of `1.8 · size/10 + 0.17 · size + tracking · size/10`), so the copy can drop and misfeed them (section 7.2). Never `lib.text`, never the hand style.
