// Shot 09 first-flight: "First flight". Illustrated, global T 16.0 to 18.0 (2.0 s).
// On the midpoint downbeat a cream flash (core) reveals the juvenile already airborne above the
// boulder, seen from the beach looking up. It climbs toward the camera in four wingbeats on the
// beats and 8ths (16.0, 16.25, 16.5, 16.75), seen from above (grey upperwing, dark carpal bar,
// scaly fringed mantle), banks over on 17.0 and levels out belly to camera, and lands exactly on
// G3 on 17.5, holding to the end: shots 10 and 11 match-cut onto G3's pixels.
// The G3 bird lives in one function, drawG3Bird(ctx, L, bi, opts): at its default opts it draws
// the storyboard's G3 table on the exact pixels. Shot 11 copies it verbatim.
// Layers, back to front:
//   1. stripes (stripeCream / stripeSky), drifting 6 px a beat plus the tilt's parallax
//   2. under the camera tilt: sun and its rays, distant adult terns, perspective construction,
//      far shore hills with snow, the sea, the shingle beach (cached plate), the boulder with
//      lichen and moss, grit kicked up at take-off
//   3. screen-fixed construction: the G3 target circle through both wingtips
//   4. overlay under the bird: the annBlue trajectory from the boulder, beat ticks
//   5. the juvenile (drawG3Bird): above-view during the climb, below-view from the bank on
//   6. overlays: annBlue stroke arcs at the wingtips, annYellow + annMagenta rings on 16.5,
//      annYellow bank arc on 17.0, annYellow span rule on the hold
(function () {
  'use strict';
  const FILM = window.FILM;
  const L = FILM.lib;
  const ID = 'first-flight';
  const TAU = Math.PI * 2;
  const FR = 1 / 24;
  const EPS = 1e-6;

  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, u) => a + (b - a) * u;
  const sstep = (a, b, x) => {
    const u = clamp((x - a) / (b - a));
    return u * u * (3 - 2 * u);
  };
  const sd = (...k) => L.hash(ID, ...k) & 0x7fffffff;

  // beats, shot-local seconds
  const B_FLAP = [0, 0.25, 0.5, 0.75]; // T 16.0, 16.25, 16.5, 16.75: the four downstrokes
  const B_RING = 0.5; // T 16.5: yellow and magenta rings burst
  const B_BANK = 1.0; // T 17.0: the bank, the bird rolls belly to camera
  const B_LAND = 1.5; // T 17.5: exactly on G3, hold
  const D_BANK = 12; // drawing index (on twos) of the bank
  const D_LAND = 18; // drawing index of the landing on G3

  // ---------------------------------------------------------------------------
  // small drawing helpers
  // ---------------------------------------------------------------------------
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
  function ring(ctx, x, y, r, color, width, alpha) {
    if (alpha <= 0 || r <= 0) return;
    ctx.save();
    ctx.globalAlpha *= clamp(alpha);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
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
  // a closed blob with seeded radial wobble
  function blobPts(cx, cy, rx, ry, seed, n = 18, amt = 0.22, rot = 0) {
    const r = L.rng(seed);
    const out = [];
    const c = Math.cos(rot), s = Math.sin(rot);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      const k = 1 + (r() - 0.5) * 2 * amt;
      const x = Math.cos(a) * rx * k, y = Math.sin(a) * ry * k;
      out.push([cx + x * c - y * s, cy + x * s + y * c]);
    }
    return out;
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

  // ---------------------------------------------------------------------------
  // flight path: screen positions of the pose origin, drawings since the flash
  // ---------------------------------------------------------------------------
  const Q0 = [340, 1350], Q1 = [372, 1110], Q2 = [505, 985];
  const bez = (u) => [
    (1 - u) * (1 - u) * Q0[0] + 2 * (1 - u) * u * Q1[0] + u * u * Q2[0],
    (1 - u) * (1 - u) * Q0[1] + 2 * (1 - u) * u * Q1[1] + u * u * Q2[1],
  ];
  // how far one wingbeat's climb has gone after fraction f of it: most on the downstroke
  const surge = (f) => (f < 1 / 3 ? f * 3 * 0.55 : f < 2 / 3 ? 0.55 + (f - 1 / 3) * 3 * 0.3 : 0.85 + (f - 2 / 3) * 3 * 0.15);
  function flightAt(dc) {
    if (dc < D_BANK) {
      const k = Math.floor(dc / 3 + EPS), f = (dc - 3 * k) / 3;
      const u = (k + surge(f)) / 4;
      const p = bez(u);
      return { x: p[0], y: p[1], s: 0.35 + 0.5 * u, rot: lerp(0.2, 0.42, u) };
    }
    if (dc < D_LAND) {
      const e = L.ease.outCubic((dc - D_BANK) / (D_LAND - D_BANK));
      return { x: lerp(Q2[0], G3_ANCHOR[0], e), y: lerp(Q2[1], G3_ANCHOR[1], e), s: lerp(0.85, 1, e), rot: 0.42 * (1 - e) };
    }
    return { x: G3_ANCHOR[0], y: G3_ANCHOR[1], s: 1, rot: 0 };
  }
  // three drawings a wingbeat: spread on the beat (mid-downstroke), bottom of the stroke, flexed upstroke
  const FLAP = [
    { span: 1, sweep: 0, fold: 0, lift: 0 },
    { span: 0.78, sweep: -0.14, fold: 0, lift: 0.25 },
    { span: 0.64, sweep: 0.6, fold: 0.22, lift: -0.2 },
  ];
  // the bank: roll width and wing pose per drawing from 17.0
  const BANK = [
    { roll: 0.52, side: 'above', pose: { span: 0.96, sweep: 0.12, fold: 0, lift: 0 } },
    // no edge-on drawing: the roll cuts from the back at half width straight to the belly at half width
    { roll: 0.48, side: 'below', pose: { span: 0.92, sweep: 0.18, fold: 0.05, lift: 0 } },
    { roll: 0.68, side: 'below', pose: { span: 0.9, sweep: 0.2, fold: 0.06, lift: 0 } },
    { roll: 0.86, side: 'below', pose: { span: 0.95, sweep: 0.1, fold: 0, lift: 0 } },
    { roll: 0.96, side: 'below', pose: { span: 0.98, sweep: 0.05, fold: 0, lift: 0 } },
    { roll: 1, side: 'below', pose: { span: 1, sweep: 0.02, fold: 0, lift: 0 } },
  ];
  function birdState(d) {
    const f = flightAt(d);
    if (d < D_BANK) {
      const ph = d % 3;
      const bob = [0, -7, 5][ph] * f.s;
      return Object.assign(f, { y: f.y + bob, side: 'above', roll: 1, pose: FLAP[ph], ph });
    }
    if (d < D_LAND) return Object.assign(f, BANK[d - D_BANK], { ph: -1 });
    return Object.assign(f, { side: 'below', roll: 1, pose: null, ph: -1 });
  }

  // camera tilt: world content slides down 200 px as the camera looks up (T 16.0 to 17.5)
  const camDy = (t) => 200 * L.ease.inOutSine(clamp(t / B_LAND));

  // ---------------------------------------------------------------------------
  // background geometry (frame-0 screen coordinates; the camera moves it down)
  // ---------------------------------------------------------------------------
  const HILLS = [[-40, 1556], [40, 1528], [120, 1538], [205, 1506], [280, 1518], [350, 1494], [430, 1512], [520, 1500], [600, 1486], [680, 1508], [760, 1480], [850, 1497], [930, 1470], [1010, 1492], [1120, 1520]];
  const SEA_TOP = 1556, SEA_BOT = 1652;
  const BOULDER = [[118, 1660], [124, 1590], [146, 1528], [186, 1482], [246, 1452], [318, 1440], [388, 1450], [440, 1478], [474, 1524], [490, 1590], [484, 1660]];
  const BOULDER_DY = 50;
  const SUN = [860, 330];
  const VP = [540, -900];

  let BG = null;
  function bgGeo() {
    if (BG) return BG;
    const r = L.rng(sd('bg'));
    const hills = L.smoothPts(HILLS, false, 8);
    const hillPoly = hills.concat([[1120, SEA_TOP + 2], [-40, SEA_TOP + 2]]);
    // snow streaks down from the peaks
    const snow = [];
    for (let i = 1; i < HILLS.length - 1; i++) {
      const pk = HILLS[i];
      if (pk[1] > 1505) continue;
      for (let k = 0; k < 5; k++) {
        const dir = k % 2 ? 1 : -1;
        const x0 = pk[0] + dir * (3 + k * 5 + r() * 4), y0 = pk[1] + 4 + k * 2 + r() * 3;
        const len = 8 + r() * 18;
        snow.push([[x0, y0], [x0 + dir * len * 0.9, y0 + len * 0.55], [x0 + dir * len * 1.2, y0 + len]]);
      }
    }
    // lichen crusts and moss on the boulder
    const lichen = [];
    for (let i = 0; i < 7; i++) {
      const cx = 170 + r() * 280, cy = 1480 + r() * 130;
      if (!L.polyContains(BOULDER, cx, cy)) continue;
      lichen.push(blobPts(cx, cy, 10 + r() * 22, 6 + r() * 12, sd('lichen', i), 16, 0.35, r() * 0.6 - 0.3));
    }
    const cracks = [
      [[250, 1470], [262, 1500], [256, 1530], [270, 1566]],
      [[392, 1462], [384, 1492], [398, 1520]],
      [[330, 1560], [352, 1590], [348, 1630]],
      [[160, 1560], [180, 1585], [176, 1620]],
    ];
    // distant adults circling (frame-0 positions, spans, drift px/s, phase)
    const terns = [
      { x: 150, y: 400, span: 54, vx: 34, vy: -8, ph: 0 },
      { x: 930, y: 1150, span: 40, vx: -26, vy: -10, ph: 1 },
      { x: 700, y: 230, span: 32, vx: 18, vy: 6, ph: 2 },
      { x: 90, y: 1230, span: 26, vx: 22, vy: -4, ph: 1 },
      { x: 470, y: 150, span: 22, vx: -14, vy: 4, ph: 0 },
      { x: 1000, y: 560, span: 28, vx: -20, vy: -6, ph: 2 },
    ];
    // grit kicked off the boulder top at take-off
    const grit = [];
    for (let i = 0; i < 22; i++) grit.push({ x: 280 + r() * 110, y: 1442 + r() * 6, vx: (r() - 0.35) * 170, vy: -60 - r() * 160, rad: 1.2 + r() * 2.2, c: r() });
    // flat low clouds (frame-0 positions)
    const clouds = [
      { x: 780, y: 1392, w: 320, h: 44 },
      { x: 130, y: 1140, w: 220, h: 34 },
      { x: 960, y: 820, w: 170, h: 28 },
    ].map((c, i) => {
      const pts = [];
      const rc = L.rng(sd('cloud', i));
      // a flat underside, a lumpy top of overlapping arcs
      const n = 5 + Math.floor(rc() * 3);
      pts.push([c.x - c.w / 2, c.y]);
      for (let k = 0; k <= n; k++) {
        const u = k / n;
        const bump = Math.sin(Math.PI * u) * c.h * (0.6 + rc() * 0.6);
        pts.push([c.x - c.w / 2 + c.w * u, c.y - bump - c.h * 0.15]);
      }
      pts.push([c.x + c.w / 2, c.y]);
      return { pts: L.smoothPts(pts, true, 6), base: [[c.x - c.w / 2 + 10, c.y], [c.x + c.w / 2 - 10, c.y]], c };
    });
    BG = { hills, hillPoly, snow, lichen, cracks, terns, grit, clouds };
    return BG;
  }

  // the shingle beach plate: t-independent, cached per render scale
  const BEACH_Y0 = 1636, BEACH_H = 300;
  function beachPlate(P) {
    const S = FILM.S || 1;
    return L.cached(['ff-beach', S].join('|'), () => {
      const c = FILM.makeCanvas(Math.ceil(1080 * S), Math.ceil(BEACH_H * S));
      const g = c.getContext('2d');
      g.scale(S, S);
      g.translate(0, -BEACH_Y0);
      g.fillStyle = P.shingle;
      g.fillRect(0, BEACH_Y0, 1080, BEACH_H);
      const r = L.rng(sd('beach'));
      const peb = [];
      for (let i = 0; i < 520; i++) {
        const v = Math.pow(r(), 0.8);
        const y = BEACH_Y0 + 8 + v * (BEACH_H - 20);
        const size = lerp(4, 20, (y - BEACH_Y0) / BEACH_H);
        peb.push({ x: r() * 1100 - 10, y, rx: size * (0.8 + r() * 0.6), ry: size * (0.45 + r() * 0.25), a: (r() - 0.5) * 0.5, c: r(), l: r() });
      }
      peb.sort((a, b) => a.y - b.y);
      const cols = [P.shinglePale, P.shingle, P.shingleDeep, P.shinglePale, P.eggPale];
      for (const p of peb) {
        g.save();
        g.translate(p.x, p.y);
        g.rotate(p.a);
        g.beginPath();
        g.ellipse(0, 0, p.rx, p.ry, 0, 0, TAU);
        g.fillStyle = cols[Math.floor(p.c * cols.length)];
        g.fill();
        // shadow crescent lower right
        g.save();
        g.clip();
        g.beginPath();
        g.ellipse(p.rx * 0.35, p.ry * 0.45, p.rx, p.ry, 0, 0, TAU);
        g.ellipse(-p.rx * 0.1, -p.ry * 0.1, p.rx * 0.95, p.ry * 0.9, 0, 0, TAU, true);
        g.globalAlpha = 0.55;
        g.fillStyle = P.shingleDeep;
        g.fill('evenodd');
        g.restore();
        if (p.l < 0.08) {
          g.globalAlpha = 0.9;
          g.fillStyle = P.lichen;
          g.beginPath();
          g.ellipse(-p.rx * 0.25, -p.ry * 0.2, p.rx * 0.35, p.ry * 0.3, 0, 0, TAU);
          g.fill();
        }
        g.globalAlpha = 0.55;
        g.strokeStyle = P.inkSoft;
        g.lineWidth = 1;
        g.beginPath();
        g.ellipse(0, 0, p.rx, p.ry, 0, 0, TAU);
        g.stroke();
        g.restore();
      }
      // a line of shadow at the top of the beach where it meets the sea
      L.hatch(g, [[0, BEACH_Y0], [1080, BEACH_Y0], [1080, BEACH_Y0 + 30], [0, BEACH_Y0 + 30]], { angle: -Math.PI / 4, spacing: 8, width: 1.2, color: P.shingleDeep, alpha: 0.6, seed: sd('beachH'), boil: false });
      return c;
    });
  }

  function drawDistantTern(ctx, P, x, y, span, flap, seed, bi) {
    // a small adult seen from below: M-shaped wings, a slim body, streamers
    const h = span / 2;
    const up = [-0.34, 0.05, 0.26][flap];
    const pts = [
      [x - h, y + h * up],
      [x - h * 0.45, y - h * 0.18 + h * up * 0.3],
      [x, y],
      [x + h * 0.45, y - h * 0.18 + h * up * 0.3],
      [x + h, y + h * up],
    ];
    L.inkPath(ctx, pts, { width: Math.max(1.8, span * 0.06), color: P.ink, seed, boil: bi, taper: [3, 3], smooth: true, wobble: 0.5 });
    L.inkPath(ctx, [[x, y - h * 0.18], [x, y + h * 0.28]], { width: Math.max(2.2, span * 0.08), color: P.ink, seed: seed + 1, boil: bi, taper: [2, 2], smooth: false, wobble: 0.3 });
    strokeMany(ctx, [[[x, y + h * 0.26], [x - h * 0.14, y + h * 0.52]], [[x, y + h * 0.26], [x + h * 0.14, y + h * 0.52]]], P.ink, 1.2, 0.9);
    // the red bill of an adult, a dot of colour
    strokePts(ctx, [[x, y - h * 0.2], [x, y - h * 0.3]], P.billRed, Math.max(1.6, span * 0.05), 1);
  }

  // a parent (adult, breeding plumage) escorting the first flight, seen from below at small scale:
  // the G3 wing table, a black cap at the head sides, a blood-red bill, long streamers
  const PARENT = { x: 250, y: 780, vx: -70, vy: -250, s: 0.2, rot: -0.3 };
  function drawParent(ctx, P, tw, bi) {
    const G = g3Geo();
    const d = Math.floor(tw * 12 + EPS);
    const pose = FLAP[(d + 1) % 3];
    const X0 = PARENT.x + PARENT.vx * tw, Y0 = PARENT.y + PARENT.vy * tw;
    const c = Math.cos(PARENT.rot), sn = Math.sin(PARENT.rot), k = PARENT.s;
    const mp = (q, warp) => {
      const w = warp ? g3Warp(q[0], q[1], pose) : q;
      const lx = (w[0] - 540) * k, ly = (w[1] - 860) * k;
      return [X0 + lx * c - ly * sn, Y0 + lx * sn + ly * c];
    };
    const mpa = (a, w) => a.map((q) => mp(q, w));
    const tail = mpa([[524, 1004], [512, 1080], [490, 1250], [520, 1120], [540, 1095], [560, 1120], [590, 1250], [568, 1080], [556, 1004]], false);
    fillPoly(ctx, tail, P.plumeWhite);
    L.inkPath(ctx, tail, { closed: true, width: 1.6, color: P.ink, seed: sd('ptail'), boil: bi, taper: [2, 3], wobble: 0.6 });
    for (const W of G.wings) {
      const wing = mpa(W.wing, true);
      fillPoly(ctx, wing, P.primaryGlow);
      fillPoly(ctx, mpa(W.coverts, true), P.plumeWhite);
      strokeMany(ctx, W.prim.map((F) => mpa(F.rachis, true)), P.mantleDeep, 1, 0.7);
      L.inkPath(ctx, mpa(W.handTE.slice(2), true), { width: 2.2, color: P.capBlack, seed: sd('pte', W.s), boil: bi, taper: [2, 3], wobble: 0.5 });
      L.inkPath(ctx, wing, { closed: true, width: 2, color: P.ink, seed: sd('pw', W.s), boil: bi, taper: [2, 3], wobble: 0.6 });
    }
    const body = mpa(G.body, false);
    fillPoly(ctx, body, P.breastGrey);
    for (const s of [-1, 1]) fillPoly(ctx, mpa([[540 + s * 34, 672], [540 + s * 35, 700], [540 + s * 24, 722], [540 + s * 20, 690]], false), P.capBlack);
    L.inkPath(ctx, body, { closed: true, width: 2, color: P.ink, seed: sd('pb'), boil: bi, taper: [2, 3], wobble: 0.6 });
    const bill = mpa([[532, 664], [540, 600], [548, 664]], false);
    fillPoly(ctx, bill, P.billRed);
    strokePts(ctx, bill, P.billDeep, 1, 1, null, true);
  }

  function drawClouds(ctx, P, B, bi) {
    B.clouds.forEach((cl, i) => {
      fillPoly(ctx, cl.pts, P.white, 0.92);
      L.hatch(ctx, cl.pts, { angle: 0, spacing: 6, width: 1.1, color: P.iceDeep, alpha: 0.6, density: (x, y) => clamp((y - (cl.c.y - cl.c.h * 0.5)) / (cl.c.h * 0.5)), length: [14, 40], gap: [4, 10], seed: sd('cloudH', i), boil: bi });
      L.inkPath(ctx, cl.pts, { closed: true, width: 2, color: P.inkSoft, alpha: 0.85, seed: sd('cloudL', i), boil: bi, taper: [4, 8] });
    });
  }

  function drawWorld(ctx, P, t, tw, bi, Tg) {
    const B = bgGeo();
    // sun: flat disc, 12 ink ray ticks
    const sx = SUN[0], sy = SUN[1];
    L.inkCircle(ctx, sx, sy, 40, { width: 3, color: P.ink, fill: P.sun, seed: sd('sun'), boil: bi });
    const rays = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU + 0.13;
      const r0 = 54, r1 = i % 2 ? 70 : 80;
      rays.push([[sx + Math.cos(a) * r0, sy + Math.sin(a) * r0], [sx + Math.cos(a) * r1, sy + Math.sin(a) * r1]]);
    }
    rays.forEach((ln, i) => L.inkPath(ctx, ln, { width: 2.4, color: P.ink, seed: sd('ray', i), boil: bi, taper: [2, 4], smooth: false }));
    L.hatch(ctx, L.ellipsePts(sx, sy, 40, 40, 40), { angle: -Math.PI / 4, spacing: 7, width: 1.2, color: P.ochre, alpha: 0.7, density: (x, y) => clamp(((x - sx) + (y - sy)) / 50 + 0.2), seed: sd('sunH'), boil: bi });

    // perspective construction: rays from the ground up to a vanishing point far above, a horizon line
    const cons = [];
    for (let i = -3; i <= 9; i++) {
      const gx = -160 + i * 150;
      cons.push([[gx, 1960], [lerp(gx, VP[0], 0.72), lerp(1960, VP[1], 0.72)]]);
    }
    strokeMany(ctx, cons, P.inkFaint, 1.5, 0.22);
    strokePts(ctx, [[0, SEA_TOP], [1080, SEA_TOP]], P.inkFaint, 1.5, 0.3);

    drawClouds(ctx, P, B, bi);
    // distant adults, flapping on twos
    B.terns.forEach((d, i) => {
      const flap = (Math.floor(tw * 12 + EPS) + d.ph) % 3;
      drawDistantTern(ctx, P, d.x + d.vx * tw, d.y + d.vy * tw, d.span, flap, sd('tern', i), bi);
    });
    drawParent(ctx, P, tw, bi);

    // far shore hills with snow
    fillPoly(ctx, B.hillPoly, P.moss, 0.55);
    L.hatch(ctx, B.hillPoly, { angle: -Math.PI / 4, spacing: 8, width: 1.2, color: P.mossDeep, alpha: 0.6, density: (x, y) => clamp((y - 1500) / 50), length: [10, 28], seed: sd('hillH'), boil: bi });
    strokeMany(ctx, B.snow, P.ice, 3.2, 1);
    L.inkPath(ctx, B.hills, { width: 2.5, color: P.inkSoft, seed: sd('hills'), boil: bi, taper: [2, 2] });

    // the sea
    const seaPoly = [[0, SEA_TOP], [1080, SEA_TOP], [1080, SEA_BOT], [0, SEA_BOT]];
    fillPoly(ctx, seaPoly, P.sea);
    L.hatch(ctx, seaPoly, { angle: 0, spacing: 7, width: 1.3, color: P.seaDeep, alpha: 0.8, density: (x, y) => clamp(0.35 + (SEA_BOT - y) / 140), length: [18, 70], gap: [6, 16], seed: sd('seaH'), boil: bi });
    // sun glitter under the sun
    const glit = [];
    for (let i = 0; i < 12; i++) {
      const y = SEA_TOP + 8 + i * 7.5;
      const w = 8 + i * 2.2;
      const x = SUN[0] + (L.h3(i, bi, sd('glit')) - 0.5) * 40;
      glit.push([[x - w / 2, y], [x + w / 2, y]]);
    }
    strokeMany(ctx, glit, P.foam, 2.4, 0.95);
    // surf lines at the shore
    const surf = [];
    for (let k = 0; k < 3; k++) {
      const pts = [];
      for (let x = -10; x <= 1090; x += 30) pts.push([x, SEA_BOT - 4 - k * 9 + Math.sin(x * 0.02 + k * 1.7) * 2.5]);
      surf.push(pts);
    }
    strokeMany(ctx, surf, P.foam, 2.2, 0.9);

    // the beach
    const plate = beachPlate(P);
    ctx.drawImage(plate, 0, BEACH_Y0, 1080, BEACH_H);

    // the boulder sits BOULDER_DY lower than its table so the bird's tail clears it at take-off
    ctx.save();
    ctx.translate(0, BOULDER_DY);
    // the boulder's shadow on the shingle (lower right)
    const shadow = blobPts(410, 1668, 170, 24, sd('bshadow'), 20, 0.1);
    fillPoly(ctx, shadow, P.shingleDeep, 0.55);
    L.hatch(ctx, shadow, { angle: -Math.PI / 4, spacing: 6, width: 1.2, color: P.ink, alpha: 0.45, length: [8, 20], seed: sd('bsh'), boil: bi });

    // the boulder: lit upper left, hatched lower right, lichen, moss at the foot
    fillPoly(ctx, BOULDER, P.shingle);
    fillPoly(ctx, [[150, 1540], [178, 1492], [240, 1460], [318, 1450], [300, 1486], [236, 1510], [180, 1560]], P.shinglePale, 0.9);
    L.crossHatch(ctx, BOULDER, {
      tone: 1, spacing: 6, crossSpacing: 7, width: 1.3, color: P.shingleDeep, alpha: 0.9,
      density: (x, y) => clamp(((x - 200) / 300) * 0.7 + ((y - 1460) / 200) * 0.55 - 0.15),
      length: [12, 34], seed: sd('boulderH'), boil: bi,
    });
    L.hatch(ctx, BOULDER, { angle: -Math.PI / 4, spacing: 5, width: 1.3, color: P.ink, alpha: 0.55, density: (x, y) => clamp((x - 400) / 80 + (y - 1600) / 80), length: [8, 22], seed: sd('boulderD'), boil: bi });
    B.lichen.forEach((pts, i) => {
      fillPoly(ctx, pts, P.lichen, 0.95);
      L.stipple(ctx, pts, { spacing: 4.5, r: [0.8, 1.6], color: P.ochre, alpha: 0.9, seed: sd('lichS', i), boil: bi });
      strokePts(ctx, pts, P.inkSoft, 1, 0.6, null, true);
    });
    B.cracks.forEach((c, i) => L.inkPath(ctx, c, { width: 1.8, color: P.inkSoft, alpha: 0.9, seed: sd('crack', i), boil: bi, taper: [4, 8] }));
    L.inkPath(ctx, BOULDER, { width: 3, color: P.ink, seed: sd('boulder'), boil: bi, taper: [6, 6] });
    // moss tufts at the foot
    const moss = [];
    for (let i = 0; i < 26; i++) {
      const x = 124 + i * 14 + (L.h3(i, 0, sd('mossx')) - 0.5) * 8;
      const h = 8 + L.h3(i, 1, sd('mossx')) * 14;
      const lean = (L.h3(i, 2, sd('mossx')) - 0.5) * 8 + (L.h3(i, bi, sd('mossb')) - 0.5) * 1.6;
      moss.push([[x, 1662], [x + lean * 0.5, 1662 - h * 0.6], [x + lean, 1662 - h]]);
    }
    strokeMany(ctx, moss, P.mossDeep, 2.2, 1);
    strokeMany(ctx, moss.map((m) => m.map((q) => [q[0] + 2, q[1] + 1])), P.moss, 1.4, 1);

    ctx.restore();

    // grit kicked off the boulder top by the first downstroke, on twos
    if (tw < 0.5) {
      const dots = [];
      for (const g of B.grit) {
        const x = g.x + g.vx * tw, y = g.y + BOULDER_DY + g.vy * tw + 0.5 * 900 * tw * tw;
        dots.push([x, y, g.rad * (1 - tw * 0.8), g.c]);
      }
      ctx.save();
      ctx.globalAlpha = 1 - tw * 1.6;
      ctx.fillStyle = P.shingleDeep;
      ctx.beginPath();
      for (const d of dots) {
        ctx.moveTo(d[0] + d[2], d[1]);
        ctx.arc(d[0], d[1], d[2], 0, TAU);
      }
      ctx.fill();
      ctx.restore();
    }
    void Tg;
  }

  // ---------------------------------------------------------------------------
  // timing helpers
  // ---------------------------------------------------------------------------
  const makeTiming = (t) => ({
    drawing: (a) => Math.floor((t - a) * 12 + 1e-6),
    hit: (a, frames, e, lead = 1) => (t < a - EPS ? 0 : (e || ((u) => u))(clamp((t - a) / (frames * FR) + lead / frames))),
  });

  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const t = clamp(tIn, 0, info.dur);
      const P = L.pal;
      const tw = L.onTwos(t);
      const d = Math.min(24, Math.floor(t * 12 + EPS));
      const bi = L.boil(info.T);
      const Tg = info.shot.start + t;
      const { hit } = makeTiming(t);
      const dy = camDy(t);
      const st = birdState(d);

      // 1. stripes: drift 6 px a beat, plus a little parallax with the tilt
      L.stripes(ctx, { colors: [P.stripeCream, P.stripeSky], width: 140, angle: -0.52, offset: Tg * 12 + dy * 0.3 });

      // 2. the world under the tilting camera (authored in frame-0 screen coordinates)
      L.camera(ctx, { x: 540, y: 960 - dy }, () => drawWorld(ctx, P, t, tw, bi, Tg));

      // 3. screen-fixed construction: the G3 target circle through both wingtips, crosshair on the anchor
      const conA = 0.2 + 0.12 * sstep(0.9, 1.5, t);
      L.guideCircle(ctx, 540, 860, 462, { color: P.inkFaint, alpha: conA, width: 1.5, cross: 14, quadrants: 10, ink: true, seed: sd('gc'), boil: bi });
      strokeMany(ctx, [[[540, 560], [540, 1250]], [[60, 860], [1020, 860]]], P.inkFaint, 1.5, conA * 0.9);

      // 4. trajectory from the boulder up to the bird, drawn on behind it (24 fps), in world space
      const trail = [[330, 1446 + BOULDER_DY + dy]];
      const tEnd = Math.min(t, B_LAND);
      for (let tau = 0; tau <= tEnd + 1e-9; tau += 1 / 48) {
        const f = flightAt(tau * 12);
        trail.push([f.x, f.y - camDy(tau) + dy]);
      }
      const fEnd = flightAt(Math.min(t, B_LAND) * 12);
      trail.push([fEnd.x, fEnd.y - camDy(tEnd) + dy]);
      strokePts(ctx, L.smoothPts(trail, false, 6), P.annBlue, 2.5, 1);
      // a tick ring on the trajectory at each downstroke
      B_FLAP.forEach((b) => {
        if (t < b - EPS) return;
        const f = flightAt(b * 12);
        const q = hit(b, 6, L.ease.outBack);
        ring(ctx, f.x, f.y - camDy(b) + dy, 6 * q, P.annBlue, 2, 1);
      });

      // 5. the juvenile
      const detail = clamp((st.s - 0.3) / 0.45);
      drawG3Bird(ctx, L, bi, { x: st.x, y: st.y, s: st.s, rot: st.rot, roll: st.roll, side: st.side, pose: st.pose, detail: 0.35 + 0.65 * detail });

      // 6. overlays
      // stroke arcs trailing the wingtips on each downstroke (the bottom-of-stroke drawing and the next)
      if (st.ph === 1 || st.ph === 2) {
        const f = flightAt(d);
        const c = Math.cos(f.rot), s = Math.sin(f.rot);
        const tipAt = (pose, sgn) => {
          const w = g3Warp(sgn < 0 ? 80 : 1000, 850, pose);
          const lx = (w[0] - 540) * f.s, ly = (w[1] - 860) * f.s;
          return [st.x + lx * c - ly * s, st.y + lx * s + ly * c];
        };
        const mid = { span: 0.9, sweep: -0.08, fold: 0, lift: 0.1 };
        for (const sgn of [-1, 1]) {
          const a = tipAt(FLAP[0], sgn), m = tipAt(mid, sgn), b = tipAt(FLAP[1], sgn);
          const off = 16 * sgn;
          const arc = L.smoothPts([[a[0] + off, a[1] - 12], [m[0] + off, m[1] - 8], [b[0] + off, b[1] - 4]], false, 4);
          strokePts(ctx, arc, P.annBlue, 2.5, st.ph === 1 ? 1 : 0.45);
          strokePts(ctx, arc.map((q) => [q[0] + off * 0.8, q[1] + 6]), P.annBlue, 2, st.ph === 1 ? 0.8 : 0.3);
        }
      }
      // rings burst from the bird on T 16.5
      if (t >= B_RING - EPS && t < B_RING + 0.6) {
        const f = birdState(Math.floor(B_RING * 12 + EPS));
        const qy = hit(B_RING, 10, null);
        ring(ctx, f.x, f.y, 30 + 250 * L.ease.outExpo(qy), P.annYellow, 3, 1 - qy);
        const qm = hit(B_RING + 2 * FR, 12, null, 1);
        if (t >= B_RING + 2 * FR - EPS) ring(ctx, f.x, f.y, 20 + 360 * L.ease.outExpo(qm), P.annMagenta, 3, 1 - qm);
      }
      // the bank on T 17.0: an arc with an arrow rolling round the body
      if (t >= B_BANK - EPS && t < B_BANK + 0.5) {
        const on = hit(B_BANK, 6, L.ease.outExpo);
        const fade = 1 - clamp((t - B_BANK - 0.25) / 0.25);
        const f = flightAt(Math.floor(t * 12 + EPS));
        L.arcAnnotation(ctx, f.x, f.y + 40, 150 * f.s + 40, Math.PI * 0.95, Math.PI * 0.05, { color: P.annYellow, width: 2.5, p: on, arrow: 14, endTicks: 8, alpha: fade });
      }
      // on the hold: a span rule under the bird, tip to tip
      if (t >= B_LAND - EPS) {
        const on = hit(B_LAND, 6, L.ease.outExpo);
        const h = 460 * on;
        const yR = 1290;
        const lines = [[[540 - h, yR], [540 + h, yR]]];
        if (on > 0.98) {
          lines.push([[80, yR - 14], [80, yR + 14]], [[1000, yR - 14], [1000, yR + 14]]);
          for (let i = 1; i < 10; i++) {
            const x = 80 + i * 92;
            lines.push([[x, yR], [x, yR - (i === 5 ? 20 : 10)]]);
          }
        }
        strokeMany(ctx, lines, P.annYellow, 2, 1);
        strokeMany(ctx, [[[80, 870], [80, yR - 16]], [[1000, 870], [1000, yR - 16]]], P.annYellow, 1.5, 0.6 * on);
      }
    },
  });
})();
