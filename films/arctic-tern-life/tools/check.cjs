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
//                  no text drawn below the safe area (a literal y above FILM.safeArea().y1: 1540 on
//                  1080×1920, the centred 90% box otherwise; an expression is not read);
//                  warns on a literal colour outside lib.js (colours come from lib.pal)
//   4 timeline     coverage, ids, transitions, grade ranges and tint names; warns on off-grid hits
//                  and cuts, a bpm whose 16ths miss the frame grid, and a duration that is not whole bars
//   5 draw         every checked frame draws without throwing and is not one flat colour
//   6 cost         frame times from a sweep across the film; slowest frames listed; warns when a repeat of the
//                  sweep creates canvases again (a cache keyed by time, or one too small to hold the film)
//   7 geometry     src/geo.js (optional) is well formed and names real shots, and every profile or outline is
//                  measured on the rendered frames either side of each declared match cut: its edges must sit
//                  within --geo-tol px (default 12) of the table on most rows, or the cut jumps
//   8 lib          with --fixtures, run tools/fixtures/asserts/*.js (FILM.assert). No asserts directory → PASS
//                  "no asserts". A film check (no --fixtures) always reports "no asserts".
//   9 flash        photosensitivity (WCAG 2.3.1): more than three general or saturated-red flashes
//                  in any one-second window fails
//   10 density     warns when a bare frame is empty or the subject is only a spark (safe-area edge detail,
//                  largest empty block of a 3×5 grid). A warning does not fail the gate.
//   11 canvas      two full passes at scale 0.25, grain post off. The first fills caches. A canvas
//                  created on the second fails (shot, count, total area, first T). Warns when peak
//                  live canvas area exceeds about 16× the frame. A warning does not fail the gate.
//                  A long film is split across separate browsers. Every frame is still drawn twice.
//
// Options: --scale s (default 1), --sweep N (every Nth frame, default 4), --det N (add N evenly spaced determinism
//          frames on top of the per-shot ones, default 0; never fewer than every shot),
//          --budget ms (fail if the slowest swept frame exceeds this; default: warn above 150 ms),
//          --geo-tol px (median edge offset allowed for check 7, in frame px; default 12),
//          --flash-skip (do not run check 9), --canvas-skip (do not run check 11)
'use strict';

const fs = require('fs');
const os = require('os');
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

// Colour names a shot may name in grade.tint. Read from lib.js so check 4 does not boot the engine.
function readPalNames() {
  const text = fs.readFileSync(path.join(C.SRC, 'lib.js'), 'utf8');
  const start = text.indexOf('const pal = {');
  const end = start < 0 ? -1 : text.indexOf('\n  };', start);
  const names = new Set();
  if (start < 0 || end < 0) return names;
  const body = text.slice(start, end);
  for (const m of body.matchAll(/(?:^|\n)\s*([A-Za-z_][A-Za-z0-9_]*)\s*:/g)) names.add(m[1]);
  const aliasEnd = text.indexOf('lib.pal = pal', end);
  const alias = text.slice(end, aliasEnd < 0 ? end : aliasEnd);
  for (const m of alias.matchAll(/pal\.([A-Za-z_][A-Za-z0-9_]*)\s*=/g)) names.add(m[1]);
  return names;
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

// Check 9 (WCAG 2.3.1). A transition is peak-to-valley, not frame-to-frame, so a ramp counts once.
// Pairs do not overlap: three flashes a second is 3 Hz, not six half-cycles. Hysteresis sits under
// the 10% and redness-20 thresholds, so a wiggle cannot split a peak and a real step still counts.
// Saturated red is Harding's test (R/(R+G+B) >= 0.8 and the clamped (R-G-B)*320 changes by more
// than 20) or, when both colours have a chromaticity, CIE 1976 UCS distance > 0.2. Black has none;
// Harding is what catches red against black. Area is the share of 8×14 blocks that finish together.
const FLASH_AREA = 0.25;
const FLASH_LIMIT = 3;
const LUMA_HYST = 0.01;
const RED_HYST = 5;

function extremaIndices(series, hyst) {
  const n = series.length;
  if (!n) return [];
  const idx = [0];
  let dir = 0;
  let extreme = series[0];
  let extremeAt = 0;
  for (let i = 1; i < n; i++) {
    const v = series[i];
    if (dir === 0) {
      if (v >= series[0] + hyst) {
        dir = 1;
        extreme = v;
        extremeAt = i;
      } else if (v <= series[0] - hyst) {
        dir = -1;
        extreme = v;
        extremeAt = i;
      }
      continue;
    }
    if (dir === 1) {
      if (v > extreme) {
        extreme = v;
        extremeAt = i;
      } else if (extreme - v >= hyst) {
        idx.push(extremeAt);
        dir = -1;
        extreme = v;
        extremeAt = i;
      }
    } else if (v < extreme) {
      extreme = v;
      extremeAt = i;
    } else if (v - extreme >= hyst) {
      idx.push(extremeAt);
      dir = 1;
      extreme = v;
      extremeAt = i;
    }
  }
  if (idx[idx.length - 1] !== extremeAt) idx.push(extremeAt);
  return idx;
}

function opposingPairs(trans) {
  const at = [];
  for (let i = 0; i + 1 < trans.length; ) {
    if (trans[i].dir !== trans[i + 1].dir) {
      at.push(trans[i + 1].at);
      i += 2;
    } else i += 1;
  }
  return at;
}

function redRatio(r, g, b) {
  const s = r + g + b;
  return s > 1e-6 ? r / s : 0;
}

function redness(r, g, b) {
  return Math.max(0, (r - g - b) * 320);
}

function chromaUV(r, g, b) {
  const X = 0.4124564 * r + 0.3575761 * g + 0.1804375 * b;
  const Y = 0.2126729 * r + 0.7151522 * g + 0.0721750 * b;
  const Z = 0.0193339 * r + 0.1191920 * g + 0.9503041 * b;
  const den = X + 15 * Y + 3 * Z;
  if (!(den > 1e-6)) return null;
  return [4 * X / den, 9 * Y / den];
}

function isRedStep(r0, g0, b0, r1, g1, b1) {
  if (redRatio(r0, g0, b0) < 0.8 && redRatio(r1, g1, b1) < 0.8) return false;
  if (Math.abs(redness(r0, g0, b0) - redness(r1, g1, b1)) > 20) return true;
  const a = chromaUV(r0, g0, b0);
  const c = chromaUV(r1, g1, b1);
  if (!a || !c) return false;
  return Math.hypot(a[0] - c[0], a[1] - c[1]) > 0.2;
}

function generalFlashAt(L) {
  const ext = extremaIndices(L, LUMA_HYST);
  const trans = [];
  for (let k = 1; k < ext.length; k++) {
    const a = ext[k - 1];
    const b = ext[k];
    const L0 = L[a];
    const L1 = L[b];
    if (Math.abs(L1 - L0) >= 0.1 && Math.min(L0, L1) < 0.8) trans.push({ at: b, dir: L1 > L0 ? 1 : -1 });
  }
  return opposingPairs(trans);
}

function redFlashAt(R, G, B) {
  const n = R.length;
  const red = new Float64Array(n);
  for (let i = 0; i < n; i++) red[i] = redness(R[i], G[i], B[i]);
  const ext = extremaIndices(red, RED_HYST);
  const trans = [];
  for (let k = 1; k < ext.length; k++) {
    const a = ext[k - 1];
    const b = ext[k];
    if (!isRedStep(R[a], G[a], B[a], R[b], G[b], B[b])) continue;
    const d = red[b] - red[a];
    if (d === 0) continue;
    trans.push({ at: b, dir: d > 0 ? 1 : -1 });
  }
  return opposingPairs(trans);
}

function maxFlashWindow(frames, areas, lo, hi, fps) {
  let max = 0;
  let frame = lo < hi ? frames[lo] : 0;
  let end = frame;
  let area = 0;
  for (let s = lo, e = lo; s < hi; s++) {
    while (e < hi && frames[e] - frames[s] <= fps) e++;
    const count = e - s;
    if (count > max) {
      max = count;
      frame = frames[s];
      end = frames[e - 1];
      area = 0;
      for (let k = s; k < e; k++) if (areas[k] > area) area = areas[k];
    }
  }
  return { max, frame, end, area };
}

function flashKind(counts, from, blocks, fps) {
  const frames = [];
  const areas = [];
  for (let i = 0; i < counts.length; i++) {
    const area = counts[i] / blocks;
    if (area + 1e-9 >= FLASH_AREA) {
      frames.push(from + i);
      areas.push(area);
    }
  }
  const overall = maxFlashWindow(frames, areas, 0, frames.length, fps);
  const violations = [];
  let cs = 0;
  for (let i = 1; i <= frames.length; i++) {
    if (i < frames.length && frames[i] - frames[i - 1] <= fps) continue;
    const w = maxFlashWindow(frames, areas, cs, i, fps);
    if (w.max > FLASH_LIMIT) violations.push(w);
    cs = i;
  }
  return { max: overall.max, frame: overall.frame, end: overall.end, area: overall.area, violations };
}

// buf is linear sRGB, 0..255, frame-major then block-major (8×14), three channels.
function analyzeFlashBlocks(buf, { from, cols, rows, fps }) {
  const blocks = cols * rows;
  if (blocks <= 0 || buf.length % (blocks * 3) !== 0) {
    throw new Error(`flash sample is ${buf.length} bytes for a ${cols}×${rows} grid`);
  }
  const nFrames = buf.length / (blocks * 3);
  const gCounts = new Int32Array(nFrames);
  const rCounts = new Int32Array(nFrames);
  const L = new Float64Array(nFrames);
  const R = new Float64Array(nFrames);
  const G = new Float64Array(nFrames);
  const B = new Float64Array(nFrames);
  for (let block = 0; block < blocks; block++) {
    for (let i = 0; i < nFrames; i++) {
      const o = (i * blocks + block) * 3;
      const r = buf[o] / 255;
      const g = buf[o + 1] / 255;
      const b = buf[o + 2] / 255;
      R[i] = r;
      G[i] = g;
      B[i] = b;
      L[i] = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }
    for (const at of generalFlashAt(L)) gCounts[at]++;
    for (const at of redFlashAt(R, G, B)) rCounts[at]++;
  }
  return { nFrames, general: flashKind(gCounts, from, blocks, fps), red: flashKind(rCounts, from, blocks, fps) };
}

function flashPct(area) {
  return `${Math.round(area * 100)}%`;
}

function flashFailLine(kind, w, fps) {
  const n = w.max;
  return `${n} ${kind} flash${n === 1 ? '' : 'es'} in the 1s window at T=${(w.frame / fps).toFixed(3)} (${flashPct(w.area)} of the frame)`;
}

function worstViolation(kind) {
  let best = null;
  for (const v of kind.violations) {
    if (!best || v.max > best.max || (v.max === best.max && v.frame < best.frame)) best = v;
  }
  return best;
}

// One renderer thread cannot draw a 32s film in 20s: strokes do not get cheaper at scale 0.25.
// Split the frame range across separate browsers. A short fixture stays on one.
function flashWorkerCount(nFrames) {
  if (nFrames <= 120) return 1;
  const cores = os.cpus().length || 2;
  if (cores < 4) return 1;
  // Strokes do not get cheaper at scale 0.25, so one renderer spends ~30s on a 32s film.
  // Four browsers keep that film inside 20s when the machine has the cores; two is the fallback.
  if (nFrames > 480 && cores >= 8) return 4;
  return 2;
}

// Check 11 draws every frame twice, and the scene code — not the raster — is the cost.
// One renderer spends ~80s on the butterfly. A slice of about 64 frames stays near 12s
// on the heaviest stretch, so one slice per core fits the same 20s budget as check 9.
// Measured on 12 cores: butterfly 17.7s (gate OK in 129.7s), arctic-tern 7.9s (gate OK in 59.8s).
function canvasWorkerCount(nFrames) {
  if (nFrames <= 120) return 1;
  const cores = os.cpus().length || 2;
  if (cores < 4) return 1;
  if (nFrames > 480 && cores >= 8) return Math.min(cores, 12);
  if (nFrames > 240) return Math.min(cores, 4);
  return 2;
}

function splitFrameRange(from, to, workers) {
  const n = Math.max(0, to - from);
  if (!n) return [];
  const w = Math.min(Math.max(1, workers), n);
  const base = Math.floor(n / w);
  let extra = n % w;
  const ranges = [];
  let a = from;
  for (let i = 0; i < w; i++) {
    const len = base + (extra > 0 ? 1 : 0);
    if (extra > 0) extra--;
    ranges.push([a, a + len]);
    a += len;
  }
  return ranges;
}

// Runs in the page. Returns base64 of linear-light block means. step skips device pixels inside
// a block; the mean is still dozens of samples, and a flash covering a quarter of the frame
// cannot hide between them.
function sampleBlocks({ from, to, cols, rows, fps, step }) {
  step = step > 1 ? step | 0 : 1;
  const lut = new Float64Array(256);
  for (let i = 0; i < 256; i++) {
    const s = i / 255;
    lut[i] = s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  }
  const quant = (v) => {
    const x = Math.round(v);
    return x < 0 ? 0 : x > 255 ? 255 : x;
  };
  const W = FILM.canvas.width;
  const H = FILM.canvas.height;
  const blocks = cols * rows;
  const out = new Uint8Array(Math.max(0, to - from) * blocks * 3);
  const x0 = new Int32Array(cols);
  const x1 = new Int32Array(cols);
  const y0 = new Int32Array(rows);
  const y1 = new Int32Array(rows);
  for (let c = 0; c < cols; c++) {
    x0[c] = Math.floor((c * W) / cols);
    x1[c] = Math.max(x0[c] + 1, Math.floor(((c + 1) * W) / cols));
  }
  for (let r = 0; r < rows; r++) {
    y0[r] = Math.floor((r * H) / rows);
    y1[r] = Math.max(y0[r] + 1, Math.floor(((r + 1) * H) / rows));
  }
  FILM.post = false;
  let o = 0;
  for (let f = from; f < to; f++) {
    FILM.errors = [];
    FILM.renderFrame(f / fps);
    const d = FILM.ctx.getImageData(0, 0, W, H).data;
    for (let r = 0; r < rows; r++) {
      const ya = y0[r];
      const yb = y1[r];
      for (let c = 0; c < cols; c++) {
        const xa = x0[c];
        const xb = x1[c];
        let sr = 0;
        let sg = 0;
        let sb = 0;
        let n = 0;
        for (let y = ya; y < yb; y += step) {
          for (let x = xa; x < xb; x += step) {
            const p = (y * W + x) * 4;
            sr += lut[d[p]];
            sg += lut[d[p + 1]];
            sb += lut[d[p + 2]];
            n++;
          }
        }
        const inv = 255 / n;
        out[o++] = quant(sr * inv);
        out[o++] = quant(sg * inv);
        out[o++] = quant(sb * inv);
      }
    }
  }
  FILM.post = true;
  let bin = '';
  const CH = 0x8000;
  for (let i = 0; i < out.length; i += CH) bin += String.fromCharCode.apply(null, out.subarray(i, Math.min(out.length, i + CH)));
  return btoa(bin);
}

// Own browsers, not extra pages in the gate's browser: pages in one browser share a renderer thread.
async function gatherFlashSamples(loadable, { from, to, shotId, fps, cols, rows, pagesOpened, frameWidth, frameHeight }) {
  const ranges = splitFrameRange(from, to, flashWorkerCount(to - from));
  if (!ranges.length) return Buffer.alloc(0);
  const browsers = await Promise.all(ranges.map(() => C.launch()));
  const pages = [];
  try {
    const opened = await Promise.all(browsers.map((b, i) => C.openPage(b, loadable, { scale: 0.25, prefix: `check-flash${i}`, only: shotId, frameWidth, frameHeight })));
    pages.push(...opened);
    for (const pg of opened) pagesOpened.push(pg);
    const bad = opened.find((pg) => !pg.info);
    if (bad) {
      const err = new Error('FILM did not initialise; flash check did not run');
      err.loadErr = bad.loadErrors;
      throw err;
    }
    for (const pg of opened) pg.page.setDefaultTimeout(180000);
    const parts = await Promise.all(opened.map((pg, i) => pg.page.evaluate(sampleBlocks, {
      from: ranges[i][0], to: ranges[i][1], cols, rows, fps, step: 2,
    })));
    return Buffer.concat(parts.map((b64) => Buffer.from(b64, 'base64')));
  } finally {
    await Promise.all(pages.map((p) => p.close().catch(() => {})));
    await Promise.all(browsers.map((b) => b.close().catch(() => {})));
  }
}

// Separate browsers, same reason as the flash check: one browser's pages share a renderer thread.
// The reported peak is one playback's: each cache key once, frame plates summed per shot,
// other sizes by the busiest slice. A single renderer reports the peak it measured itself.
// Measured: butterfly 17.3s and no warning (the one-renderer pass was the same), arctic 7.3s
// at 129.7×, fixtures 4.1s at 19.6×. Both of those peaks match a single renderer.
const CANVAS_WARMUP = 0;

function playbackPeak(parts) {
  if (parts.length <= 1) return parts.length ? parts[0].peak || 0 : 0;
  // Each cache key is one plate. A cold slice rebuilds it; keep the earliest birth.
  // Compositor slots share a key (layer-0, layer-1), so a whip that only exists
  // because the page missed the earlier birth does not add a second pair.
  const keyed = new Map();
  const loose = new Map();
  const looseArea = new Map();
  const frameShots = new Map();
  let mount = 0;
  const fw = parts[0].frameW | 0;
  const fh = parts[0].frameH | 0;
  for (const slice of parts) {
    const local = new Map();
    const frames = new Map();
    for (const c of slice.alive || []) {
      if (c.key) {
        const t = typeof c.T === 'number' ? c.T : -1;
        const prev = keyed.get(c.key);
        if (!prev || t < prev.t) keyed.set(c.key, { area: c.area | 0, t });
        continue;
      }
      if (c.T == null) {
        mount = c.area | 0;
        continue;
      }
      if ((c.w | 0) === fw && (c.h | 0) === fh) {
        const shot = c.shot || '';
        frames.set(shot, (frames.get(shot) || 0) + 1);
        continue;
      }
      const k = (c.w | 0) + 'x' + (c.h | 0);
      local.set(k, (local.get(k) || 0) + 1);
      looseArea.set(k, c.area | 0);
    }
    for (const [shot, n] of frames) frameShots.set(shot, Math.max(frameShots.get(shot) || 0, n));
    for (const [k, n] of local) loose.set(k, Math.max(loose.get(k) || 0, n));
  }
  let total = mount;
  for (const v of keyed.values()) total += v.area;
  for (const n of frameShots.values()) total += n * fw * fh;
  for (const [k, n] of loose) total += n * (looseArea.get(k) || 0);
  return total;
}

function mergeCanvasAudits(parts) {
  const groups = [];
  const by = new Map();
  let peak = 0;
  let live = 0;
  let frames = 0;
  let frameW = 0;
  let frameH = 0;
  for (const a of parts) {
    frames += a.frames || 0;
    live += a.live || 0;
    if (!frameW && a.frameW) {
      frameW = a.frameW;
      frameH = a.frameH;
    }
    for (const g of a.groups || []) {
      const shot = g.shot || '(no shot)';
      let dst = by.get(shot);
      if (!dst) {
        dst = { shot, n: 0, area: 0, T: typeof g.T === 'number' ? g.T : 0 };
        by.set(shot, dst);
        groups.push(dst);
      }
      dst.n += g.n || 0;
      dst.area += g.area || 0;
      if (typeof g.T === 'number' && g.T < dst.T) dst.T = g.T;
    }
  }
  groups.sort((a, b) => a.T - b.T || (a.shot < b.shot ? -1 : a.shot > b.shot ? 1 : 0));
  return { groups, peak: playbackPeak(parts), live, frameW, frameH, frames };
}

async function gatherCanvasAudit(loadable, { from, to, shotId, pagesOpened, frameWidth, frameHeight }) {
  const ranges = splitFrameRange(from, to, canvasWorkerCount(to - from));
  if (!ranges.length) return { groups: [], peak: 0, live: 0, frameW: 0, frameH: 0, frames: 0 };
  const browsers = await Promise.all(ranges.map(() => C.launch(['--js-flags=--expose-gc'])));
  const pages = [];
  try {
    const opened = await Promise.all(browsers.map((b, i) => C.openPage(b, loadable, {
      scale: 0.25,
      prefix: `check-canvas${i}`,
      only: shotId,
      frameWidth,
      frameHeight,
      readback: false,
    })));
    pages.push(...opened);
    for (const pg of opened) pagesOpened.push(pg);
    const bad = opened.find((pg) => !pg.info);
    if (bad) {
      const err = new Error('FILM did not initialise');
      err.loadErr = bad.loadErrors;
      throw err;
    }
    for (const pg of opened) pg.page.setDefaultTimeout(180000);
    const jobs = ranges.map(([a, b]) => [a > 0 ? Math.max(0, a - CANVAS_WARMUP) : a, b, a]);
    const parts = await Promise.all(opened.map((pg, i) => pg.page.evaluate(([a, b, rec]) => window.__h.canvasAudit(a, b, rec), jobs[i])));
    return mergeCanvasAudits(parts);
  } finally {
    await Promise.all(pages.map((p) => p.close().catch(() => {})));
    await Promise.all(browsers.map((b) => b.close().catch(() => {})));
  }
}

// Largest all-empty rectangle in a 5×3 grid (row-major). Ties keep the topmost, then leftmost.
function largestEmpty(cells, cut) {
  const cols = 3;
  const rows = 5;
  const empty = cells.map((v) => v < cut);
  let best = { area: 0, r0: 0, r1: -1, c0: 0, c1: -1 };
  for (let r0 = 0; r0 < rows; r0++) {
    for (let r1 = r0; r1 < rows; r1++) {
      for (let c0 = 0; c0 < cols; c0++) {
        for (let c1 = c0; c1 < cols; c1++) {
          let ok = true;
          for (let r = r0; r <= r1 && ok; r++) {
            for (let c = c0; c <= c1; c++) if (!empty[r * cols + c]) ok = false;
          }
          const area = (r1 - r0 + 1) * (c1 - c0 + 1);
          if (ok && area > best.area) best = { area, r0, r1, c0, c1 };
        }
      }
    }
  }
  return best;
}

function densityPct(frac) {
  return (frac * 100).toFixed(1);
}

function emptyPct(area) {
  const v = Math.round((area / 15) * 1000) / 10;
  return Math.abs(v - Math.round(v)) < 1e-6 ? String(Math.round(v)) : v.toFixed(1);
}

function densityLine(id, density, rect) {
  const where = rect.area ? `cells r${rect.r0}c${rect.c0}–r${rect.r1}c${rect.c1}` : 'none';
  return `shot ${id}: density ${densityPct(density)}%, largest empty ${emptyPct(rect.area)}% of safe area (${where})`;
}

// Safe-area edge detail at scale 0.5, grain post off. `grad` is the luminance step that counts as an edge.
function sampleDensity(page, T, grad) {
  return page.evaluate(([T, grad]) => {
    window.__h.render(T, { post: false });
    const c = window.FILM.canvas;
    const W = c.width;
    const H = c.height;
    const S = W / window.FILM.W;
    const data = window.FILM.ctx.getImageData(0, 0, W, H).data;
    const lum = new Float32Array(W * H);
    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
      lum[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }
    const box = window.FILM.safeArea();
    const x0 = Math.round(box.x0 * S);
    const x1 = Math.round(box.x1 * S);
    const y0 = Math.round(box.y0 * S);
    const y1 = Math.round(box.y1 * S);
    const cols = 3;
    const rows = 5;
    const cw = (x1 - x0) / cols;
    const ch = (y1 - y0) / rows;
    const cellOn = new Uint32Array(rows * cols);
    const cellTot = new Uint32Array(rows * cols);
    let safeOn = 0;
    let safeTot = 0;
    // 2×2 box, stepped by 2px: paper grain and blueprint noise average out, an ink edge still moves the block
    for (let y = 0; y + 3 < H; y += 2) {
      for (let x = 0; x + 3 < W; x += 2) {
        if (x < x0 || x + 3 >= x1 || y < y0 || y + 3 >= y1) continue;
        const i00 = y * W + x;
        const i10 = i00 + 2;
        const i01 = i00 + 2 * W;
        const a00 = (lum[i00] + lum[i00 + 1] + lum[i00 + W] + lum[i00 + W + 1]) * 0.25;
        const a10 = (lum[i10] + lum[i10 + 1] + lum[i10 + W] + lum[i10 + W + 1]) * 0.25;
        const a01 = (lum[i01] + lum[i01 + 1] + lum[i01 + W] + lum[i01 + W + 1]) * 0.25;
        const on = Math.hypot(a10 - a00, a01 - a00) >= grad;
        safeTot++;
        if (on) safeOn++;
        const ci = Math.min(cols - 1, ((x - x0) / cw) | 0);
        const ri = Math.min(rows - 1, ((y - y0) / ch) | 0);
        const k = ri * cols + ci;
        cellTot[k]++;
        if (on) cellOn[k]++;
      }
    }
    const cells = [];
    for (let k = 0; k < cellOn.length; k++) cells.push(cellTot[k] ? cellOn[k] / cellTot[k] : 0);
    return { density: safeTot ? safeOn / safeTot : 0, cells };
  }, [T, grad]);
}

async function main() {
  let densityReported = false;
  let canvasReported = false;
  const args = C.parseArgs(process.argv.slice(2), ['fixtures', 'flash-skip', 'canvas-skip']);
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
  console.log(`check ${fixtures ? '(fixtures)' : '(src)'}${shotId ? ` --shot ${shotId}` : ''}: ${shotId ? `1 of ${TL.shots.length} shots` : `${TL.shots.length} shots`}, ${TL.duration}s, ${TL.width}×${TL.height}, scale ${scale}`);
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
    // must-read text stays inside the safe area: flag .text() with a literal y below it.
    // 1080×1920 keeps y > 1540 as a failure. Other formats use the same box and warn (a vertical
    // plate retargeted to 16:9 or 1:1 still has its old literals; the gate stays green).
    const box = C.safeArea(TL.width, TL.height);
    const shorts = TL.width === 1080 && TL.height === 1920;
    const unsafeText = /\b(?:lib|L|LIB)\.text\s*\(\s*[^,]+,\s*[^,]+,\s*[^,]+,\s*(\d{3,4})/;
    const textWarns = [];
    for (const f of files) {
      if (!fs.existsSync(f)) continue;
      stripComments(fs.readFileSync(f, 'utf8')).split('\n').forEach((line, i) => {
        const m = line.match(unsafeText);
        if (!(m && Number(m[1]) > box.y1)) return;
        const msg = `${C.rel(f)}:${i + 1}  text y ${m[1]} ${shorts ? `below the Shorts safe area (y must be <= ${box.y1})` : `outside the title-safe area (y must be <= ${box.y1})`}  | ${line.trim().slice(0, 100)}`;
        if (shorts) hits.push(msg);
        else textWarns.push(`warn: ${msg}`);
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
      hits.length ? false : hexWarns.length || textWarns.length ? 'WARN' : true,
      hits.length
        ? `${hits.length} banned call(s)`
        : `no Math.random / Date / performance.now / crypto randomness or unsafe-area text in ${files.length} files${hexWarns.length ? `; ${hexWarns.length} literal colour(s) outside lib.js` : ''}${textWarns.length ? `; ${textWarns.length} text call(s) outside the title-safe area` : ''}`,
      [...hits, ...textWarns, ...hexWarns]
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
    const GRADE_RANGE = { warmth: [-1, 1], fade: [0, 1], vignette: [0, 1], paperAge: [0, 1], tintAmount: [0, 1] };
    const palNames = readPalNames();
    if (!palNames.size) tlProblems.push('could not read colour names from lib.pal');
    shots.forEach((s, i) => {
      if (typeof s.id !== 'string' || !s.id) tlProblems.push(`shot #${i} has no id`);
      else if (ids.has(s.id)) tlProblems.push(`duplicate shot id '${s.id}'`);
      ids.add(s.id);
      if (!(s.dur > 0)) tlProblems.push(`shot '${s.id}' has non-positive length (${s.start}..${s.end})`);
      if (i === 0 && Math.abs(s.start) > EPS) tlProblems.push(`first shot '${s.id}' starts at ${s.start}, not 0`);
      if (i > 0) {
        const prev = shots[i - 1];
        const d = s.start - prev.end;
        if (d > EPS) tlProblems.push(`gap of ${d.toFixed(4)}s between '${prev.id}' (ends ${prev.end}) and '${s.id}' (starts ${s.start})`);
        if (d < -EPS) tlProblems.push(`overlap of ${(-d).toFixed(4)}s between '${prev.id}' (ends ${prev.end}) and '${s.id}' (starts ${s.start})`);
      }
      if (Math.abs(s.start * FPS - Math.round(s.start * FPS)) > 1e-4) tlWarnings.push(`shot '${s.id}' starts between frames (${s.start}s)`);
      if (offGrid(s.start)) tlWarnings.push(`shot '${s.id}' starts at ${s.start}s, off the 16th-note grid at ${TL.bpm} bpm`);
      const tr = s.transitionIn;
      if (tr) {
        const kinds = ['cut', 'fade', 'flash', 'iris', 'wipe', 'whip', 'inkwash', 'morph'];
        if (!kinds.includes(tr.kind)) tlProblems.push(`shot '${s.id}' transitionIn kind '${tr.kind}' is not one of ${kinds.join(', ')}`);
        if (!(tr.dur >= 0) || tr.dur > s.dur) tlProblems.push(`shot '${s.id}' transitionIn dur ${tr.dur} must be between 0 and the shot length ${s.dur}`);
        if (tr.kind === 'whip' && !['left', 'right', 'up', 'down'].includes(tr.dir)) {
          tlProblems.push(`shot '${s.id}' whip transition dir '${tr.dir}' is not one of left, right, up, down`);
        }
        if (i === 0 && tr.kind !== 'cut') tlWarnings.push(`shot '${s.id}' is first; its transitionIn is ignored`);
      }
      const m = String(s.mode || '').toLowerCase();
      if (!/illus|schem|blue|none|raw/.test(m)) tlWarnings.push(`shot '${s.id}' mode '${s.mode}' is neither illustrated nor schematic (treated as illustrated)`);
      if (s.grade != null) {
        const g = s.grade;
        if (typeof g !== 'object' || Array.isArray(g)) {
          tlProblems.push(`shot '${s.id}' grade must be an object`);
        } else {
          for (const key of Object.keys(g)) {
            if (!Object.prototype.hasOwnProperty.call(GRADE_RANGE, key) && key !== 'tint') {
              tlProblems.push(`shot '${s.id}' grade.${key} is not a grade field`);
            }
          }
          for (const [key, [lo, hi]] of Object.entries(GRADE_RANGE)) {
            if (g[key] == null) continue;
            const n = g[key];
            if (typeof n !== 'number' || !isFinite(n) || n < lo || n > hi) {
              tlProblems.push(`shot '${s.id}' grade.${key} ${n} is outside ${lo}..${hi}`);
            }
          }
          if (g.tint != null && (typeof g.tint !== 'string' || !palNames.has(g.tint))) {
            tlProblems.push(`shot '${s.id}' grade.tint '${g.tint}' is not a colour in lib.pal`);
          }
        }
      }
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
      geo = C.loadGeo(src.geoFile, TL);
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
  {
    const ids = geo && typeof geo === 'object' ? geo : {};
    for (const s of TL.shots) {
      const tr = s.transitionIn;
      if (!tr || tr.kind !== 'morph') continue;
      for (const key of ['from', 'to']) {
        const id = tr[key];
        if (typeof id !== 'string' || !id) tlProblems.push(`shot '${s.id}' morph transition ${key} is missing`);
        else if (!Object.prototype.hasOwnProperty.call(ids, id)) tlProblems.push(`shot '${s.id}' morph transition ${key} '${id}' is not in FILM.GEO`);
      }
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
  const openOpts = (prefix) => ({ scale, prefix, only: shotId, frameWidth: TL.width, frameHeight: TL.height });
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
        const f0 = Math.ceil(shot.start * FPS - 1e-6);
        const f1 = Math.ceil(shot.end * FPS - 1e-6) - 1;
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
      const sweepFrom = shotId ? Math.ceil(SHOTS[0].start * FPS - 1e-6) : 0;
      const sweepTo = shotId ? Math.ceil(SHOTS[0].end * FPS - 1e-6) : total; // exclusive
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
          const r = await pg.page.evaluate((arg) => window.__h.geoMeasure(arg.id, arg.T, 40, arg.K, arg.view), {
            id: fr.id, T: fr.T, K, view: fr.zoom ? { zoom: fr.zoom, about: fr.about } : null,
          });
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

      // ---------------------------------------------------------------- 10 density
      // WARN only: this check never fails the gate.
      //
      // Each shot's first, middle and last frame is drawn with the grain post off, on its own page at
      // scale 0.5 (so a warm scale-1 cache cannot leak into the sample, and checks 1–8 are untouched).
      // Detail is the fraction of safe-area samples (FILM.safeArea: x 60–940, y 220–1540 on 1080×1920,
      // otherwise the centred 90% box) whose 2×2-box luminance gradient is at least 24. Those samples also fill a 3×5 grid (3 columns, 5 rows). A cell is empty
      // below 1% detail. Emptiness is the largest empty rectangle, as a fraction of the safe area.
      // The line is the worst of the three frames. Warn when detail < 6% or the rectangle is at least
      // 6 of the 15 cells (40%).
      //
      // The bar sits in the gap found on the per-frame pass: stub plates top out at 5.7% detail, the
      // quietest fixture frame is fx-meadow at 6.2%, and the quietest butterfly frame that is not an
      // opening hold is j-hang's last at 6.8%. Lines below are the check's own worst-frame line per shot.
      //
      // butterfly (5.9s, 51 frames). Five warnings, each a deliberate quiet opening:
      //   egg-blueprint   shot 02, a spark on navyDeep; the blueprint plate fades in at T 2.0
      //   instar-ladder   first frame, the five outlines draw on from an empty plate
      //   eclosion        first frame is the cream flash (transitionIn flash, 0.125s)
      //   wing-veins      first frame, the veins have not grown out from the wing bases
      //   sun-compass     first frame is the draw-on, before the dome and dial fill in
      //   shot hero-on-milkweed: density 19.6%, largest empty 0% of safe area (none)
      //   warn: shot egg-blueprint: density 0.0%, largest empty 100% of safe area (cells r0c0–r4c2)
      //   shot egg-hatch: density 24.2%, largest empty 20% of safe area (cells r4c0–r4c2)
      //   shot larva-molts: density 17.4%, largest empty 0% of safe area (none)
      //   warn: shot instar-ladder: density 2.6%, largest empty 13.3% of safe area (cells r0c0–r0c1)
      //   shot j-hang: density 9.7%, largest empty 6.7% of safe area (cells r1c0–r1c0)
      //   shot inside-chrysalis: density 9.9%, largest empty 20% of safe area (cells r2c0–r4c0)
      //   shot chrysalis-days: density 17.5%, largest empty 0% of safe area (none)
      //   warn: shot eclosion: density 0.0%, largest empty 100% of safe area (cells r0c0–r4c2)
      //   warn: shot wing-veins: density 4.0%, largest empty 26.7% of safe area (cells r1c0–r4c0)
      //   shot scale-mosaic: density 8.5%, largest empty 26.7% of safe area (cells r0c0–r3c0)
      //   warn: shot sun-compass: density 5.2%, largest empty 13.3% of safe area (cells r2c0–r3c0)
      //   shot pull-back-continent: density 13.3%, largest empty 13.3% of safe area (cells r0c0–r0c1)
      //   shot migration-column: density 19.1%, largest empty 0% of safe area (none)
      //   shot oyamel-winter: density 21.2%, largest empty 0% of safe area (none)
      //   shot spring-egg: density 25.2%, largest empty 0% of safe area (none)
      //   shot egg-loop: density 16.3%, largest empty 0% of safe area (none)
      //
      // arctic-tern (3.0s, 51 frames). Four warnings: the spark, a draw-on that never fills, a 40% hole, the flash.
      //   shot hero-hover: density 9.8%, largest empty 0% of safe area (none)
      //   warn: shot egg-blueprint: density 0.0%, largest empty 100% of safe area (cells r0c0–r4c2)
      //   shot egg-hatch: density 23.3%, largest empty 20% of safe area (cells r0c0–r0c2)
      //   shot chick-feeding: density 13.4%, largest empty 6.7% of safe area (cells r0c0–r0c0)
      //   warn: shot growth-ladder: density 1.2%, largest empty 53.3% of safe area (cells r1c1–r4c2)
      //   warn: shot wing-stretch: density 8.6%, largest empty 40% of safe area (cells r1c0–r2c2)
      //   shot pin-feather: density 8.1%, largest empty 13.3% of safe area (cells r0c1–r1c1)
      //   shot midnight-sun: density 15.9%, largest empty 20% of safe area (cells r1c0–r1c2)
      //   warn: shot first-flight: density 0.0%, largest empty 100% of safe area (cells r0c0–r4c2)
      //   shot wing-schematic: density 6.4%, largest empty 20% of safe area (cells r4c0–r4c2)
      //   shot feather-mosaic: density 8.0%, largest empty 20% of safe area (cells r0c0–r0c2)
      //   shot two-summers: density 10.6%, largest empty 13.3% of safe area (cells r0c0–r0c1)
      //   shot pull-back-atlantic: density 15.5%, largest empty 13.3% of safe area (cells r0c0–r1c0)
      //   shot ocean-flock: density 11.0%, largest empty 0% of safe area (none)
      //   shot pack-ice: density 15.9%, largest empty 0% of safe area (none)
      //   shot return-egg: density 18.7%, largest empty 0% of safe area (none)
      //   shot egg-loop: density 12.4%, largest empty 6.7% of safe area (cells r4c1–r4c1)
      //
      // fixtures stay quiet (lib-showcase 24.8%/0%, fx-egg 13.0%/20%, fx-meadow 6.2%/20%, palette 12.9%/13.3%).
      //
      // stubgen placeholders, on a temp copy of the fixture timeline (not committed). Every shot warns:
      //   warn: shot lib-showcase: density 5.1%, largest empty 6.7% of safe area (cells r0c0–r0c0)
      //   warn: shot fx-egg: density 3.8%, largest empty 6.7% of safe area (cells r0c0–r0c0)
      //   warn: shot fx-meadow: density 4.3%, largest empty 40% of safe area (cells r1c0–r2c2)
      //   warn: shot palette: density 4.8%, largest empty 6.7% of safe area (cells r0c0–r0c0)
      {
        const GRAD = 24;
        const MIN_DETAIL = 0.06;
        const CELL_EMPTY = 0.01;
        const HOLE = 6;
        const tD = Date.now();
        let pgD = null;
        try {
          pgD = await C.openPage(browser, loadable, { scale: 0.5, prefix: 'check-density', only: shotId, frameWidth: TL.width, frameHeight: TL.height });
          pagesOpened.push(pgD);
          if (!pgD.info) throw new Error('FILM did not initialise');
          let warns = 0;
          let framesN = 0;
          const details = [];
          for (const shot of SHOTS) {
            const f0 = Math.ceil(shot.start * FPS - 1e-6);
            const f1 = Math.ceil(shot.end * FPS - 1e-6) - 1;
            if (f1 < f0) continue;
            const fm = Math.floor((f0 + f1) / 2);
            let worst = null;
            for (const f of [f0, fm, f1]) {
              const m = await sampleDensity(pgD.page, f / FPS, GRAD);
              framesN++;
              const rect = largestEmpty(m.cells, CELL_EMPTY);
              const bad = m.density < MIN_DETAIL || rect.area >= HOLE;
              const rank = (bad ? 0 : 1) * 100 - rect.area + m.density;
              if (!worst || rank < worst.rank) worst = { m, rect, bad, rank };
            }
            if (!worst) continue;
            if (worst.bad) warns++;
            const text = densityLine(shot.id, worst.m.density, worst.rect);
            details.push(worst.bad ? `warn: ${text}` : text);
          }
          const sec = ((Date.now() - tD) / 1000).toFixed(1);
          report(
            10,
            'density',
            warns ? 'WARN' : true,
            `${SHOTS.length} shots, ${framesN} frames at scale 0.5 (${sec}s)${warns ? `: ${warns} under the bar` : ': none under the bar'}`,
            details
          );
          densityReported = true;
        } catch (e) {
          report(10, 'density', 'WARN', `not measured: ${e.message}`, []);
          densityReported = true;
        } finally {
          if (pgD) await pgD.close();
        }
      }

      // ---------------------------------------------------------------- 11 canvas
      // Own browsers, so a warm scale-1 cache cannot satisfy the pass. Scale is 0.25 even when
      // --scale says otherwise. post is off inside canvasAudit. Every frame, twice.
      if (args['canvas-skip']) {
        report(11, 'canvas', 'SKIP', 'skipped (--canvas-skip)');
        canvasReported = true;
      } else {
        const tC = Date.now();
        try {
          const from = shotId ? Math.ceil(SHOTS[0].start * FPS - 1e-6) : 0;
          const to = shotId ? Math.max(from, Math.ceil(SHOTS[0].end * FPS - 1e-6)) : Math.max(0, Math.round(TL.duration * FPS));
          const audit = await gatherCanvasAudit(loadable, {
            from,
            to,
            shotId,
            pagesOpened,
            frameWidth: TL.width,
            frameHeight: TL.height,
          });
          const sec = ((Date.now() - tC) / 1000).toFixed(1);
          const frameArea = audit.frameW * audit.frameH;
          const over = frameArea > 0 && audit.peak > frameArea * 16;
          const lines = (audit.groups || []).map((g) => {
            const n = g.n;
            const t = typeof g.T === 'number' ? g.T : 0;
            return `shot ${g.shot}: ${n} canvas${n === 1 ? '' : 'es'}, total area ${Math.round(g.area)}, first T=${t.toFixed(3)}`;
          });
          const warn = over
            ? `warn: peak live canvas area ${Math.round(audit.peak)} is ${(audit.peak / frameArea).toFixed(1)}× the frame (${audit.frameW}×${audit.frameH})`
            : null;
          const ok = lines.length ? false : over ? 'WARN' : true;
          const summary = lines.length === 1
            ? `${lines[0]} (${sec}s)`
            : lines.length
              ? `${lines.length} shots allocated canvases on the warm pass (${sec}s)`
              : `${audit.frames} frames twice at scale 0.25 (${sec}s): warm pass allocated nothing${over ? '; peak live area exceeds 16× the frame' : ''}`;
          report(11, 'canvas', ok, summary, [...(lines.length > 1 ? lines : []), ...(warn ? [warn] : [])]);
          canvasReported = true;
        } catch (e) {
          report(11, 'canvas', 'WARN', `not measured: ${e.message}`, []);
          canvasReported = true;
        }
      }

      // ---------------------------------------------------------------- 2 determinism
      // Every shot is always covered: first, middle and last frame, plus one frame inside each non-cut
      // transition. --det adds evenly spaced frames on top and can never drop a shot.
      const tDet = Date.now();
      const candidates = [];
      let transitions = 0;
      for (const s of SHOTS) {
        const f0 = Math.ceil(s.start * FPS - 1e-6);
        const f1 = Math.ceil(s.end * FPS - 1e-6) - 1;
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

  // ---------------------------------------------------------------- 9 flash
  // The gate browser is already closed: this check launches its own, so a 32s film is not
  // drawn on top of the determinism pages.
  // Calibration (check.cjs and common.cjs copied onto the films, src left alone, then reverted):
  //   butterfly-life: PASS, no window over 3 (max 1 general, 0 red), flash 18.3s, gate OK in 107.3s
  //   arctic-tern-life: PASS, no window over 3 (max 2 general, 0 red), flash 6.0s, gate OK in 50.5s
  if (args['flash-skip']) {
    report(9, 'flash', 'SKIP', 'skipped (--flash-skip)');
  } else {
    const tFlash = Date.now();
    try {
      const from = shotId ? Math.ceil(SHOTS[0].start * FPS - 1e-6) : 0;
      const to = shotId ? Math.max(from, Math.ceil(SHOTS[0].end * FPS - 1e-6)) : Math.max(0, Math.round(TL.duration * FPS));
      const buf = await gatherFlashSamples(loadable, { from, to, shotId, fps: FPS, cols: 8, rows: 14, pagesOpened, frameWidth: TL.width, frameHeight: TL.height });
      const stats = analyzeFlashBlocks(buf, { from, cols: 8, rows: 14, fps: FPS });
      const sec = ((Date.now() - tFlash) / 1000).toFixed(1);
      const gW = worstViolation(stats.general);
      const rW = worstViolation(stats.red);
      const details = [
        ...stats.general.violations.map((v) => `general T=${(v.frame / FPS).toFixed(3)}..${(v.end / FPS).toFixed(3)}: ${v.max} flashes, ${flashPct(v.area)} of the frame`),
        ...stats.red.violations.map((v) => `red T=${(v.frame / FPS).toFixed(3)}..${(v.end / FPS).toFixed(3)}: ${v.max} flashes, ${flashPct(v.area)} of the frame`),
      ];
      if (gW || rW) {
        const parts = [];
        if (gW) parts.push(flashFailLine('general', gW, FPS));
        if (rW) parts.push(flashFailLine('red', rW, FPS));
        report(9, 'flash', false, `${parts.join('; ')} (${sec}s)`, details);
      } else {
        report(
          9,
          'flash',
          true,
          `no window over 3 flashes (max ${stats.general.max} general, ${stats.red.max} red; ${stats.nFrames} frames, scale 0.25, ${sec}s)`
        );
      }
    } catch (e) {
      const loadErr = (e.loadErr || []).map((err) => `script error ${err.file}:${err.line}:${err.col} ${err.message}`);
      report(9, 'flash', false, e.loadErr ? e.message : `flash check failed: ${e && e.message ? e.message : e}`, loadErr);
    }
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

  if (!densityReported) report(10, 'density', 'WARN', 'not measured', []);
  if (!canvasReported) report(11, 'canvas', args['canvas-skip'] ? 'SKIP' : 'WARN', args['canvas-skip'] ? 'skipped (--canvas-skip)' : 'not measured', []);

  results.sort((a, b) => a.n - b.n);
  const failed = results.filter((r) => r.ok === false);
  console.log('\nsummary');
  for (const r of results) console.log(`  [${r.tag}] ${r.n} ${r.name}: ${r.summary}`);
  console.log(`${failed.length ? 'FAILED' : 'OK'} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  process.exit(failed.length ? 1 : 0);
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e && e.stack ? e.stack : e);
    process.exit(2);
  });
}

module.exports = { analyzeFlashBlocks };
