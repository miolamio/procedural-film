// Fixture scene: the plate a whip lands on. Fully drawn at local t = 0.
// The whip itself is drawn by core, not by this scene.
FILM.scene({
  id: 'fx-whip',
  draw(ctx, t, info) {
    const L = info.lib;
    const P = L.pal;
    L.stripes(ctx, {
      colors: [P.stripeSky, P.stripeCream, P.stripeApricot, P.sun],
      width: 168,
      angle: -0.18,
      seed: 18,
      wobble: 1.1,
    });

    // Wind streaks in the upper safe area: sharp ink against the soft bands.
    ctx.save();
    ctx.strokeStyle = P.ink;
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < 12; i++) {
      const x = 70 + i * 78;
      ctx.moveTo(x, 240);
      ctx.lineTo(x + 36, 760);
    }
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = P.sun;
    ctx.strokeStyle = P.ink;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(780, 390, 118, 0, L.TAU);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = P.tealDeep;
    ctx.beginPath();
    ctx.moveTo(0, 1240);
    ctx.quadraticCurveTo(240, 1080, 480, 1220);
    ctx.quadraticCurveTo(720, 1360, 1080, 1140);
    ctx.lineTo(1080, 1920);
    ctx.lineTo(0, 1920);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = P.leaf;
    ctx.beginPath();
    ctx.moveTo(0, 1480);
    ctx.quadraticCurveTo(300, 1340, 560, 1500);
    ctx.quadraticCurveTo(840, 1660, 1080, 1420);
    ctx.lineTo(1080, 1920);
    ctx.lineTo(0, 1920);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    for (let i = 0; i < 5; i++) {
      const x = 150 + i * 185;
      const top = 1000 - (i % 2) * 50;
      ctx.save();
      ctx.fillStyle = P.ink;
      ctx.beginPath();
      ctx.moveTo(x, 1520);
      ctx.quadraticCurveTo(x - 36, 1200, x, top);
      ctx.quadraticCurveTo(x + 36, 1200, x, 1520);
      ctx.fill();
      ctx.fillStyle = P.wood;
      ctx.fillRect(x - 7, 1500, 14, 86);
      ctx.restore();
    }

    ctx.save();
    ctx.strokeStyle = P.ink;
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let x = 16; x < 1080; x += 16) {
      ctx.moveTo(x, 1700);
      ctx.lineTo(x + 3, 1610 + (x % 7) * 6);
    }
    ctx.stroke();
    ctx.restore();

    L.text(ctx, 'up', 80, 220, { size: 42, color: P.ink, tracking: 2 });
  },
});
