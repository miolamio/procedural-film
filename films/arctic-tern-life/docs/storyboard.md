# Storyboard: The life of an Arctic tern

## Logline

An Arctic tern hatches from a 41 mm speckled egg on the shingle of Sand Island in north-east Greenland, takes its first flight under a sun that never sets, and flies 70,900 km a year from one summer to the other and back to lay the egg that starts the cycle again.
Warm ink illustrations show the life, navy blueprints show what happens inside, and every cut lands on a 120 bpm grid in a tall 9:16 frame.

## Numbers

- BPM: 120 (beat 0.5 s = 12 frames, 8th = 6 frames, 16th = 3 frames).
- Duration: 32.0 s, 16 bars of 4/4, 768 frames at 24 fps.
- Frame: 1080 x 1920.
- Shots: 17, each 1.0 to 3.0 s, every boundary on the 0.5 s grid.

## Summary

| Order | Id | Start | End | Mode | Title |
|---|---|---|---|---|---|
| 01 | hero-hover | 0.0 | 1.5 | illustrated | Cold open: the tern with a fish |
| 02 | egg-blueprint | 1.5 | 4.0 | schematic | A spark, an egg |
| 03 | egg-hatch | 4.0 | 5.5 | illustrated | Pipping on the shingle |
| 04 | chick-feeding | 5.5 | 8.0 | illustrated | Four fish, four days |
| 05 | growth-ladder | 8.0 | 9.5 | schematic | Thirteen grams to a hundred |
| 06 | wing-stretch | 9.5 | 11.5 | illustrated | Down becomes wings |
| 07 | pin-feather | 11.5 | 13.0 | schematic | A feather unrolls from its sheath |
| 08 | midnight-sun | 13.0 | 16.0 | illustrated | Days under a sun that never sets |
| 09 | first-flight | 16.0 | 18.0 | illustrated | First flight |
| 10 | wing-schematic | 18.0 | 19.5 | schematic | Hand and arm, primaries and lift |
| 11 | feather-mosaic | 19.5 | 22.0 | illustrated | Push-in: barbs, barbules, hooks |
| 12 | two-summers | 22.0 | 23.5 | schematic | Chasing the light pole to pole |
| 13 | pull-back-atlantic | 23.5 | 26.5 | illustrated | Pull-back: colony, fjord, Greenland, Atlantic |
| 14 | ocean-flock | 26.5 | 28.0 | illustrated | Riding the winds south |
| 15 | pack-ice | 28.0 | 29.5 | illustrated | Summer on the Antarctic ice |
| 16 | return-egg | 29.5 | 30.5 | illustrated | Home: a new egg |
| 17 | egg-loop | 30.5 | 32.0 | schematic | Back to the egg |

## Structure

Act 1, bars 1 to 4 (0 to 8 s): hero, egg, hatch, chick. Stripe band B: stripeYellow.
Act 2, bars 5 to 8 (8 to 16 s): growth, wings, the feather in its sheath, the days under the midnight sun. Stripe band B: stripeApricot.
Act 3, bars 9 to 12 (16 to 24 s): first flight on the midpoint downbeat, the wing, the feather surface, the two summers. Stripe band B: stripeSky.
Act 4, bars 13 to 16 (24 to 32 s): the pull-back to the Atlantic and the route, the flock, the ice, the return, the loop. Stripe band B: polarSky.
Modes alternate as in the example, with an illustrated run through the migration.
Match cuts: egg (02 to 03, 16 to 17), raised wings (06 to 07), the juvenile flying seen from below (09 to 10 to 11).
Push-ins: 11 (40x into one primary) and 16 (snap onto the egg in the scrape, about 20x).
Pull-backs: 03 (egg to scrape) and 13 (colony to the Atlantic).
Time devices: fish tally ring (04), day tally ring and the circling sun (08), the terminator swinging from June to December on the globe (12), month ticks on the ice (15), and the cycle ring filling its four arcs (02 to 17).

## Conventions

Positions are frame pixels at camera zoom 1, origin top-left.
`T` is global seconds and `t` is seconds since the shot started.
Times in shot sections are global `T`.
The camera is `lib.camera(ctx, { x, y, zoom }, fn)`, which puts world point (x, y) at the frame centre (540, 960).
To zoom while keeping a screen point (sx, sy) fixed over world point (wx, wy), set x = wx - (sx - 540) / zoom and y = wy - (sy - 960) / zoom.
Colour names are from `docs/art-bible.md` and exist in `FILM.lib.pal`.
Characters move on twos, cameras and overlays move at 24 fps, and lines boil at 12 fps (art bible, section 7).
Readable content stays inside the Shorts safe area x 60 to 940, y 220 to 1540 (art bible, section 1.1).
Transitions are hard cuts unless the shot says otherwise.
During a flash transition core draws the outgoing shot slightly past its end, so every scene clamps to its final pose for `t > dur`.
The tern is always an Arctic tern: blood-red bill with no black tip, very short red legs, streamers past the folded wingtips, grey underparts (art bible 10.1, 10.12).

## Shared geometry

Scenes that share a shape copy these numbers exactly, or the match cuts jump.

### G1: egg lying on its side (02, 03 start, 16 end, 17)

The long axis is horizontal on y = 900; the blunt end is on the left.
The egg runs from x 160 (blunt end) to x 920 (narrow end): 760 px long.
Half-height by x: x 160: 0; 175: 120; 200: 175; 240: 222; 300: 257; 380: 274; 460: 278 (widest, 556 px); 540: 275; 620: 264; 700: 242; 780: 205; 840: 160; 880: 112; 905: 62; 920: 0.
Length 760 against breadth 556 keeps the true 41 : 30 ratio.
The underside touches the ground line at (460, 1178).
Blotches: 22 large blotches (radius 14 to 34) crowded in a loose band from x 220 to 400, and about 70 small spots (radius 3 to 9) spread over the rest, seeded from 'egg-blueprint'.
The air cell is inside the blunt end: an arc from (205, 720) through (250, 900) to (205, 1080).
The pip point, where the shell first cracks: (240, 800).
Nucleus home (the blastodisc): (520, 760), on the upper side of the yolk.
The yolk is a circle centred (500, 900), radius 200.

### G2: the juvenile with wings raised (06 end, 07)

The bird stands facing left, three-quarter view, on the flat top of a rock at y = 1324; the rock sits on the beach ground line y = 1420.
Body: an ellipse centred (540, 1230), 300 px long, 150 px tall, tilted 15 degrees nose-up.
Head centre (400, 1140), radius 52; bill from (352, 1150) to (290, 1172), black (juvBill).
Tail tip (720, 1330), short streamers to (760, 1350).
Legs: 24 px from the belly at (520, 1300) and (570, 1300) down to the rock top; feet flat on y 1324.
Near wing (right in frame): shoulder (580, 1180), wrist (720, 900), tip (900, 380); trailing edge from the tip back through (930, 540), (900, 760), (820, 1000) to (640, 1240).
Far wing (left): shoulder (500, 1170), wrist (380, 900), tip (200, 420); trailing edge through (150, 560), (170, 780), (250, 1000) to (460, 1230).
Near wing primaries: 10 feathers fanned from the wrist (720, 900) to the trailing edge between the tip (900, 380) and (900, 760); secondaries fill the rest of the trailing edge down to the body.
Shape it as a tall V above the body.

### G3: the juvenile in flight seen from below (09 end, 10, 11 start)

The bird flies up the frame, belly to camera, wings fully spread.
Body axis x = 540. Bill tip (540, 610); head centre (540, 690), radius 34; breast widest at y 820, 110 px wide; tail base (540, 1010).
Tail: fork from (540, 1010); T1 tip (540, 1100); streamer tips (495, 1180) and (585, 1180).
Wings: the leading edge runs from the shoulder (500, 790) through the wrist (300, 735) to the tip (80, 850) on the left, and from (580, 790) through (780, 735) to (1000, 850) on the right.
The trailing edge runs from the tip (80, 850) through (210, 905), (330, 915) to the body at (500, 880) on the left, and mirrored on the right: (870, 905), (750, 915), (580, 880).
Primaries: 10 per wing, fanned from the wrist, filling the hand between the tip and the point (330, 915) on the trailing edge; secondaries: 14 per wing between (330, 915) and the body.
The black trailing edge of the primaries is 4 px (capBlack); the primaries are primaryGlow, the coverts plumeWhite.
The wingtips at x 80 and 1000 run past the safe area as in the example's hero; the body, head and bill stay inside it.
Push-in target for 10 and 11: (880, 890), on the right wing's P6 vane just inside the trailing edge (P6 in shot 09's even primary spacing).

### G4: map projection (13 last layer)

Equirectangular: x = 540 + (longitude + 20) x 8.6 and y = 880 - latitude x 8.6, with south and west negative.
Anchors: Sand Island colony (74.7, -20.5) at (536, 238); North Atlantic stopover centre (47, -34) at (420, 476), its box from (41..53 N, 41..27 W) spanning x 359 to 480, y 424 to 527; split south of Cape Verde (10, -23) at (514, 794); the equator at y 880; end of directed southward travel (-39) at y 1215; Weddell Sea wintering centre (-65, -30) at (454, 1439), its box south of -58 between 61 W and 0 spanning x 187 to 712, y 1379 down.
Southbound Africa leg polyline (lat, lon): (10, -23), (5, -15), (0, -5), (-10, 5), (-22, 10), (-33, 12), (-39, 5), (-50, -10), (-62, -25).
Southbound Brazil leg: (10, -23), (0, -30), (-12, -34), (-25, -40), (-39, -45), (-50, -40), (-62, -32).
Northbound S-track: (-64, -25), (-45, -10), (-30, 0), (-12, -8), (0, -25), (15, -38), (30, -42), (45, -38), (60, -30), (74.7, -20.5).
The track shapes follow Egevang 2010 figure 1 in outline; points between the published anchors are illustrative.

### G5: the hero hovering, side view (01)

Scale 1.63 px per mm (bill tip to streamer tips about 560 px).
The adult faces left, body tilted 30 degrees nose-down toward the lower left, hovering.
Head centre (420, 860), radius 40; the cap runs from the bill base over the crown to the nape at (465, 835).
Bill: from (380, 880) to (338, 910), 50 px, billRed, pointing down-left.
A sand eel held crosswise in the bill tip: centred (338, 910), 110 px long, angled 70 degrees, hanging both sides of the bill.
Body: an ellipse centred (560, 800), 300 px long and 130 px tall, its long axis tilted 30 degrees so the tail end is higher; tail base (690, 730).
Tail spread and forked: T1 tip (780, 690), streamer tips (870, 640) and (850, 690).
Wings raised in the hover: near wing shoulder (570, 770), wrist (600, 470), tip (900, 230); far wing shoulder (530, 770), wrist (470, 490), tip (240, 250), drawn behind the body at 85 percent tone.
Legs tucked; the red feet show as two small shapes under the belly at (560, 860).

---

## 01 hero-hover: Cold open, the tern with a fish

T 0.0 to 1.5, illustrated, enters on the film start and the loop replay.

### Composition

Full-frame stripes in stripeCream and stripeYellow.
The hero, an adult in breeding plumage on G5, hovers in the upper-middle of the frame with a sand eel crosswise in its bill.
Below, from y 1260 to the bottom edge, a band of sea: sea with seaDeep horizontal hatching, foam surf lines, running to a strip of shingle at y 1640 to 1920 cut by the bottom edge.
A construction circle, inkFaint at 30 percent, centred on the body (560, 800), radius 660, passing through both wingtips.

### Forms

Bird per art bible 10.1: plumeWhite body with 5 px ink outline, plumeShade and fine mantleDeep hatching on the underside, breastGrey underparts, mantleGrey upperwing with mantleDeep feather edges, primaries with a thin capBlack trailing edge, capBlack cap with the eye inside it, billRed bill with billDeep gape line, legRed feet.
Sand eel: sandEelBack over sandEel, 110 px, jutting lower jaw, forked tail fin.

### Overlays

An annBlue dashed plunge line from the fish (338, 910) straight down to the water at (338, 1300), 2.5 px, drawn on over the shot.
An annYellow ring bursts from the body on beat 2.

### Motion

T 0.000: fully drawn, wings raised at the top of the hover stroke, so frame 0 works as the thumbnail.
T 0.083, 0.167, 0.250: the wings sweep down in three drawings (wrists at y 560, 660, 760), foreshortened.
T 0.500 (beat 2): the wings snap back up to G5 with a 110 percent overshoot for 2 frames; the annYellow ring expands from radius 60 to 620 with outExpo over 18 frames and fades by T 1.25; the stripes jolt 8 px along their normal and settle over 4 frames; the fish flips its tail.
T 1.000 (beat 3): a second, shallower wing stroke, one drawing down and back.
Throughout: the tail feathers tick plus or minus 3 degrees on twos, the surf lines slide left 4 px per beat, lines boil.

### Camera

Push-in from zoom 1.00 to 1.05 across the shot with inOutSine, world centre (540, 820).

### Enter and exit

Enters on frame 0 of the film and again on the loop replay.
Exits on a hard cut at T 1.5 to near-black navy.

### Subject

An adult Arctic tern in breeding plumage hovering over the sea at Sand Island, holding a sand eel.
Blood-red bill to the tip, black cap, white cheek stripe, grey underparts, translucent primaries with a thin black trailing edge.
Terns hover with the body tilted, tail spread, head angled down before they plunge.

### Sound

T 0.0: bar 1 downbeat, felt kick, FM marimba chord in E major add9, sine sub on E2.
T 0.083: a rising wing flutter, band-passed noise sweeping up.
T 0.5: the hook hit, a downward wing whoosh with a sub drop, and the four-note kalimba motif E5, G#5, B5, F#5 starts on 8ths; a short tern call, a two-note whistle glide 2.8 to 2.2 kHz ("kee-ar").
T 1.0: a small wing flutter.

---

## 02 egg-blueprint: A spark, an egg

T 1.5 to 4.0, schematic, hard cut in.

### Composition

Opens on navyDeep with a single spark, then builds the full blueprint.
Blueprint base: navy, 60 px grid, guide circles of radius 470 (lavender 14 percent) and 640 (lavender 8 percent) centred (540, 900), two corner-to-corner diagonals.
The egg on G1, lying on a ground band.
A length bracket at y = 1260 from x 160 to 920 with 10 ticks; a height bracket at x = 100 from y 622 to 1178.
A tick scale down the right edge at x = 1020, one tick every 40 px (decorative, outside the safe area).
The cycle ring at (900, 300) with the egg arc lit.

### Forms

Ground band from y 1178 to 1220: two lavender lines with a row of small rounded pebble cells, 20 to 36 px, between them.
Egg: the double lavender outline, a lattice of fine pores drawn as short lavender ticks at 30 percent all over the shell (rectangular cell net, 24 px cells), the blotches as schemEgg outlines only (never fills), the air cell arc in lineWhite, the yolk circle in lavender 50 percent with sparse stipple.
Nuclei: glow dots with 12 radial ticks.

### Motion

T 1.500: only a white 8-spike spark at (520, 700), flaring from 0 to 40 px over 3 frames and twinkling on twos.
T 2.000 (beat): the grid, circles and diagonals fade in over 6 frames, the ground band draws left to right, and the double outline draws from the blunt end around both sides to the narrow end over 6 frames with outExpo.
On the same beat the spark settles onto the blastodisc home (520, 760) over 6 frames with inOutCubic and becomes a glowing nucleus, trailing a magenta line that fades over 6 frames.
T 2.500 (beat): the yolk circle draws, the pore lattice sweeps in from the blunt end to the narrow end over 6 frames, the blotch outlines pop in on 16ths (2.5, 2.625, 2.75, 2.875), and the bracket ticks follow.
T 3.000 (beat): the nucleus divides into two (505 and 535, 760) with outBack over 3 frames; a magenta ring flashes radius 20 to 70 over 4 frames.
T 3.250: four nuclei; T 3.500 (beat): eight, spreading into a small disc on the yolk top.
T 3.750: the disc condenses into a curled embryo outline lying along the yolk, head toward the air cell, its egg-tooth point a lineWhite dot at (250, 860); 8 magenta lines radiate from the pip point (240, 800) for 4 frames.
Throughout: the guide circles rotate 6 degrees, the lattice boils.
The cycle ring: egg arc lights on T 2.0, progress fills to 100 percent by T 4.0.

### Camera

Locked at zoom 1, so the outline is exactly on G1 at the cut.

### Enter and exit

Enters on a hard cut from the hero to near-black.
Exits on a hard cut at T 4.0, a match cut on the egg outline into 03.

### Subject

The egg is 41 x 30 mm, blunt at one end, laid on the ground in a scrape.
The blotches are pigment in the shell surface; the air cell sits in the blunt end.
The embryo develops from a small disc on top of the yolk (general); the chick pips at the blunt end.

### Sound

T 1.5: everything drops out except a glassy sine ping on E6 with a long generated reverb.
T 2.0: a soft reverse swell under the outline draw and a glassy glide 3 kHz to 1.2 kHz over 250 ms as the spark settles.
T 2.5: a rising 16th-note bell arpeggio in E major pentatonic tracks the lattice sweep.
Division motif: two pings (B5, E6) at T 3.0, four in 32nds at T 3.25, an eight-ping ripple at T 3.5.
T 3.75: a crisp crackle, three high-passed noise clicks, for the pip signal.

---

## 03 egg-hatch: Pipping on the shingle

T 4.0 to 5.5, illustrated, hard cut in on a match cut.

### Composition

The first frame is the G1 egg at zoom 1 on the same pixels as the blueprint, seen low and side-on in its scrape.
Shingle ground from y 1100 down, a shallow scrape dipping to y 1178 under the egg; pebbles 40 to 140 px in the foreground, shinglePale lit tops and shingleDeep undersides, a few lichen crusts.
Above the ground: stripes in stripeYellow and stripeCream in screen space.
A second egg (the sibling) lies behind and to the right at world (1180, 980), 85 percent size, so it comes into view on the pull-back.
World is drawn beyond the frame for the pull-back: shingle from world x -800 to 1900, down to world y 3000.

### Forms

Egg: egg fill, eggPale on the upper-left, 5 px ink outline, eggBlotch and eggSpot markings in the same seeded positions as the blueprint blotch outlines, cross-hatched shade on the lower right third.
Chick: wet down at first (downGrey at 70 percent value with inkSoft strands), drying to downGrey with downSpeck speckles; big dark eye; bill pinkish with a white egg-tooth point.

### Overlays

An annYellow ring of radius 90 around the pip point (240, 800), 3 px.
An annBlue arc traces the cap lifting away at T 5.0.

### Motion

T 4.000 to 4.083: hold the match frame for 2 frames.
T 4.083 to 4.500: the egg rocks 1 degree left and right on twos; a star-shaped crack opens at the pip point on T 4.25, 6 short ink rays 20 to 40 px.
T 4.500 (beat): the crack runs as a jagged ring around the blunt end at x 250 (from y 660 to 1140); the egg-tooth tip pokes through the pip hole; 8 short annYellow ticks flash around it.
T 4.500 to 5.000: the camera pulls back.
T 5.000 (beat): the cap (the blunt end left of x 250) pushes off to the left and tips onto the shingle; the wet chick's head and shoulders spill out, head down on the pebbles; the blue arc draws along the cap's path.
T 5.250: the chick shoves free and lies curled beside the shell, its down beginning to fluff (outline spikier).

### Camera

T 4.0 to 4.5: zoom 1.00, world centre (540, 960).
T 4.5 to 5.0: pull back to zoom 0.45 with world centre (640, 900), outExpo.
T 5.0 to 5.5: hold at 0.45, drifting to 0.43.

### Enter and exit

Enters on a match cut from the lavender egg to the inked egg.
Exits on a hard cut at T 5.5.

### Subject

The chick pips at the blunt end, cuts a ring around it and pushes the cap off (general bird sequence).
Clutch of two olive-buff eggs camouflaged in a shingle scrape; the chick hatches downy with eyes open.

### Sound

T 4.0: a woody tock and the warm pluck chord return, the illustrated timbre.
T 4.25: a tiny dry tick for the first crack.
T 4.5: a crisp filtered-noise crack with a pitched pop on B4, then a lowpassed whoosh across the pull-back.
T 5.0: the cap tips over, a hollow clack on E5 with a pebble rattle.
T 5.25: a soft high peep, a short sine chirp 3.5 to 4 kHz.

---

## 04 chick-feeding: Four fish, four days

T 5.5 to 8.0, illustrated, hard cut in.

### Composition

A low view across the colony shingle: ground from y 1300 down, the sea as a band from y 1060 to 1300 with the far shore of Young Sound as a low ink line of hills at y 1060, sky stripes above in stripeYellow and stripeCream.
The chick stands at the scrape at (400, 1420); a pebble with orange lichen at (220, 1480).
The parent lands from the upper right, at 2.0 px per mm (adult 690 px long), each time touching down at (720, 1400).
A tally ring, annYellow 3 px, radius 60, at (860, 300), split into four segments, one per fish.
An annBlue ruler stands at x = 120 from y 900 to 1540, measuring the chick's height.

### Forms

Chick per art bible 10.5 at 2.0 px per mm: day 1 ball 100 px tall, day 6 130 px, day 11 170 px with dark pin feathers on the wings, day 16 220 px with grey mantle feathers and down tufts at the tips.
Parent per 10.1 in side view, landing with wings raised, sand eel in the bill; short red legs.
Sand eels per 10.8, 60 px at this scale.

### Overlays

The tally ring fills one segment per fish.
The ruler ticks every 40 px, an annMagenta mark jumps to the chick's head height on each growth step.
An annBlue trajectory line traces each parent's descent.

### Motion

The parent arrives on each beat from the upper right and the chick grows one step on the beat after the hand-off:
T 5.500: the day-1 chick peeps, bill up; the parent's shadow crosses the pebbles.
T 6.000 (beat): parent 1 lands (3 drawings: wings high, wings half, folded) and offers the fish down to the chick; T 6.125 the chick swallows it head first; tally segment 1 lights.
T 6.500 (beat): cut on the grid within the shot: the chick snaps to day 6, parent 2 already landing; tally 2.
T 7.000 (beat): day 11, pin feathers; parent 3; tally 3.
T 7.500 (beat): day 16, feathers unsheathing; parent 4 lifts off to the upper left instead of folding; tally 4, the ring closes and pulses once.
Throughout: the sea's surf lines slide 4 px per beat, lines boil, the chick blinks on T 6.75.

### Camera

Locked with a slow push from zoom 1.00 to 1.03 centred (540, 1300).

### Enter and exit

Enters on a hard cut.
Exits on a hard cut at T 8.0 to the blueprint ladder.

### Subject

Both parents feed the chick whole fish, mostly sand eels under 15 cm; the chick swallows them head first.
Chicks are brooded near the scrape and grow about 5.3 g a day between days 3 and 12; pin feathers show on the wings by about day 10.

### Sound

T 5.5: chick peeps on 16ths L and R, a small bright shaker.
T 6.0, 6.5, 7.0, 7.5: each landing is a soft wing whump plus a pebble crunch; each hand-off an FM boop rising E4, G#4, B4, E5 with a tiny gulp (band-passed click down 1.2 kHz to 600 Hz).
T 7.0: shaker 8ths enter.
T 7.5: a parent's "kee-ar" call as it lifts off.

---

## 05 growth-ladder: Thirteen grams to a hundred

T 8.0 to 9.5, schematic, hard cut in.

### Composition

Blueprint base. A vertical scale axis at x = 120 from y 260 to 1500, ticks every 60 px.
Five chick silhouettes in side view, stacked from the top (smallest) to the bottom (largest), each centred on x = 560: day 0 at y 360 (width 120), day 5 at y 560 (width 180), day 10 at y 800 (width 260), day 15 at y 1080 (width 340), day 20 at y 1380 (width 420, juvenile shape).
Beside each, at x = 860, a mass bar: a bracket whose length is proportional to mass (13, 30, 60, 90, 104 g) at 5 px per gram.
The cycle ring at (900, 300) with the chick arc lit.

### Forms

Silhouettes as double lavender outlines; down drawn as stippled fuzz along the outline; pin feathers as lineWhite quills with lavender sheaths on days 10 and 15; the day-20 juvenile drawn with clean feather edges and the short tail.
Mass bars in lavender with lineWhite ticks.

### Motion

T 8.000: all five draw on in order on 16ths (8.0, 8.125, 8.25, 8.375, 8.5), each with its mass bar.
T 8.500 (beat): the pin feathers on days 10 and 15 glow in turn; a magenta ring on day 10's wing marks the moment feathers break through.
T 9.000 (beat): the day-20 silhouette stands up tall and its wings lift to half height, the handoff pose; its outline brightens to lineWhite.
Throughout: the bars' ticks pulse on 8ths.

### Camera

Locked at zoom 1.

### Enter and exit

Enters on a hard cut from paper.
Exits on a hard cut at T 9.5 into 06, where the chick stands in the same place as the bottom silhouette.

### Subject

13 g at hatch, about 1/8 of adult mass; adult mass (about 104 g) at about 20 days.
Down first, pin feathers from about day 10, juvenile plumage complete by about day 20.

### Sound

T 8.0: five rising glass bell ticks on 16ths over a sub swell.
T 8.5: a soft FM bell for the feathers breaking through.
T 9.0: an upward pitch-bend whoosh as the juvenile stands.

---

## 06 wing-stretch: Down becomes wings

T 9.5 to 11.5, illustrated, hard cut in.

### Composition

The juvenile stands on a flat shingle rock (top at y 1324, resting on the beach ground line y 1420), facing left, three-quarter view, as on G2 by the end.
Background: stripes in stripeApricot and stripeCream; a low sea line at y 1320 behind the rock.
A construction line inkFaint 30 percent: the vertical through the shoulders, x = 540.

### Forms

Juvenile per 10.6: black bill, white forehead, smudgy black rear crown, dark carpal bar, scaly mantle with juvFringe edges, short tail; last down tufts clinging to the tips of the head and belly feathers at the start, blowing away during the shot.
Rock: shingleDeep with lichen spots.

### Overlays

An annYellow arc annotation sweeps along the near wing's leading edge as it rises.
An annBlue ruler measures the wing from wrist to tip as it unfolds.

### Motion

T 9.500: the bird crouches, wings folded, down tufts on its head.
T 10.000 (beat): it stands up tall (3 drawings); down tufts lift off and drift right.
T 10.500 (beat): the wings open half-way out to the sides.
T 11.000 (beat): the wings stretch up into the G2 V, outBack over 3 frames, primaries fanned; the arc annotation completes.
T 11.000 to 11.500: hold G2 exactly, only the tufts drifting.

### Camera

Locked at zoom 1.

### Enter and exit

Enters on a hard cut from the ladder.
Exits on a hard cut at T 11.5, a match cut on the G2 wings into 07.

### Subject

A fledgling around day 20: juvenile plumage with a black bill, white forehead and dark carpal bar, short tail; its flight feathers have just finished growing.

### Sound

T 9.5: tock and pluck.
T 10.0: a low stretch creak.
T 10.5: a soft cloth-like wing unfold, bandpass noise 400 Hz to 3 kHz over 200 ms.
T 11.0: a bright chord stab and three rising plucks B4, E5, G#5 on 11.0, 11.125, 11.25.

---

## 07 pin-feather: A feather unrolls from its sheath

T 11.5 to 13.0, schematic, hard cut in on a match cut.

### Composition

The G2 bird in lavender outline on the same pixels; the near wing is the focus.
Three node glyphs sit in the empty corners around the bird: the main cutaway at (180, 1330), radius 110 (clear of the bill tip at (290, 1172)); the sheath inset at (870, 1080), radius 60, right of the near wing's trailing edge; the vane inset at (870, 1400), radius 60, right of the tail.
The cycle ring at (900, 300) with the flight arc lit.

### Forms

Near wing primaries in double outline; one primary, P7, highlighted in lineWhite.
Main cutaway (180, 1330): a cross-section of a growing feather: the sheath as an outer ring, the pulp core with a blood vessel (schemBill dot), and the barb ridges as a ring of 16 small cells between them.
Small insets: (870, 1080) a sheath flaking at the tip; (870, 1400) the vane unrolled flat.
Thin curved lavender lines connect P7 to each inset.

### Motion

T 11.500: hold the match frame for 2 frames.
T 11.583 onward: P7 along the wing shows as a rolled quill inside a sheath; a bright glow dot travels up the core from the skin to the tip over 6 frames.
T 12.000 (beat): the sheath splits at the tip (magenta flash at the tip of P7, 8 frames), the insets draw on with outExpo.
T 12.500 (beat): the vane unrolls along P7 from tip toward base over 6 frames; the barb ridges in the cutaway separate and flatten into a vane in the vane inset; the blood dot fades (the feather becomes dead keratin).
T 12.750: every other primary unrolls in a ripple on 32nds.

### Camera

Locked at zoom 1.

### Enter and exit

Enters on a match cut on G2.
Exits on a hard cut at T 13.0 into the midnight sun.

### Subject

A new feather grows rolled inside a waxy sheath with a blood supply in its core; the sheath flakes from the tip and the vane unfurls; the finished feather is dead keratin (general).

### Sound

T 11.5: glass ping and a sub swell.
T 11.583: a rising glide as the glow climbs the core.
T 12.0: a crisp paper-tear crackle for the sheath split.
T 12.5: a soft unrolling shimmer, a fast glock arpeggio E6 down to E5 over 6 frames.
T 12.75: a ripple of 8 small pings.

---

## 08 midnight-sun: Days under a sun that never sets

T 13.0 to 16.0, illustrated, hard cut in.

### Composition

The juvenile stands on a boulder by the shore at (540, 1300), facing right, wings folded, 1.4 px per mm.
The shore of Young Sound: sea from y 1000 to 1400 with the far shore's hills at y 1000; shingle beach from y 1400 down.
The sun circles low across the sky on an ellipse centred (540, 760), radii 400 x 180 (x 140 to 940, y 580 to 940), so its lowest point at (540, 940) stays above the hill line at y 1000: it never sets.
A day tally ring, annYellow 3 px, radius 60, at (180, 300), with 3 notches.
Stripes in stripeApricot and stripeCream, with a low duskRose band over the hills when the sun is at its lowest.

### Forms

Juvenile per 10.6 at 1.4 px per mm.
Sun per G-standard: sun disc radius 40 with 12 ink ray ticks.
Hills: inkSoft line with moss patches and snow streaks (ice).
Sea: sea with seaDeep hatching and a sun glitter path of short foam dashes under the sun that moves with it.

### Overlays

The sun's path drawn as a dotted annYellow ellipse, 2.5 px, dots 4 px apart.
The tally ring lights one notch per completed circuit.
A thin annBlue shadow line from the bird's feet swings around opposite to the sun.

### Motion

The sun makes three full circuits, one per 1.0 s (two beats), counter-clockwise as seen, starting at the top at T 13.0: circuit 1 T 13.0 to 14.0, 2 T 14.0 to 15.0, 3 T 15.0 to 16.0, each notch lighting on 14.0, 15.0, 16.0 minus one frame.
The juvenile flaps in place (wing practice) on the beats: T 13.5 small flaps, T 14.5 bigger flaps, T 15.5 a hop 20 px up and down.
The sea glitter follows the sun; the bird's shadow swings.
T 15.750: the bird crouches, wings slightly lifted, ready: the flash into 09 follows.

### Camera

Locked at zoom 1.

### Enter and exit

Enters on a hard cut.
Exits on a cream flash at T 16.0 into first flight.

### Subject

At 74.7°N the sun stays up all summer: it circles low around the sky instead of setting.
Chicks fledge at 21 to 24 days; the young bird exercises its wings before the first flight.

### Sound

T 13.0: tock and pluck; a sustained high pad, open fifths, for the endless daylight.
T 13.5, 14.5: soft flutter bursts.
T 14.0, 15.0, 16.0 (one frame early): a metallic FM ting per completed day, rising B5, C#6, E6.
T 15.5: a hop, a woody tock.

---

## 09 first-flight: First flight

T 16.0 to 18.0, illustrated, flash transition in (kind flash, dur 0.125).

### Composition

On the midpoint downbeat a cream flash reveals the juvenile leaving the boulder.
Low angle from the beach: the boulder at the bottom-left at (300, 1500), the sky big, stripes in stripeSky and stripeCream.
By the end the bird is directly overhead on G3, seen from below.

### Forms

Juvenile per 10.6 at the G3 scale by the end; primaries translucent (primaryGlow) against the light, thin black trailing edge; black bill; carpal bar visible from above at the start, underwing (plumeWhite coverts) from below at the end.

### Overlays

An annBlue trajectory curve from the boulder up to the body, drawn on behind the bird.
Two rings, annYellow and annMagenta, burst from the bird on T 16.5.

### Motion

T 16.000: flash; the bird is already airborne 60 px above the boulder at (340, 1380), wings on the downstroke.
T 16.000 to 17.000: four wingbeats on the beats and 8ths, climbing toward the camera and the frame centre; each downstroke a 3-drawing sweep; size grows from 0.35 to 0.85 of G3.
T 16.500 (beat): the rings burst.
T 17.000 (beat): the bird banks and levels overhead.
T 17.500 (beat): it arrives exactly on G3, wings fully spread, and holds for the last 6 frames.

### Camera

T 16.0 to 17.5: the camera tilts up with the bird: world centre moves from (540, 1100) to (540, 900), zoom 1.0.
T 17.5 to 18.0: locked on G3.

### Enter and exit

Enters on a cream flash from the crouching bird.
Exits on a hard cut at T 18.0, a match cut on G3 into 10.

### Subject

Fledging at 21 to 24 days: the juvenile flies with a black bill and a short tail, its primaries translucent from below with a thin black trailing edge.

### Sound

T 16.0: bar 9 downbeat: crash, full kick, the full chord, the kalimba motif returns an octave up.
T 16.0, 16.25, 16.5, 16.75: four wingbeat whumps.
T 16.5: a bright rising whoosh with the rings.
T 17.0: a sustained "kee-ar" call.
T 17.5: the pad opens.

---

## 10 wing-schematic: Hand and arm, primaries and lift

T 18.0 to 19.5, schematic, hard cut in on a match cut.

### Composition

G3 in lavender outline on the same pixels.
Inside each wing: the wing bones as lineWhite lines: humerus from the shoulder to the elbow at (410, 820)/(670, 820), radius and ulna to the wrist (300, 735)/(780, 735), the hand bones from the wrist toward the tip, to (160, 800)/(920, 800).
Primaries fan from the hand, secondaries from the ulna.
Airflow: 6 streamlines in schemIce curve over the right wing from the leading edge to the trailing edge; 3 upward lift arrows (lineWhite) on the right wing.
Node glyphs: (160, 1300) radius 60, the hand with 10 primaries; (380, 1400) radius 60, the forearm with its secondaries; (820, 1400) radius 60, a wing section (airfoil) with the streamlines.
The cycle ring at (900, 300), flight arc lit.

### Motion

T 18.000 to 18.083: hold the match frame.
T 18.083: the bones draw on from the shoulder to the tip over 6 frames.
T 18.500 (beat): the primaries light one by one from P1 to P10 on 32nds (magenta on P10, 6 frames), the node glyphs draw on.
T 19.000 (beat): streamlines flow over the wing, the lift arrows pop with outBack; the camera starts easing toward the push-in target.

### Camera

T 18.0 to 19.0: locked.
T 19.0 to 19.5: ease toward the G3 target (880, 890), zoom 1.00 to 1.08, keeping (880, 890) fixed on screen.

### Enter and exit

Enters on a match cut from the inked bird.
Exits on a hard cut at T 19.5 into 11, which starts at zoom 1.08 on the same target.

### Subject

Primaries attach to the hand and are the longest, narrowest feathers; secondaries attach to the forearm (ulna) and are shorter and broader (general).
The Arctic tern's wings are long and narrow, aspect ratio 12.2, built for efficient long-distance flight.

### Sound

T 18.0: glass ping and bells.
T 18.5: a 10-note glock run up the E major scale on 32nds.
T 19.0: a smooth airy swell, band-passed noise sweeping 800 Hz to 2 kHz.

---

## 11 feather-mosaic: Push-in, barbs, barbules, hooks

T 19.5 to 22.0, illustrated, hard cut in.

### Composition

Starts on the inked G3 bird at zoom 1.08 around the target (880, 890).
Layers, each drawn at its own scale and anchored at the target:
Layer 1 (zoom 1 to 4): the underwing with the primaries' translucent vanes and the thin black trailing edge.
Layer 2 (zoom 4 to 12): one primary, P6: the rachis as a tapering ivory shaft, the narrow leading vane and broad trailing vane made of parallel barbs at 45 degrees.
Layer 3 (zoom 12 to 40): barbs in close-up: each barb a ridge with barbules branching on both sides, grooved barbules at 18 degrees, hooked barbules at 42 degrees.
Layer 4 (zoom 40): the hooklets on the hooked barbules catching the grooved barbules of the next barb, like a zip.
Stripes in stripeSky and stripeCream behind layer 1 only.

### Forms

Layer 1: primaryGlow with mantleDeep hatching along the shafts.
Layer 2: plumeShade barbs with ink edges, the rachis plumeWhite with an ink outline.
Layer 3 and 4: barbs mantleGrey ridges, barbules inkSoft lines, hooklets ink with tiny hooks.

### Overlays

An annYellow target ring stays on the target through the push.
An annBlue scale bar at the bottom left shortens at each layer step.
At layer 4 an annMagenta ring marks a split in the vane that zips shut.

### Motion

T 19.500 to 20.000: layer 1, zoom 1.08 to 4.
T 20.000 (beat): layer 2 arrives.
T 20.500 (beat): zoom 12, layer 3.
T 21.000 (beat): zoom 40, layer 4: two barbs pulled apart (a split) with the hooks open.
T 21.500 (beat): the split zips shut from the rachis side outward over 6 frames, hooks catching one by one on twos; the magenta ring fades.

### Camera

One continuous exponential push-in from zoom 1.08 to 40, the steps landing on the beats, keeping the target fixed at screen (880, 890) until T 20.5 and then easing it to the frame centre (540, 960) by T 21.0.

### Enter and exit

Enters on a hard cut on the same target at zoom 1.08.
Exits on a hard cut at T 22.0.

### Subject

A flight feather: a shaft (rachis) with barbs; each barb carries barbules; hook barbules on the tip-ward side catch the grooved bow barbules of the next barb like a zip; a split vane is re-zipped by preening.
Barbule spacing is 8 to 16 µm in every bird measured.

### Sound

T 19.5: a rising filtered sweep for the push.
T 20.0, 20.5, 21.0: three deepening "zoom" thumps, subDrop E2, B1, E1.
T 21.5: a zipper, 12 tiny clicks on 32nds panned left to right, and a soft chord resolution.

---

## 12 two-summers: Chasing the light pole to pole

T 22.0 to 23.5, schematic, hard cut in.

### Composition

A globe, orthographic, centred (540, 900), radius 360, centred on 0° latitude and 25°W, lavender double outline with a graticule every 15 degrees at 30 percent.
Coastlines of the Americas' east coasts, Europe, Africa, Greenland and Antarctica in lavender 60 percent.
The terminator: the day side lit by a faint glow wash and hatched lavender night side.
The sun as a glow dot at (975, 900) with 12 ticks, just beyond the globe's right limb (decorative, outside the safe area).
A small tern marker (glow dot with a schemBill tick) on the globe at the colony.
The cycle ring at (900, 300), migration arc lit.

### Motion

T 22.000: June: the terminator tilted so the whole Arctic is in daylight; the tern marker at Sand Island (74.7N).
T 22.500 (beat): the terminator swings over 12 frames toward the equinox; the marker jumps south along the Atlantic in steps on 8ths, staying on the day side.
T 23.000 (beat): December: the terminator tilted the other way, Antarctica lit; the marker reaches the Weddell Sea; a magenta ring flashes at the marker.
T 23.250: two small arcs mark the two lit polar caps, one fading and one bright.

### Camera

Locked at zoom 1; the globe rotates 10 degrees east over the shot.

### Enter and exit

Enters on a hard cut.
Exits on a hard cut at T 23.5.

### Subject

Arctic terns breed in the Arctic summer and spend the southern summer at the Antarctic ice edge: two summers a year and more daylight than any other animal.

### Sound

T 22.0: glass ping, pad on the IV chord.
T 22.5: 8th-note stepping plucks descending as the marker moves south.
T 23.0: a bright bell and a magenta stab.

---

## 13 pull-back-atlantic: Pull-back, colony, fjord, Greenland, Atlantic

T 23.5 to 26.5, illustrated, hard cut in.

### Composition

One continuous zoom out through nested layers, each its own drawing at its own scale:
Layer 1 (T 23.5): the colony on Sand Island at eye level: several adults and juveniles standing on the shingle, a pair displaying, sea behind; stripes in polarSky and stripeCream.
Layer 2 (T 24.0): Sand Island from above: a low gravel island with hundreds of tiny tern dots, surf lines.
Layer 3 (T 24.5): Young Sound fjord and the NE Greenland coast with ice and mountains, the island a speck.
Layer 4 (T 25.0 to 26.5): the Atlantic on G4: land in mapLand with engraved coastline hatching in seaDeep, sea in mapSea, the Greenland ice cap in ice, Antarctica's coast and pack-ice edge in ice and iceShade at the bottom.

### Overlays

The route on G4 as annMagenta dashed lines: T 25.0 the colony to the North Atlantic stopover (an annYellow box around the stopover area); T 25.5 down to the split at 10°N, where the line forks: the Africa leg and the Brazil leg draw on in parallel; T 26.0 both reach the Weddell Sea (an annYellow ring around the wintering box); T 26.25 the northbound S-track draws in annBlue from the Weddell Sea up to the colony.

### Motion

The tern dots on layer 2 flicker on twos; layer 3's ice floes drift.
The route draws on at 24 fps.
A tiny tern glyph rides the head of each route line.

### Camera

One log-linear zoom-out from zoom 1 (layer 1) to the G4 map, each layer landing on its beat, the colony anchored so it lands on G4 (536, 238) at T 25.0; T 25.0 to 26.5 locked on the map.

### Enter and exit

Enters on a hard cut.
Exits on a hard cut at T 26.5.

### Subject

Greenland birds leave in August, stop about 25 days in the North Atlantic (41 to 53°N, 27 to 41°W), split south of Cape Verde at about 10°N (7 of 11 down the African coast, 4 of 11 along Brazil), and winter south of 58°S in the Weddell Sea sector.
They return north in 40 days on an S-shaped track that rides the prevailing winds: 70,900 km a year.

### Sound

T 23.5: bar 12, a lowpassed ambient wash (wind and surf) and a colony chatter of "kip" calls.
T 24.0, 24.5, 25.0: three whooshes, each lower, as the layers pull out.
T 25.0 to 26.25: a travelling marimba line in 8ths following the route.
T 26.0: a gong-like swell at the Weddell Sea.
T 26.25: a fast rising arpeggio for the return track.

---

## 14 ocean-flock: Riding the winds south

T 26.5 to 28.0, illustrated, hard cut in.

### Composition

Open ocean from a low angle: sea from y 1200 down, long swells hatched in seaDeep, the horizon at y 1200 under a big sky with stripes in polarSky and stripeCream.
Four loose groups of 5 to 8 terns (never a V) flying from the upper right toward the lower left, larger toward the camera; the nearest group at the frame centre with one lead bird called out.
Wind arrows (annBlue) sweep across the sky in long curved lines from right to left.

### Forms

Terns in side and three-quarter views, non-breeding and juvenile plumage mixed (black bills, white foreheads) because this is autumn migration.
Swells: sea with seaDeep hatching, foam on the crests.

### Overlays

An annYellow ring on the lead bird.
Curved annBlue wind lines.
A dotted annYellow sun arc from (60, 520) through (540, 220) to (1020, 520) with the sun at the right end.

### Motion

The flock moves on twos, each bird flapping with its own seeded phase; the lead bird's ring pulses on beats.
T 27.000 (beat): the whole flock banks and drops a little with the wind lines.
T 27.500 (beat): a gust: the wind lines surge and the flock glides with wings set.
Throughout: the swells roll left 6 px per beat.

### Camera

Locked with a slow drift 20 px to the left and a 2-degree tilt across the shot.

### Enter and exit

Enters on a hard cut.
Exits on a hard cut at T 28.0.

### Subject

Migrating terns fly in small loose groups, typically 6 or 7 birds, at about 9.8 m/s, riding the prevailing winds; southbound 330 km a day.

### Sound

T 26.5: wind noise pad, the flock's distant "kip" calls panned.
T 27.0: a gust whoosh.
T 27.5: a soaring lead line, the motif E5, G#5, B5, F#5 on a soft horn.

---

## 15 pack-ice: Summer on the Antarctic ice

T 28.0 to 29.5, illustrated, hard cut in.

### Composition

The Weddell Sea pack-ice edge: floes of ice and iceShade scattered on seaDeep water from y 1000 down, big floes in the foreground; a low sun on a dotted arc above the horizon at y 900; stripes in polarSky and stripeCream.
Terns in winter plumage rest on the floes, 3 to 6 per floe; one stretches a wing with a gap where a primary has moulted.
A month tally along the top: five small circles at y 300 from x 300 to 780 (Dec, Jan, Feb, Mar, Apr), filled one by one.

### Forms

Winter adults per 10.11: white forehead, black bill and legs, dark carpal bar, shorter streamers.
Floes: ice with iceDeep hatched edges; loose moulted feathers drifting on the water.

### Overlays

The month tally circles in annYellow.
An annBlue arrow at the end pointing north (up) as the birds take off.

### Motion

T 28.000: birds resting, the Dec circle already filled; T 28.25, 28.5, 28.75, 29.0: Jan, Feb, Mar, Apr fill, one per 8th note; floes drift slowly on twos; a feather falls on each beat.
T 29.000 (beat): the birds lift off together, wings up; the blue arrow draws on.
T 29.250: the flock streams up and out of the top of the frame.

### Camera

Locked at zoom 1.

### Enter and exit

Enters on a hard cut.
Exits on a hard cut at T 29.5.

### Subject

Greenland birds winter about 149 days at the Antarctic pack-ice edge south of 58°S, resting on floes and moulting their flight feathers; they leave in mid-April and fly north in about 40 days.

### Sound

T 28.0: a cold high pad with a slow tremolo, ice creaks (low filtered noise).
T 28.25, 28.5, 28.75, 29.0: a soft ting on each month.
T 29.0: a rising wing burst and a bright call.

---

## 16 return-egg: Home, a new egg

T 29.5 to 30.5, illustrated, hard cut in.

### Composition

Back on Sand Island: shingle, sea, stripes in stripeYellow and stripeCream (the Act 1 band returns).
An adult in breeding plumage (red bill, black cap, long streamers) stands at a scrape at (560, 1200) with a sand eel in its bill; the mate lands beside it; two eggs lie in the scrape.
The world is drawn so that the first egg in the scrape sits at world point (470, 1320), 38 px long, lying on its side, blunt end left, the same blotch pattern as G1 at 1/20 scale.

### Forms

Adults per 10.1; eggs per 10.3.

### Overlays

An annYellow ring on the egg on T 30.0, then the ring tightens as the camera snaps.

### Motion

T 29.500: the mate lands (3 drawings) and offers the fish (courtship fish-feeding).
T 29.750: the sitting bird rises slightly, revealing the eggs.
T 30.000 (beat): the snap zoom starts.
T 30.417 to 30.500: the egg fills the frame exactly on G1 and holds 2 frames.

### Camera

T 29.5 to 30.0: locked at zoom 1.
T 30.0 to 30.417: snap zoom from 1 to 20 onto the egg, keeping it on the path to G1: the egg's world centre (470, 1320) lands on screen (540, 900) with the egg 760 px long; outExpo arrival.

### Enter and exit

Enters on a hard cut.
Exits on a hard cut at T 30.5, a match cut on the G1 egg into 17.

### Subject

Terns return to the same colony, pair for life and lay again: the new clutch starts the cycle.
The mate offers a fish in courtship.

### Sound

T 29.5: tock, pluck and colony calls.
T 29.75: a fish-flight call pair.
T 30.0: a fast rising whoosh for the snap zoom, ending in a glass ping on T 30.5.

---

## 17 egg-loop: Back to the egg

T 30.5 to 32.0, schematic, hard cut in on a match cut.

### Composition

The 02 blueprint egg on G1, fully drawn on the first frame: outline, pore lattice, blotch outlines, air cell, yolk, a single nucleus at the blastodisc home.
The wordmark "arctic tern" per art bible 9: centred on x 540, baseline y 1470.
The cycle ring at (900, 300): all four arcs complete.

### Motion

T 30.500: full frame drawn.
T 31.000 (beat): the cycle ring closes with a lineWhite flash around its whole circle; then only the egg arc stays lit.
T 31.000: the wordmark fades in over 6 frames.
T 31.500 (beat): the nucleus pulses once; the frame then holds 02's fully built plate (egg, lattice, blotches, single nucleus), and the hard cut loops into 01.

### Camera

Locked at zoom 1.

### Enter and exit

Enters on a match cut from the inked egg.
Exits on the loop to 01 (hard cut).

### Subject

The loop: the egg that starts the next tern's life.

### Sound

T 30.5: a glass ping on E6 and the pad on the tonic.
T 31.0: a soft bell chord for the wordmark.
T 31.5: the level matches bar 1 so the loop seam is clean; a reverse swell into the downbeat.
