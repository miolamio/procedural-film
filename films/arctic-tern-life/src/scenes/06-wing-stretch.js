// 06 wing-stretch: Down becomes wings. Illustrated, global T 9.5 to 11.5 (2.0 s at 120 bpm).
//
// Layer plan (frame px, camera locked at zoom 1, back to front):
//   1  paper under stripeCream / stripeApricot stripes (140 px, 30 deg, 6 px drift per beat), sky only
//   2  construction: the shoulder vertical x = 540, a r 855 circle about the shoulders, the rock-top level,
//      the body axis, and (from T 10.5) dashed rays from the shoulders to the wingtips (inkFaint 30%)
//   3  far-shore fjord hills on the sea line (iceShade, snow patches), three adult terns flying overhead,
//      the low sea from the horizon y 1320 to the tideline, seaDeep horizontal hatching, foam
//   4  shingle beach from y 1440 to the bottom edge: pebbles, shadow hatching, lichen, moss tufts
//   5  the flat shingle rock (top y 1324, standing on the ground line y 1420): shingleDeep, lichen crusts
//   6  the bird's hatched cast shadow on the rock top (light from the upper left)
//   7  subject: far wing, tail, legs and feet, body, head and neck, near wing (folded or open), down tufts
//   8  overlays: annMagenta change ring at T 10.0, annBlue wrist-to-tip ruler, annYellow arc along the
//      rising near wing (completes on T 11.0), annYellow ring on the near wingtip at T 11.0
//
// Timing, by drawing index d = onTwos(t) * 12 (characters move on twos):
//   d 0-5    T  9.500  crouched on its belly, wings folded, down tufts on the head and belly
//   d 6-8    T 10.000  it stands up tall (0.72, 1.08, 1); head and belly tufts lift off and drift right
//   d 12-14  T 10.500  the wings open half-way out to the sides (0.55, 1.06, 1); back tufts go
//   d 16-17  T 10.833  the wings sweep up (0.4, 1.08) ...
//   d 18     T 11.000  ... and land exactly on G2 on the beat; the last crown tuft goes
//   d 18-23  T 11.0-11.5  hold G2 exactly (match cut into 07), only the tufts drift
(function () {
  'use strict';

  const ID = 'wing-stretch';
  const DEG = Math.PI / 180;
  const TAU = Math.PI * 2;
  const FR = 1 / 24;

  const clamp = (v, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v);
  const lerp = (a, b, u) => a + (b - a) * u;
  const lerp2 = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
  const sstep = (a, b, x) => {
    const u = clamp((x - a) / (b - a));
    return u * u * (3 - 2 * u);
  };

  // ---- beats (shot-local t, global T in the comments) ----
  const B_STAND = 0.5; // T 10.0
  const B_OPEN = 1.0; // T 10.5
  const B_G2 = 1.5; // T 11.0

  // ---- shared geometry G2 (docs/storyboard.md), copied exactly ----
  const G2_BODY = { cx: 540, cy: 1230, rx: 150, ry: 75, rot: 15 * DEG };
  const G2_HEAD = [400, 1140];
  const G2_HR = 52;
  const G2_BILL = [[352, 1150], [290, 1172]];
  const G2_TAIL_TIP = [720, 1330];
  const G2_STREAMER = [760, 1350];
  const G2_HIPS = [[520, 1300], [570, 1300]];
  // each wing: shoulder, wrist, tip, then the trailing edge from the tip back to the body
  const G2_NEAR = { S: [580, 1180], W: [720, 900], T: [900, 380], TE: [[930, 540], [900, 760], [820, 1000], [640, 1240]] };
  const HAND_TE = 2; // trailing points on the hand: the primaries fan from the wrist to tip .. TE[1]
  const G2_FAR = { S: [500, 1170], W: [380, 900], T: [200, 420], TE: [[150, 560], [170, 780], [250, 1000], [460, 1230]] };

  const GROUND = 1420; // the ground line the rock stands on
  const ROCK_TOP = 1324; // feet stand here: legs 24 px from the belly at y 1300 (art bible 10.1: very short legs)
  const HORIZON = 1320;

  // ---- pose tables ----
  const CROUCH = { cx: 566, cy: 1255, rx: 150, ry: 72, rot: 5 * DEG, hx: 430, hy: 1200, hr: 50, bill: 7 * DEG, legs: 0 };
  const STAND = { cx: G2_BODY.cx, cy: G2_BODY.cy, rx: G2_BODY.rx, ry: G2_BODY.ry, rot: G2_BODY.rot, hx: G2_HEAD[0], hy: G2_HEAD[1], hr: G2_HR, bill: 0, legs: 1 };
  // wing parameters: arm and hand angle (radians, screen) and lengths (px)
  // te: the trailing-edge points as [u along the hand (te1, te2) or arm (te3, te4) as a fraction of its length,
  // v across it in px]; near wings trail on the +v side, far wings on the -v side (as in G2)
  const WING_TUCK = {
    near: { arm: 10 * DEG, armL: 90, hand: 8 * DEG, handL: 190, te: [[0.75, 16], [0.35, 24], [0.8, 30], [-0.3, 20]] },
    far: { arm: 10 * DEG, armL: 90, hand: 8 * DEG, handL: 190, te: [[0.75, -16], [0.35, -24], [0.8, -30], [-0.3, -20]] },
  };
  const WING_HALF = {
    near: { arm: -35 * DEG, armL: 200, hand: -55 * DEG, handL: 330, te: [[0.74, 70], [0.35, 105], [0.85, 115], [-0.1, 70]] },
    far: { arm: -150 * DEG, armL: 190, hand: -128 * DEG, handL: 300, te: [[0.76, -80], [0.36, -125], [0.86, -130], [-0.12, -55]] },
  };

  // stand pop, open pop, raise pop: 3 drawings each
  const POP_STAND = [0.72, 1.08, 1];
  const POP_OPEN = [0.55, 1.06, 1];

  // =====================================================================================
  // small geometry
  // =====================================================================================

  function rot2(x, y, a) {
    const c = Math.cos(a), s = Math.sin(a);
    return [x * c - y * s, x * s + y * c];
  }
  function toWorld(B, lx, ly) {
    const r = rot2(lx, ly, B.rot);
    return [B.cx + r[0], B.cy + r[1]];
  }
  function toLocal(B, x, y) {
    return rot2(x - B.cx, y - B.cy, -B.rot);
  }
  const dir = (a) => [Math.cos(a), Math.sin(a)];

  // uniform Catmull-Rom (0.5 tangents), open with the end points doubled as phantoms, 8 samples per span, ends included
  function crOpen(P, seg = 8) {
    const n = P.length;
    const out = [];
    for (let i = 0; i < n - 1; i++) {
      const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(n - 1, i + 2)];
      for (let k = 0; k < seg; k++) {
        const t = k / seg, t2 = t * t, t3 = t2 * t;
        const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
      }
    }
    out.push(P[n - 1].slice());
    return out;
  }

  // polyline sampler by arc-length fraction
  function sampler(pts) {
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const L = cum[cum.length - 1] || 1;
    const at = (f) => {
      const s = clamp(f) * L;
      let i = 1;
      while (i < cum.length - 1 && cum[i] < s) i++;
      const a = cum[i - 1], b = cum[i];
      const u = b > a ? (s - a) / (b - a) : 0;
      return lerp2(pts[i - 1], pts[i], u);
    };
    at.len = L;
    return at;
  }

  // =====================================================================================
  // seeds and geometry built once
  // =====================================================================================

  let GEO = null;
  function geo(L) {
    if (GEO) return GEO;
    const sd = (...k) => L.hash(ID, ...k) & 0x7fffffff;

    // wing locals from G2 (so the parametric wing reproduces G2 exactly at blend 1)
    function wingLocal(w) {
      const arm = Math.atan2(w.W[1] - w.S[1], w.W[0] - w.S[0]);
      const armL = Math.hypot(w.W[0] - w.S[0], w.W[1] - w.S[1]);
      const hand = Math.atan2(w.T[1] - w.W[1], w.T[0] - w.W[0]);
      const handL = Math.hypot(w.T[0] - w.W[0], w.T[1] - w.W[1]);
      const te = w.TE.map((p, i) => {
        const onHand = i < HAND_TE;
        const o = onHand ? w.W : w.S;
        const a = onHand ? hand : arm;
        const len = onHand ? handL : armL;
        const d = [p[0] - o[0], p[1] - o[1]];
        const u = (d[0] * Math.cos(a) + d[1] * Math.sin(a)) / len;
        const v = -d[0] * Math.sin(a) + d[1] * Math.cos(a);
        return [u, v];
      });
      return { arm, armL, hand, handL, te };
    }
    const g2n = wingLocal(G2_NEAR), g2f = wingLocal(G2_FAR);
    // shoulders ride the body
    const nearS = toLocal(G2_BODY, G2_NEAR.S[0], G2_NEAR.S[1]);
    const farS = toLocal(G2_BODY, G2_FAR.S[0], G2_FAR.S[1]);

    // tail in body-local coordinates (exact G2 tips)
    const tailTip = toLocal(G2_BODY, G2_TAIL_TIP[0], G2_TAIL_TIP[1]);
    const streamer = toLocal(G2_BODY, G2_STREAMER[0], G2_STREAMER[1]);
    const streamer2 = [streamer[0] - 14, streamer[1] + 12];

    // folded wing (body-local): bend at the front, primaries run back to the tip over the tail
    const FOLD = {
      lead: [[-104, -6], [-82, -38], [-30, -58], [40, -58], [120, -38], [186, -8], [226, 16]],
      trail: [[-104, -6], [-80, 18], [-20, 22], [60, 24], [130, 22], [190, 22], [226, 16]],
      split: 3, // lead index where the "hand" (primaries) begins
    };

    // down tufts: anchor, local offset, radius, lift-off beat
    const r = L.rng(sd('tufts'));
    const TUFT_DEF = [
      ['head', -6, -50, 17, B_STAND], ['head', 20, -45, 14, B_STAND], ['head', 42, -26, 13, B_STAND], ['head', -30, -40, 11, B_G2],
      ['body', -44, 66, 16, B_STAND], ['body', 4, 72, 15, B_STAND], ['body', 58, 58, 13, B_STAND],
      ['body', -40, -70, 12, B_OPEN], ['body', 70, -58, 14, B_OPEN], ['body', 30, 70, 10, B_OPEN],
    ];
    const tufts = TUFT_DEF.map((d, i) => {
      const rad = d[3] * 1.35;
      const n = 22 + Math.floor(r() * 8);
      const fil = [];
      for (let k = 0; k < n; k++) {
        const a = (k / n) * TAU + (r() - 0.5) * 0.4;
        fil.push({ a, l: rad * (0.7 + r() * 0.55), bend: (r() - 0.5) * 1.1, curl: (r() - 0.5) * 0.8, ink: r() < 0.4 });
      }
      const lobes = [];
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * TAU + r() * 0.8;
        lobes.push([Math.cos(a) * rad * 0.2, Math.sin(a) * rad * 0.2, rad * (0.24 + r() * 0.12)]);
      }
      const specks = [];
      for (let k = 0; k < 4; k++) specks.push([(r() - 0.5) * rad * 0.6, (r() - 0.5) * rad * 0.6, 0.9 + r() * 0.8]);
      return {
        anchor: d[0], lx: d[1], ly: d[2], rad, tDet: d[4], i,
        fil, lobes, specks, tan: r() < 0.4,
        vx: 250 + r() * 140, ax: 40 + r() * 80, vy: -(40 + r() * 70), wob: 10 + r() * 16, ph: r() * TAU, spin: (r() - 0.5) * 3,
      };
    });

    // pebbles on the beach (world), sorted back to front
    const pr = L.rng(sd('pebbles'));
    const pebbles = [];
    for (let k = 0; k < 900 && pebbles.length < 190; k++) {
      const y = 1452 + Math.pow(pr(), 0.85) * 500;
      const depth = clamp((y - 1440) / 480);
      const x = -40 + pr() * 1160;
      const rx = lerp(10, 46, depth) * (0.6 + pr() * 0.6);
      const ry = rx * lerp(0.45, 0.62, pr());
      // loose packing: reject stones that bury more than a sliver of a neighbour
      let ok = true;
      for (const q of pebbles) {
        const dx = (q.x - x) / (q.rx + rx), dy = (q.y - y) / (q.ry + ry);
        if (dx * dx + dy * dy < 0.62) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;
      pebbles.push({ x, y, rx, ry, rot: (pr() - 0.5) * 0.5, tone: pr(), lichen: pr() < 0.14, seed: sd('peb', k) });
    }
    pebbles.sort((a, b) => a.y - b.y);

    // the rock: silhouette and top face (world)
    const rock = [
      [236, GROUND + 18], [222, 1396], [238, 1362], [270, 1338], [320, 1326], [420, 1320], [540, 1318], [660, 1320], [760, 1324],
      [812, 1334], [846, 1356], [866, 1390], [872, GROUND + 22], [720, GROUND + 34], [520, GROUND + 38], [340, GROUND + 32],
    ];
    const rockTop = [[270, 1338], [320, 1322], [420, 1314], [540, 1312], [660, 1314], [760, 1318], [812, 1334], [700, 1340], [540, 1342], [380, 1342]];
    const lr = L.rng(sd('lichen'));
    const lichens = [];
    for (let k = 0; k < 16; k++) {
      const x = 250 + lr() * 610;
      const y = 1346 + lr() * 84;
      if (!L.polyContains(rock, x, y)) continue;
      const rad = 7 + lr() * 16;
      const pts = [];
      const m = 11;
      for (let j = 0; j < m; j++) {
        const a = (j / m) * TAU;
        const rr = rad * (0.7 + lr() * 0.5);
        pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.62]);
      }
      lichens.push({ x, y, rad, pts, seed: sd('lich', k) });
    }
    const cracks = [];
    const cr = L.rng(sd('cracks'));
    for (let k = 0; k < 7; k++) {
      let x = 270 + cr() * 560, y = 1348 + cr() * 30;
      const pts = [[x, y]];
      const n = 3 + Math.floor(cr() * 3);
      for (let j = 0; j < n; j++) {
        x += (cr() - 0.4) * 30;
        y += 10 + cr() * 16;
        pts.push([x, y]);
      }
      cracks.push(pts);
    }

    // moss tufts along the beach (world)
    const mr = L.rng(sd('moss'));
    const moss = [];
    for (let k = 0; k < 14; k++) {
      const x = mr() < 0.5 ? 20 + mr() * 190 : 890 + mr() * 180;
      moss.push({ x, y: 1450 + mr() * 380, w: 30 + mr() * 50, seed: sd('moss', k), blades: 6 + Math.floor(mr() * 6) });
    }

    // far-shore hills on the sea line: two ranges, the nearer one lower and darker (world)
    const ridge = (seed, base, amp, freq) => {
      const pts = [[-20, HORIZON + 2]];
      for (let x = -20; x <= 1100; x += 12) {
        const n = 0.6 * L.noise1(x * freq, seed) + 0.3 * L.noise1(x * freq * 2.7, seed + 1) + 0.1 * L.noise1(x * freq * 7, seed + 2);
        pts.push([x, HORIZON - Math.max(4, base + amp * n)]);
      }
      pts.push([1100, HORIZON + 2]);
      return pts;
    };
    const hillsFar = ridge(sd('hillsFar'), 46, 44, 1 / 260);
    const hillsNear = ridge(sd('hillsNear'), 16, 22, 1 / 140);
    // snow patches: short streaks hanging below the far ridge's high points
    const snow = [];
    for (let i = 2; i < hillsFar.length - 2; i++) {
      const p = hillsFar[i];
      if (HORIZON - p[1] < 62 || hillsFar[i - 1][1] < p[1] || hillsFar[i + 1][1] < p[1]) continue;
      const w = 10 + ((L.hash(sd('snow'), i) & 0xff) / 255) * 18;
      snow.push([[p[0] - w, p[1] + 9], [p[0] - w * 0.3, p[1] + 3], [p[0] + w * 0.2, p[1] + 4], [p[0] + w, p[1] + 12], [p[0] + w * 0.3, p[1] + 16], [p[0] - w * 0.4, p[1] + 13]]);
    }
    // adult terns overhead: start x, y, scale, speed px/s, flap phase
    const adults = [[40, 286, 1.2, 115, 0.2], [300, 222, 0.9, 140, 2.1], [560, 276, 1.05, 125, 4.0]];

    GEO = { sd, g2n, g2f, nearS, farS, tailTip, streamer, streamer2, FOLD, tufts, pebbles, rock, rockTop, lichens, cracks, moss, hillsFar, hillsNear, snow, adults };
    return GEO;
  }

  // =====================================================================================
  // the choreography
  // =====================================================================================

  function lerpBody(A, B, u) {
    const o = {};
    for (const k of Object.keys(A)) o[k] = lerp(A[k], B[k], u);
    return o;
  }
  function lerpWing(A, B, u) {
    return {
      arm: lerp(A.arm, B.arm, u), armL: lerp(A.armL, B.armL, u), hand: lerp(A.hand, B.hand, u), handL: lerp(A.handL, B.handL, u),
      te: A.te.map((q, i) => lerp2(q, B.te[i], u)),
    };
  }

  // pose for drawing index d
  function poseAt(g, d) {
    const p = { d, body: null, wings: null, g2: false };
    if (d <= 5) {
      const b = Object.assign({}, CROUCH);
      b.cy += [0, 1, 2, 1, 0, 1][d]; // breathing
      b.bill += d === 3 || d === 4 ? -4 * DEG : 0; // a glance up
      p.body = b;
      return p;
    }
    if (d <= 11) {
      const u = d <= 8 ? POP_STAND[d - 6] : 1;
      p.body = lerpBody(CROUCH, STAND, u);
      if (d === 10) p.body.bill = -3 * DEG;
      return p;
    }
    p.body = Object.assign({}, STAND);
    const G2W = { near: g.g2n, far: g.g2f };
    if (d <= 15) {
      const u = d <= 14 ? POP_OPEN[d - 12] : 1;
      p.wings = { near: lerpWing(WING_TUCK.near, WING_HALF.near, u), far: lerpWing(WING_TUCK.far, WING_HALF.far, u) };
      return p;
    }
    if (d <= 17) {
      const u = [0.4, 1.08][d - 16];
      p.wings = { near: lerpWing(WING_HALF.near, G2W.near, u), far: lerpWing(WING_HALF.far, G2W.far, u) };
      return p;
    }
    p.g2 = true;
    return p;
  }

  // world keypoints of a wing in a pose
  function wingPts(g, pose, side) {
    const G = side === 'near' ? G2_NEAR : G2_FAR;
    if (pose.g2) return { S: G.S, W: G.W, T: G.T, TE: G.TE };
    const w = pose.wings[side];
    const sl = side === 'near' ? g.nearS : g.farS;
    const S = toWorld(pose.body, sl[0], sl[1]);
    const da = dir(w.arm), dh = dir(w.hand);
    const W = [S[0] + da[0] * w.armL, S[1] + da[1] * w.armL];
    const T = [W[0] + dh[0] * w.handL, W[1] + dh[1] * w.handL];
    // the first HAND_TE trailing points ride the hand frame, the rest the arm frame
    const TE = w.te.map((q, i) => {
      const o = i < HAND_TE ? W : S;
      const a = i < HAND_TE ? w.hand : w.arm;
      const len = i < HAND_TE ? w.handL : w.armL;
      const c = Math.cos(a), s = Math.sin(a);
      return [o[0] + c * q[0] * len - s * q[1], o[1] + s * q[0] * len + c * q[1]];
    });
    return { S, W, T, TE };
  }

  // =====================================================================================
  // drawing helpers
  // =====================================================================================

  function poly(ctx, pts, closed = true) {
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      if (i === 0) ctx.moveTo(pts[i][0], pts[i][1]);
      else ctx.lineTo(pts[i][0], pts[i][1]);
    }
    if (closed) ctx.closePath();
  }
  function fillPoly(ctx, pts, color, alpha = 1) {
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.fillStyle = color;
    poly(ctx, pts);
    ctx.fill();
    ctx.restore();
  }
  // a batch of short strokes with one style
  function strokes(ctx, color, alpha, width, fn, dash) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha *= alpha;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (dash) ctx.setLineDash(dash);
    ctx.beginPath();
    fn(ctx);
    ctx.stroke();
    ctx.restore();
  }
  // per-boil wobble of a point, px
  function wob(L, x, y, seed, amp, bi) {
    const a = (L.hash(seed, bi, 1) & 0xffff) / 0xffff - 0.5;
    const b = (L.hash(seed, bi, 2) & 0xffff) / 0xffff - 0.5;
    return [x + a * 2 * amp, y + b * 2 * amp];
  }

  // =====================================================================================
  // background
  // =====================================================================================

  function drawSky(ctx, L, P, T) {
    L.paper(ctx, { seed: 6 });
    ctx.save();
    ctx.beginPath();
    ctx.rect(-10, -10, 1100, HORIZON + 10);
    ctx.clip();
    ctx.globalAlpha = 0.86;
    L.stripes(ctx, { colors: [P.stripeCream, P.stripeApricot], width: 140, angle: -0.52, offset: 12 * T, seed: 606 });
    ctx.restore();
  }

  function drawConstruction(ctx, L, P, pose, g, t, bi) {
    // the shoulder vertical and the level of the rock top
    strokes(ctx, P.inkFaint, 0.3, 1.5, (c) => {
      c.moveTo(540, 170);
      c.lineTo(540, 1580);
      c.moveTo(150, ROCK_TOP);
      c.lineTo(930, ROCK_TOP);
      // ticks every 60 px on the vertical
      for (let y = 240; y <= 1500; y += 60) {
        const l = (y - 240) % 300 === 0 ? 14 : 7;
        c.moveTo(540 - l, y);
        c.lineTo(540 + l, y);
      }
    });
    // a circle about the shoulders through both G2 wingtips (open at the bottom)
    strokes(ctx, P.inkFaint, 0.3, 1.5, (c) => {
      c.arc(540, 1180, 855, 200 * DEG, 340 * DEG);
    });
    strokes(ctx, P.inkFaint, 0.22, 1.5, (c) => {
      c.arc(540, 1180, 360, 200 * DEG, 340 * DEG);
      // radial spokes at 15 degrees between the two arcs
      for (let a = 210; a <= 330; a += 15) {
        const ca = Math.cos(a * DEG), sa = Math.sin(a * DEG);
        c.moveTo(540 + ca * 370, 1180 + sa * 370);
        c.lineTo(540 + ca * 845, 1180 + sa * 845);
      }
    }, [4, 9]);
    // the target: a ghost of the G2 wings the bird will stretch into, at construction weight, with crosses
    // on the wrists and tips
    if (!pose.g2) {
      strokes(ctx, P.inkFaint, 0.3, 1.5, (c) => {
        for (const w of [G2_NEAR, G2_FAR]) {
          const o = wingOutline(w).outline;
          for (let i = 0; i < o.length; i++) {
            const q = wob(L, o[i][0], o[i][1], g.sd('ghost', i), 0.5, bi);
            if (i === 0) c.moveTo(q[0], q[1]);
            else c.lineTo(q[0], q[1]);
          }
          c.closePath();
          for (const p of [w.W, w.T]) {
            c.moveTo(p[0] - 14, p[1]);
            c.lineTo(p[0] + 14, p[1]);
            c.moveTo(p[0], p[1] - 14);
            c.lineTo(p[0], p[1] + 14);
          }
        }
      });
    }
    // the body axis through the body centre
    const B = pose.body;
    const a0 = toWorld(B, -260, 0), a1 = toWorld(B, 290, 0);
    strokes(ctx, P.inkFaint, 0.3, 1.5, (c) => {
      c.moveTo(a0[0], a0[1]);
      c.lineTo(a1[0], a1[1]);
    }, [10, 8]);
    // rays from the shoulders to the wingtips once the wings open
    if (pose.wings || pose.g2) {
      const n = wingPts(g, pose, 'near'), f = wingPts(g, pose, 'far');
      strokes(ctx, P.inkFaint, 0.3, 1.5, (c) => {
        for (const w of [n, f]) {
          const dx = w.T[0] - w.S[0], dy = w.T[1] - w.S[1];
          const l = Math.hypot(dx, dy);
          c.moveTo(w.S[0], w.S[1]);
          c.lineTo(w.T[0] + (dx / l) * 90, w.T[1] + (dy / l) * 90);
          // a small cross at each wrist
          c.moveTo(w.W[0] - 10, w.W[1]);
          c.lineTo(w.W[0] + 10, w.W[1]);
          c.moveTo(w.W[0], w.W[1] - 10);
          c.lineTo(w.W[0], w.W[1] + 10);
        }
      }, [6, 8]);
    }
  }

  function drawHills(ctx, L, P, g, bi) {
    fillPoly(ctx, g.hillsFar, P.iceShade);
    L.hatch(ctx, g.hillsFar, { angle: -Math.PI / 4, spacing: 7, width: 1.2, color: P.iceDeep, alpha: 0.75, length: [8, 22], seed: g.sd('hfH'), clip: true, density: (x, y) => 0.35 + 0.5 * sstep(HORIZON - 70, HORIZON, y) });
    for (let k = 0; k < g.snow.length; k++) fillPoly(ctx, g.snow[k], P.ice);
    L.inkPath(ctx, g.hillsFar.slice(1, -1), { width: 1.8, color: P.inkSoft, alpha: 0.85, seed: g.sd('hfO'), wobble: 1, taper: 0 });
    fillPoly(ctx, g.hillsNear, P.mantleDeep);
    L.hatch(ctx, g.hillsNear, { angle: -Math.PI / 4, spacing: 5, width: 1.2, color: P.ink, alpha: 0.5, length: [6, 16], seed: g.sd('hnH'), clip: true });
    L.inkPath(ctx, g.hillsNear.slice(1, -1), { width: 2, color: P.inkSoft, seed: g.sd('hnO'), wobble: 1, taper: 0 });
  }

  // a small adult tern flying right, seen from the side: grey wings flapping on twos, black cap, red bill,
  // long streamers past the wingtips
  function drawAdult(ctx, L, P, g, x, y, sc, flap, k) {
    const seed = g.sd('adult', k);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sc, sc);
    const f = flap; // +1 wings up, -1 wings down
    const wing = (dx, tone) => {
      const wy = -26 * f, ty = -58 * f + 8;
      const pts = [[10 + dx, -3], [6 + dx, wy], [-34 + dx, ty], [-12 + dx, wy * 0.55 + 2], [-10 + dx, 1]];
      fillPoly(ctx, pts, tone);
      L.inkPath(ctx, pts, { closed: true, smooth: false, width: 2.2, seed: seed + 1 + dx, wobble: 0.4, taper: [3, 5] });
      // the thin dark trailing edge of the primaries
      strokes(ctx, P.capBlack, 0.9, 2, (c) => {
        c.moveTo(-34 + dx, ty);
        c.lineTo(-12 + dx, wy * 0.55 + 2);
      });
    };
    wing(-6, P.mantleDeep);
    // tail and streamers
    strokes(ctx, P.ink, 1, 2, (c) => {
      c.moveTo(-24, 0);
      c.lineTo(-66, -7);
      c.moveTo(-24, 1);
      c.lineTo(-62, 8);
    });
    const body = L.ellipsePts(0, 0, 27, 7.5, 20, 0);
    fillPoly(ctx, body, P.plumeWhite);
    fillPoly(ctx, L.ellipsePts(0, 3, 22, 4, 16, 0), P.breastGrey);
    L.inkPath(ctx, body, { closed: true, width: 2.4, seed: seed + 3, wobble: 0.4, taper: [3, 5] });
    // head, cap, bill
    fillPoly(ctx, L.ellipsePts(29, -3, 7.5, 7.5, 14, 0), P.plumeWhite);
    fillPoly(ctx, [[22, -4], [25, -10], [33, -10], [37, -5], [30, -5]], P.capBlack);
    fillPoly(ctx, [[35, -4], [52, -1], [35, 0]], P.billRed);
    L.inkPath(ctx, L.ellipsePts(29, -3, 7.5, 7.5, 14, 0), { closed: true, width: 2, seed: seed + 4, wobble: 0.3, taper: [3, 4] });
    wing(4, P.mantleGrey);
    ctx.restore();
  }

  function drawAdults(ctx, L, P, g, tw) {
    for (let k = 0; k < g.adults.length; k++) {
      const [x0, y0, sc, vx, ph] = g.adults[k];
      const x = x0 + vx * tw, y = y0 + 7 * Math.sin(tw * 3 + ph);
      const flap = Math.sin(TAU * 2.4 * tw + ph);
      drawAdult(ctx, L, P, g, x, y, sc, flap, k);
    }
  }

  function drawSea(ctx, L, P, g, T, bi) {
    const top = HORIZON, bot = 1452;
    fillPoly(ctx, [[-10, top], [1090, top], [1090, bot], [-10, bot]], P.sea);
    // horizontal hatching, tighter toward the horizon
    L.hatch(ctx, [[-10, top], [1090, top], [1090, bot], [-10, bot]], {
      angle: 0, spacing: 5, width: 1.3, color: P.seaDeep, alpha: 0.8, length: [30, 110], gap: [6, 22], angleJitter: 0.01, flow: 0.01,
      density: (x, y) => 0.25 + 0.75 * (1 - sstep(top, top + 90, y)), seed: g.sd('sea'),
    });
    // foam lines drifting a little
    const fr = L.rng(g.sd('foam'));
    strokes(ctx, P.foam, 0.95, 2.2, (c) => {
      for (let k = 0; k < 26; k++) {
        const y = lerp(top + 10, bot - 6, Math.pow(fr(), 0.7));
        const x = ((fr() * 1200 + T * 14 * (0.5 + (y - top) / 120)) % 1200) - 60;
        const l = lerp(14, 60, (y - top) / (bot - top)) * (0.6 + fr() * 0.6);
        const q = wob(L, x, y, g.sd('fo', k), 0.6, bi);
        c.moveTo(q[0], q[1]);
        c.quadraticCurveTo(q[0] + l / 2, q[1] - 2, q[0] + l, q[1]);
      }
    });
    // the horizon line
    L.inkPath(ctx, [[-10, top], [1090, top]], { width: 1.8, color: P.inkSoft, alpha: 0.9, seed: g.sd('hz'), wobble: 1, smooth: false, taper: 0 });
    // the tideline: a scalloped foam edge
    const tide = [];
    for (let x = -20; x <= 1100; x += 20) tide.push([x, bot - 8 + 5 * Math.sin(x * 0.021 + 1.3) + 3 * Math.sin(x * 0.057)]);
    const tideFill = tide.concat([[1100, bot + 14], [-20, bot + 14]]);
    fillPoly(ctx, tideFill, P.foam);
    L.inkPath(ctx, tide, { width: 1.8, color: P.seaDeep, alpha: 0.9, seed: g.sd('tide'), taper: 0 });
  }

  function drawBeach(ctx, L, P, g, bi) {
    fillPoly(ctx, [[-10, 1452], [1090, 1452], [1090, 1930], [-10, 1930]], P.shingle);
    // a faint lengthwise hatch for the gravel bed
    L.hatch(ctx, [[-10, 1452], [1090, 1452], [1090, 1930], [-10, 1930]], {
      angle: -Math.PI / 4, spacing: 11, width: 1.2, color: P.shingleDeep, alpha: 0.55, length: [10, 30], gap: [8, 20], seed: g.sd('bed'),
      density: (x, y) => 0.4 + 0.4 * sstep(1460, 1900, y),
    });
    // grit stipple
    L.stipple(ctx, [[-10, 1452], [1090, 1452], [1090, 1930], [-10, 1930]], {
      spacing: 11, r: [0.8, 1.8], color: P.shingleDeep, alpha: 0.7, seed: g.sd('grit'),
    });
    // pebbles back to front: flat fill, a hatched shadow on the lower right, lichen, outline
    for (const pb of g.pebbles) {
      const pts = L.ellipsePts(pb.x, pb.y, pb.rx, pb.ry, 20, pb.rot);
      const col = pb.tone < 0.35 ? P.shinglePale : pb.tone < 0.8 ? P.shingle : P.shingleDeep;
      fillPoly(ctx, pts, col);
      ctx.save();
      poly(ctx, pts);
      ctx.clip();
      // shadow: 45 degree strokes on the side away from the light
      ctx.strokeStyle = P.ink;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = pb.rx > 24 ? 1.3 : 1.1;
      ctx.lineCap = 'round';
      ctx.beginPath();
      const sp = pb.rx > 24 ? 5 : 4;
      const R = pb.rx + pb.ry;
      for (let o = pb.rx * 0.05; o < R; o += sp) {
        // lines along (1,-1) offset toward the lower right (1,1)/sqrt2
        const cx = pb.x + o * 0.7071, cy = pb.y + o * 0.7071;
        const h = R * 0.9;
        const j = ((L.hash(pb.seed, o | 0, bi) & 0xff) / 255 - 0.5) * 3;
        ctx.moveTo(cx - h * 0.7071 + j, cy + h * 0.7071);
        ctx.lineTo(cx + h * 0.7071, cy - h * 0.7071 + j);
      }
      ctx.stroke();
      // light rim on the upper left
      ctx.globalAlpha = 0.8;
      ctx.strokeStyle = P.shinglePale;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(pb.x + 2, pb.y + 2, pb.rx - 3, pb.ry - 3, pb.rot, 3.3, 4.6);
      ctx.stroke();
      if (pb.lichen && pb.rx > 14) {
        ctx.fillStyle = P.lichen;
        ctx.globalAlpha = 0.95;
        ctx.beginPath();
        const lr = L.rng(pb.seed);
        for (let k = 0; k < 5; k++) {
          const x = pb.x + (lr() - 0.65) * pb.rx * 0.9, y = pb.y + (lr() - 0.75) * pb.ry * 0.7;
          const rr = pb.rx * (0.08 + lr() * 0.12);
          ctx.moveTo(x + rr, y);
          ctx.ellipse(x, y, rr, rr * 0.6, 0, 0, TAU);
        }
        ctx.fill();
      }
      ctx.restore();
      if (pb.rx >= 22) {
        L.inkPath(ctx, pts, { closed: true, width: 2.2, seed: pb.seed, wobble: 0.8, taper: [4, 8] });
      } else {
        const o = wob(L, 0, 0, pb.seed, 0.5, bi);
        ctx.save();
        ctx.strokeStyle = P.ink;
        ctx.globalAlpha = 0.8;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(pb.x + o[0], pb.y + o[1], pb.rx, pb.ry, pb.rot, 0, TAU);
        ctx.stroke();
        ctx.restore();
      }
    }
    // moss tufts
    for (const m of g.moss) {
      const r = L.rng(m.seed);
      const base = [];
      for (let k = 0; k <= 10; k++) {
        const a = Math.PI + (k / 10) * Math.PI;
        base.push([m.x + Math.cos(a) * m.w * 0.5, m.y + Math.sin(a) * m.w * 0.26]);
      }
      fillPoly(ctx, base, P.moss);
      L.hatch(ctx, base, { angle: -Math.PI / 4, spacing: 5, width: 1.1, color: P.mossDeep, alpha: 0.8, length: [4, 12], gap: [1, 3], seed: m.seed + 1, density: (x) => sstep(m.x - m.w * 0.1, m.x + m.w * 0.4, x) });
      strokes(ctx, P.mossDeep, 0.95, 1.4, (c) => {
        for (let k = 0; k < m.blades; k++) {
          const x = m.x + (r() - 0.5) * m.w * 0.8;
          const h = 10 + r() * 20;
          const lean = (r() - 0.5) * 12;
          c.moveTo(x, m.y);
          c.quadraticCurveTo(x + lean * 0.3, m.y - h * 0.6, x + lean, m.y - h);
        }
      });
      L.inkPath(ctx, base.slice(0, 11), { width: 1.6, color: P.inkSoft, seed: m.seed + 2, taper: 5 });
    }
    // the shadow of the rock on the beach, lower right
    const sh = [[300, 1450], [880, 1446], [960, 1480], [900, 1512], [520, 1508], [320, 1480]];
    L.hatch(ctx, sh, { angle: -Math.PI / 4, spacing: 6, width: 1.3, color: P.ink, alpha: 0.55, seed: g.sd('rocksh'), density: (x, y) => 1 - sstep(1470, 1512, y) * 0.8 });
  }

  function drawRock(ctx, L, P, g, bi) {
    fillPoly(ctx, g.rock, P.shingleDeep);
    fillPoly(ctx, g.rockTop, P.shinglePale);
    // the front face: 45 degree shade deepening down and to the right, crossed at the base
    const face = g.rock;
    L.crossHatch(ctx, face, {
      angle: -Math.PI / 4, spacing: 7, width: 1.4, color: P.ink, alpha: 0.6, seed: g.sd('rockH'), clip: true, layers: 2, crossSpacing: 8,
      density: (x, y) => (L.polyContains(g.rockTop, x, y) ? 0 : 0.25 + 0.55 * sstep(1340, 1440, y) + 0.35 * sstep(560, 880, x)),
    });
    // contour strokes across the face (the stone's layering)
    strokes(ctx, P.ink, 0.45, 1.3, (c) => {
      const r = L.rng(g.sd('layers'));
      for (let k = 0; k < 9; k++) {
        const y = 1356 + k * 9 + r() * 4;
        const x0 = 250 + r() * 120, x1 = 700 + r() * 150;
        const o = wob(L, 0, 0, g.sd('lay', k), 0.6, bi);
        c.moveTo(x0, y + o[1]);
        c.bezierCurveTo(lerp(x0, x1, 0.3), y + 4, lerp(x0, x1, 0.7), y - 3, x1, y + 2 + o[1]);
      }
    });
    // cracks
    strokes(ctx, P.ink, 0.85, 1.6, (c) => {
      for (const cr of g.cracks) {
        c.moveTo(cr[0][0], cr[0][1]);
        for (let k = 1; k < cr.length; k++) c.lineTo(cr[k][0], cr[k][1]);
      }
    });
    // lichen crusts: orange fills with a ring of darker stipple
    for (const li of g.lichens) {
      fillPoly(ctx, li.pts, P.lichen, 0.95);
      L.stipple(ctx, li.pts, { spacing: 4.2, r: [0.7, 1.4], color: P.ochre, alpha: 0.9, seed: li.seed });
      strokes(ctx, P.ochre, 0.9, 1.2, (c) => {
        for (let j = 0; j < li.pts.length; j++) {
          const p = li.pts[j];
          c.moveTo(p[0] + 2.4, p[1]);
          c.arc(p[0], p[1], 2.4, 0, TAU);
        }
      });
    }
    // the top face: light stipple, the edge line
    L.stipple(ctx, g.rockTop, { spacing: 9, r: [0.8, 1.6], color: P.shingleDeep, alpha: 0.7, seed: g.sd('topst') });
    L.inkPath(ctx, [[270, 1338], [380, 1342], [540, 1342], [700, 1340], [812, 1334]], { width: 2, color: P.inkSoft, alpha: 0.9, seed: g.sd('topedge'), taper: 8 });
    L.inkPath(ctx, g.rock, { closed: true, width: 3, seed: g.sd('rockO') });
  }

  // =====================================================================================
  // the bird
  // =====================================================================================

  function castShadow(ctx, L, P, g, pose) {
    const B = pose.body;
    // a flat ellipse on the rock top, pushed right (light from the upper left)
    const spread = pose.g2 || pose.wings ? 1.1 : 1;
    const cx = B.cx + 70, cy = ROCK_TOP + 6;
    const pts = L.ellipsePts(cx, cy, 175 * spread, 13, 32, 0);
    L.hatch(ctx, pts, { angle: -Math.PI / 4, spacing: 4, width: 1.3, color: P.ink, alpha: 0.7, length: [6, 18], gap: [1, 4], seed: g.sd('cast'), clip: true, inset: 2, overshoot: 0 });
  }

  // ---- wing surface from its outline, leading and trailing edges ----
  // lead: root -> wrist -> tip (sampled), trail: root -> hand start -> tip (sampled); iW / iT: sample index of the
  // wrist on the lead and of the hand's first trailing point on the trail
  function wingMap(lead, iW, trail, iT) {
    const la = sampler(lead.slice(0, iW + 1)), lh = sampler(lead.slice(iW));
    const ta = sampler(trail.slice(0, iT + 1)), th = sampler(trail.slice(iT));
    const Lp = (s) => (s < 1 ? la(s) : lh(s - 1));
    const Tp = (s) => (s < 1 ? ta(s) : th(s - 1));
    const at = (s, c) => lerp2(Lp(s), Tp(s), c);
    const region = (s0, s1, c0, c1, n = 16) => {
      const out = [];
      for (let k = 0; k <= n; k++) out.push(at(lerp(s0, s1, k / n), typeof c0 === 'function' ? c0(lerp(s0, s1, k / n)) : c0));
      for (let k = n; k >= 0; k--) out.push(at(lerp(s0, s1, k / n), typeof c1 === 'function' ? c1(lerp(s0, s1, k / n)) : c1));
      return out;
    };
    return { at, Lp, Tp, region };
  }

  // paint the plumage of a wing (open or folded). o: { outline, map, far, folded, seed }
  function wingSurface(ctx, L, P, o, bi) {
    const { outline, map, seed } = o;
    const folded = !!o.folded;
    ctx.save();
    poly(ctx, outline);
    ctx.clip();
    // base grey
    fillPoly(ctx, outline, P.mantleGrey);
    // secondaries and their white tips (arm, trailing half)
    fillPoly(ctx, map.region(0, 1, 0.62, 1.02, 18), P.plumeShade);
    fillPoly(ctx, map.region(0, 1.02, 0.86, 1.05, 18), P.plumeWhite);
    // primaries: grey, outer webs a step darker toward the tip
    fillPoly(ctx, map.region(1.0, 2, (s) => lerp(0.25, 0.05, s - 1), 1.04, 18), P.mantleGrey);
    fillPoly(ctx, map.region(1.35, 2, 0.0, (s) => lerp(0.35, 0.7, s - 1.35), 12), P.mantleDeep, 0.55);
    // the dark carpal bar along the leading edge of the inner wing
    fillPoly(ctx, map.region(0.04, 1.08, -0.05, (s) => (s < 0.9 ? 0.3 : lerp(0.3, 0.08, (s - 0.9) / 0.18)), 18), P.carpalBar);
    L.hatch(ctx, map.region(0.04, 1.06, -0.05, 0.28, 18), { angle: -Math.PI / 4, spacing: 4, width: 1.2, color: P.capBlack, alpha: 0.6, length: [5, 16], gap: [1, 4], seed: seed + 3, inset: 0 });
    // covert scallops: juvFringe fringes over dark subterminal lines
    const rows = folded ? [0.36, 0.48, 0.6] : [0.36, 0.48];
    ctx.save();
    ctx.lineCap = 'round';
    for (let ri = 0; ri < rows.length; ri++) {
      const c = rows[ri];
      const n = folded ? 8 - ri : 10 - ri * 2;
      const pj = new Path2D(), pd = new Path2D();
      for (let k = 0; k < n; k++) {
        const s0 = 0.05 + (k + (ri % 2) * 0.5) / n * 0.9;
        const s1 = s0 + 0.9 / n;
        if (s1 > 1.02) continue;
        const a = map.at(s0, c), b = map.at(s1, c), m = map.at((s0 + s1) / 2, c + 0.11);
        const a2 = wob(L, a[0], a[1], seed + 100 + ri * 20 + k, 0.4, bi);
        pj.moveTo(a2[0], a2[1]);
        pj.quadraticCurveTo(m[0], m[1], b[0], b[1]);
        const md = map.at((s0 + s1) / 2, c + 0.07);
        pd.moveTo(a2[0], a2[1]);
        pd.quadraticCurveTo(md[0], md[1], b[0], b[1]);
      }
      ctx.strokeStyle = P.juvFringe;
      ctx.lineWidth = 2.6;
      ctx.stroke(pj);
      ctx.strokeStyle = P.mantleDeep;
      ctx.lineWidth = 1.2;
      ctx.stroke(pd);
    }
    ctx.restore();
    // secondaries: 14 separation lines
    strokes(ctx, P.mantleDeep, 0.9, 1.3, (cx) => {
      for (let k = 1; k < 14; k++) {
        const s = k / 14;
        const a = map.at(s, 0.64), b = map.at(s - 0.015, 1);
        cx.moveTo(a[0], a[1]);
        cx.lineTo(b[0], b[1]);
      }
    });
    // primary coverts at the base of the hand
    strokes(ctx, P.juvFringe, 0.9, 2, (cx) => {
      for (let k = 0; k < 5; k++) {
        const s0 = 1.0 + k * 0.05, s1 = s0 + 0.05;
        const a = map.at(s0, 0.3), b = map.at(s1, 0.3), m = map.at((s0 + s1) / 2, 0.42);
        cx.moveTo(a[0], a[1]);
        cx.quadraticCurveTo(m[0], m[1], b[0], b[1]);
      }
    });
    if (o.prim) {
      // primaries: 10 separate feathers fanned from the wrist, separated at the notches, each with a pale shaft
      const { W, tips, notches } = o.prim;
      strokes(ctx, P.mantleDeep, 1, 1.7, (cx) => {
        for (const n of notches) {
          const a = lerp2(W, n, 0.22);
          cx.moveTo(a[0], a[1]);
          cx.lineTo(n[0], n[1]);
        }
      });
      // outer web shading along the leading side of each feather
      strokes(ctx, P.mantleDeep, 0.55, 3, (cx) => {
        for (let k = 0; k < 9; k++) {
          const n = notches[k], a = lerp2(W, n, 0.4), b = lerp2(W, n, 0.97);
          cx.moveTo(a[0], a[1]);
          cx.lineTo(b[0], b[1]);
        }
      });
      strokes(ctx, P.plumeShade, 0.95, 1.1, (cx) => {
        for (const tp of tips) {
          const a = lerp2(W, tp, 0.25), b = lerp2(W, tp, 0.94);
          cx.moveTo(a[0], a[1]);
          cx.lineTo(b[0], b[1]);
        }
      });
    } else {
      // folded: primaries stacked from the base of the hand back to the tip, each with its shaft
      strokes(ctx, P.mantleDeep, 1, 1.6, (cx) => {
        for (let k = 1; k < 10; k++) {
          const f = k / 10;
          const base = map.at(1.0, lerp(0.15, 0.9, f));
          const tip = map.Tp(1 + f);
          cx.moveTo(base[0], base[1]);
          cx.lineTo(tip[0], tip[1]);
        }
      });
      strokes(ctx, P.plumeShade, 0.9, 1.1, (cx) => {
        for (let k = 0; k < 10; k++) {
          const f = (k + 0.5) / 10;
          const base = map.at(1.02, lerp(0.15, 0.9, f));
          const tip = map.at(1 + Math.min(1, f + 0.04), 0.85);
          cx.moveTo(base[0], base[1]);
          cx.lineTo(tip[0], tip[1]);
        }
      });
    }
    // shadow side: the trailing half of the wing takes 45 degree hatching
    L.hatch(ctx, map.region(0.02, 2, 0.55, 1.05, 30), {
      angle: -Math.PI / 4, spacing: o.far ? 5 : 7, width: 1.3, color: P.mantleDeep, alpha: 0.8, length: [8, 26], gap: [2, 6], seed: seed + 7, inset: 1,
    });
    if (o.far) {
      // the far wing sits a tone deeper
      L.hatch(ctx, outline, { angle: -Math.PI / 4 - 1.05, spacing: 7, width: 1.2, color: P.mantleDeep, alpha: 0.7, length: [10, 30], seed: seed + 8, inset: 0 });
    }
    ctx.restore();
  }

  // ---- the open-wing outline (shared with 07, which copies it for the match cut) ----
  // Corners stay sharp at the wrist and at the tip: the outline is built from pieces, not one smoothed loop.
  //   1 arm leading edge S -> W: a quadratic bulging 10 px outward (away from the wing), 8 samples
  //   2 hand leading edge W -> T: a quadratic bulging 8 px outward, 8 samples
  //   3 primaries T -> TE[0] -> TE[1]: base curve crOpen([T, TE0, TE1], 8); 10 feather tips at arc-length
  //     fractions k/9 (tip 0 is T, tip 9 is TE1), with a notch between tips k and k+1 at fraction (k+0.5)/9
  //     pulled toward the wrist by 14 px x handLength/550
  //   4 secondaries TE[1] -> TE[2] -> TE[3]: crOpen, 8 samples per span
  //   5 root TE[3] -> S: closes straight (hidden in the body)
  const BULGE_ARM = 10, BULGE_HAND = 8, NOTCH = 14;
  function quadPts(a, b, bulge, out, n = 8) {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    const c = [(a[0] + b[0]) / 2 + out[0] * bulge, (a[1] + b[1]) / 2 + out[1] * bulge];
    const pts = [];
    for (let k = 0; k <= n; k++) {
      const u = k / n, v = 1 - u;
      pts.push([v * v * a[0] + 2 * u * v * c[0] + u * u * b[0], v * v * a[1] + 2 * u * v * c[1] + u * u * b[1]]);
    }
    return pts;
  }
  function wingOutline(w) {
    const { S, W, T, TE } = w;
    // which side the wing lies on: the sign of TE[1] across the hand line
    const hx = T[0] - W[0], hy = T[1] - W[1];
    const sgn = (TE[1][0] - W[0]) * -hy + (TE[1][1] - W[1]) * hx > 0 ? 1 : -1;
    const outward = (a, b) => {
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const l = Math.hypot(dx, dy) || 1;
      return [(dy / l) * sgn, (-dx / l) * sgn];
    };
    const arm = quadPts(S, W, BULGE_ARM, outward(S, W));
    const hand = quadPts(W, T, BULGE_HAND, outward(W, T));
    const base = crOpen([T, TE[0], TE[1]], 8);
    const at = sampler(base);
    const handL = Math.hypot(hx, hy);
    const depth = (NOTCH * handL) / 550;
    const tips = [], notches = [];
    for (let k = 0; k <= 9; k++) tips.push(k === 0 ? T.slice() : k === 9 ? TE[1].slice() : at(k / 9));
    for (let k = 0; k < 9; k++) {
      const p = at((k + 0.5) / 9);
      const dx = W[0] - p[0], dy = W[1] - p[1];
      const l = Math.hypot(dx, dy) || 1;
      notches.push([p[0] + (dx / l) * depth, p[1] + (dy / l) * depth]);
    }
    const serr = [];
    for (let k = 0; k < 9; k++) serr.push(tips[k], notches[k]);
    serr.push(tips[9]);
    const sec = crOpen([TE[1], TE[2], TE[3]], 8);
    const outline = arm.slice(0, -1).concat(hand.slice(0, -1), serr.slice(0, -1), sec);
    // edges for the plumage map: lead root -> tip, trail root -> tip along the un-notched curves
    const lead = arm.slice(0, -1).concat(hand);
    const trail = sec.slice().reverse().concat(base.slice().reverse().slice(1));
    return { outline, lead, iW: 8, trail, iT: sec.length - 1, tips, notches };
  }

  function drawOpenWing(ctx, L, P, g, pose, side, bi) {
    const w = wingPts(g, pose, side);
    const O = wingOutline(w);
    const map = wingMap(O.lead, O.iW, O.trail, O.iT);
    const seed = geo(L).sd('wing', side);
    const far = side === 'far';
    wingSurface(ctx, L, P, { outline: O.outline, map, far, seed, prim: { W: w.W, tips: O.tips, notches: O.notches } }, bi);
    // the outline: hero weight on the near wing, secondary on the far wing, with a quick retrace
    L.inkPath(ctx, O.outline, { closed: true, smooth: false, width: far ? 3.5 : 5, seed: seed + 1, wobble: 0.8, taper: [6, 12], double: far ? false : { alpha: 0.4 } });
    return { w, map, outline: O.outline };
  }

  function drawFoldedWing(ctx, L, P, g, B, bi) {
    const F = g.FOLD;
    const leadW = F.lead.map((p) => toWorld(B, p[0], p[1]));
    const trailW = F.trail.map((p) => toWorld(B, p[0], p[1]));
    const lead = crOpen(leadW, 6), trail = crOpen(trailW, 6);
    const outline = lead.concat(trail.slice(1, -1).reverse());
    const map = wingMap(lead, F.split * 6, trail, F.split * 6);
    const seed = g.sd('fold');
    wingSurface(ctx, L, P, { outline, map, folded: true, seed }, bi);
    // tertials: two long rounded feathers over the base of the primaries
    strokes(ctx, P.inkSoft, 0.9, 1.8, (c) => {
      for (const cc of [0.45, 0.7]) {
        const a = map.at(0.7, cc), m = map.at(1.1, cc + 0.12), b = map.at(1.35, cc + 0.05);
        c.moveTo(a[0], a[1]);
        c.quadraticCurveTo(m[0], m[1], b[0], b[1]);
      }
    });
    L.inkPath(ctx, outline, { closed: true, width: 4, seed: seed + 1, wobble: 1.2 });
    return { map };
  }

  function tailPts(g, B) {
    const tt = g.tailTip, s1 = g.streamer, s2 = g.streamer2;
    return [
      toWorld(B, 92, -44), toWorld(B, 170, -8), toWorld(B, s1[0], s1[1]), toWorld(B, tt[0] + 6, tt[1] - 2), toWorld(B, tt[0], tt[1]),
      toWorld(B, s2[0], s2[1]), toWorld(B, tt[0] - 16, tt[1] + 10), toWorld(B, 118, 46),
    ];
  }

  function drawTail(ctx, L, P, g, B, bi) {
    const pts = tailPts(g, B);
    fillPoly(ctx, pts, P.plumeWhite);
    // grey outer webs along the upper edge, fine feather lines
    const up = [pts[0], pts[1], pts[2]];
    strokes(ctx, P.mantleGrey, 1, 5, (c) => {
      c.moveTo(up[0][0], up[0][1]);
      c.lineTo(up[1][0], up[1][1]);
      c.lineTo(up[2][0], up[2][1]);
    });
    strokes(ctx, P.inkSoft, 0.8, 1.2, (c) => {
      for (let k = 1; k < 6; k++) {
        const a = toWorld(B, 100 + k * 3, -34 + k * 13);
        const b = lerp2(pts[3], pts[6], k / 6);
        c.moveTo(a[0], a[1]);
        c.lineTo(b[0], b[1]);
      }
    });
    L.hatch(ctx, pts, { angle: -Math.PI / 4, spacing: 6, width: 1.2, color: P.mantleDeep, alpha: 0.75, seed: g.sd('tailH'), density: (x, y) => sstep(B.cy, B.cy + 90, y) });
    L.inkPath(ctx, pts, { closed: true, width: 3, seed: g.sd('tailO'), smooth: false, wobble: 1, taper: [6, 10] });
  }

  function drawLegs(ctx, L, P, g, B, legs, bi) {
    const hipsX = [B.cx - 20, B.cx + 30];
    for (let k = 1; k >= 0; k--) {
      const hx = legs >= 1 && B.cx === G2_BODY.cx ? G2_HIPS[k][0] : hipsX[k];
      const hy = lerp(ROCK_TOP - 8, G2_HIPS[k][1], clamp(legs, 0, 1.2));
      const col = P.juvBill;
      // tarsus
      L.inkPath(ctx, [[hx, hy], [hx - 2, ROCK_TOP - 3]], { width: 6, color: col, seed: g.sd('leg', k), taper: 0, smooth: false, wobble: 0.5 });
      // three webbed toes pointing forward (left), one tiny hind toe
      const fx = hx - 2, fy = ROCK_TOP - 2;
      const toes = [[fx - 26, fy + 1], [fx - 21, fy + 4], [fx - 14, fy - 2]];
      fillPoly(ctx, [[fx, fy - 1], toes[0], toes[1], toes[2], [fx + 2, fy + 2]], col, 0.8);
      strokes(ctx, col, 1, 2.6, (c) => {
        for (const tp of toes) {
          c.moveTo(fx, fy);
          c.lineTo(tp[0], tp[1]);
        }
        c.moveTo(fx + 1, fy);
        c.lineTo(fx + 8, fy + 1);
      });
    }
  }

  function bodyOutline(L, B) {
    return L.ellipsePts(B.cx, B.cy, B.rx, B.ry, 64, B.rot);
  }

  function drawBody(ctx, L, P, g, B, bi, wingsOpen) {
    const out = bodyOutline(L, B);
    fillPoly(ctx, out, P.plumeWhite);
    ctx.save();
    poly(ctx, out);
    ctx.clip();
    // grey-white underparts: plumeShade on the lower-right shadow side
    const shade = [];
    for (let k = 0; k <= 24; k++) {
      const a = -0.25 + (k / 24) * 2.3;
      shade.push(toWorld(B, Math.cos(a) * B.rx * 1.02, Math.sin(a) * B.ry * 1.02));
    }
    for (let k = 24; k >= 0; k--) {
      const a = -0.25 + (k / 24) * 2.3;
      shade.push(toWorld(B, Math.cos(a) * B.rx * 0.55 - 20, Math.sin(a) * B.ry * 0.35 + 8));
    }
    fillPoly(ctx, shade, P.plumeShade);
    // the mantle: grey across the back, scaly with juvFringe
    const mantle = [];
    for (let k = 0; k <= 20; k++) {
      const a = Math.PI + 0.35 + (k / 20) * (Math.PI - 0.55);
      mantle.push(toWorld(B, Math.cos(a) * B.rx * 1.05, Math.sin(a) * B.ry * 1.05));
    }
    for (let k = 20; k >= 0; k--) {
      const x = lerp(-B.rx * 0.9, B.rx * 0.95, k / 20);
      mantle.push(toWorld(B, x, -B.ry * 0.28 + 10 * Math.sin((k / 20) * Math.PI)));
    }
    fillPoly(ctx, mantle, P.mantleGrey);
    const sc = new Path2D(), sd = new Path2D();
    for (let row = 0; row < 4; row++) {
      const y = -B.ry * 0.85 + row * 14;
      for (let k = 0; k < 9; k++) {
        const x = -B.rx * 0.65 + (k + (row % 2) * 0.5) * 26;
        if (x > B.rx * 0.9) continue;
        const a = toWorld(B, x, y), b = toWorld(B, x + 24, y), m = toWorld(B, x + 12, y + 12), m2 = toWorld(B, x + 12, y + 8);
        const a2 = wob(L, a[0], a[1], g.sd('sc', row, k), 0.4, bi);
        sc.moveTo(a2[0], a2[1]);
        sc.quadraticCurveTo(m[0], m[1], b[0], b[1]);
        sd.moveTo(a2[0], a2[1]);
        sd.quadraticCurveTo(m2[0], m2[1], b[0], b[1]);
      }
    }
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = P.juvFringe;
    ctx.lineWidth = 2.6;
    ctx.stroke(sc);
    ctx.strokeStyle = P.mantleDeep;
    ctx.lineWidth = 1.2;
    ctx.stroke(sd);
    ctx.restore();
    // contour hatching on the shadow half, perpendicular to the body's long axis
    L.hatch(ctx, out, {
      angle: B.rot + Math.PI / 2 + 0.25, spacing: 7, width: 1.3, color: P.mantleDeep, alpha: 0.8, bend: 2, length: [10, 34], seed: g.sd('bodyH'),
      density: (x, y) => {
        const l = toLocal(B, x, y);
        const u = l[0] / B.rx, v = l[1] / B.ry;
        return sstep(0.15, 0.95, u * 0.45 + v * 0.9);
      },
    });
    L.hatch(ctx, out, {
      angle: -Math.PI / 4, spacing: 5, width: 1.2, color: P.ink, alpha: 0.55, length: [8, 22], seed: g.sd('bodyH2'),
      density: (x, y) => {
        const l = toLocal(B, x, y);
        return sstep(0.7, 1.1, (l[0] / B.rx) * 0.4 + (l[1] / B.ry) * 0.95);
      },
    });
    // breast feather texture: sparse stipple and small feather-edge ticks
    L.stipple(ctx, out, {
      spacing: 9, r: [0.8, 1.5], color: P.mantleDeep, alpha: 0.8, seed: g.sd('bodySt'),
      density: (x, y) => {
        const l = toLocal(B, x, y);
        return 0.15 + 0.5 * sstep(-0.2, 0.9, l[1] / B.ry);
      },
    });
    strokes(ctx, P.mantleDeep, 0.7, 1.1, (c) => {
      const r = L.rng(g.sd('ticks'));
      for (let k = 0; k < 34; k++) {
        const lx = (r() * 2 - 1) * B.rx * 0.8, ly = (0.05 + r() * 0.8) * B.ry;
        if ((lx / B.rx) ** 2 + (ly / B.ry) ** 2 > 0.8) continue;
        const a = toWorld(B, lx, ly), b = toWorld(B, lx + 7, ly + 4), m = toWorld(B, lx + 4, ly + 6);
        const a2 = wob(L, a[0], a[1], g.sd('tk', k), 0.4, bi);
        c.moveTo(a2[0], a2[1]);
        c.quadraticCurveTo(m[0], m[1], b[0], b[1]);
      }
    });
    ctx.restore();
    L.inkPath(ctx, out, { closed: true, width: 5, seed: g.sd('bodyO'), wobble: 1.1, double: { alpha: 0.4, from: 0.1, to: 0.45 } });
  }

  function headPts(L, pose) {
    const B = pose.body;
    return { hx: B.hx, hy: B.hy, hr: B.hr };
  }

  function drawHead(ctx, L, P, g, B, bi) {
    const hx = B.hx, hy = B.hy, hr = B.hr;
    const k = hr / G2_HR;
    // neck: a patch bridging the head and the front of the body, with throat and nape lines
    const front = toWorld(B, -B.rx * 0.72, -B.ry * 0.1);
    const dx = front[0] - hx, dy = front[1] - hy;
    const dl = Math.hypot(dx, dy) || 1;
    const nx = -dy / dl, ny = dx / dl;
    const hw = hr * 0.78, bw = B.ry * 0.78;
    const hc = [hx + (dx / dl) * hr * 0.3, hy + (dy / dl) * hr * 0.3];
    const neck = [
      [hc[0] + nx * hw, hc[1] + ny * hw], [front[0] + nx * bw, front[1] + ny * bw],
      [front[0] - nx * bw, front[1] - ny * bw], [hc[0] - nx * hw, hc[1] - ny * hw],
    ];
    // bill (black), drawn under the head outline
    const bo = rot2(G2_BILL[0][0] - G2_HEAD[0], G2_BILL[0][1] - G2_HEAD[1], B.bill);
    const to = rot2(G2_BILL[1][0] - G2_HEAD[0], G2_BILL[1][1] - G2_HEAD[1], B.bill);
    const base = [hx + bo[0] * k, hy + bo[1] * k], tip = [hx + to[0] * k, hy + to[1] * k];
    const bdx = tip[0] - base[0], bdy = tip[1] - base[1];
    const bl = Math.hypot(bdx, bdy);
    const bnx = -bdy / bl, bny = bdx / bl;
    const bill = [
      [base[0] - bnx * 9 + (bdx / bl) * 10, base[1] - bny * 9 + (bdy / bl) * 10],
      [lerp(base[0], tip[0], 0.55) - bnx * 5.5, lerp(base[1], tip[1], 0.55) - bny * 5.5],
      tip,
      [lerp(base[0], tip[0], 0.6) + bnx * 4, lerp(base[1], tip[1], 0.6) + bny * 4],
      [base[0] + bnx * 9 + (bdx / bl) * 8, base[1] + bny * 9 + (bdy / bl) * 8],
    ];
    fillPoly(ctx, bill, P.juvBill);
    // gape line and a grey sheen along the culmen
    strokes(ctx, P.mantleDeep, 0.9, 1.2, (c) => {
      const a = lerp2(base, tip, 0.15), b = lerp2(base, tip, 0.8);
      c.moveTo(a[0] - bnx * 3, a[1] - bny * 3);
      c.lineTo(b[0] - bnx * 1.5, b[1] - bny * 1.5);
    });
    L.inkPath(ctx, bill, { closed: true, width: 2.4, seed: g.sd('bill'), smooth: false, taper: [3, 5], wobble: 0.4 });
    strokes(ctx, P.ink, 0.9, 1.4, (c) => {
      c.moveTo(base[0] + bdx * 0.05, base[1] + bdy * 0.05);
      c.lineTo(lerp(base[0], tip[0], 0.6) + bnx * 0.5, lerp(base[1], tip[1], 0.6) + bny * 0.5);
    });

    // head disc
    const disc = L.ellipsePts(hx, hy, hr, hr, 40, 0);
    fillPoly(ctx, neck, P.plumeWhite);
    fillPoly(ctx, disc, P.plumeWhite);
    ctx.save();
    poly(ctx, disc);
    ctx.clip();
    // shadow under the jaw
    const jaw = [];
    for (let j = 0; j <= 12; j++) {
      const a = 0.2 + (j / 12) * 2.2;
      jaw.push([hx + Math.cos(a) * hr * 1.05, hy + Math.sin(a) * hr * 1.05]);
    }
    jaw.push([hx - hr * 0.2, hy + hr * 0.35], [hx + hr * 0.4, hy + hr * 0.1]);
    fillPoly(ctx, jaw, P.plumeShade);
    // smudgy black rear crown: from behind the eye over the crown to the nape; white forehead in front
    const cap = [];
    for (let j = 0; j <= 16; j++) {
      const a = -80 * DEG + (j / 16) * 110 * DEG;
      cap.push([hx + Math.cos(a) * hr * 1.08, hy + Math.sin(a) * hr * 1.08]);
    }
    cap.push([hx + hr * 0.62, hy + hr * 0.42], [hx + hr * 0.2, hy + hr * 0.2], [hx - hr * 0.2, hy + hr * 0.08], [hx - hr * 0.42, hy - hr * 0.05], [hx - hr * 0.32, hy - hr * 0.25], [hx - hr * 0.08, hy - hr * 0.62]);
    fillPoly(ctx, cap, P.capBlack, 0.92);
    // the smudge: stipple feathering the cap's front and lower edge onto the white
    L.stipple(ctx, disc, {
      spacing: 4.2, r: [0.8, 1.6], color: P.capBlack, alpha: 0.85, seed: g.sd('smudge'),
      density: (x, y) => {
        const u = (x - hx) / hr, v = (y - hy) / hr;
        const dFront = Math.abs(u + 0.3 + v * 0.35);
        const dLow = Math.abs(v - 0.2 - u * 0.25);
        return (u > -0.75 && v < 0.5 ? Math.max(0, 1 - dFront * 3.2) : 0) + (u > -0.2 && v > 0 ? Math.max(0, 1 - dLow * 3.5) : 0);
      },
    });
    L.hatch(ctx, disc, { angle: -Math.PI / 4, spacing: 5, width: 1.2, color: P.mantleDeep, alpha: 0.8, length: [6, 18], seed: g.sd('headH'), density: (x, y) => sstep(0.2, 0.95, ((x - hx) * 0.5 + (y - hy)) / hr) });
    ctx.restore();
    // eye: in the front edge of the black, with a catch light
    const ex = hx - hr * 0.3, ey = hy - hr * 0.08;
    ctx.save();
    ctx.fillStyle = P.capBlack;
    ctx.beginPath();
    ctx.arc(ex, ey, 7.5 * k, 0, TAU);
    ctx.fill();
    ctx.fillStyle = P.white;
    ctx.beginPath();
    ctx.arc(ex - 2.4 * k, ey - 2.6 * k, 2.1 * k, 0, TAU);
    ctx.fill();
    ctx.restore();
    // outlines: head circle except where it meets the neck, then throat and nape strokes
    const na = Math.atan2(dy, dx);
    const arc = [];
    for (let j = 0; j <= 30; j++) {
      const a = na + 0.95 + (j / 30) * (TAU - 1.9);
      arc.push([hx + Math.cos(a) * hr, hy + Math.sin(a) * hr]);
    }
    L.inkPath(ctx, arc, { width: 5, seed: g.sd('headO'), wobble: 0.9, taper: [10, 10] });
    // +n is the throat side, -n the nape side
    L.inkPath(ctx, [neck[3], lerp2(neck[3], neck[2], 0.5), neck[2]], { width: 4.5, seed: g.sd('nape'), taper: [8, 16], wobble: 0.8 });
    const th0 = neck[0], th1 = lerp2(neck[0], neck[1], 0.6);
    const thm = [lerp(th0[0], th1[0], 0.5) - nx * 6, lerp(th0[1], th1[1], 0.5) - ny * 6];
    L.inkPath(ctx, [th0, thm, th1], { width: 4, seed: g.sd('throat'), taper: [6, 22], wobble: 0.6 });
  }

  // ---- down tufts ----
  function tuftAnchor(g, pose, tf) {
    const B = pose.body;
    if (tf.anchor === 'head') {
      const k = B.hr / G2_HR;
      return [B.hx + tf.lx * k, B.hy + tf.ly * k];
    }
    return toWorld(B, tf.lx, tf.ly);
  }

  function drawTuft(ctx, L, P, tf, x, y, rot, alpha, bi) {
    if (alpha <= 0.01) return;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(x, y);
    ctx.rotate(rot);
    const col = tf.tan ? P.downTan : P.downGrey;
    // the soft core: a few overlapping lobes
    const core = new Path2D();
    for (const lb of tf.lobes) {
      core.moveTo(lb[0] + lb[2], lb[1]);
      core.arc(lb[0], lb[1], lb[2], 0, TAU);
    }
    ctx.fillStyle = col;
    ctx.fill(core);
    // barbs: free-floating filaments (down has no hooklets), each a small S
    const pa = new Path2D(), pb = new Path2D();
    for (let k = 0; k < tf.fil.length; k++) {
      const f = tf.fil[k];
      const j = ((L.hash(tf.i, k, bi) & 0xff) / 255 - 0.5) * 0.2;
      const a = f.a + j;
      const r0 = tf.rad * 0.15;
      const x0 = Math.cos(a) * r0, y0 = Math.sin(a) * r0;
      const x3 = Math.cos(a + f.curl) * f.l, y3 = Math.sin(a + f.curl) * f.l;
      const c1 = [Math.cos(a + f.bend) * f.l * 0.4, Math.sin(a + f.bend) * f.l * 0.4];
      const c2 = [Math.cos(a - f.bend * 0.6) * f.l * 0.75, Math.sin(a - f.bend * 0.6) * f.l * 0.75];
      const p = f.ink ? pb : pa;
      p.moveTo(x0, y0);
      p.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], x3, y3);
    }
    ctx.lineCap = 'round';
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.stroke(pa);
    ctx.strokeStyle = P.inkSoft;
    ctx.lineWidth = 1;
    ctx.globalAlpha *= 0.9;
    ctx.stroke(pb);
    ctx.lineWidth = 1.2;
    ctx.stroke(core);
    ctx.fillStyle = P.downSpeck;
    ctx.beginPath();
    for (const sp of tf.specks) {
      ctx.moveTo(sp[0] + sp[2], sp[1]);
      ctx.arc(sp[0], sp[1], sp[2], 0, TAU);
    }
    ctx.fill();
    ctx.restore();
  }

  function drawTufts(ctx, L, P, g, pose, tw, bi) {
    for (const tf of g.tufts) {
      if (tw < tf.tDet - 1e-6) {
        const p = tuftAnchor(g, pose, tf);
        drawTuft(ctx, L, P, tf, p[0], p[1], 0, 1, bi);
        continue;
      }
      // released: start where it clung on the release drawing, then drift right on the wind
      const d0 = Math.round(tf.tDet * 12);
      const p0 = tuftAnchor(g, poseAt(g, Math.max(0, d0 - 1)), tf);
      const tau = tw - tf.tDet + 1 / 12; // already lifting on the release drawing
      const x = p0[0] + tf.vx * tau + tf.ax * tau * tau;
      const y = p0[1] + tf.vy * tau + tf.wob * Math.sin(tau * 5 + tf.ph) - 10 * Math.min(1, tau * 6);
      const alpha = 1 - sstep(1.1, 1.6, tau);
      drawTuft(ctx, L, P, tf, x, y, tf.spin * tau, alpha, bi);
    }
  }

  // =====================================================================================
  // overlays
  // =====================================================================================

  // a ruler parallel to wrist -> tip, off px to the +v (trailing) side or, negative, to the leading side;
  // ticks point away from the wing
  function drawRuler(ctx, P, a, b, off, prog) {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const l = Math.hypot(dx, dy);
    if (l < 10 || prog <= 0) return;
    const ux = dx / l, uy = dy / l;
    const sg = off < 0 ? -1 : 1;
    const nx = -uy * sg, ny = ux * sg;
    const ox = nx * Math.abs(off), oy = ny * Math.abs(off);
    const len = l * prog;
    ctx.save();
    ctx.strokeStyle = P.annBlue;
    ctx.lineCap = 'round';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(a[0] + ox, a[1] + oy);
    ctx.lineTo(a[0] + ox + ux * len, a[1] + oy + uy * len);
    // ticks every 22 px, long every fifth
    for (let s = 0, k = 0; s <= len + 0.01; s += 22, k++) {
      const tl = k % 5 === 0 ? 28 : 12;
      const px = a[0] + ox + ux * s, py = a[1] + oy + uy * s;
      ctx.moveTo(px, py);
      ctx.lineTo(px + nx * tl, py + ny * tl);
    }
    // end bars reaching back toward the wrist and the tip
    ctx.moveTo(a[0] + ox * 1.3, a[1] + oy * 1.3);
    ctx.lineTo(a[0] + ox * 0.25, a[1] + oy * 0.25);
    if (prog >= 1) {
      ctx.moveTo(b[0] + ox * 1.3, b[1] + oy * 1.3);
      ctx.lineTo(b[0] + ox * 0.25, b[1] + oy * 0.25);
    }
    ctx.stroke();
    ctx.restore();
  }

  function ring(ctx, color, x, y, r, alpha, width = 3) {
    if (alpha <= 0) return;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha *= alpha;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  // =====================================================================================
  // registration
  // =====================================================================================

  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const L = info.lib, P = L.pal, E = L.ease;
      const g = geo(L);
      const t = clamp(tIn, 0, info.dur);
      const tw = L.onTwos(t);
      const d = Math.min(24, Math.round(tw * 12));
      const bi = L.boil(info.T);
      const pose = poseAt(g, d);
      const B = pose.body;
      const open = !!(pose.wings || pose.g2);

      // timing helpers (overlays at 24 fps, visible on the beat frame)
      const hit = (a, frames, e, lead = 1) => (t < a - 1e-6 ? 0 : (e || ((u) => u))(clamp((t - a) / (frames * FR) + lead / frames)));

      // 1-5 backdrop
      drawSky(ctx, L, P, info.T);
      drawConstruction(ctx, L, P, pose, g, t, bi);
      drawHills(ctx, L, P, g, bi);
      drawAdults(ctx, L, P, g, tw);
      drawSea(ctx, L, P, g, info.T, bi);
      drawBeach(ctx, L, P, g, bi);
      drawRock(ctx, L, P, g, bi);
      castShadow(ctx, L, P, g, pose);

      // 7 subject
      if (open) drawOpenWing(ctx, L, P, g, pose, 'far', bi);
      drawTail(ctx, L, P, g, B, bi);
      drawLegs(ctx, L, P, g, B, B.legs, bi);
      drawBody(ctx, L, P, g, B, bi, open);
      drawHead(ctx, L, P, g, B, bi);
      let near = null;
      if (open) near = drawOpenWing(ctx, L, P, g, pose, 'near', bi);
      else drawFoldedWing(ctx, L, P, g, B, bi);
      drawTufts(ctx, L, P, g, pose, tw, bi);

      // 8 overlays
      // magenta change ring as the down lifts off (T 10.0)
      if (t >= B_STAND - 1e-6 && t < B_STAND + 0.5) {
        const u = hit(B_STAND, 8, E.outExpo);
        const fade = 1 - clamp((t - B_STAND) / (11 * FR));
        ring(ctx, P.annMagenta, B.hx + 8, B.hy - 20, lerp(46, 150, u), fade);
        ring(ctx, P.annMagenta, B.hx + 8, B.hy - 20, lerp(30, 96, u), fade * 0.7, 2);
      }
      // blue ruler from wrist to tip, in from T 10.0 on the folded wing, then riding the wing as it unfolds
      if (t >= B_STAND - 1e-6) {
        const prog = hit(B_STAND, 6, E.outExpo);
        if (open) drawRuler(ctx, P, near.w.W, near.w.T, -44, prog);
        else drawRuler(ctx, P, toWorld(B, g.FOLD.lead[0][0], g.FOLD.lead[0][1]), toWorld(B, g.FOLD.lead[6][0], g.FOLD.lead[6][1]), -84, prog);
      }
      // yellow arc about the near shoulder inside the V, sweeping ahead of the rising leading edge: in from T 10.0,
      // completes exactly on T 11.0
      if (t >= B_STAND - 1e-6) {
        const p = hit(B_STAND, 24, E.inOutSine, 0);
        const S = G2_NEAR.S;
        L.arcAnnotation(ctx, S[0], S[1], 470, -72 * DEG, -104 * DEG, { color: P.annYellow, width: 3, p, endTicks: 12, arrow: 16, dot: 5 });
        L.arcAnnotation(ctx, S[0], S[1], 500, -76 * DEG, -76 * DEG - 22 * DEG * p, { color: P.annYellow, width: 2, alpha: 0.8, endTicks: 0, dash: [14, 10] });
      }
      // yellow ring on the near wingtip as the wings land on G2 (T 11.0)
      if (t >= B_G2 - 1e-6) {
        const u = hit(B_G2, 8, E.outExpo);
        const fade = 1 - clamp((t - B_G2 - 4 * FR) / (8 * FR));
        ring(ctx, P.annYellow, G2_NEAR.T[0], G2_NEAR.T[1], lerp(14, 70, u), fade);
        ring(ctx, P.annYellow, G2_FAR.T[0], G2_FAR.T[1], lerp(10, 48, u), fade * 0.9, 2.5);
      }
    },
  });
})();
