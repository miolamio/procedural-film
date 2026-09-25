<!-- Theme: shards (flat facets, low-poly space). Sections 1–9 of docs/art-bible.md; step 3 of SKILL.md copies them in verbatim. -->

## 1. Frame

The canvas is 1920 px wide and 1080 px tall at 24 fps: set `width: 1920, height: 1080` in the timeline. A film may pick 1080×1920 instead; then scale every pixel value below by 1080/1920 and keep the ratios.
Every pixel value in this file assumes 1920×1080. The origin is the top-left corner and y grows downward.

- Must-read content sits inside the title-safe box: x 96–1824, y 54–1026.
- The subject is built from facets and sits on the centre line or a third; the facet field may run full bleed around it.
- One focal solid or cluster per shot. The field around it is quieter: smaller facets, darker steps.

## 2. Palettes

Names below are the keys of `FILM.lib.pal`. The theme's colours (2.1) and the film's subject colours (2.2) both go into the marked 2.2 block of `src/lib.js`: paste `themes/shards/palette.js` first, then the subject rows. The house palettes stay in `lib.pal` for the engine and are not used by scenes.

Colour is flat, in facets. Tone comes from which of the four steps a facet takes and from the light on a solid.

### 2.1 Shard palette

| Name | Hex | Use |
|---|---|---|
| ground | #0B0E1A | Plate base |
| groundLift | #141A2E | Soft lift behind the subject; the fog colour of polygon space |
| shardDeep | #1E2A4A | Darkest facet step, the field far from the subject |
| shardMid | #34507E | Middle facet step |
| shardLight | #6F93C4 | Lit facet step, tunnel and solid faces |
| shardPale | #B9CFEA | Brightest facet step: only near the subject |
| edge | #EEF4FF | Facet edges, cracks |
| flare | #FF4F3A | The one accent |
| flareHot | #FFC2A8 | The accent's lit face |

### 2.2 Subject palette

REWRITE PER FILM. Subject facets take the four steps; add 0 to 4 names only for a subject whose own colour matters (a second hue in four steps is at most four names). Never a second accent. Enter every one into the marked block in `src/lib.js` after the theme rows.

| Name | Hex | Use |
|---|---|---|
| … | #… | … |

### 2.3 The accent

Flare marks one facet, one solid or one cluster per act: the thing that breaks, or the thing that holds while everything else breaks.

## 3. Line

All widths at 1920 px wide. Edges are exact straight segments: no pressure, no boil.

| Element | Width | Colour and opacity |
|---|---|---|
| Facet edge, near the subject | 1.4 px | edge 90% |
| Facet edge, in the field | 1 px | edge 35–55% |
| Crack (a facet about to part) | 1.2 px | edge 85%, drawn on over 3 frames |
| Solid and tunnel edges (`faces3d` stroke) | 1.2–1.5 px | edge or shardLight, fading with the fog |
| Gap between parted facets | 0–4% of the distance from the centre of parting | ground shows through |

## 4. Tone

- No hatching, no stipple, no gradients inside a facet. A facet is one flat step.
- Facet steps fall off with distance from the subject: shardPale and shardLight within about 250 px, shardMid beyond, shardDeep at the edges of the frame. Seed the step of each facet from `lib.hash('shard', i)` so it stays put.
- Solids and tunnels are `lib.faces3d`: one light (`light`, from upper left toward the viewer by default), `ambient` 0.3–0.4, `fog` 0.8–0.95 toward `groundLift` or `ground`.
- The plate: `ground` base, a radial lift to `groundLift` behind the subject. Grain at 40% (`post: 0.4`).

## 5. Facet language

- **Shard field** (recipe 35). Facets are Voronoi cells (`lib.voronoi`, 30 to 80 sites, `relax` 1 for even pieces, 0 for splinters). They part along the direction away from a centre of parting and close again; nothing inside a facet moves.
- **Polygon space** (recipe 36, plan B). Low-poly solids (`mesh3d.box`, `cylinder`, 6 to 10 sides) and tunnels (`mesh3d.tunnel`, 6 to 10 sides) with filled faces. The camera flies down a tunnel by shifting the mesh (`shift: [0, 0, travel % ringStep]`), so the flight loops without a seam.
- **Breaking.** A cut between plates is a `shatter` transition from an impact point on the subject (0.5 to 0.9 s, 20 to 40 pieces). A shape may also break inside a shot: crack first (edges draw on), then part.
- No text in any shot.

## 6. Overlays

None. What an overlay would show (a path, a force, a count) is shown by facets: a trail of small shards, a gap that opens, a count of pieces.

## 7. Motion

### 7.1 Facet time

Facets move at a full 24 fps and ease: parting uses `outExpo` over half a beat, closing `inOutCubic` over a beat. A solid turns at a constant rate (a turntable) or snaps a quarter turn on a beat (`outBack`, 4 frames).
The camera flies at a constant speed, one ring step per beat at most; faster reads as noise.

### 7.2 Timing

Parting and closing land on beats with `lib.hit(..., lead = 1)`. A shatter's impact frame is its first frame, on the cut. At most one shatter per two bars.

### 7.3 Determinism

Seed sites and steps from `lib.hash(shotId, ...)` through `lib.rng`; build the sites once per shot, not per frame (`voronoi` is cached by its sites). A scene draws from `t` alone; clamp `t` to the final pose past the shot's end.

## 8. Match cuts and continuity

A subject drawn as a shard cluster and as a solid keeps the same outline across the cut; list that outline in the storyboard's Shared geometry and `src/geo.js`, and check 7 measures it. A shatter transition keeps the outgoing frame's pieces in place on its first frame.

## 9. Wordmark

None by default. If the film needs one, it is built from facets: the word's letters as clusters of 3 to 6 flat shards each, in shardPale, parting once at the end.
