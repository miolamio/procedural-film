// grade.duotone invariants. Loaded only by check.cjs --fixtures. No Math.random / Date.

function duoPlate(w, h, grade) {
  const c = FILM.makeCanvas(w, h);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, w, h / 3);
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, h / 3, w, h / 3);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, (2 * h) / 3, w, h - (2 * h) / 3);
  ctx.fillStyle = FILM.lib.pal.magenta;
  ctx.fillRect(w / 4, h / 3 + 2, w / 2, h / 3 - 4);
  if (grade !== undefined) FILM.applyGrade(ctx, grade);
  return c;
}

function duoPx(c, x, y) {
  const d = c.getContext('2d', { willReadFrequently: true }).getImageData(x, y, 1, 1).data;
  return [d[0], d[1], d[2]];
}

function duoHex(name) {
  const n = parseInt(FILM.lib.pal[name].slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function duoNear(got, want, tol, what) {
  const off = Math.max(Math.abs(got[0] - want[0]), Math.abs(got[1] - want[1]), Math.abs(got[2] - want[2]));
  FILM.expect.true(off <= tol, `${what} reads ${got.join(',')}, expected ${want.join(',')} (±${tol})`);
}

FILM.assert('duotone off, amount 0 or an unknown name leaves the frame untouched', () => {
  const bare = FILM.pixels(duoPlate(48, 72)).hash();
  FILM.expect.eq(FILM.pixels(duoPlate(48, 72, { duotone: ['ink', 'paleBlue'], duotoneAmount: 0 })).hash(), bare);
  FILM.expect.eq(FILM.pixels(duoPlate(48, 72, { duotone: ['ink', 'noSuchColour'] })).hash(), bare);
  FILM.expect.eq(FILM.pixels(duoPlate(48, 72, { duotone: ['ink'] })).hash(), bare);
  FILM.expect.eq(FILM.pixels(duoPlate(48, 72, { duotone: 'ink' })).hash(), bare);
});

FILM.assert('duotone 1 maps black to the dark colour and white to the light one', () => {
  const c = duoPlate(48, 72, { duotone: ['ink', 'paleBlue'] });
  const dark = duoHex('ink');
  const light = duoHex('paleBlue');
  duoNear(duoPx(c, 2, 2), dark, 2, 'black');
  duoNear(duoPx(c, 2, 70), light, 2, 'white');
  const mid = duoPx(c, 2, 36);
  for (let i = 0; i < 3; i++) {
    const want = dark[i] + (light[i] - dark[i]) * (128 / 255);
    FILM.expect.true(Math.abs(mid[i] - want) <= 3, `grey channel ${i} reads ${mid[i]}, expected about ${want.toFixed(0)}`);
  }
});

FILM.assert('duotone keeps every pixel on the dark-light line', () => {
  const c = duoPlate(48, 72, { duotone: ['night', 'sun'] });
  const dark = duoHex('night');
  const light = duoHex('sun');
  const px = duoPx(c, 24, 36); // magenta: a colour, not a grey
  // where light >= dark the channel is dark + L (light - dark); where it is not it stays at dark
  const L = [0, 1, 2].filter((i) => light[i] - dark[i] > 40).map((i) => (px[i] - dark[i]) / (light[i] - dark[i]));
  for (const l of L) FILM.expect.true(Math.abs(l - L[0]) < 0.03, `magenta maps to ${px.join(',')}, off the night-sun line`);
  for (let i = 0; i < 3; i++) if (!(light[i] > dark[i])) FILM.expect.true(Math.abs(px[i] - dark[i]) <= 2, `channel ${i} where sun < night reads ${px[i]}`);
});

FILM.assert('duotoneAmount 0.5 lands between the plate and the full duotone', () => {
  const half = duoPx(duoPlate(48, 72, { duotone: ['ink', 'paleBlue'], duotoneAmount: 0.5 }), 2, 70);
  const full = duoHex('paleBlue');
  for (let i = 0; i < 3; i++) {
    const lo = Math.min(255, full[i]);
    FILM.expect.true(half[i] >= lo - 2 && half[i] <= 257, `white at amount 0.5 channel ${i} reads ${half[i]}`);
  }
  FILM.expect.true(half[0] > full[0] + 20, `white at amount 0.5 reads ${half.join(',')}, too close to the full duotone`);
});

FILM.assert('duotone is deterministic', () => {
  const paint = () => FILM.pixels(duoPlate(40, 60, { duotone: ['night', 'sun'], duotoneAmount: 0.7, vignette: 0.5 })).hash();
  FILM.expect.eq(paint(), paint());
});
