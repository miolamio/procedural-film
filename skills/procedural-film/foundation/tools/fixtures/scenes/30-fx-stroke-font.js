// Fixture plate for the stroke font: a hand-scratched wordmark writing itself on (crater), the
// whole glyph set in the hand style, then a stencil wordmark and the same set with bridges
// (scallop, xerox). The ink boils on the 12 fps clock; nothing else moves after the reveal.
function drawStrokeFontPlate(ctx, t, info) {
  const L = info.lib;
  const P = L.pal;
  L.paper(ctx);
  const set = 'ABCDEFGHIJKLM\nNOPQRSTUVWXYZ\n0123456789 .,:;!?\'"-/+=()\nАБВГДЕЁЖЗИЙКЛМН\nОПРСТУФХЦЧШЩЪЫЬЭЮЯ';
  L.strokeText(ctx, 'Crater', 90, 110, { size: 150, color: P.ink, reveal: L.clamp(t / 1.2), ink: { double: true }, seed: 3 });
  L.strokeText(ctx, set, 90, 330, { size: 50, color: P.ink, seed: 5 });
  ctx.fillStyle = P.stripeCream;
  ctx.fillRect(0, 810, info.W, 1110);
  L.strokeText(ctx, 'Scallop', 540, 880, { style: 'stencil', size: 130, color: P.red, align: 'center' });
  L.strokeText(ctx, set, 90, 1090, { style: 'stencil', size: 46, color: P.ink });
  L.strokeText(ctx, 'xerox no. 7 / 2026', 540, 1560, { style: 'stencil', size: 64, color: P.tealDeep, align: 'center', tracking: 0.6 });
  L.strokeText(ctx, 'рукопись, трафарет', 540, 1720, { size: 72, color: P.ink, align: 'center', seed: 9 });
}

FILM.scene({ id: 'fx-stroke-font', draw: drawStrokeFontPlate });
