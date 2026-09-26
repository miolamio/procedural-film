// Crater-theme invariants, on the fixture plates fx-crater and fx-crater-b: drawings held on twos,
// a red frame with one yolk throat, plate B a heat map in stepped bands, the cut held on the hero's
// silhouette. Loaded only by check.cjs --fixtures.

const CRATER_INK = { crater: [179, 18, 20], yolk: [223, 197, 5], yolkHot: [244, 238, 138] };

function craterRender(T, fn) {
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

function craterShot(id) {
  const shot = FILM.shots.find((s) => s.id === id);
  FILM.expect.true(!!shot, `missing shot ${id}`);
  return shot;
}

function craterData(c) {
  return { d: c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, c.width, c.height).data, w: c.width, h: c.height, s: c.width / FILM.W };
}

const craterNear = (d, i, k, tol) => Math.abs(d[i] - k[0]) <= tol && Math.abs(d[i + 1] - k[1]) <= tol && Math.abs(d[i + 2] - k[2]) <= tol;
const craterDark = (d, i) => d[i] < 70 && d[i + 1] < 50 && d[i + 2] < 50;

FILM.assert('crater plates hold each drawing for two frames', () => {
  for (const id of ['fx-crater', 'fx-crater-b']) {
    const shot = craterShot(id);
    const hashes = [];
    for (let k = 0; k < 8; k++) hashes.push(craterRender(shot.start + k / FILM.FPS, (c) => FILM.pixels(c).hash()));
    for (let k = 1; k < 8; k++) {
      if (k % 2) FILM.expect.eq(hashes[k], hashes[k - 1], `${id}: frame ${k} is a new drawing inside a hold of two`);
      else FILM.expect.true(hashes[k] !== hashes[k - 1], `${id}: frame ${k} repeats the last drawing; the hold is longer than two`);
    }
  }
});

FILM.assert('crater plate A is red paper with one yolk throat at the bottom', () => {
  const shot = craterShot('fx-crater');
  craterRender(shot.start + 0.5, (c) => {
    const { d, w, h, s } = craterData(c);
    let red = 0, yolk = 0, yolkLow = 0;
    for (let i = 0, p = 0; i < d.length; i += 4, p++) {
      if (craterNear(d, i, CRATER_INK.crater, 40)) red++;
      if (craterNear(d, i, CRATER_INK.yolk, 24)) {
        yolk++;
        if (Math.floor(p / w) > h * 0.6) yolkLow++;
      }
    }
    const n = d.length / 4;
    FILM.expect.true(red / n > 0.3, `the red ground covers only ${((red / n) * 100).toFixed(1)}%`);
    FILM.expect.true(yolk / n > 0.01 && yolk / n < 0.08, `the yolk accent covers ${((yolk / n) * 100).toFixed(2)}%`);
    FILM.expect.true(yolkLow / yolk > 0.95, 'yolk shows outside the throat, above the lower 40% of the frame');
    const at = (x, y) => (Math.round(y * s) * w + Math.round(x * s)) * 4;
    FILM.expect.true(craterNear(d, at(540, 1640), CRATER_INK.yolkHot, 40), 'the throat core is not the hot yolk');
  });
});

FILM.assert('crater plate B is a heat map of a few flat bands', () => {
  const shot = craterShot('fx-crater-b');
  craterRender(shot.start + 0.5, (c) => {
    const { d, w, s } = craterData(c);
    // a column down the middle, away from the figures: colours that hold for a run of pixels are bands
    const x = Math.round(540 * s);
    const runs = new Map();
    let prev = null, len = 0;
    for (let y = Math.round(800 * s); y < Math.round(1900 * s); y++) {
      const i = (y * w + x) * 4;
      const key = `${d[i]},${d[i + 1]},${d[i + 2]}`;
      if (key === prev) len++;
      else {
        if (prev && len >= 6 * s) runs.set(prev, true);
        prev = key;
        len = 1;
      }
    }
    if (prev && len >= 6 * s) runs.set(prev, true);
    FILM.expect.true(runs.size >= 5 && runs.size <= 8, `the middle column crosses ${runs.size} flat bands, not 5 to 8`);
  });
});

FILM.assert('crater plate B cuts on the hero: the silhouette keeps its place', () => {
  const b = craterShot('fx-crater-b');
  // the hero's legs, clear of the hair: every dark pixel of the last plate A frame has a dark
  // pixel near it on the first plate B frame (one drawing's travel, and the tremble, apart)
  const box = [270, 1000, 600, 1450];
  const mask = (c) => {
    const { d, w, s } = craterData(c);
    const x0 = Math.round(box[0] * s), y0 = Math.round(box[1] * s), x1 = Math.round(box[2] * s), y1 = Math.round(box[3] * s);
    const m = new Uint8Array((x1 - x0) * (y1 - y0));
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) m[(y - y0) * (x1 - x0) + (x - x0)] = craterDark(d, (y * w + x) * 4) ? 1 : 0;
    return { m, bw: x1 - x0, bh: y1 - y0, r: Math.max(2, Math.round(8 * s)) };
  };
  const A = craterRender(b.start - 1 / FILM.FPS, mask);
  const B = craterRender(b.start, mask);
  let dark = 0, kept = 0;
  for (let y = 0; y < A.bh; y++) {
    for (let x = 0; x < A.bw; x++) {
      if (!A.m[y * A.bw + x]) continue;
      dark++;
      let hit = false;
      for (let dy = -A.r; dy <= A.r && !hit; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= A.bh) continue;
        for (let dx = -A.r; dx <= A.r; dx++) {
          const xx = x + dx;
          if (xx >= 0 && xx < A.bw && B.m[yy * A.bw + xx]) {
            hit = true;
            break;
          }
        }
      }
      if (hit) kept++;
    }
  }
  FILM.expect.true(dark > 200 * (A.r / 8) ** 2, `no hero in the cut box (${dark} dark pixels)`);
  FILM.expect.true(kept / dark > 0.85, `only ${((kept / dark) * 100).toFixed(1)}% of the hero's line is still there after the cut`);
});
