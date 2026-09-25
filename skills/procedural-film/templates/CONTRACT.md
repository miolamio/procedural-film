# Build contract

The one source of truth for how the film's code fits together.
Every agent that touches this project follows it.

## Goal

A film of <SUBJECT — one line, e.g. "the life of a monarch butterfly">, drawn entirely by JavaScript on a canvas, with music and sound effects synthesised in JavaScript.
It ships as one self-contained HTML file and as a rendered MP4 for YouTube Shorts.
The look and editing follow `docs/art-bible.md`.

## Hard rules

1. **No media.** The shipped HTML contains no images, video, audio files, fonts files, base64, `data:` URLs, `<img>`, `new Image`, `fetch`, `XMLHttpRequest`, or CSS `url(...)`. Every pixel and every sample is computed.
2. **Deterministic.** `FILM.renderFrame(T)` draws the same pixels every time for the same `T`, in any order. No `Math.random`, no `Date`, no `performance.now` inside drawing or audio code. Randomness comes from `FILM.lib.rng(seed)`.
3. **Stateless per frame.** A scene's `draw` may not depend on a previous frame having been drawn. Caches are allowed only if they are pure functions of their inputs (for example a pre-rendered paper texture keyed by size and seed).
4. **Canvas** width and height come from `FILM.TIMELINE.width` and `FILM.TIMELINE.height`, and default to 1080×1920 when they are absent. Output is 24 fps.
5. **Plain browser JavaScript**, no build framework, no npm packages in the shipped file. Node is used only for tools.
6. **File ownership.** A scene agent edits only its own `src/scenes/<file>.js`. Shared files (`src/core.js`, `src/lib.js`, `src/timeline.js`, `src/player.js`, `tools/*`) are edited only by the agent assigned to them. If a scene needs a helper that `lib` lacks, it defines the helper inside its own file.

## Files

| Path | Owner | Purpose |
|---|---|---|
| `src/core.js` | foundation | Defines `window.FILM`, the scene registry, `renderFrame`, global post-processing. |
| `src/lib.js` | foundation | `FILM.lib`: RNG, noise, easing, ink lines, hatching, stipple, paper grain, blueprint helpers, palette. |
| `src/timeline.js` | storyboard | `FILM.TIMELINE`: bpm, duration, shot list with ids, files, times, modes and briefs, and the audio cue list. |
| `src/geo.js` | storyboard | `FILM.GEO`: the storyboard's Shared geometry tables as data (optional until a storyboard has one). |
| `src/scenes/NN-<id>.js` | one scene agent each | Registers one shot with `FILM.scene({...})`. `NN` is the two-digit shot order. |
| `src/music.js` | music agent | `FILM.audio.render(ctx, opts)`: schedules the whole score and effects into any `BaseAudioContext`. |
| `src/player.js` | foundation | Interactive player page behaviour. |
| `tools/snap.cjs` | foundation | Renders PNG stills and contact sheets headlessly for review. |
| `tools/stubgen.cjs` | foundation | Generates one placeholder scene per timeline shot (the stub pass). |
| `tools/build.cjs` | foundation | Inlines everything into `dist/<slug>.html`. |
| `tools/render.cjs` | foundation | Renders the MP4 with audio into `exports/`. |
| `tools/check.cjs` | foundation | Automated checks: no media, determinism, full timeline coverage, every scene draws without throwing, frame cost, shared geometry measured on the match cuts, and (fixtures only) lib asserts. |
| `docs/storyboard.md`, `docs/art-bible.md`, `docs/theme.json` | storyboard | The human-readable plan, the visual rules for this film and the theme they came from. |

Load order everywhere: `core.js`, `lib.js`, `timeline.js`, `geo.js` (when present), scene files sorted by filename, `music.js`, `player.js`.

## API

### Scene registration

```js
FILM.scene({
  id: 'egg-blueprint',          // must match a shot id in FILM.TIMELINE.shots
  draw(ctx, t, info) {
    // t: seconds since this shot started (0 .. info.dur)
    // info: { dur, p /* t/dur, 0..1 */, T /* global seconds */, frame /* global frame index */, W, H, lib, shot /* the timeline entry */ }
  },
});
```

Start and end times come from `FILM.TIMELINE`, never from the scene file, so re-timing is a one-file change.
`core` wraps each `draw` in `ctx.save()` / `ctx.restore()` and resets the transform, alpha, composite mode and filters first.
A shot may declare `transitionIn: { dur, kind }` in the timeline; `core` handles supported kinds (`cut` default, `fade`, `flash`, `iris`, `wipe`, `whip`, `inkwash`, `morph`, `crtoff`, `shatter`) by drawing both shots into offscreen layers.
- `whip`: `{ kind: 'whip', dur, dir: 'left' | 'right' | 'up' | 'down' }` — the outgoing frame leaves and the incoming frame enters; a directional smear (`lib.smear` ghosts) and speed lines sit on the seam.
- `inkwash`: `{ kind: 'inkwash', dur, color, seed }` — a blot mask with a fixed noise edge grows monotonically from empty to full; the incoming frame shows inside it, with `color` on the wet rim. `color` is a `lib.pal` name or a hex. On the last frame inside `dur` the mask covers the frame (a thin rim may remain). The next frame is the incoming shot alone.
- `morph`: `{ kind: 'morph', dur, from, to }` — `from` and `to` are `FILM.GEO` ids. A `lib.morph` of those outlines holds the outgoing frame outside and the incoming frame inside. The mask ends on the `to` silhouette, so the frame after `dur` is a match cut onto the incoming plate, not a full-frame wipe.
- `crtoff`: `{ kind: 'crtoff', dur, color }` — the outgoing frame collapses to a hot horizontal line, the line shrinks to a dot and fades, then the incoming frame opens out of a line; `color` (a `lib.pal` name, default black) fills around it.
- `shatter`: `{ kind: 'shatter', dur, x, y, pieces, seed, color }` — the outgoing frame cracks from the impact point `(x, y)` (default the centre) into `pieces` Voronoi pieces (6–80, default 28) that fly out, turn, fall and fade over the incoming frame; nearer pieces leave first. `color` is the crack colour, a `lib.pal` name (default white). Needs `lib.voronoi`.
- On the first frame of `whip`, `inkwash`, `morph`, `crtoff` and `shatter` the picture is the outgoing shot alone; once `dur` has elapsed it is the incoming shot alone. `fade`, `iris` and `wipe` are already partway across on their first frame.

### Core

- `FILM.W`, `FILM.H`, `FILM.FPS`, `FILM.DURATION`. `W` and `H` follow `FILM.TIMELINE.width` and `height` once that object exists, and default to 1080×1920. `core.js` loads before `timeline.js`, and `loadTimeline` evaluates the file against those defaults, so a timeline that reads `FILM.W` or `FILM.H` while it is being defined still sees 1080×1920. The same is true in the browser. Read the size after `FILM.TIMELINE` is assigned, or from `width` and `height` on that object.
- `FILM.renderFrame(T)` draws global time `T` to `FILM.canvas`.
- `FILM.mount(canvas)` sets the target canvas.
- `FILM.activeShot(T)` returns the timeline entry.
- Global post: paper grain over illustrated shots, fine noise over schematic shots, both re-seeded on a 12 fps "boil" clock so the texture shimmers like drawn animation.
- Optional `carrier: { kind: 'crt', scanlines, period, mask, radius, edge, hum, humPeriod, flicker }` on the timeline (the whole film) or on a shot (replacing it; `false` for none): the medium the film plays on, drawn once per frame over the finished picture, after transitions and flashes, as a function of T. `crt` draws sinusoidal scanlines (depth ≤ 0.1, period ≥ 6 px, dropped where a scaled preview would moire), a rounded screen with darkened edges, a slow hum bar and a faint flicker. The grain switch `FILM.post = false` leaves it on, so checks 9 and 11 see it; only the geometry measure turns it off (`FILM.carrier = false`). `FILM.defineCarrier(kind, fn)` registers a kind.
- Optional per-shot `grade: { invert, warmth, fade, vignette, paperAge, tint, tintAmount }`. `warmth` is −1..1; `invert`, `fade`, `vignette`, `paperAge` and `tintAmount` are 0..1; `tint` is a `lib.pal` name. `core` applies it after the shot draws and before the grain (`difference` / `multiply` / `screen` / `overlay`, one vignette gradient). `invert` goes first, so the rest grades the negative; 1 is the exact negative, and a cut into or out of it is one full-frame flash for check 9. Across `transitionIn` it interpolates from the outgoing grade to the incoming one. Omit `grade` and the frame is unchanged.

### Lib (minimum surface)

- `rng(seed)` returns a function producing [0,1). `hash(...values)` returns a stable 32-bit int.
- `noise1(x, seed)`, `noise2(x, y, seed)` smooth value noise in [-1,1].
- `clamp`, `lerp`, `invLerp`, `smoothstep`, `ease` (`inOutCubic`, `outBack`, `outExpo`, `inOutSine`, and so on), `mapRange`.
- `boil(T, fps = 12)` returns the held drawing-frame index for line wobble.
- `onTwos(t)` quantises time to 1/12 s for character motion.
- `beat(T)` → `{ n, frac, bar, beatInBar }` from `FILM.TIMELINE.bpm` (4/4). `onBeat(T, div = 1)` is seconds since the last division (`1` a quarter, `4` a sixteenth). `drawing(t, a)`, `hit(t, a, frames, ease?, lead = 1)` and `popTwos(t, a)` are the shared scene clocks: `hit` is already above 0 at `t = a` when `lead` is 1, and `popTwos` steps through `[0.72, 1.08, 1]`. `cue(T, kind?)` → `{ since, cue }` (`since` is `Infinity` before the first); `nextCue(T, kind?)` → `{ until, cue }`; `pulse(T, kind, { decay, shape })` falls from 1 on that cue.
- `inkPath(ctx, points, opts)`: a hand-drawn polyline or closed shape with seeded wobble, pressure-varying width, optional double stroke. `reveal` (0..1, or `[from, to]`) draws that fraction of the arc length, double included; omit it for the whole line, the same pixels as before. `nib: { r, color, blot }` is the pen drop on the tip while that span is unfinished.
- `branch({ seed, root, clip, attractors, step, killDist, influence, maxNodes })`: a space-colonization tree (Runions 2007) inside `clip`, cached by its parameters. `root` is `[x, y]` or a trunk polyline; `attractors` is a count or a point list. Result `{ nodes, paths(minLen) }`: nodes are `{x, y, parent, depth, thickness}` (`parent` is `null` at the root; `thickness^2.5` sums toward the root) and `paths(minLen)` returns polylines longer than `minLen` pixels. `drawBranch(ctx, tree, { width, taper, reveal, color })` inks them through `inkPath` in growth order (`reveal` 0 draws nothing, 1 draws every path).
- `smear(ctx, draw, { from, to, n = 5, mode, alpha, falloff, seed })` paints `draw(ctx, u)` at `n` phases from `from` to `to`. `mode` is `'ghosts'` (fading copies), `'stretch'` (the leading pose elongated along the centroid shift) or `'lines'` (speed lines off the trailing edge). `n === 1` or `from === to` matches one `draw(ctx, to)`.
- `hatch(ctx, clipFn, opts)`: parallel strokes at an angle and spacing, clipped by a path function, each stroke slightly jittered. `crossHatch` layers two.
- `stipple(ctx, clipFn, opts)`: seeded dot fill with density control.
- `wash(ctx, clip, opts)`: translucent watercolour inside a clip — noise-deformed layers, a darker rim, granulation modulated by paper grain, optional blooms. Cached by the clip, the options and the render scale; a frame only blits it. `boil: true` reuses three variants on the 12 fps clock and is never keyed by raw time. A function clip is keyed by its source text plus bounds, and a Path2D by bounds alone; pass `key` when two of those clips share that text but not the shape.
- `castShadow(ctx, outline, opts)`, `rimLight(ctx, outline, opts)`, `shadeSide(ctx, outline, opts)`: volume from one closed outline (points, or a geo entry). `dir` is where the shadow falls and the light is `-dir`. `castShadow` shifts the silhouette by `len·dir` — and, given a `ground` y, compresses it in y onto that line — then fills with `hatch`, `stipple` or a flat tone (`style`, `soft`, `clipOutside`). `rimLight` strokes the contour where the outward normal faces the light, fading off. `shadeSide` hatches the opposite side inside the form.
- `paper(ctx, opts)`: cream paper base with grain and fibres, cached.
- `blueprint(ctx, opts)`: navy base, faint grid, guide circles and diagonals.
- `mesh3d.box(w, h, d)`, `sphere(lat, lon, r)`, `cylinder(seg, r, h)`, `torus(major, minor, R, r)`, `helix(turns, steps, r, h, { strands, rungs })` and `fromPoints(pts, edges | { closed })` return `{ verts: [[x, y, z]], edges: [[i, j]] }`. Mesh space is right-handed, X right, Y up, Z toward the viewer; `box()` is the cube (±1)³. `wire3d(ctx, mesh, { at, scale, rot: [rx, ry, rz], persp, depthFade, hidden, color, width, nodes })` projects it and returns how many edges it stroked. Canvas Y grows downward, so with `persp: 0` a point lands at `(at[0] + scale·x, at[1] − scale·y)`. `rot` is radians, applied yaw Y, then pitch X, then roll Z, so a fixed pitch looks down on a spinning yaw; a turn of 2π matches rotation 0. `persp` is 0 (orthographic) or a focal length in mesh units — the camera sits at z = persp looking toward −Z, and a nearer point (larger z) draws larger. `depth` from `project3d(p, opts)`, which returns `[x, y, depth]`, is that z. `depthFade` (0..1) thins and fades far edges. `hidden: 'dash'` dashes every edge whose midpoint is farther than the mean vertex. `nodes` is a circle radius, in px, at each vertex. `shift: [x, y, z]` moves the mesh before it turns (in `wire3d`, `faces3d` and `project3d`). `box`, `cylinder` and `tunnel(seg, rings, radius, length)` also return `faces`; `tunnel` runs from z = 0 to −length and carries `ringStep`, so shifting by `travel % ringStep` loops a flight. `faces3d(ctx, mesh, opts)` fills faces far to near, each one flat tone from `color` (or `color(i)`), `dark`, a two-sided `light` with `ambient`, and `fog` toward `fogColor`; `stroke`, `width`, `strokeAlpha` outline them; with `persp`, faces nearer than `near` are dropped. Returns how many it drew.
- `hexLattice(ctx, clipFn, opts)`, `glowDot(ctx, x, y, r, opts)`, `ticks(ctx, ...)`, `bracket(ctx, ...)`, `guideCircle(ctx, ...)`, `arcAnnotation(ctx, ...)`.
- `glow(ctx, pts, opts)`: a lit path, widening halo strokes then the core in `lighter` blend (`color`, `halo`, `width`, `radius`, `layers`, `strength`, `closed`). `glowFigure(ctx, parts, opts)`: each part a glowing contour that boils, a closed part first knocking out the plate (`bg`, `knock`, `wobble`).
- `lineIcon(ctx, parts, x, y, size, opts)`: a flat line-icon creature from parts in a unit box (`circle`, `arc`, `eye` with a `lens` or `dot` pupil, `line`, `teeth`, `path`), constant-width round-cap lines, `fill` knocking out with `bg`; `shut` draws the eyes closed. `blinkAt(frame, seed, opts)` is true on the 2 frames of each blink, on an uneven schedule that repeats every `loop` frames.
- `voronoi(sites, clip, opts)` returns clipped cells `{ i, site, poly }` (Lloyd `relax` 0..3, cached by sites, clip and relax). A later site that repeats an earlier position gets an empty `poly`; the earlier site keeps the cell. `clip` is one convex ring (a rect or one polygon). A list of polygons uses only the largest ring, so a concave clip is not treated as a union. `cells(ctx, cells, opts)` draws them with `inset`, `round`, `fill(i, cell)` and `stroke`.
- `stripes(ctx, opts)`: the wide diagonal stripe background.
- `camera(ctx, { x, y, zoom, rot }, fn)`: draws `fn` under a camera transform centred on the frame.
- `layers(ctx, { x, y, zoom, rot }, planes)`: the same camera across planes `{ z, draw, blur?, key?, fog?: { color, amount }, static? }`, painted far to near. `z = 1` is the focus plane and matches `camera`. `z > 1` is farther, `z < 1` is nearer. Effective zoom is `1 + (zoom - 1) / z`, and the pan `(x - W/2, y - H/2)` is divided by `z`. `blur` is a depth-of-field radius, applied only when `static` is true (the plane is drawn once into a cached canvas with `ctx.filter`); otherwise the blur is skipped. The plate is keyed by `draw`'s identity, so that function has to be a stable reference — an inline closure allocates a new plate every frame. Pass `key` to keep one plate across those calls. `fog` is a translucent fill over that plane.
- `pal`: named colours from the art bible.
- `text(ctx, str, x, y, opts)`: a thin single-line wordmark drawn with system sans-serif (no font files).
- `pixelText(ctx, str, x, y, cell, opts)`: text in the built-in 5×7 pixel font (`pixelFont5x7`), identical on every machine; 6-cell advance, 9-cell lines, `\n` breaks, `align`, `chars` (typing), `cursor`; returns `{ width, height }`. `sprite(ctx, rows, x, y, cell, opts)`: pixel art from strings (`.` or space empty, `colors[char]` or `color` lit), snapped to whole pixels.
- `particles(ctx, T, opts)`, `particleAt(i, T, opts)`: sparks, dust, pollen and smoke as a closed function of time (no stored particle state). Birth is `i / rate` plus a seeded jitter; motion is analytic — gravity toward canvas +y (down), exponential drag, and `noise1` wind. `loop` repeats the field; `onTwos` quantises drawing to the 12 fps grid.
- `scatter(clip, { r, seed, max, density, bounds })` places Poisson-disk points inside any hatch clip, cached by the clip, `r`, `seed`, `max` and an 8×8 sample of `density` (not by the function's identity; the local radius is `r / sqrt(density)`). `flow(x, y, T, { seed, scale, speed, curl })` is a divergence-free curl of `noise2`; `advect(p0, T, opts, steps)` integrates that field from 0 to T with a fixed step of 1/24 s (`steps` overrides the count); `instances(ctx, pts, fn)` draws each point with an rng seeded by its index.
- `projection({ kind, lon0, lat0, scale, at, rot })` returns `{ project(lon, lat), invert(x, y) }` for `equirect`, `mercator` and `ortho` (a globe; `project` is null on the far side). `scale` is px per degree, or `[sx, sy]`; for `ortho` it is the radius. `graticule(ctx, proj, opts)` draws meridians and parallels through `inkPath`. `drawGeoLine(ctx, proj, [[lon, lat], ...], opts)` strokes a polyline and breaks it where the projection is invisible. `plot(ctx, opts)` draws axes, ticks on a 1-2-5 grid (a count, `{ x, y }`, or a value array), and series curves with `inkPath`'s `reveal`.
- `geo(id)`: an entry of `FILM.GEO`, read-only. `profile` is symmetric about a vertical axis `x = cx` (`hw(y)`, `x(y, side)`, `side(sign)`, `outline()`, `widest`) or, with `axis: 'x'`, about `y = cy` using `xs` and half-heights (`hw(x)`, `y(x, side)`). `interp: 'linear'` joins the stations with straight segments; the default is a monotone cubic. `outline` is one closed loop in `pts`, or several loops in `parts` whose `outline()` is the outer contour of the union. `at(zoom, about)` returns the shape with every point moved to `about + zoom * (p - about)`. `points` (`pt(name)`), `polyline` (`pts`).
- `resample(pts, n, closed)`: arc-length resample to `n` points. `morph(a, b, p, { n = 256, align = 'auto' | 'top' | 'index', ease })`: resample two closed contours, align the start (`auto` minimises the sum of distances over cyclic shifts and both traversal directions; `top` pairs the uppermost points; `index` keeps resample order), then interpolate. `ease` is an `lib.ease` name or a function. Works on `lib.geo(id).outline()` of any kind.

### Shared geometry

```js
FILM.GEO = {
  G1: { kind: 'profile', cx: 540, ys: [520, 620, 790, 1080, 1280], hs: [180, 262, 285, 208, 0],
        shots: ['egg-blueprint', 'egg-hatch'], cuts: ['egg-blueprint>egg-hatch'] },
  G2: { kind: 'outline', pts: [[x, y], ...], shots: [...] },   // sampled every few px, not control points
  G5: { kind: 'points', pts: { thorax: [540, 900] }, shots: [...] },
};
```

`src/geo.js` mirrors every table in the storyboard's Shared geometry section, in frame pixels at the frames either side of the cut (a scene under `lib.camera` lands its shape there).
It is pure data with no `lib` calls: tools evaluate it on its own.
Scenes read shapes with `lib.geo(id)` instead of copying numbers, so a table fix reaches every shot at once.
`cuts` lists the match cuts to hold (default: every pair of consecutive listed shots); `at: [{ shot, t }]` adds a single frame to measure.
A `profile` is symmetric about `x = cx` (stations `ys`, half-widths `hs`). `axis: 'x'` lies on its side: stations `xs`, half-heights `hs`, axis `y = cy`. A figure of several parts is an `outline` with `parts: [loop, loop, ...]`; check 7 measures the outer contour of the union. A cut in the middle of a camera move is `{ cut: 'a>b', zoom, about: [x, y] }` on that same entry. `lib.geo(id).at(zoom, about)` is the transform a scene draws. The zoomed side does not need a second copy of the points.
Check 7 measures every `profile` and `outline` on the rendered frames either side of each cut and fails a cut whose drawn edge strays from the table.

### Audio

```js
FILM.audio = {
  render(ctx, { start = 0, dest = ctx.destination } = {}) { /* schedule every note and effect from global time `start` */ }
};
```

Everything is synthesised from oscillators, filtered seeded noise buffers, envelopes, delays and a convolver built from generated impulse responses.
The score is written against `FILM.TIMELINE.bpm` and `FILM.TIMELINE.cues` so hits land on the cuts.
The same function feeds the live player (`AudioContext`) and the MP4 render (`OfflineAudioContext`, 48 kHz stereo).

### Tools

```bash
node tools/snap.cjs --times 1.0,2.5 --out .frames/check            # stills at global times (with --shot, times count from the shot's start)
node tools/snap.cjs --shot <id> --samples 6 --sheet                # frames spread over one shot plus a contact sheet
node tools/snap.cjs --samples 24 --sheet --scale 0.25              # the whole film on one labelled sheet
node tools/snap.cjs --shot <id> --only                             # load only core, lib, timeline, geo and this shot's file
node tools/snap.cjs --times 11.458,11.5 --geo G3 --crop 380,300,320,640  # both sides of a match cut, table overlaid, native crops
node tools/stubgen.cjs                                             # placeholder scene per shot (run before scene work starts)
node tools/build.cjs                                               # writes dist/<slug>.html
node tools/check.cjs                                               # all automated checks, exits non-zero on failure (the director's gate)
node tools/check.cjs --shot <id>                                   # one shot loaded alone: a scene agent's gate while siblings are half-written
node tools/render.cjs [--from 0 --to 30] [--scale 0.5] [--out exports/name.mp4]
```

Check 8 «lib» loads `tools/fixtures/asserts/*.js` only when the gate runs with `--fixtures`, after the engine. Each file calls `FILM.assert(name, fn)`. The check page (not the shipped film) provides `FILM.expect.eq`, `FILM.expect.near(a, b, eps = 1e-6)`, `FILM.expect.true`, `FILM.expect.throws(fn, re?)` and `FILM.pixels(canvas)` with `count(pred)` and `hash()`. `pred` receives `(r, g, b, a, x, y)`. A run with no asserts directory passes as "no asserts". Assert files are scanned like sources and are not inlined by `build.cjs` or `render.cjs`.

The gate is eleven checks. Check 9 «flash» is photosensitivity (WCAG 2.3.1) and fails when more than three general or saturated-red flashes fall in any one-second window. Check 10 «density» warns (it does not fail the gate) when the first, middle or last bare frame of a shot is an empty plate or the subject is only a spark: too little luminance-edge detail in the safe area, or a large empty block of a 3×5 grid there. Check 11 «canvas» runs two full passes at scale 0.25 with the grain post off. A canvas allocated on the second pass fails, and the report names the shot, the count, the total area and the first T. Peak live canvas area above about 16× the frame warns and does not fail the gate. `--canvas-skip` skips it.

`snap.cjs` writes a unique temporary HTML page per run under `.tmp/`, so several agents can render at the same time without clashing.
`--only` (snap) and `--shot` (check) exist so a shot can be rendered and gated while a sibling shot file is half-written; every check run also loads a snapshot of the sources taken at its start.
Images go under `.frames/` (git-ignored). Look at them — reading the pixels is the review.

## Shell note for agents

Prefer absolute paths in shell commands; some agent harnesses block `cd <folder> && ...` chains.
Playwright installs into `tools/node_modules` (`npm install` there right after copying the foundation).
