// Spotlight-theme invariants, on the fixture plates fx-spotlight and fx-spotlight-b: poses and ink
// held on twos, a lit pool in a dark void, violet only on the joints, the cut held on the hand.
// Loaded only by check.cjs --fixtures.

const SPOT_INKS = { tealVoid: [25, 42, 44], sumi: [11, 16, 17], violet: [142, 79, 194], beamHot: [126, 247, 220] };

function spotRender(T, fn) {
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

function spotShot(id) {
  const shot = FILM.shots.find((s) => s.id === id);
  FILM.expect.true(!!shot, `missing shot ${id}`);
  return shot;
}

// Share of pixels within 24 per channel of each ink, the violet bounding box, and the mean
// luminance of the pool's heart against the frame's corners.
function spotCensus(c) {
  const d = c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, c.width, c.height).data;
  const names = Object.keys(SPOT_INKS);
  const count = Object.fromEntries(names.map((n) => [n, 0]));
  const box = [Infinity, Infinity, -Infinity, -Infinity];
  const sx = c.width / 1080, sy = c.height / 1920;
  let heart = 0, heartN = 0, corner = 0, cornerN = 0;
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    const x = p % c.width, y = Math.floor(p / c.width);
    for (const n of names) {
      const k = SPOT_INKS[n];
      if (Math.abs(d[i] - k[0]) <= 24 && Math.abs(d[i + 1] - k[1]) <= 24 && Math.abs(d[i + 2] - k[2]) <= 24) {
        count[n]++;
        if (n === 'violet') {
          box[0] = Math.min(box[0], x);
          box[1] = Math.min(box[1], y);
          box[2] = Math.max(box[2], x);
          box[3] = Math.max(box[3], y);
        }
        break;
      }
    }
    const lum = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    const fx = x / sx, fy = y / sy;
    if (Math.hypot(fx - 320, fy - 780) < 70) (heart += lum), heartN++;
    if ((fx < 120 || fx > 960) && fy < 160) (corner += lum), cornerN++;
  }
  const n = d.length / 4;
  const share = Object.fromEntries(names.map((k) => [k, count[k] / n]));
  return { share, box, heart: heart / Math.max(1, heartN), corner: corner / Math.max(1, cornerN) };
}

FILM.assert('spotlight plate A holds each drawing for two frames', () => {
  const shot = spotShot('fx-spotlight');
  const hashes = [];
  for (let k = 0; k < 10; k++) hashes.push(spotRender(shot.start + 0.5 + k / FILM.FPS, (c) => FILM.pixels(c).hash()));
  for (let k = 1; k < 10; k++) {
    if (k % 2) FILM.expect.eq(hashes[k], hashes[k - 1], `frame ${k} is a new drawing inside a hold of two`);
    else FILM.expect.true(hashes[k] !== hashes[k - 1], `frame ${k} repeats the last drawing; the hold is longer than two`);
  }
});

FILM.assert('spotlight plate A is a lit pool in a void, brush ink, violet only on the joints', () => {
  const shot = spotShot('fx-spotlight');
  const { share, heart, corner } = spotRender(shot.start + 0.5, spotCensus);
  FILM.expect.true(heart > 200 && corner < 50, `the pool's heart reads ${heart.toFixed(0)} and the void ${corner.toFixed(0)}`);
  FILM.expect.true(share.tealVoid > 0.15, `the void covers only ${(share.tealVoid * 100).toFixed(1)}%`);
  FILM.expect.true(share.sumi > 0.08, `the ink covers only ${(share.sumi * 100).toFixed(1)}%`);
  FILM.expect.true(share.beamHot > 0.02, `the pool's heart covers only ${(share.beamHot * 100).toFixed(1)}%`);
  FILM.expect.true(share.violet > 0.0005 && share.violet < 0.01, `the violet accent covers ${(share.violet * 100).toFixed(2)}%`);
});

FILM.assert('spotlight plate B cuts on the hand: the violet joints keep their place', () => {
  const b = spotShot('fx-spotlight-b');
  const A = spotRender(b.start - 1 / FILM.FPS, spotCensus);
  const B = spotRender(b.start, spotCensus);
  FILM.expect.true(B.heart < 120, `plate B's pool is lit like plate A (${B.heart.toFixed(0)})`);
  const [a, c] = [A.box, B.box];
  FILM.expect.true(a[2] - a[0] > 150 && a[3] - a[1] > 150, `plate A has no hand (${a[2] - a[0]}×${a[3] - a[1]})`);
  // one drawing on twos separates the two frames; the joints move by a few pixels at most
  for (let i = 0; i < 4; i++) FILM.expect.true(Math.abs(a[i] - c[i]) <= 12, `the joints' box moves from ${a.join(',')} to ${c.join(',')} on the cut`);
});
