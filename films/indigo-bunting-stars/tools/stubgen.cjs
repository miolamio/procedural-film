#!/usr/bin/env node
// stubgen.cjs : generate one placeholder scene file per timeline shot, so the whole film
// can be checked and rendered before any real scene exists (the stub pass).
//
//   node tools/stubgen.cjs      writes src/scenes/NN-<id>.js for every shot in src/timeline.js
//
// Overwrites existing scene files — run it before scene work starts, never after.
// A shot listed in a profile or outline entry of src/geo.js draws that silhouette instead of the placeholder
// ellipse, so the draft already shows every match cut landing and check 7 measures it from the first run.
// With docs/theme.json from a theme other than house, every stub draws that theme's plate colours instead.
'use strict';
const fs = require('fs');
const path = require('path');
const C = require('./common.cjs');
const TL = C.loadTimeline(path.join(C.SRC, 'timeline.js'));
const dir = path.join(C.SRC, 'scenes');
const geoFile = path.join(C.SRC, 'geo.js');
const GEO = fs.existsSync(geoFile) ? C.loadGeo(geoFile, TL) : {};
const shapeOf = (id) => Object.keys(GEO).find((k) => GEO[k] && /^(profile|outline)$/.test(GEO[k].kind) && (GEO[k].shots || []).includes(id));
// docs/theme.json (copied from the skill's themes/<id>/ at step 3) colours the stubs per plate.
// Without it, or on the house theme, stubs draw the paper and blueprint plates.
const themeFile = path.join(C.ROOT, 'docs', 'theme.json');
let THEME = null;
if (fs.existsSync(themeFile)) {
  try { THEME = JSON.parse(fs.readFileSync(themeFile, 'utf8')); } catch (e) { C.die(`docs/theme.json: ${e.message}`); }
}
const PLATES = THEME && THEME.id !== 'house' ? Object.values(THEME.plates || {}).filter(Boolean) : [];
if (THEME && THEME.id !== 'house') {
  if (!PLATES.length) C.die(`docs/theme.json: theme '${THEME.id}' has no plates`);
  const libText = fs.readFileSync(path.join(C.SRC, 'lib.js'), 'utf8');
  for (const pl of PLATES) for (const k of ['base', 'line', 'text']) {
    if (!/^[A-Za-z_]\w*$/.test(pl[k] || '')) C.die(`docs/theme.json: plate '${pl.name}' needs a lib.pal name for '${k}'`);
    if (!new RegExp(`\\n\\s*${pl[k]}\\s*:`).test(libText)) C.die(`lib.pal has no '${pl[k]}' (theme '${THEME.id}', plate '${pl.name}'): run node tools/theme.cjs apply ${THEME.id}`);
  }
}
const plateOf = (mode) => PLATES.find((pl) => (/schem|blue/.test(mode) ? 'schematic' : 'illustrated') === pl.mode) || PLATES[0];
fs.mkdirSync(dir, { recursive: true });

const shape = (id, opts) => {
  const g = shapeOf(id);
  return g
    ? `L.inkPath(ctx, L.geo('${g}').outline(), { closed: true, smooth: false, ${opts} }); // ${g} from src/geo.js`
    : `L.inkPath(ctx, L.ellipsePts(info.W / 2, info.H * 860 / 1920, info.W * 300 / 1080, info.H * 400 / 1920, 72), { closed: true, ${opts} });`;
};

const illustrated = (nn, id) => `// STUB
// Placeholder for shot ${nn} '${id}' (illustrated). The scene agent replaces this whole file.
FILM.scene({
  id: '${id}',
  draw(ctx, t, info) {
    const L = info.lib, P = L.pal;
    const p = L.clamp(t / info.dur);
    const q = L.clamp(L.onTwos(t) / info.dur);
    const seed = L.hash('${id}');
    const cx = info.W / 2, cy = info.H * 860 / 1920;
    L.paper(ctx);
    ${shape(id, 'width: 5, seed: seed + 1, double: true')}
    L.inkLine(ctx, info.W * 140 / 1080, info.H * 1300 / 1920, info.W * 940 / 1080, info.H * 1300 / 1920, { width: 3, seed: seed + 2 });
    L.inkCircle(ctx, info.W * 240 / 1080 + info.W * 600 / 1080 * q, info.H * 1230 / 1920, 44, { width: 3, seed: seed + 3, fill: P.orange });
    L.text(ctx, 'STUB ${nn}', cx, info.H * 330 / 1920, { size: 60, weight: 600, align: 'center', color: P.annMagenta });
    L.text(ctx, info.shot.title || '${id}', cx, info.H * 1420 / 1920, { size: 44, align: 'center', color: P.ink });
    L.text(ctx, '${id}', cx, info.H * 1480 / 1920, { size: 30, align: 'center', color: P.inkSoft });
    if (p > 0.01) L.inkLine(ctx, info.W * 140 / 1080, info.H * 1530 / 1920, info.W * 140 / 1080 + info.W * 800 / 1080 * p, info.H * 1530 / 1920, { width: 4, color: P.annBlue, seed: seed + 4, taper: 0 });
  },
});
`;

const schematic = (nn, id) => `// STUB
// Placeholder for shot ${nn} '${id}' (schematic). The scene agent replaces this whole file.
FILM.scene({
  id: '${id}',
  draw(ctx, t, info) {
    const L = info.lib, P = L.pal;
    const p = L.clamp(t / info.dur);
    const cx = info.W / 2, cy = info.H * 860 / 1920;
    L.blueprint(ctx);
    L.guideCircle(ctx, cx, cy, info.W * 340 / 1080, { alpha: 0.4 });
    ${shapeOf(id) ? shape(id, `width: 3, color: P.lavender, seed: L.hash('${id}')`) : '// (no shared silhouette)'}
    L.glowDot(ctx, cx, cy, 10 + 8 * p, { rays: 12, rot: p * Math.PI });
    L.text(ctx, 'STUB ${nn}', cx, info.H * 330 / 1920, { size: 60, weight: 600, align: 'center', color: P.magenta });
    L.text(ctx, info.shot.title || '${id}', cx, info.H * 1420 / 1920, { size: 44, align: 'center', color: P.lavender });
    L.text(ctx, '${id}', cx, info.H * 1480 / 1920, { size: 30, align: 'center', color: P.lavender, alpha: 0.6 });
    ctx.fillStyle = P.lineWhite;
    ctx.fillRect(info.W * 140 / 1080, info.H * 1526 / 1920, info.W * 800 / 1080 * p, 6);
  },
});
`;

const themed = (nn, id, pl) => `// STUB
// Placeholder for shot ${nn} '${id}' (theme ${THEME.id}, plate ${pl.name}). The scene agent replaces this whole file.
FILM.scene({
  id: '${id}',
  draw(ctx, t, info) {
    const L = info.lib, P = L.pal;
    const p = L.clamp(t / info.dur);
    const S = FILM.safeArea(info.W, info.H), u = Math.min(info.W, info.H) / 1080;
    const cx = info.W / 2, cy = info.H / 2;
    ctx.fillStyle = P.${pl.base};
    ctx.fillRect(0, 0, info.W, info.H);
    ${shapeOf(id)
      ? `L.inkPath(ctx, L.geo('${shapeOf(id)}').outline(), { closed: true, smooth: false, width: 2.2, color: P.${pl.line}, seed: L.hash('${id}') }); // ${shapeOf(id)} from src/geo.js`
      : `L.inkPath(ctx, L.ellipsePts(cx, cy, 300 * u, 220 * u, 72), { closed: true, width: 2.2, color: P.${pl.line}, seed: L.hash('${id}') });`}
    L.text(ctx, 'STUB ${nn}', cx, S.y0 + 60 * u, { size: 60 * u, weight: 600, align: 'center', color: P.${pl.line} });
    L.text(ctx, info.shot.title || '${id}', cx, S.y1 - 90 * u, { size: 44 * u, align: 'center', color: P.${pl.text} });
    L.text(ctx, '${id}', cx, S.y1 - 44 * u, { size: 30 * u, align: 'center', color: P.${pl.text}, alpha: 0.6 });
    ctx.fillStyle = P.${pl.line};
    ctx.fillRect(S.x0, S.y1 - 12 * u, (S.x1 - S.x0) * p, 6 * u);
  },
});
`;

for (const s of TL.shots) {
  const nn = path.basename(s.file).slice(0, 2);
  const mode = String(s.mode).toLowerCase();
  const code = PLATES.length ? themed(nn, s.id, plateOf(mode)) : /schem|blue/.test(mode) ? schematic(nn, s.id) : illustrated(nn, s.id);
  const out = path.join(dir, path.basename(s.file));
  fs.writeFileSync(out, code);
  console.log(`${path.basename(s.file)}  ${mode}${shapeOf(s.id) ? `  ${shapeOf(s.id)}` : ''}`);
}
