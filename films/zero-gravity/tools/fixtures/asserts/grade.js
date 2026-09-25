// Grade invariants. Loaded only by check.cjs --fixtures. No Math.random / Date.
// The pass lives on FILM.applyGrade. A neutral grade must not touch pixels.

function gradeLum(r, g, b) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function gradePlate(w, h, grade) {
  const c = FILM.makeCanvas(w, h);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = FILM.lib.pal.paper;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = FILM.lib.pal.leaf;
  ctx.beginPath();
  ctx.ellipse(w / 2, h / 2, w * 0.22, h * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = FILM.lib.pal.ink;
  ctx.fillRect(w / 2 - 4, h * 0.18, 8, h * 0.12);
  if (arguments.length > 2) FILM.applyGrade(ctx, grade);
  return c;
}

FILM.assert('a canvas drawn with no grade hashes equal to the same drawing', () => {
  const bare = FILM.pixels(gradePlate(96, 144)).hash();
  FILM.expect.eq(FILM.pixels(gradePlate(96, 144, null)).hash(), bare);
  FILM.expect.eq(FILM.pixels(gradePlate(96, 144, undefined)).hash(), bare);
  FILM.expect.eq(FILM.pixels(gradePlate(96, 144, {})).hash(), bare);
  FILM.expect.eq(FILM.pixels(gradePlate(96, 144, { warmth: 0, fade: 0, vignette: 0, paperAge: 0, tintAmount: 0 })).hash(), bare);
  FILM.expect.eq(FILM.pixels(gradePlate(96, 144, { tint: 'sun', tintAmount: 0 })).hash(), bare);
  const c = gradePlate(96, 144);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  const h = FILM.pixels(c).hash();
  FILM.applyGrade(ctx, null);
  FILM.applyGrade(ctx, undefined);
  FILM.applyGrade(ctx, {});
  FILM.expect.eq(FILM.pixels(c).hash(), h);
});

FILM.assert('vignette 1 makes the corner darker than the centre', () => {
  const w = 160;
  const h = 240;
  const c = gradePlate(w, h, { vignette: 1 });
  const ctx = c.getContext('2d', { willReadFrequently: true });
  const d = ctx.getImageData(0, 0, w, h).data;
  const lum = (x, y) => {
    const k = (y * w + x) * 4;
    return gradeLum(d[k], d[k + 1], d[k + 2]);
  };
  const centre = lum((w / 2) | 0, (h / 2) | 0);
  const corner = (lum(1, 1) + lum(w - 2, 1) + lum(1, h - 2) + lum(w - 2, h - 2)) / 4;
  FILM.expect.true(centre - corner >= 40, `centre ${centre.toFixed(1)} is not clearly lighter than the corner ${corner.toFixed(1)}`);
});

FILM.assert('grade is deterministic', () => {
  const paint = () => FILM.pixels(gradePlate(80, 120, {
    warmth: 0.8,
    fade: 0.55,
    vignette: 1,
    paperAge: 0.4,
    tint: 'sun',
    tintAmount: 0.35,
  })).hash();
  FILM.expect.eq(paint(), paint());
});
