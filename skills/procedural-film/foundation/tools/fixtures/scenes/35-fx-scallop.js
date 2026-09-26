// Fixture plates for the scallop theme: a flat three-ink print (sheet white, scarlet, soot) with
// one lagoon accent. Plate A: a fir row on the far shore, three rows of scallop waves offset half a
// period, a striped boat with an oarsman, a sun and scallop clouds; drawings held on threes
// (8 a second) and shaken a little per drawing. Plate B: the same frame as a schematic on scarlet,
// cut on the boat's silhouette. Colours are the theme's rows (themes/scallop/palette.js); the fixture
// film keeps the house lib.pal, so the plate carries them here.
const SC = { sheet: '#F5F2EF', scarlet: '#B31214', soot: '#141213', lagoon: '#77E1CC' };
const SC_LINE = 6; // the one contour width, px on a 1080 px short side
const SC_HORIZON = 990;
const SC_ROWS = [
  { y: 1090, dir: 1 },
  { y: 1370, dir: -1 },
  { y: 1650, dir: 1 },
];
const SC_P = 270; // wave period
const SC_D = 64; // wave depth, cusp to trough

// Held drawing index on threes, and the time of that drawing.
function scDrawing(T) {
  const d = Math.floor(T * 8 + 1e-6);
  return { d, tq: d / 8 };
}

// The per-drawing shake: every vertex moves by a smooth field that changes only with the drawing.
function scShake(L, pts, d, amp = 1.6) {
  return pts.map(([x, y]) => [
    x + amp * L.noise2(x * 0.004, y * 0.004 + d * 3.7, 71),
    y + amp * L.noise2(x * 0.004 + 9, y * 0.004 + d * 3.7, 72),
  ]);
}

function scInk(ctx, pts, fill, stroke = SC.soot, width = SC_LINE, closed = true) {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
  if (closed) ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
  }
}

// scallopWaves: one row's top edge as a polyline. Cusps sit on y at x = off + k·P; between them the
// edge sags by D along a circular arc. Returned open, from left of the frame to right of it.
function scallopEdge(W, y, off, P = SC_P, D = SC_D, seg = 16) {
  const R = (P * P / 4 + D * D) / (2 * D);
  const pts = [];
  for (let x0 = (((off % P) + P) % P) - P; x0 < W + P; x0 += P) {
    const cx = x0 + P / 2, cy = y + D - R;
    const a0 = Math.atan2(y - cy, x0 - cx), a1 = Math.atan2(y - cy, x0 + P - cx);
    for (let i = pts.length ? 1 : 0; i <= seg; i++) {
      const a = a0 + (a1 - a0) * (i / seg);
      pts.push([cx + R * Math.cos(a), cy + R * Math.sin(a)]);
    }
  }
  return pts;
}

// firRow: a seeded row of firs standing on a base line; each fir is 3 or 4 stacked tiers and a trunk,
// one closed outline. Sorted short to tall, so the tall ones stand in front.
function firRow(L, seed, x0, x1, base, hMin, hMax) {
  const rng = L.rng(L.hash('firRow', seed));
  const firs = [];
  let x = x0 + rng() * 30;
  while (x < x1) {
    const h = hMin + (hMax - hMin) * rng();
    firs.push({ x, h, w: h * (0.42 + 0.1 * rng()), tiers: 3 + (rng() < 0.4 ? 1 : 0) });
    x += h * (0.24 + 0.14 * rng());
  }
  return firs.sort((a, b) => a.h - b.h).map((f) => {
    const top = base - f.h, step = (f.h * 0.9) / (f.tiers + 0.4);
    const right = [[f.x, top]], left = [];
    for (let k = 0; k < f.tiers; k++) {
      const yTop = top + k * step, yBot = yTop + step * 1.4;
      const half = (f.w / 2) * (0.45 + (0.55 * (k + 1)) / f.tiers);
      if (k > 0) {
        const notch = half * 0.34;
        right.push([f.x + notch, yTop + step * 0.35]);
        left.unshift([f.x - notch, yTop + step * 0.35]);
      }
      right.push([f.x + half, yBot]);
      left.unshift([f.x - half, yBot]);
    }
    const tw = Math.max(8, f.w * 0.07), yb = top + (f.tiers - 1) * step + step * 1.4;
    return { ...f, top, pts: [...right, [f.x + tw, yb], [f.x + tw, base], [f.x - tw, base], [f.x - tw, yb], ...left] };
  });
}

// The boat and the oarsman, in boat space: origin at the middle of the deck line.
const SC_BOAT = {
  hull: [[-230, 0], [230, 0], [170, 128], [-172, 128]],
  stripes: [30, 62, 94].map((y) => [[-230 + (58 * y) / 128 + 14, y], [230 - (60 * y) / 128 - 14, y]]),
  rail: [[-242, -12], [242, -12], [242, 4], [-242, 4]],
  coat: [[-124, -12], [18, -12], [-26, -168], [-86, -168]],
  scarf: [[-96, -150], [-16, -150], [-14, -178], [-98, -178]],
  head: [-56, -216, 44],
  hatBrim: [[-110, -268], [-2, -268], [-2, -254], [-110, -254]],
  hat: [[-90, -268], [-22, -268], [-28, -348], [-84, -348]],
  band: [[-89, -288], [-23, -288], [-24, -306], [-88, -306]],
};

function scBoatPose(T, W) {
  const { d, tq } = scDrawing(T);
  // one clock over both plates (global T), so the cut lands the hull on the same pixels
  const x = W * 0.36 + 150 * (tq - 68);
  const y = SC_ROWS[2].y - 56 + 7 * Math.sin(tq * Math.PI * 2);
  const rot = 0.035 * Math.sin(tq * Math.PI * 2 + 0.8);
  const oar = Math.sin(tq * Math.PI * 2 * 0.75); // the stroke, on threes
  return { d, tq, x, y, rot, oar };
}

function scToWorld(pts, pose) {
  const c = Math.cos(pose.rot), s = Math.sin(pose.rot);
  return pts.map(([x, y]) => [pose.x + x * c - y * s, pose.y + x * s + y * c]);
}

function scCircle(cx, cy, r, n = 40) {
  const pts = [];
  for (let i = 0; i < n; i++) pts.push([cx + r * Math.cos((i / n) * Math.PI * 2), cy + r * Math.sin((i / n) * Math.PI * 2)]);
  return pts;
}

// A cloud: a flat bottom and a run of bumps on top (upward scallops).
function scCloud(x, y, w, bumps) {
  const pts = [[x + w, y]];
  const P = w / bumps;
  for (let b = bumps - 1; b >= 0; b--) {
    const h = P * (0.55 + 0.25 * Math.sin(b * 2.3 + 1));
    for (let i = b < bumps - 1 ? 1 : 0; i <= 12; i++) {
      const a = (i / 12) * Math.PI;
      pts.push([x + P * b + P / 2 + (P / 2) * Math.cos(a), y - h * Math.sin(a)]);
    }
  }
  pts.push([x, y]);
  return pts;
}

// Rows alternate by half a period and slide against each other, one swing a bar.
function scRowOffset(k, tq) {
  const slide = 26 * Math.sin((tq * Math.PI * 2) / 2);
  return (k % 2) * (SC_P / 2) + SC_ROWS[k].dir * slide + 40;
}

// One frame, two readings. Plate A: flat inks, soot contour. Plate B (plan): everything filled
// scarlet and drawn in sheet wire, soot guides and a dimension on top; the hull keeps its lagoon.
function drawScallop(ctx, info, plan) {
  const L = info.lib;
  const W = info.W, H = info.H;
  const pose = scBoatPose(info.T, W);
  const { d, tq } = pose;
  const ink = (pts, fill, closed = true) =>
    scInk(ctx, scShake(L, pts, d), plan ? (closed ? SC.scarlet : null) : fill, plan ? SC.sheet : SC.soot, SC_LINE, closed);
  const guide = (pts, width = 3) => scInk(ctx, scShake(L, pts, d), null, SC.soot, width, false);

  ctx.fillStyle = plan ? SC.scarlet : SC.sheet;
  ctx.fillRect(0, 0, W, H);

  if (plan) {
    ctx.save();
    ctx.setLineDash([18, 14]);
    guide([[0, SC_HORIZON], [W, SC_HORIZON]]);
    guide([[770, 270], [770, 670]]);
    guide([[570, 470], [970, 470]]);
    // cusp verticals of row 1 run down through row 2's troughs: half a period apart
    const off = scRowOffset(0, tq);
    for (let x = ((off % SC_P) + SC_P) % SC_P; x < W; x += SC_P) guide([[x, SC_ROWS[0].y - 60], [x, SC_ROWS[1].y + SC_D + 40]]);
    ctx.restore();
  }

  // sun and clouds
  ink(scCircle(770, 470, 132, 64), SC.scarlet);
  const drift = 14 * (tq - 68);
  ink(scCloud(80 + drift, 330, 420, 4), SC.sheet);
  ink(scCloud(640 - drift, 610, 330, 3), SC.sheet);

  // far shore and the fir row
  if (!plan) ink([[-20, SC_HORIZON - 12], [W + 20, SC_HORIZON - 12], [W + 20, SC_HORIZON + 50], [-20, SC_HORIZON + 50]], SC.soot);
  for (const f of firRow(L, 3, -40, W + 40, SC_HORIZON, 150, 330)) ink(f.pts, SC.soot);
  if (plan) ink([[-20, SC_HORIZON + 50], [W + 20, SC_HORIZON + 50]], null, false);

  const row = (k) => ink([...scallopEdge(W, SC_ROWS[k].y, scRowOffset(k, tq)), [W + SC_P, H + 20], [-SC_P, H + 20]], SC.scarlet);
  row(0);
  row(1);
  drawBoat(ctx, L, pose, plan, ink);
  row(2);

  if (plan) {
    // one period between two cusps of row 3: end ticks and a mid tick
    let c = ((scRowOffset(2, tq) % SC_P) + SC_P) % SC_P;
    while (c < 560) c += SC_P;
    const y = SC_ROWS[2].y + SC_D + 90;
    guide([[c, y], [c + SC_P, y]], 5);
    guide([[c, y - 26], [c, y + 26]], 5);
    guide([[c + SC_P, y - 26], [c + SC_P, y + 26]], 5);
    guide([[c + SC_P / 2, y - 14], [c + SC_P / 2, y + 14]], 5);
  }
}

function drawBoat(ctx, L, pose, plan, ink) {
  const B = SC_BOAT;
  const w = (pts) => scToWorld(pts, pose);
  const [hx, hy, hr] = B.head;

  // the oarsman: coat, scarf, head, a beak of a nose the way he rows, hat
  ink(w(B.coat), SC.soot);
  ink(w(B.scarf), SC.scarlet);
  ink(w([[hx + 30, hy - 8], [hx + 64, hy + 8], [hx + 32, hy + 16]]), SC.sheet);
  ink(w(scCircle(hx, hy, hr)), SC.sheet);
  if (!plan) {
    const dot = (x, y, r, c) => scInk(ctx, scShake(L, w(scCircle(x, y, r, 14)), pose.d), c, null);
    dot(hx + 2, hy - 8, 6, SC.soot);
    dot(hx + 24, hy - 8, 6, SC.soot);
    dot(hx + 12, hy + 16, 10, SC.scarlet);
  }
  ink(w(B.hat), SC.soot);
  ink(w(B.band), SC.scarlet);
  ink(w(B.hatBrim), SC.soot);

  // the hull: lagoon, sheet stripes, a rail; plate B keeps the fill (the silhouette cut)
  scInk(ctx, scShake(L, w(B.hull), pose.d), SC.lagoon, null);
  for (const s of B.stripes) scInk(ctx, scShake(L, w(s), pose.d), null, SC.sheet, 10, false);
  scInk(ctx, scShake(L, w(B.hull), pose.d), null, plan ? SC.sheet : SC.soot);
  ink(w(B.rail), SC.sheet);

  // the oar over the rail: grip at the hands, the loom down past the stern, the blade under the wave
  const a = 0.2 * Math.PI + 0.07 * Math.PI * pose.oar;
  const grip = [-20, -112 + 10 * pose.oar];
  const len = 520;
  const ux = -Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
  const at = (s, h) => [grip[0] + ux * s + nx * h, grip[1] + uy * s + ny * h];
  ink(w([at(-30, 9), at(len - 90, 9), at(len - 90, -9), at(-30, -9)]), SC.sheet);
  ink(w([at(len - 100, 12), at(len - 20, 26), at(len, 0), at(len - 20, -26), at(len - 100, -12)]), SC.sheet);
  ink(w(scCircle(...at(10, 0), 15, 20)), SC.sheet);
  ink(w(scCircle(...at(70, 0), 15, 20)), SC.sheet);
}

FILM.scene({ id: 'fx-scallop', draw: (ctx, t, info) => drawScallop(ctx, info, false) });
FILM.scene({ id: 'fx-scallop-b', draw: (ctx, t, info) => drawScallop(ctx, info, true) });
