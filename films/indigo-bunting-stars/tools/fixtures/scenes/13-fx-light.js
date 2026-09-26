// Fixture scene: the egg on paper, with a hatched ground shadow, a shaded side and a rim.
// The sun walks the upper half of a circle; dir is the shadow direction (opposite the sun).
// Layers back to front: paper, cast shadow, shell, shade, ink, rim, sun.
FILM.scene({
  id: 'fx-light',
  draw(ctx, t, info) {
    const L = info.lib;
    const P = L.pal;
    t = L.clamp(t, 0, info.dur);
    const tw = L.onTwos(t);
    const sd = (...k) => L.hash('fx-light', ...k);

    // 185° → 355°: left horizon, over the top, to the right horizon. Canvas y grows downward,
    // so this arc stays in the sky and the shadow stays on the ground.
    const u = info.dur > 0 ? tw / info.dur : 0;
    const ang = (185 + (355 - 185) * u) * (Math.PI / 180);
    const sx = Math.cos(ang);
    const sy = Math.sin(ang);
    const dir = [-sx, -sy];

    L.paper(ctx, { seed: sd(1) });

    const egg = L.geo('egg').outline(8);
    const ground = 1500;

    // 1. hatched shadow on the ground, opposite the sun
    L.castShadow(ctx, egg, {
      dir: dir,
      len: 170,
      ground: ground,
      squash: 0.32,
      soft: 0.28,
      style: 'hatch',
      color: P.ink,
      alpha: 0.62,
      seed: sd(2),
      spacing: 9,
      width: 1.35,
      angle: -0.55,
      shear: 0.18,
    });

    // 2. shell, then the shadow side inside it
    ctx.save();
    ctx.beginPath();
    L.tracePath(ctx, egg, true);
    ctx.fillStyle = P.tan;
    ctx.fill();
    ctx.restore();

    L.shadeSide(ctx, egg, {
      dir: dir,
      spacing: 8,
      width: 1.25,
      alpha: 0.78,
      seed: sd(3),
      color: P.ink,
      soft: 0.05,
    });

    // 3. contour, then the lit rim over it so the crescent stays visible
    L.inkPath(ctx, egg, {
      closed: true,
      smooth: false,
      width: 3.2,
      color: P.ink,
      seed: sd(4),
      wobble: 1.15,
      step: 4,
    });
    L.rimLight(ctx, egg, {
      dir: dir,
      width: 20,
      color: P.sun,
      alpha: 0.95,
      threshold: 0.08,
    });

    // 4. the light itself, on the same circle the shadow and rim answer to
    const orbit = 470;
    L.glowDot(ctx, 540 + sx * orbit, 960 + sy * orbit, 18, {
      color: P.sun,
      core: P.glow,
      additive: false,
      rays: 14,
      rayLen: 1.7,
      rayWidth: 0.16,
      glow: 2.4,
      seed: sd(5),
    });
  },
});
