---
name: procedural-film
description: Procedural film — turn a subject into a short vertical animated film drawn and scored entirely in JavaScript. Use when the user asks for a procedural film, or a short hand-drawn animated film about a subject.
---

# Procedural film

Turn a topic into a **film**: roughly 30 seconds at 24 fps, 1080×1920 vertical unless the timeline sets `width` and `height` (also 1920×1080 and 1080×1080), drawn in one of the skill's **themes** (by default the house style: hand-inked **paper plate** shots cut against navy **blueprint plate** shots), every event on a **beat grid** (bpm → beats → frames), every pixel and every audio sample computed in plain browser JavaScript. The deliverable is `dist/<slug>.html` (a self-contained player) plus `exports/<slug>.mp4` and its phone and preview transcodes.

This skill packages a proven pipeline. It ships four things:

- `foundation/` — the engine and tools, copied into the new project: `src/core.js`, `src/lib.js`, `src/player.js`, `src/music.js` (engine plus a demo score), and `tools/` (build, check, snap, render, stubgen, audio analysis, fixtures). Everything is driven by `src/timeline.js`, so no tool code changes per film.
- `templates/` — the four planning documents every film starts from.
- `themes/` — finished looks (art bible sections 1–9, a palette, a `theme.json`), indexed in `themes/INDEX.md`; step 3 picks one.
- `reference/` — read when a step below points at one; the three example images first.

Look first: `reference/example-contact-sheet.jpg` (the whole example film, 24 labelled frames), `reference/example-paper-frame.jpg` and `reference/example-blueprint-frame.jpg` (one full frame of each plate). That density and that finish are the bar.

## The gate

`node tools/check.cjs` is the gate: eleven checks (media scan, determinism, source scan, timeline, draw, frame cost, shared geometry, lib asserts, photosensitivity, empty frames, canvas allocation), and exit 0 means green. From the stub pass onward, no step is done while the gate is red. On real scenes let it finish. Check 8 runs `tools/fixtures/asserts/*.js` only under `--fixtures` (each file calls `FILM.assert`); a film with no asserts passes as "no asserts". Check 9 fails more than three flashes in any one-second window. Check 10 warns on an empty frame or a tiny subject and does not fail the gate by itself. Check 11 fails when a canvas is allocated on the second of two full passes at scale 0.25 with the grain post off, and names the shot, the count, the total area and the first T. Peak live canvas area above about 16× the frame warns and does not fail. `--canvas-skip` skips it.

A scene agent gates its own shot with `node tools/check.cjs --shot <id>`. That run loads only that shot, so siblings caught half-written cannot fail it, and it finishes in seconds. The director runs the whole gate. Every run loads a snapshot of the sources taken at its start.

## Worked example

`butterfly-life` is a finished film from this pipeline, at `../../examples/butterfly-life/` from this skill folder, or online at https://github.com/kuhnhomeuk-cell/procedural-film/tree/main/examples/butterfly-life when that folder is absent. When a template leaves the shape of a filled document unclear, read its counterpart there: `docs/art-bible.md`, `docs/storyboard.md`, `src/timeline.js`, `src/scenes/`, `src/music.js`. Take its structure; the subject comes from step 2's research.

## Pipeline

### 0. Brief

Ask one round of questions: the subject, what the film must include about it, and the length if it differs from 30 seconds. Invent the rest and say what you invented.

Done when: the subject is one written sentence the user has seen.

### 1. Setup

Create the project folder named for the film's slug and copy `foundation/` into it. Run `npm install` in `tools/` (Playwright; add `npx playwright install chromium` there if the browser is missing) and confirm ffmpeg is on the PATH, or set `FFMPEG` to its binary. Copy the templates into `docs/` and set the subject in `docs/CONTRACT.md`'s Goal.

Done when: `node tools/smoke.cjs` passes, `node tools/check.cjs --fixtures` is green and `node tools/render.cjs --fixtures --scale 0.5` yields `exports/fixtures.mp4` with sound. The **fixtures** mini-film proves the toolchain before the film invests in planning.

### 2. Research

List the phases of the subject's story, then run one web search per open question and capture two to four authoritative full-text sources into `.tmp/research/`, with `.tmp/research/SUMMARY.md` indexing them: one section per phase, its facts and the source each came from. Research lands in exactly two places downstream: the art bible's subject reference and each shot's Subject section.

Done when: every phase of the story traces to a captured source listed in `SUMMARY.md`.

### 3. Art bible

Pick a theme from `themes/INDEX.md`: `house` (paper and blueprint) unless the user names another look or the subject calls for one. Say which and why in one line; a `draft` theme only within what its `needs` allow. Then:

- paste `themes/<id>/art-bible-1-9.md` into `docs/art-bible.md` as sections 1–9, verbatim — they are already decided;
- copy `themes/<id>/theme.json` to `docs/theme.json` (the stub pass colours its stubs from it);
- paste `themes/<id>/palette.js` between `// BEGIN 2.2` and `// END 2.2` in `src/lib.js`; the subject rows follow it inside the same markers;
- take the theme's `frame` as the timeline's `width` and `height` in step 5 unless the brief says otherwise.

Only the marked subject sections change: 2.2 (the subject palette, every colour a named hex, mirrored between the 2.2 markers in `src/lib.js`) and 10 (the subject reference built from the captured sources — one subsection per drawable element with sizes, ratios, counts, poses, sequences and the few ratios a critic measures — ending in Mistakes to avoid, each mistake paired with the correct drawing).

If no theme fits the look the user wants, run a reference analysis first — `templates/reference-analysis.md` shows the method (step through one reference video, written notes only, end with numbered style rules) — then write art-bible sections 1–9 to match before continuing.

Done when: every element the storyboard will draw has a drawing rule and a palette name, `src/lib.js` holds the same values as section 2.2, the mistakes list exists, and `node tools/snap.cjs --fixtures --shot palette --samples 5 --sheet` has been looked at: every swatch named, each colour judged against its neighbours on every plate the theme uses. Every scene agent copies this palette, so a wrong hue costs every scene file.

### 4. Storyboard

Read `reference/shot-types.md` for the original sixteen shot types the example film proves and for every recipe after them, then fill `docs/storyboard.md` from the template: logline; numbers (pick a bpm, then beat = 60/bpm seconds and the duration lands in whole bars); summary table; acts mapped to bars; a shared-geometry table for every shape that survives a **match cut**, in frame pixels, naming the cuts it holds (a `profile` for a shape symmetric about a vertical axis, or `axis: 'x'` when that profile lies on its side; an `outline` as one densely sampled loop, or `parts` when the figure is several loops; `points` for anchors; a cut in the middle of a camera move is `{ cut, zoom, about }` on that entry — see [`templates/CONTRACT.md`](templates/CONTRACT.md)); then one entry per shot — 1 to 3 seconds each, boundaries on the beat grid, plates alternating — with all eight subsections, the Sound cues timestamped on the grid.

Done when: the shots tile [0, duration] exactly, with no gaps or overlaps, every shot has all eight subsections, every match cut is named in a shared-geometry table, and the doc survives a self-review with a critic's eye: every number in the prose matches the tables (beat arithmetic, act boundaries), and no must-read content sits outside the safe area — on 1080×1920 that is x 60–940, y 220–1540; on any other frame it is the centred 90% (`FILM.safeArea`) — arithmetic included. Storyboard errors compound into every scene; this is the cheapest moment to catch them.

### 5. Timeline

Write `src/timeline.js` from the storyboard (shape in the storyboard template): title, bpm, duration, the shots array (id, file, start, end, mode, title, transitionIn, brief), and the flat cues list collected from the Sound sections. Write `src/geo.js` from the Shared geometry section, one entry per table (shape in `docs/CONTRACT.md`). The stub pass is this step's test — it fails loudly on a malformed timeline or geometry table.

### 6. Stub pass

Run `node tools/stubgen.cjs` to generate a placeholder scene per shot (a shot bound to a profile or outline draws that silhouette, so check 7 measures every match cut from the first run), run the gate, then `node tools/render.cjs --scale 0.5 --out exports/draft-stubs.mp4` and watch the draft end to end. This is the tracer bullet: timeline, scenes, gate, render and audio all proven before any real scene is drawn.

Done when: the gate is green and the draft MP4 shows every shot in order, every cut on the grid and every match-cut silhouette landing. Look at each geometry table drawn on its stub: this is the cheapest moment to catch a wrong one.

### 7. Scenes

One agent per scene file — file ownership is law (docs/CONTRACT.md). Each scene agent reads `reference/scene-anatomy.md`, its storyboard entry, the art bible and the shared geometry, then writes `src/scenes/NN-<id>.js`, snaps a contact sheet (`node tools/snap.cjs --shot <id> --samples 6 --sheet`) and looks at every frame, iterating until the sheet is on-brief, and gates its shot with `node tools/check.cjs --shot <id>`. `snap --only` and `check --shot` load one shot while sibling files are half-written, so scene agents run in parallel freely.

Each scene brief names the files the agent owns, the `src/geo.js` entries that bind it (read with `lib.geo`, never copied), and the scene file that owns each shared constructor the tables do not cover: the canonical progress glyph, a character drawn in several shots. The owning scene is drafted first, and the others copy its constructor verbatim. A scene agent that doubts a table asks before drafting. The director rules and fixes `docs/storyboard.md` and `src/geo.js` together.

Done when: every shot's contact sheet has been eyeballed and judged on-brief, every `check --shot` is green, and the director's full gate is green.

### 8. Music

Compose `src/music.js` per `reference/music.md`: keep the engine, replace the CH chord table, the MIX.ride automation and the whole score() function, implementing every cue in `FILM.TIMELINE.cues` at its exact time so the hits land on the cuts.

Done when: `node tools/audio/render-audio.cjs` then `node tools/audio/analyze.cjs .tmp/audio/score.wav --cues` matches onsets to cues within 10 ms, a render started at every bar completes without an error (the seek loop in `reference/music.md`), `node tools/audio/peaks.cjs .tmp/audio/score.wav` shows headroom under the limiter ceiling, and the gate is green.

### 9. Critic waves

Start with the whole film on one sheet: `node tools/snap.cjs --samples 24 --sheet --scale 0.25`. A shot that fails to read at that size is a P1 — the fix is composition, not more detail.

Then review every shot on rendered frames at three scales, each of which hides what the others show: the contact sheet (composition and reading at thumbnail size), the full frame at native size (hierarchy, empty areas, density), and native crops of the subject and its key materials (`snap --crop x,y,w,h`: anatomy, construction, whether detail follows the form or just scatters noise). Critic subagents score composition, faithfulness to the storyboard, motion and density. They take separate passes for composition, anatomy and motion. They **measure** ratio-critical geometry in pixels against the art bible (the Measure ratios of section 10, band fractions, thirds, safe-area arithmetic) rather than judging by eye alone, and snap both sides of every cut with the tables overlaid (`snap --geo G1,G3`); check 7 already holds the listed match cuts, so critics spend their eye on the unlisted ones.

Beside those three scales, the art checklist:

- Compare with a reference at native size (`reference/example-paper-frame.jpg` and `reference/example-blueprint-frame.jpg` on the house theme, or the agreed reference for this film). The contact sheet hides stroke texture and line weight.
- On the thumbnail, check hierarchy and quiet: what reads first, and whether there is empty space around the subject.
- A green gate is not an art verdict. Write a separate art verdict.
- Every note names one element and the scale it was seen at (thumbnail, native frame, or native crop). No "looks better" with no subject.

Fix in waves — prioritised briefs (P1 first, each citing evidence frames), file ownership (resume the owning agent rather than spawning a fresh one), re-snap after every fix. The director spot-checks every P1 fix on fresh frames: a fix is done when the re-rendered frame shows it, never on an agent's description of the change. Spot-check determinism by snapping the same frames in two different orders and comparing file hashes.

Done when: every P1 and P2 fix is verified on fresh frames, the art verdict is written, and the gate is green.

### 10. Deliver

`node tools/render.cjs` writes the master (crf 16; a 30 s film renders in minutes). Then `node tools/qa.cjs exports/<slug>.mp4` checks the file a viewer gets (h264, 24 fps, faststart, loudness). `render.cjs --qa` runs that check on the file it just wrote. Then the transcodes:

```bash
ffmpeg -i exports/<slug>.mp4 -vf "scale='if(gt(iw,ih),-2,720)':'if(gt(iw,ih),720,-2)'" -c:v libx264 -crf 23 -preset medium -c:a aac -b:a 128k exports/<slug>-phone.mp4
ffmpeg -i exports/<slug>.mp4 -c:v libx264 -crf 23 -preset medium -c:a copy exports/<slug>-preview.mp4
```

`node tools/build.cjs` writes `dist/<slug>.html`. Then watch the master end to end with sound, and open the HTML player once (click or space to play, arrow keys step frames, `?shot=<id>` loops one shot).

Write `exports/<slug>-shots.md` last: one line per shot saying what it shows, so whoever shares the film can caption it.

Done when: master, phone transcode, the HTML file and `exports/<slug>-shots.md` exist, the gate is green, and the final watch-through found nothing to fix.
