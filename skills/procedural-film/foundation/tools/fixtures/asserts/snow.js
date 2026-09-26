// Snow-theme invariants, on the fixture plates fx-snow and fx-snow-b: an overexposed white with ink
// and one small red drop, snow that is new on every frame, and plate B the exact negative of plate A
// with the drop left red. Loaded only by check.cjs --fixtures.

const SNOW_DROP = [179, 18, 20];

function snowRender(T, fn) {
  const prev = FILM.post;
  FILM.errors = [];
  FILM.post = false;
  try {
    FILM.renderFrame(T);
    return fn(FILM.canvas);
  } finally {
    FILM.post = prev;
  }
}

function snowShot(id) {
  const shot = FILM.shots.find((s) => s.id === id);
  FILM.expect.true(!!shot, `missing shot ${id}`);
  return shot;
}

function snowData(c) {
  return c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, c.width, c.height).data;
}

// A pixel is the drop within 40 of its red on every channel; colourful when its channels spread by more than 40.
const snowIsDrop = (d, i) => Math.abs(d[i] - SNOW_DROP[0]) <= 40 && Math.abs(d[i + 1] - SNOW_DROP[1]) <= 40 && Math.abs(d[i + 2] - SNOW_DROP[2]) <= 40;
const snowIsColour = (d, i) => Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]) > 40;

FILM.assert('snow plate A is an overexposed white with ink and one small red drop, nothing else in colour', () => {
  const shot = snowShot('fx-snow');
  snowRender(shot.start + 0.75, (c) => {
    const d = snowData(c);
    const n = d.length / 4;
    let white = 0, ink = 0, drop = 0, stray = 0;
    const box = [Infinity, Infinity, -Infinity, -Infinity];
    for (let i = 0, p = 0; i < d.length; i += 4, p++) {
      const lum = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
      if (lum > 0.85) white++;
      if (lum < 0.2) ink++;
      if (snowIsDrop(d, i)) {
        drop++;
        const x = p % c.width, y = Math.floor(p / c.width);
        box[0] = Math.min(box[0], x);
        box[1] = Math.min(box[1], y);
        box[2] = Math.max(box[2], x);
        box[3] = Math.max(box[3], y);
      } else if (snowIsColour(d, i)) stray++;
    }
    FILM.expect.true(white / n > 0.6, `only ${((white / n) * 100).toFixed(1)}% of the frame is overexposed white`);
    FILM.expect.true(ink / n > 0.01, `ink covers only ${((ink / n) * 100).toFixed(2)}%`);
    FILM.expect.true(drop > 0 && drop / n < 0.002, `the drop covers ${((drop / n) * 100).toFixed(3)}% of the frame`);
    const span = Math.max(box[2] - box[0], box[3] - box[1]) / FILM.S;
    FILM.expect.true(span < 120, `the red is spread over ${span.toFixed(0)} px: more than one drop`);
    FILM.expect.true(stray / n < 0.0005, `${stray} colourful pixels are not the drop`);
  });
});

FILM.assert('snow falls on ones: every frame of plate A is a new drawing', () => {
  const shot = snowShot('fx-snow');
  const hashes = [];
  for (let k = 0; k < 6; k++) hashes.push(snowRender(shot.start + 0.25 + k / FILM.FPS, (c) => FILM.pixels(c).hash()));
  for (let k = 1; k < 6; k++) FILM.expect.true(hashes[k] !== hashes[k - 1], `frame ${k} repeats frame ${k - 1}`);
});

// Plate B drawn by the core against plate A's draw run by hand at the same T, on one scratch canvas.
let snowScratch = null;
FILM.assert('snow plate B is the negative of plate A at the same T, and the drop stays red', () => {
  const a = snowShot('fx-snow'), b = snowShot('fx-snow-b');
  const T = b.start + 0.6; // the drop has landed
  const B = snowRender(T, (c) => snowData(c).slice());
  const W = FILM.canvas.width, H = FILM.canvas.height;
  if (!snowScratch || snowScratch.width !== W || snowScratch.height !== H) snowScratch = FILM.makeCanvas(W, H);
  const ctx = snowScratch.getContext('2d', { willReadFrequently: true });
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  FILM.baseTransform(ctx);
  const info = { dur: a.dur, p: 1, T, frame: Math.floor(T * FILM.FPS + 1e-6), W: FILM.W, H: FILM.H, S: FILM.S, lib: FILM.lib, shot: a, mode: 'illustrated', outgoing: false };
  ctx.save();
  FILM.registry['fx-snow'].draw(ctx, T - a.start, info);
  ctx.restore();
  const A = snowData(snowScratch);
  let off = 0, dropA = 0, dropB = 0, both = 0;
  for (let i = 0; i < A.length; i += 4) {
    const ra = snowIsDrop(A, i), rb = snowIsDrop(B, i);
    if (ra) dropA++;
    if (rb) dropB++;
    if (ra && rb) both++;
    if (ra || rb) continue;
    if (Math.abs(B[i] - (255 - A[i])) > 3 || Math.abs(B[i + 1] - (255 - A[i + 1])) > 3 || Math.abs(B[i + 2] - (255 - A[i + 2])) > 3) off++;
  }
  const n = A.length / 4;
  FILM.expect.true(off / n < 0.002, `${((off / n) * 100).toFixed(2)}% of plate B is not the negative of plate A`);
  FILM.expect.true(dropA > 0 && dropB > 0, `the drop is missing (A ${dropA} px, B ${dropB} px)`);
  FILM.expect.true(both >= 0.9 * Math.min(dropA, dropB), `the drop moved on the negative (${both} of ${dropA}/${dropB} px shared)`);
});
