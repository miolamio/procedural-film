// 04 chick-feeding: "Four fish, four days". Global T 5.5 to 8.0, illustrated mode.
//
// A low view across the Sand Island shingle to Young Sound. A parent Arctic tern (breeding plumage,
// side view, 2.0 px per mm, 690 px bill to streamers) lands at (720, 1400) on each beat with a sand eel;
// the downy chick at the scrape (400, 1420) swallows it head first and snaps a size larger on the next
// beat (day 1, 6, 11, 16). Parent 4 lifts off to the upper left instead of folding.
//
// Layers, back to front:
//   1  stripes (screen): stripeCream / stripeYellow, drifting 6 px per beat
//   -- world, under the camera push (zoom 1.00 -> 1.03, screen point (540, 1300) held) --
//   2  far range of Young Sound (faint), near hills of the far shore with snow patches, ridge line y 1060
//   3  the sound: sea band y 1060..1300, engraved horizontal hatching, drift ice, surf lines (4 px per beat)
//   4  shingle: base tone, moss patches, several hundred pebbles back to front (lit tops, hatched undersides)
//   5  the scrape, egg-shell fragments, grass stems, the lichen rock at (220, 1480)
//   6  construction lines (inkFaint 30 percent)
//   7  cast shadows (parent, chick)
//   8  parent: far wing, far leg, tail, body, folded wing, neck, head, bill, sand eel, near leg, near wing
//   9  chick: down ball (day 1, 6), pin feathers (day 11), grey feathers with down tufts (day 16)
//   -- overlays, screen space, never hatched --
//   10 annBlue trajectory lines for each descent and the lift-off, blue landing rings
//   11 annBlue ruler at x 120 with the annMagenta head-height mark and its history
//   12 annYellow tally ring at (860, 300), four segments, closes and pulses on the fourth fish
//   13 annYellow peep ticks at the chick's bill on the opening 16ths
// Characters move on twos; the camera, overlays and draw-ons run at 24 fps; ink boils at 12 fps.
(function () {
  'use strict';
  const FILM = window.FILM;
  const L = FILM.lib;
  const P = {};
  for (const k of Object.keys(L.pal)) P[k] = L.pal[k];
  const E = {};
  for (const k of Object.keys(L.ease)) E[k] = L.ease[k];

  const ID = 'chick-feeding';
  const DUR = 2.5;
  const FR = 1 / 24;
  const TAU = Math.PI * 2;
  const DEG = Math.PI / 180;
  const clamp = L.clamp, lerp = L.lerp;
  const sd = (...k) => L.hash(ID, ...k) & 0x7fffffff;

  // ===========================================================================
  // Numbers from the storyboard
  // ===========================================================================

  const HORIZON = 1060; // far shore ridge base
  const SHORE = 1300; // sea meets shingle
  const TD = [720, 1400]; // parent touch-down (feet)
  const CHICK = [400, 1420]; // chick feet at the scrape
  const ROCK = [220, 1480]; // pebble with orange lichen
  const RULER_X = 120, RULER_Y0 = 900, RULER_Y1 = 1540;
  const TALLY = [860, 300], TALLY_R = 60;

  // beats, shot-local
  const B = [0.5, 1.0, 1.5, 2.0]; // T 6.0, 6.5, 7.0, 7.5: parent k touches down
  const SWALLOW = B.map((b) => b + 0.125); // T 6.125 ...: the chick takes the fish, tally k lights
  const B_CLOSE = 2.25; // T 7.75: the ring closes and pulses
  const B_BLINK = 1.25; // T 6.75

  // descent paths (quadratic Bezier start, control) into the touch-down point
  const DESC = [
    [[1110, 610], [990, 1180]],
    [[1240, 330], [1020, 1060]],
    [[1270, 760], [960, 1250]],
    [[1220, 450], [1060, 1130]],
  ];
  // parent 4 lifts off to the upper left
  const LIFT = [TD, [660, 1020], [300, 760]];

  // parent pitch while feeding each day (radians, + is nose up) and the bill's world angle
  const TH_FEED = [-0.28, -0.12, 0.02, 0.14];
  const PHI_FEED = [140 * DEG, 146 * DEG, 150 * DEG, 152 * DEG];
  const REAR = -0.66; // world angle of tail and folded wingtips while standing

  // chick per day (feet origin, facing right). body [cx, cy, rx, ry, rot], head [cx, cy, r]
  const CH = [
    { day: 1, h: 100, body: [-6, -42, 50, 40, 0], head: [22, -68, 31], bill: 17, leg: 5 },
    { day: 6, h: 130, body: [-10, -54, 62, 48, -0.05], head: [30, -94, 34], bill: 21, leg: 10 },
    { day: 11, h: 170, body: [-16, -72, 80, 56, -0.12], head: [46, -130, 37], bill: 28, leg: 16 },
    { day: 16, h: 220, body: [-26, -94, 104, 62, -0.18], head: [66, -180, 39], bill: 38, leg: 22 },
  ];
  const BEG = -0.6; // begging bill angle (up and to the right)

  // parent head and bill (2.0 px per mm)
  const HEAD_R = 36;
  const BILL_LEN = 62; // 31 mm
  const BILL_D = 16;
  const EEL_LEN = 60; // storyboard: 60 px at this scale

  // ===========================================================================
  // Small helpers
  // ===========================================================================

  const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const mul = (a, k) => [a[0] * k, a[1] * k];
  const dir = (a) => [Math.cos(a), Math.sin(a)];
  const mix2 = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];
  const bez = (p0, p1, p2, u) => {
    const v = 1 - u;
    return [v * v * p0[0] + 2 * v * u * p1[0] + u * u * p2[0], v * v * p0[1] + 2 * v * u * p1[1] + u * u * p2[1]];
  };
  const bezPts = (p0, p1, p2, u0, u1, n) => {
    const out = [];
    for (let i = 0; i <= n; i++) out.push(bez(p0, p1, p2, lerp(u0, u1, i / n)));
    return out;
  };

  // uniform Catmull-Rom resample (for fills and hatch clips that should follow the inked curve)
  function cr(pts, closed, per = 6) {
    const n = pts.length;
    if (n < 3) return pts.slice();
    const out = [];
    const get = (i) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
    const last = closed ? n : n - 1;
    for (let i = 0; i < last; i++) {
      const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
      for (let j = 0; j < per; j++) {
        const s = j / per, s2 = s * s, s3 = s2 * s;
        out.push([
          0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * s + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * s2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * s3),
          0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * s + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * s2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * s3),
        ]);
      }
    }
    if (!closed) out.push(pts[n - 1]);
    return out;
  }

  function fillPoly(ctx, pts, color, alpha = 1) {
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    L.tracePath(ctx, pts, true);
    ctx.fill();
    ctx.restore();
  }
  // clip to everything outside the given polygons (nested, so overlaps stay outside)
  function clipOutside(ctx, polys) {
    for (const poly of polys) {
      ctx.beginPath();
      ctx.rect(-4000, -4000, 9000, 9000);
      L.tracePath(ctx, poly, true);
      ctx.clip('evenodd');
    }
  }
  function clipInside(ctx, poly) {
    ctx.beginPath();
    L.tracePath(ctx, poly, true);
    ctx.clip();
  }
  // a tapered pen stroke appended to a Path2D
  function taperStroke(path, pts, w0, w1) {
    const n = pts.length;
    if (n < 2) return;
    const lx = [], ly = [], rx = [], ry = [];
    for (let i = 0; i < n; i++) {
      const a = pts[i > 0 ? i - 1 : 0], b = pts[i < n - 1 ? i + 1 : n - 1];
      let tx = b[0] - a[0], ty = b[1] - a[1];
      const tl = Math.hypot(tx, ty) || 1;
      tx /= tl;
      ty /= tl;
      const hw = lerp(w0, w1, i / (n - 1)) / 2;
      lx.push(pts[i][0] - ty * hw);
      ly.push(pts[i][1] + tx * hw);
      rx.push(pts[i][0] + ty * hw);
      ry.push(pts[i][1] - tx * hw);
    }
    path.moveTo(lx[0], ly[0]);
    for (let i = 1; i < n; i++) path.lineTo(lx[i], ly[i]);
    for (let i = n - 1; i >= 0; i--) path.lineTo(rx[i], ry[i]);
    path.closePath();
  }
  function fillPath(ctx, path, color, alpha = 1) {
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.fillStyle = color;
    ctx.fill(path);
    ctx.restore();
  }
  function strokePath(ctx, path, color, width, alpha = 1, dash) {
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (dash) ctx.setLineDash(dash);
    ctx.stroke(path);
    ctx.restore();
  }
  // a small hand wobble for plain strokes, per boil drawing
  const jig = (i, k, bi, amp) => (L.h3(i, k, bi * 7 + 3) - 0.5) * 2 * amp;

  // irregular closed blob round an ellipse
  function blob(cx, cy, rx, ry, rot, n, rough, seed) {
    const out = [];
    const c = Math.cos(rot), s = Math.sin(rot);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      const k = 1 + rough * L.noise1(i * 0.9 + 0.3, seed) + rough * 0.5 * L.noise1(i * 2.3, seed + 5);
      const x = Math.cos(a) * rx * k, y = Math.sin(a) * ry * k;
      out.push([cx + x * c - y * s, cy + x * s + y * c]);
    }
    return out;
  }
  // down fluff round an ellipse: soft tufts every few px
  function fluff(cx, cy, rx, ry, rot, amp, seed, step = 9) {
    const per = Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry)));
    const n = Math.max(24, Math.round(per / step)) * 2;
    const out = [];
    const c = Math.cos(rot), s = Math.sin(rot);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      const tuft = i % 2 === 0 ? amp * (0.6 + 0.7 * L.h3(i, seed, 1)) : -amp * 0.25;
      const x = Math.cos(a) * (rx + tuft), y = Math.sin(a) * (ry + tuft);
      out.push([cx + x * c - y * s, cy + x * s + y * c]);
    }
    return out;
  }
  function pointInPoly(poly, x, y) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }

  // ===========================================================================
  // Static world geometry (built once, t-independent)
  // ===========================================================================

  let GEO = null;
  function geo() {
    if (GEO) return GEO;
    const G = {};

    // --- far shore: near hills (low, snow patches) and a faint far range behind
    const bump = (x, c, w, h) => h * Math.exp(-((x - c) * (x - c)) / (2 * w * w));
    const nearH = (x) =>
      16 + bump(x, 120, 140, 92) + bump(x, 460, 110, 54) + bump(x, 850, 170, 118) + bump(x, 1130, 90, 60) + 12 * L.fbm1(x * 0.014, sd('hill'), 3);
    const farH = (x) => 60 + bump(x, 300, 150, 110) + bump(x, 690, 120, 160) + bump(x, 1010, 150, 96) + 22 * L.fbm1(x * 0.01, sd('far'), 3);
    G.nearH = nearH;
    G.near = [];
    G.far = [];
    for (let x = -140; x <= 1220; x += 10) {
      G.near.push([x, HORIZON - nearH(x)]);
      G.far.push([x, HORIZON - farH(x)]);
    }
    G.nearPoly = G.near.concat([[1220, HORIZON + 4], [-140, HORIZON + 4]]);
    G.farPoly = G.far.concat([[1220, HORIZON + 4], [-140, HORIZON + 4]]);
    // slope hatching on the faces turned from the upper-left light
    {
      const slope = (H, x) => (H(x + 5) - H(x - 5)) / 10;
      const keep = (H, segs, k, base, seed) => {
        const r = L.rng(seed);
        return segs.filter((q) => {
          const x = (q[0] + q[2]) / 2, y = (q[1] + q[3]) / 2;
          const depth = (y - (HORIZON - H(x))) / Math.max(20, H(x));
          return clamp(-slope(H, x) * k + base + 0.35 * depth) > r();
        });
      };
      G.hillHatch = keep(nearH, hatchSegs(G.nearPoly, 4.5, -1.2, sd('hillH'), [6, 16], [2, 5]), 2.2, 0.12, sd('hillK'));
      G.hillCross = keep(nearH, hatchSegs(G.nearPoly, 6, -0.35, sd('hillC'), [5, 12], [3, 8]), 2.0, -0.35, sd('hillK2'));
      G.farHatch = keep(farH, hatchSegs(G.farPoly, 6, -1.2, sd('farH'), [6, 18], [3, 7]), 1.8, -0.1, sd('farK'));
    }
    // snow patches: short streaks on the upper slopes of the near hills
    G.snow = [];
    {
      const r = L.rng(sd('snow'));
      for (let i = 0; i < 16; i++) {
        const x = r.range(-60, 1160);
        const h = nearH(x);
        if (h < 40) continue;
        const y = HORIZON - h + r.range(6, Math.min(34, h * 0.5));
        const w = r.range(10, 34), hh = r.range(3, 7);
        G.snow.push(blob(x, y, w, hh, r.range(-0.4, 0.2), 10, 0.25, sd('snow', i)));
      }
      // far range snow caps
      G.farSnow = [];
      for (const c of [300, 700, 1000]) {
        const top = HORIZON - farH(c);
        const pts = [];
        for (let x = c - 60; x <= c + 60; x += 8) pts.push([x, HORIZON - farH(x) + 1]);
        for (let x = c + 60; x >= c - 60; x -= 12) pts.push([x, Math.max(HORIZON - farH(x) + 2, top + 22 + 7 * Math.sin(x * 0.2))]);
        G.farSnow.push(pts);
      }
    }

    // --- the sound: engraved horizontal hatching, denser toward the far shore
    G.seaLines = [];
    {
      const r = L.rng(sd('sea'));
      let y = HORIZON + 5;
      let row = 0;
      while (y < SHORE - 6) {
        const u = (y - HORIZON) / (SHORE - HORIZON);
        let x = -160 + r() * 40;
        while (x < 1240) {
          const len = lerp(60, 150, r()) * lerp(0.7, 1.1, u);
          const dens = lerp(0.95, 0.5, u) + 0.2 * L.noise1(x * 0.01 + row, sd('seaN'));
          if (r() < dens) G.seaLines.push({ x0: x, x1: x + len, y: y + r.range(-0.8, 0.8), w: lerp(1.0, 1.6, r()), a: lerp(0.45, 0.8, r()), row });
          x += len + lerp(6, 28, r());
        }
        y += lerp(4.2, 11, Math.pow(u, 0.9)) * lerp(0.85, 1.15, r());
        row++;
      }
      // drift ice near the far shore
      G.ice = [];
      const iceAt = [[150, 1082, 26], [212, 1090, 12], [610, 1096, 30], [668, 1086, 11], [930, 1110, 20], [1010, 1080, 14], [380, 1122, 16]];
      iceAt.forEach(([x, y, w], i) => G.ice.push({ top: blob(x, y, w, w * 0.22, 0, 12, 0.18, sd('ice', i)), x, y, w }));
    }

    // --- shingle pebbles: rows that grow toward the viewer
    G.pebbles = [];
    {
      const r = L.rng(sd('pebbles'));
      const skip = (x, y, s) => {
        // keep the scrape floor mostly clear and leave room for the lichen rock
        const dx = (x - CHICK[0]) / 150, dy = (y - (CHICK[1] + 10)) / 34;
        if (dx * dx + dy * dy < 1 && r() < 0.8) return true;
        const rx = (x - ROCK[0]) / 125, ry = (y - ROCK[1]) / 64;
        if (rx * rx + ry * ry < 1) return true;
        return false;
      };
      let y = SHORE + 3;
      while (y < 1960) {
        const u = clamp((y - SHORE) / 620);
        const s = 7 + 54 * Math.pow(u, 1.2);
        let x = -140 + r() * s * 2;
        while (x < 1220) {
          const px = x + r.range(-0.4, 0.4) * s, py = y + r.range(-0.35, 0.35) * s * 0.5;
          if (!skip(px, py, s)) {
            const rx = s * r.range(0.62, 1.12);
            const ry = rx * r.range(0.42, 0.64);
            const rot = r.range(-0.35, 0.35);
            const pick = r();
            const col = pick < 0.5 ? 'shingle' : pick < 0.78 ? 'shinglePale' : pick < 0.9 ? 'paperShade' : pick < 0.96 ? 'tan' : 'shingleDeep';
            const seed = sd('peb', G.pebbles.length);
            const pts = blob(px, py, rx, ry, rot, rx > 16 ? 14 : 9, 0.1, seed);
            // hatched underside crescent (lower right) and lit cap (upper left)
            const cres = [];
            const a0 = -25 * DEG, a1 = 160 * DEG;
            for (let i = 0; i <= 10; i++) {
              const a = lerp(a0, a1, i / 10);
              cres.push([px + Math.cos(a) * rx * 1.0, py + Math.sin(a) * ry * 1.0]);
            }
            for (let i = 10; i >= 0; i--) {
              const a = lerp(a0, a1, i / 10);
              cres.push([px - rx * 0.16 + Math.cos(a) * rx * 0.9, py - ry * 0.3 + Math.sin(a) * ry * 0.82]);
            }
            const lit = blob(px - rx * 0.32, py - ry * 0.36, rx * 0.42, ry * 0.32, rot, 8, 0.12, seed + 3);
            const lichen = r() < (rx > 12 ? 0.12 : 0.04);
            G.pebbles.push({ x: px, y: py, rx, ry, rot, col, pts, cres, lit, seed, lichen });
          }
          x += s * r.range(1.8, 2.6);
        }
        y += s * r.range(0.72, 0.98);
      }
      G.pebbles.sort((a, b) => a.y - b.y);
      G.pebSmall = G.pebbles.filter((p) => p.rx <= 9);
      G.pebBig = G.pebbles.filter((p) => p.rx > 9);
      // groups of stones with no overlap, in back-to-front order
      G.pebGroups = [];
      let grp = [];
      const hit = (a, b) => Math.abs(a.x - b.x) < a.rx + b.rx + 2 && Math.abs(a.y - b.y) < a.ry + b.ry + 2;
      for (const p of G.pebBig) {
        if (grp.some((q) => hit(p, q))) {
          G.pebGroups.push(grp);
          grp = [];
        }
        grp.push(p);
      }
      if (grp.length) G.pebGroups.push(grp);
      for (const p of G.pebBig) {
        p.edge = cr(p.pts, true, 2);
        p.hatch = p.rx > 14 ? hatchSegs(p.cres, p.rx > 30 ? 4.6 : 5.6, -Math.PI / 4, p.seed + 11, [6, Math.max(8, p.rx * 0.6)], [2, 4]) : [];
        if (p.lichen) {
          const lr = L.rng(p.seed + 17);
          p.lichenDots = [];
          const n = Math.round(p.rx * 1.4);
          for (let i = 0; i < n; i++) {
            const a = lr() * TAU, d = Math.sqrt(lr());
            p.lichenDots.push([p.x - p.rx * 0.1 + Math.cos(a) * p.rx * 0.45 * d, p.y - p.ry * 0.3 + Math.sin(a) * p.ry * 0.35 * d, lr.range(1.1, 2.3)]);
          }
        }
      }
    }

    // --- moss patches between the pebbles
    G.moss = [];
    {
      const at = [[70, 1350, 70, 14], [985, 1336, 90, 12], [590, 1590, 60, 13], [1010, 1690, 80, 20], [40, 1810, 95, 26], [860, 1860, 120, 30], [560, 1330, 44, 7]];
      at.forEach(([x, y, w, h], i) => {
        const r = L.rng(sd('moss', i));
        const tufts = [];
        const n = Math.round(w * 0.9);
        for (let k = 0; k < n; k++) {
          const a = r() * TAU, d = Math.sqrt(r());
          const tx = x + Math.cos(a) * w * d, ty = y + Math.sin(a) * h * d;
          const len = lerp(4, 14, r()) * (h / 20 + 0.4);
          tufts.push([tx, ty, tx + r.range(-3, 3), ty - len]);
        }
        G.moss.push({ pts: blob(x, y, w, h, 0, 18, 0.22, sd('mossB', i)), tufts, x, y, w, h });
      });
    }

    // --- the lichen rock
    {
      const [x, y] = ROCK;
      G.rock = blob(x, y - 6, 118, 58, -0.05, 26, 0.08, sd('rock'));
      G.rockTop = blob(x - 16, y - 32, 84, 24, -0.08, 18, 0.12, sd('rockTop'));
      G.rockShade = [];
      for (let i = 0; i <= 14; i++) {
        const a = lerp(-30 * DEG, 150 * DEG, i / 14);
        G.rockShade.push([x + Math.cos(a) * 118, y - 6 + Math.sin(a) * 58]);
      }
      for (let i = 14; i >= 0; i--) {
        const a = lerp(-30 * DEG, 150 * DEG, i / 14);
        G.rockShade.push([x - 30 + Math.cos(a) * 100, y - 22 + Math.sin(a) * 44]);
      }
      G.lichen = [];
      const r = L.rng(sd('lichen'));
      const spots = [[-50, -34, 30, 11], [18, -40, 22, 9], [60, -22, 20, 10], [-80, -8, 14, 8], [-6, -20, 16, 6], [40, 10, 12, 6]];
      spots.forEach(([dx, dy, w, h], i) => G.lichen.push(blob(x + dx, y + dy, w, h, r.range(-0.3, 0.3), 16, 0.32, sd('lich', i))));
      G.lichenDots = [];
      for (let i = 0; i < 60; i++) {
        const s = spots[i % spots.length];
        const a = r() * TAU, d = r.range(0.9, 1.5);
        G.lichenDots.push([x + s[0] + Math.cos(a) * s[2] * d, y + s[1] + Math.sin(a) * s[3] * d, r.range(1.2, 3.2)]);
      }
      G.rockCracks = [
        [[x - 96, y - 10], [x - 70, y + 2], [x - 52, y + 20]],
        [[x + 30, y - 52], [x + 44, y - 30], [x + 70, y - 26]],
      ];
    }

    // --- the scrape: a shallow dip in the shingle with a pebble rim, shell bits and a few stems
    {
      const [x, y] = CHICK;
      G.scrape = blob(x - 4, y + 10, 150, 32, 0, 30, 0.06, sd('scrape'));
      G.scrapeIn = blob(x - 2, y + 14, 120, 22, 0, 26, 0.08, sd('scrapeIn'));
      G.rim = [];
      const r = L.rng(sd('rim'));
      for (let i = 0; i < 26; i++) {
        const a = (i / 26) * TAU + r.range(-0.08, 0.08);
        const px = x - 4 + Math.cos(a) * 156 * r.range(0.96, 1.06), py = y + 10 + Math.sin(a) * 34 * r.range(0.9, 1.1);
        const rx = r.range(7, 15) * (Math.sin(a) > 0 ? 1.2 : 0.9);
        G.rim.push({ x: px, y: py, rx, ry: rx * r.range(0.45, 0.6), pts: blob(px, py, rx, rx * 0.55, r.range(-0.3, 0.3), 9, 0.12, sd('rimP', i)), col: r() < 0.5 ? 'shinglePale' : 'shingle' });
      }
      G.rim.sort((a, b) => a.y - b.y);
      // shell fragments of the hatched egg: curved shards
      const shard = (cx, cy, w, h, rot, seed) => {
        const pts = [];
        for (let i = 0; i <= 8; i++) {
          const a = Math.PI + (i / 8) * Math.PI;
          pts.push([Math.cos(a) * w, Math.sin(a) * h]);
        }
        pts.push([w * 0.7, h * 0.1], [w * 0.2, -h * 0.25], [-w * 0.3, h * 0.05], [-w * 0.75, -h * 0.1]);
        const c = Math.cos(rot), s = Math.sin(rot);
        const rr = L.rng(seed);
        return {
          pts: pts.map(([u, v]) => [cx + u * c - v * s + rr.range(-1, 1), cy + u * s + v * c + rr.range(-1, 1)]),
          dots: Array.from({ length: 5 }, () => [cx + rr.range(-w * 0.6, w * 0.6), cy + rr.range(-h * 0.7, 0), rr.range(1.4, 3.4)]),
        };
      };
      G.shells = [shard(x - 118, y + 14, 26, 15, -0.3, sd('sh1')), shard(x + 128, y + 22, 20, 12, 0.5, sd('sh2')), shard(x - 70, y + 34, 14, 8, 2.8, sd('sh3'))];
      G.stems = [];
      const st = L.rng(sd('stems'));
      for (let i = 0; i < 9; i++) {
        const sx = x + st.range(-170, 160), sy = y + st.range(-4, 30);
        if (Math.abs(sx - x) < 90) continue;
        G.stems.push([[sx, sy], [sx + st.range(-10, 10), sy - st.range(10, 22)], [sx + st.range(-22, 22), sy - st.range(18, 34)]]);
      }
    }

    // --- chick sprites per day: outlines and down strands (chick-local, feet origin)
    G.chick = CH.map((c, k) => {
      const [bx, by, brx, bry, brot] = c.body;
      const [hx, hy, hr] = c.head;
      const body = fluff(bx, by, brx, bry, brot, 3 + k * 0.5, sd('cb', k), 7);
      const head = fluff(hx, hy, hr, hr, 0, 2.6 + k * 0.4, sd('ch', k), 7);
      const bodyC = cr(body.filter((_, i) => i % 2 === 0), true, 3);
      // neck bridges head and body for the older chicks
      let neck = null;
      if (k >= 2) {
        const f = k === 2 ? 0.8 : 1;
        neck = cr([[hx - hr * 0.9, hy + hr * 0.1], [hx - hr * 0.6, hy + hr * 0.9], [bx + brx * 0.25 * f, by - bry * 0.55], [bx + brx * 0.7, by - bry * 0.2], [hx + hr * 0.4, hy + hr * 0.95], [hx + hr * 0.3, hy + hr * 0.4]], true, 3);
      }
      // down strands: short curved strokes out from the contour and inside the body
      const strands = [];
      const r = L.rng(sd('strand', k));
      const addEdge = (cx, cy, rx, ry, rot, n, len) => {
        for (let i = 0; i < n; i++) {
          const a = r() * TAU;
          const c0 = Math.cos(rot), s0 = Math.sin(rot);
          const ex = Math.cos(a) * rx, ey = Math.sin(a) * ry;
          const px = cx + ex * c0 - ey * s0, py = cy + ex * s0 + ey * c0;
          const nx = (px - cx) / Math.hypot(px - cx, py - cy), ny = (py - cy) / Math.hypot(px - cx, py - cy);
          const l = len * r.range(0.5, 1.2);
          const bend = r.range(-0.5, 0.5);
          strands.push([
            [px - nx * l * 0.4, py - ny * l * 0.4],
            [px + nx * l * 0.3 - ny * bend * l * 0.3, py + ny * l * 0.3 + nx * bend * l * 0.3],
            [px + nx * l * 0.75 - ny * bend * l * 0.6, py + ny * l * 0.75 + nx * bend * l * 0.6],
          ]);
        }
      };
      addEdge(bx, by, brx, bry, brot, Math.round(brx * 1.5), 10 + k * 1.5);
      addEdge(hx, hy, hr, hr, 0, Math.round(hr * 1.4), 8 + k);
      const inner = [];
      for (let i = 0; i < brx * 2.2; i++) {
        const a = r() * TAU, d = Math.sqrt(r()) * 0.85;
        const px = bx + Math.cos(a) * brx * d, py = by + Math.sin(a) * bry * d;
        const ang = Math.atan2(py - by, px - bx) + r.range(-0.6, 0.6);
        const l = r.range(5, 11);
        inner.push([[px, py], [px + Math.cos(ang) * l * 0.5, py + Math.sin(ang) * l * 0.5 - 1], [px + Math.cos(ang) * l, py + Math.sin(ang) * l]]);
      }
      // the older chicks carry feathers
      const feathers = [];
      if (k === 2) {
        // pin feathers: rows of short dark sheaths on the wing stub and the scapulars, pointing back
        const wx = bx + brx * 0.1, wy = by - bry * 0.05;
        feathers.push({ kind: 'stub', pts: L.ellipsePts(wx - 10, wy + 2, brx * 0.5, bry * 0.34, 20, 0.12) });
        for (let row = 0; row < 2; row++) {
          for (let i = 0; i < 8; i++) {
            const u = i / 7;
            const base = [wx + lerp(22, -44, u) - row * 8, wy + lerp(-8, 6, u) + row * 11];
            const ang = lerp(172, 196, u) * DEG + r.range(-0.05, 0.05);
            const len = lerp(14, 26, u) * (row ? 0.75 : 1);
            feathers.push({ kind: 'pin', base, tip: [base[0] + Math.cos(ang) * len, base[1] + Math.sin(ang) * len], w: row ? 3.6 : 4.4 });
          }
        }
        for (let i = 0; i < 6; i++) {
          const u = i / 5;
          const base = [bx + lerp(34, -24, u), by - bry * 0.55 + 5 * u];
          const ang = lerp(176, 190, u) * DEG;
          feathers.push({ kind: 'pin', base, tip: [base[0] + Math.cos(ang) * lerp(9, 13, r()), base[1] + Math.sin(ang) * 9], w: 3.4 });
        }
      }
      if (k === 3) {
        // folded juvenile wing: coverts with orangey fringes, carpal bar, grey flight feathers
        const wx = bx + 6, wy = by - 4;
        const wing = cr([[wx + 60, wy - 26], [wx + 20, wy - 40], [wx - 50, wy - 34], [wx - 120, wy - 10], [wx - 150, wy + 2], [wx - 100, wy + 16], [wx - 20, wy + 24], [wx + 40, wy + 14]], true, 4);
        feathers.push({ kind: 'wing', pts: wing });
        const prim = [];
        for (let i = 0; i < 6; i++) {
          const u = i / 5;
          prim.push([[wx - 30 + 12 * u, wy + 4 + 3 * u], [wx - 90 - 10 * u, wy + 2 + 3 * u], [wx - 146 + 6 * u, wy + 1 + 1.5 * u]]);
        }
        feathers.push({ kind: 'prim', lines: prim });
        const cov = [];
        for (let row = 0; row < 3; row++) {
          for (let i = 0; i < 6 - row; i++) {
            const cx = wx + 38 - i * 20 - row * 10, cy = wy - 22 + row * 12 + i * 1.5;
            cov.push({ c: [cx, cy], w: 11 - row, h: 7 - row });
          }
        }
        feathers.push({ kind: 'cov', list: cov });
        feathers.push({ kind: 'carpal', pts: [[wx + 56, wy - 26], [wx + 20, wy - 36], [wx - 30, wy - 32]] });
        const mantle = [];
        for (let row = 0; row < 2; row++) {
          for (let i = 0; i < 5; i++) {
            mantle.push({ c: [bx + 60 - i * 22 - row * 11, by - bry * 0.78 + row * 12 + i * 2.2], w: 12, h: 8 });
          }
        }
        feathers.push({ kind: 'mantle', list: mantle });
        // down tufts clinging at feather tips
        const tufts = [];
        for (let i = 0; i < 16; i++) {
          const u = r();
          const p = [wx - 150 + 190 * u + r.range(-4, 4), wy + lerp(0, 18, r())];
          tufts.push([p, [p[0] - r.range(4, 9), p[1] + r.range(3, 8)], [p[0] + r.range(-3, 3), p[1] + r.range(6, 11)]]);
        }
        feathers.push({ kind: 'tufts', list: tufts });
        // short tail
        feathers.push({ kind: 'tail', pts: cr([[bx - brx * 0.82, by - 18], [bx - brx - 40, by - 30], [bx - brx - 44, by - 20], [bx - brx - 30, by - 8], [bx - brx * 0.84, by + 4]], true, 3) });
      }
      return { body, head, bodyC, neck, strands, inner, feathers };
    });

    GEO = G;
    return G;
  }

  // ===========================================================================
  // The chick
  // ===========================================================================

  // chick pose at time t: day index, pop scale, bill angle, gape, eye, fish-in-bill progress
  function chickPose(t) {
    const k = clamp(Math.floor(t * 2 + 1e-6) - 1, 0, 3);
    const c = CH[k];
    let pop = 1;
    if (k > 0) {
      const d = Math.floor((t - B[k]) * 12 + 1e-6);
      pop = d < 3 ? [1.07, 0.98, 1][d] : 1;
    }
    let bAng = BEG, gape = 0, eye = 1, fish = -1, bulge = 0, headDy = 0;
    const tw = L.onTwos(t);
    // opening peeps on 16ths
    if (t < B[0]) {
      const f = Math.floor(t * 24 + 1e-6);
      const on = f % 3 < 2;
      gape = on ? 0.45 : 0.08;
      bAng = BEG - (on ? 0.1 : 0);
    }
    // the hand-off in segment k
    const s = clamp(Math.floor((t - B[0]) * 2 + 1e-6), -1, 3);
    if (s >= 0) {
      const d = Math.floor((t - B[s]) * 12 + 1e-6);
      if (d <= 1) {
        gape = d === 0 ? 0.55 : 0.7;
        bAng = BEG - 0.08;
      } else if (d <= 4) {
        fish = [0.2, 0.52, 0.86][d - 2];
        gape = [0.5, 0.35, 0.18][d - 2];
        bAng = BEG - [0.22, 0.38, 0.3][d - 2];
        headDy = [-2, -5, -3][d - 2];
        bulge = d === 4 ? 0.6 : 0;
      } else {
        bulge = d === 5 ? 1 : d === 6 ? 0.5 : 0;
        bAng = BEG + 0.18;
        gape = 0;
      }
    }
    // blink on T 6.75
    if (t >= B_BLINK && t < B_BLINK + 2 * FR) eye = 0;
    void tw;
    return { k, c, pop, bAng, gape, eye, fish, bulge, headDy };
  }
  // world position of the begging bill tip for day k (the parent aims its bill here)
  function chickBillTip(k) {
    const c = CH[k];
    const [hx, hy, hr] = c.head;
    const f = dir(BEG);
    return [CHICK[0] + hx + f[0] * (hr - 3 + c.bill), CHICK[1] + hy + f[1] * (hr - 3 + c.bill)];
  }

  function drawChick(ctx, cp, G, bi) {
    const { k, c } = cp;
    const S = G.chick[k];
    const [bx, by, brx, bry, brot] = c.body;
    const [hx, hy0, hr] = c.head;
    const hy = hy0 + cp.headDy;
    const headPts = cp.headDy ? S.head.map((p) => [p[0], p[1] + cp.headDy]) : S.head;
    const down = P.downGrey;
    const pink = L.mix(P.downTan, P.legRed, 0.6);
    const seedK = sd('chick', k);

    ctx.save();
    ctx.translate(CHICK[0], CHICK[1]);
    ctx.scale(cp.pop, cp.pop);

    // legs and feet (pinkish, sturdier each day)
    {
      const lh = c.leg + 4;
      const feet = [[bx - brx * 0.12, 0], [bx + brx * 0.22, 1]];
      feet.forEach(([fx, fy], i) => {
        const top = [fx - 2, by + bry * 0.8];
        const kneeY = Math.min(fy - 2, by + bry * 0.8 + lh * 0.2);
        const leg = [top, [fx, Math.max(kneeY, fy - lh)], [fx + 1, fy - 2]];
        const p = new Path2D();
        taperStroke(p, leg, 5 + k * 1.4, 4 + k);
        fillPath(ctx, p, pink, i === 0 ? 0.85 : 1);
        L.inkPath(ctx, leg, { width: 1.6, color: P.inkSoft, seed: seedK + 40 + i, taper: [4, 4], wobble: 0.4 });
        // three toes forward (to the right), a short hind toe
        const toes = new Path2D();
        const tl = 12 + k * 4;
        for (const [a, l] of [[-0.12, 1], [0.12, 0.85], [0.35, 0.7]]) taperStroke(toes, [[fx, fy - 1], [fx + Math.cos(a) * tl * l, fy - 1 + Math.sin(a) * tl * l * 0.4]], 3.4 + k * 0.5, 1.4);
        taperStroke(toes, [[fx, fy - 1], [fx - tl * 0.35, fy]], 3, 1.2);
        fillPath(ctx, toes, pink);
        strokePath(ctx, toes, P.inkSoft, 0.9, 0.8);
      });
    }

    // short tail (day 16) sits behind the body
    for (const fe of S.feathers) {
      if (fe.kind !== 'tail') continue;
      L.inkPath(ctx, fe.pts, { closed: true, width: 2.4, fill: P.plumeShade, seed: seedK + 90, wobble: 0.6 });
      const p = new Path2D();
      for (let i = 0; i < 3; i++) taperStroke(p, [[bx - brx * 0.86, by - 12 + i * 6], [bx - brx - 36, by - 24 + i * 4]], 1.2, 0.4);
      fillPath(ctx, p, P.mantleDeep, 0.8);
    }

    // down fills
    const bodyP = S.body;
    fillPoly(ctx, bodyP, down);
    if (S.neck) fillPoly(ctx, S.neck.map((p) => [p[0], p[1] + (p[1] < hy0 + hr ? cp.headDy : 0)]), down);
    fillPoly(ctx, headPts, down);

    // throat bulge after the gulp
    if (cp.bulge > 0) {
      const f = dir(cp.bAng);
      const tx = hx + f[0] * hr * 0.2 + 4, ty = hy + hr * 0.85;
      L.inkPath(ctx, L.ellipsePts(tx, ty, 10 + 6 * k * 0.3, 7 * cp.bulge + 3, 20), { closed: true, width: 1.6, color: P.inkSoft, fill: down, seed: seedK + 71, wobble: 0.4 });
    }

    // shadow side: 45 degree hatching toward the lower right, a cross layer in the deepest part
    {
      const dens = (cx, cy, rx, ry) => (x, y) => clamp(((x - cx) / rx) * 0.55 + ((y - cy) / ry) * 0.75 + 0.05);
      L.crossHatch(ctx, S.bodyC, { spacing: 6.5, crossSpacing: 7, width: 1.25, color: P.inkSoft, alpha: 0.72, density: dens(bx, by, brx, bry), tone: 0.6, layers: 2, seed: seedK + 5, length: [10, 30] });
      L.hatch(ctx, headPts, { spacing: 7, width: 1.2, color: P.inkSoft, alpha: 0.6, density: dens(hx, hy, hr, hr), seed: seedK + 6, length: [8, 22] });
    }

    // speckles on the down (downSpeck), sparse on the older chicks
    L.stipple(ctx, S.bodyC, { spacing: 9 + k * 2, r: [1.0, 2.2], color: P.downSpeck, alpha: 0.85, density: k < 3 ? 0.55 : 0.3, seed: seedK + 7 });
    L.stipple(ctx, headPts, { spacing: 7.5 + k, r: [1.0, 2.0], color: P.downSpeck, alpha: 0.85, density: 0.6, seed: seedK + 8 });

    // down strands: inner flecks and outward wisps
    {
      const p = new Path2D();
      S.inner.forEach((ln, i) => taperStroke(p, ln.map(([x, y], j) => [x + jig(i, j, bi, 0.5), y + jig(j, i, bi, 0.5)]), 1.3, 0.3));
      fillPath(ctx, p, P.inkSoft, 0.55);
      const q = new Path2D();
      S.strands.forEach((ln, i) => {
        const pts = ln.map(([x, y], j) => [x + jig(i, j + 3, bi, 0.6), y + (y < hy0 + hr * 1.2 && Math.abs(x - hx) < hr * 1.3 ? cp.headDy : 0) + jig(j, i + 5, bi, 0.6)]);
        taperStroke(q, pts, 1.5, 0.3);
      });
      fillPath(ctx, q, P.ink, 0.7);
    }

    // outlines: body outside the head and neck, head outside the body, neck sides
    {
      ctx.save();
      clipOutside(ctx, S.neck ? [headPts, S.neck] : [headPts]);
      L.inkPath(ctx, bodyP, { closed: true, width: 3.4, seed: seedK + 1, wobble: 0.8, tremble: 0.4, double: { offset: 3.5, width: 0.3, alpha: 0.4, from: 0.1, to: 0.45 } });
      ctx.restore();
      ctx.save();
      clipOutside(ctx, S.neck ? [S.bodyC, S.neck] : [S.bodyC]);
      L.inkPath(ctx, headPts, { closed: true, width: 3.2, seed: seedK + 2, wobble: 0.7, tremble: 0.4 });
      ctx.restore();
      if (S.neck) {
        ctx.save();
        clipOutside(ctx, [headPts, S.bodyC]);
        L.inkPath(ctx, S.neck, { closed: true, width: 3, seed: seedK + 3, wobble: 0.7 });
        ctx.restore();
      }
    }

    // feathers: pin feathers (day 11), grey juvenile feathers with down tufts (day 16)
    for (const fe of S.feathers) {
      if (fe.kind === 'stub') {
        fillPoly(ctx, fe.pts, P.plumeShade, 0.8);
        L.inkPath(ctx, fe.pts.slice(3, 15), { width: 1.6, color: P.inkSoft, seed: seedK + 85, wobble: 0.5 });
      } else if (fe.kind === 'pin') {
        const p = new Path2D();
        taperStroke(p, [fe.base, mix2(fe.base, fe.tip, 0.5), fe.tip], fe.w, fe.w * 0.35);
        fillPath(ctx, p, P.mantleDeep);
        strokePath(ctx, p, P.capBlack, 1.1, 0.9);
        // the feather breaking out of the sheath tip
        const q = new Path2D();
        const d = sub(fe.tip, fe.base), l = Math.hypot(d[0], d[1]);
        const u = mul(d, 1 / l);
        taperStroke(q, [fe.tip, add(fe.tip, mul(u, 7))], fe.w * 0.8, 0.6);
        fillPath(ctx, q, P.mantleGrey);
      } else if (fe.kind === 'wing') {
        L.inkPath(ctx, fe.pts, { closed: true, width: 3, fill: P.mantleGrey, seed: seedK + 80, wobble: 0.8 });
        L.hatch(ctx, fe.pts, { spacing: 6, width: 1.2, color: P.mantleDeep, alpha: 0.75, density: (x, y) => clamp((y - (by - 30)) / 40), seed: seedK + 81, length: [10, 26] });
      } else if (fe.kind === 'prim') {
        const p = new Path2D();
        fe.lines.forEach((ln) => taperStroke(p, ln, 1.6, 0.5));
        fillPath(ctx, p, P.mantleDeep, 0.9);
      } else if (fe.kind === 'cov') {
        for (const cv of fe.list) {
          const arc = [];
          for (let i = 0; i <= 8; i++) {
            const a = lerp(0.1, Math.PI - 0.1, i / 8);
            arc.push([cv.c[0] - Math.cos(a) * cv.w, cv.c[1] + Math.sin(a) * cv.h]);
          }
          const p = new Path2D();
          taperStroke(p, arc, 2.4, 1.4);
          fillPath(ctx, p, P.juvFringe);
          const q = new Path2D();
          taperStroke(q, arc.map(([x, y]) => [x, y - 2]), 1, 0.6);
          fillPath(ctx, q, P.inkSoft, 0.7);
        }
      } else if (fe.kind === 'carpal') {
        const p = new Path2D();
        taperStroke(p, cr(fe.pts, false, 4), 7, 3);
        fillPath(ctx, p, P.carpalBar, 0.9);
      } else if (fe.kind === 'mantle') {
        for (const mv of fe.list) {
          const pts = L.ellipsePts(mv.c[0], mv.c[1], mv.w, mv.h, 14);
          fillPoly(ctx, pts, P.mantleGrey);
          const arc = [];
          for (let i = 0; i <= 7; i++) {
            const a = lerp(0.2, Math.PI - 0.2, i / 7);
            arc.push([mv.c[0] - Math.cos(a) * mv.w, mv.c[1] + Math.sin(a) * mv.h]);
          }
          const p = new Path2D();
          taperStroke(p, arc, 2.6, 1.2);
          fillPath(ctx, p, P.juvFringe);
          const q = new Path2D();
          taperStroke(q, arc.map(([x, y]) => [x, y + 1.6]), 1.1, 0.5);
          fillPath(ctx, q, P.ink, 0.6);
        }
      } else if (fe.kind === 'tufts') {
        const p = new Path2D();
        fe.list.forEach((ln, i) => taperStroke(p, ln.map(([x, y], j) => [x + jig(i, j, bi, 0.5), y]), 2.6, 0.5));
        fillPath(ctx, p, down);
        strokePath(ctx, p, P.inkSoft, 0.7, 0.6);
      }
    }

    // a dark rear-crown smudge begins on day 16
    if (k === 3) {
      const sm = L.ellipsePts(hx - hr * 0.35, hy - hr * 0.45, hr * 0.55, hr * 0.32, 18, -0.4);
      L.hatch(ctx, sm, { spacing: 3.5, width: 1.2, color: P.capBlack, alpha: 0.6, seed: seedK + 12, length: [6, 14], angle: -0.3 });
    }

    // eye: big and dark, a highlight; a closed lid on the blink
    {
      const f = dir(cp.bAng);
      const up = [f[1], -f[0]];
      const er = hr * lerp(0.2, 0.15, k / 3);
      const ec = [hx + f[0] * hr * 0.2 + up[0] * hr * 0.2, hy + f[1] * hr * 0.2 + up[1] * hr * 0.2];
      if (cp.eye) {
        ctx.save();
        ctx.fillStyle = P.capBlack;
        ctx.beginPath();
        ctx.arc(ec[0], ec[1], er, 0, TAU);
        ctx.fill();
        ctx.fillStyle = P.plumeWhite;
        ctx.beginPath();
        ctx.arc(ec[0] - er * 0.3, ec[1] - er * 0.35, er * 0.3, 0, TAU);
        ctx.fill();
        ctx.restore();
        L.inkCircle(ctx, ec[0], ec[1], er + 1.5, { width: 1.4, color: P.inkSoft, seed: seedK + 20, wobble: 0.3, alpha: 0.8 });
      } else {
        const lid = [];
        for (let i = 0; i <= 8; i++) {
          const a = lerp(0.15, Math.PI - 0.15, i / 8);
          lid.push([ec[0] - Math.cos(a) * er * 1.1, ec[1] + Math.sin(a) * er * 0.5]);
        }
        L.inkPath(ctx, lid, { width: 2.6, color: P.capBlack, seed: seedK + 21, taper: [3, 3], wobble: 0.3 });
      }
    }

    // bill: pinkish with a dark tip, egg tooth on day 1; the gape opens on peeps and hand-offs
    {
      const f = dir(cp.bAng);
      const up = [f[1], -f[0]];
      const base = [hx + f[0] * (hr - 5) + up[0] * -hr * 0.1, hy + f[1] * (hr - 5) + up[1] * -hr * 0.1];
      const bl = c.bill + 4;
      const dep = hr * 0.34;
      const g = cp.gape * 0.5;
      const fu = dir(cp.bAng - g * 0.5), fl = dir(cp.bAng + g * 0.5);
      const upU = [fu[1], -fu[0]], upL = [fl[1], -fl[0]];
      const upper = [add(base, mul(upU, dep * 0.5)), add(add(base, mul(fu, bl * 0.55)), mul(upU, dep * 0.28)), add(base, mul(fu, bl)), add(add(base, mul(fu, bl * 0.55)), mul(upU, -dep * 0.05)), add(base, mul(upU, -dep * 0.05))];
      const lower = [add(base, mul(upL, -dep * 0.05)), add(add(base, mul(fl, bl * 0.5)), mul(upL, -dep * 0.02)), add(base, mul(fl, bl * 0.9)), add(add(base, mul(fl, bl * 0.5)), mul(upL, -dep * 0.3)), add(base, mul(upL, -dep * 0.5))];
      // the fish goes in head first: its head end inside the gape, the tail out past the bill
      if (cp.fish >= 0) {
        const mouth = add(base, mul(f, bl * 0.2));
        const eelDir = cp.bAng + Math.PI; // head points into the mouth
        const ctr = add(mouth, mul(f, EEL_LEN * (0.5 - cp.fish)));
        ctx.save();
        clipOutside(ctx, [headPts]);
        drawEel(ctx, ctr, eelDir, 1, seedK + 30 + Math.round(cp.fish * 10), bi);
        ctx.restore();
      }
      if (cp.gape > 0.1) {
        const mouthPts = [add(base, mul(upU, -dep * 0.05)), add(base, mul(fu, bl * 0.9)), add(base, mul(fl, bl * 0.85))];
        fillPoly(ctx, mouthPts, P.billDeep, 0.8);
      }
      L.inkPath(ctx, lower, { closed: true, width: 1.8, fill: pink, seed: seedK + 23, taper: [2, 2], wobble: 0.3, tremble: 0.2, smooth: false });
      L.inkPath(ctx, upper, { closed: true, width: 2, fill: pink, seed: seedK + 22, taper: [2, 2], wobble: 0.3, tremble: 0.2, smooth: false });
      // dark tip
      const tip = add(base, mul(fu, bl));
      const tp = [tip, add(add(base, mul(fu, bl * 0.72)), mul(upU, dep * 0.16)), add(add(base, mul(fu, bl * 0.72)), mul(upU, -dep * 0.04))];
      fillPoly(ctx, tp, k === 3 ? P.juvBill : P.inkSoft, 0.85);
      if (k === 0) {
        // egg tooth: a small pale point on the upper bill tip
        const et = add(add(base, mul(fu, bl * 0.86)), mul(upU, dep * 0.2));
        ctx.save();
        ctx.fillStyle = P.plumeWhite;
        ctx.beginPath();
        ctx.arc(et[0], et[1], 2.4, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.restore();
  }

  // ===========================================================================
  // The sand eel: slim, green-grey back, silver belly, jutting lower jaw, long low dorsal, forked tail
  // ===========================================================================

  function drawEel(ctx, c, ang, alpha, seed, bi) {
    const f = dir(ang), n = [-f[1], f[0]];
    const Lh = EEL_LEN / 2;
    const at = (u, v) => [c[0] + f[0] * u + n[0] * v, c[1] + f[1] * u + n[1] * v];
    // body from snout (u = +Lh) to tail peduncle (u = -Lh + 8)
    const top = [], bot = [];
    for (let i = 0; i <= 12; i++) {
      const s = i / 12;
      const u = lerp(Lh, -Lh + 9, s);
      const w = 6 * Math.sin(Math.min(1, s * 1.25) * Math.PI * 0.5) * (1 - 0.55 * s) + 0.6;
      top.push(at(u, -w));
      bot.push(at(u, w * 0.95));
    }
    const snout = at(Lh + 2.5, 1.2); // the lower jaw juts forward
    const tailA = at(-Lh - 3, -4.5), tailM = at(-Lh + 2, 0), tailB = at(-Lh - 3, 4.5);
    const outline = [snout].concat(top, [tailA, tailM, tailB], bot.slice().reverse());
    ctx.save();
    ctx.globalAlpha *= alpha;
    fillPoly(ctx, outline, P.sandEel);
    // green-grey back
    const back = [snout].concat(top, bot.slice().reverse().map((p, i, arr) => mix2(p, top[arr.length - 1 - i], 0.62)));
    fillPoly(ctx, back, P.sandEelBack);
    // long low dorsal fin
    const fin = [];
    for (let i = 0; i <= 8; i++) fin.push(at(lerp(Lh * 0.45, -Lh + 10, i / 8), -3.6 - 1.4 * Math.sin((i / 8) * Math.PI)));
    const fp = new Path2D();
    taperStroke(fp, fin, 1.3, 0.5);
    fillPath(ctx, fp, P.sandEelBack);
    L.inkPath(ctx, outline, { closed: true, width: 1.6, seed, taper: [2, 2], wobble: 0.3, tremble: 0.15, boilAmp: 0.4, smooth: false });
    // eye and gill line
    const e = at(Lh - 6, -1.3);
    ctx.fillStyle = P.ink;
    ctx.beginPath();
    ctx.arc(e[0], e[1], 1.3, 0, TAU);
    ctx.fill();
    const g = new Path2D();
    taperStroke(g, [at(Lh - 11, -3), at(Lh - 12.5, 0), at(Lh - 11, 3)], 0.9, 0.5);
    fillPath(ctx, g, P.inkSoft);
    // a silver glint along the flank
    const gl = new Path2D();
    taperStroke(gl, [at(Lh - 14, 1.2 + jig(1, 2, bi, 0.2)), at(0, 1.6), at(-Lh + 14, 1.0)], 1.1, 0.4);
    fillPath(ctx, gl, P.foam, 0.9);
    ctx.restore();
  }

  // ===========================================================================
  // The parent: side view facing left, 2.0 px per mm, origin at the feet
  // ===========================================================================

  // body outline in body-local px (x forward is negative), open at the neck: throat base ... nape base
  const BODY_L = [
    [-148, -116], [-140, -96], [-120, -75], [-86, -57], [-42, -45], [8, -42], [48, -47], [80, -59], [102, -74], [112, -87],
    [116, -106], [80, -121], [22, -134], [-44, -142], [-94, -149], [-120, -151],
  ];
  const HEAD_L = [-162, -170]; // default head centre
  const SHOULDER_N = [-40, -132], SHOULDER_F = [-62, -140];
  // wing poses in body-relative angles (arm from shoulder, hand from wrist), projected half-span in px
  const WING = {
    up: { near: [-1.75, -1.22, 720, 150], far: [-1.97, -1.55, 630, 140] },
    half: { near: [-1.05, -0.4, 560, 145], far: [-1.3, -0.78, 500, 135] },
    mid: { near: [-0.5, -0.1, 430, 130], far: [-0.78, -0.4, 380, 120] },
    down: { near: [0.72, 1.18, 310, 120], far: [-1.45, -1.05, 420, 125] },
  };

  function parentState(t) {
    const tw = L.onTwos(t);
    if (t < B[0]) {
      // parent 1 descends from the upper right; its shadow crosses the pebbles
      const n = Math.min(5, Math.floor(tw * 12 + 1e-6));
      const u = E.outQuad(clamp(tw / 0.5 + 1 / 12));
      const pos = bez(DESC[0][0], DESC[0][1], TD, u);
      return {
        x: pos[0], y: pos[1] - (1 - u) * 20,
        th: lerp(-0.08, 0.14, n / 5),
        rear: lerp(-0.08, 0.14, n / 5) + 0.06,
        wing: ['mid', 'down', 'mid', 'up', 'half', 'up'][n],
        legs: n >= 4 ? 'land' : 'tuck', spread: n >= 4 ? 0.8 : 0.3, head: null, fish: true, flying: true,
      };
    }
    const k = clamp(Math.floor((t - B[0]) * 2 + 1e-6), 0, 3);
    const d = Math.floor((t - B[k]) * 12 + 1e-6);
    const tgt = add(chickBillTip(k), [6, -8]);
    const phi = PHI_FEED[k];
    const f = dir(phi), up = [-f[1], f[0]];
    // head centre that puts the bill tip on the target
    const feedC = sub(sub(tgt, mul(f, BILL_LEN + HEAD_R * 0.82)), mul(up, -HEAD_R * 0.12));
    const base = { x: TD[0], y: TD[1], fish: false, flying: false, spread: 0 };
    if (d === 0) return Object.assign(base, { th: 0.16, rear: 0.3, wing: 'up', legs: 'land', spread: 1, head: null, fish: true });
    if (d === 1) {
      const th = lerp(0.16, TH_FEED[k], 0.6);
      const defC = xfPt({ x: TD[0], y: TD[1], th }, HEAD_L);
      return Object.assign(base, { th, rear: lerp(0.3, REAR, 0.6), wing: 'half', legs: 'stand', head: { c: mix2(defC, feedC, 0.8), bAng: lerp(Math.PI + 0.1 + th, phi, 0.8) }, fish: true });
    }
    if (k < 3) {
      if (d < 4) return Object.assign(base, { th: TH_FEED[k], rear: REAR, wing: 'fold', legs: 'stand', head: { c: feedC, bAng: phi } });
      return Object.assign(base, { th: TH_FEED[k] + 0.05, rear: REAR + 0.04, wing: 'fold', legs: 'stand', head: { c: add(feedC, [16, -30]), bAng: phi + 0.3 } });
    }
    // parent 4: a crouch, then off to the upper left
    if (d === 2) return Object.assign(base, { th: -0.06, rear: REAR + 0.2, wing: 'half', legs: 'stand', head: { c: add(xfPt({ x: TD[0], y: TD[1], th: -0.06 }, HEAD_L), [16, -40]), bAng: Math.PI + 0.32 } });
    const u = clamp((d - 2) / 3);
    const pos = bez(LIFT[0], LIFT[1], LIFT[2], E.outQuad(u));
    return { x: pos[0], y: pos[1], th: 0.32, rear: 0.2, wing: ['down', 'up', 'mid'][Math.min(2, d - 3)], legs: d === 3 ? 'land' : 'tuck', spread: 0.6, head: null, fish: false, flying: true };
  }

  function xfPt(ps, p) {
    const c = Math.cos(ps.th), s = Math.sin(ps.th);
    return [ps.x + p[0] * c - p[1] * s, ps.y + p[0] * s + p[1] * c];
  }

  // spread wing geometry in world px
  function wingGeom(sh, arm, hand, span, chord) {
    const a = dir(arm), h = dir(hand);
    let na = [-a[1], a[0]];
    if (na[0] < 0 || (Math.abs(na[0]) < 0.05 && na[1] < 0)) na = mul(na, -1);
    let nh = [-h[1], h[0]];
    if (nh[0] * na[0] + nh[1] * na[1] < 0) nh = mul(nh, -1);
    const W = add(sh, mul(a, 0.4 * span));
    const N = 30;
    const le = [], te = [], cv = [], nrm = [], ch = [];
    for (let i = 0; i <= N; i++) {
      const s = i / N;
      const p = s <= 0.4 ? add(sh, mul(a, s * span)) : add(W, mul(h, (s - 0.4) * span));
      // leading edge bows forward a touch at the wrist
      const bowF = Math.sin(clamp(s / 0.7) * Math.PI) * 0.04 * span;
      const bl = clamp((s - 0.34) / 0.12);
      let n = [lerp(na[0], nh[0], bl), lerp(na[1], nh[1], bl)];
      const nl = Math.hypot(n[0], n[1]);
      n = mul(n, 1 / nl);
      const pp = add(p, mul(n, -bowF));
      const c = s <= 0.4 ? chord * lerp(1, 0.94, s / 0.4) : chord * 0.94 * (1 - Math.pow((s - 0.4) / 0.6, 1.7)) + (s < 1 ? 2 : 0);
      le.push(pp);
      te.push(add(pp, mul(n, c)));
      cv.push(add(pp, mul(n, c * 0.42)));
      nrm.push(n);
      ch.push(c);
    }
    return { le, te, cv, nrm, ch, N, W, sh };
  }

  function drawSpreadWing(ctx, g, side, seed, bi) {
    const outline = g.le.concat(g.te.slice().reverse());
    if (side === 'far') {
      // upper surface: grey coverts in scalloped rows, 10 fanned primaries and 14 secondaries in
      // mantleDeep edges, a white trailing edge on the secondaries, a thin dark edge on the primaries
      L.inkPath(ctx, outline, { closed: true, width: 3, alpha: 0.85, fill: P.mantleGrey, seed, wobble: 1.2, taper: [6, 10] });
      const i0 = Math.round(g.N * 0.42);
      // shadow on the trailing half, lighter than a slab
      const shade = g.cv.concat(g.te.slice().reverse());
      L.hatch(ctx, shade, { spacing: 8, width: 1.2, color: P.mantleDeep, alpha: 0.5, seed: seed + 1, length: [12, 30] });
      const p = new Path2D();
      for (let row = 0; row < 3; row++) {
        const f0 = [0.18, 0.32, 0.46][row];
        for (let i = 1; i < g.N * (row === 2 ? 0.45 : 0.8); i++) {
          const a = add(g.le[i], mul(g.nrm[i], g.ch[i] * f0));
          const b = add(g.le[i + 1], mul(g.nrm[i + 1], g.ch[i + 1] * f0));
          taperStroke(p, [a, add(mix2(a, b, 0.5), mul(g.nrm[i], 3)), b], 1.1, 0.5);
        }
      }
      for (let j = 0; j < 10; j++) {
        const u = j / 9;
        const it = Math.min(g.N - 1, Math.round(lerp(i0, g.N - 1, u)));
        const ib = Math.round(lerp(i0 - 2, g.N * 0.78, u));
        const a = add(g.le[ib], mul(g.nrm[ib], g.ch[ib] * 0.3));
        taperStroke(p, [a, mix2(a, g.te[it], 0.6), g.te[it]], 1.6, 0.7);
      }
      for (let j = 0; j < 14; j++) {
        const i = Math.round(lerp(0.03, 0.4, j / 13) * g.N);
        taperStroke(p, [add(g.le[i], mul(g.nrm[i], g.ch[i] * 0.46)), add(g.te[i], mul(g.nrm[i], -1))], 1.4, 0.8);
      }
      fillPath(ctx, p, P.mantleDeep, 0.95);
      const w = new Path2D();
      taperStroke(w, g.le.slice(1, Math.round(g.N * 0.7)).map((q, i) => add(q, mul(g.nrm[i + 1], 4))), 3, 1);
      taperStroke(w, g.te.slice(0, i0 + 1).map((q, i) => add(q, mul(g.nrm[i], -3))), 4, 3);
      fillPath(ctx, w, P.plumeWhite, 0.9);
      const e = new Path2D();
      taperStroke(e, g.te.slice(i0), 1.2, 2.6);
      fillPath(ctx, e, P.capBlack, 0.7);
      return;
    }
    // under surface: white coverts, translucent primaries and secondaries, thin black trailing edge
    L.inkPath(ctx, outline, { closed: true, width: 3.2, fill: P.primaryGlow, seed, wobble: 1.2, taper: [6, 10] });
    const cvPoly = g.le.slice(0, Math.round(g.N * 0.9)).concat(g.cv.slice(0, Math.round(g.N * 0.9)).reverse());
    fillPoly(ctx, cr(cvPoly, true, 2), P.plumeWhite);
    // covert rows: short scalloped arcs
    {
      const p = new Path2D();
      for (let row = 0; row < 2; row++) {
        for (let i = 1; i < g.N * 0.85; i += 1) {
          const f0 = row === 0 ? 0.42 : 0.24;
          const a = add(g.le[i], mul(g.nrm[i], g.ch[i] * f0));
          const b = add(g.le[i + 1], mul(g.nrm[i + 1], g.ch[i + 1] * f0));
          const m = add(mix2(a, b, 0.5), mul(g.nrm[i], 3.5));
          taperStroke(p, [a, m, b], 1.2, 0.5);
        }
      }
      fillPath(ctx, p, P.inkSoft, 0.55);
    }
    // plumeShade tone and light hatching over the trailing half near the body (shadow)
    {
      const shade = g.cv.slice(0, Math.round(g.N * 0.5)).concat(g.te.slice(0, Math.round(g.N * 0.5)).reverse());
      fillPoly(ctx, shade, P.plumeShade, 0.55);
      L.hatch(ctx, shade, { spacing: 9, width: 1.2, color: P.mantleDeep, alpha: 0.55, seed: seed + 3, length: [12, 34] });
    }
    // flight feathers: 10 primaries fanned from the hand, 14 secondaries along the arm
    {
      const p = new Path2D();
      const i0 = Math.round(g.N * 0.42);
      for (let j = 0; j < 10; j++) {
        const u = j / 9;
        const it = Math.min(g.N - 1, Math.round(lerp(i0, g.N - 1, u)));
        const ib = Math.round(lerp(i0 - 2, g.N * 0.78, u));
        const a = add(g.le[ib], mul(g.nrm[ib], g.ch[ib] * 0.35));
        taperStroke(p, [a, mix2(a, g.te[it], 0.6), g.te[it]], 1.5, 0.7);
      }
      for (let j = 0; j < 14; j++) {
        const s = lerp(0.03, 0.4, j / 13);
        const i = Math.round(s * g.N);
        taperStroke(p, [g.cv[i], add(g.te[i], mul(g.nrm[i], -1))], 1.3, 0.8);
      }
      fillPath(ctx, p, P.mantleDeep, 0.95);
      // shafts: fine pale lines along the primaries
      const q = new Path2D();
      for (let j = 0; j < 10; j += 2) {
        const u = j / 9;
        const it = Math.min(g.N - 1, Math.round(lerp(i0, g.N - 1, u)));
        const ib = Math.round(lerp(i0 - 2, g.N * 0.78, u));
        const a = add(g.le[ib], mul(g.nrm[ib], g.ch[ib] * 0.45));
        taperStroke(q, [a, mix2(a, g.te[it], 0.92)], 0.9, 0.3);
      }
      fillPath(ctx, q, P.plumeWhite, 0.9);
    }
    // thin neat black trailing edge on the primaries (4 px at this scale)
    L.inkPath(ctx, g.te.slice(Math.round(g.N * 0.42)), { width: 4, color: P.capBlack, seed: seed + 5, taper: [10, 20], wobble: 0.6 });
    // outline over everything, doubled on the leading edge
    L.inkPath(ctx, g.le, { width: 5, seed: seed + 6, wobble: 1.2, taper: [8, 18], double: { offset: 3.5, width: 0.3, alpha: 0.4, from: 0.15, to: 0.6 } });
  }

  function drawParent(ctx, ps, G, bi) {
    const X = (p) => xfPt(ps, p);
    const lift = ps.flying ? 0 : ps.legs === 'land' ? -2 : 21; // standing: sits on its belly, a stub of tarsus
    const psB = lift ? Object.assign({}, ps, { y: ps.y + lift }) : ps;
    const XB = (p) => xfPt(psB, p);
    const seedP = sd('parent');
    const spread = ps.wing !== 'fold' ? WING[ps.wing] : null;

    // --- far wing (behind everything)
    if (spread) {
      const [arm, hand, span, chord] = spread.far;
      drawSpreadWing(ctx, wingGeom(XB(SHOULDER_F), arm + ps.th, hand + ps.th, span, chord), 'far', seedP + 100, bi);
    }

    // --- legs: very short, red; the far one first
    const drawLeg = (dx, far) => {
      if (ps.legs === 'tuck') {
        const fp = XB([dx - 4, -46]);
        const p = new Path2D();
        taperStroke(p, [fp, add(fp, [22, 4])], 7, 3);
        fillPath(ctx, p, P.legRed, far ? 0.75 : 1);
        strokePath(ctx, p, P.ink, 1.2, 0.8);
        return;
      }
      const hip = XB([dx - 6, -44]);
      const foot = [ps.x + dx - 4, ps.y];
      const land = ps.legs === 'land';
      const knee = land ? mix2(hip, foot, 0.5) : add(mix2(hip, foot, 0.5), [3, 0]);
      const p = new Path2D();
      taperStroke(p, [hip, knee, foot], 7.5, 5.5);
      // webbed foot: three toes forward (left), a small hind toe
      const toes = [[-34, 1], [-30, -3], [-26, 3]];
      for (const [tx, ty] of toes) taperStroke(p, [foot, add(foot, [tx * 0.5, ty * 0.5]), add(foot, [tx, ty])], 5, 2);
      taperStroke(p, [foot, add(foot, [9, -2])], 4, 1.5);
      const web = [foot, add(foot, [-33, 1]), add(foot, [-27, 3]), add(foot, [-29, -2])];
      ctx.save();
      if (far) ctx.globalAlpha *= 0.8;
      fillPoly(ctx, web, P.legRed);
      fillPath(ctx, p, far ? P.billDeep : P.legRed);
      strokePath(ctx, p, P.ink, 1.5, 0.9);
      ctx.restore();
    };
    drawLeg(16, true);

    // --- tail: white, deeply forked, grey outer webs, streamers past the folded wingtips
    const TBt = XB([116, -106]), TBb = XB([110, -84]);
    const TB = mix2(TBt, TBb, 0.5);
    const dr = dir(ps.rear), nr = [-dr[1], dr[0]];
    const T = (a, b) => add(TB, add(mul(dr, a), mul(nr, b)));
    const sp = ps.spread;
    const up = T(276, -6 - 34 * sp), lo = T(258 - 10 * sp, 9 + 34 * sp);
    const tail = [
      TBt, T(70, -15 - 6 * sp), T(160, -12 - 20 * sp), up, T(200, -5 - 22 * sp), T(140, 0 - 8 * sp), T(146, 2 + 6 * sp), T(190, 4 + 22 * sp), lo, T(150, 12 + 20 * sp), T(70, 15 + 6 * sp), TBb,
    ];
    L.inkPath(ctx, tail, { closed: true, width: 3, fill: P.plumeWhite, seed: seedP + 10, wobble: 0.8, taper: [4, 8], smooth: false });
    {
      // grey outer webs along the streamers, feather rachis lines on the fork
      const p = new Path2D();
      taperStroke(p, [T(90, -13 - 8 * sp), T(180, -10 - 22 * sp), mix2(T(200, -9 - 24 * sp), up, 0.6)], 3.2, 0.8);
      taperStroke(p, [T(96, 13 + 8 * sp), T(180, 7 + 22 * sp), mix2(T(185, 8 + 24 * sp), lo, 0.6)], 2.6, 0.8);
      fillPath(ctx, p, P.mantleGrey);
      const q = new Path2D();
      for (let i = 0; i < 5; i++) taperStroke(q, [T(18, lerp(-10, 10, i / 4)), T(lerp(128, 150, Math.abs(i - 2) / 2), lerp(-8, 8, i / 4) * (1 + sp))], 1.1, 0.4);
      fillPath(ctx, q, P.plumeShade);
      strokePath(ctx, q, P.inkFaint, 0.5, 0.6);
    }

    // --- body: breastGrey underparts, grey mantle, white vent and throat
    const bodyPts = BODY_L.map(XB);
    const bodyClosed = cr(bodyPts, true, 3);
    fillPoly(ctx, bodyClosed, P.breastGrey);
    ctx.save();
    clipInside(ctx, bodyClosed);
    // white vent and undertail
    fillPoly(ctx, L.ellipsePts(...XB([98, -76]), 22, 12, 20, ps.th + 0.6), P.plumeWhite, 0.8);
    // pale throat running into the grey breast
    fillPoly(ctx, L.ellipsePts(...XB([-140, -118]), 26, 30, 20, ps.th), P.plumeWhite);
    // grey mantle band along the back
    fillPoly(ctx, [XB([-120, -160]), XB([116, -130]), XB([116, -108]), XB([30, -118]), XB([-50, -126]), XB([-112, -134])], P.mantleGrey);
    // shadow on the belly: flat plumeShade and hatching, a cross layer low down
    L.crossHatch(ctx, bodyClosed, {
      spacing: 7, crossSpacing: 7, width: 1.3, color: P.mantleDeep, alpha: 0.7, tone: 0.55, layers: 2, seed: seedP + 20, length: [12, 36],
      angle: -Math.PI / 4, density: (x, y) => { const q = sub([x, y], XB([0, -60])); const c = Math.cos(ps.th), s = Math.sin(ps.th); return clamp(((-q[0] * s + q[1] * c) + 8) / 34); },
    });
    // contour hatching across the flank (cylinder form)
    {
      const p = new Path2D();
      for (let i = 0; i < 12; i++) {
        const x = lerp(-110, 90, i / 11);
        const a = XB([x + 4, -60 + Math.abs(x) * 0.06]), m = XB([x - 2, -53]), b = XB([x - 6, -46 + Math.abs(x) * 0.02]);
        taperStroke(p, [a, m, b], 1.3, 0.4);
      }
      fillPath(ctx, p, P.mantleDeep, 0.6);
    }
    ctx.restore();
    // outline, open at the neck
    L.inkPath(ctx, bodyPts, { width: 5, seed: seedP + 21, wobble: 1.2, taper: [10, 14], double: { offset: 3.5, width: 0.3, alpha: 0.4, from: 0.08, to: 0.4 } });

    // --- folded wing along the back (standing), wingtips short of the streamers
    if (!spread) {
      const S0 = XB([-84, -128]);
      const wt = T(222, -12);
      const upperE = [S0, XB([-30, -146]), XB([60, -142]), XB([118, -126]), T(90, -18), T(170, -16), wt];
      const lowerE = [T(190, -6), T(120, 4), T(40, 14), XB([60, -96]), XB([-10, -94]), XB([-66, -106])];
      const wing = cr(upperE.concat(lowerE), true, 4);
      L.inkPath(ctx, wing, { closed: true, width: 4, fill: P.mantleGrey, seed: seedP + 30, wobble: 1.0, taper: [8, 12] });
      ctx.save();
      clipInside(ctx, wing);
      // primaries stacked toward the tip, a little darker
      const pr = [T(20, 10), T(120, 0), wt];
      fillPoly(ctx, cr([T(0, -14), T(150, -12), wt, T(170, 0), T(40, 18)], true, 3), P.mantleDeep, 0.35);
      const p = new Path2D();
      for (let i = 0; i < 5; i++) {
        const o = i * 4.2 - 6;
        taperStroke(p, [add(pr[0], mul(nr, o)), add(pr[1], mul(nr, o * 0.7)), add(mix2(pr[1], wt, 0.9), mul(nr, o * 0.3))], 1.4, 0.5);
      }
      // secondary and covert edges
      for (let i = 0; i < 9; i++) {
        const x = lerp(-60, 90, i / 8);
        taperStroke(p, [XB([x, -120]), XB([x + 10, -106]), XB([x + 12, -97])], 1.3, 0.6);
      }
      fillPath(ctx, p, P.mantleDeep, 0.9);
      // lower half in shadow: 45 degree hatching
      L.hatch(ctx, wing, {
        spacing: 6, width: 1.3, color: P.mantleDeep, alpha: 0.7, seed: seedP + 31, length: [12, 34],
        density: (x, y) => { const q = sub([x, y], XB([40, -120])); const c = Math.cos(ps.th), s = Math.sin(ps.th); return clamp(((-q[0] * s + q[1] * c)) / 22); },
      });
      // white tertial crescents and scapular tips
      const w = new Path2D();
      for (let i = 0; i < 4; i++) {
        const a = XB([lerp(-20, 80, i / 3), -100 + i * 1.5]);
        const b = XB([lerp(-2, 100, i / 3), -97 + i * 1.5]);
        taperStroke(w, [a, add(mix2(a, b, 0.5), [0, 3]), b], 3.2, 1.2);
      }
      for (let i = 0; i < 5; i++) {
        const a = XB([lerp(-70, 20, i / 4), -130]);
        taperStroke(w, [a, add(a, [14, 4])], 2.4, 0.8);
      }
      fillPath(ctx, w, P.plumeWhite, 0.95);
      ctx.restore();
    }

    // --- neck and head
    const head = ps.head || { c: XB(HEAD_L), bAng: Math.PI + 0.08 + ps.th };
    const hc = head.c;
    const fh = dir(head.bAng), uph = [-fh[1], fh[0]];
    const HP = (u, v) => add(hc, add(mul(fh, u * HEAD_R), mul(uph, v * HEAD_R)));
    const nape = XB([-120, -151]), throat = XB([-148, -116]);
    const dors = HP(-0.9, 0.3), vent = HP(-0.05, -0.99);
    const neckPoly = cr([nape, mix2(nape, dors, 0.5), dors, hc, vent, mix2(throat, vent, 0.5), throat, XB([-110, -120])], true, 3);
    fillPoly(ctx, neckPoly, P.plumeWhite);
    const nshade = [mix2(throat, vent, 0.1), mix2(throat, vent, 0.9), HP(0.1, -0.7), XB([-128, -126])];
    L.hatch(ctx, nshade, { spacing: 8, width: 1.2, color: P.mantleDeep, alpha: 0.5, seed: seedP + 40, length: [8, 20] });
    L.inkPath(ctx, [nape, add(mix2(nape, dors, 0.5), mul(uph, 3)), dors], { width: 4, seed: seedP + 41, wobble: 0.6, taper: [6, 6] });
    L.inkPath(ctx, [vent, add(mix2(throat, vent, 0.5), mul(uph, -3)), throat], { width: 4, seed: seedP + 42, wobble: 0.6, taper: [6, 6] });
    // head disc
    const headPts = [];
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * TAU;
      headPts.push(HP(Math.cos(a), Math.sin(a)));
    }
    fillPoly(ctx, headPts, P.plumeWhite);
    // black cap from the bill base over the crown to the nape; the eye sits in its lower edge
    const cap = [];
    for (let i = 0; i <= 20; i++) {
      const a = lerp(6, 196, i / 20) * DEG;
      cap.push(HP(Math.cos(a) * 1.02, Math.sin(a) * 1.02));
    }
    cap.push(HP(-0.95, -0.12), HP(-0.55, -0.06), HP(0.0, -0.02), HP(0.45, 0.04), HP(0.9, 0.02));
    fillPoly(ctx, cr(cap, true, 2), P.capBlack);
    // a faint sheen on the crown
    {
      const p = new Path2D();
      taperStroke(p, [HP(-0.4, 0.75), HP(0.05, 0.86), HP(0.45, 0.7)], 2.6, 0.8);
      fillPath(ctx, p, P.mantleDeep, 0.6);
    }
    // cheek shadow
    L.hatch(ctx, [HP(-0.8, -0.2), HP(0.2, -0.1), HP(0.4, -0.7), HP(-0.3, -0.95)], { spacing: 7, width: 1.1, color: P.mantleDeep, alpha: 0.45, seed: seedP + 43, length: [8, 16] });
    const ec = HP(0.4, 0.06);
    ctx.save();
    ctx.fillStyle = P.capBlack;
    ctx.beginPath();
    ctx.arc(ec[0], ec[1], 5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = P.plumeWhite;
    ctx.beginPath();
    ctx.arc(ec[0] - 1.4, ec[1] - 1.6, 1.4, 0, TAU);
    ctx.fill();
    ctx.restore();
    // head outline, open where the neck joins
    {
      const arc = [];
      for (let i = 0; i <= 30; i++) {
        const a = lerp(-96, 163, i / 30) * DEG;
        arc.push(HP(Math.cos(a), Math.sin(a)));
      }
      L.inkPath(ctx, arc, { width: 4.5, seed: seedP + 44, wobble: 0.8, taper: [6, 8] });
    }

    // --- bill: blood red to the tip, straight and slim, a gape line
    const bb = HP(0.82, -0.12);
    const tip = add(bb, mul(fh, BILL_LEN));
    const bill = [add(bb, mul(uph, BILL_D * 0.5)), add(add(bb, mul(fh, BILL_LEN * 0.5)), mul(uph, BILL_D * 0.28)), tip, add(add(bb, mul(fh, BILL_LEN * 0.62)), mul(uph, -BILL_D * 0.3)), add(add(bb, mul(fh, BILL_LEN * 0.3)), mul(uph, -BILL_D * 0.44)), add(bb, mul(uph, -BILL_D * 0.5))];
    L.inkPath(ctx, bill, { closed: true, width: 2.6, fill: P.billRed, seed: seedP + 50, wobble: 0.4, tremble: 0.2, taper: [3, 3], smooth: false });
    {
      const lower = [add(bb, mul(uph, -BILL_D * 0.1)), add(add(bb, mul(fh, BILL_LEN * 0.62)), mul(uph, -BILL_D * 0.2)), mix2(tip, bb, 0.04), add(add(bb, mul(fh, BILL_LEN * 0.3)), mul(uph, -BILL_D * 0.4)), add(bb, mul(uph, -BILL_D * 0.45))];
      L.hatch(ctx, lower, { spacing: 3.2, width: 1.1, color: P.billDeep, alpha: 0.85, seed: seedP + 51, length: [6, 16], clip: true });
      const g = new Path2D();
      taperStroke(g, [add(bb, mul(uph, -BILL_D * 0.05)), add(add(bb, mul(fh, BILL_LEN * 0.45)), mul(uph, -BILL_D * 0.02)), add(add(bb, mul(fh, BILL_LEN * 0.8)), mul(uph, -BILL_D * 0.02))], 1.6, 0.6);
      fillPath(ctx, g, P.billDeep);
      const hl = new Path2D();
      taperStroke(hl, [add(add(bb, mul(fh, 8)), mul(uph, BILL_D * 0.3)), add(add(bb, mul(fh, BILL_LEN * 0.5)), mul(uph, BILL_D * 0.16))], 1.8, 0.4);
      fillPath(ctx, hl, P.rose, 0.8);
    }
    // the sand eel held crosswise in the bill tip, hanging both sides
    if (ps.fish) drawEel(ctx, add(tip, mul(fh, -5)), head.bAng + Math.PI / 2 + 0.22, 1, seedP + 60, bi);

    // near leg in front of the body
    drawLeg(0, false);

    // --- near wing (in front)
    if (spread) {
      const [arm, hand, span, chord] = spread.near;
      const g = wingGeom(XB(SHOULDER_N), arm + ps.th, hand + ps.th, span, chord);
      drawSpreadWing(ctx, g, 'near', seedP + 200, bi);
    }
    void X;
  }

  // ===========================================================================
  // World layers
  // ===========================================================================

  // ===========================================================================
  // World backdrop: far shore, the sound, the shingle, the scrape and the lichen rock.
  // It is a pure function of (boil drawing mod 3, render scale), so it is drawn once into one of three
  // cached sprites: a three-drawing boil. Everything moving (surf, shadows, birds) is drawn live.
  // ===========================================================================

  const BG = { x: -24, y: 820, w: 1128, h: 1120 };
  const BG_CACHE = new Map();
  function backdrop(G, bv) {
    const S = FILM.S || 1;
    const key = bv + '|' + S;
    let c = BG_CACHE.get(key);
    if (c) return c;
    c = FILM.makeCanvas(Math.ceil(BG.w * S), Math.ceil(BG.h * S));
    const g = c.getContext('2d');
    g.setTransform(S, 0, 0, S, -BG.x * S, -BG.y * S);
    drawFarShore(g, G, bv);
    drawSea(g, G, bv);
    drawShingle(g, G, bv);
    drawScrapeAndRock(g, G, bv);
    BG_CACHE.set(key, c);
    return c;
  }

  // precomputed hatch strokes over a polygon: [x0, y0, x1, y1] per stroke
  function hatchSegs(poly, spacing, angle, seed, len = [6, 18], gap = [2, 5]) {
    const r = L.rng(seed);
    const dx = Math.cos(angle), dy = Math.sin(angle), nx = -dy, ny = dx;
    const U = poly.map((p) => p[0] * dx + p[1] * dy), V = poly.map((p) => p[0] * nx + p[1] * ny);
    let vmin = Infinity, vmax = -Infinity;
    for (const v of V) {
      if (v < vmin) vmin = v;
      if (v > vmax) vmax = v;
    }
    const out = [];
    for (let v = vmin + spacing * r(); v < vmax; v += spacing * (0.85 + 0.3 * r())) {
      const xs = [];
      for (let i = 0, j = V.length - 1; i < V.length; j = i++) {
        if (V[i] > v !== V[j] > v) xs.push(U[i] + ((v - V[i]) / (V[j] - V[i])) * (U[j] - U[i]));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const b = xs[k + 1];
        let u = xs[k] + r() * 2;
        while (u < b - 2) {
          const e = Math.min(b - r() * 1.5, u + lerp(len[0], len[1], r()));
          if (e - u > 2) out.push([u * dx + v * nx, u * dy + v * ny, e * dx + v * nx, e * dy + v * ny]);
          u = e + lerp(gap[0], gap[1], r());
        }
      }
    }
    return out;
  }
  function segPath(path, segs, bv, amp, w0, w1, key = 0) {
    segs.forEach((s, i) => {
      taperStroke(path, [[s[0] + jig(i, key, bv, amp), s[1] + jig(key, i, bv, amp)], [s[2] + jig(i, key + 1, bv, amp), s[3] + jig(key + 1, i, bv, amp)]], w0, w1);
    });
  }

  function drawFarShore(ctx, G, bv) {
    // far range: faint, snow capped
    fillPoly(ctx, G.farPoly, P.iceShade, 0.55);
    G.farSnow.forEach((s) => fillPoly(ctx, s, P.ice, 0.85));
    {
      const p = new Path2D();
      segPath(p, G.farHatch, bv, 0.4, 1.1, 0.4, 1);
      fillPath(ctx, p, P.iceDeep, 0.55);
    }
    L.inkPath(ctx, G.far, { width: 1.6, color: P.inkFaint, alpha: 0.7, seed: sd('farL'), wobble: 1.2, taper: [30, 30], boil: bv });
    // near hills: shingle tone, slope hatching on the shadow faces, snow patches, the ridge line
    fillPoly(ctx, G.nearPoly, P.shingle);
    {
      const p = new Path2D();
      segPath(p, G.hillHatch, bv, 0.45, 1.3, 0.45, 2);
      fillPath(ctx, p, P.shingleDeep, 0.9);
      const q = new Path2D();
      segPath(q, G.hillCross, bv, 0.45, 1.1, 0.4, 3);
      fillPath(ctx, q, P.inkSoft, 0.55);
    }
    G.snow.forEach((s, i) => L.inkPath(ctx, s, { closed: true, width: 1.2, color: P.inkSoft, alpha: 0.6, fill: P.ice, seed: sd('snowL', i), wobble: 0.4, taper: [3, 3], boil: bv }));
    L.inkPath(ctx, G.near, { width: 3, seed: sd('ridge'), wobble: 1.4, taper: [30, 30], boil: bv, double: { offset: 3, width: 0.3, alpha: 0.35, from: 0.2, to: 0.55 } });
    // the foot of the far shore
    L.inkPath(ctx, [[-60, HORIZON + 2], [1140, HORIZON + 2]], { width: 1.8, color: P.inkSoft, seed: sd('foot'), wobble: 1, taper: [40, 40], boil: bv });
  }

  function drawSea(ctx, G, bv) {
    ctx.save();
    ctx.fillStyle = P.sea;
    ctx.fillRect(-200, HORIZON + 1, 1500, SHORE - HORIZON + 4);
    ctx.restore();
    // reflection of the near hills: short vertical strokes
    {
      const p = new Path2D();
      for (let x = -120; x < 1200; x += 6) {
        const h = G.nearH(x) * 0.42;
        if (h < 12) continue;
        const l = h * (0.5 + 0.5 * L.h3(x | 0, 3, 5));
        taperStroke(p, [[x + jig(x, 1, bv, 0.4), HORIZON + 4], [x + jig(x, 2, bv, 0.4), HORIZON + 4 + l]], 1.6, 0.4);
      }
      fillPath(ctx, p, P.seaDeep, 0.45);
    }
    // engraved horizontal hatching
    const paths = [new Path2D(), new Path2D()];
    G.seaLines.forEach((s, i) => {
      const yy = s.y + jig(i, 1, bv, 0.35);
      const p = paths[s.a > 0.62 ? 1 : 0];
      taperStroke(p, [[s.x0, yy], [(s.x0 + s.x1) / 2, yy + jig(i, 2, bv, 0.4)], [s.x1, yy + jig(i, 3, bv, 0.3)]], s.w, s.w * 0.4);
    });
    fillPath(ctx, paths[0], P.seaDeep, 0.55);
    fillPath(ctx, paths[1], P.seaDeep, 0.85);
    // drift ice
    G.ice.forEach((f, i) => {
      const side = [[f.x - f.w, f.y], [f.x + f.w, f.y], [f.x + f.w * 0.92, f.y + 5], [f.x - f.w * 0.9, f.y + 5]];
      fillPoly(ctx, side, P.iceShade);
      L.inkPath(ctx, f.top, { closed: true, width: 1.4, fill: P.ice, seed: sd('iceL', i), wobble: 0.3, taper: [2, 2], boil: bv });
      const r = new Path2D();
      taperStroke(r, [[f.x - f.w * 0.8, f.y + 8], [f.x + f.w * 0.6, f.y + 8]], 1.2, 0.3);
      fillPath(ctx, r, P.foam, 0.8);
    });
    // wet margin
    fillPoly(ctx, [[-200, SHORE - 4], [1300, SHORE - 4], [1300, SHORE + 6], [-200, SHORE + 6]], P.shingleDeep, 0.5);
  }

  // surf lines at the shore, sliding 4 px per beat (live)
  function drawSurf(ctx, T, bi) {
    const slide = (T * 8) % 400;
    for (let k = 0; k < 3; k++) {
      const y = SHORE - 22 + k * 8;
      const p = new Path2D();
      const r = L.rng(sd('surf', k));
      let x = -400 - slide * (k % 2 ? -1 : 1);
      while (x < 1300) {
        const len = r.range(40, 140);
        const pts = [];
        for (let j = 0; j <= 6; j++) {
          const xx = x + (len * j) / 6;
          pts.push([xx, y + 2 * Math.sin(xx * 0.06 + k) + jig(j, k, bi, 0.4)]);
        }
        taperStroke(p, pts, 3.2 - k * 0.6, 1);
        x += len + r.range(14, 60);
      }
      fillPath(ctx, p, P.foam, 0.95);
      strokePath(ctx, p, P.seaDeep, 0.8, 0.5);
    }
  }

  function drawShingle(ctx, G, bv) {
    ctx.save();
    ctx.fillStyle = P.shingle;
    ctx.fillRect(-200, SHORE, 1500, 700);
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = P.shingleDeep;
    ctx.fillRect(-200, SHORE, 1500, 700);
    ctx.restore();
    // grit between the stones
    L.stipple(ctx, null, { bounds: { x: -30, y: SHORE, w: 1140, h: 640 }, spacing: 12, r: [1, 1.8], color: P.ink, alpha: 0.35, density: 0.5, seed: sd('grit'), boil: bv });
    // moss patches under the stones
    G.moss.forEach((m, i) => {
      L.inkPath(ctx, m.pts, { closed: true, width: 1.4, color: P.mossDeep, alpha: 0.8, fill: P.moss, seed: sd('mossL', i), wobble: 0.6, taper: [4, 4], boil: bv });
      L.stipple(ctx, m.pts, { spacing: 5, r: [1, 1.8], color: P.mossDeep, alpha: 0.8, density: 0.6, seed: sd('mossS', i), boil: bv });
    });
    // far small pebbles: batched fills, lit caps, shade and edges
    {
      const byCol = {};
      const edge = new Path2D(), lit = new Path2D(), shade = new Path2D();
      const poly = (path, pts, j) => {
        path.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) path.lineTo(pts[i][0] + (j ? jig(i, j, bv, 0.25) : 0), pts[i][1]);
        path.closePath();
      };
      for (const p of G.pebSmall) {
        poly((byCol[p.col] = byCol[p.col] || new Path2D()), p.pts, 0);
        poly(edge, p.pts, 0);
        if (p.rx < 6) continue;
        if (p.col !== 'shinglePale') poly(lit, p.lit, 0);
        poly(shade, p.cres, 0);
      }
      for (const c of Object.keys(byCol)) fillPath(ctx, byCol[c], P[c]);
      fillPath(ctx, lit, P.shinglePale, 0.8);
      fillPath(ctx, shade, P.shingleDeep, 0.55);
      strokePath(ctx, edge, P.inkSoft, 1, 0.75);
    }
    // near pebbles back to front, in groups of stones that do not touch (so batching keeps the
    // occlusion right): fill, lit cap, hatched underside, lichen, ink edge
    const tracePoly = (path, pts) => {
      path.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) path.lineTo(pts[i][0], pts[i][1]);
      path.closePath();
    };
    for (const grp of G.pebGroups) {
      const byCol = {};
      const lit = new Path2D(), shade = new Path2D(), h = new Path2D(), edge = new Path2D(), dots = new Path2D();
      for (const p of grp) {
        tracePoly((byCol[p.col] = byCol[p.col] || new Path2D()), p.pts);
        if (p.col !== 'shinglePale') tracePoly(lit, p.lit);
        tracePoly(shade, p.cres);
        segPath(h, p.hatch, bv, 0.4, 1.2, 0.4, p.seed & 255);
        if (p.lichenDots) p.lichenDots.forEach(([x, y, r]) => {
          dots.moveTo(x + r, y);
          dots.arc(x, y, r, 0, TAU);
        });
        if (p.rx <= 24) {
          p.edge.forEach((q, i) => (i ? edge.lineTo(q[0] + jig(i, p.seed & 1023, bv, 0.35), q[1] + jig(p.seed & 1023, i, bv, 0.35)) : edge.moveTo(q[0], q[1])));
          edge.closePath();
        }
      }
      for (const c of Object.keys(byCol)) fillPath(ctx, byCol[c], P[c]);
      fillPath(ctx, lit, P.shinglePale, 0.85);
      fillPath(ctx, shade, P.shingleDeep, 0.5);
      fillPath(ctx, h, P.ink, 0.62);
      fillPath(ctx, dots, P.lichen);
      strokePath(ctx, edge, P.inkSoft, 1.8, 0.9);
      for (const p of grp) {
        if (p.rx > 24) L.inkPath(ctx, p.pts, { closed: true, width: lerp(1.8, 2.8, clamp((p.rx - 24) / 30)), color: p.rx > 30 ? P.ink : P.inkSoft, seed: p.seed, wobble: 0.6, tremble: 0.25, taper: [4, 8], boil: bv });
      }
    }
    // moss tufts over the stones at the patch edges
    {
      const p = new Path2D();
      G.moss.forEach((m) => m.tufts.forEach((tf, i) => taperStroke(p, [[tf[0], tf[1]], [tf[2] + jig(i, 1, bv, 0.5), tf[3]]], 1.6, 0.4)));
      fillPath(ctx, p, P.mossDeep, 0.9);
    }
  }

  function drawScrapeAndRock(ctx, G, bv) {
    // the scrape: a shallow dip, darker, a pebble rim
    fillPoly(ctx, G.scrape, P.shingleDeep, 0.35);
    fillPoly(ctx, G.scrapeIn, P.shingle, 0.8);
    L.hatch(ctx, G.scrapeIn, { spacing: 5, width: 1.1, color: P.inkSoft, alpha: 0.55, seed: sd('scrH'), length: [8, 22], angle: -0.12, density: (x, y) => clamp((CHICK[1] + 6 - y) / 18 + 0.2), boil: bv });
    L.stipple(ctx, G.scrapeIn, { spacing: 6, r: [1, 2], color: P.shingleDeep, alpha: 0.9, density: 0.6, seed: sd('scrS'), boil: bv });
    L.inkPath(ctx, G.scrapeIn.slice(12, 30).concat(G.scrapeIn.slice(0, 2)), { width: 1.6, color: P.inkSoft, alpha: 0.8, seed: sd('scrL'), wobble: 0.6, boil: bv });
    for (const [i, p] of G.rim.entries()) L.inkPath(ctx, p.pts, { closed: true, width: 1.5, fill: P[p.col], color: P.inkSoft, seed: sd('rimL', i), wobble: 0.4, taper: [3, 3], boil: bv });
    // shell fragments of the hatched egg
    G.shells.forEach((s, i) => {
      L.inkPath(ctx, s.pts, { closed: true, width: 1.8, fill: P.egg, seed: sd('shell', i), wobble: 0.4, taper: [3, 3], boil: bv });
      ctx.save();
      ctx.fillStyle = P.eggBlotch;
      ctx.beginPath();
      s.dots.forEach(([x, y, r]) => {
        ctx.moveTo(x + r, y);
        ctx.arc(x, y, r, 0, TAU);
      });
      ctx.fill();
      ctx.restore();
      const inner = new Path2D();
      taperStroke(inner, s.pts.slice(9), 2.2, 1);
      fillPath(ctx, inner, P.eggPale, 0.9);
    });
    // grass stems at the rim
    {
      const p = new Path2D();
      G.stems.forEach((s, i) => taperStroke(p, s.map(([x, y], j) => [x + jig(i, j, bv, 0.5), y]), 2.2, 0.5));
      fillPath(ctx, p, P.mossDeep);
    }

    // the lichen rock
    L.inkPath(ctx, G.rock, { closed: true, width: 3.2, fill: P.shingle, seed: sd('rockL'), wobble: 1.0, taper: [8, 12], boil: bv, double: { offset: 3, width: 0.3, alpha: 0.4, from: 0.3, to: 0.7 } });
    fillPoly(ctx, G.rockTop, P.shinglePale, 0.9);
    fillPoly(ctx, G.rockShade, P.shingleDeep, 0.5);
    L.crossHatch(ctx, G.rockShade, { spacing: 5, crossSpacing: 7, width: 1.3, color: P.ink, alpha: 0.7, tone: 0.7, layers: 2, seed: sd('rockH'), length: [8, 26], boil: bv });
    G.rockCracks.forEach((c, i) => L.inkPath(ctx, c, { width: 1.8, color: P.inkSoft, seed: sd('crack', i), wobble: 0.5, taper: [4, 6], boil: bv }));
    G.lichen.forEach((l, i) => {
      L.inkPath(ctx, l, { closed: true, width: 1.2, color: P.ochre, fill: P.lichen, seed: sd('lichL', i), wobble: 0.5, taper: [2, 2], boil: bv });
      L.stipple(ctx, l, { spacing: 4, r: [1, 1.8], color: P.ochre, alpha: 0.9, density: 0.7, seed: sd('lichS', i), boil: bv });
    });
    ctx.save();
    ctx.fillStyle = P.lichen;
    ctx.beginPath();
    G.lichenDots.forEach(([x, y, r]) => {
      ctx.moveTo(x + r, y);
      ctx.arc(x, y, r, 0, TAU);
    });
    ctx.fill();
    ctx.restore();
  }

  function drawConstruction(ctx) {
    ctx.save();
    ctx.strokeStyle = P.inkFaint;
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    // the horizon, plumb lines through the landing point and the chick, the landing circle
    ctx.moveTo(-100, HORIZON);
    ctx.lineTo(1200, HORIZON);
    ctx.moveTo(TD[0], 200);
    ctx.lineTo(TD[0], TD[1] + 40);
    ctx.moveTo(CHICK[0], 700);
    ctx.lineTo(CHICK[0], CHICK[1] + 40);
    ctx.moveTo(-100, TD[1]);
    ctx.lineTo(1200, TD[1]);
    ctx.stroke();
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.arc(TD[0], TD[1] - 150, 330, 0, TAU);
    ctx.moveTo(CHICK[0] + 260, CHICK[1] - 110);
    ctx.arc(CHICK[0], CHICK[1] - 110, 260, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  // the colony overhead: a few distant terns on loose paths, flapping on twos (about 3 beats a second)
  const COLONY = [
    { x: 150, y: 560, s: 1.9, face: 1, vx: 60, vy: -10, ph: 0 },
    { x: 360, y: 380, s: 1.25, face: 1, vx: 44, vy: 6, ph: 2 },
    { x: 600, y: 680, s: 1.0, face: -1, vx: -36, vy: -8, ph: 1 },
    { x: 90, y: 830, s: 0.8, face: 1, vx: 30, vy: -4, ph: 3 },
    { x: 560, y: 270, s: 1.4, face: -1, vx: -50, vy: 8, ph: 1 },
  ];
  function drawSkyTern(ctx, x, y, s, face, pose, seed, bi) {
    const sy = [1, 0.25, -0.75, 0.25][pose];
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(-face * s, s);
    const w = 1 / s;
    const wing = (dx, k) => [[-8 + dx, -3], [-5 + dx, -22 * sy * k - 3], [22 + dx, -46 * sy * k], [5 + dx, -20 * sy * k + 2], [3 + dx, -1]];
    // far wing (grey upper side), body, near wing
    L.inkPath(ctx, wing(6, 0.82), { closed: true, width: 1.6 * w, fill: P.mantleGrey, color: P.inkSoft, seed: seed + 1, wobble: 0.3, taper: [2, 2], smooth: false });
    const tail = new Path2D();
    taperStroke(tail, [[18, 1], [34, -1], [50, -5]], 3.4, 0.6);
    taperStroke(tail, [[18, 3], [34, 4], [48, 6]], 3.2, 0.6);
    fillPath(ctx, tail, P.plumeWhite);
    strokePath(ctx, tail, P.inkSoft, 1.1 * w, 0.9);
    L.inkPath(ctx, L.ellipsePts(-4, 0, 25, 6.5, 18), { closed: true, width: 1.8 * w, fill: P.breastGrey, seed: seed + 2, wobble: 0.3, taper: [2, 2] });
    L.inkPath(ctx, L.ellipsePts(-30, -2, 7, 7, 14), { closed: true, width: 1.6 * w, fill: P.plumeWhite, seed: seed + 3, wobble: 0.2, taper: [2, 2] });
    fillPoly(ctx, [[-37, -3], [-30, -9.5], [-23, -6], [-24, -2]], P.capBlack);
    const bill = new Path2D();
    taperStroke(bill, [[-36, -1], [-47, 1]], 3.4, 0.8);
    fillPath(ctx, bill, P.billRed);
    L.inkPath(ctx, wing(0, 1), { closed: true, width: 1.8 * w, fill: P.plumeWhite, seed: seed + 4, wobble: 0.3, taper: [2, 2], smooth: false });
    const edge = new Path2D();
    taperStroke(edge, [[22, -46 * sy], [5, -20 * sy + 2]], 2 * w, 0.8 * w);
    fillPath(ctx, edge, P.capBlack, 0.85);
    ctx.restore();
    void bi;
  }
  function drawColony(ctx, t, bi) {
    const tw = L.onTwos(t);
    COLONY.forEach((b, i) => {
      const pose = (Math.floor(tw * 12 + 1e-6) + b.ph) % 4;
      const x = b.x + b.vx * tw, y = b.y + b.vy * tw + 5 * Math.sin(tw * 5 + i);
      drawSkyTern(ctx, x, y, b.s, b.face, pose, sd('colony', i), bi);
    });
  }

  function drawShadow(ctx, x, y, rx, ry, seed, alpha) {
    const pts = L.ellipsePts(x, y, rx, ry, 36);
    fillPoly(ctx, pts, P.inkSoft, 0.3 * alpha);
    L.hatch(ctx, pts, { spacing: 4, width: 1.3, color: P.ink, alpha: 0.7 * alpha, seed, length: [10, 30] });
  }

  // ===========================================================================
  // Overlays (screen space)
  // ===========================================================================

  function drawTrajectories(ctx, t, toS, ps) {
    const line = (pts, alpha, dash, w = 2.5) => {
      const p = new Path2D();
      pts.forEach((q, i) => (i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1])));
      strokePath(ctx, p, P.annBlue, w, alpha, dash);
    };
    const arrow = (a, b, alpha) => {
      const d = sub(b, a), l = Math.hypot(d[0], d[1]) || 1;
      const u = mul(d, 1 / l), n = [-u[1], u[0]];
      const p = new Path2D();
      p.moveTo(b[0] - u[0] * 14 + n[0] * 7, b[1] - u[1] * 14 + n[1] * 7);
      p.lineTo(b[0], b[1]);
      p.lineTo(b[0] - u[0] * 14 - n[0] * 7, b[1] - u[1] * 14 - n[1] * 7);
      strokePath(ctx, p, P.annBlue, 2.5, alpha);
    };
    // descents: the live one solid, earlier ones a dashed ghost
    for (let k = 0; k < 4; k++) {
      const [S0, C0] = DESC[k];
      // the path of the body (the feet reference sits 110 px below it)
      const off = [-10, -110];
      if (k === 0 && t < B[0]) {
        const u = E.outQuad(clamp(t / 0.5 + 1 / 12));
        const pts = bezPts(add(S0, off), add(C0, off), add(TD, off), 0, u * 0.94, 40).map((q) => toS(q[0], q[1]));
        line(pts, 1, [14, 10]);
        continue;
      }
      if (t < B[k]) continue;
      const pts = bezPts(add(S0, off), add(C0, off), add(TD, off), 0, 1, 40).map((q) => toS(q[0], q[1]));
      const live = t < (B[k + 1] || 9);
      if (live) {
        line(pts, 1, [14, 10]);
        arrow(pts[pts.length - 3], pts[pts.length - 1], 1);
      } else {
        line(pts, 0.35, [4, 10], 2);
      }
    }
    // lift-off of parent 4
    if (t >= B[3] + 3 / 12 && ps.flying) {
      const u = E.outQuad(clamp((L.onTwos(t) - B[3] - 2 / 12) / 0.25 + 0.001));
      const off = [-10, -110];
      const pts = bezPts(add(LIFT[0], off), add(LIFT[1], off), add(LIFT[2], off), 0, u, 30).map((q) => toS(q[0], q[1]));
      line(pts, 1, [14, 10]);
      if (pts.length > 3) arrow(pts[pts.length - 3], pts[pts.length - 1], 1);
    }
    // landing rings on each beat
    for (let k = 0; k < 4; k++) {
      const fr = Math.floor((t - B[k]) * 24 + 1e-6);
      if (t < B[k] || fr > 9) continue;
      const u = E.outExpo((fr + 1) / 10);
      const s = toS(TD[0], TD[1]);
      ctx.save();
      ctx.strokeStyle = P.annBlue;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 1 - u * 0.9;
      ctx.beginPath();
      ctx.ellipse(s[0], s[1], 30 + 110 * u, (30 + 110 * u) * 0.22, 0, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawRuler(ctx, t, toS, cp) {
    const zero = toS(CHICK[0], CHICK[1])[1];
    const p = new Path2D();
    p.moveTo(RULER_X, RULER_Y0);
    p.lineTo(RULER_X, RULER_Y1);
    for (let i = 0; ; i++) {
      const y = RULER_Y1 - i * 40;
      if (y < RULER_Y0 - 1e-6) break;
      const long = Math.abs((1420 - y) % 200) < 1e-6;
      p.moveTo(RULER_X, y);
      p.lineTo(RULER_X + (long ? 28 : 12), y);
    }
    // the chick's ground line
    p.moveTo(RULER_X - 10, zero);
    p.lineTo(RULER_X + 36, zero);
    strokePath(ctx, p, P.annBlue, 2);
    // head heights: history staircase, the live mark jumps on each growth step
    const topY = (k) => toS(CHICK[0], CHICK[1] - CH[k].h)[1];
    const k = cp.k;
    let y = topY(k);
    let flash = -1;
    if (k > 0) {
      const fr = Math.floor((t - B[k]) * 24 + 1e-6);
      const u = clamp((fr + 1) / 3);
      y = lerp(topY(k - 1), topY(k), E.outBack(u));
      flash = fr;
    }
    const hist = new Path2D();
    for (let j = 0; j < k; j++) {
      const yj = topY(j);
      hist.moveTo(RULER_X - 16, yj);
      hist.lineTo(RULER_X + 6, yj);
      hist.moveTo(RULER_X - 16 + 6, yj);
      hist.lineTo(RULER_X - 16 + 6, topY(j + 1));
    }
    strokePath(ctx, hist, P.annMagenta, 2, 0.45);
    const m = new Path2D();
    m.moveTo(RULER_X - 22, y);
    m.lineTo(RULER_X + 34, y);
    strokePath(ctx, m, P.annMagenta, 3);
    // leader to the crown
    const crownX = toS(CHICK[0] + CH[k].head[0], 0)[0];
    const ld = new Path2D();
    ld.moveTo(RULER_X + 44, y);
    ld.lineTo(crownX - 12, y);
    strokePath(ctx, ld, P.annMagenta, 1.5, 0.7, [3, 7]);
    // change ring on the step
    if (flash >= 0 && flash < 10) {
      const u = E.outExpo((flash + 1) / 10);
      ctx.save();
      ctx.strokeStyle = P.annMagenta;
      ctx.lineWidth = 3;
      ctx.globalAlpha = 1 - u;
      ctx.beginPath();
      ctx.arc(RULER_X + 6, y, 10 + 30 * u, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawTally(ctx, t, bi) {
    const [cx, cy] = TALLY;
    const R = TALLY_R;
    const seg = (k) => [(-90 + k * 90 + 6) * DEG, (-90 + (k + 1) * 90 - 6) * DEG];
    ctx.save();
    ctx.strokeStyle = P.annYellow;
    ctx.lineCap = 'round';
    // unlit guide
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    for (let k = 0; k < 4; k++) {
      const [a0, a1] = seg(k);
      ctx.moveTo(cx + Math.cos(a0) * R, cy + Math.sin(a0) * R);
      ctx.arc(cx, cy, R, a0, a1);
    }
    ctx.stroke();
    // segment ends ticks
    ctx.beginPath();
    for (let k = 0; k < 4; k++) {
      const a = (-90 + k * 90) * DEG;
      ctx.moveTo(cx + Math.cos(a) * (R + 6), cy + Math.sin(a) * (R + 6));
      ctx.lineTo(cx + Math.cos(a) * (R + 16), cy + Math.sin(a) * (R + 16));
    }
    ctx.globalAlpha = 0.8;
    ctx.lineWidth = 2;
    ctx.stroke();
    // lit segments
    ctx.globalAlpha = 1;
    ctx.lineWidth = 3;
    for (let k = 0; k < 4; k++) {
      if (t < SWALLOW[k]) continue;
      const fr = Math.floor((t - SWALLOW[k]) * 24 + 1e-6);
      const u = E.outExpo((fr + 1) / 6);
      const [a0, a1] = seg(k);
      ctx.beginPath();
      ctx.arc(cx, cy, R, a0, lerp(a0, a1, u));
      ctx.stroke();
    }
    // the ring closes on the fourth fish
    if (t >= B_CLOSE) {
      const fr = Math.floor((t - B_CLOSE) * 24 + 1e-6);
      const u = E.outExpo((fr + 1) / 4);
      ctx.beginPath();
      for (let k = 0; k < 4; k++) {
        const a = (-90 + k * 90) * DEG;
        ctx.moveTo(cx + Math.cos(a - 6 * DEG * u) * R, cy + Math.sin(a - 6 * DEG * u) * R);
        ctx.arc(cx, cy, R, a - 6 * DEG * u, a + 6 * DEG * u);
      }
      ctx.stroke();
      if (fr < 12) {
        const v = E.outExpo((fr + 1) / 12);
        ctx.globalAlpha = 1 - v;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, R + 60 * v, 0, TAU);
        ctx.stroke();
      }
    }
    ctx.restore();
    // a small inked sand eel in each lit quadrant
    for (let k = 0; k < 4; k++) {
      if (t < SWALLOW[k]) continue;
      const fr = Math.floor((t - SWALLOW[k]) * 24 + 1e-6);
      const pop = fr < 3 ? [0.72, 1.08, 1][fr] : 1;
      const a = (-45 + k * 90) * DEG;
      const c = [cx + Math.cos(a) * R * 0.52, cy + Math.sin(a) * R * 0.52];
      ctx.save();
      ctx.translate(c[0], c[1]);
      ctx.scale(0.45 * pop, 0.45 * pop);
      drawEel(ctx, [0, 0], a + Math.PI / 2, 1, sd('tallyEel', k), bi);
      ctx.restore();
    }
  }

  function drawPeeps(ctx, t, toS, cp) {
    if (t >= B[0]) return;
    const f = Math.floor(t * 24 + 1e-6);
    if (f % 3 >= 2) return;
    const n = Math.floor(f / 3);
    const c = cp.c;
    const fdir = dir(cp.bAng);
    const tipW = [CHICK[0] + c.head[0] + fdir[0] * (c.head[2] + c.bill), CHICK[1] + c.head[1] + fdir[1] * (c.head[2] + c.bill)];
    const tip = toS(tipW[0], tipW[1]);
    const side = n % 2 ? 1 : -1;
    const p = new Path2D();
    for (let i = -1; i <= 1; i++) {
      const a = cp.bAng + side * 0.25 + i * 0.42;
      const d = dir(a);
      p.moveTo(tip[0] + d[0] * 14, tip[1] + d[1] * 14);
      p.lineTo(tip[0] + d[0] * (i === 0 ? 34 : 26), tip[1] + d[1] * (i === 0 ? 34 : 26));
    }
    strokePath(ctx, p, P.annYellow, 3);
  }

  // ===========================================================================
  // Scene
  // ===========================================================================

  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const t = clamp(tIn, 0, DUR);
      const G = geo();
      const bi = L.boil(info.T);
      const T = info.shot.start + t;
      const z = 1 + 0.03 * E.inOutSine(t / DUR);
      const camY = 1300 - 340 / z;
      const toS = (x, y) => [540 + (x - 540) * z, 1300 + (y - 1300) * z];

      const cp = chickPose(t);
      const ps = parentState(t);

      // 1 stripes (screen)
      L.stripes(ctx, { colors: [P.stripeCream, P.stripeYellow], offset: 12 * T, seed: sd('stripes') });

      L.camera(ctx, { x: 540, y: camY, zoom: z }, () => {
        // 2..6 world
        ctx.drawImage(backdrop(G, ((bi % 3) + 3) % 3), BG.x, BG.y, BG.w, BG.h);
        drawSurf(ctx, T, bi);
        drawColony(ctx, t, bi);
        drawConstruction(ctx);

        // 7 shadows: light from the upper left throws them to the right
        const gy = TD[1] + 6;
        const hgt = Math.max(0, TD[1] - ps.y);
        const shx = ps.x + 40 - 190 * clamp(hgt / 700);
        const fade = lerp(0.65, 1, clamp(1 - hgt / 800));
        if (shx < 1300) drawShadow(ctx, shx, gy + hgt * 0.04, 170 * lerp(0.6, 1, fade), 20 * lerp(0.6, 1, fade), sd('pshadow'), fade);
        drawShadow(ctx, CHICK[0] + 26, CHICK[1] + 4, CH[cp.k].body[2] * 1.2 * cp.pop, 12 + cp.k * 2, sd('cshadow'), 1);

        // 8, 9 parent and chick; a parent in the air passes over the chick
        if (ps.flying) {
          drawChick(ctx, cp, G, bi);
          drawParent(ctx, ps, G, bi);
        } else {
          drawParent(ctx, ps, G, bi);
          drawChick(ctx, cp, G, bi);
        }
      });

      // 10..13 overlays
      drawTrajectories(ctx, t, toS, ps);
      drawRuler(ctx, t, toS, cp);
      drawTally(ctx, t, bi);
      drawPeeps(ctx, t, toS, cp);
    },
  });
})();
