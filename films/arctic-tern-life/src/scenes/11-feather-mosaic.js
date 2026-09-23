// Shot 11 feather-mosaic: "Push-in: barbs, barbules, hooks". Illustrated, global T 19.5 to 22.0 (2.5 s).
// Opens on the inked juvenile seen from below on G3 at zoom 1.08 with the target (880, 890) fixed on
// screen, then pushes exponentially into the primary under that point (P6 on 09's G3 layout):
// zoom 4 on 20.0 (the barbs
// draw on, layer 2), 12 on 20.5 (the vane cracks into barbs with barbules, layer 3, while the target
// eases to the frame centre), 40 on 21.0 (hooklets, a split tears open between two barbs, magenta ring),
// and on 21.5 the split zips shut from the rachis outward, hooks catching one by one on twos.
//
// Every layer is its own drawing at its own scale, anchored at the target. Layers 3 and 4 share one
// lattice in world units around the hero feather's rachis, and every third layer-2 barb is a layer-3 barb, so
// the barbs keep their places through the resolve.
//
// Layers, back to front:
//   1. paper, then stripes (stripeCream / stripeSky) with a slow parallax zoom, behind layer 1 only
//   2. world illustration under the camera (layer 1): construction circle, tail, both wings
//      (secondaries, primaries, coverts, outlines), body, head, bill, feet
//   3. layer 2 on the right wing's primaries: rachis ribbons and barbs (T 20.0 on)
//   4. layer 3/4 lattice (T 20.5 on), cracking out from the target cell by cell on twos:
//      vane ground, next feather under the narrow vane, split hole, barbules, hooklets, barb ridges, rachis
//   5. construction circles around the target (world radii, inkFaint)
//   6. screen-fixed overlays: annYellow target ring and zoom dial, annBlue scale bar and zip arrow,
//      annMagenta split ring (21.0 to 21.75), annYellow catch ticks on the zip
(function () {
  'use strict';
  const FILM = window.FILM;
  const L = FILM.lib;
  const ID = 'feather-mosaic';
  const TAU = Math.PI * 2;
  const DEG = Math.PI / 180;
  const FR = 1 / 24;
  const SQ2 = Math.SQRT2;

  const P = {};
  for (const k of Object.keys(L.pal)) P[k] = L.pal[k];

  const sd = (...k) => L.hash(ID, ...k) & 0x7fffffff;
  const h3 = L.h3;
  const E = L.ease;

  // ---------------------------------------------------------------------------
  // Copied verbatim from 09-first-flight.js: its small helpers and the G3 bird (seeds from
  // 'first-flight', so the line boil matches along the 09 -> 10 -> 11 chain)
  // ---------------------------------------------------------------------------
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, u) => a + (b - a) * u;
  const sstep = (a, b, x) => {
    const u = clamp((x - a) / (b - a));
    return u * u * (3 - 2 * u);
  };
  function tracePoly(ctx, pts, closed = true) {
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) (i ? ctx.lineTo : ctx.moveTo).call(ctx, pts[i][0], pts[i][1]);
    if (closed) ctx.closePath();
  }
  function fillPoly(ctx, pts, color, alpha = 1) {
    if (alpha <= 0 || pts.length < 3) return;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.fillStyle = color;
    tracePoly(ctx, pts);
    ctx.fill();
    ctx.restore();
  }
  function strokePts(ctx, pts, color, width, alpha = 1, dash, closed = false) {
    if (pts.length < 2 || alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha *= clamp(alpha);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (dash) ctx.setLineDash(dash);
    tracePoly(ctx, pts, closed);
    ctx.stroke();
    ctx.restore();
  }
  // many short open polylines in one stroke call
  function strokeMany(ctx, lines, color, width, alpha = 1) {
    if (!lines.length || alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha *= clamp(alpha);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (const pts of lines) {
      if (pts.length < 2) continue;
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    }
    ctx.stroke();
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

  // wing pose warp in G3 coordinates: span < 1 foreshortens the wing as it rises or falls,
  // sweep > 0 swings the hand back toward the tail (upstroke flex), fold shortens the hand
  function g3Warp(px, py, pose) {
    const dx = px - 540, ax = Math.abs(dx);
    if (ax <= 42) return [px, py];
    const e = ax - 42;
    const h = sstep(190, 300, ax);
    const hx = Math.max(0, ax - 250);
    const nx = 42 + e * pose.span - hx * pose.fold;
    const ny = py + pose.sweep * h * hx * 0.55 + (pose.lift || 0) * e * 0.06;
    return [540 + (dx < 0 ? -nx : nx), ny];
  }

  /**
   * drawG3Bird(ctx, L, bi, opts) : the juvenile Arctic tern in flight on the G3 table.
   * With default opts it draws G3 exactly: seen from below, wings fully spread, body axis x 540.
   *   x, y     540, 860   screen position of the pose origin G3_ANCHOR
   *   s        1          scale
   *   rot      0          rotation (radians, clockwise)
   *   roll     1          0..1 width of the bird across its axis (a bank squashes it)
   *   side     'below'    'below' (belly, white coverts, translucent primaries) or 'above'
   *                       (grey upperwing, dark carpal bar, scaly fringed mantle)
   *   pose     null       { span, sweep, fold, lift } wing pose, null = fully spread (G3)
   *   detail   1          0..1, thins hatching and scallops when the bird is small
   */
  function drawG3Bird(ctx, L, bi, opts = {}) {
    const P = L.pal;
    const G = g3Geo();
    const X0 = opts.x != null ? opts.x : G3_ANCHOR[0];
    const Y0 = opts.y != null ? opts.y : G3_ANCHOR[1];
    const sc = opts.s != null ? opts.s : 1;
    const rot = opts.rot || 0;
    const roll = opts.roll != null ? opts.roll : 1;
    const above = opts.side === 'above';
    const pose = opts.pose || null;
    const detail = opts.detail != null ? opts.detail : 1;
    const sg = (...k) => L.hash(G3_REF, 'g3', ...k) & 0x7fffffff;
    const cr = Math.cos(rot), sr = Math.sin(rot);
    const kx = sc * roll;
    const mp = (q, warp) => {
      let px = q[0], py = q[1];
      if (warp && pose) {
        const w = g3Warp(px, py, pose);
        px = w[0];
        py = w[1];
      }
      const lx = (px - G3_ANCHOR[0]) * kx, ly = (py - G3_ANCHOR[1]) * sc;
      return [X0 + lx * cr - ly * sr, Y0 + lx * sr + ly * cr];
    };
    const mpa = (arr, warp) => arr.map((q) => mp(q, warp));
    // back to G3 coordinates (ignores the wing warp): for tone fields
    const toG3 = (x, y) => {
      const dx = x - X0, dy = y - Y0;
      const lx = dx * cr + dy * sr, ly = -dx * sr + dy * cr;
      return [G3_ANCHOR[0] + lx / Math.max(0.05, kx), G3_ANCHOR[1] + ly / sc];
    };
    const lw = (w) => w * Math.max(0.55, Math.pow(sc, 0.6)); // line weights hold up when small
    const hs = (sp) => sp * Math.max(0.75, Math.pow(sc, 0.4)); // hatch spacing
    const ink = P.ink, inkSoft = P.inkSoft;
    const jit = (i, k, amp) => (L.h3(i, bi, sg('j', k)) - 0.5) * 2 * amp;

    // ---- tail ------------------------------------------------------------------------
    const tail = mpa(G.tail, false);
    fillPoly(ctx, tail, P.plumeWhite);
    if (above) {
      // outer webs grey, dusky tips
      fillPoly(ctx, mpa([[522, 1002], [515, 1045], [506, 1095], [499, 1140], [495, 1180], [505, 1150], [512, 1100], [520, 1050], [528, 1008]], false), P.mantleGrey, 0.9);
      fillPoly(ctx, mpa(g3Mirror([[522, 1002], [515, 1045], [506, 1095], [499, 1140], [495, 1180], [505, 1150], [512, 1100], [520, 1050], [528, 1008]]), false), P.mantleGrey, 0.9);
      strokeMany(ctx, [mpa([[503, 1150], [514, 1128], [527, 1110], [540, 1103], [553, 1110], [566, 1128], [577, 1150]], false)], P.mantleDeep, lw(4), 0.55);
    } else {
      fillPoly(ctx, mpa(G.tailR, false).concat([mp([540, 1100], false), mp([540, 1012], false)]), P.plumeShade, 0.8);
    }
    strokeMany(ctx, G.tailFeathers.map((l) => mpa(l, false)), inkSoft, lw(1.2), 0.55);
    if (detail > 0.3) {
      L.hatch(ctx, mpa(G.tailR, false).concat([mp([540, 1100], false), mp([540, 1010], false)]), {
        angle: -Math.PI / 4 + rot, spacing: hs(7), width: 1.2, color: P.mantleDeep, alpha: 0.6, length: [10, 26], seed: sg('tailH'), boil: bi,
      });
    }
    L.inkPath(ctx, tail, { closed: true, width: lw(3.5), color: ink, seed: sg('tail'), boil: bi, taper: [4, 8] });

    // ---- wings -----------------------------------------------------------------------
    const jitArcs = (arcs, key, amp) =>
      arcs.map((a, i) => a.map((q, j) => (j === 0 || j === a.length - 1 ? q : [q[0] + jit(i * 5 + j, key, amp), q[1] + jit(i * 5 + j, key + 1, amp)])));
    for (const W of G.wings) {
      const wing = mpa(W.wing, true);
      const right = W.s > 0;
      fillPoly(ctx, wing, above ? P.mantleGrey : P.primaryGlow, above ? 1 : 0.6);
      // every feather is clipped to the G3 outline, so the silhouette stays exactly on the table
      ctx.save();
      tracePoly(ctx, wing);
      ctx.clip();
      // primaries, P10 (outer) first so the inner ones lie over them
      for (let n = 9; n >= 0; n--) {
        const F = W.prim[n];
        const poly = mpa(F.poly, true);
        if (above) {
          fillPoly(ctx, poly, P.mantleGrey);
          if (F.n >= 7) fillPoly(ctx, poly, P.mantleDeep, 0.1 + (F.n - 7) * 0.07);
        } else {
          fillPoly(ctx, poly, P.primaryGlow, 0.9);
        }
        if (detail > 0.45) {
          // barbs: faint strokes across the vanes, angled toward the tip
          const av = mp(F.e, true), bv = mp(F.b, true);
          const aa = Math.atan2(av[1] - bv[1], av[0] - bv[0]);
          L.hatch(ctx, poly, {
            angle: aa + (right ? -0.6 : 0.6), spacing: hs(5.5), width: 0.9, color: P.mantleDeep, alpha: above ? 0.42 : 0.3,
            length: [8, 18], gap: [2, 5], inset: 2, seed: sg('barb', W.s, F.n), boil: bi, density: F.n > 6 ? 0.9 : 0.7, edge: 0.05,
          });
        }
        strokePts(ctx, poly, inkSoft, lw(1.3), 0.85, null, true);
        strokePts(ctx, mpa(F.rachis, true), above ? P.plumeShade : P.mantleDeep, lw(1.6), 0.9);
        // the tip: the thin black trailing edge below (dusky above), following each feather's end
        strokePts(ctx, mpa(F.tipEdge, true), above ? P.mantleDeep : P.capBlack, lw(above ? 2.6 : 3.2), above ? 0.75 : 1);
      }
      // secondaries: broad, blunt, a pale trailing edge
      for (const F of W.sec) {
        const poly = mpa(F.poly, true);
        fillPoly(ctx, poly, above ? P.mantleGrey : P.primaryGlow, above ? 1 : 0.95);
        if (above) fillPoly(ctx, poly, P.mantleDeep, 0.08 + 0.06 * (F.j % 2));
        strokePts(ctx, poly, inkSoft, lw(1.1), 0.75, null, true);
        strokePts(ctx, mpa([F.rachis[0], [lerp(F.b[0], F.e[0], 0.86), lerp(F.b[1], F.e[1], 0.86)]], true), above ? P.plumeShade : P.mantleDeep, lw(1.2), 0.75);
        strokePts(ctx, mpa(F.tipEdge, true), above ? P.plumeWhite : P.plumeShade, lw(3.4), 1);
      }
      // coverts
      const cov = mpa(W.coverts, true);
      fillPoly(ctx, cov, above ? P.mantleGrey : P.plumeWhite);
      if (above) {
        // juvenile: dark carpal bar along the inner leading edge
        const cb = mpa(W.carpal, true);
        fillPoly(ctx, cb, P.carpalBar);
        if (detail > 0.3) L.hatch(ctx, cb, { angle: -Math.PI / 4, spacing: hs(5), width: 1.2, color: ink, alpha: 0.55, length: [8, 20], seed: sg('carpH', W.s), boil: bi });
      }
      // covert feather tips: rows of scallops (juvFringe fringes above, soft grey below)
      if (detail > 0.25) {
        const rowsA = [], rowsB = [];
        W.covRows.forEach((arcs, r) => {
          if (above && r === 0) return; // under the carpal bar
          const m = jitArcs(arcs.map((a) => mpa(a, true)), 40 + r * 3 + W.s, 0.5);
          (r === 3 ? rowsB : rowsA).push(...m);
        });
        if (above) {
          strokeMany(ctx, rowsA.concat(rowsB), P.juvFringe, lw(2.6), 1);
          strokeMany(ctx, rowsA.concat(rowsB), P.inkSoft, lw(0.9), 0.55);
        } else {
          strokeMany(ctx, rowsA, P.mantleDeep, lw(1.1), 0.5);
          strokeMany(ctx, rowsB, P.inkSoft, lw(1.6), 0.85);
        }
      }
      // shade: light from the upper left, so the right wing's trailing half and the armpits darken
      if (detail > 0.3) {
        const dens = (x, y) => {
          const g = toG3(x, y);
          const ax = Math.abs(g[0] - 540);
          const chord = clamp((g[1] - 790) / 110);
          const root = 1 - sstep(60, 240, ax);
          return clamp((right ? 0.6 : 0.22) * chord + root * 0.5 * chord + (right ? 0.08 : 0));
        };
        L.hatch(ctx, wing, {
          angle: -Math.PI / 4, spacing: hs(8), width: 1.3, color: P.mantleDeep, alpha: above ? 0.6 : 0.5,
          density: dens, length: [14, 40], seed: sg('wingH', W.s), boil: bi,
        });
        L.hatch(ctx, wing, {
          angle: (Math.PI * 105) / 180, spacing: hs(7), width: 1.1, color: P.mantleDeep, alpha: 0.45,
          density: (x, y) => {
            const g = toG3(x, y);
            return clamp((1 - sstep(40, 130, Math.abs(g[0] - 540))) * clamp((g[1] - 800) / 60) * (right ? 1 : 0.6));
          },
          length: [10, 24], seed: sg('wingX', W.s), boil: bi,
        });
      }
      ctx.restore();
      // outline: leading edge and wingtip in full ink, the hand's trailing edge the 4 px black edge
      const le = mpa(W.le, true);
      L.inkPath(ctx, le.concat(mpa(W.handTE.slice(1, 4), true)), { width: lw(5), color: ink, seed: sg('le', W.s), boil: bi, taper: [6, 10], double: { alpha: 0.35, from: 0.1, to: 0.7 } });
      L.inkPath(ctx, mpa(W.handTE.slice(2), true), { width: lw(4), color: above ? ink : P.capBlack, seed: sg('hte', W.s), boil: bi, taper: [4, 8], wobble: 1.2 });
      L.inkPath(ctx, mpa(W.secTE, true), { width: lw(3), color: ink, seed: sg('ste', W.s), boil: bi, taper: [4, 14] });
    }

    // ---- body and head -----------------------------------------------------------------
    const body = mpa(G.body, false);
    if (above) {
      fillPoly(ctx, body, P.mantleGrey);
      // rump paler toward the tail
      fillPoly(ctx, mpa([[500, 930], [540, 915], [580, 930], [566, 990], [540, 1012], [514, 990]], false), P.plumeShade);
      // scaly mantle: fringed feather tips in rows
      if (detail > 0.25) {
        const m = jitArcs(G.mantle.map((a) => mpa(a, false)), 77, 0.5);
        ctx.save();
        tracePoly(ctx, body);
        ctx.clip();
        strokeMany(ctx, m, P.juvFringe, lw(2.6), 1);
        strokeMany(ctx, m, P.inkSoft, lw(0.9), 0.55);
        ctx.restore();
      }
    } else {
      fillPoly(ctx, body, P.plumeWhite);
      fillPoly(ctx, mpa(G.bodyR, false), P.plumeShade, 0.35);
    }
    if (detail > 0.3) {
      // contour hatching across the body on its shadow (right) half
      L.hatch(ctx, mpa(G.bodyR, false), {
        angle: rot + 0.12, spacing: hs(7), width: 1.3, color: P.mantleDeep, alpha: above ? 0.6 : 0.55, bend: 3 * sc,
        density: (x, y) => {
          const g = toG3(x, y);
          return clamp(sstep(4, 40, g[0] - 540) * (g[1] > 720 ? 1 : 0.4));
        },
        length: [14, 36], seed: sg('bodyH'), boil: bi,
      });
      // deep shade where the right flank turns under the wing root
      L.crossHatch(ctx, mpa(G.bodyR, false), {
        tone: 0.6, spacing: hs(6), crossSpacing: hs(7), width: 1.2, color: P.mantleDeep, alpha: 0.6,
        density: (x, y) => {
          const g = toG3(x, y);
          return clamp(sstep(30, 52, g[0] - 540) * (1 - Math.abs(g[1] - 850) / 90));
        },
        length: [10, 24], seed: sg('bodyX'), boil: bi,
      });
      if (!above && detail > 0.6) {
        // small breast feather marks, a ruff of contour feathers round the neck
        const ticks = [];
        const r = L.rng(sg('breast'));
        for (let i = 0; i < 46; i++) {
          const gx = 540 + (r() - 0.5) * 80, gy = 745 + r() * 200;
          if (!L.polyContains(G.body, gx, gy)) continue;
          const w = 3 + r() * 3;
          ticks.push(mpa([[gx - w, gy - 2], [gx, gy + 1.5], [gx + w, gy - 2]], false));
        }
        strokeMany(ctx, jitArcs(ticks, 91, 0.4), P.mantleDeep, lw(1), 0.5);
        strokePts(ctx, mpa([[516, 728], [528, 736], [540, 739], [552, 736], [564, 728]], false), P.plumeShade, lw(2), 0.9);
      }
      if (!above) L.stipple(ctx, body, { spacing: hs(11), r: [0.8, 1.4], color: P.mantleDeep, alpha: 0.35, density: (x, y) => clamp((toG3(x, y)[0] - 530) / 60), seed: sg('bodyS'), boil: bi });
    }
    // head
    if (above) {
      // white forehead, smudgy black rear crown down the nape
      const crown = mpa([[507, 694], [516, 684], [530, 681], [540, 684], [550, 681], [564, 684], [573, 694], [572, 708], [564, 720], [552, 730], [540, 738], [528, 730], [516, 720], [508, 708]], false);
      fillPoly(ctx, crown, P.capBlack, 0.92);
      if (detail > 0.3) L.stipple(ctx, mpa([[512, 684], [540, 678], [568, 684], [568, 692], [540, 688], [512, 692]], false), { spacing: hs(4.5), r: [0.8, 1.5], color: P.capBlack, alpha: 0.8, seed: sg('crownS'), boil: bi });
    } else {
      // from below: throat white, the dark rear-crown smudges show at the sides with the eye in them
      for (const s of [-1, 1]) {
        const sm = mpa([[540 + s * 33, 676], [540 + s * 35, 690], [540 + s * 32, 706], [540 + s * 25, 718], [540 + s * 22, 706], [540 + s * 26, 690], [540 + s * 27, 678]], false);
        fillPoly(ctx, sm, P.capBlack, 0.9);
      }
      fillPoly(ctx, mpa(G.head.filter((q) => q[0] > 540), false).concat([mp([540, 724], false)]), P.plumeShade, 0.35);
    }
    L.inkPath(ctx, body, { closed: true, width: lw(5), color: ink, seed: sg('body'), boil: bi, taper: [8, 14], double: { alpha: 0.35 } });
    // bill: black, slim, straight (juvenile)
    const bill = mpa(G.bill, false);
    fillPoly(ctx, bill, P.juvBill);
    L.inkPath(ctx, bill, { closed: true, width: lw(2.2), color: ink, seed: sg('bill'), boil: bi, taper: [2, 4] });
    strokePts(ctx, mpa([[540, 614], [540, 658]], false), P.inkFaint, lw(1), 0.8);
    // feet tucked under the vent (below only)
    if (!above) {
      for (let i = 0; i < 2; i++) {
        const f = mpa(G.feet[i], false);
        fillPoly(ctx, f, P.juvBill);
        strokePts(ctx, f, ink, lw(1.2), 0.9, null, true);
      }
    }
  }
  // ===== end of the G3 bird (shot 11 copies up to here) ==========================

  // beats (shot-local seconds)
  const B_L2 = 0.5; // T 20.0: layer 2, the barbs draw on
  const B_L3 = 1.0; // T 20.5: zoom 12, layer 3 cracks out
  const B_L4 = 1.5; // T 21.0: zoom 40, layer 4, the split tears open
  const B_ZIP = 2.0; // T 21.5: the split zips shut

  // ---------------------------------------------------------------------------
  // Camera: exponential push on the beats, target (880, 890)
  // ---------------------------------------------------------------------------
  const TX = 880, TY = 890;
  const ZK = [1.08, 4, 12, 40];
  const LZ = ZK.map(Math.log);
  const Z_END = 44;

  function camAt(t) {
    t = clamp(t, 0, 2.5);
    let lz;
    if (t < B_L4) {
      const i = Math.min(2, Math.floor(t / 0.5 + 1e-9));
      const u = clamp((t - i * 0.5) / 0.5);
      // mostly eased so each step lands on its beat, never fully stopped so the push stays continuous
      lz = lerp(LZ[i], LZ[i + 1], lerp(u, E.inOutSine(u), 0.65));
    } else {
      lz = lerp(LZ[3], Math.log(Z_END), E.outSine((t - B_L4) / 1.0));
    }
    const z = Math.exp(lz);
    const k = t < B_L3 ? 0 : E.inOutSine((t - B_L3) / 0.5);
    const sx = lerp(880, 540, k), sy = lerp(890, 960, k);
    return { z, sx, sy, x: TX - (sx - 540) / z, y: TY - (sy - 960) / z };
  }

  // ---------------------------------------------------------------------------
  // Geometry helpers
  // ---------------------------------------------------------------------------
  const lerp2 = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];
  function tracePts(c, pts, closed = true) {
    for (let i = 0; i < pts.length; i++) (i ? c.lineTo : c.moveTo).call(c, pts[i][0], pts[i][1]);
    if (closed) c.closePath();
  }
  function fillPts(c, pts, color, alpha = 1) {
    c.save();
    c.globalAlpha *= alpha;
    c.fillStyle = color;
    c.beginPath();
    tracePts(c, pts);
    c.fill();
    c.restore();
  }
  function bbOf(pts, pad = 0) {
    const b = L.bounds(pts);
    return { x0: b.x - pad, y0: b.y - pad, x1: b.x + b.w + pad, y1: b.y + b.h + pad };
  }
  const hits = (b, w) => !(b.x1 < w.x0 || b.x0 > w.x1 || b.y1 < w.y0 || b.y0 > w.y1);

  // inkPath under the camera with every pen size kept in screen pixels
  function ink(c, pts, z, o) {
    const w = o.width != null ? o.width : 3;
    const q = Object.assign({}, o);
    q.width = w / z;
    q.wobble = (o.wobble != null ? o.wobble : 2) / z;
    q.tremble = (o.tremble != null ? o.tremble : 0.4) / z;
    q.rough = (o.rough != null ? o.rough : 0.22 + w * 0.07) / z;
    q.boilAmp = (o.boilAmp != null ? o.boilAmp : 0.7) / z;
    q.step = Math.max(0.3, (o.step || 2.5) / Math.max(1, z));
    const tp = o.taper != null ? o.taper : o.closed ? [10, 22] : [18, 34];
    q.taper = Array.isArray(tp) ? [tp[0] / z, tp[1] / z] : tp / z;
    q.overlap = (o.overlap != null ? o.overlap : 14) / z;
    if (o.double) {
      const d = o.double === true ? {} : o.double;
      q.double = Object.assign({}, d, { offset: ((w / 2 + 3) / z) * (d.side || 1) });
    }
    L.inkPath(c, pts, q);
  }
  // ink only the parts of a long line near the window (in blocks of 8 points, so run ends rarely move);
  // off-screen ends are cut square, everything on screen is drawn as usual
  let WIN = null;
  function inkW(c, pts, z, o) {
    if (!WIN || z < 2.5) return ink(c, pts, z, o);
    const pad = 90 / z;
    const x0 = WIN.x0 - pad, x1 = WIN.x1 + pad, y0 = WIN.y0 - pad, y1 = WIN.y1 + pad;
    const n = pts.length;
    const nb = Math.ceil(n / 8);
    const on = new Uint8Array(nb + 2);
    let all = true;
    for (let i = 0; i < n; i++) {
      const p = pts[i];
      if (p[0] >= x0 && p[0] <= x1 && p[1] >= y0 && p[1] <= y1) on[((i / 8) | 0) + 1] = 1;
      else all = false;
    }
    if (all) return ink(c, pts, z, o);
    const q = Object.assign({}, o, { closed: false, taper: 0, double: false, fill: null });
    for (let b = 1; b <= nb; b++) {
      if (!on[b]) continue;
      let e = b;
      while (e + 1 <= nb && on[e + 1]) e++;
      const i0 = Math.max(0, (b - 2) * 8), i1 = Math.min(n - 1, (e + 1) * 8);
      const run = pts.slice(i0, i1 + 1);
      if (o.closed && i1 === n - 1) run.push(pts[0]);
      if (run.length > 1) ink(c, run, z, q);
      b = e;
    }
  }
  // hatch under the camera: pen width and shimmer in screen pixels, spacing and lengths in world units
  function hatchZ(c, clip, z, o) {
    const q = Object.assign({}, o);
    q.width = (o.width != null ? o.width : 1.4) / z;
    q.boilAmp = (o.boilAmp != null ? o.boilAmp : 0.45) / z;
    L.hatch(c, clip, q);
  }

  // ---------------------------------------------------------------------------
  // Layer 2 geometry: 09's right-wing feathers, rebuilt with vane-width functions for the barbs
  // ---------------------------------------------------------------------------
  // lattice constants (world units): barb spacing, barbule lengths and angles (art bible 10.7)
  const S3 = 4.7; // layer 3 barb spacing, perpendicular (188 px at zoom 40)
  const S2 = S3 / 3; // layer 2 barb spacing: every third layer-2 barb is a layer-3 barb
  const LHK = 3.6; // hooked barbule, the shorter (0.4 mm): 144 px at zoom 40
  const LBW = 5.0; // grooved (bow) barbule, the longer (0.6 mm): 200 px at zoom 40
  const HA = 42 * DEG, BA = 18 * DEG;
  const SIG = 0.8; // barbule pitch along the barb (drawn far sparser than life so each barbule reads)
  const WN = 7; // narrow vane width
  const BARB_W = 1.0; // barb ridge width near the rachis (40 px at zoom 40)
  // how far apart two barb centrelines can be and still zip: both barbule reaches plus the ridges
  const REACH = LHK * Math.sin(HA) + LBW * Math.sin(BA) + BARB_W; // 4.95 against S3 4.7
  const J = -2; // the split opens between barb J and barb J+1 (the target sits between them)
  const G_MAX = 3.4; // how far the split opens (world): the hooks fall 136 px short
  const FAC = { '-1': -0.1, 0: -0.3, 1: 0.7, 2: 0.3, 3: 0.1 };
  // barbs curve gently toward the feather tip: sideways offset and its slope at distance vv from the rachis
  const BEND = 0.0035;
  // quadratic near the rachis, then straight on at the slope it reached (about 10 degrees)
  const BEND_K = 25;
  const bend = (vv) => (vv < BEND_K ? BEND * vv * vv : BEND * (BEND_K * BEND_K + 2 * BEND_K * (vv - BEND_K)));
  const bendD = (vv) => 2 * BEND * Math.min(vv, BEND_K);

  // one G3 feather of the right wing (09's g3Feather, mirrored): r along the shaft, n toward the
  // broad trailing vane (inboard), the same vane profile as g3Feather so the barbs end on its margin
  function fromG3(F, kind, seed) {
    const B = F.b, T = F.e;
    const len = Math.hypot(T[0] - B[0], T[1] - B[1]);
    const r = [(T[0] - B[0]) / len, (T[1] - B[1]) / len];
    const n = [-r[1], r[0]];
    const blunt = kind === 'secondary' ? 0.62 : 0;
    const Wl = kind === 'secondary' ? 5 : F.n === 10 ? 5 : 6.5;
    const Wt = kind === 'secondary' ? 8.5 : F.n === 10 ? 11 : 15.5;
    const prof = (u) => {
      u = clamp(u);
      if (blunt) return u < 0.9 ? 1 : Math.sqrt(Math.max(0, 1 - Math.pow((u - 0.9) / 0.1, 2))) * (1 - blunt) + blunt;
      return u < 0.78 ? 1 - 0.12 * u : (1 - 0.12 * 0.78) * Math.sqrt(Math.max(0, 1 - Math.pow((u - 0.78) / 0.22, 2)));
    };
    const wt = (a) => Wt * prof(a / len);
    const wl = (a) => Wl * prof(a / len);
    const at = (a, w) => [B[0] + r[0] * a + n[0] * w, B[1] + r[1] * a + n[1] * w];
    // rachis ribbon
    const Wr = (a) => lerp(2.8, 0.5, Math.pow(clamp(a / len), 0.85));
    const rl = [], rr = [];
    const N = 24;
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * len * 0.97;
      rl.push(at(a, Wr(a) / 2));
      rr.push(at(a, -Wr(a) / 2));
    }
    const rachis = rl.concat(rr.reverse());
    // secondaries: the square-cut base (hidden at zoom 1) tapers in under the coverts
    let poly = F.poly;
    if (blunt) {
      const tr = [], ld = [];
      for (let i = 0; i <= 20; i++) {
        const a = (i / 20) * len, k = 0.25 + 0.75 * sstep(0, 0.25, i / 20);
        tr.push(at(a, wt(a) * k));
        ld.push(at(a, -wl(a) * k));
      }
      poly = ld.concat(tr.reverse());
    }
    return { B, T, len, r, n, wt, wl, at, poly, tip: F.tipEdge, line: F.rachis, rachis, Wr, bb: bbOf(F.poly, 4), seed, kind, num: F.n };
  }

  // layer 2 barbs of one feather, curved toward the tip, as flat runs of 5 points [x, y] * 5 + k
  // (t-independent). Trailing barbs run along (r + n) / sqrt2, leading ones along (r - n) / sqrt2.
  function barbsOf(f, a0) {
    const d2 = S2 * SQ2;
    const tr = [];
    const k0 = Math.ceil((f.len * 0.06 - a0) / d2), k1 = Math.floor((f.len - a0) / d2);
    const push = (aj, len, sgn, k) => {
      for (let q = 0; q <= 4; q++) {
        const vv = (len * q) / 4, bd = bend(vv);
        const p = f.at(aj + (vv + bd) / SQ2, (sgn * (vv - bd)) / SQ2);
        tr.push(p[0], p[1]);
      }
      tr.push(k);
    };
    for (let k = k0; k <= k1; k++) {
      const aj = a0 + k * d2;
      let vv = 0;
      while (vv < 60 && (vv - bend(vv)) / SQ2 < f.wt(aj + (vv + bend(vv)) / SQ2)) vv += 0.4;
      if (vv > 0.8) push(aj, vv, 1, k);
      let vl = 0;
      while (vl < 30 && (vl - bend(vl)) / SQ2 < f.wl(aj + (vl + bend(vl)) / SQ2)) vl += 0.4;
      if (vl > 0.8) push(aj, vl, -1, k);
    }
    return tr;
  }

  let GEO = null;
  function geo() {
    if (GEO) return GEO;
    const g = {};
    const W3 = g3Geo().wings[1]; // the right wing
    const w = {
      outline: W3.wing, le: W3.le, handTE: W3.handTE, secTE: W3.secTE, coverts: W3.coverts, covRows: W3.covRows,
      prim: W3.prim.map((F) => fromG3(F, 'primary', sd('prim', F.n))),
      sec: W3.sec.map((F) => fromG3(F, 'secondary', sd('sec', F.j))),
    };
    w.bb = bbOf(w.outline, 10);
    // smoothed covert rows (09's arcs are 4-segment polylines, angular at zoom 4 and up)
    w.covRowsS = W3.covRows.map((arcs) => arcs.map((a) => L.smoothPts(a, false, 1.2)));
    // the coverts' shade band over the flight-feather bases
    const cl = W3.covLine;
    w.covShade = cl.concat(cl.map((q, i) => [q[0], q[1] + 14 * (1 - sstep(0.7, 1, (cl.length - 1 - i) / (cl.length - 1)))]).reverse());
    w.covBB = bbOf(w.coverts, 12);
    g.R = w;

    // the hero feather: the one on top under the target (09 draws P10 first, P1 last)
    let hero = w.prim[0];
    for (let i = 9; i >= 0; i--) if (L.polyContains(w.prim[i].poly, TX, TY)) hero = w.prim[i];
    g.hero = hero;
    // lattice frame: rachis foot of the target, slid along the shaft so the target sits in the
    // middle of the gap between barbs J and J+1
    const dx = TX - hero.B[0], dy = TY - hero.B[1];
    const aT = dx * hero.r[0] + dy * hero.r[1];
    const dR = dx * hero.n[0] + dy * hero.n[1];
    const aF = aT + (-(J * S3 + S3 / 2) * SQ2 - dR);
    const F = hero.at(aF, 0);
    const r = hero.r, n = hero.n;
    const b = [(r[0] + n[0]) / SQ2, (r[1] + n[1]) / SQ2];
    const m = [(r[0] - n[0]) / SQ2, (r[1] - n[1]) / SQ2];
    g.LT = { F, r, n, b, m, dR, aF, WR: hero.Wr(aF) };
    // layer 2 barbs: the hero's aligned to the lattice, the others from a seeded phase
    const d2 = S2 * SQ2;
    for (const f of w.prim) {
      const a0 = f === hero ? aF - Math.floor(aF / d2) * d2 : h3(f.seed, 1, 2) * d2;
      f.barbs = barbsOf(f, a0);
    }
    GEO = g;
    return g;
  }

  // ---------------------------------------------------------------------------
  // Layer 1: the bird (world coordinates)
  // ---------------------------------------------------------------------------
  function drawBarbsL2(c, f, z, frac, bi) {
    const jit = 0.5 / z;
    const arr = f.barbs;
    const build = (dxo, dyo) => {
      const p = new Path2D();
      for (let i = 0; i < arr.length; i += 11) {
        const k = arr[i + 10];
        const j0 = (h3(k, bi, f.seed) - 0.5) * jit, j1 = (h3(bi, k, f.seed + 1) - 0.5) * jit;
        p.moveTo(arr[i] + dxo, arr[i + 1] + dyo);
        // grow along the curve: whole segments, then a partial one
        const segs = 4 * frac;
        for (let q = 1; q <= 4; q++) {
          const u = clamp(segs - (q - 1));
          if (u <= 0) break;
          const x0 = arr[i + 2 * (q - 1)], y0 = arr[i + 2 * (q - 1) + 1];
          const x = lerp(x0, arr[i + 2 * q], u), y = lerp(y0, arr[i + 2 * q + 1], u);
          p.lineTo(x + dxo + (q === 4 ? j0 : 0), y + dyo + (q === 4 ? j1 : 0));
        }
      }
      return p;
    };
    const wB = 0.42 + 0.6 / z;
    c.save();
    c.beginPath();
    tracePts(c, f.poly);
    c.clip();
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.strokeStyle = P.ink;
    c.globalAlpha = 0.55;
    c.lineWidth = wB + 1.1 / z;
    c.stroke(build(0, 0));
    c.globalAlpha = 1;
    c.strokeStyle = P.plumeShade;
    c.lineWidth = wB;
    c.stroke(build(-0.7 / z, -0.7 / z));
    c.restore();
  }

  // the right wing redrawn for zoom 4 to 12 on 09's geometry, pens in screen pixels
  function drawWingL2(c, w, z, win, frac, bi) {
    if (!hits(w.bb, win)) return;
    c.save();
    tracePoly(c, w.outline);
    c.clip();
    fillPts(c, w.outline, P.primaryGlow, 0.6);
    // primaries, P10 first so the inner ones lie over them (as in 09)
    for (let i = 9; i >= 0; i--) {
      const f = w.prim[i];
      if (!hits(f.bb, win)) continue;
      fillPts(c, f.poly, P.primaryGlow, 0.9);
      drawBarbsL2(c, f, z, frac, bi);
      inkW(c, f.poly, z, { closed: true, width: 1.4, color: P.inkSoft, alpha: 0.85, seed: f.seed + 3, taper: [6, 12] });
      fillPts(c, f.rachis, P.plumeWhite);
      inkW(c, f.rachis, z, { closed: true, width: 1.6, color: P.ink, alpha: 0.9, seed: f.seed + 5, taper: [4, 8] });
      inkW(c, f.tip, z, { width: 3.2, color: P.capBlack, seed: f.seed + 9, taper: [8, 14], wobble: 1 });
    }
    // secondaries: broad, blunt, a pale trailing edge
    for (const f of w.sec) {
      if (!hits(f.bb, win)) continue;
      fillPts(c, f.poly, P.primaryGlow, 0.95);
      hatchZ(c, f.poly, z, { angle: Math.atan2(f.r[1], f.r[0]) + 0.6, spacing: 3, width: 1, color: P.mantleDeep, alpha: 0.3, length: [6, 16], gap: [2, 5], inset: 1, seed: f.seed });
      inkW(c, f.poly, z, { closed: true, width: 1.2, color: P.inkSoft, alpha: 0.75, seed: f.seed + 3, taper: [6, 12] });
      inkW(c, [f.B, f.at(f.len * 0.86, 0)], z, { width: 1.3, color: P.mantleDeep, alpha: 0.75, seed: f.seed + 7 });
      inkW(c, f.tip, z, { width: 3.4, color: P.plumeShade, seed: f.seed + 9, taper: [8, 14], wobble: 1 });
    }
    // underwing coverts and their feather-tip rows
    if (hits(w.covBB, win)) {
      fillPts(c, w.covShade, P.plumeShade, 0.9);
      fillPts(c, w.covShade, P.mantleGrey, 0.25);
      fillPts(c, w.coverts, P.plumeWhite);
      w.covRowsS.forEach((arcs, r) => {
        c.save();
        c.lineCap = 'round';
        c.lineJoin = 'round';
        c.strokeStyle = r === 3 ? P.inkSoft : P.mantleDeep;
        c.globalAlpha = r === 3 ? 0.85 : 0.5;
        c.lineWidth = (r === 3 ? 1.6 : 1.1) / z;
        c.beginPath();
        for (const a of arcs) tracePts(c, a, false);
        c.stroke();
        c.restore();
      });
    }
    // shade: the right wing's trailing half darkens (light from the upper left), as in 09
    hatchZ(c, w.outline, z, {
      angle: -Math.PI / 4, spacing: 8, width: 1.3, color: P.mantleDeep, alpha: 0.35, length: [14, 40], seed: sd('wingH'),
      density: (x, y) => {
        const ax = Math.abs(x - 540);
        const chord = clamp((y - 790) / 110);
        return clamp(0.6 * chord + (1 - sstep(60, 240, ax)) * 0.5 * chord + 0.08);
      },
    });
    c.restore();
    // outline: leading edge and wingtip in full ink, the hand's trailing edge the black edge
    inkW(c, w.le.concat(w.handTE.slice(1, 4)), z, { width: 5, color: P.ink, seed: sd('le'), taper: [6, 10] });
    inkW(c, w.handTE.slice(2), z, { width: 4, color: P.capBlack, seed: sd('hte'), taper: [4, 8], wobble: 1.2 });
    inkW(c, w.secTE, z, { width: 3, color: P.ink, seed: sd('ste'), taper: [4, 14] });
  }

  // ---------------------------------------------------------------------------
  // Layer 3 / 4: the barb lattice around the hero feather's rachis (world units, drawn under the camera)
  // ---------------------------------------------------------------------------
  function drawing(t, a) {
    return Math.floor((t - a) * 12 + 1e-6);
  }
  function splitState(t) {
    let G = 0;
    if (t >= B_L4 - 1e-6) G = G_MAX * [0.72, 1.08, 1][Math.min(2, drawing(t, B_L4))];
    let front = -Infinity;
    if (t >= B_ZIP - 1e-6) {
      const d = drawing(t, B_ZIP);
      front = d >= 3 ? Infinity : [7, 17, 30][d];
    }
    return { G, front };
  }
  function openAt(vv, sp) {
    if (!sp.G) return 0;
    if (sp.front === Infinity) return 0;
    const zip = sp.front === -Infinity ? 1 : sstep(sp.front - 3, sp.front + 1, vv);
    return sp.G * sstep(2, 13, vv) * zip;
  }
  const delta = (j, vv, sp) => {
    const f = FAC[j - J];
    return f ? f * openAt(vv, sp) : 0;
  };

  function latticeWindow(cam, LT) {
    const z = cam.z;
    const hw = cam.hw != null ? cam.hw : 540, hh = cam.hh != null ? cam.hh : 960; // screen half-size
    const xs = [cam.x - hw / z, cam.x + hw / z], ys = [cam.y - hh / z, cam.y + hh / z];
    let m0 = Infinity, m1 = -Infinity, v0 = Infinity, v1 = -Infinity;
    for (const x of xs) {
      for (const y of ys) {
        const dx = x - LT.F[0], dy = y - LT.F[1];
        const m = dx * LT.m[0] + dy * LT.m[1], v = dx * LT.b[0] + dy * LT.b[1];
        m0 = Math.min(m0, m);
        m1 = Math.max(m1, m);
        v0 = Math.min(v0, v);
        v1 = Math.max(v1, v);
      }
    }
    return { m0, m1, v0, v1 };
  }
  // world point from lattice coords
  function W(LT, m, v) {
    return [LT.F[0] + LT.m[0] * m + LT.b[0] * v, LT.F[1] + LT.m[1] * m + LT.b[1] * v];
  }

  // the iris: layer 3 opens as a circle from the target over 5 frames, starting on the beat frame
  const IRIS_F = 5;
  function irisR(t) {
    if (t < B_L3 - 1e-6) return 0;
    const u = clamp(((t - B_L3) * 24 + 1) / IRIS_F);
    return u >= 1 ? Infinity : lerp(60, 2300, E.inCubic(u) * 0.35 + E.outCubic(u) * 0.65);
  }

  // one barb as a generic object: origin on the rachis, direction d, tip-ward side q
  function drawLattice(c, cam, t, bi, sp, lw) {
    const g = geo();
    const LT = g.LT;
    const z = cam.z;
    const px = 1 / z; // one screen pixel in world units
    const win = { x0: cam.x - 540 / z, x1: cam.x + 540 / z, y0: cam.y - 960 / z, y1: cam.y + 960 / z };
    const b = LT.b, m = LT.m, r = LT.r, n = LT.n;
    const K = WN * SQ2;

    // vane ground
    c.fillStyle = P.primaryGlow;
    c.fillRect(win.x0 - 2, win.y0 - 2, win.x1 - win.x0 + 4, win.y1 - win.y0 + 4);

    // beyond the narrow vane: P9 tucked under, darker, its barbs faint
    const BIG = lw.m1 + 60;
    const beyond = [W(LT, lw.v0 - 20 + K, lw.v0 - 20), W(LT, lw.v1 + 20 + K, lw.v1 + 20), W(LT, BIG, lw.v1 + 20), W(LT, BIG, lw.v0 - 20)];
    fillPts(c, beyond, P.plumeShade, 0.85);
    {
      const p = new Path2D();
      for (let j = Math.floor(lw.m0 / S3) - 2; j <= Math.ceil(lw.m1 / S3) + 2; j++) {
        const mm = j * S3 + 2.5;
        const vEnd = mm - K;
        if (vEnd < lw.v0 - 2) continue;
        const a = W(LT, mm, Math.max(lw.v0 - 4, vEnd - 80)), e = W(LT, mm, vEnd - 0.6);
        p.moveTo(a[0], a[1]);
        p.lineTo(e[0], e[1]);
      }
      c.save();
      c.strokeStyle = P.mantleGrey;
      c.globalAlpha = 0.6;
      c.lineWidth = Math.max(0.22, 3.5 * px);
      c.lineCap = 'round';
      c.stroke(p);
      c.restore();
      // the narrow vane's cast shade on P9
      const sh = [W(LT, lw.v0 - 20 + K, lw.v0 - 20), W(LT, lw.v1 + 20 + K, lw.v1 + 20), W(LT, lw.v1 + 20 + K + 1.1, lw.v1 + 20), W(LT, lw.v0 - 20 + K + 1.1, lw.v0 - 20)];
      fillPts(c, sh, P.mantleDeep, 0.35);
    }

    // barbules and hooklets
    const zB = sstep(18, 26, z); // odd barbules and grooves fade in
    const zH = sstep(22, 32, z); // hooklets
    const pBow = new Path2D(), pHook = new Path2D(), pBowO = new Path2D(), pHookO = new Path2D();
    const pGroove = new Path2D(), pHk = new Path2D(), pHkOpen = new Path2D();
    const catches = [];
    const ch = Math.cos(HA), shh = Math.sin(HA), cb = Math.cos(BA), sb = Math.sin(BA);
    const jit = 0.35 * px;
    // one barb: origin O on the rachis, direction d, tip-ward side q; bent barbs curve toward q
    const addBarbules = (j, O, d, q, len, vvA, vvB, dispFn, scale, narrow, bent) => {
      const k0 = Math.max(1, Math.ceil(vvA / SIG)), k1 = Math.floor(Math.min(len, vvB) / SIG);
      for (let k = k0; k <= k1; k++) {
        const odd = k & 1;
        if (odd && zB <= 0) continue;
        const vv = k * SIG;
        const off = (dispFn ? dispFn(vv) : 0) + (bent ? bend(vv) : 0);
        // local frame along the (bent) barb
        const sl = bent ? bendD(vv) : 0;
        let dx = d[0] + q[0] * sl, dy = d[1] + q[1] * sl;
        const dl = Math.hypot(dx, dy);
        dx /= dl;
        dy /= dl;
        const qx = q[0] - d[0] * sl, qy = q[1] - d[1] * sl;
        const ql = Math.hypot(qx, qy);
        const Qx = qx / ql, Qy = qy / ql;
        const bw = barbW(vv) / 2;
        const cx = O[0] + d[0] * vv + q[0] * off, cy = O[1] + d[1] * vv + q[1] * off;
        const hj = h3(j, k, 71) - 0.5, bj = h3(k, j, 72) - 0.5;
        const bl = h3(j, k, bi + 73) - 0.5;
        // hooked barbule on the tip-ward side, 42 degrees
        const ah = HA + hj * 0.07;
        const hx = Math.cos(ah) * dx + Math.sin(ah) * Qx, hy = Math.cos(ah) * dy + Math.sin(ah) * Qy;
        const lh = LHK * scale * (0.9 + 0.2 * h3(j, k, 74));
        const ax = cx + Qx * bw, ay = cy + Qy * bw;
        const ex = ax + hx * lh + bl * jit, ey = ay + hy * lh - bl * jit;
        const ph = odd ? pHookO : pHook;
        ph.moveTo(ax, ay);
        ph.quadraticCurveTo(ax + hx * lh * 0.5 - hy * lh * 0.03, ay + hy * lh * 0.5 + hx * lh * 0.03, ex, ey);
        // grooved bow barbule on the base-ward side, 18 degrees, bowed
        const ab = BA + bj * 0.06;
        const gx = Math.cos(ab) * dx - Math.sin(ab) * Qx, gy = Math.cos(ab) * dy - Math.sin(ab) * Qy;
        const lb = LBW * scale * (0.9 + 0.2 * h3(k, j, 75));
        const gx0 = cx - Qx * bw, gy0 = cy - Qy * bw;
        const gex = gx0 + gx * lb - bl * jit, gey = gy0 + gy * lb + bl * jit;
        const cmx = (gx0 + gex) / 2 + Qx * lb * 0.07, cmy = (gy0 + gey) / 2 + Qy * lb * 0.07;
        const pb = odd ? pBowO : pBow;
        pb.moveTo(gx0, gy0);
        pb.quadraticCurveTo(cmx, cmy, gex, gey);
        if (zB > 0.5 && !narrow) {
          // the groove: a second fine line along the proximal flange
          const go = 0.11;
          const mx = gx0 + (gex - gx0) * 0.6 + Qx * lb * 0.05, my = gy0 + (gey - gy0) * 0.6 + Qy * lb * 0.05;
          pGroove.moveTo(gx0 - Qx * go + gx * 0.4, gy0 - Qy * go + gy * 0.4);
          pGroove.quadraticCurveTo((gx0 + mx) / 2 + Qx * lb * 0.035 - Qx * go, (gy0 + my) / 2 + Qy * lb * 0.035 - Qy * go, mx - Qx * go, my - Qy * go);
        }
        // hooklets: small backward-facing hooks near the end of the hooked barbule
        if (zH > 0 && !narrow) {
          const gap = S3 + delta(j + 1, vv + 3, sp) - delta(j, vv, sp);
          const caught = gap < REACH - 0.1;
          const tgt = caught ? pHk : pHkOpen;
          // side normal of the barbule that faces along the barb
          let wx = -hy, wy = hx;
          if (wx * dx + wy * dy < 0) {
            wx = -wx;
            wy = -wy;
          }
          // one hooklet at the end of each hooked barbule, about 28 px at zoom 40: a stem dropping
          // off the barbule toward the barb tip, then a hook turning back toward the barbule's base.
          // Open, the hook hangs half-curled; caught, it closes round the next barb's grooved barbule.
          {
            const st = 0.46 * (0.9 + 0.2 * h3(j, k, 81));
            const sx = ex + wx * st, sy = ey + wy * st;
            tgt.moveTo(ex - hx * 0.05, ey - hy * 0.05);
            tgt.lineTo(sx, sy);
            const rr = caught ? 0.14 : 0.17;
            const a0 = Math.atan2(hy, hx);
            const ccx = sx - hx * rr, ccy = sy - hy * rr;
            const cw = hx * wy - hy * wx > 0; // does the angle grow from h toward w?
            const sweep = (caught ? 1.25 : 0.7) * Math.PI;
            tgt.arc(ccx, ccy, rr, a0, cw ? a0 + sweep : a0 - sweep, !cw);
          }
          if (j === J && catchWin && vv >= catchWin[0] && vv < catchWin[1] && !odd) catches.push([ex, ey]);
        }
      }
    };
    let catchWin = null;
    if (t >= B_ZIP - 1e-6) {
      const d = drawing(t, B_ZIP);
      const F3 = [2, 7, 17, 30, 60];
      if (d <= 3) catchWin = [F3[d], F3[d + 1]];
    }
    const barbW = (vv) => lerp(BARB_W, 0.75, clamp(vv / 40));

    // broad vane barbs: origin on the rachis at m = v = jS
    // barbs bend toward +m, so ones rooted further toward -m can curve into the window
    const jA = Math.floor((lw.m0 - LBW - bend(Math.max(0, lw.v1 - lw.m0) + 10)) / S3) - 1, jB = Math.ceil((lw.m1 + LHK) / S3) + 1;
    const barbs = [];
    for (let j = jA; j <= jB; j++) {
      const O = W(LT, j * S3, j * S3);
      const vvA = Math.max(0, lw.v0 - LBW - j * S3), vvB = lw.v1 + 2 - j * S3;
      if (vvB <= vvA) continue;
      const disp = FAC[j - J] ? (vv) => delta(j, vv, sp) : null;
      addBarbules(j, O, b, m, 200, vvA, vvB, disp, 1, false, true);
      barbs.push({ j, O, vvA, vvB, disp });
    }
    // narrow vane barbs: origin on the rachis, direction m, tip-ward b, length WN*sqrt2
    const kA = Math.floor((lw.v0 - 6) / S3) - 1, kB = Math.ceil((lw.v1 + 2) / S3) + 1;
    const nbarbs = [];
    for (let k = kA; k <= kB; k++) {
      const v = k * S3 + S3 / 2;
      const O = W(LT, v, v);
      addBarbules(1000 + k, O, m, b, K - 0.6, 0, K - 0.6, null, 0.55, true, false);
      nbarbs.push(O);
    }
    c.save();
    c.lineCap = 'round';
    c.strokeStyle = P.inkSoft;
    c.lineWidth = Math.max(1.1, Math.min(2.2, 0.055 * z)) * px;
    c.globalAlpha = 0.85;
    c.stroke(pBow);
    c.stroke(pHook);
    if (zB > 0) {
      c.globalAlpha = 0.85 * zB;
      c.stroke(pBowO);
      c.stroke(pHookO);
      c.lineWidth = 0.9 * px;
      c.globalAlpha = 0.6 * zB;
      c.stroke(pGroove);
    }
    if (zH > 0) {
      c.strokeStyle = P.ink;
      c.lineWidth = Math.max(1.2, Math.min(3, 0.075 * z)) * px;
      c.globalAlpha = zH;
      c.stroke(pHk);
      c.globalAlpha = zH * 0.9;
      c.stroke(pHkOpen);
    }
    c.restore();

    // barb ridges: mantleGrey, highlight on the lit side, ink on the shadow side
    const ridgeFill = new Path2D(), ridgeInk = new Path2D(), ridgeHi = new Path2D();
    const ridge = (O, d, q, vvA, vvB, disp, j, wmul, bent) => {
      const left = [], right = [];
      const step = Math.max(0.5, 6 * px);
      for (let vv = vvA; vv <= vvB + step; vv += step) {
        const u = Math.min(vv, vvB);
        const dd = (disp ? disp(u) : 0) + (bent ? bend(u) : 0);
        const bw = (barbW(u) / 2) * wmul;
        const cx = O[0] + d[0] * u + q[0] * dd, cy = O[1] + d[1] * u + q[1] * dd;
        const wob = (h3(j, Math.floor(u * 2), bi + 3) - 0.5) * 0.5 * px;
        left.push([cx - q[0] * bw + wob, cy - q[1] * bw]);
        right.push([cx + q[0] * bw + wob, cy + q[1] * bw]);
        if (u >= vvB) break;
      }
      tracePts(ridgeFill, left.concat(right.slice().reverse()));
      tracePts(ridgeInk, right, false);
      const hi = left.map((p, i) => lerp2(p, right[i], 0.28));
      tracePts(ridgeHi, hi, false);
    };
    for (const B of barbs) ridge(B.O, b, m, Math.max(0, B.vvA), B.vvB, B.disp, B.j, 1, true);
    for (let i = 0; i < nbarbs.length; i++) ridge(nbarbs[i], m, b, 0, K - 0.4, null, 500 + i, 0.8, false);
    c.save();
    c.fillStyle = P.mantleGrey;
    c.fill(ridgeFill);
    c.lineJoin = 'round';
    c.lineCap = 'round';
    c.strokeStyle = P.ink;
    c.lineWidth = Math.min(2.6, 0.9 + 0.045 * z) * px;
    c.globalAlpha = 0.9;
    c.stroke(ridgeInk);
    c.strokeStyle = P.primaryGlow;
    c.lineWidth = Math.min(3, 0.05 * z + 0.6) * px;
    c.globalAlpha = 0.8;
    c.stroke(ridgeHi);
    c.restore();

    // narrow vane margin
    // endpoints snapped to a 20-unit grid so the line's wobble does not swim with the camera
    const mvA = Math.floor((lw.v0 - 20) / 20) * 20, mvB = Math.ceil((lw.v1 + 20) / 20) * 20;
    const mpts = [];
    for (let v = mvA; v <= mvB; v += 10) mpts.push(W(LT, v + K, v));
    ink(c, mpts, z, {
      width: 1.8, color: P.inkSoft, alpha: 0.9, seed: sd('nmargin'), wobble: 1,
    });

    // the rachis: ivory ridge with a ventral groove, contour hatch on its shadow half, ink edges
    {
      const aA = Math.floor(((lw.v0 + lw.m0) / SQ2 - 10) / 20) * 20, aB = Math.ceil(((lw.v1 + lw.m1) / SQ2 + 10) / 20) * 20;
      const WRa = (a) => Math.max(0.5, LT.WR - 0.004 * a);
      const L1 = [], R1 = [];
      const step = Math.max(0.4, 8 * px);
      for (let a = aA; a <= aB; a += step) {
        const cx = LT.F[0] + r[0] * a, cy = LT.F[1] + r[1] * a;
        const hw = WRa(a) / 2;
        L1.push([cx + n[0] * hw, cy + n[1] * hw]);
        R1.push([cx - n[0] * hw, cy - n[1] * hw]);
      }
      // cast shade on the narrow vane side
      const sh = R1.concat(R1.map((p) => [p[0] - n[0] * 0.7, p[1] - n[1] * 0.7]).reverse());
      fillPts(c, sh, P.mantleDeep, 0.3);
      fillPts(c, L1.concat(R1.slice().reverse()), P.plumeWhite);
      const hp = new Path2D();
      const hs = z < 20 ? 0.5 : 0.25; // world pitch, fixed so the strokes do not swim with the push
      for (let a = aA; a <= aB; a += hs) {
        const cx = LT.F[0] + r[0] * a, cy = LT.F[1] + r[1] * a;
        const hw = WRa(a) / 2;
        const j0 = (h3(Math.floor(a / hs), bi, 9) - 0.5) * 0.3 * hw;
        hp.moveTo(cx - n[0] * (0.15 * hw + j0) + r[0] * 0.02, cy - n[1] * (0.15 * hw + j0));
        hp.quadraticCurveTo(cx - n[0] * 0.6 * hw + r[0] * 0.08 * hw, cy - n[1] * 0.6 * hw + r[1] * 0.08 * hw, cx - n[0] * 0.95 * hw, cy - n[1] * 0.95 * hw);
      }
      c.save();
      c.strokeStyle = P.mantleDeep;
      c.globalAlpha = 0.65;
      c.lineWidth = 1.2 * px;
      c.stroke(hp);
      c.restore();
      const aMid = (aA + aB) / 2;
      const gl = [LT.F[0] + r[0] * aA, LT.F[1] + r[1] * aA], gm = [LT.F[0] + r[0] * aMid, LT.F[1] + r[1] * aMid], ge = [LT.F[0] + r[0] * aB, LT.F[1] + r[1] * aB];
      ink(c, [gl, gm, ge], z, { width: 2, color: P.mantleGrey, alpha: 0.9, seed: sd('groove'), wobble: 0.8, taper: 0 });
      ink(c, L1, z, { width: 2.6, color: P.ink, seed: sd('rachL'), wobble: 1, taper: 0 });
      ink(c, R1, z, { width: 3, color: P.ink, seed: sd('rachR'), wobble: 1, taper: 0 });
    }
    return catches;
  }

  // ---------------------------------------------------------------------------
  // Overlays
  // ---------------------------------------------------------------------------
  function ringStroke(ctx, x, y, r, color, width, alpha) {
    if (alpha <= 0 || r <= 0) return;
    ctx.save();
    ctx.globalAlpha = clamp(alpha);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  function drawConstruction(ctx, cam) {
    const z = cam.z;
    const ax = 540 + (TX - cam.x) * z, ay = 960 + (TY - cam.y) * z;
    ctx.save();
    ctx.strokeStyle = P.inkFaint;
    ctx.lineWidth = 1.5;
    for (const R of [240, 60, 15, 3.75, 0.94]) {
      const rs = R * z;
      if (rs < 70 || rs > 1500) continue;
      ctx.globalAlpha = 0.3 * sstep(70, 160, rs) * (1 - sstep(900, 1500, rs));
      ctx.beginPath();
      ctx.arc(ax, ay, rs, 0, TAU);
      ctx.stroke();
      ctx.beginPath();
      for (let k = 0; k < 4; k++) {
        const an = (k * Math.PI) / 2 + Math.PI / 4;
        ctx.moveTo(ax + Math.cos(an) * (rs - 14), ay + Math.sin(an) * (rs - 14));
        ctx.lineTo(ax + Math.cos(an) * (rs + 14), ay + Math.sin(an) * (rs + 14));
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  const BAR = [[0, 460], [B_L2, 340], [B_L3, 220], [B_L4, 100]];
  function barLen(t) {
    let len = BAR[0][1];
    for (let i = 1; i < BAR.length; i++) {
      const u = clamp(((t - BAR[i][0]) * 24 + 1) / 4);
      if (t < BAR[i][0] - 1e-6) break;
      len = lerp(len, BAR[i][1], E.outExpo(u));
    }
    return len;
  }

  function drawOverlays(ctx, cam, t, sp, catches) {
    const cx = cam.sx, cy = cam.sy;
    const f = Math.floor(t * 24 + 1e-6);
    // yellow target ring with cross ticks, popped in on the cut
    const pop = f >= 3 ? 1 : 0.6 + 0.4 * E.outBack(clamp((t * 24 + 1) / 3));
    const R = (t < B_L4 ? 110 : lerp(110, 150, E.outExpo(clamp(((t - B_L4) * 24 + 1) / 6)))) * pop;
    ringStroke(ctx, cx, cy, R, P.annYellow, 3, 1);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = P.annYellow;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let q = 0; q < 4; q++) {
      const an = (q * Math.PI) / 2;
      ctx.moveTo(cx + Math.cos(an) * (R - 16), cy + Math.sin(an) * (R - 16));
      ctx.lineTo(cx + Math.cos(an) * (R + 16), cy + Math.sin(an) * (R + 16));
    }
    ctx.stroke();
    ctx.restore();
    // zoom dial: the arc grows with log zoom
    const zu = (Math.log(cam.z) - LZ[0]) / (Math.log(Z_END) - LZ[0]);
    if (zu > 0.004) L.arcAnnotation(ctx, cx, cy, R + 34, -Math.PI / 2, -Math.PI / 2 + zu * Math.PI * 1.5, { color: P.annYellow, width: 2, endTicks: 8, alpha: 1 });

    // scale bar, lower left, shorter at each layer step
    const len = barLen(t);
    ctx.save();
    ctx.strokeStyle = P.annBlue;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(100, 1500);
    ctx.lineTo(100 + len, 1500);
    for (const x of [100, 100 + len / 2, 100 + len]) {
      ctx.moveTo(x, 1486);
      ctx.lineTo(x, 1514);
    }
    for (let q = 1; q < 10; q++) {
      if (q === 5) continue;
      ctx.moveTo(100 + (len * q) / 10, 1488);
      ctx.lineTo(100 + (len * q) / 10, 1500);
    }
    ctx.stroke();
    ctx.restore();

    // magenta ring on the split: pops on 21.0, holds, fades on the zip
    if (t >= B_L4 - 1e-6) {
      const u = ((t - B_L4) * 24 + 1) / 8;
      const fade = t < B_ZIP - 1e-6 ? 1 : 1 - clamp(((t - B_ZIP) * 24 + 1) / 6);
      const rr = lerp(40, 250, E.outExpo(u));
      ringStroke(ctx, 540, 960, rr, P.annMagenta, 3, fade);
      ringStroke(ctx, 540, 960, lerp(20, 190, E.outExpo(u * 0.8)), P.annMagenta, 2, clamp(1 - u) * 0.7);
    }

    // blue zip arrow along the split, drawn on behind the zip front
    if (t >= B_ZIP - 1e-6 && cam.lt) {
      const LT = cam.lt;
      const mm = J * S3 + S3 / 2 + LHK * Math.sin(HA) * 0.25;
      const toS = (p) => [540 + (p[0] - cam.x) * cam.z, 960 + (p[1] - cam.y) * cam.z];
      const pts = [];
      // the arrow head rides the zip front at 24 fps (the front itself steps on twos)
      const vEnd = lerp(7, 40, E.outCubic(clamp(((t - B_ZIP) * 24) / 6)));
      for (let q = 0; q <= 12; q++) {
        const vv = lerp(2, vEnd, q / 12);
        pts.push(toS(W(LT, mm + bend(vv), J * S3 + vv)));
      }
      const a = pts[0], b = pts[pts.length - 1], bp = pts[pts.length - 2];
      const fade = 1 - clamp(((t - (B_ZIP + 0.5)) * 24) / 6);
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.lineCap = 'round';
      ctx.strokeStyle = P.paper;
      ctx.lineWidth = 5;
      ctx.globalAlpha = 0.5 * fade;
      ctx.setLineDash([14, 10]);
      ctx.beginPath();
      tracePts(ctx, pts, false);
      ctx.stroke();
      ctx.globalAlpha = fade;
      ctx.strokeStyle = P.annBlue;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.setLineDash([]);
      const dx = b[0] - bp[0], dy = b[1] - bp[1];
      const l = Math.hypot(dx, dy) || 1;
      const ux = dx / l, uy = dy / l;
      ctx.beginPath();
      ctx.moveTo(b[0] - ux * 18 - uy * 10, b[1] - uy * 18 + ux * 10);
      ctx.lineTo(b[0], b[1]);
      ctx.lineTo(b[0] - ux * 18 + uy * 10, b[1] - uy * 18 - ux * 10);
      ctx.stroke();
      ctx.restore();
    }
    // yellow ticks where hooks catch in this drawing
    if (catches && catches.length) {
      ctx.save();
      ctx.strokeStyle = P.annYellow;
      ctx.lineWidth = 2;
      for (const p of catches) {
        const sx = 540 + (p[0] - cam.x) * cam.z, sy = 960 + (p[1] - cam.y) * cam.z;
        if (sx < -20 || sx > 1100 || sy < -20 || sy > 1940) continue;
        ctx.beginPath();
        ctx.moveTo(sx + 7, sy);
        ctx.arc(sx, sy, 7, 0, TAU);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  // ---------------------------------------------------------------------------
  // Scene
  // ---------------------------------------------------------------------------
  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const t = clamp(tIn, 0, info.dur);
      const Tg = info.shot.start + t;
      const g = geo();
      const cam = camAt(t);
      const z = cam.z;
      const win = { x0: cam.x - 540 / z, x1: cam.x + 540 / z, y0: cam.y - 960 / z, y1: cam.y + 960 / z };
      const bi = L.boil(info.T);
      WIN = win;
      const sp = splitState(t);
      const iris = irisR(t);
      const full = iris === Infinity;

      // 1. paper, stripes behind layers 1 and 2 until the iris has covered the frame
      L.paper(ctx);
      const stripeA = full ? 0 : 1;
      if (stripeA > 0) {
        const zb = Math.pow(z, 0.3);
        const ax = cam.sx, ay = cam.sy;
        ctx.save();
        ctx.globalAlpha = stripeA;
        ctx.translate(ax, ay);
        ctx.scale(zb, zb);
        ctx.translate(-ax, -ay);
        L.stripes(ctx, {
          colors: [P.stripeCream, P.stripeSky], width: 140, angle: -0.52, offset: (Tg / 0.5) * 6, seed: sd('stripes'),
          bounds: { x: ax - ax / zb - 2, y: ay - ay / zb - 2, w: 1080 / zb + 4, h: 1920 / zb + 4 },
        });
        ctx.restore();
      }

      // 2-3. the G3 bird (layer 1, 09's drawing) until the layer-2 beat, then the right wing redrawn
      if (!full) {
        L.camera(ctx, { x: cam.x, y: cam.y, zoom: z }, (c) => {
          if (t < B_L2 - 1e-6) {
            drawG3Bird(c, L, bi);
          } else {
            const l2 = [0.35, 0.72, 1][Math.min(2, drawing(t, B_L2))];
            drawWingL2(c, g.R, z, win, l2, bi);
          }
        });
      }

      // 4. layer 3/4 lattice, opening as an iris from the target
      let catches = null;
      if (iris > 0) {
        const LT = g.LT;
        let lw = latticeWindow(cam, LT);
        if (!full) {
          // only the part of the lattice inside the iris
          const x0 = Math.max(0, cam.sx - iris), x1 = Math.min(1080, cam.sx + iris);
          const y0 = Math.max(0, cam.sy - iris), y1 = Math.min(1920, cam.sy + iris);
          lw = latticeWindow({ z, x: cam.x + ((x0 + x1) / 2 - 540) / z, y: cam.y + ((y0 + y1) / 2 - 960) / z, hw: (x1 - x0) / 2, hh: (y1 - y0) / 2 }, LT);
          ctx.save();
          ctx.beginPath();
          ctx.arc(cam.sx, cam.sy, iris, 0, TAU);
          ctx.clip();
        }
        L.camera(ctx, { x: cam.x, y: cam.y, zoom: z }, (c) => {
          catches = drawLattice(c, cam, t, bi, sp, lw);
        });
        if (!full) {
          ctx.restore();
          // the iris rim, a thin ink circle
          ctx.save();
          ctx.strokeStyle = P.inkSoft;
          ctx.globalAlpha = 0.6;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(cam.sx, cam.sy, iris, 0, TAU);
          ctx.stroke();
          ctx.restore();
        }
        cam.lt = LT;
      }

      // 5-6. construction and overlays
      drawConstruction(ctx, cam);
      drawOverlays(ctx, cam, t, sp, catches);
    },
  });
})();
