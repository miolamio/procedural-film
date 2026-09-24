// Wash invariants. Loaded only by check.cjs --fixtures. No Math.random / Date.
// A rect is enough geometry to know the distance from every pixel to the clip.

const WASH_CLIP = [[48, 40], [188, 40], [188, 132], [48, 132]];
const WASH_BLEED = 6;
const WASH_ALPHA = 0.72;

function washLum(r, g, b) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function washOutside(x, y) {
  const dx = x < 48 ? 48 - x : x > 188 ? x - 188 : 0;
  const dy = y < 40 ? 40 - y : y > 132 ? y - 132 : 0;
  return Math.hypot(dx, dy);
}

function washEdgeDist(x, y) {
  if (x < 48 || x > 188 || y < 40 || y > 132) return Infinity;
  return Math.min(x - 48, 188 - x, y - 40, 132 - y);
}

function washPaint(edgeDarken, fill) {
  const c = FILM.makeCanvas(240, 180);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fillRect(0, 0, 240, 180);
  }
  FILM.lib.wash(ctx, WASH_CLIP, {
    color: FILM.lib.pal.sage,
    alpha: WASH_ALPHA,
    seed: 5,
    layers: 4,
    bleed: WASH_BLEED,
    edgeDarken: edgeDarken,
    granulation: 0.3,
    blooms: 0,
    dry: 0.15,
  });
  return ctx.getImageData(0, 0, 240, 180).data;
}

function washBandLum(data) {
  let band = 0;
  let bandN = 0;
  for (let y = 0; y < 180; y++) {
    for (let x = 0; x < 240; x++) {
      const ed = washEdgeDist(x + 0.5, y + 0.5);
      if (!(ed <= 4)) continue;
      const k = (y * 240 + x) * 4;
      if (data[k + 3] < 16) continue;
      band += washLum(data[k], data[k + 1], data[k + 2]);
      bandN++;
    }
  }
  return { lum: bandN ? band / bandN : 0, n: bandN };
}

FILM.assert('wash stays inside the bleed, covers the centre, and darkens the edge', () => {
  const c = FILM.makeCanvas(240, 180);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = FILM.lib.pal.night;
  ctx.fillRect(0, 0, 240, 180);
  const before = ctx.getImageData(0, 0, 240, 180).data;
  FILM.lib.wash(ctx, WASH_CLIP, {
    color: FILM.lib.pal.sage,
    alpha: WASH_ALPHA,
    seed: 5,
    layers: 4,
    bleed: WASH_BLEED,
    edgeDarken: 0.45,
    granulation: 0.3,
    blooms: 0,
    dry: 0.15,
  });
  const after = ctx.getImageData(0, 0, 240, 180).data;
  const limit = WASH_BLEED + 2;
  let dirty = 0;
  let dirtyAt = '';
  for (let y = 0; y < 180; y++) {
    for (let x = 0; x < 240; x++) {
      const cx = x + 0.5;
      const cy = y + 0.5;
      if (washOutside(cx, cy) <= limit) continue;
      const k = (y * 240 + x) * 4;
      if (after[k] !== before[k] || after[k + 1] !== before[k + 1] || after[k + 2] !== before[k + 2] || after[k + 3] !== before[k + 3]) {
        dirty++;
        if (!dirtyAt) dirtyAt = `(${x},${y}) rgba ${after[k]},${after[k + 1]},${after[k + 2]},${after[k + 3]}`;
      }
    }
  }
  FILM.expect.true(dirty === 0, dirty ? `${dirty} pixel(s) past bleed+2 changed, first ${dirtyAt}` : 'bleed held');

  const clear = washPaint(0.45, null);
  const centreA = clear[(86 * 240 + 118) * 4 + 3];
  FILM.expect.true(centreA < 250, `centre alpha ${centreA} is an opaque fill, not the wash`);
  FILM.expect.true(centreA / 255 > 0.5 * WASH_ALPHA, `centre alpha ${centreA} is not above half of ${WASH_ALPHA}`);

  const plain = washBandLum(washPaint(0, FILM.lib.pal.paper));
  const dark = washBandLum(washPaint(0.45, FILM.lib.pal.paper));
  FILM.expect.true(plain.n > 20 && dark.n > 20, `edge samples plain ${plain.n}, dark ${dark.n}`);
  FILM.expect.true(dark.lum < plain.lum - 1, `edgeDarken 0.45 lum ${dark.lum.toFixed(1)} is not darker than edgeDarken 0 lum ${plain.lum.toFixed(1)}`);
});

FILM.assert('a function clip is cached by key, not by its source text', () => {
  const bounds = { x: 0, y: 0, w: 240, h: 180 };
  const paint = (canvas, r, key) => {
    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, 240, 180);
    FILM.lib.wash(ctx, (g) => { g.arc(120, 90, r, 0, Math.PI * 2); }, {
      bounds: bounds,
      key: key,
      color: FILM.lib.pal.sage,
      alpha: 0.85,
      seed: 1,
      layers: 2,
      bleed: 0,
      edgeDarken: 0,
      granulation: 0,
      blooms: 0,
      dry: 0,
    });
    return FILM.pixels(canvas).count((r, g, b, a) => a > 16);
  };
  const small = FILM.makeCanvas(240, 180);
  const large = FILM.makeCanvas(240, 180);
  const a = paint(small, 30, 'r30');
  const b = paint(large, 80, 'r80');
  FILM.expect.true(b > a * 1.5, `r=80 painted ${b}px, r=30 painted ${a}px`);
  const n = window.__canvases;
  paint(small, 30, 'r30');
  FILM.expect.eq(window.__canvases, n);
});

FILM.assert('wash second call creates no canvas', () => {
  FILM.expect.true(typeof window.__canvases === 'number', 'harness canvas counter is missing');
  const c = FILM.makeCanvas(140, 120);
  const ctx = c.getContext('2d');
  const clip = [[24, 20], [110, 22], [108, 96], [28, 90]];
  const opt = { color: FILM.lib.pal.teal, alpha: 0.6, seed: 9, bleed: 5, layers: 3, granulation: 0.2, blooms: 0, dry: 0.2 };
  FILM.lib.wash(ctx, clip, opt);
  const n = window.__canvases;
  FILM.lib.wash(ctx, clip, opt);
  FILM.expect.eq(window.__canvases, n);
});

FILM.assert('wash is deterministic', () => {
  const paint = () => {
    const c = FILM.makeCanvas(96, 88);
    const ctx = c.getContext('2d');
    FILM.lib.wash(ctx, [[12, 14], [80, 16], [76, 70], [18, 74]], {
      color: FILM.lib.pal.sage,
      alpha: 0.7,
      seed: 3,
      bleed: 5,
      granulation: 0.4,
      blooms: 1,
      edgeDarken: 0.4,
      dry: 0.25,
    });
    return FILM.pixels(c).hash();
  };
  FILM.expect.eq(paint(), paint());
});
