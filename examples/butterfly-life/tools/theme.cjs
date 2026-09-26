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
//   --accent '#RRGGBB'                            the theme's accent rows; the # is optional, but quote the
//                                                 value so the shell doesn't read '#...' as a comment; hot
//                                                 and deep steps are derived from it
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
const HEX = /^#?[0-9a-fA-F]{6}$/;
const ROW_NAME = /^[A-Za-z_]\w*$/;

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
  const theme = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (theme.id !== id) throw new Error(`theme.json at ${dir}/${id} has id '${theme.id}', not '${id}': the folder name and the id must match`);
  for (const [k, v] of Object.entries(theme.accent || {})) {
    if (!ROW_NAME.test(v)) throw new Error(`theme '${id}' has an invalid accent.${k} row name '${v}' in theme.json`);
  }
  return theme;
}

function listThemes(dir) {
  return fs
    .readdirSync(dir)
    .filter((d) => fs.existsSync(path.join(dir, d, 'theme.json')))
    .map((d) => loadTheme(dir, d))
    .sort((a, b) => (a.id === 'house' ? -1 : b.id === 'house' ? 1 : a.id.localeCompare(b.id)));
}

// A bare `--flag` (no value) parses to `true`; `--flag=` parses to ''; `--flag ' '` parses to a
// whitespace-only string (and Number(' ') is 0, so left unchecked it would silently pass as a
// real value). None of these is a value.
function needValue(name, v) {
  if (v === true || String(v).trim() === '') throw new Error(`--${name} needs a value`);
}

function parseOverrides(args) {
  const o = {};
  if (args.frame !== undefined) {
    needValue('frame', args.frame);
    if (!FRAMES.includes(String(args.frame))) throw new Error(`--frame must be one of ${FRAMES.join(', ')}`);
    const [width, height] = String(args.frame).split('x').map(Number);
    o.frame = { width, height };
  }
  if (args.carrier !== undefined) {
    needValue('carrier', args.carrier);
    if (!CARRIERS.includes(String(args.carrier))) throw new Error(`--carrier must be one of ${CARRIERS.join(', ')}`);
    o.carrier = String(args.carrier);
  }
  if (args.accent !== undefined) {
    needValue('accent', args.accent);
    const v = String(args.accent);
    if (!HEX.test(v)) throw new Error("--accent must be a hex colour like '#FF4F3A' (the # is optional)");
    o.accent = `#${v.replace(/^#/, '')}`.toUpperCase();
  }
  if (args.grain !== undefined) {
    needValue('grain', args.grain);
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

/** The theme's own accent rows as they stand in palette.js right now, read before any override rewrites them. */
function originalAccentValues(theme, palText) {
  const rows = theme.accent || {};
  const out = {};
  if (rows.base) out[rows.base] = rowHex(palText, rows.base);
  if (rows.hot) out[rows.hot] = rowHex(palText, rows.hot);
  if (rows.deep) out[rows.deep] = rowHex(palText, rows.deep);
  return out;
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
  if (b < 0 || !(e > b)) throw new Error('src/lib.js has no // BEGIN 2.2 ... // END 2.2 markers');
  const tb = lines.findIndex((l, i) => i > b && i < e && /\/\/ BEGIN theme /.test(l));
  const te = lines.findIndex((l, i) => i > tb && i < e && /\/\/ END theme /.test(l));
  if (tb >= 0 && te < 0) throw new Error('src/lib.js has a // BEGIN theme marker inside the 2.2 markers without a matching // END theme');
  if (tb < 0 && te >= 0) throw new Error('src/lib.js has a // END theme marker inside the 2.2 markers without a matching // BEGIN theme');
  // The clash check runs on every apply, over the 2.2 lines outside the existing theme region
  // [tb, te] (that region is about to be replaced wholesale, so its own rows never clash).
  const names = rows.join('\n').match(/^\s*\w+(?=\s*:)/gm) || [];
  const outside = lines.slice(b, e).filter((_, i) => !(tb >= 0 && b + i >= tb && b + i <= te));
  const clash = names.map((n) => n.trim()).find((n) => outside.some((l) => new RegExp(`^\\s*${n}\\s*:`).test(l)));
  if (clash) throw new Error(`src/lib.js already has '${clash}' inside the 2.2 markers: theme rows pasted by hand. Remove them, then run apply again`);
  if (tb >= 0) {
    lines.splice(tb, te - tb + 1, ...rows);
    return lines.join('\n');
  }
  let at = b + 1;
  while (at < e && /^\s*\/\//.test(lines[at])) at++;
  lines.splice(at, 0, ...rows);
  return lines.join('\n');
}

function overrideNote(theme, o, original) {
  const parts = [];
  if (o.frame) {
    const k = Math.min(o.frame.width / theme.frame.width, o.frame.height / theme.frame.height);
    parts.push(`frame ${o.frame.width}×${o.frame.height} instead of ${theme.frame.width}×${theme.frame.height}: every pixel value below assumes the theme's frame, so scale it by ${+k.toFixed(4)}, keep the ratios and recompose section 1 for the new frame`);
  }
  if (o.accent) parts.push(`accent ${o.accent} instead of the theme's (${Object.entries(original).map(([n, h]) => `${n} ${h}`).join(', ')}); where section 2 names the old hex, read the new one`);
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

/** Drop overrides that match the theme's own value: not worth a note or an overrides.* record. */
function dropRedundantOverrides(theme, o, palText) {
  const out = Object.assign({}, o);
  if (out.frame && theme.frame && out.frame.width === theme.frame.width && out.frame.height === theme.frame.height) delete out.frame;
  if (out.carrier === 'none') {
    if (!theme.carrier) delete out.carrier;
  } else if (out.carrier && theme.carrier && theme.carrier.kind === out.carrier) {
    delete out.carrier;
  }
  if (out.grain !== undefined) {
    const posts = Object.values(theme.plates || {})
      .filter(Boolean)
      .map((pl) => pl.post);
    if (posts.length && posts.every((p) => p === out.grain)) delete out.grain;
  }
  if (out.accent && theme.accent && theme.accent.base && rowHex(palText, theme.accent.base) === out.accent) delete out.accent;
  return out;
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
  const pal = fs.readFileSync(path.join(dir, id, theme.palette || 'palette.js'), 'utf8');
  o = dropRedundantOverrides(theme, o, pal);
  const abFile = path.join(root, 'docs', 'art-bible.md');
  const libFile = path.join(root, 'src', 'lib.js');
  if (!fs.existsSync(abFile)) throw new Error('docs/art-bible.md is missing: copy the skill templates into docs/ first (step 1)');
  if (!fs.existsSync(libFile)) throw new Error('src/lib.js is missing: copy the skill foundation into src/ first (step 1)');
  const values = o.accent ? accentValues(theme, o.accent) : {};
  const sections = fs.readFileSync(path.join(dir, id, 'art-bible-1-9.md'), 'utf8');
  const lib = applyPalette(fs.readFileSync(libFile, 'utf8'), paletteBlock(theme, pal, values));
  const original = o.accent ? originalAccentValues(theme, pal) : {};
  const ab = applyArtBible(fs.readFileSync(abFile, 'utf8'), theme, sections, overrideNote(theme, o, original));
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
    `  timeline: width: ${t.frame.width}, height: ${t.frame.height}, carrier: ${t.carrier ? JSON.stringify(t.carrier) : 'none'}`,
  ];
  for (const [k, pl] of Object.entries(t.plates || {})) {
    if (pl) lines.push(`  plate ${k} '${pl.name}': mode '${pl.mode}'${pl.post !== undefined ? `, post ${pl.post}` : ''}${pl.grade ? `, grade ${JSON.stringify(pl.grade)}` : ''}`);
  }
  return lines.join('\n');
}

function listTable(dir) {
  const rows = listThemes(dir).map((t) => {
    const pal = fs.readFileSync(path.join(dir, t.id, t.palette || 'palette.js'), 'utf8');
    const acc = t.accent && t.accent.base ? rowHex(pal, t.accent.base) || 'missing' : 'fixed';
    return [t.id, `${t.frame.width}x${t.frame.height}`, t.carrier ? t.carrier.kind : 'none', acc, t.status, t.look || t.name];
  });
  const w = [0, 1, 2, 3, 4].map((i) => Math.max(...rows.map((r) => r[i].length), 7));
  return rows.map((r) => r.map((c, i) => (i < 5 ? c.padEnd(w[i]) : c)).join('  ')).join('\n');
}

function main() {
  const args = C.parseArgs(process.argv.slice(2));
  const [cmd, id] = args._;
  try {
    if (args.root !== undefined && typeof args.root !== 'string') throw new Error('--root needs a path');
    if (args.themes !== undefined && typeof args.themes !== 'string') throw new Error('--themes needs a path');
    if (args.out !== undefined && typeof args.out !== 'string') throw new Error('--out needs a path');
    const root = args.root ? path.resolve(args.root) : C.ROOT;
    const dir = findThemes(root, typeof args.themes === 'string' ? args.themes : null);
    if (cmd !== 'show' && !dir) throw new Error('no themes/ folder found: pass --themes <skill>/themes or set PF_THEMES');
    if (cmd === 'list') console.log(listTable(dir));
    else if (cmd === 'apply') console.log(summary(apply(root, dir, id, parseOverrides(args))));
    else if (cmd === 'show') {
      const f = path.join(root, 'docs', 'theme.json');
      if (!fs.existsSync(f)) throw new Error('no docs/theme.json yet: run node tools/theme.cjs apply <id>');
      console.log(summary(JSON.parse(fs.readFileSync(f, 'utf8'))));
    } else if (cmd === 'lookbook') {
      const html = lookbook(dir);
      const out = typeof args.out === 'string' ? path.resolve(args.out) : path.join(root, '.tmp', 'lookbook.html');
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, html);
      console.log(`lookbook -> ${out}`);
    } else throw new Error("usage: node tools/theme.cjs list | apply <id> [--frame WxH] [--carrier none|crt] [--accent '#RRGGBB'] [--grain 0..1] | show | lookbook [--out path]");
  } catch (e) {
    C.die(e.message);
  }
}

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
.card{display:flex;flex-direction:column;justify-content:flex-start;align-items:stretch;background:var(--card);border:2px solid var(--line);border-radius:10px;padding:0;overflow:hidden;cursor:pointer;text-align:left;color:inherit;font:inherit}
.card[aria-pressed="true"]{border-color:var(--pick)}
.card img{display:block;width:100%;aspect-ratio:9/8;object-fit:cover;background:#000}
.card .t{padding:10px 12px}.card b{display:block}.card span{color:var(--muted);font-size:13px}
.sw{display:flex;gap:3px;margin-top:6px}.sw i{width:14px;height:14px;border-radius:3px;border:1px solid var(--line)}
.panel{margin-top:22px;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:18px}
@media (max-width:760px){.panel{grid-template-columns:minmax(0,1fr)}}
fieldset{border:1px solid var(--line);border-radius:10px;padding:12px 14px;margin:0 0 12px}
legend{font-weight:600;padding:0 4px}label{margin-right:14px;white-space:nowrap}
dl{margin:8px 0 0;font-size:13px}dt{color:var(--muted)}dd{margin:0 0 6px}
pre{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:10px;white-space:pre-wrap;overflow-wrap:anywhere;margin:6px 0}
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
function cards(){$('cards').innerHTML=THEMES.map((t)=>'<button class="card" type="button" data-id="'+t.id+'" aria-pressed="'+(t===sel)+'">'+(t.preview?'<img alt="" src="'+t.preview+'">':'')+'<div class="t"><b>'+esc(t.name)+'</b><span>'+esc(t.id)+' · '+esc(dim(t))+' · '+esc(t.status)+'</span><br><span>'+esc(t.look)+'</span><div class="sw">'+t.swatches.map((h)=>'<i style="background:'+h+'"></i>').join('')+'</div></div></button>').join('');}
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
  if(st.accent&&st.accent!==sel.accent){parts.push('accent '+st.accent);flags.push("--accent '"+st.accent+"'");}
  if(st.grain!==null&&st.grain!==sel.grain){parts.push('grain '+st.grain);flags.push('--grain '+st.grain);}
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

module.exports = { findThemes, listThemes, parseOverrides, mixHex, apply, summary, lookbook };
if (require.main === module) main();
