#!/usr/bin/env node
// snap.cjs : render PNG stills and contact sheets headlessly.
//
//   node tools/snap.cjs --times 1.0,2.5 --out .frames/check     stills at global times
//   node tools/snap.cjs --shot egg-blueprint --samples 6 --sheet  frames spread over one shot plus a contact sheet
//   node tools/snap.cjs --shot egg-blueprint --only               load only core, lib, timeline and this shot's file
//   node tools/snap.cjs                                           middle frame of every shot plus a sheet
//
// Options:
//   --times a,b,c   global seconds (with --shot: seconds from the shot's start)
//   --shot id       restrict to one shot
//   --samples N     N frames spread evenly from the first to the last frame (of the shot or the film)
//   --sheet         also write one contact sheet PNG with the time under each frame
//   --cols N        contact sheet columns (default: up to 6)
//   --only          with --shot: load only core, lib, timeline and that shot's file
//                   (a fade, iris or wipe in from the unloaded previous shot shows this shot alone)
//   --out path      output directory (relative to the project root), or a .png path for a single frame
//   --scale s       render scale (default 1 = the timeline frame)
//   --fixtures      use tools/fixtures instead of src
//   --crop x,y,w,h  also write that region of every frame at render resolution (frame px); separate
//                   several regions with ';' ("--crop '300,500,480,480;600,1200,300,300'"): the native-scale
//                   evidence of the three-scale review, next to the full frame and the contact sheet
//   --geo a,b       stroke those FILM.GEO entries (src/geo.js) over every frame in magenta: silhouettes, polylines,
//                   named points. Snap both sides of a match cut with the same --geo to compare them.
'use strict';

const fs = require('fs');
const path = require('path');
const C = require('./common.cjs');

async function main() {
  const args = C.parseArgs(process.argv.slice(2), ['sheet', 'only', 'fixtures']);
  const fixtures = typeof args.fixtures === 'string' ? args.fixtures : !!args.fixtures;
  const scale = args.scale ? Number(args.scale) : 1;
  const shotId = typeof args.shot === 'string' ? args.shot : null;
  if (args.only && !shotId) C.die('--only needs --shot <id>');

  const src = C.sources({ fixtures, only: args.only ? shotId : null, player: true });
  for (const w of src.warnings) console.log(`[warn] ${w}`);
  const TL = src.timeline;
  const FPS = C.FPS;
  const shot = shotId ? TL.shots.find((s) => s.id === shotId) : null;
  if (shotId && !shot) C.die(`no shot '${shotId}'. Ids: ${TL.shots.map((s) => s.id).join(', ')}`);

  const lastFrameT = (a, b) => Math.max(a, (Math.round(b * FPS) - 1) / FPS);
  let times = [];
  if (args.times) {
    times = String(args.times).split(',').map((x) => Number(x.trim())).filter((x) => isFinite(x));
    if (shot) {
      const span = shot.end - shot.start;
      const bad = times.filter((x) => x < -0.25 || x > span + 0.25);
      if (bad.length) C.die(`--times with --shot counts from the shot's start: '${shot.id}' spans local 0..${span.toFixed(3)}s (global ${shot.start}..${shot.end}); got ${bad.join(', ')}. For global times, drop --shot.`);
      times = times.map((x) => shot.start + x);
    }
    if (!times.length) C.die('--times had no numbers');
  } else if (args.samples) {
    const n = Math.max(1, Math.floor(Number(args.samples)));
    const a = shot ? shot.start : 0;
    const b = lastFrameT(a, shot ? shot.end : TL.duration);
    const fa = Math.round(a * FPS), fb = Math.round(b * FPS);
    for (let i = 0; i < n; i++) times.push((n === 1 ? Math.round((fa + fb) / 2) : Math.round(fa + ((fb - fa) * i) / (n - 1))) / FPS);
  } else if (shot) {
    times = [Math.round(((shot.start + lastFrameT(shot.start, shot.end)) / 2) * FPS) / FPS];
  } else {
    times = TL.shots.map((s) => Math.round(((s.start + lastFrameT(s.start, s.end)) / 2) * FPS) / FPS);
    if (args.sheet === undefined) args.sheet = true;
  }

  const outArg = typeof args.out === 'string' ? args.out : '.frames';
  const singleFile = outArg.toLowerCase().endsWith('.png');
  const outPath = C.resolveOut(outArg);
  const outDir = singleFile ? path.dirname(outPath) : outPath;
  fs.mkdirSync(outDir, { recursive: true });
  const prefix = (shot ? shot.id : fixtures ? 'fixtures' : 'film') + (args.only ? '-only' : '');
  const crops = typeof args.crop === 'string'
    ? args.crop.split(';').filter((x) => x.trim()).map((x) => {
        const v = x.split(',').map((n) => Number(n.trim()));
        if (v.length !== 4 || !v.every((n) => isFinite(n)) || v[2] <= 0 || v[3] <= 0) C.die(`--crop wants x,y,w,h in frame px; got '${x}'`);
        return v;
      })
    : [];
  const geoIds = typeof args.geo === 'string' ? args.geo.split(',').map((x) => x.trim()).filter(Boolean) : [];
  if (args.geo && !geoIds.length) C.die('--geo needs entry ids, e.g. --geo G1');

  const browser = await C.launch();
  const t0 = Date.now();
  let failed = false;
  const written = [];
  try {
    const pg = await C.openPage(browser, src.files, { scale, prefix: 'snap', only: args.only ? shotId : null, frameWidth: TL.width, frameHeight: TL.height });
    const loadProblems = [...pg.loadErrors.map((e) => `${e.file}:${e.line}:${e.col} ${e.message}`), ...pg.state.regErrors];
    if (loadProblems.length) {
      failed = true;
      console.log('[error] while loading scripts:');
      for (const p of loadProblems) console.log('  ' + p);
    }
    if (!pg.info) {
      await pg.close();
      C.die('FILM or FILM.TIMELINE did not initialise in the page (see errors above)');
    }
    const cols = args.cols ? Number(args.cols) : Math.min(times.length, 6);
    if (args.sheet) await pg.page.evaluate(([n, c]) => window.__h.sheetInit(n, c, 270, 46), [times.length, cols]);

    for (let i = 0; i < times.length; i++) {
      const T = times[i];
      const r = await pg.page.evaluate((T) => window.__h.render(T), T);
      if (geoIds.length) {
        const err = await pg.page.evaluate((ids) => {
          try {
            window.__h.overlayGeo(ids);
            return null;
          } catch (e) {
            return e.message;
          }
        }, geoIds);
        if (err) C.die(`--geo: ${err}`);
      }
      const png = Buffer.from(await pg.page.evaluate(() => window.__h.png()), 'base64');
      const name = singleFile && times.length === 1 && !args.sheet ? path.basename(outPath) : `${prefix}-T${C.fmtT(T).padStart(7, '0')}.png`;
      const file = path.join(outDir, name);
      fs.writeFileSync(file, png);
      written.push(file);
      for (const [x, y, w, h] of crops) {
        const cf = file.replace(/\.png$/i, '') + `-crop-${x}_${y}_${w}x${h}.png`;
        fs.writeFileSync(cf, Buffer.from(await pg.page.evaluate((b) => window.__h.cropPng(...b), [x, y, w, h]), 'base64'));
        written.push(cf);
      }
      const sh = TL.shots.find((s) => s.id === r.shot);
      const local = sh ? T - sh.start : 0;
      console.log(`T=${C.fmtT(T)}  f${String(Math.floor(T * FPS + 1e-6)).padStart(4, '0')}  ${r.shot}  t=${local.toFixed(3)}  ${r.ms.toFixed(0)}ms  -> ${file}`);
      for (const e of r.errors) {
        failed = true;
        console.log(`  [error] ${e.message}`);
        if (e.stack) console.log('    ' + e.stack.split('\n').slice(1, 4).join('\n    '));
      }
      if (args.sheet) {
        await pg.page.evaluate(
          ([i, l]) => window.__h.sheetAdd(i, l),
          [i, [`T ${T.toFixed(3)}s  f${Math.floor(T * FPS + 1e-6)}`, `${r.shot} t=${local.toFixed(2)}`]]
        );
      }
    }
    if (args.sheet) {
      const file = singleFile ? outPath : path.join(outDir, `${prefix}-sheet.png`);
      fs.writeFileSync(file, Buffer.from(await pg.page.evaluate(() => window.__h.sheetPng()), 'base64'));
      written.push(file);
      console.log(`sheet -> ${file}`);
    }
    for (const e of pg.pageErrors) {
      failed = true;
      console.log(`[error] page: ${e}`);
    }
    await pg.close();
  } finally {
    await browser.close();
  }
  console.log(`${written.length} file(s) in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e && e.stack ? e.stack : e);
  process.exit(2);
});
