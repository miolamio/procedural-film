// lib.noisePlate invariants. Loaded only by check.cjs --fixtures. No Math.random / Date.

function npPaint(w, h, opts) {
  const c = FILM.makeCanvas(w, h);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  FILM.lib.noisePlate(ctx, Object.assign({ w: w, h: h }, opts));
  return c;
}

function npCover(c) {
  const n = c.width * c.height;
  return FILM.pixels(c).count((r, g, b, a) => a > 127) / n;
}

FILM.assert('noisePlate covers 1 - threshold of the plate for any seed and scale', () => {
  for (const [seed, scale, threshold] of [[1, 30, 0.7], [2, 80, 0.7], [3, [6, 120], 0.2], [4, 12, 0.9]]) {
    const cover = npCover(npPaint(240, 200, { seed: seed, scale: scale, threshold: threshold, soft: 0, res: 1, color: 'ink' }));
    FILM.expect.near(cover, 1 - threshold, 0.03);
  }
});

FILM.assert('noisePlate threshold 1 and alpha 0 draw nothing; threshold 0 fills', () => {
  const blank = FILM.makeCanvas(64, 64);
  const hBlank = FILM.pixels(blank).hash();
  FILM.expect.eq(FILM.pixels(npPaint(64, 64, { threshold: 1 })).hash(), hBlank);
  FILM.expect.eq(FILM.pixels(npPaint(64, 64, { threshold: 0.5, alpha: 0 })).hash(), hBlank);
  const full = npPaint(64, 64, { threshold: 0, soft: 0, res: 1, color: FILM.lib.pal.ink });
  FILM.expect.eq(FILM.pixels(full).count((r, g, b, a) => a === 255), 64 * 64);
});

FILM.assert('noisePlate takes a lib.pal name or a colour, and the same seed gives the same plate', () => {
  const byName = FILM.pixels(npPaint(96, 80, { seed: 9, color: 'teal', threshold: 0.6 })).hash();
  const byHex = FILM.pixels(npPaint(96, 80, { seed: 9, color: FILM.lib.pal.teal, threshold: 0.6 })).hash();
  FILM.expect.eq(byName, byHex);
  const other = FILM.pixels(npPaint(96, 80, { seed: 10, color: 'teal', threshold: 0.6 })).hash();
  FILM.expect.true(other !== byName, 'seed 10 drew the same plate as seed 9');
});

FILM.assert('noisePlate boil variants differ and repeat every three', () => {
  const h = (boil) => FILM.pixels(npPaint(120, 100, { seed: 5, scale: 20, threshold: 0.6, grain: 0.3, boil: boil })).hash();
  const v0 = h(0), v1 = h(1), v2 = h(2);
  FILM.expect.true(v0 !== v1 && v1 !== v2 && v0 !== v2, 'boil variants 0, 1, 2 are not three plates');
  FILM.expect.eq(h(3), v0);
  FILM.expect.eq(h(false), v0);
});

FILM.assert('noisePlate scale [sx, sy] stretches the field into streaks', () => {
  const c = npPaint(160, 160, { seed: 7, scale: [4, 200], threshold: 0.5, soft: 0, res: 1 });
  const d = c.getContext('2d').getImageData(0, 0, 160, 160).data;
  let sameV = 0, sameH = 0;
  for (let y = 0; y < 159; y++) {
    for (let x = 0; x < 159; x++) {
      const a = d[(y * 160 + x) * 4 + 3] > 127;
      if (a === d[((y + 1) * 160 + x) * 4 + 3] > 127) sameV++;
      if (a === d[(y * 160 + x + 1) * 4 + 3] > 127) sameH++;
    }
  }
  FILM.expect.true(sameV > sameH * 1.2, `vertical neighbours agree ${sameV}, horizontal ${sameH}`);
});

FILM.assert('noisePlate second call creates no canvas', () => {
  FILM.expect.true(typeof window.__canvases === 'number', 'harness canvas counter is missing');
  const c = FILM.makeCanvas(140, 120);
  const ctx = c.getContext('2d');
  const opt = { w: 140, h: 120, seed: 11, scale: 18, threshold: 0.75, grain: 0.2, boil: 1 };
  FILM.lib.noisePlate(ctx, opt);
  const n = window.__canvases;
  FILM.lib.noisePlate(ctx, opt);
  FILM.expect.eq(window.__canvases, n);
});

FILM.assert('fx-noise-plate frames hash the same in forward and reverse order', () => {
  const shot = FILM.shots.find((s) => s.id === 'fx-noise-plate');
  FILM.expect.true(!!shot, 'missing shot fx-noise-plate');
  const times = [];
  for (let k = 0; k < 6; k++) times.push(shot.start + (k * 9) / FILM.FPS);
  const prev = FILM.post;
  FILM.post = false;
  try {
    const hash = (T) => {
      FILM.renderFrame(T);
      return FILM.pixels(FILM.canvas).hash();
    };
    const fwd = times.map(hash);
    const rev = times.slice().reverse().map(hash).reverse();
    for (let k = 0; k < times.length; k++) FILM.expect.eq(rev[k], fwd[k]);
    FILM.expect.true(new Set(fwd).size > 1, 'every sampled frame is the same picture: boil does not move');
  } finally {
    FILM.post = prev;
  }
});
