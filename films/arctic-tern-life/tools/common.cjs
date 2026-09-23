// common.cjs : shared plumbing for snap, build, render and check.
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const SLUG = path.basename(ROOT).trim().replace(/\s+/g, '-'); // the project folder is named for the film's slug
const SRC = path.join(ROOT, 'src');
const FIX = path.join(__dirname, 'fixtures');
const TMP = path.join(ROOT, '.tmp');
const FPS = 24;

function die(msg) {
  process.stderr.write(`\n[error] ${msg}\n`);
  process.exit(2);
}

/** --key value, --key=value, --flag. Numbers stay strings; callers convert. */
function parseArgs(argv, flags = []) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) {
      out._.push(a);
      continue;
    }
    const eq = a.indexOf('=');
    if (eq > 0) {
      out[a.slice(2, eq)] = a.slice(eq + 1);
      continue;
    }
    const key = a.slice(2);
    const next = argv[i + 1];
    if (flags.includes(key) || next === undefined || next.startsWith('--')) out[key] = true;
    else {
      out[key] = next;
      i++;
    }
  }
  return out;
}

/** Resolve a user path: absolute stays, relative is taken from the project root. */
function resolveOut(p) {
  return path.isAbsolute(p) ? p : path.join(ROOT, p);
}

function rel(p) {
  return path.relative(ROOT, p) || '.';
}

function normalizeTimeline(tl) {
  if (!tl || typeof tl !== 'object') throw new Error('FILM.TIMELINE is not an object');
  const shots = Array.isArray(tl.shots) ? tl.shots : [];
  let cursor = 0;
  const pick = (s, keys) => {
    for (const k of keys) if (s[k] != null && isFinite(Number(s[k]))) return Number(s[k]);
    return null;
  };
  const out = shots.map((s, i) => {
    let start = pick(s, ['start', 't0', 'from', 'in']);
    if (start == null) start = cursor;
    let end = pick(s, ['end', 't1', 'to', 'out']);
    if (end == null) {
      const d = pick(s, ['dur', 'duration', 'length']);
      end = d != null ? start + d : start;
    }
    cursor = end;
    let tr = s.transitionIn || null;
    if (typeof tr === 'string') tr = { kind: tr };
    if (tr) {
      tr = Object.assign({}, tr, {
        kind: String(tr.kind || tr.type || 'cut').toLowerCase(),
        dur: Number(tr.dur != null ? tr.dur : tr.duration != null ? tr.duration : 0.25),
      });
    }
    return Object.assign({}, s, { index: i, start, end, dur: end - start, transitionIn: tr });
  });
  const duration = tl.duration != null ? Number(tl.duration) : out.length ? out[out.length - 1].end : 0;
  return { raw: tl, shots: out, duration, hasDuration: tl.duration != null, bpm: tl.bpm, cues: tl.cues };
}

/** Evaluate a timeline file in a sandbox (no browser needed). */
function loadTimeline(file) {
  const code = fs.readFileSync(file, 'utf8');
  const noop = () => {};
  const libStub = new Proxy(function () {}, { get: () => libStub, apply: () => 0 });
  const FILM = { W: 1080, H: 1920, FPS, lib: libStub, scene: noop };
  const sandbox = { FILM, console, Math };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: file, timeout: 2000 });
  const tl = sandbox.FILM.TIMELINE || (sandbox.window.FILM && sandbox.window.FILM.TIMELINE);
  if (!tl) throw new Error(`${rel(file)} ran but did not set FILM.TIMELINE`);
  return normalizeTimeline(tl);
}

/** Evaluate geo.js in a sandbox. Returns FILM.GEO ({} when the file sets nothing). */
function loadGeo(file) {
  const code = fs.readFileSync(file, 'utf8');
  const FILM = { W: 1080, H: 1920, FPS };
  const sandbox = { FILM, console, Math };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: file, timeout: 2000 });
  return sandbox.FILM.GEO || {};
}

/** First crossing between two non-adjacent edges of a closed polygon, or null. */
function selfCrossing(pts) {
  const n = pts.length;
  const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      const c = pts[j], d = pts[(j + 1) % n];
      const d1 = cross(a, b, c), d2 = cross(a, b, d), d3 = cross(c, d, a), d4 = cross(c, d, b);
      if (d1 * d2 < 0 && d3 * d4 < 0) return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    }
  }
  return null;
}

/**
 * Static checks on FILM.GEO against the timeline. Returns { problems, warnings, frames }, where
 * frames lists every frame to measure: { id, T, label, cut? } per side of each declared cut and per 'at'.
 *   profile  : { kind: 'profile', cx, ys, hs, shots, cuts?: ['a>b', ...], at?: [{ shot, t }] }
 *   outline  : { kind: 'outline', pts: [[x, y], ...] closed and densely sampled, shots, cuts?, at? }
 *   points   : { kind: 'points', pts: { name: [x, y] }, shots }
 *   polyline : { kind: 'polyline', pts: [[x, y], ...], shots }
 * cuts defaults to every pair of consecutive listed shots; 'a>b' measures a's last and b's first frame.
 */
function validateGeo(geo, tl, { W = 1080, H = 1920 } = {}) {
  const problems = [];
  const warnings = [];
  const frames = [];
  if (!geo || typeof geo !== 'object' || Array.isArray(geo)) return { problems: ['FILM.GEO is not an object'], warnings, frames };
  const byId = new Map(tl.shots.map((s) => [s.id, s]));
  const num = (v) => typeof v === 'number' && isFinite(v);
  const inFrame = (x, y) => x >= -W && x <= 2 * W && y >= -H && y <= 2 * H; // generous: shapes may run off-frame
  const firstT = (s) => s.start;
  const lastT = (s) => Math.max(s.start, (Math.round(s.end * FPS) - 1) / FPS);
  for (const [id, g] of Object.entries(geo)) {
    const at = `GEO.${id}`;
    if (!g || typeof g !== 'object') {
      problems.push(`${at} is not an object`);
      continue;
    }
    const shots = Array.isArray(g.shots) ? g.shots : [];
    if (!shots.length) problems.push(`${at}: "shots" must list the shots that draw it`);
    for (const s of shots) if (!byId.has(s)) problems.push(`${at}: shot '${s}' is not in the timeline`);
    if (g.kind === 'profile' || g.kind === 'outline') {
      if (g.kind === 'profile') {
        const { ys, hs } = g;
        if (!num(g.cx)) problems.push(`${at}: cx must be a number`);
        if (!Array.isArray(ys) || !Array.isArray(hs) || ys.length !== hs.length || ys.length < 3) {
          problems.push(`${at}: ys and hs must be arrays of the same length, at least 3`);
          continue;
        }
        if (![...ys, ...hs].every(num)) problems.push(`${at}: ys and hs must hold numbers only`);
        for (let i = 1; i < ys.length; i++) if (!(ys[i] > ys[i - 1])) problems.push(`${at}: ys must increase (${ys[i - 1]} then ${ys[i]})`);
        if (hs.some((h) => h < 0)) problems.push(`${at}: half-widths must be >= 0`);
        if (num(g.cx) && !inFrame(g.cx, ys[0])) problems.push(`${at}: cx ${g.cx} is far outside the frame`);
      } else {
        const pts = g.pts;
        if (!Array.isArray(pts) || pts.length < 8 || !pts.every((p) => Array.isArray(p) && p.length === 2 && p.every(num))) {
          problems.push(`${at}: pts must be at least 8 [x, y] points (the sampled outline, not control points)`);
          continue;
        }
        let area = 0, longest = 0;
        for (let i = 0; i < pts.length; i++) {
          const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length];
          area += x0 * y1 - x1 * y0;
          longest = Math.max(longest, Math.hypot(x1 - x0, y1 - y0));
        }
        area = Math.abs(area) / 2;
        if (area < 400) problems.push(`${at}: the outline encloses ${area.toFixed(0)} px², so it has no body; check the point order`);
        if (longest > 40) warnings.push(`${at}: a ${longest.toFixed(0)} px gap between outline points: pts should be the drawn outline sampled every few px, not control points to smooth`);
        const cross = selfCrossing(pts);
        if (cross) warnings.push(`${at}: the outline crosses itself near (${cross.map((v) => v.toFixed(0)).join(', ')})`);
      }
      // frames to measure
      let cuts = g.cuts;
      if (cuts == null) {
        cuts = [];
        const listed = tl.shots.filter((s) => shots.includes(s.id));
        for (let i = 1; i < listed.length; i++) if (listed[i].index === listed[i - 1].index + 1) cuts.push(`${listed[i - 1].id}>${listed[i].id}`);
      }
      if (!Array.isArray(cuts)) problems.push(`${at}: cuts must be an array of 'a>b' strings`);
      else
        for (const c of cuts) {
          const [a, b] = String(c).split('>').map((x) => x && x.trim());
          const A = byId.get(a), B = byId.get(b);
          if (!A || !B) problems.push(`${at}: cut '${c}' names a shot that is not in the timeline`);
          else if (B.index !== A.index + 1 && !(A.index === tl.shots.length - 1 && B.index === 0)) problems.push(`${at}: cut '${c}': '${b}' does not follow '${a}'`);
          else {
            if (B.transitionIn && B.transitionIn.kind !== 'cut' && B.transitionIn.dur > 0) warnings.push(`${at}: cut '${c}' is a ${B.transitionIn.kind}, not a hard cut; its first frame blends both shots`);
            frames.push({ id, T: lastT(A), label: `${a} last`, cut: c }, { id, T: firstT(B), label: `${b} first`, cut: c });
          }
        }
      for (const x of Array.isArray(g.at) ? g.at : []) {
        const S = x && byId.get(x.shot);
        if (!S || !num(x.t) || x.t < 0 || x.t >= S.dur) problems.push(`${at}: at ${JSON.stringify(x)} needs a timeline shot and 0 <= t < its length`);
        else frames.push({ id, T: S.start + Math.round(x.t * FPS) / FPS, label: `${x.shot} t=${x.t}` });
      }
      if (!frames.some((f) => f.id === id)) warnings.push(`${at}: no cut or 'at' frame to measure (list two consecutive shots, or add at: [{ shot, t }])`);
    } else if (g.kind === 'points') {
      if (!g.pts || typeof g.pts !== 'object' || Array.isArray(g.pts) || !Object.keys(g.pts).length) problems.push(`${at}: pts must be an object of named [x, y] points`);
      else
        for (const [k, p] of Object.entries(g.pts)) {
          if (!Array.isArray(p) || p.length !== 2 || !p.every(num)) problems.push(`${at}.pts.${k} must be [x, y]`);
          else if (!inFrame(p[0], p[1])) warnings.push(`${at}.pts.${k} (${p}) is far outside the frame`);
        }
    } else if (g.kind === 'polyline') {
      if (!Array.isArray(g.pts) || g.pts.length < 2 || !g.pts.every((p) => Array.isArray(p) && p.length === 2 && p.every(num))) problems.push(`${at}: pts must be at least two [x, y] points`);
    } else {
      problems.push(`${at}: kind '${g.kind}' is not one of profile, outline, points, polyline`);
    }
  }
  return { problems, warnings, frames };
}

/**
 * Work out every file to load, in contract order, and validate that the timeline and each
 * shot's file exist. Returns { files, timeline, base, sceneFiles, shotFile(id), musicFile, warnings }.
 *   fixtures: use tools/fixtures/{timeline.js,scenes,music.js} instead of src (or --fixtures=<dir> with that layout)
 *   only:     shot id; load only core, lib, timeline and that shot's file
 *   player:   include player.js (default true)
 *   needMusic: die when music.js is missing
 *   lenient:  report missing shot files in .problems instead of exiting (check.cjs)
 */
function sources({ fixtures = false, only = null, player = true, needMusic = false, lenient = false } = {}) {
  // fixtures may be true (tools/fixtures) or a directory path laid out the same way
  const base = fixtures ? (typeof fixtures === 'string' ? resolveOut(fixtures) : FIX) : SRC;
  const label = fixtures ? rel(base) : 'src';
  const core = path.join(SRC, 'core.js');
  const lib = path.join(SRC, 'lib.js');
  for (const f of [core, lib]) if (!fs.existsSync(f)) die(`${rel(f)} is missing.`);
  const tlFile = path.join(base, 'timeline.js');
  if (!fs.existsSync(tlFile)) {
    die(
      `${label}/timeline.js is missing.\n` +
        (fixtures
          ? 'The fixture timeline should live at tools/fixtures/timeline.js.'
          : 'The storyboard agent writes src/timeline.js. Until it exists, run with --fixtures to exercise the tools.')
    );
  }
  let timeline;
  try {
    timeline = loadTimeline(tlFile);
  } catch (e) {
    die(`${label}/timeline.js failed to evaluate: ${e.message}`);
  }
  const scenesDir = path.join(base, 'scenes');
  const sceneFiles = fs.existsSync(scenesDir)
    ? fs.readdirSync(scenesDir).filter((f) => f.endsWith('.js')).sort().map((f) => path.join(scenesDir, f))
    : [];
  const shotFile = (shot) => {
    if (!shot.file) return null;
    return path.join(scenesDir, path.basename(String(shot.file)));
  };
  const problems = [];
  for (const shot of timeline.shots) {
    if (!shot.file) problems.push(`shot '${shot.id}' has no "file" in ${label}/timeline.js`);
    else if (!fs.existsSync(shotFile(shot))) problems.push(`shot '${shot.id}' names file '${shot.file}', which does not exist at ${rel(shotFile(shot))}`);
  }
  const warnings = [];
  const geoFile = path.join(base, 'geo.js'); // optional: shared geometry, loaded right after the timeline
  const geo = fs.existsSync(geoFile) ? [geoFile] : [];
  let files;
  if (only) {
    const shot = timeline.shots.find((s) => s.id === only);
    if (!shot) die(`no shot with id '${only}' in ${label}/timeline.js. Ids: ${timeline.shots.map((s) => s.id).join(', ')}`);
    const f = shotFile(shot);
    if (!f || !fs.existsSync(f)) die(`shot '${only}': ${problems.find((p) => p.includes(`'${only}'`)) || 'file missing'}`);
    files = [core, lib, tlFile, ...geo, f];
  } else {
    if (problems.length && !lenient) die(`timeline problems:\n  - ${problems.join('\n  - ')}`);
    files = [core, lib, tlFile, ...geo, ...sceneFiles];
    const musicFile = path.join(base, 'music.js');
    if (fs.existsSync(musicFile)) files.push(musicFile);
    else if (needMusic) die(`${label}/music.js is missing. The music agent writes it. Pass --silent to render without it.`);
    else warnings.push(`${label}/music.js is missing (no audio)`);
    if (player) files.push(path.join(SRC, 'player.js'));
  }
  const musicFile = path.join(base, 'music.js');
  return {
    files,
    timeline,
    base,
    label,
    scenesDir,
    sceneFiles,
    geoFile: geo[0] || null,
    shotFile,
    musicFile: fs.existsSync(musicFile) ? musicFile : null,
    warnings,
    problems,
  };
}

// Temporary files and folders removed when the process exits for any reason (including die()).
const exitCleanup = new Set();
process.on('exit', () => {
  for (const p of exitCleanup) {
    try {
      fs.rmSync(p, { recursive: true, force: true });
    } catch (e) {
      /* best effort */
    }
  }
});
function cleanupOnExit(p) {
  exitCleanup.add(p);
  return () => exitCleanup.delete(p);
}

function uniqueName(prefix) {
  return `${prefix}-${process.pid}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// Harness injected into tool pages only (never shipped). It may use performance.now.
const HARNESS = `
(function () {
  // count canvases created by the film (tools only): a warm second pass that creates more means a cache that churns
  const make = document.createElement.bind(document);
  window.__canvases = 0;
  document.createElement = function (tag, o) {
    const el = make(tag, o);
    if (String(tag).toLowerCase() === 'canvas') window.__canvases++;
    return el;
  };
})();
window.__h = {
  canvases() {
    return window.__canvases;
  },
  // Measure a profile or outline silhouette on the bare frame at T: at K points round it, find the strongest
  // luminance edge within +-win px along the outward normal. Returns the offsets in 1080-wide px
  // (positive = outside the silhouette), each edge's strength, and for a profile its side (-1 left, +1 right).
  geoMeasure(id, T, win, K) {
    const g = FILM.lib.geo(id);
    FILM.errors = [];
    FILM.post = false;
    FILM.renderFrame(T);
    FILM.post = true;
    const c = FILM.canvas, W = c.width, H = c.height, S = W / FILM.W;
    const d = FILM.ctx.getImageData(0, 0, W, H).data;
    const lum = (x, y) => { const k = (y * W + x) * 4; return 0.299 * d[k] + 0.587 * d[k + 1] + 0.114 * d[k + 2]; };
    // K points evenly spaced by arc length round the outline (a profile is sampled into one first);
    // at each, scan along the outward normal for the strongest luminance step
    const P = g.kind === 'outline' ? g.pts : g.outline(4), m = P.length;
    let area = 0;
    const cum = [0];
    for (let i = 0; i < m; i++) {
      const a = P[i], b = P[(i + 1) % m];
      area += a[0] * b[1] - b[0] * a[1];
      cum.push(cum[i] + Math.hypot(b[0] - a[0], b[1] - a[1]));
    }
    const out = area > 0 ? 1 : -1; // y points down: a positive shoelace sum runs clockwise on screen
    const L = cum[m];
    const lumAt = (x, y) => {
      const px = Math.round(x * S), py = Math.round(y * S);
      return px < 0 || py < 0 || px >= W || py >= H ? null : lum(px, py);
    };
    // taps along the tangent: an edge that runs with the outline sums up, hatching or a lattice crossing it averages out
    const TAPS = [-9, -6, -3, 0, 3, 6, 9];
    const rows = [];
    let j = 0;
    for (let k = 0; k < K; k++) {
      const s = (L * (k + 0.5)) / K;
      while (cum[j + 1] < s) j++;
      const a = P[j], b = P[(j + 1) % m];
      const len = cum[j + 1] - cum[j] || 1, u = (s - cum[j]) / len;
      const x = a[0] + (b[0] - a[0]) * u, y = a[1] + (b[1] - a[1]) * u;
      const tx = (b[0] - a[0]) / len, ty = (b[1] - a[1]) / len;
      const nx = -ty * out, ny = tx * out;
      let best = -1, bt = 0;
      for (let t = -win; t <= win; t += 1 / S) {
        let A = 0, B = 0, ok = true;
        for (const w of TAPS) {
          const la = lumAt(x + nx * (t - 2.5) + tx * w, y + ny * (t - 2.5) + ty * w);
          const lb = lumAt(x + nx * (t + 2.5) + tx * w, y + ny * (t + 2.5) + ty * w);
          if (la == null || lb == null) { ok = false; break; }
          A += la; B += lb;
        }
        if (!ok) continue;
        const gr = Math.abs(A - B) / TAPS.length;
        if (gr > best) { best = gr; bt = t; }
      }
      const side = g.kind === 'profile' ? (x < g.cx - 0.5 ? -1 : x > g.cx + 0.5 ? 1 : 0) : 0;
      if (best >= 0) rows.push({ x: Math.round(x), y: Math.round(y), side, off: Math.round(bt * 10) / 10, edge: Math.round(best) });
    }
    return { rows, errors: FILM.errors.map((e) => e.message) };
  },
  // Run FILM.assert registrations one at a time. An async fn is awaited; a throw becomes ok: false.
  async runAsserts() {
    const list = (window.FILM && FILM._asserts) || [];
    const out = [];
    for (const t of list) {
      const t0 = performance.now();
      try {
        await t.fn();
        out.push({ file: t.file, name: t.name, ok: true, message: '', ms: performance.now() - t0 });
      } catch (e) {
        out.push({ file: t.file, name: t.name, ok: false, message: (e && (e.message || String(e))) || 'assert failed', ms: performance.now() - t0 });
      }
    }
    return out;
  },
  mount(scale, only) {
    const c = document.createElement('canvas');
    c.id = 'tool-canvas';
    document.body.appendChild(c);
    FILM.mount(c, { scale, readback: true });
    FILM.strict = false;
    FILM.only = only || null;
    return { w: c.width, h: c.height, duration: FILM.DURATION, frames: FILM.FRAMES };
  },
  render(T, o) {
    FILM.errors = [];
    FILM.post = !(o && o.post === false);
    const t0 = performance.now();
    const shot = FILM.renderFrame(T);
    FILM.post = true;
    FILM.ctx.getImageData(0, 0, 1, 1); // force the deferred raster to run so the timing is real
    const ms = performance.now() - t0;
    return { ms, shot: shot ? shot.id : null, errors: FILM.errors.map(e => ({ message: e.message, stack: e.stack, shot: e.shot, missing: !!e.missing })) };
  },
  png() {
    return FILM.canvas.toDataURL('image/png').slice(22);
  },
  // a region of the drawn frame at render resolution; x, y, w, h in 1080-wide frame px
  cropPng(x, y, w, h) {
    const S = FILM.canvas.width / FILM.W;
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w * S));
    c.height = Math.max(1, Math.round(h * S));
    c.getContext('2d').drawImage(FILM.canvas, Math.round(x * S), Math.round(y * S), c.width, c.height, 0, 0, c.width, c.height);
    return c.toDataURL('image/png').slice(22);
  },
  // stroke a FILM.GEO entry over the drawn frame (review only): silhouettes and polylines as a line, points as rings
  overlayGeo(ids) {
    const ctx = FILM.ctx, S = FILM.canvas.width / FILM.W;
    ctx.save();
    ctx.setTransform(S, 0, 0, S, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = '#ff2a6d';
    ctx.fillStyle = '#ff2a6d';
    ctx.lineWidth = 2;
    ctx.font = '600 22px ui-monospace, Menlo, monospace';
    for (const id of ids) {
      const g = FILM.lib.geo(id);
      if (g.kind === 'points') {
        for (const [name, p] of Object.entries(g.pts)) {
          ctx.beginPath();
          ctx.arc(p[0], p[1], 9, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillText(name, p[0] + 12, p[1] - 10);
        }
        continue;
      }
      const P = g.kind === 'polyline' ? g.pts : g.outline(4);
      ctx.beginPath();
      P.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
      if (g.kind !== 'polyline') ctx.closePath();
      ctx.stroke();
      ctx.fillText(id, P[0][0] + 8, P[0][1] - 8);
    }
    ctx.restore();
  },
  hash() {
    const c = FILM.canvas;
    const d = FILM.ctx.getImageData(0, 0, c.width, c.height).data;
    let h1 = 0x811c9dc5 | 0, h2 = 0x01000193 | 0;
    for (let i = 0; i < d.length; i++) {
      h1 = Math.imul(h1 ^ d[i], 0x01000193);
      if ((i & 3) === 3) h2 = Math.imul(h2 ^ h1, 0x5bd1e995);
    }
    return (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
  },
  sheetInit(n, cols, thumbW, labelH) {
    const c = FILM.canvas;
    const th = Math.round(thumbW * c.height / c.width);
    const rows = Math.ceil(n / cols);
    const pad = 12;
    const s = document.createElement('canvas');
    s.width = cols * (thumbW + pad) + pad;
    s.height = rows * (th + labelH + pad) + pad;
    const g = s.getContext('2d');
    g.fillStyle = '#141414';
    g.fillRect(0, 0, s.width, s.height);
    this.sheet = { s, g, cols, thumbW, th, labelH, pad };
  },
  sheetAdd(i, label) {
    const { g, cols, thumbW, th, labelH, pad } = this.sheet;
    const x = pad + (i % cols) * (thumbW + pad);
    const y = pad + Math.floor(i / cols) * (th + labelH + pad);
    g.imageSmoothingQuality = 'high';
    g.drawImage(FILM.canvas, x, y, thumbW, th);
    g.fillStyle = '#e8e8e8';
    g.font = '600 ' + Math.round(labelH * 0.42) + 'px ui-monospace, Menlo, monospace';
    g.textBaseline = 'middle';
    g.fillText(label[0], x + 2, y + th + labelH * 0.32);
    g.fillStyle = '#9a9a9a';
    g.font = Math.round(labelH * 0.34) + 'px ui-monospace, Menlo, monospace';
    g.fillText(label[1], x + 2, y + th + labelH * 0.74);
  },
  sheetPng() {
    return this.sheet.s.toDataURL('image/png').slice(22);
  },
  async audio(from, to, sampleRate) {
    if (!FILM.audio || typeof FILM.audio.render !== 'function') return { missing: true };
    const len = Math.max(1, Math.round((to - from) * sampleRate));
    const ctx = new OfflineAudioContext(2, len, sampleRate);
    await FILM.audio.render(ctx, { start: from, dest: ctx.destination });
    const buf = await ctx.startRendering();
    const L = buf.getChannelData(0), R = buf.numberOfChannels > 1 ? buf.getChannelData(1) : L;
    const inter = new Float32Array(len * 2);
    let peak = 0;
    for (let i = 0; i < len; i++) {
      inter[2 * i] = L[i];
      inter[2 * i + 1] = R[i];
      const a = Math.max(Math.abs(L[i]), Math.abs(R[i]));
      if (a > peak) peak = a;
    }
    const bytes = new Uint8Array(inter.buffer);
    let bin = '';
    const CH = 0x8000;
    for (let i = 0; i < bytes.length; i += CH) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
    return { b64: btoa(bin), frames: len, peak };
  },
};
`;

// Check 8 registers tests from tools/fixtures/asserts/*.js, which run as page scripts before the harness.
// Defined here, not in core.js, so a film that never calls it keeps today's pixels. core.js keeps this object
// (root.FILM = root.FILM || {}), so the methods survive the engine booting.
const ASSERT_PREAMBLE = `
<script>
(function () {
  var root = window;
  var FILM = (root.FILM = root.FILM || {});
  if (FILM.assert) return;
  FILM._asserts = [];
  FILM.assert = function (name, fn) {
    var src = (document.currentScript && document.currentScript.src) || '';
    var file = src ? decodeURIComponent(src.split(/[?#]/)[0].split('/').pop()) : '';
    FILM._asserts.push({ file: file, name: String(name), fn: fn });
  };
  function fail(msg) { throw new Error(msg); }
  function show(v) { try { return JSON.stringify(v); } catch (e) { return String(v); } }
  function same(a, b) {
    if (Object.is(a, b)) return true;
    if (Array.isArray(a) && Array.isArray(b) && a.length === b.length) {
      for (var i = 0; i < a.length; i++) if (!same(a[i], b[i])) return false;
      return true;
    }
    return false;
  }
  FILM.expect = {
    eq: function (a, b) { if (!same(a, b)) fail('expected ' + show(a) + ' === ' + show(b)); },
    near: function (a, b, eps) {
      if (eps == null) eps = 1e-6;
      if (typeof a === 'number' && typeof b === 'number') {
        if (!(Math.abs(a - b) <= eps)) fail('expected ' + a + ' ≈ ' + b + ' (±' + eps + ')');
        return;
      }
      if (Array.isArray(a) && Array.isArray(b) && a.length === b.length) {
        for (var i = 0; i < a.length; i++) FILM.expect.near(a[i], b[i], eps);
        return;
      }
      fail('near() needs numbers or arrays, got ' + show(a) + ' and ' + show(b));
    },
    true: function (v, msg) { if (!v) fail(msg || 'expected a truthy value'); },
    throws: function (fn, re) {
      var err = null, threw = false;
      try { fn(); } catch (e) { threw = true; err = e; }
      if (!threw) fail('expected a throw');
      if (re && !re.test(String(err && (err.message || err)))) fail('throw ' + show(err && err.message) + ' did not match ' + re);
    },
  };
  FILM.pixels = function (canvas) {
    var ctx = canvas.getContext('2d', { willReadFrequently: true });
    var w = canvas.width, h = canvas.height;
    var d = ctx.getImageData(0, 0, w, h).data;
    return {
      count: function (pred) {
        var n = 0;
        for (var y = 0, i = 0; y < h; y++) {
          for (var x = 0; x < w; x++, i++) {
            var k = i * 4;
            if (pred(d[k], d[k + 1], d[k + 2], d[k + 3], x, y)) n++;
          }
        }
        return n;
      },
      hash: function () {
        var h1 = 0x811c9dc5 | 0, h2 = 0x01000193 | 0;
        for (var i = 0; i < d.length; i++) {
          h1 = Math.imul(h1 ^ d[i], 0x01000193);
          if ((i & 3) === 3) h2 = Math.imul(h2 ^ h1, 0x5bd1e995);
        }
        return (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
      },
    };
  };
})();
</script>`;

function pageHtml(files, { title = 'tool' } = {}) {
  const tags = files.map((f) => `<script src="file://${encodeURI(f)}"></script>`).join('\n');
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${title}</title>
<style>html,body{margin:0;background:#000}</style>
<script>window.__loadErrors=[];window.addEventListener('error',function(e){window.__loadErrors.push({message:e.message,file:(e.filename||'').split('/').pop(),line:e.lineno,col:e.colno});});</script>
</head><body>
${ASSERT_PREAMBLE}
${tags}
<script>${HARNESS}</script>
</body></html>`;
}

async function launch(extraArgs = []) {
  let chromium;
  try {
    ({ chromium } = require(path.join(__dirname, 'node_modules', 'playwright')));
  } catch (e) {
    die(`playwright is not installed in tools/node_modules (${e.message})`);
  }
  return chromium.launch({ args: ['--allow-file-access-from-files', '--disable-background-timer-throttling', ...extraArgs] });
}

/**
 * Open a page with the given files loaded (contract order), mount the canvas at scale.
 *   only: shot id when only that shot's file is loaded (sets FILM.only, so core skips transitions from unloaded shots)
 * Returns { page, info, state, loadErrors, tmpFile, pageErrors, consoleErrors, blocked, reopen, close }.
 * reopen() navigates the same page again: fresh JS state, nothing drawn yet, canvas mounted.
 */
async function openPage(browser, files, { scale = 1, prefix = 'page', query = '?render=1', only = null } = {}) {
  fs.mkdirSync(TMP, { recursive: true });
  const tmpFile = path.join(TMP, uniqueName(prefix) + '.html');
  fs.writeFileSync(tmpFile, pageHtml(files, { title: prefix }));
  const forget = cleanupOnExit(tmpFile);
  const context = await browser.newContext({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 1 });
  // The film may request nothing: every URL other than this page and its own script files is aborted and
  // recorded in pg.blocked (check 1 fails on it), so media fetched at run time cannot slip past the scan.
  const allowed = new Set([tmpFile, ...files].map((f) => 'file://' + f));
  const blocked = [];
  await context.route('**/*', (route) => {
    const url = route.request().url();
    let bare = url.split(/[?#]/)[0];
    try {
      bare = decodeURI(bare);
    } catch (e) {
      /* keep it encoded */
    }
    if (allowed.has(bare)) return route.continue();
    blocked.push(url.slice(0, 160));
    return route.abort();
  });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });
  const pg = { page, info: null, state: null, loadErrors: [], pageErrors, consoleErrors, tmpFile, blocked };
  pg.reopen = async () => {
    await page.goto('file://' + tmpFile + query, { waitUntil: 'load' });
    pg.loadErrors = await page.evaluate(() => window.__loadErrors);
    pg.state = await page.evaluate(() => ({
      hasFilm: typeof window.FILM === 'object',
      hasLib: !!(window.FILM && window.FILM.lib),
      hasTimeline: !!(window.FILM && window.FILM.TIMELINE),
      registered: window.FILM && window.FILM.registered ? window.FILM.registered : [],
      regErrors: window.FILM && window.FILM.errors ? window.FILM.errors.map((e) => e.message) : [],
      hasAudio: !!(window.FILM && window.FILM.audio && typeof window.FILM.audio.render === 'function'),
    }));
    pg.info = null;
    if (pg.state.hasFilm && pg.state.hasTimeline) pg.info = await page.evaluate(([s, o]) => window.__h.mount(s, o), [scale, only]);
    return pg.info;
  };
  let closed = false;
  pg.close = async () => {
    if (closed) return;
    closed = true;
    await context.close().catch(() => {});
    fs.rmSync(tmpFile, { force: true });
    forget();
  };
  try {
    await pg.reopen();
  } catch (e) {
    await pg.close();
    throw e;
  }
  return pg;
}

function writeWavFloat(file, b64, channels, sampleRate) {
  const data = Buffer.from(b64, 'base64');
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(3, 20); // IEEE float
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * channels * 4, 28);
  header.writeUInt16LE(channels * 4, 32);
  header.writeUInt16LE(32, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  fs.writeFileSync(file, Buffer.concat([header, data]));
}

// Patterns that would mean the shipped HTML loads or embeds media instead of computing it.
const FORBIDDEN = [
  { name: '<img>', re: /<img\b/gi },
  { name: 'new Image/Audio/Video', re: /\bnew\s+(?:(?:window|self|globalThis)\s*\.\s*)?(?:Image|Audio|Video)\b/g },
  { name: 'createElement(media tag)', re: /createElement(?:NS)?\s*\(\s*(?:[^,()]*,\s*)?['"`]\s*(?:img|image|video|audio|source|picture|track|iframe|object|embed|link)\s*['"`]/gi },
  { name: '.src/.srcset assignment', re: /\.\s*(?:src|srcset)\s*=(?!=)/g },
  { name: 'setAttribute(src/srcset/href)', re: /setAttribute(?:NS)?\s*\(\s*(?:[^,()]*,\s*)?['"`](?:src|srcset|href|xlink:href)['"`]/gi },
  { name: 'fetch(', re: /\bfetch\s*\(/g },
  { name: 'XMLHttpRequest', re: /XMLHttpRequest/g },
  { name: 'CSS url(', re: /\burl\s*\(/g },
  { name: 'data: URL', re: /data:[a-z0-9.+-]+\/[a-z0-9.+-]+/gi },
  { name: 'base64', re: /base64/gi },
  { name: 'atob/btoa', re: /\b(atob|btoa)\s*\(/g },
  { name: '<audio>/<video>/<source>/<iframe>/<object>/<embed>', re: /<(audio|video|source|iframe|object|embed)\b/gi },
  { name: '<link>', re: /<link\b/gi },
  { name: 'external <script src>', re: /<script\b[^>]*\bsrc\s*=/gi },
  { name: '@font-face / @import', re: /@(font-face|import)\b/gi },
  { name: 'FontFace', re: /\bFontFace\b/g },
  { name: 'dynamic import(', re: /\bimport\s*\(/g },
  { name: 'WebSocket/EventSource/sendBeacon', re: /\b(WebSocket|EventSource|sendBeacon)\b/g },
  { name: 'createObjectURL', re: /createObjectURL/g },
  { name: 'decodeAudioData', re: /decodeAudioData/g },
  { name: 'media file name', re: /["'`][^"'`\n]*\.(png|jpe?g|gif|webp|avif|svg|bmp|ico|mp3|wav|ogg|oga|m4a|aac|flac|mp4|webm|mov|woff2?|ttf|otf|eot)["'`]/gi },
];

function scanForbidden(html) {
  const hits = [];
  const lines = html.split('\n');
  for (const f of FORBIDDEN) {
    for (let i = 0; i < lines.length; i++) {
      f.re.lastIndex = 0;
      let m;
      while ((m = f.re.exec(lines[i]))) {
        const col = m.index;
        hits.push({ pattern: f.name, line: i + 1, text: lines[i].slice(Math.max(0, col - 40), col + 60).trim() });
        if (!f.re.global) break;
      }
    }
  }
  return hits;
}

function fmtT(T) {
  return T.toFixed(3);
}

module.exports = {
  ROOT,
  SLUG,
  SRC,
  FIX,
  TMP,
  FPS,
  die,
  parseArgs,
  resolveOut,
  rel,
  loadTimeline,
  normalizeTimeline,
  loadGeo,
  validateGeo,
  sources,
  uniqueName,
  cleanupOnExit,
  pageHtml,
  launch,
  openPage,
  writeWavFloat,
  fmtT,
  FORBIDDEN,
  scanForbidden,
};
