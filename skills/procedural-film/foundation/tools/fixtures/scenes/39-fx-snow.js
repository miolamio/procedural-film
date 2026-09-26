// Fixture plates for the snow theme: an overexposed white, bare ink trees, snow on ones and one red
// drop. Plate A: a bough hangs in from the top, two bare trees and a far row stand in a white that
// eats their feet, a walker leans into the wind with a scarf trailing, footprints behind him; a drop
// forms on a twig of the bough, falls and lands in front of him. Plate B: the same frame as its
// negative (every colour inverted) except the drop, which stays red; the cut holds the walker's
// silhouette. Colours are the theme's rows (themes/snow/palette.js); the fixture film keeps the house
// lib.pal, so the plate carries them here.
const SN = { snow: '#F5F2EF', fog: '#CECAC6', ash: '#7C7A80', crow: '#171820', drop: '#B31214' };
const SN_T0 = 76; // plate A starts here; both plates run on one global clock
const SN_GROUND = 1690; // the walker's sole line (no ground is drawn: the white eats it)
const SN_WIND = 1; // wind from the right: snow and scarf drift toward -x

// The negative of a colour: plate B draws every colour through this, except the drop.
function snNeg(hex) {
  const n = parseInt(hex.slice(1), 16) ^ 0xffffff;
  return '#' + n.toString(16).padStart(6, '0');
}

// A bare tree as polylines, grown by seeded recursion: each limb bends a little per segment and
// curls toward the sky, splits in two (sometimes three) at its end and throws a side twig. Pure in
// its arguments, so it is kept in a Map by them (never by time).
const SN_TREES = new Map();
function snTree(L, key, o) {
  const id = key + JSON.stringify(o);
  if (SN_TREES.has(id)) return SN_TREES.get(id);
  const { x, y, ang = 0, len, width, depth, curl = 0.93, trunk = 1, spread = 1 } = o;
  const rng = L.rng(L.hash('snTree', key));
  const out = [];
  const grow = (x0, y0, a, l, w, d) => {
    const pts = [[x0, y0]];
    let px = x0, py = y0;
    for (let i = 1; i <= 5; i++) {
      a = a * curl + (rng() - 0.5) * 0.24;
      px += (Math.sin(a) * l) / 5;
      py -= (Math.cos(a) * l) / 5;
      pts.push([px, py]);
    }
    out.push({ pts, w, d });
    if (d >= depth || l < 16) return;
    const k = rng() < 0.3 ? 3 : 2;
    const next = d ? l : l / trunk;
    for (let j = 0; j < k; j++) {
      const da = ((j - (k - 1) / 2) * (0.5 + rng() * 0.35) + (rng() - 0.5) * 0.25) * spread;
      grow(px, py, a + da, next * (0.64 + rng() * 0.16), w * 0.62, d + 1);
    }
    if (d >= 1 && rng() < 0.65) {
      const m = pts[2 + Math.floor(rng() * 2)];
      grow(m[0], m[1], a + (rng() < 0.5 ? -1 : 1) * (0.7 + rng() * 0.4) * spread, l * 0.45, w * 0.5, d + 2);
    }
  };
  grow(x, y, ang, len * trunk, width, 0);
  SN_TREES.set(id, out);
  return out;
}

// Heavy limbs through inkPath (pressure, taper, boil); the fine twigs as plain strokes in three
// width buckets, one path each, so a tree of two hundred limbs stays cheap.
function snDrawTree(ctx, L, limbs, color, seed, alpha = 1) {
  const buckets = [[], [], []];
  limbs.forEach((b, i) => {
    if (b.w >= 3.2) L.inkPath(ctx, b.pts, { width: b.w, color, alpha, seed: seed + i, taper: [b.w * 2, b.w * 9], wobble: 0.6, rough: 0.4 });
    else buckets[b.w >= 1.9 ? 0 : b.w >= 1.2 ? 1 : 2].push(b.pts);
  });
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha *= alpha;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  [2.2, 1.5, 1.05].forEach((w, k) => {
    ctx.lineWidth = w;
    ctx.beginPath();
    for (const pts of buckets[k]) pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.stroke();
  });
  ctx.restore();
}

// The bough that hangs in from the top right, and the twig tip the drop forms on.
function snBough(L, W) {
  const limbs = snTree(L, 'bough', { x: W + 40, y: 250, ang: -1.72, len: 460, width: 26, depth: 5, curl: 0.9 });
  let tip = null;
  for (const b of limbs) {
    const e = b.pts[b.pts.length - 1];
    if (e[0] > 560 && e[0] < 760 && (!tip || e[1] > tip[1])) tip = e;
  }
  return { limbs, tip: tip || [640, 420] };
}

// The drop: forms on the tip (0–0.45 s), falls under gravity, lands at u = 1.15 s and stays.
const SN_LAND = 1.15;
function snDrop(L, u, tip) {
  const hang = 0.45;
  if (u < hang) {
    const k = u / hang;
    return { x: tip[0], y: tip[1] + 6 + 8 * k, r: 3 + 6 * k, stretch: 1.2 + 0.5 * k, landed: false };
  }
  const y1 = SN_GROUND + 14;
  if (u < SN_LAND) {
    const s = (u - hang) / (SN_LAND - hang);
    const y = L.lerp(tip[1] + 14, y1, s * s);
    return { x: tip[0], y, r: 9, stretch: 1.3 + 1.6 * s, landed: false };
  }
  return { x: tip[0], y: y1, r: 9, landed: true, since: u - SN_LAND };
}

function snDrawDrop(ctx, d) {
  ctx.fillStyle = SN.drop;
  ctx.beginPath();
  if (!d.landed) {
    // a bead that swells on the tip, then draws out along the fall
    ctx.ellipse(d.x, d.y, d.r, d.r * d.stretch, 0, 0, Math.PI * 2);
  } else {
    // a flat mark in the snow that spreads over a quarter second, with a few specks thrown out
    const k = Math.min(1, d.since / 0.25);
    ctx.ellipse(d.x, d.y, 14 + 14 * k, 8 - 2.5 * k, -0.04, 0, Math.PI * 2);
    [[-30, -3, 3.2], [26, -2, 2.6], [40, 2, 2], [-44, 3, 1.8], [14, 6, 2.2]].forEach(([dx, dy, r]) => {
      ctx.moveTo(d.x + dx * k + r, d.y + dy * k);
      ctx.arc(d.x + dx * k, d.y + dy * k, r * Math.min(1, k * 1.5), 0, Math.PI * 2);
    });
  }
  ctx.fill();
}

// The walker: 100 px a second to the right, one stride a second, leaning into the wind.
function snWalker(tt) {
  const u = tt - SN_T0;
  const cyc = (((u % 1) + 1) % 1) * 4;
  return { x: 290 + 100 * u, cyc };
}

function drawSnow(ctx, info, neg) {
  const L = info.lib;
  const W = info.W, H = info.H, T = info.T;
  const c = (hex) => (neg ? snNeg(hex) : hex);
  const u = T - SN_T0;
  const tt = SN_T0 + L.onTwos(u); // the figure holds on twos, on the global clock

  // ground: overexposed white, a fog grey only at the very top of the sky
  const g = ctx.createLinearGradient(0, 0, 0, H * 0.5);
  g.addColorStop(0, c(SN.fog));
  g.addColorStop(1, c(SN.snow));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // far row: small bare trees along a lost horizon, ash, half gone in the white
  for (let i = 0; i < 9; i++) {
    const x = 40 + i * 128 + 30 * Math.sin(i * 2.7);
    const h = 150 + 70 * ((i * 37) % 11) / 11;
    snDrawTree(ctx, L, snTree(L, 'far' + i, { x, y: 1380, ang: 0.05 * Math.sin(i), len: h * 0.4, width: 5, depth: 4, trunk: 1.6 }), c(SN.ash), 300 + i * 40, 0.8);
  }
  // two bare trees
  snDrawTree(ctx, L, snTree(L, 'right', { x: 860, y: 1400, ang: -0.05, len: 250, width: 13, depth: 6, trunk: 2.2, spread: 0.8 }), c(SN.crow), 500, 1);
  snDrawTree(ctx, L, snTree(L, 'left', { x: 150, y: 1760, ang: 0.06, len: 330, width: 30, depth: 6, trunk: 2.6, spread: 0.75 }), c(SN.crow), 700, 1);

  // overexposure: the white eats the foot of every trunk and the ground, and boils on 12
  L.noisePlate(ctx, { y: 900, h: 700, seed: 61, scale: 170, threshold: 0.42, soft: 0.35, color: c(SN.snow), alpha: 0.93, boil: true });
  const fg = ctx.createLinearGradient(0, 1300, 0, 1480);
  fg.addColorStop(0, c(SN.snow) + '00');
  fg.addColorStop(1, c(SN.snow));
  ctx.fillStyle = fg;
  ctx.fillRect(0, 1300, W, H - 1300);

  // the bough hanging in from the top right
  const bough = snBough(L, W);
  snDrawTree(ctx, L, bough.limbs, c(SN.crow), 900, 1);

  // footprints behind the walker, older ones filled by the snow
  const wk = snWalker(tt);
  ctx.fillStyle = c(SN.crow);
  for (let x = wk.x - 70, k = 0; x > -40; x -= 50, k++) {
    ctx.globalAlpha = Math.max(0, 0.7 - 0.0012 * (wk.x - x));
    ctx.beginPath();
    ctx.ellipse(x, SN_GROUND + (k % 2 ? -2 : 10), 12, 4, 0.08, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // the walker: a scribbled disc head, jointed stick, a scarf in the wind
  const S = L.stickPoses;
  const walk = [S.walk1, S.walk2, S.walk3, S.walk4, S.walk1];
  const k = Math.floor(wk.cyc);
  const pose = Object.assign({}, L.poseMix(walk[k], walk[k + 1], wk.cyc - k), { lean: 0.22, neck: 0.1 });
  const J = L.stickFigure(ctx, pose, {
    x: wk.x, y: SN_GROUND, height: 680, head: 'scribble', color: c(SN.crow), light: c(SN.snow), seed: 23, boil: L.boil(tt),
  });
  const n = J.neck;
  const scarf = [];
  for (let i = 0; i < 9; i++) scarf.push([n[0] - SN_WIND * i * 34, n[1] + 6 + i * 6 + i * i * 0.8 * Math.sin(i * 0.8 - tt * 9)]);
  L.inkPath(ctx, scarf, { width: 9, color: c(SN.crow), seed: 29, taper: [2, 60], boil: L.boil(tt) });

  // stipple snow: a fine ink speckle over everything, boiling on 12
  L.noisePlate(ctx, { seed: 62, scale: 5, threshold: 0.955, soft: 0.02, grain: 1, color: c(SN.crow), alpha: 0.26, res: 0.5, boil: true });

  // snow on ones: a falling layer (a closed form of T) and a scatter that is new every frame
  ctx.fillStyle = c(SN.snow);
  ctx.beginPath();
  const fall = L.rng(L.hash('snFall', 1));
  for (let i = 0; i < 170; i++) {
    const x0 = fall() * (W + 300), y0 = fall() * H, v = 110 + 150 * fall(), r = 2 + 2 * fall(), ph = fall() * 6.3;
    const y = ((y0 + v * T) % (H + 40)) - 20;
    const x = ((((x0 - SN_WIND * 0.45 * v * T + 16 * Math.sin(T * 1.7 + ph)) % (W + 300)) + W + 300) % (W + 300)) - 150;
    ctx.moveTo(x + r, y);
    ctx.arc(x, y, r, 0, Math.PI * 2);
  }
  const fresh = L.rng(L.hash('snFresh', info.frame));
  for (let i = 0; i < 320; i++) {
    const x = fresh() * W, y = fresh() * H, r = 2 + 2 * fresh();
    ctx.moveTo(x + r, y);
    ctx.arc(x, y, r, 0, Math.PI * 2);
  }
  ctx.fill();

  // the drop, drawn last: forms, falls, lands; the only thing the negative does not touch
  snDrawDrop(ctx, snDrop(L, u, bough.tip));
}

FILM.scene({ id: 'fx-snow', draw: (ctx, t, info) => drawSnow(ctx, info, false) });
FILM.scene({ id: 'fx-snow-b', draw: (ctx, t, info) => drawSnow(ctx, info, true) });
