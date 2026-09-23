// Fixture scene: scale mosaic (shifted rows, jitter, palette gradient) over cracked earth.
// Both diagrams are cached; frame 0 is already the full drawing. A sheen crosses the scales.
FILM.scene({
  id: 'fx-cells',
  draw(ctx, t, info) {
    const L = info.lib;
    const P = L.pal;

    L.paper(ctx, { seed: 11 });
    L.text(ctx, 'scale mosaic', 72, 128, { size: 40, color: P.ink, tracking: 0.6 });
    L.text(ctx, 'shifted rows', 1008, 128, { size: 26, color: P.inkFaint, align: 'right', italic: true });
    L.text(ctx, 'cracked earth', 72, 1024, { size: 34, color: P.ink });
    L.text(ctx, 'on paper', 1008, 1024, { size: 26, color: P.inkFaint, align: 'right', italic: true });

    const SX = 64, SY = 168, SW = 952, SH = 800;
    const scaleSites = [];
    const sRnd = L.rng(L.hash('fx-cells', 'scales'));
    const colW = 86, rowH = 72, jit = 11;
    const c1 = Math.ceil(SW / colW) + 1;
    const r1 = Math.ceil(SH / rowH) + 1;
    for (let r = -1; r <= r1; r++) {
      const shift = (r & 1) ? colW * 0.5 : 0;
      for (let c = -1; c <= c1; c++) {
        scaleSites.push([
          SX + shift + c * colW + (sRnd() - 0.5) * 2 * jit,
          SY + r * rowH + (sRnd() - 0.5) * 2 * jit,
        ]);
      }
    }
    const scales = L.voronoi(scaleSites, [SX, SY, SW, SH]);
    const glide = L.clamp(t / info.dur);
    ctx.save();
    ctx.beginPath();
    ctx.rect(SX, SY, SW, SH);
    ctx.clip();
    L.cells(ctx, scales, {
      seed: 3,
      fill: (i, cell) => {
        const u = L.clamp((cell.site[0] - SX) / SW);
        const v = L.clamp((cell.site[1] - SY) / SH);
        const wob = L.h3(i, 5, 11);
        const top = L.mix(P.sun, P.orange, u);
        const mid = L.mix(P.duskRose, P.rose, u);
        const bot = L.mix(P.sage, P.tealDeep, u);
        let col = L.mix(L.mix(top, mid, L.smoothstep(0, 0.55, v)), bot, L.smoothstep(0.35, 1, v));
        if (wob > 0.78) col = L.mix(col, P.white, 0.28);
        else if (wob < 0.1) col = L.mix(col, P.ochre, 0.35);
        const sheen = 1 - L.smoothstep(0, 200, Math.abs(cell.site[0] - L.lerp(SX, SX + SW, glide)));
        return L.mix(col, P.white, 0.2 * sheen);
      },
    });
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = P.ink;
    ctx.lineWidth = 3;
    ctx.strokeRect(SX + 1.5, SY + 1.5, SW - 3, SH - 3);
    ctx.restore();

    const EX = 64, EY = 1068, EW = 952, EH = 740;
    const earthSites = [];
    const eRnd = L.rng(L.hash('fx-cells', 'earth'));
    const gapX = 128, gapY = 116, ej = 46;
    const ec1 = Math.ceil(EW / gapX) + 1;
    const er1 = Math.ceil(EH / gapY) + 1;
    for (let r = -1; r <= er1; r++) {
      for (let c = -1; c <= ec1; c++) {
        earthSites.push([
          EX + c * gapX + (eRnd() - 0.5) * 2 * ej,
          EY + r * gapY + (eRnd() - 0.5) * 2 * ej,
        ]);
      }
    }
    const earthClip = [EX, EY, EW, EH];
    const earth = L.voronoi(earthSites, earthClip, { relax: 2 });
    ctx.save();
    ctx.fillStyle = P.ink;
    ctx.fillRect(EX, EY, EW, EH);
    ctx.beginPath();
    ctx.rect(EX, EY, EW, EH);
    ctx.clip();
    L.cells(ctx, earth, {
      inset: 6.5,
      round: 11,
      seed: 9,
      clip: earthClip,
      fill: (i, cell) => {
        const v = L.clamp((cell.site[1] - EY) / EH);
        const k = L.h3(i, 2, 8);
        const dry = L.mix(P.tan, P.wood, k);
        const deep = L.mix(P.ochre, P.paperDeep, 0.55 * k + 0.2 * v);
        return L.mix(dry, deep, 0.28 + 0.45 * v);
      },
    });
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = P.ink;
    ctx.lineWidth = 3;
    ctx.strokeRect(EX + 1.5, EY + 1.5, EW - 3, EH - 3);
    ctx.restore();
  },
});
