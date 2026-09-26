// Fixture scene for lib.noisePlate. Global T 54–56.
// Top: snow. Bare ink trees on an overexposed white; a boiling white plate eats their lower half,
// fine ink speckle sits over it, one red drop falls. Bottom: xerox. A bold stencil on white; toner
// dropouts and vertical streaks, a new copy generation on every beat.
FILM.scene({
  id: 'fx-noise-plate',
  draw(ctx, t, info) {
    const L = info.lib;
    const P = L.pal;
    const W = info.W, H = info.H, half = H / 2;
    const snow = P.white, sheet = P.white, toner = P.navyDeep;

    // ---- snow
    ctx.fillStyle = snow;
    ctx.fillRect(0, 0, W, half);
    const trees = [[150, 0.9], [330, 0.7], [560, 1], [760, 0.8], [940, 0.65]];
    trees.forEach(([x, k], i) => {
      const base = half - 60, top = half - 60 - 640 * k;
      L.inkPath(ctx, [[x, base], [x + 6, (base + top) / 2], [x - 4, top]], { width: 9 * k, color: P.ink, seed: 40 + i });
      for (let b = 0; b < 5; b++) {
        const by = L.lerp(base - 180 * k, top + 40, b / 4);
        const side = b % 2 ? 1 : -1;
        const len = (120 - b * 16) * k;
        L.inkPath(ctx, [[x, by], [x + side * len * 0.6, by - len * 0.5], [x + side * len, by - len * 0.9]], { width: 3.2 * k, color: P.ink, seed: 60 + i * 7 + b });
      }
    });
    // overexposure: the white eats the ground and the foot of every trunk
    L.noisePlate(ctx, { h: half, seed: 12, scale: 150, threshold: 0.45, soft: 0.3, color: snow, alpha: 0.94, boil: true });
    ctx.fillStyle = snow;
    ctx.fillRect(0, half - 120, W, 120);
    // stipple: dense fine ink grain only
    L.noisePlate(ctx, { h: half, seed: 13, scale: 6, threshold: 0.93, soft: 0.02, grain: 1, color: 'ink', alpha: 0.4, res: 0.5, boil: true });
    // one drop, falling on twos
    const dy = L.lerp(180, half - 150, L.ease.inQuad(L.onTwos(t) / info.dur));
    ctx.fillStyle = P.red;
    ctx.beginPath();
    ctx.arc(700, dy, 11, 0, Math.PI * 2);
    ctx.fill();

    // ---- xerox
    ctx.fillStyle = sheet;
    ctx.fillRect(0, half, W, half);
    ctx.fillStyle = toner;
    ctx.fillRect(120, half + 180, 840, 150);
    ctx.fillRect(120, half + 380, 260, 520);
    ctx.beginPath();
    ctx.arc(700, half + 640, 250, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = sheet;
    ctx.beginPath();
    ctx.arc(700, half + 640, 110, 0, Math.PI * 2);
    ctx.fill();
    const gen = L.beat(info.T).n % 3;
    // toner dropouts: paper-coloured specks and blotches over the ink
    L.noisePlate(ctx, { y: half, h: half, seed: 21, scale: 26, threshold: 0.8, soft: 0.06, grain: 0.45, color: sheet, boil: gen });
    // drum streaks: long, thin, vertical
    L.noisePlate(ctx, { y: half, h: half, seed: 22, scale: [5, 900], threshold: 0.95, soft: 0.05, octaves: 2, color: sheet, alpha: 0.9, res: 0.5, boil: gen });
    // toner dust on the white
    L.noisePlate(ctx, { y: half, h: half, seed: 23, scale: 4, threshold: 0.985, soft: 0, grain: 1, color: toner, res: 0.5 });
  },
});
