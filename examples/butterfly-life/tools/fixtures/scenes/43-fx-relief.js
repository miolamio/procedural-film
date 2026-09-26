// Fixture plates for the relief theme (a heat map / relief): one massif as a false-colour
// perspective mesh on black, wire of one constant width over every quad, an amber thread (one
// isoline) drawing itself round the mountain, pixel-font labels and ruler brackets. Over the
// second half of plate A the camera rises and looks straight down; the last frame is the map
// from above. Plate B is the same surface as an isoline map on black: the thread's isoline keeps
// every pixel across the cut, the brackets and the legend hold.
// Colours are the theme's rows (themes/relief/palette.js); the fixture film keeps the house
// lib.pal, so the plate carries them here and RL_RAMP gives lib.rampRGB hex stops (a film:
// ramp 'relief'). Plate A fills the quads of lib.heightMesh itself with a lambert shade; plate B
// strokes each level through lib.heightfield's contour mode with that level's colour.
const RL = {
  void: '#000000', blue: '#1E3F9A', sand: '#D8C48A', red: '#901B20', sun: '#DFC505',
  wire: '#E6E1D3', dim: '#6E7280', amber: '#FF9F1C', amberHot: '#FFE2A8',
};
// the relief ramp: sea blue to a sand coast, red slopes, a yellow summit (a film: lib.ramp('relief', v))
const RL_RAMP = [[0, RL.blue], [0.3, RL.blue], [0.3, RL.sand], [0.7, RL.red], [1, RL.sun]];
const RL_BOX = [90, 520, 900, 900]; // the map's footprint; the mesh stands on it
const RL_RANGE = [0, 1];
const RL_LIFT = 340; // px for the whole range
const RL_CUT = 0.2; // below this the sea is left black: an island on the void
const RL_THREAD = 0.62; // the amber isoline
const RL_LEVELS = [0.3, 0.34, 0.38, 0.42, 0.46, 0.5, 0.54, 0.58, 0.62, 0.66, 0.7, 0.74, 0.78, 0.82, 0.86, 0.9, 0.94];
const RL_METRES = 2600; // a height of 1 in metres, for the labels
const RL_GRID = 96; // the field is sampled once on 97 × 97 nodes

const rlCss = (c, s = 1) => `rgb(${Math.min(255, Math.round(c[0] * s))},${Math.min(255, Math.round(c[1] * s))},${Math.min(255, Math.round(c[2] * s))})`;

// The massif: a warped mass with a main summit, two lower tops and sharp ridged crests, on a
// nearly flat sea floor. Sampled once into a grid, which every picture below reads.
let RL_FIELD = null;
function rlField(L) {
  if (RL_FIELD) return RL_FIELD;
  const n = RL_GRID + 1;
  const data = new Float32Array(n * n);
  const bump = (u, v, cu, cv, k) => Math.exp(-((u - cu) ** 2 + (v - cv) ** 2) * k);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const u = i / RL_GRID, v = j / RL_GRID;
      const wu = u + 0.09 * L.fbm2(u * 2.2, v * 2.2, 31, 3), wv = v + 0.09 * L.fbm2(u * 2.2 + 7, v * 2.2, 32, 3);
      const r = Math.hypot((wu - 0.5) * 1.08, (wv - 0.5) * 0.96);
      const mass = L.smoothstep(0.58, 0.12, r);
      const tops = 0.46 * bump(wu, wv, 0.56, 0.4, 26) + 0.26 * bump(wu, wv, 0.34, 0.6, 40) + 0.2 * bump(wu, wv, 0.68, 0.68, 55);
      const crest = 1 - Math.abs(L.fbm2(u * 5, v * 5, 33, 4));
      const rough = L.fbm2(u * 14, v * 14, 34, 3);
      const land = mass * (0.3 + tops + 0.22 * crest * crest * crest + 0.025 * rough);
      data[j * n + i] = L.clamp(0.08 + 0.015 * rough + land, 0, 0.999);
    }
  }
  RL_FIELD = { w: n, h: n, data };
  return RL_FIELD;
}

function rlHeight(F, u, v) {
  const x = L01(u) * (F.w - 1), y = L01(v) * (F.h - 1);
  const i = Math.min(F.w - 2, Math.floor(x)), j = Math.min(F.h - 2, Math.floor(y));
  const fx = x - i, fy = y - j, d = F.data, k = j * F.w + i;
  return (d[k] + (d[k + 1] - d[k]) * fx) * (1 - fy) + (d[k + F.w] + (d[k + F.w + 1] - d[k + F.w]) * fx) * fy;
}
function L01(x) {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

// The thread: the longest loop of the RL_THREAD isoline, in unit (u, v), with its arc length.
// isolines of the grid at one level, in unit (u, v): sampled on the grid's own nodes (isolines
// takes a cell of at least 1), the lines lib.heightfield's contour mode strokes on plate B
const RL_ISO = new Map();
function rlIso(L, level) {
  if (RL_ISO.has(level)) return RL_ISO.get(level);
  const F = rlField(L);
  const G = RL_GRID;
  const lines = L.isolines((x, y) => rlHeight(F, x / G, y / G), [0, 0, G, G], level, { cell: 1 }).map((l) => ({
    pts: l.pts.map(([x, y]) => [x / G, y / G]),
    closed: l.closed,
  }));
  RL_ISO.set(level, lines);
  return lines;
}

let RL_LOOP = null;
function rlThread(L) {
  if (RL_LOOP) return RL_LOOP;
  const lines = rlIso(L, RL_THREAD);
  let best = null, bestLen = -1;
  for (const l of lines) {
    let len = 0;
    for (let k = 1; k < l.pts.length; k++) len += Math.hypot(l.pts[k][0] - l.pts[k - 1][0], l.pts[k][1] - l.pts[k - 1][1]);
    if (len > bestLen) {
      bestLen = len;
      best = l;
    }
  }
  // start the draw-on at the loop's lowest point on screen (largest v), running clockwise
  const pts = best.pts.slice();
  if (best.closed && pts.length > 2) {
    let at = 0;
    pts.forEach((p, k) => (p[1] > pts[at][1] ? (at = k) : 0));
    const ring = pts.slice(at).concat(pts.slice(0, at));
    ring.push(ring[0]);
    pts.length = 0;
    pts.push(...ring);
  }
  const acc = [0];
  for (let k = 1; k < pts.length; k++) acc.push(acc[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
  RL_LOOP = { pts, acc, len: acc[acc.length - 1], closed: best.closed, all: lines };
  return RL_LOOP;
}

// The view of plate A at shot time t: a slow weightless yaw for the first half, then the camera
// rises and looks straight down, landing on the map (rot [π/2, 0, 0], persp 0) on the last frame.
function rlView(t, dur, fps) {
  const last = dur - 1 / fps;
  const k = L01((t - 0.42) / (last - 0.42));
  const e = k * k * (3 - 2 * k);
  const yaw = (-0.36 + 0.14 * (t / dur)) * (1 - e);
  const pitch = 0.9 + (Math.PI / 2 - 0.9) * e;
  const p0 = 2.4 * RL_BOX[2];
  const inv = (1 - e) / p0; // 1/persp eases to 0: the picture flattens without a jump
  return {
    e,
    opts: {
      box: RL_BOX, range: RL_RANGE, lift: RL_LIFT, mode: 'mesh',
      rot: [pitch, yaw, 0], persp: inv > 1e-9 ? 1 / inv : 0,
      at: [RL_BOX[0] + RL_BOX[2] / 2, RL_BOX[1] + RL_BOX[3] / 2 + 50 * (1 - e)],
      scale: 1 + 0.12 * (1 - e),
    },
  };
}

// Plate A: the quads of lib.heightMesh, far to near, each filled in the ramp with a lambert
// shade, its four edges stroked in wire of one width; the thread's segments ride in the quad
// they cross, so the near slopes hide the far side of the loop.
const RL_MESH_RES = 48;
let RL_MESH = null;
function rlMeshOf(L) {
  if (RL_MESH) return RL_MESH;
  const F = rlField(L);
  const m = L.heightMesh(F, { box: RL_BOX, range: RL_RANGE, lift: RL_LIFT, res: RL_MESH_RES });
  const nx = RL_MESH_RES, stride = nx + 1;
  const ny = m.verts.length / stride - 1;
  // per quad: colour and shade (light from the upper left, behind), its height and whether it is sea
  const light = [-0.45, 0.8, -0.4];
  const ll = Math.hypot(...light);
  const quads = [];
  const c = [0, 0, 0];
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const a = j * stride + i, b = a + 1, d = a + stride + 1, e = a + stride;
      const V = m.verts;
      const h = (V[a][1] + V[b][1] + V[d][1] + V[e][1]) / (4 * RL_LIFT);
      if (h < RL_CUT) {
        quads.push(null);
        continue;
      }
      const ux = V[d][0] - V[a][0], uy = V[d][1] - V[a][1], uz = V[d][2] - V[a][2];
      const vx = V[e][0] - V[b][0], vy = V[e][1] - V[b][1], vz = V[e][2] - V[b][2];
      let nxv = uy * vz - uz * vy, nyv = uz * vx - ux * vz, nzv = ux * vy - uy * vx;
      if (nyv < 0) {
        nxv = -nxv;
        nyv = -nyv;
        nzv = -nzv;
      }
      const nl = Math.hypot(nxv, nyv, nzv) || 1;
      const lam = Math.max(0, (nxv * light[0] + nyv * light[1] + nzv * light[2]) / (nl * ll));
      const s = 0.74 + 0.36 * lam;
      L.rampRGB(RL_RAMP, h, c);
      quads.push({ a, b, d, e, fill: rlCss(c, Math.min(1.06, s)) });
    }
  }
  RL_MESH = { verts: m.verts, quads, nx, ny, stride };
  return RL_MESH;
}

function rlDrawMesh(ctx, L, view, reveal) {
  const M = rlMeshOf(L);
  const n = M.verts.length;
  const P = new Float32Array(n * 3);
  for (let k = 0; k < n; k++) {
    const p = L.project3d(M.verts[k], view);
    P[k * 3] = p[0];
    P[k * 3 + 1] = p[1];
    P[k * 3 + 2] = p[2];
  }
  const order = [];
  M.quads.forEach((q, i) => {
    if (q) order.push([(P[q.a * 3 + 2] + P[q.b * 3 + 2] + P[q.d * 3 + 2] + P[q.e * 3 + 2]) / 4, i]);
  });
  order.sort((x, y) => x[0] - y[0] || x[1] - y[1]);

  // the thread's shown part as segments, bucketed by the quad each one crosses
  const T = rlThread(L);
  const upto = reveal * T.len;
  const seg = new Map();
  let head = null;
  for (let k = 1; k < T.pts.length && T.acc[k - 1] < upto; k++) {
    let [u0, v0] = T.pts[k - 1], [u1, v1] = T.pts[k];
    if (T.acc[k] > upto) {
      const f = (upto - T.acc[k - 1]) / (T.acc[k] - T.acc[k - 1]);
      u1 = u0 + (u1 - u0) * f;
      v1 = v0 + (v1 - v0) * f;
    }
    const q = Math.min(M.ny - 1, Math.floor(((v0 + v1) / 2) * M.ny)) * M.nx + Math.min(M.nx - 1, Math.floor(((u0 + u1) / 2) * M.nx));
    const lift = RL_THREAD * RL_LIFT + 2;
    const A = L.project3d([(u0 - 0.5) * RL_BOX[2], lift, (v0 - 0.5) * RL_BOX[3]], view);
    const B = L.project3d([(u1 - 0.5) * RL_BOX[2], lift, (v1 - 0.5) * RL_BOX[3]], view);
    if (!seg.has(q)) seg.set(q, []);
    seg.get(q).push(A[0], A[1], B[0], B[1]);
    head = [B[0], B[1], u1, v1];
  }

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  for (const [, i] of order) {
    const q = M.quads[i];
    ctx.beginPath();
    ctx.moveTo(P[q.a * 3], P[q.a * 3 + 1]);
    ctx.lineTo(P[q.b * 3], P[q.b * 3 + 1]);
    ctx.lineTo(P[q.d * 3], P[q.d * 3 + 1]);
    ctx.lineTo(P[q.e * 3], P[q.e * 3 + 1]);
    ctx.closePath();
    ctx.fillStyle = q.fill;
    ctx.fill();
    ctx.strokeStyle = RL.wire;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    const s = seg.get(i);
    if (s) {
      ctx.beginPath();
      for (let k = 0; k < s.length; k += 4) {
        ctx.moveTo(s[k], s[k + 1]);
        ctx.lineTo(s[k + 2], s[k + 3]);
      }
      ctx.strokeStyle = RL.amber;
      ctx.lineWidth = 4;
      ctx.stroke();
    }
  }
  ctx.restore();
  return head;
}

// ----- the furniture: the same on both plates, so it holds across the cut

function rlText(ctx, L, s, x, y, cell, color, o = {}) {
  return L.pixelText(ctx, s, Math.round(x), Math.round(y), cell, Object.assign({ color }, o));
}

// a ruler bracket: an L at one corner of a box, ticks every `step` px along both arms
function rlCorner(ctx, x, y, sx, sy, arm, step) {
  ctx.beginPath();
  ctx.moveTo(x + sx * arm, y);
  ctx.lineTo(x, y);
  ctx.lineTo(x, y + sy * arm);
  for (let d = step; d < arm; d += step) {
    const l = d % (step * 5) === 0 ? 14 : 7;
    ctx.moveTo(x + sx * d, y);
    ctx.lineTo(x + sx * d, y + sy * l);
    ctx.moveTo(x, y + sy * d);
    ctx.lineTo(x + sx * l, y + sy * d);
  }
  ctx.stroke();
}

function rlBrackets(ctx, L, box, color) {
  const [x0, y0, w, h] = box, x1 = x0 + w, y1 = y0 + h;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineCap = 'butt';
  rlCorner(ctx, x0, y0, 1, 1, 130, 10);
  rlCorner(ctx, x1, y0, -1, 1, 130, 10);
  rlCorner(ctx, x0, y1, 1, -1, 130, 10);
  rlCorner(ctx, x1, y1, -1, -1, 130, 10);
  // a centre tick on each side
  ctx.beginPath();
  ctx.moveTo(x0 + w / 2, y0 - 12);
  ctx.lineTo(x0 + w / 2, y0 + 12);
  ctx.moveTo(x0 + w / 2, y1 - 12);
  ctx.lineTo(x0 + w / 2, y1 + 12);
  ctx.moveTo(x0 - 12, y0 + h / 2);
  ctx.lineTo(x0 + 12, y0 + h / 2);
  ctx.moveTo(x1 - 12, y0 + h / 2);
  ctx.lineTo(x1 + 12, y0 + h / 2);
  ctx.stroke();
  ctx.restore();
}

// the frame both plates share: title block, the ruler under it, brackets round the map, legend
function rlFurniture(ctx, info, sheet, readout) {
  const L = info.lib;
  const W = info.W;
  ctx.fillStyle = RL.void;
  ctx.fillRect(0, 0, W, info.H);
  rlText(ctx, L, 'RELIEF', 90, 214, 7, RL.wire);
  rlText(ctx, L, sheet, 90, 290, 3, RL.dim);
  rlText(ctx, L, 'N 61.2113\nE 007.6847', 990, 214, 3, RL.wire, { align: 'right' });
  rlText(ctx, L, 'GRID 1:50 000', 990, 290, 3, RL.dim, { align: 'right' });
  // the ruler under the title block
  L.ticks(ctx, 90, 340, { length: 900, n: 90, major: 10, len: 8, majorLen: 18, color: RL.dim, alpha: 1, width: 1.5 });
  rlBrackets(ctx, L, [RL_BOX[0] - 20, RL_BOX[1] - 80, RL_BOX[2] + 40, RL_BOX[3] + 200], RL.wire);
  // the legend: the ramp in steps over the contour interval, heights under it
  const lx = 90, ly = 1448, lw = 900, lh = 16;
  const c = [0, 0, 0];
  const steps = 18;
  for (let k = 0; k < steps; k++) {
    L.rampRGB(RL_RAMP, 0.25 + ((k + 0.5) / steps) * 0.75, c);
    ctx.fillStyle = rlCss(c);
    ctx.fillRect(lx + (k * lw) / steps, ly, lw / steps - 3, lh);
  }
  for (let k = 0; k <= 6; k++) {
    const x = lx + (k / 6) * lw;
    rlText(ctx, L, String(Math.round((0.25 + (k / 6) * 0.75) * RL_METRES / 10) * 10), x, ly + 28, 2, RL.dim, { align: k === 0 ? 'left' : k === 6 ? 'right' : 'center' });
  }
  if (readout) rlText(ctx, L, readout, 90, 384, 2, RL.dim);
}

// a pixel label on a leader from a point: the label box knocks the lines out under it
function rlCallout(ctx, L, x, y, dx, dy, str, color) {
  const tx = x + dx, ty = y + dy;
  ctx.save();
  ctx.strokeStyle = RL.wire;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(tx, ty);
  ctx.lineTo(tx + (dx >= 0 ? 24 : -24), ty);
  ctx.stroke();
  const w = (str.length * 6 - 1) * 3;
  const bx = dx >= 0 ? tx + 30 : tx - 30 - w;
  ctx.fillStyle = RL.void;
  ctx.fillRect(bx - 8, ty - 16, w + 16, 32);
  rlText(ctx, L, str, bx, ty - 10, 3, color);
  ctx.restore();
}

const rlMetres = (h) => `${Math.round((h * RL_METRES) / 10) * 10} M`;

// where the thread carries its height: its westernmost point, in unit (u, v)
function rlTagAt(L) {
  const T = rlThread(L);
  let best = T.pts[0];
  for (const p of T.pts) if (p[0] < best[0]) best = p;
  return best;
}

function drawRelief(ctx, t, info) {
  const L = info.lib;
  const V = rlView(t, info.dur, FILM.FPS);
  const deg = (r) => Math.round((r * 180) / Math.PI);
  rlFurniture(ctx, info, 'SHEET 01  PERSPECTIVE', `PITCH ${deg(V.opts.rot[0])}  YAW ${deg(V.opts.rot[1])}  LIFT ${RL_LIFT}`);
  // the thread draws itself round the mountain over the first 60 percent of the shot
  const reveal = L.ease.inOutSine(L01(t / (info.dur * 0.6)));
  const head = rlDrawMesh(ctx, L, V.opts, reveal);
  if (head && reveal < 1) {
    ctx.fillStyle = RL.amberHot;
    ctx.beginPath();
    ctx.arc(head[0], head[1], 6, 0, Math.PI * 2);
    ctx.fill();
  }
  // the summit, pinned to the surface
  const top = L.heightPoint(rlField(L), 0.565, 0.4, V.opts);
  ctx.fillStyle = RL.wire;
  ctx.fillRect(Math.round(top[0]) - 5, Math.round(top[1]) - 5, 10, 10);
  rlCallout(ctx, L, top[0], top[1], 90, -120 * (1 - V.e) - 60, `SUMMIT ${rlMetres(rlHeight(rlField(L), 0.565, 0.4))}`, RL.wire);
  // once the thread has closed, its height on a leader from its west side
  if (reveal >= 1) {
    const [u, v] = rlTagAt(L);
    const p = L.project3d([(u - 0.5) * RL_BOX[2], RL_THREAD * RL_LIFT + 2, (v - 0.5) * RL_BOX[3]], V.opts);
    rlCallout(ctx, L, p[0], p[1], -60, 70, `ISO ${rlMetres(RL_THREAD)}`, RL.wire);
  }
}

// Plate B: the isoline map from above. Every level through lib.heightfield's contour mode in its
// own ramp colour, one width; the thread's level in amber; heights on every other level.
function drawReliefB(ctx, t, info) {
  const L = info.lib;
  rlFurniture(ctx, info, 'SHEET 02  ISOLINES', `INTERVAL ${Math.round(0.04 * RL_METRES)} M  PLAN  N UP`);
  const F = rlField(L);
  const c = [0, 0, 0];
  const [bx, by, bw, bh] = RL_BOX;
  // the graticule: the mesh's grid seen from above, every fourth line, faint
  ctx.save();
  ctx.strokeStyle = RL.dim;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let k = 0; k <= 12; k++) {
    const x = Math.round(bx + (k / 12) * bw) + 0.5, y = Math.round(by + (k / 12) * bh) + 0.5;
    ctx.moveTo(x, by);
    ctx.lineTo(x, by + bh);
    ctx.moveTo(bx, y);
    ctx.lineTo(bx + bw, y);
  }
  ctx.stroke();
  ctx.restore();
  const base = { mode: 'contour', box: RL_BOX, range: RL_RANGE, key: 'fx-relief', shade: 0, width: 2 };
  for (const h of RL_LEVELS) {
    if (Math.abs(h - RL_THREAD) < 1e-6) continue;
    L.rampRGB(RL_RAMP, h, c);
    L.heightfield(ctx, F, Object.assign({}, base, { levels: [h], color: rlCss(c) }));
  }
  L.heightfield(ctx, F, Object.assign({}, base, { levels: [RL_THREAD], color: RL.amber, width: 4 }));
  // heights on every third level, in a column down the south-west slope, knocked out of the lines
  for (const h of [0.38, 0.5, 0.74, 0.86]) {
    let best = null, score = -Infinity;
    for (const l of rlIso(L, h)) {
      for (const [u, v] of l.pts) {
        const s = v - u * 0.8;
        if (s > score) {
          score = s;
          best = [u, v];
        }
      }
    }
    if (!best) continue;
    const str = String(Math.round((h * RL_METRES) / 10) * 10);
    const w = (str.length * 6 - 1) * 2;
    const x = Math.round(bx + best[0] * bw - w / 2), y = Math.round(by + best[1] * bh - 7);
    ctx.fillStyle = RL.void;
    ctx.fillRect(x - 5, y - 4, w + 10, 22);
    L.rampRGB(RL_RAMP, h, c);
    rlText(ctx, L, str, x, y, 2, rlCss(c));
  }
  // north arrow in the top right corner of the map
  const nx = bx + bw - 60, ny = by + 70;
  ctx.save();
  ctx.strokeStyle = RL.wire;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(nx, ny + 40);
  ctx.lineTo(nx, ny - 40);
  ctx.moveTo(nx - 12, ny - 22);
  ctx.lineTo(nx, ny - 40);
  ctx.lineTo(nx + 12, ny - 22);
  ctx.stroke();
  ctx.restore();
  rlText(ctx, L, 'N', nx - 7, ny + 52, 3, RL.wire);
  const top = L.heightPoint(F, 0.565, 0.4, { box: RL_BOX, range: RL_RANGE });
  ctx.fillStyle = RL.wire;
  ctx.fillRect(Math.round(top[0]) - 5, Math.round(top[1]) - 5, 10, 10);
  rlCallout(ctx, L, top[0], top[1], 90, -60, `SUMMIT ${rlMetres(rlHeight(F, 0.565, 0.4))}`, RL.wire);
  const [tu, tv] = rlTagAt(L);
  rlCallout(ctx, L, bx + tu * bw, by + tv * bh, -60, 70, `ISO ${rlMetres(RL_THREAD)}`, RL.wire);
  // the section A-A' drifts down the map at 24 fps; its profile draws above the map
  const sv = 0.3 + 0.4 * (info.T - info.shot.start) / info.dur;
  const sy = Math.round(by + sv * bh) + 0.5;
  ctx.save();
  ctx.strokeStyle = RL.wire;
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 8]);
  ctx.beginPath();
  ctx.moveTo(bx, sy);
  ctx.lineTo(bx + bw, sy);
  ctx.stroke();
  ctx.setLineDash([]);
  const px0 = 230, pw = 620, py = 516, ph = 64;
  ctx.beginPath();
  for (let k = 0; k <= 96; k++) {
    const h = Math.max(RL_CUT, rlHeight(F, k / 96, sv));
    const x = px0 + (k / 96) * pw, y = py - ((h - RL_CUT) / (1 - RL_CUT)) * ph;
    if (k) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  }
  ctx.stroke();
  ctx.restore();
  rlText(ctx, L, 'A', bx - 14, sy - 30, 2, RL.wire, { align: 'right' });
  rlText(ctx, L, "A'", bx + bw + 14, sy - 30, 2, RL.wire);
  rlText(ctx, L, 'A', px0 - 16, py - 12, 2, RL.dim, { align: 'right' });
  rlText(ctx, L, "A'", px0 + pw + 16, py - 12, 2, RL.dim);
  void t;
}

FILM.scene({ id: 'fx-relief', draw: drawRelief });
FILM.scene({ id: 'fx-relief-b', draw: drawReliefB });
