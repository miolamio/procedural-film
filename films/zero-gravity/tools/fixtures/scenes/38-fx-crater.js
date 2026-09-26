// Fixture plates for the crater theme: red paper. Plate A: a flat red ground with paper grain, a
// throat glowing from red through orange to yolk yellow at the bottom of a well, a rim of hanging
// hair loops that draws the bowl, and scrawled stick figures falling toward the throat, shrinking
// as they go. Plate B: the same frame as a heat map in stepped bands of the crater ramp with its
// isotherms, cut on the hero's silhouette. Figures move on twos, line and grain boil at 12 fps.
// Colours are the theme's rows (themes/crater/palette.js); the fixture film keeps the house lib.pal,
// so the plate carries them here and calls lib.ramp over hex stops (a film: lib.ramp('crater', v)).
const CR = {
  craterDeep: '#6B070C',
  crater: '#B31214',
  craterHot: '#E2641A',
  yolk: '#DFC505',
  yolkHot: '#F4EE8A',
  scrawl: '#170605',
  scratch: '#F2D2BA',
};
const CR_RAMP = [[0, CR.craterDeep], [0.3, CR.crater], [0.62, CR.craterHot], [0.84, CR.yolk], [1, CR.yolkHot]];
const CR_THROAT = { x: 540, y: 1640, r: 600, sy: 1.15 }; // the glow: centre, radius, vertical stretch
const CR_VP = [540, 1500]; // the point every figure falls toward
const CR_BANDS = 8; // plate B steps

// Signed jitter in [-a, a] that changes only with the boil drawing.
const crJit = (L, k, bf, seed, a) => a * (2 * L.h3(k, bf, seed) - 1);

// The bowl's edge: the lower end of the hanging hair. Shallow in the middle, down the walls at the sides.
function crBowl(L, x) {
  const e = Math.abs(x - 540) / 540;
  return 360 + 80 * L.noise1(x * 0.006, 131) + 1250 * Math.pow(e, 2.3);
}

// Heat of the throat at (x, y), 0 (the rim) to 1 (the core): the same field plate A paints with a
// gradient and plate B steps into bands. The hair region is cold.
function crHeat(L, x, y, pulse) {
  const d = Math.hypot((x - CR_THROAT.x) / CR_THROAT.r, (y - CR_THROAT.y) / (CR_THROAT.r * CR_THROAT.sy));
  let h = 1 - d * (1 - 0.06 * pulse) + 0.05 * L.fbm2(x * 0.006, y * 0.006, 9, 3);
  const over = (crBowl(L, x) - y) / 260;
  if (over > 0) h -= 0.3 * Math.min(1, over);
  return Math.max(0, Math.min(1, 0.3 + 0.7 * h));
}

// Hair: vertical loops hanging from the top edge down to the bowl, two passes, boiling at 12 fps.
function crHair(ctx, L, bf, color, alpha) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = 1.8;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  for (let pass = 0; pass < 2; pass++) {
    ctx.beginPath();
    let x = -12, k = 0;
    ctx.moveTo(x, -6);
    while (x < 1092) {
      x += 3.6 + L.h3(k, pass, 131) * 4.2;
      const end = crBowl(L, x) + crJit(L, k, bf, 132 + pass, 30) + 60 * (L.h3(k, pass, 133) - 0.5);
      const xj = x + crJit(L, k, bf, 136 + pass, 7);
      ctx.quadraticCurveTo(xj - 9, end + 18, xj + 5, end - 3);
      ctx.lineTo(xj + 8 + crJit(L, k, bf, 138 + pass, 5), L.h3(k, bf, 139 + pass) * end * 0.55 - 6);
      k++;
    }
    ctx.stroke();
  }
  // the lip at the bottom of the well: two ragged saws of short strokes, rising at the walls
  for (let pass = 0; pass < 2; pass++) {
    ctx.beginPath();
    let k2 = 0;
    for (let x = -12; x < 1092; x += 3 + L.h3(k2, pass, 137) * 8) {
      const e = (x - 540) / 540;
      const yb = 1850 - 420 * Math.pow(Math.abs(e), 4) + 14 * pass;
      const y = k2 % 2 ? yb - 4 - L.h3(k2, bf, 133 + pass) * 44 : yb + 14 + L.h3(k2, bf, 135 + pass) * 40;
      if (k2) ctx.lineTo(x + crJit(L, k2, bf, 134 + pass, 8), y);
      else ctx.moveTo(x, y);
      k2++;
    }
    ctx.stroke();
  }
  ctx.restore();
}

// Paper grain: dark pits and pale fibres, a fresh scatter every boil drawing.
function crGrain(ctx, L, bf, W, H) {
  ctx.save();
  for (const [col, alpha, seed, n] of [[CR.scrawl, 0.2, 4, 5200], [CR.scratch, 0.16, 5, 3600]]) {
    ctx.fillStyle = col;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const s = 1.2 + 1.6 * L.h3(i, bf, seed + 20);
      ctx.rect(L.h3(i, bf, seed) * W, L.h3(i, bf, seed + 10) * H, s, s);
    }
    ctx.fill();
  }
  ctx.restore();
}

// The fall: each figure's place on a closed clock of T, shrinking exponentially toward CR_VP.
const CR_FIGS = [
  { sx: 335, sy: 911, h: 1000, ph: 0.68, up: 0, seed: 3, facing: 1 }, // the hero, near and big
  { sx: 963, sy: 827, h: 800, ph: 0.882, up: 1, seed: 5, facing: -1 }, // head first
  { sx: -608, sy: 1056, h: 660, ph: 0.132, up: 0, seed: 7, facing: 1 },
  { sx: 995, sy: 1110, h: 520, ph: 0.352, up: 1, seed: 9, facing: -1 },
  { sx: 140, sy: 1300, h: 360, ph: 0.512, up: 0, seed: 11, facing: 1 },
];

function crFigure(ctx, L, f, tq, bf) {
  const p = (tq * 0.032 + f.ph) % 1;
  const s = Math.exp(-2.6 * p);
  const x = CR_VP[0] + (f.sx - CR_VP[0]) * s, y = CR_VP[1] + (f.sy - CR_VP[1]) * s;
  const h = f.h * s;
  const fade = Math.min(1, p / 0.04, (1 - p) / 0.06);
  if (h < 8 || fade <= 0) return null;
  const w = Math.sin(tq * 3 + f.seed) * 0.18;
  const pose = {
    rot: f.up ? Math.PI + 0.35 + 0.1 * Math.sin(tq * 0.9 + f.seed) : 0.08 * Math.sin(tq * 0.7 + f.seed),
    lean: -0.08,
    neck: -0.12,
    armL: 2.45 + w,
    elbowL: 0.35 - w * 0.5,
    armR: -2.4 + w,
    elbowR: -0.3 + w * 0.5,
    legL: 0.22 + w * 0.3,
    kneeL: 0.18,
    legR: -0.18 - w * 0.2,
    kneeR: 0.1,
  };
  const width = Math.max(1.2, h * 0.0075);
  const common = { x, y, anchor: 'hip', height: h, facing: f.facing, head: 'face', light: 'transparent', color: CR.scrawl, joint: 0, boil: bf };
  ctx.save();
  ctx.globalAlpha = fade;
  // three passes a hair apart: the scrawl
  const J = L.stickFigure(ctx, pose, { ...common, width, tremble: h * 0.014, jitter: h * 0.01, seed: f.seed });
  L.stickFigure(ctx, pose, { ...common, width: width * 0.7, tremble: h * 0.02, jitter: h * 0.005, seed: f.seed + 40 });
  L.stickFigure(ctx, pose, { ...common, width: width * 0.5, tremble: h * 0.024, jitter: h * 0.007, seed: f.seed + 80 });
  // the torso scribbled in: a dense zigzag from the hip up to the neck
  L.springLimb(ctx, J.hip, J.neck, { kind: 'zigzag', amp: h * 0.026, step: h * 0.011, width: width * 0.7, jitter: h * 0.012, color: CR.scrawl, seed: f.seed + 3, boil: bf });
  ctx.restore();
  return J;
}

function heatMap(ctx, L, W, H, bf, pulse) {
  // plate B: the same field in stepped bands, one path per band, and the isotherms between them
  const CELL = 12;
  const paths = Array.from({ length: CR_BANDS }, () => new Path2D());
  for (let y = 0; y < H; y += CELL) {
    for (let x = 0; x < W; x += CELL) {
      const b = Math.min(CR_BANDS - 1, Math.floor(crHeat(L, x + CELL / 2, y + CELL / 2, pulse) * CR_BANDS));
      paths[b].rect(x, y, CELL, CELL);
    }
  }
  paths.forEach((p, b) => {
    ctx.fillStyle = L.ramp(CR_RAMP, (b + 0.5) / CR_BANDS);
    ctx.fill(p);
  });
  const levels = Array.from({ length: CR_BANDS - 1 }, (_, i) => (i + 1) / CR_BANDS);
  const iso = L.isolines((x, y) => crHeat(L, x, y, pulse), [0, 0, W, H], levels, { cell: CELL });
  ctx.save();
  ctx.strokeStyle = CR.scrawl;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  iso.forEach((lines, i) => {
    for (const ln of lines) {
      ln.pts.forEach((q, j) => {
        const jx = q[0] + crJit(L, j + i * 997, bf, 150, 1.5), jy = q[1] + crJit(L, j + i * 997, bf, 151, 1.5);
        if (j) ctx.lineTo(jx, jy);
        else ctx.moveTo(jx, jy);
      });
      if (ln.closed) ctx.closePath();
    }
  });
  ctx.stroke();
  ctx.restore();
  // the scale: the ramp in its bands down the right edge, ticks at the isotherms
  const X = W - 96, Y0 = 520, SH = 760;
  for (let b = 0; b < CR_BANDS; b++) {
    ctx.fillStyle = L.ramp(CR_RAMP, (b + 0.5) / CR_BANDS);
    ctx.fillRect(X, Y0 + SH - ((b + 1) * SH) / CR_BANDS, 36, SH / CR_BANDS);
  }
  ctx.strokeStyle = CR.scrawl;
  ctx.lineWidth = 3;
  ctx.strokeRect(X, Y0, 36, SH);
  ctx.beginPath();
  for (let b = 1; b < CR_BANDS; b++) {
    const y = Y0 + SH - (b * SH) / CR_BANDS;
    ctx.moveTo(X - 18, y);
    ctx.lineTo(X, y);
  }
  ctx.stroke();
}

function drawCrater(ctx, t, info, heat) {
  const L = info.lib;
  const W = info.W, H = info.H, T = info.T;
  const bf = L.boil(T, 12);
  const tq = L.onTwos(T);
  const pulse = 0.5 - 0.5 * Math.cos(L.beat(tq).frac * Math.PI * 2);

  if (!heat) {
    // plate A: red paper, the throat's glow, grain, the hair
    ctx.fillStyle = CR.crater;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(CR_THROAT.x, CR_THROAT.y);
    ctx.scale(1, CR_THROAT.sy);
    const r = CR_THROAT.r * (1 + 0.04 * pulse);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, CR.yolkHot);
    g.addColorStop(0.12, CR.yolk);
    g.addColorStop(0.22, CR.yolk);
    g.addColorStop(0.5, CR.craterHot);
    g.addColorStop(0.86, CR.crater);
    g.addColorStop(1, CR.crater);
    ctx.fillStyle = g;
    ctx.fillRect(-W, -r, 2 * W, 2 * r);
    ctx.restore();
    crGrain(ctx, L, bf, W, H);
    crHair(ctx, L, bf, CR.scrawl, 0.78);
  } else {
    heatMap(ctx, L, W, H, bf, pulse);
    crHair(ctx, L, bf, CR.scrawl, 0.4);
  }

  // the fall, far to near, so the near figures cross over the far ones
  for (let i = CR_FIGS.length - 1; i >= 0; i--) crFigure(ctx, L, CR_FIGS[i], tq, bf);

  if (!heat) {
    // the wordmark, scratched into the red under the lip
    L.strokeText(ctx, 'CRATER', 700, 560, { size: 60, align: 'center', color: CR.scratch, tracking: 1.4, seed: 21, reveal: L.clamp(L.onTwos(t) / 0.75), ink: { double: true } });
  }
}

FILM.scene({ id: 'fx-crater', draw: (ctx, t, info) => drawCrater(ctx, t, info, false) });
FILM.scene({ id: 'fx-crater-b', draw: (ctx, t, info) => drawCrater(ctx, t, info, true) });
