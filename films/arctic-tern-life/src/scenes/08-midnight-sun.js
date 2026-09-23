// 08 midnight-sun: "Days under a sun that never sets". T 13.0 to 16.0, illustrated, hard cut in.
// The juvenile stands on a boulder on the Young Sound shore and practises its wings while the sun
// circles low around the sky three times without setting (one circuit per 1.0 s, counter-clockwise
// as seen, from the top of the G-less path ellipse centred (540, 760), radii 400 x 180).
// Layers, back to front:
//   1  stripes (stripeCream / stripeApricot), drifting 6 px per beat
//   2  duskRose low band over the hills, strongest when the sun is at its lowest
//   3  construction: path-ellipse axes, the sun's plumb line (inkFaint 30%)
//   4  overlay: dotted annYellow sun path and the day's travelled arc
//   5  the sun (disc r 40, 12 ink ray ticks)
//   6  far range and near hills (sprite, 3 boil drawings): snow, moss, inkSoft ridge lines
//   7  distant colony terns
//   8  the sea (sprite): seaDeep engraved hatching, ice floes
//   9  sun glitter following the sun, surf lines
//  10  beach shingle and the boulder (sprite)
//  11  the bird's cast shadow on the boulder, swinging opposite the sun
//  12  overlay: annBlue shadow compass and shadow line from the feet
//  13  the juvenile (far wing, tail, legs, body, head, near wing), on twos
//  14  overlays: motion arcs on downstrokes, the take-off hint, the day tally ring at (180, 300)
(function () {
  'use strict';

  const ID = 'midnight-sun';
  const TAU = Math.PI * 2;
  const DEG = Math.PI / 180;
  const FR = 1 / 24;
  const clamp = (v, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v);
  const lerp = (a, b, u) => a + (b - a) * u;
  const sstep = (a, b, x) => {
    const u = clamp((x - a) / (b - a));
    return u * u * (3 - 2 * u);
  };

  // sun path (storyboard 08): ellipse centred (540, 760), radii 400 x 180
  const SCX = 540, SCY = 760, SRX = 400, SRY = 180;
  const SUN_R = 40;
  // the far shore / hill foot line and the sea
  const HORIZON = 1000;
  const SHORE = 1400;
  // the bird's feet on the boulder
  const FX = 540, FY = 1300;
  // the bird and its boulder are drawn 1.25x about the feet
  const BS = 1.25;
  // day tally ring
  const RING_X = 180, RING_Y = 300, RING_R = 60;
  // beats (local t)
  const B_FLAP1 = 0.5; // T 13.5 small flaps
  const B_FLAP2 = 1.5; // T 14.5 bigger flaps
  const B_HOP = 2.5; // T 15.5 hop
  const B_READY = 2.75; // T 15.75 crouch, ready
  const DAY_END = [1 - FR, 2 - FR, 3 - FR]; // T 13.958, 14.958, 15.958: notches light

  let SEED = 0;
  const sd = (L, ...k) => L.hash(ID, ...k) & 0x7fffffff;

  // ---------------------------------------------------------------------------
  // sun
  // ---------------------------------------------------------------------------

  // the sun is an object: it steps on twos, 12 drawings per circuit (one per "two hours")
  function sunAt(t) {
    const d = Math.floor(t * 12 + 1e-6);
    const u = d / 12; // circuits travelled
    const th = -Math.PI / 2 - TAU * u; // counter-clockwise as seen (y down): top, left, bottom, right
    const x = SCX + Math.cos(th) * SRX, y = SCY + Math.sin(th) * SRY;
    const low = (Math.sin(th) + 1) / 2; // 1 at the lowest point (540, 940)
    return { x, y, th, u, d, low, frac: u - Math.floor(u + 1e-9) };
  }

  // lowest the hills may rise at x so no sun position ever touches them
  let LIMIT = null;
  function hillLimit(x) {
    if (!LIMIT) {
      LIMIT = new Float32Array(1081 / 2 + 2);
      for (let i = 0; i < LIMIT.length; i++) {
        const xx = i * 2;
        let lim = 0;
        const R = SUN_R + 8;
        for (let k = 0; k < 720; k++) {
          const th = (k / 720) * TAU;
          const sx = SCX + Math.cos(th) * SRX, sy = SCY + Math.sin(th) * SRY;
          const dx = Math.abs(sx - xx);
          if (dx < R) lim = Math.max(lim, sy + Math.sqrt(R * R - dx * dx) + 10);
        }
        LIMIT[i] = lim;
      }
    }
    return LIMIT[Math.max(0, Math.min(LIMIT.length - 1, Math.round(x / 2)))];
  }

  function sunRays(x, y) {
    const out = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU + 0.12;
      const long = i % 2 === 0;
      out.push([x + Math.cos(a) * (SUN_R + 10), y + Math.sin(a) * (SUN_R + 10), x + Math.cos(a) * (SUN_R + (long ? 34 : 22)), y + Math.sin(a) * (SUN_R + (long ? 34 : 22))]);
    }
    return out;
  }

  function drawSun(ctx, L, P, s) {
    const x = s.x, y = s.y;
    const seed = sd(L, 'sun');
    sunRays(x, y).forEach((q, i) => L.inkLine(ctx, q[0], q[1], q[2], q[3], { width: 3.2, seed: seed + i, taper: [2, 8], wobble: 0.4 }));
    const disc = L.ellipsePts(x, y, SUN_R, SUN_R, 40);
    L.inkPath(ctx, disc, { closed: true, fill: P.sun, width: 3.6, seed: seed + 20 });
    L.hatch(ctx, disc, {
      spacing: 5, width: 1.3, color: P.ochre, alpha: 0.85, seed: seed + 21, length: [8, 26],
      density: (px, py) => sstep(0.05, 0.7, ((px - x) * 0.6 + (py - y) * 0.8) / SUN_R),
    });
    L.stipple(ctx, disc, {
      spacing: 7, r: [0.8, 1.4], color: P.ochre, alpha: 0.7, seed: seed + 23,
      density: (px, py) => 0.6 * sstep(-0.2, 0.4, ((px - x) * 0.6 + (py - y) * 0.8) / SUN_R),
    });
    L.inkPath(ctx, [[x - 25, y - 12], [x - 16, y - 25], [x - 3, y - 30]], { width: 3, color: P.white, alpha: 0.85, seed: seed + 22, taper: [6, 8] });
  }

  // ---------------------------------------------------------------------------
  // sprites (t-independent layers, one per boil drawing, keyed by render scale)
  // ---------------------------------------------------------------------------

  const SPR = new Map();
  function sprite(ctx, L, name, variant, B, paint) {
    const S = FILM.S || 1;
    const key = name + '|' + variant + '|' + S;
    let cv = SPR.get(key);
    if (!cv) {
      cv = FILM.makeCanvas(Math.ceil(B.w * S), Math.ceil(B.h * S));
      const g = cv.getContext('2d');
      g.setTransform(S, 0, 0, S, -B.x * S, -B.y * S);
      paint(g, variant);
      SPR.set(key, cv);
    }
    ctx.drawImage(cv, B.x, B.y, B.w, B.h);
  }

  // ---------------------------------------------------------------------------
  // geometry (pure constants, built once)
  // ---------------------------------------------------------------------------
  let GEO = null;
  function geo(L) {
    if (GEO) return GEO;
    const g = {};
    SEED = sd(L, 'base');
    const n1 = L.noise1;

    // ---- far range: peaks at the frame edges, a wide saddle where the sun dips ----
    // the fjord walls: peaks beyond the sun's reach at the frame edges, and between them rolling
    // hills that stay under the sun's lowest path with a broken, irregular ridge
    const lim = (x) => hillLimit(x);
    const farY = (x) => {
      const edge = 1000 - 250 * Math.exp(-Math.pow(x / 120, 2)) - 215 * Math.exp(-Math.pow((x - 1080) / 130, 2));
      const bumps = 10 + 26 * Math.abs(n1(x * 0.009, SEED + 1)) + 9 * Math.abs(n1(x * 0.035, SEED + 2)) + 2.5 * n1(x * 0.13, SEED + 3);
      const rid = Math.max(lim(x) + bumps, edge + 12 * n1(x * 0.02, SEED + 8) + 4 * n1(x * 0.09, SEED + 9));
      return Math.min(994, rid);
    };
    const nearY = (x) => {
      const edge = 1004 - 150 * Math.exp(-Math.pow((x + 20) / 150, 2)) - 120 * Math.exp(-Math.pow((x - 1100) / 160, 2));
      const bumps = 24 + 22 * Math.abs(n1(x * 0.012, SEED + 4)) + 5 * n1(x * 0.06, SEED + 5);
      return Math.min(998, Math.max(lim(x) + bumps, edge + 8 * n1(x * 0.03, SEED + 10)));
    };
    g.far = [];
    g.near = [];
    for (let x = -10; x <= 1090; x += 5) {
      g.far.push([x, farY(x)]);
      g.near.push([x, nearY(x)]);
    }
    g.farY = farY;
    g.nearY = nearY;
    g.farPoly = g.far.concat([[1090, 1004], [-10, 1004]]);
    g.nearPoly = g.near.concat([[1090, 1004], [-10, 1004]]);
    // snow: above a wavy snow line on the far range, plus streaks down the gullies
    const snowLine = (x) => 840 + 18 * n1(x * 0.02, SEED + 6);
    const snow = [];
    let run = null;
    for (const p of g.far) {
      const sl = snowLine(p[0]);
      if (p[1] < sl - 3) {
        if (!run) run = [];
        run.push(p);
      } else if (run) {
        snow.push(run);
        run = null;
      }
    }
    if (run) snow.push(run);
    g.snow = snow.filter((r) => r.length > 2).map((r) => {
      const bot = r.slice().reverse().map((p) => [p[0], Math.max(p[1] + 4, snowLine(p[0]) + 6 * n1(p[0] * 0.09, SEED + 7))]);
      return r.concat(bot);
    });
    const rs = L.rng(sd(L, 'streaks'));
    g.streaks = [];
    for (let i = 0; i < 46; i++) {
      const x = rs() < 0.5 ? rs.range(-10, 330) : rs.range(760, 1090);
      const top = farY(x) + rs.range(4, 30);
      const len = rs.range(18, 70);
      const slope = (farY(x + 4) - farY(x - 4)) / 8;
      const dir = slope > 0 ? 1 : -1;
      const pts = [];
      for (let k = 0; k <= 4; k++) pts.push([x + dir * k * len * 0.12 + rs.range(-1.5, 1.5), top + (k / 4) * len]);
      if (top + len < 990) g.streaks.push({ pts, w: rs.range(1.6, 3.6) });
    }
    g.nearStreaks = [];
    for (let i = 0; i < 14; i++) {
      const x = rs() < 0.5 ? rs.range(0, 300) : rs.range(780, 1080);
      const top = nearY(x) + rs.range(3, 12);
      const len = rs.range(8, 22);
      if (top + len < 996) g.nearStreaks.push([[x, top], [x + rs.range(-4, 4), top + len * 0.5], [x + rs.range(-6, 6), top + len]]);
    }
    // moss patches on the near hills
    g.moss = [];
    for (let i = 0; i < 26; i++) {
      const x = rs.range(-20, 1100);
      const top = nearY(x);
      if (top > 994) continue;
      const w = rs.range(30, 90), h = rs.range(6, 16);
      const y = top + rs.range(4, Math.max(5, 998 - top - h));
      const pts = [];
      for (let k = 0; k < 14; k++) {
        const a = (k / 14) * TAU;
        pts.push([x + Math.cos(a) * w * 0.5 * (0.8 + 0.3 * rs()), Math.max(nearY(x + Math.cos(a) * w * 0.5) + 2, y + Math.sin(a) * h * 0.5 * (0.8 + 0.3 * rs()))]);
      }
      g.moss.push(pts);
    }

    // ---- sea: ice floes ----
    const rf = L.rng(sd(L, 'floes'));
    g.floes = [];
    const FLOES = [[140, 1060, 70], [330, 1030, 40], [760, 1048, 56], [930, 1110, 90], [620, 1150, 46], [90, 1230, 120], [990, 1300, 80], [250, 1340, 60]];
    for (const [x, y, w] of FLOES) {
      const h = w * lerp(0.16, 0.26, (y - 1000) / 400);
      const n = 9;
      const top = [];
      for (let k = 0; k < n; k++) {
        const a = Math.PI + (k / (n - 1)) * Math.PI;
        top.push([x + Math.cos(a) * w * 0.5 * rf.range(0.85, 1.05), y + Math.sin(a) * h * 0.5 * rf.range(0.7, 1.15)]);
      }
      const side = h * rf.range(0.35, 0.6);
      const poly = top.concat([[x + w * 0.5, y + side], [x + w * 0.2, y + side * 1.15], [x - w * 0.3, y + side], [x - w * 0.5, y + side * 0.6]]);
      g.floes.push({ x, y, w, h, top, poly, side });
    }

    // ---- glitter dashes: a fixed pattern in a unit column, placed under the sun ----
    const rg = L.rng(sd(L, 'glitter'));
    g.glitter = [];
    for (let i = 0; i < 150; i++) {
      const v = Math.pow(rg(), 1.25); // 0 far (horizon) .. 1 near (shore)
      g.glitter.push({ v, u: rg.gauss() * 0.42, len: rg.range(0.5, 1.4), k: rg(), sunCol: rg() < 0.28 });
    }

    // ---- beach and boulder ----
    g.shore = [];
    for (let x = -10; x <= 1090; x += 8) g.shore.push([x, SHORE + 6 * n1(x * 0.01, SEED + 11) + 2 * n1(x * 0.05, SEED + 12)]);
    g.beachPoly = g.shore.concat([[1090, 1930], [-10, 1930]]);
    const bRaw = [[300, 1488], [288, 1440], [302, 1386], [336, 1342], [392, 1312], [470, 1298], [560, 1296], [650, 1304], [724, 1330], [778, 1372], [804, 1428], [806, 1480], [778, 1516], [680, 1530], [540, 1534], [400, 1528], [326, 1512]];
    g.boulder = L.smoothPts(bRaw, true, 5);
    // the boulder as it lands on screen (scaled about the feet), for clipping and pebble layering
    g.boulderS = g.boulder.map((p) => [FX + (p[0] - FX) * BS, FY + (p[1] - FY) * BS]);
    g.boulderTop = L.smoothPts([[330, 1348], [392, 1316], [470, 1302], [560, 1300], [650, 1308], [724, 1334], [770, 1366]], false, 5);
    // top face (lighter band) of the boulder
    g.boulderFace = g.boulderTop.concat(L.smoothPts([[770, 1366], [700, 1352], [600, 1338], [480, 1340], [380, 1352], [330, 1348]], false, 6));
    // cracks, lichen crusts, moss and guano
    const rb = L.rng(sd(L, 'boulder'));
    g.cracks = [
      [[612, 1340], [626, 1376], [620, 1410], [640, 1452], [636, 1490]],
      [[420, 1352], [410, 1392], [424, 1430]],
      [[720, 1380], [740, 1420], [736, 1470], [760, 1500]],
      [[352, 1420], [372, 1456], [366, 1500]],
    ];
    g.lichen = [];
    const LICHEN = [[372, 1378, 34], [462, 1330, 22], [512, 1420, 28], [700, 1356, 26], [330, 1460, 20], [596, 1480, 30], [760, 1460, 18]];
    for (const [x, y, r] of LICHEN) {
      const pts = [];
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * TAU;
        const rr = r * (0.65 + 0.5 * rb()) ;
        pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.62]);
      }
      g.lichen.push({ x, y, r, pts });
    }
    g.guano = [];
    for (let i = 0; i < 5; i++) {
      const x = rb.range(430, 680);
      const y0 = 1302 + rb.range(0, 6) + (Math.abs(x - 560) / 120) * 6;
      g.guano.push({ x, y0, len: rb.range(10, 34), w: rb.range(1.6, 3.2) });
    }
    g.mossTufts = [];
    for (let i = 0; i < 16; i++) {
      const x = rb.range(310, 790);
      const y = 1510 + (Math.abs(x - 550) / 250) * -12 + rb.range(-6, 10);
      g.mossTufts.push({ x, y, w: rb.range(20, 44), h: rb.range(8, 16) });
    }
    // pebbles: rows in perspective, small near the waterline, large at the bottom edge
    const rp = L.rng(sd(L, 'pebbles'));
    g.pebbles = [];
    let y = SHORE + 6;
    while (y < 1950) {
      const f = clamp((y - SHORE) / 520);
      const s = lerp(4.5, 40, Math.pow(f, 1.15));
      let x = -20 + rp() * s * 2;
      while (x < 1100) {
        const rx = s * rp.range(0.7, 1.25);
        const ry = rx * lerp(0.42, 0.7, f) * rp.range(0.8, 1.15);
        const py = y + rp.range(-0.3, 0.3) * s;
        const tone = rp();
        const col = tone < 0.4 ? 'shingle' : tone < 0.72 ? 'shinglePale' : tone < 0.88 ? 'shingleDeep' : tone < 0.96 ? 'tan' : 'mantleDeep';
        g.pebbles.push({ x, y: py, rx, ry, rot: rp.range(-0.35, 0.35), col, s, seed: (rp() * 1e6) | 0, lichen: s > 16 && rp() < 0.12 });
        x += rx * 2 * rp.range(0.95, 1.4);
      }
      y += s * rp.range(0.9, 1.2);
    }
    g.pebbles.sort((a, b) => a.y - b.y);

    // ---- distant colony terns ----
    g.terns = [
      { x: 860, y: 900, s: 1, ph: 0, vx: -9 },
      { x: 905, y: 935, s: 0.8, ph: 3, vx: -11 },
      { x: 180, y: 930, s: 0.9, ph: 5, vx: 8 },
      // higher and nearer, crossing the upper sky
      { x: 640, y: 330, s: 1.5, ph: 1, vx: -12 },
      { x: 720, y: 392, s: 1.15, ph: 2, vx: -13 },
      { x: 360, y: 486, s: 1.3, ph: 0, vx: 10 },
      { x: 880, y: 250, s: 0.95, ph: 3, vx: -9 },
    ];

    GEO = g;
    return g;
  }

  // ---------------------------------------------------------------------------
  // background paint
  // ---------------------------------------------------------------------------

  function paintHills(gc, L, P, g, v) {
    const bo = { boil: v };
    // far range: pale and cool with distance
    gc.save();
    gc.beginPath();
    L.tracePath(gc, g.farPoly, true);
    gc.fillStyle = P.iceShade;
    gc.fill();
    gc.restore();
    for (const s of g.snow) L.inkPath(gc, s, Object.assign({ closed: true, fill: P.ice, width: 1.2, color: P.iceDeep, alpha: 0.6, seed: SEED + 30 + s.length }, bo));
    // shadow slopes (facing lower right) take 45 degree hatching; lit slopes stay flat
    const slopeAt = (x) => (g.farY(x + 6) - g.farY(x - 6)) / 12;
    L.hatch(gc, g.farPoly, {
      spacing: 6, width: 1.2, color: P.iceDeep, alpha: 0.85, seed: SEED + 40, length: [8, 30], boil: v,
      density: (x, y) => {
        const top = g.farY(x);
        const depth = y - top;
        const sl = slopeAt(x);
        return (sstep(0.05, 0.6, sl) * 0.9 + 0.15) * (1 - sstep(60, 150, depth)) + 0.12 * sstep(930, 990, y);
      },
    });
    // gully lines down the fall line on the shadow slopes
    L.hatch(gc, g.farPoly, {
      angle: -1.25, spacing: 16, width: 1.1, color: P.iceDeep, alpha: 0.6, seed: SEED + 41, length: [10, 40], boil: v,
      density: (x, y) => 0.55 * sstep(0.2, 0.8, slopeAt(x)) * (1 - sstep(20, 110, y - g.farY(x))),
    });
    g.streaks.forEach((s, i) => L.inkPath(gc, s.pts, { width: s.w, color: P.ice, seed: SEED + 50 + i, taper: [3, 10], wobble: 0.5, boil: v }));
    L.inkPath(gc, g.far, { width: 2, color: P.inkSoft, alpha: 0.75, seed: SEED + 60, taper: [0, 0], boil: v });

    // near hills: moss and bare rock
    gc.save();
    gc.beginPath();
    L.tracePath(gc, g.nearPoly, true);
    gc.fillStyle = P.shingle;
    gc.fill();
    gc.clip();
    for (let i = 0; i < g.moss.length; i++) {
      gc.beginPath();
      L.tracePath(gc, g.moss[i], true);
      gc.fillStyle = i % 3 === 0 ? P.mossDeep : P.moss;
      gc.globalAlpha = 0.85;
      gc.fill();
    }
    gc.restore();
    const nSlope = (x) => (g.nearY(x + 6) - g.nearY(x - 6)) / 12;
    L.hatch(gc, g.nearPoly, {
      spacing: 5, width: 1.2, color: P.mossDeep, alpha: 0.85, seed: SEED + 70, length: [8, 26], boil: v,
      density: (x, y) => 0.25 + 0.6 * sstep(0.02, 0.4, nSlope(x)) + 0.3 * sstep(985, 1000, y),
    });
    L.stipple(gc, g.nearPoly, { spacing: 6, r: [0.8, 1.5], color: P.inkSoft, alpha: 0.5, seed: SEED + 71, density: 0.35, boil: v });
    g.nearStreaks.forEach((s, i) => L.inkPath(gc, s, { width: 2.2, color: P.ice, seed: SEED + 80 + i, taper: [2, 6], wobble: 0.3, boil: v }));
    L.inkPath(gc, g.near, { width: 2.6, color: P.inkSoft, seed: SEED + 90, taper: [0, 0], boil: v });
    // the far shore's waterline
    L.inkLine(gc, -10, HORIZON + 1, 1090, HORIZON + 1, { width: 2, color: P.inkSoft, alpha: 0.9, seed: SEED + 91, wobble: 1, boil: v });
  }

  function paintSea(gc, L, P, g, v) {
    gc.fillStyle = P.sea;
    gc.fillRect(-10, HORIZON, 1100, SHORE - HORIZON + 30);
    const box = [[-10, HORIZON + 2], [1090, HORIZON + 2], [1090, SHORE + 20], [-10, SHORE + 20]];
    // engraved horizontal hatching: dense at the far shore, parallel to the coast near the beach
    L.hatch(gc, box, {
      angle: 0, spacing: 6, width: 1.3, color: P.seaDeep, alpha: 0.9, seed: SEED + 100, length: [24, 110], gap: [4, 16], flow: 0.01, bow: 0.4, boil: v,
      density: (x, y) => clamp(0.28 + 0.6 * Math.exp(-(y - HORIZON) / 70) + 0.45 * Math.exp(-(SHORE - y) / 45) + 0.12 * L.noise2(x * 0.004, y * 0.02, SEED + 101)),
    });
    // mirrored hills: short broken strokes right under the far shore
    L.hatch(gc, [[-10, HORIZON + 2], [1090, HORIZON + 2], [1090, HORIZON + 34], [-10, HORIZON + 34]], {
      angle: 0, spacing: 4, width: 1.1, color: P.iceDeep, alpha: 0.7, seed: SEED + 102, length: [6, 22], gap: [5, 14], boil: v,
      density: (x, y) => 0.8 * (1 - sstep(HORIZON + 4, HORIZON + 30, y)) * sstep(0, 0.35, (1000 - g.farY(x)) / 250),
    });
    // floes
    g.floes.forEach((f, i) => {
      L.inkPath(gc, f.poly, { closed: true, fill: P.iceShade, width: 1.8, color: P.ink, seed: SEED + 110 + i, boil: v, taper: [4, 8] });
      const topPoly = f.top.concat([[f.x + f.w * 0.5, f.y + 1]]).concat([[f.x - f.w * 0.5, f.y + 1]]);
      gc.beginPath();
      L.tracePath(gc, f.top, true);
      gc.fillStyle = P.ice;
      gc.fill();
      L.hatch(gc, f.poly, { spacing: 4, width: 1, color: P.iceDeep, alpha: 0.8, seed: SEED + 120 + i, length: [4, 14], boil: v, density: (x, y) => sstep(f.y - 1, f.y + f.side * 0.8, y) * 0.9 + sstep(f.x, f.x + f.w * 0.5, x) * 0.2 });
      L.inkPath(gc, f.top, { width: 1.3, color: P.ink, alpha: 0.7, seed: SEED + 130 + i, boil: v, taper: [3, 3] });
      void topPoly;
      // the floe's reflection
      L.inkLine(gc, f.x - f.w * 0.45, f.y + f.side + 5, f.x + f.w * 0.4, f.y + f.side + 5, { width: 1.4, color: P.foam, alpha: 0.8, seed: SEED + 140 + i, boil: v, taper: [4, 6] });
    });
  }

  function paintBeach(gc, L, P, g, v) {
    const bo = { boil: v };
    gc.save();
    gc.beginPath();
    L.tracePath(gc, g.beachPoly, true);
    gc.fillStyle = P.shinglePale;
    gc.fill();
    gc.clip();
    // wet band at the waterline
    gc.fillStyle = P.shingle;
    gc.fillRect(-10, SHORE - 20, 1100, 44);
    gc.restore();
    L.hatch(gc, g.beachPoly, {
      angle: 0, spacing: 5, width: 1.1, color: P.shingleDeep, alpha: 0.7, seed: SEED + 150, length: [14, 50], boil: v,
      density: (x, y) => 0.7 * (1 - sstep(SHORE, SHORE + 26, y)),
    });
    L.stipple(gc, g.beachPoly, { spacing: 7, r: [0.8, 1.8], color: P.inkSoft, alpha: 0.55, seed: SEED + 151, boil: v, density: (x, y) => 0.25 + 0.3 * sstep(SHORE, 1900, y) });
    L.inkPath(gc, g.shore, { width: 2, color: P.inkSoft, seed: SEED + 152, taper: [0, 0], boil: v });

    const bx0 = FX + (300 - FX) * BS, bx1 = FX + (806 - FX) * BS;
    const by1 = FY + (1534 - FY) * BS;
    const behind = (p) => !(p.x > bx0 - 10 && p.x < bx1 + 10 && p.y > 1300 && p.y < by1 - 14);
    const front = (p) => p.y >= by1 - 34 && p.x > bx0 - 30 && p.x < bx1 + 30;
    const drawPebble = (p) => {
      const pts = L.ellipsePts(p.x, p.y, p.rx, p.ry, p.s > 14 ? 20 : 10, p.rot);
      // cast shadow down and to the right
      gc.beginPath();
      gc.ellipse(p.x + p.rx * 0.18, p.y + p.ry * 0.35, p.rx * 1.02, p.ry * 0.95, p.rot, 0, TAU);
      gc.fillStyle = P.shingleDeep;
      gc.globalAlpha = 0.75;
      gc.fill();
      gc.globalAlpha = 1;
      if (p.s > 11) {
        L.inkPath(gc, pts, { closed: true, fill: P[p.col], width: lerp(1.3, 2.6, clamp((p.s - 11) / 30)), seed: p.seed, wobble: 0.6, tremble: 0.25, taper: [3, 6], boil: v });
        L.hatch(gc, pts, {
          spacing: lerp(3.5, 5, clamp(p.s / 40)), width: 1.1, color: P.ink, alpha: 0.6, seed: p.seed + 1, length: [4, 20], boil: v,
          density: (x, y) => sstep(-0.15, 0.6, ((x - p.x) / p.rx) * 0.55 + ((y - p.y) / p.ry) * 0.85),
        });
        if (p.lichen) {
          gc.beginPath();
          gc.ellipse(p.x - p.rx * 0.25, p.y - p.ry * 0.25, p.rx * 0.35, p.ry * 0.3, p.rot, 0, TAU);
          gc.fillStyle = P.lichen;
          gc.fill();
        }
        // lit rim on the upper left
        gc.beginPath();
        gc.ellipse(p.x, p.y, p.rx * 0.72, p.ry * 0.6, p.rot, Math.PI * 1.05, Math.PI * 1.45);
        gc.strokeStyle = P.white;
        gc.globalAlpha = 0.6;
        gc.lineWidth = Math.max(1, p.s * 0.08);
        gc.stroke();
        gc.globalAlpha = 1;
      } else {
        gc.beginPath();
        gc.ellipse(p.x, p.y, p.rx, p.ry, p.rot, 0, TAU);
        gc.fillStyle = P[p.col];
        gc.fill();
        gc.strokeStyle = P.inkSoft;
        gc.lineWidth = 0.9 + p.s * 0.06;
        gc.stroke();
        gc.beginPath();
        gc.ellipse(p.x + p.rx * 0.2, p.y + p.ry * 0.25, p.rx * 0.6, p.ry * 0.5, p.rot, -0.2, Math.PI * 0.9);
        gc.strokeStyle = P.ink;
        gc.globalAlpha = 0.5;
        gc.stroke();
        gc.globalAlpha = 1;
      }
    };
    for (const p of g.pebbles) if (behind(p) && !front(p)) drawPebble(p);

    // ---- the boulder (drawn 1.25x about the feet) ----
    gc.save();
    gc.translate(FX, FY);
    gc.scale(BS, BS);
    gc.translate(-FX, -FY);
    L.inkPath(gc, g.boulder, { closed: true, fill: P.shingle, width: 3.4, seed: SEED + 160, double: { alpha: 0.35 }, boil: v });
    gc.save();
    gc.beginPath();
    L.tracePath(gc, g.boulder, true);
    gc.clip();
    gc.beginPath();
    L.tracePath(gc, g.boulderFace, true);
    gc.fillStyle = P.shinglePale;
    gc.fill();
    // lit upper-left flank
    gc.beginPath();
    gc.ellipse(430, 1380, 120, 60, -0.3, 0, TAU);
    gc.fillStyle = P.shinglePale;
    gc.globalAlpha = 0.8;
    gc.fill();
    gc.globalAlpha = 1;
    gc.restore();
    const bc = (x, y) => ((x - 520) / 260) * 0.55 + ((y - 1380) / 130) * 0.85;
    L.crossHatch(gc, g.boulder, {
      tone: 1, layers: 3, spacing: 5.5, width: 1.3, color: P.ink, alpha: 0.75, seed: SEED + 161, length: [10, 40], boil: v,
      density: (x, y) => clamp(sstep(-0.35, 1.05, bc(x, y)) * 0.85 + 0.12),
    });
    // mineral grain of the granite
    L.stipple(gc, g.boulder, { spacing: 6.5, r: [0.9, 2], color: P.inkSoft, alpha: 0.75, seed: SEED + 162, boil: v, density: (x, y) => 0.35 + 0.3 * sstep(-0.5, 1, bc(x, y)) });
    L.stipple(gc, g.boulder, { spacing: 11, r: [1.2, 2.2], color: P.white, alpha: 0.7, seed: SEED + 163, boil: v, density: (x, y) => 0.5 * (1 - sstep(-0.4, 0.4, bc(x, y))) });
    g.lichen.forEach((l, i) => {
      L.inkPath(gc, l.pts, Object.assign({ closed: true, fill: P.lichen, width: 1.3, color: P.ochre, seed: SEED + 170 + i, wobble: 1.2, taper: [3, 6] }, bo));
      L.stipple(gc, l.pts, { spacing: 4.5, r: [0.8, 1.6], color: P.ochre, alpha: 0.9, seed: SEED + 180 + i, boil: v, density: 0.6 });
      L.stipple(gc, l.pts, { spacing: 9, r: [1, 1.8], color: P.ink, alpha: 0.6, seed: SEED + 190 + i, boil: v, density: 0.5 });
    });
    g.cracks.forEach((c, i) => {
      L.inkPath(gc, c, Object.assign({ width: 2.2, color: P.ink, seed: SEED + 200 + i, taper: [4, 14] }, bo));
      L.inkPath(gc, c.map((p) => [p[0] + 3, p[1] + 1]), Object.assign({ width: 1.3, color: P.white, alpha: 0.55, seed: SEED + 210 + i, taper: [4, 14] }, bo));
    });
    g.guano.forEach((q, i) => {
      L.inkPath(gc, [[q.x, q.y0], [q.x + 1.5, q.y0 + q.len * 0.5], [q.x - 1, q.y0 + q.len]], Object.assign({ width: q.w, color: P.plumeWhite, alpha: 0.9, seed: SEED + 220 + i, taper: [2, 10], swell: 0.5 }, bo));
    });
    L.inkPath(gc, g.boulderTop, Object.assign({ width: 3.4, seed: SEED + 230 }, bo));
    // moss tufts at the foot
    g.mossTufts.forEach((m, i) => {
      const pts = [];
      for (let k = 0; k <= 8; k++) {
        const a = Math.PI + (k / 8) * Math.PI;
        pts.push([m.x + Math.cos(a) * m.w * 0.5, m.y + Math.sin(a) * m.h * (0.7 + 0.35 * ((k * 7 + i) % 3) / 2)]);
      }
      L.inkPath(gc, pts, Object.assign({ closed: true, fill: i % 3 ? P.moss : P.mossDeep, width: 1.4, color: P.mossDeep, seed: SEED + 240 + i, taper: [3, 5] }, bo));
      L.hatch(gc, pts, { spacing: 3.5, width: 1, color: P.mossDeep, alpha: 0.9, seed: SEED + 260 + i, angle: -1.3, length: [3, 10], boil: v, density: 0.7 });
    });
    gc.restore();
    for (const p of g.pebbles) if (front(p)) drawPebble(p);
  }

  // ---------------------------------------------------------------------------
  // the juvenile
  // ---------------------------------------------------------------------------

  // silhouette of body and head in bird space (feet at 0,0, facing +x). h = 1 marks head points.
  const SIL = [
    [148, -181, 1], [140, -193, 1], [125, -198, 1], [108, -193, 1], [97, -180, 1], [92, -162, 0.7],
    [88, -148, 0.2], [60, -143, 0], [0, -141, 0], [-60, -133, 0], [-108, -117, 0], [-140, -99, 0],
    [-138, -70, 0], [-102, -48, 0], [-50, -30, 0], [0, -20, 0], [44, -22, 0], [86, -40, 0],
    [108, -74, 0], [114, -108, 0.1], [118, -136, 0.5], [131, -152, 1], [148, -160, 1],
  ];
  const MANTLE_LOW = [[-124, -104], [-60, -112], [0, -114], [60, -118], [92, -134]];
  const TAIL = [[-134, -101], [-196, -106], [-254, -110], [-214, -89], [-262, -74], [-200, -70], [-136, -66]];
  const EYE = [128, -172];
  const BILL = [[147, -175], [170, -170], [191, -163], [170, -163], [148, -157]];
  const CROWN = [[124, -188], [131, -196], [118, -199], [104, -194], [95, -181], [92, -164], [104, -162], [114, -167]];

  // wing poses in bird space: shoulder s, wrist wr, tip tp, chord direction c (leading to trailing edge),
  // chord widths at the shoulder, wrist and the widest part of the hand, and how open the wing is
  const POSE = {
    FOLD: { s: [62, -128], wr: [86, -110], tp: [-238, -94], c: [0.05, 1], wS: 8, wW: 26, wM: 56, open: 0 },
    LIFT: { s: [62, -130], wr: [74, -136], tp: [-222, -158], c: [0.12, 1], wS: 20, wW: 42, wM: 70, open: 0.15 },
    READY: { s: [60, -131], wr: [84, -160], tp: [-196, -236], c: [0.2, 1], wS: 26, wW: 50, wM: 76, open: 0.3 },
    HALF: { s: [58, -132], wr: [4, -212], tp: [-296, -362], c: [-0.45, 0.89], wS: 76, wW: 90, wM: 84, open: 0.65 },
    UP: { s: [56, -134], wr: [22, -272], tp: [-118, -588], c: [-0.9, 0.44], wS: 86, wW: 95, wM: 88, open: 1 },
    DOWN: { s: [58, -126], wr: [30, -66], tp: [-236, 110], c: [-0.96, -0.28], wS: 34, wW: 70, wM: 74, open: 0.7 },
  };
  function mixPose(A, B, k) {
    const m = (a, b) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
    const c = m(A.c, B.c);
    const cl = Math.hypot(c[0], c[1]) || 1;
    return { s: m(A.s, B.s), wr: m(A.wr, B.wr), tp: m(A.tp, B.tp), c: [c[0] / cl, c[1] / cl], wS: lerp(A.wS, B.wS, k), wW: lerp(A.wW, B.wW, k), wM: lerp(A.wM, B.wM, k), open: lerp(A.open, B.open, k) };
  }

  // one drawing per 1/12 s. by: body lift (px, negative up), tilt (rad, + = nose down), sq: squash,
  // hx/hy head offset, down: this drawing is a downstroke (motion arcs)
  function birdState(t) {
    const d = Math.floor(t * 12 + 1e-6);
    const st = { pose: POSE.FOLD, by: 0, tilt: -0.03, sq: 1, hx: 0, hy: 0, down: false, hop: false, d };
    const idleHead = [[0, 0], [0, 0], [1, -2], [1, -2], [0, 0], [-1, 1]];
    if (d < 6) {
      // idle, looking up at the sun
      const hh = idleHead[d % 6];
      st.hx = hh[0];
      st.hy = hh[1] - 2;
    } else if (d < 12) {
      // T 13.5: small practice flaps
      const seq = [
        [mixPose(POSE.FOLD, POSE.HALF, 0.55), -2, -0.05, false],
        [mixPose(POSE.FOLD, POSE.DOWN, 0.5), -5, 0, true],
        [mixPose(POSE.FOLD, POSE.HALF, 0.6), -2, -0.05, false],
        [mixPose(POSE.FOLD, POSE.DOWN, 0.45), -4, 0, true],
        [POSE.LIFT, 0, -0.03, false],
        [POSE.FOLD, 0, -0.03, false],
      ][d - 6];
      st.pose = seq[0];
      st.by = seq[1];
      st.tilt = seq[2];
      st.down = seq[3];
      st.hy = -1;
    } else if (d < 18) {
      const hh = idleHead[(d + 3) % 6];
      st.hx = hh[0] + 2;
      st.hy = hh[1];
      if (d === 17) st.pose = POSE.LIFT;
    } else if (d < 30) {
      // T 14.5: full practice flaps, the body bouncing with each downstroke
      const seq = [
        [POSE.UP, 2, -0.1, false], [POSE.HALF, -3, -0.06, false], [POSE.DOWN, -8, 0.02, true],
        [POSE.UP, 1, -0.1, false], [POSE.HALF, -4, -0.06, false], [POSE.DOWN, -9, 0.02, true],
        [POSE.UP, 1, -0.1, false], [POSE.HALF, -3, -0.06, false], [POSE.DOWN, -7, 0.02, true],
        [POSE.LIFT, -1, -0.03, false], [POSE.FOLD, 0, -0.02, false], [POSE.FOLD, 3, 0.04, false],
      ][d - 18];
      st.pose = seq[0];
      st.by = seq[1];
      st.tilt = seq[2];
      st.down = seq[3];
      st.hy = -2;
      if (d === 29) {
        // anticipation before the hop
        st.sq = 0.94;
        st.hy = 4;
      }
    } else if (d < 33) {
      // T 15.5: the hop, 20 px up and down
      const seq = [
        [POSE.UP, -20, -0.08, false, 1.04], [POSE.DOWN, -20, 0, true, 1.02], [mixPose(POSE.HALF, POSE.READY, 0.5), -6, 0.04, false, 1],
      ][d - 30];
      st.pose = seq[0];
      st.by = seq[1];
      st.tilt = seq[2];
      st.down = seq[3];
      st.sq = seq[4];
      st.hop = seq[1] < -10;
      st.hy = -2;
    } else {
      // T 15.75: crouched, wings slightly lifted, ready
      st.pose = POSE.READY;
      st.by = 0;
      st.tilt = 0.13;
      st.sq = 0.9;
      st.hx = 8;
      st.hy = 6;
    }
    return st;
  }

  // wing outline from a pose: leading edge shoulder -> wrist -> tip, trailing edge back to the root
  function wingShape(W) {
    const s = W.s, wr = W.wr, tp = W.tp, c = W.c;
    const lead = [];
    const trail = [];
    const hd = [tp[0] - wr[0], tp[1] - wr[1]];
    const hl = Math.hypot(hd[0], hd[1]) || 1;
    const dh = [hd[0] / hl, hd[1] / hl];
    // arm
    for (let k = 0; k <= 5; k++) {
      const v = k / 5;
      const p = [lerp(s[0], wr[0], v), lerp(s[1], wr[1], v)];
      const w = lerp(W.wS, W.wW, v);
      lead.push(p);
      trail.push([p[0] + c[0] * w, p[1] + c[1] * w]);
    }
    // hand: slight forward bow of the leading edge
    const bow = 0.06 * hl;
    const hand = [];
    for (let k = 1; k <= 16; k++) {
      const u = k / 16;
      const b = Math.sin(Math.PI * u) * bow * (1 - u * 0.5);
      const p = [lerp(wr[0], tp[0], u) - c[0] * b, lerp(wr[1], tp[1], u) - c[1] * b];
      const w = u < 0.3 ? lerp(W.wW, W.wM, u / 0.3) : W.wM * (1 - Math.pow((u - 0.3) / 0.7, 1.7));
      lead.push(p);
      hand.push({ p, u, w });
      trail.push([p[0] + (c[0] * 0.95 + dh[0] * 0.32) * w, p[1] + (c[1] * 0.95 + dh[1] * 0.32) * w]);
    }
    const outline = lead.concat(trail.slice(0, trail.length - 1).reverse());
    const leadAt = (u) => {
      // u over the whole leading edge: 0..0.3 arm, 0.3..1 hand
      if (u <= 0.3) {
        const v = u / 0.3;
        return [lerp(s[0], wr[0], v), lerp(s[1], wr[1], v)];
      }
      const uh = (u - 0.3) / 0.7;
      const b = Math.sin(Math.PI * uh) * bow * (1 - uh * 0.5);
      return [lerp(wr[0], tp[0], uh) - c[0] * b, lerp(wr[1], tp[1], uh) - c[1] * b];
    };
    return { lead, trail, outline, hand, dh, leadAt };
  }

  // a feather as a closed polygon from base b to tip e: pointed (primaries) or blunt (secondaries)
  function featherPts(b, e, w0, pointed, bend) {
    const dx = e[0] - b[0], dy = e[1] - b[1];
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
    const L1 = [], R1 = [];
    const N = 12;
    for (let k = 0; k <= N; k++) {
      const s = k / N;
      let hw;
      if (pointed) hw = w0 * Math.sin(Math.min(1, s * 5) * Math.PI / 2) * (1 - Math.pow(s, 2.6));
      else hw = w0 * Math.sin(Math.min(1, s * 5) * Math.PI / 2) * (s < 0.8 ? 1 : Math.sqrt(Math.max(0, 1 - Math.pow((s - 0.8) / 0.2, 2))));
      const off = bend * Math.sin(Math.PI * s);
      const cx = b[0] + dx * s + nx * off, cy = b[1] + dy * s + ny * off;
      // the outer vane is narrow, the inner vane broad (asymmetric flight feather)
      L1.push([cx + nx * hw * 0.55, cy + ny * hw * 0.55]);
      R1.push([cx - nx * hw * 1.1, cy - ny * hw * 1.1]);
    }
    return L1.concat(R1.reverse());
  }

  function polyPath(path, pts) {
    path.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) path.lineTo(pts[i][0], pts[i][1]);
    path.closePath();
  }

  function drawWing(ctx, L, P, W, far, seed) {
    const ws = wingShape(W);
    const c = W.c;
    const dh = ws.dh;
    const bi = L.boil(L.T);
    const jit = (i, k) => (L.h3(i, bi, seed + k) - 0.5) * 1.2;
    const all = new Path2D();
    const edges = new Path2D();
    const rachis = new Path2D();
    const base = far ? P.mantleDeep : P.mantleGrey;
    const dark = far ? P.carpalBar : L.mix(P.mantleGrey, P.carpalBar, 0.55);
    const openK = clamp(W.open * 1.4);
    // primaries P1 (inner) .. P10 (outer): bases along the hand, tips along the trailing edge;
    // drawn outer first so the inner feathers lie over them (seen from above)
    const nH = ws.hand.length;
    const trailHand = (u) => {
      const idx = clamp(u) * (nH - 1);
      const i0 = Math.floor(idx), i1 = Math.min(nH - 1, i0 + 1), f = idx - i0;
      const a = ws.trail[6 + i0], b = ws.trail[6 + i1];
      return [lerp(a[0], b[0], f), lerp(a[1], b[1], f)];
    };
    const prims = [];
    for (let i = 9; i >= 0; i--) {
      const f = i / 9;
      const ub = 0.3 + 0.7 * lerp(0.02, 0.42, f);
      const b0 = ws.leadAt(ub);
      const bw = lerp(W.wW, W.wM, 0.5) * 0.3;
      const b = [b0[0] + c[0] * bw, b0[1] + c[1] * bw];
      // folded: tips stack close to the wingtip; open: they spread along the trailing edge
      const ut = lerp(lerp(0.78, 0.97, f), lerp(0.18, 1, Math.pow(f, 0.85)), openK);
      const e = i === 9 ? ws.lead[ws.lead.length - 1] : trailHand(ut);
      const ee = [e[0] + jit(i, 1), e[1] + jit(i, 2)];
      const len = Math.hypot(ee[0] - b[0], ee[1] - b[1]);
      const pts = featherPts(b, ee, Math.min(15, len * 0.09 + 5), true, lerp(2, -4, f));
      prims.push({ pts, b, e: ee, f });
    }
    for (const p of prims) {
      const path = new Path2D();
      polyPath(path, p.pts);
      polyPath(all, p.pts);
      ctx.fillStyle = p.f > 0.55 ? dark : base;
      ctx.fill(path);
      polyPath(edges, p.pts);
      rachis.moveTo(p.b[0], p.b[1]);
      rachis.lineTo(lerp(p.b[0], p.e[0], 0.93), lerp(p.b[1], p.e[1], 0.93));
    }
    // secondaries: 14 blunt feathers along the arm, from the body outward, white-tipped (juvenile)
    const secs = [];
    for (let j = 0; j < 14; j++) {
      const v = (j + 0.5) / 14;
      const u = v * 0.3 + 0.02;
      const p = ws.leadAt(u);
      const w = lerp(W.wS, W.wW, clamp(u / 0.3));
      const b = [p[0] + c[0] * w * 0.35, p[1] + c[1] * w * 0.35];
      const e = [p[0] + c[0] * w * 0.98 + dh[0] * 4 + jit(j, 3), p[1] + c[1] * w * 0.98 + dh[1] * 4 + jit(j, 4)];
      const len = Math.hypot(e[0] - b[0], e[1] - b[1]);
      secs.push({ pts: featherPts(b, e, Math.max(3, Math.min(10, len * 0.22)), false, 0), b, e });
    }
    ctx.fillStyle = base;
    for (const s of secs) {
      const path = new Path2D();
      polyPath(path, s.pts);
      polyPath(all, s.pts);
      polyPath(edges, s.pts);
      ctx.fill(path);
    }
    // white trailing edge of the secondaries (juvenile)
    L.inkPath(ctx, secs.map((q) => q.e), { width: far ? 2 : 4, color: P.plumeWhite, alpha: far ? 0.4 : 0.95, seed: seed + 2, taper: [4, 8], wobble: 0.6 });

    // coverts: the leading half of the wing over the feather bases
    const cov = [];
    const covW = (u) => (u < 0.3 ? lerp(W.wS, W.wW, u / 0.3) * 0.62 : lerp(W.wW * 0.62, 4, sstep(0.3, 0.72, u)));
    for (let k = 0; k <= 16; k++) cov.push(ws.leadAt((k / 16) * 0.72));
    for (let k = 16; k >= 0; k--) {
      const u = (k / 16) * 0.72;
      const p = ws.leadAt(u);
      const w = covW(u);
      cov.push([p[0] + c[0] * w, p[1] + c[1] * w]);
    }
    polyPath(all, cov);
    L.inkPath(ctx, cov, { closed: true, fill: base, width: 1.8, color: P.inkSoft, seed: seed + 1, taper: [4, 8] });
    if (!far) {
      // scaly juvFringe edges on the coverts, in rows
      ctx.save();
      ctx.beginPath();
      L.tracePath(ctx, cov, true);
      ctx.clip();
      const scale = new Path2D();
      const dots = new Path2D();
      const a = Math.atan2(c[1], c[0]);
      for (let row = 0; row < 3; row++) {
        const nK = 12 - row * 2;
        for (let k = 0; k < nK; k++) {
          const u = ((k + 0.5 + (row % 2) * 0.5) / nK) * 0.6;
          const p = ws.leadAt(u);
          const wv = covW(u);
          const off = ((row + 1) / 3.4) * wv;
          const x = p[0] + c[0] * off, y = p[1] + c[1] * off;
          const rr = Math.max(3, Math.min(9, wv * 0.3));
          scale.moveTo(x + Math.cos(a - 1.25) * rr, y + Math.sin(a - 1.25) * rr);
          scale.arc(x, y, rr, a - 1.25, a + 1.25);
          dots.moveTo(x - c[0] * rr * 0.2, y - c[1] * rr * 0.2);
          dots.lineTo(x + c[0] * rr * 0.4, y + c[1] * rr * 0.4);
        }
      }
      ctx.strokeStyle = P.juvFringe;
      ctx.lineWidth = 2.2;
      ctx.stroke(scale);
      ctx.strokeStyle = P.mantleDeep;
      ctx.lineWidth = 1.4;
      ctx.stroke(dots);
      ctx.restore();
    }

    // tone: 45 degree hatching on the whole wing, heavier toward the trailing edge and outer hand
    const span = Math.hypot(W.tp[0] - W.s[0], W.tp[1] - W.s[1]) || 1;
    const cx0 = (W.s[0] + W.wr[0]) / 2, cy0 = (W.s[1] + W.wr[1]) / 2;
    const B = L.bounds(ws.outline);
    L.hatch(ctx, all, {
      bounds: { x: B.x - 20, y: B.y - 20, w: B.w + 40, h: B.h + 40 },
      spacing: far ? 4.5 : 6, width: 1.25, color: far ? P.ink : P.mantleDeep, alpha: far ? 0.5 : 0.85, seed: seed + 3, length: [10, 30],
      density: (x, y) => {
        const along = ((x - W.s[0]) * dh[0] + (y - W.s[1]) * dh[1]) / span;
        const across = (x - cx0) * c[0] + (y - cy0) * c[1];
        return clamp(0.12 + 0.45 * sstep(0.5, 1, along) + 0.45 * sstep(0, 50, across));
      },
    });
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.strokeStyle = P.ink;
    ctx.globalAlpha *= far ? 0.5 : 0.75;
    ctx.lineWidth = 1.4;
    ctx.stroke(edges);
    ctx.strokeStyle = far ? P.ink : P.plumeWhite;
    ctx.globalAlpha = far ? 0.3 : 0.7;
    ctx.lineWidth = 1.2;
    ctx.stroke(rachis);
    ctx.restore();

    // dark carpal bar along the leading edge of the inner wing
    const armLen = Math.hypot(W.wr[0] - W.s[0], W.wr[1] - W.s[1]);
    const bar = [];
    for (let k = 0; k <= 10; k++) bar.push(ws.leadAt((k / 10) * 0.46));
    for (let k = 10; k >= 0; k--) {
      const u = (k / 10) * 0.46;
      const p = ws.leadAt(u);
      const w = 3 + Math.min(10, armLen * 0.09) * Math.sin(Math.PI * clamp(u / 0.46));
      bar.push([p[0] + c[0] * w, p[1] + c[1] * w]);
    }
    L.inkPath(ctx, bar, { closed: true, fill: P.carpalBar, width: 1.2, color: P.ink, alpha: 0.8, seed: seed + 5, taper: [4, 6] });
    // leading edge line
    L.inkPath(ctx, ws.lead, { width: far ? 3 : 5, color: P.ink, seed: seed + 9, taper: [6, 14] });
    return ws;
  }
  function drawBird(ctx, L, P, st) {
    const seed = sd(L, 'bird');
    const headW = (h) => h;
    const pts = SIL.map(([x, y, h]) => [x + st.hx * headW(h), y + st.hy * headW(h)]);
    const W = st.pose;
    ctx.save();
    ctx.translate(FX, FY + st.by);
    ctx.scale(BS, BS);
    ctx.rotate(st.tilt);
    ctx.scale(1, st.sq);

    // far wing, behind everything (only when raised)
    if (W.open > 0.25) {
      const k = 0.9;
      const off = [-30, -6];
      const F = {
        s: [W.s[0] + off[0], W.s[1] + off[1]],
        wr: [W.s[0] + off[0] + (W.wr[0] - W.s[0]) * k, W.s[1] + off[1] + (W.wr[1] - W.s[1]) * k],
        tp: [W.s[0] + off[0] + (W.tp[0] - W.s[0]) * k - 26, W.s[1] + off[1] + (W.tp[1] - W.s[1]) * k + 6],
        c: W.c, wS: W.wS * k, wW: W.wW * k, wM: W.wM * k, open: W.open,
      };
      drawWing(ctx, L, P, F, true, seed + 400);
    }

    // tail
    L.inkPath(ctx, TAIL, { closed: true, fill: P.plumeWhite, width: 4, seed: seed + 10, smooth: false, taper: [6, 10] });
    ctx.save();
    ctx.beginPath();
    L.tracePath(ctx, TAIL, true);
    ctx.clip();
    ctx.beginPath();
    L.tracePath(ctx, [[-134, -101], [-196, -106], [-254, -110], [-220, -92], [-136, -88]], true);
    ctx.fillStyle = P.mantleGrey;
    ctx.fill();
    ctx.restore();
    L.hatch(ctx, TAIL, { spacing: 5, width: 1.2, color: P.mantleDeep, alpha: 0.85, seed: seed + 11, length: [8, 24], angle: -Math.PI / 4, density: (x, y) => sstep(-92, -70, y) * 0.9 });
    for (let i = 0; i < 4; i++) {
      const y0 = -96 + i * 8;
      L.inkPath(ctx, [[-140, y0], [-190, y0 + 2 - i], [-226 + i * 4, y0 + 6 - i * 2]], { width: 1.5, color: P.inkSoft, alpha: 0.8, seed: seed + 12 + i, taper: [4, 8] });
    }

    // legs and feet: very short, black (juvenile)
    const legs = new Path2D();
    const leg = (x0, x1) => {
      legs.moveTo(x0 - 3, -26);
      legs.lineTo(x1 - 2.2, 0);
      legs.lineTo(x1 + 2.2, 0);
      legs.lineTo(x0 + 3, -26);
      legs.closePath();
      // webbed toes forward
      legs.moveTo(x1 - 3, -2);
      legs.lineTo(x1 + 22, -1);
      legs.lineTo(x1 + 24, 2);
      legs.lineTo(x1 + 10, 3);
      legs.lineTo(x1 - 6, 3);
      legs.closePath();
    };
    leg(18, 16);
    leg(44, 42);
    ctx.fillStyle = P.juvBill;
    ctx.fill(legs);

    // body and head silhouette
    L.inkPath(ctx, pts, { closed: true, fill: P.plumeWhite, width: 5, seed: seed + 20, taper: [10, 20] });
    ctx.save();
    ctx.beginPath();
    L.tracePath(ctx, pts, true);
    ctx.clip();
    // shadow side of the white plumage: flat plumeShade on the lower right
    ctx.beginPath();
    ctx.ellipse(10, -32, 150, 34, -0.04, 0, TAU);
    ctx.fillStyle = P.plumeShade;
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(118 + st.hx, -150 + st.hy, 14, 22, 0.5, 0, TAU);
    ctx.fill();
    // mantle: grey back with scaly juvFringe feathers
    const mantle = pts.filter((p, i) => i >= 6 && i <= 11).concat(MANTLE_LOW.slice().reverse().map((p) => [p[0], p[1]]));
    mantle.length = 0;
    for (let i = 6; i <= 11; i++) mantle.push(pts[i]);
    for (let i = 0; i < MANTLE_LOW.length; i++) mantle.push(MANTLE_LOW[i]);
    ctx.beginPath();
    L.tracePath(ctx, mantle, true);
    ctx.fillStyle = P.mantleGrey;
    ctx.fill();
    ctx.save();
    ctx.clip();
    const sc = new Path2D();
    const scD = new Path2D();
    for (let row = 0; row < 4; row++) {
      for (let x = -130 + (row % 2) * 9; x < 100; x += 18) {
        const y = -142 + row * 9 + (x < -60 ? (x + 60) * -0.25 : 0);
        sc.moveTo(x - 8, y + 1);
        sc.quadraticCurveTo(x, y + 10, x + 8, y + 1);
        scD.moveTo(x - 2, y + 3);
        scD.lineTo(x + 1, y + 6);
      }
    }
    ctx.strokeStyle = P.juvFringe;
    ctx.lineWidth = 2.3;
    ctx.stroke(sc);
    ctx.strokeStyle = P.mantleDeep;
    ctx.lineWidth = 1.6;
    ctx.stroke(scD);
    ctx.restore();
    ctx.restore();
    // tone on the body: 45 degree hatching on the belly's shadow side, contour strokes on the breast
    L.hatch(ctx, pts, {
      spacing: 6, width: 1.25, color: P.mantleDeep, alpha: 0.8, seed: seed + 21, length: [10, 32],
      density: (x, y) => clamp(sstep(-70, -24, y) * 0.8 * (x < 120 ? 1 : 0) + 0.25 * sstep(60, 110, x) * sstep(-110, -50, y)),
    });
    {
      const p = new Path2D();
      for (let i = 0; i < 9; i++) {
        const y = -100 + i * 8;
        const x0 = 72 + i * 1.5, x1 = 108 - Math.abs(i - 3) * 2.5;
        p.moveTo(x0, y + 2);
        p.quadraticCurveTo((x0 + x1) / 2 + 4, y + 7, x1, y + 1);
      }
      ctx.save();
      ctx.strokeStyle = P.mantleDeep;
      ctx.globalAlpha *= 0.55;
      ctx.lineWidth = 1.2;
      ctx.stroke(p);
      ctx.restore();
    }
    L.stipple(ctx, pts, { spacing: 7, r: [0.8, 1.4], color: P.mantleDeep, alpha: 0.55, seed: seed + 22, density: (x, y) => 0.5 * sstep(-80, -30, y) });
    L.inkPath(ctx, MANTLE_LOW, { width: 1.8, color: P.inkSoft, alpha: 0.9, seed: seed + 23, taper: [10, 10] });

    // head: smudgy black rear crown, white forehead, eye, black bill
    const hx = st.hx, hy = st.hy;
    const crown = CROWN.map(([x, y]) => [x + hx, y + hy]);
    ctx.save();
    ctx.beginPath();
    L.tracePath(ctx, pts, true);
    ctx.clip();
    L.inkPath(ctx, crown, { closed: true, fill: P.capBlack, width: 1.5, color: P.capBlack, seed: seed + 30, taper: [4, 6], wobble: 1.2 });
    // smudge the crown's front edge into the white forehead
    L.stipple(ctx, null, {
      bounds: { x: 110 + hx, y: -202 + hy, w: 30, h: 40 }, spacing: 3.4, r: [0.8, 1.6], color: P.capBlack, alpha: 0.85, seed: seed + 31,
      density: (x, y) => {
        const d = Math.hypot(x - (122 + hx), y - (-186 + hy));
        return 0.8 * (1 - sstep(4, 16, d));
      },
    });
    ctx.restore();
    const e = [EYE[0] + hx, EYE[1] + hy];
    ctx.beginPath();
    ctx.arc(e[0], e[1], 5.2, 0, TAU);
    ctx.fillStyle = P.capBlack;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(e[0] - 1.6, e[1] - 1.8, 1.5, 0, TAU);
    ctx.fillStyle = P.white;
    ctx.fill();
    const bill = BILL.map(([x, y]) => [x + hx, y + hy]);
    L.inkPath(ctx, bill, { closed: true, fill: P.juvBill, width: 2.4, seed: seed + 32, smooth: false, taper: [3, 3] });
    L.inkPath(ctx, [[149 + hx, -166 + hy], [172 + hx, -165.5 + hy], [186 + hx, -163.5 + hy]], { width: 1.2, color: P.plumeShade, alpha: 0.7, seed: seed + 33, taper: [3, 8] });
    // a doubled line on the back
    L.inkPath(ctx, pts.slice(3, 11), { width: 1.5, alpha: 0.4, seed: seed + 34, taper: [10, 20] });

    // near wing
    const ws = drawWing(ctx, L, P, W, false, seed + 200);
    ctx.restore();
    return ws;
  }

  // local bird point -> screen, for overlays
  function toScreen(st, p) {
    const c = Math.cos(st.tilt), s = Math.sin(st.tilt);
    const x = p[0] * BS, y = p[1] * st.sq * BS;
    return [FX + x * c - y * s, FY + st.by + x * s + y * c];
  }

  // ---------------------------------------------------------------------------
  // live layers
  // ---------------------------------------------------------------------------

  function drawSky(ctx, L, P, info, sun) {
    L.stripes(ctx, { colors: [P.stripeCream, P.stripeApricot], width: 140, angle: -0.52, offset: info.T * 12 });
    // low duskRose band over the hills, strongest at the sun's lowest point
    const a = sstep(0.35, 1, sun.low);
    if (a > 0.01) {
      const band = [];
      for (let x = -10; x <= 1090; x += 20) band.push([x, 868 + 10 * L.noise1(x * 0.006, SEED + 300) + 6 * Math.sin(x * 0.011)]);
      band.push([1090, 1004], [-10, 1004]);
      ctx.save();
      ctx.globalAlpha = 0.8 * a;
      ctx.beginPath();
      L.tracePath(ctx, band, true);
      ctx.fillStyle = P.duskRose;
      ctx.fill();
      ctx.restore();
      // softened top edge: broken duskRose strokes above the band
      ctx.save();
      ctx.globalAlpha = a;
      L.hatch(ctx, [[-10, 820], [1090, 820], [1090, 880], [-10, 880]], {
        angle: 0, spacing: 5, width: 1.6, color: P.duskRose, alpha: 0.9, seed: SEED + 301, length: [20, 80], gap: [6, 20],
        density: (x, y) => sstep(820, 878, y),
      });
      ctx.restore();
    }
  }

  function drawConstruction(ctx, L, P, sun) {
    ctx.save();
    ctx.strokeStyle = P.inkFaint;
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(SCX - SRX - 30, SCY);
    ctx.lineTo(SCX + SRX + 30, SCY);
    ctx.moveTo(SCX, SCY - SRY - 30);
    ctx.lineTo(SCX, SCY + SRY + 30);
    // the sun's plumb line to its reflection
    ctx.moveTo(sun.x, sun.y + SUN_R + 14);
    ctx.lineTo(sun.x, HORIZON - 4);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(SCX, SCY, 16, 16, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  function drawSunPath(ctx, L, P, sun) {
    ctx.save();
    ctx.strokeStyle = P.annYellow;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.setLineDash([0.01, 6.5]);
    ctx.beginPath();
    ctx.ellipse(SCX, SCY, SRX, SRY, 0, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    // twelve stations, one per drawing of the sun: the path reads as a 24-hour dial
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 12; i++) {
      const th = -Math.PI / 2 - (i / 12) * TAU;
      const x = SCX + Math.cos(th) * SRX, y = SCY + Math.sin(th) * SRY;
      let nx = Math.cos(th) / SRX, ny = Math.sin(th) / SRY;
      const nl = Math.hypot(nx, ny);
      nx /= nl;
      ny /= nl;
      const l = i % 3 === 0 ? 11 : 6;
      ctx.moveTo(x - nx * l, y - ny * l);
      ctx.lineTo(x + nx * l, y + ny * l);
    }
    ctx.stroke();
    // today's travelled arc, from the top round to the sun: the same dots, a size larger
    if (sun.frac > 0.001) {
      ctx.lineWidth = 4;
      ctx.setLineDash([0.01, 8]);
      ctx.beginPath();
      ctx.ellipse(SCX, SCY, SRX, SRY, 0, -Math.PI / 2, -Math.PI / 2 - TAU * sun.frac, true);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // start mark at the top of the path
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(SCX, SCY - SRY - 12);
    ctx.lineTo(SCX, SCY - SRY + 12);
    ctx.stroke();
    // an arrowhead at the left end showing the direction of travel
    const ax = SCX - SRX, ay = SCY;
    ctx.fillStyle = P.annYellow;
    ctx.beginPath();
    ctx.moveTo(ax, ay + 14);
    ctx.lineTo(ax - 8, ay - 2);
    ctx.lineTo(ax + 8, ay - 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawGlitter(ctx, L, P, g, sun, bi) {
    const k = 0.45 + 0.55 * sun.low;
    const foam = new Path2D();
    const gold = new Path2D();
    for (let i = 0; i < g.glitter.length; i++) {
      const q = g.glitter[i];
      const y = HORIZON + 6 + q.v * (SHORE - HORIZON - 20);
      const spread = 18 + q.v * 150 + sun.low * 30;
      const tw = L.h3(i, bi, SEED + 400);
      if (tw > 0.35 + 0.6 * k) continue; // twinkle: some dashes drop out each drawing
      const x = sun.x + q.u * spread + (tw - 0.5) * 6;
      const len = q.len * (6 + q.v * 26) * (0.7 + 0.5 * k);
      const hgt = 1.2 + q.v * 2;
      const p = q.sunCol ? gold : foam;
      p.moveTo(x - len / 2, y);
      p.quadraticCurveTo(x, y - hgt, x + len / 2, y);
      p.quadraticCurveTo(x, y + hgt, x - len / 2, y);
      p.closePath();
    }
    ctx.save();
    ctx.fillStyle = P.foam;
    ctx.globalAlpha = 0.95;
    ctx.fill(foam);
    ctx.fillStyle = P.sun;
    ctx.fill(gold);
    ctx.restore();
  }

  function drawSurf(ctx, L, P, T) {
    const slide = (T * 8) % 400; // 4 px per beat
    for (let i = 0; i < 3; i++) {
      const y0 = SHORE - 8 - i * 16;
      const pts = [];
      for (let x = -40; x <= 1120; x += 20) pts.push([x, y0 + 3 * Math.sin((x + slide * (1 + i * 0.3)) * 0.02 + i) + 2 * L.noise1(x * 0.01, SEED + 500 + i)]);
      L.inkPath(ctx, pts, { width: 3.2 - i * 0.8, color: P.foam, alpha: 1 - i * 0.2, seed: SEED + 510 + i, taper: [0, 0], wobble: 1 });
    }
  }

  function drawTerns(ctx, L, P, g, tw) {
    g.terns.forEach((b, i) => {
      const x = b.x + b.vx * tw * 2;
      const y = b.y + 4 * Math.sin(tw * 3 + i);
      const ph = Math.floor(tw * 12 + b.ph) % 4;
      const lift = [-9, -3, 4, -3][ph] * b.s;
      const span = 20 * b.s;
      L.inkPath(ctx, [[x - span, y + lift], [x - span * 0.45, y - 3 * b.s], [x, y], [x + span * 0.45, y - 3 * b.s], [x + span, y + lift]], { width: 2.2, color: P.inkSoft, seed: SEED + 600 + i, taper: [4, 4], wobble: 0.3 });
    });
  }

  // cast shadow of the bird on the boulder top, opposite the sun
  function shadowVec(sun, st) {
    const c = Math.cos(sun.th), s = Math.sin(sun.th);
    return [-c * 275, -s * 75];
  }
  function drawCastShadow(ctx, L, P, g, sun, st) {
    const v = shadowVec(sun, st);
    const hop = st.hop ? 0.7 : 1;
    const x0 = FX + 30 * BS, y0 = FY - 2;
    const k = 0.55 + 0.45 * sun.low; // a low sun throws a longer shadow
    const ex = x0 + v[0] * k, ey = y0 + v[1] * k;
    const ang = Math.atan2(ey - y0, ex - x0);
    const len = Math.hypot(ex - x0, ey - y0) + 150;
    const cx = (x0 + ex) / 2, cy = (y0 + ey) / 2;
    const pts = L.ellipsePts(cx, cy, (len / 2) * hop, 32 * hop, 36, ang);
    // squash the shadow onto the ground plane
    for (const p of pts) p[1] = cy + (p[1] - cy) * 0.55;
    ctx.save();
    ctx.beginPath();
    L.tracePath(ctx, g.boulderS, true);
    ctx.clip();
    ctx.beginPath();
    L.tracePath(ctx, pts, true);
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = P.shingleDeep;
    ctx.fill();
    ctx.globalAlpha = 1;
    L.crossHatch(ctx, pts, { spacing: 4.5, width: 1.3, color: P.ink, alpha: 0.8, seed: SEED + 700, length: [8, 24], clip: true, layers: 2 });
    ctx.restore();
  }

  function drawShadowOverlay(ctx, L, P, sun, st) {
    const v = shadowVec(sun, st);
    const x0 = FX + 30 * BS, y0 = FY;
    ctx.save();
    ctx.strokeStyle = P.annBlue;
    ctx.fillStyle = P.annBlue;
    ctx.lineCap = 'round';
    // the tip's path: a faint compass ellipse round the feet
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.ellipse(x0, y0, 275, 75, 0, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x0 + v[0], y0 + v[1]);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x0 + v[0], y0 + v[1], 8, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x0, y0, 4, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawMotionArcs(ctx, L, P, st, ws) {
    if (!st.down) return;
    const tip = toScreen(st, st.pose.tp);
    const wr = toScreen(st, st.pose.wr);
    ctx.save();
    ctx.strokeStyle = P.annBlue;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const f = 0.55 + i * 0.2;
      const px = lerp(wr[0], tip[0], f), py = lerp(wr[1], tip[1], f);
      const r = 60 + i * 30;
      // arcs trailing above the sweeping hand
      ctx.beginPath();
      ctx.arc(px + 10, py - r * 0.9, r, Math.PI * 0.55, Math.PI * 0.85);
      ctx.stroke();
    }
    ctx.restore();
    void ws;
  }

  function drawTakeoff(ctx, L, P, t, st) {
    if (t < B_READY - 1e-6) return;
    const p = L.ease.outExpo(clamp((t - B_READY) / (6 * FR) + 1 / 6));
    const a = toScreen(st, [150, -200]);
    const pts = [];
    const b = [920, 1110], c = [860, 560];
    for (let i = 0; i <= 30; i++) {
      const u = (i / 30) * p;
      const x = (1 - u) * (1 - u) * a[0] + 2 * u * (1 - u) * b[0] + u * u * c[0];
      const y = (1 - u) * (1 - u) * a[1] + 2 * u * (1 - u) * b[1] + u * u * c[1];
      pts.push([x, y]);
    }
    ctx.save();
    ctx.strokeStyle = P.annBlue;
    ctx.fillStyle = P.annBlue;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.setLineDash([14, 10]);
    ctx.beginPath();
    L.tracePath(ctx, pts, false);
    ctx.stroke();
    ctx.setLineDash([]);
    if (p > 0.95) {
      const e = pts[pts.length - 1], d = pts[pts.length - 3];
      const ang = Math.atan2(e[1] - d[1], e[0] - d[0]);
      ctx.beginPath();
      ctx.moveTo(e[0] + Math.cos(ang) * 10, e[1] + Math.sin(ang) * 10);
      ctx.lineTo(e[0] + Math.cos(ang + 2.5) * 14, e[1] + Math.sin(ang + 2.5) * 14);
      ctx.lineTo(e[0] + Math.cos(ang - 2.5) * 14, e[1] + Math.sin(ang - 2.5) * 14);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arc(x + w - r, y + r, r, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(x + r, y + h);
    ctx.arc(x + r, y + r, r, Math.PI / 2, (3 * Math.PI) / 2);
    ctx.closePath();
  }

  // day tally ring: three arcs filling clockwise from 12 o'clock, a notch at the end of each
  function drawTally(ctx, L, P, t, sun) {
    const gap = 0.16;
    ctx.save();
    ctx.strokeStyle = P.annYellow;
    ctx.fillStyle = P.annYellow;
    ctx.lineCap = 'round';
    // base ring
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(RING_X, RING_Y, RING_R, 0, TAU);
    ctx.stroke();
    // fine hour ticks: 12 per day
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < 36; i++) {
      const a = -Math.PI / 2 + (i / 36) * TAU;
      const l = i % 12 === 0 ? 0 : i % 3 === 0 ? 9 : 5;
      if (!l) continue;
      ctx.moveTo(RING_X + Math.cos(a) * (RING_R - l), RING_Y + Math.sin(a) * (RING_R - l));
      ctx.lineTo(RING_X + Math.cos(a) * (RING_R - 1), RING_Y + Math.sin(a) * (RING_R - 1));
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
    // lit arcs: each day's arc grows with the sun and completes on its notch frame
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      const prog = clamp((t - i) / (1 - FR));
      if (prog <= 0) continue;
      const a0 = -Math.PI / 2 + (i / 3) * TAU + gap;
      const a1 = -Math.PI / 2 + ((i + 1) / 3) * TAU - gap;
      const pq = i === Math.floor(t + FR + 1e-6) ? clamp(Math.floor(sun.frac * 12 + 1e-6) / 11) : prog;
      ctx.beginPath();
      ctx.arc(RING_X, RING_Y, RING_R, a0, lerp(a0, a1, Math.max(pq, prog >= 1 ? 1 : 0)));
      ctx.stroke();
    }
    // notches
    for (let i = 0; i < 3; i++) {
      const ang = -Math.PI / 2 + ((i + 1) / 3) * TAU;
      const lit = t >= DAY_END[i] - 1e-6;
      ctx.save();
      ctx.translate(RING_X + Math.cos(ang) * RING_R, RING_Y + Math.sin(ang) * RING_R);
      ctx.rotate(ang);
      ctx.beginPath();
      if (lit) {
        const f = Math.floor((t - DAY_END[i]) * 24 + 1e-6);
        if (f < 3) {
          const sc = L.ease.outBack((f + 1) / 3);
          ctx.scale(sc, sc);
        }
        roundRect(ctx, -14, -7, 28, 14, 7);
        ctx.fill();
      } else {
        roundRect(ctx, -13, -6, 26, 12, 6);
        ctx.fillStyle = P.stripeCream;
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
      ctx.restore();
      // burst ring on the notch frame
      if (lit) {
        const f = (t - DAY_END[i]) * 24;
        if (f < 10) {
          const p = (Math.floor(f + 1e-6) + 1) / 10;
          ctx.save();
          ctx.globalAlpha = 1 - sstep(0.3, 1, p);
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(RING_X, RING_Y, lerp(RING_R + 6, RING_R + 90, L.ease.outExpo(p)), 0, TAU);
          ctx.stroke();
          ctx.beginPath();
          const nx = RING_X + Math.cos(ang) * RING_R, ny = RING_Y + Math.sin(ang) * RING_R;
          ctx.arc(nx, ny, lerp(10, 36, L.ease.outExpo(p)), 0, TAU);
          ctx.stroke();
          ctx.restore();
        }
      }
    }
    // the sun glyph in the centre; its hand points where the sun is on its path
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(RING_X, RING_Y, 13, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      ctx.moveTo(RING_X + Math.cos(a) * 18, RING_Y + Math.sin(a) * 18);
      ctx.lineTo(RING_X + Math.cos(a) * 25, RING_Y + Math.sin(a) * 25);
    }
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(RING_X, RING_Y, 6, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const L = info.lib, P = L.pal;
      // hold the last drawn frame past the end (the flash into 09 asks for t > dur)
      const t = clamp(tIn, 0, info.dur - 1e-3);
      const g = geo(L);
      const bi = L.boil(info.T);
      const v = ((bi % 3) + 3) % 3;
      const tw = L.onTwos(t);
      const sun = sunAt(t);
      const st = birdState(t);

      // 1-2 sky
      drawSky(ctx, L, P, info, sun);
      // 3 construction
      drawConstruction(ctx, L, P, sun);
      // 4 sun path
      drawSunPath(ctx, L, P, sun);
      // 5 sun
      drawSun(ctx, L, P, sun);
      // 6 hills
      sprite(ctx, L, ID + '-hills', v, { x: 0, y: 600, w: 1080, h: 410 }, (gc, vv) => paintHills(gc, L, P, g, vv));
      // 7 distant terns
      drawTerns(ctx, L, P, g, tw);
      // 8 sea
      sprite(ctx, L, ID + '-sea', v, { x: 0, y: 998, w: 1080, h: 432 }, (gc, vv) => paintSea(gc, L, P, g, vv));
      // 9 glitter and surf
      drawGlitter(ctx, L, P, g, sun, bi);
      drawSurf(ctx, L, P, info.T);
      // 10 beach and boulder
      sprite(ctx, L, ID + '-beach', v, { x: 0, y: 1280, w: 1080, h: 640 }, (gc, vv) => paintBeach(gc, L, P, g, vv));
      // 11 cast shadow
      drawCastShadow(ctx, L, P, g, sun, st);
      // 12 shadow overlay
      drawShadowOverlay(ctx, L, P, sun, st);
      // 13 the juvenile
      const ws = drawBird(ctx, L, P, st);
      // 14 overlays
      drawMotionArcs(ctx, L, P, st, ws);
      drawTakeoff(ctx, L, P, t, st);
      drawTally(ctx, L, P, t, sun);
    },
  });
})();
