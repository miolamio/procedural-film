// Fixture scene: stateless particles. Sparks from a point on a blueprint plate,
// pollen drifting over paper, smoke rising. 800 particles, drawn on twos.
FILM.scene({
  id: 'fx-particles',
  draw(ctx, t, info) {
    const L = info.lib;
    const P = L.pal;
    const W = info.W;
    const H = info.H;
    const SPLIT = 1216;

    // 1. blueprint plate above, paper below. Flat fills: the cached paper and blueprint
    //    plates rebuild a full frame of noise and would blow this shot's cost budget.
    ctx.fillStyle = P.navy;
    ctx.fillRect(0, 0, W, SPLIT);
    ctx.fillStyle = P.paper;
    ctx.fillRect(0, SPLIT, W, H - SPLIT);
    ctx.fillStyle = P.paperDeep;
    ctx.fillRect(0, SPLIT, W, 8);

    // 2. faint grid and the spark's guide, so frame 0 is a plate even between motes
    ctx.beginPath();
    for (let x = 90; x < W; x += 90) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, SPLIT);
    }
    for (let y = 90; y < SPLIT; y += 90) {
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
    }
    ctx.strokeStyle = P.grid;
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.globalAlpha = 1;
    L.guideCircle(ctx, 540, 640, 210, { color: P.lavender, alpha: 0.4, width: 1.4 });

    // 3. smoke rising on the right of the plate, then sparks from the guide's centre
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, SPLIT);
    ctx.clip();
    L.particles(ctx, t, {
      seed: L.hash('fx-particles', 'smoke'),
      n: 48,
      emitter: { x: 790, y: 1100, r: 8 },
      rate: 24,
      life: 1.55,
      v0: [280, 520],
      angle: -Math.PI / 2,
      spread: 0.4,
      gravity: -20,
      drag: 0.55,
      wind: 70,
      size: 28,
      color: P.lavender,
      fade: 0.9,
      kind: 'smoke',
      onTwos: true,
      loop: 2,
    });
    L.particles(ctx, t, {
      seed: L.hash('fx-particles', 'sparks'),
      n: 360,
      emitter: { x: 540, y: 640, r: 8 },
      rate: 180,
      life: 1.05,
      v0: [560, 1020],
      angle: -Math.PI / 2,
      spread: 1.25,
      gravity: 1400,
      drag: 1.2,
      wind: 28,
      size: 8,
      color: P.magenta,
      fade: 1.2,
      kind: 'spark',
      additive: true,
      onTwos: true,
      loop: 2,
    });
    ctx.restore();

    // 4. pollen over the paper
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, SPLIT, W, H - SPLIT);
    ctx.clip();
    L.particles(ctx, t, {
      seed: L.hash('fx-particles', 'pollen'),
      n: 392,
      emitter: { x: 540, y: 1580, r: 320 },
      rate: 196,
      life: 1.6,
      v0: [36, 120],
      angle: -1.15,
      spread: 2.6,
      gravity: 50,
      drag: 0.45,
      wind: 170,
      size: 15,
      color: P.orange,
      fade: 0.35,
      kind: 'pollen',
      onTwos: true,
      loop: 2,
    });
    ctx.restore();

    ctx.fillStyle = P.glow;
    ctx.beginPath();
    ctx.arc(540, 640, 5, 0, L.TAU);
    ctx.fill();
  },
});
