// Fixture plates for the firs theme (a night collage): a flat ember sky, one pitch-black jagged fir
// edge with no contour, a snow field, a swarm of cut-paper almond eyes drifting over the edge at
// 24 fps, and a row of lollipop figures (a disc head on a stick) on the snow, posed on twos. One eye
// carries the ice accent and looks at the viewer; the rest watch the figures. Plate B is the same
// frame under grade { invert: 1 }: the dusk turns to night and the edge keeps every pixel.
// Colours are the theme's rows (themes/firs/palette.js); the fixture film keeps the house lib.pal,
// so the plate carries them here.
const FI = {
  ember: '#E2701E', rust: '#A8440F', pitch: '#0E0B09', snow: '#F3EFE6',
  bone: '#E8D2A8', sepia: '#74461F', ice: '#58B4E0',
};

// The fir edge: a seeded row of spires, each a narrow jagged outline of drooping branch tips, all
// in one ink, so the row reads as one silhouette. Built once per frame size, seed and options.
const FI_EDGES = new Map();
function firEdge(L, W, H, seed, o) {
  const key = W + 'x' + H + ':' + seed + ':' + JSON.stringify(o);
  if (FI_EDGES.has(key)) return FI_EDGES.get(key);
  const rng = L.rng(L.hash('firEdge', seed));
  const foot = H * o.foot;
  const path = new Path2D();
  let x = -60 + rng() * 20;
  while (x < W + 60) {
    // the skyline swells and dips over a few hundred px, and single spires break it
    const swell = 0.5 + 0.5 * L.noise1(x / (W * 0.33), seed + 5);
    const h = H * (o.hMin + (o.hMax - o.hMin) * (0.55 * swell + 0.45 * rng() ** 1.6));
    const top = foot - h;
    const width = h * (0.34 + 0.1 * rng());
    const tiers = Math.max(6, Math.round(h / (o.tier * (0.85 + 0.3 * rng()))));
    const right = [[x + 1.5, top]], left = [];
    for (let k = 1; k <= tiers; k++) {
      const u = k / tiers;
      const y = top + h * 0.92 * u ** 0.92;
      for (const [side, list] of [[1, right], [-1, left]]) {
        const reach = (width / 2) * u ** 0.85 * (0.7 + 0.55 * rng());
        const droop = h * 0.012 * (0.5 + rng()) + reach * 0.16;
        const tip = [x + side * reach, y + droop];
        const notch = [x + side * (reach * (0.22 + 0.18 * rng()) + 2), y + droop * 0.2 + h * 0.018];
        // a branch that breaks up into two points now and then
        if (rng() < 0.3 && reach > 30) {
          const split = [x + side * reach * 0.72, y + droop * 0.35 - h * 0.006];
          const mid = [x + side * reach * 0.6, y + droop * 0.7];
          if (side > 0) list.push(split, mid, tip, notch);
          else list.unshift(notch, tip, mid, split);
        } else if (side > 0) list.push(tip, notch);
        else list.unshift(notch, tip);
      }
    }
    // right runs top to bottom and left bottom to top, so the outline closes round the spire
    const outline = [...right, [x + 6, foot + 40], [x - 6, foot + 40], ...left];
    outline.forEach((p, i) => (i ? path.lineTo(p[0], p[1]) : path.moveTo(p[0], p[1])));
    path.closePath();
    x += width * (o.gap[0] + o.gap[1] * rng());
  }
  path.rect(-20, foot - H * o.mass, W + 40, H * (o.mass + 0.04));
  const edge = { path, foot };
  FI_EDGES.set(key, edge);
  return edge;
}

// The snow's top edge: a few low drifts where the forest foot meets the field.
function fiSnow(L, W, H, foot) {
  const pts = [[-20, H + 20]];
  for (let x = -20; x <= W + 20; x += 24) pts.push([x, foot + 14 + 16 * L.noise1(x / 170, 31) + 8 * L.noise1(x / 47, 32)]);
  pts.push([W + 20, H + 20]);
  return pts;
}

function fiFill(ctx, pts, color) {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

// A cut-paper eye in eye space (origin at its centre, width w): the almond is two lids of a few
// straight scissor cuts, jittered once per eye (the cut does not boil). Returns the outlines.
const FI_EYES = new Map();
function fiEyeCut(L, seed) {
  if (FI_EYES.has(seed)) return FI_EYES.get(seed);
  const rng = L.rng(L.hash('fiEye', seed));
  const n = 7;
  const j = () => (rng() - 0.5) * 0.035;
  const top = [], bot = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, s = Math.sin(Math.PI * u);
    // the upper lid arches higher and peaks a little toward the inner corner
    top.push([u - 0.5 + (i && i < n ? j() : 0), -0.25 * s ** 0.85 * (1 + 0.12 * Math.cos(Math.PI * u)) + (i && i < n ? j() : 0)]);
    bot.push([u - 0.5 + (i && i < n ? j() : 0), 0.17 * s ** 1.1 + (i && i < n ? j() : 0)]);
  }
  const ring = (r, k, jit) => {
    const a0 = rng() * Math.PI;
    const pts = [];
    for (let i = 0; i < k; i++) {
      const a = a0 + (i / k) * Math.PI * 2;
      const rr = r * (1 + (rng() - 0.5) * jit);
      pts.push([rr * Math.cos(a), rr * Math.sin(a)]);
    }
    return pts;
  };
  const cut = { top, bot, iris: ring(0.2, 9, 0.12), pupil: ring(0.085, 7, 0.16), glint: ring(0.03, 4, 0.3), tail: 0.05 + 0.05 * rng() };
  FI_EYES.set(seed, cut);
  return cut;
}

// Draw one eye: almond in bone, iris in sepia (or the accent) clipped to it, pupil pitch, a bone
// glint cut out of the iris, and the lid as a pitch paper sliver with an upswept outer tail.
function fiEye(ctx, e, gaze, shut) {
  const cut = fiEyeCut(e.L, e.seed);
  const w = e.w;
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(e.rot);
  ctx.scale(w * e.flip, w);
  const lidTop = cut.top.map(([x, y]) => [x, shut ? y * 0.16 + 0.03 : y]);
  const almond = [...lidTop, ...cut.bot.slice(1, -1).reverse().map(([x, y]) => [x, shut ? y * 0.2 + 0.03 : y])];
  fiFill(ctx, almond, FI.bone);
  if (!shut) {
    ctx.save();
    ctx.beginPath();
    almond.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.closePath();
    ctx.clip();
    const gx = gaze[0] * 0.2, gy = gaze[1] * 0.07 + 0.01;
    const at = (pts) => pts.map(([x, y]) => [x + gx, y + gy]);
    fiFill(ctx, at(cut.iris), e.accent ? FI.ice : FI.sepia);
    fiFill(ctx, at(cut.pupil), FI.pitch);
    fiFill(ctx, cut.glint.map(([x, y]) => [x + gx + 0.06, y + gy - 0.06]), FI.bone);
    ctx.restore();
  }
  // the lid: the top cut, and the same line lifted by a thickness that tapers at both corners
  const th = 0.055;
  const lid = [[-0.53, 0.01], ...lidTop.map(([x, y], i) => [x, y + (i === 0 || i === lidTop.length - 1 ? 0.012 : 0.01)])];
  lid.push([0.5 + cut.tail, -0.05 - cut.tail * 0.9]);
  for (let i = lidTop.length - 1; i >= 0; i--) {
    const [x, y] = lidTop[i];
    const u = i / (lidTop.length - 1);
    lid.push([x, y - th * Math.sin(Math.PI * (0.12 + 0.72 * u)) ** 0.7]);
  }
  fiFill(ctx, lid, FI.pitch);
  if (!shut) fiFill(ctx, [...cut.bot.map(([x, y]) => [x, y - 0.004]), ...cut.bot.slice().reverse().map(([x, y], i, a) => [x, y + 0.018 * Math.sin((Math.PI * i) / (a.length - 1))])], FI.pitch);
  ctx.restore();
}

// Lollipop figures: stickFigure with a solid disc head, arms cut to stubs and both legs one stick.
const FI_BODY = { head: 1, neck: 0.05, torso: 1.3, upperArm: 0.7, forearm: 0.55, thigh: 1.2, shin: 1.2, foot: 0 };
const FI_ROW = 10;
// Eyes blink seldom: a swarm blinking on the house schedule reads as falling slivers.
const FI_FLOW = { seed: 21, scale: 900, speed: 70, curl: true };
const FI_BLINK = { gapMin: 40, gapMax: 150, loop: 288 };
// The swarm's cloud, in frame fractions: a lopsided mass over the edge, thinning to the upper right.
const FI_SWARM = [[0.1, 0.2], [0.3, 0.1], [0.55, 0.14], [0.8, 0.05], [0.95, 0.12], [0.88, 0.3], [0.95, 0.5], [0.7, 0.55], [0.45, 0.5], [0.2, 0.52], [0.05, 0.4]];

function drawFirs(ctx, info, night) {
  const L = info.lib;
  const W = info.W, H = info.H;
  // one clock over both plates (plate A is one second), so the cut lands every eye in place
  const tau = Math.max(0, info.T - info.shot.start) + (night ? 1 : 0);
  const two = Math.floor(tau * 12 + 1e-6) / 12;

  ctx.fillStyle = FI.ember;
  ctx.fillRect(0, 0, W, H);

  const far = firEdge(L, W, H, 7, { foot: 0.66, hMin: 0.14, hMax: 0.3, tier: 34, mass: 0.05, gap: [0.6, 0.5] });
  ctx.fillStyle = FI.rust;
  ctx.fill(far.path);
  const near = firEdge(L, W, H, 3, { foot: 0.69, hMin: 0.08, hMax: 0.27, tier: 26, mass: 0.1, gap: [0.16, 0.2] });
  ctx.fillStyle = FI.pitch;
  ctx.fill(near.path);
  fiFill(ctx, fiSnow(L, W, H, near.foot), FI.snow);

  // the row of figures on the snow; the lead (the fifth) raises its arms to the eyes on the beat
  const rowY = H * 0.895;
  const figs = [];
  const rng = L.rng(L.hash('fiRow', 5));
  for (let i = 0; i < FI_ROW; i++) {
    const x = W * (0.08 + (0.84 * i) / (FI_ROW - 1)) + (rng() - 0.5) * 36;
    const h = H * (0.075 + 0.022 * rng());
    const y = rowY + (rng() - 0.5) * 30 + 26 * Math.sin(i * 1.7);
    const sway = Math.sin(two * Math.PI * 2 * 0.5 + i * 0.9);
    const lead = i === 4;
    const reach = lead ? L.clamp(Math.sin(Math.PI * L.clamp(two / 1.5)) * 1.4) : 0;
    const pose = {
      lean: 0.06 * sway,
      armL: 0.35 + 0.25 * sway + 2.3 * reach,
      armR: -0.3 + 0.2 * sway - 2.3 * reach * 0.9,
      elbowL: 0.2,
      elbowR: 0.3,
    };
    figs.push({ x, y, h, pose, i });
  }
  figs.sort((a, b) => a.y - b.y);
  for (const f of figs) {
    L.stickFigure(ctx, f.pose, { x: f.x, y: f.y, height: f.h, head: 'solid', body: FI_BODY, color: FI.pitch, joint: 0, width: f.h * 0.034, jitter: f.h * 0.004, tremble: 0.6, seed: 40 + f.i, facing: f.i % 2 ? -1 : 1 });
  }
  const leadFig = figs.find((f) => f.i === 4);

  // the swarm: scattered once in the sky band, carried on one slow current at 24 fps
  const pts = L.scatter(FI_SWARM.map(([x, y]) => [x * W, y * H]), { r: W * 0.15, seed: 12, max: 24 });
  const eyes = [];
  pts.forEach((p, i) => {
    // leave the lead eye a clearing, so it reads as the one that looks
    const q0 = L.advect(p, 0.6, FI_FLOW, 4);
    if (((q0.x - W * 0.52) / (W * 0.27)) ** 2 + ((q0.y - H * 0.37) / (H * 0.085)) ** 2 < 1) return;
    const r = L.rng(L.hash('fiSwarm', i));
    const q = L.advect(p, tau + 0.6, FI_FLOW, 10);
    const depth = r();
    const w = W * (0.06 + 0.13 * depth ** 2);
    const bob = 10 * Math.sin(tau * 1.7 + i * 2.1);
    eyes.push({ L, seed: i, x: q.x + 14 * Math.sin(tau * 0.9 + i), y: q.y + bob, w, rot: (r() - 0.5) * 0.9 + 0.05 * Math.sin(tau * 1.3 + i), flip: r() < 0.5 ? -1 : 1, depth });
  });
  // the lead eye: the largest, over the middle of the edge, in the accent, and it looks at you
  eyes.push({ L, seed: 99, x: W * 0.52 + 26 * Math.sin(tau * 0.8), y: H * 0.36 + 12 * Math.sin(tau * 1.2), w: W * 0.25, rot: -0.04, flip: 1, depth: 2, accent: true });
  eyes.sort((a, b) => a.depth - b.depth);
  for (const e of eyes) {
    const shut = L.blinkAt(info.frame, 300 + e.seed, FI_BLINK);
    let gaze = [0, 0];
    if (!e.accent) {
      const dx = leadFig.x - e.x, dy = leadFig.y - leadFig.h - e.y;
      const m = Math.hypot(dx, dy) || 1;
      gaze = [(dx / m) * e.flip, dy / m];
      const c = Math.cos(-e.rot), s = Math.sin(-e.rot);
      gaze = [gaze[0] * c - gaze[1] * s, gaze[0] * s + gaze[1] * c];
    }
    fiEye(ctx, e, gaze, shut);
  }
}

FILM.scene({ id: 'fx-firs', draw: (ctx, t, info) => drawFirs(ctx, info, false) });
FILM.scene({ id: 'fx-firs-b', draw: (ctx, t, info) => drawFirs(ctx, info, true) });
