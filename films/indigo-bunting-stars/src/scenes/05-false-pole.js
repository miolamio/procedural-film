// 05 false-pole — A sky turned around Betelgeuse. T 7 to 8.5.
// Emlen's planetarium: dome ribs arc over the frame, the dumbbell star projector stands at bottom
// centre, and the projected sky (Orion, G2) turns counter-clockwise about Betelgeuse, the false pole,
// which carries the accent. Polaris is a plain star turning with the rest. The small young bird,
// perched lower left, looks up at Betelgeuse; the instrument lands there on T 7.5.
// Layers, back to front: 1 plate, 2 dust, 3 dome (parallels, ribs, rib ticks), 4 Milky Way motes and
// faint projected stars, 5 guides about Betelgeuse, 6 trails, 7 background stars, 8 projector beams,
// 9 Orion edges, 10 named stars, 11 Betelgeuse (accent), 12 instrument, 13 horizon and seat backs,
// 14 projector, 15 twig, 16 bunting.
(function () {
  'use strict';
  const FILM = window.FILM;
  const ID = 'false-pole';

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
  const TAU = W.TAU, DEG = W.DEG;
  const cl = W.cl, lerp = W.lerp;
  const sd = (...k) => LIB.hash(ID, ...k) & 0x7fffffff;

  const G2 = LIB.geo('G2');
  const BET = G2.pt('betelgeuse');
  const HORIZON = 1000; // the dome's spring line
  const T0 = 7, DUR = 1.5;
  const B_INST = 7.5; // T 7.5: the instrument lands on Betelgeuse

  // the planetarium's turn about Betelgeuse, counter-clockwise on screen
  const psi = (T) => 30 * DEG * LIB.ease.inOutSine(cl((T - T0) / DUR));
  const PSI_END = 30 * DEG;
  const rotB = (p, a) => W.turn(p, a, BET);

  // ---------------------------------------------------------------- geometry (t-independent)
  const MAG = { betelgeuse: 2.8, bellatrix: 2.5, meissa: 1.9, mintaka: 2.4, alnilam: 2.6, alnitak: 2.5, saiph: 2.3, rigel: 2.9, polaris: 2.3 };
  const NAMED = Object.keys(MAG).map((n) => ({ n, p: G2.pt(n), r: MAG[n] }));
  const EDGES = [['betelgeuse', 'bellatrix'], ['betelgeuse', 'alnitak'], ['bellatrix', 'mintaka'], ['mintaka', 'alnilam'], ['alnilam', 'alnitak'], ['alnitak', 'saiph'], ['mintaka', 'rigel'], ['meissa', 'betelgeuse'], ['meissa', 'bellatrix']];

  // minor Orion stars derived from G2 (sword under the belt, shield west of Bellatrix): no copied numbers
  const MINOR = (() => {
    const g = (n) => G2.pt(n);
    const out = [];
    const belt = g('alnilam'), feet = [(g('saiph')[0] + g('rigel')[0]) / 2, (g('saiph')[1] + g('rigel')[1]) / 2];
    [0.26, 0.34, 0.42].forEach((u, i) => out.push({ p: [lerp(belt[0], feet[0], u) + (i === 1 ? 4 : -2), lerp(belt[1], feet[1], u)], r: i === 1 ? 1.6 : 1.2 }));
    const bel = g('bellatrix'), bt = g('betelgeuse');
    const span = Math.hypot(bel[0] - bt[0], bel[1] - bt[1]);
    for (let i = 0; i < 6; i++) {
      const v = (i / 5 - 0.5) * 1.3;
      out.push({ p: [bel[0] + span * (0.62 + 0.1 * Math.cos(v * 1.4)), bel[1] + span * 0.85 * v - span * 0.05], r: 0.9 + 0.35 * ((i * 7) % 3) });
    }
    // the club, up and left of Betelgeuse
    for (let i = 0; i < 4; i++) out.push({ p: [bt[0] - span * (0.12 + 0.1 * i), bt[1] - span * (0.55 + 0.18 * i) + span * 0.06 * i * i], r: 1 + 0.3 * (i % 2) });
    return out;
  })();

  // is a point inside the dome's visible sky at psi 0 or at the end of the turn
  const inSky = (q) => q[0] > -30 && q[0] < 1950 && q[1] > -30 && q[1] < HORIZON - 8;
  const seen = (p) => inSky(p) || inSky(rotB(p, PSI_END)) || inSky(rotB(p, PSI_END * 0.5));

  // 180 background stars, seeded lib.hash('dome', i), kept only where the dome shows them
  const FIELD = (() => {
    const out = [];
    for (let i = 0; out.length < 180 && i < 5000; i++) {
      const r = LIB.rng(LIB.hash('dome', i));
      const rad = 1450 * Math.sqrt(r()), a = r() * TAU;
      const p = [BET[0] + rad * Math.cos(a), BET[1] + rad * Math.sin(a)];
      const m = r();
      const s = { p, r: 0.6 + 1.5 * m * m, a: 0.3 + 0.55 * r(), tw: r() * TAU };
      if (seen(p)) out.push(s);
    }
    return out;
  })();
  // 900 faint projected points: the dome's fine star dust
  const FAINT = (() => {
    const out = [];
    for (let i = 0; out.length < 900 && i < 20000; i++) {
      const r = LIB.rng(LIB.hash('dome-faint', i));
      const rad = 1450 * Math.sqrt(r()), a = r() * TAU;
      const p = [BET[0] + rad * Math.cos(a), BET[1] + rad * Math.sin(a)];
      const s = { p, r: 0.45 + 0.4 * r(), a: 0.08 + 0.22 * r() };
      if (seen(p)) out.push(s);
    }
    return out;
  })();
  // the winter Milky Way, east of Orion (screen left of Betelgeuse), a soft band of motes
  const BAND_AXIS = [[140, 1180], [330, 760], [470, 420], [560, 90], [600, -260]];
  const BAND = (() => {
    const out = [];
    const segs = BAND_AXIS.length - 1;
    for (let i = 0; i < 2600; i++) {
      const r = LIB.rng(sd('band', i));
      const u = r() * segs, j = Math.min(segs - 1, Math.floor(u)), f = u - j;
      const A = BAND_AXIS[j], B = BAND_AXIS[j + 1];
      const tx = B[0] - A[0], ty = B[1] - A[1], tl = Math.hypot(tx, ty);
      const g = (r() + r() + r() - 1.5) * 1.4;
      const w = 105 * g;
      out.push({ p: [lerp(A[0], B[0], f) - (ty / tl) * w, lerp(A[1], B[1], f) + (tx / tl) * w], r: 0.5 + 0.6 * r(), a: 0.16 * (1 - Math.abs(g) / 2.2) * (0.4 + r()) });
    }
    return out;
  })();

  // ---------------------------------------------------------------- the dome, seen from inside
  // Seen from inside and in front: meridians are ellipse quarters from their feet on the spring line
  // (y 1000) up to one apex 700 px above the frame (orthographic, radius 1700), with a small bulge on
  // the side walls (sin 2·alt, zero at both ends) so the parallels read as shallow smiles.
  const DOME_R = 1700, BULGE = 260;
  function domePt(az, alt) {
    const x = 960 + DOME_R * Math.cos(alt) * Math.sin(az);
    const y = HORIZON - DOME_R * Math.sin(alt) - BULGE * Math.sin(2 * alt) * (1 - Math.cos(az));
    return [x, y];
  }
  const RIBS_MAIN = [-50, -24, 0, 24, 50].map((d) => d * DEG);
  const RIBS_MINOR = [-72, -37, -12, 12, 37, 72].map((d) => d * DEG);
  const DOME = (() => {
    const rib = (az) => { const pts = []; for (let a = 0; a <= 90; a += 1.5) { const q = domePt(az, a * DEG); if (q) pts.push(q); } return pts; };
    const main = new Path2D(), minor = new Path2D(), par = new Path2D(), ticks = new Path2D(), bigTicks = new Path2D();
    const addLine = (path, pts) => { pts.forEach((q, i) => (i ? path.lineTo(q[0], q[1]) : path.moveTo(q[0], q[1]))); };
    RIBS_MAIN.forEach((az) => {
      const pts = rib(az);
      addLine(main, pts);
      // a second, inner edge 5 px off: the rib has a width
      addLine(minor, rib(az + 1.1 * DEG));
      // ticks every 5 deg of altitude, every 30 deg long
      for (let a = 5; a < 90; a += 5) {
        const q = domePt(az, a * DEG), q2 = domePt(az, (a + 0.5) * DEG);
        if (!q || !q2) continue;
        const tx = q2[0] - q[0], ty = q2[1] - q[1], tl = Math.hypot(tx, ty) || 1;
        const nx = -ty / tl, ny = tx / tl, Lk = a % 30 === 0 ? 16 : 8;
        const path = a % 30 === 0 ? bigTicks : ticks;
        path.moveTo(q[0], q[1]); path.lineTo(q[0] + nx * Lk, q[1] + ny * Lk);
      }
    });
    RIBS_MINOR.forEach((az) => addLine(minor, rib(az)));
    for (const alt of [15, 30, 45, 60, 75]) {
      const pts = [];
      for (let az = -90; az <= 90; az += 1.5) { const q = domePt(az * DEG, alt * DEG); if (q) pts.push(q); }
      addLine(par, pts);
    }
    return { main, minor, par, ticks, bigTicks };
  })();
  function drawDome(ctx) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = P.dome;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.35; ctx.stroke(DOME.par);
    ctx.globalAlpha = 0.45; ctx.stroke(DOME.minor);
    ctx.lineWidth = 1.2;
    ctx.globalAlpha = 0.95; ctx.stroke(DOME.main);
    ctx.lineWidth = 1.2;
    ctx.globalAlpha = 0.85; ctx.stroke(DOME.ticks);
    ctx.strokeStyle = P.lineFaint;
    ctx.globalAlpha = 0.45; ctx.stroke(DOME.bigTicks);
    ctx.restore();
  }

  // ---------------------------------------------------------------- 4 band, faint points, 7 field
  const visible = (q, m = 6) => q[0] > -m && q[0] < 1920 + m && q[1] > -m && q[1] < HORIZON - 6;
  function drawDots(ctx, list, a, buckets, color, scale, T, twinkle, gain = scale) {
    const bi = LIB.boil(T);
    const paths = [];
    for (let b = 0; b < buckets; b++) paths.push(new Path2D());
    for (const s of list) {
      const q = rotB(s.p, a);
      if (!visible(q)) continue;
      const al = twinkle ? s.a * (0.8 + 0.2 * Math.sin(bi * 2.1 + s.tw)) : s.a;
      const b = Math.min(buckets - 1, Math.floor((al / scale) * buckets));
      paths[b].moveTo(q[0] + s.r, q[1]);
      paths[b].arc(q[0], q[1], s.r, 0, TAU);
    }
    ctx.fillStyle = color;
    paths.forEach((p, b) => { ctx.globalAlpha = ((b + 0.5) / buckets) * gain; ctx.fill(p); });
    ctx.globalAlpha = 1;
  }

  // ---------------------------------------------------------------- 5 guides about the false pole
  function drawGuides(ctx, a, k = 1) {
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = P.lineFaint;
    ctx.globalAlpha = 0.16 * k;
    ctx.beginPath();
    for (const r of [300, 640]) { ctx.moveTo(BET[0] + r, BET[1]); ctx.arc(BET[0], BET[1], r, 0, TAU); }
    ctx.stroke();
    ctx.globalAlpha = 0.13 * k;
    ctx.beginPath();
    for (const d of [118 * DEG - a, 28 * DEG - a]) {
      ctx.moveTo(BET[0] - Math.cos(d) * 2200, BET[1] - Math.sin(d) * 2200);
      ctx.lineTo(BET[0] + Math.cos(d) * 2200, BET[1] + Math.sin(d) * 2200);
    }
    ctx.stroke();
    ctx.globalAlpha = 0.3 * k;
    ctx.strokeStyle = P.lineSoft;
    ctx.beginPath();
    for (let i = 0; i < 36; i++) {
      const q = i * 10 * DEG - a, Lk = i % 6 === 0 ? 16 : 8;
      ctx.moveTo(BET[0] + Math.cos(q) * 300, BET[1] + Math.sin(q) * 300);
      ctx.lineTo(BET[0] + Math.cos(q) * (300 - Lk), BET[1] + Math.sin(q) * (300 - Lk));
    }
    ctx.stroke();
    ctx.restore();
  }

  // ---------------------------------------------------------------- 6 trails about Betelgeuse (as 02's)
  function drawTrails(ctx, a) {
    if (a <= 0.0005) return;
    const SEG = 6;
    const field = [], named = [];
    for (let j = 0; j < SEG; j++) { field.push(new Path2D()); named.push(new Path2D()); }
    const add = (paths, p) => {
      const dx = p[0] - BET[0], dy = p[1] - BET[1];
      const R = Math.hypot(dx, dy);
      if (R < 4) return;
      const a0 = Math.atan2(dy, dx);
      for (let j = 0; j < SEG; j++) {
        const s0 = a0 - a * (j / SEG), s1 = a0 - a * ((j + 1) / SEG);
        paths[j].moveTo(BET[0] + R * Math.cos(s0), BET[1] + R * Math.sin(s0));
        paths[j].arc(BET[0], BET[1], R, s0, s1, true);
      }
    };
    for (const s of FIELD) if (s.r > 1.0) add(field, s.p);
    for (const s of MINOR) add(field, s.p);
    for (const s of NAMED) add(named, s.p);
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, 1920, HORIZON - 4); ctx.clip();
    ctx.strokeStyle = P.trail;
    ctx.lineCap = 'round';
    for (let j = 0; j < SEG; j++) {
      const f = (j + 1) / SEG;
      ctx.lineWidth = 1.2; ctx.globalAlpha = 0.5 * f; ctx.stroke(field[j]);
      ctx.lineWidth = 1.4; ctx.globalAlpha = 0.55 * f; ctx.stroke(named[j]);
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- 14 the projector (Emlen's dumbbell)
  const PIVOT = [960, 1000];
  const AX = -26 * DEG; // the dumbbell's axis, the upper ball to the right
  const AXU = [Math.cos(AX), Math.sin(AX)];
  const BALL_R = 34, BALL_D = 82;
  const BALLS = [[PIVOT[0] + AXU[0] * BALL_D, PIVOT[1] - 16 + AXU[1] * BALL_D], [PIVOT[0] - AXU[0] * BALL_D, PIVOT[1] - 16 - AXU[1] * BALL_D]];
  const AXLE = [PIVOT[0], PIVOT[1] - 16];
  // lens holes on a unit sphere (lat/lon grid, jittered), turned about the dumbbell axis by psi
  const LENSES = (() => {
    const out = [];
    const r = LIB.rng(sd('lens'));
    for (let la = -75; la <= 75; la += 15) {
      const n = Math.max(3, Math.round(22 * Math.cos(la * DEG)));
      for (let j = 0; j < n; j++) out.push({ la: (la + (r() - 0.5) * 5) * DEG, lo: ((j + r() * 0.6) / n) * TAU, big: r() < 0.12 });
    }
    return out;
  })();
  function drawProjector(ctx, T, a) {
    const bi = LIB.boil(T);
    const ux = AXU[0], uy = AXU[1], nx = -uy, ny = ux;
    const A = BALLS[0], B = BALLS[1];
    // stand: post, fork and base
    const post = [[AXLE[0] - 9, AXLE[1] + 10], [AXLE[0] - 12, 1080], [AXLE[0] + 12, 1080], [AXLE[0] + 9, AXLE[1] + 10]];
    const forkL = [[AXLE[0] - 9, AXLE[1] + 14], [AXLE[0] - 30, AXLE[1] + 6], [AXLE[0] - 34, AXLE[1] - 14]];
    const forkR = [[AXLE[0] + 9, AXLE[1] + 14], [AXLE[0] + 30, AXLE[1] + 6], [AXLE[0] + 34, AXLE[1] - 14]];
    // the truss between the balls: a tube with a middle cage
    const tube = (off) => [[A[0] - ux * BALL_R * 0.94 + nx * off, A[1] - uy * BALL_R * 0.94 + ny * off], [B[0] + ux * BALL_R * 0.94 + nx * off, B[1] + uy * BALL_R * 0.94 + ny * off]];
    const cage = [[-26, -15], [26, -15], [26, 15], [-26, 15]].map(([s, o]) => [AXLE[0] + ux * s + nx * o, AXLE[1] + uy * s + ny * o]);
    // knock-out
    ctx.save();
    ctx.fillStyle = P.void;
    ctx.globalAlpha = 0.92;
    ctx.beginPath();
    LIB.tracePath(ctx, post, true);
    ctx.moveTo(A[0] + BALL_R, A[1]); ctx.arc(A[0], A[1], BALL_R, 0, TAU);
    ctx.moveTo(B[0] + BALL_R, B[1]); ctx.arc(B[0], B[1], BALL_R, 0, TAU);
    LIB.tracePath(ctx, cage, true);
    LIB.tracePath(ctx, [tube(9)[0], tube(9)[1], tube(-9)[1], tube(-9)[0]], true);
    ctx.fill();
    ctx.restore();
    // lines
    const soft = { color: P.lineSoft, width: 1.4, radius: 3, strength: 0.08, alpha: 0.7 };
    const wob = (pts, s, amp = 0.6) => pts.map((p, i) => [p[0] + amp * LIB.noise1(i * 0.5 + bi * 3.1, s), p[1] + amp * LIB.noise1(i * 0.5 + bi * 3.1, s + 1)]);
    LIB.glow(ctx, wob(post, sd('post')), Object.assign({}, soft, { closed: false }));
    LIB.glow(ctx, wob(forkL, sd('fl')), soft);
    LIB.glow(ctx, wob(forkR, sd('fr')), soft);
    LIB.glow(ctx, wob(tube(9), sd('t1')), Object.assign({}, soft, { width: 1.2, alpha: 0.6 }));
    LIB.glow(ctx, wob(tube(-9), sd('t2')), Object.assign({}, soft, { width: 1.2, alpha: 0.6 }));
    LIB.glow(ctx, wob(cage, sd('cage')), Object.assign({}, soft, { closed: true, width: 1.2, alpha: 0.6 }));
    // cage struts and the axle bearing
    ctx.save();
    ctx.strokeStyle = P.lineFaint; ctx.lineWidth = 1; ctx.globalAlpha = 0.6;
    ctx.beginPath();
    for (let s = -18; s <= 18; s += 9) { ctx.moveTo(AXLE[0] + ux * s + nx * 15, AXLE[1] + uy * s + ny * 15); ctx.lineTo(AXLE[0] + ux * s - nx * 15, AXLE[1] + uy * s - ny * 15); }
    ctx.moveTo(AXLE[0] + 7, AXLE[1]); ctx.arc(AXLE[0], AXLE[1], 7, 0, TAU);
    // base plate and floor shadow rule
    ctx.moveTo(AXLE[0] - 46, 1072); ctx.lineTo(AXLE[0] + 46, 1072);
    ctx.stroke();
    ctx.restore();
    // the star balls: outline, two meridians and the lens holes, turning with the sky
    const lensPaths = [new Path2D(), new Path2D(), new Path2D()];
    const mer = new Path2D();
    [A, B].forEach((C, bIdx) => {
      LIB.glow(ctx, wob(LIB.ellipsePts(C[0], C[1], BALL_R, BALL_R, 40), sd('ball', bIdx), 0.5), { color: P.lineSoft, width: 1.6, radius: 4, strength: 0.1, alpha: 0.8, closed: true });
      // sphere frame: axis u (screen, along the dumbbell), n (screen, across), z toward the viewer
      const spin = (bIdx ? -1 : 1) * a * 4 + bIdx * 0.7;
      for (const L of LENSES) {
        const lo = L.lo + spin;
        const along = Math.sin(L.la), c = Math.cos(L.la);
        const across = c * Math.cos(lo), z = c * Math.sin(lo);
        if (z < 0.05) continue;
        const px = C[0] + (ux * along + nx * across) * BALL_R * 0.94;
        const py = C[1] + (uy * along + ny * across) * BALL_R * 0.94;
        const b = L.big ? 2 : z > 0.55 ? 1 : 0;
        const rr = L.big ? 1.5 : 0.9;
        lensPaths[b].moveTo(px + rr, py); lensPaths[b].arc(px, py, rr, 0, TAU);
      }
      // two meridian ellipses (the lens plates' seams)
      for (const m of [0.35, 0.8]) {
        const ph = (m * Math.PI + spin) % Math.PI;
        const rx = BALL_R * Math.abs(Math.cos(ph));
        for (let i = 0; i <= 28; i++) {
          const v = (i / 28) * Math.PI - Math.PI / 2;
          const along = Math.sin(v) * BALL_R, across = Math.cos(v) * rx * (Math.sin(ph) > 0 ? 1 : -1);
          const px = C[0] + ux * along + nx * across, py = C[1] + uy * along + ny * across;
          i ? mer.lineTo(px, py) : mer.moveTo(px, py);
        }
      }
    });
    ctx.save();
    ctx.strokeStyle = P.lineFaint; ctx.lineWidth = 1; ctx.globalAlpha = 0.5; ctx.stroke(mer);
    ctx.fillStyle = P.lineSoft;
    ctx.globalAlpha = 0.35; ctx.fill(lensPaths[0]);
    ctx.globalAlpha = 0.7; ctx.fill(lensPaths[1]);
    ctx.fillStyle = P.star; ctx.globalAlpha = 0.9; ctx.fill(lensPaths[2]);
    ctx.restore();
  }

  // ---------------------------------------------------------------- 8 beams from the balls to stars
  const BEAM_TO = ['rigel', 'bellatrix', 'polaris', 'saiph'];
  function drawBeams(ctx, a) {
    ctx.save();
    ctx.strokeStyle = P.dome;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.08 * 2.2; // dome is a dark hue: 8% of a lit line reads at about 18% of it
    ctx.beginPath();
    const to = BEAM_TO.map((n) => rotB(G2.pt(n), a)).concat([FIELD[3], FIELD[11]].map((s) => rotB(s.p, a)));
    to.forEach((q, i) => {
      const C = BALLS[i % 2 === 0 ? 0 : 1];
      const dx = q[0] - C[0], dy = q[1] - C[1], d = Math.hypot(dx, dy);
      ctx.moveTo(C[0] + (dx / d) * BALL_R, C[1] + (dy / d) * BALL_R);
      ctx.lineTo(q[0], q[1]);
    });
    ctx.stroke();
    ctx.restore();
  }

  // ---------------------------------------------------------------- 13 horizon and seat backs
  const SEATS = (() => {
    const back = new Path2D(), front = new Path2D();
    const row = (path, y, w, h, gap, off) => {
      for (let x = off; x < 1960; x += w + gap) {
        if (x + w > 860 && x < 1060) continue; // the projector's aisle
        path.moveTo(x, y + h);
        path.lineTo(x, y + h * 0.35);
        path.quadraticCurveTo(x, y, x + w * 0.5, y);
        path.quadraticCurveTo(x + w, y, x + w, y + h * 0.35);
        path.lineTo(x + w, y + h);
      }
    };
    row(back, 1016, 40, 26, 10, -12);
    row(front, 1044, 58, 50, 12, -30);
    return { back, front };
  })();
  function drawHall(ctx) {
    ctx.save();
    ctx.strokeStyle = P.lineFaint;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.45;
    ctx.beginPath(); ctx.moveTo(0, HORIZON); ctx.lineTo(1920, HORIZON); ctx.stroke();
    // knock out the seats so the floor below the spring line is darker than the sky
    ctx.fillStyle = P.voidEdge;
    ctx.globalAlpha = 0.55;
    ctx.fillRect(0, HORIZON + 1, 1920, 1080 - HORIZON);
    ctx.globalAlpha = 0.9; ctx.fill(SEATS.back); ctx.fill(SEATS.front);
    ctx.strokeStyle = P.lineDim;
    ctx.globalAlpha = 0.9; ctx.stroke(SEATS.back);
    ctx.strokeStyle = P.lineFaint;
    ctx.globalAlpha = 0.28; ctx.stroke(SEATS.front);
    ctx.restore();
  }

  // ---------------------------------------------------------------- 12 the instrument on Betelgeuse
  function drawInstrument(ctx, T, a) {
    const k = LIB.hit(T, B_INST, 3, 'outBack');
    if (k <= 0) return;
    const [x, y] = BET;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = P.line;
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(x, y, 6 * k, 0, TAU);
    const c = 16 * k, g = 9;
    ctx.moveTo(x - c, y); ctx.lineTo(x - g, y); ctx.moveTo(x + g, y); ctx.lineTo(x + c, y);
    ctx.moveTo(x, y - c); ctx.lineTo(x, y - g); ctx.moveTo(x, y + g); ctx.lineTo(x, y + c);
    ctx.stroke();
    // dotted ring r 40, turning with the sky
    ctx.fillStyle = P.lineSoft;
    ctx.globalAlpha = 0.7 * cl(k);
    ctx.beginPath();
    const R = 40 * k;
    for (let i = 0; i < 40; i++) {
      const q = (i / 40) * TAU - a;
      const px = x + Math.cos(q) * R, py = y + Math.sin(q) * R;
      ctx.moveTo(px + 1.1, py); ctx.arc(px, py, 1.1, 0, TAU);
    }
    ctx.fill();
    ctx.restore();
  }

  // ---------------------------------------------------------------- 15 the small perch (local, after the WORLD's twig)
  const TW_A = [118, 936], TW_B = [548, 904];
  const perchY = (x) => {
    const u = (x - TW_A[0]) / (TW_B[0] - TW_A[0]);
    return TW_A[1] + u * (TW_B[1] - TW_A[1]) + 3 * Math.sin(u * 5.1);
  };
  function drawTwig(ctx, T) {
    const bi = LIB.boil(T);
    const pts = [];
    for (let i = 0; i <= 20; i++) {
      const u = i / 20, x = lerp(TW_A[0], TW_B[0], u);
      pts.push([x, perchY(x) + 0.8 * LIB.noise1(i * 0.5 + bi * 2.9, sd('twig'))]);
    }
    LIB.glow(ctx, pts, { color: P.lineSoft, width: 1.5, radius: 4, strength: 0.1, alpha: 0.75 });
    LIB.glow(ctx, pts.slice(3).map((p) => [p[0], p[1] + 4]), { color: P.lineFaint, width: 1, radius: 2, strength: 0.06, alpha: 0.5 });
    const side = (u, dx, dy, s) => {
      const p = pts[Math.round(u * 20)];
      LIB.glow(ctx, [p, [p[0] + dx * 0.5, p[1] + dy * 0.6 + LIB.noise1(bi * 3.3, sd('side', s))], [p[0] + dx, p[1] + dy]], { color: P.lineSoft, width: 1.1, radius: 3, strength: 0.08, alpha: 0.55 });
    };
    side(0.15, -26, -38, 1);
    side(0.85, 44, -26, 2);
    side(0.6, 20, 30, 3);
  }

  // ---------------------------------------------------------------- 16 the bird: bill tip placed so the body sits near (300, 880)
  const BIRD_AT = [382, 812];
  const BIRD_SCALE = 200 / 340;
  const BIRD_TILT = -10 * DEG; // the head lifted toward Betelgeuse

  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const t = cl(tIn, 0, info.dur);
      const T = info.shot.start + t;
      const a = psi(T);
      // 1, 2
      W.drawPlate(ctx);
      W.drawDust(ctx, T);
      // 3 the dome
      drawDome(ctx);
      // 4 Milky Way and the faint projected points
      drawDots(ctx, BAND, a, 3, P.dust, 0.25, T, false, 0.85);
      drawDots(ctx, FAINT, a, 3, P.star, 0.3, T, false);
      // 5
      drawGuides(ctx, a);
      // 6
      drawTrails(ctx, a);
      // 7
      drawDots(ctx, FIELD, a, 4, P.star, 1, T, true);
      drawDots(ctx, MINOR.map((s) => ({ p: s.p, r: s.r, a: 0.7, tw: 0 })), a, 1, P.star, 0.8, T, false);
      // 8
      drawBeams(ctx, a);
      // 9 Orion's edges ride with their stars
      for (const [m, n] of EDGES) {
        const A = rotB(G2.pt(m), a), B = rotB(G2.pt(n), a);
        LIB.glow(ctx, [A, B], { color: P.line, width: 1.2, radius: 4, strength: 0.14, alpha: 0.55 });
      }
      // 10 named stars (Polaris plain)
      for (const s of NAMED) {
        if (s.n === 'betelgeuse') continue;
        const q = rotB(s.p, a);
        if (!visible(q, 20)) continue;
        LIB.glowDot(ctx, q[0], q[1], s.r, { rays: 0, glow: 4, color: P.star, core: P.star, seed: LIB.hash('dome', s.n) });
      }
      // 11 Betelgeuse: the accent, same size as its neighbours; a short warm flare on the bell
      const hot = T >= B_INST ? Math.exp(-(T - B_INST) * 5) : 0;
      W.drawPolaris(ctx, BET[0], BET[1], 1, hot);
      // 12
      drawInstrument(ctx, T, a);
      // 13, 14
      drawHall(ctx);
      drawProjector(ctx, T, a);
      // 15, 16
      drawTwig(ctx, T);
      const breath = 1 + 0.03 * Math.sin((T / 2) * TAU);
      W.drawBunting(ctx, { T, frame: info.frame, tilt: BIRD_TILT, breath, at: BIRD_AT, scale: BIRD_SCALE, perchY });
    },
  });
})();
