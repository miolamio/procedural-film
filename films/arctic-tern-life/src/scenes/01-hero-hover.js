// 01 hero-hover : Cold open, the tern with a fish. T 0.0 to 1.5, illustrated.
// An adult Arctic tern in breeding plumage hovers side-on over the sea at Sand Island, a sand eel
// crosswise in its blood-red bill (G5 geometry). Frame 0 is the thumbnail: wings raised at the top
// of the hover stroke. The wings sweep down in three drawings, snap back up with an overshoot on
// beat 2 (yellow ring, stripe jolt, fish flip) and make one shallow stroke on beat 3.
//
// Layers, back to front:
//   1  stripes, screen space (stripeCream / stripeYellow), drift and a jolt on beat 2
//      -- camera: push-in 1.00 to 1.05 holding screen point (540, 380) --
//   2  far shore of Young Sound on the horizon, y 1260
//   3  sea band: sea fill, seaDeep engraved rows, wavelets, foam surf lines sliding left
//   4  shingle strip from y 1640: packed pebbles, lichen, moss
//   5  construction: circle r 660 on the body, body axis, tilt arc, rays, degree ticks, crosses
//   6  overlay: annBlue plunge target on the water
//   7  far wing, upper side, at 85 percent tone
//   8  tail fan: far half, near half, T1 pair on top
//   9  body: underparts, mantle, white throat and rump, hatching; red feet
//  10  near wing: underside (white coverts, translucent primaries, black trailing edge), or the
//      grey upper side when it has turned over at the bottom of the downstroke
//  11  head: white cheek, black cap, eye; bill; sand eel; upper mandible over the fish
//  12  overlays: dashed annBlue plunge line, annBlue wing-stroke arc, annYellow ring on beat 2
(function () {
  'use strict';

  const ID = 'hero-hover';
  const LIB = FILM.lib;
  const P0 = LIB.pal;
  const TAU = Math.PI * 2;
  const DEG = Math.PI / 180;
  const FR = 1 / 24;

  const clamp = (v, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const sstep = (a, b, x) => {
    const t = clamp((x - a) / (b - a));
    return t * t * (3 - 2 * t);
  };
  const sd = (...k) => LIB.hash(ID, ...k) & 0x7fffffff;
  const h3 = LIB.h3;

  // beats, shot-local (this shot starts at T 0, so t = T)
  const B2 = 0.5; // T 0.5  beat 2: wings snap up, yellow ring, stripe jolt, fish flip
  const B3 = 1.0; // T 1.0  beat 3: second, shallower stroke

  // ---------------------------------------------------------------------------
  // G5 : the hero hovering, side view (docs/storyboard.md, Shared geometry)
  // ---------------------------------------------------------------------------

  const BODY_C = [560, 800];
  const AXA = -30 * DEG; // long axis, tail end higher
  const AX = [Math.cos(AXA), Math.sin(AXA)]; // toward the tail
  const NR = [-AX[1], AX[0]]; // toward the belly
  const loc = (lx, ly) => [BODY_C[0] + lx * AX[0] + ly * NR[0], BODY_C[1] + lx * AX[1] + ly * NR[1]];
  const toLoc = (x, y) => {
    const dx = x - BODY_C[0], dy = y - BODY_C[1];
    return [dx * AX[0] + dy * AX[1], dx * NR[0] + dy * NR[1]];
  };
  const HEAD = { x: 420, y: 860, r: 40 };
  const NAPE = [465, 835];
  const BILL_BASE = [380, 880];
  const BILL_TIP = [338, 910];
  const FISH_C = [338, 910];
  const FISH_LEN = 110;
  const FISH_ANG = 70 * DEG;
  const TAIL_BASE = [690, 730];
  const T1_TIP = [780, 690];
  const STREAM_FAR = [870, 640];
  const STREAM_NEAR = [850, 690];
  const FEET_AT = [560, 860];
  const RING_R = 660;
  const SEA_Y = 1260;
  const SHORE_Y = 1640;
  const PLUNGE = { x: 338, y0: 910, y1: 1300 };

  const COL = {
    farGrey: LIB.mix(P0.mantleGrey, P0.mantleDeep, 0.15),
    farWhite: LIB.mix(P0.plumeWhite, P0.mantleGrey, 0.2),
    farDeep: LIB.mix(P0.mantleDeep, P0.ink, 0.15),
    farPrim: LIB.mix(P0.mantleGrey, P0.primaryGlow, 0.1),
    nearPrim: LIB.mix(P0.mantleGrey, P0.primaryGlow, 0.22),
    capSheen: LIB.mix(P0.capBlack, P0.mantleDeep, 0.6),
    seaFar: LIB.mix(P0.sea, P0.seaDeep, 0.3),
    seaNear: LIB.mix(P0.sea, P0.foam, 0.12),
    hill: LIB.mix(P0.iceShade, P0.mantleDeep, 0.22),
    hillSnow: LIB.mix(P0.ice, P0.iceShade, 0.25),
    pebDark: LIB.mix(P0.shingle, P0.shingleDeep, 0.5),
    pebWarm: LIB.mix(P0.shingle, P0.tan, 0.25),
    gap: LIB.mix(P0.shingleDeep, P0.ink, 0.25),
    eelEye: LIB.mix(P0.sandEel, P0.white, 0.4),
    billHi: LIB.mix(P0.billRed, P0.white, 0.45),
    footDeep: LIB.mix(P0.legRed, P0.ink, 0.35),
    webPale: LIB.mix(P0.mantleGrey, P0.plumeWhite, 0.45),
  };

  // ---------------------------------------------------------------------------
  // small geometry
  // ---------------------------------------------------------------------------

  function table(tab) {
    return (x) => {
      if (x <= tab[0][0]) return tab[0][1];
      for (let i = 1; i < tab.length; i++) {
        if (x <= tab[i][0]) {
          const a = tab[i - 1], b = tab[i];
          return lerp(a[1], b[1], (x - a[0]) / (b[0] - a[0]));
        }
      }
      return tab[tab.length - 1][1];
    };
  }

  function arcLen(pts) {
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    return cum;
  }

  // n points spread evenly by arc length along a polyline
  function resample(pts, n) {
    const cum = arcLen(pts);
    const tot = cum[cum.length - 1] || 1;
    const out = [];
    let j = 1;
    for (let i = 0; i < n; i++) {
      const s = (tot * i) / (n - 1);
      while (j < pts.length - 1 && cum[j] < s) j++;
      const seg = cum[j] - cum[j - 1] || 1;
      const f = clamp((s - cum[j - 1]) / seg);
      out.push([lerp(pts[j - 1][0], pts[j][0], f), lerp(pts[j - 1][1], pts[j][1], f)]);
    }
    return out;
  }

  function trace(ctx, pts, closed = true) {
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
    ctx.beginPath();
    trace(ctx, pts, true);
    ctx.fill();
    ctx.restore();
  }

  function strokeP(ctx, path, color, alpha, width, cap = 'round') {
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = cap;
    ctx.lineJoin = 'round';
    ctx.stroke(path);
    ctx.restore();
  }

  function rot(p, c, a) {
    const cs = Math.cos(a), sn = Math.sin(a);
    const dx = p[0] - c[0], dy = p[1] - c[1];
    return [c[0] + dx * cs - dy * sn, c[1] + dx * sn + dy * cs];
  }

  // midpoint of a->b pushed `amt` px away from point `away`
  function bowMid(a, b, away, amt) {
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    let nx = -(b[1] - a[1]), ny = b[0] - a[0];
    const l = Math.hypot(nx, ny) || 1;
    nx /= l;
    ny /= l;
    if ((away[0] - mx) * nx + (away[1] - my) * ny > 0) {
      nx = -nx;
      ny = -ny;
    }
    return [mx + nx * amt, my + ny * amt];
  }

  // a hand-drawn stroke with a little boil, added to a Path2D (cheap batch line)
  function jline(p, x0, y0, x1, y1, seed, bi, amp = 0.8) {
    const j = (k) => (h3(seed, k, bi) - 0.5) * 2 * amp;
    const mx = (x0 + x1) / 2 + j(1) * 1.2, my = (y0 + y1) / 2 + j(2) * 1.2;
    p.moveTo(x0 + j(3), y0 + j(4));
    p.quadraticCurveTo(mx, my, x1 + j(5), y1 + j(6));
  }

  function signedArea(pts) {
    let a = 0;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) a += (pts[j][0] - pts[i][0]) * (pts[j][1] + pts[i][1]);
    return a / 2;
  }

  // ---------------------------------------------------------------------------
  // body (static)
  // ---------------------------------------------------------------------------

  // half-heights along the long axis, local x from the front (-150) to the tail base (+150)
  const BACK = table([[-150, -5], [-120, -15], [-95, -24], [-60, -45], [-20, -60], [30, -62], [80, -52], [120, -36], [150, -20]]);
  const BELLY = table([[-150, 30], [-120, 50], [-80, 64], [-30, 70], [20, 66], [70, 52], [110, 36], [150, 16]]);

  let BODY = null;
  function bodyGeo() {
    if (BODY) return BODY;
    const pts = [];
    for (let x = -150; x <= 150; x += 10) pts.push(loc(x, BACK(x)));
    pts.push(loc(158, -2));
    for (let x = 150; x >= -150; x -= 10) pts.push(loc(x, BELLY(x)));
    pts.push(loc(-165, 22), loc(-175, 5), loc(-162, -6));
    const outline = LIB.smoothPts(pts, true, 4);

    const r = LIB.rng(sd('body'));
    // mantle: the upper third of the back, front of the near wing root
    const mantle = [];
    for (let x = -120; x <= 130; x += 5) mantle.push(loc(x, BACK(x) - 8));
    for (let x = 130; x >= -120; x -= 5) {
      const edge = lerp(BACK(x), BELLY(x), 0.3) + 3 * LIB.noise1(x * 0.07, sd('mantle-edge'));
      mantle.push(loc(x, edge));
    }
    // white throat and fore-neck; the grey breast starts behind it with a feathered edge
    const throat = [loc(-190, -40), loc(-190, 80)];
    for (let y = 80; y >= -40; y -= 6) {
      const zig = (Math.floor((y + 40) / 6) % 2 ? 7 : -3) + r.range(-2, 2);
      throat.push(loc(-112 + zig + y * 0.18, y));
    }
    // white rump, upper and under tail coverts
    const rump = [];
    for (let y = -70; y <= 60; y += 6) rump.push(loc(98 + (Math.floor((y + 70) / 6) % 2 ? 6 : -4) - y * 0.12, y));
    rump.push(loc(200, 60), loc(200, -70));
    // lower belly, flat plumeShade under the hatching
    const shade = [];
    for (let x = -120; x <= 150; x += 6) shade.push(loc(x, lerp(BACK(x), BELLY(x), 0.72)));
    for (let x = 150; x >= -120; x -= 6) shade.push(loc(x, BELLY(x) + 8));
    // flank feather scallops, rows along the belly
    const scallops = [];
    for (let row = 0; row < 5; row++) {
      const v = 0.18 + row * 0.13;
      for (let x = -92 + (row % 2) * 9; x < 108; x += 18 + r.range(-2, 3)) {
        const ya = lerp(0, BELLY(x), v), yb = lerp(0, BELLY(x + 14), v);
        scallops.push([loc(x, ya), loc(x + 7, (ya + yb) / 2 + 5), loc(x + 14, yb), r()]);
      }
    }
    // scapulars on the mantle: white-tipped feather edges
    const scaps = [];
    for (let row = 0; row < 3; row++) {
      for (let x = -80 + row * 10; x < 40; x += 20 + r.range(-2, 2)) {
        const y = lerp(BACK(x), BACK(x) * 0.25, 0.25 + row * 0.22);
        scaps.push([loc(x, y), loc(x + 9, y + 5), loc(x + 18, y)]);
      }
    }
    BODY = { outline, mantle, throat, rump, shade, scallops, scaps };
    return BODY;
  }

  // ---------------------------------------------------------------------------
  // head (static)
  // ---------------------------------------------------------------------------

  let HEADG = null;
  function headGeo() {
    if (HEADG) return HEADG;
    const H = HEAD;
    const circle = LIB.ellipsePts(H.x, H.y, H.r, H.r, 64);
    // cap: over the crown from the bill base (150 deg) to the nape, then back along its lower edge
    const cap = [];
    for (let a = 150; a <= 325; a += 5) cap.push([H.x + Math.cos(a * DEG) * (H.r + 0.5), H.y + Math.sin(a * DEG) * (H.r + 0.5)]);
    cap.push([463, 831], [471, 836], [470, 840]);
    cap.push([452, 847], [430, 858], [411, 866], [394, 873], [384, 879]);
    const capS = LIB.smoothPts(cap, true, 3);
    // outline: throat, chin, face, forehead, crown, nape (the neck side merges into the body)
    const outline = [];
    for (let a = 52; a <= 326; a += 6) outline.push([H.x + Math.cos(a * DEG) * H.r, H.y + Math.sin(a * DEG) * H.r]);
    outline.push([463, 831], [471, 836]);
    // lower head in shadow (light from the upper left)
    const shade = [];
    for (let a = -10; a <= 125; a += 5) shade.push([H.x + Math.cos(a * DEG) * H.r, H.y + Math.sin(a * DEG) * H.r]);
    shade.push([H.x - 6, H.y + 22], [H.x + 12, H.y + 6]);
    const eye = [405, 858];
    HEADG = { circle, cap: capS, outline, shade, eye };
    return HEADG;
  }

  // ---------------------------------------------------------------------------
  // bill (static)
  // ---------------------------------------------------------------------------

  let BILLG = null;
  function billGeo() {
    if (BILLG) return BILLG;
    const b = BILL_BASE, t = BILL_TIP;
    const len = Math.hypot(t[0] - b[0], t[1] - b[1]);
    const d = [(t[0] - b[0]) / len, (t[1] - b[1]) / len];
    const n = [d[1], -d[0]]; // toward the culmen (up and left)
    const at = (u, w) => [b[0] + d[0] * len * u + n[0] * w, b[1] + d[1] * len * u + n[1] * w];
    const up = [], lo = [];
    for (let i = 0; i <= 12; i++) {
      const u = i / 12;
      // slim, straight, pointed: depth 15 px at the base; the culmen is very slightly convex
      const w = 7.5 * Math.pow(1 - u, 0.85) + 1.2 * Math.sin(Math.PI * u);
      up.push(at(u - 0.04, w));
      lo.push(at(u - 0.04, -7.2 * Math.pow(1 - u, 0.9)));
    }
    const tip = at(1, 0);
    const shape = up.concat([tip], lo.slice().reverse());
    const lower = [];
    for (let i = 0; i <= 12; i++) lower.push(at(i / 12 - 0.04, -0.6 - 0.4 * (1 - i / 12)));
    for (let i = 12; i >= 0; i--) lower.push(lo[i]);
    const gape = [at(-0.12, -1.2), at(0.25, -0.8), at(0.6, -0.4), at(0.86, 0)];
    // the part of the upper mandible drawn over the fish
    const tipUp = up.slice(8).concat([tip, at(0.9, -0.4), at(0.72, -0.9)]);
    const hi = [at(0.08, 4.5), at(0.45, 3.2), at(0.7, 2)];
    BILLG = { shape, lower, gape, tipUp, hi, at, d, n };
    return BILLG;
  }

  // ---------------------------------------------------------------------------
  // sand eel (pose: flick of the tail)
  // ---------------------------------------------------------------------------

  const EEL_HALF = table([[-3, 0], [0, 1.5], [6, 4], [16, 6.6], [30, 7.6], [60, 7.1], [85, 5], [97, 3], [101, 2.4]]);
  const eelMemo = new Map();
  function eelGeo(flick) {
    const key = flick.toFixed(3);
    if (eelMemo.has(key)) return eelMemo.get(key);
    const dir = [Math.cos(FISH_ANG), Math.sin(FISH_ANG)]; // head -> tail
    const nrm = [-dir[1], dir[0]]; // toward the back (left in frame)
    const head = [FISH_C[0] - dir[0] * FISH_LEN * 0.5, FISH_C[1] - dir[1] * FISH_LEN * 0.5];
    // centreline bends toward the tail; flick > 0 swings the tail toward the back side
    const off = (s) => (s < 40 ? 0 : flick * 22 * Math.pow((s - 40) / 70, 2));
    const P = (s, w) => {
      const o = off(s) + w;
      return [head[0] + dir[0] * s + nrm[0] * o, head[1] + dir[1] * s + nrm[1] * o];
    };
    const back = [], belly = [];
    for (let s = -3; s <= 101; s += 2) {
      const h = EEL_HALF(s);
      back.push(P(s, h));
      belly.push(P(s, -h * (s < 6 ? 1.25 : 1)));
    }
    // the lower jaw juts past the snout
    belly[0] = P(-4, -1.8);
    const body = back.concat(belly.slice().reverse());
    // green-grey back above the lateral band
    const dark = back.slice();
    for (let s = 101; s >= -1; s -= 2) dark.push(P(s, EEL_HALF(s) * 0.05 + 0.6 * Math.sin(s * 0.3)));
    // forked caudal fin
    const tb = off(101), tt = off(118);
    const sway = Math.atan2(tt - tb, 17);
    const fin = [P(99, 2.6), P(112, 7), P(119, 11.5 + sway * 6), P(111, 1), P(119, -11.5 + sway * 6), P(112, -7), P(99, -2.6)];
    const finRays = [];
    for (let k = -3; k <= 3; k++) finRays.push([P(101, k * 0.6), P(116, k * 3.3 + sway * 5)]);
    // long low dorsal fin along the back
    const dorsal = [];
    for (let s = 34; s <= 94; s += 3) dorsal.push(P(s, EEL_HALF(s) + 3.2 + 0.8 * Math.sin(s * 0.9)));
    for (let s = 94; s >= 34; s -= 3) dorsal.push(P(s, EEL_HALF(s) - 0.5));
    const dorsalRays = [];
    for (let s = 36; s <= 92; s += 4) dorsalRays.push([P(s, EEL_HALF(s)), P(s + 2, EEL_HALF(s) + 3.5)]);
    const lateral = [];
    for (let s = 14; s <= 98; s += 3) lateral.push(P(s, 1.2));
    const sheen = [];
    for (let s = 20; s <= 80; s += 4) sheen.push(P(s, -3.2));
    const gill = [P(15, 6.4), P(18, 2), P(17.5, -2), P(14.5, -6.2)];
    const mouth = [P(-4, -1.6), P(3, -0.6)];
    const eye = P(7.2, 2.4);
    const g = { body, dark, fin, finRays, dorsal, dorsalRays, lateral, sheen, gill, mouth, eye, P };
    eelMemo.set(key, g);
    return g;
  }

  // ---------------------------------------------------------------------------
  // tail fan: 6 pairs, T6 the streamers (pose: tick angle)
  // ---------------------------------------------------------------------------

  const TAIL_FAR = [T1_TIP, [793, 679], [806, 669], [821, 660], [840, 651], STREAM_FAR];
  const TAIL_NEAR = [T1_TIP, [791, 694], [803, 697], [816, 698], [832, 696], STREAM_NEAR];
  const ROOT_FAR = [681, 716], ROOT_NEAR = [700, 745];

  const tailMemo = new Map();
  function tailGeo(tick) {
    const key = tick.toFixed(2);
    if (tailMemo.has(key)) return tailMemo.get(key);
    const a = tick * DEG;
    const feathers = [];
    const make = (tipsArr, rootEnd, half) => {
      for (let k = 0; k < 6; k++) {
        const root = [lerp(TAIL_BASE[0], rootEnd[0], k / 5), lerp(TAIL_BASE[1], rootEnd[1], k / 5)];
        const tip = rot(tipsArr[k], TAIL_BASE, a * (0.6 + k * 0.1));
        const dx = tip[0] - root[0], dy = tip[1] - root[1];
        const len = Math.hypot(dx, dy);
        const d = [dx / len, dy / len];
        const n = [-d[1], d[0]];
        const outerSign = half === 'far' ? -1 : 1;
        // streamers are narrow and pointed; the inner feathers broader with rounded tips
        const w0 = k === 5 ? 14 : 22 - k;
        const w1 = k === 5 ? 1.4 : k === 4 ? 8 : 13 - k;
        const L = [], R = [];
        const steps = 10;
        for (let i = 0; i <= steps; i++) {
          const u = i / steps;
          const w = lerp(w0, w1, Math.pow(u, k === 5 ? 0.6 : 1)) / 2;
          const bowv = Math.sin(Math.PI * u) * (k === 5 ? 3 : 1.5) * outerSign;
          const cx = root[0] + dx * u + n[0] * bowv, cy = root[1] + dy * u + n[1] * bowv;
          L.push([cx + n[0] * w, cy + n[1] * w]);
          R.push([cx - n[0] * w, cy - n[1] * w]);
        }
        // rounded tip
        const capPts = [];
        const wt = w1 / 2;
        for (let j = 1; j < 6; j++) {
          const th = (j / 6) * Math.PI;
          capPts.push([tip[0] + n[0] * wt * Math.cos(th) + d[0] * wt * Math.sin(th) * 0.9, tip[1] + n[1] * wt * Math.cos(th) + d[1] * wt * Math.sin(th) * 0.9]);
        }
        const poly = L.concat(capPts, R.slice().reverse());
        // grey outer web on the outer feathers
        const outerSide = outerSign > 0 ? L : R;
        const web = [];
        for (let i = 0; i <= steps; i++) {
          const u = i / steps;
          const bowv = Math.sin(Math.PI * u) * (k === 5 ? 3 : 1.5) * outerSign;
          web.push([root[0] + dx * u + n[0] * bowv, root[1] + dy * u + n[1] * bowv]);
        }
        const webPoly = web.concat(outerSide.slice().reverse());
        feathers.push({ half, k, root, tip, poly, webPoly, shaft: web });
      }
    };
    make(TAIL_FAR, ROOT_FAR, 'far');
    make(TAIL_NEAR, ROOT_NEAR, 'near');
    tailMemo.set(key, feathers);
    return feathers;
  }

  // ---------------------------------------------------------------------------
  // wings: keyframed poses, built as a sheet between the leading and trailing edges
  // ---------------------------------------------------------------------------

  // S shoulder, Wr wrist, Tp tip; trailing edge B (root) -> AM -> J (primary/secondary junction) -> H1 -> H2 -> Tp.
  // Pose 0 is G5; 1..3 are the three downstroke drawings (wrists near y 560, 660, 760).
  const NEAR_K = [
    { S: [570, 770], Wr: [600, 470], Tp: [900, 230], B: [668, 738], AM: [698, 660], J: [715, 580], H1: [815, 448], H2: [870, 325] },
    { S: [570, 770], Wr: [622, 560], Tp: [940, 470], B: [668, 738], AM: [666, 702], J: [652, 666], H1: [799, 578], H2: [871, 529] },
    { S: [570, 770], Wr: [634, 660], Tp: [920, 700], B: [668, 740], AM: [668, 720], J: [660, 700], H1: [790, 713], H2: [862, 709] },
    { S: [570, 770], Wr: [642, 760], Tp: [800, 985], B: [668, 742], AM: [690, 755], J: [715, 775], H1: [772, 860], H2: [797, 925] },
  ];
  const FAR_K = [
    { S: [530, 770], Wr: [470, 490], Tp: [240, 250], B: [505, 776], AM: [432, 686], J: [365, 590], H1: [291, 424], H2: [260, 339] },
    { S: [530, 770], Wr: [458, 562], Tp: [212, 450], B: [505, 776], AM: [456, 720], J: [414, 658], H1: [309, 563], H2: [258, 511] },
    { S: [530, 770], Wr: [452, 660], Tp: [225, 700], B: [505, 776], AM: [485, 738], J: [460, 704], H1: [343, 710], H2: [285, 709] },
    { S: [530, 770], Wr: [472, 792], Tp: [432, 962], B: [505, 776], AM: [510, 790], J: [516, 806], H1: [482, 900], H2: [454, 942] },
  ];
  const TIP_TOP = 226; // world y; the push-in keeps it at or below screen y 220
  const KEYS = ['S', 'Wr', 'Tp', 'B', 'AM', 'J', 'H1', 'H2'];

  function poseAt(K, s) {
    const out = {};
    if (s < 0) {
      // overshoot: extrapolate past G5 away from the first downstroke drawing
      const f = -s * 3;
      for (const k of KEYS) out[k] = [K[0][k][0] + (K[0][k][0] - K[1][k][0]) * f, K[0][k][1] + (K[0][k][1] - K[1][k][1]) * f];
      // the root stays on the body
      out.S = K[0].S.slice();
      out.B = K[0].B.slice();
      // the lift reads through the wrist and the flared hand; the tip never climbs above TIP_TOP
      // (so it stays inside the Shorts safe area under the push-in)
      if (out.Tp[1] < TIP_TOP) {
        const S0 = K[0].S, T0 = K[0].Tp;
        const reach = Math.hypot(T0[0] - S0[0], T0[1] - S0[1]);
        const kTip = (T0[1] - TIP_TOP) / (T0[1] - out.Tp[1]);
        for (const k of KEYS) {
          const w = Math.min(1, Math.hypot(K[0][k][0] - S0[0], K[0][k][1] - S0[1]) / reach);
          const kk = lerp(1, kTip, w * w * w);
          out[k] = [out[k][0], K[0][k][1] + (out[k][1] - K[0][k][1]) * kk];
        }
      }
      return out;
    }
    const x = clamp(s) * 3;
    const i = Math.min(2, Math.floor(x));
    const f = x - i;
    for (const k of KEYS) out[k] = [lerp(K[i][k][0], K[i + 1][k][0], f), lerp(K[i][k][1], K[i + 1][k][1], f)];
    return out;
  }

  const NA = 84; // samples along the arm
  const NH = 170; // samples along the hand
  const N_SEC = 14;
  const N_PRI = 10;
  const wingMemo = new Map();

  function wingGeo(side, s) {
    const key = side + s.toFixed(3);
    if (wingMemo.has(key)) return wingMemo.get(key);
    const K = side === 'near' ? NEAR_K : FAR_K;
    const p = poseAt(K, s);
    const leadArm = LIB.smoothPts([p.S, bowMid(p.S, p.Wr, p.J, 9), p.Wr], false, 3);
    const leadHand = LIB.smoothPts([p.Wr, bowMid(p.Wr, p.Tp, p.J, 11), p.Tp], false, 3);
    const trailArm = LIB.smoothPts([p.B, p.AM, p.J], false, 3);
    const trailHand = LIB.smoothPts([p.J, p.H1, p.H2, p.Tp], false, 3);
    const Lp = resample(leadArm, NA + 1).concat(resample(leadHand, NH + 1).slice(1));
    const Tp = resample(trailArm, NA + 1).concat(resample(trailHand, NH + 1).slice(1));
    const N = Lp.length;
    const iW = NA;
    const width = Lp.map((l, i) => Math.hypot(Tp[i][0] - l[0], Tp[i][1] - l[1]));
    const at = (fi, v) => {
      const x = clamp(fi, 0, N - 1);
      const i0 = Math.min(N - 2, Math.floor(x));
      const f = x - i0;
      const lx = lerp(Lp[i0][0], Lp[i0 + 1][0], f), ly = lerp(Lp[i0][1], Lp[i0 + 1][1], f);
      const tx = lerp(Tp[i0][0], Tp[i0 + 1][0], f), ty = lerp(Tp[i0][1], Tp[i0 + 1][1], f);
      return [lerp(lx, tx, v), lerp(ly, ty, v)];
    };

    // feather tips along the trailing edge, as float sample indices
    const tips = [];
    for (let j = 0; j < N_SEC; j++) tips.push(((j + 0.55) / N_SEC) * iW);
    for (let k = 0; k < N_PRI; k++) tips.push(iW + NH * Math.pow((k + 1) / N_PRI, 0.82));
    tips[tips.length - 1] = N - 1;
    const notches = [];
    for (let j = 0; j + 1 < tips.length; j++) notches.push((tips[j] + tips[j + 1]) / 2);

    // scalloped trailing edge: rounded feather tips, sharp notches between them
    const TS = [];
    let seg = 0;
    for (let i = 0; i < N; i++) {
      let off = 0;
      if (i > tips[0] && i < N - 1) {
        while (seg < tips.length - 2 && i > tips[seg + 1]) seg++;
        const a = tips[seg], b = tips[seg + 1];
        const f = clamp((i - a) / (b - a));
        const d = Math.abs(2 * f - 1);
        const depth = seg >= N_SEC - 1 ? 10 : 5.5;
        off = Math.min(depth * (1 - Math.sqrt(Math.max(0, 1 - (1 - d) * (1 - d)))), width[i] * 0.3);
      }
      const l = Lp[i], t = Tp[i];
      const w = width[i] || 1;
      TS.push([t[0] + ((l[0] - t[0]) / w) * off, t[1] + ((l[1] - t[1]) / w) * off]);
    }

    // coverts boundary (fraction of the chord) and its scalloped row
    const vC = (i) => (i <= iW ? 0.5 : lerp(0.5, 0, sstep(iW, iW + NH * 0.78, i)));
    const covRow = (vf, amp, period, from, to) => {
      const out = [];
      let sAcc = 0;
      let prev = null;
      for (let i = from; i <= to; i++) {
        const v = vf(i);
        const q = at(i, v);
        if (prev) sAcc += Math.hypot(q[0] - prev[0], q[1] - prev[1]);
        prev = q;
        const ph = (sAcc / period) % 1;
        const bump = Math.sqrt(Math.max(0, 1 - (2 * ph - 1) * (2 * ph - 1)));
        const l = Lp[i], t = Tp[i];
        const w = width[i] || 1;
        const a = amp * Math.min(1, w / 60);
        out.push([q[0] + ((t[0] - l[0]) / w) * a * bump, q[1] + ((t[1] - l[1]) / w) * a * bump]);
      }
      return out;
    };
    const iCovEnd = Math.round(iW + NH * 0.74);
    const covEdge = covRow(vC, 7, 20, 0, iCovEnd);
    const coverts = Lp.slice(0, iCovEnd + 1).concat(covEdge.slice().reverse());
    const covRows = [
      covRow((i) => vC(i) * 0.36, 5, 15, 2, Math.round(iW + NH * 0.55)),
      covRow((i) => vC(i) * 0.7, 6, 17, 2, Math.round(iW + NH * 0.66)),
    ];

    // feather separations from each notch in toward the coverts; rachis lines up each feather
    const seps = [], shafts = [];
    for (let j = 0; j < notches.length; j++) {
      const ni = notches[j];
      const nPt = TS[Math.round(ni)];
      let base;
      if (ni < iW) base = at(ni - 1.5, 0.4);
      else base = at(lerp(iW - 6, ni, 0.4), 0.22);
      seps.push([nPt, base, ni >= iW]);
    }
    for (let j = 0; j < tips.length; j++) {
      const ti = tips[j];
      const tPt = at(Math.min(N - 1.001, ti), 0.955);
      let base;
      if (ti < iW) base = at(ti - 1.5, 0.45);
      else base = at(lerp(iW - 4, ti, 0.42), 0.26);
      shafts.push([tPt, base, ti >= iW]);
    }
    // the primaries' trailing edge (for the black line), from the first primary notch to the tip
    const iP = Math.round(notches[N_SEC - 1]);
    const priEdge = TS.slice(iP);
    // the black trailing band sits just inside the outline so it reads past the 5 px ink
    const priBand = priEdge.map((q, j) => {
      const i = iP + j, l = Lp[i], w = Math.max(1, Math.hypot(l[0] - q[0], l[1] - q[1]));
      const inset = Math.min(3.5, w * 0.3);
      return [q[0] + ((l[0] - q[0]) / w) * inset, q[1] + ((l[1] - q[1]) / w) * inset];
    });
    const secEdge = TS.slice(0, iP + 1);
    const outlineOpen = TS.concat(Lp.slice().reverse());
    const poly = Lp.concat(TS.slice().reverse());
    // underside faces the camera when the sheet keeps G5's winding
    const area = signedArea(poly);
    const g = {
      side, s, p, Lp, Tp, TS, N, iW, width, at, tips, notches, coverts, covEdge, covRows, seps, shafts,
      priEdge, priBand, secEdge, outlineOpen, poly, area, iCovEnd, iP,
    };
    wingMemo.set(key, g);
    return g;
  }
  const G5_AREA = { near: null, far: null };
  function underside(g) {
    if (G5_AREA[g.side] == null) G5_AREA[g.side] = wingGeo(g.side, 0).area;
    const same = Math.sign(g.area) === Math.sign(G5_AREA[g.side]);
    return g.side === 'near' ? same : !same;
  }

  // ---------------------------------------------------------------------------
  // scenery (static layouts)
  // ---------------------------------------------------------------------------

  let SCEN = null;
  function sceneryGeo() {
    if (SCEN) return SCEN;
    const r = LIB.rng(sd('scenery'));
    // far shore hills of Young Sound, low on the horizon
    const hills = [];
    for (let x = -60; x <= 1140; x += 12) {
      const h = 16 + 22 * (0.5 + 0.5 * LIB.noise1(x * 0.004, sd('hills'))) + 9 * LIB.noise1(x * 0.02, sd('hills2'));
      hills.push([x, SEA_Y - Math.max(4, h * sstep(-60, 260, x) * (1 - 0.55 * sstep(700, 1100, x)))]);
    }
    const snow = [];
    for (let i = 0; i < 9; i++) {
      const x = r.range(40, 900);
      const hi = hills[Math.round((x + 60) / 12)];
      snow.push([x, hi[1] + 3, r.range(10, 26)]);
    }

    // engraved sea rows: spacing widens toward the viewer
    const rows = [];
    let y = SEA_Y + 3;
    let ri = 0;
    while (y < SHORE_Y + 8) {
      const d = (y - SEA_Y) / (SHORE_Y - SEA_Y);
      const segs = [];
      let x = -60 + r.range(0, 40);
      while (x < 1140) {
        const len = r.range(26, 150) * lerp(0.7, 1.4, d);
        const gap = r.range(4, 34) * lerp(0.5, 1.8, d);
        if (r() > 0.1 + d * 0.28) segs.push([x, x + len]);
        x += len + gap;
      }
      rows.push({ y, d, segs, i: ri++ });
      y += lerp(3.2, 15, Math.pow(d, 1.1)) * r.range(0.85, 1.15);
    }
    // wavelets: little doubled crests, bigger near the shore
    const waves = [];
    for (let i = 0; i < 90; i++) {
      const d = Math.pow(r(), 0.8);
      waves.push({ x: r.range(-40, 1120), y: lerp(SEA_Y + 10, SHORE_Y - 40, d), w: lerp(8, 30, d), d, k: i });
    }
    // glints near the horizon
    const glints = [];
    for (let i = 0; i < 26; i++) glints.push([r.range(0, 1080), SEA_Y + 4 + Math.pow(r(), 2) * 90, r.range(6, 18)]);

    // pebbles, packed in rows, bigger toward the viewer
    const pebbles = [];
    let py = SHORE_Y + 6;
    let row = 0;
    while (py < 2040) {
      const d = clamp((py - SHORE_Y) / 320);
      const rx0 = lerp(15, 62, d);
      let px = -40 + r.range(0, rx0);
      while (px < 1130) {
        const rx = rx0 * r.range(0.7, 1.25);
        const ry = rx * r.range(0.5, 0.72);
        const tone = r();
        pebbles.push({
          x: px + rx, y: py + r.range(-ry * 0.3, ry * 0.3), rx, ry, a: r.range(-0.35, 0.35),
          tone, lichen: r() < 0.12, seed: sd('peb', row, Math.round(px)), row,
        });
        px += rx * 2 * r.range(0.95, 1.12);
      }
      py += lerp(15, 62, d) * 1.1;
      row++;
    }
    for (const pb of pebbles) {
      const pts = [];
      const n = 18;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU;
        const k = 1 + 0.09 * LIB.noise1(i * 0.7, pb.seed) + 0.05 * Math.cos(2 * a + pb.tone * 4);
        const x = Math.cos(a) * pb.rx * k, yy = Math.sin(a) * pb.ry * k;
        pts.push([pb.x + x * Math.cos(pb.a) - yy * Math.sin(pb.a), pb.y + x * Math.sin(pb.a) + yy * Math.cos(pb.a)]);
      }
      pb.pts = pts;
    }
    // moss tufts in the gaps
    const moss = [];
    for (let i = 0; i < 26; i++) moss.push([r.range(0, 1080), SHORE_Y + 30 + r() * 260, r.range(8, 20)]);
    SCEN = { hills, snow, rows, waves, glints, pebbles, moss };
    return SCEN;
  }

  // ---------------------------------------------------------------------------
  // draw: scenery
  // ---------------------------------------------------------------------------

  function drawShore(ctx, P, bi) {
    const G = sceneryGeo();
    const poly = G.hills.concat([[1140, SEA_Y + 2], [-60, SEA_Y + 2]]);
    fillPoly(ctx, poly, COL.hill);
    for (const [x, y, w] of G.snow) {
      const s = [[x - w, y + 6], [x - w * 0.3, y - 1], [x + w * 0.2, y + 1], [x + w, y + 7], [x + w * 0.3, y + 5]];
      fillPoly(ctx, s, COL.hillSnow);
    }
    LIB.hatch(ctx, poly, { angle: -Math.PI / 4, spacing: 6, width: 1.1, color: P.inkSoft, alpha: 0.4, length: [6, 16], seed: sd('hillh'), density: (x) => 0.35 + 0.4 * sstep(300, 900, x) });
    LIB.inkPath(ctx, G.hills, { width: 1.8, color: P.inkSoft, seed: sd('hill-line'), taper: [0, 0], wobble: 0.8 });
  }

  function drawSea(ctx, P, tw, bi) {
    const G = sceneryGeo();
    ctx.fillStyle = COL.seaFar;
    ctx.fillRect(-80, SEA_Y, 1240, 70);
    ctx.fillStyle = P.sea;
    ctx.fillRect(-80, SEA_Y + 70, 1240, SHORE_Y + 60 - SEA_Y - 70);
    // soften the far band edge with a few rows of the near tone
    ctx.fillStyle = P.sea;
    for (let i = 0; i < 6; i++) ctx.fillRect(-80, SEA_Y + 52 + i * 5, 1240, 1.6);
    ctx.fillStyle = COL.seaNear;
    ctx.fillRect(-80, SHORE_Y - 90, 1240, 150);

    // surf and wave marks slide left 4 px per beat, on twos
    const slide = -8 * tw;
    // engraved rows, in two weights
    const thin = new Path2D(), thick = new Path2D();
    for (const row of G.rows) {
      const target = row.d < 0.45 ? thin : thick;
      const sl = slide * lerp(0.3, 1, row.d);
      for (let j = 0; j < row.segs.length; j++) {
        const [a, b] = row.segs[j];
        const jy = (h3(row.i, j, bi) - 0.5) * 0.9;
        const x0 = a + sl, x1 = b + sl;
        target.moveTo(x0, row.y + jy);
        target.quadraticCurveTo((x0 + x1) / 2, row.y + jy + (h3(j, row.i, 5) - 0.5) * 2.2 * row.d, x1, row.y + jy * 0.5);
      }
    }
    strokeP(ctx, thin, P.seaDeep, 0.72, 1.15);
    strokeP(ctx, thick, P.seaDeep, 0.8, 1.6);

    // wavelets: doubled crests with a shadowed trough under them
    const crest = new Path2D(), trough = new Path2D();
    for (const w of G.waves) {
      const x = w.x + slide * lerp(0.3, 1, w.d), y = w.y;
      const j = (h3(w.k, 3, bi) - 0.5) * 1.2;
      crest.moveTo(x - w.w, y + j);
      crest.quadraticCurveTo(x - w.w * 0.5, y - w.w * 0.34, x, y + j * 0.5);
      crest.quadraticCurveTo(x + w.w * 0.5, y - w.w * 0.34, x + w.w, y + j);
      trough.moveTo(x - w.w * 0.7, y + w.w * 0.22);
      trough.lineTo(x + w.w * 0.8, y + w.w * 0.22 + j * 0.4);
    }
    strokeP(ctx, trough, P.seaDeep, 0.9, 1.8);
    strokeP(ctx, crest, P.ink, 0.55, 1.4);

    // glints near the horizon
    const gl = new Path2D();
    for (const [x, y, w] of G.glints) {
      const jx = (h3(Math.round(x), 7, bi) - 0.5) * 3;
      gl.moveTo(x + jx - w / 2, y);
      gl.lineTo(x + jx + w / 2, y);
    }
    strokeP(ctx, gl, P.foam, 0.85, 1.6);

    // foam surf lines, three long wavy bands toward the shore
    for (let k = 0; k < 3; k++) {
      const y0 = SHORE_Y - 78 + k * 26;
      const amp = 4 + k * 2;
      const pts = [];
      for (let x = -80; x <= 1160; x += 16) {
        const xx = x + slide * (1 + k * 0.2);
        pts.push([xx, y0 + amp * Math.sin(x * 0.018 + k * 1.7) + 3 * LIB.noise1(x * 0.03, sd('surf', k))]);
      }
      LIB.inkPath(ctx, pts.map((q) => [q[0], q[1] + 3]), { width: 1.6, color: P.seaDeep, alpha: 0.85, seed: sd('surfsh', k), taper: [0, 0], wobble: 0.6 });
      LIB.inkPath(ctx, pts, { width: 4 + k, color: P.foam, seed: sd('surfline', k), taper: [0, 0], wobble: 0.8, rough: 0.9 });
    }
    // shore foam fringe
    const fr = [];
    for (let x = -80; x <= 1160; x += 10) fr.push([x + slide * 1.2, SHORE_Y - 12 + 4 * Math.sin(x * 0.05) + 3 * LIB.noise1(x * 0.04, sd('fringe'))]);
    const band = fr.concat([[1160, SHORE_Y + 30], [-80, SHORE_Y + 30]]);
    fillPoly(ctx, band, P.foam);
    LIB.inkPath(ctx, fr, { width: 2, color: P.inkSoft, alpha: 0.85, seed: sd('fringe-line'), taper: [0, 0], wobble: 0.6 });
    // horizon line over the far shore's foot
    LIB.inkPath(ctx, [[-60, SEA_Y + 1], [1140, SEA_Y + 1]], { width: 2.2, color: P.inkSoft, seed: sd('horizon'), taper: [0, 0], wobble: 0.5, smooth: false, step: 6 });
  }

  function drawShingle(ctx, P, bi) {
    const G = sceneryGeo();
    ctx.fillStyle = COL.gap;
    ctx.fillRect(-80, SHORE_Y + 4, 1240, 600);
    const cols = [P.shingle, P.shinglePale, COL.pebDark, COL.pebWarm];
    // row by row, back to front, so nearer pebbles overlap the ones behind them
    const rows = [];
    for (const pb of G.pebbles) (rows[pb.row] = rows[pb.row] || []).push(pb);
    for (const row of rows) {
      if (!row) continue;
      const fills = [new Path2D(), new Path2D(), new Path2D(), new Path2D()];
      const cast = new Path2D(), lit = new Path2D(), dark = new Path2D(), line = new Path2D();
      let wide = 1.9;
      for (const pb of row) {
        const ci = pb.tone < 0.45 ? 0 : pb.tone < 0.7 ? 1 : pb.tone < 0.88 ? 3 : 2;
        trace(fills[ci], pb.pts, true);
        cast.moveTo(pb.x + pb.rx * 1.02 + 4, pb.y + 6);
        cast.ellipse(pb.x + 4, pb.y + 6, pb.rx * 1.02, pb.ry * 1.02, pb.a, 0, TAU);
        const n = pb.pts.length;
        for (let i = 0; i <= n; i++) {
          const q = pb.pts[i % n];
          const j = (h3(pb.seed, i % n, bi) - 0.5) * 1.1;
          if (i === 0) line.moveTo(q[0] + j, q[1] - j);
          else line.lineTo(q[0] + j, q[1] - j);
        }
        if (pb.rx > 34) wide = 2.6;
        // lit crescent top-left, shadow crescent bottom-right
        lit.moveTo(pb.x + Math.cos(3.6 + pb.a) * pb.rx * 0.72, pb.y + Math.sin(3.6 + pb.a) * pb.ry * 0.62);
        lit.ellipse(pb.x, pb.y, pb.rx * 0.72, pb.ry * 0.62, pb.a, 3.6, 4.9);
        dark.moveTo(pb.x + Math.cos(0.05 + pb.a) * pb.rx * 0.84, pb.y + Math.sin(0.05 + pb.a) * pb.ry * 0.84);
        dark.ellipse(pb.x, pb.y, pb.rx * 0.84, pb.ry * 0.8, pb.a, 0.05, 1.9);
      }
      ctx.fillStyle = COL.gap;
      ctx.fill(cast);
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = cols[i];
        ctx.fill(fills[i]);
      }
      strokeP(ctx, dark, P.shingleDeep, 0.9, 4);
      strokeP(ctx, lit, P.shinglePale, 0.95, 3);
      // hatched shadow on the big pebbles
      for (const pb of row) {
        if (pb.rx < 30) continue;
        LIB.hatch(ctx, pb.pts, {
          angle: -Math.PI / 4, spacing: 5, width: 1.3, color: P.shingleDeep, alpha: 0.85, length: [6, 18], seed: pb.seed, inset: 3,
          density: (x, y) => sstep(-0.1, 0.55, ((x - pb.x) / pb.rx + (y - pb.y) / pb.ry) * 0.7),
        });
      }
      strokeP(ctx, line, P.ink, 0.95, wide);
    }
    // lichen crusts
    const lich = new Path2D(), lichDot = new Path2D();
    for (const pb of G.pebbles) {
      if (!pb.lichen) continue;
      const r = LIB.rng(pb.seed + 5);
      for (let i = 0; i < 5; i++) {
        const x = pb.x + r.range(-0.45, 0.2) * pb.rx, y = pb.y + r.range(-0.5, 0.1) * pb.ry;
        const rr = r.range(2, 5.5) * (pb.rx / 40);
        lich.moveTo(x + rr, y);
        lich.ellipse(x, y, rr, rr * 0.7, 0, 0, TAU);
        lichDot.moveTo(x + rr * 0.3, y);
        lichDot.arc(x, y, rr * 0.3, 0, TAU);
      }
    }
    ctx.fillStyle = P.lichen;
    ctx.fill(lich);
    ctx.fillStyle = P.ochre;
    ctx.fill(lichDot);
    // moss tufts in the gaps
    const tuft = new Path2D();
    for (let i = 0; i < G.moss.length; i++) {
      const [x, y, s] = G.moss[i];
      for (let b = 0; b < 5; b++) {
        const a = -Math.PI / 2 + (b - 2) * 0.35 + (h3(i, b, bi) - 0.5) * 0.12;
        tuft.moveTo(x + (b - 2) * 2, y);
        tuft.lineTo(x + (b - 2) * 2 + Math.cos(a) * s, y + Math.sin(a) * s);
      }
    }
    strokeP(ctx, tuft, P.mossDeep, 0.95, 2);
  }

  // ---------------------------------------------------------------------------
  // draw: construction
  // ---------------------------------------------------------------------------

  function drawConstruction(ctx, P, bi) {
    const cons = { width: 1.5, color: P.inkFaint, alpha: 0.3, taper: [0, 0], wobble: 1.5, smooth: false, step: 8 };
    LIB.guideCircle(ctx, BODY_C[0], BODY_C[1], RING_R, { color: P.inkFaint, alpha: 0.3, width: 1.5 });
    LIB.guideCircle(ctx, BODY_C[0], BODY_C[1], 330, { color: P.inkFaint, alpha: 0.2, width: 1.5, dash: [3, 7] });
    // body axis and its normal, through the centre
    const a0 = loc(-760, 0), a1 = loc(760, 0);
    LIB.inkPath(ctx, [a0, a1], Object.assign({ seed: sd('axis') }, cons));
    LIB.inkPath(ctx, [loc(0, -420), loc(0, 420)], Object.assign({ seed: sd('axis-n') }, cons, { alpha: 0.2 }));
    // horizontal reference and the 30 degree tilt arc
    LIB.inkPath(ctx, [[BODY_C[0] - 40, BODY_C[1]], [BODY_C[0] + 260, BODY_C[1]]], Object.assign({ seed: sd('hz') }, cons));
    ctx.save();
    ctx.strokeStyle = P.inkFaint;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(BODY_C[0], BODY_C[1], 200, AXA, 0);
    ctx.stroke();
    const tk = new Path2D();
    for (let d = 0; d >= -30; d -= 5) {
      const a = d * DEG, len = d % 15 === 0 ? 12 : 6;
      tk.moveTo(BODY_C[0] + Math.cos(a) * 200, BODY_C[1] + Math.sin(a) * 200);
      tk.lineTo(BODY_C[0] + Math.cos(a) * (200 + len), BODY_C[1] + Math.sin(a) * (200 + len));
    }
    ctx.stroke(tk);
    ctx.restore();
    // rays from the body centre through the two G5 wingtips, with ticks on the ring
    const rays = new Path2D(), rayTicks = new Path2D(), deg = new Path2D();
    for (const tip of [[900, 230], [240, 250], [870, 640], [338, 910]]) {
      const a = Math.atan2(tip[1] - BODY_C[1], tip[0] - BODY_C[0]);
      const c = Math.cos(a), sn = Math.sin(a);
      rays.moveTo(BODY_C[0] + c * 60, BODY_C[1] + sn * 60);
      rays.lineTo(BODY_C[0] + c * RING_R, BODY_C[1] + sn * RING_R);
      rayTicks.moveTo(BODY_C[0] + c * (RING_R - 12), BODY_C[1] + sn * (RING_R - 12));
      rayTicks.lineTo(BODY_C[0] + c * (RING_R + 12), BODY_C[1] + sn * (RING_R + 12));
    }
    for (let d = -175; d <= -5; d += 10) {
      const c = Math.cos(d * DEG), sn = Math.sin(d * DEG);
      const len = d % 30 === -15 ? 18 : 10;
      deg.moveTo(BODY_C[0] + c * RING_R, BODY_C[1] + sn * RING_R);
      deg.lineTo(BODY_C[0] + c * (RING_R + len), BODY_C[1] + sn * (RING_R + len));
    }
    strokeP(ctx, rays, P.inkFaint, 0.3, 1.5);
    strokeP(ctx, rayTicks, P.inkFaint, 0.55, 1.5);
    strokeP(ctx, deg, P.inkFaint, 0.45, 1.5);
    // head guide circle
    LIB.guideCircle(ctx, HEAD.x, HEAD.y, HEAD.r + 16, { color: P.inkFaint, alpha: 0.35, width: 1.5, dash: [3, 6] });
    // registration crosses on the G5 points
    const marks = new Path2D();
    for (const [px, py] of [BODY_C, [HEAD.x, HEAD.y], TAIL_BASE, T1_TIP, STREAM_FAR, STREAM_NEAR, [600, 470], [470, 490], [900, 230], [240, 250], [570, 770], [530, 770], FEET_AT, NAPE]) {
      const jx = (h3(Math.round(px), 1, bi) - 0.5) * 0.8;
      marks.moveTo(px - 9 + jx, py);
      marks.lineTo(px + 9 + jx, py);
      marks.moveTo(px, py - 9);
      marks.lineTo(px, py + 9);
    }
    strokeP(ctx, marks, P.inkFaint, 0.55, 1.5);
    // span chord between the tips
    LIB.inkPath(ctx, [[240, 250], [900, 230]], Object.assign({ seed: sd('span') }, cons, { alpha: 0.22 }));
  }

  // ---------------------------------------------------------------------------
  // draw: wings
  // ---------------------------------------------------------------------------

  function drawWing(ctx, P, g, bi, far) {
    const under = underside(g);
    const id = g.side + (under ? 'u' : 'o');
    const wHero = far ? 3.2 : 5;
    const ink = P.ink;
    if (under) {
      // translucent flight feathers: the stripes glow faintly through them
      fillPoly(ctx, g.poly, P.primaryGlow, 0.9);
      // where feathers overlap the web reads a shade deeper
      const ov = new Path2D();
      for (const [a, b] of g.seps) {
        ov.moveTo(a[0], a[1]);
        ov.lineTo(b[0], b[1]);
      }
      strokeP(ctx, ov, P.plumeShade, 0.8, 7, 'butt');
      // shadow cast by the coverts onto the flight feathers
      const cs = new Path2D();
      trace(cs, g.covEdge.map((q, i) => {
        const l = g.Lp[i], t = g.Tp[i], w = g.width[i] || 1;
        return [q[0] + ((t[0] - l[0]) / w) * 6, q[1] + ((t[1] - l[1]) / w) * 6];
      }), false);
      strokeP(ctx, cs, P.plumeShade, 0.9, 9);
      // translucent grey-glow wash on the inner webs of the primaries
      LIB.hatch(ctx, g.poly, {
        angle: Math.atan2(g.p.Tp[1] - g.p.Wr[1], g.p.Tp[0] - g.p.Wr[0]), spacing: 5, width: 1.1, color: COL.nearPrim, alpha: 0.9,
        length: [20, 60], seed: sd(id, 'glow'), clip: true,
        density: (x, y) => 0.55 * sstep(0.2, 0.8, projV(g, x, y)),
      });
      // coverts: white, in shade (the underside is turned from the light)
      fillPoly(ctx, g.coverts, P.plumeWhite);
      LIB.hatch(ctx, g.coverts, {
        angle: -Math.PI / 4, spacing: 8, width: 1.3, color: P.mantleDeep, alpha: 0.55, length: [12, 36], seed: sd(id, 'cov'),
        density: (x, y) => 0.35 + 0.6 * sstep(260, 20, Math.hypot(x - g.p.S[0], y - g.p.S[1])),
      });
      LIB.stipple(ctx, g.coverts, { spacing: 11, r: [0.9, 1.5], color: P.mantleDeep, alpha: 0.5, seed: sd(id, 'covst'), density: (x, y) => 0.6 * sstep(220, 40, Math.hypot(x - g.p.S[0], y - g.p.S[1])) });
      // separations and shafts
      const sep = new Path2D(), sh = new Path2D();
      g.seps.forEach(([a, b], j) => jline(sep, a[0], a[1], b[0], b[1], sd(id, 'sep', j), bi, 0.6));
      g.shafts.forEach(([a, b], j) => jline(sh, a[0], a[1], b[0], b[1], sd(id, 'sh', j), bi, 0.5));
      strokeP(ctx, sep, P.inkSoft, 0.9, 1.6);
      strokeP(ctx, sh, P.mantleDeep, 0.55, 1.1);
      // covert rows
      LIB.inkPath(ctx, g.covEdge, { width: 1.8, color: P.inkSoft, alpha: 0.9, seed: sd(id, 'cove'), smooth: false, taper: [4, 20], wobble: 0.6 });
      for (let k = 0; k < g.covRows.length; k++) {
        LIB.inkPath(ctx, g.covRows[k], { width: 1.4, color: P.inkSoft, alpha: 0.7, seed: sd(id, 'covr', k), smooth: false, taper: [6, 20], wobble: 0.6 });
      }
      // the thin, neat black trailing edge of the primaries, and the dark outer web of P10
      LIB.inkPath(ctx, g.priBand, { width: far ? 4 : 5.5, color: P.capBlack, seed: sd(id, 'trail'), smooth: false, taper: [10, 4], wobble: 0.4, swell: 0 });
      const lead = g.Lp.slice(Math.round(g.iW + NH * 0.72));
      LIB.inkPath(ctx, lead, { width: 3, color: P.capBlack, alpha: 0.85, seed: sd(id, 'p10'), smooth: false, taper: [16, 2], wobble: 0.3 });
    } else {
      const grey = far ? COL.farGrey : P.mantleGrey;
      const white = far ? COL.farWhite : P.plumeWhite;
      const deep = far ? COL.farDeep : P.mantleDeep;
      fillPoly(ctx, g.poly, grey);
      // white leading edge along the arm
      const le = g.Lp.slice(0, g.iW + 30);
      const leIn = [];
      for (let i = g.iW + 29; i >= 0; i--) leIn.push(g.at(i, 0.075 * (1 - sstep(g.iW, g.iW + 30, i))));
      fillPoly(ctx, le.concat(leIn), white);
      // pale tips to the secondaries
      const st = g.secEdge.slice();
      for (let i = st.length - 1; i >= 0; i--) st.push(g.at(i, 0.88));
      fillPoly(ctx, st, white, 0.9);
      // primaries a touch silvery, uniformly grey (no dark wedge)
      const pri = [];
      for (let i = g.iW; i < g.N; i++) pri.push(g.at(i, lerp(0.3, 0, sstep(g.iW, g.N - 1, i))));
      const priPoly = pri.concat(g.priEdge.slice().reverse());
      fillPoly(ctx, priPoly, far ? COL.farPrim : COL.nearPrim, 0.8);
      // shade: 45 degree hatch, heavier toward the trailing edge (lower right)
      LIB.hatch(ctx, g.poly, {
        angle: -Math.PI / 4, spacing: 7, width: 1.3, color: deep, alpha: 0.75, length: [14, 40], seed: sd(id, 'sh45'), clip: true,
        density: (x, y) => 0.25 + 0.65 * sstep(0.35, 0.95, projV(g, x, y)),
      });
      const sep = new Path2D(), sh = new Path2D();
      g.seps.forEach(([a, b], j) => jline(sep, a[0], a[1], b[0], b[1], sd(id, 'sep', j), bi, 0.6));
      g.shafts.forEach(([a, b], j) => jline(sh, a[0], a[1], b[0], b[1], sd(id, 'sh', j), bi, 0.5));
      strokeP(ctx, sep, deep, 0.95, 1.6);
      strokeP(ctx, sh, white, 0.6, 1.1);
      LIB.inkPath(ctx, g.covEdge, { width: 1.8, color: deep, alpha: 0.95, seed: sd(id, 'cove'), smooth: false, taper: [4, 20], wobble: 0.6 });
      for (let k = 0; k < g.covRows.length; k++) {
        LIB.inkPath(ctx, g.covRows[k], { width: 1.4, color: deep, alpha: 0.8, seed: sd(id, 'covr', k), smooth: false, taper: [6, 20], wobble: 0.6 });
      }
      LIB.inkPath(ctx, g.priEdge, { width: 2, color: deep, seed: sd(id, 'trail'), smooth: false, taper: [10, 4], wobble: 0.4 });
    }
    LIB.inkPath(ctx, g.outlineOpen, { width: wHero, color: ink, seed: sd(id, 'outline'), smooth: false, taper: [14, 14], double: far ? false : { alpha: 0.4, from: 0.55, to: 0.9 } });
  }

  // chord fraction of a point (0 leading, 1 trailing), from the nearest sheet station
  function projV(g, x, y) {
    let best = 0, bd = Infinity;
    for (let i = 0; i < g.N; i += 6) {
      const l = g.Lp[i], t = g.Tp[i];
      const mx = (l[0] + t[0]) / 2, my = (l[1] + t[1]) / 2;
      const d = (x - mx) * (x - mx) + (y - my) * (y - my);
      if (d < bd) {
        bd = d;
        best = i;
      }
    }
    const l = g.Lp[best], t = g.Tp[best];
    const vx = t[0] - l[0], vy = t[1] - l[1];
    const L2 = vx * vx + vy * vy || 1;
    return ((x - l[0]) * vx + (y - l[1]) * vy) / L2;
  }

  // ---------------------------------------------------------------------------
  // draw: tail, body, feet, head, bill, eel
  // ---------------------------------------------------------------------------

  function drawTail(ctx, P, tick, bi) {
    const F = tailGeo(tick);
    const order = [];
    for (let k = 5; k >= 1; k--) order.push(F[k]); // far half, outer first
    for (let k = 5; k >= 1; k--) order.push(F[6 + k]); // near half
    order.push(F[0], F[6]); // T1 pair on top
    for (const f of order) {
      fillPoly(ctx, f.poly, P.plumeWhite);
      if (f.k >= 4) fillPoly(ctx, f.webPoly, f.k === 5 ? P.mantleGrey : COL.webPale);
      if (f.half === 'near') {
        LIB.hatch(ctx, f.poly, { angle: -Math.PI / 4, spacing: 6, width: 1.1, color: P.mantleDeep, alpha: 0.6, length: [8, 20], seed: sd('tailh', f.k), clip: true, density: 0.5 });
      }
      const sh = new Path2D();
      jline(sh, f.shaft[1][0], f.shaft[1][1], f.shaft[9][0], f.shaft[9][1], sd('tsh', f.half, f.k), bi, 0.4);
      strokeP(ctx, sh, P.plumeShade, 0.9, 1.2);
      LIB.inkPath(ctx, f.poly, { closed: true, width: f.k === 0 ? 2.6 : 1.9, color: f.k === 0 || f.k === 5 ? P.ink : P.inkSoft, seed: sd('tail', f.half, f.k), wobble: 0.6 });
    }
  }

  function drawBody(ctx, P, bi) {
    const G = bodyGeo();
    fillPoly(ctx, G.outline, P.breastGrey);
    ctx.save();
    ctx.beginPath();
    trace(ctx, G.outline, true);
    ctx.clip();
    fillPoly(ctx, G.mantle, P.mantleGrey);
    fillPoly(ctx, G.rump, P.plumeWhite);
    fillPoly(ctx, G.throat, P.plumeWhite);
    fillPoly(ctx, G.shade, P.plumeShade, 0.75);
    // scapulars: white tips on the mantle
    const scp = new Path2D();
    for (const [a, b, c] of G.scaps) {
      scp.moveTo(a[0], a[1]);
      scp.quadraticCurveTo(b[0], b[1], c[0], c[1]);
    }
    strokeP(ctx, scp, P.plumeWhite, 0.9, 2.2);
    // contour hatching across the belly on its shadow side (perpendicular to the long axis)
    const dens = (x, y) => {
      const [lx, ly] = toLoc(x, y);
      if (ly <= 0) return 0;
      return sstep(0.3, 0.95, ly / BELLY(lx)) * (0.55 + 0.45 * sstep(-80, 100, lx));
    };
    LIB.hatch(ctx, G.outline, { angle: Math.PI / 3, spacing: 6.5, width: 1.4, color: P.mantleDeep, alpha: 0.85, length: [10, 34], bend: 2.5, seed: sd('bellyh'), density: dens });
    LIB.hatch(ctx, G.outline, {
      angle: Math.PI / 3 + 1.05, spacing: 7, width: 1.2, color: P.mantleDeep, alpha: 0.6, length: [8, 22], seed: sd('bellyx'),
      density: (x, y) => {
        const [lx, ly] = toLoc(x, y);
        return ly > 0 ? sstep(0.7, 1, ly / BELLY(lx)) * sstep(-20, 90, lx) : 0;
      },
    });
    // the mantle's lower edge takes a little shade under the wing root
    LIB.hatch(ctx, G.mantle, { angle: -Math.PI / 4, spacing: 8, width: 1.2, color: P.mantleDeep, alpha: 0.6, length: [8, 22], seed: sd('mantleh'), density: 0.45 });
    // breast texture and flank feather scallops
    LIB.stipple(ctx, G.outline, {
      spacing: 9, r: [0.9, 1.6], color: P.mantleDeep, alpha: 0.45, seed: sd('breast-st'),
      density: (x, y) => {
        const [lx, ly] = toLoc(x, y);
        return lx > -105 && lx < 90 && ly > -10 ? 0.7 : 0;
      },
    });
    const sc = new Path2D();
    for (const [a, b, c, rr] of G.scallops) {
      const j = (h3(Math.round(a[0]), Math.round(a[1]), bi) - 0.5) * 0.8;
      sc.moveTo(a[0] + j, a[1]);
      sc.quadraticCurveTo(b[0], b[1] + j, c[0], c[1]);
    }
    strokeP(ctx, sc, P.inkSoft, 0.4, 1.3);
    ctx.restore();
    LIB.inkPath(ctx, G.outline, { closed: true, width: 5, color: P.ink, seed: sd('body-line'), double: { alpha: 0.4, from: 0.55, to: 0.85 } });
  }

  function drawFeet(ctx, P, bi) {
    const feet = [
      [[-30, 64], [-18, 78]],
      [[-19, 63], [-7, 76.5]],
    ];
    feet.forEach(([a, b], i) => {
      const A = loc(a[0], a[1]), B = loc(b[0], b[1]);
      const dx = B[0] - A[0], dy = B[1] - A[1];
      const len = Math.hypot(dx, dy);
      const d = [dx / len, dy / len], n = [-d[1], d[0]];
      // webbed foot, toes folded back along the belly
      const shape = [
        [A[0] - n[0] * 2, A[1] - n[1] * 2],
        [B[0] - n[0] * 3.3 + d[0] * 1.2, B[1] - n[1] * 3.3 + d[1] * 1.2],
        [B[0] + d[0] * 2.4, B[1] + d[1] * 2.4],
        [B[0] + n[0] * 3.3 + d[0] * 0.6, B[1] + n[1] * 3.3 + d[1] * 0.6],
        [A[0] + n[0] * 2.1, A[1] + n[1] * 2.1],
      ];
      LIB.inkPath(ctx, shape, { closed: true, width: 1.8, color: P.ink, fill: P.legRed, seed: sd('foot', i), wobble: 0.2, taper: [3, 5] });
      const toes = new Path2D();
      for (const k of [-2.7, 0, 2.7]) {
        toes.moveTo(A[0] + d[0] * 4 + n[0] * k * 0.3, A[1] + d[1] * 4 + n[1] * k * 0.3);
        toes.lineTo(B[0] + n[0] * k, B[1] + n[1] * k);
      }
      strokeP(ctx, toes, COL.footDeep, 0.9, 1.2);
    });
  }

  function drawHead(ctx, P, bi) {
    const G = headGeo();
    fillPoly(ctx, G.circle, P.plumeWhite);
    // lower head and throat in shade
    fillPoly(ctx, G.shade, P.plumeShade, 0.6);
    LIB.hatch(ctx, G.shade, { angle: -Math.PI / 4, spacing: 6, width: 1.2, color: P.mantleDeep, alpha: 0.55, length: [8, 18], seed: sd('head-sh'), clip: true, density: 0.6 });
    // black cap with the eye set in its lower edge
    fillPoly(ctx, G.cap, P.capBlack);
    const sheen = new Path2D();
    for (let k = 0; k < 5; k++) {
      const a0 = (205 + k * 8) * DEG, a1 = (240 + k * 11) * DEG, r = HEAD.r - 7 - k * 2.2;
      const j = (h3(k, 9, bi) - 0.5) * 0.6;
      sheen.moveTo(HEAD.x + Math.cos(a0) * r + j, HEAD.y + Math.sin(a0) * r);
      sheen.arc(HEAD.x + j, HEAD.y, r, a0, a1);
    }
    strokeP(ctx, sheen, COL.capSheen, 0.9, 1.4);
    const e = G.eye;
    ctx.save();
    ctx.fillStyle = P.capBlack;
    ctx.strokeStyle = P.inkSoft;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(e[0], e[1], 6, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 0.8;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = P.white;
    ctx.beginPath();
    ctx.arc(e[0] - 2, e[1] - 2, 1.7, 0, TAU);
    ctx.fill();
    ctx.restore();
    // white cheek stripe: a crisp line of white along the cap edge
    LIB.inkPath(ctx, [[386, 881], [398, 876], [414, 869], [432, 861], [452, 850]], { width: 2.4, color: P.plumeWhite, seed: sd('cheek'), taper: [4, 14], wobble: 0.3 });
    LIB.inkPath(ctx, G.outline, { width: 5, color: P.ink, seed: sd('head-line'), smooth: true, taper: [16, 10], double: { alpha: 0.4, from: 0.35, to: 0.7 } });
  }

  function drawBill(ctx, P, bi, part) {
    const G = billGeo();
    if (part === 'tip') {
      fillPoly(ctx, G.tipUp, P.billRed);
      LIB.inkPath(ctx, G.tipUp.slice(0, G.tipUp.length - 2), { width: 2.6, color: P.ink, seed: sd('bill-tip'), taper: [6, 3], wobble: 0.2 });
      return;
    }
    fillPoly(ctx, G.shape, P.billRed);
    LIB.hatch(ctx, G.lower, { angle: Math.atan2(G.d[1], G.d[0]) + 0.5, spacing: 3.2, width: 1.1, color: P.billDeep, alpha: 0.9, length: [4, 10], seed: sd('bill-h'), clip: true });
    const hi = new Path2D();
    trace(hi, G.hi, false);
    strokeP(ctx, hi, COL.billHi, 0.75, 1.6);
    LIB.inkPath(ctx, G.gape, { width: 1.9, color: P.billDeep, seed: sd('gape'), taper: [2, 8], wobble: 0.2 });
    LIB.inkPath(ctx, G.shape, { closed: true, width: 3, color: P.ink, seed: sd('bill-line'), wobble: 0.25, taper: [4, 8] });
  }

  function drawEel(ctx, P, flick, bi) {
    const G = eelGeo(flick);
    fillPoly(ctx, G.fin, P.sandEelBack);
    const fr = new Path2D();
    for (const [a, b] of G.finRays) {
      fr.moveTo(a[0], a[1]);
      fr.lineTo(b[0], b[1]);
    }
    strokeP(ctx, fr, P.inkSoft, 0.7, 0.9);
    LIB.inkPath(ctx, G.fin, { closed: true, width: 2, color: P.ink, seed: sd('eel-fin'), wobble: 0.3, taper: [3, 6] });
    fillPoly(ctx, G.dorsal, P.sandEelBack, 0.9);
    const dr = new Path2D();
    for (const [a, b] of G.dorsalRays) {
      dr.moveTo(a[0], a[1]);
      dr.lineTo(b[0], b[1]);
    }
    strokeP(ctx, dr, P.inkSoft, 0.7, 0.8);
    fillPoly(ctx, G.body, P.sandEel);
    fillPoly(ctx, G.dark, P.sandEelBack);
    // belly shade on the lower right, silver sheen, lateral line, gill cover
    LIB.hatch(ctx, G.body, {
      angle: FISH_ANG + Math.PI / 2 - 0.3, spacing: 3.4, width: 1, color: P.sandEelBack, alpha: 0.75, length: [4, 9], seed: sd('eel-h'), clip: true,
      density: (x, y) => {
        const dx = x - FISH_C[0], dy = y - FISH_C[1];
        return sstep(1, 6, dx * Math.sin(FISH_ANG) * -1 + dy * Math.cos(FISH_ANG));
      },
    });
    LIB.stipple(ctx, G.dark, { spacing: 4.5, r: [0.6, 1.1], color: P.ink, alpha: 0.35, seed: sd('eel-st') });
    const sh = new Path2D();
    trace(sh, G.sheen, false);
    strokeP(ctx, sh, P.white, 0.85, 1.6);
    const ln = new Path2D();
    trace(ln, G.lateral, false);
    strokeP(ctx, ln, P.inkSoft, 0.6, 0.9);
    const gl = new Path2D();
    trace(gl, G.gill, false);
    strokeP(ctx, gl, P.inkSoft, 0.9, 1.3);
    const mo = new Path2D();
    trace(mo, G.mouth, false);
    strokeP(ctx, mo, P.ink, 0.9, 1.2);
    LIB.inkPath(ctx, G.body, { closed: true, width: 2.6, color: P.ink, seed: sd('eel-line'), wobble: 0.35, taper: [4, 8] });
    ctx.save();
    ctx.fillStyle = COL.eelEye;
    ctx.beginPath();
    ctx.arc(G.eye[0], G.eye[1], 3.2, 0, TAU);
    ctx.fill();
    ctx.fillStyle = P.capBlack;
    ctx.beginPath();
    ctx.arc(G.eye[0], G.eye[1], 1.9, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  // speed strokes behind a moving wingtip
  function speedStrokes(ctx, P, tip, prev, key) {
    let ux = prev[0] - tip[0], uy = prev[1] - tip[1];
    const ul = Math.hypot(ux, uy);
    if (ul < 20) return;
    ux /= ul;
    uy /= ul;
    for (const [len, off, j] of [[70, -12, 0], [46, 14, 1], [30, 30, 2]]) {
      const x0 = tip[0] + ux * 16 - uy * off, y0 = tip[1] + uy * 16 + ux * off;
      const x1 = x0 + ux * len, y1 = y0 + uy * len;
      const mx = (x0 + x1) / 2 - uy * len * 0.12, my = (y0 + y1) / 2 + ux * len * 0.12;
      LIB.inkPath(ctx, LIB.smoothPts([[x0, y0], [mx, my], [x1, y1]], false, 3), { width: 2, color: P.ink, seed: sd('speed', key, j), taper: [2, 12], swell: 0.1, wobble: 0.4 });
    }
  }

  // ---------------------------------------------------------------------------
  // overlays
  // ---------------------------------------------------------------------------

  function drawTarget(ctx, P, t) {
    const x = PLUNGE.x, y = PLUNGE.y1;
    ctx.save();
    ctx.strokeStyle = P.annBlue;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    const pulse = 1 + 0.08 * Math.sin(t * TAU * 2);
    ctx.beginPath();
    ctx.ellipse(x, y, 46 * pulse, 11 * pulse, 0, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.ellipse(x, y, 22, 5, 0, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 1;
    const tk = new Path2D();
    for (const s of [-1, 1]) {
      tk.moveTo(x + s * 54, y);
      tk.lineTo(x + s * 70, y);
    }
    tk.moveTo(x, y + 15);
    tk.lineTo(x, y + 27);
    ctx.stroke(tk);
    ctx.restore();
  }

  function drawPlunge(ctx, P, p, bob) {
    if (p <= 0) return;
    const y0 = 978 + bob, y1 = PLUNGE.y1 - 14;
    const yEnd = lerp(y0, y1, p);
    ctx.save();
    ctx.strokeStyle = P.annBlue;
    ctx.fillStyle = P.annBlue;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'butt';
    ctx.setLineDash([14, 10]);
    ctx.beginPath();
    ctx.moveTo(PLUNGE.x, y0);
    ctx.lineTo(PLUNGE.x, yEnd);
    ctx.stroke();
    ctx.setLineDash([]);
    // origin dot under the fish and an arrowhead on the leading end
    ctx.beginPath();
    ctx.arc(PLUNGE.x, y0 - 4, 3.5, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(PLUNGE.x, yEnd + 6);
    ctx.lineTo(PLUNGE.x - 8, yEnd - 10);
    ctx.lineTo(PLUNGE.x, yEnd - 5);
    ctx.lineTo(PLUNGE.x + 8, yEnd - 10);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // the near wingtip's downstroke path: A -> B -> C -> D, drawn on at 24 fps, erased after the snap
  let ARC = null;
  function strokeArc() {
    if (ARC) return ARC;
    const tips = NEAR_K.map((k) => k.Tp);
    const segs = [];
    for (let i = 0; i < 3; i++) {
      const a = tips[i], b = tips[i + 1];
      const c = bowMid(a, b, BODY_C, 60);
      const pts = [];
      for (let j = 0; j <= 20; j++) {
        const u = j / 20;
        pts.push([(1 - u) * (1 - u) * a[0] + 2 * u * (1 - u) * c[0] + u * u * b[0], (1 - u) * (1 - u) * a[1] + 2 * u * (1 - u) * c[1] + u * u * b[1]]);
      }
      segs.push(pts);
    }
    ARC = segs;
    return ARC;
  }

  function drawStrokeArc(ctx, P, on, off, bob) {
    if (on <= off) return;
    const segs = strokeArc();
    const pts = [];
    const total = 60;
    const i0 = Math.round(off * total), i1 = Math.round(on * total);
    for (let i = i0; i <= i1; i++) {
      const s = Math.min(2, Math.floor(i / 20)), j = i - s * 20;
      const q = segs[s][Math.min(20, j)];
      pts.push([q[0] + 30, q[1] + bob * (i / total)]);
    }
    if (pts.length < 2) return;
    ctx.save();
    ctx.strokeStyle = P.annBlue;
    ctx.fillStyle = P.annBlue;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([14, 10]);
    ctx.lineDashOffset = -i0 * 4;
    ctx.beginPath();
    trace(ctx, pts, false);
    ctx.stroke();
    ctx.setLineDash([]);
    const p = pts[pts.length - 1], q = pts[Math.max(0, pts.length - 4)];
    const ang = Math.atan2(p[1] - q[1], p[0] - q[0]);
    ctx.beginPath();
    ctx.moveTo(p[0] + Math.cos(ang) * 5, p[1] + Math.sin(ang) * 5);
    ctx.lineTo(p[0] - Math.cos(ang - 0.45) * 15, p[1] - Math.sin(ang - 0.45) * 15);
    ctx.lineTo(p[0] - Math.cos(ang) * 8, p[1] - Math.sin(ang) * 8);
    ctx.lineTo(p[0] - Math.cos(ang + 0.45) * 15, p[1] - Math.sin(ang + 0.45) * 15);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawRing(ctx, P, r, alpha, cx, cy) {
    if (alpha <= 0) return;
    const ring = new Path2D();
    ring.moveTo(cx + r, cy);
    ring.arc(cx, cy, r, 0, TAU);
    for (let q = 0; q < 4; q++) {
      const a = Math.PI / 4 + (q * Math.PI) / 2;
      ring.moveTo(cx + Math.cos(a) * (r - 10), cy + Math.sin(a) * (r - 10));
      ring.lineTo(cx + Math.cos(a) * (r + 10), cy + Math.sin(a) * (r + 10));
    }
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = P.ink;
    ctx.lineWidth = 6;
    ctx.globalAlpha = alpha * 0.22;
    ctx.stroke(ring);
    ctx.strokeStyle = P.annYellow;
    ctx.lineWidth = 3;
    ctx.globalAlpha = alpha;
    ctx.stroke(ring);
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // timing
  // ---------------------------------------------------------------------------

  // wing drawing per drawing index k (on twos): 0 = G5 raised, 1 = fully down, < 0 = overshoot
  function wingS(k) {
    if (k <= 0) return 0;
    if (k === 1) return 1 / 3;
    if (k === 2) return 2 / 3;
    if (k <= 5) return 1; // held at the bottom until the snap
    if (k === Math.round(B2 * 12)) return -0.05; // T 0.5: snap up, 105 percent, two frames
    if (k === Math.round(B3 * 12)) return 0.45; // T 1.0: one shallow drawing down
    return 0;
  }
  function flickAt(k) {
    if (k === 6) return 1; // beat 2: the fish flips its tail
    if (k === 7) return -0.6;
    if (k === 8) return 0.3;
    return 0.1 * Math.sin(k * 1.9);
  }

  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const L = info.lib;
      const P = L.pal;
      const E = L.ease;
      const t = clamp(tIn, 0, info.dur);
      const k = Math.floor(t * 12 + 1e-6); // drawing index on twos
      const tw = k / 12;
      const bi = L.boil(info.T);
      const fr = Math.round(t * 24);
      const hit = (a, frames, e, lead = 1) => (t < a - 1e-6 ? 0 : (e || ((u) => u))(clamp((t - a) / (frames * FR) + lead / frames)));

      const s = wingS(k);
      const bob = -8 * clamp(s, 0, 1) + (s < 0 ? 2 : 0);
      const tick = [0, 3, 0, -3][k % 4];

      // 1 stripes: drift 6 px per beat, jolt 8 px on beat 2 and settle over 4 frames
      const fj = fr - 12;
      const jolt = fj >= 0 && fj < 4 ? 8 * (1 - fj / 4) : 0;
      L.stripes(ctx, { colors: [P.stripeCream, P.stripeYellow], width: 140, angle: -0.52, offset: 12 * t + jolt, seed: sd('stripes') });

      // camera: push-in 1.00 to 1.05 with inOutSine. The storyboard centres it on (540, 820); holding
      // screen point (540, 380) instead keeps the G5 wingtips at or below y 220 at full zoom.
      const zoom = 1 + 0.05 * E.inOutSine(t / info.dur);
      const cam = { x: 540, y: 380 - (380 - 960) / zoom, zoom };

      L.camera(ctx, cam, (ctx) => {
        drawShore(ctx, P, bi);
        drawSea(ctx, P, tw, bi);
        drawShingle(ctx, P, bi);
        drawConstruction(ctx, P, bi);
        drawTarget(ctx, P, t);

        // the bird rises a little on each downstroke
        ctx.save();
        ctx.translate(0, bob);
        const far = wingGeo('far', s);
        const near = wingGeo('near', s);
        drawWing(ctx, P, far, bi, true);
        drawTail(ctx, P, tick, bi);
        drawFeet(ctx, P, bi);
        drawBody(ctx, P, bi);
        drawWing(ctx, P, near, bi, false);
        drawHead(ctx, P, bi);
        drawBill(ctx, P, bi, 'whole');
        drawEel(ctx, P, flickAt(k), bi);
        drawBill(ctx, P, bi, 'tip');
        // speed strokes trail the wingtips on the moving drawings
        if (k >= 1 && k <= 3) {
          speedStrokes(ctx, P, near.p.Tp, wingGeo('near', wingS(k - 1)).p.Tp, 'n' + k);
        } else if (k === 6 || k === 12 || k === 13) {
          const prevS = wingS(k - 1);
          speedStrokes(ctx, P, near.p.Tp, wingGeo('near', prevS).p.Tp, 'n' + k);
        }
        ctx.restore();

        // 12 overlays
        // dashed plunge line, drawn on over the shot (a stub already shows on the thumbnail)
        drawPlunge(ctx, P, lerp(0.16, 1, E.inOutSine(clamp(t / 1.3))), bob);
        // the near wingtip's stroke path: drawn on through the downstroke, erased after the snap
        const on = clamp(fr / 6);
        const off = clamp((fr - 11) / 6);
        drawStrokeArc(ctx, P, on, off, bob);
        // yellow ring from the body on beat 2: radius 60 to 620 over 18 frames, gone by T 1.25
        if (t >= B2 - 1e-6) {
          const p = hit(B2, 18, E.outExpo);
          const alpha = 1 - sstep(0.85, 1.25, t);
          drawRing(ctx, P, 60 + 560 * p, alpha, BODY_C[0], BODY_C[1] + bob);
        }
      });
    },
  });
})();
