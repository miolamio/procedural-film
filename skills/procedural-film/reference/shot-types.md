# Shot types

An index of shot types. Read it during storyboard step 4 (`SKILL.md`): the original sixteen, and every recipe after them.
Entries 1–14 are harvested from `examples/butterfly-life`, the one finished film in this repo. Each one generalizes a storyboard shot away from butterflies; open the example file for the concrete numbers, geometry and beat placement.
Entries 15–16 are editing devices that film does not use. Entries 17 onward are recipes for engine capabilities the fixtures prove; open the fixture scene for the call, not for story.
Durations below assume 120 bpm. A quarter note is 0.5 s, a bar is 2.0 s, a sixteenth is 0.125 s (3 frames). Shot boundaries land on that grid.
Reach for an editing device — 15, 16, and the whip and inkwash recipes — when a beat needs punctuation the picture shots do not cover.

## 1. Cold open on the hero

Establishes the protagonist fully formed and centred in one pose that reads as the thumbnail on frame 0, then punches into motion on the first big beat so the hook lands inside the first second.

- Duration: 1.5 s
- Plate: paper
- Camera: locked push-in (zoom 1.00 to 1.05) landing on the beat
- Leans on: `inkPath`, `hatch`, `stipple`, `crossHatch`, `camera`
- Example: `examples/butterfly-life/src/scenes/01-hero-on-milkweed.js`

## 2. Blueprint genesis: a spark becomes a structure

Opens the film's founding structure from nothing: a single spark threads into frame, then the outline, lattice and internal detail build outward in beat-locked stages, ending on the shape the story keeps returning to.

- Duration: 2.5 s
- Plate: blueprint
- Camera: locked at zoom 1; the geometry animates, the camera never moves
- Leans on: `blueprint`, `tracePath`, `glowDot`, `bracket`, `ticks`, `guideCircle`, `arcAnnotation`
- Example: `examples/butterfly-life/src/scenes/02-egg-blueprint.js`

## 3. Breaking out: emergence from a casing

The subject forces its way out of an enclosing structure (a shell, a case, a cocoon); the casing cracks or splits on a beat, then pump or settle beats finish the new form.

- Duration: 1.5 to 2.0 s
- Plate: paper
- Camera: locked, or pulls back mid-shot to widen the frame around the burst
- Leans on: `tracePath`, `guideCircle`, `arcAnnotation`, `camera`
- Example: `examples/butterfly-life/src/scenes/03-egg-hatch.js` (also `09-eclosion.js` for the locked, flash-in variant)

## 4. Developmental journey: travel and grow along a path

The subject moves through a static environment while changing state at fixed intervals, each transition landing on a beat and adding to a persistent tally that stays on screen.

- Duration: 2.5 s
- Plate: paper
- Camera: locked, with a slow push (zoom 1.00 to 1.03) as the subject travels
- Leans on: `inkPath`, `hatch`, `inkLine`, `guideCircle`, `camera`
- Example: `examples/butterfly-life/src/scenes/04-larva-molts.js`

## 5. Growth-stage ladder (blueprint size comparison)

Blueprint comparison of the same subject at several stages, stacked by size and drawn on in order, with a scale axis alongside; use it when growth itself is the point rather than any one stage.

- Duration: 1.5 s
- Plate: blueprint
- Camera: locked at zoom 1
- Leans on: `inkPath`, `glowDot`, `ticks`, `bracket`, `tracePath`, `hexLattice`, `blueprint`
- Example: `examples/butterfly-life/src/scenes/05-instar-ladder.js`

## 6. Silhouette transformation (match-cut into a new form)

The subject contracts or reshapes on camera from one recognizable silhouette into another inside one locked shot, so the match cut on either side lands on an exact outline.
The in-between is `lib.morph` of the two `lib.geo` outlines (arc-length `resample`, then cyclic alignment), not a hand-blended copy of the points.

- Duration: 2.0 s
- Plate: paper
- Camera: locked at zoom 1
- Leans on: `inkPath`, `tracePath`, `arcAnnotation`, `bracket`
- Example: `examples/butterfly-life/src/scenes/06-j-hang.js`

## 7. Blueprint schematic of an internal structure (rebuild)

Blueprint cutaway of what is happening inside a sealed structure while the outside stays unchanged: parts break down and rebuild into named components that wire out to labelled node callouts.

- Duration: 1.5 s
- Plate: blueprint
- Camera: locked at zoom 1
- Leans on: `ticks`, `tracePath`, `glowDot`, `bracket`, `hexLattice`, `blueprint`
- Example: `examples/butterfly-life/src/scenes/07-inside-chrysalis.js`

## 8. Time-passage hold with a cycle tally

The camera holds on a mostly still subject while a repeating cycle (day and night, seasons, months) ticks past on a tally overlay, ending on a punctuating event that releases the held time.

- Duration: 1.5 to 3.0 s
- Plate: paper
- Camera: locked at zoom 1
- Leans on: `tracePath`, `hatch`, `inkLine`, `arcAnnotation`
- Example: `examples/butterfly-life/src/scenes/08-chrysalis-days.js` (also `15-oyamel-winter.js` for the population variant)

## 9. Blueprint schematic of a working mechanism

Blueprint diagram of a system at work, plumbing, wiring, a sensory or steering mechanism, built from a locked or near-locked camera with labelled nodes and moving indicators that show the mechanism operating rather than an object at rest.

- Duration: 1.5 s
- Plate: blueprint
- Camera: locked, or easing a few percent toward a push-in target that sets up the next shot
- Leans on: `glowDot`, `tracePath`, `guideCircle`, `hexLattice`, `bracket`, `arcAnnotation`, `blueprint`, `camera`, `branch`, `drawBranch`, `wire3d`
- Example: `examples/butterfly-life/src/scenes/10-wing-veins.js` (also `12-sun-compass.js` for the fully locked variant)

## 10. Macro push-in to surface texture

One continuous push from a normal establishing view down into the subject's surface until individual texture elements fill the frame, each zoom step landing on a beat.

- Duration: 2.5 s
- Plate: paper
- Camera: continuous exponential push-in (zoom 1.08 to 40x), steps landing on the beats
- Leans on: `hatch`, `stipple`, `camera`, `arcAnnotation`
- Cells: `voronoi` tiles a clip; `cells` draws the mosaic or the cracks with a gap and rounded corners.
- Example: `examples/butterfly-life/src/scenes/11-scale-mosaic.js`

## 11. Pull-back to reveal scale

One continuous zoom out through several nested layers of context, each layer its own drawing at its own scale, showing how small the opening frame was against the wider world.

- Duration: 3.0 s
- Plate: paper
- Camera: one log-linear zoom-out, each layer landing on its own beat with its own anchor
- Leans on: `layers`, `camera`, `guideCircle`
- Example: `examples/butterfly-life/src/scenes/13-pull-back-continent.js`

## 12. Population/column shot

A stream of many small instances of the subject moving together across the frame, density and scale increasing toward the camera, with one lead instance called out.

- Duration: 1.5 s
- Plate: paper
- Camera: locked, with a slow drift or tilt across the shot
- Leans on: `inkPath`, `hatch`, `inkLine`, `arcAnnotation`
- Place the crowd with `scatter` so the instances do not overlap, carry them on one `flow` with `advect`, and draw them with `instances`.
- Example: `examples/butterfly-life/src/scenes/14-migration-column.js`

## 13. Snap zoom-in to a match-cut

The subject performs one last action, then the camera snap-zooms from normal scale up to tens of times that scale, landing exactly on the shape the next shot, or the loop, expects.

- Duration: 1.0 s
- Plate: paper
- Camera: snap zoom (1x to tens of x) with an eased arrival, keeping one screen point fixed
- Leans on: `inkPath`, `hatch`, `stipple`, `crossHatch`
- Example: `examples/butterfly-life/src/scenes/16-spring-egg.js`

## 14. Loop-closing repeat of the opening

A near-duplicate of the film's founding structure, fully drawn on its first frame, that hands its last frame straight into frame 0 of the opening shot so the loop is invisible.
The one shot in the film that carries a wordmark.

- Duration: 1.5 s
- Plate: blueprint
- Camera: locked at zoom 1
- Leans on: `ticks`, `bracket`, `tracePath`, `guideCircle`, `glowDot`, `text`, `blueprint`
- Example: `examples/butterfly-life/src/scenes/17-egg-loop.js`

## 15. Macro insert (editing device)

A 3-frame cutaway to one extreme close-up, used to punctuate a bite, a click, a spark, anything that needs one sharp beat of detail without slowing the shot around it.

- Duration: 3 frames, one 16th note at 120 bpm (0.125 s)
- Plate: paper or blueprint, matching the shot it cuts into
- Camera: locked, at extreme zoom on the one detail
- No example file in this repo yet; build it with the same draw helpers as the surrounding shot's plate

## 16. Montage (editing device)

A rapid sequence of cards used to compress a list or a sequence of steps into one beat-driven flourish, faster than any single shot in the example film.

- Duration: about 4 cards per second, 6 frames per card at 24 fps, for as long as the list runs
- Plate: paper or blueprint, matching the shot it cuts into
- Camera: locked, or one small push per card
- No example file in this repo yet; build it with the same draw helpers as the surrounding shot's plate

## 17. Structure growing

A trunk, a vein, or a root system that is already a stump on frame 0 and grows out to its tips, inside a clip that is the body it belongs to (a leaf, a pot, a chest). The silhouette can be inked from the start; the structure is what arrives.

- Duration: 2.0 s, one bar. Frame 0 already shows the trunk; the tips arrive as the bar ends
- Plate: paper
- Camera: locked at zoom 1. The growth is the motion
- Leans on: `branch`, `drawBranch`, `inkPath`, `paper`, `hatch`
- Mistake: rebuilding the tree every frame, or cutting the point list down to fake growth. `branch` is cached from its parameters. Animate only `drawBranch`'s `reveal` (0 draws nothing, 1 draws every path), and keep `reveal` above 0 on frame 0 so the plate is not empty
- Fixture: `skills/procedural-film/foundation/tools/fixtures/scenes/10-fx-branch.js`

## 18. Metamorphosis

One closed silhouette becomes another, either inside a locked shot or as the mask of the cut. The in-between is `morph` of the two outlines, not a hand-drawn blend. On a morph cut the outgoing plate shows outside the silhouette and the incoming plate shows inside it.

- Duration: 2.0 s in the shot (out and back: the second shape at 1.0 s, beat 3, and home again on the bar line), or a cut of 0.5 s, one quarter, into a plate that is fully drawn at its local t = 0
- Plate: paper
- Camera: locked at zoom 1, both shapes sharing one centre so the cut does not slide
- Leans on: `morph`, `resample`, `geo`, `inkPath`, `hatch`. The cut is timeline `transitionIn` `{ kind: 'morph', dur, from, to }` with `from` and `to` as `FILM.GEO` ids; `core` calls `morph` on `geo`, the scene does not stroke that outline again
- Mistake: morphing open polylines, or pairing points by hand. `morph` resamples two closed contours and aligns the start (`auto`, `top`, or `index`). A second outline drawn by the scene during the seam doubles the one `core` already masks with. The mask ends on the `to` silhouette: the frame after `dur` is a match cut, not a full-frame wipe
- Fixture: `skills/procedural-film/foundation/tools/fixtures/scenes/07-fx-morph.js` (in the shot) and `skills/procedural-film/foundation/tools/fixtures/scenes/20-fx-morphcut.js` (the cut)

## 19. Multiplane pull-back

One zoom out through stacked planes — sky, hills, the subject, grass in front — so the opening frame was a detail and the last frame is the place. This is not type 11. Type 11 is one `camera` on drawings that share a transform. Here each plane has a depth, and one camera pulls them apart.

- Duration: 2.0 s, one bar (or 3.0 s, six beats, when the world is deep). Zoom 3 on the downbeat, zoom 1 on the bar line
- Plate: illustrated. The farthest plane paints the sky across a rect much larger than the frame
- Camera: one `layers` camera, anchor held on the subject. Zoom goes from 3 to 1, with `lerp` across the shot. `z` 1 is the subject and matches `camera`; `z` above 1 is farther and takes less of the zoom; `z` below 1 is nearer
- Leans on: `layers`, `lerp`, `inkPath`, `glowDot`
- Mistake: a separate `camera` per plane, or a `blur` without `static: true` (the blur is skipped, and a blurred plane is cached only when it is static). The plate is keyed by `draw`'s identity, so hoist that function or pass `key`; an inline closure allocates a new plate every frame. Listing order does not matter: `layers` paints far to near
- Fixture: `skills/procedural-film/foundation/tools/fixtures/scenes/15-fx-parallax.js`

## 20. Mechanism turntable

A blueprint of a working part — a helix, a crystal, a joint — seen as a wire mesh that yaws a full turn while a fixed pitch looks down on it. Back edges dash. It is not the flat labelled diagram of type 9.

- Duration: 2.0 s, one bar, one full yaw of 2π, already pitched and off-axis on frame 0 so the mesh is not a flat wave
- Plate: blueprint
- Camera: locked. The turn is `wire3d`'s `rot`, not a canvas spin. `rot` is `[pitch, yaw, roll]` in radians, applied yaw, then pitch, then roll; a turn of 2π matches rotation 0. `persp` 0 is orthographic; a positive `persp` is the focal length in mesh units
- Leans on: `mesh3d` (`box`, `sphere`, `cylinder`, `torus`, `helix`, `fromPoints`), `wire3d`, `blueprint`, `project3d` when a label needs a vertex
- Mistake: building the mesh inside `draw`, or starting at yaw 0 with no pitch. `hidden: 'dash'` dashes every edge whose midpoint is farther than the mean vertex. Canvas Y grows downward, so mesh +Y draws up
- Fixture: `skills/procedural-film/foundation/tools/fixtures/scenes/16-fx-wire3d.js`

## 21. Route on a globe

An orthographic globe, graticule and limb, with a route that draws on across the near side and stops at the limb instead of crossing the back. A chart under it may draw on with the route. `equirect` and `mercator` are the flat maps; this shot is the globe.

- Duration: 2.0 s, one bar. The route finishes on the bar line. The globe may still be turning
- Plate: blueprint
- Camera: locked at zoom 1. Spin the projection (`lon0`), not the canvas, if the limb should sweep the route
- Leans on: `projection`, `graticule`, `drawGeoLine`, `plot`, `blueprint`. Kind `ortho`: `scale` is the radius in pixels, and the `project` it returns is null on the far side. `drawGeoLine` breaks the stroke there. A curve's draw-on is `plot`'s series `reveal`
- Mistake: passing `reveal` to `drawGeoLine`. That option is ignored. Lengthen the `[lon, lat]` list you hand it, or reveal the `plot` series. Do not join a missing `project` with a straight line through the disc
- Fixture: `skills/procedural-film/foundation/tools/fixtures/scenes/17-fx-map.js`

## 22. Flock or column

Many small copies of one subject, placed so they do not overlap, carried on one current, with one lead called out by a heavier stroke. The engine form of type 12.

- Duration: 2.0 s, one bar, or 1.5 s (three quarters) for a column that crosses and is gone
- Plate: paper
- Camera: locked, or a slow drift. The flock moves; the camera does not chase every body
- Leans on: `scatter`, `flow`, `advect`, `instances`, `inkPath`, `onTwos`, `paper`, `glowDot`
- Mistake: a fresh `scatter` seed each frame, or placing the crowd with an unspaced rng so the bodies pile up. Scatter once, advect every point on one `flow`, draw with `instances`. Do not mutate the array `scatter` returns. Hold positions with `onTwos`
- Fixture: `skills/procedural-film/foundation/tools/fixtures/scenes/09-fx-flock.js`

## 23. Sparks, pollen, smoke

A burst, a drift, or a column of motes over a plate that is already a picture on frame 0. Sparks fall, pollen wanders, smoke rises. Nothing about the field is stored between frames.

- Duration: 2.0 s, one bar. Births run the whole bar; the plate does not wait for the first mote
- Plate: blueprint for a spark burst, paper for pollen or smoke
- Camera: locked at zoom 1
- Leans on: `particles`, `particleAt` when one mote is the hero, `onTwos`, `guideCircle`, `paper`, `blueprint`
- Mistake: an array updated from the previous frame. Position is a closed function of time. Gravity is toward canvas +y, so a positive gravity falls and smoke that must rise wants an upward angle and a negative gravity. `loop` repeats a background field; `onTwos` holds the drawing on the 12 fps grid
- Fixture: `skills/procedural-film/foundation/tools/fixtures/scenes/08-fx-particles.js`

## 24. Watercolour plate

A closed form filled with a translucent wash — granulation, a darker rim, maybe one bloom — hatch on top of the wash, and, when the form needs volume, a ground shadow, a shaded side and a lit rim that all answer to one light.

- Duration: 2.0 s, one bar. The wash is finished on frame 0. Only the light travels, and it travels on `onTwos`
- Plate: paper
- Camera: locked at zoom 1
- Leans on: `wash`, `hatch`, `paper`, `inkPath`, `castShadow`, `shadeSide`, `rimLight`, `glowDot`, `boil`, `onTwos`
- Mistake: a new `wash` seed or a time-keyed clip every frame. The wash is cached and blitted; `boil: true` reuses three variants on the 12 fps clock and is never keyed by raw time. One `dir` for `castShadow`, `shadeSide` and `rimLight` (the shadow falls that way; the light is the opposite). A second direction makes the volume disagree
- Fixture: `skills/procedural-film/foundation/tools/fixtures/scenes/12-fx-wash.js` (the wash) and `skills/procedural-film/foundation/tools/fixtures/scenes/13-fx-light.js` (the light)

## 25. Draw-on with a nib

A line or a closed form that inks itself in front of the camera. The pen is a drop on the unfinished tip. A second line can be a dash running along a path that is already there. Frame 0 is already a touch of ink, not a blank page.

- Duration: 2.0 s, one bar. The nib finishes at 1.5 s (beat 4) and holds to the bar line. A running dash may travel the whole bar
- Plate: paper
- Camera: locked at zoom 1
- Leans on: `inkPath`, `paper`, `ease`
- Mistake: slicing the point list to imitate a pen. `reveal` is a fraction of arc length, or `[from, to]` for a dash, and the double stroke is inside that span. `nib` (`r`, `color`, `blot`) sits on the tip only while that span is unfinished. Omit `reveal` and you get the whole line
- Fixture: `skills/procedural-film/foundation/tools/fixtures/scenes/05-fx-draw-on.js`

## 26. Whip (editing device)

A directional smash from one plate to the next: the outgoing frame leaves, the incoming frame enters, and ghosts plus speed lines sit on the seam. The scene does not draw the whip. The incoming plate is fully drawn at its local t = 0.

- Duration: the seam is 0.5 s, one quarter, and shorter than the shot it enters. The shot itself is still 1.0 to 2.0 s
- Plate: paper or blueprint, matching the shot it cuts into
- Camera: whatever that shot uses. The whip is not a zoom
- Leans on: `smear` (called by `core` for this seam, not by the scene), `stripes`, `inkPath`. Declare `transitionIn` `{ kind: 'whip', dur, dir }` with `dir` one of `left`, `right`, `up`, `down`
- Mistake: painting the smear in the scene, or a `dur` longer than the shot. The first frame of the seam is the outgoing plate alone; once `dur` has elapsed it is the incoming plate alone
- Fixture: `skills/procedural-film/foundation/tools/fixtures/scenes/18-fx-whip.js`

## 27. Inkwash (editing device)

The incoming plate bleeds in through a blot whose edge is fixed noise. The blot only grows. A wet rim of one colour sits on the edge. The scene is a finished plate; `core` owns the mask.

- Duration: the seam is 0.5 s, one quarter, and shorter than the shot it enters
- Plate: paper or blueprint, matching the shot it cuts into
- Camera: whatever that shot uses. The blot is not a camera move
- Leans on: `inkPath`, `stripes` for the plate. The seam is `transitionIn` `{ kind: 'inkwash', dur, color, seed }`. `color` is a `pal` name or a hex
- Mistake: wiping with `wash`. That is a plate fill, and it does not grow as a mask. The first frame of an inkwash is the outgoing plate alone; on the last frame inside `dur` the blot covers the frame, and the incoming plate is alone only once `dur` has elapsed
- Fixture: `skills/procedural-film/foundation/tools/fixtures/scenes/19-fx-inkwash.js`

## 28. Graded act

One drawing, and a look that belongs to the act: warmer, faded, aged, vignetted, tinted, in two inks, or blown out to black and white. The grade is a field on the timeline shots, applied after the scene draws and before the grain. The scene stays a neutral plate. Omit the field and the frame is unchanged.

- Duration: the grade holds for whole bars and changes on an act boundary. The fixture steps once per beat (0.5 s) only so each knob is visible
- Plate: paper or blueprint, whichever the act is
- Camera: the shots' own cameras. The grade is not a transform
- Leans on: `paper`, `inkPath`, `blueprint`. The field is `grade` with `invert`, `warmth` (−1..1), `fade`, `vignette`, `paperAge`, `tintAmount` (0..1) and `tint` (a `pal` name), `duotone` (`[dark, light]`, two `pal` names, e.g. `['ink', 'paleBlue']` for ink on cyan) with `duotoneAmount` (0..1, default 1), `threshold` (0..1; 1 is black and white cut at mid grey). No lib call applies it. `invert` 1 is the exact negative of the frame (plate B of the `negative` theme); a cut into or out of it is one full-frame flash for check 9. `duotone` maps the frame's luminosity from `dark` to `light`, so the plate's values carry the picture, not its hues: two fills that differ only in hue at the same lightness merge. `threshold` cuts at mid grey the same way: a dusk hill on a night sky both go black, so the plate needs its values far apart on either side of the cut, and a hairline under about 1.5 px breaks into dashes where its antialiasing falls under mid grey; `threshold: 1` with `duotone: ['ink', 'paper']` is a photocopy
- Mistake: baking the warmth into the scene fills. `core` grades again, and across `transitionIn` it already interpolates from the outgoing grade to the incoming one
- Fixture: `skills/procedural-film/foundation/tools/fixtures/scenes/21-fx-grade.js`; `31-fx-duotone.js` (a cut into ink on pale blue, a fade to night on sun at 0.7); `32-fx-threshold.js` (a fade from the duotone into threshold 0.5, then 1, then a cut to the same frame in ink on paper)

## 29. Beat pulse

A held plate whose only motion is the grid: a hit on the quarters, a pop that settles in three drawings, a sixteenth ticking under it. The clocks read the timeline, not the shot's local clock.

- Duration: 2.0 s, one bar. Quarters at 0, 0.5, 1.0 and 1.5; a sixteenth is `onBeat` with division 4
- Plate: paper
- Camera: locked at zoom 1
- Leans on: `beat`, `onBeat`, `hit`, `popTwos`, `pulse`, `cue`, `drawing`, `paper`
- Mistake: passing the shot-local `t` to `beat`, `onBeat`, `cue` or `pulse`. They take global time (`info.T`). Do not reimplement `hit`; with `lead` 1 the value is already above 0 on the beat frame
- Fixture: `skills/procedural-film/foundation/tools/fixtures/scenes/06-fx-pulse.js`

## 30. Motion smear

A limb that jumps between a few drawings on twos — a wing, a strike, a blink — with ghosts, a stretch, or speed lines across the jump, then one crisp pose on the hold.

- Duration: 2.0 s, one bar. Three drawings for the action, then a hold through the rest of the bar
- Plate: paper
- Camera: locked at zoom 1
- Leans on: `smear`, `onTwos`, `paper`, `inkPath`
- Mistake: leaving `from` and `to` apart on a hold, so a still pose ghosts. `from === to`, or `n` of 1, is exactly one drawing of the pose at `to`. Derive both poses from `onTwos`, not from the previous frame. `mode` is `ghosts`, `stretch`, or `lines`
- Fixture: `skills/procedural-film/foundation/tools/fixtures/scenes/14-fx-smear.js`

## 31. Cell field

A locked field of cells — scales in shifted rows, or cracked ground — complete on frame 0. A sheen may cross it. Type 10 is the push-in that arrives at this texture; this recipe is the field itself, held.

- Duration: 1.5 to 2.0 s (three or four quarters). Nothing grows in; the mosaic is the pose
- Plate: paper
- Camera: locked at zoom 1
- Leans on: `voronoi`, `cells`, `paper`, `rng`, `hash`
- Mistake: rebuilding the sites from time, or from `Math.random`. `voronoi` is cached by the sites, the clip and `relax` (0..3). `cells` draws them (`inset`, `round`, `fill`, `stroke`)
- Fixture: `skills/procedural-film/foundation/tools/fixtures/scenes/11-fx-cells.js`

## 32. Constellation

A figure made of stars: seeded nodes that hold their places, thin lit edges drawing on node to node, and a glowing contour figure standing among them. The `negative` theme's signature plate; a cut to the same frame under `grade: { invert: 1 }` is its plate B.

- Duration: 2.0 to 4.0 s. One edge every 8th to 16th; the figure is there from frame 0
- Plate: a dark plate (`void` on the negative theme, `navyDeep` in the fixture)
- Camera: locked at zoom 1
- Leans on: `glow`, `glowFigure`, `glowDot` (`rays: 0`), `rng`, `hash`
- Mistake: `shadowBlur` or `ctx.filter` for the halo — both blow the frame budget (check 6); `glow` strokes the halo instead. Moving a node once it is lit. Edges timed from the shot's `t` when the constellation continues across a cut: time them from `info.T` so both sides agree. A figure with no knock-out, so edges run through its body (`glowFigure` fills a closed part with the plate first)
- Fixture: `skills/procedural-film/foundation/tools/fixtures/scenes/22-fx-negative.js`

## 33. Blinking line icon

A creature drawn as a flat line icon — constant-width round-cap lines, knock-out fills, lens pupils — that holds perfectly still and blinks. The blink is the whole performance.

- Duration: any; the longer the hold, the more the blinks read. A 2-bar hold shows 3 to 5 blinks
- Plate: dark, flat
- Camera: locked
- Leans on: `lineIcon` (parts `circle`, `arc`, `eye`, `line`, `teeth`, `path`), `blinkAt`, `hash`
- Mistake: an in-between drawing or an eased eyelid — a blink is exactly 2 frames, eyes open or shut. Blinks on a regular period; `blinkAt(info.frame, seed)` spaces them 7 to 38 frames apart with pairs. Boil or glow on the icon: it is flat line. Copying a known character: build the creature's own parts
- Fixture: `skills/procedural-film/foundation/tools/fixtures/scenes/22-fx-negative.js`

## 34. Terminal

A locked screen that types: a log or a title appearing character by character in the pixel font, a block cursor blinking, a sprite or a trace beside it, the whole picture on the `crt` carrier. An act ends by switching the tube off (`crtoff`) into the next picture.

- Duration: 2.0 to 4.0 s. Typing at 20 to 40 characters a second; a line ends on a beat
- Plate: a dark screen (`screen` on the phosphor theme, `navyDeep` in the fixture)
- Camera: locked
- Leans on: `pixelText` (`chars`, `cursor`), `sprite`, `glow`, `boil(T, 3)` for the cursor; timeline `carrier: { kind: 'crt' }` and `transitionIn: { kind: 'crtoff', dur: 0.5 }`
- Mistake: `lib.text` or a system monospace for terminal text — it renders differently on every machine. Drawing scanlines or a screen mask in the scene: the carrier draws them once, over transitions too. Typing from the shot's `t` when the text continues across a cut. A sprite copied from a known game: draw the film's own
- Fixture: `skills/procedural-film/foundation/tools/fixtures/scenes/23-fx-phosphor.js`

## 35. Shard field

A picture made of flat facets: Voronoi cells, each one step of a few tones, thin edges between them, parting from a centre on the beat and closing again. A lit low-poly solid may sit among them.

- Duration: 2.0 to 4.0 s. Part on a beat, hold, close on a later beat
- Plate: a dark ground (`ground` on the shards theme, `navyDeep` in the fixture)
- Camera: locked
- Leans on: `voronoi` (`relax` 1 for even pieces), `rng`, `hash`, `beat`, `faces3d` with `mesh3d.box` for a solid
- Mistake: new sites every frame — the diagram flickers and the cache misses; build them from a seeded `rng` once. Moving anything inside a facet. A tone picked per frame instead of per cell index
- Fixture: `skills/procedural-film/foundation/tools/fixtures/scenes/24-fx-shards.js`

## 36. Polygon tunnel

A flight down a low-poly tunnel: filled faces in alternating steps, fogged toward the far end, thin edges, the view rolling slowly. The shards theme's plan B, usually entered through a `shatter` cut.

- Duration: 2.0 to 4.0 s; the flight loops, so any length holds
- Plate: the tunnel fills the frame; the far end is the fog colour
- Camera: `faces3d` with `persp` 1.4 to 2, `shift: [0, 0, travel % mesh.ringStep]`, a slow roll in `rot[2]`
- Leans on: `mesh3d.tunnel`, `faces3d` (`color(i)`, `fog`, `fogColor`, `stroke`), timeline `transitionIn: { kind: 'shatter', dur, x, y, pieces, seed }`
- Mistake: shifting by the whole travel instead of `travel % ringStep` — the tunnel runs out. Building the mesh inside `draw` every frame: build it once and keep it. `near` too small, so a face through the camera smears across the frame
- Fixture: `skills/procedural-film/foundation/tools/fixtures/scenes/24-fx-shards.js`

## 37. Liquid body

A body made of metaballs that merges, splits, drips and melts: a flat fill, a heavy rim, marble contours inside, a face on a tar disc. The same field drawn as isolines at many levels is a relief map of it.

- Duration: 2.0 to 4.0 s. One merge, split or melt per beat or slower
- Plate: flat (`pool` on the blob theme, `annBlue` in the fixture)
- Camera: locked
- Leans on: `blob` (`marble`, `warp`, `phase`), `blobField`, `isolines` (levels as an array for a relief), `lineIcon`, `blinkAt`
- Mistake: animating the outline instead of the balls — the balls are the character, the rim follows. A `phase` that stands still, so the body freezes between moves. Too fine a `cell` on a large body: 8 to 12 px is smooth enough and keeps the frame in budget. A drip drawn as a separate shape: give it a ball and it joins and leaves the body by itself
- Fixture: `skills/procedural-film/foundation/tools/fixtures/scenes/25-fx-blob.js`


## 38. Stick figures

Small people drawn in thin trembling line: a disc head (solid, scribbled, hatched or a plain face), limbs of straight segments with a thickening at each joint, or limbs of springs (zigzag, coil or ladder) under a scribbled knot of a head. They act in held poses that change on twos; the line boils between the poses, the joints never slide.

- Duration: 2.0 to 4.0 s. One key pose a quarter note to a bar, mixed on twos; a walk is four drawings a stride
- Plate: flat and quiet (paper, snow, a colour field); a single accent near the figure — a balloon, a mark on the ground — and nothing else in colour
- Camera: locked, or a slow drift; the figures stand on a drawn ground line
- Leans on: `stickFigure` (`head`, `limb`, `facing`, `height`, `joint`), `stickPose` for hands and feet another drawing attaches to, `poseMix`, `stickPoses`, `onTwos`, `springLimb` and `scribbleBall` on their own
- Mistake: easing the pose on every frame — mix it at `onTwos(t)`, so a pose is held two frames. Placing the figure by its hip while it crouches or jumps: the default anchor stands it on `y`, lift it by moving `y`. Attaching a prop to a guessed point instead of the returned joints. Spring limbs folded flat on themselves (a knee past about 2 rad), which reads as a tangle. Copying a known figure (the Murder, Drown or Fighting Men men): give the film's people their own proportions, heads and acts
- Fixture: `skills/procedural-film/foundation/tools/fixtures/scenes/27-fx-stick.js`
## 39. Scallop waves

Water as a flat print: three rows of scallop edges, each a run of circular sags between sharp cusps, filled in one ink to the bottom of the frame and stroked with one even contour. The middle row sits half a period off the other two, and the rows slide against each other on threes.

- Duration: 1.0 to 4.0 s; the rows swing once a bar, so any length on the bar grid holds
- Plate: flat sheet (`sheet` on the scallop theme); the rows are scarlet with a soot contour
- Camera: locked. The rows move; the frame does not
- Leans on: `boil(T, 8)` for the drawing index, `noise2` for the per-drawing shake, plain `ctx` paths (no `inkPath`: the contour has no pressure). An edge is `P` period, `D` sag, arc radius `R = (P²/4 + D²) / 2D`, sampled into a polyline so the shake can move its vertices
- Mistake: more than three rows, or all rows in phase — the half-period offset is the pattern. A row stroked but not filled, so the row behind shows through. Moving the rows on `t` at 24 fps: they swim instead of print. A boat drawn after the last row, so nothing sits in the water
- Fixture: `skills/procedural-film/foundation/tools/fixtures/scenes/35-fx-scallop.js`

## 40. Fir row

A shore of flat firs standing on one line: 3 or 4 stacked tiers and a short trunk each, one closed outline per fir, heights and spacing from a seeded `rng`, sorted so the tallest stand in front and knock out the ones behind.

- Duration: a background layer; it holds for the whole shot
- Plate: soot firs with a soot contour on a soot shore band (plate A); scarlet fills with a sheet wire (plate B)
- Camera: locked, or a slow pan that moves the whole row as one
- Leans on: `rng`, `hash` (the row is a function of its seed and the base line), the same shake as recipe 39
- Mistake: a fresh seed per frame, or `Math.random`, so the forest jumps. Drawing the firs in placement order, so a short fir covers a tall one. Tiers built without the notch at each step, which turns a fir into a triangle
- Fixture: `skills/procedural-film/foundation/tools/fixtures/scenes/35-fx-scallop.js`

## 41. Fall into the throat

Figures falling into depth: each one shrinks toward one vanishing point at the bottom of a well, the near one big enough to carry the shot, the far ones a few pixels tall. The well is a radial glow down a colour ramp, framed by hair hanging from the top edge and a ragged lip; scale, not speed, says how deep it goes.

- Duration: 1.0 to 4.0 s; a figure loses about 14 percent of its height a second, so a fall reads over any length on the bar grid
- Plate: red paper (`crater` on the crater theme) with the throat's gradient; plate B is the same frame as a stepped heat map
- Camera: locked. The figures fall; the frame does not
- Leans on: `stickFigure` (`head: 'face'`, `joint: 0`, two or three passes on other seeds for the scrawl), `springLimb` for the scribbled torso, `onTwos` for the fall clock, `boil(T, 12)` and `h3` for the hair, the lip and the grain, `ramp` over the theme's rows for the glow and the bands, `isolines` for the isotherms, `strokeText` for a scratched wordmark
- Mistake: a fall clock on the shot's `t`, so the figures jump on the cut; keep it a closed form of global `T`: `p = (onTwos(T) · speed + phase) mod 1`, `s = exp(−k p)`, place `vp + (start − vp) · s`, height `H0 · s`, with a fade at both ends of `p`. Shrinking the figure but not its line width, so the far ones turn into blots; scale the width with the height. Large joint jitter on the extra passes, which splits the face into several; tremble the segments, not the joints. Yellow outside the throat: the accent is the core only
- Fixture: `skills/procedural-film/foundation/tools/fixtures/scenes/38-fx-crater.js`

## 47. Spotlight pool

One pool of light on a dark void: a beam from a lamp above the frame widening to the pool's tangents, the pool as a radial ramp from a hot heart to its edge with a glow halo past it, dust drifting in the beam, the subject's shadow on the pool, and silhouettes in the dark caught by a rim of the light.

- Duration: 1.0 to 4.0 s; the pool holds for the shot and only the subject, the dust and the shadow move, on twos
- Plate: flat void (`tealVoid` on the spotlight theme), `post: 0`; the pool, the beam and the halo are drawn by the scene
- Camera: locked. A cut may move the pool; a shot never does
- Leans on: `rampStops` for the pool's gradient stops (a `spot` row in the ramps table), `onTwos` for the dust, `noise1` for its twinkle, `inkPath` for the shadow (the figure's strokes again, offset away from the lamp, clipped to the pool), `rimLight` on silhouettes in the void with `dir` from the pool to the silhouette
- Mistake: a flat disc (the pool is a ramp with its focus toward the lamp, and a halo outside the edge). A shadow that spills onto the void. A second light. Dust on 24 fps, or keyed to the previous frame. Must-read text on the pool
- Fixture: `skills/procedural-film/foundation/tools/fixtures/scenes/41-fx-spotlight.js`

## 48. Bone figure

A figure built from bones: each bone one brush stroke between two joints, thin in the shaft and swollen at both heads, stopped short of each joint so the joint is a break in the ink with an accent disc in it. Fingers fold toward the hand's axis on twos; the ink boils on its own 12 fps clock.

- Duration: a pose a quarter note to a bar; a reach is one bar rising and one bar closing
- Plate: a lit ground (the pool of recipe 47) under thick dark ink; the joints carry the one accent
- Camera: locked, or a slow drift that keeps the joints inside the safe area
- Leans on: `inkPath` with `pressure(u)` (a bone is `0.42 + 0.86·|2u − 1|⁴`, a fingertip a head at the joint and a small tuft at the tip), `taper: [3, 3]`, `onTwos` for the pose, filled `inkPath` ovals for pebble bones (carpals), plain discs for the joints
- Mistake: one outline around the whole hand instead of a stroke per bone. Bones drawn through the joints, so the accent has no gap to sit in. Easing the pose every frame. A shared pressure function with the default `taper`, which turns every bone into a spindle. Copying a known skeleton drawing: give the film's figure its own proportions and gesture
- Fixture: `skills/procedural-film/foundation/tools/fixtures/scenes/41-fx-spotlight.js`

## 43. Snow and one drop

Bare ink trees in an overexposed white that eats their feet, snow falling on ones, a stick figure walking into the wind, and one red drop that forms on a twig, falls and lands in the snow. Plate B is the same frame drawn as its negative with the drop left red, cut on the figure's silhouette.

- Duration: 1.0 to 4.0 s; the drop's fall (about 0.7 s) lands on a beat, and its mark stays for the rest of the scene
- Plate: `snow` with a `fog` gradient at the top of the sky, a white `noisePlate` over the trees, a fine crow stipple over everything; `post: 0`
- Camera: locked. The snow, the walker and the drop move; the trees only boil
- Leans on: `rng` and `hash` for a seeded recursive tree (kept in a Map by its parameters), `inkPath` for trunks and limbs, plain hairline strokes for twigs, `noisePlate` (overexposure, stipple), `stickFigure` with `head: 'scribble'` on `onTwos`, `rng(hash('snow', info.frame))` for the scatter that is new every frame
- Mistake: overexposing the figure (draw the white plates before it). A second red, or a red tint anywhere. Plate B through `grade: { invert: 1 }`, which turns the drop cyan: draw the negative in the scene through one colour function and skip the drop. Twigs through `inkPath` (hundreds of calls; stroke them in one path per width). Snow on the boil clock instead of ones. Keeping the drop or the snow in state between frames
- Fixture: `skills/procedural-film/foundation/tools/fixtures/scenes/39-fx-snow.js`

## 49. Night collage: eyes over a fir edge

A cut-paper nightpiece: one black jagged fir edge across a flat sky, with no contour, a swarm of almond eyes drifting over it, and a row of lollipop figures on the snow below that the eyes watch. One eye looks at the viewer instead. It is not the fir row of recipe 40: there the firs are separate tiered shapes with a contour; here the forest is one silhouette of packed spires with drooping branch tips, and the only outline is where two inks meet.

- Duration: 1.0 to 4.0 s. The edge holds; the swarm drifts the whole shot
- Plate: flat `ember` sky over flat `snow` (the firs theme); plate B is the same frame under `grade: { invert: 1 }`
- Camera: locked. The swarm moves; the edge is the fixed thing the cut holds on
- Leans on: `rng`, `hash`, `noise1` (the edge, built once per frame size and seed into a `Path2D`), `scatter` once inside the swarm's cloud, `advect` on one `flow` from a clock that runs across the cut, `blinkAt` with long gaps, `stickFigure` (`head: 'solid'`, `joint: 0`, a short `body`) posed on `onTwos`
- Mistake: firs spaced like a row of trees, so sky shows through the forest (pack them to a quarter of a spire's width and fill a mass under the tiers). A contour round the edge or the eyes. Every eye blinking on the default schedule, so the sky fills with slivers. Eyes spread evenly over the whole sky: scatter them in a lopsided cloud, most small, and clear a space round the lead eye. `advect` from a scatter point over global `T`: integrate over the plate clock with a fixed step count. The lead eye's gaze following the figures like the rest
- Fixture: `skills/procedural-film/foundation/tools/fixtures/scenes/42-fx-firs.js`

## 45. Dry-brush wood

A wood seen from inside, through a black passe-partout: three planes of dry-brush trunks in three greys of one ink on grey paper, a figure painted as a dry-brush silhouette with paper eyes walking the focus ground, one `layers` camera tracking sideways, everything on twos. Its plate B is the same frame in negative, cut inside a held drawing.

- Duration: 1.0 to 4.0 s. The track and the walk run on one global clock, so a run of shots (and the cut into plate B) keeps them
- Plate: grey paper (`ash` on the drybrush theme) in a flat `mount` with a brushed inner edge; plate B is the shot again with `grade: { invert: 1 }`
- Camera: one `layers` camera, tracking 100 to 120 px a second at the focus plane; far plane at `z` 3, mid 1.7, focus 1, near 0.6. The mount does not move
- Leans on: `dryBrushFill` (trunks, coats, heads, creatures; eye rings passed with the head ring so even-odd leaves paper holes), `dryBrush` (dendrites, limbs, ground lines, the mount's edge), `layers`, `paper`, `stickPose`, `poseMix`, `stickPoses`, `blinkAt`, `cached`; the drawing clock `d = floor(T·12 + 0.5)`, `tq = (d − 0.5) / 12`
- Mistake: building dry-brush plates in frame space for a moving figure, so every frame builds new plates: draw it in its own space and `translate`. Letting the far and mid planes boil (`boil: false` there; the near plane takes `boil: d % 3`). A walk on `T` or a boil on `lib.boil(T)` next to a clock on twos, so the figure swims against the wood. A drawing that turns on the beat, so the cut into plate B moves as well as inverts. A dissolve into the negative (it passes through flat grey). Copying a known figure: the characters are the film's
- Fixture: `skills/procedural-film/foundation/tools/fixtures/scenes/40-fx-drybrush-theme.js` (plate A `fx-drybrush`, plate B `fx-drybrush-b`); the dry-brush engine alone is `29-fx-dry-brush.js`

## 51. Relief descending to its isoline map

A surface (ground, or any quantity over a plane) as a false-colour mesh on black in wire of one width, one isoline threaded round it in the accent colour, pixel labels pinned to the surface; then the camera rises and looks straight down, and the cut to the same surface as an isoline map holds on that isoline. It is not the turntable of recipe 20: the mesh is a filled, ramp-coloured surface, and the move ends on a map.

- Duration: 1.0 to 4.0 s for the perspective shot, at least a bar of drift before the descent; the descent is the last half of the shot and the cut lands on a beat. The map shot holds 1.0 to 4.0 s
- Plate: the void (`reliefVoid` on the relief theme), `post: 0`; plate B is the same box and field as `lib.heightfield` contours on black
- Camera: the mesh's own view, never a canvas move. Pitch 0.9 rad and a slow yaw drift; the descent eases pitch to π/2, yaw to 0, `1 / persp` to 0 and scale to 1 on one smoothstep, landing on the last frame
- Leans on: `heightfield` (`mode: 'mesh'`, `cut`, `lift`, `ramp`; `mode: 'contour'` for the map), `heightMesh` and `project3d` when the thread must hide behind ridges, `isolines` over the field's grid for the thread and the labels, `heightPoint` for pins, `pixelText` for every label, `ticks` for the rulers, `ramp` for level colours
- Mistake: a thread drawn over the finished mesh, so the far side of the loop shows through the mountain (ride each segment in the quad it crosses, drawn right after that quad). Easing `persp` itself to 0, which jumps at the end (ease `1 / persp`). Leaving a yaw or an offset on the last frame, so the map does not land on the box. A `range` from the samples instead of a fixed one, so the colours shift between the plates. Thinning the wire with depth; the theme's wire is one width. Sampling a function field every frame: sample it once into a grid and pass the grid
- Fixture: `skills/procedural-film/foundation/tools/fixtures/scenes/43-fx-relief.js`
