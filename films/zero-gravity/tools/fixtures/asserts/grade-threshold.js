// grade.threshold invariants. Loaded only by check.cjs --fixtures. No Math.random / Date.

// A grey ramp 0..255 on row 0, the same ramp tinted with pal colours on rows 1 and 2.
function thrPlate(grade) {
  const c = FILM.makeCanvas(256, 3);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  for (let x = 0; x < 256; x++) {
    ctx.fillStyle = `rgb(${x},${x},${x})`;
    ctx.fillRect(x, 0, 1, 3);
  }
  ctx.globalCompositeOperation = 'color';
  ctx.fillStyle = FILM.lib.pal.teal;
  ctx.fillRect(0, 1, 256, 1);
  ctx.fillStyle = FILM.lib.pal.orange;
  ctx.fillRect(0, 2, 256, 1);
  ctx.globalCompositeOperation = 'source-over';
  if (grade !== undefined) FILM.applyGrade(ctx, grade);
  return c;
}

function thrRow(c, y) {
  const d = c.getContext('2d', { willReadFrequently: true }).getImageData(0, y, 256, 1).data;
  const out = [];
  for (let x = 0; x < 256; x++) out.push([d[x * 4], d[x * 4 + 1], d[x * 4 + 2]]);
  return out;
}

FILM.assert('threshold 0 leaves the frame untouched', () => {
  const bare = FILM.pixels(thrPlate()).hash();
  FILM.expect.eq(FILM.pixels(thrPlate({ threshold: 0 })).hash(), bare);
  FILM.expect.eq(FILM.pixels(thrPlate({ threshold: 0, invert: 0 })).hash(), bare);
});

FILM.assert('threshold 1 is black below mid grey and white above it, with no colour left', () => {
  const c = thrPlate({ threshold: 1 });
  for (let y = 0; y < 3; y++) {
    const row = thrRow(c, y);
    for (let x = 0; x < 256; x++) {
      const p = row[x];
      FILM.expect.true(Math.max(p[0], p[1], p[2]) - Math.min(p[0], p[1], p[2]) <= 1, `row ${y} x ${x} reads ${p.join(',')}, not a grey`);
    }
    // a colour row's luminosity is not exactly its x, so its edge may sit a few steps off
    const margin = y ? 24 : 6;
    for (let x = 0; x < 128 - margin; x++) FILM.expect.true(row[x][0] <= 2, `row ${y} x ${x} reads ${row[x][0]}, not black`);
    for (let x = 128 + margin; x < 256; x++) FILM.expect.true(row[x][0] >= 253, `row ${y} x ${x} reads ${row[x][0]}, not white`);
  }
});

FILM.assert('threshold is monotone and steepens with the amount', () => {
  const rows = [0, 0.25, 0.5, 0.75, 1].map((t) => thrRow(thrPlate({ threshold: t }), 0));
  for (const row of rows) {
    for (let x = 1; x < 256; x++) FILM.expect.true(row[x][0] >= row[x - 1][0], `ramp steps down at x ${x}`);
  }
  for (let i = 1; i < rows.length; i++) {
    FILM.expect.true(rows[i][64][0] <= rows[i - 1][64][0], `grey 64 is lighter at the higher amount (${rows[i][64][0]} > ${rows[i - 1][64][0]})`);
    FILM.expect.true(rows[i][192][0] >= rows[i - 1][192][0], `grey 192 is darker at the higher amount (${rows[i][192][0]} < ${rows[i - 1][192][0]})`);
  }
  FILM.expect.true(rows[2][64][0] < 40 && rows[2][192][0] > 215, `threshold 0.5 maps 64 to ${rows[2][64][0]} and 192 to ${rows[2][192][0]}`);
});

FILM.assert('threshold is deterministic, and a duotone over it prints two flat colours', () => {
  const paint = () => FILM.pixels(thrPlate({ threshold: 0.6, vignette: 0.4 })).hash();
  FILM.expect.eq(paint(), paint());
  const row = thrRow(thrPlate({ threshold: 1, duotone: ['ink', 'paper'] }), 0);
  const n = (h) => parseInt(FILM.lib.pal[h].slice(1), 16);
  const ink = n('ink');
  const paper = n('paper');
  const hex = (p) => (p[0] << 16) | (p[1] << 8) | p[2];
  const near = (a, b) => Math.abs((a >> 16) - (b >> 16)) <= 2 && Math.abs(((a >> 8) & 255) - ((b >> 8) & 255)) <= 2 && Math.abs((a & 255) - (b & 255)) <= 2;
  FILM.expect.true(near(hex(row[10]), ink), `dark end reads ${row[10].join(',')}, not ink`);
  FILM.expect.true(near(hex(row[245]), paper), `light end reads ${row[245].join(',')}, not paper`);
});
