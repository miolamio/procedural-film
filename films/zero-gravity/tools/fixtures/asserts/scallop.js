// Scallop-theme invariants, on the fixture plates fx-scallop and fx-scallop-b: drawings held on
// threes, a frame printed in three inks and one accent, the cut held on the hull's silhouette.
// Loaded only by check.cjs --fixtures.

const SCALLOP_INKS = { sheet: [245, 242, 239], scarlet: [179, 18, 20], soot: [20, 18, 19], lagoon: [119, 225, 204] };

function scallopRender(T, fn) {
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

function scallopShot(id) {
  const shot = FILM.shots.find((s) => s.id === id);
  FILM.expect.true(!!shot, `missing shot ${id}`);
  return shot;
}

// Share of pixels nearest each ink (within 24 per channel), and the lagoon bounding box.
function scallopCensus(c) {
  const d = c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, c.width, c.height).data;
  const names = Object.keys(SCALLOP_INKS);
  const count = Object.fromEntries(names.map((n) => [n, 0]));
  let other = 0;
  const box = [Infinity, Infinity, -Infinity, -Infinity];
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    let hit = null;
    for (const n of names) {
      const k = SCALLOP_INKS[n];
      if (Math.abs(d[i] - k[0]) <= 24 && Math.abs(d[i + 1] - k[1]) <= 24 && Math.abs(d[i + 2] - k[2]) <= 24) {
        hit = n;
        break;
      }
    }
    if (!hit) other++;
    else count[hit]++;
    if (hit === 'lagoon') {
      const x = p % c.width, y = Math.floor(p / c.width);
      box[0] = Math.min(box[0], x);
      box[1] = Math.min(box[1], y);
      box[2] = Math.max(box[2], x);
      box[3] = Math.max(box[3], y);
    }
  }
  const n = d.length / 4;
  const share = Object.fromEntries(names.map((k) => [k, count[k] / n]));
  return { share, other: other / n, box };
}

FILM.assert('scallop plate A holds each drawing for three frames', () => {
  const shot = scallopShot('fx-scallop');
  const hashes = [];
  for (let k = 0; k < 12; k++) hashes.push(scallopRender(shot.start + k / FILM.FPS, (c) => FILM.pixels(c).hash()));
  for (let k = 0; k < 12; k++) {
    if (k % 3) FILM.expect.eq(hashes[k], hashes[k - 1], `frame ${k} is a new drawing inside a hold of three`);
    else if (k) FILM.expect.true(hashes[k] !== hashes[k - 1], `frame ${k} repeats the last drawing; the hold is longer than three`);
  }
});

FILM.assert('scallop plate A is three inks and one small accent', () => {
  const shot = scallopShot('fx-scallop');
  const { share, other } = scallopRender(shot.start + 0.5, scallopCensus);
  FILM.expect.true(other < 0.02, `${(other * 100).toFixed(2)}% of pixels are none of the four inks`);
  for (const n of ['sheet', 'scarlet', 'soot']) FILM.expect.true(share[n] > 0.08, `${n} covers only ${(share[n] * 100).toFixed(1)}%`);
  FILM.expect.true(share.lagoon > 0.005 && share.lagoon < 0.06, `the lagoon accent covers ${(share.lagoon * 100).toFixed(2)}%`);
});

FILM.assert('scallop plate B cuts on the hull: the lagoon silhouette keeps its size and place', () => {
  const b = scallopShot('fx-scallop-b');
  const A = scallopRender(b.start - 1 / FILM.FPS, scallopCensus).box;
  const B = scallopRender(b.start, scallopCensus).box;
  const plateB = scallopRender(b.start, scallopCensus).share;
  FILM.expect.true(plateB.scarlet > 0.5, 'plate B is not on a scarlet ground');
  const wA = A[2] - A[0], wB = B[2] - B[0], hA = A[3] - A[1], hB = B[3] - B[1];
  FILM.expect.true(wA > 200 && hA > 30, `plate A has no hull (${wA}×${hA})`);
  FILM.expect.true(Math.abs(wA - wB) <= 8 && Math.abs(hA - hB) <= 12, `the hull is ${wA}×${hA} before the cut and ${wB}×${hB} after`);
  // one drawing's travel (150 px/s on threes) and bob is all that separates the two frames
  FILM.expect.true(Math.abs(A[0] - B[0]) <= 24 && Math.abs(A[1] - B[1]) <= 12, `the hull jumps from ${A[0]},${A[1]} to ${B[0]},${B[1]} on the cut`);
});
