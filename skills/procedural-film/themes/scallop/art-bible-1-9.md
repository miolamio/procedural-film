<!-- Theme: scallop (a flat three-ink print: scallop waves, fir rows, one lagoon accent). Sections 1–9 of docs/art-bible.md; step 3 of SKILL.md copies them in verbatim. -->

## 1. Frame

The canvas is 1920 px wide and 1080 px tall at 24 fps: set `width: 1920, height: 1080` in the timeline. A film may pick 1080×1920 instead; then scale every position and size below by 1080/1920 and keep the ratios. Line widths (section 3) do not scale: they are set on the short side, which is 1080 px either way.
Every pixel value in this file assumes 1920×1080. The origin is the top-left corner and y grows downward.

- Must-read content sits inside the title-safe box: x 96–1824, y 54–1026.
- The frame is three flat bands, like a print pulled in three passes: white sky above, a soot shore with its fir row across the middle, scarlet water below. The horizon (the foot of the firs) sits between 0.42 and 0.55 of the height; on 1080×1920 at about 0.52.
- One figure carries the shot, in the water band or on the shore, and it overlaps the band edges: a hat against the firs is lost, so a figure's head and shoulders sit on sheet or on scarlet, never on soot.
- Shapes repeat: waves in rows, firs in a row, clouds in bumps. A single big shape (the sun, a hull) breaks the repeat once.

## 2. Palettes

Names below are the keys of `FILM.lib.pal`. The theme's colours (2.1) and the film's subject colours (2.2) both go into the marked 2.2 block of `src/lib.js`: paste `themes/scallop/palette.js` first, then the subject rows. The house palettes stay in `lib.pal` for the engine and are not used by scenes.

Three inks and one accent. Every pixel of a finished plate is one of the four; the only in-between pixels are the antialiased edges of the contour.

### 2.1 Three inks

| Name | Hex | Use |
|---|---|---|
| sheet | #F5F2EF | Plate A base (the paper), clouds, faces, stripes, oar blades; plate B wire |
| scarlet | #B31214 | Water, the sun, scarves and bands; plate B base |
| soot | #141213 | Every contour, the shore, the firs, coats and hats; plate B guides |
| lagoon | #77E1CC | The one accent |

### 2.2 Subject palette

REWRITE PER FILM. None by default: a subject is drawn in the three inks. Add at most one name, and only when the subject cannot be read without its own colour (then it replaces scarlet in that subject, it is not a fourth ink). Never a second accent. Enter it into the marked block in `src/lib.js` after the theme rows.

| Name | Hex | Use |
|---|---|---|
| … | #… | … |

### 2.3 The accent

Lagoon fills one shape per shot: a hull, a door, a fish, an eye. Its contour stays soot and its stripes, if any, stay sheet. It covers 1 to 6 percent of the frame. It is the shape the cuts hold on (section 8), so the same thing keeps it through an act.

## 3. Line

One contour, the same everywhere: a wire, not a pen. No pressure, no taper, no `inkPath`; `ctx.stroke()` with round joins and caps.

| Element | Width | Colour |
|---|---|---|
| Contour of every shape (waves, firs, hull, figure, sun, clouds) | 6 px (5 px on shapes under 80 px) | soot 100% |
| Stripes on a hull or a garment | 10 px | sheet 100% |
| Facial dots (eyes, a cheek) | filled discs, no contour | soot, scarlet |
| Plate B wire | 6 px | sheet 100% |
| Plate B guides (dashed 18/14) and dimensions (solid, with end ticks) | 3 px guides, 5 px dimensions | soot 100% |

Filled soot shapes (firs, the shore, a coat) take the same 6 px soot contour, so their outline sits exactly where a sheet shape's would.

## 4. Tone

- None. A shape is one flat ink, and the contour is the only thing drawn over it. No hatching, no stipple, no gradient, no shadow, no grain.
- Depth is overlap: later rows and nearer firs are drawn over earlier ones with a full fill, so each one knocks out what it covers.
- The plate: flat `sheet` (plate A) or flat `scarlet` (plate B). The carrier is clean: `post: 0`.

## 5. Plate language

- **Scallop waves** (recipe 39) are three rows, never more. Each row is a top edge of circular sags between sharp cusps, filled scarlet down to the bottom of the frame, and stroked in soot. The period P is 220 to 280 px and the sag depth D is 0.22 to 0.26 of P. Row 2 is offset half a period from rows 1 and 3, so a cusp of one row stands over a sag of the next. Rows are 0.14 to 0.2 of the height apart; the first row sits 60 to 100 px under the shore, leaving a thin sheet band of sags under the soot.
- **Fir rows** (recipe 40) stand on the shore line: 3 or 4 stacked tiers and a short trunk per fir, heights varied by a seeded `rng` between 0.14 and 0.3 of the height, the tallest drawn last. Firs overlap; no gap wider than one fir.
- **Clouds** are flat-bottomed runs of 3 or 4 upward bumps, sheet with a soot contour, drawn over the sun where they cross it.
- **The sun** is one scarlet disc, 0.2 to 0.26 of the height across.
- **Figures** are built from flat trapezoids, circles and triangles: a soot coat, a sheet face with dot eyes, a scarlet band or scarf, a soot hat. No limbs drawn as lines; hands are sheet mitten discs. A boat is a lagoon trapezoid hull with 2 to 3 sheet stripes and a sheet rail, riding in the trough in front of row 3, which hides its keel.
- No text in any shot until a wordmark exists (section 9).

## 6. Overlays

None on plate A. Plate B is the explanation: dashed soot guides through cusps, centres and the horizon, and a dimension bar with end ticks across one wave period. Never a label.

## 7. Motion

### 7.1 On threes

Everything is held for three frames: draw from the drawing index `lib.boil(T, 8)` and its time `lib.boil(T, 8) / 8`, never from `t` directly. Between drawings every vertex shakes by at most 2 px, from a smooth noise field keyed by the drawing index (`lib.noise2(x·0.004, y·0.004 + d·3.7, seed)`), so a held shape does not boil but a new drawing lands a hair off the last one, like a second pass of the press.

### 7.2 Timing

Rows slide against each other, alternately left and right, about 25 px over a bar. A boat crosses at 120 to 180 px a second and bobs once a beat. A stroke, a turn or a blink takes whole drawings (3, 6 or 9 frames) and lands on a beat.

### 7.3 Determinism

Positions are closed forms of global `T` (a crossing that spans a cut keeps one clock). Rows, firs and clouds are rebuilt from constants and seeds each frame; nothing is kept from the last frame.

## 8. Match cuts and continuity

The cut holds on a silhouette: the accent shape (the hull) keeps its outline and its place, and everything around it changes. Plate A to plate B keeps the frame and swaps the inks: sheet ground becomes scarlet, fills become scarlet with a sheet wire, and the accent keeps its lagoon fill. List the accent's outline at the cut frame in the storyboard's Shared geometry.

## 9. Wordmark

The theme's font is a stencil: heavy capitals with bridges, in soot on sheet or sheet on scarlet. The engine has no stroke font yet, so a film in this theme carries no wordmark. Never `lib.text`: a system sans breaks the print.
