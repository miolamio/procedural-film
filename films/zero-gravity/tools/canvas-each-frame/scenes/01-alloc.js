// Allocates a bitmap on every frame, including a warm second pass.
FILM.scene({
  id: 'canvas-each-frame',
  draw(ctx, t, info) {
    const L = info.lib;
    const P = L.pal;
    const c = document.createElement('canvas');
    c.width = 32;
    c.height = 32;
    const g = c.getContext('2d');
    g.fillStyle = P.red;
    g.fillRect(0, 0, 32, 32);
    ctx.fillStyle = P.navy;
    ctx.fillRect(0, 0, info.W, info.H);
    ctx.drawImage(c, 500, 960);
  },
});
