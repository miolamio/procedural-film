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
