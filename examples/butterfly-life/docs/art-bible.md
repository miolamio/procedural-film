# Art bible: The life of a monarch butterfly

The visual rules every scene follows.
The look comes from `docs/reference-analysis.md`: warm ink illustration cut against navy blueprint.
Where this file and a scene brief disagree on a colour, weight or rule, this file wins.
Where this file and `docs/storyboard.md` disagree on a position or a time, the storyboard wins.

## 1. Frame

The canvas is 1080 px wide and 1920 px tall at 24 fps.
Every pixel value in this file assumes that size.
The origin is the top-left corner and y grows downward.

### 1.1 Shorts safe area

YouTube Shorts draws its own interface over the video.
The title and channel row covers roughly the bottom 380 px, the button column covers roughly x 950 to 1080 from y 1000 down, and the top bar covers roughly the top 180 px.
Anything the viewer must read (the subject, a match-cut shape, a glyph that carries meaning, the wordmark) sits inside x 60 to 940 and y 220 to 1540.
Backgrounds, stripes, grain, guide geometry, construction lines and decorative scenery run full bleed.

### 1.2 Composition for a tall frame

Compose for the height, never crop a square.
Hanging and climbing subjects use the vertical axis: the egg under the leaf, the J, the chrysalis, the emerging adult, the fir trunk.
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
| paperShade | #E2D1B0 | Paper shadow, tucked scale edges on white |
| paperDeep | #CDB58C | Paper vignette, deep paper tone |
| stripeCream | #F2E7CF | Stripe band A, default |
| stripeYellow | #EFDCA3 | Stripe band B, cold open and summer |
| stripeApricot | #F0D9B5 | Stripe band B, chrysalis and eclosion, dawn sky |
| stripeSage | #DCE3CC | Stripe band B, leaf and larva shots |
| stripeSpring | #E4EDD0 | Stripe band B, spring egg |
| stripeSky | #C9D3D2 | Stripe band B, migration sky |
| ink | #2A1C13 | Main outlines |
| inkSoft | #5B4331 | Secondary outlines, detail lines, egg ridges |
| inkFaint | #8A735C | Construction lines, graticule |
| tan | #C8A47A | Shed skin, dry grass |
| ochre | #C38F2E | Grass bands, autumn leaf patches |
| rose | #C88C86 | Dusty rose accents |
| duskRose | #E3B1A1 | Dusk sky band |
| sage | #94A47F | Generic foliage |
| teal | #3C8783 | Water hatching, teal accents |
| tealDeep | #285F5D | Deep water hatching |
| sun | #F1BF4A | Sun disc |
| nightSky | #4E3F6E | Night sky band |
| night | #2F2748 | Deepest night, star-field base |
| white | #FBF6EA | Highlights, latex beads, silk, floss, moon |

`orange #D8742B`, `leaf #6E8F4F`, `wood #A8784C`, `sunset #E79D8F`, `dusk #5A4878` and `red #BF3F2C` stay available in `lib.pal` for incidental scenery.

### 2.2 Monarch extension, warm

| Name | Hex | Use |
|---|---|---|
| monarch | #D9772B | Adult wing upperside orange |
| monarchDeep | #B55A1C | Hatching on orange, darker orange near the body |
| monarchUnder | #D9A45A | Underside forewing tip and hindwing, yellow-brown |
| monarchPale | #E9A15F | Faded wings of the worn spring female |
| veinBlack | #221A15 | Veins, wing borders, adult body, larval black bands |
| spotWhite | #F6F0E2 | White wing and body spots |
| bandYellow | #E6BE3A | Larval yellow bands, yellow head triangle |
| bandWhite | #F1ECDF | Larval white bands |
| larvaFirst | #CBD3BC | First-instar translucent grey-green body |
| egg | #EFE4C6 | Egg shell, ivory cream |
| milkweed | #9DB08A | Milkweed leaf |
| milkweedDeep | #6F8A5E | Hatching on milkweed leaves, cast shadows on leaves |
| milkweedPale | #D5DEC4 | Leaf midrib and vein net |
| milkweedYoung | #B9CF94 | Spring shoot leaves |
| milkweedStem | #7E9A63 | Milkweed stem |
| milkweedFlower | #CF8FA0 | Pink-mauve florets |
| milkweedCrown | #A9607A | Floret crown hoods, flower shadow |
| seedPod | #8E875A | Autumn seed pod, olive-brown |
| chrysalis | #8CC3A0 | Chrysalis jade |
| chrysalisDeep | #5E9A7A | Hatching on the chrysalis, wing-case lines |
| chrysalisDark | #37504C | Chrysalis darkening in the last day |
| gold | #D6A93C | Chrysalis gold dots and rim |
| goldLight | #F2D27A | Gold glint sparkle |
| meconium | #8E2B22 | Red-brown droplet after emergence |
| bark | #5A4332 | Twig and fir bark |
| fir | #3E5C54 | Oyamel fir needles |
| mist | #CFC6E0 | Mountain mist bands, empty chrysalis glaze |
| monarchApex | #E58E3A | Wing apex orange, hero close-up gradient |
| abdomenSeam | #5E4A3C | Abdomen segment seam stroke |
| bodyHatch | #6B5646 | Thorax and abdomen fine hatching |
| eyeDark | #17110D | Compound eye fill |
| eyeFacet | #6A5646 | Compound eye facet stipple |
| pureWhite | #FFFFFF | Specular glints, dawn sky multiply top layer |
| frassBrown | #4A4A2E | Frass pellet fill |
| magentaCoreDeep | #FFD0E6 | Chrysalis heartbeat glow-dot core, deepest pink |
| goldCore | #FFF4D0 | Chrysalis gold-dot glow core |
| magentaCoreMid | #FFE0EF | Chrysalis pulse glow-dot core |
| magentaCorePale | #FFE6F2 | Wing-vein target glow-dot core |
| scaleBlackEdge | #6B5645 | Black-category scale outline and ridge stroke |
| scaleBlackRidge | #5E4A3A | Black-category scale ridge fill |
| scaleWhiteRidge | #C9B48E | White-category scale ridge fill |
| milkweedSeed | #7B5534 | Floss seed body fill |
| milkweedAutumn | #6B4A1E | Autumn stem and leaf mix target |
| fieldStraw | #D8C48C | Farmland patchwork field, straw gold |
| fieldWheat | #CDB77E | Farmland patchwork field, wheat gold |
| fieldOlive | #B9B98A | Farmland patchwork field, olive |
| skyNightA | #53478B | Night sky stripe band A, pull-back continent |
| skyNightB | #D6D2DE | Night sky stripe band B |
| skyDawnB | #FFF1E2 | Dawn sky stripe band B |

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
| hemolymph | #BFEFF5 | Fluid dots moving through veins |
| schemOrange | #F2A66A | Monarch identity tint in blueprint |
| schemGreen | #A9CF9A | Milkweed identity tint in blueprint |
| schemJade | #93D9BC | Chrysalis identity tint in blueprint |
| schemGold | #F2CF7A | Gold dot identity tint in blueprint |

Subject tints are line or dot colours, never fills, and a schematic shot uses at most one of them besides magenta.

### 2.4 Overlay colours on illustrations

| Name | Hex | Use |
|---|---|---|
| annMagenta | #E43D8C | Change rings, trajectory of the migration, target rings |
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
| Detail lines: segment rings, leaf veins, egg ridges | 1.8 px | inkSoft 90% |
| Hatch strokes | 1.2 to 1.8 px | ink or the form's deep colour, 70 to 90% |
| Construction lines | 1.5 px | inkFaint 30% |
| Wing veins on the adult | filled bands 10 to 18 px at a 1000 px wingspan, tapering toward the margin | veinBlack |

Scale wing-vein bands with the wingspan.
Female veins are about 1.3 times the male width.

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
Cylinders (stems, caterpillar bodies, the abdomen, the fir trunk) take contour hatching perpendicular to the long axis, slightly curved, 6 to 8 px apart, on the shadow half only.
Leaves take hatching parallel to the side veins, between the veins.
Bark takes lengthwise hatching.
Water takes horizontal hatching, and coastlines take engraved hatching parallel to the coast that fades with distance offshore.
Every stroke jitters: angle plus or minus 3 degrees, spacing plus or minus 15 percent, each end plus or minus 6 px.

### 4.2 Stipple

Stipple dots have a radius of 1.0 to 2.2 px.
Use stipple for leaf hairs, frost, stars, floss texture, yolk and tissue in blueprint, and the body texture of a butterfly seen very small.
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
Cell structure is a lattice: hexagons (14 to 18 px cells) for tissue and eyes, rectangular cells for the egg shell and leaf section.
Nuclei and points of activity are glow dots: core radius 8 to 10 px in glow, halo radius 40 px, and 8 to 16 radial ticks 14 to 22 px long at 70 percent.
Measurement is shown with brackets, tick scales and arc annotations, never with numbers.
No text appears in any schematic shot except the final wordmark.
Relationships are shown as a network: thin curved lavender lines from a source region to small circular node glyphs 90 to 120 px across.
Magenta marks a moment of change (fertilisation, division, a breakdown, a lock-on, the heading) and each magenta event lasts at most 12 frames before fading.
A cycle glyph sits at (900, 300): a ring of radius 44 split into four arcs (egg, larva, pupa, adult, clockwise from the top), the current stage arc in lineWhite and the others in lavender 25 percent.

## 6. Overlays on illustrations

Overlays show what the drawing cannot: paths, attention, sound, time and scale.
They are thin rings, arcs, straight guide lines, rulers and brackets in the four overlay colours.
Rings expand with `outExpo` and fade over 5 to 12 frames.
Trajectory lines draw on behind a moving subject at 24 fps.
Every illustrated shot carries at least one overlay and at most four overlay colours at once.

## 7. Motion

### 7.1 The on-twos rule

Anything that is drawn as a character or object moves on twos: butterflies, caterpillars, wings, the chrysalis, falling capsules, seeds, particles.
Compute its pose from `lib.onTwos(t)`, so it changes 12 times a second and holds each drawing for 2 frames.
Camera moves, zooms, overlay draw-on progress and ring expansion run at a full 24 fps so they stay smooth.
Line wobble follows the 12 fps boil clock.

### 7.2 Timing

The beat is 0.5 s, which is 12 frames at 24 fps.
An 8th note is 6 frames and a 16th note is 3 frames.
Every pop, molt, division, cut and hit lands on a beat, an 8th or a 16th, exactly on the frame.
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
The shared geometry tables live in `docs/storyboard.md`, section "Shared geometry", mirrored as data in `src/geo.js`; scenes read them with `lib.geo(id)` and gate check 7 measures the drawn edges on both sides of every listed cut.
Line weights may change across the cut, positions may not.

## 9. Wordmark

The wordmark is the word `monarch` in lowercase.
Draw it with `lib.text` in a thin system sans-serif (light weight), 44 px, letter-spacing 0.12 em, lavender at 85 percent.
It is centred on x = 540 with its baseline at y = 1470, inside the Shorts safe area.
The reference puts its wordmark in the bottom-right corner, but on Shorts that corner sits under the button column.

## 10. Anatomy reference

Draw from these facts.
Sources checked on 16 Sep 2026: Monarch Joint Venture life-cycle and growth pages, Wikipedia "Monarch butterfly" and "Monarch butterfly migration", Proc. R. Soc. B 2024 (PMC10878802) on trenching, Merlin, Gegear and Reppert 2009 (Science) on antennal clocks, and Guerra and Reppert 2013 (Current Biology) on cold and the spring flight.
Lines marked "general" come from standard butterfly anatomy rather than a monarch-specific source.

### 10.1 Egg

The egg is cream or pale yellow-cream, sometimes pale green.
It is ovoid-conical: a flat base glued to the leaf, widest in the lower third, tapering to a rounded tip.
It is about 1.2 mm tall and 0.9 mm wide, a height-to-width ratio of 4 to 3.
Raised longitudinal ridges run from the base to the tip, and fine transverse cross-ribs between them make a ladder of small rectangular cells.
We draw 18 ridges on the visible face and 34 cross-ribs.
The micropyle, where sperm enter, is a small rosette of cells at the tip, because the shell forms before fertilisation.
The female lays eggs singly, usually on the underside of a young milkweed leaf near the top of the plant, and glues each one down.
Seen from the side under a leaf, the egg hangs with its tip pointing down.
The egg hatches in about 4 days (3 to 8 with temperature).
The dark head of the larva shows through near the tip shortly before hatching.

### 10.2 Caterpillar

The body is a head capsule plus 13 segments: 3 thoracic (T1 to T3) and 10 abdominal (A1 to A10).
Each thoracic segment carries a pair of short black jointed true legs close to the head.
Fleshy prolegs sit on A3 to A6 and A10, which makes five pairs, and from the 4th instar they carry white spots.
The front pair of black filaments grows from T2, just behind the head, and the rear pair from A8, and the front pair is always longer.
From the 2nd instar every segment carries transverse bands of black, white and yellow, and the head is black with a yellow triangle and yellow face bands.
Small dark spiracle ovals run along each side.

| Instar | Body length | Head capsule | Front filaments | Rear filaments | Look |
|---|---|---|---|---|---|
| 1st | 2 to 6 mm | 0.6 mm | small bumps | barely visible | pale grey-green, shiny, translucent, no bands, black head wider than the body, dark triangular patches behind the head |
| 2nd | 6 to 9 mm | 0.8 mm | 0.3 mm | small knobs | clear black, white and yellow bands, yellow head triangle |
| 3rd | 10 to 14 mm | 1.5 mm | 1.7 mm | 0.9 mm | bold abdominal bands, thorax bands still indistinct |
| 4th | 13 to 25 mm | 2.2 mm | 5 mm | 2 mm | distinct thorax bands, white spots on prolegs |
| 5th | 25 to 45 mm | 3.5 mm | 11 mm | 4 mm | bold velvety bands, width 5 to 8 mm |

Larval life lasts about 9 to 14 days with five instars and four molts.
At each molt the head capsule comes off first, then the old skin peels back from the front.
First meal: the eggshell, then the fine hairs on the leaf underside, then leaf tissue.
First and second instars usually chew a circular trench that cuts the latex supply, then feed inside it, leaving arc-shaped holes.
Older caterpillars cut leaf veins or the leaf stalk instead, and third and later instars feed from leaf edges.
Caterpillars store cardenolides from milkweed and keep them into adulthood.
Clusters of cells inside the larva (imaginal discs) will become the wings, and the proboscis, antennae and eyes also begin forming in the larva.

### 10.3 J-hang and chrysalis

The 5th instar spins a silk pad on a downward-facing surface, grips it with its last pair of prolegs and hangs in a J for about 12 to 16 hours.
It straightens, a wave runs along the body, the skin splits behind the head, and the skin is worked up to the pad over a few minutes.
The black cremaster, a hooked stalk at the rear, is set into the silk pad and the old skin drops.
The fresh pupa is long and soft and compacts over a few hours.
The finished chrysalis is jade green, about 25 mm long and 10 to 12 mm wide, and hangs abdomen-up and head-down.
A black rim band edged with gold dots crosses it about one third of the way down from the cremaster.
Small gold dots sit near the bottom.
The wing cases show as faint lines on the lower front.
The pupal stage lasts 8 to 15 days, usually 11 to 12.
About a day before emergence it turns translucent and bluish, then the orange, black and white wing pattern becomes visible inside.
The pattern shows because the wing scales take on their pigment only at the very end of the pupal stage, so draw a dark case with the folded pattern visible, not a glass jar.
Metamorphosis is not a melt into liquid: larval tissues such as the crawling muscles break down, but many adult parts are already under way from the larva, the nervous system is kept (general), and the pupa's main work is growing the wings and building flight muscles.

### 10.4 Adult

Wingspan is 8.9 to 10.2 cm, and the body is about 3 cm long.
The upperside is tawny orange (monarch) with black veins and black borders.
The borders carry two rows of small white spots.
The black forewing tip carries a few orange spots and a band of white spots.
The underside is similar, but the forewing tip and the hindwing are yellow-brown (monarchUnder) and the white spots are larger.
The body is black with white spots on the head and thorax.
The antennae are long and end in a club.
The compound eyes are large and dark.
The proboscis coils flat under the head at rest.
A freshly emerged adult has a proboscis in two halves (galeae) that it zips together into one tube by coiling and uncoiling (general).
The adult has six legs, but the front pair is tiny and held against the thorax, so it stands and clings on four.
Males have a black spot of scent scales on a vein in the middle of each hindwing and thinner veins.
Females have no hindwing spot, wider veins, and often look darker.
The protagonist is a female in every shot, and crowds in the migration shots mix both sexes.
Colour sits in scales that overlap in rows like roof tiles, black scales along the veins, orange scales in the cells and white scales in the spots.
Each scale sits on a short stalk in a socket, and longer cover scales overlap shorter ground scales (general).
After emergence the adult hangs from the empty case with a swollen abdomen and small crumpled wings, pumps fluid into the wings until they reach full size, and needs several hours to dry before flight.
It releases a red-brown drop of meconium, the waste of the pupal stage (general).
Summer adults live 2 to 5 weeks.

### 10.5 Milkweed

Draw common milkweed (Asclepias syriaca).
The stem is thick, upright and unbranched, with fine hairs.
Leaves are broad ovals in opposite pairs, with a pale midrib and paired side veins, and they are downy underneath.
The plant carries sticky white latex in channels along the veins, which beads where a leaf is cut.
Flowers grow in ball-shaped umbels of many small pink-mauve star florets.
Each floret has five petals swept back and a raised crown of five hoods.
In autumn the plant carries warty boat-shaped seed pods that split along one seam and release flat brown seeds, each with a tuft of white silky floss.
Monarch caterpillars eat only milkweed, and females lay eggs only on milkweed.

### 10.6 Migration

The late-summer generation of the eastern population delays breeding and migrates.
These adults can live up to nine months.
They fly up to about 4,800 km from southern Canada and the eastern United States to oyamel fir (Abies religiosa) forests in the mountains of central Mexico, in Michoacán and the State of México.
The route funnels south-west through Texas.
They travel by day, glide on thermals and roost together at night.
They steer with a time-compensated sun compass, and the clocks that correct for the time of day sit in the antennae.
They winter from about November to mid-March in clusters so dense that fir branches sag, with the butterflies' closed wings showing their dull undersides like dead leaves.
Cold exposure during the winter sets the compass to point north for the spring flight.
In spring the same butterflies fly north and lay eggs on new milkweed in the southern United States.
Three or four shorter-lived summer generations carry the population north again, so no single butterfly makes the round trip.
A female lays 300 to 500 eggs over two to five weeks and tastes a leaf by drumming it with her forelegs, which carry chemical receptors.

### 10.7 Mistakes to avoid

Do not draw the egg sitting on top of a leaf.
Do not draw the chrysalis head-up, or eyes and antennae at the cremaster end.
Do not give the adult six walking legs or a hindwing scent spot.
Do not put a pair of filaments on the head capsule itself.
Do not draw first-instar bands.
Do not show the chrysalis turning into a clear jar with a butterfly floating inside.
Do not show the adult flying the moment it emerges.
