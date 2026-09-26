<!-- Theme: drybrush (dry-brush silhouettes on grey paper in a black passe-partout; plate B is the negative). Sections 1–9 of docs/art-bible.md; step 3 of SKILL.md copies them in verbatim. -->

## 1. Frame

The canvas is 1920 px wide and 1080 px tall at 24 fps: set `width: 1920, height: 1080` in the timeline. A film may pick 1080×1920 instead; section 1 gives both layouts, and every size after it is a share of the opening's height, with pixels given for 1920×1080 (an opening 800 px tall; on 1080×1920 the opening is 1440 px tall, so multiply those pixels by 1.8).
The origin is the top-left corner and y grows downward.

- The picture sits in a **passe-partout**: a flat `mount` frame with a rectangular opening. On 1920×1080 the opening is x 96–1824, y 96–896 (mount 96 px at the top and sides, 184 px at the bottom). On 1080×1920 it is x 76–1004, y 176–1616.
- The mount is never cropped and never moves. The camera moves inside the opening only. Nothing is drawn over the mount except its own brushed edge and the caption (section 9).
- Must-read content sits inside the opening, 40 px in from its edges.
- The picture is a wood seen from inside it, in three or four planes (section 5). The focus plane's ground line sits at 0.875 of the opening's height (y 796 on 1920×1080), the mid ground at 0.83, the far ground at 0.78. Below the focus ground there is a strip of bare paper and a near bank along the opening's bottom edge.
- Trunks run out of the top of the opening. No tree shows its top, no sky shows a horizon: the paper between the trunks is the sky.
- One figure carries the shot and stands on the focus ground, 0.22 to 0.35 of the opening's height tall, with bare paper around its head. A second figure or a creature may watch from a near branch.

## 2. Palettes

Names below are the keys of `FILM.lib.pal`. The theme's colours (2.1) and the film's subject colours (2.2) both go into the marked 2.2 block of `src/lib.js`: paste `themes/drybrush/palette.js` first, then the subject rows. The house palettes stay in `lib.pal` for the engine and are not used by scenes.

Grey paper, one blue-black ink in three strengths, and the black mount. There is no colour anywhere in the frame.

### 2.1 Paper, ink, mount

| Name | Hex | Use |
|---|---|---|
| ash | #D3D3D3 | The paper: the whole opening, the sky between the trunks, figures' eyes |
| brushInk | #171820 | The near plane, the focus ground, every figure and creature |
| brushMid | #6B6C73 | The mid plane (trunks, dendrites, its ground), birds |
| brushFar | #A7A8AD | The far plane (thin trunks, its ground) |
| mount | #050506 | The passe-partout and its brushed inner edge |
| ashDim | #8B8B8E | The caption on the mount |

### 2.2 Subject palette

REWRITE PER FILM. None by default: a subject is drawn in the three inks. A film may add at most one more grey of the same ink, for a fourth plane; never a hue. Enter it into the marked block in `src/lib.js` after the theme rows.

| Name | Hex | Use |
|---|---|---|
| … | #… | … |

### 2.3 Accent

None. Emphasis comes from the negative (plate B), from a figure alone on bare paper, and from the paper eyes. `theme.json` still carries an accent budget: it watches the house `magenta` for one frame, so an engine default that leaks a house colour into the film shows up in check 12.

## 3. Line

There is no contour. Every shape is a dry-brush silhouette (`lib.dryBrushFill`) or a dry-brush stroke (`lib.dryBrush`): hair streaks that break up as the brush runs dry, paper tooth showing through, a frayed edge along the stroke. Nothing is stroked with `ctx.stroke()` or `inkPath`.

| Element | Call | Brush width (share of opening height; px on 1920×1080) | Colour |
|---|---|---|---|
| Near trunks (0.07–0.1 wide) | `dryBrushFill`, `dry` 0.32 | 0.021 (17 px) | brushInk |
| Near branches, one fork each | `dryBrush`, `dry` 0.45 | 0.015 (12 px) | brushInk |
| Near bank along the bottom edge | `dryBrush`, `dry` 0.4 | 0.058 (47 px) | brushInk |
| Focus ground line | `dryBrush`, `dry` 0.55 | 0.021 (17 px) | brushInk |
| Figure body and head (coat, disc head, bundle) | `dryBrushFill`, `dry` 0.28, `fringe` 1.5 px | 0.008 (7 px) | brushInk |
| Figure limbs and props (legs, arms, a pole) | `dryBrush`, `dry` 0.35 | 0.009 (7 px) | brushInk |
| Mid trunks (0.035–0.05 wide) | `dryBrushFill`, `dry` 0.4 | 0.015 (12 px) | brushMid |
| Mid dendrites, mid ground | `dryBrush` | 0.007 (6 px), 0.018 (14 px) | brushMid |
| Far trunks (0.014–0.024 wide) | `dryBrushFill`, `dry` 0.45 | 0.011 (9 px) | brushFar |
| Far dendrites, far ground | `dryBrush` | 0.005 (4 px), 0.012 (10 px) | brushFar |
| Mount's inner edge, four strokes along the opening | `dryBrush`, `dry` 0.75, `splay` 0.9 | 0.024 (19 px) | mount |

Strokes fill tall shapes upward, so a trunk is loaded at its root and dry at the top. A figure's eyes are holes: the eye rings are passed to `dryBrushFill` with the head ring, so even-odd leaves them as paper.

## 4. Tone

- None. A shape is one flat ink; the brush texture is its only variation. No hatching, no stipple, no wash, no gradient, no glow, no shadow, no vignette, no fog, no blur.
- Depth is the three inks by plane (far `brushFar`, mid `brushMid`, near and focus `brushInk`) and overlap: a nearer plane knocks out what it covers.
- The paper: a flat `ash` fill, not `lib.paper`. The tooth is in the brush: `dryBrush` skips ink on the paper's grain. The carrier is clean: `post: 0`.

## 5. Plate language

- **The wood** (recipe 46) is three planes through one `lib.layers` camera: far at `z` 3 (8 to 12 thin trunks, one dendrite each), mid at `z` 1.7 (4 to 6 trunks, two dendrites each), the focus plane at `z` 1 (the ground line and the figures) and the near plane at `z` 0.6 (one or two big trunks crossing the opening top to bottom, a branch, the bank). A fourth plane of birds may sit at `z` 2.2. Each plane is seeded and cached once; the camera tracks sideways.
- **Trunks** taper from a root flare, bend slowly and run off the top. **Dendrites** are bare branches: a curve up and out, with one fork. No leaves, no canopy, no undergrowth.
- **Figures** are the film's own people, built on `lib.stickPose` joints and painted, not drawn as sticks: a long coat or a sack body (`dryBrushFill`), a disc head with two paper eyes and nothing else on the face, thin dry-brush legs and arms. One prop per figure (a pole and bundle, a lamp without light, a rope) makes the silhouette. **Creatures** are one blot each (a hooded hump, a long-necked shape) with two paper eyes that shift the way they look and shut on a blink (`lib.blinkAt`, one drawing).
- Never copy a known figure: no bear, no double-ringed ears, no rows of teeth, no Kid A or Amnesiac character. The drawing language (silhouettes, paper eyes, stillness) is the reference; the characters are the film's.
- **Plate B** (the negative) is the same frame under `grade: { invert: 1 }`: a white mount, charcoal paper, bone-white trunks and figures, dark eyes. It is not redrawn. It carries the turn of the film (night, memory, the other side of the wood), in runs of one or two shots, and is cut into and out of, never dissolved: a dissolve through `invert` passes through flat mid grey.

## 6. Overlays

None. No rings, rulers, labels or instruments on either plate.

## 7. Motion

### 7.1 On twos, a frame ahead

Everything is held for two frames on one drawing clock: `d = Math.floor(T * 12 + 0.5)` and its time `tq = (d - 0.5) / 12`. Each drawing lands one frame before the beat, so a cut on the beat falls inside a held drawing. The camera, the walk, the birds and every other position are functions of `tq`, never of `T`.

### 7.2 Boil and plates

- The near plane boils on the drawing clock: `boil: d % 3`. The far and mid planes hold one drawing (`boil: false`): they are the most expensive plates and the least visible.
- A figure's walk is its boil. Each drawing of the walk is its own brush pass (`boil: false`, a new pose each drawing); a still figure takes `boil: d % 3`.
- Plates are cached by shape, so draw a figure or a creature in its own space and `translate` it into place: the walk repeats every 12 drawings and its plates are reused. A creature's look is quantised to a few positions.

### 7.3 Timing

The camera tracks 100 to 120 px a second at the focus plane (near plane about 1.6×, far plane a third). A walker covers 140 to 160 px a second, two steps a second (a 12-drawing cycle), so it gains slowly on the camera. A blink is one drawing. A creature's head turn takes three drawings and lands on a beat.

### 7.4 Determinism

Positions are closed forms of `tq`; a walk or a track that spans a cut keeps one clock (global `T`). Planes are rebuilt from constants and seeds; nothing is kept from the last frame.

## 8. Match cuts and continuity

- A to B: cut on the beat into the same frame under `grade: { invert: 1 }`. Because the drawing turns a frame ahead of the beat, the cut frame is the exact negative of the frame before it: nothing moves but the values.
- A to A: a silhouette cut. The figure keeps its outline and its place in the opening, and the wood around it changes (another depth, another light of paper). List the figure's outline at the cut frame in the storyboard's Shared geometry.
- The mount never changes across a cut. It inverts with plate B.

## 9. Wordmark

The theme's type is a thin sans, lower case, on the mount only, never inside the opening: `lib.text` with `weight: 200`, `size` 30 (the short side is 1080 px either way), `letterSpacing` 9, centred in the bottom margin, in `ashDim`. One line: the film's title, or the chapter. It holds for the whole shot and never animates in.
