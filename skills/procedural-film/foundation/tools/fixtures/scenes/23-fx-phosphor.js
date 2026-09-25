// Fixture plate for the phosphor theme's primitives: pixelText typing with a cursor, a sprite, a
// glowing oscilloscope trace. Both shots carry the crt carrier; the second opens through crtoff.
function drawPhosphorPlate(ctx, t, info) {
  const L = info.lib;
  const P = L.pal;
  ctx.fillStyle = P.navyDeep;
  ctx.fillRect(0, 0, info.W, info.H);
  const on = info.shot.id === 'fx-phosphor-on';
  const cell = 6;
  L.pixelText(ctx, on ? 'SIGNAL OK' : 'PROCEDURAL FILM', 120, 300, cell, { color: P.lineWhite });
  const log = 'LOADING PLATE 23\nBOIL CLOCK 12 FPS\nCARRIER CRT\nREADY';
  L.pixelText(ctx, log, 120, 420, 5, { color: P.paleBlue, chars: (info.T - 44) * 30, cursor: L.boil(info.T, 3) % 2 === 0 });
  const critter = [
    '...#...#...',
    '....#.#....',
    '.#########.',
    '.#.......#.',
    '.#.##.##.#.',
    '.#.......#.',
    '.#########.',
    '...#...#...',
  ];
  L.sprite(ctx, critter, 540, 820, 14, { color: P.lineWhite, align: 'center' });
  const trace = [];
  for (let i = 0; i <= 160; i++) {
    const x = 120 + i * 5.25;
    trace.push([x, 1300 + Math.sin(i * 0.19 + info.T * 6) * 90 * Math.sin(i * 0.02 + 0.3)]);
  }
  L.glow(ctx, trace, { width: 2.5, radius: 9, color: P.paleBlue });
}

for (const id of ['fx-phosphor', 'fx-phosphor-on']) {
  FILM.scene({ id, draw: drawPhosphorPlate });
}
