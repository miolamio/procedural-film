// Fixture scene: a cloud of chevron birds, scattered so they do not overlap, drifting on one current.
(function () {
  const L = FILM.lib;
  const P = L.pal;
  const CX = 540;
  const CY = 880;
  const CLOUD = [];
  for (let i = 0; i < 56; i++) {
    const a = (i / 56) * L.TAU;
    const lobe = 1 + 0.11 * Math.sin(2 * a) + 0.08 * Math.sin(3 * a + 0.7) + 0.045 * Math.cos(5 * a + 0.4);
    CLOUD.push([CX + Math.cos(a) * 330 * lobe, CY + Math.sin(a) * 390 * lobe]);
  }
  // r clears the largest chevron (about 26 px across, ink included) with room for a little shear.
  const BIRDS = { r: 36, seed: 19, max: 800 };
  const FLOW = { seed: 14, scale: 2200, speed: 58, curl: true };

  function wind(x, y, t) {
    const v = L.flow(x, y, t, FLOW);
    const m = Math.hypot(v.x, v.y) || 1;
    return { x: v.x, y: v.y, ux: v.x / m, uy: v.y / m };
  }

  FILM.scene({
    id: 'fx-flock',
    draw(ctx, t) {
      L.paper(ctx, { seed: 8 });
      const tt = L.onTwos(t);
      const here = wind(CX, CY, tt);
      // sun sits upwind, out of the cloud, so the flight has a direction to come from
      const sunX = CX - here.ux * 430;
      const sunY = CY - here.uy * 460;
      L.glowDot(ctx, sunX, sunY, 54, {
        color: P.sun, core: P.glow, additive: false, rays: 14, rayLen: 2.1, rayWidth: 0.14, twinkle: 0.04,
      });

      L.inkPath(ctx, CLOUD, {
        closed: true, smooth: true, fill: P.stripeSky, fillAlpha: 0.72,
        width: 2.2, color: P.inkSoft, seed: 6, step: 7, wobble: 1.1,
      });

      const birds = L.scatter(CLOUD, BIRDS);
      L.instances(ctx, birds, function (ctx, p, i, rnd) {
        const q = L.advect(p, tt, FLOW, 8);
        const w = wind(q.x, q.y, tt);
        const size = 10.2 + rnd() * 1.6;
        const wing = 0.36 + rnd() * 0.06;
        const yaw = (rnd() - 0.5) * 0.1;
        ctx.translate(q.x, q.y);
        ctx.rotate(Math.atan2(w.y, w.x) + yaw);
        L.inkPath(ctx, [[-size, -size * wing], [size * 0.62, 0], [-size, size * wing]], {
          smooth: false,
          width: i % 23 === 0 ? 3.1 : 2.35,
          color: rnd() < 0.22 ? P.inkSoft : P.ink,
          seed: 100 + i,
          step: 7,
          wobble: 0.28,
          tremble: 0.08,
          swell: 0,
          widthJitter: 0.12,
          taper: 4,
          boilAmp: 0.18,
        });
      });
    },
  });
})();
