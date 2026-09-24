// 16 spring-egg : "Spring: a new egg". Illustrated, global T 29.5 to 30.5 (1.0 s).
// The worn returning female clings under a young spring milkweed leaf, drums it with her forelegs on
// four 16ths (yellow tap rings), lays one egg on the 30.0 beat, and a snap zoom to 47x about (540, 900)
// lands the inked egg exactly on the G1 outline for the match cut into 17 egg-loop.
// Layers, back to front:
//   1 stripes (stripeCream / stripeSpring), construction lines, zoom guides
//   2 the butterfly: far legs, hindwing, forewing, abdomen, thorax, head, antennae, near legs, forelegs
//   3 the leaf underside (world drawing to zoom 8, then a macro drawing in screen space), trichome fringe
//   4 the egg (G1 scaled by g = zoom / 47 about (540, 900))
//   5 overlays: annYellow tap rings, annBlue costa ruler and abdomen arc, egg pop ring with 8 ticks, target ring
//     (lands on radius 470), annBlue brackets and the inkFaint tick scale / G1 stations that 17 inherits
(function () {
  'use strict';
  const FILM = window.FILM;
  const L = FILM.lib;
  const ID = 'spring-egg';
  const TAU = Math.PI * 2;
  const DEG = Math.PI / 180;
  const FR = 1 / 24;
  const Z_END = 47;
  const LAY_T = 0.5; // local time of the 30.0 beat
  const ZOOM_SPAN = 11 * FR; // outExpo over the last 11 frames, so the last drawn frame sits exactly on G1
  const TAPS = [0, 0.125, 0.25, 0.375];
  const EGG_CX = 540, EGG_CY = 900; // zoom anchor
  const MARGIN_Y = 900 - 380 / Z_END; // 891.915: leaf lower edge at the egg, world

  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, u) => a + (b - a) * u;
  const sstep = (a, b, x) => {
    const u = clamp((x - a) / (b - a));
    return u * u * (3 - 2 * u);
  };
  const sd = (...k) => L.hash(ID, ...k) & 0x7fffffff;

  // ---------------------------------------------------------------------------
  // G1 profile, identical to 02 egg-blueprint (monotone Hermite with an elliptical cap)
  // ---------------------------------------------------------------------------
  // Body half-width is FILM.GEO G1. The last 20 px stays a local elliptical cap
  // (half-width 60 at y 1260, vertical at 1280). The shared spline ends in a point.
  const CAP_B = 70;
  const CAP_YC = 1280 - CAP_B;
  const CAP_A = Math.sqrt((60 * 1.25 * CAP_B * CAP_B) / (CAP_B - 20));
  function hw(y) {
    if (y <= 520) return 180;
    if (y >= 1280) return 0;
    if (y > 1260) {
      const u = (y - CAP_YC) / CAP_B;
      return CAP_A * Math.sqrt(Math.max(0, 1 - u * u));
    }
    return FILM.lib.geo('G1').hw(y);
  }
  function sidePts(sign, step) {
    const out = [];
    for (let y = 520; y < 1260 - 1e-6; y += step) out.push([540 + sign * hw(y), y]);
    const f0 = Math.asin(50 / 70);
    for (let i = 0; i <= 20; i++) {
      const f = f0 + ((Math.PI / 2 - f0) * i) / 20;
      out.push([540 + sign * CAP_A * Math.cos(f), CAP_YC + CAP_B * Math.sin(f)]);
    }
    return out;
  }
  // egg surface seen slightly from below (same bow as 02)
  const TILT = 0.055;
  function surf(theta, y) {
    const h = hw(y);
    const c = TILT * sstep(520, 700, y);
    return [540 + h * Math.sin(theta), y - c * h * Math.cos(theta)];
  }
  const EGG = (() => {
    const g = {};
    const l = sidePts(-1, 8), r = sidePts(1, 8);
    g.outline = [[540 - 180, 520]].concat(l, r.slice().reverse(), [[540 + 180, 520]]);
    g.outline = l.concat(r.slice(0, -1).reverse());
    g.ridges = [];
    for (let k = 0; k < 18; k++) {
      const th = (-85 + 10 * k) * DEG;
      const pts = [];
      for (let y = 520; y <= 1256; y += 8) {
        const p = surf(th, y);
        if (Math.hypot(p[0] - 540, p[1] - 1262) < 30) break;
        pts.push(p);
      }
      g.ridges.push({ th, pts });
    }
    g.ribs = [];
    for (let j = 0; j < 34; j++) {
      const s = (j + 1) / 35;
      const y = 520 + 716 * (1 - Math.pow(1 - s, 1.3));
      const segs = [];
      for (let k = 0; k < 17; k++) {
        const a = (-85 + 10 * k) * DEG, b = (-75 + 10 * k) * DEG;
        const p1 = surf((a + b) / 2, y);
        if (Math.hypot(p1[0] - 540, p1[1] - 1262) < 32) continue;
        segs.push([surf(a, y), p1, surf(b, y), (a + b) / 2]);
      }
      g.ribs.push({ y, segs });
    }
    // right third of the shell (shadow side), as a polygon
    g.shade = [];
    for (let y = 520; y <= 1260; y += 10) g.shade.push(surf(20 * DEG, y));
    for (let y = 1260; y >= 520; y -= 10) g.shade.push([540 + hw(y) + 4, y]);
    g.rimL = [];
    for (let y = 530; y <= 1250; y += 10) g.rimL.push([540 - hw(y) - 3, y]);
    for (let y = 1250; y >= 530; y -= 10) g.rimL.push([540 - hw(y) * 0.8, y]);
    g.rimR = [];
    for (let y = 530; y <= 1250; y += 10) g.rimR.push([540 + hw(y) * 0.72, y]);
    for (let y = 1250; y >= 530; y -= 10) g.rimR.push([540 + hw(y) + 3, y]);
    return g;
  })();

  // ---------------------------------------------------------------------------
  // Camera: world centre (540, 900 + 60 / zoom), so world (540, 900) stays on screen (540, 900)
  // ---------------------------------------------------------------------------
  function zoomAt(t) {
    if (t < LAY_T) return 1;
    const u = (t - LAY_T) / ZOOM_SPAN;
    return Math.exp(Math.log(Z_END) * L.ease.outExpo(u > 1 - 1e-3 ? 1 : u)); // the last frame lands exactly on 47x despite float time
  }
  function view(z) {
    const V = { z };
    V.x = (wx) => EGG_CX + (wx - EGG_CX) * z;
    V.y = (wy) => EGG_CY + (wy - EGG_CY) * z;
    V.p = (p) => [V.x(p[0]), V.y(p[1])];
    V.mp = (pts) => pts.map(V.p);
    V.wx = (sx) => EGG_CX + (sx - EGG_CX) / z;
    V.wy = (sy) => EGG_CY + (sy - EGG_CY) / z;
    V.k = Math.min(z, 1.8); // pen weight growth for the world drawing
    return V;
  }

  // batched strokes: [x0,y0,x1,y1] lines or [x0,y0,cx,cy,x1,y1] quads
  function strokeBatch(ctx, segs, width, color, alpha) {
    if (!segs.length) return;
    const p = new Path2D();
    for (const s of segs) {
      p.moveTo(s[0], s[1]);
      if (s.length >= 6) p.quadraticCurveTo(s[2], s[3], s[4], s[5]);
      else p.lineTo(s[2], s[3]);
    }
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    ctx.globalAlpha *= alpha;
    ctx.stroke(p);
    ctx.restore();
  }
  function dotBatch(ctx, dots, color, alpha) {
    if (!dots.length) return;
    const p = new Path2D();
    for (const d of dots) {
      p.moveTo(d[0] + d[2], d[1]);
      p.arc(d[0], d[1], d[2], 0, TAU);
    }
    ctx.save();
    ctx.fillStyle = color;
    ctx.globalAlpha *= alpha;
    ctx.fill(p);
    ctx.restore();
  }
  // Sutherland-Hodgman clip of a polygon to a rectangle (keeps hatch and stipple work on the visible frame)
  function clipPolyRect(pts, x0, y0, x1, y1) {
    let out = pts;
    const edges = [(p) => p[0] >= x0, (p) => p[0] <= x1, (p) => p[1] >= y0, (p) => p[1] <= y1];
    const cut = [(a, b) => [x0, a[1] + ((b[1] - a[1]) * (x0 - a[0])) / (b[0] - a[0])], (a, b) => [x1, a[1] + ((b[1] - a[1]) * (x1 - a[0])) / (b[0] - a[0])],
      (a, b) => [a[0] + ((b[0] - a[0]) * (y0 - a[1])) / (b[1] - a[1]), y0], (a, b) => [a[0] + ((b[0] - a[0]) * (y1 - a[1])) / (b[1] - a[1]), y1]];
    for (let e = 0; e < 4 && out.length; e++) {
      const inp = out;
      out = [];
      for (let i = 0; i < inp.length; i++) {
        const a = inp[(i + inp.length - 1) % inp.length], b = inp[i];
        const ia = edges[e](a), ib = edges[e](b);
        if (ib) {
          if (!ia) out.push(cut[e](a, b));
          out.push(b);
        } else if (ia) out.push(cut[e](a, b));
      }
    }
    return out;
  }
  // a plain stroked polyline (every nth point), for secondary lines that do not need the ink ribbon
  function polyStroke(ctx, pts, width, color, alpha, every) {
    if (pts.length < 2) return;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = every; i < pts.length; i += every) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;
    ctx.globalAlpha *= alpha;
    ctx.stroke();
    ctx.restore();
  }
  function tracePoly(ctx, pts) {
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) (i ? ctx.lineTo : ctx.moveTo).call(ctx, pts[i][0], pts[i][1]);
    ctx.closePath();
  }
  function fillPoly(ctx, pts, color, alpha = 1) {
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.fillStyle = color;
    tracePoly(ctx, pts);
    ctx.fill();
    ctx.restore();
  }
  function cumLen(pts) {
    const c = [0];
    for (let i = 1; i < pts.length; i++) c.push(c[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    return c;
  }
  function pointAt(pts, cum, d) {
    if (d <= 0) return pts[0].slice();
    const n = pts.length - 1;
    if (d >= cum[n]) return pts[n].slice();
    let i = 1;
    while (i < n && cum[i] < d) i++;
    const u = (d - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]);
    return [lerp(pts[i - 1][0], pts[i][0], u), lerp(pts[i - 1][1], pts[i][1], u)];
  }
  function tangentAt(pts, cum, d) {
    const a = pointAt(pts, cum, d - 3), b = pointAt(pts, cum, d + 3);
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
  }
  // a ribbon polygon around a centreline with a width profile fn(u) (full width)
  function ribbonPoly(pts, widthFn) {
    const cum = cumLen(pts);
    const T = cum[cum.length - 1] || 1;
    const lft = [], rgt = [];
    for (let i = 0; i < pts.length; i++) {
      const [tx, ty] = tangentAt(pts, cum, cum[i]);
      const w = widthFn(cum[i] / T) / 2;
      lft.push([pts[i][0] - ty * w, pts[i][1] + tx * w]);
      rgt.push([pts[i][0] + ty * w, pts[i][1] - tx * w]);
    }
    return lft.concat(rgt.reverse());
  }

  // ===========================================================================
  // The leaf underside, world drawing (zoom < 8)
  // ===========================================================================
  // lower margin: flat at the egg, rising gently to the frame sides with a soft wave
  function marginY(x) {
    const d = x - EGG_CX;
    return MARGIN_Y - 0.00017 * d * d + 7 * Math.sin(d / 95) * sstep(160, 420, Math.abs(d));
  }
  // midrib runs off the top right toward the tip off the left edge; pinnate veins arch toward the tip
  const MIDRIB = L.smoothPts([[1260, -40], [980, 90], [700, 210], [420, 318], [120, 420], [-220, 520]], false, 20);

  // leaf frame: arc length s along the midrib (petiole top right, apex off the left edge), depth n along the
  // normal toward the lower margin (n < 0 is the blade above the midrib)
  const MR = (() => {
    const cum = cumLen(MIDRIB);
    const T = cum[cum.length - 1];
    const step = 4;
    const n = Math.ceil(T / step) + 1;
    const X = new Float64Array(n), Y = new Float64Array(n), TX = new Float64Array(n), TY = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const s = Math.min(T, i * step);
      const p = pointAt(MIDRIB, cum, s);
      const a = pointAt(MIDRIB, cum, s - 16), b = pointAt(MIDRIB, cum, s + 16);
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      X[i] = p[0];
      Y[i] = p[1];
      TX[i] = (b[0] - a[0]) / l;
      TY[i] = (b[1] - a[1]) / l;
    }
    return { X, Y, TX, TY, n, step, T };
  })();
  function mrAt(s) {
    const f = s / MR.step;
    const i = Math.floor(f);
    if (i < 0) return [MR.X[0] + MR.TX[0] * s, MR.Y[0] + MR.TY[0] * s, MR.TX[0], MR.TY[0]];
    if (i >= MR.n - 1) {
      const j = MR.n - 1, e = s - MR.T;
      return [MR.X[j] + MR.TX[j] * e, MR.Y[j] + MR.TY[j] * e, MR.TX[j], MR.TY[j]];
    }
    const u = f - i;
    return [lerp(MR.X[i], MR.X[i + 1], u), lerp(MR.Y[i], MR.Y[i + 1], u), lerp(MR.TX[i], MR.TX[i + 1], u), lerp(MR.TY[i], MR.TY[i + 1], u)];
  }
  const sn2w = (s, n) => {
    const m = mrAt(s);
    return [m[0] + m[3] * n, m[1] - m[2] * n];
  };
  function w2sn(x, y) {
    let s = (x - MR.X[0]) * MR.TX[0] + (y - MR.Y[0]) * MR.TY[0];
    let m;
    for (let it = 0; it < 3; it++) {
      m = mrAt(s);
      s += (x - m[0]) * m[2] + (y - m[1]) * m[3];
    }
    m = mrAt(s);
    return [s, (x - m[0]) * m[3] - (y - m[1]) * m[2]];
  }
  function depthLow(s) {
    const m = mrAt(s);
    const nx = m[3], ny = -m[2];
    let n = (MARGIN_Y - m[1]) / ny;
    for (let it = 0; it < 5; it++) n = (marginY(m[0] + nx * n) - m[1]) / ny;
    return n;
  }
  // s of a vein at depth |n| (table every 3 px, extrapolated past the ends)
  function Fat(v, n) {
    const a = Math.abs(n) / 3;
    const F = v.F, m = F.length - 1;
    if (a >= m) return F[m] + (F[m] - F[m - 1]) * (a - m);
    const i = Math.floor(a);
    return lerp(F[i], F[i + 1], a - i);
  }
  const slopeAt = (v, n) => (Fat(v, Math.abs(n) + 1.5) - Fat(v, Math.max(0, Math.abs(n) - 1.5))) / (Math.abs(n) + 1.5 - Math.max(0, Math.abs(n) - 1.5));

  // brochidodromous side veins: leave the midrib nearly straight, bend toward the apex, and loop into the
  // next vein 40 to 60 px inside the margin; spacing and angles vary vein to vein
  const LV = (() => {
    const r = L.rng(sd('leafVeins'));
    const build = (s0, th0, dth, thE, sign, gap) => {
      const sn = [[s0, 0]];
      let s = s0, n = 0;
      for (let i = 0; i < 700; i++) {
        const H = sign > 0 ? depthLow(s) : 900;
        const nE = sign > 0 ? H - gap - 10 : 900;
        const rr = Math.abs(n) / H, rE = nE / H;
        if (rr >= rE) break;
        const q = clamp((rr - 0.34) / Math.max(0.05, rE - 0.34));
        const th = th0 + (thE - th0) * q * q * (3 - 2 * q) + dth * (1 - sstep(0, 0.36, rr));
        s += Math.cos(th) * 4;
        n += sign * Math.sin(th) * 4;
        sn.push([s, n]);
        if (sign < 0) {
          const w = sn2w(s, n);
          if (w[1] < -80 || w[0] < -120) break;
        }
      }
      const F = [];
      const nmax = Math.abs(sn[sn.length - 1][1]);
      let j = 0;
      for (let a = 0; a <= nmax + 3; a += 3) {
        while (j < sn.length - 2 && Math.abs(sn[j + 1][1]) < a) j++;
        const n0 = Math.abs(sn[j][1]), n1 = Math.abs(sn[j + 1][1]);
        F.push(lerp(sn[j][0], sn[j + 1][0], (a - n0) / Math.max(1e-6, n1 - n0)));
      }
      return { s0, th0, thE, sign, sn, F, nEnd: nmax, loop: null, nJ: 0 };
    };
    const lower = [], upper = [];
    let s = 26;
    for (let k = 0; s < MR.T + 300; k++) {
      const alt = k % 2 ? 1 : -1;
      lower.push(build(s, 64 * DEG, (alt * (3.5 + 1.5 * r())) * DEG, (27 + 5 * r()) * DEG, 1, 40 + 20 * r()));
      s += 104 + 44 * r();
    }
    s = 70;
    for (let k = 0; s < MR.T + 300; k++) {
      const alt = k % 2 ? 1 : -1;
      upper.push(build(s, 60 * DEG, (alt * (3.5 + 1.5 * r())) * DEG, (38 + 6 * r()) * DEG, -1, 0));
      s += 110 + 40 * r();
    }
    // arches: each lower vein loops toward the apex and joins the next one up
    for (let k = 0; k < lower.length - 1; k++) {
      const v = lower[k], w = lower[k + 1];
      const A = v.sn[v.sn.length - 1];
      let nJ = A[1] - 26 - 12 * r();
      let sJ = Fat(w, nJ);
      while (sJ < A[0] + 46 && nJ > A[1] * 0.55) {
        nJ -= 8;
        sJ = Fat(w, nJ);
      }
      const span = sJ - A[0];
      const P1 = [A[0] + Math.cos(v.thE) * span * 0.45, A[1] + Math.sin(v.thE) * span * 0.45];
      const P2 = [sJ - 0.77 * span * 0.4, nJ + 0.64 * span * 0.4];
      const loop = [];
      for (let i = 1; i <= 14; i++) {
        const u = i / 14, a = 1 - u;
        loop.push([a * a * a * A[0] + 3 * a * a * u * P1[0] + 3 * a * u * u * P2[0] + u * u * u * sJ, a * a * a * A[1] + 3 * a * a * u * P1[1] + 3 * a * u * u * P2[1] + u * u * u * nJ]);
      }
      v.loop = loop;
      v.nJ = nJ;
    }
    const world = (v) => {
      const sp = v.sn.map((q) => sn2w(q[0], q[1]));
      const lp = v.loop ? v.loop.map((q) => sn2w(q[0], q[1])) : [];
      const all = sp.concat(lp);
      return { pts: all, frac: cumLen(sp).pop() / Math.max(1, cumLen(all).pop()) };
    };
    for (const v of lower.concat(upper)) Object.assign(v, { world: world(v) });
    return { lower, upper };
  })();

  // which panel a leaf point sits in: [lowerSide, k, w (0 at vein k, 1 at vein k+1), perpendicular width, depth]
  function panelAt(xw, yw) {
    const [s, n] = w2sn(xw, yw);
    const low = n >= 0;
    const list = low ? LV.lower : LV.upper;
    const t = Math.abs(n);
    if (t < 14) return null;
    let a = 0, b = list.length - 1;
    if (s < Fat(list[0], t) || s >= Fat(list[b], t)) return null;
    while (b - a > 1) {
      const m = (a + b) >> 1;
      if (Fat(list[m], t) <= s) a = m;
      else b = m;
    }
    const sa = Fat(list[a], t), sb = Fat(list[b], t);
    const w = (s - sa) / Math.max(1e-6, sb - sa);
    const sl = lerp(slopeAt(list[a], t), slopeAt(list[b], t), w);
    let loopDist = 1e5;
    if (low && list[a].loop) loopDist = lerp(list[a].sn[list[a].sn.length - 1][1], list[a].nJ, w) - t;
    return [low, a, w, ((sb - sa) / Math.sqrt(1 + sl * sl)), t, loopDist];
  }
  // tone rules between the veins, light from the upper left: a lit strip beside the vein that faces the light,
  // the dark half next to it, a mid tone over the rest, and the curl shade along the lower margin
  const litDist = (low, w, perp) => (low ? w : 1 - w) * perp;
  const curlAt = (xw, yw) => sstep(150, 60, marginY(xw) - yw);
  function toneA(low, w, perp, xw, yw, t, z) {
    const ld = litDist(low, w, perp) + 5 * L.noise1(t * 0.018 + w * 7, sd('litN'));
    const ramp = z > 2 ? Math.max(9, 80 / z) : 9;
    return sstep(18, 18 + ramp, ld) * (0.8 + 0.2 * L.noise2(xw / 150, yw / 150, sd('toneA')));
  }
  function toneB(low, w, perp, xw, yw, t, z) {
    const ld = litDist(low, w, perp) + 5 * L.noise1(t * 0.018 + w * 7, sd('litN'));
    const ramp = z > 2 ? Math.max(10, 80 / z) : 10;
    const out = sstep(22, 22 + ramp, ld);
    const half = sstep(0.6, 0.48, low ? w : 1 - w);
    const curl = low ? curlAt(xw, yw) : 0;
    return Math.max(out * half, curl * (0.55 + 0.45 * out));
  }

  // hatch rows that follow the veins: each row interpolates the two bounding veins, so strokes run parallel to them
  function veinRows(V, spacing, lenR, gapR, dens, key) {
    const z = V.z;
    const buckets = [[], [], []];
    const c = [w2sn(V.wx(-40), V.wy(-40)), w2sn(V.wx(1120), V.wy(-40)), w2sn(V.wx(-40), V.wy(1960)), w2sn(V.wx(1120), V.wy(1960))];
    const vs0 = Math.min(c[0][0], c[1][0], c[2][0], c[3][0]), vs1 = Math.max(c[0][0], c[1][0], c[2][0], c[3][0]);
    const vn0 = Math.min(c[0][1], c[1][1], c[2][1], c[3][1]), vn1 = Math.max(c[0][1], c[1][1], c[2][1], c[3][1]);
    const bi = L.boil(L.T);
    const bx0 = -30, bx1 = 1110, by0 = -30, by1 = 1950;
    for (const low of [true, false]) {
      const list = low ? LV.lower : LV.upper;
      const sg = low ? 1 : -1;
      for (let k = 0; k < list.length - 1; k++) {
        const pa = list[k], pb = list[k + 1];
        if (low && !pa.loop) continue;
        const aEnd = low ? pa.sn[pa.sn.length - 1][1] : Math.min(pa.nEnd, pb.nEnd);
        const tMin = low ? Math.max(16, vn0) : Math.max(16, -vn1);
        const tMaxV = low ? vn1 : -vn0;
        if (tMin > Math.min(aEnd, tMaxV)) continue;
        if (Math.max(Fat(pb, tMin), Fat(pb, aEnd)) < vs0 || Math.min(pa.s0, Fat(pa, aEnd)) > vs1) continue;
        const tm = (16 + aEnd) / 2;
        const sl = slopeAt(pa, tm);
        const perpM = (Fat(pb, tm) - Fat(pa, tm)) / Math.sqrt(1 + sl * sl);
        const N = Math.max(1, Math.round((perpM * z) / spacing));
        const ph = L.h3(k, low ? 1 : 2, sd(key, 'ph'));
        for (let i = 0; i < N; i++) {
          const r = L.rng(sd(key, low ? 1 : 2, k, i));
          const w = clamp((i + 0.5 + (r() - 0.5) * 0.5) / N, 0.004, 0.996);
          const rowTh = ((i * 0.6180339887 + ph) % 1) * 0.94 + 0.03;
          const tEnd = low ? lerp(aEnd, pa.nJ, w) - 5 : aEnd;
          const t1 = Math.min(tEnd, tMaxV + 20);
          let t = 16 + r() * (lenR[0] / z);
          if (t < tMin - 60 / z) t = tMin - 60 / z + r() * (lenR[0] / z);
          let sid = 0;
          while (t < t1) {
            const slp = lerp(slopeAt(pa, t), slopeAt(pb, t), w);
            const q = Math.sqrt(1 + slp * slp);
            const len = lerp(lenR[0], lenR[1], r()) / z;
            const ta = t, tb = Math.min(tEnd, t + len / q);
            t = tb + lerp(gapR[0], gapR[1], r()) / z / q;
            const bucket = (r() * 3) | 0;
            const jit = r() - 0.5;
            if (tb - ta < 2 / z) continue;
            const tc = (ta + tb) / 2;
            const sAt = (tt) => lerp(Fat(pa, tt), Fat(pb, tt), w);
            const wm = sn2w(sAt(tc), sg * tc);
            let d = dens(low, w, (Fat(pb, tc) - Fat(pa, tc)) / q, wm[0], wm[1], tc);
            if (z > 2) {
              const fadeW = 80 / z;
              d *= sstep(tEnd, tEnd - fadeW, tc);
            }
            if (d <= rowTh + 0.1 * L.noise1(tc * 0.02 + i * 7.31, sd(key, 'e'))) continue;
            const w0 = sn2w(sAt(ta), sg * ta), w1 = sn2w(sAt(tb), sg * tb);
            const p0 = V.p(w0), p1 = V.p(w1), pm = V.p(wm);
            if (pm[0] < bx0 || pm[0] > bx1 || pm[1] < by0 || pm[1] > by1) continue;
            sid++;
            const j0 = (L.h3(sid, i + k * 131, bi + 17) - 0.5) * 0.9 + jit * 0.8;
            const j1 = (L.h3(i + k * 131, sid, bi + 23) - 0.5) * 0.9 - jit * 0.8;
            buckets[bucket].push([p0[0] + j0, p0[1] - j0 * 0.5, 2 * pm[0] - (p0[0] + p1[0]) / 2, 2 * pm[1] - (p0[1] + p1[1]) / 2, p1[0] + j1, p1[1] + j1 * 0.5]);
          }
        }
      }
    }
    return buckets;
  }
  function drawBuckets(ctx, buckets, width, color, alpha) {
    const A = [0.74, 0.88, 1], Wd = [0.85, 1, 1.15];
    for (let i = 0; i < 3; i++) strokeBatch(ctx, buckets[i], width * Wd[i], color, alpha * A[i]);
  }

  function leafPolyScreen(V) {
    const pts = [[-30, -30], [1110, -30]];
    for (let sx = 1110; sx >= -30; sx -= 15) pts.push([sx, V.y(marginY(V.wx(sx)))]);
    return pts;
  }

  function drawLeafWorld(ctx, V, P) {
    const z = V.z, k = V.k;
    const st = z > 2 ? 7 : 2.5; // resample step for long inked lines under the zoom
    const poly = leafPolyScreen(V);
    fillPoly(ctx, poly, P.milkweedYoung);
    const my = (sx) => V.y(marginY(V.wx(sx)));
    // tertiary vein net first, so the hatching and the keels sit over it
    L.hexLattice(ctx, poly, { r: 17 * Math.min(z, 2.5), jitter: 6, width: 1, color: P.milkweedPale, alpha: 0.45, seed: sd('lfNet'), boilAmp: 0.3 });
    // tone step 2: 8 px hatching parallel to the side veins, off the lit strips
    drawBuckets(ctx, veinRows(V, 8, [14, 44], [2, 7], (a, b, c, d, e, f2) => toneA(a, b, c, d, e, f2, z), 'rowA'), 1.4, P.milkweedDeep, 0.8);
    // tone step 3: 5 px on the dark half of each panel and in the curl band, then a cross layer
    const zSoft = z > 2 ? 0.6 : 1;
    drawBuckets(ctx, veinRows(V, 5, [10, 30], [2, 6], (a, b, c, d, e, f2) => toneB(a, b, c, d, e, f2, z) * zSoft, 'rowB'), 1.45, L.mix(P.milkweedDeep, P.ink, 0.32), 0.85);
    const fadeW = z > 2 ? 80 / z : 8;
    const toneScreen = (x, y) => {
      const xw = V.wx(x), yw = V.wy(y);
      const pa = panelAt(xw, yw);
      const curl = curlAt(xw, yw);
      if (!pa) return curl;
      const loopK = sstep(-fadeW, fadeW, pa[5]);
      const tb = toneB(pa[0], pa[2], pa[3], xw, yw, pa[4], z) * 0.95 * zSoft;
      return lerp(curl * 0.9, tb, loopK);
    };
    L.hatch(ctx, poly, { angle: -0.62, spacing: 7, width: 1.2, color: P.ink, alpha: 0.38, length: [8, 22], gap: [2, 6], seed: sd('lfX1'), density: toneScreen });
    // the curl: margin band pushed darker; ramp at least 80 screen px when zoomed
    const curlSpan = Math.max(80, 200 * Math.min(z, 2));
    L.crossHatch(ctx, poly, { spacing: 5, crossSpacing: 7, width: 1.2, color: L.mix(P.milkweedDeep, P.ink, 0.25), alpha: 0.75, tone: 0.6, length: [8, 22], seed: sd('lfX'),
      density: (x, y) => sstep(my(x) - curlSpan, my(x) - 20, y) * (0.75 + 0.25 * L.noise2(x / 120, 3, sd('lfXn'))) });
    L.hatch(ctx, poly, { angle: 1.83, spacing: 5, width: 1.1, color: P.ink, alpha: 0.3, length: [8, 20], seed: sd('lfH3'),
      density: (x, y) => sstep(my(x) - Math.max(80, 100 * Math.min(z, 2)), my(x) - 8, y) * (0.55 + 0.45 * sstep(200, 1000, x)) });
    // side veins as raised keels: pale band 6 to 9 px, a 1.8 px shade line on the lower-right edge, a lit crest
    ctx.save();
    tracePoly(ctx, poly);
    ctx.clip();
    for (const v of LV.lower.concat(LV.upper)) {
      const wp0 = v.world.pts;
      let cut = wp0.length;
      if (z > 2) {
        for (let i = 0; i < wp0.length; i++) {
          const q = wp0[i];
          if (q[0] >= 490 && q[0] <= 590 && marginY(q[0]) - q[1] < 3) { cut = i; break; }
        }
      }
      const wp = wp0.slice(0, Math.max(2, cut));
      const s = V.mp(wp);
      const b = L.bounds(s);
      if (b.x > 1100 || b.x + b.w < -20 || b.y > 1940 || b.y + b.h < -20) continue;
      const fr = v.world.frac;
      const nrm = normalsToward(s, -1e5, -1e5); // toward the upper left
      const sk = sd('vk', v.s0 | 0, v.sign);
      const nearGlue = (u) => {
        if (z <= 2) return 1;
        const q = wp[Math.min(wp.length - 1, Math.round(u * (wp.length - 1)))];
        if (q[0] < 490 || q[0] > 590) return 1;
        return sstep(0, 14, marginY(q[0]) - q[1]);
      };
      const press = (u) => (u < fr ? lerp(1, 0.78, u / fr) : lerp(0.72, 0.6, (u - fr) / Math.max(1e-3, 1 - fr))) * nearGlue(u);
      const wB = 8.5 * k;
      polyStroke(ctx, s.map((p, i) => [p[0] - nrm[i][0] * (wB * 0.5 + 2.2), p[1] - nrm[i][1] * (wB * 0.5 + 2.2)]), 2.6 * k, P.milkweedDeep, 0.4, 3);
      L.inkPath(ctx, s, { width: wB, color: P.milkweedPale, alpha: 0.97, seed: sk + 2, taper: [4, 50], wobble: 1.4, pressure: press, step: st });
      L.inkPath(ctx, s.map((p, i) => [p[0] - nrm[i][0] * wB * 0.46 * press(i / s.length), p[1] - nrm[i][1] * wB * 0.46 * press(i / s.length)]), { width: 1.8, color: P.inkSoft, alpha: 0.9, seed: sk + 3, taper: [8, 60], wobble: 1.4, step: st });
      polyStroke(ctx, s.map((p, i) => [p[0] + nrm[i][0] * wB * 0.22, p[1] + nrm[i][1] * wB * 0.22]).slice(3, -6), 1.1, P.white, 0.7, 2);
    }
    // midrib: a broad raised rib, contour hatched on its lower half
    const mr = V.mp(MIDRIB);
    const mb = L.bounds(mr);
    const w = 30 * k;
    if (mb.y + mb.h + w > -20 && mb.y - w < 1940) {
      const band = mr.map((p) => [p[0], p[1] - w * 0.45]).concat(mr.slice().reverse().map((p) => [p[0], p[1] + w * 0.55]));
      fillPoly(ctx, band, P.milkweedPale);
      const lower = mr.map((p) => [p[0], p[1] + 2]).concat(mr.slice().reverse().map((p) => [p[0], p[1] + w * 0.55]));
      L.hatch(ctx, lower, { angle: 1.95, spacing: 5, width: 1.2, color: P.milkweedDeep, alpha: 0.9, length: [6, 16], seed: sd('mrH') });
      L.inkPath(ctx, mr.map((p) => [p[0], p[1] + w * 0.56]), { width: 2.4, color: P.inkSoft, alpha: 0.9, seed: sd('mrA'), taper: 0 });
      L.inkPath(ctx, mr.map((p) => [p[0] + 3, p[1] + w * 0.56 + 5]), { width: 3, color: P.milkweedDeep, alpha: 0.45, seed: sd('mrA2'), taper: 0 });
      L.inkPath(ctx, mr.map((p) => [p[0], p[1] - w * 0.46]), { width: 1.6, color: P.milkweedDeep, alpha: 0.9, seed: sd('mrB'), taper: 0 });
      L.inkPath(ctx, mr.map((p) => [p[0], p[1] - w * 0.2]), { width: 1.2, color: P.white, alpha: 0.65, seed: sd('mrC'), taper: 0 });
    }
    ctx.restore();

    // downy underside: white stipple, denser within 150 px of the lower edge, and short curled hairs
    L.stipple(ctx, poly, { spacing: 7.5, r: [1.0, 1.6], color: P.spotWhite, alpha: 0.75, seed: sd('down'),
      density: (x, y) => 0.29 + 0.29 * sstep(150 * Math.min(z, 2), 0, my(x) - y) });
    const cell = 26;
    const hairs = [];
    const wx0 = V.wx(-20), wx1 = V.wx(1100), wy0 = V.wy(-20);
    for (let gy = Math.floor(wy0 / cell); gy * cell < MARGIN_Y; gy++) {
      for (let gx = Math.floor(wx0 / cell); gx * cell < wx1; gx++) {
        const a = L.h3(gx, gy, sd('hair'));
        if (a > 0.4) continue;
        const wx = gx * cell + L.h3(gy, gx, sd('hx')) * cell;
        const wy = gy * cell + L.h3(gx + 3, gy, sd('hy')) * cell;
        if (wy > marginY(wx) - 8) continue;
        const x = V.x(wx), y = V.y(wy);
        const len = (6 + 8 * L.h3(gx, gy + 5, sd('hl'))) * k;
        const ang = 2.3 + (L.h3(gx, gy, sd('ha')) - 0.5) * 1.2;
        const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len;
        hairs.push([x, y, (x + ex) / 2 + 2 * k, (y + ey) / 2 - 1 * k, ex, ey]);
      }
    }
    strokeBatch(ctx, hairs, 1 * k, P.white, 0.6);

    // edge-on thickness of the blade and the margin line
    const et = 11 * k;
    const edge = [];
    for (let sx = -30; sx <= 1110; sx += 15) edge.push([sx, my(sx)]);
    const bandE = edge.map((p) => [p[0], p[1] - et]).concat(edge.slice().reverse());
    fillPoly(ctx, bandE, P.milkweedDeep);
    L.hatch(ctx, bandE, { angle: -0.9, spacing: 4, width: 1.1, color: P.ink, alpha: 0.5, length: [6, 12], seed: sd('edgeH') });
    L.inkPath(ctx, edge.map((p) => [p[0], p[1] - et]), { width: 1.2, color: P.milkweedPale, alpha: 0.85, seed: sd('edgeT'), taper: 0, wobble: 1 });
    L.inkPath(ctx, edge, { width: 3 * k, color: P.ink, seed: sd('edgeL'), taper: 0, wobble: 1.2, double: { offset: 4 * k, alpha: 0.4, width: 0.3, from: 0.62, to: 0.98 } });
    // trichome fringe hanging from the margin, every 8 px, skipped where the egg is glued
    const g = z / Z_END;
    const skip = 180 * g + 3;
    const fr = [];
    const b = L.boil(L.T);
    for (let i = -4; i * 8 < 1110; i++) {
      const x = i * 8 + (L.h3(i, 3, sd('fr')) - 0.5) * 5;
      if (Math.abs(x - EGG_CX) < skip) continue;
      const y = my(x);
      const len = (10 + 8 * L.h3(i, 5, sd('fr'))) * Math.min(k, 1.4);
      const lean = (L.h3(i, 7, sd('fr')) - 0.5) * 0.7 + 0.1 + (L.h3(i, b, sd('frb')) - 0.5) * 0.08;
      fr.push([x, y - 1, x + Math.sin(lean) * len * 0.3 + 1.5, y + len * 0.5, x + Math.sin(lean) * len, y + Math.cos(lean) * len]);
    }
    drawFringe(ctx, fr, Math.min(k, 1.4), P);
  }
  // white trichome hairs: spotWhite 1.4 px with a 0.8 px inkSoft edge on the lower-right side only
  function drawFringe(ctx, fr, s, P) {
    const o = 1.05 * s;
    strokeBatch(ctx, fr.map((h) => h.map((v, i) => v + (i % 2 ? 0.35 * o : o))), 0.8 * s, P.inkSoft, 0.85);
    strokeBatch(ctx, fr, 1.4 * s, P.spotWhite, 1);
  }

  // ===========================================================================
  // The leaf underside, macro drawing (zoom >= 8). Authored in final-frame coordinates (margin at
  // y 520, like 03 egg-hatch at zoom 1) and scaled by f about the screen margin point.
  // ===========================================================================
  // macro side veins crossing the blade above the egg, running down toward the apex like the world veins
  const MACRO_VEINS = [
    { p: [[600, -960], [340, -500], [200, -140], [100, 140], [20, 340], [-80, 510]], w: 22 },
    { p: [[840, -960], [540, -480], [360, -80], [250, 180], [190, 320], [210, 390], [300, 430], [400, 410], [430, 340]], w: 20 },
    { p: [[1100, -960], [780, -420], [580, -40], [470, 180], [360, 360], [250, 500]], w: 20 },
    { p: [[1400, -960], [1040, -360], [800, 20], [680, 200], [560, 360], [450, 490]], w: 20 },
    { p: [[1720, -960], [1300, -300], [1040, 40], [890, 220], [750, 380], [640, 500]], w: 18 },
    { p: [[2100, -960], [1580, -220], [1260, 60], [1100, 230], [960, 380], [860, 490]], w: 18 },
    { p: [[800, 20], [960, 140], [1180, 250]], w: 11 },
  ].map((v) => ({ p: L.smoothPts(v.p, false, 10), w: v.w }));
  // curled white trichome hairs lying on the surface near the egg (the first-instar's first meal after the shell)
  const MACRO_HAIRS = (() => {
    const r = L.rng(sd('macroHairs'));
    const out = [];
    for (let i = 0; out.length < 34 && i < 400; i++) {
      const a = r() * Math.PI, d = 70 + 230 * Math.sqrt(r());
      const x = 540 + Math.cos(Math.PI + a) * d * 1.3, y = 520 + Math.sin(Math.PI + a) * d * 0.9;
      if (y > 500 || y < 180) continue;
      const len = 20 + 40 * r();
      const ang = -2.4 + (r() - 0.5) * 1.6;
      const curl = (r() < 0.5 ? -1 : 1) * (1.2 + 1.6 * r());
      const pts = [];
      for (let j = 0; j <= 10; j++) {
        const u = j / 10;
        const th = ang + curl * u * u;
        const prev = pts.length ? pts[pts.length - 1] : [x, y];
        pts.push(j ? [prev[0] + Math.cos(th) * len / 10, prev[1] + Math.sin(th) * len / 10] : [x, y]);
      }
      out.push(pts);
    }
    return out;
  })();

  function drawLeafMacro(ctx, V, P) {
    const ym = V.y(MARGIN_Y);
    if (ym < -40) return;
    const f = Math.max(0.6, V.z / Z_END);
    const iw = 1 / f;
    const x0 = 540 - 560 / f, x1 = 540 + 560 / f;
    const y0 = 520 - (ym + 40) / f;
    ctx.save();
    ctx.translate(540, ym);
    ctx.scale(f, f);
    ctx.translate(-540, -520);
    const rect = [[x0, y0], [x1, y0], [x1, 520], [x0, 520]];
    fillPoly(ctx, rect, P.milkweedYoung);
    const tone = (x, y) => 0.85 + 0.12 * L.noise2(x / 260, y / 260, sd('mTone')) + 0.18 * sstep(260, 440, y);
    // hatch parallel to the nearest keel tangent (not a single fixed angle)
    {
      const segs = [];
      for (let i = 0; i < MACRO_VEINS.length; i++) {
        const v = MACRO_VEINS[i];
        const nr = normalsToward(v.p, -1e5, -1e5);
        const cum = cumLen(v.p);
        const T = cum[cum.length - 1];
        const r = L.rng(sd('mH1', i));
        const step = 8 * iw;
        for (let d = 0; d < T; d += step) {
          const p = pointAt(v.p, cum, d);
          const tg = tangentAt(v.p, cum, d);
          const j = Math.min(v.p.length - 1, Math.round((d / T) * (v.p.length - 1)));
          const nx = nr[j][0], ny = nr[j][1];
          for (let o = -130; o <= 130; o += 8) {
            const q = [p[0] + nx * o, p[1] + ny * o];
            if (q[1] > 518 || q[1] < y0 || q[0] < x0 || q[0] > x1) continue;
            if (r() > tone(q[0], q[1])) continue;
            const len = lerp(16, 52, r());
            const jx = (r() - 0.5) * 2.4;
            segs.push([q[0] - tg[0] * len * 0.5 + jx, q[1] - tg[1] * len * 0.5, q[0] + tg[0] * len * 0.5, q[1] + tg[1] * len * 0.5 + jx]);
          }
        }
      }
      strokeBatch(ctx, segs, 1.5 * iw, P.milkweedDeep, 0.85);
    }
    // areole net over the first hatch so the cells show between strokes
    L.hexLattice(ctx, rect, { r: 44, jitter: 15, width: 1.5 * iw, color: P.milkweedPale, alpha: 0.8, seed: sd('mNet'), boilAmp: 0.5, clip: true });
    // shade band on the lower-right of each keel; 25 px lit strip on the upper-left stays untouched
    {
      const sh = [], xh = [];
      const col = L.mix(P.milkweedDeep, P.ink, 0.3);
      const cdx = Math.cos(105 * DEG), cdy = Math.sin(105 * DEG);
      for (let i = 0; i < MACRO_VEINS.length; i++) {
        const v = MACRO_VEINS[i];
        const nr = normalsToward(v.p, -1e5, -1e5);
        const cum = cumLen(v.p);
        const T = cum[cum.length - 1];
        const r = L.rng(sd('mSh', i));
        for (let d = 0; d < T; d += 5) {
          const p = pointAt(v.p, cum, d);
          const tg = tangentAt(v.p, cum, d);
          const j = Math.min(v.p.length - 1, Math.round((d / T) * (v.p.length - 1)));
          const lx = -nr[j][0], ly = -nr[j][1];
          for (let o = v.w * 0.5; o <= 70; o += 5) {
            const q = [p[0] + lx * o, p[1] + ly * o];
            if (q[1] > 518 || q[1] < y0 || q[0] < x0 || q[0] > x1) continue;
            const len = lerp(10, 28, r());
            const jx = (r() - 0.5) * 1.6;
            sh.push([q[0] - tg[0] * len * 0.5 + jx, q[1] - tg[1] * len * 0.5, q[0] + tg[0] * len * 0.5, q[1] + tg[1] * len * 0.5 + jx]);
            if (o <= 35) {
              const cl = lerp(8, 20, r());
              xh.push([q[0] - cdx * cl * 0.5, q[1] - cdy * cl * 0.5, q[0] + cdx * cl * 0.5, q[1] + cdy * cl * 0.5]);
            }
          }
        }
      }
      strokeBatch(ctx, sh, 1.3 * iw, col, 0.85);
      strokeBatch(ctx, xh, 1.1 * iw, col, 0.7);
    }
    // the dark band along the curling margin: 5 px cross-hatching from y 440 down
    L.crossHatch(ctx, rect, { angle: 2.3, spacing: 5 * iw, crossSpacing: 7 * iw, width: 1.3 * iw, color: L.mix(P.milkweedDeep, P.ink, 0.25), alpha: 0.8, tone: 0.5, length: [10, 30], seed: sd('mX'),
      density: (x, y) => 0.3 * sstep(-200, 300, y) * (0.6 + 0.4 * L.noise2(x / 200, y / 200, sd('mXn'))) + 0.7 * sstep(400, 470, y) });
    L.hatch(ctx, rect, { angle: 0.86, spacing: 5 * iw, width: 1.2 * iw, color: P.ink, alpha: 0.3, density: (x, y) => sstep(460, 520, y), seed: sd('mH3') });
    // side veins as raised keels: cast shade, pale band, shade line on the lower-right edge, lit crest
    for (let i = 0; i < MACRO_VEINS.length; i++) {
      const v = MACRO_VEINS[i];
      const nr = normalsToward(v.p, -1e5, -1e5);
      const off = (d) => v.p.map((p, j) => [p[0] + nr[j][0] * d, p[1] + nr[j][1] * d]);
      L.inkPath(ctx, off(-(v.w * 0.5 + 7)), { width: 9, color: P.milkweedDeep, alpha: 0.5, seed: sd('mvC', i), taper: [30, 60], wobble: 2 });
      L.inkPath(ctx, v.p, { width: v.w, color: P.milkweedPale, alpha: 0.96, seed: sd('mvR', i), taper: [20, 80], wobble: 2.5 });
      L.inkPath(ctx, off(-v.w * 0.48), { width: 2.4 * iw, color: P.inkSoft, alpha: 0.9, seed: sd('mvE', i), taper: [20, 60], wobble: 2.5 });
      L.inkPath(ctx, off(v.w * 0.2), { width: 1.4 * iw, color: P.white, alpha: 0.7, seed: sd('mvH', i), taper: [30, 90], wobble: 2.5 });
      L.hatch(ctx, ribbonPoly(v.p, () => v.w * 0.9).map((p) => p), { angle: 0.7, spacing: 6, width: 1 * iw, color: P.milkweedDeep, alpha: 0.35, length: [4, 10], seed: sd('mvHt', i), clip: true,
        density: 0.6 });
    }
    // downy underside: white stipple and short hairs
    L.stipple(ctx, rect, { spacing: 9 * iw, r: [1.4 * iw, 2.2 * iw], color: P.spotWhite, alpha: 0.7, density: (x, y) => 0.35 + 0.3 * sstep(200, 500, y), seed: sd('mDown') });
    const cell = 34;
    const hairs = [];
    for (let gy = Math.floor(y0 / cell); gy * cell < 512; gy++) {
      for (let gx = Math.floor(x0 / cell); gx * cell < x1; gx++) {
        const a = L.h3(gx, gy, sd('mHair'));
        if (a > 0.6) continue;
        const x = gx * cell + L.h3(gy, gx, sd('mhx')) * cell;
        const y = gy * cell + L.h3(gx + 3, gy, sd('mhy')) * cell;
        if (y > 508) continue;
        const len = 7 + 10 * L.h3(gx, gy + 5, sd('mhl'));
        const ang = 1.25 + (L.h3(gx, gy, sd('mha')) - 0.5) * 1.3;
        const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len;
        hairs.push([x, y, (x + ex) / 2 + 2, (y + ey) / 2, ex, ey]);
      }
    }
    strokeBatch(ctx, hairs, 1.1 * iw, P.white, 0.55);
    // long curled trichomes lying on the surface within 300 px of the egg
    const th = [];
    const bi = L.boil(L.T);
    for (let i = 0; i < MACRO_HAIRS.length; i++) {
      const h = MACRO_HAIRS[i];
      const j = (L.h3(i, bi, sd('mthB')) - 0.5) * 1.2;
      for (let q = 0; q + 2 < h.length; q += 2) th.push([h[q][0] + j, h[q][1], h[q + 1][0], h[q + 1][1], h[q + 2][0], h[q + 2][1] + j]);
    }
    drawFringe(ctx, th, iw * 1.2, P);
    // edge-on blade thickness, margin line
    const et = 16;
    const bandE = [[x0, 520 - et], [x1, 520 - et], [x1, 520], [x0, 520]];
    fillPoly(ctx, bandE, P.milkweedDeep);
    L.hatch(ctx, bandE, { angle: -0.9, spacing: 5, width: 1.1 * iw, color: P.ink, alpha: 0.5, length: [8, 16], seed: sd('mEdge') });
    L.inkPath(ctx, [[x0, 520 - et], [x1, 520 - et]], { width: 1.2 * iw, color: P.milkweedPale, alpha: 0.8, seed: sd('mEdgeT'), taper: 0, wobble: 1 });
    L.inkPath(ctx, [[x0, 520], [x1, 520]], { width: 3 * iw, color: P.ink, seed: sd('mEdgeL'), taper: 0, wobble: 1.2, double: { offset: 4, alpha: 0.4, width: 0.3, from: 0.05, to: 0.6 } });
    // trichome fringe, as in 03: 10 to 18 px every 8 px, none where the egg is glued
    const fr = [];
    const b = L.boil(L.T);
    for (let i = Math.floor(x0 / 8); i * 8 < x1; i++) {
      const x = i * 8 + (L.h3(i, 3, sd('mfr')) - 0.5) * 8 * 0.6;
      if (x > 350 && x < 730) continue;
      const len = 10 + 8 * L.h3(i, 5, sd('mfr'));
      const lean = (L.h3(i, 7, sd('mfr')) - 0.5) * 0.7 + 0.1 + (L.h3(i, b, sd('mfrb')) - 0.5) * 0.08;
      fr.push([x, 519, x + Math.sin(lean) * len * 0.3 + 1.5, 520 + len * 0.5, x + Math.sin(lean) * len, 520 + Math.cos(lean) * len]);
    }
    drawFringe(ctx, fr, iw, P);
    ctx.restore();
  }

  // ===========================================================================
  // The egg: G1 drawn at scale g about (540, 900), popping from its glued base
  // ===========================================================================
  function drawEgg(ctx, V, P, pop) {
    const g = (V.z / Z_END) * pop;
    if (g <= 0) return;
    const H = 760 * g;
    // pop grows from the glued base (on the margin), not the centre
    const bx = EGG_CX, by = V.y(MARGIN_Y);
    const toS = (p) => [bx + (p[0] - 540) * g, by + (p[1] - 520) * g];
    if (H < 90) {
      // tiny egg: a few confident marks
      const out = EGG.outline.filter((p, i) => i % 3 === 0).map(toS);
      // a paper halo so the new egg reads against the dark abdomen tip
      ctx.save();
      tracePoly(ctx, out);
      ctx.lineWidth = 5;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = P.white;
      ctx.globalAlpha = 0.9;
      ctx.stroke();
      ctx.restore();
      fillPoly(ctx, out, P.egg);
      const shade = EGG.shade.filter((p, i) => i % 2 === 0).map(toS);
      fillPoly(ctx, shade, P.paperShade, 0.9);
      const segs = [];
      for (const k of [3, 6, 9, 12, 15]) {
        const r = EGG.ridges[k].pts;
        const a = toS(r[3]), m = toS(r[Math.floor(r.length / 2)]), e = toS(r[r.length - 1]);
        segs.push([a[0], a[1], m[0], m[1], e[0], e[1]]);
      }
      strokeBatch(ctx, segs, Math.max(0.5, 1.8 * g * 4), P.inkSoft, 0.6);
      L.inkPath(ctx, out, { closed: true, width: Math.max(1.2, 5 * g * 3), color: P.ink, wobble: 0.3, tremble: 0.1, boilAmp: 0.25, taper: [2, 4], seed: sd('eggTiny') });
      const hl = toS([430, 700]);
      dotBatch(ctx, [[hl[0], hl[1], Math.max(0.9, 30 * g)]], P.white, 0.9);
      return;
    }
    const iw = 1 / g;
    const lod = clamp(g * 2.5, 0.3, 1); // line weight falls off while the egg is still small on screen
    ctx.save();
    ctx.translate(bx, by);
    ctx.scale(g, g);
    ctx.translate(-540, -520);
    const out = EGG.outline;
    // glue collar on the leaf where the base is cemented
    fillPoly(ctx, [[330, 520], [750, 520], [724, 540], [356, 540]], P.white, 0.55);
    fillPoly(ctx, out, P.egg);
    // tone: light hatch over the right half, cross-hatched shade on the right third, dark at the rim
    L.hatch(ctx, out, {
      angle: -Math.PI / 4, spacing: 12, width: 1.4 * iw, color: P.inkSoft, alpha: 0.45, length: [22, 60], seed: sd('eggH1'),
      density: (x, y) => sstep(520, 780, x) * 0.9 + sstep(1050, 1250, y) * 0.3,
    });
    L.crossHatch(ctx, EGG.shade, { spacing: 7, crossSpacing: 7, width: 1.3 * iw, color: P.ink, alpha: 0.55, tone: 0.55, length: [14, 40], seed: sd('eggX'),
      density: (x, y) => sstep(560, 800, x + (y - 520) * 0.12) });
    L.stipple(ctx, out, { spacing: 16, r: [1.2 * iw, 2.4 * iw], color: P.inkSoft, alpha: 0.35, density: (x, y) => 0.25 + 0.5 * sstep(500, 820, x), seed: sd('eggSt') });
    // 34 cross-ribs between the ridges (inkSoft, shade side heavier)
    const ribP = new Path2D(), ribD = new Path2D();
    for (const rib of EGG.ribs) {
      for (const s of rib.segs) {
        const tgt = s[3] > 25 * DEG ? ribD : ribP;
        tgt.moveTo(s[0][0], s[0][1]);
        tgt.quadraticCurveTo(2 * s[1][0] - (s[0][0] + s[2][0]) / 2, 2 * s[1][1] - (s[0][1] + s[2][1]) / 2, s[2][0], s[2][1]);
      }
    }
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = P.inkSoft;
    ctx.globalAlpha = 0.42 * lod;
    ctx.lineWidth = 1.1 * iw * lod;
    if (g > 0.25) ctx.stroke(ribP);
    ctx.globalAlpha = 0.7 * lod;
    ctx.lineWidth = 1.4 * iw * lod;
    if (g > 0.25) ctx.stroke(ribD);
    ctx.restore();
    // rim tone: contour hatching down both flanks where the shell turns away
    L.hatch(ctx, EGG.rimL, { angle: 1.48, spacing: 9, width: 1.2 * iw, color: P.inkSoft, alpha: 0.55, length: [30, 90], bend: 3, seed: sd('rimL') });
    L.hatch(ctx, EGG.rimR, { angle: 1.66, spacing: 6, width: 1.4 * iw, color: P.ink, alpha: 0.6, length: [30, 90], bend: -3, seed: sd('rimR') });
    // 18 ridges as raised keels: a shade line on the side away from the light, a pale lit crest, the inked keel
    for (let k = 0; k < EGG.ridges.length; k++) {
      const r = EGG.ridges[k];
      const sh = r.th > 20 * DEG;
      const off = 3 + 5 * Math.cos(r.th);
      L.inkPath(ctx, r.pts.map((p) => [p[0] + off, p[1]]), { width: (2.5 + 2.5 * Math.cos(r.th)) * iw * lod, color: P.paperDeep, alpha: sh ? 0.5 : 0.8, seed: sd('rdgS', k), taper: [30, 80], wobble: 1.2 });
      if (r.th < 55 * DEG) L.inkPath(ctx, r.pts.map((p) => [p[0] - 3, p[1]]), { width: 2 * iw * lod, color: P.white, alpha: sh ? 0.4 : 0.85, seed: sd('rdgW', k), taper: [30, 80], wobble: 1.2 });
      L.inkPath(ctx, r.pts, { width: (sh ? 2.1 : 1.8) * iw * lod, color: sh ? P.ink : P.inkSoft, alpha: 0.5 + 0.4 * lod, seed: sd('rdg', k), taper: [20, 60], wobble: 1.2 });
    }
    // aeropyle pits where ridges meet cross-ribs, on the lit half
    const pits = [];
    for (let j = 0; j < 34; j += 1) {
      for (let k = 0; k < 18; k++) {
        const th = (-85 + 10 * k) * DEG;
        if (th > 30 * DEG || L.h3(j, k, sd('pit')) > 0.5) continue;
        const q = surf(th, EGG.ribs[j].y);
        if (Math.hypot(q[0] - 540, q[1] - 1262) < 40) continue;
        pits.push([q[0], q[1], 2.4 * iw * Math.cos(th)]);
      }
    }
    if (g > 0.3) dotBatch(ctx, pits, P.inkSoft, 0.8);
    // micropyle rosette at the tip: 6 petal cells round a pinpoint
    const ros = [];
    for (let i = 0; i <= 90; i++) {
      const f = (i / 90) * TAU;
      const rr = 26 * Math.abs(Math.cos(3 * f + Math.PI / 2));
      ros.push([540 + Math.cos(f) * rr, 1262 + Math.sin(f) * rr]);
    }
    ctx.save();
    tracePoly(ctx, out);
    ctx.clip();
    L.inkPath(ctx, ros, { closed: true, width: 1.6 * iw, color: P.inkSoft, alpha: 0.9, wobble: 0.4, seed: sd('ros'), fill: P.paperShade });
    dotBatch(ctx, [[540, 1262, 3 * iw]], P.ink, 1);
    ctx.restore();
    // highlight: a soft lit streak on the upper left of the shell
    L.inkPath(ctx, [[400, 640], [372, 740], [368, 850], [385, 950]], { width: 9 * iw, color: P.white, alpha: 0.75, seed: sd('eggHi'), taper: [30, 60] });
    L.inkPath(ctx, [[425, 600], [410, 640]], { width: 6 * iw, color: P.white, alpha: 0.8, seed: sd('eggHi2'), taper: [8, 10] });
    // construction: width ticks at the widest ring and the axis stub under the tip
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = P.inkFaint;
    ctx.lineWidth = 1.5 * iw;
    ctx.beginPath();
    for (const y of [790]) {
      ctx.moveTo(540 - 285, y - 18);
      ctx.lineTo(540 - 285, y + 18);
      ctx.moveTo(540 + 285, y - 18);
      ctx.lineTo(540 + 285, y + 18);
      ctx.moveTo(200, y);
      ctx.lineTo(250, y);
      ctx.moveTo(830, y);
      ctx.lineTo(880, y);
    }
    ctx.stroke();
    ctx.restore();
    // outline: hero weight with an occasional retrace
    L.inkPath(ctx, out, { closed: true, width: 5 * iw, color: P.ink, seed: sd('eggOut'), wobble: 1.4, double: { offset: 3 * iw + 2.5 * iw, alpha: 0.4, width: 0.3, from: 0.55, to: 0.85 } });
    ctx.restore();
  }

  // ===========================================================================
  // The worn female, clinging under the leaf edge (world coordinates at zoom 1)
  // ===========================================================================
  // inked line in screen space under the zoom: culled when off the frame, coarser resampling when magnified
  function inkS(ctx, V, pts, o) {
    const b = L.bounds(pts);
    const pad = 40;
    if (b.x > 1080 + pad || b.y > 1920 + pad || b.x + b.w < -pad || b.y + b.h < -pad) return;
    L.inkPath(ctx, pts, V.z > 2 ? Object.assign({}, o, { step: 6 }) : o);
  }

  const THX = [640, 1000];
  const HEAD = [700, 960];
  const AXA = Math.atan2(HEAD[1] - THX[1], HEAD[0] - THX[0]); // body axis, head direction
  const WING_BASE = [652, 1008];

  // ---------------------------------------------------------------------------
  // Forewing (underside): costa bowing right to the apex, worn outer margin with one nick, back to the tornus
  // ---------------------------------------------------------------------------
  const FW_COSTA = [[652, 1008], [684, 1050], [724, 1130], [768, 1230], [806, 1330], [830, 1400], [842, 1442]];
  const FW_MARGIN_RAW = L.smoothPts([[842, 1442], [812, 1442], [770, 1424], [725, 1396], [684, 1362], [650, 1338], [614, 1318]], false, 3);
  const FWM_CUM = cumLen(FW_MARGIN_RAW);
  const FWM = (f) => pointAt(FW_MARGIN_RAW, FWM_CUM, FWM_CUM[FWM_CUM.length - 1] * f);
  const FW_NICK = (() => {
    let i = 0;
    while (i < FW_MARGIN_RAW.length - 1 && FW_MARGIN_RAW[i][0] > 704) i++;
    return { d: FWM_CUM[i], p: FW_MARGIN_RAW[i] };
  })();
  const FW_MARGIN = (() => {
    const nrm = normalsToward(FW_MARGIN_RAW, 700, 1250);
    return FW_MARGIN_RAW.map((p, i) => {
      const d = FWM_CUM[i];
      let n = L.noise1(d / 9, sd('fwRag')) * 2 - (L.h3(i, 5, sd('fwNick')) < 0.05 ? 3 : 0);
      const dn = Math.abs(d - FW_NICK.d);
      if (dn < 13) n -= 18 * Math.pow(1 - dn / 13, 0.8) + (L.h3(i, 7, sd('nickJ')) - 0.5) * 4;
      return [p[0] - nrm[i][0] * n, p[1] - nrm[i][1] * n];
    });
  })();
  const FW_INNER = [[610, 1262], [608, 1180], [616, 1110], [634, 1048]];
  const FW_OUT = L.smoothPts(FW_COSTA, false, 6).concat(FW_MARGIN.slice(1), FW_INNER);
  // veins: the discal cell closed by a kinked cross-vein, then the radials fanning from the cell end
  const FW_VEINS = [
    { p: [[662, 1016], [700, 1100], [730, 1175], [748, 1222]], w: 1 },
    { p: [[650, 1026], [654, 1110], [666, 1190], [684, 1250]], w: 1 },
    { p: [[748, 1222], [728, 1234], [706, 1244], [684, 1250]], w: 0.62, cross: true },
    { p: [[712, 1130], [758, 1222], [792, 1298]], w: 0.62 },
    { p: [[730, 1176], [772, 1262], [808, 1338]], w: 0.66 },
    { p: [[748, 1222], [790, 1310], [826, 1394]], w: 0.58 },
    { p: [[746, 1224], [800, 1330], [836, 1436]], w: 0.6 },
    { p: [[742, 1228], [786, 1336], FWM(0.1)], w: 0.8 },
    { p: [[726, 1236], [754, 1330], FWM(0.25)], w: 0.85 },
    { p: [[706, 1244], [720, 1320], FWM(0.42)], w: 0.85 },
    { p: [[680, 1232], [688, 1300], FWM(0.62)], w: 0.85 },
    { p: [[664, 1180], [656, 1268], FWM(0.82)], w: 0.85 },
    { p: [[648, 1036], [628, 1170], [618, 1300]], w: 0.8 },
  ].map((v) => Object.assign({}, v, { p: L.smoothPts(v.p, false, 6) }));
  // yellow-brown apex zone of the underside, and the black subapical bar with its white spots
  const FW_TIP = [[784, 1266], [806, 1330], [830, 1400], [842, 1442], FWM(0.1), FWM(0.2), FWM(0.34), [738, 1334], [752, 1264]];
  const FW_SUB_C = L.smoothPts([[756, 1284], [771, 1305], [787, 1326], [802, 1344], [818, 1364]], false, 5);
  const FW_SUB = ribbonPoly(FW_SUB_C.map((p) => [p[0] + 2, p[1] - 1]), (u) => 22 - 8 * u).map((p, i) => [p[0] + (L.h3(i, 1, sd('subR')) - 0.5) * 3, p[1] + (L.h3(i, 2, sd('subR')) - 0.5) * 3]);
  const FW_SUB_SPOTS = [[760, 1290, 6], [771, 1305, 7.5], [783, 1320, 6.5], [794, 1334, 7.5], [805, 1348, 5.5], [815, 1360, 5]];

  // ---------------------------------------------------------------------------
  // Hindwing (underside): a broad lobe to the lower left, mostly behind the forewing, one torn bite in its margin
  // ---------------------------------------------------------------------------
  const HW_TEAR = [[748, 1520], [744, 1511], [739, 1506], [736, 1497], [730, 1492], [727, 1483], [720, 1479], [714, 1482], [709, 1476], [703, 1484], [699, 1494], [694, 1501], [692, 1512], [688, 1529]];
  const HW_OUT = L.smoothPts([[646, 1026], [700, 1106], [760, 1216], [805, 1318], [826, 1400], [818, 1455], [792, 1492], [760, 1515], [748, 1520]], false, 6)
    .concat(HW_TEAR.slice(1, -1))
    .concat(L.smoothPts([[688, 1529], [650, 1532], [600, 1524], [560, 1505], [525, 1470], [503, 1410], [495, 1330], [502, 1250], [525, 1170], [560, 1100], [602, 1050], [646, 1026]], false, 6));
  const HW_MARGIN_R = L.smoothPts([[826, 1400], [818, 1455], [792, 1492], [762, 1513]], false, 5);
  const HW_MARGIN_L = L.smoothPts([[674, 1531], [650, 1532], [600, 1524], [560, 1505], [525, 1470], [503, 1410], [495, 1330], [498, 1270], [506, 1222]], false, 5);
  const HW_VEINS = [
    { p: [[640, 1040], [630, 1160], [616, 1290]], w: 1 },
    { p: [[622, 1046], [594, 1160], [566, 1286]], w: 1 },
    { p: [[566, 1286], [590, 1302], [616, 1290]], w: 0.62, cross: true },
    { p: [[648, 1036], [720, 1150], [790, 1290], [824, 1392]], w: 0.7 },
    { p: [[616, 1290], [700, 1378], [814, 1456]], w: 0.8 },
    { p: [[612, 1296], [696, 1408], [794, 1492]], w: 0.85 },
    { p: [[604, 1300], [676, 1420], [754, 1519]], w: 0.85 },
    { p: [[592, 1302], [630, 1420], [672, 1533]], w: 0.85 },
    { p: [[578, 1298], [590, 1420], [606, 1528]], w: 0.85 },
    { p: [[569, 1272], [554, 1390], [543, 1496]], w: 0.85 },
    { p: [[612, 1052], [560, 1220], [510, 1442]], w: 0.85 },
    { p: [[604, 1062], [542, 1180], [498, 1302]], w: 0.7 },
  ].map((v) => Object.assign({}, v, { p: L.smoothPts(v.p, false, 6) }));
  // patches where the scales have rubbed off, left as bare paper
  const BARE = [
    { c: [700, 1178], r: 22, wing: 'fw' },
    { c: [702, 1300], r: 14, wing: 'fw' },
    { c: [548, 1392], r: 17, wing: 'hw' },
    { c: [640, 1296], r: 10, wing: 'fw' },
  ].map((b, i) => {
    const pts = [];
    for (let k = 0; k < 22; k++) {
      const a = (k / 22) * TAU;
      const rr = b.r * (0.75 + 0.45 * L.noise1(k * 0.7, sd('bare', i)) + 0.12 * L.h3(k, i, sd('bareJ')));
      pts.push([b.c[0] + Math.cos(a) * rr * 1.25, b.c[1] + Math.sin(a) * rr * 0.85]);
    }
    return Object.assign({ pts }, b);
  });

  function normalsToward(pts, cx, cy) {
    return pts.map((p, i) => {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      let nx = -(b[1] - a[1]), ny = b[0] - a[0];
      const l = Math.hypot(nx, ny) || 1;
      nx /= l;
      ny /= l;
      if ((cx - p[0]) * nx + (cy - p[1]) * ny < 0) return [-nx, -ny];
      return [nx, ny];
    });
  }
  // black border band along a margin; ragged: the band ends break off unevenly (a tear or a worn edge)
  function borderBand(pts, cx, cy, widthFn, ext, ragged) {
    const nrm = normalsToward(pts, cx, cy);
    const cum = cumLen(pts);
    const T = cum[cum.length - 1] || 1;
    const o = [], n = [];
    pts.forEach((p, i) => {
      const w = widthFn(cum[i] / T);
      o.push([p[0] - nrm[i][0] * ext, p[1] - nrm[i][1] * ext]);
      n.push([p[0] + nrm[i][0] * w, p[1] + nrm[i][1] * w]);
    });
    const cap = (a, b, key) => {
      const out = [];
      const tx = pts.length > 1 ? (pts[1][0] - pts[0][0]) : 0, ty = pts.length > 1 ? (pts[1][1] - pts[0][1]) : 0;
      const tl = Math.hypot(tx, ty) || 1;
      for (let i = 1; i < 5; i++) {
        const u = i / 5;
        const j = (L.h3(i, key, sd('cap')) - 0.5) * 9;
        out.push([lerp(a[0], b[0], u) + (tx / tl) * j, lerp(a[1], b[1], u) + (ty / tl) * j]);
      }
      return out;
    };
    let poly;
    if (ragged) {
      const nr = n.slice().reverse();
      poly = (ragged.start ? cap(n[0], o[0], 1) : []).concat(o, ragged.end ? cap(o[o.length - 1], n[n.length - 1], 2) : [], nr);
    } else poly = o.concat(n.reverse());
    return { poly, nrm, cum, T };
  }
  function spotsAlong(band, pts, rows, key) {
    const out = [];
    for (const [cnt, off, r0, u0, u1] of rows) {
      for (let k = 0; k < cnt; k++) {
        const u = u0 + ((u1 - u0) * (k + 0.5)) / cnt;
        const d = band.T * u;
        const p = pointAt(pts, band.cum, d);
        let i = 0;
        while (i < band.cum.length - 1 && band.cum[i] < d) i++;
        const nn = band.nrm[i];
        out.push([p[0] + nn[0] * off, p[1] + nn[1] * off, r0 * (0.85 + 0.3 * L.h3(k, cnt, sd('spot', key, off)))]);
      }
    }
    return out;
  }
  const FW_BORDER = borderBand(FW_MARGIN_RAW, 700, 1250, (u) => 30 - 8 * u, 12);
  const FW_COSTA_B = borderBand(L.smoothPts(FW_COSTA, false, 8), 700, 1250, (u) => 5 + 9 * u * u, 10);
  const FW_INNER_B = borderBand(L.smoothPts([[614, 1318]].concat(FW_INNER, [[652, 1008]]), false, 8), 700, 1200, () => 6, 10);
  const HW_BORDER_R = borderBand(HW_MARGIN_R, 690, 1330, () => 24, 12, { end: true });
  const HW_BORDER_L = borderBand(HW_MARGIN_L, 690, 1330, (u) => (u < 0.82 ? lerp(24, 17, u / 0.82) : lerp(17, 1.5, (u - 0.82) / 0.18)), 12, { start: true });
  const FW_SPOTS = spotsAlong(FW_BORDER, FW_MARGIN_RAW, [[16, 8, 2.6, 0.18, 0.98], [8, 20, 3.8, 0.2, 0.95]], 'fw')
    .filter((s) => Math.hypot(s[0] - FW_NICK.p[0], s[1] - FW_NICK.p[1]) > 16);
  const HW_SPOTS = spotsAlong(HW_BORDER_R, HW_MARGIN_R, [[5, 7, 2.6, 0.06, 0.78], [2, 16, 4, 0.2, 0.7]], 'hwR')
    .concat(spotsAlong(HW_BORDER_L, HW_MARGIN_L, [[15, 7, 2.6, 0.1, 0.86], [8, 16, 4.2, 0.12, 0.8]], 'hwL'));
  // the torn bite: scale-less membrane along the cut edge
  const TEAR_STRIP = (() => {
    const nrm = normalsToward(HW_TEAR, 718, 1400);
    const inner = HW_TEAR.map((p, i) => {
      const d = 7 + 5 * L.h3(i, 3, sd('tearIn'));
      return [p[0] + nrm[i][0] * d, p[1] + nrm[i][1] * d];
    });
    return [[760, 1522], [762, 1500]].concat(inner, [[676, 1506], [674, 1534]], HW_TEAR.slice().reverse());
  })();

  // scale texture: short strokes laid along the vein direction of each cell (precomputed in wing space)
  function scaleField(outline, veins, key) {
    const r = L.rng(sd(key, 'scales'));
    const vs = veins.filter((v) => !v.cross).map((v) => v.p.filter((p, i) => i % 2 === 0 || i === v.p.length - 1).map((p, i, a) => {
      const q0 = a[Math.max(0, i - 1)], q1 = a[Math.min(a.length - 1, i + 1)];
      return [p[0], p[1], Math.atan2(q1[1] - q0[1], q1[0] - q0[0])];
    }));
    const b = L.bounds(outline);
    const out = [];
    for (let y = b.y, row = 0; y < b.y + b.h; y += 4, row++) {
      for (let x = b.x + (row % 2) * 2.5; x < b.x + b.w; x += 5) {
        const px = x + (r() - 0.5) * 3, py = y + (r() - 0.5) * 2.4;
        if (!L.polyContains(outline, px, py)) {
          r();
          continue;
        }
        let d1 = 1e9, d2 = 1e9, a1 = 0, a2 = 0;
        for (const v of vs) {
          let best = 1e9, ba = 0;
          for (const q of v) {
            const d = (q[0] - px) * (q[0] - px) + (q[1] - py) * (q[1] - py);
            if (d < best) {
              best = d;
              ba = q[2];
            }
          }
          if (best < d1) {
            d2 = d1;
            a2 = a1;
            d1 = best;
            a1 = ba;
          } else if (best < d2) {
            d2 = best;
            a2 = ba;
          }
        }
        const w1 = 1 / Math.sqrt(d1 + 1), w2 = 1 / Math.sqrt(d2 + 1);
        const cx = w1 * Math.cos(2 * a1) + w2 * Math.cos(2 * a2), cy = w1 * Math.sin(2 * a1) + w2 * Math.sin(2 * a2);
        out.push([px, py, Math.atan2(cy, cx) / 2 + (r() - 0.5) * 0.12, 5 + 5 * r()]);
      }
    }
    return out;
  }
  const FW_SCALES = scaleField(FW_OUT, FW_VEINS, 'fw');
  const HW_SCALES = scaleField(HW_OUT, HW_VEINS, 'hw');

  // a view for the wings: the rock about the wing base plus the body dip, then the camera
  function wingView(V, ang, dip) {
    const c = Math.cos(ang), s = Math.sin(ang);
    const f = (q) => {
      const x = q[0] - WING_BASE[0], y = q[1] - WING_BASE[1];
      return V.p([WING_BASE[0] + x * c - y * s + dip[0], WING_BASE[1] + x * s + y * c + dip[1]]);
    };
    return Object.assign({}, V, { p: f, mp: (pts) => pts.map(f), ang });
  }

  function veinOffsets(pts, halfW, off) {
    const cum = cumLen(pts);
    const T = cum[cum.length - 1] || 1;
    const nr = normalsToward(pts, -1e5, -1e5);
    const a = [], b = [];
    pts.forEach((p, i) => {
      const h = halfW(cum[i] / T) + off;
      a.push([p[0] + nr[i][0] * h, p[1] + nr[i][1] * h]);
      b.push([p[0] - nr[i][0] * h, p[1] - nr[i][1] * h]);
    });
    return [a, b];
  }

  function paintWing(ctx, V, P, W) {
    const k = V.k;
    const poly = V.mp(W.out);
    const vb = L.bounds(poly);
    if (vb.x > 1080 || vb.y > 1920 || vb.x + vb.w < 0 || vb.y + vb.h < 0) return poly;
    const fine = V.z < 2; // texture passes only while the wing is near its drawn size
    fillPoly(ctx, poly, W.fill);
    ctx.save();
    tracePoly(ctx, poly);
    ctx.clip();
    const bb = vb;
    const hp = V.z > 1.5 ? clipPolyRect(poly, -20, -20, 1100, 1940) : poly;
    const shadeT = (x, y) => (0.55 * (x - bb.x)) / bb.w + (0.6 * (y - bb.y)) / bb.h;
    if (W.tip) {
      const tp0 = V.mp(W.tip);
      const tp = V.z > 1.5 ? clipPolyRect(tp0, -20, -20, 1100, 1940) : tp0;
      if (tp.length > 2) fillPoly(ctx, tp, P.monarchUnder);
      if (tp.length > 2) {
      L.hatch(ctx, tp, { angle: 1.15 + (V.ang || 0), spacing: 6, width: 1.3, color: P.monarchDeep, alpha: 0.85, length: [10, 30], seed: sd(W.id, 'tipH'), clip: true });
      L.hatch(ctx, tp, { angle: -0.45 + (V.ang || 0), spacing: 8, width: 1.2, color: P.monarchDeep, alpha: 0.6, length: [10, 26], seed: sd(W.id, 'tipX'), clip: true });
      L.stipple(ctx, tp, { spacing: 5, r: [0.8, 1.4], color: P.inkSoft, alpha: 0.35, density: 0.5, seed: sd(W.id, 'tipS') });
      }
    }
    // scale texture along each cell's veins
    if (fine) {
      const segs = [];
      const bi = L.boil(L.T);
      const ang = V.ang || 0;
      for (let i = 0; i < W.scales.length; i++) {
        const s = W.scales[i];
        const p = V.p(s);
        const a = s[2] + ang, h = s[3] * 0.5 * k;
        const j = (L.h3(i, bi, sd(W.id, 'scB')) - 0.5) * 0.8;
        segs.push([p[0] - Math.cos(a) * h + j, p[1] - Math.sin(a) * h, p[0] + Math.cos(a) * h, p[1] + Math.sin(a) * h + j]);
      }
      strokeBatch(ctx, segs, 1, P.monarchDeep, 0.35);
    }
    // shade: mid hatch over the lower-right half, 5 px hatch plus a 7 px cross layer on the lower-right third
    if (hp.length > 2) L.hatch(ctx, hp, { angle: -Math.PI / 4, spacing: 8, width: 1.3, color: P.monarchDeep, alpha: 0.8, length: [10, 34], seed: sd(W.id, 'h'),
      density: (x, y) => sstep(0.25, 0.55, shadeT(x, y)) });
    if (hp.length > 2) L.crossHatch(ctx, hp, { angle: -Math.PI / 4, spacing: 5, crossSpacing: 7, width: 1.2, color: L.mix(P.monarchDeep, P.ink, 0.35), alpha: 0.75, tone: 0.5, length: [8, 26], seed: sd(W.id, 'x'),
      density: (x, y) => sstep(0.55, 0.8, shadeT(x, y)) });
    // each cell: monarchDeep 5 px hatch strip on the lower-right of every non-cross vein
    {
      const vsh = [];
      for (let i = 0; i < W.veins.length; i++) {
        const v = W.veins[i];
        if (v.cross) continue;
        const pts = v.p, cum = cumLen(pts), T = cum[cum.length - 1];
        const r = L.rng(sd(W.id, 'vsh', i));
        for (let d = 0; d < T; d += 5) {
          const p = pointAt(pts, cum, d), tg = tangentAt(pts, cum, d);
          let nx = tg[1], ny = -tg[0];
          if (nx + ny < 0) { nx = -nx; ny = -ny; }
          const band = 16 + 8 * r();
          const w0 = 5 * v.w;
          const a = V.p([p[0] + nx * w0, p[1] + ny * w0]);
          const b = V.p([p[0] + nx * (w0 + band), p[1] + ny * (w0 + band)]);
          vsh.push([a[0], a[1], b[0], b[1]]);
        }
      }
      strokeBatch(ctx, vsh, 1.3, P.monarchDeep, 0.8);
    }
    if (W.id === 'hw' && hp.length > 2) {
      L.hatch(ctx, hp, { angle: 105 * DEG, spacing: 7, width: 1.2, color: L.mix(P.monarchDeep, P.ink, 0.25), alpha: 0.7, length: [8, 24], seed: sd('hwLo'),
        density: (x, y) => sstep(V.y(1360), V.y(1440), y) });
    }
    if (W.id === 'hw' && fine) {
      // the forewing's shadow falls across the hindwing just beyond its margin and inner edge
      const fm = V.mp(FW_MARGIN_RAW.concat(FW_INNER));
      L.crossHatch(ctx, poly, { spacing: 5, crossSpacing: 7, width: 1.2, color: P.ink, alpha: 0.55, tone: 0.5, length: [8, 24], seed: sd('hwSh'),
        density: (x, y) => {
          let best = 1e9;
          for (let i = 0; i < fm.length; i += 3) best = Math.min(best, Math.hypot(x - fm[i][0], y - fm[i][1]));
          return sstep(36 * k, 4, best);
        } });
    }
    if (hp.length > 2) L.stipple(ctx, hp, { spacing: 9, r: [0.7, 1.3], color: P.monarchDeep, alpha: 0.4, density: 0.5, seed: sd(W.id, 's') });
    if (fine) {
      // worn scales: pale flecks thickening toward the rubbed trailing edge
      L.stipple(ctx, poly, { spacing: 6, r: [0.8, 1.8], color: P.paper, alpha: 0.7, seed: sd(W.id, 'worn'),
        density: (x, y) => 0.06 + 0.4 * sstep(0.2, 0.9, L.noise2(x / 38, y / 38, sd(W.id, 'wornN')) + 0.3) });
    }
    // bare patches: scales gone, membrane left as paper with a stippled rim of loose scales
    for (let i = 0; i < BARE.length; i++) {
      const b = BARE[i];
      if (b.wing !== W.id || !fine) continue;
      const bp = V.mp(b.pts);
      fillPoly(ctx, bp, P.paper);
      const c = V.p(b.c);
      L.stipple(ctx, null, { bounds: { x: c[0] - 40 * k, y: c[1] - 30 * k, w: 80 * k, h: 60 * k }, spacing: 3.2, r: [0.6, 1.2], color: P.monarchDeep, alpha: 0.8, seed: sd('bareSt', i),
        density: (x, y) => {
          const inside = L.polyContains(bp, x, y);
          const d = Math.hypot((x - c[0]) / 1.25, (y - c[1]) / 0.85) / (b.r * k);
          return inside ? sstep(0.55, 1.0, d) * 0.7 : sstep(1.5, 1.0, d) * 0.5;
        } });
      L.inkPath(ctx, bp, { closed: true, width: 1, color: P.inkSoft, alpha: 0.35, seed: sd('bareL', i), wobble: 0.6 });
      L.hatch(ctx, bp, { angle: 1.2, spacing: 5, width: 0.8, color: P.inkFaint, alpha: 0.45, length: [4, 12], seed: sd('bareH', i) });
    }
    // black veins, 13 px at the cell tapering to 5 px at the margin; on the hindwing each is edged in white scales
    const vw = (v) => (u) => 6.5 * v.w * lerp(1, 0.38, u);
    if (W.edge) {
      const edges = [];
      for (let i = 0; i < W.veins.length; i++) {
        const v = W.veins[i];
        const [a, b] = veinOffsets(v.p, vw(v), 1.6);
        edges.push(a, b);
      }
      for (let i = 0; i < edges.length; i++) inkS(ctx, V, V.mp(edges[i]).map((p) => [p[0], p[1]]), { width: 3 * k, color: P.spotWhite, alpha: 0.8, wobble: 0.6, taper: [3, 6], minWidth: 0.4, swell: 0, seed: sd(W.id, 've', i) });
    }
    for (const b of W.bands) fillPoly(ctx, V.mp(b.poly), P.veinBlack);
    if (W.sub) {
      fillPoly(ctx, V.mp(W.sub), P.veinBlack);
    }
    for (let i = 0; i < W.veins.length; i++) {
      const v = W.veins[i];
      inkS(ctx, V, V.mp(v.p), { width: 13 * v.w * k, color: P.veinBlack, wobble: 0.8, tremble: 0.3, taper: [3, 6], minWidth: 0.5, swell: 0, seed: sd(W.id, 'v', i), pressure: (u) => lerp(1.02, 0.38, u) });
    }
    // white spots in the borders; a few are rubbed and broken
    const spots = [];
    const ghost = [];
    for (let i = 0; i < W.spots.length; i++) {
      const s = W.spots[i];
      const q = V.p(s);
      (L.h3(i, 9, sd(W.id, 'rub')) < 0.16 ? ghost : spots).push([q[0], q[1], s[2] * k]);
    }
    if (W.subSpots) for (const s of W.subSpots) {
      const q = V.p(s);
      spots.push([q[0], q[1], s[2] * k]);
    }
    dotBatch(ctx, spots, P.spotWhite, 1);
    dotBatch(ctx, ghost, P.spotWhite, 0.4);
    if (W.tear) {
      // the tear: the border breaks off raggedly, bare membrane shows along the cut, frayed scales at its edge
      const ts = V.mp(TEAR_STRIP);
      fillPoly(ctx, ts, L.mix(P.monarchPale, P.paper, 0.45));
      L.stipple(ctx, ts, { spacing: 3.4, r: [0.6, 1.2], color: P.monarchDeep, alpha: 0.7, seed: sd('tearSt'), density: 0.45 });
      const tr = V.mp(HW_TEAR);
      const nr = normalsToward(tr, V.p([718, 1400])[0], V.p([718, 1400])[1]);
      const fray = [];
      for (let i = 0; i < tr.length; i++) {
        const l = (3 + 5 * L.h3(i, 1, sd('fray'))) * k;
        fray.push([tr[i][0], tr[i][1], tr[i][0] + nr[i][0] * l + (L.h3(i, 2, sd('fray')) - 0.5) * 3, tr[i][1] + nr[i][1] * l]);
      }
      strokeBatch(ctx, fray, 1 * k, P.inkSoft, 0.8);
    }
    if (W.id === 'fw' && fine) {
      // the nick in the outer margin: a sliver of bare membrane
      const i0 = FW_MARGIN_RAW.findIndex((p, i) => FWM_CUM[i] > FW_NICK.d - 16);
      const edge = V.mp(FW_MARGIN.slice(i0, i0 + 11));
      const nr = normalsToward(edge, V.p([700, 1250])[0], V.p([700, 1250])[1]);
      const fray = edge.map((p, i) => [p[0], p[1], p[0] + nr[i][0] * (3 + 3 * L.h3(i, 3, sd('nickF'))) * k, p[1] + nr[i][1] * (3 + 3 * L.h3(i, 3, sd('nickF'))) * k]);
      strokeBatch(ctx, fray, 1 * k, P.spotWhite, 0.8);
    }
    ctx.restore();
    if (W.tear) inkS(ctx, V, V.mp(HW_TEAR), { width: 3 * k, color: P.ink, wobble: 2.4, tremble: 1.1, smooth: false, taper: [2, 2], seed: sd('tearL') });
    inkS(ctx, V, poly, { closed: true, width: W.width * k, color: P.ink, seed: sd(W.id, 'o') });
    // occasional doubled outline along the lower-right edges
    const dbl = V.mp(W.lowerRight);
    const dn = normalsToward(dbl, V.p([W.centre[0], W.centre[1]])[0], V.p([W.centre[0], W.centre[1]])[1]);
    inkS(ctx, V, dbl.map((p, i) => [p[0] - dn[i][0] * (3 + W.width * 0.5) * k, p[1] - dn[i][1] * (3 + W.width * 0.5) * k]), { width: 1.5 * k, color: P.ink, alpha: 0.4, taper: [20, 30], wobble: 1.6, seed: sd(W.id, 'dbl') });
    return poly;
  }
  const FW_DEF = { id: 'fw', out: FW_OUT, fill: L.pal.monarchPale, tip: FW_TIP, veins: FW_VEINS, bands: [FW_BORDER, FW_COSTA_B, FW_INNER_B], spots: FW_SPOTS, sub: FW_SUB, subSpots: FW_SUB_SPOTS,
    scales: FW_SCALES, width: 4, centre: [720, 1260], lowerRight: L.smoothPts([[736, 1166], [790, 1290], [822, 1382]], false, 8) };
  const HW_DEF = { id: 'hw', out: HW_OUT, fill: L.pal.monarchUnder, tip: null, veins: HW_VEINS, bands: [HW_BORDER_R, HW_BORDER_L], spots: HW_SPOTS, scales: HW_SCALES,
    width: 3.4, edge: true, tear: true, centre: [660, 1330], lowerRight: L.smoothPts([[826, 1400], [818, 1455], [792, 1492], [760, 1515]], false, 8) };

  // ---------------------------------------------------------------------------
  // Body parts and motion (character motion on twos)
  // ---------------------------------------------------------------------------
  const ABD_PRE = [[608, 1020], [580, 1024], [558, 1002], [546, 962], [541, 926], [540, 897]];
  const ABD_TIGHT = [[608, 1020], [584, 1016], [566, 992], [554, 958], [546, 924], [540, 893]];
  const ABD_POST = [[608, 1020], [588, 1040], [572, 1060], [562, 1084], [560, 1108], [564, 1130]];
  const ABD_W = (u) => (u < 0.18 ? lerp(30, 40, u / 0.18) : u < 0.6 ? lerp(40, 34, (u - 0.18) / 0.42) : u < 0.9 ? lerp(34, 18, (u - 0.6) / 0.3) : lerp(18, 7, (u - 0.9) / 0.1));

  // how hard the body answers the last foreleg tap, sampled on twos
  function tapPulse(tq) {
    let p = 0;
    for (const tk of TAPS) if (tq >= tk - 1e-6 && tq < LAY_T - 1e-6) p = Math.max(p, Math.exp(-(tq - tk) * 22));
    return p;
  }
  // the abdomen: curled to the leaf, tightening and pressing its tip in just before the lay, then springing away
  function abdomenPts(tq, dip) {
    let pose;
    if (tq < 0.4167 - 1e-6) pose = ABD_PRE;
    else if (tq < LAY_T - 1e-6) {
      pose = ABD_TIGHT;
    } else {
      const over = tq < LAY_T + 2 / 12 - 1e-6 ? 1.16 : 1;
      pose = ABD_PRE.map((p, i) => [lerp(p[0], ABD_POST[i][0], over), lerp(p[1], ABD_POST[i][1], over)]);
    }
    const hold = tq < LAY_T + 1e-6 ? 1 : 0;
    return L.smoothPts(pose.map((p, i) => {
      const w = (1 - i / (pose.length - 1)) * hold + (1 - hold);
      return [p[0] + dip[0] * w, p[1] + dip[1] * w];
    }), false, 5);
  }

  function drawLeg(ctx, V, P, hip, foot, bend, col, width, seedK, near) {
    const k = Math.max(V.k, V.z * 0.8); // legs keep their proportion to the body under the zoom
    const vx = foot[0] - hip[0], vy = foot[1] - hip[1];
    const len = Math.hypot(vx, vy) || 1;
    const nx = -vy / len, ny = vx / len;
    const knee = [hip[0] + vx * 0.45 + nx * bend, hip[1] + vy * 0.45 + ny * bend];
    const ux = foot[0] - knee[0], uy = foot[1] - knee[1], ul = Math.hypot(ux, uy) || 1;
    const hx = ux / ul, hy = uy / ul;
    const px = -hy, py = hx;
    if (V.z > 2) {
      const seg = (a, b, w0, w1, tag) => {
        inkS(ctx, V, V.mp([a, b]), { width: w0 * k, color: col, smooth: false, taper: [2, 3], minWidth: 0.4, seed: sd(tag, seedK), pressure: (u) => lerp(1, w1 / w0, u) });
        inkS(ctx, V, V.mp([a, b]).map((p) => [p[0] - 1.2, p[1] - 1]), { width: 1.5, color: P.spotWhite, alpha: 0.7, smooth: false, taper: [2, 3], minWidth: 0.4, seed: sd(tag, 'hl', seedK) });
      };
      if (near) {
        inkS(ctx, V, V.mp([hip, knee]).map((p) => [p[0] - 1.6 * k, p[1] - 1.2 * k]), { width: width * 1.9 * k, color: P.spotWhite, alpha: 0.55, smooth: false, taper: [2, 3], minWidth: 0.7, seed: sd('femurE', seedK) });
        inkS(ctx, V, V.mp([knee, foot]).map((p) => [p[0] - 1.6 * k, p[1] - 1 * k]), { width: width * 1.6 * k, color: P.spotWhite, alpha: 0.45, smooth: false, taper: [2, 5], minWidth: 0.5, seed: sd('tibiaE', seedK) });
      }
      seg(hip, knee, width * 1.3, width * 0.9, 'femur');
      seg(knee, foot, width * 0.9, width * 0.6, 'tibia');
      const segs = [];
      const ang = 35 * DEG;
      for (let i = 0; i < 5; i++) {
        const u = 0.12 + i * 0.16;
        const p = V.p([lerp(knee[0], foot[0], u), lerp(knee[1], foot[1], u)]);
        const ww = width * lerp(0.9, 0.6, u) * k;
        const sl = 0.5 * ww;
        for (const sgn of [-1, 1]) {
          const ox = sgn * px, oy = sgn * py;
          const dx = ox * Math.cos(ang) + hx * Math.sin(ang);
          const dy = oy * Math.cos(ang) + hy * Math.sin(ang);
          segs.push([p[0], p[1], p[0] + dx * sl, p[1] + dy * sl]);
        }
      }
      const tarsPts = [];
      let tx = foot[0], ty = foot[1];
      const tStep = 1.6;
      tarsPts.push([tx, ty]);
      for (let i = 0; i < 5; i++) {
        tx += hx * tStep;
        ty += hy * tStep;
        tarsPts.push([tx, ty]);
        const a = V.p(tarsPts[i]), b = V.p(tarsPts[i + 1]);
        const tw = width * lerp(0.6, 0.4, i / 4) * k;
        inkS(ctx, V, [a, b], { width: tw, color: col, smooth: false, taper: [1, 2], minWidth: 0.3, seed: sd('tars', seedK, i) });
        inkS(ctx, V, [a, b].map((p) => [p[0] - 1.2, p[1] - 1]), { width: 1.5, color: P.spotWhite, alpha: 0.65, smooth: false, taper: [1, 2], minWidth: 0.3, seed: sd('tarsH', seedK, i) });
        segs.push([a[0] + px * tw * 0.55, a[1] + py * tw * 0.55, a[0] - px * tw * 0.55, a[1] - py * tw * 0.55]);
      }
      const tip = V.p(tarsPts[5]);
      const hook = 1.2 * width * 0.6 * k;
      for (const c of [-1, 1]) {
        const ex = tip[0] + hx * hook * 0.35 + c * px * hook * 0.95;
        const ey = tip[1] + hy * hook * 0.2 + c * py * hook * 0.7;
        const cx = tip[0] + hx * hook * 0.85 + c * px * hook * 0.15;
        const cy = tip[1] + hy * hook * 0.75 + c * py * hook * 0.1;
        segs.push([tip[0], tip[1], cx, cy, ex, ey]);
      }
      strokeBatch(ctx, segs, 1.1 * k, col, 0.9);
      return;
    }
    const tars = [foot[0] + hx * 4, foot[1] + hy * 4];
    if (near) {
      // a pale edge so the near legs read where they cross the black thorax
      inkS(ctx, V, V.mp([hip, knee]).map((p) => [p[0] - 1.6 * k, p[1] - 1.2 * k]), { width: width * 1.9 * k, color: P.spotWhite, alpha: 0.55, smooth: false, taper: [2, 3], minWidth: 0.7, seed: sd('femurE', seedK) });
      inkS(ctx, V, V.mp([knee, foot]).map((p) => [p[0] - 1.6 * k, p[1] - 1 * k]), { width: width * 1.6 * k, color: P.spotWhite, alpha: 0.45, smooth: false, taper: [2, 5], minWidth: 0.5, seed: sd('tibiaE', seedK) });
    }
    inkS(ctx, V, V.mp([hip, knee]), { width: width * 1.35 * k, color: col, smooth: false, taper: [2, 3], minWidth: 0.7, seed: sd('femur', seedK) });
    inkS(ctx, V, V.mp([knee, foot, tars]), { width: width * k, color: col, smooth: false, taper: [2, 5], minWidth: 0.5, seed: sd('tibia', seedK) });
    // tibial spurs and tarsal claws
    const segs = [];
    for (const u of [0.35, 0.7]) {
      const p = V.p([lerp(knee[0], foot[0], u), lerp(knee[1], foot[1], u)]);
      segs.push([p[0], p[1], p[0] - (uy / ul) * 5 * k + (ux / ul) * 2 * k, p[1] + (ux / ul) * 5 * k + (uy / ul) * 2 * k]);
    }
    const ts = V.p(tars);
    for (const c of [-1, 1]) segs.push([ts[0], ts[1], ts[0] + ((ux / ul) * 3 + c * 4 * (-uy / ul)) * k, ts[1] + ((uy / ul) * 3 + c * 4 * (ux / ul)) * k]);
    strokeBatch(ctx, segs, 1.1 * k, col, 0.9);
    const f1 = V.p([lerp(hip[0], knee[0], 0.5), lerp(hip[1], knee[1], 0.5)]);
    dotBatch(ctx, [[f1[0], f1[1], 1.3 * k]], P.spotWhite, col === P.veinBlack ? 0.85 : 0.5);
  }

  // middle and hind legs leave the underside of the thorax and wrap round the body up to the leaf edge
  const MID_HIPS = [[648, 1016], [656, 1012]];
  const HIND_HIPS = [[624, 1020], [632, 1016]];
  const MID_FEET = [652, 668];
  const HIND_FEET = [598, 614];

  function drawButterfly(ctx, V0, P, tq, t) {
    const k = V0.k;
    const pulse = tapPulse(tq);
    const dip = [0.9 * pulse, -3 * pulse]; // thorax and head dip toward the leaf with each tap
    // the body view: world points on the thorax, head and antennae ride the dip
    const bodyV = (() => {
      const f = (q) => V0.p([q[0] + dip[0], q[1] + dip[1]]);
      return Object.assign({}, V0, { p: f, mp: (pts) => pts.map(f) });
    })();
    const V = V0;
    const footY = (x) => marginY(x) + 1.5;
    const hipD = (h) => [h[0] + dip[0], h[1] + dip[1]];
    // far legs (inkSoft, behind everything)
    drawLeg(ctx, V, P, hipD(MID_HIPS[1]), [MID_FEET[1], footY(MID_FEET[1])], -20, P.inkSoft, 2.8, 1);
    drawLeg(ctx, V, P, hipD(HIND_HIPS[1]), [HIND_FEET[1], footY(HIND_FEET[1])], -18, P.inkSoft, 2.8, 3);
    // antennae: clubs flick with each tap, and twitch between
    const tw = L.h3(Math.floor(tq * 12), 3, sd('antTw')) - 0.5;
    const antBase = [708, 944];
    const flick = 4 * pulse;
    const club2 = [878 + tw * 3 + flick * 0.4, 896 + tw * 4 - flick], club1 = [902 - tw * 2 + flick * 0.3, 922 + tw * 3 - flick];
    const antenna = (club, col, w, key) => {
      const B = bodyV;
      const mid = [lerp(antBase[0], club[0], 0.5), lerp(antBase[1], club[1], 0.5) - 8];
      inkS(ctx, B, B.mp([antBase, mid, club]), { width: w * Math.max(k, B.z * 0.8), color: col, taper: [2, 1], minWidth: 0.6, swell: 0, wobble: 0.6, seed: sd('ant', key) });
      const a = Math.atan2(club[1] - mid[1], club[0] - mid[0]);
      const c = B.p(club);
      L.inkPath(ctx, L.ellipsePts(c[0], c[1], 12 * B.z, 5 * B.z, 18, a), { closed: true, width: 1.4 * k, color: P.ink, fill: col, seed: sd('club', key) });
      dotBatch(ctx, [[c[0] + Math.cos(a) * 9 * B.z, c[1] + Math.sin(a) * 9 * B.z, 2.2 * B.z]], P.tan, 1);
      const segs = [];
      for (let u = 0.12; u < 0.9; u += 0.08) {
        const q = B.p([lerp(antBase[0], club[0], u), lerp(antBase[1], club[1], u) - 8 * Math.sin(Math.PI * u)]);
        segs.push([q[0], q[1], 0.8 * k]);
      }
      dotBatch(ctx, segs, P.spotWhite, 0.55);
    };
    antenna(club2, P.inkSoft, 2.4, 2);

    // wings: hindwing behind, forewing in front; they rock about the wing base with each tap
    const WV = wingView(V0, 1.5 * DEG * pulse, dip);
    paintWing(ctx, WV, P, HW_DEF);
    paintWing(ctx, WV, P, FW_DEF);

    // abdomen curling up to the leaf
    const ap = abdomenPts(tq, dip);
    const abPoly = V.mp(ribbonPoly(ap, ABD_W));
    fillPoly(ctx, abPoly, P.veinBlack);
    const cum = cumLen(ap);
    const T = cum[cum.length - 1];
    ctx.save();
    tracePoly(ctx, abPoly);
    ctx.clip();
    // curved contour hatching on the lit half, segment rings, the pale ventral spots
    const hat = [], rings = [], spots = [];
    const nH = Math.max(12, Math.round(T / 6));
    for (let i = 1; i < nH; i++) {
      const d = (i / nH) * T;
      const p = pointAt(ap, cum, d), tg = tangentAt(ap, cum, d);
      const w = ABD_W(d / T) / 2;
      const a = V.p([p[0] - tg[1] * w * 0.98, p[1] + tg[0] * w * 0.98]);
      const m = V.p([p[0] - tg[1] * w * 0.6 + tg[0] * 2.5, p[1] + tg[0] * w * 0.6 + tg[1] * 2.5]);
      const b = V.p([p[0] - tg[1] * w * 0.12 + tg[0] * 3, p[1] + tg[0] * w * 0.12 + tg[1] * 3]);
      hat.push([a[0], a[1], m[0], m[1], b[0], b[1]]);
    }
    strokeBatch(ctx, hat, 1.3 * k, P.spotWhite, 0.4);
    for (let i = 1; i <= 7; i++) {
      const d = (i / 8) * T;
      const p = pointAt(ap, cum, d), tg = tangentAt(ap, cum, d);
      const w = ABD_W(d / T) / 2;
      const a = V.p([p[0] - tg[1] * w, p[1] + tg[0] * w]), m = V.p([p[0] + tg[0] * 4, p[1] + tg[1] * 4]), b = V.p([p[0] + tg[1] * w, p[1] - tg[0] * w]);
      rings.push([a[0], a[1], m[0], m[1], b[0], b[1]]);
      const s1 = V.p([p[0] + tg[1] * w * 0.55, p[1] - tg[0] * w * 0.55]);
      spots.push([s1[0], s1[1], 2.2 * k]);
    }
    strokeBatch(ctx, rings, 1.7 * k, P.inkSoft, 0.95);
    dotBatch(ctx, spots, P.spotWhite, 0.85);
    ctx.restore();
    L.inkPath(ctx, abPoly, { closed: true, width: 4 * k, color: P.ink, seed: sd('abLine') });
    const tip = V.p(ap[ap.length - 1]);
    dotBatch(ctx, [[tip[0], tip[1], 3 * V.z]], P.tan, 0.9);

    const B = bodyV;
    const S = V.z;
    // forelegs first, so the head hides their roots: short, brushy, drumming the leaf on the 16ths
    for (const [off, col, key] of [[[7, -3], P.inkSoft, 1], [[0, 0], P.veinBlack, 0]]) {
      const down = tapContact(t);
      const hip = [676 + off[0] + dip[0], 978 + off[1] + dip[1]];
      const knee = [668 + off[0] + dip[0] * 0.7, 930 + off[1] + dip[1] * 0.7];
      const foot = down ? [722 + off[0], Math.min(898, marginY(722 + off[0]) + 8)] : [712 + off[0], 914 + off[1]];
      inkS(ctx, V, V.mp([hip, knee, foot]), { width: 3 * Math.max(k, V.z * 0.8), color: col, smooth: false, taper: [2, 3], minWidth: 0.6, seed: sd('fore', key) });
      const br = [];
      for (const [a, b] of [[hip, knee], [knee, foot]]) {
        const ux = b[0] - a[0], uy = b[1] - a[1], ul = Math.hypot(ux, uy) || 1;
        for (let i = 1; i < 5; i++) {
          const u = i / 5;
          const q = V.p([lerp(a[0], b[0], u), lerp(a[1], b[1], u)]);
          const l = (3.5 + 1.5 * L.h3(i, key, sd('brist'))) * k;
          for (const sgn of [-1, 1]) br.push([q[0], q[1], q[0] + (sgn * -uy / ul * 0.8 + ux / ul * 0.6) * l, q[1] + (sgn * ux / ul * 0.8 + uy / ul * 0.6) * l]);
        }
      }
      strokeBatch(ctx, br, 1.2 * k, col, 0.9);
    }

    // thorax: hairy, white spotted, contour hatched on its lit upper-left half
    const th = B.p(THX);
    const thPoly = L.ellipsePts(th[0], th[1], 40 * S, 28 * S, 40, AXA);
    const bi = L.boil(L.T);
    const hairs = [];
    const cr = Math.cos(AXA), sr = Math.sin(AXA);
    for (let i = 0; i < 56; i++) {
      const a = (i / 56) * TAU + L.h3(i, 3, 7) * 0.1;
      const l = (4 + 6 * L.h3(i, bi, 11)) * S;
      const ca = Math.cos(a), sa = Math.sin(a);
      const ex = 38 * S * ca, ey = 26 * S * sa;
      const fx = (38 * S + l) * Math.cos(a + 0.08), fy = (26 * S + l) * Math.sin(a + 0.08);
      hairs.push([th[0] + ex * cr - ey * sr, th[1] + ex * sr + ey * cr, th[0] + fx * cr - fy * sr, th[1] + fx * sr + fy * cr]);
    }
    strokeBatch(ctx, hairs, 1.3 * k, P.veinBlack, 1);
    L.inkPath(ctx, thPoly, { closed: true, width: 4.5 * k, color: P.ink, fill: P.veinBlack, seed: sd('thLine') });
    const thH = [];
    for (let u = -32; u <= 32; u += 6) {
      const h = 28 * Math.sqrt(Math.max(0, 1 - (u / 40) * (u / 40)));
      const P0 = [u, -h * 0.94], P1 = [u + 3.5, -h * 0.55], P2 = [u + 2.5, -h * 0.1];
      const m = (q) => [th[0] + (q[0] * cr - q[1] * sr) * S, th[1] + (q[0] * sr + q[1] * cr) * S];
      const a = m(P0), c = m(P1), b = m(P2);
      thH.push([a[0], a[1], 2 * c[0] - (a[0] + b[0]) / 2, 2 * c[1] - (a[1] + b[1]) / 2, b[0], b[1]]);
    }
    strokeBatch(ctx, thH, 1.3 * k, P.spotWhite, 0.38);
    const thSpots = [];
    for (const [ax, ay, r] of [[22, -14, 3.2], [2, -20, 3], [-18, -16, 2.6], [30, 4, 2.2], [-4, 14, 2], [-26, 8, 2]]) {
      thSpots.push([th[0] + (ax * cr - ay * sr) * S, th[1] + (ax * sr + ay * cr) * S, r * S]);
    }
    dotBatch(ctx, thSpots, P.spotWhite, 0.95);

    // near legs gripping the leaf edge, in front of the thorax
    drawLeg(ctx, V, P, hipD(MID_HIPS[0]), [MID_FEET[0], footY(MID_FEET[0])], -26, P.veinBlack, 3.4, 0, true);
    drawLeg(ctx, V, P, hipD(HIND_HIPS[0]), [HIND_FEET[0], footY(HIND_FEET[0])], -22, P.veinBlack, 3.4, 2, true);

    // coiled proboscis first, so the head's lower front edge covers its top third
    {
      const coil = [];
      for (let i = 0; i <= 30; i++) {
        const u = i / 30;
        const a = -Math.PI * 0.5 + u * 2.1 * TAU;
        const r = 6 * (1 - u * 0.75);
        coil.push(B.p([718 + Math.cos(a) * r, 982 + Math.sin(a) * r]));
      }
      L.inkPath(ctx, coil, { width: 3.2 * k, color: P.ink, taper: [1, 3], wobble: 0.3, tremble: 0.1, seed: sd('prob') });
      L.inkPath(ctx, coil, { width: 1.4 * k, color: P.tan, taper: [1, 3], wobble: 0.3, tremble: 0.1, seed: sd('probT') });
    }
    // head: big dark compound eye, white spots, the scaly labial palp
    const hd = B.p(HEAD);
    L.inkPath(ctx, L.ellipsePts(hd[0], hd[1], 25 * S, 24 * S, 32), { closed: true, width: 4.5 * k, color: P.ink, fill: P.veinBlack, seed: sd('head') });
    const hH = [];
    for (let a = -2.7; a < -0.9; a += 0.26) {
      const p0 = [hd[0] + Math.cos(a) * 21 * S, hd[1] + Math.sin(a) * 20 * S];
      const p1 = [hd[0] + Math.cos(a + 0.1) * 12 * S, hd[1] + Math.sin(a + 0.1) * 11 * S];
      hH.push([p0[0], p0[1], p1[0], p1[1]]);
    }
    strokeBatch(ctx, hH, 1.2 * k, P.spotWhite, 0.22);
    const eye = B.p([712, 962]);
    const ePoly = L.ellipsePts(eye[0], eye[1], 18 * S, 20 * S, 24, AXA);
    L.inkPath(ctx, ePoly, { closed: true, width: 1.6 * k, color: P.ink, fill: L.mix(P.veinBlack, P.inkSoft, 0.2), seed: sd('eye'), wobble: 0.4 });
    L.stipple(ctx, ePoly, { spacing: 3.4 * S, r: [0.45 * S, 0.8 * S], color: P.inkFaint, alpha: 0.5, seed: sd('facets') });
    {
      const rim = [];
      for (let a = 200 * DEG; a <= 290 * DEG; a += 0.08) {
        rim.push([eye[0] + Math.cos(a) * 18 * S, eye[1] + Math.sin(a) * 20 * S]);
      }
      L.inkPath(ctx, rim, { width: 1.5, color: P.spotWhite, alpha: 0.95, wobble: 0.2, taper: [1, 2], seed: sd('eyeRim') });
    }
    const glint = B.p([702, 956]);
    dotBatch(ctx, [[glint[0], glint[1], 2.6 * S]], P.white, 1);
    const hs = [[690, 946, 2.6], [684, 956, 2], [698, 941, 2]].map((q) => { const p = B.p(q); return [p[0], p[1], q[2] * S]; });
    dotBatch(ctx, hs, P.spotWhite, 0.95);
    // labial palp: an upturned tapered wedge of scales in front of the eye, with a hair fringe
    {
      const a = [714, 976], b = [744, 942];
      const ux = b[0] - a[0], uy = b[1] - a[1], ul = Math.hypot(ux, uy);
      const nx = -uy / ul, ny = ux / ul;
      const wedge = [[a[0] + nx * 6, a[1] + ny * 6], [lerp(a[0], b[0], 0.55) + nx * 4.4, lerp(a[1], b[1], 0.55) + ny * 4.4], [b[0] + nx * 3, b[1] + ny * 3], [b[0] + ux / ul * 2.5, b[1] + uy / ul * 2.5], [b[0] - nx * 3, b[1] - ny * 3], [lerp(a[0], b[0], 0.6) - nx * 4.2, lerp(a[1], b[1], 0.6) - ny * 4.2], [a[0] - nx * 6, a[1] - ny * 6]];
      const fringe = [];
      for (let i = 0; i < 7; i++) {
        const u = 0.12 + i * 0.13;
        const q = [lerp(a[0], b[0], u) + nx * 4 * (1 - u), lerp(a[1], b[1], u) + ny * 4 * (1 - u)];
        const l = 4 + 2 * L.h3(i, 2, sd('palpH'));
        const p0 = B.p(q), p1 = B.p([q[0] + nx * l + ux / ul * 1.5, q[1] + ny * l + uy / ul * 1.5]);
        fringe.push([p0[0], p0[1], p1[0], p1[1]]);
      }
      for (let i = 0; i < 7; i++) {
        const u = 0.1 + i * 0.12;
        const q = [lerp(a[0], b[0], u) - nx * 4 * (1 - u), lerp(a[1], b[1], u) - ny * 4 * (1 - u)];
        const l = 3 + 2 * L.h3(i, 4, sd('palpH'));
        const p0 = B.p(q), p1 = B.p([q[0] - nx * l + ux / ul * 2, q[1] - ny * l + uy / ul * 2]);
        fringe.push([p0[0], p0[1], p1[0], p1[1]]);
      }
      const tipP = B.p(b);
      for (let i = 0; i < 4; i++) {
        const an = Math.atan2(uy, ux) + (i - 1.5) * 0.6;
        fringe.push([tipP[0], tipP[1], tipP[0] + Math.cos(an) * 6 * k, tipP[1] + Math.sin(an) * 6 * k]);
      }
      L.inkPath(ctx, B.mp(wedge), { closed: true, width: 1.6 * k, color: P.ink, fill: P.veinBlack, seed: sd('palp'), wobble: 0.3, taper: [2, 4] });
      strokeBatch(ctx, fringe, 1 * k, P.veinBlack, 0.95);
      const scl = [];
      for (let i = 0; i < 4; i++) {
        const u = 0.18 + i * 0.19;
        const q = B.p([lerp(a[0], b[0], u) + nx * (1.5 - i * 0.6), lerp(a[1], b[1], u) + ny * (1.5 - i * 0.6)]);
        scl.push([q[0], q[1], (2 - i * 0.25) * S]);
      }
      dotBatch(ctx, scl, P.spotWhite, 0.92);
    }
    antenna(club1, P.veinBlack, 3, 1);
  }

  function tapContact(t) {
    if (t >= LAY_T) return false;
    for (const tk of TAPS) if (t >= tk - 1e-6 && t < tk + 2 * FR - 1e-6) return true;
    return false;
  }

  // ===========================================================================
  // A young spring milkweed shoot in the lower left: the new growth she is laying on
  // ===========================================================================
  const STEM_BASE = [318, 1990];
  const aboutStem = (p) => [STEM_BASE[0] + 1.3 * (p[0] - STEM_BASE[0]), STEM_BASE[1] + 1.3 * (p[1] - STEM_BASE[1])];
  const SHOOT = L.smoothPts([[318, 1990], [306, 1800], [288, 1640], [270, 1500], [258, 1390], [254, 1318]].map(aboutStem), false, 8);
  // opposite pairs of broad oval leaves; the top pair is young and curls inward
  const SHOOT_LEAVES = [
    { base: [294, 1716], ang: -2.62, len: 176, wid: 104, bow: 10, curl: 0 },
    { base: [302, 1706], ang: -0.4, len: 184, wid: 108, bow: -10, curl: 0 },
    { base: [272, 1530], ang: -2.36, len: 128, wid: 76, bow: 8, curl: 0 },
    { base: [282, 1522], ang: -0.7, len: 132, wid: 78, bow: -8, curl: 0 },
    { base: [255, 1392], ang: -1.98, len: 76, wid: 44, bow: 5, curl: 1 },
    { base: [263, 1388], ang: -1.1, len: 80, wid: 44, bow: -5, curl: -1 },
  ].map((lf) => Object.assign({}, lf, { base: aboutStem(lf.base), len: lf.len * 1.3, wid: lf.wid * 1.3, bow: lf.bow * 1.3 }));
  const SHOOT_PAIRS = [[0, 1], [2, 3], [4, 5]];
  function leafFrame(lf) {
    const ca = Math.cos(lf.ang), sa = Math.sin(lf.ang);
    // local (x along the midrib, y across it) to world, with a bowed midrib
    return (x, y) => {
      const u = x / lf.len;
      const b = lf.bow * Math.sin(Math.PI * u);
      return [lf.base[0] + x * ca - (y + b) * sa, lf.base[1] + x * sa + (y + b) * ca];
    };
  }
  const leafHW = (lf, u) => {
    const q = clamp((u - 0.08) / 0.92);
    return 0.5 * lf.wid * Math.pow(Math.max(0, 1 - Math.pow(2 * q - 1, 2)), 0.62) * (0.35 + 0.65 * sstep(0, 0.35, q));
  };
  const SHOOT_GEOM = SHOOT_LEAVES.map((lf, idx) => {
    const F = leafFrame(lf);
    const top = [], bot = [];
    for (let i = 0; i <= 30; i++) {
      const u = i / 30;
      const h = leafHW(lf, u);
      top.push(F(u * lf.len, -h));
      bot.push(F(u * lf.len, h));
    }
    const outline = top.concat(bot.slice(1, -1).reverse());
    const mid = [];
    for (let i = 0; i <= 12; i++) mid.push(F((i / 12) * lf.len, 0));
    // 3 to 4 pairs of side veins that leave the midrib, sweep toward the tip and loop into the next one
    const veins = [];
    const nv = lf.len > 120 ? 4 : 3;
    for (let j = 0; j < nv; j++) {
      const u0 = 0.16 + (j * 0.62) / nv;
      for (const sg of [-1, 1]) {
        const pts = [];
        for (let i = 0; i <= 8; i++) {
          const v = i / 8;
          const u = u0 + v * (0.62 / nv + 0.16);
          const y = sg * leafHW(lf, u) * 0.8 * Math.pow(Math.sin((Math.PI / 2) * Math.min(1, v * 1.35)), 0.8);
          pts.push(F(u * lf.len, y));
        }
        veins.push(pts);
      }
    }
    // the half of the blade away from the light (the side whose normal points down-right)
    const n = [-Math.sin(lf.ang), Math.cos(lf.ang)];
    const shadeSign = n[0] + n[1] > 0 ? 1 : -1;
    const half = [];
    for (let i = 0; i <= 30; i++) half.push(F((i / 30) * lf.len, 0));
    for (let i = 30; i >= 0; i--) half.push(F((i / 30) * lf.len, shadeSign * (leafHW(lf, i / 30) + 3)));
    let curlPoly = null, curlLine = null;
    if (lf.curl) {
      // the rolled-in edge: a strip along the upper margin shown as the leaf's underside
      const cs = -shadeSign;
      curlLine = [];
      const strip = [];
      for (let i = 4; i <= 30; i++) {
        const u = i / 30;
        const h = leafHW(lf, u);
        curlLine.push(F(u * lf.len, cs * h * lerp(0.05, 0.62, sstep(0.1, 0.7, u))));
      }
      for (let i = 4; i <= 30; i++) strip.push(F((i / 30) * lf.len, cs * leafHW(lf, i / 30)));
      curlPoly = strip.concat(curlLine.slice().reverse());
    }
    return { F, outline, mid, veins, half, shadeSign, curlPoly, curlLine, tip: F(lf.len, 0), idx };
  });

  function drawShoot(ctx, V, P) {
    const k = V.k;
    const sb = L.bounds(V.mp(SHOOT));
    if (sb.x > 1080 || sb.x + sb.w + 200 * V.z < 0 || sb.y > 1920) return;
    // construction: the stem axis carried on up past the tip, and an angle guide through each leaf pair
    {
      const p = new Path2D();
      const tip = SHOOT[SHOOT.length - 1], prev = SHOOT[SHOOT.length - 2];
      const dy = tip[1] - prev[1], dx = tip[0] - prev[0];
      const x960 = tip[0] + dx * (960 - tip[1]) / (dy || 1);
      const a = V.p(tip), b = V.p([x960, 960]);
      const c = V.p(STEM_BASE);
      p.moveTo(c[0], c[1]);
      p.lineTo(a[0], a[1]);
      p.moveTo(a[0], a[1]);
      p.lineTo(b[0], b[1]);
      for (const [i, j] of SHOOT_PAIRS) {
        const ta = SHOOT_GEOM[i].tip, tb = SHOOT_GEOM[j].tip;
        const dx = tb[0] - ta[0], dy = tb[1] - ta[1], l = Math.hypot(dx, dy);
        const q0 = V.p([ta[0] - (dx / l) * 40, ta[1] - (dy / l) * 40]), q1 = V.p([tb[0] + (dx / l) * 40, tb[1] + (dy / l) * 40]);
        p.moveTo(q0[0], q0[1]);
        p.lineTo(q1[0], q1[1]);
      }
      ctx.save();
      ctx.strokeStyle = P.inkFaint;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.stroke(p);
      ctx.restore();
    }
    // stem: a hairy tapering ribbon, contour hatched across its shadow (right) half
    const stemW = (u) => lerp(18, 8, u);
    const stem = V.mp(ribbonPoly(SHOOT, stemW));
    fillPoly(ctx, stem, P.milkweedStem);
    {
      const cum = cumLen(SHOOT), T = cum[cum.length - 1];
      const segs = [];
      for (let d = 4; d < T; d += 6) {
        const p = pointAt(SHOOT, cum, d), tg = tangentAt(SHOOT, cum, d);
        const w = stemW(d / T) / 2;
        const nx = -tg[1], ny = tg[0]; // points to the right of the upward stem? pick the right side
        const sgn = nx > 0 ? 1 : -1;
        const a = V.p([p[0] + sgn * nx * w * 0.05, p[1] + sgn * ny * w * 0.05]);
        const m = V.p([p[0] + sgn * nx * w * 0.55 - tg[0] * 1.5, p[1] + sgn * ny * w * 0.55 - tg[1] * 1.5]);
        const b = V.p([p[0] + sgn * nx * w * 1.05, p[1] + sgn * ny * w * 1.05]);
        segs.push([a[0], a[1], m[0], m[1], b[0], b[1]]);
      }
      strokeBatch(ctx, segs, 1.2 * k, P.ink, 0.5);
      const hl = [];
      for (let d = 10; d < T; d += 14) {
        const p = pointAt(SHOOT, cum, d), tg = tangentAt(SHOOT, cum, d);
        const w = stemW(d / T) / 2;
        const sgn = -tg[1] > 0 ? -1 : 1;
        const q = V.p([p[0] + sgn * -tg[1] * w * 0.55, p[1] + sgn * tg[0] * w * 0.55]);
        const q2 = V.p([p[0] + sgn * -tg[1] * w * 0.55 + tg[0] * 8, p[1] + sgn * tg[0] * w * 0.55 + tg[1] * 8]);
        hl.push([q[0], q[1], q2[0], q2[1]]);
      }
      strokeBatch(ctx, hl, 1.2 * k, P.white, 0.45);
    }
    inkS(ctx, V, stem, { closed: true, width: 3 * k, color: P.ink, seed: sd('stemL'), double: { offset: 3 * k + 1.5, alpha: 0.4, width: 0.5, from: 0.05, to: 0.4 } });
    const hairs = [];
    for (let i = 0; i < 64; i++) {
      const q = V.p(SHOOT[Math.floor((i / 64) * (SHOOT.length - 1))]);
      const sgn = i % 2 ? 1 : -1;
      const l = (6 + 5 * L.h3(i, 2, sd('stHair'))) * k;
      hairs.push([q[0] + sgn * 7 * k, q[1], q[0] + sgn * (7 * k + l * 0.8), q[1] - l * 0.6]);
    }
    strokeBatch(ctx, hairs, 1 * k, P.inkSoft, 0.7);
    // leaves
    for (let i = 0; i < SHOOT_LEAVES.length; i++) {
      const lf = SHOOT_LEAVES[i], G = SHOOT_GEOM[i];
      const poly = V.mp(G.outline);
      fillPoly(ctx, poly, P.milkweedYoung);
      const b0 = V.p(lf.base);
      const ca = Math.cos(lf.ang), sa = Math.sin(lf.ang);
      const along = (x, y) => ((x - b0[0]) * ca + (y - b0[1]) * sa) / (lf.len * V.z);
      // 8 px hatch on the shade half, parallel to the side veins; a cross layer near the petiole
      const half = V.mp(G.half);
      L.hatch(ctx, half, { angle: lf.ang + G.shadeSign * 0.75, spacing: 8, width: 1.3, color: L.mix(P.milkweedDeep, P.ink, 0.18), alpha: 0.9, length: [10, 26], seed: sd('slH', i), clip: true });
      if (i < 4) {
        L.hatch(ctx, half, { angle: lf.ang + Math.PI / 2, spacing: 5, width: 1.2, color: L.mix(P.milkweedDeep, P.ink, 0.28), alpha: 0.75, length: [6, 16], seed: sd('slC5', i), clip: true });
      }
      L.hatch(ctx, poly, { angle: lf.ang - G.shadeSign * 0.6, spacing: 7, width: 1.2, color: L.mix(P.milkweedDeep, P.ink, 0.3), alpha: 0.75, length: [8, 20], seed: sd('slX', i), clip: true,
        density: (x, y) => sstep(0.42, 0.1, along(x, y)) });
      L.stipple(ctx, poly, { spacing: 7.5, r: [1, 1.5], color: P.spotWhite, alpha: 0.75, density: 0.35, seed: sd('slS', i) });
      // looping side veins and the pale midrib
      const vs = G.veins.map((pts) => {
        const s = V.mp(pts);
        return s.slice(0, -1).map((p, j) => [p[0], p[1], s[j + 1][0], s[j + 1][1]]);
      }).flat();
      strokeBatch(ctx, vs.map((q) => [q[0] + 0.9 * k, q[1] + 0.9 * k, q[2] + 0.9 * k, q[3] + 0.9 * k]), 0.9 * k, P.inkSoft, 0.55);
      strokeBatch(ctx, vs, 1.6 * k, P.milkweedPale, 0.95);
      const md = V.mp(G.mid);
      inkS(ctx, V, md.map((p) => [p[0] + 1.2 * k, p[1] + 1.2 * k]), { width: 1.2 * k, color: P.inkSoft, alpha: 0.6, seed: sd('slMs', i), taper: [4, 20] });
      inkS(ctx, V, md, { width: 2.8 * k, color: P.milkweedPale, alpha: 0.95, seed: sd('slM', i), taper: [4, 26] });
      if (G.curlPoly) {
        const cp = V.mp(G.curlPoly);
        fillPoly(ctx, cp, P.milkweedDeep);
        L.crossHatch(ctx, cp, { spacing: 5, crossSpacing: 7, width: 1.1, color: P.ink, alpha: 0.45, tone: 0.5, length: [6, 14], seed: sd('slC', i), clip: true });
        inkS(ctx, V, V.mp(G.curlLine), { width: 2 * k, color: P.ink, seed: sd('slCl', i), taper: [6, 10] });
      }
      inkS(ctx, V, poly, { closed: true, width: 3 * k, color: P.ink, seed: sd('slL', i), double: i % 2 === 0 ? { offset: 3 * k + 1.5, alpha: 0.4, width: 0.5, from: 0.35, to: 0.7 } : false });
    }
  }

  // ===========================================================================
  // Construction lines and overlays
  // ===========================================================================
  function drawConstruction(ctx, V, P, t) {
    const z = V.z;
    ctx.save();
    ctx.strokeStyle = P.inkFaint;
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    // the egg axis, carried down the frame (x 540 never moves under this camera)
    ctx.moveTo(540, V.y(MARGIN_Y));
    ctx.lineTo(540, 1920);
    // the leaf-edge line through the gluing point
    ctx.moveTo(0, V.y(MARGIN_Y) + 0.5);
    ctx.lineTo(1080, V.y(MARGIN_Y) + 0.5);
    if (z < 8) {
      // body axis, head to abdomen
      const a = V.p([THX[0] - Math.cos(AXA) * 260, THX[1] - Math.sin(AXA) * 260]);
      const b = V.p([THX[0] + Math.cos(AXA) * 330, THX[1] + Math.sin(AXA) * 330]);
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      // wing-length ticks at the apex and a perpendicular through the thorax
      const ap = V.p([842, 1442]);
      ctx.moveTo(ap[0] - 22, ap[1]);
      ctx.lineTo(ap[0] + 22, ap[1]);
      ctx.moveTo(ap[0], ap[1] - 22);
      ctx.lineTo(ap[0], ap[1] + 60);
      const p0 = V.p([THX[0] + Math.sin(AXA) * 140, THX[1] - Math.cos(AXA) * 140]);
      const p1 = V.p([THX[0] - Math.sin(AXA) * 90, THX[1] + Math.cos(AXA) * 90]);
      ctx.moveTo(p0[0], p0[1]);
      ctx.lineTo(p1[0], p1[1]);
    }
    ctx.stroke();
    if (z < 8) {
      ctx.setLineDash([6, 8]);
      const c = V.p(THX);
      ctx.beginPath();
      ctx.arc(c[0], c[1], 483 * z, 0.9, 1.45);
      ctx.stroke();
      const tp = V.p([722, 898]);
      ctx.beginPath();
      ctx.arc(tp[0], tp[1], 34 * z, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      // a compass arc from the gluing point through the tip of the young shoot, ticked every 5 degrees
      const gp = V.p([540, MARGIN_Y]);
      const R = 513 * z;
      ctx.beginPath();
      ctx.arc(gp[0], gp[1], R, 95 * DEG, 178 * DEG);
      for (let a = 95; a <= 175; a += 5) {
        const l = (a % 15 === 5 ? 18 : 8) * z;
        const c = Math.cos(a * DEG), s = Math.sin(a * DEG);
        ctx.moveTo(gp[0] + c * R, gp[1] + s * R);
        ctx.lineTo(gp[0] + c * (R - l), gp[1] + s * (R - l));
      }
      ctx.moveTo(gp[0] - 14 * z, gp[1]);
      ctx.lineTo(gp[0] + 14 * z, gp[1]);
      ctx.stroke();
    }
    // a wide faint guide circle about the gluing point, growing with the camera
    ctx.beginPath();
    ctx.arc(540, 900, 640 * (z / Z_END) + 6, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  function ring(ctx, x, y, r, color, width, alpha) {
    if (alpha <= 0 || r <= 0) return;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  function drawOverlays(ctx, V, P, t) {
    const z = V.z;
    const E = L.ease;
    // tap rings from the forefeet, cut one frame before the lay so the egg owns the beat
    if (z < 3 && t < LAY_T - FR - 1e-6) {
      for (const tk of TAPS) {
        const u = (t - tk) / (9 * FR);
        if (u < 0 || u > 1) continue;
        const e = E.outExpo(u);
        const c = V.p([722, 896]);
        ring(ctx, c[0], c[1], lerp(6, 58, e) * z, P.annYellow, 3, 1 - u * u);
        ring(ctx, c[0], c[1], lerp(3, 34, e) * z, P.annYellow, 2, 1 - u);
        if (u < 0.35) ring(ctx, c[0], c[1], lerp(2, 14, e) * z, P.annYellow, 2, 1 - u / 0.35);
      }
    }
    // annBlue ruler along the forewing costa: the worn traveller, measured; draws on, then clears before the lay
    if (z < 3) {
      const on = E.outExpo(clamp(t / (6 * FR)));
      const fade = 1 - clamp((t - (LAY_T - 4 * FR)) / (3 * FR));
      if (on > 0 && fade > 0) {
        const a = V.p([719, 1044]), b = V.p([885, 1423]);
        const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
        const ux = dx / len, uy = dy / len, nx = uy, ny = -ux; // (nx, ny) points away from the wing
        const p = new Path2D();
        p.moveTo(a[0], a[1]);
        p.lineTo(a[0] + dx * on, a[1] + dy * on);
        const n = 18;
        for (let i = 0; i <= n; i++) {
          if (i / n > on + 1e-6) break;
          const l = (i % 6 === 0 ? 28 : 12) * z;
          const x = a[0] + dx * (i / n), y = a[1] + dy * (i / n);
          p.moveTo(x, y);
          p.lineTo(x + nx * l, y + ny * l);
        }
        ctx.save();
        ctx.globalAlpha = fade;
        ctx.strokeStyle = P.annBlue;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.stroke(p);
        ctx.restore();
      }
    }
    // annBlue arc: the abdomen curling up to the leaf, then released
    if (z < 3) {
      const draw = E.outExpo((t - 0.25) / (6 * FR));
      const fade = 1 - clamp((t - (LAY_T - 3 * FR)) / (3 * FR));
      if (draw > 0 && fade > 0) {
        const c = V.p([606, 962]);
        L.arcAnnotation(ctx, c[0], c[1], 104 * z, 112 * DEG, 218 * DEG, { color: P.annBlue, width: 2.5, p: draw, alpha: fade, arrow: 16, dot: 4 });
      }
    }
    if (t < LAY_T) return;
    const g = z / Z_END;
    // pop ring: 34 to 90 px over 3 frames, carried off by the camera
    const u = (t - LAY_T) / (3 * FR);
    if (u < 1 - 1e-6) {
      const e = E.outExpo(u);
      ring(ctx, 540, 900, lerp(34, 90, e) * z, P.annYellow, 3, 1 - 0.55 * u);
    }
    // eight radiating ticks for four frames: r 26 to 50 at the lay, 3 px
    const fi = Math.round((t - LAY_T) / FR);
    if (fi >= 0 && fi < 4) {
      const segs = [];
      const r0 = 26 + 6 * fi;
      const r1 = 50 + 10 * fi;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU + Math.PI / 8;
        segs.push([540 + Math.cos(a) * r0 * z, 900 + Math.sin(a) * r0 * z, 540 + Math.cos(a) * r1 * z, 900 + Math.sin(a) * r1 * z]);
      }
      strokeBatch(ctx, segs, 3, P.annYellow, 1 - 0.2 * fi);
    }
    // target ring round the new egg; lands on radius 470, the guide circle of 17
    const d = E.outExpo((t - LAY_T) / (6 * FR));
    const r = 10 * z;
    if (d > 0) {
      ctx.save();
      ctx.strokeStyle = P.annYellow;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(540, 900, r, -Math.PI / 2, -Math.PI / 2 + TAU * d);
      ctx.stroke();
      if (d > 0.9) {
        ctx.beginPath();
        for (let q = 0; q < 4; q++) {
          const a = (q * Math.PI) / 2;
          ctx.moveTo(540 + Math.cos(a) * (r - 8), 900 + Math.sin(a) * (r - 8));
          ctx.lineTo(540 + Math.cos(a) * (r + 8), 900 + Math.sin(a) * (r + 8));
        }
        ctx.stroke();
      }
      ctx.restore();
    }
    // measurement: height bracket at x 880 and width bracket at y 1330, on the pixels and tick counts 17 uses
    const m = E.outExpo((t - (LAY_T + 6 * FR)) / (5 * FR));
    if (m > 0) {
      const top = 900 - 380 * g, bot = 900 + 380 * g, lx = 540 - 285 * g, rx = 540 + 285 * g;
      const bx = 540 + 340 * g, by = 900 + 430 * g;
      ctx.save();
      ctx.strokeStyle = P.annBlue;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.globalAlpha = m;
      const p = new Path2D();
      const hy = lerp((top + bot) / 2, top, m), hy2 = lerp((top + bot) / 2, bot, m);
      p.moveTo(bx, hy);
      p.lineTo(bx, hy2);
      for (let i = 0; i <= 9; i++) {
        const y = lerp(top, bot, i / 9);
        if (y < hy - 0.5 || y > hy2 + 0.5) continue;
        const l = i === 0 || i === 9 ? 28 : 12;
        p.moveTo(bx, y);
        p.lineTo(bx - l, y);
      }
      const wx0 = lerp(540, lx, m), wx1 = lerp(540, rx, m);
      p.moveTo(wx0, by);
      p.lineTo(wx1, by);
      for (const x of [lx, rx]) {
        if (x < wx0 - 0.5 || x > wx1 + 0.5) continue;
        p.moveTo(x, by - 14);
        p.lineTo(x, by + 14);
      }
      for (let i = 1; i < 6; i++) {
        const x = lerp(lx, rx, i / 6);
        if (x < wx0 || x > wx1) continue;
        p.moveTo(x, by);
        p.lineTo(x, by - 12);
      }
      ctx.stroke(p);
      // dashed extension lines from the shell to the brackets
      ctx.setLineDash([14, 10]);
      ctx.globalAlpha = m * 0.7;
      ctx.beginPath();
      ctx.moveTo(540 + 30 * g, bot);
      ctx.lineTo(bx + 14, bot);
      ctx.moveTo(lx, 900 + 60 * g);
      ctx.lineTo(lx, by + 14);
      ctx.moveTo(rx, 900 + 60 * g);
      ctx.lineTo(rx, by + 14);
      ctx.stroke();
      ctx.restore();
    }
    // last six frames of the zoom: the construction that 17 inherits fades in (tick scale at x 60, G1 stations)
    const cf = clamp((t - (LAY_T + ZOOM_SPAN - 6 * FR)) / (6 * FR));
    if (cf > 0) {
      const p = new Path2D();
      p.moveTo(60, 120);
      p.lineTo(60, 1800);
      for (let i = 0; i <= 42; i++) {
        const y = 120 + 40 * i;
        p.moveTo(60, y);
        p.lineTo(60 + (i % 5 === 0 ? 22 : 10), y);
      }
      const q = new Path2D();
      for (const y of [560, 620, 700, 790, 880, 980, 1080, 1160]) {
        const sy = 900 + (y - 900) * g, h = hw(y) * g;
        for (const sgn of [-1, 1]) {
          q.moveTo(540 + sgn * (h + 6), sy);
          q.lineTo(540 + sgn * (h + 26), sy);
        }
      }
      q.moveTo(540 - 345 * g, 900 - 110 * g);
      q.lineTo(540 + 345 * g, 900 - 110 * g);
      ctx.save();
      ctx.strokeStyle = P.inkFaint;
      ctx.lineCap = 'round';
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.5 * cf;
      ctx.stroke(p);
      ctx.globalAlpha = 0.55 * cf;
      ctx.stroke(q);
      ctx.restore();
    }
    // snap-zoom guides: radial construction strokes rushing out from the egg
    const zu = (t - LAY_T - FR) / (7 * FR);
    if (zu >= 0 && zu <= 1) {
      const segs = [];
      for (let i = 0; i < 36; i++) {
        const a = (i / 36) * TAU + L.h3(i, 1, sd('zg')) * 0.12;
        const r0 = 480 * g + 40 + 900 * E.outCubic(zu) * (0.6 + 0.4 * L.h3(i, 2, sd('zg')));
        const r1 = r0 + 90 + 160 * L.h3(i, 3, sd('zg'));
        segs.push([540 + Math.cos(a) * r0, 900 + Math.sin(a) * r0, 540 + Math.cos(a) * r1, 900 + Math.sin(a) * r1]);
      }
      strokeBatch(ctx, segs, 1.5, P.inkFaint, 0.45 * (1 - zu));
    }
  }

  // ===========================================================================
  // Scene
  // ===========================================================================
  FILM.scene({
    id: ID,
    draw(ctx, t, info) {
      const P = L.pal;
      const tt = clamp(t, 0, info.dur);
      const tq = L.onTwos(tt);
      const z = zoomAt(tt);
      const V = view(z);
      L.stripes(ctx, { colors: [P.stripeCream, P.stripeSpring], width: 140, angle: -0.52, offset: ((info.shot.start + tt) / 0.5) * 6, seed: sd('stripes') });
      if (z < 8) drawLeafWorld(ctx, V, P);
      else drawLeafMacro(ctx, V, P);
      drawConstruction(ctx, V, P, tt);
      if (z < 3) drawShoot(ctx, V, P);
      if (z < 14) drawButterfly(ctx, V, P, tq, tt);
      if (tt >= LAY_T) {
        const pu = clamp((tt - LAY_T + FR) / (3 * FR));
        drawEgg(ctx, V, P, L.ease.outBack(pu));
      }
      drawOverlays(ctx, V, P, tt);
    },
  });
})();
