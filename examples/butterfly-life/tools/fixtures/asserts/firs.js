// Firs-theme invariants, on the fixture plates fx-firs and fx-firs-b: a frame in the theme's flat
// inks with one small accent, the swarm moving on every frame while the figures hold on twos, and
// plate B as the negative that keeps the fir edge. Loaded only by check.cjs --fixtures.

const FIRS_INKS = {
  ember: [226, 112, 30], rust: [168, 68, 15], pitch: [14, 11, 9], snow: [243, 239, 230],
  bone: [232, 210, 168], sepia: [116, 70, 31], ice: [88, 180, 224],
};

function firsRender(T, fn) {
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

function firsShot(id) {
  const shot = FILM.shots.find((s) => s.id === id);
  FILM.expect.true(!!shot, `missing shot ${id}`);
  return shot;
}

function firsData(c) {
  return c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, c.width, c.height).data;
}

// Share of pixels within 24 per channel of each ink (inverted inks when neg), and the rest.
function firsCensus(c, neg) {
  const d = firsData(c);
  const names = Object.keys(FIRS_INKS);
  const inks = names.map((n) => (neg ? FIRS_INKS[n].map((v) => 255 - v) : FIRS_INKS[n]));
  const count = names.map(() => 0);
  let other = 0;
  for (let i = 0; i < d.length; i += 4) {
    let hit = -1;
    for (let k = 0; k < inks.length && hit < 0; k++) {
      const q = inks[k];
      if (Math.abs(d[i] - q[0]) <= 24 && Math.abs(d[i + 1] - q[1]) <= 24 && Math.abs(d[i + 2] - q[2]) <= 24) hit = k;
    }
    if (hit < 0) other++;
    else count[hit]++;
  }
  const n = d.length / 4;
  return { share: Object.fromEntries(names.map((k, i) => [k, count[i] / n])), other: other / n };
}

// Hash of a horizontal band of the frame, [y0, y1) as fractions of the height.
function firsBand(c, y0, y1) {
  const d = firsData(c);
  const a = Math.floor(y0 * c.height) * c.width * 4, b = Math.floor(y1 * c.height) * c.width * 4;
  let h = 2166136261;
  for (let i = a; i < b; i += 4) h = Math.imul(h ^ (d[i] * 65536 + d[i + 1] * 256 + d[i + 2]), 16777619) >>> 0;
  return h;
}

FILM.assert('firs plate A is flat theme inks, with ember, pitch and snow and one small ice accent', () => {
  const shot = firsShot('fx-firs');
  for (const t of [0.25, 0.75]) {
    const { share, other } = firsRender(shot.start + t, (c) => firsCensus(c, false));
    FILM.expect.true(other < 0.02, `t ${t}: ${(other * 100).toFixed(2)}% of pixels are none of the inks`);
    FILM.expect.true(share.ember > 0.25, `t ${t}: the sky covers only ${(share.ember * 100).toFixed(1)}%`);
    FILM.expect.true(share.pitch > 0.1, `t ${t}: the fir edge covers only ${(share.pitch * 100).toFixed(1)}%`);
    FILM.expect.true(share.snow > 0.2, `t ${t}: the snow covers only ${(share.snow * 100).toFixed(1)}%`);
    FILM.expect.true(share.bone > 0.02 && share.sepia > 0.005, `t ${t}: no swarm of eyes (bone ${share.bone}, sepia ${share.sepia})`);
    FILM.expect.true(share.ice > 0.001 && share.ice < 0.01, `t ${t}: the ice accent covers ${(share.ice * 100).toFixed(2)}%`);
  }
});

FILM.assert('firs: the swarm drifts on every frame, the figures on the snow hold on twos', () => {
  const shot = firsShot('fx-firs');
  const sky = [], row = [];
  for (let k = 0; k < 12; k++) {
    firsRender(shot.start + k / FILM.FPS, (c) => {
      sky.push(firsBand(c, 0, 0.55));
      row.push(firsBand(c, 0.78, 1));
    });
  }
  for (let k = 1; k < 12; k++) {
    FILM.expect.true(sky[k] !== sky[k - 1], `frame ${k}: the swarm did not move`);
    if (k % 2) FILM.expect.eq(row[k], row[k - 1], `frame ${k}: the figures changed inside a hold of two`);
    else FILM.expect.true(row[k] !== row[k - 1], `frame ${k}: the figures held longer than two`);
  }
});

FILM.assert('firs plate B is the negative in the same inks and keeps the fir edge across the cut', () => {
  const b = firsShot('fx-firs-b');
  const { share, other } = firsRender(b.start + 0.5, (c) => firsCensus(c, true));
  FILM.expect.true(other < 0.02, `${(other * 100).toFixed(2)}% of plate B is none of the inverted inks`);
  FILM.expect.true(share.ember > 0.25 && share.snow > 0.2, 'plate B is not the negative of the sky and the snow');
  // the edge band: pitch in plate A must be inverted pitch in plate B, pixel for pixel, bar the
  // eyes that drift over it by one frame
  const band = (c, ink) => {
    const d = firsData(c);
    const y0 = Math.floor(0.45 * c.height), y1 = Math.floor(0.72 * c.height);
    const m = new Uint8Array((y1 - y0) * c.width);
    for (let y = y0, j = 0; y < y1; y++) for (let x = 0; x < c.width; x++, j++) {
      const i = (y * c.width + x) * 4;
      m[j] = Math.abs(d[i] - ink[0]) <= 24 && Math.abs(d[i + 1] - ink[1]) <= 24 && Math.abs(d[i + 2] - ink[2]) <= 24 ? 1 : 0;
    }
    return m;
  };
  const A = firsRender(b.start - 1 / FILM.FPS, (c) => band(c, FIRS_INKS.pitch));
  const B = firsRender(b.start, (c) => band(c, FIRS_INKS.pitch.map((v) => 255 - v)));
  let on = 0, diff = 0;
  for (let j = 0; j < A.length; j++) {
    on += A[j];
    diff += A[j] !== B[j] ? 1 : 0;
  }
  FILM.expect.true(on > A.length * 0.15, `plate A has no fir edge in the band (${on} px)`);
  FILM.expect.true(diff < on * 0.03, `the fir edge differs by ${diff} of ${on} px across the cut`);
});
