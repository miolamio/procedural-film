// 01 shared-orbit — A shared centre (scenario S05_01). T 0 to 14.676 (pickup + bars 0–7 of the song grid).
// Two outlined bodies turn together on one dashed orbit about the centre glyph; the distance holds.
// Layers, back to front (drawn by WORLD.drawAll): 1 plate, 2 dust, 3 guides, 4 orbit + beat tick,
// 5 fields, 6 trails, 7 centre glyph, 8 shells, 9 thread, 10 bodies, 11 break ring.
// This file owns the WORLD block: every other scene copies it verbatim.
(function () {
  'use strict';
  const FILM = window.FILM;
  const ID = 'shared-orbit';

  // ==== WORLD ==== (verbatim in every scene; owner 01-shared-orbit.js; the storyboard's "World model")
  const WORLD = (() => {
    const LIB = FILM.lib;
    const P = LIB.pal;
    const TAU = Math.PI * 2;
    // The song's grid, measured from the recording (docs/storyboard.md, Numbers): 140 bpm, first
    // beat at T 0.105, bar 0's downbeat two beats later. Every window, loop and event sits on it.
    const BEAT = 3 / 7, BAR = 12 / 7, LOOP = 2 * BAR; // LOOP: the 16-pulse loop (pulse = 8th)
    const T_BEAT0 = 0.105;
    const T_BAR0 = T_BEAT0 + 2 * BEAT; // 0.962
    const B = (n) => T_BAR0 + n * BAR; // downbeat of bar n
    // scenario windows S05_01..S05_08 (W[i] starts S05_0(i+1)); W[8] is the end of the song
    const W = [0, B(8), B(24), B(38), B(54), B(68), B(84), B(96), 172.042449];
    const T_HINGE = W[4]; // 93.534: coordination breaks
    const T_SNAP = B(70); // 120.962: the snap, once
    const T_LEAVE = B(92); // 158.676: the bodies leave, once
    const T_END = W[8];
    const loopPh = (T, per = LOOP) => (T - T_BAR0) / per; // cycles since bar 0 (fractional part = phase)
    const CX = 960, CY = 540, K = 0.56;
    const STRING_A = [-240, 560], STRING_END = [1740, 522];
    const cl = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
    const ss = (a, b, x) => { const u = cl((x - a) / (b - a)); return u * u * (3 - 2 * u); };
    const lerp = (a, b, u) => a + (b - a) * u;
    const easeIn3 = (u) => u * u * u;
    const easeInOut = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
    const expDecay = (x, k) => (x <= 0 ? 1 : Math.exp(-x / k));

    // monotone cubic (Fritsch–Carlson) through [T, v] keys
    function monotone(keys) {
      const n = keys.length, xs = keys.map((k) => k[0]), ys = keys.map((k) => k[1]);
      const d = [], m = [];
      for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
      m[0] = d[0]; m[n - 1] = d[n - 2];
      for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (2 * d[i - 1] * d[i]) / (d[i - 1] + d[i]);
      return (x) => {
        if (x <= xs[0]) return ys[0];
        if (x >= xs[n - 1]) return ys[n - 1];
        let i = 0;
        while (x > xs[i + 1]) i++;
        const h = xs[i + 1] - xs[i], u = (x - xs[i]) / h;
        const h00 = 2 * u * u * u - 3 * u * u + 1, h10 = u * u * u - 2 * u * u + u;
        const h01 = -2 * u * u * u + 3 * u * u, h11 = u * u * u - u * u;
        return h00 * ys[i] + h10 * h * m[i] + h01 * ys[i + 1] + h11 * h * m[i + 1];
      };
    }

    // half-separation r(T)
    const rKeys = monotone([[0, 310], [W[2], 310], [W[3], 380], [W[4], 420], [W[5], 450], [T_SNAP, 460], [B(76), 530], [W[6], 590], [T_END, 600]]);
    function radius(T) {
      let r = rKeys(T);
      const lp = TAU * loopPh(T); // both wobbles repeat every 16 pulses
      r += 4 * Math.sin(lp) * (1 - ss(W[2] - BAR, W[2], T));
      r += 12 * Math.sin(lp) * ss(W[2], W[2] + BAR, T) * (1 - ss(W[5] - BAR, W[5], T));
      if (T > T_SNAP) r += 50 * (1 - Math.exp(-(T - T_SNAP) / 0.35)); // the kick
      return r;
    }
    // orbit angle
    const W0 = TAU / (4 * LOOP); // one turn per 8 bars (four loops)
    const TAU_SLOW = 6; // after the hinge the turning dies away over about one loop in four
    const phi = (T) => (T < T_HINGE ? W0 * T : W0 * (T_HINGE + TAU_SLOW * (1 - Math.exp(-(T - T_HINGE) / TAU_SLOW))));
    const omega = (T) => (T < T_HINGE ? W0 : W0 * Math.exp(-(T - T_HINGE) / TAU_SLOW));
    const THETA0 = Math.PI - phi(B(88)); // A sits left, B right in S05_07
    const lag = (T) => 0.35 * ss(T_HINGE, W[5], T);
    const depthGain = (T) => 1 - ss(T_HINGE, W[6], T);

    const BODY = {
      A: { r: 80, spin: 0.25, spin0: 0.3, seed: 11 },
      B: { r: 75, spin: -0.18, spin0: 1.1, seed: 23 },
    };
    // unit contour of each body (angle -> radius multiplier x/y), 96 points, before scale/spin
    const UNIT = (() => {
      const N = 96, out = {};
      const a = [], b = [];
      for (let i = 0; i < N; i++) {
        const q = (i / N) * TAU;
        const c = Math.cos(q), s = Math.sin(q), n = 2.6;
        a.push([Math.sign(c) * Math.pow(Math.abs(c), 2 / n) * 80, Math.sign(s) * Math.pow(Math.abs(s), 2 / n) * 62]);
        const rr = 65 * (1 + 0.14 * Math.cos(3 * q) + 0.03 * Math.cos(2 * q + 0.7));
        b.push([Math.cos(q) * rr, Math.sin(q) * rr]);
      }
      out.A = a; out.B = b;
      return out;
    })();

    // body state
    function body(which, T) {
      const r = radius(T);
      const thA = THETA0 + phi(T);
      const th = which === 'A' ? thA : thA + Math.PI - lag(T);
      let x = CX + r * Math.cos(th), y = CY + K * r * Math.sin(th);
      const post = ss(T_SNAP, W[6], T);
      const drift = ss(W[6], B(90), T);
      // after the snap each body drifts on its own loop (16 pulses), a different figure for each
      const lp = TAU * loopPh(T);
      if (which === 'A') { y += -20 * post - 12 * drift + post * 7 * Math.sin(2 * lp + 1); x += post * 6 * Math.sin(lp); }
      else { y += 20 * post + 15 * drift + post * 8 * Math.sin(lp + 0.5); x -= post * 6 * Math.sin(lp + 2); }
      // end of S05_07, once: B leaves right, A leaves left toward STRING_A, dragging the thread
      if (which === 'B') {
        const u = easeIn3(cl((T - T_LEAVE) / (2.5 * BAR)));
        x = lerp(x, 2160, u); y = lerp(y, 700, u);
      } else {
        const u = easeInOut(cl((T - B(92.5)) / (3 * BAR)));
        x = lerp(x, STRING_A[0], u); y = lerp(y, STRING_A[1], u);
      }
      const g = depthGain(T);
      const sn = Math.sin(th);
      const bd = BODY[which];
      return {
        which, x, y, th,
        scale: 1 + 0.1 * sn * g,
        alpha: 0.86 + 0.14 * sn * g,
        rot: bd.spin0 + bd.spin * T,
        R: bd.r * (1 + 0.1 * sn * g),
      };
    }

    // breathing: 1 ± amp, peaks on the downbeats; B slides to opposite phase at the hinge
    function breath(which, T) {
      const amp = 0.12 * (1 - 0.6 * ss(T_SNAP, T_SNAP + 2 * BAR, T));
      const ph = which === 'B' ? Math.PI * ss(T_HINGE, T_HINGE + 2 * BEAT, T) : 0;
      return 1 + amp * Math.cos(TAU * loopPh(T) + ph); // one breath per loop, peaks on even downbeats
    }

    // layer strengths (global, so both sides of every cut agree)
    const L_ = {
      guides: (T) => 1 - ss(W[2], W[2] + BAR, T),
      orbit: (T) => 1 - ss(W[2], W[2] + 4 * BAR, T),
      centre: (T) => (T < W[2] ? 1 : T < W[3] ? lerp(1, 0.45, ss(W[2], W[2] + 2 * BAR, T)) : T < W[4] ? lerp(0.45, 0.3, ss(W[3], W[3] + 2 * BAR, T)) : 0.3),
      shellGrow: (T) => (T < W[1] ? 0 : LIB.hit(T, W[1], 6, 'outBack')),
      shells: (T) => (T < W[1] ? 0 : Math.min(1, LIB.hit(T, W[1], 6, 'outBack'))) * (1 - 0.5 * ss(T_SNAP, T_SNAP + 2 * BAR, T)),
      trails: (T) => ss(W[2], W[2] + 2 * BAR, T) * (1 - 0.5 * ss(T_SNAP, T_SNAP + 2 * BAR, T)),
      thread: (T) => (T < W[2] ? 0 : 1),
      fields: (T) => (T < W[3] ? 0 : 1) * (1 - ss(T_SNAP, T_SNAP + 2 * BAR, T)),
      exitFade: (T) => 1 - ss(T_LEAVE, T_LEAVE + 2.4, T), // shells, trails, the gap rule
      bodyFade: (T) => 1 - ss(B(94.5), B(95.5), T), // the bodies themselves, once they are at the edges
    };

    // ---------------------------------------------------------------- 1 plate
    // the plate is rendered once per output size (a preview at scale 0.25 gets a small one)
    function drawPlate(ctx) {
      const w = Math.max(1, Math.round(ctx.canvas.width)), h = Math.max(1, Math.round(ctx.canvas.height));
      const plate = LIB.cached('zg-plate-' + w + 'x' + h, () => {
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const g = c.getContext('2d');
        g.scale(w / 1920, h / 1080);
        g.fillStyle = P.void; g.fillRect(0, 0, 1920, 1080);
        const lift = g.createRadialGradient(CX, CY, 0, CX, CY, 900);
        lift.addColorStop(0, LIB.rgba(P.voidLift, 1));
        lift.addColorStop(1, LIB.rgba(P.voidLift, 0));
        g.fillStyle = lift; g.fillRect(0, 0, 1920, 1080);
        const vig = g.createRadialGradient(CX, CY, 700, CX, CY, 1250);
        vig.addColorStop(0, LIB.rgba(P.voidEdge, 0));
        vig.addColorStop(1, LIB.rgba(P.voidEdge, 0.85));
        g.fillStyle = vig; g.fillRect(0, 0, 1920, 1080);
        return c;
      });
      ctx.drawImage(plate, 0, 0, 1920, 1080);
    }

    // ---------------------------------------------------------------- 2 dust
    const DUST = (() => {
      const rnd = LIB.rng(LIB.hash('zg-dust'));
      const out = [];
      for (let i = 0; i < 140; i++) {
        out.push({ x: rnd() * 1920, y: rnd() * 1080, vx: (rnd() - 0.5) * 8, vy: (rnd() - 0.5) * 5, r: 0.6 + rnd() * rnd() * 1.1, a: 0.1 + rnd() * 0.25, s: i });
      }
      return out;
    })();
    function drawDust(ctx, T, k = 1) {
      const bi = LIB.boil(T);
      ctx.fillStyle = P.dust;
      for (const d of DUST) {
        const x = ((d.x + d.vx * T) % 1920 + 1920) % 1920;
        const y = ((d.y + d.vy * T) % 1080 + 1080) % 1080;
        const tw = 0.7 + 0.3 * Math.sin(bi * 1.7 + d.s * 2.3);
        ctx.globalAlpha = d.a * tw * k;
        ctx.beginPath(); ctx.arc(x, y, d.r, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // ---------------------------------------------------------------- 3 guides
    function drawGuides(ctx, T, k) {
      if (k <= 0.001) return;
      const r = radius(T);
      ctx.lineWidth = 1;
      ctx.strokeStyle = LIB.rgba(P.lineFaint, 0.2 * k);
      for (const f of [1.6, 2.4]) {
        ctx.beginPath(); ctx.ellipse(CX, CY, r * f, K * r * f, 0, 0, TAU); ctx.stroke();
      }
      ctx.strokeStyle = LIB.rgba(P.lineFaint, 0.14 * k);
      ctx.beginPath();
      ctx.moveTo(CX - 900, CY - 506); ctx.lineTo(CX + 900, CY + 506);
      ctx.moveTo(CX - 900, CY + 506); ctx.lineTo(CX + 900, CY - 506);
      ctx.moveTo(CX - 940, CY); ctx.lineTo(CX + 940, CY);
      ctx.stroke();
    }

    // ---------------------------------------------------------------- 4 orbit
    function drawOrbit(ctx, T, k, tickLight = 0) {
      if (k <= 0.001) return;
      const r = radius(T);
      ctx.save();
      ctx.lineWidth = 1.4;
      ctx.setLineDash([10, 8]);
      ctx.lineDashOffset = -T * 12;
      ctx.strokeStyle = LIB.rgba(P.lineSoft, 0.55 * k);
      ctx.beginPath(); ctx.ellipse(CX, CY, r, K * r, 0, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
      // 72 ticks, normal to the ellipse
      const bA = body('A', T), bB = body('B', T);
      const thA = bA.th;
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 72; i++) {
        const q = (i / 72) * TAU;
        const len = i % 6 === 0 ? 16 : 8;
        const x = CX + r * Math.cos(q), y = CY + K * r * Math.sin(q);
        if (Math.hypot(x - bA.x, y - bA.y) < bA.R + 6 || Math.hypot(x - bB.x, y - bB.y) < bB.R + 6) continue;
        let nx = K * Math.cos(q), ny = Math.sin(q);
        const nl = Math.hypot(nx, ny); nx /= nl; ny /= nl;
        let dq = Math.abs(((q - thA) % TAU + TAU + Math.PI) % TAU - Math.PI);
        const lit = tickLight * Math.max(0, 1 - dq / 0.3);
        ctx.strokeStyle = lit > 0.01 ? LIB.rgba(P.line, (0.3 + 0.6 * lit) * k) : LIB.rgba(P.lineSoft, 0.4 * k);
        ctx.beginPath();
        ctx.moveTo(x - nx * len * 0.5, y - ny * len * 0.5);
        ctx.lineTo(x + nx * len * 0.5 * (1 + 1.5 * lit), y + ny * len * 0.5 * (1 + 1.5 * lit));
        ctx.stroke();
      }
      ctx.restore();
    }

    // ---------------------------------------------------------------- 5 fields
    const GAP = 88;
    const V_FIELD = GAP / BEAT; // one ring per beat
    const R_MAX = 900;
    function fieldPhase(which, T) {
      const born = which === 'A' ? W[3] : W[3] + BEAT / 2;
      if (T < born) return null;
      if (which === 'A' || T < T_HINGE) return { p: V_FIELD * (T - born), front: V_FIELD * (T - born) };
      const pH = V_FIELD * (T_HINGE - born);
      return { p: pH - V_FIELD * (T - T_HINGE), front: V_FIELD * (T - born) };
    }
    function drawField(ctx, which, T, k) {
      if (k <= 0.001) return;
      const f = fieldPhase(which, T);
      if (!f) return;
      const b = body(which, T);
      const R0 = b.R * 1.9;
      const slow = 1; // speed is baked into the phase
      const col = which === 'A' ? P.fieldA : P.fieldB;
      ctx.lineWidth = 1.2;
      const iMin = Math.floor((f.p - (R_MAX - R0)) / GAP) - 1, iMax = Math.floor(f.p / GAP) + 1;
      for (let i = iMin; i <= iMax; i++) {
        const d = f.p - GAP * i; // distance travelled from the shell
        if (d < 0 || d > f.front) continue;
        const rr = R0 + d;
        if (rr > R_MAX) continue;
        let a = 0.5 * Math.pow(1 - rr / R_MAX, 1.1) * ss(R0, R0 + 50, rr) * ss(f.front + 2, f.front - 60, d) * slow;
        a *= k * (0.85 + 0.15 * Math.sin(i * 1.3));
        if (a < 0.004) continue;
        ctx.strokeStyle = LIB.rgba(col, a);
        ctx.beginPath(); ctx.arc(b.x, b.y, rr, 0, TAU); ctx.stroke();
      }
    }

    // ---------------------------------------------------------------- 6 trails
    function drawTrail(ctx, which, T, k) {
      if (k <= 0.001) return;
      const N = 70, span = 2.8;
      const pts = [];
      for (let i = 0; i <= N; i++) {
        const b = body(which, T - span * (1 - i / N));
        pts.push([b.x, b.y]);
      }
      ctx.lineWidth = 1.4;
      ctx.lineCap = 'round';
      for (let i = 1; i <= N; i++) {
        const u = i / N;
        ctx.strokeStyle = LIB.rgba(P.lineSoft, 0.55 * u * k);
        ctx.beginPath(); ctx.moveTo(pts[i - 1][0], pts[i - 1][1]); ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke();
      }
    }

    // ---------------------------------------------------------------- 7 centre glyph
    function drawCentre(ctx, T, k) {
      const bi = LIB.boil(T);
      const seed = LIB.hash('zg-centre');
      const h = (i, j) => (LIB.hash(seed, i, j) & 0xffff) / 0xffff;
      // shot 04: one flicker per bar, dots of the dotted ring drop out
      let kk = k;
      if (T >= W[3] && T < W[4]) {
        const since = ((T - W[3]) % BAR);
        kk *= since < 0.12 ? 0.35 : 1;
      }
      const lost = ss(W[3], W[4], T); // share of ring dots gone
      const frag = ss(W[4], W[4] + 8 * BAR, T); // 05: fragments drift out and fade over eight bars
      const fragA = 1 - frag;
      if (kk * fragA <= 0.002) return;
      const out = frag * 102;
      const pieces = [];
      // cross arms (4), ring as 4 arcs, dotted ring 24 dots
      for (let i = 0; i < 4; i++) pieces.push({ kind: 'arm', a: (i * TAU) / 4 });
      for (let i = 0; i < 4; i++) pieces.push({ kind: 'arc', a: (i * TAU) / 4 + 0.3 });
      ctx.save();
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      pieces.forEach((pc, i) => {
        const dir = pc.a + (h(i, 1) - 0.5) * 0.8;
        const dx = Math.cos(dir) * out * (0.6 + 0.8 * h(i, 2)), dy = Math.sin(dir) * out * (0.6 + 0.8 * h(i, 2));
        const rot = frag * (h(i, 3) - 0.5) * 2.2;
        ctx.strokeStyle = LIB.rgba(P.line, 0.7 * kk * fragA);
        ctx.save();
        ctx.translate(CX + dx, CY + dy);
        ctx.rotate(rot);
        ctx.beginPath();
        if (pc.kind === 'arm') {
          ctx.moveTo(Math.cos(pc.a) * 9, Math.sin(pc.a) * 9);
          ctx.lineTo(Math.cos(pc.a) * 16, Math.sin(pc.a) * 16);
        } else {
          ctx.arc(0, 0, 6, pc.a - 0.6, pc.a + 0.6);
        }
        ctx.stroke();
        ctx.restore();
      });
      ctx.fillStyle = LIB.rgba(P.line, 0.55 * kk * fragA);
      for (let i = 0; i < 24; i++) {
        if (h(i, 9) < lost) continue;
        const q = (i / 24) * TAU + 0.02 * Math.sin(bi + i);
        const rr = 40 + out * (0.5 + h(i, 4));
        ctx.beginPath(); ctx.arc(CX + Math.cos(q) * rr, CY + Math.sin(q) * rr, 1.3, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }

    // ---------------------------------------------------------------- 8/10 body and shell contours
    function contour(which, b, scale, T, wob, seedK) {
      const U = UNIT[which];
      const bi = LIB.boil(T);
      const c = Math.cos(b.rot), s = Math.sin(b.rot);
      const sc = scale * b.scale;
      const pts = [];
      const off = (1 - scale) * 0.12; // inner contours sit slightly off-centre, like a relief
      const ox = (6 * c + 4 * s) * off * 8, oy = (6 * s - 4 * c) * off * 8;
      for (let i = 0; i < U.length; i++) {
        const u = U[i];
        const w = wob ? wob * LIB.noise1(i * 0.21 + bi * 3.7 + seedK * 1.3, BODY[which].seed + seedK) : 0;
        const q = Math.atan2(u[1], u[0]);
        const x = u[0] * sc + Math.cos(q) * w, y = u[1] * sc + Math.sin(q) * w;
        pts.push([b.x + ox + x * c - y * s, b.y + oy + x * s + y * c]);
      }
      return pts;
    }
    function strokeLoop(ctx, pts) {
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.closePath();
      ctx.stroke();
    }
    const NEST = [1, 0.8, 0.62, 0.46, 0.31, 0.17];
    function drawBody(ctx, which, T, k = 1) {
      if (k <= 0.001) return;
      const b = body(which, T);
      ctx.save();
      ctx.lineJoin = 'round';
      ctx.fillStyle = LIB.rgba(P.void, 0.88 * k);
      ctx.beginPath();
      contour(which, b, 1, T, 0, 0).forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
      ctx.closePath();
      ctx.fill();
      NEST.forEach((f, j) => {
        ctx.lineWidth = j === 0 ? 2.2 : 1.6 - j * 0.14;
        ctx.strokeStyle = j === 0 ? LIB.rgba(P.line, 0.95 * b.alpha * k) : LIB.rgba(P.lineSoft, (0.75 - j * 0.1) * b.alpha * k);
        strokeLoop(ctx, contour(which, b, f, T, j === 0 ? 0.9 : 0.6, j));
      });
      ctx.fillStyle = LIB.rgba(P.line, 0.9 * b.alpha * k);
      ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, TAU); ctx.fill();
      ctx.restore();
    }
    function drawShell(ctx, which, T, k, grow = 1) {
      if (k <= 0.001) return;
      const b = body(which, T); // grow: the birth pushes the shell out of the rim (overshoots with outBack)
      const br = breath(which, T);
      const shrink = 1 - 0.25 * ss(T_SNAP, T_SNAP + 2 * BAR, T); // after the snap the shells draw in
      const inner = lerp(1, 1.7 * shrink, grow) * br, outer = lerp(1, 2.0 * shrink, grow) * br;
      const kk = Math.min(1, k) * b.alpha;
      ctx.save();
      ctx.lineJoin = 'round';
      ctx.lineWidth = 1.3;
      ctx.strokeStyle = LIB.rgba(P.shell, 0.75 * kk);
      strokeLoop(ctx, contour(which, b, inner, T, 1.0, 7));
      ctx.lineWidth = 1.1;
      ctx.setLineDash([12, 9]);
      ctx.lineDashOffset = (which === 'A' ? 1 : -1) * T * 10;
      ctx.strokeStyle = LIB.rgba(P.shell, 0.5 * kk);
      strokeLoop(ctx, contour(which, b, outer, T, 1.2, 8));
      ctx.restore();
    }
    function shellRadius(which, T) {
      const b = body(which, T);
      return b.R * 1.7 * breath(which, T);
    }

    // ---------------------------------------------------------------- 9 thread
    const NT = 160;
    // where a ray from the body's centre along (dx, dy) leaves its outer contour
    function rim(b, dx, dy, T) {
      const l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l;
      if (!b.which) return [b.x + ux * b.R, b.y + uy * b.R];
      const pts = contour(b.which, b, 1, T, 0, 0);
      let best = b.R;
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i], q = pts[(i + 1) % pts.length];
        const ex = q[0] - p[0], ey = q[1] - p[1];
        const den = ux * ey - uy * ex;
        if (Math.abs(den) < 1e-9) continue;
        const wx = p[0] - b.x, wy = p[1] - b.y;
        const tt = (wx * ey - wy * ex) / den, v = (wx * uy - wy * ux) / den;
        if (tt > 0 && v >= 0 && v <= 1) { best = tt; break; }
      }
      return [b.x + ux * best, b.y + uy * best];
    }
    // attached phase: displacement across the chord, s in 0..1
    function wAttached(s, T) {
      const slack = 1 - ss(W[5], T_SNAP, T);
      const lp = TAU * loopPh(T); // bend and sway repeat every 16 pulses
      const bow = (26 + 14 * Math.sin(lp)) * slack;
      const sway = 8 * Math.sin(TAU * s) * Math.sin(lp + 0.6) * slack;
      const tens = ss(W[5], T_SNAP, T);
      const trem = 5 * tens * tens * Math.sin(Math.PI * s) * LIB.noise1(T * 26 + s * 3, 77) + 2.2 * tens * Math.sin(3 * Math.PI * s) * LIB.noise1(T * 31 + 9, 78);
      return bow * 4 * s * (1 - s) + sway + trem;
    }
    function attachedEnds(T) {
      const a = body('A', T), b = body('B', T);
      return { p0: rim(a, b.x - a.x, b.y - a.y, T), p1: rim(b, a.x - b.x, a.y - b.y, T) };
    }
    const SNAP = (() => {
      const e = attachedEnds(T_SNAP);
      const dx = e.p1[0] - e.p0[0], dy = e.p1[1] - e.p0[1];
      return { p1: e.p1, len: Math.hypot(dx, dy), ang: Math.atan2(dy, dx) };
    })();
    const FINAL = (() => {
      const a = body('A', T_END);
      const p0 = rim(a, STRING_END[0] - a.x, STRING_END[1] - a.y, T_END);
      return { len: Math.hypot(STRING_END[0] - p0[0], STRING_END[1] - p0[1]), ang: Math.atan2(STRING_END[1] - p0[1], STRING_END[0] - p0[0]) };
    })();
    const lenKeys = monotone([[T_SNAP, SNAP.len], [B(76), 690], [W[6], 720], [B(92.5), 720], [B(95.5), FINAL.len], [T_END, FINAL.len]]);
    function wReleased(s, T) {
      const tau = T - T_SNAP;
      let w = wAttached(s, T_SNAP) * Math.exp(-tau / 0.18);
      const m1 = Math.sin((Math.PI * s) / 2), m2 = Math.sin((3 * Math.PI * s) / 2), m3 = Math.sin((5 * Math.PI * s) / 2);
      const off = 1 - ss(B(94), B(95.5), T); // whip and sway hand over to the string
      // the whip, once: three modes decaying within about two seconds of the snap
      w += off * (70 * Math.exp(-tau / 1.2) * m1 * Math.sin(TAU * 1.3 * tau)
        + 26 * Math.exp(-tau / 0.8) * m2 * Math.sin(TAU * 3.1 * tau)
        + 10 * Math.exp(-tau / 0.5) * m3 * Math.sin(TAU * 6.2 * tau));
      // then the free end swings on the 8-pulse loop (one bar), smaller once the bodies rest apart
      const ub = TAU * loopPh(T, BAR);
      const swing = off * ss(T_SNAP + 0.8, T_SNAP + 2 * BAR, T) * (1 - 0.45 * ss(W[6], W[6] + 2 * BAR, T));
      w += swing * (26 * m1 * Math.sin(ub + 0.9) + 9 * m2 * Math.sin(2 * ub + s * 2));
      // S05_07's end into S05_08: the string settles, then keeps a residual tremble looping per bar
      const on = ss(B(94), B(95.5), T);
      if (on > 0) {
        const t8 = Math.max(0, T - B(94));
        const ph = ((loopPh(T, BAR) % 1) + 1) % 1 * BAR; // seconds into the bar
        const pulse = 4 * ss(W[7] - BAR, W[7], T) * (1 - Math.exp(-ph / 0.05)) * Math.exp(-ph / 0.55);
        const a = 3 + 19 * Math.exp(-t8 / 0.8) + pulse;
        w += on * (a * Math.sin(Math.PI * s) * Math.sin(3 * ub + 0.5)
          + 0.45 * a * Math.sin(2 * Math.PI * s) * Math.sin(7 * ub + 1.3)
          + 0.9 * Math.sin(7 * Math.PI * s) * Math.sin(19 * ub));
      }
      return w;
    }
    // the thread as a polyline, plus { reveal, free (bool), tension }
    function thread(T) {
      const pts = [];
      if (T < T_SNAP) {
        const e = attachedEnds(T);
        const dx = e.p1[0] - e.p0[0], dy = e.p1[1] - e.p0[1];
        const l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
        for (let i = 0; i <= NT; i++) {
          const s = i / NT, w = wAttached(s, T);
          pts.push([e.p0[0] + dx * s + nx * w, e.p0[1] + dy * s + ny * w]);
        }
        return { pts, free: false, tension: ss(W[5], T_SNAP, T) };
      }
      const tau = T - T_SNAP;
      const a = body('A', T);
      const ang = lerp(SNAP.ang, FINAL.ang, ss(T_SNAP, B(95.5), T));
      const recoil = (1 - Math.exp(-tau / 0.08)) * Math.exp(-tau / 0.6);
      const len = lenKeys(T) * (1 - 0.3 * recoil);
      const dx = Math.cos(ang), dy = Math.sin(ang);
      const p0 = rim(a, dx, dy, T);
      for (let i = 0; i <= NT; i++) {
        const s = i / NT, w = wReleased(s, T);
        pts.push([p0[0] + dx * len * s - dy * w, p0[1] + dy * len * s + dx * w]);
      }
      return { pts, free: true, tension: Math.exp(-tau / 0.3) };
    }
    function strokeRun(ctx, pts, i0, i1) {
      ctx.beginPath();
      ctx.moveTo(pts[i0][0], pts[i0][1]);
      for (let i = i0 + 1; i <= i1; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.stroke();
    }
    function drawThread(ctx, T, k, o = {}) {
      if (k <= 0.001) return;
      const th = thread(T);
      const pts = th.pts;
      const reveal = o.reveal == null ? 1 : o.reveal;
      const iEnd = Math.max(1, Math.round(NT * cl(reveal)));
      const width = o.width || 2.4;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineWidth = 9;
      ctx.strokeStyle = LIB.rgba(P.threadGlow, 0.22 * k);
      strokeRun(ctx, pts, 0, iEnd);
      ctx.globalCompositeOperation = 'source-over';
      if (th.free) {
        // the free end tapers over its last ~8%
        const iT = Math.floor(NT * 0.92);
        ctx.lineWidth = width;
        ctx.strokeStyle = LIB.rgba(P.thread, k);
        strokeRun(ctx, pts, 0, iT);
        for (let i = iT; i < NT; i++) {
          const u = (i - iT) / (NT - iT);
          ctx.lineWidth = width * (1 - 0.8 * u);
          ctx.strokeStyle = LIB.rgba(P.thread, k * (1 - 0.5 * u));
          strokeRun(ctx, pts, i, i + 1);
        }
      } else {
        ctx.lineWidth = width;
        ctx.strokeStyle = LIB.rgba(P.thread, k);
        strokeRun(ctx, pts, 0, iEnd);
      }
      if (th.tension > 0.01) {
        ctx.lineWidth = 1;
        ctx.strokeStyle = LIB.rgba(P.threadHot, 0.8 * th.tension * k);
        strokeRun(ctx, pts, 0, th.free ? Math.floor(NT * 0.9) : iEnd);
      }
      if (reveal < 1 && o.nib !== false) {
        const p = pts[iEnd];
        LIB.glowDot(ctx, p[0], p[1], 4, { color: P.thread, core: P.threadHot, rays: 0, glow: 5, seed: 5, twinkle: 0 });
      }
      ctx.restore();
    }

    // ---------------------------------------------------------------- 11 break ring (06 only, drawn by that scene)
    function drawBreak(ctx, T) {
      if (T < T_SNAP) return;
      const tau = T - T_SNAP;
      const u = LIB.hit(T, T_SNAP, 6, 'outExpo');
      const x = SNAP.p1[0] - Math.cos(SNAP.ang) * 20, y = SNAP.p1[1] - Math.sin(SNAP.ang) * 20;
      const a = 1 - cl(tau / (6 / 24));
      if (a > 0) {
        ctx.save();
        ctx.lineWidth = 2;
        ctx.strokeStyle = LIB.rgba(P.threadHot, a);
        ctx.beginPath(); ctx.arc(x, y, 6 + 124 * u, 0, TAU); ctx.stroke();
        ctx.restore();
      }
      const sp = 1 - cl(tau / 0.9);
      if (sp > 0) {
        const rnd = LIB.rng(LIB.hash('zg-sparks'));
        ctx.save();
        ctx.fillStyle = P.threadHot;
        for (let i = 0; i < 9; i++) {
          const ang = SNAP.ang + (rnd() - 0.5) * 2.4;
          const v = 90 + rnd() * 170;
          const d = v * (1 - Math.exp(-tau / 0.35)) * 0.35;
          ctx.globalAlpha = sp * (0.5 + 0.5 * rnd());
          ctx.beginPath(); ctx.arc(x + Math.cos(ang) * d, y + Math.sin(ang) * d, 1.2 + rnd() * 1.4, 0, TAU); ctx.fill();
        }
        ctx.restore();
      }
    }

    // everything, in layer order; hooks let a scene insert its overlay
    function drawAll(ctx, T, o = {}) {
      const x = L_.exitFade(T);
      drawPlate(ctx);
      drawDust(ctx, T, 1 - 0.5 * ss(W[7], W[7] + 2 * BAR, T));
      drawGuides(ctx, T, L_.guides(T));
      drawOrbit(ctx, T, L_.orbit(T), o.tickLight || 0);
      if (o.afterOrbit) o.afterOrbit(ctx);
      drawField(ctx, 'A', T, L_.fields(T));
      drawField(ctx, 'B', T, L_.fields(T));
      drawCentre(ctx, T, L_.centre(T));
      drawShell(ctx, 'A', T, L_.shells(T) * x, L_.shellGrow(T));
      drawShell(ctx, 'B', T, L_.shells(T) * x, L_.shellGrow(T));
      drawTrail(ctx, 'A', T, L_.trails(T) * x);
      drawTrail(ctx, 'B', T, L_.trails(T) * x);
      if (o.beforeThread) o.beforeThread(ctx);
      drawThread(ctx, T, L_.thread(T), { reveal: o.reveal, width: o.threadWidth });
      drawBody(ctx, 'A', T, L_.bodyFade(T));
      drawBody(ctx, 'B', T, L_.bodyFade(T));
      if (o.top) o.top(ctx);
    }

    return {
      TAU, BEAT, BAR, LOOP, T_BEAT0, T_BAR0, B, W, loopPh, T_HINGE, T_SNAP, T_LEAVE, T_END, CX, CY, K, SNAP, FINAL,
      cl, ss, lerp, radius, omega, body, breath, shellRadius, thread, contour,
      layer: L_, drawAll, drawPlate, drawDust, drawGuides, drawOrbit, drawField, drawTrail, drawCentre,
      drawShell, drawBody, drawThread, drawBreak,
    };
  })();
  // ==== /WORLD ====

  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const L = info.lib, P = L.pal;
      const t = WORLD.cl(tIn, 0, info.dur);
      const T = info.shot.start + t;
      // overlay: the centre's heartbeat, one ring per beat of the song out of the centre glyph
      // (the pickup beats before bar 0 included); brighter on each downbeat
      const q = (T - WORLD.T_BEAT0) / WORLD.BEAT;
      const n = Math.floor(q);
      const since = (q - n) * WORLD.BEAT;
      const u = L.hit(since, 0, 9, 'outExpo');
      const lead = T < WORLD.T_BEAT0 ? 0 : 1; // nothing before the song's first beat
      WORLD.drawAll(ctx, T, {
        tickLight: lead * (1 - since / WORLD.BEAT),
        afterOrbit(c) {
          const a = lead * (1 - since / WORLD.BEAT) * ((((n - 2) % 4) + 4) % 4 === 0 ? 0.7 : 0.45);
          c.lineWidth = 1.6;
          c.strokeStyle = L.rgba(P.line, a);
          c.beginPath(); c.ellipse(WORLD.CX, WORLD.CY, 8 + 90 * u, (8 + 90 * u) * WORLD.K, 0, 0, WORLD.TAU); c.stroke();
        },
      });
    },
  });
})();
