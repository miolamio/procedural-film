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
4. **Canvas** is 1080 wide by 1920 tall. Output is 24 fps.
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
| `docs/storyboard.md`, `docs/art-bible.md` | storyboard | The human-readable plan and the visual rules for this film. |

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
A shot may declare `transitionIn: { dur, kind }` in the timeline; `core` handles supported kinds (`cut` default, `fade`, `flash`, `iris`, `wipe`) by drawing both shots into offscreen layers.

### Core

- `FILM.W`, `FILM.H`, `FILM.FPS`, `FILM.DURATION` (from the timeline).
- `FILM.renderFrame(T)` draws global time `T` to `FILM.canvas`.
- `FILM.mount(canvas)` sets the target canvas.
- `FILM.activeShot(T)` returns the timeline entry.
- Global post: paper grain over illustrated shots, fine noise over schematic shots, both re-seeded on a 12 fps "boil" clock so the texture shimmers like drawn animation.

### Lib (minimum surface)

- `rng(seed)` returns a function producing [0,1). `hash(...values)` returns a stable 32-bit int.
- `noise1(x, seed)`, `noise2(x, y, seed)` smooth value noise in [-1,1].
- `clamp`, `lerp`, `invLerp`, `smoothstep`, `ease` (`inOutCubic`, `outBack`, `outExpo`, `inOutSine`, and so on), `mapRange`.
- `boil(T, fps = 12)` returns the held drawing-frame index for line wobble.
- `onTwos(t)` quantises time to 1/12 s for character motion.
- `inkPath(ctx, points, opts)`: a hand-drawn polyline or closed shape with seeded wobble, pressure-varying width, optional double stroke.
- `hatch(ctx, clipFn, opts)`: parallel strokes at an angle and spacing, clipped by a path function, each stroke slightly jittered. `crossHatch` layers two.
- `stipple(ctx, clipFn, opts)`: seeded dot fill with density control.
- `paper(ctx, opts)`: cream paper base with grain and fibres, cached.
- `blueprint(ctx, opts)`: navy base, faint grid, guide circles and diagonals.
- `hexLattice(ctx, clipFn, opts)`, `glowDot(ctx, x, y, r, opts)`, `ticks(ctx, ...)`, `bracket(ctx, ...)`, `guideCircle(ctx, ...)`, `arcAnnotation(ctx, ...)`.
- `stripes(ctx, opts)`: the wide diagonal stripe background.
- `camera(ctx, { x, y, zoom, rot }, fn)`: draws `fn` under a camera transform centred on the frame.
- `pal`: named colours from the art bible.
- `text(ctx, str, x, y, opts)`: a thin single-line wordmark drawn with system sans-serif (no font files).
- `geo(id)`: an entry of `FILM.GEO`, read-only. `profile` (symmetric about `cx`: `hw(y)`, `x(y, side)`, `side(sign)`, `outline()`, `widest`), `outline` (a closed silhouette sampled densely, drawn as it stands: `outline()`), `points` (`pt(name)`), `polyline` (`pts`).

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
A `profile` is symmetric about a vertical axis only: a shape lying on its side, or a figure of several parts, is an `outline` of its outer silhouette, one closed loop. A cut in the middle of a camera move needs the silhouette as it lands on that frame, as its own entry.
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

`snap.cjs` writes a unique temporary HTML page per run under `.tmp/`, so several agents can render at the same time without clashing.
`--only` (snap) and `--shot` (check) exist so a shot can be rendered and gated while a sibling shot file is half-written; every check run also loads a snapshot of the sources taken at its start.
Images go under `.frames/` (git-ignored). Look at them — reading the pixels is the review.

## Shell note for agents

Prefer absolute paths in shell commands; some agent harnesses block `cd <folder> && ...` chains.
Playwright installs into `tools/node_modules` (`npm install` there right after copying the foundation).
