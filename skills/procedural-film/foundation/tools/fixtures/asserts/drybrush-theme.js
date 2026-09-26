// Drybrush-theme invariants, on the fixture plates fx-drybrush and fx-drybrush-b: drawings held on
// twos and turning a frame ahead of the beat, a frame with no colour in it (grey paper, one ink, a
// black mount), and plate B as the exact negative of the frame before the cut.
// Loaded only by check.cjs --fixtures.

function drybrushRender(T, fn) {
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

function drybrushShot(id) {
  const shot = FILM.shots.find((s) => s.id === id);
  FILM.expect.true(!!shot, `missing shot ${id}`);
  return shot;
}

function drybrushData(c) {
  return c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, c.width, c.height).data;
}

FILM.assert('drybrush holds each drawing for two frames, turning one frame ahead of the beat', () => {
  const shot = drybrushShot('fx-drybrush');
  const hashes = [];
  for (let k = 0; k < 12; k++) hashes.push(drybrushRender(shot.start + k / FILM.FPS, (c) => FILM.pixels(c).hash()));
  for (let k = 1; k < 12; k++) {
    if (k % 2) FILM.expect.true(hashes[k] !== hashes[k - 1], `frame ${k} repeats frame ${k - 1}: a new drawing should land on the odd frame`);
    else FILM.expect.eq(hashes[k], hashes[k - 1], `frame ${k} is a new drawing inside a hold of two`);
  }
});

FILM.assert('drybrush plate A has no colour: grey paper, grey planes, one ink and the black mount', () => {
  const shot = drybrushShot('fx-drybrush');
  const d = drybrushRender(shot.start + 0.5, drybrushData);
  const n = d.length / 4;
  let chroma = 0, paper = 0, dark = 0, mid = 0;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    if (Math.max(r, g, b) - Math.min(r, g, b) > 20) chroma++;
    if (Math.abs(r - 211) <= 16 && Math.abs(g - 211) <= 16 && Math.abs(b - 211) <= 16) paper++;
    else if (r < 48 && g < 48 && b < 56) dark++;
    else if (r > 80 && r < 190) mid++;
  }
  FILM.expect.true(chroma / n < 0.002, `${((chroma / n) * 100).toFixed(2)}% of pixels carry colour; the theme has no accent`);
  FILM.expect.true(paper / n > 0.2, `grey paper covers only ${((paper / n) * 100).toFixed(1)}%`);
  FILM.expect.true(dark / n > 0.25, `ink and mount cover only ${((dark / n) * 100).toFixed(1)}%`);
  FILM.expect.true(mid / n > 0.04, `the far planes cover only ${((mid / n) * 100).toFixed(1)}%`);
});

FILM.assert('drybrush plate B is the exact negative of the frame before the cut', () => {
  const b = drybrushShot('fx-drybrush-b');
  const A = drybrushRender(b.start - 1 / FILM.FPS, (c) => drybrushData(c).slice());
  const B = drybrushRender(b.start, drybrushData);
  let off = 0, worst = 0;
  for (let i = 0; i < A.length; i += 4) {
    const e = Math.max(Math.abs(B[i] - (255 - A[i])), Math.abs(B[i + 1] - (255 - A[i + 1])), Math.abs(B[i + 2] - (255 - A[i + 2])));
    if (e > 3) off++;
    if (e > worst) worst = e;
  }
  const share = off / (A.length / 4);
  FILM.expect.true(share < 0.001, `${(share * 100).toFixed(2)}% of pixels are not the negative across the cut (worst ${worst}): the cut must fall inside a held drawing`);
  // and the next drawing moves on: the cut is a negative of a held frame, not a freeze
  const C = drybrushRender(b.start + 1 / FILM.FPS, drybrushData);
  let moved = 0;
  for (let i = 0; i < B.length; i += 4) if (Math.abs(C[i] - B[i]) > 24) moved++;
  FILM.expect.true(moved > 0, 'plate B does not move after the cut');
});
