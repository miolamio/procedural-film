# Art bible: The life of an Arctic tern

The visual rules every scene follows.
Where this file and a scene brief disagree on a colour, weight or rule, this file wins.
Where this file and `docs/storyboard.md` disagree on a position or a time, the storyboard wins.

Sections 1 to 9 are the house style, fixed by the reference analysis — change them only after a fresh one (the skill's `templates/reference-analysis.md` shows the method). Sections 2.2, the identity tints in 2.3, and 10 are rewritten per film from the captured research.

## 1. Frame

The canvas is 1080 px wide and 1920 px tall at 24 fps.
Every pixel value in this file assumes that size.
The origin is the top-left corner and y grows downward.

### 1.1 Shorts safe area

YouTube Shorts draws its own interface over the video.
The title and channel row covers roughly the bottom 380 px, the button column covers roughly x 950 to 1080 from y 1000 down, and the top bar covers roughly the top 180 px.
Anything the viewer must read (the subject, a match-cut shape, a glyph that carries meaning, the wordmark) sits inside x 60 to 940 and y 220 to 1540.
Backgrounds, stripes, grain, guide geometry, construction lines and decorative scenery run full bleed.
The safe area is non-negotiable: the storyboard may never move must-read content outside it. If a composition collides with it, move the scenery — never the must-read content.

### 1.2 Composition for a tall frame

Compose for the height, never crop a square.
Hanging, climbing, falling and rising subjects use the vertical axis.
The frame centre line x = 540 is the default axis for the subject.
Large subjects fill 60 to 90 percent of the frame width so they read on a phone.

## 2. Palettes

Names below are the keys of `FILM.lib.pal`.
Where a key already exists in `src/lib.js`, the value here is the published final value.
Colour is flat.
Tone in illustrated mode comes from hatching, never from gradients.
Radial glow halos are allowed only in schematic mode.

### 2.1 Warm illustrated palette (paper plate)

| Name | Hex | Use |
|---|---|---|
| paper | #EFE3C9 | Paper base |
| paperShade | #E2D1B0 | Paper shadow, tucked edges on white |
| paperDeep | #CDB58C | Paper vignette, deep paper tone |
| stripeCream | #F2E7CF | Stripe band A, default |
| stripeYellow | #EFDCA3 | Stripe band B, warm default |
| stripeApricot | #F0D9B5 | Stripe band B, dawn or tender acts |
| stripeSage | #DCE3CC | Stripe band B, foliage acts |
| stripeSpring | #E4EDD0 | Stripe band B, new-growth acts |
| stripeSky | #C9D3D2 | Stripe band B, open-sky acts |
| ink | #2A1C13 | Main outlines |
| inkSoft | #5B4331 | Secondary outlines, detail lines |
| inkFaint | #8A735C | Construction lines, graticule |
| tan | #C8A47A | Dry organic matter |
| ochre | #C38F2E | Earthy accent |
| rose | #C88C86 | Dusty rose accents |
| duskRose | #E3B1A1 | Dusk sky band |
| sage | #94A47F | Generic foliage |
| teal | #3C8783 | Water hatching, teal accents |
| tealDeep | #285F5D | Deep water hatching |
| sun | #F1BF4A | Sun disc |
| nightSky | #4E3F6E | Night sky band |
| night | #2F2748 | Deepest night, star-field base |
| white | #FBF6EA | Highlights, silk, moon |

Stripe band B changes by act; the storyboard assigns one per act.
`orange #D8742B`, `leaf #6E8F4F`, `wood #A8784C`, `sunset #E79D8F`, `dusk #5A4878` and `red #BF3F2C` stay available in `lib.pal` for incidental scenery.

### 2.2 Arctic tern extension, warm

| Name | Hex | Use |
|---|---|---|
| plumeWhite | #F8F5EE | Cheeks, collar, rump, tail, underwing coverts: cooler and brighter than paper so the bird separates from the stripes |
| plumeShade | #D9DCDA | Shadow side of white plumage, flat tone under the hatching |
| mantleGrey | #A8B0B7 | Adult mantle, upperwing and outer tail webs |
| mantleDeep | #7B848D | Hatching on grey plumage, feather-edge lines on the wing |
| breastGrey | #C3C8CB | Pale grey underparts, a step darker than plumeWhite so the cheek stripe reads |
| capBlack | #1C1A1B | Breeding black cap, the primary trailing-edge line, the eye |
| billRed | #B3261E | Breeding bill, blood red to the tip |
| billDeep | #7E1A17 | Hatching and gape line on the red bill |
| legRed | #A12A26 | Breeding legs and feet |
| primaryGlow | #E9ECE6 | Translucent primaries seen from below against the light |
| juvFringe | #C69567 | Pale orangey-brown fringes on the juvenile mantle and coverts |
| carpalBar | #4F5358 | Dark carpal bar on juvenile and non-breeding wings |
| juvBill | #2B2522 | Black bill and legs of the juvenile and the winter adult |
| egg | #B9AC7C | Egg ground colour, olive-buff |
| eggPale | #D2C394 | Lit side of the egg, blunt end |
| eggBlotch | #3F3226 | Large dark blotches, crowded toward the blunt end |
| eggSpot | #6E5842 | Small brown spots and under-blotches |
| downGrey | #B7B0A2 | Chick down, grey sibling |
| downTan | #C9A46C | Chick down, brassy-tan sibling |
| downSpeck | #2C241E | Black speckles on chick down |
| shingle | #BFB5A3 | Beach shingle pebbles, mid tone |
| shinglePale | #D8CFBE | Lit pebbles |
| shingleDeep | #8B8374 | Pebble shadows and hatching |
| lichen | #D39A45 | Orange lichen crust on rocks |
| moss | #8F9B6C | Tundra moss and sparse grass |
| mossDeep | #66704D | Moss hatching |
| sea | #7FA4AC | Open sea |
| seaDeep | #4A727D | Sea hatching, far water |
| foam | #EEF2EC | Surf lines, splash |
| sandEel | #C7CFC9 | Sand eel silver belly |
| sandEelBack | #6F8E8A | Sand eel green-grey back |
| ice | #EDF3F3 | Pack ice and floes, glacier |
| iceShade | #B5CBD1 | Shadow side of floes |
| iceDeep | #7FA2AE | Ice hatching, deep ice edges |
| polarSky | #D9E4E4 | Stripe band B for polar acts |
| mapLand | #E3D5B3 | Land fill on the Atlantic map |
| mapSea | #C7D6D1 | Sea fill on the Atlantic map |

### 2.3 Cool schematic palette (blueprint plate)

| Name | Hex | Use |
|---|---|---|
| navy | #0B1230 | Blueprint base |
| navyDeep | #060A1C | Near-black navy for the opening spark frame |
| navyLight | #18234D | Inset circle fills, panel tint |
| grid | #3A4A86 | 60 px grid lines |
| lavender | #C8C1EF | Main linework |
| lineWhite | #EEF0FF | Emphasis lines, veins, ticks |
| paleBlue | #9CC2EA | Secondary accent, frost |
| glow | #FFF3DC | Nucleus cores, sun glyph, glows |
| magenta | #FF3D98 | Moments of change only |

| schemBill | #F2877A | Tern identity tint in blueprint: the bill, the hero outline accent |
| schemIce | #A8E4EF | Ice, wind and route tint in blueprint |
| schemEgg | #DCCB8F | Egg identity tint in blueprint |

Subject tints are line or dot colours, never fills, and a schematic shot uses at most one of them besides magenta.

### 2.4 Overlay colours on illustrations

| Name | Hex | Use |
|---|---|---|
| annMagenta | #E43D8C | Change rings, trajectories, target rings |
| annBlue | #3B8EE0 | Trajectory and motion lines, fluid paths, rulers |
| annYellow | #EAB530 | Attention rings, brackets, tally rings, sun paths |
| teal | #3C8783 | Secondary guide lines when blue is already in use |

Overlays sit above the illustration at full opacity and never get hatched or grained.

## 3. Line

All widths are at 1080 px wide.
Illustrated lines come from `lib.inkPath` with pressure variation of plus or minus 25 percent.

### 3.1 Illustrated weights

| Element | Width | Colour and opacity |
|---|---|---|
| Hero subject outline | 5 px | ink 100% |
| Doubled hero outline, occasional | 1.5 px, offset 3 px | ink 40% |
| Secondary form outline | 3 px | ink 100% |
| Detail lines: segment rings, veins, ridges | 1.8 px | inkSoft 90% |
| Hatch strokes | 1.2 to 1.8 px | ink or the form's deep colour, 70 to 90% |
| Construction lines | 1.5 px | inkFaint 30% |

Hero-specific line treatments (for example the band widths of a wing's veins) are specified in section 10 with exact widths at a stated subject size, and scale with the drawn size.

### 3.2 Schematic weights

| Element | Width | Colour and opacity |
|---|---|---|
| Primary outline, double | outer 2.5 px and inner 1.5 px, 9 px apart | lavender 85% outer, 50% inner |
| Secondary outline | 1.5 px | lavender 60% |
| Lattice and cell lines | 1 px | lavender 30 to 40% |
| Grid | 1 px, 60 px pitch | grid 35% |
| Guide circles | 1.5 px | lavender 12 to 18% |
| Long diagonals | 1 px | lavender 12% |
| Ticks | 1.5 px, 10 to 20 px long | lineWhite 60% |
| Brackets | 1.5 px, end ticks 16 px | lavender 60% |
| Magenta flashes and rings | 3 px | magenta 100%, fading |

### 3.3 Overlay weights

| Element | Width |
|---|---|
| Attention and change rings | 3 px |
| Trajectory lines | 2.5 px |
| Dashed trajectories | 2.5 px, 14 px on and 10 px off |
| Motion rings | 2 px |
| Arc annotations | 2 px with 8 px end ticks |
| Rulers | 2 px, short ticks 12 px, long ticks 28 px |

## 4. Tone

### 4.1 Hatching

Light comes from the upper left, so shadow falls on the lower right of each form.
Only shadow sides and recesses get hatched, and lit sides stay flat colour.
The primary hatch runs at 45 degrees, rising from lower left to upper right.
Cross-hatch adds a second layer at 105 degrees for deep shadow.
Spacing sets the tone: 12 px for light shade, 8 px for mid shade, 5 px for dark shade, with the cross layer at 7 px.
Cylinders (stems, bodies, trunks) take contour hatching perpendicular to the long axis, slightly curved, 6 to 8 px apart, on the shadow half only.
Foliage takes hatching parallel to the side veins, between the veins.
Bark takes lengthwise hatching.
Water takes horizontal hatching, and coastlines take engraved hatching parallel to the coast that fades with distance offshore.
Every stroke jitters: angle plus or minus 3 degrees, spacing plus or minus 15 percent, each end plus or minus 6 px.

### 4.2 Stipple

Stipple dots have a radius of 1.0 to 2.2 px.
Use stipple for hairs, frost, stars, fine tissue texture, and the body texture of a subject seen very small.
Density runs from 0.002 dots per px² (sparse) to 0.02 dots per px² (dense).

### 4.3 Grain and boil

`core` lays paper grain over illustrated shots and fine noise over schematic shots, re-seeded on the 12 fps boil clock.
Scenes do not add their own full-frame grain.
Every ink and schematic line wobbles on the same 12 fps boil through `lib.boil(T)`, so still frames shimmer like drawn animation.

### 4.4 Stripes

The stripe background uses `lib.stripes` with a band width of 140 px at 30 degrees, rising left to right (`width: 140, angle: -0.52`).
Band A is stripeCream and band B changes by act, as listed in 2.1.
Stripes drift 6 px along their normal per beat unless a shot says otherwise.

## 5. Schematic language

The schematic shots explain what happens inside, and they never show the outside life.
Every schematic frame starts from `lib.blueprint`: navy base, 60 px grid, at least one large faint guide circle, and two long diagonals.
The subject is a double lavender outline with fine internal structure.
Cell structure is a lattice: hexagons (14 to 18 px cells) for tissue and eyes, rectangular cells for shells and sections.
Nuclei and points of activity are glow dots: core radius 8 to 10 px in glow, halo radius 40 px, and 8 to 16 radial ticks 14 to 22 px long at 70 percent.
Measurement is shown with brackets, tick scales and arc annotations, never with numbers.
No text appears in any schematic shot except the final wordmark.
Relationships are shown as a network: thin curved lavender lines from a source region to small circular node glyphs 90 to 120 px across.
Magenta marks a moment of change and each magenta event lasts at most 12 frames before fading.
The progress glyph is the **cycle ring**: a ring of radius 44 at (900, 300), 2 px lavender at 40 percent, split into four arcs with 10-degree gaps, starting at 12 o'clock and running clockwise: egg, chick, flight, migration.
The current arc is lit in lineWhite at 3 px, finished arcs stay lavender at 70 percent, and a glow dot of radius 5 rides the lit arc's leading end.
Shot 02 lights the egg arc, 05 the chick arc, 07 and 10 the flight arc, 12 the migration arc, and 17 closes all four arcs and then relights the egg arc.
`src/scenes/02-egg-blueprint.js` owns the canonical `cycleRing(ctx, L, stage, progress, bi)` helper; every other schematic shot copies it verbatim.

## 6. Overlays on illustrations

Overlays show what the drawing cannot: paths, attention, sound, time and scale.
They are thin rings, arcs, straight guide lines, rulers and brackets in the four overlay colours.
Rings expand with `outExpo` and fade over 5 to 12 frames.
Trajectory lines draw on behind a moving subject at 24 fps.
Every illustrated shot carries at least one overlay and at most four overlay colours at once.

## 7. Motion

### 7.1 The on-twos rule

Anything that is drawn as a character or object moves on twos.
Compute its pose from `lib.onTwos(t)`, so it changes 12 times a second and holds each drawing for 2 frames.
Camera moves, zooms, overlay draw-on progress and ring expansion run at a full 24 fps so they stay smooth.
Line wobble follows the 12 fps boil clock.

### 7.2 Timing

The beat is 60/bpm seconds; at the default 120 bpm that is 0.5 s, which is 12 frames at 24 fps, an 8th note 6 frames and a 16th note 3.
Every pop, cut and hit lands on a beat, an 8th or a 16th, exactly on the frame.
Pops use `outBack` over 3 frames with a 6 to 10 percent overshoot.
Draw-ons use `outExpo` over 6 frames.
Character motion never eases for longer than one beat, and only camera moves may run slower.
Motion should feel snappy, never floaty.

### 7.3 Determinism

Seed every random choice from `lib.hash(shotId, ...)` through `lib.rng`.
A scene draws from `t` alone and never depends on a previous frame.
A scene may be asked for `t` slightly beyond its duration during a transition, so clamp to the final pose.

## 8. Match cuts

A match cut keeps a shape on the same pixels across a mode change.
The shared geometry tables live in `docs/storyboard.md`, section "Shared geometry", and scenes copy those numbers exactly.
Line weights may change across the cut, positions may not.

## 9. Wordmark

The wordmark is the film's word in lowercase.
Draw it with `lib.text` in a thin system sans-serif (weight 200: headless Chromium draws 300 as regular), 44 px, letter-spacing 0.12 em, lavender at 85 percent.
It is centred on x = 540 with its baseline at y = 1470, inside the Shorts safe area (the bottom-right corner sits under the button column).
The baseline stays at y = 1470. If the closing diagram collides with the wordmark, move the diagram — never the wordmark.

## 10. Subject reference

Draw from these facts.
Sources checked on 23 Sep 2026: Egevang et al. 2010 (PNAS), Fijn et al. 2013 (Ardea), Alerstam et al. 2019 (Ecology and Evolution), Newcastle University Farne Islands releases 2016 and 2019, Wikipedia "Arctic tern", BTO BirdFacts, Cornell All About Birds, Audubon Guide, ABSA "Bird in the Hand" (HANZAB measurements), NatureScot Isle of May Common vs Arctic tern guide, Østnes et al. 1997 (Polar Research), Hedenström and Åkesson 2016 (Phil Trans B), feather-structure sources (Wikipedia "Feather" and "Flight feather", Sullivan et al. 2017, Kovalev et al. 2014), Redfern et al. 2025, and a Maine Coastal Islands field blog plus Wikipedia "Egg tooth".
Lines marked "general" come from standard bird anatomy rather than an Arctic-tern source.
The protagonist population is the NE Greenland colony on Sand Island, Young Sound (74°43′N, 20°27′W), the population Egevang tracked.

### 10.1 Adult in breeding plumage (the hero)

Length 330 to 360 mm bill tip to tail tip (draw 345), wingspan 760 to 850 mm (draw 790), mass about 104 g.
Wingspan to body length is 2.3 to 1: a small body under very long wings.
Wing chord (wrist to tip) 273 mm, about 0.8 of body length.
Bill 31 mm, straight, slim, pointed, blood red (billRed) all the way to the tip, no black tip.
Head small and round with a steep forehead; the bill is about as long as the head is deep.
Black cap (capBlack) from the bill base over the crown to the nape; the eye sits inside the cap's lower edge and does not read as a separate white-ringed eye.
Below the cap a white stripe (plumeWhite) runs from the bill base back across the cheek; the throat and cheek are white.
Underparts are pale grey (breastGrey), visibly greyer than the cheek.
Mantle and upperwing are pale grey (mantleGrey), the scapulars tipped white, the leading edge of the wing white.
Rump and tail white; the tail is deeply forked, outer webs of the outer feathers grey.
Tail: central feather 70 mm, fork up to 130 mm deep, so the tail makes about 0.4 of total length; 12 feathers, 6 pairs (T1 to T6), the outermost pair (T6) the long streamers.
Legs red (legRed) and very short: tarsus 16 mm, shorter than the 21 mm middle toe, so a standing bird looks as if it sits on its belly.
Feet webbed, three toes forward.
Sexes look alike.
At rest the tail streamers reach past the folded wingtips.
From below, the primaries are translucent (primaryGlow) with a thin, neat black trailing edge (capBlack, 3 px at hero scale); above they are uniformly grey with no dark wedge.
Hero scale: at wingspan 940 px, 1 mm = 1.19 px; bill 37 px, head about 44 px across, body 410 px long, tarsus 19 px.

### 10.2 Flight, hover and dive

Primaries: 10 per wing, the outermost the longest, the tips forming a sharp point (standard tern count; weakly sourced, draw 10).
Secondaries: shorter, broad, blunt-ended, along the forearm; draw 14 (general, count not sourced).
The wing is long, narrow, pointed, angled at the wrist; aspect ratio 12.2 (span squared over area).
Flapping uses deep, "rowing" wingbeats; draw the downstroke as the wings sweep below the body line and the upstroke with the hand flexed back at the wrist.
Hunting: flies slowly upwind, hovers with the body tilted up about 30 degrees, tail spread, head angled down, bill pointing at the water; then plunges to about 50 cm, rises with a shake and swallows the fish head first.
Carrying food: a single sand eel held crosswise in the bill tip, hanging on both sides.
Courtship fish flight: the male flies low with fish in bill pointed down and wings held down; the female passes above with body straight and head up.
Migratory airspeed about 9.8 m/s; flocks are small and loose, typically 6 to 7 birds and under 15, never a V.
Call: a harsh "kee-ar" and a high "kip".

### 10.3 Egg and nest scrape

Egg 41 × 30 mm, length to breadth 1.37, 19 g, an ovoid with one blunt end and one narrower end.
Ground colour olive-buff (egg, eggPale on the lit side), covered in small brown spots (eggSpot) and larger black-brown blotches (eggBlotch), densest in a loose ring toward the blunt end.
The egg lies on its side in the scrape.
Clutch: 2 eggs usually, 1 common, 3 rare; one brood a year.
The nest is a shallow scrape in shingle, sand or short moss, bare or lined with a few pebbles, shell bits or grass stems on the rim; never a cup.
Both parents incubate, 21 to 24 days (range up to 27).
The eggs are camouflaged against pebbles: in the wide shot they almost disappear among the shingle.
Colony on Sand Island: bare gravel and shingle, patches of moss and orange lichen, no trees, the sea close by.
In the colony, parents dive-bomb intruders, striking at the head.

### 10.4 Hatching

General bird sequence, not tern-specific (the tern timings are unverified): the chick pierces the air cell inside the blunt end with its egg tooth, then pips a small star-shaped crack in the shell near the blunt end, then turns inside the egg, cutting a ring around the blunt end, and pushes the cap off.
The egg tooth is a small pale point on the tip of the upper bill; it falls off or is absorbed within days.
The hatchling is wet and dark at first and dries fluffy; eyes open.

### 10.5 Chick and growth

Semi-precocial and downy: it walks within hours but stays near the scrape, leaves it 1 to 3 days after hatching, hides nearby, and is brooded for about 10 days.
Down is grey (downGrey) or brassy tan (downTan), with black speckles (downSpeck) from dense to almost none; siblings can differ.
Bill of the chick is pinkish-orange with a dark tip (general tern chick; draw legRed at 60 percent over downTan), legs pinkish.
Both parents feed it whole fish, mainly sand eels, also young herring, cod and capelin, under 15 cm.

| Day | Mass | Look |
|---|---|---|
| 0 | 13 g, 1/8 of the adult | round down ball, head a third of the body, egg tooth, big dark eye |
| 5 | about 30 g | fluffier, legs sturdier, still all down |
| 10 | about 60 g | pin feathers (dark sheaths) show on wings and scapulars, down on the head and belly |
| 15 | about 90 g | grey mantle feathers and wing feathers unsheathed, down tufts clinging at the tips |
| 20 | about 104 g, adult mass | juvenile plumage complete, short tail, wings nearly full |

Mass climbs about 5.3 g a day from day 3 to day 12, then levels at adult mass by day 20.

### 10.6 Juvenile at first flight

First flight at 21 to 24 days.
Juvenile: black bill and legs (juvBill), white forehead, smudgy black rear crown, dark carpal bar along the leading edge of the inner wing (carpalBar), scaly mantle with pale orangey-brown fringes (juvFringe), short tail with short streamers.
Juvenile wing chord 246 mm, 0.9 of the adult.
It stays with its parents for 1 to 2 more months and must learn plunge-diving after fledging.

### 10.7 Feather structure

A vaned flight feather: a hollow quill (calamus) set in the skin, continuing as the shaft (rachis); a row of barbs on each side forms the vane.
The vane on the leading side is narrow and the trailing side broad (asymmetric flight feather, general).
Each barb carries barbules on both sides: on the tip-ward side hook barbules with tiny backward-facing hooklets, on the base-ward side curved bow barbules with grooves.
The hooklets catch the next barb's bow barbules like a zip; a split vane is re-zipped by stroking (preening).
Barbule spacing is 8 to 16 µm in every bird measured.
Grooved barbules branch from the barb at about 18 degrees and are about 0.6 mm long; hooked barbules branch at about 42 degrees and are about 0.4 mm long.
Down feathers have no hooklets, so their barbules float free.
A growing feather emerges rolled inside a waxy sheath (pin feather) with a blood supply in its core; the sheath flakes away from the tip and the vane unfurls (general).
Adults moult their wing feathers in the Antarctic winter, not on migration.

### 10.8 Prey: sand eel

Ammodytes: a slim silver fish, 8 to 15 cm, green-grey back (sandEelBack) fading to a silver belly (sandEel), pointed snout with the lower jaw jutting forward, one long low dorsal fin, forked tail.
Draw it about 1.3 × the tern's bill length when carried.

### 10.9 Midnight sun and the two summers

At Sand Island (74.7°N) the sun stays above the horizon from late April to mid-August (general astronomy), so the whole breeding season is daylight: the sun circles low around the sky instead of setting.
In the Antarctic ice zone the birds meet the southern summer: they fly from one summer to the other and see more daylight than any other animal.

### 10.10 Migration (Greenland population, Egevang 2010)

| Date | Event |
|---|---|
| June to July | breeding at Sand Island, 74.7°N 20.5°W |
| early to mid August | leave the colony, flying south-west |
| 22 August | arrive at the North Atlantic stopover, 41 to 53°N, 27 to 41°W (centre 47°N 34°W), about 25 days |
| 15 September | head south-east toward West Africa |
| about 10°N, south of Cape Verde | the routes split: 7 of 11 birds follow the African coast, 4 of 11 cross to the coast of Brazil |
| 38 to 40°S | directed southward travel ends |
| 24 November | arrive in the Weddell Sea sector, south of 58°S between 0 and 61°W, at the pack-ice edge |
| 16 April | leave, flying north on an S-shaped track |
| 3 May | cross the equator |
| late May | back at the colony |

Southbound 34,600 km in 93 days (330 km a day); northbound 25,700 km in 40 days (520 km a day); total 70,900 km a year including 10,900 km moving around the wintering area.
The return track is an S: counter-clockwise around the South Atlantic gyre, then clockwise around the North Atlantic gyre, riding the prevailing winds; it runs over deep water far from the coasts.
Over 30 years a bird covers about 2.4 million km, three return trips to the Moon.
Oldest known birds: 34 years.
Birds return to the same colony and pair for life; they first breed at 2 to 4 years.

### 10.11 Antarctic winter

At the pack-ice edge in the Weddell Sea, 149 days, December to April (the southern summer).
Birds rest on small ice floes and moult their flight feathers, rarely flying.
Winter adults: white forehead, black bill and legs, dark carpal bar, shorter streamers.

### 10.12 Mistakes to avoid

- A Common tern instead of an Arctic tern: an orange bill with a black tip, long legs, a dark wedge on the upper primaries. Draw the bill blood red to the tip, the legs very short, the upper primaries uniformly grey, and the streamers past the folded wingtips.
- A white bird lost on cream paper. Draw plumeWhite with a 5 px ink outline and plumeShade tone on the shadow side, and stand the bird on grey mantle and grey underparts.
- A red bill or black cap on the ice. In Antarctica draw the winter plumage: white forehead, black bill and legs.
- A juvenile with a red bill and long streamers. Draw the juvenile with a black bill, white forehead, dark carpal bar and short tail.
- A built nest or a cup. Draw a shallow scrape in shingle with a few pebbles on the rim.
- White or blue eggs. Draw olive-buff eggs with dark blotches, lying on their sides, camouflaged in the shingle.
- A yellow duckling. Draw grey or tan down with black speckles, the two siblings different.
- A straight pole-to-pole line on the map. Draw the southbound route via the North Atlantic stopover and the split at 10°N, and the northbound route as an S through the middle of the Atlantic.
- A V-formation of birds. Draw loose, small groups of 6 to 7 birds.
- A hooked, gull-like bill or a heavy body. Draw a straight slim bill and a slim body under long narrow wings.
- Feathers with tidy parallel stripes only. Draw barbs off the rachis with barbules branching at the stated angles, hooks on the tip-ward side.
