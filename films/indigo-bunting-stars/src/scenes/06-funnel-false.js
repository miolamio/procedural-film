// 06 funnel-false — Footprints away from Betelgeuse. T 8.5 to 10.
// 04's funnel with the world turned: the accent marker on Betelgeuse's side (G3 poleFalse), the
// prints gather on the opposite wall toward G3 clusterFalse; hops on T 9.0 and 9.5.
// The FUNNEL block is copied verbatim from 04-funnel-autumn.js (its owner).
// Layers, back to front: 1 plate, 2 dust, 3 guide circles, 4 radial rules, 5 paper specks, 6 ink pad,
// 7 lip, rim and ticks, 8 pole axis and marker (accent), 9 smudges and prints, 10 the bird,
// 11 the see-through mesh, 12 the bracket. The timeline's grade inverts the frame (plate B).
(function () {
  'use strict';
  const FILM = window.FILM;
  const ID = 'funnel-false';

  // ==== WORLD ==== (verbatim in 02, 03, 07; owner 01-first-summer.js; docs/storyboard.md "World")
  const WORLD = (() => {
    const LIB = FILM.lib;
    const P = LIB.pal;
    const TAU = Math.PI * 2;
    const DEG = Math.PI / 180;
    const cl = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
    const lerp = (a, b, u) => a + (b - a) * u;
    const G1 = LIB.geo('G1');
    const POLE = G1.pt('polaris');

    // the sky's turn, counter-clockwise on screen (storyboard World, "Turn")
    function phi(T) {
      if (T < 2) return 0;
      if (T < 4) return 40 * DEG * LIB.ease.inOutSine((T - 2) / 2);
      if (T < 5.5) return 40 * DEG + 4 * DEG * ((T - 4) / 1.5);
      if (T < 10) return 44 * DEG;
      return -6 * DEG + 6 * DEG * ((T - 10) / 2); // ends on 01's phi 0, so the loop seam holds
    }
    // a sky point at turn angle a (y-down: a negative rotation is counter-clockwise)
    function turn(p, a, c = POLE) {
      const s = Math.sin(-a), co = Math.cos(-a);
      const dx = p[0] - c[0], dy = p[1] - c[1];
      return [c[0] + dx * co - dy * s, c[1] + dx * s + dy * co];
    }

    // named stars: radius by rough brightness (Polaris is ordinary: 10.3)
    const MAG = {
      polaris: 2.6, dubhe: 2.9, merak: 2.6, phecda: 2.4, megrez: 1.9, alioth: 2.9, mizar: 2.7, alkaid: 2.8,
      kochab: 2.7, pherkad: 2.2, yildun: 1.6, epsUMi: 1.8, zetaUMi: 1.9, etaUMi: 1.7,
      caph: 2.4, schedar: 2.7, gammaCas: 2.8, ruchbah: 2.3, segin: 2, thubanDra: 2,
      eltanin: 2.6, rastaban: 2.2, alderamin: 2.4, capella: 3,
    };
    const NAMED = Object.keys(MAG).map((n) => ({ n, p: G1.pt(n), r: MAG[n] }));
    const BIG = [['alkaid', 'mizar'], ['mizar', 'alioth'], ['alioth', 'megrez'], ['megrez', 'dubhe'], ['dubhe', 'merak'], ['merak', 'phecda'], ['phecda', 'megrez']];
    const LITTLE = [['polaris', 'yildun'], ['yildun', 'epsUMi'], ['epsUMi', 'zetaUMi'], ['zetaUMi', 'etaUMi'], ['etaUMi', 'pherkad'], ['pherkad', 'kochab'], ['kochab', 'zetaUMi']];
    const CAS = [['caph', 'schedar'], ['schedar', 'gammaCas'], ['gammaCas', 'ruchbah'], ['ruchbah', 'segin']];

    // 420 background stars on a disc of radius 1500 about Polaris
    const FIELD = (() => {
      const out = [];
      for (let i = 0; i < 420; i++) {
        const r = LIB.rng(LIB.hash('sky', i));
        const rad = 1500 * Math.sqrt(r()), a = r() * TAU;
        const m = r();
        out.push({ p: [POLE[0] + rad * Math.cos(a), POLE[1] + rad * Math.sin(a)], r: 0.6 + 1.6 * m * m, a: 0.25 + 0.6 * r(), tw: r() * TAU });
      }
      return out;
    })();
    // the Milky Way: 1600 faint motes in a soft band from beyond Capella up through Cassiopeia
    const BAND_AXIS = [[1420, 1300], [1550, 931], [1640, 600], [1700, 290], [1690, -40], [1600, -400]];
    const BAND = (() => {
      const out = [];
      const segs = BAND_AXIS.length - 1;
      for (let i = 0; i < 2600; i++) {
        const r = LIB.rng(LIB.hash('band', i));
        const u = r() * segs, j = Math.min(segs - 1, Math.floor(u)), f = u - j;
        const A = BAND_AXIS[j], B = BAND_AXIS[j + 1];
        const tx = B[0] - A[0], ty = B[1] - A[1], tl = Math.hypot(tx, ty);
        const g = (r() + r() + r() - 1.5) * 1.4; // soft gaussian across the band
        const w = 120 * g;
        out.push({ p: [lerp(A[0], B[0], f) - (ty / tl) * w, lerp(A[1], B[1], f) + (tx / tl) * w], r: 0.5 + 0.7 * r(), a: 0.18 * (1 - Math.abs(g) / 2.2) * (0.4 + r()) });
      }
      return out;
    })();
    function drawBand(ctx, a, k = 1) {
      const paths = [new Path2D(), new Path2D(), new Path2D()];
      for (const s of BAND) {
        const q = turn(s.p, a);
        if (q[0] < -4 || q[0] > 1924 || q[1] < -4 || q[1] > 1084) continue;
        const b = Math.min(2, Math.floor((s.a / 0.25) * 3));
        paths[b].rect(q[0] - s.r, q[1] - s.r, 2 * s.r, 2 * s.r);
      }
      ctx.fillStyle = P.dust;
      paths.forEach((p, b) => { ctx.globalAlpha = ((b + 0.5) / 3) * 0.85 * k; ctx.fill(p); });
      ctx.globalAlpha = 1;
    }

    // the permanent instrument's guides: two faint circles about Polaris and two long diagonals
    function drawGuides(ctx, a, k = 1) {
      if (k <= 0.001) return;
      ctx.save();
      ctx.lineWidth = 1;
      ctx.strokeStyle = P.lineFaint;
      ctx.globalAlpha = 0.16 * k;
      for (const r of [470, 820]) { ctx.beginPath(); ctx.arc(POLE[0], POLE[1], r, 0, TAU); ctx.stroke(); }
      ctx.globalAlpha = 0.14 * k;
      for (const d of [150.6 * DEG - a, 38 * DEG - a]) {
        ctx.beginPath();
        ctx.moveTo(POLE[0] - Math.cos(d) * 2400, POLE[1] - Math.sin(d) * 2400);
        ctx.lineTo(POLE[0] + Math.cos(d) * 2400, POLE[1] + Math.sin(d) * 2400);
        ctx.stroke();
      }
      // ticks every 10 deg on the inner circle, turning with the sky
      ctx.globalAlpha = 0.3 * k;
      ctx.strokeStyle = P.lineSoft;
      ctx.beginPath();
      for (let i = 0; i < 36; i++) {
        const q = i * 10 * DEG - a, L = i % 6 === 0 ? 16 : 8;
        ctx.moveTo(POLE[0] + Math.cos(q) * 470, POLE[1] + Math.sin(q) * 470);
        ctx.lineTo(POLE[0] + Math.cos(q) * (470 - L), POLE[1] + Math.sin(q) * (470 - L));
      }
      ctx.stroke();
      ctx.restore();
    }

    // ---------------------------------------------------------------- 1 plate
    function drawPlate(ctx) {
      const w = Math.max(1, Math.round(ctx.canvas.width)), h = Math.max(1, Math.round(ctx.canvas.height));
      const plate = LIB.cached('ibs-plate-' + w + 'x' + h, () => {
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const g = c.getContext('2d');
        g.scale(w / 1920, h / 1080);
        g.fillStyle = P.void; g.fillRect(0, 0, 1920, 1080);
        const lift = g.createRadialGradient(900, 500, 0, 900, 500, 900);
        lift.addColorStop(0, LIB.rgba(P.voidLift, 1));
        lift.addColorStop(1, LIB.rgba(P.voidLift, 0));
        g.fillStyle = lift; g.fillRect(0, 0, 1920, 1080);
        const vig = g.createRadialGradient(960, 540, 700, 960, 540, 1250);
        vig.addColorStop(0, LIB.rgba(P.voidEdge, 0));
        vig.addColorStop(1, LIB.rgba(P.voidEdge, 0.85));
        g.fillStyle = vig; g.fillRect(0, 0, 1920, 1080);
        return c;
      });
      ctx.drawImage(plate, 0, 0, 1920, 1080);
    }

    // ---------------------------------------------------------------- 2 dust
    const DUST = (() => {
      const rnd = LIB.rng(LIB.hash('ibs-dust'));
      const out = [];
      for (let i = 0; i < 140; i++) out.push({ x: rnd() * 1920, y: rnd() * 1080, vx: (rnd() - 0.5) * 8, vy: (rnd() - 0.5) * 5, r: 0.6 + rnd() * rnd(), a: 0.1 + rnd() * 0.25, s: i });
      return out;
    })();
    function drawDust(ctx, T, k = 1) {
      const bi = LIB.boil(T);
      ctx.fillStyle = P.dust;
      for (const d of DUST) {
        const x = ((d.x + d.vx * T) % 1920 + 1920) % 1920;
        const y = ((d.y + d.vy * T) % 1080 + 1080) % 1080;
        ctx.globalAlpha = d.a * (0.7 + 0.3 * Math.sin(bi * 1.7 + d.s * 2.3)) * k;
        ctx.fillRect(x - d.r, y - d.r, 2 * d.r, 2 * d.r);
      }
      ctx.globalAlpha = 1;
    }

    // ---------------------------------------------------------------- 3 background stars
    // batched into 4 alpha buckets; twinkle on the 12 fps boil clock
    function drawField(ctx, T, a, k = 1) {
      const bi = LIB.boil(T);
      const paths = [new Path2D(), new Path2D(), new Path2D(), new Path2D()];
      for (const s of FIELD) {
        const q = turn(s.p, a);
        if (q[0] < -10 || q[0] > 1930 || q[1] < -10 || q[1] > 1090) continue;
        const al = s.a * (0.8 + 0.2 * Math.sin(bi * 2.1 + s.tw));
        const b = Math.min(3, Math.floor(al * 4));
        paths[b].moveTo(q[0] + s.r, q[1]);
        paths[b].arc(q[0], q[1], s.r, 0, TAU);
      }
      ctx.fillStyle = P.star;
      paths.forEach((p, b) => { ctx.globalAlpha = ((b + 0.5) / 4) * k; ctx.fill(p); });
      ctx.globalAlpha = 1;
    }

    // ---------------------------------------------------------------- trails (02, 03)
    // each star's arc about Polaris from angle 0 to a, bright at the head, fading to the tail
    function drawTrails(ctx, a, k = 1) {
      if (a <= 0.0005 || k <= 0.001) return;
      const SEG = 6;
      const paths = [];
      for (let j = 0; j < SEG; j++) paths.push(new Path2D());
      const add = (p, w) => {
        const dx = p[0] - POLE[0], dy = p[1] - POLE[1];
        const R = Math.hypot(dx, dy);
        if (R < 4) return;
        const a0 = Math.atan2(dy, dx);
        for (let j = 0; j < SEG; j++) {
          // segment j spans the fraction [j, j+1]/SEG of the arc, head (j = SEG-1) at a0 - a
          const s0 = a0 - a * (j / SEG), s1 = a0 - a * ((j + 1) / SEG);
          paths[j].moveTo(POLE[0] + R * Math.cos(s0), POLE[1] + R * Math.sin(s0));
          paths[j].arc(POLE[0], POLE[1], R, s0, s1, true);
        }
      };
      for (const s of FIELD) if (s.r > 1.0) add(s.p);
      for (const s of NAMED) add(s.p);
      ctx.save();
      ctx.strokeStyle = P.trail;
      ctx.lineWidth = 1.2;
      ctx.lineCap = 'round';
      for (let j = 0; j < SEG; j++) {
        ctx.globalAlpha = 0.5 * k * ((j + 1) / SEG);
        ctx.stroke(paths[j]);
      }
      ctx.restore();
    }

    // ---------------------------------------------------------------- 4 constellation edges
    // reveal(i) in 0..1 for edge i of a figure; edges are straight lit lines node to node
    function drawEdges(ctx, list, a, color, alpha, reveal) {
      list.forEach(([m, n], i) => {
        const u = reveal ? reveal(i) : 1;
        if (!(u > 0)) return;
        const A = turn(G1.pt(m), a), B = turn(G1.pt(n), a);
        const E = [lerp(A[0], B[0], u), lerp(A[1], B[1], u)];
        LIB.glow(ctx, [A, E], { color, width: 1.2, radius: 4, strength: 0.14, alpha: alpha * (u < 1 ? 1.45 : 1) });
      });
    }

    // ---------------------------------------------------------------- 5, 6 named stars and Polaris
    function drawNamed(ctx, a, k = 1, pole = 1) {
      for (const s of NAMED) {
        if (s.n === 'polaris') continue;
        const q = turn(s.p, a);
        if (q[0] < -20 || q[0] > 1940 || q[1] < -20 || q[1] > 1100) continue;
        ctx.globalAlpha = k;
        LIB.glowDot(ctx, q[0], q[1], s.r, { rays: 0, glow: 4, color: P.star, core: P.star, seed: LIB.hash('sky', s.n) });
      }
      ctx.globalAlpha = 1;
      drawPolaris(ctx, POLE[0], POLE[1], pole);
    }
    // the accent: a small star with a warm core and halo, same size as its neighbours (10.3)
    function drawPolaris(ctx, x, y, k = 1, hot = 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const hr = 14 + 6 * hot;
      const g = ctx.createRadialGradient(x, y, 0, x, y, hr);
      g.addColorStop(0, LIB.rgba(P.accentGlow, 0.5 * k));
      g.addColorStop(0.45, LIB.rgba(P.accentGlow, 0.18 * k));
      g.addColorStop(1, LIB.rgba(P.accentGlow, 0));
      ctx.fillStyle = g;
      ctx.fillRect(x - hr, y - hr, 2 * hr, 2 * hr);
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = k;
      ctx.fillStyle = P.accent;
      ctx.beginPath(); ctx.arc(x, y, 3 + hot, 0, TAU); ctx.fill();
      ctx.fillStyle = P.accentHot;
      ctx.globalAlpha = k * (0.8 + 0.2 * hot);
      ctx.beginPath(); ctx.arc(x, y, 1.3 + 0.8 * hot, 0, TAU); ctx.fill();
      ctx.restore();
    }

    // ---------------------------------------------------------------- 8, 9 the bunting, perched (10.1)
    // Local frame: bill tip at the origin, the bird facing +x, bill-to-tail axis along -x, y down.
    // Placed at the bill tip, rotated -40 deg: the tail tip lands on G4 tailTip.
    const BODY = [
      [0, 0], [-14, -7], [-27, -12], [-38, -30], [-58, -40], [-80, -36], [-98, -28],
      [-140, -44], [-185, -38], [-210, -24], [-340, -12], [-332, 0], [-340, 12], [-210, 17],
      [-198, 34], [-165, 50], [-135, 52], [-100, 44], [-62, 27], [-28, 12], [-25, 8], [-12, 4],
    ];
    const HEAD_N = 7; // BODY[0..6] belong to the head and tilt with it
    const WING = [[-92, -18], [-128, -26], [-172, -18], [-218, -4], [-176, 14], [-130, 22], [-100, 12]];
    const COVERTS = [[[-104, -8], [-150, -6], [-196, -2]], [[-112, 4], [-150, 8], [-182, 8]], [[-120, 14], [-150, 18]]];
    const TAILF = [[[-212, -8], [-338, -3]], [[-214, 2], [-336, 4]], [[-212, 10], [-330, 8]]];
    const EYE = [-52, -12];
    const LEGS = [[[-150, 44], [-176, 78]], [[-166, 42], [-192, 76]]];
    const G4 = LIB.geo('G4');
    const BILL = G4.pt('billTip');
    const ROT = -40 * DEG;
    const TWIG = [G4.pt('twigA'), G4.pt('twigB')];
    const NODE = [0, 2, 4, 6, 7, 8, 9, 10, 12, 13, 15, 16, 18, 19]; // BODY indices lit as stars

    function birdXf(p, o) {
      // o: { tilt, breath, at, scale }
      let x = p[0], y = p[1];
      if (o.headIdx && o.tilt) {
        const c = [-98, -28], s = Math.sin(o.tilt), co = Math.cos(o.tilt);
        const dx = x - c[0], dy = y - c[1];
        x = c[0] + dx * co - dy * s; y = c[1] + dx * s + dy * co;
      }
      const s = Math.sin(ROT), co = Math.cos(ROT);
      let wx = x * co - y * s, wy = x * s + y * co;
      // breathe about the feet (local [-176, 78])
      const fx = -176 * co - 78 * s, fy = -176 * s + 78 * co;
      const br = o.breath || 1;
      wx = fx + (wx - fx) * br; wy = fy + (wy - fy) * br;
      const sc = o.scale || 1, at = o.at || BILL;
      return [at[0] + wx * sc, at[1] + wy * sc];
    }
    function birdPts(list, o, head) {
      return list.map((p, i) => birdXf(p, Object.assign({}, o, { headIdx: head ? head(i) : false })));
    }
    function birdEye(o) {
      return birdXf(EYE, Object.assign({}, o, { headIdx: true }));
    }

    // the whole perched bird; o: { T, frame, tilt, breath, at, scale, k, seed }
    function drawBunting(ctx, o) {
      const k = o.k == null ? 1 : o.k;
      const bi = LIB.boil(o.T);
      const body = birdPts(BODY, o, (i) => i < HEAD_N || i >= 19);
      const wob = (pts, sd, amp = 0.9) => pts.map((p, i) => [p[0] + amp * LIB.noise1(i * 0.37 + bi * 3.1, sd), p[1] + amp * LIB.noise1(i * 0.37 + bi * 3.1, sd + 1)]);
      const seed = o.seed || LIB.hash('bunting');
      ctx.save();
      ctx.globalAlpha = k;
      // knock-out
      ctx.save();
      ctx.globalAlpha = k * 0.88;
      ctx.fillStyle = P.void;
      ctx.beginPath(); LIB.tracePath(ctx, body, true); ctx.fill();
      ctx.restore();
      // legs behind the edges
      // legs straight down to the twig, toes wrapping it
      for (const leg of LEGS) {
        const top = birdXf(leg[0], o);
        const foot = [top[0] + 4, o.perchY ? o.perchY(top[0] + 4) : birdXf(leg[1], o)[1]];
        LIB.glow(ctx, [top, [lerp(top[0], foot[0], 0.5) - 3, lerp(top[1], foot[1], 0.5)], foot], { color: P.birdSoft, width: 1.4, radius: 3, strength: 0.12, alpha: 0.75 * k });
        ctx.save(); ctx.strokeStyle = P.birdSoft; ctx.globalAlpha = 0.7 * k; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(foot[0] + 5, foot[1] + 2, 6, Math.PI * 1.05, Math.PI * 1.9); ctx.stroke();
        ctx.beginPath(); ctx.arc(foot[0] - 4, foot[1] + 2, 5, Math.PI * 1.2, Math.PI * 1.95); ctx.stroke();
        ctx.restore();
      }
      // inner contours: the folded wing, coverts, tail feathers (birdSoft, nested toward the core)
      LIB.glow(ctx, wob(birdPts(WING, o), seed + 3), { color: P.birdSoft, width: 1.6, radius: 4, strength: 0.14, alpha: 0.75 * k, closed: true });
      COVERTS.forEach((c, j) => LIB.glow(ctx, wob(birdPts(c, o), seed + 7 + j), { color: P.birdSoft, width: 1.2 - 0.15 * j, radius: 3, strength: 0.1, alpha: (0.55 - 0.1 * j) * k }));
      TAILF.forEach((c, j) => LIB.glow(ctx, wob(birdPts(c, o), seed + 13 + j), { color: P.birdDeep, width: 1, radius: 3, strength: 0.1, alpha: 0.7 * k }));
      // the constellation contour: straight edges, one in five dimmed to a gap
      const bw = wob(body, seed, 0.7);
      for (let i = 0; i < bw.length; i++) {
        const A = bw[i], B = bw[(i + 1) % bw.length];
        const gap = i % 5 === 3;
        LIB.glow(ctx, [A, B], { color: P.bird, width: gap ? 0.9 : 1.6, radius: 5, strength: 0.16, alpha: (gap ? 0.3 : 0.85) * k });
      }
      // star nodes on the contour
      for (const i of NODE) {
        const q = bw[i];
        LIB.glowDot(ctx, q[0], q[1], i === 0 || i === 10 || i === 12 ? 2.4 : 1.8, { rays: 0, glow: 4, color: P.bird, core: P.star, seed: seed + i });
      }
      // eye: a ring with a star pupil; shut is a short lid line (2 frames, no in-between)
      const e = birdEye(o);
      const shut = o.frame != null && LIB.blinkAt(o.frame, LIB.hash('bunting'));
      ctx.strokeStyle = P.birdSoft;
      ctx.lineWidth = 1.4;
      if (shut) {
        const d = birdXf([EYE[0] + 7, EYE[1]], Object.assign({}, o, { headIdx: true })), d0 = birdXf([EYE[0] - 7, EYE[1]], Object.assign({}, o, { headIdx: true }));
        ctx.beginPath(); ctx.moveTo(d0[0], d0[1]); ctx.lineTo(d[0], d[1]); ctx.stroke();
      } else {
        ctx.save(); ctx.globalAlpha = k * 0.88; ctx.fillStyle = P.void;
        ctx.beginPath(); ctx.arc(e[0], e[1], 7, 0, TAU); ctx.fill(); ctx.restore();
        ctx.beginPath(); ctx.arc(e[0], e[1], 7, 0, TAU); ctx.stroke();
        LIB.glowDot(ctx, e[0] + 1.5, e[1] - 1, 2, { rays: 0, glow: 3, color: P.star, core: P.star, seed: seed + 99, twinkle: 0 });
      }
      ctx.restore();
    }

    function drawTwig(ctx, T, k = 1) {
      const bi = LIB.boil(T);
      const [A, B] = TWIG;
      const pts = [];
      for (let i = 0; i <= 24; i++) {
        const u = i / 24;
        pts.push([lerp(A[0], B[0], u), lerp(A[1], B[1], u) + 4 * Math.sin(u * 5.1) + 0.8 * LIB.noise1(i * 0.5 + bi * 2.9, 71)]);
      }
      LIB.glow(ctx, pts, { color: P.lineSoft, width: 1.6, radius: 4, strength: 0.1, alpha: 0.75 * k });
      LIB.glow(ctx, pts.slice(3).map((p) => [p[0], p[1] + 5]), { color: P.lineFaint, width: 1, radius: 2, strength: 0.06, alpha: 0.5 * k });
      // two side twigs and a leaf-bud at the tip
      const side = (u, dx, dy, s) => {
        const p = pts[Math.round(u * 24)];
        LIB.glow(ctx, [p, [p[0] + dx * 0.5, p[1] + dy * 0.6 + LIB.noise1(bi * 3.3, s)], [p[0] + dx, p[1] + dy]], { color: P.lineSoft, width: 1.2, radius: 3, strength: 0.08, alpha: 0.55 * k });
      };
      side(0.18, -40, -58, 5);
      side(0.82, 70, -40, 6);
      side(0.62, 30, 44, 7);
    }

    // the dashed sight line from the eye toward Polaris, u in 0..1 drawn
    function drawSight(ctx, from, to, u, k = 1) {
      if (u <= 0) return;
      const dx = to[0] - from[0], dy = to[1] - from[1];
      const L = Math.hypot(dx, dy) - 60 - 14;
      const ux = dx / (L + 74), uy = dy / (L + 74);
      ctx.save();
      ctx.strokeStyle = P.lineFaint;
      ctx.globalAlpha = 0.8 * k;
      ctx.lineWidth = 1;
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.moveTo(from[0] + ux * 14, from[1] + uy * 14);
      ctx.lineTo(from[0] + ux * (14 + L * u), from[1] + uy * (14 + L * u));
      ctx.stroke();
      ctx.restore();
    }

    // the twig's y at x (straight chord; the birds' feet stand on it)
    const perchY = (x) => TWIG[0][1] + ((x - TWIG[0][0]) / (TWIG[1][0] - TWIG[0][0])) * (TWIG[1][1] - TWIG[0][1]) + 4 * Math.sin(((x - TWIG[0][0]) / (TWIG[1][0] - TWIG[0][0])) * 5.1);

    return { LIB, P, TAU, DEG, cl, lerp, POLE, phi, turn, BIG, LITTLE, CAS, perchY, drawPlate, drawDust, drawField, drawBand, drawGuides, drawTrails, drawEdges, drawNamed, drawPolaris, drawBunting, drawTwig, drawSight, birdEye };
  })();
  // ==== END WORLD ====

  // ==== FUNNEL ==== (owner 04-funnel-autumn.js; verbatim in 06-funnel-false.js; docs/storyboard.md 04, G3)
  // The Emlen funnel from above, drawn as light on the void plate (the shot's grade inverts it to ink
  // on paper). Everything positional reads G3; a shot only passes its marker, cluster, print seed id,
  // hop beats and bracket beat. The paper (rules, guides, specks, pad texture) is the same drawing in
  // both shots; only the marker, the prints and the bird's hops turn.
  const FUNNEL = (() => {
    const LIB = FILM.lib;
    const P = LIB.pal;
    const TAU = Math.PI * 2;
    const DEG = Math.PI / 180;
    const cl = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
    const lerp = (a, b, u) => a + (b - a) * u;
    const lerpA = (a, b, u) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * u;
    const G3 = LIB.geo('G3');
    const C = G3.pt('centre');
    const R = G3.pt('rimR')[0];
    const RP = G3.pt('padR')[0];
    const LIP = R - 16;
    const HALF = 35 * DEG; // the print sector is 70 deg wide
    const FR = 1 / 24;
    const PS = 1.4; // print scale: toes about 13-17 px, hind toe about 10 px
    const at = (a, r) => [C[0] + Math.cos(a) * r, C[1] + Math.sin(a) * r];
    // signed jitter in [-0.5, 0.5) from a hash (cheap per-vertex boil)
    const jit = (...k) => ((LIB.hash(...k) >>> 0) % 4096) / 4096 - 0.5;

    // ------------------------------------------------------------ helpers
    // a wobbled circle; the noise is periodic in angle so the seam closes
    function ring(cx, cy, r, n, seed, amp, bi) {
      const out = [];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU, c = Math.cos(a), s = Math.sin(a);
        const w = amp * LIB.noise2(c * 2.4 + bi * 3.7, s * 2.4 - bi * 1.9, seed);
        out.push([cx + (r + w) * c, cy + (r + w) * s]);
      }
      return out;
    }
    function trace(path, pts, closed) {
      path.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) path.lineTo(pts[i][0], pts[i][1]);
      if (closed) path.closePath();
    }
    function strokeP(ctx, path, color, alpha, width, dash) {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (dash) ctx.setLineDash(dash);
      ctx.stroke(path);
      ctx.restore();
    }
    function fillP(ctx, path, color, alpha) {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.fill(path);
      ctx.globalAlpha = 1;
    }

    // ------------------------------------------------------------ the paper (t-independent, one seed)
    const PAPER = (() => {
      const r = LIB.rng(LIB.hash('funnel', 'paper'));
      // ink-pad texture: 26 short marks across the pad
      const pad = [];
      for (let i = 0; i < 26; i++) {
        const rad = (RP - 14) * Math.sqrt(r()), a = r() * TAU;
        const x = C[0] + Math.cos(a) * rad, y = C[1] + Math.sin(a) * rad;
        const d = (-30 + (r() - 0.5) * 50) * DEG, len = 8 + 16 * r();
        pad.push([[x - Math.cos(d) * len / 2, y - Math.sin(d) * len / 2], [x + Math.cos(d) * len / 2, y + Math.sin(d) * len / 2]]);
      }
      // the pad's grain: small specks inside it
      const padDots = [];
      for (let i = 0; i < 70; i++) {
        const rad = (RP - 6) * Math.sqrt(r()), a = r() * TAU;
        padDots.push([C[0] + Math.cos(a) * rad, C[1] + Math.sin(a) * rad, 0.5 + 0.8 * r()]);
      }
      // stray ink specks over the whole wall (the paper was used before)
      const specks = [];
      for (let i = 0; i < 150; i++) {
        const rad = RP + 12 + (LIP - RP - 20) * Math.sqrt(r()), a = r() * TAU;
        specks.push([C[0] + Math.cos(a) * rad, C[1] + Math.sin(a) * rad, 0.5 + 0.9 * r() * r(), r()]);
      }
      // a few faint old smudges round the wall
      const old = [];
      for (let i = 0; i < 9; i++) {
        const a = r() * TAU, rad = RP + 60 + (LIP - RP - 90) * r(), len = 10 + 14 * r();
        old.push([at(a, rad), at(a - 0.01, rad - len)]);
      }
      return { pad, padDots, specks, old };
    })();
    // the see-through top: a 22 px grid clipped to the rim (static, built once)
    const MESH = (() => {
      const p = new Path2D();
      for (let x = C[0] - R + 11; x < C[0] + R; x += 22) {
        const h = Math.sqrt(Math.max(0, R * R - (x - C[0]) * (x - C[0])));
        p.moveTo(x, C[1] - h); p.lineTo(x, C[1] + h);
      }
      for (let y = C[1] - R + 11; y < C[1] + R; y += 22) {
        const w = Math.sqrt(Math.max(0, R * R - (y - C[1]) * (y - C[1])));
        p.moveTo(C[0] - w, y); p.lineTo(C[0] + w, y);
      }
      return p;
    })();

    // ------------------------------------------------------------ the marks (per seed id, t-independent)
    // 12 prints and 6 smudges already down, then 9 prints and 5 smudges on each hop, clustered round
    // that hop's landing spot. Index i runs over every mark: seeds are LIB.hash(seedId, i).
    const MARKS = new Map();
    function marks(seedId, dirA, nHops) {
      const key = seedId + ':' + dirA.toFixed(5) + ':' + nHops;
      if (MARKS.has(key)) return MARKS.get(key);
      const lands = [];
      for (let h = 0; h < nHops; h++) {
        const r = LIB.rng(LIB.hash(seedId, 'hop', h));
        lands.push({ a: dirA + (h % 2 ? 1 : -1) * (7 + 9 * r()) * DEG, rad: 262 + 42 * h + 18 * r() });
      }
      const prints = [], smudges = [];
      let i = 0;
      const place = (r, wave) => {
        let a, rad;
        if (wave === 0) {
          a = dirA + (r() + r() - 1) * HALF;
          rad = 130 + 255 * Math.sqrt(r());
        } else {
          const L = lands[wave - 1];
          a = L.a + (r() + r() - 1) * 14 * DEG;
          rad = L.rad + (r() + r() - 1) * 70;
        }
        a = cl(a, dirA - HALF, dirA + HALF);
        rad = cl(rad, 112, 386);
        return [a, rad];
      };
      for (let wave = 0; wave <= nHops; wave++) {
        const nP = wave === 0 ? 12 : 9, nS = wave === 0 ? 6 : 5;
        for (let k = 0; k < nP; k++) {
          const r = LIB.rng(LIB.hash(seedId, i));
          const [a, rad] = place(r, wave);
          const [x, y] = at(a, rad);
          const th = a + (r() - 0.5) * 40 * DEG; // points outward, give or take
          const sp = [];
          for (let j = 0; j < 3; j++) {
            const d = r() * TAU, e = 6 + 12 * r();
            sp.push([x + Math.cos(d) * e, y + Math.sin(d) * e, 0.5 + 0.8 * r()]);
          }
          prints.push({ i, x, y, th, s: 0.9 + 0.22 * r(), wave, sp, toe: [0.9 + 0.2 * r(), 1 + 0.2 * r(), 0.9 + 0.2 * r()] });
          i++;
        }
        for (let k = 0; k < nS; k++) {
          const r = LIB.rng(LIB.hash(seedId, i));
          const [a, rad] = place(r, wave);
          const len = (14 + 18 * r()) * 1.3, bend = (r() - 0.5) * 0.3;
          // a slide mark: runs back toward the pad from where the foot was
          const n = 2 + Math.floor(r() * 2);
          const lines = [];
          for (let j = 0; j < n; j++) {
            const off = ((j - (n - 1) / 2) * 3.2 + (r() - 0.5) * 1.2) * 1.3;
            const a1 = a + off / rad;
            const q0 = at(a1, rad), q1 = at(a1 + bend * 0.1, rad - len * 0.5), q2 = at(a1 + bend * 0.2, rad - len * (0.8 + 0.3 * r()));
            lines.push([q0, q1, q2]);
          }
          smudges.push({ i, wave, lines, heavy: r() < 0.4 });
          i++;
        }
      }
      // the cluster's far edge along its middle direction (the bracket runs to it)
      let far = 0;
      for (const p of prints) far = Math.max(far, (p.x - C[0]) * Math.cos(dirA) + (p.y - C[1]) * Math.sin(dirA));
      const out = { lands, prints, smudges, far: Math.min(far, LIP - 6) };
      MARKS.set(key, out);
      return out;
    }

    // a three-toed print at (x, y) pointing along th, scale s: three forward toes 9-12 px, one hind toe 7 px
    function addPrint(path, dots, p, s, bi) {
      const c = Math.cos(p.th), sn = Math.sin(p.th);
      const X = (u, v) => [p.x + (u * c - v * sn) * s, p.y + (u * sn + v * c) * s];
      const w = (j) => 0.5 * jit(p.i, bi, j);
      const toes = [[-26 * DEG, 10.5 * p.toe[0]], [0, 12 * p.toe[1]], [26 * DEG, 10.5 * p.toe[2]]];
      toes.forEach(([d, L], j) => {
        const m = X(Math.cos(d) * L * 0.5, Math.sin(d) * L * 0.5 + 0.8);
        const e = X(Math.cos(d) * L, Math.sin(d) * L);
        const h = X(0, 0);
        path.moveTo(h[0] + w(j), h[1] + w(j + 9));
        path.lineTo(m[0], m[1]);
        path.lineTo(e[0] + w(j + 3), e[1] + w(j + 5));
      });
      const hb = X(-7, 0.6), h0 = X(0, 0);
      path.moveTo(h0[0], h0[1]);
      path.lineTo(hb[0] + w(7), hb[1] + w(8));
      const k = X(0.4, 0);
      dots.moveTo(k[0] + 1.9 * s, k[1]);
      dots.arc(k[0], k[1], 1.9 * s, 0, TAU);
    }

    // ------------------------------------------------------------ the bird, top view (about 110 px)
    // local frame: +x forward (bill), +y to the bird's right; outline mirrored about the x axis
    const HALF_OUT = [[57, 0], [49, 3.2], [46, 8], [41, 13], [34, 15.6], [27, 15.4], [22, 13.2], [15, 17.5], [6, 22.5], [-6, 24], [-18, 22], [-29, 16.5], [-37, 10.5], [-40, 7.2], [-55, 7.6], [-58, 4.6], [-54, 0]];
    const OUT = HALF_OUT.concat(HALF_OUT.slice(1, -1).reverse().map(([x, y]) => [x, -y]));
    const WING = [[[14, 16], [0, 18.5], [-18, 15], [-34, 9], [-47, 4.5]], [[14, -16], [0, -18.5], [-18, -15], [-34, -9], [-47, -4.5]]];
    const COVERT = [[[6, 13], [-10, 12], [-24, 8]], [[6, -13], [-10, -12], [-24, -8]]];
    const TAILF = [[[-41, 3.2], [-56, 3.4]], [[-41, -3.2], [-56, -3.4]]];
    const CROWN = [[44, 0], [36, 0], [27, 0]];
    const BILL = [[48.5, 3], [48.5, -3]];
    const EYES = [[35, 9.2], [35, -9.2]];
    const BSC = 110 / 116;

    function drawBird(ctx, x, y, head, sc, bi, shut) {
      const c = Math.cos(head), s = Math.sin(head), k = BSC * sc;
      const X = (p) => [x + (p[0] * c - p[1] * s) * k, y + (p[0] * s + p[1] * c) * k];
      const seed = LIB.hash('bunting-top');
      const wob = (pts, sd, amp) => pts.map((p, i) => {
        const q = X(p);
        return [q[0] + amp * LIB.noise1(i * 0.41 + bi * 3.1, sd), q[1] + amp * LIB.noise1(i * 0.41 + bi * 3.1, sd + 1)];
      });
      const body = wob(OUT, seed, 0.8);
      // knock-out (on the negative this is the paper showing through the bird)
      ctx.save();
      ctx.globalAlpha = 0.88;
      ctx.fillStyle = P.void;
      ctx.beginPath(); LIB.tracePath(ctx, body, true); ctx.fill();
      ctx.restore();
      // inner contours, nested toward the core
      WING.forEach((w, j) => LIB.glow(ctx, wob(w, seed + 3 + j, 0.7), { color: P.birdSoft, width: 1.5, radius: 2, strength: 0.08, alpha: 0.75 }));
      COVERT.forEach((w, j) => LIB.glow(ctx, wob(w, seed + 7 + j, 0.6), { color: P.birdSoft, width: 1.1, radius: 2, strength: 0.1, alpha: 0.45, layers: 2 }));
      const inner = new Path2D();
      TAILF.forEach((w, j) => trace(inner, wob(w, seed + 11 + j, 0.5), false));
      trace(inner, wob(CROWN, seed + 15, 0.5), false);
      trace(inner, wob(BILL, seed + 17, 0.3), false);
      strokeP(ctx, inner, P.birdDeep, 0.8, 1);
      // the contour
      LIB.glow(ctx, body, { color: P.bird, width: 1.9, radius: 2, strength: 0.08, alpha: 0.95, closed: true });
      // eyes: small rings; shut is a short lid line (2 frames, no in-between)
      ctx.save();
      ctx.strokeStyle = P.birdSoft;
      ctx.fillStyle = P.star;
      ctx.lineWidth = 1.2;
      for (const e of EYES) {
        const q = X(e);
        if (shut) {
          const a = X([e[0] + 3, e[1]]), b = X([e[0] - 3, e[1]]);
          ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
        } else {
          ctx.beginPath(); ctx.arc(q[0], q[1], 2.6 * sc, 0, TAU); ctx.stroke();
          ctx.beginPath(); ctx.arc(q[0], q[1], 1 * sc, 0, TAU); ctx.fill();
        }
      }
      ctx.restore();
    }

    // the bird's place and heading at T: rests on the pad, hops to the wall on each beat
    // (hit, 4 frames, outBack), then slides back over one beat (inOutSine). A closed form of T.
    function birdAt(T, o, dirA, lands) {
      const idle = (T0) => ({
        p: [C[0] + 3 * Math.sin((T0 / 2) * TAU) * Math.cos(dirA), C[1] + 3 * Math.sin((T0 / 2) * TAU) * Math.sin(dirA) + 1.5 * Math.sin(T0 * 2.3)],
        a: dirA + 7 * DEG * Math.sin((T0 / 2) * TAU + 0.8),
        lift: 0,
      });
      let k = -1;
      for (let j = 0; j < o.hops.length; j++) if (T >= o.hops[j]) k = j;
      if (k < 0) return idle(T);
      const Th = o.hops[k];
      const from = birdAt(Th - 1e-6, o, dirA, lands);
      const L = lands[k], land = at(L.a, L.rad), headL = L.a;
      const tl = Th + 4 * FR;
      if (T < tl) {
        const u = LIB.hit(T, Th, 4, 'outBack');
        return { p: [lerp(from.p[0], land[0], u), lerp(from.p[1], land[1], u)], a: lerpA(from.a, headL, cl(u)), lift: Math.sin(Math.PI * cl((T - Th) / (3 * FR) + 0.25)) };
      }
      const us = LIB.ease.inOutSine(cl((T - tl) / 0.5));
      const back = idle(T);
      return { p: [lerp(land[0], back.p[0], us), lerp(land[1], back.p[1], us)], a: lerpA(headL, back.a, us), lift: 0 };
    }

    // o: { frame, marker, cluster, seedId, hops: [T, T], bracketT }
    function draw(ctx, T, o) {
      const bi = LIB.boil(T);
      const M = o.marker, K = o.cluster;
      const dirA = Math.atan2(K[1] - C[1], K[0] - C[0]); // from the centre toward the cluster
      const poleA = Math.atan2(M[1] - C[1], M[0] - C[0]);
      const mk = marks(o.seedId, dirA, o.hops.length);
      const breath = Math.sin((T / 2) * TAU); // the two-bar loop

      // 1 guide circles (fine, concentric) and the pole axis
      const guides = new Path2D();
      for (const r of [150, 220, 350]) trace(guides, ring(C[0], C[1], r, 120, LIB.hash('funnel', 'g', r), 0.5, bi), true);
      strokeP(ctx, guides, P.lineFaint, 0.2, 1);
      const g290 = new Path2D();
      trace(g290, ring(C[0], C[1], 290, 160, LIB.hash('funnel', 'g', 290), 0.4, bi), true);
      strokeP(ctx, g290, P.lineFaint, 0.26, 1, [10, 8]);

      // 2 radial rules on the wall, pad to lip
      const rules = new Path2D();
      for (let i = 0; i < 24; i++) {
        const a = -Math.PI / 2 + i * 15 * DEG + 0.8 * DEG * jit('funnel', 'rule', i, bi);
        const p0 = at(a, RP + 6), p1 = at(a, LIP - 2);
        rules.moveTo(p0[0], p0[1]); rules.lineTo(p1[0], p1[1]);
      }
      strokeP(ctx, rules, P.lineDim, 1, 1.1);
      // half-way rules between them, faintest and short (the cone's slope reads as converging lines)
      const half = new Path2D();
      for (let i = 0; i < 24; i++) {
        const a = -Math.PI / 2 + (i + 0.5) * 15 * DEG;
        const p0 = at(a, 250), p1 = at(a, LIP - 2);
        half.moveTo(p0[0], p0[1]); half.lineTo(p1[0], p1[1]);
      }
      strokeP(ctx, half, P.lineDim, 0.6, 0.9);

      // 3 paper specks and old smudges
      const sp = [new Path2D(), new Path2D()];
      for (const [x, y, r, v] of PAPER.specks) {
        const b = v < 0.7 ? 0 : 1;
        sp[b].moveTo(x + r, y); sp[b].arc(x, y, r, 0, TAU);
      }
      fillP(ctx, sp[0], P.lineFaint, 0.55);
      fillP(ctx, sp[1], P.lineSoft, 0.55);
      const old = new Path2D();
      for (const [a, b] of PAPER.old) { old.moveTo(a[0], a[1]); old.lineTo(b[0], b[1]); }
      strokeP(ctx, old, P.lineFaint, 0.35, 1.2);

      // 4 the ink pad: circle, an inner ring, texture marks and grain
      const pad = new Path2D();
      trace(pad, ring(C[0], C[1], RP, 90, LIB.hash('funnel', 'pad'), 0.8, bi), true);
      strokeP(ctx, pad, P.lineSoft, 0.8, 1.6);
      const padIn = new Path2D();
      trace(padIn, ring(C[0], C[1], RP - 9, 80, LIB.hash('funnel', 'padIn'), 0.6, bi), true);
      strokeP(ctx, padIn, P.lineFaint, 0.35, 1);
      const tex = new Path2D();
      PAPER.pad.forEach(([a, b], i) => {
        tex.moveTo(a[0] + 0.5 * jit('pad', i, bi), a[1]);
        tex.lineTo(b[0], b[1] + 0.5 * jit('pad', i, bi, 1));
      });
      strokeP(ctx, tex, P.lineFaint, 0.75, 1.2);
      const pd = new Path2D();
      for (const [x, y, r] of PAPER.padDots) { pd.moveTo(x + r, y); pd.arc(x, y, r, 0, TAU); }
      fillP(ctx, pd, P.lineFaint, 0.6);

      // 5 the lip and the rim, with ticks every 10 deg outside it (every 6th longer)
      const lip = new Path2D();
      trace(lip, ring(C[0], C[1], LIP, 220, LIB.hash('funnel', 'lip'), 0.7, bi), true);
      strokeP(ctx, lip, P.lineSoft, 0.75, 1.2);
      const rim = new Path2D();
      trace(rim, ring(C[0], C[1], R, 240, LIB.hash('funnel', 'rim'), 0.9, bi), true);
      strokeP(ctx, rim, P.line, 0.95, 2.2);
      const ticks = new Path2D();
      for (let i = 0; i < 36; i++) {
        const a = -Math.PI / 2 + i * 10 * DEG, L = i % 6 === 0 ? 16 : 8;
        const p0 = at(a, R + 5), p1 = at(a, R + 5 + L);
        ticks.moveTo(p0[0], p0[1]); ticks.lineTo(p1[0], p1[1]);
      }
      strokeP(ctx, ticks, P.lineSoft, 0.4, 1.2);

      // 6 the pole axis: a dashed guide from the marker to the pad, and the marker glyph (accent)
      const ax0 = [M[0] + Math.cos(poleA + Math.PI) * 24, M[1] + Math.sin(poleA + Math.PI) * 24];
      const ax1 = at(poleA, RP + 8);
      const axis = new Path2D();
      axis.moveTo(ax0[0], ax0[1]); axis.lineTo(ax1[0], ax1[1]);
      strokeP(ctx, axis, P.lineFaint, 0.3, 1, [10, 8]);
      const dots = new Path2D();
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * TAU;
        dots.moveTo(M[0] + Math.cos(a) * 22 + 0.9, M[1] + Math.sin(a) * 22);
        dots.arc(M[0] + Math.cos(a) * 22, M[1] + Math.sin(a) * 22, 0.9, 0, TAU);
      }
      fillP(ctx, dots, P.lineFaint, 0.6);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = P.accentGlow;
      ctx.globalAlpha = 0.22;
      ctx.lineWidth = 9 * (1 + 0.12 * breath);
      ctx.beginPath(); ctx.arc(M[0], M[1], 6, 0, TAU); ctx.stroke();
      ctx.restore();
      const glyph = new Path2D();
      glyph.moveTo(M[0] + 6, M[1]); glyph.arc(M[0], M[1], 6, 0, TAU);
      glyph.moveTo(M[0] - 12, M[1]); glyph.lineTo(M[0] - 8, M[1]);
      glyph.moveTo(M[0] + 8, M[1]); glyph.lineTo(M[0] + 12, M[1]);
      glyph.moveTo(M[0], M[1] - 12); glyph.lineTo(M[0], M[1] - 8);
      glyph.moveTo(M[0], M[1] + 8); glyph.lineTo(M[0], M[1] + 12);
      strokeP(ctx, glyph, P.accent, 1, 2.4);
      ctx.fillStyle = P.accentHot;
      ctx.beginPath(); ctx.arc(M[0], M[1], 1.6, 0, TAU); ctx.fill();

      // 7 smudges, then prints: settled ones batched, fresh ones (the 2-frame ink spread) one by one
      const age = (wave) => (wave === 0 ? 99 : Math.floor((T - o.hops[wave - 1]) / FR + 1e-6));
      const smL = new Path2D(), smH = new Path2D();
      for (const sm of mk.smudges) {
        const f = age(sm.wave);
        if (f < 0) continue;
        sm.lines.forEach((l, j) => {
          const q = l.map((p, k) => [p[0] + 0.4 * jit(sm.i, bi, j, k), p[1] + 0.4 * jit(sm.i, bi, j, k, 1)]);
          trace(sm.heavy && j === 0 ? smH : smL, q, false);
        });
      }
      strokeP(ctx, smL, P.line, 0.56, 1.3);
      strokeP(ctx, smH, P.line, 0.7, 2.2);
      const pr = new Path2D(), pDots = new Path2D(), spk = new Path2D();
      const fresh = [];
      for (const p of mk.prints) {
        const f = age(p.wave);
        if (f < 0) continue;
        if (f < 2) { fresh.push([p, f]); continue; }
        addPrint(pr, pDots, p, p.s * PS, bi);
        for (const [x, y, r] of p.sp) { spk.moveTo(x + r, y); spk.arc(x, y, r, 0, TAU); }
      }
      strokeP(ctx, pr, P.line, 0.95, 2);
      fillP(ctx, pDots, P.line, 0.85);
      fillP(ctx, spk, P.line, 0.5);
      for (const [p, f] of fresh) {
        // frame 0: the foot just lifted, a wet blot bleeding out; frame 1: the ink spreads past the mark
        const s = p.s * PS * (f === 0 ? 1.18 : 1.07);
        const blot = new Path2D();
        blot.arc(p.x, p.y, f === 0 ? 10 : 13, 0, TAU);
        fillP(ctx, blot, P.line, f === 0 ? 0.3 : 0.14);
        const fp = new Path2D(), fd = new Path2D();
        addPrint(fp, fd, p, s, bi);
        strokeP(ctx, fp, P.line, 1, f === 0 ? 2.8 : 2.3);
        fillP(ctx, fd, P.line, 0.95);
        if (f === 1) {
          const fs = new Path2D();
          for (const [x, y, r] of p.sp) { fs.moveTo(x + r, y); fs.arc(x, y, r, 0, TAU); }
          fillP(ctx, fs, P.line, 0.5);
        }
      }

      // 8 the bird
      const b = birdAt(T, o, dirA, mk.lands);
      const shut = o.frame != null && LIB.blinkAt(o.frame, LIB.hash('bunting'));
      drawBird(ctx, b.p[0], b.p[1], b.a, (1 + 0.02 * breath) * (1 + 0.12 * b.lift), bi, shut);

      // 9 the see-through top over everything, very faint
      ctx.save();
      const clip = new Path2D();
      clip.arc(C[0], C[1], R - 1, 0, TAU);
      ctx.clip(clip);
      strokeP(ctx, MESH, P.lineDim, 0.12 * 4, 1);
      ctx.restore();

      // 10 the bracket: pad edge to the cluster's far edge, drawn on over 6 frames
      const ub = LIB.hit(T, o.bracketT, 6, 'outCubic');
      if (ub > 0) {
        const A = at(dirA, RP + 4);
        const E = at(dirA, mk.far);
        const Bf = [lerp(A[0], E[0], ub), lerp(A[1], E[1], ub)];
        const nx = -Math.sin(dirA), ny = Math.cos(dirA);
        // set off 18 px to the side of the axis (a dimension line), so it does not sit on a radial rule
        const off = 18;
        const A2 = [A[0] + nx * off, A[1] + ny * off], B2 = [Bf[0] + nx * off, Bf[1] + ny * off];
        const br = new Path2D();
        br.moveTo(A2[0], A2[1]); br.lineTo(B2[0], B2[1]);
        br.moveTo(A2[0] + nx * 7, A2[1] + ny * 7); br.lineTo(A2[0] - nx * 7, A2[1] - ny * 7);
        if (ub >= 1) { br.moveTo(B2[0] + nx * 7, B2[1] + ny * 7); br.lineTo(B2[0] - nx * 7, B2[1] - ny * 7); }
        strokeP(ctx, br, P.lineSoft, 0.7 + 0.2 * (1 - ub), 1.6);
      }
    }

    return { draw };
  })();
  // ==== END FUNNEL ====

  const W = WORLD;
  const G3 = W.LIB.geo('G3');

  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const t = W.cl(tIn, 0, info.dur);
      const T = info.shot.start + t;
      W.drawPlate(ctx);
      W.drawDust(ctx, T);
      FUNNEL.draw(ctx, T, {
        frame: info.frame,
        marker: G3.pt('poleFalse'),
        cluster: G3.pt('clusterFalse'),
        seedId: ID, // prints seeded lib.hash(ID, i)
        hops: [9.0, 9.5], // global T, the two hop beats
        bracketT: 9.75,
      });
    },
  });
})();
