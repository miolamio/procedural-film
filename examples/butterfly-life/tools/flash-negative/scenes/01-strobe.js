// Full-frame black/white at 6 Hz. A cycle is 4 frames (24 fps).
// Phase is black, white, white, black so each of the six pulses rises and falls inside frames 0..23.
FILM.scene({
  id: 'strobe-6',
  draw(ctx, t, info) {
    const phase = info.frame % 4;
    const on = phase === 1 || phase === 2;
    ctx.fillStyle = on ? 'white' : 'black';
    ctx.fillRect(0, 0, info.W, info.H);
  },
});
