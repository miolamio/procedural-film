# Storyboard: The life of a monarch butterfly

## Logline

A monarch grows from a 1.2 mm egg glued under a milkweed leaf, flies up to 4,800 km to a Mexican fir forest it has never seen, and lays the egg that starts the cycle again.
Warm ink illustrations show the life, navy blueprints show what happens inside, and every cut lands on a 120 bpm grid in a tall 9:16 frame.

## Numbers

- BPM: 120 (beat 0.5 s = 12 frames, 8th = 6 frames, 16th = 3 frames).
- Duration: 32.0 s, 16 bars of 4/4, 768 frames at 24 fps.
- Frame: 1080 x 1920.
- Shots: 17, each 1.0 to 3.0 s, every boundary on the 0.5 s grid.

## Summary

| Order | Id | Start | End | Mode | Title |
|---|---|---|---|---|---|
| 01 | hero-on-milkweed | 0.0 | 1.5 | illustrated | Cold open: the monarch |
| 02 | egg-blueprint | 1.5 | 4.0 | schematic | A spark, an egg |
| 03 | egg-hatch | 4.0 | 5.5 | illustrated | First meal: the eggshell |
| 04 | larva-molts | 5.5 | 8.0 | illustrated | Four molts up the stem |
| 05 | instar-ladder | 8.0 | 9.5 | schematic | Growth, stored poison, hidden wings |
| 06 | j-hang | 9.5 | 11.5 | illustrated | The J, then the chrysalis |
| 07 | inside-chrysalis | 11.5 | 13.0 | schematic | Rebuilt, not melted |
| 08 | chrysalis-days | 13.0 | 16.0 | illustrated | Twelve days by the sun |
| 09 | eclosion | 16.0 | 18.0 | illustrated | Emergence |
| 10 | wing-veins | 18.0 | 19.5 | schematic | Veins as plumbing |
| 11 | scale-mosaic | 19.5 | 22.0 | illustrated | Push-in: the wing is a mosaic |
| 12 | sun-compass | 22.0 | 23.5 | schematic | A clock in the antennae |
| 13 | pull-back-continent | 23.5 | 26.5 | illustrated | Pull-back: leaf, plant, meadow, continent |
| 14 | migration-column | 26.5 | 28.0 | illustrated | The column heads south-west |
| 15 | oyamel-winter | 28.0 | 29.5 | illustrated | Winter on the firs |
| 16 | spring-egg | 29.5 | 30.5 | illustrated | Spring: a new egg |
| 17 | egg-loop | 30.5 | 32.0 | schematic | Back to the egg |

## Structure

Act 1, bars 1 to 4 (0 to 8 s): hero, egg, hatch, larva.
Act 2, bars 5 to 8 (8 to 16 s): toxin and wing discs, J-hang, inside the pupa, twelve days.
Act 3, bars 9 to 12 (16 to 24 s): emergence on the midpoint downbeat, veins, scales, sun compass.
Act 4, bars 13 to 16 (24 to 32 s): the pull-back to the continent, the column, winter, spring, the loop.
Modes alternate as in the reference, with an illustrated run through the migration.
Match cuts: egg (02 to 03, 16 to 17), J (05 to 06), chrysalis (06 to 07 to 08), hanging adult (09 to 10 to 11).
Push-ins: 11 (40x into scales) and 16 (47x snap onto the egg).
Pull-backs: 03 (egg to leaf) and 13 (leaf to continent).
Time devices: the sun and moon crossing an arc once per day with a tally ring (08), antenna clocks (12), moons counting winter months (15), shed head capsules as a molt tally (04), and the cycle glyph filling its four arcs (02 to 17).

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

## Shared geometry

Scenes that share a shape copy these numbers exactly, or the match cuts jump. `src/geo.js` holds the same tables as data (G1 and G3 as profiles, measured by gate check 7 on the cuts 02 > 03, 16 > 17, 06 > 07, 07 > 08 and 09 > 10).

### G1: egg, hanging under a leaf (02, 03, 16, 17)

The axis is x = 540.
The flat base is glued to the leaf underside at y = 520 and the rounded tip points down to y = 1280.
Half-width by height: y 520: 180; y 560: 225; y 620: 262; y 700: 282; y 790: 285 (widest, 570 px); y 880: 276; y 980: 250; y 1080: 208; y 1160: 160; y 1220: 110; y 1260: 60; y 1280: 0.
Height 760 px against width 570 px keeps the true 1.2 : 0.9 ratio.
18 longitudinal ridges run base to tip as meridians that crowd toward the silhouette edges.
34 transverse cross-ribs run between the ridges, their spacing shrinking toward the tip.
The micropyle rosette is 6 petal cells around a pinpoint, centred (540, 1262), radius 26.
Nucleus home position: (540, 860).
The leaf underside edge is the line y = 520.

### G2: J-hang (05 end, 06 start)

The silk pad is centred (540, 300).
The body centre line runs (540, 300), (540, 760), (556, 840), (600, 880), (660, 870), (705, 830), with the head capsule centred (720, 790).
Body width is 70 px at the pad, 120 px at y 760 and 100 px behind the head, and the head capsule is 58 px wide.

### G3: chrysalis, hanging (06 end, 07, 08, 09 shell, 10 shell)

A twig underside sits at y = 300, and the silk pad is centred (540, 300).
The black cremaster runs from (540, 300) to (540, 332), 10 px wide.
Case half-width by height: y 332: 35; y 380: 72; y 440: 106; y 500: 124; y 600: 130 (widest, 260 px); y 700: 127; y 800: 108; y 860: 78; y 895: 36; y 905: 0.
The rim band crosses the front at y = 515: a black band 10 px tall with a row of 12 gold dots (radius 6) along its lower edge.
Gold dots near the bottom: 5 dots on a shallow arc from (495, 830) through (540, 850) to (585, 830), plus 2 dots on each side at y 560.
The wing-case line runs on the front from (430, 560) through (470, 760) to (560, 890).
Orientation is abdomen up at the cremaster and head down at y 860 to 905, with the ventral side and wing case on the left.

### G4: hanging adult after emergence (09 end, 10, 11 start)

The empty case is on G3, split open at its bottom.
Head centre (540, 935), radius 28.
Antennae rise from the head to clubs at (495, 760) and (590, 760).
Thorax: ellipse centred (540, 995), 56 px wide and 72 px tall.
Abdomen: swollen, y 1031 to 1240 and 84 px wide, then slim, y 1031 to 1175 and 50 px wide.
Middle and hind legs reach up to grip the split rim near y 900, and the forelegs fold against the thorax.
Closed wings hang on the right side of the body, showing their undersides.
Forewing: base (565, 985), leading edge bowing right to the apex at (790, 1450), outer margin back up-left to the tornus at (560, 1290), inner margin straight up to the base.
Hindwing: base (570, 1005), mostly behind the forewing, its visible lobe below the forewing outer margin reaching a lowest point at (620, 1420), inner margin along x = 570.
Push-in target for 10 and 11: (735, 1400), on the black forewing margin near the apex, where a vein ends beside a white spot.

### G5: hero adult from above (01, 13 layer 1)

Thorax centre (540, 900), head centre (540, 830) radius 30, abdomen tip (540, 1110).
Forewing tips (80, 640) and (1000, 640), forewing tornus points (300, 1010) and (780, 1010).
Hindwing outer extremes (230, 1150) and (850, 1150), meeting the body again at (520, 1210) and (560, 1210).
Wingspan 920 px, antenna clubs at (470, 660) and (610, 660).

### G6: map projection (13 layer 5)

x = 540 + (longitude + 88) x 27 and y = 1450 - (latitude - 19.5) x 32, with west longitudes negative.
The frame spans longitude -108 to -68 and latitude about 5 N to 65 N.
Anchors: Michoacán overwintering site (19.6 N, 100.3 W) at (208, 1447); Mexico City at (240, 1453); San Antonio, Texas at (256, 1133); Florida tip at (732, 1271); Yucatán tip at (567, 1386); Lake Superior centre at (554, 548); Lake Michigan at (567, 666); Lake Huron at (691, 640); Lake Erie at (724, 723); Lake Ontario at (815, 675); James Bay at (756, 442); New York at (918, 772); Cape Hatteras at (878, 948).
The flight anchor in southern Ontario (44 N, 80 W) is at (756, 666).

### G7: sun-path arc (08, 14)

A dotted annYellow arc, 2.5 px, dots 4 px apart, through (60, 520), (540, 200) and (1020, 520).
The sun is a sun-coloured disc of radius 46 with 12 ink ray ticks.

---

## 01 hero-on-milkweed: Cold open, the monarch

T 0.0 to 1.5, illustrated, enters on the film start and the loop replay.

### Composition

Full-frame stripes in stripeCream and stripeYellow at the art-bible width and angle.
The hero is an adult female seen from above with wings fully open, on G5.
Her thorax sits at (540, 900), a little above the frame centre, and her wings fill the middle of the frame from x 80 to 1000.
A common milkweed flower ball sits behind her, centred (540, 1150) with radius 220, so florets show between and below her hindwings from y 1210 to 1370 and at both sides.
A milkweed stem, 30 px wide, runs from the bottom of the ball at y 1370 down to the bottom edge at x 540.
A leaf pair branches from the stem at y 1520, each leaf a broad oval 460 px long angled 20 degrees up, tips near (110, 1370) and (970, 1370).
A second leaf pair branches at y 1840 and is cut by the bottom edge.
A dew drop, radius 16, sits on the left leaf at (310, 1480).

### Forms

Wings: flat monarch cells with veinBlack vein bands 18 px wide at the base tapering to 8 px, female width, and no hindwing scent spot.
Black borders are 36 px wide with two rows of spotWhite dots of 8 to 12 px.
The black forewing tips carry three small orange spots and a short band of white spots.
monarchDeep hatching at 8 px spacing runs along the vein edges near the body.
Body: veinBlack, with spotWhite dots on the head and thorax, large dark eyes, antennae 4 px wide ending in 14 px clubs.
Four thin black legs grip florets at the top of the ball, and the tiny forelegs fold against the thorax.
Florets: about 40 milkweedFlower stars, each with five swept-back petals and a milkweedCrown centre, cross-hatched on the lower-right half of the ball.
Leaves: milkweed with a milkweedPale midrib, paired side veins, milkweedDeep hatching between the veins and fine stipple hairs.
The dew drop is outlined in ink with a white highlight crescent.
Construction lines in inkFaint at 30 percent: the body axis x = 540 from top edge to bottom edge, and a circle of radius 520 centred on the thorax touching both forewing tips.

### Overlays

Two rings, annYellow and annMagenta, 3 px, burst from the thorax on beat 2.

### Motion

T 0.000: the frame is fully drawn with wings flat open, so frame 0 works as the thumbnail and the hook.
T 0.083, 0.167, 0.250: the wings rise toward the camera in three drawings, span 75, 50 and 30 percent of full, foreshortened about the body axis.
T 0.250 to 0.500: hold at 30 percent.
T 0.500 (beat 2): the wings slam down, one drawing at 110 percent span for 2 frames, then 100 percent at T 0.583.
On the slam, both rings expand from radius 60 to 620 with outExpo over 18 frames and fade out by T 1.25, the stripes jolt 8 px along their normal and settle over 4 frames, and the antennae whip back 6 degrees.
T 1.000 (beat 3): the wings lift to 85 percent for one drawing and return to 100 percent at T 1.083.
Throughout: florets bob plus or minus 3 px with seeded phase on twos, antennae tick 4 degrees apart on each beat, lines boil.

### Camera

Push-in from zoom 1.00 to 1.05 across the shot with inOutSine, world centre (540, 920).

### Enter and exit

Enters on frame 0 of the film and again on the loop replay.
Exits on a hard cut at T 1.5 to near-black navy.

### Biology

An adult female Danaus plexippus on common milkweed (Asclepias syriaca).
She is female: wide black veins and no scent spot on the hindwings.
She stands on four legs because the front pair is tiny and held against the body.
The orange and black pattern warns birds of the milkweed toxins she stored as a caterpillar.
She is the mother of the egg that the next shot follows.

### Sound

T 0.0: bar 1 downbeat, soft felt kick, warm FM marimba chord in D major add9, sine sub on D2.
T 0.083: a soft rising flutter, band-passed noise sweeping up, as the wings lift.
T 0.5: the hook hit, a downward wing whoosh with a sub drop, and the four-note kalimba motif D5, F#5, A5, E5 starts on 8ths.
T 1.0: a small flutter on the wing lift.

---

## 02 egg-blueprint: A spark, an egg

T 1.5 to 4.0, schematic, hard cut in.

### Composition

The shot opens on navyDeep with a single spark, then builds the full blueprint.
Blueprint base: navy, 60 px grid, guide circles of radius 470 (lavender 14 percent) and 640 (lavender 8 percent) centred (540, 900), and two corner-to-corner diagonals.
The egg is on G1, hanging from the leaf band.
A height bracket with 10 ticks runs at x = 880 from y 520 to 1280.
A width bracket runs at y = 1330 from x 255 to 825.
A tick scale runs down the left edge at x = 60, one tick every 40 px.
The cycle glyph sits at (900, 300) with the egg arc lit.

### Forms

Leaf cross-section band from y 480 to 520: two lavender lines with a row of small rectangular cells 24 px wide between them, and trichome ticks 8 to 14 px long hanging below it every 18 px, except where the egg is glued.
Egg: the double lavender outline, 18 ridges and 34 cross-ribs in lavender lattice weight, the micropyle rosette at the tip in lineWhite, and sparse lavender yolk stipple at 20 percent inside.
Nuclei: glow dots with 12 radial ticks.

### Motion

T 1.500: only a white 8-spike star-burst spark at (540, 1340), just below where the tip will be, flaring from 0 to 40 px over 3 frames and twinkling on twos.
T 2.000 (beat): the grid, circles and diagonals fade in over 6 frames, the leaf band draws left to right, and the double outline draws from the base down both sides to the tip over 6 frames with outExpo.
On the same beat the spark slides up the axis through the micropyle to the nucleus home (540, 860) over 6 frames with inOutCubic, trailing a magenta line that fades over 6 frames, and becomes a single glowing nucleus.
T 2.500 (beat): the ridges then the cross-ribs sweep in from base to tip over 6 frames, the yolk stipple fills in, and bracket ticks pop in on 16ths (2.5, 2.625, 2.75, 2.875).
T 3.000 (beat): the nucleus divides into two that slide to (540, 830) and (540, 890) with outBack over 3 frames, and a magenta ring flashes between them, radius 20 to 70 over 4 frames.
T 3.250: each divides again, four nuclei at (510, 830), (570, 830), (510, 890), (570, 890).
T 3.500 (beat): eight nuclei, which glide over 6 frames to a ring just inside the shell wall, with no cell walls drawn.
T 3.750: the yolk stipple condenses over 4 frames into a curled C-shaped larva lying along the inner wall, with 13 segment ticks and a head capsule drawn as a navyLight ellipse 120 px wide with a lineWhite rim at (540, 1190), just above the tip.
On the same 16th, 8 magenta lines radiate from the tip, 40 to 160 px long, for 4 frames.
Throughout: the guide circles rotate 6 degrees across the shot and the lattice boils.

### Camera

Locked at zoom 1, so the outline is exactly on G1 at the cut.

### Enter and exit

Enters on a hard cut from the orange hero to near-black, the reference's spark beat.
Exits on a hard cut at T 4.0, a match cut on the egg outline into 03.

### Biology

The egg is about 1.2 mm tall and 0.9 mm wide, ribbed from base to tip, and glued under a milkweed leaf.
The shell forms before fertilisation, so sperm enter through the micropyle at the tip.
Early insect embryos copy their nuclei many times inside one shared cell before cells form (general).
About four days after laying, the larva's dark head shows through near the tip.

### Sound

T 1.5: everything drops out except a glassy sine ping on D6 with a long generated reverb.
T 2.0: a soft reverse swell under the outline draw and a glassy downward glide from 3 kHz to 1.2 kHz over 250 ms as the spark threads the micropyle.
T 2.5: a rising 16th-note bell arpeggio in D major pentatonic tracks the lattice sweep.
Division motif, the number of pings equals the number of nuclei: two pings (A5, D6) at T 3.0, four in 32nds at T 3.25, an eight-ping ripple at T 3.5.
T 3.75: a crisp crackle, three high-passed noise clicks, for the hatch signal.

---

## 03 egg-hatch: First meal, the eggshell

T 4.0 to 5.5, illustrated, hard cut in on a match cut.

### Composition

The first frame is the G1 egg at zoom 1, on the same pixels as the blueprint.
The leaf underside fills everything above y = 520, seen edge-on and slightly from below.
Below the leaf, stripes in stripeSage and stripeCream are drawn in screen space, not under the camera, so the pull-back reads from the leaf and egg alone.
The camera pulls back during the shot, so the world must be drawn beyond the frame: the leaf underside spans world x -700 to 1780 and world y -1400 to 520.
A second milkweed stem is a single ink line at world x 1300 from world y 520 down to 3000, with one hatched leaf at world (1300, 2300).
A construction line in inkFaint at 30 percent continues the egg axis from world y 1280 down to 3000.

### Forms

Leaf underside: milkweed with a milkweedPale vein net, milkweedDeep hatching between veins, and a fringe of white trichome hairs 10 to 18 px long every 8 px along its lower edge.
Egg: egg-coloured fill, 5 px ink outline, 18 ridges and 34 cross-ribs in inkSoft at 1.8 px, cross-hatched shade on its right third.
Showing through the shell near the tip: a grey curled shape (inkFaint at 50 percent) and a dark head oval 260 px wide centred (540, 1140).
First-instar larva, world size: 1100 px long and 220 px wide, larvaFirst, shiny and translucent, 13 ruled segment lines, sparse long dark setae, three pairs of tiny true legs, five pairs of stubby prolegs, no bands.
Its head capsule is veinBlack, 300 px wide, wider than the body, with a white highlight crescent, pale spots near the antennae, and two dark triangular patches just behind it.

### Overlays

An annYellow ring of radius 90 world px around the tip at (540, 1262), 3 px in screen space.
An annBlue arc traces the larva's turn at T 5.0.

### Motion

T 4.000 to 4.083: hold the match frame for 2 frames.
T 4.083 to 4.500: the head shadow twitches on twos and a small black chew crescent opens at the tip on T 4.25.
T 4.500 (beat): the tip cracks along a jagged ring at y 1170, the cap and 10 to 12 shell fragments pop outward on seeded arcs on twos, 8 short annYellow ticks flash around the hole, and the black head pushes out downward.
T 4.500 to 5.000: the larva hauls itself out in 4 drawings on twos, its body pouring out and looping down and right, then back up the right side of the shell, ending with its head at world (760, 1050) facing the shell.
T 5.000 (beat): the first bite, a scalloped chunk about 200 world px wide vanishes from the lower shell, 6 cream flecks scatter, the yellow ring pulses outward once, and the blue arc draws along the head's turn.
T 5.250: the second bite eats the shell back to half its height, leaving a ragged ink edge.

### Camera

T 4.0 to 4.5: zoom 1.00, world centre (540, 960).
T 4.5 to 5.0: pull back to zoom 0.45 with world centre (540, 820), outExpo.
T 5.0 to 5.5: hold at zoom 0.45, drifting to 0.43.

### Enter and exit

Enters on a match cut from the lavender egg to the inked egg.
Exits on a hard cut at T 5.5.

### Biology

The larva chews out through the tip of the egg, which points down because the egg hangs under the leaf.
A newly hatched larva is about 2 mm long, pale grey-green, shiny and translucent, with a black head that can be wider than its body.
Its first meal is its own eggshell, then the hairs on the leaf underside.

### Sound

T 4.0: a woody tock and the warm pluck chord return, the illustrated timbre.
T 4.5: a crisp filtered-noise crack with a pitched pop on A4, then a lowpassed whoosh opening across the pull-back.
T 5.0 and 5.25: dry bites, 20 ms band-passed noise at 2.5 kHz through a short woody resonator, each slightly lower, with tiny scatter ticks.

---

## 04 larva-molts: Four molts up the stem

T 5.5 to 8.0, illustrated, hard cut in.

### Composition

A milkweed stem runs the full height at x = 540, 44 px wide.
Three opposite leaf pairs branch from it at y 1650, 1050 and 450, each leaf a broad oval 470 px long angled 20 degrees up.
The lower pair shows first-instar trenching, the middle pair shows edge feeding, and the top pair is intact.
Background stripes in stripeSage and stripeCream.
A caterpillar climbs the stem head-up, drawn at 10.2 px per mm.
An annBlue ruler stands at x = 920 from y 240 to 1540.

### Forms

Stem: milkweedStem, hatched down its right side, fringed with fine hair ticks.
Leaves: milkweed, milkweedPale midrib, milkweedDeep hatching parallel to the side veins.
Lower-left leaf: a circular trench, a chewed furrow of radius 45 centred (320, 1580), with 8 white latex beads of radius 5 on its outer rim and an arc-shaped hole eaten inside it.
Lower-right leaf: a second trench at (760, 1590), eaten further, a crescent hole with a brown ink edge.
Middle leaves: arc holes and edge notches 60 to 120 px across with brown ink edges.
Caterpillar per instar (length, width, front filaments on T2, rear filaments on A8):
Instar 1: 45 px, 10 px, bumps only, none, larvaFirst with no bands and a black head.
Instar 2: 85 px, 15 px, 3 px, knobs, faint veinBlack, bandWhite and bandYellow bands, yellow head triangle.
Instar 3: 125 px, 22 px, 17 px, 9 px, bold abdominal bands, faint thorax bands.
Instar 4: 210 px, 34 px, 50 px, 20 px, full bands including the thorax, white dots on the prolegs.
Instar 5: 430 px, 70 px, 110 px, 40 px, bold velvety bands, black head with a yellow triangle and yellow face bands.
Every instar has 13 body segments, three pairs of short black true legs near the head, prolegs on A3 to A6 and A10, and small dark spiracle ovals along the side.
Shed head capsules, true size: 6, 8, 15 and 22 px, glossy black cups with a white highlight.

### Overlays

The annBlue ruler: a 2 px line with a short tick every 40 px and a long tick every 200 px.
An annYellow bracket from the ruler hugs the caterpillar's current head and tail.
An annYellow ring of radius 26 pops around each shed head capsule when it lands and stays for the rest of the shot, so the four rings form a tally.
An annMagenta ring pops from the body at each molt, radius 40 to 160 over 5 frames.

### Motion

T 5.500: instar 1 sits in the lower-left trench chewing, its head bobbing on twos, and a latex bead swells on the trench rim on 5.5, 5.625 and 5.75.
T 5.500 to 5.917: it walks along the leaf to the stem.
The climb, head position on the stem: y 1500 at T 6.0, y 1260 at T 6.5, y 1000 at T 7.0, y 700 at T 7.5, y 300 at T 8.0, stepping on twos with a peristaltic wave running tail to head and prolegs stepping in turn.
Molts land on the beats T 6.0 (1 to 2), 6.5 (2 to 3), 7.0 (3 to 4) and 7.5 (4 to 5).
At each molt: the body freezes for 3 frames, the head capsule pops forward and falls on twos in an arc to its landing spot within 8 frames, the old skin slides back as a crumpled translucent tan sleeve and vanishes in 2 drawings, and the new instar snaps to its next length with outBack over 3 frames.
Capsule landing spots: instar 1 capsule on the lower-left leaf at (360, 1540), instar 2 capsule on the stem at y 1330, instar 3 capsule on the middle-right leaf at (700, 1010), instar 4 capsule on the stem at y 760.
The yellow bracket stretches to each new length, and a new arc hole appears on each leaf pair as the caterpillar passes it.

### Camera

Locked, with a slow push from zoom 1.00 to 1.03, world centre (540, 900).

### Enter and exit

Hard cut in and hard cut out at T 8.0.

### Biology

The larva has five instars and molts four times in about 9 to 14 days, gaining about 2,000 times its mass.
The head capsule comes off first at each molt, then the old skin peels back.
Head capsules measure about 0.6, 0.8, 1.5 and 2.2 mm, which is how instars are told apart.
Bands appear from the 2nd instar, and the filaments on T2 and A8 lengthen at every molt, the front pair always longer.
First and second instars chew a circular trench that cuts the latex supply, then feed inside it, leaving arc-shaped holes.

### Sound

Soft chew clicks on 16ths, high-passed noise ticks alternating left and right.
T 5.5 to 5.75: three soft wet plips for the latex beads, a sine at 600 Hz with a fast pitch drop.
Molts on T 6.0, 6.5, 7.0, 7.5: rising FM boops with an upward pitch bend on D4, F#4, A4, D5, each with a dry crinkle noise burst.
Capsule landings: a small wooden click, lower for each larger capsule (A5, F#5, D5, A4).
The kick returns on T 6.0 and 7.0 and shaker 8ths enter.

---

## 05 instar-ladder: Growth, stored poison, hidden wings

T 8.0 to 9.5, schematic, hard cut in.

### Composition

Blueprint base with the cycle glyph at (900, 300), larva arc lit.
The frame height is the growth axis: five caterpillar outlines lie horizontally, stacked bottom to top, centred on x = 540, heads to the right.
Instar 1 at y 1500, 60 px long.
Instar 2 at y 1380, 118 px long.
Instar 3 at y 1220, 177 px long.
Instar 4 at y 990, 295 px long.
Instar 5 at y 640, 620 px long and 120 px tall, spanning x 230 to 850.
A vertical axis at x = 110 runs from y 1540 up to 300 with log-scale tick clusters and a bracket along its height.
A guide circle of radius 360 centred (540, 640) and two long diagonals sit behind instar 5.
A small milkweed leaf outline, 120 px, in schemGreen line sits at (840, 1460).

### Forms

Each caterpillar: a double lavender outline, 13 segment rings, small proleg ticks, and filament ticks on T2 and A8 that lengthen with each instar.
Fills are lavender stipple, sparse in instar 1 and dense in instar 5.
Inside instar 5, a magenta cardenolide glyph 170 px wide centred (470, 640): three fused hexagons and one pentagon in a row, with a small five-membered ring attached at the right end.
Inside instar 5, just behind the head at (775, 640) and (745, 650), two lens-shaped wing discs as lineWhite glow dots with 3 pleat lines each.
Four dotted lavender flow lines rise from the leaf outline to instar 5's belly between x 400 and 640.

### Motion

T 8.000 to 8.500: the outlines draw on bottom to top, one per 16th (8.0, 8.125, 8.25, 8.375, 8.5), 3 frames each.
T 8.500 (beat): stipple fills in, dots begin travelling up the flow lines on twos, and the cardenolide glyph flashes on with a burst of radial ticks.
T 8.750: the wing discs ignite and swell from 30 to 70 px with outBack, their pleat lines multiplying from 3 to 6.
T 9.000 (beat): instars 1 to 4 fade to 20 percent, and instar 5 slides up and morphs over 8 frames into G2, its tail rising to the silk-pad dot at (540, 300) and its body hanging down and curling so the head ends at (720, 790).
The glyph and discs ride along inside the body.
T 9.333 to 9.500: the J outline holds exactly on G2.

### Camera

Locked at zoom 1.

### Enter and exit

Hard cut in.
Exits on a match cut at T 9.5, the lavender J into the inked J of 06.

### Biology

Caterpillars store cardenolides (cardiac glycosides) from milkweed and keep them into adulthood, which makes them distasteful to many predators.
The adult wings already exist inside the caterpillar as imaginal discs, clusters of cells in the 2nd and 3rd thoracic segments.
When fully grown, the 5th instar stops feeding, spins a silk pad and hangs in a J for about 12 to 16 hours.

### Sound

T 8.0: bar 5 downbeat, five rising glass bell ticks on 16ths over a sub bass swell.
T 8.5: a short detuned magenta stab, two band-passed saw voices.
T 8.75: a soft FM bell for the discs.
T 9.0: a downward pitch-bend whoosh as the body curls into the J.

---

## 06 j-hang: The J, then the chrysalis

T 9.5 to 11.5, illustrated, hard cut in on a match cut.

### Composition

A dry twig crosses the top of the frame from the left edge to x 1080, its underside at y 300 and its top at y 235.
The silk pad hangs under it at (540, 300).
The caterpillar hangs on G2 at the start, and the chrysalis hangs on G3 at the end.
Background stripes in stripeCream and stripeApricot.
The lower half is open stripes: a thin inkSoft plumb line drops from the silk pad to y 1500 and ends in a small annYellow circle of radius 12.
A faint annYellow pendulum arc of radius 1200 centred on the pad sweeps across the lower frame.

### Forms

Twig: bark with lengthwise hatching and two knots.
Silk pad: dozens of fine white tangled strokes, about 70 px wide.
Caterpillar: 5th instar with full veinBlack, bandWhite and bandYellow bands, the filaments limp and crinkled, legs and prolegs as in 04.
Chrysalis on G3: chrysalis fill, chrysalisDeep contour hatching down its left side, the black rim band with gold dots, gold dots near the bottom, a faint chrysalisDeep wing-case line, and a veinBlack cremaster.

### Overlays

annMagenta ticks travel along the body with the contraction wave.
An annYellow ring snaps tight around the silk pad as the cremaster locks.
Short annYellow arcs flick beside the chrysalis on each twist.
An annBlue motion line trails the falling skin.

### Motion

T 9.500 (beat): the J sways plus or minus 3 degrees about the pad on twos.
T 10.000 (beat): the body straightens to hang vertically and a contraction wave runs up it in 4 drawings, the segment rings compressing in turn.
T 10.500 (beat): the skin splits just behind the head, near the bottom, and a jade seam opens.
T 10.500, 10.750, 11.000: the striped skin scrunches upward in three steps while the green form contracts into G3.
T 11.000 (beat): the cremaster thrusts into the silk pad, the yellow ring snaps, and the black shed-skin wad drops and falls to the bottom edge in 5 frames.
T 11.000 to 11.500: the chrysalis twists plus 8 then minus 8 degrees twice on twos and settles.
T 11.250: the gold dots pop on one by one over 6 frames.

### Camera

Locked at zoom 1.

### Enter and exit

Enters on a match cut on the J outline.
Exits on a match cut at T 11.5 on the chrysalis silhouette into 07.

### Biology

After J-hanging, the larva straightens, a wave passes along its body, and the skin splits behind the head.
It works the skin up to the silk pad, sets its black hooked cremaster into the silk, and the skin drops away.
The soft pupa compacts over a few hours into a jade chrysalis with a gold-and-black rim near the top and gold dots near the bottom.

### Sound

T 9.5: a tock and a pluck.
T 10.0: a low stretching creak.
T 10.5: a rising tear, noise through a bandpass sweeping 400 Hz to 4 kHz over 200 ms, and three descending plucks on 10.5, 10.75, 11.0 (A4, F#4, D4).
T 11.0: a wooden clack for the cremaster, a soft low thud and a short falling whistle for the skin.
T 11.25: a cascade of metallic FM tings, one per gold dot.

---

## 07 inside-chrysalis: Rebuilt, not melted

T 11.5 to 13.0, schematic, hard cut in on a match cut.

### Composition

Blueprint base with the cycle glyph at (900, 300), pupa arc lit.
The twig is two lavender lines at y 235 and 300, the silk pad a small scribbled circle, the cremaster a short line.
The chrysalis outline is on G3 as a double lavender outline, with the rim band as a dotted line at y 515 and its gold dots as schemGold dots.
A guide circle of radius 430 centred (540, 610) carries 48 ticks.
A height bracket runs at x = 720 from y 332 to 905.
The lower half holds a vertical column of four node glyphs, each 110 px across, centred on x = 540 at y 1040 (eye), 1190 (antenna), 1340 (leg) and 1490 (wing).

### Forms

Orientation is true: abdomen at the top by the cremaster, head at the bottom, ventral side and wing case on the left.
Abdomen, y 350 to 560: six faint segment rings, each holding a pair of parallel lineWhite lines at 40 percent for the larval crawling muscles.
Gut: a central tube 120 px wide from y 380 to 860, filled with sparse stipple.
Nerve cord: a lineWhite chain of 12 bead ganglia along the left inner wall from (470, 420) to (470, 860).
Wing pad: the G3 wing-case line as a lavender outline, with 6 faint vein lines inside.
Flight-muscle zone: an empty region on the right of the thorax, x 540 to 640, y 600 to 760.
Leg and antenna primordia: thin paired lines along the left front from y 700 to 870.
Eye patch: a 60 px hexagonal lattice patch at (520, 870).
Node glyphs: an eye (a circle filled with a small hex lattice), an antenna (a thin line ending in a club), a leg (four jointed segments), a wing (a fan of 6 vein lines).
Connector lines: thin curved lavender lines from each primordium region out to its node.

### Motion

T 11.500 to 11.583: the muscle lines hold for 2 frames.
T 11.583 to 11.917: the abdominal muscle lines fracture into stipple dots, segment by segment from the top down, with a magenta flicker along each pair as it breaks, and the dots drift on a noise flow field at 1 to 3 px per frame.
T 12.000 (beat): the gut tube narrows from 120 to 40 px with inOutCubic over 6 frames, and the nerve beads slide closer together, shortening the cord.
T 12.000, 12.125, 12.250, 12.375: the eye, antenna, leg and wing primordia ignite in turn with radial tick bursts.
T 12.250 to 12.625: the connector lines draw down to the nodes on 16ths, each node drawing on as its line arrives.
T 12.500 (beat): the wing node flashes magenta and its vein fan pulses 10 percent outward, and 30 parallel striated flight-muscle fibres draw on in the thorax zone over 8 frames.
Throughout: the guide circle rotates 4 degrees.

### Camera

Locked at zoom 1.

### Enter and exit

Enters on a match cut on the chrysalis silhouette.
Exits on a match cut at T 13.0 into the inked chrysalis of 08.

### Biology

The pupa does not melt into liquid.
Larval tissues such as the crawling muscles break down, but many adult parts are already under way from the larva, and the nervous system is kept and remodelled (general).
The gut is rebuilt from a leaf processor into a nectar tube (general).
The largest jobs in the pupa are growing the wings and building the flight muscles.

### Sound

Drums out.
A low-passed pad swell with a granular crackle, sparse filtered clicks through a long reverb, as the muscles break.
T 12.0: a descending filter sweep, and paired bell tones on the ignite 16ths alternating D5 and A5.
T 12.5: a bright magenta chime with shimmer and a rising striated buzz, a sawtooth through a comb filter, for the flight muscles.

---

## 08 chrysalis-days: Twelve days by the sun

T 13.0 to 16.0, illustrated, hard cut in on a match cut.

### Composition

Three zones fill the height.
Top zone, y 0 to 520: sky, with the G7 sun-path arc.
Middle: the twig from the left edge to x 1080 (underside y 300), the silk pad, and the chrysalis on G3.
An annYellow tally ring of radius 400 centred (540, 620) surrounds the chrysalis, with 12 empty tick slots.
Lower zone, y 1000 to 1920: a broad milkweed leaf in perspective as a ground plane, running off the bottom edge.
On the leaf, a sundial drawn as a thin inkSoft ellipse 560 by 220 px centred (540, 1300) with 12 hour ticks.
The chrysalis casts a long cross-hatched milkweedDeep shadow across the dial.

### Forms

Sky stripes change with the time of day: stripeCream and stripeApricot by day, duskRose at dusk, nightSky with white stipple stars at night.
Sun: sun disc, radius 46, with 12 ink ray ticks, crossing the arc by day.
Moon: a white crescent with 4 small stipple stars, crossing the arc by night.
Chrysalis on G3 as in 06, with its 12 rim gold dots dim at the start.
The sun passes behind the twig at the top of the arc.

### Overlays

The annYellow tally ring and its 12 tick slots.
An annBlue line runs from the sun through the chrysalis to the tip of its shadow and re-aims every drawing.
One annMagenta ring pulses out from the chrysalis at T 15.5.

### Motion

Twelve days, one per 8th note, from T 13.0 to 16.0: day n starts at T 13.0 + (n - 1) x 0.25.
Each day is 6 frames held on twos as three drawings: sunrise at the left end of the arc, the sun at the top, then night with the moon at the top.
The shadow sweeps across the dial opposite the sun like a sundial hand.
On each day boundary one rim gold dot lights with a 2-frame goldLight sparkle and the next tally slot fills clockwise from 12 o'clock.
Days 1 to 8 (T 13.0 to 15.0): the chrysalis stays jade.
Days 9 and 10 (T 15.0 to 15.5): it darkens through blue-green to chrysalisDark.
Days 11 and 12 (T 15.5 to 16.0): the folded wing pattern shows inside the dark case: monarch cells, veinBlack veins and a black margin with spotWhite dots packed into the wing-case shape, under a thin sheen with two white highlight hatches.
All 12 tally slots are full on the last frame.

### Camera

Locked at zoom 1.

### Enter and exit

Enters on a match cut on the chrysalis silhouette.
Exits at T 16.0 into a 3-frame cream flash (the flash belongs to 09), so this shot holds its final pose for `t` just past 3.0.

### Biology

The pupal stage lasts 8 to 15 days, usually 11 to 12, counted here as 12 days.
About a day before emergence the chrysalis turns translucent and bluish, then the orange and black wings show inside.
The pattern appears because the wing scales take on their pigment only at the very end of the pupal stage.
The sun arc sets up the sun compass the adult will steer by.

### Sound

Drums stay out.
8th-note woodblock ticks, one per day, and a glockenspiel note per day climbing the D major scale over 12 notes.
The pad filter opens slowly across the shot.
T 15.0: a shimmer riser starts (noise sweep plus a tremolo sine), with a heartbeat kick on quarters.
T 15.5: the heartbeat doubles to 8ths.
T 15.75: the heartbeat doubles to 16ths under a reverse cymbal into bar 9.

---

## 09 eclosion: Emergence

T 16.0 to 18.0, illustrated, flash transition in (3 frames, cream).

### Composition

The twig at the top (underside y 300), the silk pad and the cremaster as in 08.
The shell on G3 is now empty and split open at the bottom.
The adult ends on G4: hanging from the split rim, head up, closed wings hanging on the right of the body.
Background stripes in stripeCream and stripeApricot.
A faint inkFaint construction line runs down the body axis to the bottom edge.

### Forms

Empty shell: a faint ink outline with a mist glaze, the rim gold dots dulled.
Adult body: veinBlack with spotWhite dots on the head and thorax, large dark eyes, straight antennae to the G4 clubs.
Under the head, two separate curled proboscis halves, 30 px across.
Legs: middle and hind pairs grip the rim, forelegs folded.
Abdomen: swollen at first, slim by the end, per G4.
Wings, underside colours: forewing monarch with a monarchUnder tip, veinBlack veins, and a black margin with larger spotWhite dots.
Hindwing monarchUnder with veinBlack veins and two rows of spotWhite dots on its black margin.
Crumpled wing stubs at the start: 35 percent of G4 size, covered in short zigzag wrinkle lines.
One meconium droplet, radius 10, hangs from the abdomen tip.

### Overlays

annBlue lines run from the abdomen up through the thorax and out along three main vein paths, with small annBlue circles marking each pulse.
An annYellow ring pops at the forewing apex on each pump.

### Motion

T 16.000 (bar 9 downbeat, the midpoint): the flash covers the cut.
T 16.000 to 16.333: the shell splits along its bottom and the adult slides out head first, then turns to grip the rim, in 4 drawings on twos.
Pumps on T 16.5, 17.0 and 17.5: the abdomen squeezes, a blue pulse runs along the vein lines, and the wings snap longer with outBack to 55, 80 and 100 percent of G4.
The wrinkle lines halve on each pump and are gone at T 17.5, and the abdomen shrinks a step on each pump to its slim size.
T 17.750: the meconium droplet drops and falls out of the bottom of the frame in 5 frames, and the wings shake plus or minus 2 degrees once, then hold still.

### Camera

Locked at zoom 1.

### Enter and exit

Enters on a 3-frame cream flash on the bar 9 downbeat.
Exits on a match cut at T 18.0 on the hanging silhouette into 10.

### Biology

After about two weeks the adult splits the shell and climbs out head first with small crumpled wings and a swollen abdomen.
It hangs from the empty case and pumps fluid from the abdomen into the wing veins until the wings reach full size.
The wings then need several hours to dry and stiffen before the first flight.
Like all brush-footed butterflies it clings with its middle and hind legs, forelegs held against the body.
It releases meconium, the red-brown waste left from the pupal stage (general).
Its proboscis starts in two halves that it zips into one tube (general).

### Sound

T 16.0: the drop, a full kick and an open D major chord bloom (saw pad, plucks, sub bass) with a big generated reverb as the riser resolves.
T 16.0 to 16.33: a dry crack through a resonant bandpass and a creaking stretch.
Pumps on T 16.5, 17.0, 17.5: low sine whumps at 55 Hz with rising pitch sweeps, each louder, with soft paper-crinkle noise.
Hi-hat 8ths start at T 16.5, and the lead pluck melody enters at T 17.0.
T 17.75: a low drip, a sine dropping from 300 Hz.

---

## 10 wing-veins: Veins as plumbing

T 18.0 to 19.5, schematic, hard cut in on a match cut.

### Composition

Blueprint base with the cycle glyph at (900, 300), adult arc lit.
The hanging adult on G4 as a double lavender outline: head circle, thorax oval, slim abdomen capsule, forewing and hindwing outlines, and the empty shell on G3 above.
A pump glyph at the thorax (540, 995).
A guide circle of radius 620 centred (560, 1000) and two long diagonals.
A height bracket at x = 880 from y 985 to 1450.
An inset circle of radius 150 at (250, 1260), filled navyLight with a lavender rim.
A focus reticle of 90 px corner brackets centred on the push-in target (735, 1400).

### Forms

Veins in lineWhite at 1.5 px.
Forewing: a closed discal cell with radial, medial and cubital veins fanning from it to the margin.
Hindwing: veins radiating from the base around its own discal cell.
Between the veins, a lavender lattice at 20 percent of tiny overlapping rounded rectangles in rows, the scales.
Pump glyph: a glow dot with radial ticks.
Fluid dots: hemolymph glow dots of radius 4.
Inset: a wing cross-section, two thin membrane sheets with a vein tube between them, pleated like a folded fan at the start.

### Motion

T 18.000 (beat): the veins draw outward from the base to the margin over 6 frames.
T 18.500, 18.750, 19.000, 19.250: a wave of hemolymph dots pulses outward along every vein, each wave starting at the pump glyph.
Across the four waves, the inset pleats flatten step by step into two parallel sheets.
T 19.000 (beat): the reticle snaps from 160 to 90 px over 3 frames and turns magenta.
T 19.250 to 19.500: the camera eases to zoom 1.08 with the target fixed on screen, leading into the push-in.

### Camera

Zoom 1.00 until T 19.25, then 1.00 to 1.08 keeping (735, 1400) fixed on screen, so world centre x = 735 - 195 / zoom and y = 1400 - 440 / zoom.

### Enter and exit

Enters on a match cut on the hanging silhouette.
Exits on a match cut at T 19.5 into the inked wing of 11 at the same zoom.

### Biology

Wing veins are hollow tubes that carry hemolymph.
Pressure through them unfolds the wing, and once the wing dries they form its stiff frame.
Each wing is two thin membrane layers that press flat together (general).
The black lines of the monarch pattern follow the veins, and the membrane between them is covered in rows of scales.

### Sound

T 18.0: a glass ping.
Four bell pulses on the 8ths, each a step higher (D5, E5, F#5, A5), with delay echoes.
T 19.0: a 60 ms high square-wave lock-on bleep.
T 19.25: a soft inhale swell into the push-in.

---

## 11 scale-mosaic: Push-in, the wing is a mosaic

T 19.5 to 22.0, illustrated, hard cut in on a match cut.

### Composition

The shot opens on the illustrated hanging adult on G4 at zoom 1.08 with (735, 1400) fixed on screen, matching the last frame of 10.
Ink outlines and flat colour sit over stripes in stripeCream and stripeApricot.
The camera pushes into the target until the frame is filled with individual scales.
Author the wing colour once as a colour field in world coordinates (monarch cells, veinBlack veins and border, spotWhite spots) and sample it at every zoom level so all levels agree.
Around the target, shape the field so that at zoom 40 the frame shows an orange cell in the top third, a black vein band about 260 screen px wide crossing diagonally from upper left to middle right, and a round white spot about 640 screen px across in the lower third.

### Forms

Final framing at zoom 40: the whole frame is scales in diagonal overlapping rows like roof shingles, rows parallel to the vein.
Each scale is about 64 px long and 38 px wide on screen, with a rounded, slightly toothed free end, a short stalk into a socket, and 5 to 7 fine ink ridge lines along its length.
Rows alternate longer cover scales over shorter ground scales.
Each scale is one flat colour sampled from the field: monarch, veinBlack or spotWhite.
Each scale has a thin darker edge where it tucks under the next row: monarchDeep on orange, ink on black, paperShade on white.
Where a row lifts slightly, a strip of paper-coloured membrane shows.

### Overlays

Screen-fixed, not under the camera.
An annYellow target ring of radius 120 at the frame centre with 4 short cross ticks.
Thin annBlue guide lines along the scale-row direction.
A scale bar at lower left inside the safe area, a horizontal line from x 100 with end ticks at y 1500, that shortens as the zoom grows.

### Motion

The push is exponential and centred on the target, with outExpo steps landing on the beats.
T 19.500: zoom 1.08.
T 20.000 (beat): zoom 4, vein edges and hatching large, line widths kept constant in screen pixels.
T 20.500 (beat): zoom 12, and the flat colour breaks into a grid of small colour tiles over 4 frames.
T 21.000 (beat): zoom 32, the tiles resolve into shingled scales with ridges, and one annMagenta ring pops at the target.
T 21.000 to 22.000: a slow drift on to zoom 40 with a 20 px rise.
T 21.500 (beat): one orange scale near the centre tilts 10 degrees up from its socket to show its stalk, and a glint runs along its ridges on twos.
The blue guide lines slide along the rows and the scale bar steps shorter on each beat.

### Camera

World centre x = 735 - 195 x k / zoom and y = 1400 - 440 x k / zoom, where k eases from 1 to 0 between T 19.5 and 20.0, so the target moves to the frame centre as the zoom grows.

### Enter and exit

Enters on a match cut from the blueprint wing at the same zoom.
Exits on a hard cut at T 22.0.

### Biology

Lepidoptera means scale wing.
A butterfly wing is covered in rows of tiny overlapping scales like roof tiles, and each scale carries a single colour, so the pattern is a mosaic.
On a monarch, black scales line the veins and border, orange scales fill the cells, and the white spots are patches of white scales.
Each scale sits on a short stalk in a socket, with cover scales over ground scales (general).

### Sound

A rising filtered-noise whoosh across the push, with 16th-note ticks that speed up.
T 20.5: a granular shatter, dozens of tiny panned clicks as the tiles appear.
T 21.0: a glassy suspended chord (D, A, E) held under shimmering high bells.
T 21.5: a single tile tick as the scale lifts.

---

## 12 sun-compass: A clock in the antennae

T 22.0 to 23.5, schematic, hard cut in.

### Composition

Blueprint base with the cycle glyph at (900, 300), adult arc lit.
Top third: a lavender sky-dome semicircle of radius 450 centred (540, 700), from (90, 700) up to (540, 250) and down to (990, 700), with hour ticks.
Middle: the monarch head seen from above, head capsule circle of radius 110 centred (540, 900).
Lower half: a compass circle of radius 290 centred (540, 1240) with 72 ticks and one longer tick at the top for north, no letters.
Guides: two long diagonals and a faint circle of radius 520 centred (540, 960).

### Forms

Sun: a glow star-burst with radial ticks riding the dome.
Head: two large oval compound eyes, 90 by 120 px, at (455, 890) and (625, 890), filled with a fine hex lattice.
A small coiled proboscis spiral of radius 24 at (540, 1000).
Antennae: thin lines from (500, 800) to a club at (330, 620) and from (580, 800) to a club at (750, 620).
In each club, a small glowing clock ring of radius 26 with one lineWhite hand.
Inside the head, a small glowing lens at (540, 930) for the sun-compass region of the brain.
Azimuth line: a thin lavender line from the compass centre toward the sun.
Heading line: a magenta line from the compass centre pointing down-left to the south-west (screen angle 225 degrees), 290 px long.
An arc annotation between the azimuth line and the heading line.

### Motion

The sun steps along the dome on the beats, each step 4 frames with outBack.
T 22.000: at the left (east) end, (90, 700).
T 22.500: 40 degrees along, (195, 411).
T 23.000: 80 degrees along, (462, 257).
With each step the azimuth line rotates to follow, the angle arc redraws, both antenna clock hands tick an eighth of a turn, and the brain lens pulses.
The magenta heading line never moves.
T 22.000 to 22.250: all linework draws on over 6 frames.
T 23.000 (beat): the heading line pulses brighter and extends off the lower-left edge, setting the screen direction that the pull-back, the map and the migration column all follow.

### Camera

Locked at zoom 1.

### Enter and exit

Hard cut in and hard cut out at T 23.5.

### Biology

Migrating monarchs steer with a time-compensated sun compass.
They read the sun's position and correct for the time of day with circadian clocks that sit in the antennae.
As the sun moves across the sky, the angle they hold to it changes, so the heading stays south-west.
Monarchs whose antennae are painted black lose their heading.

### Sound

T 22.0: a glass ping.
Three clock-tick bells on the beats, each paired with a soft FM gong as the sun steps, over a low drone on D.
T 23.0: a two-note rising synth horn, A3 to D4, leading into the pull-back.

---

## 13 pull-back-continent: Pull-back, leaf, plant, meadow, continent

T 23.5 to 26.5, illustrated, hard cut in.

### Composition

One continuous zoom out through five nested layers, all ink on paper.
Each layer is drawn at its own scale in its own function and cross-fades in over 4 frames as the previous one shrinks away.
Nominal zoom per layer on a log-linear curve: layer 1 at 1, layer 2 at 0.05, layer 3 at 0.0075, layer 4 at 0.0015, layer 5 at 0.0003.
The anchor is the butterfly until T 25.5, then drifts to the flight anchor on the map.

### Forms

Layer 1 (T 23.5): the protagonist, a female, seen from above with wings open, the G5 drawing scaled to an 820 px wingspan, perched on a milkweed leaf tip centred (540, 960).
The leaf is milkweed with hatched veins, and stripes in stripeApricot and stripeCream sit behind.
Layer 2 (T 24.0): the whole milkweed plant fills the height, stem from the bottom edge, 6 leaf pairs with ochre autumn patches, and two warty seedPod pods split open near the top at about y 380, spilling flat brown seeds with white floss.
The butterfly is 40 px across near the top leaf.
Layer 3 (T 25.0): a meadow of 60 to 80 milkweed stalks as vertical ink strokes with pod dots, hatched ochre grass bands, and a row of round hatched trees along y 500.
The butterfly is a 6 px monarch dot, joined by a few others.
Layer 4 (T 25.5): patchwork farmland from above, field rectangles hatched in alternating directions, and a winding teal river line.
Layer 5 (T 26.0): a line-art map of eastern North America on paper, north up, on the G6 projection.
Map details: James Bay and the south of Hudson Bay at the top, the Great Lakes as hatched water shapes, the Atlantic coast down the right side, the Gulf of Mexico, Florida, and Mexico narrowing toward the bottom.
Coastlines are ink with engraved teal hatching parallel to the coast, fading offshore.
A faint 10-degree graticule in inkFaint at 20 percent.
A dotted band across southern Canada and the north-eastern United States (x 380 to 1040, y 580 to 760) where the flight starts.

### Overlays

Each previous framing stays as a thin annYellow 9:16 rectangle shrinking toward the anchor, leaving a nested trail of 4 rectangles.
An annBlue trajectory line trails the butterfly heading down-left.
An annMagenta target ring of radius 30 on the Michoacán site at (208, 1447).
Curved flow lines in monarch from the dotted band to the target ring.

### Motion

The zoom rate is linear in log scale with outExpo arrivals, so each layer lands on its beat: layer 2 on T 24.0, layer 3 on 25.0, layer 4 on 25.5, layer 5 on 26.0.
T 24.000 to 25.000: the butterfly lifts off the plant and flies down-left, wings flapping on twos.
T 25.500 to 26.000: the anchor drifts from the frame centre to the flight anchor at (756, 666).
T 26.000 to 26.500: hundreds of 3 px monarch dots stream from the dotted band along curved flow lines that funnel south-west through Texas near (256, 1133) into the target ring.
T 26.250: the target ring pulses.
Floss seeds in layer 2 drift up and right on twos.

### Camera

The zoom-out is the shot, with each layer's camera anchored as described above.

### Enter and exit

Hard cut in on the horn pickup.
Exits on a hard cut at T 26.5.

### Biology

Monarchs that emerge in late summer, when milkweed is going to seed, delay breeding and migrate.
This generation can live up to nine months, against 2 to 5 weeks for summer adults.
The eastern population flies up to about 4,800 km from southern Canada and the eastern United States, funnelling through Texas to a few mountain forests in central Mexico.
No single monarch has seen the destination before.

### Sound

T 23.5: a long rising pad swell and a reverse cymbal.
Stage hits on T 24.0 (bar 13 downbeat, kick and pluck), 25.0, 25.5 and 26.0, each with a bigger generated reverb, from room to hall.
A wide stereo wind-noise bed opens under a bright FM lead melody with long glides that peaks at T 26.0.
T 26.0 to 26.5: a soft granular patter of tiny clicks for the streaming dots, and a bell on the target pulse at T 26.25.

---

## 14 migration-column: The column heads south-west

T 26.5 to 28.0, illustrated, hard cut in.

### Composition

Sky above, land below.
Top 65 percent: sky in stripes of stripeSky and stripeCream.
A sun of radius 60 sits at about (200, 400) on the left of the G7 sun-path arc.
A column of about 260 monarchs enters at the top edge around x 820 and streams diagonally down to the lower left, widening as it nears the viewer.
Bottom 35 percent, y 1250 to 1920: three layered ridges of hatched hills in milkweed and ochre, the nearest dotted with tiny milkweed strokes, a winding river line catching light, and a dark silhouette of fir-covered mountains along the bottom edge.

### Forms

Far butterflies near the top are 10 to 16 px, and near ones low in the frame are 90 to 140 px.
Each is a simple monarch and veinBlack wing pair with a black body, the larger ones with spotWhite border dots, drawn in one of 3 flap poses.
Hills: milkweed and ochre flat fills with contour hatching on the shadow sides.
Mountains: fir silhouettes in fir with ink outlines.

### Overlays

A dashed annMagenta trajectory line along the centre of the column.
A thin annBlue line from the sun to the lead butterfly, with an arc annotation marking the sun angle.
Two circular annBlue motion rings around the lead butterfly, near (520, 900).

### Motion

The column flows down-left continuously, each butterfly advancing 40 px along the column per 8th note with seeded speed jitter, wings flapping on twos with seeded phase.
T 27.000 and 27.500 (beats): a fresh wave of small butterflies enters at the top edge.
Motion rings pulse on each beat, and the sun-angle arc redraws on T 27.0.

### Camera

A slow tilt that drifts the scene up 80 px over the shot.

### Enter and exit

Hard cut in and hard cut out at T 28.0.

### Biology

Migrating monarchs travel by day in loose streams, ride thermals and glide to save energy, and roost together at night.
They hold their south-west heading with the sun compass.

### Sound

A granular flutter bed of hundreds of short band-passed noise flaps spread across the stereo field.
The kalimba motif returns an octave up with a bell counter-line.
The kick lands on T 27.0 with shaker 16ths.

---

## 15 oyamel-winter: Winter on the firs

T 28.0 to 29.5, illustrated, hard cut in.

### Composition

Night in a mountain fir forest.
Three oyamel fir trunks run the full height at x 170, 560 and 910, 90 to 130 px wide.
Drooping branches cross between them in layers.
From y 700 to 1500 the middle trunk is covered in resting butterflies packed like shingles, rhyming with the scale mosaic.
Dense hanging clusters that read as bunches of dead leaves droop from branch ends at (330, 900), (760, 640) and (700, 1250).
The sky in the gaps is nightSky with stipple stars.
Five moon slots of radius 34 run across y 300 at x 220, 380, 540, 700 and 860.
Two horizontal mist bands cross at y 1050 and y 1480.

### Forms

Trunks: bark with vertical ink hatching.
Needles: dense short hatch strokes in fir.
Resting butterflies: closed wings showing monarchUnder undersides with veinBlack vein lines, each 30 to 50 px, overlapping.
White stipple frost glints on the wings and needles.
Mist: mist bands with soft stipple edges.

### Overlays

An annBlue ring around the lower cluster at (700, 1250).
A faint inkFaint construction line up the middle trunk.
At T 29.25, an annMagenta arc annotation near (820, 420) with an arrowhead that flips from pointing down-left to pointing up-right.

### Motion

Months pass on the 8ths: on T 28.0, 28.25, 28.5, 28.75 and 29.0 a moon appears in the next slot, phases stepping crescent, half, full, half, crescent, each with a small star twinkle.
Mist bands slide 10 px per 8th, and the clusters sway 2 degrees on twos.
T 29.250: the sky flashes to stripeApricot dawn in 2 frames, the magenta arrow flips, and the clusters burst: about 80 butterflies peel off the trunk and branches and fly up and to the right, wings opening to show orange uppersides, on twos.

### Camera

Locked at zoom 1.

### Enter and exit

Hard cut in and hard cut out at T 29.5.

### Biology

Eastern monarchs winter from about November to mid-March in oyamel fir (Abies religiosa) forests in the mountains of central Mexico, clustered so densely that branches sag.
The cool forest keeps them inactive so their fat lasts the winter.
Cold exposure during the winter resets the sun compass to point north, and in spring they leave.

### Sound

Bar 15 breakdown: kick and bass out, a hushed high sine pad and soft wind noise.
One glockenspiel note per moon, descending A5, F#5, E5, D5, B4.
Faint crystalline sparkles for the frost.
T 29.25: a quick rising noise burst, a wave of flutter, and an icy FM bell sweep that turns upward.

---

## 16 spring-egg: Spring, a new egg

T 29.5 to 30.5, illustrated, hard cut in.

### Composition

Back on milkweed in spring.
The underside of a young milkweed leaf fills the top half, from the top edge down to its lower edge at y 891.9.
The protagonist, now a worn returning migrant, clings below the leaf edge with her middle and hind legs.
Her thorax is at (640, 1000) and her head at (700, 960), close under the leaf.
Her closed wings hang down to the right, forewing apex near (840, 1440), showing faded undersides.
Her abdomen curls up and left so its tip touches the leaf underside at (540, 892).
Her small forelegs reach up to tap the leaf at about (720, 900).
Background below the leaf: stripes in stripeSpring and stripeCream.

### Forms

Leaf: milkweedYoung with a milkweedPale vein net, hatching, and a fringe of white trichome hairs along its lower edge.
Wings: monarchPale and monarchUnder, veinBlack veins, one notch missing from the hindwing margin, and a few bare patches of missing scales left as plain paper.
The egg she lays is G1 scaled by 1/47 about the point (540, 900): 16 px tall, base at y 891.9, tip at y 908.1, 12 px wide.

### Overlays

Small concentric annYellow rings pulse from her forefeet on each tap.
An annYellow ring pops around the egg when it appears.

### Motion

T 29.500, 29.625, 29.750, 29.875: her forelegs drum the leaf on 16ths, one yellow ring per tap.
T 30.000 (beat): the egg appears at the abdomen tip with a 3-frame outBack pop and a yellow ring, and the abdomen pulls away.
T 30.000 to 30.500: a snap zoom from 1 to 47 with outExpo, keeping (540, 900) fixed on screen.
The butterfly slides out of the bottom edge, the leaf edge rises to y 520, and past zoom 8 the leaf switches to a macro drawing in screen space whose trichome fringe matches 03.
The last frame puts the ivory egg exactly on the G1 outline, ridges drawn, uncracked.

### Camera

World centre x = 540 and y = 900 + 60 / zoom, zoom 1 to 47 with outExpo from T 30.0 to 30.5.

### Enter and exit

Hard cut in.
Exits on a match cut at T 30.5 on the egg outline into 17.

### Biology

After winter she flies north and lays on new spring milkweed.
Before laying she drums the leaf with her forelegs, which carry chemical receptors, to taste it.
She lays one egg at a time on the underside of a young leaf, 300 to 500 eggs over two to five weeks.
Her wings are faded and torn after months of travel.

### Sound

T 29.5 to 29.875: four tiny wooden taps on the 16ths, FM at 3.2 kHz.
T 30.0: a soft liquid plip, a sine with a fast pitch drop, and the kick and bass return.
T 30.0 to 30.5: a reverse whoosh into the cut.

---

## 17 egg-loop: Back to the egg

T 30.5 to 32.0, schematic, hard cut in on a match cut.

### Composition

The egg-blueprint composition on the same pixels: navy base, grid, guide circles of radius 470 and 640 at (540, 900), diagonals, the leaf band from y 480 to 520, the G1 egg, the height bracket at x = 880, the width bracket at y = 1330, and the left tick scale.
The cycle glyph at (900, 300) starts with all four arcs lit.
The wordmark `monarch` sits centred on x = 540 with its baseline at y = 1470, per the art bible.

### Forms

Egg: double lavender outline, 18 ridges, 34 cross-ribs, the micropyle rosette and sparse yolk stipple, as in 02.
One glowing nucleus at the home position (540, 860): a new egg.
Wordmark: thin lowercase system sans-serif, light weight, 44 px, letter-spacing 0.12 em, lavender at 85 percent.

### Motion

T 30.500: the egg is fully drawn on the first frame, with no draw-on.
T 31.000 (beat): the nucleus pulses, its halo growing from 1.0 to 1.4 times and back over 6 frames, the cycle glyph resets from four lit arcs to the egg arc alone, and the wordmark fades in over 6 frames.
T 31.500 (beat): the nucleus divides into two at (540, 830) and (540, 890), with the same magenta ring flash as in 02.
T 31.500 to 32.000: hold while the guide circles rotate 3 degrees, ending on the egg, two nuclei and the wordmark.

### Camera

Locked at zoom 1.

### Enter and exit

Enters on a match cut from the inked spring egg.
The last frame hands straight to frame 0 of 01 on the loop replay.

### Biology

The spring egg starts the first of the short-lived breeding generations that carry the population north.
No single butterfly makes the round trip, so the monarchs that fly south next autumn are several generations removed from this one.
Each cycle restarts from a 1.2 mm egg.

### Sound

T 30.5: a glass ping on D6, the same pitch as the spark in 02.
T 31.0: a resolving D major chord with nucleus bells (A5, D6).
T 31.5: the division chime and a final low pluck on D2 with a long generated reverb.
T 31.75: one soft pickup note on A4 that resolves onto the D of the replay's bar 1 downbeat.
