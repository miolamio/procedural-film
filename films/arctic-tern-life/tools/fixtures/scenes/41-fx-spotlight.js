// Fixture plates for the spotlight theme: thick brush ink on a pool of cyan light in a dark teal
// void, one violet accent on the joints. Plate A: a beam falls from the top into a round pool; a
// bone hand rises out of the dark into it, reaching for a moth that circles in the light; the
// hand's shadow falls on the pool, dust hangs in the beam, a thin reticle follows the moth. Poses
// on twos, the ink boils on the 12 fps clock. Plate B: the same frame as a schematic, bones as
// wire on their centre lines, isolux rings for the pool, a dimension and labels in the thin stroke
// font; the violet joints keep their place, so the cut holds on the hand. Colours are the theme's
// rows (themes/spotlight/palette.js); the fixture film keeps the house lib.pal, so the plate
// carries them here and builds the beam ramp as local gradient stops.
const SP = {
  tealVoid: '#192A2C',
  beamDeep: '#2A6F6D',
  beam: '#43B8B4',
  beamHot: '#7EF7DC',
  sumi: '#0B1011',
  violet: '#8E4FC2',
};
// The pool of light (a round spot on the back wall) and the beam that feeds it.
const SP_POOL = { x: 540, y: 880, r: 430, halo: 150 };
const SP_SRC = { x: 612, y: -60, w: 70 };
// The beam ramp from the pool's edge to its heart: lib.ramp(['beam', 'beamHot']) in a film.
const SP_RAMP = [[0, SP.beamHot], [0.28, SP.beamHot], [0.93, SP.beam]];

const spRGBA = (hex, a) => FILM.lib.rgba(hex, a);

// One clock over both plates: seconds from the start of plate A, so the cut keeps every pose.
function spClock(info) {
  const shots = FILM.TIMELINE.shots;
  const a = shots.find((s) => s.id === 'fx-spotlight');
  return info.T - (a ? a.start : info.shot.start);
}

// A bone: one brush stroke between two joints, thin in the shaft and swelling at both heads.
function spBonePressure(u) {
  const e = Math.abs(2 * u - 1);
  return 0.42 + 0.86 * e * e * e * e;
}
// A fingertip: a head at the joint, the brush lifting off to a point.
function spTipPressure(u) {
  const e = 1 - u;
  return 0.4 + 0.85 * e * e * e * e + 0.4 * u ** 8;
}

// The hand's joints, from the wrist up, for a reach k (0 open, 1 closing on the moth) at time tq.
// Fingers: index, middle, ring, little; each a metacarpal and three phalanges. The thumb has two.
const SP_FINGERS = [
  { base: [-30, -64], ang: -103, len: [150, 90, 58, 42] },
  { base: [-4, -72], ang: -91, len: [156, 100, 64, 44] },
  { base: [22, -68], ang: -79, len: [146, 92, 58, 42] },
  { base: [44, -58], ang: -66, len: [126, 72, 46, 36] },
];
const SP_THUMB = { base: [-52, -44], ang: -138, len: [96, 72, 54] };
const SP_SCALE = 1.34;

function spHand(tq, k) {
  const s = SP_SCALE;
  // the wrist rises and sways a little; the hand turns toward the moth as it closes
  const wx = 560 + 14 * Math.sin(tq * 1.3), wy = 1392 - 36 * k - 10 * Math.sin(tq * 2.1);
  const turn = (-6 + 5 * Math.sin(tq * 0.9)) * (Math.PI / 180);
  const P = ([x, y]) => [wx + s * (x * Math.cos(turn) - y * Math.sin(turn)), wy + s * (x * Math.sin(turn) + y * Math.cos(turn))];
  const chains = [];
  SP_FINGERS.forEach((f, i) => {
    // spread opens a little while reaching; the joints fold toward the hand's axis as it closes
    const spread = (i - 1.5) * (4 - 6 * k);
    const fold = [0, 12 + 34 * k, 16 + 38 * k, 12 + 30 * k].map((d) => d * Math.sign(1.5 - i));
    const pts = [f.base];
    let a = f.ang + spread;
    for (let j = 0; j < f.len.length; j++) {
      a += fold[j] * 0.35 + (j ? 4 * k * (i < 2 ? 1 : -1) : 0);
      const [x, y] = pts[pts.length - 1];
      pts.push([x + f.len[j] * Math.cos((a * Math.PI) / 180), y + f.len[j] * Math.sin((a * Math.PI) / 180)]);
    }
    chains.push({ pts: pts.map(P), width: [36, 31, 27, 24] });
  });
  const t = SP_THUMB, tp = [t.base];
  let a = t.ang + 18 * k;
  for (let j = 0; j < t.len.length; j++) {
    a += j ? 16 + 22 * k : 0;
    const [x, y] = tp[tp.length - 1];
    tp.push([x + t.len[j] * Math.cos((a * Math.PI) / 180), y + t.len[j] * Math.sin((a * Math.PI) / 180)]);
  }
  chains.push({ pts: tp.map(P), width: [34, 29, 25] });
  // forearm: radius and ulna from the carpals down out of the frame
  const arm = [
    { pts: [P([-24, -4]), P([-62, 430])], width: 50 },
    { pts: [P([28, 0]), P([40, 430])], width: 44 },
  ];
  const carpals = [[-34, -30, 17], [-8, -36, 16], [18, -34, 16], [40, -26, 14], [-20, -10, 15], [8, -12, 17], [32, -6, 13]].map(([x, y, r]) => [...P([x, y]), r * s]);
  return { chains, arm, carpals, P };
}

// Bones between successive joints, shortened by a gap so each joint shows as a break in the ink.
function spBones(hand) {
  const bones = [];
  for (const c of hand.chains) {
    for (let j = 0; j + 1 < c.pts.length; j++) {
      const tip = j + 2 === c.pts.length;
      const A = c.pts[j], B = c.pts[j + 1];
      const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy);
      const g0 = j ? 9 : 2, g1 = 9;
      bones.push({ a: [A[0] + (dx * g0) / L, A[1] + (dy * g0) / L], b: [B[0] - (dx * g1) / L, B[1] - (dy * g1) / L], width: c.width[j], tip, id: bones.length });
    }
  }
  for (const b of hand.arm) bones.push({ a: b.pts[0], b: b.pts[1], width: b.width, id: bones.length });
  return bones;
}

function spJoints(hand) {
  const out = [];
  for (const c of hand.chains) for (let j = 1; j < c.pts.length - 1; j++) out.push(c.pts[j]);
  return out;
}

// The moth: circling in the upper pool, wings beating on twos.
function spMoth(tq) {
  const a = tq * 1.9;
  const x = 548 + 118 * Math.cos(a) + 20 * Math.sin(a * 2.3);
  const y = 610 + 46 * Math.sin(a) + 14 * Math.cos(a * 1.7);
  const beat = Math.abs(Math.sin(tq * Math.PI * 4)); // two beats a second, one per quarter note
  return { x, y, beat, tilt: 0.25 * Math.cos(a) };
}

function spInk(L, ctx, pts, o) {
  L.inkPath(ctx, pts, Object.assign({ color: SP.sumi, taper: [3, 3], wobble: 2.2, tremble: 0.8, widthJitter: 0.45 }, o));
}

function drawMoth(L, ctx, m, plan, seed) {
  const c = Math.cos(m.tilt), s = Math.sin(m.tilt);
  const W = ([x, y]) => [m.x + x * c - y * s, m.y + x * s + y * c];
  const open = 0.25 + 0.75 * m.beat; // wing height: 1 open, 0.25 folded
  const wing = (dir, up) => {
    const pts = [];
    for (let i = 0; i <= 14; i++) {
      const u = (i / 14) * Math.PI;
      const rx = up ? 84 : 58, ry = (up ? 66 : 44) * open;
      pts.push(W([dir * (8 + rx * Math.sin(u) * (0.7 + 0.3 * Math.sin(u))), (up ? -1 : 1) * (ry * Math.sin(u) * Math.sin(u * 0.5 + 0.2)) + (up ? -4 : 8)]));
    }
    return pts;
  };
  for (const [dir, up] of [[-1, 1], [1, 1], [-1, 0], [1, 0]]) {
    const pts = wing(dir, up);
    if (plan) L.inkPath(ctx, pts, { closed: true, width: 2.4, color: SP.beamHot, taper: 0, wobble: 0.6, pressure: null, seed: seed + dir + up * 3 });
    else spInk(L, ctx, pts, { closed: true, fill: SP.sumi, width: 7, seed: seed + dir + up * 3 });
  }
  if (!plan) {
    // a pale eye on each upper wing, the light showing through
    for (const dir of [-1, 1]) {
      const [x, y] = W([dir * 54, -30 * open]);
      ctx.fillStyle = SP.beamHot;
      ctx.beginPath();
      ctx.ellipse(x, y, 10, 10 * Math.max(0.3, open), m.tilt, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const body = [W([0, -24]), W([0, 40])];
  if (plan) L.inkPath(ctx, body, { width: 3, color: SP.beamHot, taper: 0, seed });
  else spInk(L, ctx, body, { width: 20, pressure: (u) => 1.1 - 0.6 * u, seed });
  const antenna = (dir) => [W([0, -24]), W([dir * 18, -56]), W([dir * 38, -72])];
  for (const dir of [-1, 1]) L.inkPath(ctx, antenna(dir), { width: plan ? 2 : 4, color: plan ? SP.beamHot : SP.sumi, taper: [0, 10], seed: seed + 9 + dir });
}

// The audience: a row of heads and shoulders along the foot of the frame, in front of the arm,
// caught on top by the light of the pool.
const SP_HEADS = [[70, 1640, 74], [250, 1600, 66], [425, 1668, 80], [700, 1655, 78], [880, 1598, 68], [1050, 1630, 76], [160, 1790, 84], [560, 1800, 88], [960, 1792, 84]];
function spHead(x, y, r) {
  const pts = [];
  // shoulders from the frame's foot up to the neck, then the head's circle, then down again
  pts.push([x - 2.4 * r, 1960], [x - 2.2 * r, y + 1.9 * r], [x - 1.5 * r, y + 1.35 * r], [x - 0.55 * r, y + 1.05 * r]);
  for (let i = 0; i <= 20; i++) {
    const a = Math.PI * (0.62 + (1.76 * i) / 20);
    pts.push([x + r * Math.cos(a), y + r * Math.sin(a)]);
  }
  pts.push([x + 0.55 * r, y + 1.05 * r], [x + 1.5 * r, y + 1.35 * r], [x + 2.2 * r, y + 1.9 * r], [x + 2.4 * r, 1960]);
  return pts;
}
function drawAudience(L, ctx, plan) {
  const rows = [SP_HEADS.slice(0, 6), SP_HEADS.slice(6)];
  for (const row of rows) {
    for (const [x, y, r] of row) {
      const pts = spHead(x, y, r);
      if (plan) {
        ctx.fillStyle = SP.tealVoid;
        ctx.beginPath();
        pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
        ctx.fill();
        L.inkPath(ctx, pts, { closed: true, width: 2.2, color: SP.beam, alpha: 0.7, taper: 0, seed: 500 + x });
        continue;
      }
      spInk(L, ctx, pts, { closed: true, fill: SP.sumi, width: 8, seed: 500 + x });
      const dx = x - SP_POOL.x, dy = y - SP_POOL.y, n = Math.hypot(dx, dy);
      L.rimLight(ctx, pts, { dir: [dx / n, dy / n], width: 5, color: SP.beam, alpha: 0.75, threshold: 0.35 });
    }
  }
}

// Reticle: a ring, four ticks and a broken cross, in thin hot light.
function drawReticle(ctx, x, y, r, alpha, wide, H) {
  ctx.save();
  ctx.strokeStyle = spRGBA(SP.beamHot, alpha);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    ctx.moveTo(x + dx * (r - 14), y + dy * (r - 14));
    ctx.lineTo(x + dx * (r + 22), y + dy * (r + 22));
    ctx.moveTo(x + dx * 8, y + dy * 8);
    ctx.lineTo(x + dx * 22, y + dy * 22);
  }
  ctx.stroke();
  if (wide) {
    ctx.setLineDash([10, 12]);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(x - r - 30, y);
    ctx.moveTo(x + r + 30, y);
    ctx.lineTo(1080, y);
    ctx.moveTo(x, 0);
    ctx.lineTo(x, y - r - 30);
    ctx.moveTo(x, y + r + 30);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  ctx.restore();
}

function drawSpotlight(ctx, info, plan) {
  const L = info.lib;
  const W = info.W, H = info.H;
  const t = spClock(info);
  const tq = L.onTwos(t); // poses on twos; the ink boils on its own 12 fps clock
  // the reach: the hand rises and closes toward the moth over the second bar
  const k = L.clamp((tq - 0.2) / 1.5) ** 1.3 * 0.85;
  const hand = spHand(tq, k);
  const bones = spBones(hand);
  const joints = spJoints(hand);
  const moth = spMoth(tq);
  const O = SP_POOL;

  ctx.fillStyle = SP.tealVoid;
  ctx.fillRect(0, 0, W, H);

  // the beam from the lamp above the frame to the pool's tangents
  const d = Math.hypot(O.x - SP_SRC.x, O.y - SP_SRC.y);
  const phi = Math.atan2(O.y - SP_SRC.y, O.x - SP_SRC.x), half = Math.asin(O.r / d);
  const tl = [SP_SRC.x + d * Math.cos(phi - half) * Math.cos(half), SP_SRC.y + d * Math.sin(phi - half) * Math.cos(half)];
  const tr = [SP_SRC.x + d * Math.cos(phi + half) * Math.cos(half), SP_SRC.y + d * Math.sin(phi + half) * Math.cos(half)];
  if (!plan) {
    const g = ctx.createLinearGradient(0, SP_SRC.y, 0, O.y);
    g.addColorStop(0, spRGBA(SP.beamHot, 0.2));
    g.addColorStop(1, spRGBA(SP.beam, 0.07));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(SP_SRC.x - SP_SRC.w / 2, SP_SRC.y);
    ctx.lineTo(SP_SRC.x + SP_SRC.w / 2, SP_SRC.y);
    ctx.lineTo(tl[0], tl[1]);
    ctx.lineTo(tr[0], tr[1]);
    ctx.closePath();
    ctx.fill();

    // the pool: the beam ramp from its heart to its edge, then a glow halo into the void
    const R = O.r + O.halo, e = O.r / R;
    const pg = ctx.createRadialGradient(O.x - 40, O.y - 70, 0, O.x, O.y, R);
    for (const [at, c] of SP_RAMP) pg.addColorStop(at * e, c);
    pg.addColorStop(e, SP.beam);
    pg.addColorStop(e + 0.012, spRGBA(SP.beamDeep, 0.95));
    pg.addColorStop(e + (1 - e) * 0.45, spRGBA(SP.beamDeep, 0.3));
    pg.addColorStop(1, spRGBA(SP.beamDeep, 0));
    ctx.fillStyle = pg;
    ctx.fillRect(O.x - R, O.y - R, 2 * R, 2 * R);

    // dust in the beam: seeded motes drifting down on twos, lit only inside the cone and pool
    const rng = L.rng(L.hash('spotlight-dust', 5));
    ctx.fillStyle = spRGBA(SP.beamHot, 0.55);
    for (let i = 0; i < 46; i++) {
      const u = rng(), v = rng(), r = 1.2 + 2.2 * rng(), sp = 10 + 16 * rng();
      const yy = ((v * (O.y + O.r) + sp * tq) % (O.y + O.r));
      const f = yy / O.y; // fraction down the beam
      const x = SP_SRC.x + (O.x - SP_SRC.x) * f + (u - 0.5) * (SP_SRC.w + (2 * O.r - SP_SRC.w) * Math.min(1, f)) * 0.9 + 6 * L.noise1(tq * 0.7 + i, 3);
      ctx.globalAlpha = 0.35 + 0.65 * Math.abs(L.noise1(tq * 2 + i * 1.7, 9));
      ctx.beginPath();
      ctx.arc(x, yy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // the hand's shadow on the wall: the same bones, offset away from the lamp, in deep beam
    ctx.save();
    ctx.beginPath();
    ctx.arc(O.x, O.y, O.r, 0, Math.PI * 2);
    ctx.clip();
    ctx.translate(46, 64);
    for (const b of bones) L.inkPath(ctx, [b.a, b.b], { width: b.width * 1.05, color: SP.beamDeep, alpha: 0.55, taper: [3, 3], pressure: b.tip ? spTipPressure : spBonePressure, wobble: 1, seed: 300 + b.id });
    ctx.restore();
  } else {
    // plan: the pool as a faint disc and isolux rings, the beam's edges, the lamp axis
    ctx.save();
    ctx.fillStyle = spRGBA(SP.beamDeep, 0.35);
    ctx.beginPath();
    ctx.arc(O.x, O.y, O.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = spRGBA(SP.beam, 0.85);
    ctx.lineWidth = 2;
    ctx.setLineDash([14, 12]);
    for (const f of [1, 0.72, 0.44]) {
      ctx.beginPath();
      ctx.arc(O.x - 40 * (1 - f), O.y - 70 * (1 - f), O.r * f, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.setLineDash([4, 10]);
    ctx.beginPath();
    ctx.moveTo(SP_SRC.x - SP_SRC.w / 2, SP_SRC.y);
    ctx.lineTo(tl[0], tl[1]);
    ctx.moveTo(SP_SRC.x + SP_SRC.w / 2, SP_SRC.y);
    ctx.lineTo(tr[0], tr[1]);
    ctx.moveTo(SP_SRC.x, SP_SRC.y);
    ctx.lineTo(O.x, O.y);
    ctx.stroke();
    ctx.restore();
    // the diameter: a dimension bar with end ticks under the pool, and its label
    const y = O.y - O.r - 36;
    ctx.save();
    ctx.strokeStyle = SP.beamHot;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(O.x - O.r, y);
    ctx.lineTo(O.x + O.r, y);
    for (const x of [O.x - O.r, O.x + O.r]) {
      ctx.moveTo(x, y - 22);
      ctx.lineTo(x, y + 22);
    }
    ctx.stroke();
    ctx.restore();
    const txt = { size: 30, style: 'hand', weight: 2.6, slant: 0, jitter: 0, color: SP.beamHot, boil: false, tracking: 2 };
    L.strokeText(ctx, 'D 860', O.x, y - 62, Object.assign({}, txt, { align: 'center' }));
    L.strokeText(ctx, 'SPOT 01', 96, 250, txt);
    L.strokeText(ctx, 'LUX 100 / 72 / 44', 96, 302, Object.assign({}, txt, { size: 24, weight: 2 }));
    L.strokeText(ctx, 'HAND  R', W - 140, 250, Object.assign({}, txt, { align: 'right' }));
    L.strokeText(ctx, 'MOTH  T ' + tq.toFixed(2), W - 140, 302, Object.assign({}, txt, { size: 24, weight: 2, align: 'right' }));
  }

  // the carpals, the bones, the joints
  for (const [x, y, r] of hand.carpals) {
    const pts = [];
    for (let i = 0; i < 12; i++) pts.push([x + r * Math.cos((i / 12) * Math.PI * 2), y + r * 0.85 * Math.sin((i / 12) * Math.PI * 2)]);
    if (plan) L.inkPath(ctx, pts, { closed: true, width: 2.2, color: SP.beamHot, taper: 0, seed: 80 + x });
    else spInk(L, ctx, pts, { closed: true, fill: SP.sumi, width: 6, seed: 80 + x });
  }
  for (const b of bones) {
    if (plan) {
      L.inkPath(ctx, [b.a, b.b], { width: 2.6, color: SP.beamHot, taper: 0, wobble: 0.8, seed: 100 + b.id });
      for (const p of [b.a, b.b]) {
        ctx.strokeStyle = SP.beamHot;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p[0], p[1], b.width * 0.42, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else {
      spInk(L, ctx, [b.a, b.b], { width: b.width, pressure: b.tip ? spTipPressure : spBonePressure, seed: 100 + b.id });
    }
  }
  for (const [x, y] of joints) {
    ctx.fillStyle = SP.violet;
    ctx.beginPath();
    ctx.arc(x, y, 9, 0, Math.PI * 2);
    ctx.fill();
  }

  drawAudience(L, ctx, plan);
  drawMoth(L, ctx, moth, plan, 40);
  // the operator's reticle trails the moth by a drawing
  const lag = spMoth(tq - 1 / 6);
  drawReticle(ctx, lag.x, lag.y, plan ? 104 : 88, plan ? 0.95 : 0.6, plan, H);
}

FILM.scene({ id: 'fx-spotlight', draw: (ctx, t, info) => drawSpotlight(ctx, info, false) });
FILM.scene({ id: 'fx-spotlight-b', draw: (ctx, t, info) => drawSpotlight(ctx, info, true) });
