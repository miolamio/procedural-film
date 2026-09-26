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
