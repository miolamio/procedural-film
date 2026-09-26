// Fixture plates for the drybrush theme: a forest in grey paper inside a black passe-partout,
// every shape a dry-brush silhouette in one blue-black ink, no hatching and no tone. Plate A: three
// planes of trunks and a near bank, tracked right through lib.layers; the Lodger (a long-coated
// walker with a disc head, two paper eyes and a bindle on his shoulder) walks the ground line; the
// Hooded Watcher sits on a near branch, turns its paper eyes after him and blinks; birds cross the
// gap. Everything is held on twos and the near plane boils on the same drawing clock. Plate B: the same frame in negative (grade invert),
// cut inside a held drawing, so the cut frame is the exact negative of the frame before it.
// Colours are the theme's rows (themes/drybrush/palette.js); the fixture film keeps the house
// lib.pal, so the plate carries them here.
const DBT = {
  ash: '#D3D3D3',
  ashDim: '#8B8B8E',
  brushFar: '#A7A8AD',
  brushMid: '#6B6C73',
  brushInk: '#171820',
  mount: '#050506',
};
const DBT_OPEN = { x0: 76, y0: 176, x1: 1004, y1: 1616 }; // the mount opening (the bottom margin is the widest)
const DBT_GROUND = 1440; // the focus plane's ground line
// The walk and the track are clocked from plate A's start (global T, one clock over both plates).
function dbtStart() {
  const a = FILM.TIMELINE.shots.find((s) => s.id === 'fx-drybrush');
  return a ? a.start : 0;
}

// The drawing clock: twelve drawings a second, each landing one frame ahead of the beat, so a cut on
// the beat falls inside a held drawing. d also picks the boil variant (d % 3).
function dbtClock(T) {
  const d = Math.floor(T * 12 + 0.5 + 1e-6);
  return { d, tq: (d - 0.5) / 12 };
}

// A trunk as one closed outline: taper, a root flare and a slow bend.
function dbtTrunk(L, x, base, top, w0, w1, bend, seed) {
  const n = 20;
  const left = [];
  const right = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const y = base + (top - base) * u;
    const hw = (w0 + (w1 - w0) * u) / 2 + Math.pow(1 - u, 6) * w0 * 0.5;
    const cx = x + bend * u * u + L.noise1(u * 3.3, seed) * w0 * 0.1;
    left.push([cx - hw + L.noise1(u * 11, seed + 1) * 1.8, y]);
    right.push([cx + hw + L.noise1(u * 11, seed + 2) * 1.8, y]);
  }
  return { pts: left.concat(right.reverse()), at: (u) => x + bend * u * u + L.noise1(u * 3.3, seed) * w0 * 0.1, base, top };
}

// A branch leaving a trunk at height u, curving up and out, with one fork: dendrites, not leaves.
function dbtBranch(tr, u, side, len, rise) {
  const y = tr.base + (tr.top - tr.base) * u;
  const x = tr.at(u);
  const p = (f, up) => [x + side * len * f, y - rise * f * f - up];
  const main = [p(0, 0), p(0.3, 6), p(0.62, 14), p(1, 30)];
  const fork = [p(0.55, 12), [x + side * len * 0.72, y - rise * 0.8 - 40], [x + side * len * 0.8, y - rise * 1.3 - 90]];
  return [main, fork];
}

// One depth of the forest: trunks spread over [x0, x1] with seeded widths, bends and branches.
function dbtPlane(L, s) {
  return L.cached(['dbtPlane', s.seed, s.count, s.x0, s.x1, s.base, s.top, s.w[0], s.w[1]].join('|'), () => {
    const r = L.rng(L.hash('dbtPlane', s.seed));
    const trunks = [];
    const branches = [];
    for (let i = 0; i < s.count; i++) {
      const x = s.x0 + (s.x1 - s.x0) * ((i + 0.15 + r() * 0.7) / s.count);
      const w = s.w[0] + r() * (s.w[1] - s.w[0]);
      const tr = dbtTrunk(L, x, s.base + r() * 16, s.top - r() * 80, w, w * 0.58, (r() - 0.5) * s.bend, s.seed * 16 + i);
      trunks.push(tr.pts);
      for (let k = 0; k < s.branches; k++) {
        const u = 0.42 + 0.4 * r();
        const side = r() < 0.5 ? -1 : 1;
        branches.push(...dbtBranch(tr, u, side, s.reach * (0.7 + 0.5 * r()), s.reach * (0.35 + 0.3 * r())));
      }
    }
    return { trunks, branches };
  });
}

const DBT_FAR = { seed: 401, count: 8, x0: -40, x1: 1180, base: 1296, top: 40, w: [20, 34], bend: 30, branches: 1, reach: 90 };
const DBT_MID = { seed: 402, count: 5, x0: -120, x1: 1300, base: 1372, top: 20, w: [50, 70], bend: 50, branches: 2, reach: 170 };
const DBT_TRACK = 110; // camera track, px a second at the focus plane
const DBT_WALK = 150; // the Lodger's walk, px a second
const DBT_NEAR_Z = 0.62;

// The planes' draw functions are hoisted, so layers keys them by a stable identity.
function dbtDrawFar(g) {
  const L = FILM.lib;
  const P = dbtPlane(L, DBT_FAR);
  L.dryBrushFill(g, P.trunks, { color: DBT.brushFar, width: 16, dry: 0.45, seed: 41, boil: false });
  L.dryBrush(g, P.branches, { color: DBT.brushFar, width: 6, dry: 0.5, seed: 42, boil: false });
  L.dryBrush(g, [[[-60, 1300], [400, 1294], [820, 1304], [1220, 1296]]], { color: DBT.brushFar, width: 18, dry: 0.7, seed: 43, boil: false });
}

function dbtDrawMid(g) {
  const L = FILM.lib;
  const P = dbtPlane(L, DBT_MID);
  L.dryBrushFill(g, P.trunks, { color: DBT.brushMid, width: 22, dry: 0.4, seed: 44, boil: false });
  L.dryBrush(g, P.branches, { color: DBT.brushMid, width: 10, dry: 0.45, seed: 45, boil: false });
  L.dryBrush(g, [[[-140, 1378], [300, 1368], [900, 1382], [1340, 1370]]], { color: DBT.brushMid, width: 26, dry: 0.6, seed: 46, boil: false });
}

// ---- the Lodger: a long coat, a disc head with two paper eyes, a bindle, thin legs ------------

const DBT_BODY = { head: 1.15, neck: 0.1, torso: 2.5, upperArm: 1.45, forearm: 1.35, thigh: 2.05, shin: 2.0, foot: 0.4 };
const DBT_LODGER_H = 380;
const DBT_STRIDE = 12; // drawings per walk cycle: two steps a second

function dbtWalkPose(L, k) {
  const W = [L.stickPoses.walk1, L.stickPoses.walk2, L.stickPoses.walk3, L.stickPoses.walk4];
  const ph = (((k % DBT_STRIDE) + DBT_STRIDE) % DBT_STRIDE) / (DBT_STRIDE / 4);
  const i = Math.floor(ph);
  const pose = L.poseMix(W[i], W[(i + 1) % 4], ph - i);
  const out = L.poseMix(L.stickPoses.stand, pose, 0.6);
  out.neck = -0.12; // the head hangs forward a little
  out.armR = 0.6; // the front arm holds the bindle's pole at the chest
  out.elbowR = 1.5;
  return out;
}

function dbtCircle(cx, cy, r, n = 28) {
  const pts = [];
  for (let i = 0; i < n; i++) pts.push([cx + r * Math.cos((i / n) * Math.PI * 2), cy + r * Math.sin((i / n) * Math.PI * 2)]);
  return pts;
}

// The Lodger in his own space: feet on y = 0, the hip over x = 0, facing right. Two plates per
// drawing (limbs and the pole, then coat, head and bundle). Each drawing of the walk is its own brush pass, so
// the walk is the boil: the plates repeat every DBT_STRIDE drawings and cache.
function dbtLodger(ctx, L, k) {
  const boil = false;
  const J = L.stickPose(dbtWalkPose(L, k), { x: 0, y: 0, height: DBT_LODGER_H, facing: 1, body: DBT_BODY });
  let bundle = null;
  const limbs = [
    [J.hip, J.kneeL, J.ankleL, J.toeL],
    [J.hip, J.kneeR, J.ankleR, J.toeR],
    [J.shoulder, J.elbowL, J.handL],
    [J.shoulder, J.elbowR, J.handR],
  ];

  // the bindle: a pole from the front hand over the shoulder, a bundle hanging off its back end
  const rest = [J.shoulder[0] - 16, J.shoulder[1] + 12];
  const ux = rest[0] - J.handR[0], uy = rest[1] - J.handR[1], ul = Math.hypot(ux, uy);
  const end = [J.handR[0] + (ux / ul) * 250, J.handR[1] + (uy / ul) * 250];
  limbs.push([[J.handR[0] - (ux / ul) * 16, J.handR[1] - (uy / ul) * 16], rest, end]);
  bundle = dbtCircle(end[0] - 4, end[1] + 30, 26, 18).map(([x, y], i) => [x + 3 * Math.sin(i * 1.7), y + (y > end[1] + 30 ? 6 : 0)]);
  L.dryBrush(ctx, limbs, { color: DBT.brushInk, width: 13, dry: 0.35, splay: 0.4, smooth: false, seed: 51, boil });
  // the coat hangs from the shoulders to below the knees' first third, flaring with the stride
  const ax = J.hip[0] - J.shoulder[0], ay = J.hip[1] - J.shoulder[1];
  const hemY = J.hip[1] + (J.kneeL[1] - J.hip[1]) * 0.62;
  const flare = 0.5 * Math.abs(J.kneeL[0] - J.kneeR[0]);
  const coat = [
    [J.shoulder[0] - 20, J.shoulder[1] - 6],
    [J.shoulder[0] + 16, J.shoulder[1] - 8],
    [J.shoulder[0] + ax * 0.55 + 30, J.shoulder[1] + ay * 0.55],
    [J.hip[0] + 36 + flare * 0.5, hemY],
    [J.hip[0] - 46 - flare * 0.5, hemY + 6],
    [J.shoulder[0] + ax * 0.5 - 34, J.shoulder[1] + ay * 0.5],
  ];
  const [hx, hy] = J.head;
  const r = J.headR;
  const eye = (dx) => dbtCircle(hx + dx, hy - r * 0.1, r * 0.23, 12);
  L.dryBrushFill(ctx, [coat, dbtCircle(hx, hy, r), eye(r * 0.08), eye(r * 0.58), bundle], { color: DBT.brushInk, width: 12, fringe: 2.5, dry: 0.28, seed: 52, boil });
  return J;
}

// ---- birds: two drawings (wings up, wings down), each one plate, moved as a whole -----------------

function dbtBird(ctx, L, up) {
  const w = up ? -16 : 12;
  L.dryBrush(ctx, [[[-26, w], [-12, -2], [0, 4]], [[0, 4], [12, -2], [26, w]]], { color: DBT.brushMid, width: 6, dry: 0.3, splay: 0.2, seed: up ? 71 : 72, boil: false });
}

// ---- the Hooded Watcher: a hunched hooded blot with two paper eyes ------------------------------

// Outline in its own space: the base at y = 0, centred on x = 0; the hood tip bends toward `look`.
function dbtWatcherShape(look) {
  const pts = [];
  const n = 26;
  for (let i = 0; i <= n; i++) {
    const a = Math.PI + (i / n) * Math.PI; // the lower rounded body, left to right
    pts.push([62 * Math.cos(a), -40 - 40 * Math.sin(a)]);
  }
  pts.push([58, -40], [52, -92], [36, -132], [14 + 8 * look, -160], [30 + 14 * look, -186]); // front of the hood to its tip
  pts.push([-2 + 8 * look, -172], [-30, -150], [-50, -112], [-60, -60]);
  return pts;
}

function dbtWatcher(ctx, L, look, shut) {
  const body = dbtWatcherShape(look);
  const rings = [body];
  if (!shut) {
    // eyes: two paper holes under the hood, shifted the way it looks
    const ex = 8 + 12 * look, ey = -104;
    rings.push(dbtCircle(ex - 16, ey, 9, 12), dbtCircle(ex + 14, ey + 2, 9, 12));
  } else {
    // shut: one thin slit of paper where the eyes were
    rings.push([[-14 + 12 * look, -106], [30 + 12 * look, -104], [30 + 12 * look, -100], [-14 + 12 * look, -102]]);
  }
  L.dryBrushFill(ctx, rings, { color: DBT.brushInk, width: 14, dry: 0.3, seed: 61, boil: false });
}

// The near plane at the shot's start: two trunks, a branch with the Watcher, and a bank.
function dbtNear(L) {
  return L.cached('dbtNear', () => {
    const a = dbtTrunk(L, 250, 1720, -80, 146, 104, 36, 4031);
    const b = dbtTrunk(L, 1010, 1720, -80, 128, 92, -28, 4032);
    const u = (1720 - 560) / (1720 + 80);
    const y = 560;
    const x = a.at(u);
    const branch = [
      [[x, y + 24], [x + 120, y + 6], [x + 250, y - 6], [x + 390, y - 40]],
      [[x + 250, y - 4], [x + 330, y - 70], [x + 380, y - 140]],
    ];
    const twigs = dbtBranch(b, 0.55, -1, 210, 120).concat(dbtBranch(b, 0.72, 1, 160, 90));
    const bank = [[[-300, 1600], [200, 1584], [700, 1604], [1300, 1590], [1800, 1600]]];
    return { trunks: [a.pts, b.pts], branches: branch.concat(twigs), bank, perch: [x + 220, y - 2] };
  });
}

function drawDrybrush(ctx, info) {
  const L = info.lib;
  const W = info.W, H = info.H;
  const { d, tq } = dbtClock(info.T);
  const s = tq - dbtStart(); // seconds of drawing time since the walk began
  const boil = ((d % 3) + 3) % 3;

  // the paper: flat grey; the tooth is in the brush
  ctx.fillStyle = DBT.ash;
  ctx.fillRect(0, 0, W, H);

  // one camera tracks right with the Lodger; he gains on it a little
  const cam = { x: W / 2 + DBT_TRACK * s, y: H / 2, zoom: 1 };
  const walkX = 330 + DBT_WALK * s;
  const near = dbtNear(L);
  const look = L.clamp((walkX - DBT_TRACK * s - (near.perch[0] - (DBT_TRACK * s) / DBT_NEAR_Z)) / 260 - 0.2, -1, 1);
  const lookQ = Math.round(look * 3) / 3; // five eye positions, so the Watcher's plates cache
  const shut = L.blinkAt(d, 7, { frames: 1, gapMin: 6, gapMax: 18 });

  L.layers(ctx, cam, [
    { z: 3, draw: dbtDrawFar },
    { z: 1.7, draw: dbtDrawMid },
    {
      z: 2.2,
      draw: (g) => {
        // three birds crossing the gap above the trees, left, each flapping on its own count
        for (let i = 0; i < 3; i++) {
          g.save();
          g.translate(560 - 50 * s + i * 74 + 20 * Math.sin(i * 2.1), 270 + i * 30 + 6 * Math.sin(s * 3 + i));
          dbtBird(g, L, (d + i) % 4 < 2);
          g.restore();
        }
      },
    },
    {
      z: 1,
      draw: (g) => {
        L.dryBrush(g, [[[-420, DBT_GROUND + 8], [260, DBT_GROUND - 2], [900, DBT_GROUND + 10], [1700, DBT_GROUND]]], { color: DBT.brushInk, width: 30, dry: 0.55, seed: 47, boil: false });
        g.save();
        g.translate(walkX, DBT_GROUND + 4);
        dbtLodger(g, L, d);
        g.restore();
      },
    },
    {
      z: DBT_NEAR_Z,
      draw: (g) => {
        L.dryBrushFill(g, near.trunks, { color: DBT.brushInk, width: 30, dry: 0.32, seed: 48, boil });
        L.dryBrush(g, near.branches, { color: DBT.brushInk, width: 22, dry: 0.45, seed: 49, boil });
        L.dryBrush(g, near.bank, { color: DBT.brushInk, width: 84, dry: 0.4, seed: 54, boil });
        g.save();
        g.translate(near.perch[0], near.perch[1]);
        dbtWatcher(g, L, lookQ, shut);
        g.restore();
      },
    },
  ]);

  // the passe-partout: flat black with the opening, its inner edge brushed so hairs cross the paper
  const o = DBT_OPEN;
  ctx.fillStyle = DBT.mount;
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.rect(o.x0, o.y0, o.x1 - o.x0, o.y1 - o.y0);
  ctx.fill('evenodd');
  const e = 10;
  L.dryBrush(
    ctx,
    [
      [[o.x0 - 30, o.y0 + e], [W / 2, o.y0 + e + 3], [o.x1 + 30, o.y0 + e - 2]],
      [[o.x1 + 30, o.y1 - e], [W / 2, o.y1 - e + 2], [o.x0 - 30, o.y1 - e - 2]],
      [[o.x0 + e, o.y1 + 30], [o.x0 + e - 2, (o.y0 + o.y1) / 2], [o.x0 + e + 2, o.y0 - 30]],
      [[o.x1 - e, o.y0 - 30], [o.x1 - e + 2, (o.y0 + o.y1) / 2], [o.x1 - e - 1, o.y1 + 30]],
    ],
    { color: DBT.mount, width: 34, dry: 0.75, splay: 0.9, seed: 55, boil: false }
  );

  // the caption on the mount, thin sans, the only type in the theme
  L.text(ctx, 'the long wood', W / 2, o.y1 + 150, { size: 30, weight: 200, color: DBT.ashDim, align: 'center', letterSpacing: 9 });
}

FILM.scene({ id: 'fx-drybrush', draw: (ctx, t, info) => drawDrybrush(ctx, info) });
FILM.scene({ id: 'fx-drybrush-b', draw: (ctx, t, info) => drawDrybrush(ctx, info) });
