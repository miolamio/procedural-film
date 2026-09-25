// Check 8. castShadow / rimLight / shadeSide: the shadow sits len·dir from the form,
// the rim stays on the lit side, a zero-length shadow clipped to the form does not
// spill, and a repeat draws the same pixels. Loaded only by check.cjs --fixtures.
FILM.assert('castShadow centroid shifts by len·dir', () => {
  const L = FILM.lib;
  const outline = L.ellipsePts(130, 120, 46, 58, 72);
  const paint = (dir, len) => {
    const c = FILM.makeCanvas(340, 320);
    const ctx = c.getContext('2d');
    L.castShadow(ctx, outline, { dir: dir, len: len, style: 'flat', color: L.pal.ink, alpha: 1, soft: 0 });
    const d = c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, c.width, c.height).data;
    let sx = 0, sy = 0, n = 0;
    for (let y = 0, i = 0; y < c.height; y++) {
      for (let x = 0; x < c.width; x++, i++) {
        if (d[i * 4 + 3] > 128) { sx += x; sy += y; n++; }
      }
    }
    return { x: sx / n, y: sy / n, n: n };
  };
  const dirs = [[0.8, 0.6], [-0.6, 0.8]];
  for (let k = 0; k < dirs.length; k++) {
    const dir = dirs[k];
    const len = 64;
    const a = paint(dir, 0);
    const b = paint(dir, len);
    const ex = len * dir[0], ey = len * dir[1];
    const err = Math.hypot(b.x - a.x - ex, b.y - a.y - ey);
    const mag = Math.hypot(ex, ey);
    FILM.expect.true(a.n > 400 && b.n > 400, 'both fills painted');
    FILM.expect.true(err <= mag * 0.05, 'dir ' + dir + ' centroid off by ' + err.toFixed(2) + 'px (limit ' + (mag * 0.05).toFixed(2) + ')');
  }
});

FILM.assert('rimLight paints only the lit side', () => {
  const L = FILM.lib;
  const cx = 100, cy = 100, r = 50;
  const outline = L.ellipsePts(cx, cy, r, r, 80);
  const c = FILM.makeCanvas(200, 200);
  const ctx = c.getContext('2d');
  // shadow falls to the right; the light, and the rim, are on the left
  L.rimLight(ctx, outline, { dir: [1, 0], width: 12, color: L.pal.sun, alpha: 1, threshold: 0.2 });
  const d = c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, 200, 200).data;
  const alphaAt = (x, y) => {
    const ix = Math.round(x), iy = Math.round(y);
    if (ix < 0 || iy < 0 || ix >= 200 || iy >= 200) return 0;
    return d[(iy * 200 + ix) * 4 + 3];
  };
  // max alpha in a small stamp on the contour, `dist` px along the outward normal
  const sample = (ang, dist) => {
    const nx = Math.cos(ang), ny = Math.sin(ang);
    let m = 0;
    for (let s = -1; s <= 1; s++) {
      const x = cx + nx * (r + dist) - ny * s;
      const y = cy + ny * (r + dist) + nx * s;
      const a = alphaAt(x, y);
      if (a > m) m = a;
    }
    return m;
  };
  FILM.expect.true(sample(Math.PI, 0) > 40, 'left (lit) contour carries the rim, got ' + sample(Math.PI, 0));
  FILM.expect.true(sample(Math.PI, 3) > 20, 'rim extends just outside the lit contour');
  FILM.expect.true(sample(-3 * Math.PI / 4, 0) > 20, 'upper-left quadrant faces the light');
  FILM.expect.eq(sample(0, 0), 0);
  FILM.expect.eq(sample(0, 4), 0);
  FILM.expect.eq(sample(0, -4), 0);
  FILM.expect.eq(sample(Math.PI / 5, 0), 0);
  FILM.expect.eq(sample(-Math.PI / 5, 2), 0);
});

FILM.assert('len 0 with clipOutside stays inside the form', () => {
  const L = FILM.lib;
  const cx = 80, cy = 80, r = 34;
  const outline = L.ellipsePts(cx, cy, r, r, 64);
  const c = FILM.makeCanvas(160, 160);
  const ctx = c.getContext('2d');
  L.castShadow(ctx, outline, {
    dir: [0.7, 0.4], len: 0, style: 'hatch', clipOutside: true,
    color: L.pal.ink, alpha: 1, seed: 5, spacing: 3.5, width: 1.5, soft: 0,
  });
  const d = c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, 160, 160).data;
  let outside = 0, inside = 0, far = 0;
  for (let y = 0; y < 160; y++) {
    for (let x = 0; x < 160; x++) {
      const a = d[(y * 160 + x) * 4 + 3];
      if (a <= 12) continue;
      const dist = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (dist > r + 2) outside++;
      else inside++;
      if (dist > r + 8) far++;
    }
  }
  FILM.expect.eq(outside, 0);
  FILM.expect.eq(far, 0);
  FILM.expect.true(inside > 40, 'the shadow still paints the form (' + inside + 'px)');
});

FILM.assert('castShadow, rimLight and shadeSide are deterministic', () => {
  const L = FILM.lib;
  const outline = L.ellipsePts(70, 64, 28, 36, 48);
  const paint = () => {
    const c = FILM.makeCanvas(180, 170);
    const ctx = c.getContext('2d');
    const dir = [0.6, 0.8];
    L.castShadow(ctx, outline, { dir: dir, len: 22, style: 'hatch', seed: 3, color: L.pal.ink, alpha: 0.8, spacing: 4 });
    L.shadeSide(ctx, outline, { dir: dir, seed: 4, spacing: 5, alpha: 0.9, color: L.pal.inkSoft });
    L.rimLight(ctx, outline, { dir: dir, width: 6, color: L.pal.white, alpha: 0.9 });
    L.castShadow(ctx, outline, { dir: dir, len: 0, style: 'stipple', seed: 9, clipOutside: true, alpha: 0.5, spacing: 4 });
    return FILM.pixels(c).hash();
  };
  const a = paint();
  const b = paint();
  FILM.expect.eq(a, b);
});
