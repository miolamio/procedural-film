// Same inline arrow as canvas-nokey. The key keeps one plate.
FILM.scene({
  id: 'blur-key',
  draw(ctx, t, info) {
    const L = info.lib;
    const P = L.pal;
    ctx.fillStyle = P.paper;
    ctx.fillRect(0, 0, info.W, info.H);
    L.layers(ctx, { zoom: 1 }, [{
      z: 4,
      static: true,
      blur: 2,
      key: 'teal-block',
      draw: (g) => {
        g.fillStyle = P.teal;
        g.fillRect(480, 900, 120, 80);
      },
    }]);
  },
});
