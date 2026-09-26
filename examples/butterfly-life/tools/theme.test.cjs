// theme.test.cjs : node --test tools/theme.test.cjs — tools/theme.cjs on a throwaway film folder.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const T = require('./theme.cjs');

const THEMES = T.findThemes(path.resolve(__dirname, '..'));
const skip = !THEMES && 'no skill themes/ folder next to this film';
const BIN = path.join(__dirname, 'theme.cjs');

// Every mkdtempSync'd folder this file creates is tracked here and removed when the process exits,
// whichever test created it and whether or not it passed.
const tmpDirs = [];
function tmp(prefix) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tmpDirs.push(dir);
  return dir;
}
process.on('exit', () => {
  for (const d of tmpDirs) {
    try {
      fs.rmSync(d, { recursive: true, force: true });
    } catch {
      /* best effort */
    }
  }
});

function film() {
  const dir = tmp('pf-theme-');
  fs.mkdirSync(path.join(dir, 'src'));
  fs.mkdirSync(path.join(dir, 'docs'));
  fs.copyFileSync(path.join(THEMES, '..', 'foundation', 'src', 'lib.js'), path.join(dir, 'src', 'lib.js'));
  fs.copyFileSync(path.join(THEMES, '..', 'templates', 'art-bible.md'), path.join(dir, 'docs', 'art-bible.md'));
  return dir;
}
const read = (dir, f) => fs.readFileSync(path.join(dir, f), 'utf8');
const block22 = (lib) => lib.slice(lib.indexOf('// BEGIN 2.2'), lib.indexOf('// END 2.2'));

/** A minimal fake themes/ folder (its own INDEX.md, one theme). For loadTheme/listThemes edge cases. */
function fakeThemes(id, themeJson, extra = {}) {
  const dir = tmp('pf-themes-');
  fs.writeFileSync(path.join(dir, 'INDEX.md'), '# themes\n');
  const tDir = path.join(dir, id);
  fs.mkdirSync(tDir);
  fs.writeFileSync(path.join(tDir, 'theme.json'), JSON.stringify(themeJson));
  fs.writeFileSync(path.join(tDir, 'palette.js'), extra.palette || '    // no rows\n');
  fs.writeFileSync(path.join(tDir, 'art-bible-1-9.md'), extra.sections || '## 1. Frame\n');
  return dir;
}

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
  // a bare flag (--grain with no value) parses to `true`; `--grain=` parses to ''. Neither is a value.
  assert.throws(() => T.parseOverrides({ frame: true }), /--frame/);
  assert.throws(() => T.parseOverrides({ frame: '' }), /--frame/);
  assert.throws(() => T.parseOverrides({ carrier: true }), /--carrier/);
  assert.throws(() => T.parseOverrides({ carrier: '' }), /--carrier/);
  assert.throws(() => T.parseOverrides({ accent: true }), /--accent/);
  assert.throws(() => T.parseOverrides({ accent: '' }), /--accent/);
  assert.throws(() => T.parseOverrides({ grain: true }), /--grain/);
  assert.throws(() => T.parseOverrides({ grain: '' }), /--grain/);
  // a whitespace-only value (e.g. --grain ' ') is not a value either: Number(' ') is 0, so this must
  // be caught before the numeric/hex checks run, not left to silently parse as a real override.
  assert.throws(() => T.parseOverrides({ frame: ' ' }), /--frame/);
  assert.throws(() => T.parseOverrides({ carrier: ' ' }), /--carrier/);
  assert.throws(() => T.parseOverrides({ accent: ' ' }), /--accent/);
  assert.throws(() => T.parseOverrides({ grain: ' ' }), /--grain/);
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

test('--accent accepts a hex value without the leading #', { skip }, () => {
  assert.strictEqual(T.parseOverrides({ accent: '3aa0ff' }).accent, '#3AA0FF');
  assert.strictEqual(T.parseOverrides({ accent: '#3aa0ff' }).accent, '#3AA0FF');
});

test('switching themes is refused when a hand-added subject row clashes with the new theme', { skip }, () => {
  const dir = film();
  T.apply(dir, THEMES, 'shards', {});
  const libFile = path.join(dir, 'src', 'lib.js');
  // 'line' is not a shards row (so the first apply succeeds) but it is a negative row.
  fs.writeFileSync(libFile, read(dir, 'src/lib.js').replace(/(\n\s*\/\/ END 2\.2)/, "\n    line: '#123456',$1"));
  const before = read(dir, 'src/lib.js');
  assert.throws(() => T.apply(dir, THEMES, 'negative', {}), /already has 'line'/);
  assert.strictEqual(read(dir, 'src/lib.js'), before);
});

test('a lone // BEGIN theme without a matching // END theme is refused', { skip }, () => {
  const dir = film();
  const libFile = path.join(dir, 'src', 'lib.js');
  fs.writeFileSync(
    libFile,
    read(dir, 'src/lib.js').replace(/(\n\s*\/\/ END 2\.2)/, "\n    // BEGIN theme ghost (stray)\n    ghost: '#000000',$1")
  );
  const before = read(dir, 'src/lib.js');
  assert.throws(() => T.apply(dir, THEMES, 'negative', {}), /without a matching/);
  assert.strictEqual(read(dir, 'src/lib.js'), before);
});

test('a lone // END theme without a matching // BEGIN theme is refused', { skip }, () => {
  const dir = film();
  const libFile = path.join(dir, 'src', 'lib.js');
  fs.writeFileSync(
    libFile,
    read(dir, 'src/lib.js').replace(/(\n\s*\/\/ END 2\.2)/, "\n    // END theme ghost (stray)\n    ghost: '#000000',$1")
  );
  const before = read(dir, 'src/lib.js');
  assert.throws(() => T.apply(dir, THEMES, 'negative', {}), /without a matching \/\/ BEGIN theme/);
  assert.strictEqual(read(dir, 'src/lib.js'), before);
});

test('END 2.2 must be strictly after BEGIN 2.2', { skip }, () => {
  const dir = film();
  const libFile = path.join(dir, 'src', 'lib.js');
  const merged = read(dir, 'src/lib.js').replace(/\/\/ BEGIN 2\.2[\s\S]*?\/\/ END 2\.2/, '// BEGIN 2.2 // END 2.2');
  fs.writeFileSync(libFile, merged);
  assert.throws(() => T.apply(dir, THEMES, 'negative', {}), /BEGIN 2\.2[\s\S]*END 2\.2/);
});

test('a missing src/lib.js is refused with a friendly error', { skip }, () => {
  const dir = film();
  fs.rmSync(path.join(dir, 'src', 'lib.js'));
  assert.throws(() => T.apply(dir, THEMES, 'negative', {}), /src\/lib\.js is missing/);
});

test('an art bible with neither the PASTE marker nor a theme block is refused, lib.js untouched', { skip }, () => {
  const dir = film();
  const abFile = path.join(dir, 'docs', 'art-bible.md');
  fs.writeFileSync(abFile, read(dir, 'docs/art-bible.md').replace(/<!-- PASTE themes[\s\S]*?-->/, ''));
  const before = read(dir, 'src/lib.js');
  assert.throws(() => T.apply(dir, THEMES, 'negative', {}), /neither the template PASTE marker nor a theme block/);
  assert.strictEqual(read(dir, 'src/lib.js'), before);
});

test('applying the same theme and overrides twice is idempotent', { skip }, () => {
  const dir = film();
  const o = T.parseOverrides({ accent: '#3AA0FF', grain: '0.2' });
  T.apply(dir, THEMES, 'negative', o);
  const lib1 = read(dir, 'src/lib.js');
  const ab1 = read(dir, 'docs/art-bible.md');
  T.apply(dir, THEMES, 'negative', o);
  assert.strictEqual(read(dir, 'src/lib.js'), lib1);
  assert.strictEqual(read(dir, 'docs/art-bible.md'), ab1);
});

test('dropping --accent on a later apply restores the theme\'s own accent hex', { skip }, () => {
  const dir = film();
  T.apply(dir, THEMES, 'negative', T.parseOverrides({ accent: '#3AA0FF' }));
  T.apply(dir, THEMES, 'negative', {});
  const b = block22(read(dir, 'src/lib.js'));
  assert.match(b, /accent: '#FF9442'/);
  assert.doesNotMatch(b, /3AA0FF/i);
});

test('the override note names the theme\'s own accent hex, not the recoloured override', { skip }, () => {
  const dir = film();
  T.apply(dir, THEMES, 'negative', T.parseOverrides({ accent: '#3AA0FF' }));
  const ab = read(dir, 'docs/art-bible.md');
  // negative's palette.js has accent: '#FF9442', accentHot: '#FFD8A8', accentGlow: '#B8501A' before
  // any override; the note must name those, not the newly recoloured #3AA0FF-derived rows.
  assert.match(ab, /accent #3AA0FF instead of the theme's \(accent #FF9442, accentHot #FFD8A8, accentGlow #B8501A\)/);
  assert.doesNotMatch(ab, /theme's \(accent #3AA0FF/);
});

test('an override equal to the theme\'s own value is not recorded as an override', { skip }, () => {
  const dir = film();
  const t = T.apply(dir, THEMES, 'phosphor', T.parseOverrides({ carrier: 'crt', frame: '1920x1080' }));
  assert.strictEqual(t.overrides.carrier, undefined);
  assert.strictEqual(t.overrides.frame, undefined);
  assert.deepStrictEqual(t.carrier, { kind: 'crt' });
  assert.deepStrictEqual(t.frame, { width: 1920, height: 1080 });
  assert.doesNotMatch(read(dir, 'docs/art-bible.md'), /Film overrides/);
});

test('a theme.json whose id does not match its folder name is refused', () => {
  const dir = fakeThemes('foo', {
    id: 'bar',
    name: 'Mismatch',
    status: 'ready',
    frame: { width: 1080, height: 1920 },
    plates: {},
    palette: 'palette.js',
  });
  assert.throws(() => T.listThemes(dir), /has id 'bar'/);
});

test('an invalid accent row name in theme.json fails clearly instead of crashing a RegExp', () => {
  const dir = fakeThemes(
    'bad',
    {
      id: 'bad',
      name: 'Bad',
      status: 'ready',
      frame: { width: 1080, height: 1920 },
      plates: {},
      accent: { base: '(oops' },
      palette: 'palette.js',
    },
    { palette: "    accent: '#FF0000',\n" }
  );
  assert.throws(() => T.listThemes(dir), /invalid accent.*row name/);
});

test('listTable shows "missing" instead of crashing when an accent row is absent from palette.js', () => {
  const dir = fakeThemes(
    'ghosttheme',
    {
      id: 'ghosttheme',
      name: 'Ghost',
      status: 'ready',
      frame: { width: 1080, height: 1920 },
      plates: {},
      accent: { base: 'ghost' },
      palette: 'palette.js',
    },
    { palette: '    // no ghost row here\n' }
  );
  const r = spawnSync(process.execPath, [BIN, 'list', '--themes', dir], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /missing/);
});

test('--root and --themes reject a value-less flag', () => {
  const r1 = spawnSync(process.execPath, [BIN, 'list', '--root'], { encoding: 'utf8' });
  assert.notStrictEqual(r1.status, 0);
  assert.match(r1.stderr, /--root needs a path/);
  const r2 = spawnSync(process.execPath, [BIN, 'list', '--themes'], { encoding: 'utf8' });
  assert.notStrictEqual(r2.status, 0);
  assert.match(r2.stderr, /--themes needs a path/);
});

test('--out rejects a value-less flag', () => {
  const r = spawnSync(process.execPath, [BIN, 'lookbook', '--out'], { encoding: 'utf8' });
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stderr, /--out needs a path/);
});

test('lookbook embeds every theme and the brief line builder', { skip }, () => {
  const html = T.lookbook(THEMES);
  for (const t of T.listThemes(THEMES)) assert.ok(html.includes(`"id":"${t.id}"`), t.id);
  assert.doesNotMatch(html, /\/\*THEMES\*\//);
  assert.match(html, /<title>Style lookbook<\/title>/);
  assert.match(html, /node tools\/theme\.cjs apply/);
});

test('lookbook only emits accent/grain flags that differ from the theme\'s own value', { skip }, () => {
  const html = T.lookbook(THEMES);
  assert.match(html, /st\.accent&&st\.accent!==sel\.accent/);
  assert.match(html, /st\.grain!==null&&st\.grain!==sel\.grain/);
});

test('lookbook escapes the frame dimension string and wraps long text without breaking mid-word', { skip }, () => {
  const html = T.lookbook(THEMES);
  assert.match(html, /esc\(dim\(t\)\)/);
  assert.match(html, /overflow-wrap:anywhere/);
  assert.doesNotMatch(html, /word-break:break-all/);
});
