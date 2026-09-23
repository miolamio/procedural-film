// 10 wing-schematic: "Hand and arm, primaries and lift" (schematic, global T 18.0 to 19.5).
// Match cut from 09 on G3: the juvenile seen from below, wings fully spread, now a lavender blueprint on
// the same pixels. The wing bones draw on from the shoulders to the hand tips, the ten primaries light
// on the hand from P1 to P10 on 32nds (P10 magenta), three node glyphs open on the hand, the forearm and
// an airfoil section, then on T 19.0 schemIce streamlines flow over the right wing, three out-of-plane lift glyphs pop
// and the camera eases toward the push-in target (880, 890) on the right wing's P6, zoom 1.00 to 1.08
// with that point fixed on screen, so shot 11 starts at zoom 1.08 on it.
//
// Layers, back to front (frame px at zoom 1):
//   1 plate      blueprint centred (540, 860); guide circle r 460 through both wingtips, turning tick
//                rings, long diagonals through the target, the body axis x 540 ticked, edge rulers
//   2 measure    span bracket y 560, arm and hand brackets over the left leading edge, wrist chord
//                bracket x 1040, the wrist angle arc
//   3 wings      covert rows, stipple shade, secondaries and primaries (barbs, rachis, tip edge) on the
//                exact G3 feather polygons, the double outline; the lit primaries glow
//   4 body       lattice tissue, sternum and keel, furcula, pectoral fibres, vertebrae, skull and bill,
//                tail feathers and pygostyle, double outline
//   5 bones      humerus, radius and ulna, carpometacarpus and digit in lineWhite, joints, quill knobs
//                with leaders to every primary and secondary
//   6 airflow    section line x 720, streamlines and tip vortex (schemIce), circled-dot lift glyphs and the lift
//                distribution curve over the right wing
//   7 nodes      hand (160, 1300), forearm (380, 1400), airfoil (820, 1400), r 60
//   8 target     reticle on (880, 890) from T 19.0
//   9 screen     the cycle ring (900, 300), flight arc lit, drawn after the camera
(function () {
  'use strict';
  const FILM = window.FILM;
  const L = FILM.lib;
  const ID = 'wing-schematic';
  const TAU = Math.PI * 2;
  const DEG = Math.PI / 180;
  const FR = 1 / 24;
  const E_ = L.ease;

  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, u) => a + (b - a) * u;
  const sstep = (a, b, x) => {
    const u = clamp((x - a) / (b - a));
    return u * u * (3 - 2 * u);
  };
  const sd = (...k) => L.hash(ID, ...k) & 0x7fffffff;

  // beats, shot-local seconds
  const B_BONES = 2 * FR; // T 18.083: the bones draw on over 6 frames
  const B_PRIM = 0.5; // T 18.5: P1 lights, then one primary per 32nd; the node glyphs open
  const B_FLOW = 1.0; // T 19.0: streamlines flow, lift arrows pop, the camera starts
  const CAM0 = 1.0, CAM1 = 1.5; // T 19.0 to 19.5
  const ZOOM1 = 1.08;
  const TARGET = [880, 890]; // G3 push-in target, right wing P6 in 09's primary layout
  // frame (shot-local, 24 fps) on which primary n (1..10) lights: 32nds from T 18.5, rounded to the frame
  const PRIM_FRAME = [];
  for (let n = 1; n <= 10; n++) PRIM_FRAME.push(Math.round((B_PRIM + (n - 1) / 16) * 24));

  // ---------------------------------------------------------------------------
  // polyline helpers (cumLen, pointAt, normalAt as in 09, which the G3 block below needs)
  // ---------------------------------------------------------------------------
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
  // unit normal of a polyline at i (left of the direction of travel)
  function normalAt(pts, i) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    return [dy / l, -dx / l];
  }

  // ===========================================================================
  // G3: the juvenile in flight seen from below (storyboard "Shared geometry")
  // Shot 11 copies everything from here to the end of drawG3Bird verbatim.
  // ===========================================================================
  const G3_REF = 'first-flight'; // seeds of the G3 bird: the boil matches across the 09 -> 11 cut
  const G3_ANCHOR = [540, 860]; // pose origin (body centre between the wing roots)
  const G3_LE_L = [[500, 790], [300, 735], [80, 850]]; // leading edge, shoulder -> wrist -> tip
  const G3_TE_L = [[80, 850], [210, 905], [330, 915], [500, 880]]; // trailing edge, tip -> body

  // Catmull-Rom, tension 0.5, sampled 8 segments per span (the storyboard's G2/G3 recipe)
  function g3Spline(P) {
    const out = [];
    const n = P.length;
    for (let i = 0; i < n - 1; i++) {
      const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(n - 1, i + 2)];
      for (let k = 0; k < 8; k++) {
        const u = k / 8, u2 = u * u, u3 = u2 * u;
        const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3);
        out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
      }
    }
    out.push(P[n - 1].slice());
    return out;
  }
  const g3Mirror = (pts) => pts.map((p) => [1080 - p[0], p[1]]);

  // a flight feather along base -> tip: narrow leading vane, broad trailing vane (left wing:
  // the trailing side is the (uy, -ux) normal). blunt > 0 squares the tip off (secondaries).
  function g3Feather(b, e, wl, wt, blunt) {
    const dx = e[0] - b[0], dy = e[1] - b[1];
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len;
    const tx = uy, ty = -ux;
    const prof = (u) => {
      if (blunt) return u < 0.9 ? 1 : Math.sqrt(Math.max(0, 1 - Math.pow((u - 0.9) / 0.1, 2))) * (1 - blunt) + blunt;
      return u < 0.78 ? 1 - 0.12 * u : (1 - 0.12 * 0.78) * Math.sqrt(Math.max(0, 1 - Math.pow((u - 0.78) / 0.22, 2)));
    };
    const lead = [], trail = [];
    const N = 14;
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const w = prof(u);
      const cx = b[0] + ux * len * u, cy = b[1] + uy * len * u;
      lead.push([cx - tx * wl * w, cy - ty * wl * w]);
      trail.push([cx + tx * wt * w, cy + ty * wt * w]);
    }
    const poly = lead.concat(trail.slice().reverse());
    // the tip edge: the trailing vane's outer third round the tip
    const tipEdge = trail.slice(Math.floor(N * 0.62)).concat([lead[N], lead[N - 1]]);
    return { b, e, poly, tipEdge, rachis: [b, [b[0] + ux * len * 0.97, b[1] + uy * len * 0.97]], ux, uy, len, trail, lead };
  }

  // feather-tip scallops along a polyline: arcs every step px bowing toward +y (the trailing side)
  function g3Scallops(pts, step, phase, bow) {
    const cum = cumLen(pts);
    const tot = cum[cum.length - 1];
    const out = [];
    for (let d = phase * step; d + step <= tot + 0.5; d += step) {
      const a = pointAt(pts, cum, d), b = pointAt(pts, cum, Math.min(tot, d + step));
      const arc = [];
      for (let i = 0; i <= 4; i++) {
        const u = i / 4;
        arc.push([lerp(a[0], b[0], u), lerp(a[1], b[1], u) + bow * Math.sin(Math.PI * u)]);
      }
      out.push(arc);
    }
    return out;
  }

  let G3GEO = null;
  function g3Geo() {
    if (G3GEO) return G3GEO;
    const le = g3Spline(G3_LE_L); // 17 points, wrist at index 8
    const te = g3Spline(G3_TE_L); // 25 points, (210,905) at 8, (330,915) at 16
    const wing = le.concat(te.slice(1)); // closed through the body root (500,880) -> (500,790)
    const handTE = te.slice(0, 17);
    const secTE = te.slice(16);
    const hcum = cumLen(handTE), scum = cumLen(secTE);

    // 10 primaries, P1 (inner, tip at 330,915) to P10 (outer, tip at the wingtip), fanned from the hand
    const prim = [];
    for (let n = 1; n <= 10; n++) {
      const f = (10 - n) / 9;
      const tip = pointAt(handTE, hcum, hcum[16] * f);
      const base = [lerp(318, 244, (n - 1) / 9), lerp(793, 760, (n - 1) / 9)];
      const F = g3Feather(base, tip, n === 10 ? 5 : 6.5, n === 10 ? 11 : 15.5, 0);
      F.n = n;
      prim.push(F);
    }
    // 14 secondaries between (330,915) and the body, broad and blunt
    const sec = [];
    for (let j = 0; j < 14; j++) {
      const f = (j + 0.45) / 14;
      const tip = pointAt(secTE, scum, scum[scum.length - 1] * f);
      const k = Math.round(f * (secTE.length - 1));
      const nr = normalAt(secTE, k); // left of travel (toward the body) -> points up toward the leading edge
      const nx = -nr[0], ny = -nr[1];
      const up = ny < 0 ? [nx, ny] : [-nx, -ny];
      const base = [tip[0] + up[0] * 78 - 6, tip[1] + up[1] * 78];
      const F = g3Feather(base, tip, 5, 8.5, 0.62);
      F.j = j;
      sec.push(F);
    }
    // underwing coverts (below) / upperwing coverts (above): from the leading edge back to the covert line
    const covLine = g3Spline([[216, 770], [256, 787], [300, 800], [345, 816], [400, 831], [460, 842], [502, 848]]);
    const coverts = le.slice(0, 12).concat(covLine);
    // covert scallop rows (feather tips bowing toward the trailing edge), parallel to the leading
    // edge between shoulder and wrist; the last row runs along the covert line over the secondaries
    const leC = cumLen(le), clC = cumLen(covLine);
    const covRows = [];
    for (let r = 0; r < 4; r++) {
      const k = r < 3 ? (14 + r * 14) / 62 : 1;
      const row = [];
      for (let i = 0; i <= 24; i++) {
        const u = i / 24;
        const a = pointAt(le, leC, leC[9] * (1 - u)); // out past the wrist -> the shoulder
        const b = pointAt(covLine, clC, clC[clC.length - 1] * u);
        row.push([lerp(a[0], b[0], k), lerp(a[1], b[1], k)]);
      }
      covRows.push(g3Scallops(row, r === 3 ? 13 : 16 - r, r % 2 ? 0.5 : 0, r === 3 ? 5 : 4.2));
    }
    // carpal bar band (juvenile upperwing): shoulder to wrist behind the leading edge
    const carpal = [];
    const arm = le.slice(0, 10);
    for (let i = 0; i < arm.length; i++) carpal.push(arm[i]);
    for (let i = arm.length - 1; i >= 0; i--) {
      const w = 7 + 17 * Math.sin(Math.PI * clamp(i / (arm.length - 1) * 0.9 + 0.1));
      carpal.push([arm[i][0] + 4, arm[i][1] + w]);
    }

    // body and head, one silhouette: head arc from the bill base round to the neck, flank down to the tail base
    const side = [];
    for (let k = 0; k <= 10; k++) {
      const a = lerp(-1.82, -3.9, k / 10);
      side.push([540 + 34 * Math.cos(a), 690 + 34 * Math.sin(a)]);
    }
    side.push([518, 735], [506, 770], [492, 800], [485, 820], [487, 860], [494, 910], [504, 955], [514, 990], [521, 1010]);
    const body = side.concat(g3Mirror(side).reverse());
    const bodyL = side.concat([[540, 1010], [540, 657]]);
    const bodyR = g3Mirror(bodyL);
    // head disc and the neck line (for the above-view crown and the below-view smudges)
    const head = [];
    for (let k = 0; k < 28; k++) head.push([540 + 34 * Math.cos((k / 28) * TAU), 690 + 34 * Math.sin((k / 28) * TAU)]);
    const tailL = [[522, 1002], [515, 1045], [506, 1095], [499, 1140], [495, 1180], [503, 1167], [514, 1142], [527, 1117], [540, 1100]];
    const tail = tailL.concat(g3Mirror(tailL).reverse().slice(1));
    const tailFeathers = [];
    for (let i = 1; i <= 5; i++) {
      const u = i / 6;
      const tipL = [lerp(540, 495, u), lerp(1100, 1180, u)];
      tailFeathers.push([[540 - i * 3, 1012], tipL], [[540 + i * 3, 1012], [1080 - tipL[0], tipL[1]]]);
    }
    // scaly juvenile mantle and scapulars (above view): rows of fringed feather tips
    const mantle = [];
    for (let yy = 752, r = 0; yy <= 910; yy += 15, r++) {
      const hw = yy < 820 ? lerp(22, 48, (yy - 752) / 68) : lerp(48, 32, (yy - 820) / 90);
      const row = [[540 - hw, yy - 4], [540, yy + 4], [540 + hw, yy - 4]];
      mantle.push(...g3Scallops(row, 18, r % 2 ? 0.5 : 0, 7));
    }
    const bill = [[531.5, 661], [535.5, 640], [540, 610], [544.5, 640], [548.5, 661]];
    const feet = [
      [[532, 985], [530, 997], [533, 1001], [535, 990]],
      [[548, 985], [550, 997], [547, 1001], [545, 990]],
    ];

    const mirrorF = (F) => Object.assign({}, F, { poly: g3Mirror(F.poly), tipEdge: g3Mirror(F.tipEdge), rachis: g3Mirror(F.rachis), b: [1080 - F.b[0], F.b[1]], e: [1080 - F.e[0], F.e[1]] });
    G3GEO = {
      wings: [
        { s: -1, wing, le, te, handTE, secTE, prim, sec, coverts, covRows, carpal, covLine },
        {
          s: 1,
          wing: g3Mirror(wing),
          le: g3Mirror(le),
          te: g3Mirror(te),
          handTE: g3Mirror(handTE),
          secTE: g3Mirror(secTE),
          prim: prim.map(mirrorF),
          sec: sec.map(mirrorF),
          coverts: g3Mirror(coverts),
          covRows: covRows.map((rows) => rows.map(g3Mirror)),
          carpal: g3Mirror(carpal),
          covLine: g3Mirror(covLine),
        },
      ],
      body, bodyL, bodyR, head, mantle, tail, tailL, tailR: g3Mirror(tailL), tailFeathers, bill, feet,
    };
    return G3GEO;
  }

  // ===== end of the G3 geometry copied from 09 ====================================

  // ===========================================================================
  // line helpers (the 02 idiom: per-boil wobble into shared paths, one stroke per style)
  // ===========================================================================
  function wobPts(pts, seed, amp, bi) {
    const n = pts.length;
    const out = new Array(n);
    let s = 0;
    const sdb = (seed + bi * 7919) | 0;
    for (let i = 0; i < n; i++) {
      const p = pts[i];
      if (i > 0) s += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]);
      const a = pts[i > 0 ? i - 1 : 0], b = pts[i < n - 1 ? i + 1 : n - 1];
      const tx = b[0] - a[0], ty = b[1] - a[1];
      const tl = Math.hypot(tx, ty) || 1;
      const d = amp * L.noise1(s * 0.018, sdb);
      out[i] = [p[0] - (ty / tl) * d, p[1] + (tx / tl) * d];
    }
    return out;
  }
  function addPoly(path, pts, closed) {
    if (!pts || pts.length < 2) return;
    path.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) path.lineTo(pts[i][0], pts[i][1]);
    if (closed) path.closePath();
  }
  function wob(path, pts, seed, amp, bi, closed) {
    if (!pts || pts.length < 2) return;
    addPoly(path, amp ? wobPts(pts, seed, amp, bi) : pts, closed);
  }
  function stroke(ctx, path, color, alpha, width, dash) {
    if (alpha <= 0.003) return;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha *= Math.min(1, alpha);
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (dash) ctx.setLineDash(dash);
    ctx.stroke(path);
    ctx.restore();
  }
  function fill(ctx, path, color, alpha) {
    if (alpha <= 0.003) return;
    ctx.save();
    ctx.fillStyle = color;
    ctx.globalAlpha *= Math.min(1, alpha);
    ctx.fill(path);
    ctx.restore();
  }
  // soft additive halo under a schematic line (schematic mode only)
  function halo(ctx, path, color, k) {
    if (k <= 0.003) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const [w, a] of [[16, 0.03], [8, 0.055], [4, 0.08]]) {
      ctx.lineWidth = w;
      ctx.globalAlpha = a * k;
      ctx.stroke(path);
    }
    ctx.restore();
  }
  const polyPath = (pts, closed = true) => {
    const p = new Path2D();
    addPoly(p, pts, closed);
    return p;
  };
  const mirP = (p) => [1080 - p[0], p[1]];
  const mirA = (pts) => pts.map(mirP);

  function segDist(p, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const l2 = dx * dx + dy * dy || 1;
    const u = clamp(((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2);
    return Math.hypot(p[0] - a[0] - u * dx, p[1] - a[1] - u * dy);
  }
  // inner outline d px inside a closed polygon; points that would sit closer than d to an edge drop out
  function insetPoly(poly, d) {
    const n = poly.length;
    const out = [];
    for (let i = 0; i < n; i++) {
      const a = poly[(i - 2 + n) % n], b = poly[(i + 2) % n];
      let tx = b[0] - a[0], ty = b[1] - a[1];
      const tl = Math.hypot(tx, ty) || 1;
      tx /= tl;
      ty /= tl;
      let nx = -ty, ny = tx;
      const p = poly[i];
      if (!L.polyContains(poly, p[0] + nx * 1.5, p[1] + ny * 1.5)) {
        nx = -nx;
        ny = -ny;
      }
      out.push([p[0] + nx * d, p[1] + ny * d]);
    }
    const keep = [];
    for (const q of out) {
      let ok = L.polyContains(poly, q[0], q[1]);
      for (let j = 0; j < n && ok; j++) if (segDist(q, poly[j], poly[(j + 1) % n]) < d * 0.86) ok = false;
      if (ok) keep.push(q);
    }
    return keep;
  }
  // top and bottom crossings of a closed polygon with the vertical line x
  function yRangeAt(poly, x) {
    let lo = Infinity, hi = -Infinity;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[j], b = poly[i];
      if ((a[0] <= x && b[0] > x) || (b[0] <= x && a[0] > x)) {
        const y = a[1] + ((x - a[0]) / (b[0] - a[0])) * (b[1] - a[1]);
        if (y < lo) lo = y;
        if (y > hi) hi = y;
      }
    }
    return [lo, hi];
  }
  // the first d px of a polyline
  function headPts(pts, cum, d) {
    if (d <= 0) return null;
    const tot = cum[cum.length - 1];
    if (d >= tot) return pts;
    const out = [];
    for (let i = 0; i < pts.length && cum[i] < d; i++) out.push(pts[i]);
    out.push(pointAt(pts, cum, d));
    return out.length > 1 ? out : null;
  }
  function quadPts(a, c, b, n) {
    const out = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n, v = 1 - u;
      out.push([v * v * a[0] + 2 * v * u * c[0] + u * u * b[0], v * v * a[1] + 2 * v * u * c[1] + u * u * b[1]]);
    }
    return out;
  }
  function arcPts(cx, cy, r, a0, a1, n) {
    const out = [];
    for (let i = 0; i <= n; i++) {
      const a = a0 + ((a1 - a0) * i) / n;
      out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    return out;
  }
  // an arrow from (x0, y0) to (x1, y1) with an open head
  function arrow(path, x0, y0, x1, y1, head) {
    const dx = x1 - x0, dy = y1 - y0;
    const l = Math.hypot(dx, dy) || 1;
    const ux = dx / l, uy = dy / l;
    path.moveTo(x0, y0);
    path.lineTo(x1, y1);
    path.moveTo(x1 - ux * head - uy * head * 0.55, y1 - uy * head + ux * head * 0.55);
    path.lineTo(x1, y1);
    path.lineTo(x1 - ux * head + uy * head * 0.55, y1 - uy * head - ux * head * 0.55);
  }

  // ===========================================================================
  // Bones (left wing; the right wing mirrors about x 540). Storyboard: humerus shoulder (500, 790) to
  // elbow (410, 820); radius and ulna to the wrist (300, 735); hand bones to (160, 800).
  // ===========================================================================
  const SH = [500, 790], EL = [410, 820], WR = [300, 735], HT = [160, 800];
  const DG = [127, 817]; // the major digit past the hand
  const AL = [264, 741]; // alula digit on the leading edge at the wrist

  // a bone a -> b: centreline bowed by `bow` px (+ = the leading side, the left normal of a -> b) and
  // shifted by `off`; radius r0 at the head, r1 at the far end, rm along the shaft
  function boneShape(a, b, r0, r1, rm, bow, off) {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const len = Math.hypot(dx, dy);
    const ux = dx / len, uy = dy / len;
    const nx = uy, ny = -ux; // left of travel on screen = toward the leading edge for every left bone
    const N = 22;
    const c = [], s1 = [], s2 = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const bw = bow * Math.sin(Math.PI * u) + off;
      const cx = a[0] + dx * u + nx * bw, cy = a[1] + dy * u + ny * bw;
      const r = rm + (r0 - rm) * Math.pow(Math.max(0, 1 - u / 0.2), 2) + (r1 - rm) * Math.pow(Math.max(0, (u - 0.8) / 0.2), 2);
      c.push([cx, cy]);
      s1.push([cx + nx * r, cy + ny * r]);
      s2.push([cx - nx * r, cy - ny * r]);
    }
    return { c, s1, s2, len, cum: cumLen(c) };
  }

  let GEO = null;
  function geo() {
    if (GEO) return GEO;
    const G = g3Geo();

    // chain distances for the draw-on, shoulder -> tip
    const dHum = Math.hypot(EL[0] - SH[0], EL[1] - SH[1]);
    const dArm = Math.hypot(WR[0] - EL[0], WR[1] - EL[1]);
    const dHand = Math.hypot(HT[0] - WR[0], HT[1] - WR[1]);
    const dDig = Math.hypot(DG[0] - HT[0], DG[1] - HT[1]);
    const minorA = [lerp(WR[0], HT[0], 0.12), lerp(WR[1], HT[1], 0.12)];
    const minorB = [lerp(WR[0], HT[0], 0.9), lerp(WR[1], HT[1], 0.9)];
    const bonesL = [
      { k: 'hum', b: boneShape(SH, EL, 10, 9, 5.5, 3, 0), d0: 0, truss: true },
      { k: 'rad', b: boneShape(EL, WR, 5, 5, 2.6, 2, 6), d0: dHum },
      { k: 'uln', b: boneShape(EL, WR, 6.5, 6, 4.2, -8, -3), d0: dHum, truss: true },
      { k: 'mc3', b: boneShape(WR, HT, 6.5, 4.5, 3.6, 1.5, 1), d0: dHum + dArm, truss: true },
      { k: 'mc4', b: boneShape(minorA, minorB, 2.6, 2.4, 2, -9, -3), d0: dHum + dArm + dHand * 0.12 },
      { k: 'alu', b: boneShape([294, 739], AL, 2.8, 1.4, 1.9, 1, 0), d0: dHum + dArm + 2 },
      { k: 'dig', b: boneShape(HT, DG, 3.6, 1.4, 2.3, 0, 0), d0: dHum + dArm + dHand },
    ];
    const chain = dHum + dArm + dHand + dDig;
    const mirB = (b) => ({ c: mirA(b.c), s1: mirA(b.s1), s2: mirA(b.s2), len: b.len, cum: b.cum });
    const bonesR = bonesL.map((o) => Object.assign({}, o, { b: mirB(o.b) }));
    const joints = [
      { p: SH, r: 10, d: 0 },
      { p: EL, r: 9, d: dHum },
      { p: WR, r: 8.5, d: dHum + dArm },
      { p: HT, r: 6, d: dHum + dArm + dHand },
    ];

    // quill knobs: each primary's rachis, run back past its base, meets the major metacarpal
    const mc3 = bonesL[3].b;
    const primKnobs = G.wings[0].prim.map((F) => {
      const d = [F.b[0] - F.e[0], F.b[1] - F.e[1]];
      const dl = Math.hypot(d[0], d[1]);
      d[0] /= dl;
      d[1] /= dl;
      const v = [HT[0] - WR[0], HT[1] - WR[1]];
      const det = d[0] * -v[1] - d[1] * -v[0];
      const rx = WR[0] - F.b[0], ry = WR[1] - F.b[1];
      let s = (d[0] * ry - d[1] * rx) / det;
      s = clamp(s, 0.05, 0.95);
      const q = pointAt(mc3.c, mc3.cum, mc3.cum[mc3.cum.length - 1] * s);
      return { q, s, base: F.b };
    });
    // secondaries on the ulna: the outermost (by the hand) near the wrist, the innermost at the elbow
    const uln = bonesL[2].b;
    const secKnobs = G.wings[0].sec.map((F, j) => {
      const s = lerp(0.9, 0.08, j / 13); // along elbow -> wrist
      const q = pointAt(uln.c, uln.cum, uln.cum[uln.cum.length - 1] * s);
      return { q, s, base: F.b };
    });
    const knobs = [
      { prim: primKnobs, sec: secKnobs },
      {
        prim: primKnobs.map((o) => ({ q: mirP(o.q), s: o.s, base: mirP(o.base) })),
        sec: secKnobs.map((o) => ({ q: mirP(o.q), s: o.s, base: mirP(o.base) })),
      },
    ];

    // the wing outlines: open from the shoulder round the tip to the root (the root line is under the body)
    const wings = G.wings.map((W) => ({ W, outer: W.le.concat(W.te.slice(1)), inner: insetPoly(W.wing, 9) }));
    const bodyIn = insetPoly(G.body, 9);
    const tailIn = insetPoly(G.tail, 5);

    // airflow over the right wing
    const RW = G.wings[1].wing;
    const LE = (x) => yRangeAt(RW, x)[0];
    const TE = (x) => yRangeAt(RW, x)[1];
    const STATIONS = [612, 684, 756, 828, 900, 962];
    const streams = STATIONS.map((x0, i) => {
      const le = LE(x0), te = TE(x0);
      const drift = [12, 18, 26, 34, 44, 56][i];
      const pts = [];
      // in from slightly inboard, a small upwash kink before the leading edge, then an outward drift
      // across the chord that keeps growing behind the trailing edge (the spanwise flow under the wing)
      for (let y = le - 96; y <= te + 140; y += 6) {
        const inn = -14 * (1 - sstep(le - 96, le - 8, y));
        const bump = -5 * Math.exp(-Math.pow((y - (le - 20)) / 18, 2));
        pts.push([x0 + inn + bump + drift * sstep(le - 10, te + 140, y), y]);
      }
      return { pts, cum: cumLen(pts), le, te };
    });
    // the tip vortex behind the right wingtip
    const VORTEX = [1016, 918];
    const spiral = [];
    for (let i = 0; i <= 90; i++) {
      const a = (i / 90) * 4 * Math.PI;
      const r = 3 + 25 * (i / 90);
      spiral.push([Math.cos(a) * r, Math.sin(a) * r * 0.8]);
    }
    // lift: an elliptic spanwise load on the quarter-chord line
    const liftBase = (x) => {
      const le = LE(x), te = TE(x);
      return le + 0.28 * (te - le);
    };
    const liftLen = (x) => 118 * Math.sqrt(Math.max(0, 1 - Math.pow((x - 540) / 468, 2)));
    const ARROWS = [650, 760, 868].map((x) => ({ x, y: liftBase(x), l: liftLen(x) }));
    const liftCurve = [];
    const liftStems = [];
    for (let x = 590; x <= 1000; x += 6) liftCurve.push([x, liftBase(x) - liftLen(x)]);
    for (let x = 600; x <= 990; x += 22) liftStems.push([[x, liftBase(x)], [x, liftBase(x) - liftLen(x)]]);
    const quarter = [];
    for (let x = 590; x <= 1000; x += 6) quarter.push([x, liftBase(x)]);
    // the airfoil section line at x 720
    const SEC_X = 720;
    const section = { x: SEC_X, a: LE(SEC_X), b: TE(SEC_X) };

    // the propatagial tendon, shoulder to wrist just inside the leading edge
    const le0 = G.wings[0].le;
    const tendonL = le0.slice(0, 9).map((q, i) => {
      const nr = normalAt(le0, i);
      const sgn = nr[1] < 0 ? -1 : 1;
      return [q[0] + nr[0] * 9 * sgn, q[1] + nr[1] * 9 * sgn];
    });
    const tendons = [tendonL, mirA(tendonL)];
    const tendonCum = cumLen(tendonL);

    GEO = {
      tendons, tendonCum, armLen: dHum + dArm,
      G, bonesL, bonesR, chain, joints, knobs, wings, bodyIn, tailIn, streams, VORTEX, spiral,
      ARROWS, liftCurve, liftStems, quarter, section, LE, TE,
    };
    return GEO;
  }

  // ===========================================================================
  // 1 plate
  // ===========================================================================
  function drawPlate(ctx, P, t, dur, bi) {
    const lav = P.lavender;
    L.blueprint(ctx, { center: [540, 860], seed: 1010, circles: 0, diagonals: 0 });
    const rot = -Math.PI / 2 + 4 * DEG * (t / dur);
    // the guide circle through both wingtips (09's construction circle), with turning tick rings
    L.guideCircle(ctx, 540, 860, 460, { alpha: 0.17, width: 1.5 });
    L.ticks(ctx, 540, 860, { r: 460, n: 72, len: 8, major: 6, majorLen: 20, rot, color: lav, alpha: 0.38, width: 1.2, inward: true });
    L.ticks(ctx, 540, 860, { r: 460, n: 360, len: 4, rot, color: lav, alpha: 0.13, width: 1 });
    L.guideCircle(ctx, 540, 860, 486, { alpha: 0.08, width: 1, dash: [2, 9] });
    L.guideCircle(ctx, 540, 860, 650, { alpha: 0.1, width: 1.5 });
    L.ticks(ctx, 540, 860, { r: 650, n: 120, len: 5, major: 10, majorLen: 13, rot: -rot * 0.5, color: lav, alpha: 0.16, width: 1 });
    L.guideCircle(ctx, 540, 860, 250, { alpha: 0.08, width: 1, dash: [3, 7] });
    for (let k = 0; k < 4; k++) {
      const a = k * 90 * DEG + 30 * DEG + 4 * DEG * (t / dur);
      L.arcAnnotation(ctx, 540, 860, 500, a, a + 26 * DEG, { color: lav, alpha: 0.2, width: 1.2, endTicks: 10 });
    }
    // long diagonals through the push-in target: 45 degree pair and the right leading edge's hand line
    const dg = new Path2D();
    const le = [(1000 - 780) / Math.hypot(220, 115), (850 - 735) / Math.hypot(220, 115)];
    for (const d of [[Math.SQRT1_2, Math.SQRT1_2], [Math.SQRT1_2, -Math.SQRT1_2], le]) {
      dg.moveTo(TARGET[0] - d[0] * 2600, TARGET[1] - d[1] * 2600);
      dg.lineTo(TARGET[0] + d[0] * 2600, TARGET[1] + d[1] * 2600);
    }
    stroke(ctx, dg, lav, 0.12, 1);
    L.guideCircle(ctx, TARGET[0], TARGET[1], 130, { alpha: 0.1, width: 1, dash: [2, 6] });
    // construction: body axis x 540 ticked every 60 px, the wing axis y 860, the wrist line y 735
    const ax = new Path2D();
    ax.moveTo(540, 220);
    ax.lineTo(540, 1880);
    stroke(ctx, ax, lav, 0.12, 1);
    L.ticks(ctx, 540, 220, { kind: 'linear', length: 1620, angle: Math.PI / 2, n: 27, len: 8, major: 5, majorLen: 24, side: 1, color: lav, alpha: 0.22, width: 1, baseline: false });
    const cons = new Path2D();
    cons.moveTo(30, 860);
    cons.lineTo(1050, 860);
    stroke(ctx, cons, lav, 0.16, 1, [10, 8]);
    const cons2 = new Path2D();
    cons2.moveTo(200, 735);
    cons2.lineTo(880, 735);
    cons2.moveTo(300, 690);
    cons2.lineTo(300, 960);
    cons2.moveTo(780, 690);
    cons2.lineTo(780, 960);
    stroke(ctx, cons2, lav, 0.1, 1, [3, 6]);
    // registration crosses where r 460 meets the axes, and section arrows at the frame edges on y 860
    const reg = new Path2D();
    for (const [x, y] of [[540, 400], [540, 1320], [80, 860], [1000, 860]]) {
      reg.moveTo(x - 9, y);
      reg.lineTo(x + 9, y);
      reg.moveTo(x, y - 9);
      reg.lineTo(x, y + 9);
    }
    stroke(ctx, reg, lav, 0.4, 1.2);
    const sec = new Path2D();
    for (const sgn of [1, -1]) {
      const x0 = sgn > 0 ? 8 : 1072;
      sec.moveTo(x0, 852);
      sec.lineTo(x0 + sgn * 16, 860);
      sec.lineTo(x0, 868);
      sec.closePath();
    }
    fill(ctx, sec, lav, 0.5);
    // edge rulers
    L.ticks(ctx, 60, 1600, { kind: 'linear', length: 960, angle: 0, n: 96, len: 5, major: 10, majorLen: 14, side: 1, color: lav, alpha: 0.24, width: 1 });
    L.ticks(ctx, 40, 380, { kind: 'linear', length: 1160, angle: Math.PI / 2, n: 58, len: 5, major: 5, majorLen: 12, side: -1, color: lav, alpha: 0.2, width: 1 });
    L.guideCircle(ctx, 540, 1600, 8, { alpha: 0.35, cross: 18, width: 1 });
    // a faint aspect ratio construction below the bird: the span over the mean chord as a long thin panel
    const ar = new Path2D();
    ar.rect(80, 1236, 920, 75);
    stroke(ctx, ar, lav, 0.1, 1, [2, 5]);
    const arT = new Path2D();
    for (let x = 80; x <= 1000; x += 75) {
      arT.moveTo(x, 1236);
      arT.lineTo(x, 1311);
    }
    stroke(ctx, arT, lav, 0.07, 1);
  }

  // ===========================================================================
  // 2 measurement: span, arm and hand, wrist chord, the wrist and elbow angles
  // ===========================================================================
  function drawMeasure(ctx, P, k, bi) {
    if (k <= 0) return;
    const lav = P.lavender;
    L.bracket(ctx, 80, 560, 1000, 560, { p: k, alpha: 0.6, cap: 16 });
    L.ticks(ctx, 80, 560, { kind: 'linear', length: 920, angle: 0, n: 20, len: 8, major: 5, majorLen: 14, side: 1, baseline: false, color: lav, alpha: 0.45, width: 1.2, p: k });
    const ext = new Path2D();
    ext.moveTo(80, 834);
    ext.lineTo(80, 546);
    ext.moveTo(1000, 834);
    ext.lineTo(1000, 546);
    ext.moveTo(540, 600);
    ext.lineTo(540, 546);
    stroke(ctx, ext, lav, 0.28 * k, 1, [4, 6]);
    L.bracket(ctx, 500, 790, 300, 735, { offset: 40, p: k, alpha: 0.5, cap: 12, width: 1.3 });
    L.bracket(ctx, 300, 735, 80, 850, { offset: 40, p: k, alpha: 0.5, cap: 12, width: 1.3 });
    L.bracket(ctx, 1040, 735, 1040, 915, { p: k, alpha: 0.5, cap: 12, width: 1.3 });
    const ch = new Path2D();
    ch.moveTo(792, 735);
    ch.lineTo(1052, 735);
    ch.moveTo(762, 915);
    ch.lineTo(1052, 915);
    stroke(ctx, ch, lav, 0.24 * k, 1, [4, 6]);
    // the wrist angle on both hands, and the left elbow
    const aE = Math.atan2(EL[1] - WR[1], EL[0] - WR[0]), aT = Math.atan2(HT[1] - WR[1], HT[0] - WR[0]);
    L.arcAnnotation(ctx, WR[0], WR[1], 44, aE, aT, { color: lav, alpha: 0.6 * k, width: 1.5, endTicks: 8, p: k });
    L.arcAnnotation(ctx, 1080 - WR[0], WR[1], 44, Math.PI - aT, Math.PI - aE, { color: lav, alpha: 0.6 * k, width: 1.5, endTicks: 8, p: k });
    const aS = Math.atan2(SH[1] - EL[1], SH[0] - EL[0]), aW = Math.atan2(WR[1] - EL[1], WR[0] - EL[0]);
    L.arcAnnotation(ctx, EL[0], EL[1], 30, aW, aS, { color: lav, alpha: 0.5 * k, width: 1.2, endTicks: 6, p: k });
  }

  // ===========================================================================
  // 3 wings: coverts, shade, secondaries, primaries, double outline
  // ===========================================================================
  function drawWings(ctx, P, g, fr, bi, kRet) {
    const lav = P.lavender, white = P.lineWhite;
    for (let wi = 0; wi < 2; wi++) {
      const W = g.G.wings[wi];
      const right = wi === 1;
      const wingPath = polyPath(W.wing);
      fill(ctx, wingPath, P.navyLight, 0.35);
      ctx.save();
      ctx.clip(wingPath);
      // shade: sparse stipple toward the trailing edge, heavier on the right wing (light from upper left)
      L.stipple(ctx, W.wing, {
        spacing: 6.5, r: [0.6, 1.2], color: lav, alpha: 0.32, seed: sd('shade', wi), boil: bi,
        density: (x, y) => clamp((y - 790) / 120) * (right ? 0.85 : 0.4) + (right ? 0.05 : 0),
      });
      // covert rows (feather tips) over the arm
      const cov = new Path2D();
      W.covRows.forEach((arcs, r) => arcs.forEach((a, i) => wob(cov, a, sd('cov', wi, r, i), 0.3, bi, false)));
      stroke(ctx, cov, lav, 0.3, 1);
      const covLine = new Path2D();
      wob(covLine, W.covLine, sd('covL', wi), 0.4, bi, false);
      stroke(ctx, covLine, lav, 0.45, 1.2);
      // secondaries: broad, blunt
      const secO = new Path2D(), secR = new Path2D(), secT = new Path2D();
      W.sec.forEach((F, j) => {
        wob(secO, F.poly, sd('sec', wi, j), 0.35, bi, true);
        addPoly(secR, [F.rachis[0], [lerp(F.b[0], F.e[0], 0.86), lerp(F.b[1], F.e[1], 0.86)]], false);
        wob(secT, F.tipEdge, sd('secT', wi, j), 0.3, bi, false);
      });
      stroke(ctx, secO, lav, 0.38, 1);
      stroke(ctx, secR, lav, 0.32, 1);
      stroke(ctx, secT, lav, 0.5, 1.6);
      // primaries, P10 first so the inner ones lie over them
      const unO = new Path2D(), unR = new Path2D(), litO = new Path2D(), litR = new Path2D(), tips = new Path2D();
      for (let n = 9; n >= 0; n--) {
        const F = W.prim[n];
        const lf = fr - PRIM_FRAME[n];
        const lit = lf >= 0;
        // barbs: short strokes across the vanes angled toward the tip
        const aa = Math.atan2(F.e[1] - F.b[1], F.e[0] - F.b[0]);
        L.hatch(ctx, F.poly, {
          angle: aa + (right ? -0.6 : 0.6), spacing: 6, width: 0.8, color: lit ? white : lav, alpha: lit ? 0.3 : 0.17,
          length: [7, 16], gap: [2, 5], inset: 2, seed: sd('barb', wi, n), boil: bi, edge: 0.05,
        });
        const po = polyPath(wobPts(F.poly, sd('prim', wi, n), 0.35, bi));
        if (lit) {
          fill(ctx, po, P.navyLight, 0.5);
          const flash = lf < 6 ? 1 - lf / 6 : 0;
          if (flash > 0) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            fill(ctx, po, n === 9 ? P.magenta : P.glow, 0.22 * flash);
            ctx.restore();
            halo(ctx, po, n === 9 ? P.magenta : white, flash * 1.4);
          }
          wob(litO, F.poly, sd('prim', wi, n), 0.35, bi, true);
          addPoly(litR, F.rachis, false);
        } else {
          wob(unO, F.poly, sd('prim', wi, n), 0.35, bi, true);
          addPoly(unR, F.rachis, false);
        }
        wob(tips, F.tipEdge, sd('tip', wi, n), 0.3, bi, false);
      }
      stroke(ctx, unO, lav, 0.45, 1.1);
      stroke(ctx, unR, lav, 0.55, 1.2);
      stroke(ctx, litO, white, 0.85, 1.4);
      stroke(ctx, litR, white, 0.95, 1.6);
      stroke(ctx, tips, white, 0.55, 2.2);
      // P10 in magenta for its first 6 frames
      const lf10 = fr - PRIM_FRAME[9];
      if (lf10 >= 0 && lf10 < 6) {
        const m = new Path2D();
        wob(m, W.prim[9].poly, sd('prim', wi, 9), 0.35, bi, true);
        stroke(ctx, m, P.magenta, 1 - lf10 / 7, 3);
      }
      // P6 of the right wing (09's layout) under the push-in reticle
      if (right && kRet > 0) {
        const p6 = new Path2D();
        wob(p6, W.prim[5].poly, sd('prim', wi, 5), 0.35, bi, true);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        fill(ctx, p6, P.glow, 0.16 * clamp(kRet));
        ctx.restore();
        halo(ctx, p6, white, kRet * 1.2);
        stroke(ctx, p6, white, kRet, 2.6);
      }
      ctx.restore();

      // the double outline: outer 2.5 px on the G3 line, inner 1.5 px 9 px inside
      const outer = new Path2D();
      wob(outer, g.wings[wi].outer, sd('wingO', wi), 0.6, bi, false);
      halo(ctx, outer, lav, 1);
      stroke(ctx, outer, lav, 0.85, 2.5);
      const inner = new Path2D();
      wob(inner, g.wings[wi].inner, sd('wingI', wi), 0.5, bi, true);
      stroke(ctx, inner, lav, 0.5, 1.5);
    }
  }

  // ===========================================================================
  // 4 body, head and tail
  // ===========================================================================
  function drawBody(ctx, P, g, bi) {
    const lav = P.lavender, white = P.lineWhite;
    const G = g.G;
    // tail first: the body covers its root
    const tailP = polyPath(G.tail);
    fill(ctx, tailP, P.navy, 0.9);
    fill(ctx, tailP, P.navyLight, 0.4);
    const tf = new Path2D();
    G.tailFeathers.forEach((l, i) => wob(tf, l, sd('tailF', i), 0.3, bi, false));
    stroke(ctx, tf, lav, 0.38, 1);
    L.stipple(ctx, G.tail, { spacing: 7, r: [0.6, 1.1], color: lav, alpha: 0.3, seed: sd('tailS'), boil: bi, density: (x) => clamp((x - 530) / 50) });
    const to = new Path2D();
    wob(to, G.tail, sd('tailO'), 0.5, bi, true);
    halo(ctx, to, lav, 0.8);
    stroke(ctx, to, lav, 0.85, 2.5);
    const ti = new Path2D();
    wob(ti, g.tailIn, sd('tailI'), 0.4, bi, true);
    stroke(ctx, ti, lav, 0.45, 1.2);
    // pygostyle
    L.guideCircle(ctx, 540, 1006, 7, { alpha: 0.6, width: 1.2, cross: 4 });

    // body: opaque navy so the wing roots vanish under it, then its inside
    const bodyP = polyPath(G.body);
    fill(ctx, bodyP, P.navy, 0.96);
    fill(ctx, bodyP, P.navyLight, 0.45);
    ctx.save();
    ctx.clip(polyPath(g.bodyIn));
    L.hexLattice(ctx, g.bodyIn, { r: 9, color: lav, alpha: 0.2, width: 1, jitter: 1.2, seed: sd('lattice'), boil: bi });
    L.stipple(ctx, G.body, { spacing: 6, r: [0.6, 1.2], color: lav, alpha: 0.35, seed: sd('bodyS'), boil: bi, density: (x, y) => clamp((x - 540) / 50) * 0.8 });
    // pectoral fibres: from the keel to the humerus heads, bowing outward
    const fib = new Path2D();
    for (let y = 800, i = 0; y <= 956; y += 9, i++) {
      for (const s of [-1, 1]) {
        const a = [540, y], b = [540 + s * 42, 786], c = [540 + s * 52, lerp(y, 786, 0.5) + 6];
        wob(fib, quadPts(a, c, b, 10), sd('fib', i, s), 0.4, bi, false);
      }
    }
    stroke(ctx, fib, lav, 0.24, 1);
    ctx.restore();
    // sternum shield (dashed), the keel, the furcula, the coracoids
    const st = new Path2D();
    wob(st, L.smoothPts([[506, 802], [498, 860], [506, 920], [540, 972], [574, 920], [582, 860], [574, 802], [540, 796]], true, 6), sd('stern'), 0.4, bi, true);
    stroke(ctx, st, lav, 0.5, 1.2, [5, 4]);
    const keel = new Path2D();
    wob(keel, [[540, 792], [540, 880], [540, 968]], sd('keel'), 0.3, bi, false);
    halo(ctx, keel, white, 0.5);
    stroke(ctx, keel, white, 0.6, 1.5);
    const fur = new Path2D();
    wob(fur, quadPts([510, 770], [528, 818], [540, 822], 8), sd('furL'), 0.3, bi, false);
    wob(fur, quadPts([570, 770], [552, 818], [540, 822], 8), sd('furR'), 0.3, bi, false);
    wob(fur, [[503, 784], [522, 800]], sd('corL'), 0.2, bi, false);
    wob(fur, [[577, 784], [558, 800]], sd('corR'), 0.2, bi, false);
    stroke(ctx, fur, white, 0.55, 1.3);
    // vertebrae along the axis
    const vt = new Path2D();
    for (let y = 724, i = 0; y <= 996; y += 13, i++) {
      const w = y < 790 ? 5 : y > 960 ? 4 : 6.5;
      vt.moveTo(540 - w, y);
      vt.lineTo(540 + w, y + (L.h3(i, bi, 5) - 0.5) * 0.8);
    }
    stroke(ctx, vt, lav, 0.4, 1.1);
    // skull, eye ticks and the bill (a straight slim bill)
    const sk = new Path2D();
    wob(sk, L.ellipsePts(540, 690, 23, 27, 40), sd('skull'), 0.4, bi, true);
    stroke(ctx, sk, lav, 0.5, 1.1);
    // the eyes sit on the sides of the head: from below they show only as lateral ticks
    const orb = new Path2D();
    for (const sg of [-1, 1]) {
      orb.moveTo(540 + sg * 24, 684);
      orb.lineTo(540 + sg * 33, 684);
    }
    stroke(ctx, orb, lav, 0.6, 1.2);
    const bill = new Path2D();
    wob(bill, G.bill, sd('bill'), 0.3, bi, true);
    halo(ctx, bill, lav, 0.6);
    stroke(ctx, bill, lav, 0.85, 2);
    const bl = new Path2D();
    bl.moveTo(540, 616);
    bl.lineTo(540, 660);
    stroke(ctx, bl, lav, 0.5, 1);
    const ft = new Path2D();
    G.feet.forEach((f, i) => wob(ft, f, sd('feet', i), 0.2, bi, true));
    stroke(ctx, ft, lav, 0.55, 1.1);
    // the body's double outline
    const bo = new Path2D();
    wob(bo, G.body, sd('bodyO'), 0.6, bi, true);
    halo(ctx, bo, lav, 1);
    stroke(ctx, bo, lav, 0.85, 2.5);
    const bi2 = new Path2D();
    wob(bi2, g.bodyIn, sd('bodyI'), 0.5, bi, true);
    stroke(ctx, bi2, lav, 0.5, 1.5);
  }

  // ===========================================================================
  // 5 bones, joints and quill knobs
  // ===========================================================================
  function drawBones(ctx, P, g, D, fr, bi) {
    if (D <= 0) return;
    const lav = P.lavender, white = P.lineWhite;
    const fillP = new Path2D(), outP = new Path2D(), cenP = new Path2D(), trP = new Path2D();
    for (const [side, bones] of [[0, g.bonesL], [1, g.bonesR]]) {
      for (const o of bones) {
        const f = clamp((D - o.d0) / o.b.len);
        if (f <= 0) continue;
        const b = o.b;
        const n = b.c.length - 1;
        const i1 = Math.max(1, Math.ceil(n * f - 1e-9));
        const u = n * f - (i1 - 1);
        const cut = (arr) => arr.slice(0, i1).concat([[lerp(arr[i1 - 1][0], arr[i1][0], u), lerp(arr[i1 - 1][1], arr[i1][1], u)]]);
        const s1 = cut(b.s1), s2 = cut(b.s2), c = cut(b.c);
        const shape = s1.concat(s2.slice().reverse());
        const sw = wobPts(shape, sd('bone', side, o.k), 0.35, bi);
        addPoly(fillP, sw, true);
        addPoly(outP, sw, true);
        if (c.length > 3) wob(cenP, c.slice(1, -1), sd('boneC', side, o.k), 0.2, bi, false);
        // pneumatic trusses inside the long bones
        if (o.truss) {
          for (let i = 2; i < s1.length - 3; i += 2) {
            trP.moveTo(lerp(c[i][0], s1[i][0], 0.7), lerp(c[i][1], s1[i][1], 0.7));
            trP.lineTo(lerp(c[i + 1][0], s2[i + 1][0], 0.7), lerp(c[i + 1][1], s2[i + 1][1], 0.7));
          }
        }
      }
    }
    // the tendon runs taut from the shoulder to the wrist as the arm draws on
    const tp = new Path2D();
    const tl = g.tendonCum[g.tendonCum.length - 1];
    g.tendons.forEach((pts, side) => {
      const h = headPts(pts, g.tendonCum, tl * clamp(D / g.armLen));
      if (h) wob(tp, h, sd('tendon', side), 0.3, bi, false);
    });
    stroke(ctx, tp, white, 0.55, 1.1, [8, 3, 2, 3]);
    fill(ctx, fillP, P.navyLight, 0.95);
    halo(ctx, outP, white, 0.9);
    stroke(ctx, outP, white, 0.92, 1.5);
    stroke(ctx, cenP, lav, 0.45, 1, [3, 4]);
    stroke(ctx, trP, lav, 0.4, 0.9);

    // joints: rings that pop as the draw-on passes them
    const jp = new Path2D(), jd = new Path2D();
    for (const j of g.joints) {
      if (D < j.d) continue;
      for (const p of [j.p, mirP(j.p)]) {
        jp.moveTo(p[0] + j.r, p[1]);
        jp.arc(p[0], p[1], j.r, 0, TAU);
        jd.moveTo(p[0] + 2.4, p[1]);
        jd.arc(p[0], p[1], 2.4, 0, TAU);
      }
    }
    fill(ctx, jp, P.navyLight, 0.9);
    stroke(ctx, jp, white, 0.85, 1.3);
    fill(ctx, jd, white, 0.9);

    // quill knobs on the hand and the ulna, leaders to each feather's base
    const knobP = new Path2D(), leadU = new Path2D(), leadL = new Path2D(), knobLit = new Path2D();
    const reachHand = (D - g.bonesL[3].d0) / g.bonesL[3].b.len;
    const reachArm = (D - g.bonesL[2].d0) / g.bonesL[2].b.len;
    for (let side = 0; side < 2; side++) {
      const K = g.knobs[side];
      K.prim.forEach((o, n) => {
        if (reachHand < o.s) return;
        const lit = fr >= PRIM_FRAME[n];
        (lit ? knobLit : knobP).moveTo(o.q[0] + 2.6, o.q[1]);
        (lit ? knobLit : knobP).arc(o.q[0], o.q[1], 2.6, 0, TAU);
        const tgt = lit ? leadL : leadU;
        tgt.moveTo(o.q[0], o.q[1]);
        tgt.lineTo(o.base[0], o.base[1]);
      });
      K.sec.forEach((o) => {
        if (reachArm < 1 - o.s) return;
        knobP.moveTo(o.q[0] + 2.2, o.q[1]);
        knobP.arc(o.q[0], o.q[1], 2.2, 0, TAU);
        leadU.moveTo(o.q[0], o.q[1]);
        leadU.lineTo(o.base[0], o.base[1]);
      });
    }
    stroke(ctx, leadU, lav, 0.4, 1, [2, 4]);
    stroke(ctx, leadL, white, 0.8, 1.2);
    fill(ctx, knobP, lav, 0.8);
    fill(ctx, knobLit, white, 1);

    // joint glows: a short pulse as each joint is reached, then a steady glow on the wrists
    for (const j of g.joints) {
      if (D < j.d) continue;
      for (const [s, p] of [[0, j.p], [1, mirP(j.p)]]) {
        L.glowDot(ctx, p[0], p[1], 3.5, { rays: 6, rayLen: 2.4, glow: 5, intensity: j.d === g.joints[2].d ? 0.9 : 0.55, seed: sd('joint', j.d | 0, s), boil: bi });
      }
    }
  }

  // the run of light along the hand: a glow dot on the knob of the newest lit primary
  function drawRun(ctx, P, g, fr, bi) {
    for (let n = 0; n < 10; n++) {
      const lf = fr - PRIM_FRAME[n];
      if (lf < 0 || lf >= 6) continue;
      const k = 1 - lf / 6;
      for (let side = 0; side < 2; side++) {
        const o = g.knobs[side].prim[n];
        L.glowDot(ctx, o.q[0], o.q[1], 5, {
          color: n === 9 ? P.magenta : P.glow, rays: 8, rayLen: 2.8, glow: 6, intensity: k, rot: (bi % 2) * 22 * DEG, seed: sd('run', n, side), boil: bi,
        });
        const tip = g.G.wings[side].prim[n].e;
        L.glowDot(ctx, tip[0], tip[1], 3.5, { color: n === 9 ? P.magenta : P.glow, rays: 4, rayLen: 2.4, glow: 5, intensity: k * 0.9, seed: sd('runT', n, side), boil: bi });
      }
    }
  }

  // ===========================================================================
  // 6 airflow over the right wing
  // ===========================================================================
  function drawSection(ctx, P, g, k, bi) {
    if (k <= 0) return;
    const s = g.section;
    const p = new Path2D();
    wob(p, [[s.x, s.a - 16], [s.x, lerp(s.a - 16, s.b + 16, k)]], sd('secl'), 0.3, bi, false);
    stroke(ctx, p, P.lineWhite, 0.7, 1.3, [6, 4]);
    const e = new Path2D();
    for (const y of [s.a - 16, s.b + 16]) {
      e.moveTo(s.x - 9, y);
      e.lineTo(s.x + 9, y);
    }
    stroke(ctx, e, P.lineWhite, 0.8 * k, 1.5);
  }

  function drawFlow(ctx, P, g, t, kFlow, bi) {
    if (kFlow <= 0) return;
    const ice = P.schemIce;
    const since = Math.max(0, t - B_FLOW);
    const lines = new Path2D();
    const heads = [];
    for (let i = 0; i < g.streams.length; i++) {
      const s = g.streams[i];
      const tot = s.cum[s.cum.length - 1];
      const h = headPts(s.pts, s.cum, tot * kFlow);
      if (!h) continue;
      wob(lines, h, sd('stream', i), 0.4, bi, false);
      heads.push(h[h.length - 1]);
    }
    halo(ctx, lines, ice, 0.6);
    // the flow: dashes that stream down the chord at 24 fps
    ctx.save();
    ctx.strokeStyle = ice;
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.9;
    ctx.setLineDash([16, 9]);
    ctx.lineDashOffset = -since * 190;
    ctx.stroke(lines);
    ctx.restore();
    stroke(ctx, lines, ice, 0.25, 1);
    // arrowheads at the draw-on fronts, then at the ends
    const ah = new Path2D();
    for (const q of heads) arrow(ah, q[0], q[1] - 12, q[0], q[1], 8);
    stroke(ctx, ah, ice, 0.9, 1.5);
    // particles riding each streamline
    for (let i = 0; i < g.streams.length; i++) {
      const s = g.streams[i];
      const tot = s.cum[s.cum.length - 1];
      for (let j = 0; j < 3; j++) {
        const d = (since * 260 + (j * tot) / 3 + i * 37) % tot;
        if (d > tot * kFlow) continue;
        const q = pointAt(s.pts, s.cum, d);
        L.glowDot(ctx, q[0], q[1], 2.2, { color: ice, rays: 0, glow: 5, intensity: 0.8, seed: sd('pt', i, j), boil: bi });
      }
    }
    // the tip vortex, turning
    const rot = since * 9;
    const cr = Math.cos(rot), sr = Math.sin(rot);
    const n = Math.max(2, Math.round(g.spiral.length * kFlow));
    const sp = g.spiral.slice(0, n).map((q) => [g.VORTEX[0] + q[0] * cr - q[1] * sr, g.VORTEX[1] + q[0] * sr + q[1] * cr]);
    const vp = new Path2D();
    wob(vp, sp, sd('vortex'), 0.3, bi, false);
    stroke(ctx, vp, ice, 0.8, 1.4);
    halo(ctx, vp, ice, 0.4);
  }

  function drawLift(ctx, P, g, t, bi) {
    const white = P.lineWhite, lav = P.lavender;
    const kc = t < B_FLOW ? 0 : E_.outExpo(clamp((t - B_FLOW) / (6 * FR) + 1 / 6));
    if (kc <= 0) return;
    // the quarter-chord line, the elliptic lift curve and its stems
    const qc = new Path2D();
    wob(qc, g.quarter, sd('qc'), 0.3, bi, false);
    stroke(ctx, qc, lav, 0.5 * kc, 1, [3, 4]);
    const n = Math.max(2, Math.round(g.liftCurve.length * kc));
    const cv = new Path2D();
    wob(cv, g.liftCurve.slice(0, n), sd('curve'), 0.4, bi, false);
    stroke(ctx, cv, lav, 0.7, 1.4, [7, 5]);
    const stm = new Path2D();
    g.liftStems.forEach((s, i) => {
      if (i / g.liftStems.length > kc) return;
      addPoly(stm, s, false);
    });
    stroke(ctx, stm, lav, 0.22, 1);
    // lift points out of the page toward the viewer in this belly view, so it is drawn as three
    // circled-dot "out of plane" glyphs on the quarter-chord line, sized by the elliptic load;
    // they pop with outBack on the beat, a frame apart
    for (let i = 0; i < g.ARROWS.length; i++) {
      const a = g.ARROWS[i];
      const k = t < B_FLOW + i * FR ? 0 : E_.outBack(clamp((t - B_FLOW - i * FR) / (3 * FR) + 1 / 3));
      if (k <= 0) continue;
      const R = (7 + a.l * 0.11) * k;
      const ring = new Path2D();
      ring.moveTo(a.x + R, a.y);
      ring.arc(a.x, a.y, R, 0, TAU);
      fill(ctx, ring, P.navyLight, 0.9);
      halo(ctx, ring, white, 1);
      stroke(ctx, ring, white, 0.95, 2.2);
      const dot = new Path2D();
      dot.moveTo(a.x + 3.6 * k, a.y);
      dot.arc(a.x, a.y, 3.6 * k, 0, TAU);
      fill(ctx, dot, white, 1);
      const outer = new Path2D();
      outer.arc(a.x, a.y, R + 7 * k, 0, TAU);
      stroke(ctx, outer, white, 0.4, 1, [2, 4]);
    }
  }

  // ===========================================================================
  // 7 node glyphs: hand, forearm, airfoil (r 60)
  // ===========================================================================
  const NODES = {
    hand: { x: 160, y: 1300, src: [228, 772], sr: 38, t: B_PRIM },
    arm: { x: 380, y: 1400, src: [352, 786], sr: 30, t: B_PRIM + 3 * FR },
    foil: { x: 820, y: 1400, src: null, sr: 20, t: B_PRIM + 6 * FR },
  };
  const NR = 60;

  function nodeGlyph(ctx, P, n, src, k, bi, seed, content) {
    if (k <= 0) return;
    const lav = P.lavender;
    const kk = clamp(k);
    const [sx, sy] = src;
    const dx = n.x - sx, dy = n.y - sy, dl = Math.hypot(dx, dy);
    const ux = dx / dl, uy = dy / dl;
    const a = [sx + ux * n.sr, sy + uy * n.sr], b = [n.x - ux * (NR + 4), n.y - uy * (NR + 4)];
    const bend = n.x < sx ? 1 : -1;
    const m = [(a[0] + b[0]) / 2 + uy * 50 * bend, (a[1] + b[1]) / 2 - ux * 50 * bend];
    const lead = quadPts(a, m, b, 28);
    const lp = new Path2D();
    wob(lp, headPts(lead, cumLen(lead), cumLen(lead)[28] * kk), seed, 0.5, bi, false);
    stroke(ctx, lp, lav, 0.55, 1.2);
    const dot = new Path2D();
    dot.moveTo(a[0] + 2.8, a[1]);
    dot.arc(a[0], a[1], 2.8, 0, TAU);
    fill(ctx, dot, lav, 0.85);
    // the magnifier ring on the source
    ctx.save();
    ctx.beginPath();
    ctx.arc(sx, sy, n.sr * Math.min(1, k), 0, TAU);
    ctx.strokeStyle = lav;
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 1.2;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.restore();
    // the glyph
    ctx.save();
    ctx.translate(n.x, n.y);
    ctx.scale(k, k);
    ctx.beginPath();
    ctx.arc(0, 0, NR, 0, TAU);
    ctx.fillStyle = P.navyLight;
    ctx.globalAlpha = 0.95;
    ctx.fill();
    ctx.globalAlpha = 1;
    const rp = new Path2D();
    wob(rp, L.ellipsePts(0, 0, NR, NR, 64), seed + 1, 0.4, bi, true);
    halo(ctx, rp, lav, 0.4);
    stroke(ctx, rp, lav, 0.85, 2);
    const rp2 = new Path2D();
    rp2.arc(0, 0, NR - 7, 0, TAU);
    stroke(ctx, rp2, lav, 0.35, 1);
    L.ticks(ctx, 0, 0, { r: NR + 3, n: 48, len: 3.5, major: 12, majorLen: 8, color: lav, alpha: 0.45, width: 1 });
    ctx.beginPath();
    ctx.arc(0, 0, NR - 8, 0, TAU);
    ctx.clip();
    content();
    ctx.restore();
  }

  // a narrow feather in a glyph: base -> tip with a narrow leading and a broad trailing vane
  function glyphFeather(path, rach, b, e, wl, wt, blunt) {
    const dx = e[0] - b[0], dy = e[1] - b[1];
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
    const lead = [], trail = [];
    for (let i = 0; i <= 10; i++) {
      const u = i / 10;
      const w = blunt ? (u < 0.85 ? 1 : Math.sqrt(1 - Math.pow((u - 0.85) / 0.15, 2)) * 0.6 + 0.4) : Math.sin(Math.PI * Math.min(1, u * 0.55 + 0.45 * u * u + 0.02)) * (u < 0.7 ? 1 : 1);
      const cx = b[0] + dx * u, cy = b[1] + dy * u;
      lead.push([cx - nx * wl * w, cy - ny * wl * w]);
      trail.push([cx + nx * wt * w, cy + ny * wt * w]);
    }
    addPoly(path, lead.concat(trail.slice().reverse()), true);
    rach.moveTo(b[0], b[1]);
    rach.lineTo(b[0] + dx * 0.95, b[1] + dy * 0.95);
  }

  function drawNodes(ctx, P, g, t, fr, bi, hitF) {
    const lav = P.lavender, white = P.lineWhite, ice = P.schemIce;

    // hand: the carpometacarpus and the ten primaries, lighting in step with the wing
    const nh = NODES.hand;
    nodeGlyph(ctx, P, nh, nh.src, hitF(nh.t, 3, 'outBack'), bi, sd('nodeH'), () => {
      const grid = new Path2D();
      for (let x = -60; x <= 60; x += 20) {
        grid.moveTo(x, -60);
        grid.lineTo(x, 60);
        grid.moveTo(-60, x);
        grid.lineTo(60, x);
      }
      stroke(ctx, grid, lav, 0.12, 1);
      const wr = [30, -30], ht = [-40, -8];
      const un = new Path2D(), unR = new Path2D(), li = new Path2D(), liR = new Path2D(), mg = new Path2D();
      for (let n = 0; n < 10; n++) {
        const u = 0.06 + 0.1 * n;
        const b = [lerp(wr[0], ht[0], u), lerp(wr[1], ht[1], u)];
        const a = lerp(88, 160, n / 9) * DEG;
        const l = lerp(56, 74, n / 9);
        const e = [b[0] + Math.cos(a) * l, b[1] + Math.sin(a) * l];
        const lf = fr - PRIM_FRAME[n];
        if (lf >= 0) glyphFeather(li, liR, b, e, 2.2, 4.6, false);
        else glyphFeather(un, unR, b, e, 2.2, 4.6, false);
        if (n === 9 && lf >= 0 && lf < 6) glyphFeather(mg, new Path2D(), b, e, 2.2, 4.6, false);
      }
      fill(ctx, li, P.navy, 0.4);
      stroke(ctx, un, lav, 0.5, 1);
      stroke(ctx, unR, lav, 0.5, 1);
      halo(ctx, li, white, 0.5);
      stroke(ctx, li, white, 0.85, 1.2);
      stroke(ctx, liR, white, 0.9, 1.2);
      stroke(ctx, mg, P.magenta, 1 - (fr - PRIM_FRAME[9]) / 7, 2.4);
      // the bone on top: two fused metacarpals, the wrist joint and the digit
      const bone = new Path2D();
      wob(bone, [[wr[0], wr[1] - 4.5], [ht[0], ht[1] - 3.5]], sd('nhB1'), 0.3, bi, false);
      wob(bone, [[wr[0], wr[1] + 4.5], [ht[0], ht[1] + 3.5]], sd('nhB2'), 0.3, bi, false);
      wob(bone, quadPts([wr[0] - 8, wr[1] + 5], [(wr[0] + ht[0]) / 2, (wr[1] + ht[1]) / 2 + 12], [ht[0] + 8, ht[1] + 4], 10), sd('nhB3'), 0.3, bi, false);
      wob(bone, [[ht[0], ht[1]], [ht[0] - 16, ht[1] + 8]], sd('nhB4'), 0.3, bi, false);
      halo(ctx, bone, white, 0.6);
      stroke(ctx, bone, white, 0.9, 1.4);
      const jn = new Path2D();
      jn.arc(wr[0], wr[1], 6.5, 0, TAU);
      fill(ctx, jn, P.navyLight, 1);
      stroke(ctx, jn, white, 0.9, 1.3);
      // the knob of the newest lit primary glows
      for (let n = 0; n < 10; n++) {
        const lf = fr - PRIM_FRAME[n];
        if (lf < 0 || lf >= 6) continue;
        const u = 0.06 + 0.1 * n;
        L.glowDot(ctx, lerp(wr[0], ht[0], u), lerp(wr[1], ht[1], u), 3, { color: n === 9 ? P.magenta : P.glow, rays: 6, rayLen: 2.6, glow: 5, intensity: 1 - lf / 6, seed: sd('nhG', n), boil: bi });
      }
    });

    // forearm: radius above, the ulna below with its quill knobs and the broad blunt secondaries
    const na = NODES.arm;
    nodeGlyph(ctx, P, na, na.src, hitF(na.t, 3, 'outBack'), bi, sd('nodeA'), () => {
      const secO = new Path2D(), secR = new Path2D();
      const ul = quadPts([-56, -14], [0, -8], [56, -24], 16);
      const kn = [];
      for (let i = 0; i < 7; i++) {
        const q = pointAt(ul, cumLen(ul), cumLen(ul)[16] * (0.1 + 0.13 * i));
        kn.push(q);
        glyphFeather(secO, secR, [q[0], q[1] + 3], [q[0] + 8, q[1] + 62], 3.5, 7.5, true);
      }
      fill(ctx, secO, P.navy, 0.35);
      stroke(ctx, secO, lav, 0.7, 1.1);
      stroke(ctx, secR, lav, 0.55, 1);
      L.hatch(ctx, null, { bounds: [-60, 0, 120, 60], angle: 75 * DEG, spacing: 5, width: 0.7, color: lav, alpha: 0.2, length: [6, 12], seed: sd('naH'), boil: bi });
      const bn = new Path2D();
      const rad = quadPts([-56, -32], [0, -30], [56, -40], 16);
      for (const [pts, r, key] of [[ul, 4.2, 'u'], [rad, 2.4, 'r']]) {
        const s1 = [], s2 = [];
        for (let i = 0; i < pts.length; i++) {
          const nr = normalAt(pts, i);
          s1.push([pts[i][0] + nr[0] * r, pts[i][1] + nr[1] * r]);
          s2.push([pts[i][0] - nr[0] * r, pts[i][1] - nr[1] * r]);
        }
        const sh = s1.concat(s2.slice().reverse());
        fill(ctx, polyPath(sh), P.navyLight, 1);
        wob(bn, sh, sd('naB', key), 0.3, bi, true);
      }
      halo(ctx, bn, white, 0.6);
      stroke(ctx, bn, white, 0.9, 1.3);
      const kp = new Path2D();
      for (const q of kn) {
        kp.moveTo(q[0] + 2.6, q[1] + 3);
        kp.arc(q[0], q[1] + 3, 2.6, 0, TAU);
      }
      fill(ctx, kp, white, 0.95);
      // interosseous space between the two bones
      const io = new Path2D();
      for (let x = -44; x <= 44; x += 8) {
        io.moveTo(x, lerp(-29, -39, (x + 56) / 112) + 3);
        io.lineTo(x + 3, lerp(-14, -24, (x + 56) / 112) - 5);
      }
      stroke(ctx, io, lav, 0.35, 0.9);
    });

    // airfoil: a cambered section at 5 degrees, streamlines above and below, the lift arrow on 19.0
    const nf = NODES.foil;
    const src = [g.section.x, (g.section.a + g.section.b) / 2];
    nodeGlyph(ctx, P, nf, src, hitF(nf.t, 3, 'outBack'), bi, sd('nodeF'), () => {
      const since = Math.max(0, t - B_FLOW);
      const flowing = t >= B_FLOW;
      // NACA 4412-like section, chord 92
      const up = [], lo = [];
      for (let i = 0; i <= 24; i++) {
        const xc = Math.pow(i / 24, 1.6);
        const yt = 5 * 0.13 * (0.2969 * Math.sqrt(xc) - 0.126 * xc - 0.3516 * xc * xc + 0.2843 * xc * xc * xc - 0.1015 * xc * xc * xc * xc);
        const yc = xc < 0.4 ? (0.05 / 0.16) * (0.8 * xc - xc * xc) : (0.05 / 0.36) * (0.2 + 0.8 * xc - xc * xc);
        up.push([-46 + 92 * xc, -92 * (yc + yt)]);
        lo.push([-46 + 92 * xc, -92 * (yc - yt)]);
      }
      const rotA = 5 * DEG;
      const rt = (q) => [q[0] * Math.cos(rotA) - q[1] * Math.sin(rotA), q[0] * Math.sin(rotA) + q[1] * Math.cos(rotA)];
      const foil = up.map(rt).concat(lo.slice(1, -1).reverse().map(rt));
      // pressure: sparse stipple above (suction), dense below
      L.stipple(ctx, null, {
        bounds: [-58, -58, 116, 116], spacing: 4.5, r: [0.5, 1], color: lav, alpha: 0.45, seed: sd('nfS'), boil: bi,
        density: (x, y) => (y > 4 ? 0.55 : 0.12) * (1 - clamp(Math.abs(x) / 70)),
      });
      // streamlines
      const sl = new Path2D();
      for (const y0 of [-46, -32, -19, 17, 30, 44]) {
        const pts = [];
        const aboveF = y0 < 0;
        const amp = (aboveF ? 12 : 5) * (1 - Math.abs(y0) / 70);
        for (let x = -66; x <= 66; x += 4) {
          const bump = -amp * Math.exp(-Math.pow((x + 6) / 30, 2));
          const down = 0.09 * Math.max(0, x - 20);
          pts.push([x, y0 + bump + down]);
        }
        wob(sl, pts, sd('nfL', y0), 0.3, bi, false);
      }
      if (flowing) {
        ctx.save();
        ctx.strokeStyle = ice;
        ctx.lineWidth = 1.3;
        ctx.globalAlpha = 0.95;
        ctx.setLineDash([9, 6]);
        ctx.lineDashOffset = -since * 80;
        ctx.stroke(sl);
        ctx.restore();
        stroke(ctx, sl, ice, 0.25, 1);
      } else stroke(ctx, sl, lav, 0.3, 1, [2, 4]);
      const fp = new Path2D();
      wob(fp, foil, sd('nfFoil'), 0.3, bi, true);
      fill(ctx, fp, P.navy, 0.9);
      halo(ctx, fp, white, 0.5);
      stroke(ctx, fp, white, 0.9, 1.4);
      // chord line and the angle of attack against the free stream
      const cl = new Path2D();
      const c0 = rt([-52, 0]), c1 = rt([52, 0]);
      cl.moveTo(c0[0], c0[1]);
      cl.lineTo(c1[0], c1[1]);
      cl.moveTo(-52, 0);
      cl.lineTo(-20, 0);
      stroke(ctx, cl, lav, 0.5, 1, [3, 3]);
      const aoa = new Path2D();
      addPoly(aoa, arcPts(-46 * Math.cos(rotA), -46 * Math.sin(rotA), 30, 0, rotA, 6), false);
      stroke(ctx, aoa, lav, 0.7, 1);
      // lift arrow from the centre of pressure
      const k = t < B_FLOW ? 0 : E_.outBack(clamp((t - B_FLOW) / (3 * FR) + 1 / 3));
      if (k > 0) {
        const ap = new Path2D();
        arrow(ap, -14, -4, -14, -4 - 42 * k, 8);
        halo(ctx, ap, white, 0.8);
        stroke(ctx, ap, white, 1, 2);
      }
      // particles on the flow
      if (flowing) {
        for (let j = 0; j < 4; j++) {
          const x = -64 + ((since * 110 + j * 33) % 128);
          const y0 = [-32, -19, 17, 30][j];
          const y = y0 - (y0 < 0 ? 12 : 5) * (1 - Math.abs(y0) / 70) * Math.exp(-Math.pow((x + 6) / 30, 2)) + 0.09 * Math.max(0, x - 20);
          L.glowDot(ctx, x, y, 1.8, { color: ice, rays: 0, glow: 4, intensity: 0.8, seed: sd('nfP', j), boil: bi });
        }
      }
    });
  }

  // ===========================================================================
  // 8 the push-in reticle on (880, 890)
  // ===========================================================================
  function drawReticle(ctx, P, k, t, bi) {
    if (k <= 0) return;
    const white = P.lineWhite;
    const [cx, cy] = TARGET;
    const size = lerp(96, 64, clamp((t - B_FLOW) / 0.4)) * lerp(1.3, 1, clamp(k));
    const h = size / 2, arm = size * 0.28;
    const p = new Path2D();
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        p.moveTo(cx + sx * h, cy + sy * (h - arm));
        p.lineTo(cx + sx * h, cy + sy * h);
        p.lineTo(cx + sx * (h - arm), cy + sy * h);
      }
    }
    const q = new Path2D();
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      q.moveTo(cx + Math.cos(a) * 7, cy + Math.sin(a) * 7);
      q.lineTo(cx + Math.cos(a) * 15, cy + Math.sin(a) * 15);
    }
    halo(ctx, p, white, 0.6 * clamp(k));
    stroke(ctx, p, white, 0.95 * clamp(k), 2);
    stroke(ctx, q, white, 0.8 * clamp(k), 1.3);
    L.guideCircle(ctx, cx, cy, size * 0.9, { alpha: 0.3 * clamp(k), width: 1, dash: [2, 5] });
    L.glowDot(ctx, cx, cy, 3, { rays: 4, rayLen: 2.4, glow: 5, intensity: 0.8 * clamp(k), seed: sd('ret'), boil: bi });
  }


  // ===========================================================================
  // CANONICAL cycleRing, copied verbatim from 02-egg-blueprint.js
  // ===========================================================================
  function cycleRing(ctx, L, stage, progress, bi) {
    const P = L.pal;
    const CX = 900, CY = 300, R = 44;
    const D = Math.PI / 180;
    const pr = progress < 0 ? 0 : progress > 1 ? 1 : progress;
    const arcA = (q) => [(-90 + q * 90 + 5) * D, (-90 + (q + 1) * 90 - 5) * D];
    ctx.save();
    const a0 = ctx.globalAlpha;
    ctx.lineCap = 'round';
    // plate, so the grid and anything behind never shows through the arcs
    ctx.beginPath();
    ctx.arc(CX, CY, 64, 0, 2 * Math.PI);
    ctx.fillStyle = P.navy;
    ctx.globalAlpha = a0 * 0.92;
    ctx.fill();
    ctx.fillStyle = P.navyLight;
    ctx.globalAlpha = a0 * 0.35;
    ctx.fill();
    ctx.strokeStyle = P.lavender;
    ctx.lineWidth = 1;
    ctx.globalAlpha = a0 * 0.28;
    ctx.stroke();
    ctx.globalAlpha = a0;
    L.ticks(ctx, CX, CY, { r: 53, n: 48, len: 4, major: 12, majorLen: 8, color: P.lavender, alpha: 0.3, width: 1 });
    // the four stage arcs
    for (let q = 0; q < 4; q++) {
      const [s, e] = arcA(q);
      const done = stage >= 4 || q < stage;
      ctx.beginPath();
      ctx.arc(CX, CY, R, s, e);
      ctx.strokeStyle = P.lavender;
      ctx.lineWidth = 2;
      ctx.globalAlpha = a0 * (done ? 0.7 : 0.4);
      ctx.stroke();
    }
    // radial ticks in the four gaps, so the split into stages reads at phone size
    ctx.beginPath();
    for (let q = 0; q < 4; q++) {
      const a = (-90 + q * 90) * D;
      ctx.moveTo(CX + Math.cos(a) * 39, CY + Math.sin(a) * 39);
      ctx.lineTo(CX + Math.cos(a) * 49, CY + Math.sin(a) * 49);
    }
    ctx.strokeStyle = P.lavender;
    ctx.lineWidth = 1.2;
    ctx.globalAlpha = a0 * 0.5;
    ctx.stroke();
    // the lit arc and its glow dot
    if (stage >= 0 && stage < 4) {
      const [s, e] = arcA(stage);
      const ae = s + (e - s) * pr;
      if (pr > 0) {
        ctx.beginPath();
        ctx.arc(CX, CY, R, s, ae);
        ctx.strokeStyle = P.lineWhite;
        ctx.lineWidth = 3;
        ctx.globalAlpha = a0;
        ctx.stroke();
      }
      ctx.globalAlpha = a0;
      L.glowDot(ctx, CX + Math.cos(ae) * R, CY + Math.sin(ae) * R, 5, { rays: 4, rayLen: 2.6, glow: 4, rot: (bi % 2) * 45 * D, seed: 4401, boil: bi });
    }
    // centre pip
    ctx.beginPath();
    ctx.arc(CX, CY, 3, 0, 2 * Math.PI);
    ctx.fillStyle = P.lavender;
    ctx.globalAlpha = a0 * 0.5;
    ctx.fill();
    ctx.restore();
  }

  // ===========================================================================
  // Scene
  // ===========================================================================
  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const P = L.pal;
      const dur = info.dur;
      // hold the final pose past the end; snap near-frame times onto the frame grid
      let t = clamp(tIn, 0, dur);
      const tFrame = Math.round(t * 24) / 24;
      if (Math.abs(t - tFrame) < 1e-4) t = tFrame + 1e-7;
      const fr = Math.floor(t * 24 + 1e-6); // shot-local frame index
      const bi = L.boil(info.T);
      const g = geo();

      // an event starting at a is visible on its own frame (lead 1)
      const hitF = (a, frames, e, lead = 1) => {
        if (t < a) return 0;
        const u = clamp((t - a) / (frames * FR) + lead / frames);
        return e ? E_[e](u) : u;
      };

      // the bones draw on from the shoulders to the hand tips over 6 frames from T 18.083
      const kB = hitF(B_BONES, 6, 'outExpo');
      const D = kB * g.chain;
      const kMeasure = hitF(B_BONES + 3 * FR, 6, 'outExpo');
      const kSection = hitF(NODES.foil.t - 3 * FR, 6, 'outExpo');
      const kFlow = hitF(B_FLOW, 6, 'outExpo');
      const kRet = hitF(B_FLOW, 3, 'outBack');

      // camera: locked to T 19.0, then eases in toward the target, zoom 1.00 to 1.08 with (880, 890)
      // fixed on screen; the ease is normalised over the drawn frames so the last frame (T 19.458) is
      // at 1.08, where shot 11 picks up
      const u = clamp((t - CAM0) / (CAM1 - FR - CAM0));
      const zoom = lerp(1, ZOOM1, E_.inQuad(u));
      const cam = { x: TARGET[0] - (TARGET[0] - 540) / zoom, y: TARGET[1] - (TARGET[1] - 960) / zoom, zoom };

      L.camera(ctx, cam, (c) => {
        drawPlate(c, P, t, dur, bi);
        drawMeasure(c, P, kMeasure, bi);
        drawWings(c, P, g, fr, bi, kRet);
        drawBody(c, P, g, bi);
        drawBones(c, P, g, D, fr, bi);
        drawRun(c, P, g, fr, bi);
        drawSection(c, P, g, kSection, bi);
        drawFlow(c, P, g, t, kFlow, bi);
        drawLift(c, P, g, t, bi);
        drawNodes(c, P, g, t, fr, bi, hitF);
        drawReticle(c, P, kRet, t, bi);
      });

      // screen-fixed: the cycle ring, flight arc lit, filling its second half across this shot
      cycleRing(ctx, L, 2, 0.5 + 0.5 * clamp(t / dur), bi);
    },
  });
})();
