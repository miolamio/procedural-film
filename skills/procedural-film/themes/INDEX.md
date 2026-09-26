# Themes

A theme is a finished art bible, sections 1 to 9: palette, line, tone, plate language, motion. Step 0 of `SKILL.md` picks one and step 3 applies it; the film then writes only its subject palette (2.2) and subject reference (10).

Each theme folder holds:

- `art-bible-1-9.md` — sections 1 to 9, copied verbatim into `docs/art-bible.md` by `tools/theme.cjs apply`;
- `palette.js` — the theme's colours as `lib.pal` rows, which `apply` writes between `// BEGIN 2.2` and `// END 2.2` in `src/lib.js`, before the subject rows;
- `preview.jpg`, when present — a plate A / plate B sheet from fixtures, for the lookbook; not a quality bar, unlike `example-*.jpg`;
- `example-*.jpg`, when present — the theme's bar: a contact sheet of a finished film in the theme and one full frame per plate, as `reference/example-*.jpg` is for `house`;
- `theme.json` — the machine-readable summary; `apply` writes it, resolved with the film's overrides, to `docs/theme.json`: `frame` (the default canvas; `--frame` overrides it; check 4 warns when the timeline's frame differs), `plates` (plate A and plate B mapped to a shot `mode`, a default `post`, a `grade` when the plate is one, and the `lib.pal` names of the base, line and text colours, which `tools/stubgen.cjs` draws the stubs with), an optional `carrier` the timeline takes as its `carrier`, `look` and `accent` (`accent` names the `base`/`hot`/`deep` palette rows `--accent` recolours; `house` has none), the ten `axes` in words, and the `recipes` of `reference/shot-types.md` the theme leans on.

| Theme | Frame | Look | Status |
|---|---|---|---|
| [`house`](house/) | 1080×1920 | Hand-inked paper plates cut against navy blueprint plates | ready — the default |
| [`negative`](negative/) | 1920×1080 | Light lines on a near-black void; figures as constellations; one warm accent; plate B is the inverted frame | ready — examples from `films/indigo-bunting-stars` |
| [`phosphor`](phosphor/) | 1920×1080 | Green vector strokes and a typing pixel-font terminal on a CRT carrier; plate B is an oscilloscope; acts end on `crtoff` | ready |
| [`shards`](shards/) | 1920×1080 | Flat Voronoi facets in four blue steps that part on the beat; plate B is low-poly space and tunnels; cuts shatter | ready |
| [`blob`](blob/) | 1920×1080 | White metaball bodies with tar rims and marble contours on a flat blue pool; they merge, drip and melt; plate B is a relief map of the same field | ready |

Planned, second wave: `snow` (snow and one drop), `drybrush`, `relief` (heat map), `crater` (red paper).

## Picking a style

- Step 0 shows the lookbook (`tools/theme.cjs lookbook`) or `tools/theme.cjs list`; the user answers with one `Style:` line.
- At step 0, with no answer, pick `house` unless the subject calls for another theme; say which and why in one line.
- Step 3 applies it: `node tools/theme.cjs apply <id> [--frame WxH] [--carrier none|crt|vhs|film] [--accent '#RRGGBB'] [--grain 0..1]`.
- A theme fixes line, tone, motion, plate B, font, match cuts and overlays. Frame, carrier, accent and grain hold across themes and may be overridden per film; `docs/theme.json` records the overrides, and check 4 warns when the timeline's frame or carrier differs from it.
- Carriers (`--carrier`): `crt` (a tube: scanlines, a rounded screen, a hum bar; the phosphor theme's) and `vhs` (a tape: chroma lag, a rolling tracking band, head-switching noise, a pixel-font counter; pair it with `transitionIn: { kind: 'tracking' }` for cuts that lose tracking) and `film` (a print: perforations down both edges, scratches, dust, a weave of at most 2 px, a faint exposure flicker).
- A `draft` theme is usable only within what its `status` and `needs` allow. Tell the user what is missing.
- If no theme fits, run a reference analysis (`templates/reference-analysis.md`) and write sections 1 to 9 by hand; a look that proves itself on a finished film becomes a new theme folder with its own `preview.jpg`.
