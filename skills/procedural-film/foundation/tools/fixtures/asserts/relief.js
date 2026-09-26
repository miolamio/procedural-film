// Relief-theme invariants, on the fixture plates fx-relief and fx-relief-b: motion on ones, plate A
// a false-colour island on black with a thin amber thread, plate B isolines on black without a
// fill, the cut held on the amber isoline, the furniture held across it. Loaded only by
// check.cjs --fixtures.

const RELIEF_INK = { blue: [30, 63, 154], sand: [216, 196, 138], sun: [223, 197, 5], amber: [255, 159, 28] };

function reliefRender(T, fn) {
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

function reliefShot(id) {
  const shot = FILM.shots.find((s) => s.id === id);
  FILM.expect.true(!!shot, `missing shot ${id}`);
  return shot;
}

function reliefData(c) {
  return { d: c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, c.width, c.height).data, w: c.width, h: c.height, s: c.width / FILM.W };
}

const reliefNear = (d, i, k, tol) => Math.abs(d[i] - k[0]) <= tol && Math.abs(d[i + 1] - k[1]) <= tol && Math.abs(d[i + 2] - k[2]) <= tol;
const reliefBlack = (d, i) => d[i] < 12 && d[i + 1] < 12 && d[i + 2] < 12;

function reliefShares(c) {
  const { d } = reliefData(c);
  const n = d.length / 4;
  const out = { black: 0, blue: 0, sand: 0, sun: 0, amber: 0 };
  for (let i = 0; i < d.length; i += 4) {
    if (reliefBlack(d, i)) out.black++;
    if (reliefNear(d, i, RELIEF_INK.blue, 40)) out.blue++;
    if (reliefNear(d, i, RELIEF_INK.sand, 30)) out.sand++;
    if (reliefNear(d, i, RELIEF_INK.sun, 40)) out.sun++;
    if (reliefNear(d, i, RELIEF_INK.amber, 24)) out.amber++;
  }
  for (const k of Object.keys(out)) out[k] /= n;
  return out;
}

const reliefPct = (v) => `${(v * 100).toFixed(2)}%`;

FILM.assert('relief plates move on ones: every frame is a new drawing', () => {
  for (const id of ['fx-relief', 'fx-relief-b']) {
    const shot = reliefShot(id);
    let prev = null;
    for (let k = 0; k < 6; k++) {
      const h = reliefRender(shot.start + 0.25 + k / FILM.FPS, (c) => FILM.pixels(c).hash());
      if (prev !== null) FILM.expect.true(h !== prev, `${id}: frame ${k} repeats the last one; the plate holds instead of drifting on ones`);
      prev = h;
    }
  }
});

FILM.assert('relief plate A is a false-colour island on black with a thin amber thread', () => {
  const shot = reliefShot('fx-relief');
  reliefRender(shot.start + 0.5, (c) => {
    const s = reliefShares(c);
    FILM.expect.true(s.black > 0.4, `the void covers only ${reliefPct(s.black)}`);
    FILM.expect.true(s.blue > 0.02, `the blue shallows cover ${reliefPct(s.blue)}`);
    FILM.expect.true(s.sand > 0.005, `the sand coast covers ${reliefPct(s.sand)}`);
    FILM.expect.true(s.sun > 0.001, `no yellow summit (${reliefPct(s.sun)})`);
    FILM.expect.true(s.amber > 0.0005 && s.amber < 0.01, `the amber thread covers ${reliefPct(s.amber)}, not 0.05 to 1%`);
  });
});

FILM.assert('relief plate B is isolines on black: no fill, the thread still amber', () => {
  const shot = reliefShot('fx-relief-b');
  reliefRender(shot.start + 0.5, (c) => {
    const s = reliefShares(c);
    FILM.expect.true(s.black > 0.8, `black covers only ${reliefPct(s.black)}; the map is filled`);
    FILM.expect.true(s.blue < 0.005, `blue covers ${reliefPct(s.blue)}; only the coast line may be blue`);
    FILM.expect.true(s.amber > 0.0005 && s.amber < 0.01, `the amber isoline covers ${reliefPct(s.amber)}`);
  });
});

FILM.assert('relief cuts on the isoline: the amber thread keeps its place across the cut', () => {
  const b = reliefShot('fx-relief-b');
  const mask = (c) => {
    const { d, w, h, s } = reliefData(c);
    const m = new Uint8Array(w * h);
    // 24, as the accent budget measures: wider, and the orange quads below the summit count too
    for (let i = 0, p = 0; i < d.length; i += 4, p++) m[p] = reliefNear(d, i, RELIEF_INK.amber, 24) ? 1 : 0;
    return { m, w, h, r: Math.max(1, Math.round(4 * s)) };
  };
  const A = reliefRender(b.start - 1 / FILM.FPS, mask);
  const B = reliefRender(b.start, mask);
  const kept = (P, Q) => {
    let n = 0, hit = 0;
    for (let y = 0; y < P.h; y++) {
      for (let x = 0; x < P.w; x++) {
        if (!P.m[y * P.w + x]) continue;
        n++;
        let found = false;
        for (let dy = -P.r; dy <= P.r && !found; dy++) {
          const yy = y + dy;
          if (yy < 0 || yy >= P.h) continue;
          for (let dx = -P.r; dx <= P.r; dx++) {
            const xx = x + dx;
            if (xx >= 0 && xx < P.w && Q.m[yy * P.w + xx]) {
              found = true;
              break;
            }
          }
        }
        if (found) hit++;
      }
    }
    return { n, f: n ? hit / n : 0 };
  };
  const ab = kept(A, B), ba = kept(B, A);
  FILM.expect.true(ab.n > 200 * (A.r / 4) ** 2, `no amber thread on the last frame of plate A (${ab.n} px)`);
  FILM.expect.true(ab.f > 0.9, `only ${(ab.f * 100).toFixed(1)}% of plate A's thread lands on plate B's isoline`);
  FILM.expect.true(ba.f > 0.9, `only ${(ba.f * 100).toFixed(1)}% of plate B's isoline was on plate A's thread`);
});

FILM.assert('relief furniture holds across the cut: title, coordinates and legend are the same pixels', () => {
  const b = reliefShot('fx-relief-b');
  const crop = (c) => {
    const { s } = reliefData(c);
    const g = c.getContext('2d', { willReadFrequently: true });
    return [[80, 200, 920, 75], [80, 1440, 920, 60]].map(([x, y, w, h]) =>
      Array.from(g.getImageData(Math.round(x * s), Math.round(y * s), Math.round(w * s), Math.round(h * s)).data).join(',')
    );
  };
  const A = reliefRender(b.start - 1 / FILM.FPS, crop);
  const B = reliefRender(b.start, crop);
  FILM.expect.eq(A[0] === B[0], true, 'the title block changes across the cut');
  FILM.expect.eq(A[1] === B[1], true, 'the legend changes across the cut');
});
