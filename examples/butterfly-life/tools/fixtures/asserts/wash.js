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
  let band = 0;
  let bandN = 0;
  let mid = 0;
  let midN = 0;
  let centreA = 0;
  for (let y = 0; y < 180; y++) {
    for (let x = 0; x < 240; x++) {
      const k = (y * 240 + x) * 4;
      const r = after[k];
      const g = after[k + 1];
      const b = after[k + 2];
      const a = after[k + 3];
      const cx = x + 0.5;
      const cy = y + 0.5;
      if (washOutside(cx, cy) > limit) {
        if (r !== before[k] || g !== before[k + 1] || b !== before[k + 2] || a !== before[k + 3]) {
          dirty++;
          if (!dirtyAt) dirtyAt = `(${x},${y}) rgba ${r},${g},${b},${a}`;
        }
        continue;
      }
      const ed = washEdgeDist(cx, cy);
      if (ed <= 4 && a > 16) {
        band += washLum(r, g, b);
        bandN++;
      }
      if (Math.hypot(cx - 118, cy - 86) <= 6 && a > 16) {
        mid += washLum(r, g, b);
        midN++;
      }
      if (x === 118 && y === 86) centreA = a;
    }
  }
  FILM.expect.true(dirty === 0, dirty ? `${dirty} pixel(s) past bleed+2 changed, first ${dirtyAt}` : 'bleed held');
  FILM.expect.true(centreA / 255 > 0.5 * WASH_ALPHA, `centre alpha ${centreA} is not above half of ${WASH_ALPHA}`);
  FILM.expect.true(bandN > 20 && midN > 8, `edge samples ${bandN}, centre samples ${midN}`);
  FILM.expect.true(band / bandN < mid / midN, `edge lum ${(band / bandN).toFixed(1)} is not darker than centre ${(mid / midN).toFixed(1)}`);
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
