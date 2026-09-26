# Выбор направления стиля: план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** пользователь выбирает направление стиля фильма: тему из каталога плюс ортогональные оси (кадр, носитель, акцент, зерно). Выбор делается на шаге 0 через страницу-лукбук или строку `Style:` в брифе и применяется на шаге 3 одной командой.

**Architecture:** новый инструмент `tools/theme.cjs` (`list`, `apply`, `show`, `lookbook`) лежит в `foundation/tools/` и его копиях. `apply` делает то, что сейчас агент делает руками по четырём пунктам шага 3: вклеивает разделы 1–9 в `docs/art-bible.md` между машинными маркерами, вклеивает палитру темы между маркерами внутри блока 2.2 в `src/lib.js` (строки акцента перекрашены) и пишет разрешённый `docs/theme.json` с записью `overrides`. Линия, тон и движение не переопределяются: это проза разделов 3, 4 и 7, привязанная к именам палитры темы. Гейт (check 4) предупреждает, если timeline разошёлся с `docs/theme.json` по кадру или носителю. `lookbook` собирает одну самодостаточную HTML-страницу из `theme.json` и `preview.jpg` каждой темы.

**Tech Stack:** Node 24 (CommonJS, `node:test`), существующие `common.cjs`/`snap.cjs`/`check.cjs`, ffmpeg для превью.

**Основание:** брейншторм `docs/planning/bmad/brainstorming/brainstorm-art-bible-themes-2026-09-25/` (зал II «Десять осей», зал VII «Механизм», `decisions.md`). Первая волна тем готова, этот план закрывает строку «Композитор из превью — прототип выбора темы».

---

## Что выбирается и где

| Ось | Как задаётся | Куда попадает |
|---|---|---|
| тема (base, line, tone, planB, motion, font, match, overlays) | `apply <id>` | разделы 1–9, палитра, `docs/theme.json` |
| кадр | `--frame 1080x1920 \| 1920x1080 \| 1080x1080` | `docs/theme.json.frame`, заметка «Film overrides» в art bible, `width`/`height` timeline |
| носитель | `--carrier none \| crt` | `docs/theme.json.carrier`, `carrier` timeline |
| акцент | `--accent #RRGGBB` | строки `accent` темы в `lib.js` (hot = +60% к белому, deep = +45% к чёрному), заметка |
| зерно | `--grain 0..1` | `post` каждого плана в `docs/theme.json`, `post` шотов |

`house` держит акцент (`annMagenta`) в `lib.pal` вне маркеров 2.2, поэтому `--accent` для него недоступен и `apply` об этом говорит.

## Файлы

- Create: `skills/procedural-film/foundation/tools/theme.cjs`, инструмент.
- Create: `skills/procedural-film/foundation/tools/theme.test.cjs`, тесты `node:test` на временной папке фильма.
- Modify: `skills/procedural-film/foundation/tools/check.cjs`, check 4: предупреждение о расхождении с `docs/theme.json`.
- Modify: `skills/procedural-film/themes/*/theme.json` ×5: поля `look` и `accent`.
- Create: `skills/procedural-film/themes/*/preview.jpg` ×5: лист из двух fixtures-кадров (план A и план B).
- Modify: `skills/procedural-film/themes/INDEX.md`, `skills/procedural-film/SKILL.md` (шаги 0, 3, 5), `skills/procedural-film/templates/art-bible.md`, `CLAUDE.md`.
- Sync (byte-identical `tools/`): `examples/butterfly-life/tools/`, `films/arctic-tern-life/tools/`, `films/indigo-bunting-stars/tools/`, `films/zero-gravity/tools/`.

Команда синхронизации, на неё ссылаются задачи ниже:

```bash
for d in examples/butterfly-life films/arctic-tern-life films/indigo-bunting-stars films/zero-gravity; do
  rsync -a --exclude node_modules skills/procedural-film/foundation/tools/ $d/tools/
  diff -r -x node_modules skills/procedural-film/foundation/tools $d/tools && echo "$d in sync"
done
```

---

### Task 1: `look` и `accent` в theme.json

**Files:** Modify: `skills/procedural-film/themes/{house,negative,phosphor,shards,blob}/theme.json`

- [ ] **Step 1: добавить поля** сразу после `"status"` в каждом файле:

| Тема | `look` | `accent` |
|---|---|---|
| house | `"Hand-inked paper plates cut against navy blueprint plates"` | не добавлять |
| negative | `"Light lines on a near-black void; figures as constellations; one warm accent; plate B is the inverted frame"` | `{ "base": "accent", "hot": "accentHot", "deep": "accentGlow" }` |
| phosphor | `"Green vector strokes and a typing pixel-font terminal on a CRT carrier; plate B is an oscilloscope"` | `{ "base": "amber", "hot": "amberHot" }` |
| shards | `"Flat Voronoi facets in four blue steps that part on the beat; plate B is low-poly space; cuts shatter"` | `{ "base": "flare", "hot": "flareHot" }` |
| blob | `"White metaball bodies with tar rims and marble contours on a flat blue pool; plate B is a relief map"` | `{ "base": "yolk" }` |

- [ ] **Step 2: проверить JSON**

Run: `for t in house negative phosphor shards blob; do node -e "const t=require('./skills/procedural-film/themes/$t/theme.json'); console.log(t.id, !!t.look, JSON.stringify(t.accent||null))"; done`
Expected: пять строк, у каждой `true`; у house `null`.

- [ ] **Step 3: commit** `feat(skill): look and accent rows in theme.json`

---

### Task 2: `theme.cjs` — list, apply, show (TDD)

**Files:** Create: `skills/procedural-film/foundation/tools/theme.test.cjs`, `skills/procedural-film/foundation/tools/theme.cjs`

- [ ] **Step 1: написать тесты**

```js
// theme.test.cjs : node --test tools/theme.test.cjs — tools/theme.cjs on a throwaway film folder.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const T = require('./theme.cjs');

const THEMES = T.findThemes(path.resolve(__dirname, '..'));
const skip = !THEMES && 'no skill themes/ folder next to this film';

function film() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-theme-'));
  fs.mkdirSync(path.join(dir, 'src'));
  fs.mkdirSync(path.join(dir, 'docs'));
  fs.copyFileSync(path.join(THEMES, '..', 'foundation', 'src', 'lib.js'), path.join(dir, 'src', 'lib.js'));
  fs.copyFileSync(path.join(THEMES, '..', 'templates', 'art-bible.md'), path.join(dir, 'docs', 'art-bible.md'));
  return dir;
}
const read = (dir, f) => fs.readFileSync(path.join(dir, f), 'utf8');
const block22 = (lib) => lib.slice(lib.indexOf('// BEGIN 2.2'), lib.indexOf('// END 2.2'));

test('list puts house first and reads every theme', { skip }, () => {
  const ids = T.listThemes(THEMES).map((t) => t.id);
  assert.strictEqual(ids[0], 'house');
  for (const id of ['negative', 'phosphor', 'shards', 'blob']) assert.ok(ids.includes(id), id);
});

test('apply pastes sections 1-9, the palette and docs/theme.json', { skip }, () => {
  const dir = film();
  const t = T.apply(dir, THEMES, 'negative', {});
  assert.deepStrictEqual(t.frame, { width: 1920, height: 1080 });
  const lib = read(dir, 'src/lib.js');
  assert.match(block22(lib), /\/\/ BEGIN theme negative/);
  assert.match(block22(lib), /void: '#05060A'/);
  const ab = read(dir, 'docs/art-bible.md');
  assert.match(ab, /^Theme: negative/m);
  assert.match(ab, /## 1\. Frame/);
  assert.doesNotMatch(ab, /PASTE themes/);
  assert.strictEqual(JSON.parse(read(dir, 'docs/theme.json')).id, 'negative');
});

test('a second apply swaps the theme and keeps the subject rows', { skip }, () => {
  const dir = film();
  T.apply(dir, THEMES, 'negative', {});
  const libFile = path.join(dir, 'src', 'lib.js');
  fs.writeFileSync(libFile, read(dir, 'src/lib.js').replace(/(\n\s*\/\/ END 2\.2)/, "\n    hero: '#D9772B',$1"));
  T.apply(dir, THEMES, 'shards', {});
  const b = block22(read(dir, 'src/lib.js'));
  assert.doesNotMatch(b, /BEGIN theme negative|void:/);
  assert.match(b, /\/\/ END theme shards[\s\S]*hero: '#D9772B'/);
  assert.strictEqual(read(dir, 'docs/art-bible.md').match(/## 1\. Frame/g).length, 1);
});

test('overrides reach docs/theme.json, the palette and the art bible', { skip }, () => {
  const dir = film();
  const o = T.parseOverrides({ frame: '1080x1920', carrier: 'crt', accent: '#3aa0ff', grain: '0.3' });
  const t = T.apply(dir, THEMES, 'negative', o);
  assert.deepStrictEqual(t.frame, { width: 1080, height: 1920 });
  assert.deepStrictEqual(t.carrier, { kind: 'crt' });
  assert.strictEqual(t.plates.A.post, 0.3);
  assert.strictEqual(t.plates.B.post, 0.3);
  assert.strictEqual(t.overrides.accent, '#3AA0FF');
  const b = block22(read(dir, 'src/lib.js'));
  assert.match(b, /accent: '#3AA0FF'/);
  assert.match(b, new RegExp(`accentHot: '${T.mixHex('#3AA0FF', '#FFFFFF', 0.6)}'`));
  assert.match(b, new RegExp(`accentGlow: '${T.mixHex('#3AA0FF', '#000000', 0.45)}'`));
  assert.match(read(dir, 'docs/art-bible.md'), /Film overrides[\s\S]*1080×1920[\s\S]*0\.5625/);
});

test('carrier none drops the theme carrier', { skip }, () => {
  const t = T.apply(film(), THEMES, 'phosphor', T.parseOverrides({ carrier: 'none' }));
  assert.strictEqual(t.carrier, undefined);
});

test('bad input is refused before anything is written', { skip }, () => {
  assert.throws(() => T.parseOverrides({ frame: '800x600' }), /--frame/);
  assert.throws(() => T.parseOverrides({ accent: 'red' }), /--accent/);
  assert.throws(() => T.parseOverrides({ grain: '2' }), /--grain/);
  assert.throws(() => T.parseOverrides({ carrier: 'vhs' }), /--carrier/);
  const dir = film();
  const before = read(dir, 'src/lib.js');
  assert.throws(() => T.apply(dir, THEMES, 'house', T.parseOverrides({ accent: '#FF0000' })), /no accent rows/);
  assert.throws(() => T.apply(dir, THEMES, 'nope', {}), /no theme 'nope'/);
  assert.strictEqual(read(dir, 'src/lib.js'), before);
});

test('rows pasted by hand without the theme markers are refused', { skip }, () => {
  const dir = film();
  const libFile = path.join(dir, 'src', 'lib.js');
  fs.writeFileSync(libFile, read(dir, 'src/lib.js').replace(/(\n\s*\/\/ END 2\.2)/, "\n    void: '#05060A',$1"));
  assert.throws(() => T.apply(dir, THEMES, 'negative', {}), /pasted by hand/);
});
```

- [ ] **Step 2: убедиться, что тесты падают**

Run: `node --test skills/procedural-film/foundation/tools/theme.test.cjs`
Expected: FAIL, `Cannot find module './theme.cjs'`.

- [ ] **Step 3: написать `theme.cjs`**

```js
#!/usr/bin/env node
// theme.cjs : choose the film's style direction from the skill's themes and apply it in one step.
//
//   node tools/theme.cjs list                     the themes: frame, carrier, accent, status, look
//   node tools/theme.cjs apply <id> [overrides]   sections 1-9 into docs/art-bible.md, the theme's palette
//                                                 inside the 2.2 markers of src/lib.js, the resolved docs/theme.json
//   node tools/theme.cjs show                     the applied theme and the film's overrides (docs/theme.json)
//   node tools/theme.cjs lookbook [--out path]    one self-contained page to pick a theme and its overrides
//
// Overrides are the axes that hold across themes. Line, tone and motion come whole from the theme.
//   --frame 1080x1920 | 1920x1080 | 1080x1080     the canvas: the timeline's width and height
//   --carrier none | crt                          the medium over the whole film: the timeline's carrier
//   --accent #RRGGBB                              the theme's accent rows; hot and deep steps are derived
//   --grain 0..1                                  post (grain or noise) on every plate
//
// --themes <dir> is the skill's themes/ folder. Default: $PF_THEMES, then ../themes (the foundation),
// then ../../skills/procedural-film/themes (a film in the skill's repo). --root <dir> works on another film.
'use strict';
const fs = require('fs');
const path = require('path');
const C = require('./common.cjs');

const FRAMES = ['1080x1920', '1920x1080', '1080x1080'];
const CARRIERS = ['none', 'crt'];
const HEX = /^#[0-9a-fA-F]{6}$/;

function findThemes(root, arg) {
  if (arg) {
    if (!fs.existsSync(path.join(arg, 'INDEX.md'))) throw new Error(`--themes ${arg} has no INDEX.md`);
    return path.resolve(arg);
  }
  const tries = [process.env.PF_THEMES, path.join(root, '..', 'themes'), path.join(root, '..', '..', 'skills', 'procedural-film', 'themes')];
  const hit = tries.find((d) => d && fs.existsSync(path.join(d, 'INDEX.md')));
  return hit ? path.resolve(hit) : null;
}

function loadTheme(dir, id) {
  const file = path.join(dir, String(id), 'theme.json');
  if (!/^[a-z][a-z0-9-]*$/.test(id || '') || !fs.existsSync(file)) throw new Error(`no theme '${id}' in ${dir}; run: node tools/theme.cjs list`);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function listThemes(dir) {
  return fs
    .readdirSync(dir)
    .filter((d) => fs.existsSync(path.join(dir, d, 'theme.json')))
    .map((d) => loadTheme(dir, d))
    .sort((a, b) => (a.id === 'house' ? -1 : b.id === 'house' ? 1 : a.id.localeCompare(b.id)));
}

function parseOverrides(args) {
  const o = {};
  if (args.frame !== undefined) {
    if (!FRAMES.includes(String(args.frame))) throw new Error(`--frame must be one of ${FRAMES.join(', ')}`);
    const [width, height] = String(args.frame).split('x').map(Number);
    o.frame = { width, height };
  }
  if (args.carrier !== undefined) {
    if (!CARRIERS.includes(String(args.carrier))) throw new Error(`--carrier must be one of ${CARRIERS.join(', ')}`);
    o.carrier = String(args.carrier);
  }
  if (args.accent !== undefined) {
    if (!HEX.test(String(args.accent))) throw new Error('--accent must be a hex colour like #FF4F3A');
    o.accent = String(args.accent).toUpperCase();
  }
  if (args.grain !== undefined) {
    const g = Number(args.grain);
    if (!(g >= 0 && g <= 1)) throw new Error('--grain must be a number from 0 to 1');
    o.grain = g;
  }
  return o;
}

function mixHex(a, b, t) {
  const ch = (h, i) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
  return `#${[0, 1, 2].map((i) => Math.round(ch(a, i) + (ch(b, i) - ch(a, i)) * t).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

/** The theme's accent rows recoloured from one hex: base as given, hot toward white, deep toward black. */
function accentValues(theme, hex) {
  const rows = theme.accent || {};
  const out = {};
  if (rows.base) out[rows.base] = hex;
  if (rows.hot) out[rows.hot] = mixHex(hex, '#FFFFFF', 0.6);
  if (rows.deep) out[rows.deep] = mixHex(hex, '#000000', 0.45);
  return out;
}

function rowHex(palText, name) {
  const m = palText.match(new RegExp(`^\\s*${name}\\s*:\\s*'(#[0-9A-Fa-f]{6})'`, 'm'));
  return m ? m[1].toUpperCase() : null;
}

function paletteBlock(theme, text, values) {
  let body = text.replace(/\s+$/, '');
  for (const [name, hex] of Object.entries(values)) {
    const re = new RegExp(`^(\\s*${name}\\s*:\\s*')#[0-9A-Fa-f]{6}(')`, 'm');
    if (!re.test(body)) throw new Error(`palette.js of theme '${theme.id}' has no row '${name}'`);
    body = body.replace(re, `$1${hex}$2`);
  }
  return [`    // BEGIN theme ${theme.id} (tools/theme.cjs rewrites these rows; the subject rows go below)`, body, `    // END theme ${theme.id}`];
}

function applyPalette(lib, rows) {
  const lines = lib.split('\n');
  const b = lines.findIndex((l) => /\/\/ BEGIN 2\.2/.test(l));
  const e = lines.findIndex((l) => /\/\/ END 2\.2/.test(l));
  if (b < 0 || e < b) throw new Error('src/lib.js has no // BEGIN 2.2 ... // END 2.2 markers');
  const tb = lines.findIndex((l, i) => i > b && i < e && /\/\/ BEGIN theme /.test(l));
  const te = lines.findIndex((l, i) => i > tb && i < e && /\/\/ END theme /.test(l));
  if (tb >= 0 && te > tb) {
    lines.splice(tb, te - tb + 1, ...rows);
    return lines.join('\n');
  }
  const names = rows.join('\n').match(/^\s*\w+(?=\s*:)/gm) || [];
  const clash = names.map((n) => n.trim()).find((n) => lines.slice(b, e).some((l) => new RegExp(`^\\s*${n}\\s*:`).test(l)));
  if (clash) throw new Error(`src/lib.js already has '${clash}' inside the 2.2 markers: theme rows pasted by hand. Remove them, then run apply again`);
  let at = b + 1;
  while (at < e && /^\s*\/\//.test(lines[at])) at++;
  lines.splice(at, 0, ...rows);
  return lines.join('\n');
}

function overrideNote(theme, o, values) {
  const parts = [];
  if (o.frame) {
    const k = Math.min(o.frame.width / theme.frame.width, o.frame.height / theme.frame.height);
    parts.push(`frame ${o.frame.width}×${o.frame.height} instead of ${theme.frame.width}×${theme.frame.height}: every pixel value below assumes the theme's frame, so scale it by ${+k.toFixed(4)}, keep the ratios and recompose section 1 for the new frame`);
  }
  if (o.accent) parts.push(`accent ${o.accent} instead of the theme's (${Object.entries(values).map(([n, h]) => `${n} ${h}`).join(', ')}); where section 2 names the old hex, read the new one`);
  if (o.carrier === 'none') parts.push(`no carrier${theme.carrier ? `: the theme's ${theme.carrier.kind} is off` : ''}`);
  else if (o.carrier) parts.push(`carrier ${o.carrier} over the whole film`);
  if (o.grain !== undefined) parts.push(`post ${o.grain} on every plate instead of the theme's`);
  return parts.length ? `> **Film overrides** (tools/theme.cjs): ${parts.join('; ')}.` : '';
}

function applyArtBible(ab, theme, sections, note) {
  const inner = [
    `<!-- BEGIN theme ${theme.id}: sections 1 to 9 from themes/${theme.id}/art-bible-1-9.md (tools/theme.cjs rewrites this block) -->`,
    note ? `${note}\n` : null,
    sections.trim(),
    `<!-- END theme ${theme.id} -->`,
  ].filter((x) => x !== null).join('\n');
  const block = /<!-- BEGIN theme [\w-]+:[\s\S]*?<!-- END theme [\w-]+ -->/;
  const paste = /<!-- PASTE themes\/<id>\/art-bible-1-9\.md HERE[^>]*-->/;
  let out;
  if (block.test(ab)) out = ab.replace(block, () => inner);
  else if (paste.test(ab)) out = ab.replace(paste, () => inner);
  else throw new Error('docs/art-bible.md has neither the template PASTE marker nor a theme block: sections 1 to 9 were written by hand');
  return out.replace(/^Theme: .*$/m, () => `Theme: ${theme.id} (\`themes/${theme.id}/\` in the skill; tools/theme.cjs resolves it into \`docs/theme.json\`).`);
}

function resolveTheme(theme, o) {
  const t = JSON.parse(JSON.stringify(theme));
  if (o.frame) t.frame = o.frame;
  if (o.carrier === 'none') delete t.carrier;
  else if (o.carrier) t.carrier = { kind: o.carrier };
  if (o.grain !== undefined) for (const pl of Object.values(t.plates || {})) if (pl) pl.post = o.grain;
  t.overrides = o;
  return t;
}

function apply(root, dir, id, o) {
  const theme = loadTheme(dir, id);
  if (o.accent && !(theme.accent && theme.accent.base)) throw new Error(`theme '${id}' has no accent rows in its theme.json; --accent is not available for it`);
  const abFile = path.join(root, 'docs', 'art-bible.md');
  const libFile = path.join(root, 'src', 'lib.js');
  if (!fs.existsSync(abFile)) throw new Error('docs/art-bible.md is missing: copy the skill templates into docs/ first (step 1)');
  const values = o.accent ? accentValues(theme, o.accent) : {};
  const pal = fs.readFileSync(path.join(dir, id, theme.palette || 'palette.js'), 'utf8');
  const sections = fs.readFileSync(path.join(dir, id, 'art-bible-1-9.md'), 'utf8');
  const lib = applyPalette(fs.readFileSync(libFile, 'utf8'), paletteBlock(theme, pal, values));
  const ab = applyArtBible(fs.readFileSync(abFile, 'utf8'), theme, sections, overrideNote(theme, o, values));
  const resolved = resolveTheme(theme, o);
  fs.writeFileSync(libFile, lib);
  fs.writeFileSync(abFile, ab);
  fs.writeFileSync(path.join(root, 'docs', 'theme.json'), `${JSON.stringify(resolved, null, 2)}\n`);
  return resolved;
}

function summary(t) {
  const o = t.overrides || {};
  const lines = [
    `theme ${t.id} (${t.name})${Object.keys(o).length ? `, overrides: ${Object.keys(o).join(', ')}` : ''}`,
    `  timeline: width: ${t.frame.width}, height: ${t.frame.height}${t.carrier ? `, carrier: ${JSON.stringify(t.carrier)}` : ''}`,
  ];
  for (const [k, pl] of Object.entries(t.plates || {})) {
    if (pl) lines.push(`  plate ${k} '${pl.name}': mode '${pl.mode}'${pl.post !== undefined ? `, post ${pl.post}` : ''}${pl.grade ? `, grade ${JSON.stringify(pl.grade)}` : ''}`);
  }
  return lines.join('\n');
}

function listTable(dir) {
  const rows = listThemes(dir).map((t) => {
    const pal = fs.readFileSync(path.join(dir, t.id, t.palette || 'palette.js'), 'utf8');
    const acc = t.accent && t.accent.base ? rowHex(pal, t.accent.base) : 'fixed';
    return [t.id, `${t.frame.width}x${t.frame.height}`, t.carrier ? t.carrier.kind : 'none', acc, t.status, t.look || t.name];
  });
  const w = [0, 1, 2, 3, 4].map((i) => Math.max(...rows.map((r) => r[i].length), 7));
  return rows.map((r) => r.map((c, i) => (i < 5 ? c.padEnd(w[i]) : c)).join('  ')).join('\n');
}

function main() {
  const args = C.parseArgs(process.argv.slice(2));
  const [cmd, id] = args._;
  const root = args.root ? path.resolve(args.root) : C.ROOT;
  try {
    const dir = findThemes(root, typeof args.themes === 'string' ? args.themes : null);
    if (cmd !== 'show' && !dir) throw new Error('no themes/ folder found: pass --themes <skill>/themes or set PF_THEMES');
    if (cmd === 'list') console.log(listTable(dir));
    else if (cmd === 'apply') console.log(summary(apply(root, dir, id, parseOverrides(args))));
    else if (cmd === 'show') {
      const f = path.join(root, 'docs', 'theme.json');
      if (!fs.existsSync(f)) throw new Error('no docs/theme.json yet: run node tools/theme.cjs apply <id>');
      console.log(summary(JSON.parse(fs.readFileSync(f, 'utf8'))));
    } else if (cmd === 'lookbook') {
      const out = typeof args.out === 'string' ? path.resolve(args.out) : path.join(root, '.tmp', 'lookbook.html');
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, lookbook(dir));
      console.log(`lookbook -> ${out}`);
    } else throw new Error('usage: node tools/theme.cjs list | apply <id> [--frame WxH] [--carrier none|crt] [--accent #RRGGBB] [--grain 0..1] | show | lookbook [--out path]');
  } catch (e) {
    C.die(e.message);
  }
}

function lookbook() {
  throw new Error('lookbook is not built yet');
}

module.exports = { findThemes, listThemes, parseOverrides, mixHex, apply, summary, lookbook: (...a) => lookbook(...a) };
if (require.main === module) main();
```

- [ ] **Step 4: тесты зелёные**

Run: `node --test skills/procedural-film/foundation/tools/theme.test.cjs`
Expected: `# pass 7`, `# fail 0`.

- [ ] **Step 5: проверить CLI руками**

Run: `node skills/procedural-film/foundation/tools/theme.cjs list`
Expected: пять строк, первая `house  1080x1920  none  fixed  ready ...`, у `phosphor` носитель `crt`, у `negative` акцент `#FF9442`.

- [ ] **Step 6: синхронизировать копии** (команда из раздела «Файлы»), все четыре строки `in sync`.

- [ ] **Step 7: commit** `feat(tools): theme.cjs applies a theme and its overrides in one step`

---

### Task 3: `theme.cjs lookbook`

**Files:** Modify: `skills/procedural-film/foundation/tools/theme.cjs`, `skills/procedural-film/foundation/tools/theme.test.cjs`

- [ ] **Step 1: тест**

```js
test('lookbook embeds every theme and the brief line builder', { skip }, () => {
  const html = T.lookbook(THEMES);
  for (const t of T.listThemes(THEMES)) assert.ok(html.includes(`"id":"${t.id}"`), t.id);
  assert.doesNotMatch(html, /\/\*THEMES\*\//);
  assert.match(html, /<title>Style lookbook<\/title>/);
  assert.match(html, /node tools\/theme\.cjs apply/);
});
```

Run: `node --test skills/procedural-film/foundation/tools/theme.test.cjs`
Expected: FAIL, `lookbook is not built yet`.

- [ ] **Step 2: реализация** заменяет заглушку `function lookbook() { throw ... }` и упрощает экспорт до `lookbook`:

```js
function lookbook(dir) {
  const data = listThemes(dir).map((t) => {
    const pal = fs.readFileSync(path.join(dir, t.id, t.palette || 'palette.js'), 'utf8');
    const img = path.join(dir, t.id, 'preview.jpg');
    const post = t.plates && t.plates.A && t.plates.A.post;
    return {
      id: t.id,
      name: t.name,
      look: t.look || '',
      status: t.status,
      frame: t.frame,
      carrier: t.carrier ? t.carrier.kind : 'none',
      accent: t.accent && t.accent.base ? rowHex(pal, t.accent.base) : null,
      grain: typeof post === 'number' ? post : null,
      swatches: (pal.match(/'#[0-9A-Fa-f]{6}'/g) || []).map((s) => s.slice(1, -1)).slice(0, 8),
      axes: t.axes || {},
      preview: fs.existsSync(img) ? `data:image/jpeg;base64,${fs.readFileSync(img).toString('base64')}` : null,
    };
  });
  return LOOKBOOK.replace('/*THEMES*/null', () => JSON.stringify(data).replace(/</g, '\\u003c'));
}

const LOOKBOOK = `<title>Style lookbook</title>
<style>
:root{--bg:#f6f4ef;--fg:#1d1d22;--muted:#6b6b75;--card:#fff;--line:#dedad2;--pick:#2f5bd8;color-scheme:light}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#111216;--fg:#ecebe6;--muted:#9a9aa3;--card:#1b1c22;--line:#2c2d35;--pick:#7fa2ff;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#111216;--fg:#ecebe6;--muted:#9a9aa3;--card:#1b1c22;--line:#2c2d35;--pick:#7fa2ff;color-scheme:dark}
body{background:var(--bg);color:var(--fg);font:15px/1.45 system-ui,sans-serif;margin:0;padding:24px 16px 48px}
main{max-width:1100px;margin:0 auto}
h1{font-size:22px;margin:0 0 4px}.sub{color:var(--muted);margin:0 0 20px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:14px}
.card{background:var(--card);border:2px solid var(--line);border-radius:10px;padding:0;overflow:hidden;cursor:pointer;text-align:left;color:inherit;font:inherit}
.card[aria-pressed="true"]{border-color:var(--pick)}
.card img{display:block;width:100%;aspect-ratio:9/8;object-fit:cover;background:#000}
.card .t{padding:10px 12px}.card b{display:block}.card span{color:var(--muted);font-size:13px}
.sw{display:flex;gap:3px;margin-top:6px}.sw i{width:14px;height:14px;border-radius:3px;border:1px solid var(--line)}
.panel{margin-top:22px;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:18px}
@media (max-width:760px){.panel{grid-template-columns:minmax(0,1fr)}}
fieldset{border:1px solid var(--line);border-radius:10px;padding:12px 14px;margin:0 0 12px}
legend{font-weight:600;padding:0 4px}label{margin-right:14px;white-space:nowrap}
dl{margin:8px 0 0;font-size:13px}dt{color:var(--muted)}dd{margin:0 0 6px}
pre{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:10px;white-space:pre-wrap;word-break:break-all;margin:6px 0}
button.copy{font:inherit;font-size:13px;padding:3px 10px;border-radius:6px;border:1px solid var(--line);background:var(--card);color:inherit;cursor:pointer}
</style>
<main>
<h1>Style lookbook</h1>
<p class="sub">Pick a theme, then the axes a film may override. Line, tone and motion come whole from the theme. The brief line goes into the brief; the command applies it at step 3.</p>
<div class="grid" id="cards"></div>
<div class="panel">
<div>
<fieldset><legend>Frame</legend><div id="frame"></div></fieldset>
<fieldset><legend>Carrier</legend><div id="carrier"></div></fieldset>
<fieldset><legend>Accent</legend><label><input type="checkbox" id="accOn"> own accent</label><input type="color" id="acc"> <span id="accNote" class="sub"></span></fieldset>
<fieldset><legend>Grain</legend><label><input type="checkbox" id="grOn"> own grain</label><input type="range" id="gr" min="0" max="1" step="0.05"> <output id="grV"></output></fieldset>
</div>
<div>
<b id="name"></b><dl id="axes"></dl>
<p>Brief line <button class="copy" type="button" data-for="brief">Copy</button></p><pre id="brief"></pre>
<p>Step 3 command <button class="copy" type="button" data-for="cmd">Copy</button></p><pre id="cmd"></pre>
</div>
</div>
</main>
<script>
const THEMES=/*THEMES*/null;
const $=(id)=>document.getElementById(id);
const esc=(s)=>String(s).replace(/[&<>"]/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const FRAMES=['1080x1920','1920x1080','1080x1080'];
let sel=THEMES[0];
const st={frame:null,carrier:null,accent:null,grain:null};
const dim=(t)=>t.frame.width+'x'+t.frame.height;
function radios(host,name,opts,def,cur){host.innerHTML=opts.map((o)=>'<label><input type="radio" name="'+name+'" value="'+o+'"'+((cur||def)===o?' checked':'')+'> '+o+(o===def?' (theme)':'')+'</label>').join('');}
function cards(){$('cards').innerHTML=THEMES.map((t)=>'<button class="card" type="button" data-id="'+t.id+'" aria-pressed="'+(t===sel)+'">'+(t.preview?'<img alt="" src="'+t.preview+'">':'')+'<div class="t"><b>'+esc(t.name)+'</b><span>'+esc(t.id)+' · '+dim(t)+' · '+esc(t.status)+'</span><br><span>'+esc(t.look)+'</span><div class="sw">'+t.swatches.map((h)=>'<i style="background:'+h+'"></i>').join('')+'</div></div></button>').join('');}
function controls(){
  radios($('frame'),'frame',FRAMES,dim(sel),st.frame);
  radios($('carrier'),'carrier',['none','crt'],sel.carrier,st.carrier);
  $('accOn').disabled=!sel.accent;$('accOn').checked=!!st.accent;$('acc').disabled=!st.accent;$('acc').value=(st.accent||sel.accent||'#888888').toLowerCase();
  $('accNote').textContent=sel.accent?'theme: '+sel.accent:'this theme keeps its accent in lib.pal';
  $('grOn').checked=st.grain!==null;$('gr').disabled=st.grain===null;$('gr').value=st.grain!==null?st.grain:(sel.grain!==null?sel.grain:0.5);
  $('grV').textContent=st.grain!==null?st.grain:(sel.grain!==null?'theme '+sel.grain:'engine default');
  $('name').textContent=sel.name;
  const over={carrier:st.carrier&&st.carrier!==sel.carrier,accent:!!st.accent};
  $('axes').innerHTML=Object.entries(sel.axes).map(([k,v])=>'<dt>'+esc(k)+(over[k]?' · overridden':'')+'</dt><dd>'+esc(v)+'</dd>').join('');
}
function outputs(){
  const parts=['Style: '+sel.id],flags=[];
  if(st.frame&&st.frame!==dim(sel)){parts.push('frame '+st.frame);flags.push('--frame '+st.frame);}
  if(st.carrier&&st.carrier!==sel.carrier){parts.push('carrier '+st.carrier);flags.push('--carrier '+st.carrier);}
  if(st.accent){parts.push('accent '+st.accent);flags.push('--accent '+st.accent);}
  if(st.grain!==null){parts.push('grain '+st.grain);flags.push('--grain '+st.grain);}
  $('brief').textContent=parts.join('; ');
  $('cmd').textContent='node tools/theme.cjs apply '+sel.id+(flags.length?' '+flags.join(' '):'');
}
function render(){cards();controls();outputs();}
$('cards').addEventListener('click',(e)=>{const c=e.target.closest('.card');if(!c)return;sel=THEMES.find((t)=>t.id===c.dataset.id);st.frame=st.carrier=st.accent=st.grain=null;render();});
document.addEventListener('change',(e)=>{
  const t=e.target;
  if(t.name==='frame')st.frame=t.value===dim(sel)?null:t.value;
  else if(t.name==='carrier')st.carrier=t.value===sel.carrier?null:t.value;
  else if(t.id==='accOn')st.accent=t.checked?$('acc').value.toUpperCase():null;
  else if(t.id==='acc')st.accent=t.value.toUpperCase();
  else if(t.id==='grOn')st.grain=t.checked?Number($('gr').value):null;
  else return;
  controls();outputs();
});
$('gr').addEventListener('input',(e)=>{st.grain=Number(e.target.value);$('grV').textContent=st.grain;outputs();});
document.querySelectorAll('button.copy').forEach((b)=>b.addEventListener('click',async()=>{try{await navigator.clipboard.writeText($(b.dataset.for).textContent);b.textContent='Copied';}catch(err){b.textContent='Select and copy';}setTimeout(()=>{b.textContent='Copy';},1500);}));
render();
</script>
`;
```

`LOOKBOOK` объявлен через `const` ниже функции, но читается только при вызове, поэтому порядок объявления не важен. Экспорт: `module.exports = { findThemes, listThemes, parseOverrides, mixHex, apply, summary, lookbook };`

- [ ] **Step 3: тесты зелёные**: `node --test skills/procedural-film/foundation/tools/theme.test.cjs` → `# pass 8`.

- [ ] **Step 4: посмотреть страницу**: `node skills/procedural-film/foundation/tools/theme.cjs lookbook --out .tmp/lookbook.html`, открыть в Playwright (`playwright-cli`) на 1280 и 400 px: пять карточек; клик по `phosphor` ставит carrier `crt (theme)`; при acc #3AA0FF и frame 1080x1920 строка брифа `Style: phosphor; frame 1080x1920; accent #3AA0FF`, у `house` чекбокс акцента выключен; нет горизонтального скролла на 400 px.

- [ ] **Step 5: синхронизировать копии, commit** `feat(tools): theme.cjs lookbook, one page to pick a style`

---

### Task 4: превью тем

**Files:** Create: `skills/procedural-film/themes/{house,negative,phosphor,shards,blob}/preview.jpg`

Кадры берутся из fixtures-фильма: у каждой темы там есть шоты плана A и плана B.

| Тема | `--times` (план A, план B) |
|---|---|
| house | `1.25,3.5` (lib-showcase, fx-egg) |
| negative | `42.5,43.5` (fx-negative, fx-negative-inv) |
| phosphor | `44.5,45.75` (fx-phosphor, fx-phosphor-on) |
| shards | `46.5,47.6` (fx-shards, fx-polygon) |
| blob | `48.6,49.4` (fx-blob) |

- [ ] **Step 1: снять листы**

```bash
cd skills/procedural-film/foundation
for p in house:1.25,3.5 negative:42.5,43.5 phosphor:44.5,45.75 shards:46.5,47.6 blob:48.6,49.4; do
  id=${p%%:*}; t=${p#*:}
  node tools/snap.cjs --fixtures --times $t --sheet --cols 2 --out .tmp/preview-$id
done
ls .tmp/preview-*/*-sheet.png
```

Expected: пять `*-sheet.png`.

- [ ] **Step 2: посмотреть каждый лист глазами** (Read по PNG). На каждом кадре видна тема, а не пустой план. Если кадр пустой или ещё рисуется (draw-on), сдвинуть время на +0.3 с и снять заново.

- [ ] **Step 3: сжать в jpg**

```bash
for id in house negative phosphor shards blob; do
  ffmpeg -y -loglevel error -i .tmp/preview-$id/*-sheet.png -vf scale=720:-2 -q:v 4 ../themes/$id/preview.jpg
done
ls -la ../themes/*/preview.jpg
```

Expected: пять файлов, каждый ≤ 200 KB.

- [ ] **Step 4: пересобрать лукбук и проверить, что карточки с картинками**, затем commit `feat(skill): theme previews from the fixture plates`

---

### Task 5: гейт замечает расхождение со стилем

**Files:** Modify: `skills/procedural-film/foundation/tools/check.cjs` (check 4, сразу после `carrierProblems(TL.raw.carrier, 'timeline carrier');`)

- [ ] **Step 1: воспроизвести до правки.** Во временной копии `films/indigo-bunting-stars` (скопировать папку в `.tmp/drift-film` без `node_modules`, симлинк `tools/node_modules`) поставить в `docs/theme.json` `"frame": {"width": 1080, "height": 1920}`. Run: `node .tmp/drift-film/tools/check.cjs --canvas-skip --flash-skip`. Expected: в check 4 ни одного предупреждения о `docs/theme.json`.

- [ ] **Step 2: вставить**

```js
    // the style picked at step 3 (docs/theme.json, written by tools/theme.cjs) sets the frame and the carrier
    const themeFile = path.join(C.ROOT, 'docs', 'theme.json');
    if (!fixtures && fs.existsSync(themeFile)) {
      let th = null;
      try {
        th = JSON.parse(fs.readFileSync(themeFile, 'utf8'));
      } catch (e) {
        tlWarnings.push(`docs/theme.json: ${e.message}`);
      }
      if (th && th.frame && (th.frame.width !== TL.width || th.frame.height !== TL.height)) {
        tlWarnings.push(`frame ${TL.width}×${TL.height} differs from docs/theme.json (${th.frame.width}×${th.frame.height}): rerun tools/theme.cjs apply with --frame, or set the timeline's width and height`);
      }
      const want = th && th.carrier ? th.carrier.kind : 'none';
      const have = TL.raw.carrier && TL.raw.carrier.kind ? TL.raw.carrier.kind : 'none';
      if (th && want !== have) tlWarnings.push(`timeline carrier ${have} differs from docs/theme.json (${want})`);
    }
```

- [ ] **Step 3: проверить.** Тот же прогон теперь показывает `warn: frame 1920×1080 differs from docs/theme.json (1080×1920)`, check 4 даёт WARN, а не FAIL. Вернуть frame и прогнать: предупреждения нет. Удалить `.tmp/drift-film`.

- [ ] **Step 4: регрессия**

```bash
node skills/procedural-film/foundation/tools/check.cjs --fixtures
node examples/butterfly-life/tools/check.cjs
node films/indigo-bunting-stars/tools/check.cjs
```

Expected: exit 0 у всех трёх (check 6 на butterfly-life даёт известный WARN).

- [ ] **Step 5: синхронизировать копии, commit** `feat(gate): warn when the timeline drifts from docs/theme.json`

---

### Task 6: документация — выбор стиля на шаге 0, применение на шаге 3

**Files:** Modify: `skills/procedural-film/SKILL.md`, `skills/procedural-film/themes/INDEX.md`, `skills/procedural-film/templates/art-bible.md`, `CLAUDE.md`

- [ ] **Step 1: SKILL.md, шаг 0.** Заменить абзац и Done when:

```markdown
Ask one round of questions: the subject, what the film must include about it, the length if it differs from 30 seconds, and the style direction. For the style, give the user the lookbook: `node <skill>/foundation/tools/theme.cjs lookbook --out <scratch>/lookbook.html` writes one page with every theme's preview, where the user picks a theme and the axes a film may override (frame, carrier, accent, grain) and copies back one `Style:` line, e.g. `Style: negative; frame 1080x1920; accent #3AA0FF`. Publish or open the page; in a plain terminal show `node <skill>/foundation/tools/theme.cjs list` instead. No answer means `house` at its own defaults. Invent the rest and say what you invented.

Done when: the subject is one written sentence and the style one `Style:` line, both seen by the user.
```

- [ ] **Step 2: SKILL.md, шаг 3.** Первый абзац и четыре пункта списка заменить на:

````markdown
Apply the brief's `Style:` line. With none, apply `house`, unless the subject calls for another theme: then say which and why in one line. A `draft` theme only within what its `needs` allow.

```bash
node tools/theme.cjs apply <id> [--frame WxH] [--carrier none|crt] [--accent #RRGGBB] [--grain 0..1]
```

It pastes the theme's sections 1–9 into `docs/art-bible.md` (headed by a Film overrides note when an axis changes), the theme's palette rows inside the 2.2 markers of `src/lib.js` (the accent rows recoloured) and the resolved `docs/theme.json`, and prints the timeline's `width`, `height` and `carrier` and each plate's `mode`, `post` and `grade`, which step 5 takes as they are. Rerun it to switch theme: sections 1–9 and the theme rows are swapped, the subject rows stay. `node tools/theme.cjs show` prints the applied style again. Line, tone and motion are not overrides: for another line, pick another theme or run a reference analysis.
````

- [ ] **Step 3: SKILL.md, шаг 5.** В абзаце шага 5 добавить: `Take width, height, carrier and each plate's mode, post and grade from node tools/theme.cjs show; check 4 warns when the timeline drifts from docs/theme.json.`

- [ ] **Step 4: INDEX.md.** В список «Each theme folder holds» добавить `preview.jpg` (лист план A / план B из fixtures, для лукбука; это не планка качества, в отличие от `example-*.jpg`) и в описание `theme.json` поля `look` и `accent` (`base`/`hot`/`deep` — имена строк палитры, которые перекрашивает `--accent`; у house их нет). Раздел «Picking a theme» заменить:

```markdown
## Picking a style

- Step 0 shows the lookbook (`tools/theme.cjs lookbook`) or `tools/theme.cjs list`; the user answers with one `Style:` line.
- Step 3 applies it: `node tools/theme.cjs apply <id> [--frame WxH] [--carrier none|crt] [--accent #RRGGBB] [--grain 0..1]`.
- A theme fixes line, tone, motion, plate B, font, match cuts and overlays. Frame, carrier, accent and grain hold across themes and may be overridden per film; `docs/theme.json` records the overrides and check 4 warns when the timeline leaves them.
- Pick `house` unless the user names another look or the subject calls for one; say which theme you picked and why in one line.
- A `draft` theme is usable only within what its `status` and `needs` allow. Tell the user what is missing.
- If no theme fits, run a reference analysis (`templates/reference-analysis.md`) and write sections 1 to 9 by hand; a look that proves itself on a finished film becomes a new theme folder with its own `preview.jpg`.
```

- [ ] **Step 5: templates/art-bible.md.** Строку 11 заменить на `<!-- PASTE themes/<id>/art-bible-1-9.md HERE (sections 1 to 9): node tools/theme.cjs apply <id> does it -->`. Проверить, что регэксп `paste` в `theme.cjs` (`HERE[^>]*-->`) её находит: `node --test skills/procedural-film/foundation/tools/theme.test.cjs` → pass 8.

- [ ] **Step 6: CLAUDE.md.** В Commands добавить:

```bash
node examples/butterfly-life/tools/theme.cjs list                 # themes: frame, carrier, accent, look
node examples/butterfly-life/tools/theme.cjs lookbook --out .tmp/lookbook.html  # pick a style and its overrides
node --test examples/butterfly-life/tools/theme.test.cjs          # tools/theme.cjs on a throwaway film
```

Фразу «There is no unit-test suite» заменить на «The gate (`check.cjs`) is the test, plus `tools/theme.test.cjs` for the theme tool».

- [ ] **Step 7: commit** `docs(skill): the style direction at step 0, theme.cjs at step 3`

---

### Task 7: сквозная проверка на новом фильме

- [ ] **Step 1: собрать фильм-песочницу**

```bash
S=/private/tmp/claude-501/-Users-codegeek-src-procedural-film/b744c710-536d-4e88-acdb-a18ff892d8e0/scratchpad/style-e2e
rm -rf $S && mkdir -p $S && rsync -a --exclude node_modules skills/procedural-film/foundation/ $S/
ln -s $PWD/skills/procedural-film/foundation/tools/node_modules $S/tools/node_modules
mkdir -p $S/docs && cp skills/procedural-film/templates/*.md $S/docs/
cp skills/procedural-film/foundation/tools/fixtures/timeline.js $S/src/timeline.js
```

- [ ] **Step 2: применить стиль с переопределениями**

Run: `PF_THEMES=$PWD/skills/procedural-film/themes node $S/tools/theme.cjs apply phosphor --frame 1080x1920 --accent #FF4F3A --grain 0.2`
Expected: вывод `theme phosphor ..., overrides: frame, accent, grain`, `timeline: width: 1080, height: 1920, carrier: {"kind":"crt"}`, два плана с `post 0.2`.

- [ ] **Step 3: палитра в снимке.** Run: `node $S/tools/snap.cjs --fixtures --shot palette --samples 1 --sheet` и посмотреть лист: есть `phos`, `amber` и оттенок `#FF4F3A`.

- [ ] **Step 4: заглушки в цветах темы.** Короткий timeline (два шота по 2 с, `mode: 'schematic'`, `width: 1080, height: 1920, carrier: { kind: 'crt' }`) в `$S/src/timeline.js`, затем `node $S/tools/stubgen.cjs` и `node $S/tools/check.cjs --canvas-skip`. Expected: exit 0, в check 4 нет предупреждения о `docs/theme.json`. Поменять в timeline `carrier` на `false` и прогнать снова: `warn: timeline carrier none differs from docs/theme.json (crt)`.

- [ ] **Step 5: переключить тему.** `apply blob` поверх: `docs/art-bible.md` содержит `## 1. Frame` один раз, в `src/lib.js` нет `phos:`, есть `pool:`.

- [ ] **Step 6: полный регресс и сверка копий**

```bash
node --test skills/procedural-film/foundation/tools/theme.test.cjs
node skills/procedural-film/foundation/tools/check.cjs --fixtures
node examples/butterfly-life/tools/check.cjs
for d in examples/butterfly-life films/arctic-tern-life films/indigo-bunting-stars films/zero-gravity; do diff -r -x node_modules skills/procedural-film/foundation/tools $d/tools; done
```

Expected: тесты pass, оба гейта exit 0, `diff` пустой.

- [ ] **Step 7: опубликовать лукбук** как artifact (`tools/theme.cjs lookbook --out <scratch>/lookbook.html`, затем Artifact publish) и дать ссылку пользователю.

---

## Не входит в план

- Смешивание линии, тона и движения из разных тем. Для этого art bible надо резать на фрагменты по осям с ролями палитры вместо имён, а это рефакторинг всех пяти тем. Путь к такому выбору сейчас один: новая тема.
- Новые носители (`vhs`, `film`, `xerox`) и вторая волна тем (`snow`, `drybrush`, `relief`, `crater`). Когда они появятся, `CARRIERS` в `theme.cjs` и лукбук подхватят их без правки механизма: достаточно добавить kind в список и тему в папку.
- `extends` между темами и смена темы по актам.
