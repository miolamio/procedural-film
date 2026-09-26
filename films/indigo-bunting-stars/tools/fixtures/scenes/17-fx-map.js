// Fixture scene: spinning globe and a curve. Exercises projection, graticule, drawGeoLine, plot.
// The arc is the monarch route from southern Ontario (44 N, 80 W) to Michoacán (19.6 N, 100.3 W).

function greatArc(a, b, n) {
  const vec = (lon, lat) => {
    const λ = lon * Math.PI / 180;
    const φ = lat * Math.PI / 180;
    const c = Math.cos(φ);
    return [c * Math.cos(λ), c * Math.sin(λ), Math.sin(φ)];
  };
  const ll = (v) => [Math.atan2(v[1], v[0]) * 180 / Math.PI, Math.asin(Math.max(-1, Math.min(1, v[2]))) * 180 / Math.PI];
  const va = vec(a[0], a[1]);
  const vb = vec(b[0], b[1]);
  let d = va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2];
  d = Math.max(-1, Math.min(1, d));
  const om = Math.acos(d);
  const s = Math.sin(om);
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    if (!(s > 1e-8)) {
      out.push([a[0], a[1]]);
      continue;
    }
    const w1 = Math.sin((1 - t) * om) / s;
    const w2 = Math.sin(t * om) / s;
    out.push(ll([w1 * va[0] + w2 * vb[0], w1 * va[1] + w2 * vb[1], w1 * va[2] + w2 * vb[2]]));
  }
  return out;
}

const MIGRATION = greatArc([-80, 44], [-100.3, 19.6], 36);

FILM.scene({
  id: 'fx-map',
  draw(ctx, t, info) {
    const L = info.lib;
    const P = L.pal;
    L.blueprint(ctx, { seed: 11, center: [540, 540] });

    const at = [540, 530];
    const R = 246;
    // t = 0 faces the route. The limb sweeps across it over the second half of the shot.
    const lon0 = -72 + t * 72;
    const proj = L.projection({ kind: 'ortho', lon0, lat0: 32, scale: R, at });

    ctx.save();
    const shade = ctx.createRadialGradient(at[0] - R * 0.32, at[1] - R * 0.36, R * 0.08, at[0], at[1], R);
    shade.addColorStop(0, P.navyLight);
    shade.addColorStop(0.7, P.navy);
    shade.addColorStop(1, P.navyDeep);
    ctx.fillStyle = shade;
    ctx.beginPath();
    ctx.arc(at[0], at[1], R, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    L.graticule(ctx, proj, {
      step: 30,
      sample: 5,
      penStep: 6,
      color: P.paleBlue,
      alpha: 0.92,
      width: 1.45,
      clipCircle: true,
      seed: 4,
      wobble: 0.65,
    });

    ctx.save();
    ctx.beginPath();
    ctx.arc(at[0], at[1], R + 0.5, 0, Math.PI * 2);
    ctx.clip();
    L.drawGeoLine(ctx, proj, MIGRATION, {
      color: P.magenta,
      width: 5,
      seed: 9,
      wobble: 1.1,
      taper: [14, 16],
      sample: 2,
    });
    const stops = [[-80, 44], [-100.3, 19.6]];
    for (let i = 0; i < stops.length; i++) {
      const p = proj.project(stops[i][0], stops[i][1]);
      if (!p) continue;
      if (Math.hypot(p[0] - at[0], p[1] - at[1]) > R - 11) continue;
      ctx.beginPath();
      ctx.fillStyle = P.magenta;
      ctx.arc(p[0], p[1], 6.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    L.inkCircle(ctx, at[0], at[1], R, { color: P.lineWhite, width: 2.5, seed: 6, wobble: 1 });

    const pts = [];
    for (let i = 0; i <= 56; i++) {
      const x = (i / 56) * 12;
      pts.push([x, 94 / (1 + Math.exp(-(x - 5.2) * 0.9))]);
    }
    L.plot(ctx, {
      box: [200, 920, 740, 400],
      x: [0, 12],
      y: [0, 100],
      ticks: 5,
      color: P.lineWhite,
      width: 1.7,
      seed: 15,
      series: [{ pts, color: P.lavender, width: 3.4, reveal: L.smoothstep(0.05, info.dur * 0.88, t), seed: 21, wobble: 1 }],
      labels: { x: 'week', y: 'km', title: 'migration' },
    });
  },
});
