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
- Mistake: morphing open polylines, or pairing points by hand. `morph` resamples two closed contours and aligns the start (`auto`, `top`, or `index`). A second outline drawn by the scene during the seam doubles the one `core` already masks with
- Fixture: `skills/procedural-film/foundation/tools/fixtures/scenes/07-fx-morph.js` (in the shot) and `skills/procedural-film/foundation/tools/fixtures/scenes/20-fx-morphcut.js` (the cut)

## 19. Multiplane pull-back

One zoom out through stacked planes — sky, hills, the subject, grass in front — so the opening frame was a detail and the last frame is the place. This is not type 11. Type 11 is one `camera` on drawings that share a transform. Here each plane has a depth, and one camera pulls them apart.

- Duration: 2.0 s, one bar (or 3.0 s, six beats, when the world is deep). Zoom 3 on the downbeat, zoom 1 on the bar line
- Plate: illustrated. The farthest plane paints the sky across a rect much larger than the frame
- Camera: one `layers` camera, anchor held on the subject. Zoom goes from 3 to 1, with `lerp` across the shot. `z` 1 is the subject and matches `camera`; `z` above 1 is farther and takes less of the zoom; `z` below 1 is nearer
- Leans on: `layers`, `lerp`, `inkPath`, `glowDot`
- Mistake: a separate `camera` per plane, or a `blur` without `static: true` (the blur is skipped, and a blurred plane is cached only when it is static). Listing order does not matter: `layers` paints far to near
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
- Mistake: wiping with `wash`. That is a plate fill, and it does not grow as a mask. The first frame of an inkwash is the outgoing plate alone; the incoming plate is alone only once `dur` has elapsed
- Fixture: `skills/procedural-film/foundation/tools/fixtures/scenes/19-fx-inkwash.js`

## 28. Graded act

One drawing, and a look that belongs to the act: warmer, faded, aged, vignetted, or tinted. The grade is a field on the timeline shots, applied after the scene draws and before the grain. The scene stays a neutral plate. Omit the field and the frame is unchanged.

- Duration: the grade holds for whole bars and changes on an act boundary. The fixture steps once per beat (0.5 s) only so each knob is visible
- Plate: paper or blueprint, whichever the act is
- Camera: the shots' own cameras. The grade is not a transform
- Leans on: `paper`, `inkPath`, `blueprint`. The field is `grade` with `warmth` (−1..1), `fade`, `vignette`, `paperAge`, `tintAmount` (0..1) and `tint` (a `pal` name). No lib call applies it
- Mistake: baking the warmth into the scene fills. `core` grades again, and across `transitionIn` it already interpolates from the outgoing grade to the incoming one
- Fixture: `skills/procedural-film/foundation/tools/fixtures/scenes/21-fx-grade.js`

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
