# Scene anatomy

How a well-formed scene file is built.
Expect 1000+ lines for a dense shot — density is part of the look (hundreds of hatch strokes, lattice cells, grain per frame).

## Skeleton

1. **Header comment**: shot number, title, global T range, the layer list numbered back to front.
2. **IIFE + `'use strict'`**; `const ID = '<shot-id>'`; aliases (`const L = info.lib` / `LIB = FILM.lib`, `P = pal`, `E = ease`, `TAU`, `DEG`, `FR = 1/24`); local `clamp/lerp/sstep`.
3. **The seed factory** — every seed in the file derives from the shot id:

   ```js
   const sd = (...k) => LIB.hash(ID, ...k) & 0x7fffffff;
   ```

4. **Geometry data tables** — hand-authored point arrays. Shapes that survive a match cut come from `src/geo.js` through `L.geo('G1')` (`hw(y)`, `outline()`, `pt(name)`), never from copied numbers, and seed from the earlier shot's id (`const REF = 'egg-blueprint'; L.hash(REF, …)`) so the boil matches across the cut. Draw an `outline` as it stands (`smooth: false`). When a shared shape needs detail the table lacks (an inner edge, a pose), copy the constructor verbatim from the scene your brief names as its owner, and ask the director before drafting if the table looks wrong. Do not draw first and ask later.
5. **Memoized geometry**: `function geo(L) { if (GEO) return GEO; … }` — module-level, built once, seeded, and strictly t-independent. Sprite canvases go through `L.cached(key, …)`.
6. **Local draw helpers**: `stroke(ctx, path, color, alpha, width, dash?)`, `wob(L, path, pts, seed, amp, bi, closed)` (per-boil polyline wobble via `h3(i, bi, seed)`), stroke bucketing by alpha to batch fills.
7. **Timing helpers** — call `FILM.lib`, do not paste another copy (copies drift on `lead` and the frame grid):

   - `lib.drawing(t, a)` = `floor((t - a) * 12 + 1e-6)`, drawings since beat `a` (12 per second). Negative before `a`.
   - `lib.hit(t, a, frames, ease?, lead = 1)` is `0` when `t < a`, otherwise `ease(clamp((t - a) / (frames / 24) + lead / frames))`. With `lead` 1 the value is already **> 0 at `t = a`**, so the hit is visible on the beat frame and not one frame late.
   - `lib.popTwos(t, a)` is `0` before `a`, otherwise the three drawings `[0.72, 1.08, 1]` (overshoot, then settle).

   `lib.beat`, `lib.onBeat`, `lib.cue`, `lib.nextCue` and `lib.pulse` read `FILM.TIMELINE` (bpm and cues). Plus named beat constants with global-T comments: `const B_DIV2 = 1.5; // T 3.0`.
8. **`FILM.scene({ id: ID, draw(ctx, tIn, info) {…} })` at the very end.**

## Draw body discipline

- Clamp first: `t = clamp(tIn, 0, info.dur)` — a transition asks the outgoing shot for `t` slightly beyond its duration; hold the final pose.
- Frame 0 is a fully drawn pose and the last frame holds — the gate draws first/middle/last of every shot.
- `tw = L.onTwos(t)` for anything drawn as a character or object; `bi = L.boil(info.T)` drives line wobble.
- Form volume on a paper plate comes from `lib.castShadow`, `lib.shadeSide` and `lib.rimLight` on one outline and one `dir` (shadow direction; the light is `-dir`) so the cast shadow, the shaded side and the rim agree.
- `lib.smear(ctx, draw, { from, to, mode })` smears a pose that jumps between drawings (`ghosts`, `stretch` or `lines`); pass `from === to` on a hold so the drawing stays one crisp pose.
- Draw layers back to front under numbered comments; annotation overlays last, screen-fixed (no camera transform).
- Beat events use `lead` so the event is visible on its beat frame, not one frame late.
- `info.p` for whole-shot ramps; `info.T` (or `info.shot.start + t`) for cross-shot continuity like stripe drift and boil.
- A line that draws on uses `inkPath` `reveal` (0..1 by arc length, or `[from, to]` for a running dash) and `nib` on the tip; do not slice the point list.
- Caches only for t-independent data. Anything time-varying derives from `t` alone.
- Particle fields are `lib.particles` (sparks, dust, pollen, smoke): position is a closed function of time, never stored between frames. `loop` repeats background dust; `onTwos` holds the drawing on the 12 fps grid.
- The medium is the timeline's `carrier`, not the scene: `crt` scanlines and screen, `vhs` chroma lag, tracking tears, head noise and the tape counter, `film` perforations, scratches, dust and weave are drawn once per frame over the finished picture, transitions included. A scene never draws its own.
- Watercolour tone is `lib.wash(ctx, clip, opts)`, cached like paper and blitted each frame; hatch sits on top of it.
- A colour scale (false-colour heat, a terrain relief, a glow cooling) is `lib.ramp(name, v)` over `pal` names, never a hand-mixed hex or a `rgb()` string built in the scene; `lib.rampStops(name)` feeds a `CanvasGradient`.
- A relief, a heat map or a terrain (plate A a perspective contour mesh, plate B the same surface as a map from above) is `lib.heightfield(ctx, field, { mode: 'mesh' | 'fill' | 'contour', box, range, ramp })` with one field, box, range and ramp in every shot so the surface holds across the cut; pin labels with `lib.heightPoint`, never by hand-projecting.
- A thresholded noise texture over the picture (snow overexposure, stipple, toner dropouts, drum streaks) is `lib.noisePlate(ctx, opts)`: `threshold` is the fraction left empty, `scale: [sx, sy]` stretches it, `boil` picks one of three cached variants, and `globalCompositeOperation = 'destination-out'` turns it into holes. Never draw one per frame with a new seed.
- Dry-brush silhouettes are `lib.dryBrushFill(ctx, outlines, opts)` and loose strokes (branches, ground) `lib.dryBrush`; pass a whole plane of trunks as one outline list so it is one cached plate, and hold far planes with `boil: false`.

## Text

Almost none — `lib.text` appears once per film (the closing wordmark). Labels ride on `bracket({ label })`, `arcAnnotation({ label })` and `ticks`. Schematic shots carry no text at all (art bible §5).
A hand-scratched or stencilled wordmark (crater, scallop, xerox) is `lib.strokeText` (`style: 'hand'` with `reveal` to write it on, or `style: 'stencil'`), never a system font.

## What the gate catches — the expensive mistakes

- `Math.random`, `Date`, `performance.now`, `crypto` in any drawing or audio source (static scan).
- Draw-order dependence or unseeded randomness: the determinism pass renders every checked frame five ways — warm forward, warm reversed, fresh page shuffled with decoy frames, cold first-draw after reload, and sequential (f−1 then f) — and compares full pixel hashes.
- Any throw on a checked frame, including errors thrown by the *outgoing* shot inside a transition.
- Timeline ids a scene file fails to register, duplicate registrations, a `transitionIn.dur` longer than its shot.
- Frames over 150 ms (warning; `--budget ms` makes it a failure). Read per-shot timings from the gate's cost lines. A `performance.now()` left in a scene fails the source scan for everyone.
- A cache that rebuilds canvases on a warm repeat of the sweep (warning): key caches by shape, size and seed, never by `t`.
- Any URL the page requests while drawing (media check, at run time as well as in the built file).
- A shared silhouette off its `src/geo.js` table on either side of a listed match cut (check 7).

Two more traps the gate does not need to catch because core handles them, and you should still avoid: writing to `FILM.lib`, `pal` or `ease` (they are frozen — the write throws), and leaving `ctx.save()` unbalanced (core unwinds it, at a cost).

## Canvas and continuity traps

The gate does not catch these; critics do, one wave late. Avoid them instead:

- `ctx.clip()` applies at stroke/fill time, never while recording a `Path2D`. When batching geometry into a path, clip where you stroke, not where you build: `ctx.save(); ctx.clip(shapePath); ctx.stroke(lines); ctx.restore()`.
- Match-cut shapes and cross-shot handoffs (the storyboard's G-tables, stream positions a sibling shot continues) are drawn **screen-fixed**: they never ride `lib.camera`. Exempt them from the transform or compensate it so the outgoing frame lands exactly on the contract pixels — then snap both sides of the cut and compare.
- Elements that attach or detach around a match cut (a prop, a saucer) fade in/out over 5–6 frames, symmetric on both sides. A one-frame vanish reads as a bug.
- Recurring cross-shot elements (the progress glyph) drift when re-derived per scene. Copy the canonical helper verbatim from the owning scene named in your brief; never re-implement it.

## Workflow

Read the storyboard entry, the art bible and the shared geometry → write the file →
`node tools/snap.cjs --shot <id> --only --samples 6 --sheet` → open the contact sheet and look at every frame → fix → re-snap. For a match cut, snap both sides with the table overlaid (`--geo G1`). When the sheet is on-brief, gate your shot alone: `node tools/check.cjs --shot <id>`. The whole-film gate belongs to the director. Run while siblings are half-written, it fails on their files, not yours.

That snap writes each sample at native size next to the sheet. Open those frames, and a native crop of the subject (`--crop x,y,w,h`). The art checklist, beside the sheet:

- Compare with a reference at native size (the example frames beside this file, `example-paper-frame.jpg` and `example-blueprint-frame.jpg`, or the agreed reference for this film). The contact sheet hides stroke texture and line weight.
- On the thumbnail, check hierarchy and quiet: what reads first, and whether there is empty space around the subject.
- A green gate is not an art verdict. Write a separate art verdict.
- Every note names one element and the scale it was seen at (thumbnail, native frame, or native crop). No "looks better" with no subject.
