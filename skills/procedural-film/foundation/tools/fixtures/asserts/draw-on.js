// inkPath reveal: same pixels as the full line at the end, nothing at 0, a monotone prefix, matching ink.
// Loaded only by check.cjs --fixtures. No Math.random / Date.
FILM.assert('reveal: 1 pixel-hash equals the call without reveal', () => {
  const P = FILM.lib.pal;
  const cases = [
    [[[24, 48], [110, 96], [200, 40], [300, 88], [380, 52]], { seed: 4, width: 6, double: true, wobble: 1.5 }],
    [[[70, 36], [150, 24], [200, 80], [130, 120], [60, 90]], { seed: 8, width: 5, closed: true, fill: P.sage, double: true, wobble: 1.2 }],
  ];
  for (let c = 0; c < cases.length; c++) {
    const pts = cases[c][0], base = cases[c][1];
    const paint = (extra) => {
      const canvas = FILM.makeCanvas(420, 160);
      const ctx = canvas.getContext('2d');
      FILM.lib.inkPath(ctx, pts, Object.assign({}, base, extra));
      return FILM.pixels(canvas).hash();
    };
    const whole = paint({});
    FILM.expect.eq(paint({ reveal: 1 }), whole);
    FILM.expect.eq(paint({ reveal: [0, 1] }), whole);
    FILM.expect.eq(paint({ reveal: 1, nib: { r: 14, blot: 22, color: P.red } }), whole);
  }
});

FILM.assert('reveal: 0 paints no pixels', () => {
  const P = FILM.lib.pal;
  const canvas = FILM.makeCanvas(240, 140);
  const ctx = canvas.getContext('2d');
  const nib = { r: 12, blot: 18, color: P.red };
  FILM.lib.inkPath(ctx, [[20, 70], [120, 30], [220, 80]], {
    reveal: 0, nib: nib, double: true, width: 7, seed: 3, wobble: 2,
  });
  FILM.lib.inkPath(ctx, [[40, 30], [100, 24], [120, 80], [50, 90]], {
    closed: true, fill: P.ochre, reveal: 0, nib: { r: 10, blot: true, color: P.ink }, width: 5, seed: 6,
  });
  FILM.expect.eq(FILM.pixels(canvas).count((r, g, b, a) => a > 0), 0);
});

FILM.assert('painted-pixel count is non-decreasing across 11 steps of reveal', () => {
  const pts = [[18, 78], [90, 34], [160, 96], [240, 40], [320, 88], [400, 50]];
  const base = { seed: 11, width: 5, double: true, wobble: 1.6, tremble: 0.35, smooth: true };
  let prev = -1;
  for (let i = 0; i <= 10; i++) {
    const canvas = FILM.makeCanvas(440, 140);
    const ctx = canvas.getContext('2d');
    FILM.lib.inkPath(ctx, pts, Object.assign({ reveal: i / 10 }, base));
    const n = FILM.pixels(canvas).count((r, g, b, a) => a > 0);
    FILM.expect.true(n >= prev, 'reveal ' + (i / 10) + ' painted ' + n + ', previous ' + prev);
    prev = n;
  }
});

FILM.assert('at the same T the revealed portion matches the full line', () => {
  const pts = [[20, 70], [90, 36], [160, 100], [240, 40], [320, 84], [390, 48]];
  const base = {
    seed: 9, width: 12, wobble: 1.4, tremble: 0.3, rough: 0.25, smooth: true,
    double: { offset: 16, alpha: 0.45, width: 0.3, from: 0, to: 1 },
  };
  const W = 430, H = 150;
  const grab = (reveal) => {
    const canvas = FILM.makeCanvas(W, H);
    const ctx = canvas.getContext('2d');
    const opts = Object.assign({}, base);
    if (reveal != null) opts.reveal = reveal;
    FILM.lib.inkPath(ctx, pts, opts);
    return ctx.getImageData(0, 0, W, H).data;
  };
  // Same lib.T (same boil) and the same seed on every draw.
  const early = grab(0.22);
  const mid = grab(0.3);
  const dash = grab([0, 0.3]);
  const full = grab(null);
  FILM.expect.eq(FILM.pixels((() => {
    const c = FILM.makeCanvas(W, H);
    const ctx = c.getContext('2d');
    FILM.lib.inkPath(ctx, pts, Object.assign({ reveal: 0.3 }, base));
    return c;
  })()).hash(), FILM.pixels((() => {
    const c = FILM.makeCanvas(W, H);
    const ctx = c.getContext('2d');
    FILM.lib.inkPath(ctx, pts, Object.assign({ reveal: [0, 0.3] }, base));
    return c;
  })()).hash());
  let mask = 0, bad = 0;
  const solid = (data, x, y) => {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) return false;
        if (data[(yy * W + xx) * 4 + 3] !== 255) return false;
      }
    }
    return true;
  };
  for (let y = 2; y < H - 2; y++) {
    for (let x = 2; x < W - 2; x++) {
      if (!solid(early, x, y)) continue;
      mask++;
      const i = (y * W + x) * 4;
      if (mid[i] !== full[i] || mid[i + 1] !== full[i + 1] || mid[i + 2] !== full[i + 2] || mid[i + 3] !== full[i + 3]
        || early[i] !== full[i] || early[i + 1] !== full[i + 1] || early[i + 2] !== full[i + 2] || early[i + 3] !== full[i + 3]
        || dash[i] !== full[i] || dash[i + 1] !== full[i + 1] || dash[i + 2] !== full[i + 2] || dash[i + 3] !== full[i + 3]) bad++;
    }
  }
  FILM.expect.true(mask > 80, 'mask of the first 30% is empty (' + mask + ')');
  FILM.expect.eq(bad, 0);
  // The double, past the first 30%, must not have been drawn yet.
  let late = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 300; x < W; x++) if (mid[(y * W + x) * 4 + 3] > 0) late++;
  }
  FILM.expect.eq(late, 0);
});
