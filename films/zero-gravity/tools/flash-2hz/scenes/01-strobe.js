// Same full-frame strobe at 2 Hz: one cycle every 12 frames, two finished flashes in the second.
// The red square is static, so the frame is not one flat colour. It covers one grid block, under the 25% area.
FILM.scene({
  id: 'strobe-2',
  draw(ctx, t, info) {
    const phase = info.frame % 12;
    const on = phase >= 1 && phase <= 6;
    ctx.fillStyle = on ? 'white' : 'black';
    ctx.fillRect(0, 0, info.W, info.H);
    ctx.fillStyle = 'red';
    ctx.fillRect(0, 0, 48, 48);
  },
});
