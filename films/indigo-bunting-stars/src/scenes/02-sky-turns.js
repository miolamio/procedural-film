// 02 sky-turns — The sky turns. T 2 to 4.
// Match cut from 01: the identical frame, adding only the star trails on the downbeat. The sky turns
// counter-clockwise about Polaris, phi 0 to 40 deg (WORLD.phi); every star draws its arc.
// Layers, back to front: 1 plate, 2 dust, 3 band + background stars, 4 guides, 5 trails,
// 6 guide ellipse r 150 with a lit tick at phi, 7 edges, 8 named stars + Polaris, 9 sight line, 10 twig, 11 bunting.
// WORLD block copied verbatim from 01-first-summer.js.
(function () {
  'use strict';
  const FILM = window.FILM;
  const ID = 'sky-turns';

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

  const W = WORLD;
  const LIB = W.LIB;
  const P = W.P;

  // the dashed ellipse about Polaris (r 150) with ticks every 10 deg; the tick at phi is lit
  function drawDial(ctx, a) {
    const [x, y] = W.POLE;
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = P.lineFaint;
    ctx.globalAlpha = 0.5;
    ctx.setLineDash([10, 8]);
    ctx.lineDashOffset = -a * 150;
    ctx.beginPath(); ctx.arc(x, y, 150, 0, W.TAU); ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = P.lineSoft;
    ctx.beginPath();
    for (let i = 0; i < 36; i++) {
      const q = -Math.PI / 2 + i * 10 * W.DEG, L = i % 6 === 0 ? 16 : 8;
      ctx.moveTo(x + Math.cos(q) * 150, y + Math.sin(q) * 150);
      ctx.lineTo(x + Math.cos(q) * (150 + L), y + Math.sin(q) * (150 + L));
    }
    ctx.stroke();
    // the lit tick: straight up at phi 0, walking counter-clockwise with the sky
    const q = -Math.PI / 2 - a;
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(q) * 142, y + Math.sin(q) * 142);
    ctx.lineTo(x + Math.cos(q) * 176, y + Math.sin(q) * 176);
    ctx.stroke();
    // the swept wedge: a faint arc from 0 to phi just outside the dial
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(x, y, 186, -Math.PI / 2, -Math.PI / 2 - a, true); ctx.stroke();
    ctx.restore();
  }

  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const t = W.cl(tIn, 0, info.dur);
      const T = info.shot.start + t;
      const a = W.phi(T);
      W.drawPlate(ctx);
      W.drawDust(ctx, T);
      W.drawBand(ctx, a);
      W.drawField(ctx, T, a);
      W.drawGuides(ctx, a);
      // 5 trails from the downbeat
      W.drawTrails(ctx, a, 1);
      drawDial(ctx, a);
      // 7 edges ride with their stars (fully drawn, as 01 left them)
      W.drawEdges(ctx, W.CAS, a, P.lineSoft, 0.28);
      W.drawEdges(ctx, W.BIG, a, P.line, 0.55);
      W.drawEdges(ctx, W.LITTLE, a, P.lineSoft, 0.4);
      W.drawNamed(ctx, a);
      // the bird holds the perch as 01 left it: head tilted, sight line drawn
      const breath = 1 + 0.03 * Math.sin((T / 2) * W.TAU);
      const bird = { T, frame: info.frame, tilt: -3 * W.DEG, breath, perchY: W.perchY };
      W.drawSight(ctx, W.birdEye(bird), W.POLE, 1);
      W.drawTwig(ctx, T);
      W.drawBunting(ctx, bird);
    },
  });
})();
