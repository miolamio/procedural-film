#!/usr/bin/env node
// check.cjs : automated checks. Exits non-zero on any failure.
//
//   node tools/check.cjs              the real film (src)
//   node tools/check.cjs --fixtures   the tool fixtures
//   node tools/check.cjs --shot <id>  one shot, loaded alone (core, lib, timeline, geo and its file): what a scene agent
//                                     runs while sibling scenes are half-written. Sources, draw, cost, determinism and
//                                     geometry cover that shot only; cost only warns (parallel agents load the machine).
//                                     The director runs the whole gate.
//
// Every run loads a snapshot of the source files taken at its start, so an edit saved mid-run cannot fail it.
//
//   1 media        the built HTML contains no forbidden media patterns, and no page requested any URL at run time
//   2 determinism  the first, middle and last frame of every shot, plus one frame inside each non-cut transition,
//                  hash identically warm forward, warm reversed, in a fresh page shuffled with decoys, cold (the first
//                  draw in a fresh page) and sequential (drawn straight after the frame before it)
//   3 sources      no Math.random, Date, performance.now or crypto randomness in src drawing/audio code;
//                  no text drawn below the Shorts safe area (a literal y argument > 1540; an expression is not read);
//                  warns on a literal colour outside lib.js (colours come from lib.pal)
//   4 timeline     coverage, ids, transitions; warns on off-grid hits and cuts, a bpm whose 16ths
//                  miss the frame grid, and a duration that is not whole bars
//   5 draw         every checked frame draws without throwing and is not one flat colour
//   6 cost         frame times from a sweep across the film; slowest frames listed; warns when a repeat of the
//                  sweep creates canvases again (a cache keyed by time, or one too small to hold the film)
//   7 geometry     src/geo.js (optional) is well formed and names real shots, and every profile or outline is
//                  measured on the rendered frames either side of each declared match cut: its edges must sit
//                  within --geo-tol px (default 12) of the table on most rows, or the cut jumps
//   8 lib          with --fixtures, run tools/fixtures/asserts/*.js (FILM.assert). No asserts directory → PASS
//                  "no asserts". A film check (no --fixtures) always reports "no asserts".
//
// Options: --scale s (default 1), --sweep N (every Nth frame, default 4), --det N (add N evenly spaced determinism
//          frames on top of the per-shot ones, default 0; never fewer than every shot),
//          --budget ms (fail if the slowest swept frame exceeds this; default: warn above 150 ms),
//          --geo-tol px (median edge offset allowed for check 7, in 1080-wide px; default 12)
'use strict';

const fs = require('fs');
const path = require('path');
const C = require('./common.cjs');
const { build } = require('./build.cjs');

const results = [];
function report(n, name, ok, summary, details = []) {
  const tag = ok === true ? 'PASS' : ok === false ? 'FAIL' : ok;
  results.push({ n, name, ok, tag, summary, details });
  console.log(`[${tag}] ${n} ${name}: ${summary}`);
  for (const d of details.slice(0, 40)) console.log(`       ${d}`);
  if (details.length > 40) console.log(`       ... ${details.length - 40} more`);
}

// Widest channel spread over the bare frame (grain post off, every 4th pixel): <= 6 means one flat
// colour. Sampling at full resolution keeps a small bright element, a spark or a glint, above the bar.
function flatness(pg, T) {
  return pg.page.evaluate((t) => {
    window.__h.render(t, { post: false }); // the grain post hides a blank frame behind its own noise
    const c = window.FILM.canvas;
    const d = window.FILM.ctx.getImageData(0, 0, c.width, c.height).data;
    const mn = [255, 255, 255];
    const mx = [0, 0, 0];
    for (let i = 0; i < d.length; i += 16) {
      for (let k = 0; k < 3; k++) {
        const v = d[i + k];
        if (v < mn[k]) mn[k] = v;
        if (v > mx[k]) mx[k] = v;
      }
    }
    return Math.max(mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]);
  }, T);
}

// Remove comments, keep strings (so a banned call hidden in a string still counts).
function stripComments(code) {
  let out = '';
  let i = 0;
  const n = code.length;
  while (i < n) {
    const c = code[i], d = code[i + 1];
    if (c === '/' && d === '/') {
      while (i < n && code[i] !== '\n') i++;
    } else if (c === '/' && d === '*') {
      i += 2;
      while (i < n && !(code[i] === '*' && code[i + 1] === '/')) {
        if (code[i] === '\n') out += '\n';
        i++;
      }
      i += 2;
    } else if (c === '"' || c === "'" || c === '`') {
      const q = c;
      out += c;
      i++;
      while (i < n && code[i] !== q) {
        if (code[i] === '\\') {
          out += code[i] + (code[i + 1] || '');
          i += 2;
          continue;
        }
        if (q !== '`' && code[i] === '\n') break;
        out += code[i];
        i++;
      }
      if (i < n) out += code[i];
      i++;
    } else {
      out += c;
      i++;
    }
  }
  return out;
}

const BANNED = [
  { name: 'Math.random', re: /Math\s*\.\s*random/g },
  { name: 'Date', re: /\bDate\b/g },
  { name: 'performance.now', re: /performance\s*\.\s*now/g },
  { name: 'crypto randomness', re: /crypto\s*\.\s*(getRandomValues|randomUUID)/g },
];

function seededShuffle(arr, seed) {
  let s = seed >>> 0;
  const rand = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return { a, rand };
}

async function main() {
  const args = C.parseArgs(process.argv.slice(2), ['fixtures']);
  const fixtures = typeof args.fixtures === 'string' ? args.fixtures : !!args.fixtures;
  const scale = args.scale ? Number(args.scale) : 1;
  const sweepStep = Math.max(1, Number(args.sweep || 4));
  const detExtra = Math.max(0, Math.floor(Number(args.det || 0)));
  const budget = args.budget ? Number(args.budget) : null;
  const geoTol = args['geo-tol'] ? Number(args['geo-tol']) : 12;
  const FPS = C.FPS;
  const t0 = Date.now();

  const shotId = typeof args.shot === 'string' ? args.shot : null;
  if (args.shot && !shotId) C.die('--shot needs a shot id');
  const src = C.sources({ fixtures, only: shotId, player: !shotId, lenient: true });
  const TL = src.timeline;
  // Lib asserts live beside the fixture film and are not part of a shipped film (build/render never load them).
  const assertDir = fixtures ? path.join(src.base, 'asserts') : null;
  const assertFiles = assertDir && fs.existsSync(assertDir)
    ? fs.readdirSync(assertDir).filter((f) => f.endsWith('.js')).sort().map((f) => path.join(assertDir, f))
    : [];
  // the shots this run is about: all of them, or the one scene agent's shot
  const SHOTS = shotId ? TL.shots.filter((s) => s.id === shotId) : TL.shots;
  const mine = (id) => !shotId || id === shotId;
  console.log(`check ${fixtures ? '(fixtures)' : '(src)'}${shotId ? ` --shot ${shotId}` : ''}: ${shotId ? `1 of ${TL.shots.length} shots` : `${TL.shots.length} shots`}, ${TL.duration}s, scale ${scale}`);
  for (const w of src.warnings) console.log(`[warn] ${w}`);
  if (shotId) console.log(`only '${shotId}' is loaded and checked; the full gate (no --shot) covers the film, its media and every other shot`);

  // ---------------------------------------------------------------- 3 sources (static)
  {
    const files = shotId
      ? [src.shotFile(SHOTS[0])]
      : [path.join(C.SRC, 'core.js'), path.join(C.SRC, 'lib.js'), path.join(src.base, 'timeline.js'), ...(src.geoFile ? [src.geoFile] : []), ...src.sceneFiles];
    files.push(...assertFiles);
    if (!shotId) {
      if (src.musicFile) files.push(src.musicFile);
      files.push(path.join(C.SRC, 'player.js'));
    }
    const hits = [];
    for (const f of files) {
      if (!fs.existsSync(f)) continue;
      const lines = stripComments(fs.readFileSync(f, 'utf8')).split('\n');
      lines.forEach((line, i) => {
        for (const b of BANNED) {
          b.re.lastIndex = 0;
          if (b.re.test(line)) hits.push(`${C.rel(f)}:${i + 1}  ${b.name}  | ${line.trim().slice(0, 100)}`);
        }
      });
    }
    // must-read text stays inside the Shorts safe area (art bible 1.1): flag .text() with a literal y > 1540
    const unsafeText = /\b(?:lib|L|LIB)\.text\s*\(\s*[^,]+,\s*[^,]+,\s*[^,]+,\s*(\d{3,4})/;
    for (const f of files) {
      if (!fs.existsSync(f)) continue;
      stripComments(fs.readFileSync(f, 'utf8')).split('\n').forEach((line, i) => {
        const m = line.match(unsafeText);
        if (m && Number(m[1]) > 1540) hits.push(`${C.rel(f)}:${i + 1}  text y ${m[1]} below the Shorts safe area (y must be <= 1540)  | ${line.trim().slice(0, 100)}`);
      });
    }
    // colours come from lib.pal (art bible 2.2): a literal hex in a scene or timeline file drifts from the palette
    const hexWarns = [];
    const literalColour = /#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})\b|['"`]\s*(?:rgba?|hsla?)\(/gi;
    for (const f of shotId ? files : [...src.sceneFiles, path.join(src.base, 'timeline.js')]) {
      if (!fs.existsSync(f)) continue;
      stripComments(fs.readFileSync(f, 'utf8')).split('\n').forEach((line, i) => {
        for (const m of line.matchAll(literalColour)) {
          hexWarns.push(`warn: ${C.rel(f)}:${i + 1}  literal colour ${m[0].trim()} outside lib.js (name it in lib.pal)  | ${line.trim().slice(0, 80)}`);
        }
      });
    }
    report(
      3,
      'sources',
      hits.length ? false : hexWarns.length ? 'WARN' : true,
      hits.length
        ? `${hits.length} banned call(s)`
        : `no Math.random / Date / performance.now / crypto randomness or unsafe-area text in ${files.length} files${hexWarns.length ? `; ${hexWarns.length} literal colour(s) outside lib.js` : ''}`,
      [...hits, ...hexWarns]
    );
  }

  // ---------------------------------------------------------------- 4 timeline (static part)
  const tlProblems = src.problems.filter((p) => !shotId || p.includes(`'${shotId}'`));
  const tlWarnings = [];
  const sixteenth = TL.bpm > 0 ? 15 / TL.bpm : 0; // 60/bpm is a beat; a 16th is a quarter of it
  const offGrid = (t) => sixteenth > 0 && Math.abs(t / sixteenth - Math.round(t / sixteenth)) > 1e-3;
  {
    const shots = TL.shots;
    const EPS = 1e-6;
    if (!shots.length) tlProblems.push('timeline has no shots');
    if (!TL.hasDuration) tlProblems.push('timeline has no "duration"');
    if (!(TL.duration > 0)) tlProblems.push(`duration is not positive (${TL.duration})`);
    const ids = new Set();
    shots.forEach((s, i) => {
      if (typeof s.id !== 'string' || !s.id) tlProblems.push(`shot #${i} has no id`);
      else if (ids.has(s.id)) tlProblems.push(`duplicate shot id '${s.id}'`);
      ids.add(s.id);
      if (!(s.dur > 0)) tlProblems.push(`shot '${s.id}' has non-positive length (${s.start}..${s.end})`);
      if (i === 0 && Math.abs(s.start) > EPS) tlProblems.push(`first shot '${s.id}' starts at ${s.start}, not 0`);
      if (i > 0) {
        const prev = shots[i - 1];
        const d = s.start - prev.end;
        if (d > EPS) {
          const msg = `gap of ${d.toFixed(4)}s between '${prev.id}' (ends ${prev.end}) and '${s.id}' (starts ${s.start})`;
          // Fixture showcases reserve a later slot (a sibling shot fills 8..10). A real film still fails a hole.
          if (fixtures) tlWarnings.push(msg);
          else tlProblems.push(msg);
        }
        if (d < -EPS) tlProblems.push(`overlap of ${(-d).toFixed(4)}s between '${prev.id}' (ends ${prev.end}) and '${s.id}' (starts ${s.start})`);
      }
      if (Math.abs(s.start * FPS - Math.round(s.start * FPS)) > 1e-4) tlWarnings.push(`shot '${s.id}' starts between frames (${s.start}s)`);
      if (offGrid(s.start)) tlWarnings.push(`shot '${s.id}' starts at ${s.start}s, off the 16th-note grid at ${TL.bpm} bpm`);
      const tr = s.transitionIn;
      if (tr) {
        const kinds = ['cut', 'fade', 'flash', 'iris', 'wipe'];
        if (!kinds.includes(tr.kind)) tlProblems.push(`shot '${s.id}' transitionIn kind '${tr.kind}' is not one of ${kinds.join(', ')}`);
        if (!(tr.dur >= 0) || tr.dur > s.dur) tlProblems.push(`shot '${s.id}' transitionIn dur ${tr.dur} must be between 0 and the shot length ${s.dur}`);
        if (i === 0 && tr.kind !== 'cut') tlWarnings.push(`shot '${s.id}' is first; its transitionIn is ignored`);
      }
      const m = String(s.mode || '').toLowerCase();
      if (!/illus|schem|blue|none|raw/.test(m)) tlWarnings.push(`shot '${s.id}' mode '${s.mode}' is neither illustrated nor schematic (treated as illustrated)`);
    });
    // every event sits on the beat grid (16ths at the film's bpm), so cuts and hits land together
    for (const c of TL.cues || []) {
      // the art bible binds pops, cuts and hits to the grid; a swell or ambience may lead into one
      const onGridKind = /^(hit|cut|pop)$/i.test(String(c.kind || ''));
      if (onGridKind && typeof c.t === 'number' && offGrid(c.t)) tlWarnings.push(`cue at ${c.t}s (kind ${c.kind}) is off the 16th-note grid at ${TL.bpm} bpm${c.note ? ` (${String(c.note).slice(0, 40)})` : ''}`);
    }
    if (TL.bpm > 0 && 360 % TL.bpm !== 0) tlWarnings.push(`bpm ${TL.bpm}: 16ths do not land on 24 fps frames (360 / bpm must be whole: 72, 90, 120, 180)`);
    const bar = TL.bpm > 0 ? 240 / TL.bpm : 0;
    if (bar > 0 && Math.abs(TL.duration / bar - Math.round(TL.duration / bar)) > 1e-3) {
      tlWarnings.push(`duration ${TL.duration}s is ${(TL.duration / bar).toFixed(2)} bars at ${TL.bpm} bpm, not a whole number of bars`);
    }
    if (shots.length && Math.abs(shots[shots.length - 1].end - TL.duration) > EPS) {
      tlProblems.push(`last shot '${shots[shots.length - 1].id}' ends at ${shots[shots.length - 1].end}, duration is ${TL.duration}`);
    }
  }

  // ---------------------------------------------------------------- 1 media (static part; reported after the pages ran)
  let mediaStatic = { hits: [], kb: '0' };
  const pagesOpened = [];
  {
    const tmpOut = path.join(C.TMP, C.uniqueName('check-build') + '.html');
    let html = '';
    let hits = [];
    if (shotId) {
      html = fs.readFileSync(src.shotFile(SHOTS[0]), 'utf8');
      hits = C.scanForbidden(html);
    } else try {
      const b = build({ fixtures, out: tmpOut, quiet: true, lenient: true });
      html = b.html;
      hits = b.hits;
    } catch (e) {
      hits = [{ pattern: 'build failed', line: 0, text: e.message }];
    } finally {
      fs.rmSync(tmpOut, { force: true });
    }
    mediaStatic = { hits, kb: (html.length / 1024).toFixed(1) };
  }

  // ---------------------------------------------------------------- 7 geometry (static part)
  let geo = null;
  const geoProblems = [];
  const geoWarnings = [];
  const geoRows = [];
  let geoFrames = [];
  if (src.geoFile) {
    try {
      geo = C.loadGeo(src.geoFile);
      const v = C.validateGeo(geo, TL);
      geoProblems.push(...v.problems);
      geoWarnings.push(...v.warnings);
      geoFrames = v.problems.length ? [] : v.frames.filter((fr) => !shotId || fr.label.startsWith(`${shotId} `));
      const hard = TL.shots.filter((s) => s.index > 0 && (!s.transitionIn || s.transitionIn.kind === 'cut' || !(s.transitionIn.dur > 0))).length;
      const covered = new Set(v.frames.filter((fr) => fr.cut).map((fr) => fr.cut)).size;
      if (!shotId) geoRows.push(`${covered} of ${hard} hard cuts are measured match cuts; every other cut is a free cut (list a match cut in an entry's cuts to hold it)`);
    } catch (e) {
      geoProblems.push(`${C.rel(src.geoFile)} failed to evaluate: ${e.message}`);
    }
  }

  if (!assertFiles.length) report(8, 'lib', true, 'no asserts');

  // ---------------------------------------------------------------- browser checks
  // snapshot every source file now: pages load the copies, so an agent saving a file mid-run changes nothing here
  const snapDir = path.join(C.TMP, C.uniqueName('check-src'));
  fs.mkdirSync(snapDir, { recursive: true });
  C.cleanupOnExit(snapDir);
  const loadable = src.files.filter((f) => fs.existsSync(f)).map((f) => {
    const copy = path.join(snapDir, path.basename(f)); // core names a scene's file by its basename, which stays
    fs.copyFileSync(f, copy);
    return copy;
  });
  // asserts/geo.js must not overwrite fixtures/geo.js in the flat snapshot
  for (const f of assertFiles) {
    const copy = path.join(snapDir, 'asserts', path.basename(f));
    fs.mkdirSync(path.dirname(copy), { recursive: true });
    fs.copyFileSync(f, copy);
    loadable.push(copy);
  }
  const openOpts = (prefix) => ({ scale, prefix, only: shotId });
  const browser = await C.launch();
  try {
    browserChecks: {
      const pg = await C.openPage(browser, loadable, openOpts('check'));
      pagesOpened.push(pg);
      const loadErr = pg.loadErrors.map((e) => `script error ${e.file}:${e.line}:${e.col} ${e.message}`);
      // 4 registration
      const reg = pg.state.registered;
      for (const shot of SHOTS) {
        if (!shot.file) continue;
        const want = path.basename(String(shot.file));
        const byId = reg.filter((r) => r.id === shot.id);
        if (!byId.length) {
          const inFile = reg.filter((r) => r.file === want).map((r) => r.id);
          tlProblems.push(`shot '${shot.id}': ${want} does not register it${inFile.length ? ` (it registers: ${inFile.join(', ')})` : ''}`);
        } else if (!byId.some((r) => r.file === want)) {
          tlProblems.push(`shot '${shot.id}' is registered by ${byId.map((r) => r.file).join(', ')}, not by its timeline file ${want}`);
        }
      }
      for (const r of reg) if (mine(r.id) && !TL.shots.some((s) => s.id === r.id)) tlWarnings.push(`${r.file} registers '${r.id}', which is not in the timeline`);
      tlProblems.push(...pg.state.regErrors, ...loadErr);
      report(
        4,
        'timeline',
        tlProblems.length ? false : tlWarnings.length ? 'WARN' : true,
        tlProblems.length
          ? `${tlProblems.length} problem(s)`
          : `${TL.shots.length} shots cover 0..${TL.duration}s with no gaps or overlaps; ${shotId ? `${path.basename(src.shotFile(SHOTS[0]))} registers '${shotId}'` : "every shot's file registers its id"}`,
        [...tlProblems, ...tlWarnings.map((w) => `warn: ${w}`)]
      );
      if (!pg.info) {
        report(5, 'draw', false, 'FILM did not initialise in the page', [...loadErr, ...pg.pageErrors]);
        if (assertFiles.length) report(8, 'lib', false, 'FILM did not initialise; asserts did not run', loadErr);
        await pg.close();
        break browserChecks;
      }

      // ---------------------------------------------------------------- 8 lib
      if (assertFiles.length) {
        const names = new Set(assertFiles.map((f) => path.basename(f)));
        const loadFail = pg.loadErrors.filter((e) => names.has(e.file));
        const rows = await pg.page.evaluate(() => window.__h.runAsserts());
        const bad = rows.filter((r) => !r.ok);
        const details = [
          ...loadFail.map((e) => `${e.file}:${e.line} failed to load: ${e.message}`),
          ...bad.map((r) => `${r.file}: ${r.name}: ${r.message}`),
        ];
        const ok = bad.length === 0 && loadFail.length === 0 && rows.length > 0;
        report(
          8,
          'lib',
          ok,
          ok
            ? `${rows.length} asserts`
            : !rows.length
              ? `assert files loaded but registered nothing${loadFail.length ? `; ${loadFail.length} script error(s)` : ''}`
              : `${bad.length} of ${rows.length} failed`,
          details
        );
      }

      // ---------------------------------------------------------------- 5 draw
      const drawFails = [];
      const timings = new Map(); // frame -> ms (warm)
      const firstTouch = [];
      let drawn = 0;
      for (const shot of SHOTS) {
        const f0 = Math.round(shot.start * FPS);
        const f1 = Math.round(shot.end * FPS) - 1;
        if (f1 < f0) continue;
        const fm = Math.floor((f0 + f1) / 2);
        for (const [label, f] of [['first', f0], ['middle', fm], ['last', f1]]) {
          const r = await pg.page.evaluate((T) => window.__h.render(T), f / FPS);
          drawn++;
          const softened = label === 'first' && shot.transitionIn && shot.transitionIn.kind !== 'cut';
          if (!softened && (await flatness(pg, f / FPS)) <= 6) {
            drawFails.push(`${shot.id} ${label} frame f${f} (T=${(f / FPS).toFixed(3)}) is one flat colour: a blank frame reads as a bug`);
          }
          if (label === 'first') firstTouch.push(`${shot.id} f${f} ${r.ms.toFixed(0)}ms`);
          if (r.shot !== shot.id) drawFails.push(`${shot.id} ${label} frame f${f}: active shot was '${r.shot}'`);
          for (const e of r.errors) {
            drawFails.push(`${shot.id} ${label} frame f${f} (T=${(f / FPS).toFixed(3)})${e.shot && e.shot !== shot.id ? ` [thrown by '${e.shot}' drawing into the transition]` : ''}: ${e.message}`);
            if (e.stack) drawFails.push('  ' + e.stack.split('\n').slice(1, 3).map((s) => s.trim()).join(' | '));
          }
        }
      }
      for (const e of pg.pageErrors) drawFails.push(`page error: ${e}`);
      report(5, 'draw', drawFails.length === 0, drawFails.length ? `${drawFails.length} error(s)` : `${drawn} frames (first, middle, last of ${shotId ? `'${shotId}'` : `${TL.shots.length} shots`}) drew without errors`, drawFails);

      // ---------------------------------------------------------------- 6 cost
      const total = Math.round(TL.duration * FPS);
      const sweepFrom = shotId ? Math.round(SHOTS[0].start * FPS) : 0;
      const sweepTo = shotId ? Math.round(SHOTS[0].end * FPS) : total; // exclusive
      const sweep = [];
      for (let f = sweepFrom; f < sweepTo; f += sweepStep) sweep.push(f);
      if (sweep[sweep.length - 1] !== sweepTo - 1) sweep.push(sweepTo - 1);
      const sweepErr = [];
      const canvasesAt = () => pg.page.evaluate(() => window.__h.canvases());
      const cv0 = await canvasesAt();
      for (const f of sweep) {
        const r = await pg.page.evaluate((T) => window.__h.render(T), f / FPS);
        timings.set(f, { ms: r.ms, shot: r.shot });
        for (const e of r.errors) sweepErr.push(`f${f} ${r.shot}: ${e.message}`);
      }
      // A warm repeat of the sweep should find every cache filled. Canvases created again mean a cache keyed
      // by time (it grows with the film) or an LRU too small for the film (it rebuilds plates while playing).
      const cvSweep = (await canvasesAt()) - cv0;
      let cvRepeat = 0;
      if (cvSweep > 0) {
        const cv1 = await canvasesAt();
        for (const f of sweep) await pg.page.evaluate((T) => window.__h.render(T), f / FPS);
        cvRepeat = (await canvasesAt()) - cv1;
      }
      const arr = [...timings.entries()].map(([f, v]) => ({ f, ...v })).sort((a, b) => b.ms - a.ms);
      const ms = arr.map((a) => a.ms).sort((a, b) => a - b);
      const median = ms[Math.floor(ms.length / 2)];
      const mean = ms.reduce((a, b) => a + b, 0) / ms.length;
      const max = arr[0].ms;
      const perShot = SHOTS.map((s) => {
        const xs = arr.filter((a) => a.shot === s.id).map((a) => a.ms);
        return xs.length ? `${s.id}: max ${Math.max(...xs).toFixed(0)}ms, mean ${(xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(0)}ms` : `${s.id}: not swept`;
      });
      const costDetails = [
        'slowest: ' + arr.slice(0, 6).map((a) => `f${a.f} (${(a.f / FPS).toFixed(2)}s ${a.shot}) ${a.ms.toFixed(0)}ms`).join(', '),
        ...perShot,
        'first touch per shot (includes cache builds): ' + firstTouch.join(', '),
        `canvases created: ${cvSweep} during the sweep, ${cvRepeat} on a warm repeat of it`,
        ...(cvRepeat > 0 ? [`warn: ${cvRepeat} canvas(es) re-created on a warm repeat of the sweep: a cache keyed by time, or one too small for the film; key caches by shape, size and seed`] : []),
        ...sweepErr,
      ];
      const over = budget != null ? max > budget : false;
      report(
        6,
        'cost',
        sweepErr.length ? false : over && !shotId ? false : over || max > 150 || cvRepeat > 0 ? 'WARN' : true,
        `${sweep.length} frames swept (every ${sweepStep}): median ${median.toFixed(0)}ms, mean ${mean.toFixed(0)}ms, max ${max.toFixed(0)}ms${budget != null ? ` (budget ${budget}ms)` : ''}${max > 150 ? ' - above 150ms' : ''}`,
        costDetails
      );

      // ---------------------------------------------------------------- 7 geometry (measured)
      if (src.geoFile && !geoProblems.length) {
        const K = 48;
        const byCut = new Map();
        for (const fr of geoFrames) {
          const r = await pg.page.evaluate(([id, T, K]) => window.__h.geoMeasure(id, T, 40, K), [fr.id, fr.T, K]);
          for (const e of r.errors) geoProblems.push(`${fr.id} at ${fr.label} (T=${C.fmtT(fr.T)}): draw error ${e}`);
          const seen = r.rows.filter((o) => o.edge >= 10); // an edge weaker than this is paper grain or grid
          const near = seen.filter((o) => Math.abs(o.off) <= geoTol);
          const abs = seen.map((o) => Math.abs(o.off)).sort((a, b) => a - b);
          const med = abs.length ? abs[Math.floor(abs.length / 2)] : Infinity;
          const share = r.rows.length ? near.length / r.rows.length : 0;
          const signed = (sd) => {
            const xs = seen.filter((o) => o.side === sd).map((o) => o.off).sort((a, b) => a - b);
            return xs.length ? xs[Math.floor(xs.length / 2)] : NaN;
          };
          const ok = share >= 0.8 && med <= geoTol; // real match cuts measure 85-100 %; a 6 % scale error, about 70 %
          const sides = geo[fr.id].kind === 'profile' ? `left ${signed(-1).toFixed(1)}, right ${signed(1).toFixed(1)}` : `signed ${signed(0).toFixed(1)}`;
          const line = `${`${fr.id} ${fr.label}`.padEnd(34)} T=${C.fmtT(fr.T)}  ${near.length}/${r.rows.length} samples within ${geoTol}px, median |offset| ${isFinite(med) ? med.toFixed(1) : '-'}px (${sides}, + = outside)`;
          if (ok) geoRows.push(line);
          else geoProblems.push(`${line}: the silhouette is not on ${fr.id}${fr.cut ? `, so the match cut ${fr.cut} jumps` : ''}; worst samples ${r.rows.slice().sort((a, b) => Math.abs(b.off) - Math.abs(a.off)).slice(0, 4).map((o) => `(${o.x},${o.y}) ${o.off}`).join(', ')}`);
          if (fr.cut) {
            if (!byCut.has(fr.cut)) byCut.set(fr.cut, []);
            byCut.get(fr.cut).push({ l: signed(-1), r: signed(1), o: signed(0), label: fr.label });
          }
        }
        // both sides of a cut should also agree with each other, not just each sit inside the tolerance
        for (const [cut, [a, b]] of byCut) {
          if (!a || !b) continue;
          const jump = [Math.abs(a.l - b.l), Math.abs(a.r - b.r), Math.abs(a.o - b.o)].filter(isFinite).reduce((x, y) => Math.max(x, y), 0);
          if (jump > geoTol / 2) geoWarnings.push(`cut ${cut}: the edges move ${jump.toFixed(1)}px across the cut (${a.label} vs ${b.label})`);
        }
      }

      // ---------------------------------------------------------------- 2 determinism
      // Every shot is always covered: first, middle and last frame, plus one frame inside each non-cut
      // transition. --det adds evenly spaced frames on top and can never drop a shot.
      const tDet = Date.now();
      const candidates = [];
      let transitions = 0;
      for (const s of SHOTS) {
        const f0 = Math.round(s.start * FPS);
        const f1 = Math.round(s.end * FPS) - 1;
        if (f1 < f0) continue;
        candidates.push(f0, Math.floor((f0 + f1) / 2), f1);
        if (s.index > 0 && s.transitionIn && s.transitionIn.kind !== 'cut' && s.transitionIn.dur > 0) {
          candidates.push(Math.min(f1, f0 + Math.floor((s.transitionIn.dur * FPS) / 2)));
          transitions++;
        }
      }
      for (let i = 0; i < detExtra; i++) candidates.push(sweepFrom + Math.floor(((i + 0.5) * (sweepTo - sweepFrom)) / detExtra));
      const frames = [...new Set(candidates)].filter((f) => f >= 0 && f < total).sort((a, b) => a - b);
      const render = (p, f) => p.page.evaluate((T) => window.__h.render(T), f / FPS);
      const hashOf = (p) => p.page.evaluate(() => window.__h.hash());
      const hashA = new Map(), hashB = new Map(), hashC = new Map(), hashCold = new Map(), hashSeq = new Map();
      const detErrors = [];
      // A: warm, forward (this page has already drawn every shot)
      for (const f of frames) {
        await render(pg, f);
        hashA.set(f, await hashOf(pg));
      }
      // B: warm, reversed
      for (const f of [...frames].reverse()) {
        await render(pg, f);
        hashB.set(f, await hashOf(pg));
      }
      await pg.close();
      // C: fresh page, shuffled, each frame drawn straight after a random decoy frame
      const pg2 = await C.openPage(browser, loadable, openOpts('check2'));
      pagesOpened.push(pg2);
      try {
        const { a: order, rand } = seededShuffle(frames, 0xb077e7f1);
        for (const f of order) {
          await render(pg2, sweepFrom + Math.floor(rand() * (sweepTo - sweepFrom)));
          await render(pg2, f);
          hashC.set(f, await hashOf(pg2));
        }
      } finally {
        await pg2.close();
      }
      // D cold: each frame is the first draw in a freshly loaded page (no caches, no earlier shots).
      // E sequential: in that page, the frame before it and then the frame again, as playback draws them.
      const K = Math.min(4, frames.length);
      const pool = [];
      try {
        for (let i = 0; i < K; i++) pool.push(await C.openPage(browser, loadable, openOpts(`check-cold${i}`)));
        pagesOpened.push(...pool);
        let next = 0;
        await Promise.all(
          pool.map(async (p) => {
            let first = true;
            while (next < frames.length) {
              const f = frames[next++];
              if (!first) await p.reopen();
              first = false;
              if (!p.info) {
                detErrors.push(`f${f}: FILM did not initialise in a fresh page`);
                continue;
              }
              const r = await render(p, f);
              hashCold.set(f, await hashOf(p));
              for (const e of r.errors) detErrors.push(`f${f} cold draw (${e.shot || r.shot}): ${e.message}`);
              if (f > 0) {
                await render(p, f - 1);
                const r2 = await render(p, f);
                hashSeq.set(f, await hashOf(p));
                for (const e of r2.errors) detErrors.push(`f${f} sequential draw (${e.shot || r2.shot}): ${e.message}`);
              } else {
                hashSeq.set(f, hashCold.get(f));
              }
            }
          })
        );
      } finally {
        await Promise.all(pool.map((p) => p.close()));
      }
      const mism = [];
      const shotAt = (f) => {
        const T = f / FPS;
        const s = TL.shots.find((x) => T < x.end - 1e-6) || TL.shots[TL.shots.length - 1];
        return s ? s.id : '?';
      };
      for (const f of frames) {
        const ref = hashCold.get(f);
        const passes = { 'warm forward': hashA.get(f), 'warm reverse': hashB.get(f), 'fresh shuffled': hashC.get(f), sequential: hashSeq.get(f) };
        const bad = Object.entries(passes).filter(([, h]) => h !== ref).map(([k]) => k);
        if (bad.length) mism.push(`f${f} (T=${(f / FPS).toFixed(3)} ${shotAt(f)}): differs from the cold draw in ${bad.join(', ')} | cold ${ref}, ${Object.entries(passes).map(([k, h]) => `${k} ${h}`).join(', ')}`);
      }
      const detOk = mism.length === 0 && detErrors.length === 0;
      report(
        2,
        'determinism',
        detOk,
        mism.length
          ? `${mism.length} of ${frames.length} frames differ between passes`
          : detErrors.length
            ? `${detErrors.length} error(s) while drawing determinism frames`
            : `${frames.length} frames (first, middle, last of ${shotId ? `'${shotId}'` : `all ${TL.shots.length} shots`}${transitions ? `, ${transitions} transition(s)` : ''}${detExtra ? `, +${detExtra}` : ''}) hash identically: cold, sequential, warm forward, warm reverse, fresh shuffled with decoys (${((Date.now() - tDet) / 1000).toFixed(1)}s)`,
        [`frames: ${frames.join(', ')}`, ...mism, ...detErrors]
      );
    }
  } finally {
    await browser.close();
  }

  {
    const blocked = [...new Set(pagesOpened.flatMap((p) => p.blocked))];
    const { hits, kb } = mediaStatic;
    const where = shotId ? path.basename(src.shotFile(SHOTS[0])) : 'the built HTML';
    const details = [...hits.map((h) => `line ${h.line}  ${h.pattern}  | ${h.text}`), ...blocked.map((u) => `run-time request (blocked): ${u}`)];
    report(
      1,
      'media',
      details.length === 0,
      details.length
        ? `${hits.length} forbidden pattern(s) in ${where}, ${blocked.length} URL(s) requested at run time`
        : `no forbidden media patterns in ${where} (${kb} KB); no URL requested at run time`,
      details
    );
  }
  if (!src.geoFile) {
    report(7, 'geometry', true, `no ${fixtures ? 'fixtures' : 'src'}/geo.js (optional until a storyboard has shared geometry)`);
  } else {
    const kinds = geo ? Object.values(geo).map((g) => g && g.kind) : [];
    const measured = geoProblems.length ? '' : `, ${geoFrames.length} frame(s) measured`;
    report(
      7,
      'geometry',
      geoProblems.length ? false : geoWarnings.length ? 'WARN' : true,
      geoProblems.length
        ? `${geoProblems.length} problem(s)`
        : `${kinds.length} entr${kinds.length === 1 ? 'y' : 'ies'} (${kinds.filter((k) => k === 'profile' || k === 'outline').length} measurable)${measured}; every silhouette sits on its table`,
      [...geoProblems, ...geoWarnings.map((w) => `warn: ${w}`), ...geoRows]
    );
  }

  results.sort((a, b) => a.n - b.n);
  const failed = results.filter((r) => r.ok === false);
  console.log('\nsummary');
  for (const r of results) console.log(`  [${r.tag}] ${r.n} ${r.name}: ${r.summary}`);
  console.log(`${failed.length ? 'FAILED' : 'OK'} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e && e.stack ? e.stack : e);
  process.exit(2);
});
