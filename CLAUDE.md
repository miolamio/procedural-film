# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

An agent skill, not an app. `skills/procedural-film/SKILL.md` is the pipeline an agent follows to turn a subject into a ~30 s vertical film (1080×1920, 24 fps) drawn on canvas and scored in Web Audio, with zero media assets. `examples/butterfly-life/` is a finished film the skill produced, and it doubles as the regression target for the engine and tools.

`skills/procedural-film/themes/` holds the swappable looks (art bible sections 1–9, a `palette.js` pasted between the `// BEGIN 2.2` / `// END 2.2` markers of `lib.js`, a `theme.json` a film copies to `docs/theme.json`); `themes/INDEX.md` lists them and step 3 of SKILL.md picks one. `house` is the default.

`docs/CONTRACT.md` (template at `skills/procedural-film/templates/CONTRACT.md`) is the source of truth for the runtime architecture: load order, the `FILM.scene` / `FILM.lib` / `FILM.audio` APIs, file ownership and the hard rules (no media, deterministic, stateless per frame). Read it before touching `src/`.

## Two copies of the engine

`skills/procedural-film/foundation/` is copied verbatim into every new film, so `examples/butterfly-life/` carries its own copy, and so does each film under `films/` (keep their `tools/` in sync too).

- `tools/`, `src/core.js` and `src/player.js` are byte-identical in both places. A fix to any of them goes into both in the same commit (`diff -r skills/procedural-film/foundation/tools examples/butterfly-life/tools` must stay empty).
- `src/lib.js` differs only in the palette between the `// BEGIN 2.2` / `// END 2.2` markers (and a film's 2.3 identity tints); `src/music.js` in the example is the composed score, while the foundation holds a demo score. Engine changes to either still apply to both.
- `src/geo.js` is per film (the storyboard's Shared geometry as data); the foundation has none, and its fixtures carry `tools/fixtures/geo.js`.
- `examples/butterfly-life/dist/butterfly-life.html` is committed. Rebuild it with `build.cjs` whenever the example's `src/` changes.
- Doc changes often span three places: `SKILL.md`, `templates/`, and the example's filled `docs/`.

## Commands

Everything runs from a film folder (the example, or a copy of `foundation/`). Output names come from the folder name (`common.cjs` derives the slug from it).

```bash
npm install --prefix examples/butterfly-life/tools
npx --prefix examples/butterfly-life/tools playwright install chromium
node examples/butterfly-life/tools/smoke.cjs            # Playwright + canvas + OfflineAudioContext work
node examples/butterfly-life/tools/check.cjs            # the gate: eleven checks, exit 0 = green
node examples/butterfly-life/tools/check.cjs --shot <id> # one shot loaded alone (what a scene agent runs)
node examples/butterfly-life/tools/check.cjs --fixtures # gate against tools/fixtures/ (the foundation's only test film)
node examples/butterfly-life/tools/snap.cjs --shot <id> --samples 6 --sheet   # contact sheet into .frames/
node examples/butterfly-life/tools/snap.cjs --times 11.458,11.5 --geo G3 --crop 380,300,320,640  # match cut with the table overlaid
node examples/butterfly-life/tools/render.cjs --scale 0.5 --out exports/draft.mp4
node examples/butterfly-life/tools/build.cjs            # dist/<slug>.html
node examples/butterfly-life/tools/ref/extract.cjs ref.mp4 --bpm 120  # a reference video: shot and per-second sheets, palette, cut rhythm, cadence into .tmp/ref/<name>/
node examples/butterfly-life/tools/theme.cjs list                 # themes: frame, carrier, accent, look
node examples/butterfly-life/tools/theme.cjs lookbook --out .tmp/lookbook.html  # pick a style and its overrides
node --test examples/butterfly-life/tools/theme.test.cjs          # tools/theme.cjs on a throwaway film
```

The gate (`check.cjs`) is the test, plus `tools/theme.test.cjs` for the theme tool: run the gate on the example and with `--fixtures` after any engine or tool change. The foundation has no timeline of its own, so test it via `--fixtures`. ffmpeg must be on `PATH` or set in `FFMPEG`.

Check 6 on `examples/butterfly-life` warns and does not fail the gate. The slow frames are the reference film's own drawing: `scale-mosaic` peaks around 540 ms, `spring-egg` around 300 ms. That warning is a known property of the example, not a regression to chase on every engine change.

Visual changes are verified by looking at rendered frames (`snap.cjs` output under `.frames/`), not by reading code.

## Commit style

Conventional commits with a scope: `fix(gate): ...`, `feat(skill): ...`, `fix(tools): ...`, `docs: ...`.
