// Xerox-theme invariants, on the fixture plates fx-xerox-theme and fx-xerox-theme-b: a frame of
// pure black and white under the threshold, drawings held on threes while the copy jitters on the
// boil clock, and plate B as the negative that keeps the figure's silhouette across the cut.
// Loaded only by check.cjs --fixtures.

// Render at T with the grain off; the carrier stays on unless `carrier` is false.
function xxtRender(T, fn, carrier = true) {
  const prevPost = FILM.post, prevCarrier = FILM.carrier;
  FILM.errors = [];
  FILM.post = false;
  if (!carrier) FILM.carrier = false;
  try {
    FILM.renderFrame(T);
    return fn(FILM.canvas);
  } finally {
    FILM.post = prevPost;
    FILM.carrier = prevCarrier;
  }
}

function xxtShot(id) {
  const shot = FILM.shots.find((s) => s.id === id);
  FILM.expect.true(!!shot, `missing shot ${id}`);
  return shot;
}

function xxtData(c) {
  return c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, c.width, c.height).data;
}

// Shares of near-black (<= 24), near-white (>= 231) and everything between, on the red channel
// (the frame is grey: the threshold drops the colour).
function xxtTones(c) {
  const d = xxtData(c);
  let black = 0, white = 0, grey = 0, tint = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i] <= 24) black++;
    else if (d[i] >= 231) white++;
    else grey++;
    if (Math.abs(d[i] - d[i + 1]) > 3 || Math.abs(d[i + 1] - d[i + 2]) > 3) tint++;
  }
  const n = d.length / 4;
  return { black: black / n, white: white / n, grey: grey / n, tint: tint / n };
}

function xxtHash(c) {
  const d = xxtData(c);
  let h = 2166136261;
  for (let i = 0; i < d.length; i += 4) h = Math.imul(h ^ (d[i] * 65536 + d[i + 1] * 256 + d[i + 2]), 16777619) >>> 0;
  return h;
}

FILM.assert('xerox theme plate A is black toner on white paper; only the copy adds greys', () => {
  const shot = xxtShot('fx-xerox-theme');
  for (const t of [0.25, 0.75]) {
    const { black, white, grey, tint } = xxtRender(shot.start + t, xxtTones);
    // the carrier's pale dropout bands and streaks are the only greys
    FILM.expect.true(grey < 0.12, `t ${t}: ${(grey * 100).toFixed(2)}% of pixels are grey`);
    FILM.expect.eq(tint, 0, `t ${t}: a coloured pixel survived the copy`);
    FILM.expect.true(white > 0.45 && black > 0.18, `t ${t}: white ${(white * 100).toFixed(1)}%, black ${(black * 100).toFixed(1)}%`);
  }
  // the source plate has greys (a shadow ramp, a grey scale, static): the threshold cuts them
  const src = xxtRender(shot.start + 0.25, xxtTones, false);
  FILM.expect.true(src.grey < 0.02, `without the carrier ${(src.grey * 100).toFixed(2)}% is still grey: the threshold grade is off`);
});

FILM.assert('xerox theme: drawings hold on threes, the copy jitters on the boil clock', () => {
  const shot = xxtShot('fx-xerox-theme');
  const bare = [], copy = [];
  for (let k = 0; k < 12; k++) {
    const T = shot.start + k / FILM.FPS;
    bare.push(xxtRender(T, xxtHash, false));
    copy.push(xxtRender(T, xxtHash));
  }
  for (let k = 1; k < 12; k++) {
    if (k % 3) FILM.expect.eq(bare[k], bare[k - 1], `frame ${k}: the drawing changed inside a hold of three`);
    else FILM.expect.true(bare[k] !== bare[k - 1], `frame ${k}: the drawing held longer than three`);
  }
  // frames 3, 4 and 5 are one drawing; the copy (12 fps) is new on frame 4 and holds to 5
  FILM.expect.true(copy[3] !== copy[4], 'the copy did not change between boil drawings');
  FILM.expect.eq(copy[4], copy[5], 'the copy changed inside one boil drawing');
});

FILM.assert('xerox theme plate B is the negative and keeps the figure silhouette across the cut', () => {
  const b = xxtShot('fx-xerox-theme-b');
  const tb = xxtRender(b.start + 0.5, xxtTones);
  FILM.expect.true(tb.grey < 0.12 && tb.tint === 0, `plate B grey ${(tb.grey * 100).toFixed(2)}%`);
  FILM.expect.true(tb.black > 0.45 && tb.white > 0.25, `plate B is not the negative: black ${(tb.black * 100).toFixed(1)}%, white ${(tb.white * 100).toFixed(1)}%`);
  // the coat, the arms and the head box (not the screen, not the swinging plug), without the
  // carrier: toner in plate A is paper in plate B, pixel for pixel
  // (inside the ring, whose bridges step round every drawing)
  const boxes = [[368, 566, 344, 256], [330, 870, 420, 390]];
  const mask = (dark) => (c) => {
    const d = xxtData(c);
    const s = c.width / FILM.W;
    const m = [];
    for (const box of boxes) for (let y = box[1]; y < box[1] + box[3]; y += 2) for (let x = box[0]; x < box[0] + box[2]; x += 2) {
      if (x > 390 && x < 630 && y > 588 && y < 800) continue; // the screen
      const v = d[(Math.floor(y * s) * c.width + Math.floor(x * s)) * 4];
      m.push(dark ? v < 128 : v >= 128);
    }
    return m;
  };
  const A = xxtRender(b.start - 1 / FILM.FPS, mask(true), false);
  const B = xxtRender(b.start, mask(false), false);
  let on = 0, diff = 0;
  for (let j = 0; j < A.length; j++) {
    on += A[j] ? 1 : 0;
    diff += A[j] !== B[j] ? 1 : 0;
  }
  FILM.expect.true(on > A.length * 0.3, `plate A has no figure in the box (${on} of ${A.length})`);
  FILM.expect.true(diff < on * 0.01, `the silhouette differs by ${diff} of ${on} px across the cut`);
});
