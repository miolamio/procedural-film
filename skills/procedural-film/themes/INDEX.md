# Themes

A theme is a finished art bible, sections 1 to 9: palette, line, tone, plate language, motion. Step 3 of `SKILL.md` picks one; the film then writes only its subject palette (2.2) and subject reference (10).

Each theme folder holds:

- `art-bible-1-9.md` — sections 1 to 9, copied verbatim into `docs/art-bible.md`;
- `palette.js` — the theme's colours as `lib.pal` rows, pasted between `// BEGIN 2.2` and `// END 2.2` in `src/lib.js`, before the subject rows;
- `theme.json` — the machine-readable summary, copied to `docs/theme.json`: `frame` (the default canvas; the timeline's `width` and `height` may override it), `plates` (plate A and plate B mapped to a shot `mode`, a default `post`, a `grade` when the plate is one, and the `lib.pal` names of the base, line and text colours, which `tools/stubgen.cjs` draws the stubs with), the ten `axes` in words, and the `recipes` of `reference/shot-types.md` the theme leans on.

| Theme | Frame | Look | Status |
|---|---|---|---|
| [`house`](house/) | 1080×1920 | Hand-inked paper plates cut against navy blueprint plates | ready — the default |
| [`negative`](negative/) | 1920×1080 | Light lines on a near-black void; figures as constellations; one warm accent; plate B is the inverted frame | ready |

Planned, first wave: `phosphor` (terminal green vector on a CRT carrier), `shards` (polygon fragments, shatter transitions), `blob` (liquid ink blob built on isolines).

## Picking a theme

- Pick `house` unless the user names another look or the subject calls for one; say which theme you picked and why in one line.
- A `draft` theme is usable only within what its `status` and `needs` allow. Tell the user what is missing.
- If no theme fits, run a reference analysis (`templates/reference-analysis.md`) and write sections 1 to 9 by hand; a look that proves itself on a finished film becomes a new theme folder.
