// Blob-theme invariants: isolines, blobField, blob. Loaded only by check.cjs --fixtures.

FILM.assert('isolines traces a circle as one closed loop within a pixel of the true rim', () => {
  const L = FILM.lib;
  const f = (x, y) => -((x - 100) ** 2 + (y - 100) ** 2);
  const lines = L.isolines(f, [0, 0, 200, 200], -(50 * 50), { cell: 8 });
  FILM.expect.eq(lines.length, 1);
  FILM.expect.true(lines[0].closed, 'the circle is not closed');
  let worst = 0;
  for (const p of lines[0].pts) worst = Math.max(worst, Math.abs(Math.hypot(p[0] - 100, p[1] - 100) - 50));
  FILM.expect.true(worst < 1, `a rim point is ${worst.toFixed(2)} px off the circle`);
});

FILM.assert('isolines: a contour that leaves the box is an open chain', () => {
  const L = FILM.lib;
  const f = (x, y) => -((x - 0) ** 2 + (y - 100) ** 2);
  const lines = L.isolines(f, [0, 0, 200, 200], -(40 * 40), { cell: 8 });
  FILM.expect.eq(lines.length, 1);
  FILM.expect.true(!lines[0].closed, 'a cut-off contour came back closed');
  const a = lines[0].pts[0], b = lines[0].pts[lines[0].pts.length - 1];
  FILM.expect.true(a[0] < 1e-9 && b[0] < 1e-9, 'the chain does not end on the box edge');
});

FILM.assert('isolines samples the field once for every level, and a flat field has no lines', () => {
  const L = FILM.lib;
  let calls = 0;
  const f = (x, y) => {
    calls++;
    return x + y;
  };
  const sets = L.isolines(f, [0, 0, 100, 100], [50, 100, 150], { cell: 10 });
  FILM.expect.eq(sets.length, 3);
  FILM.expect.eq(calls, 121);
  sets.forEach((s, k) => FILM.expect.eq(s.length, 1, `level ${k} has ${s.length} lines`));
  FILM.expect.eq(L.isolines(() => 1, [0, 0, 100, 100], 0.5).length, 0);
});

FILM.assert('blob: balls far apart are two rims, close together one', () => {
  const L = FILM.lib;
  const rims = (gap) => {
    const c = FILM.makeCanvas(400, 200);
    return L.blob(c.getContext('2d'), [[200 - gap, 100, 40], [200 + gap, 100, 40]]).filter((l) => l.closed).length;
  };
  FILM.expect.eq(rims(120), 2);
  FILM.expect.eq(rims(30), 1);
});

FILM.assert('blob fills its inside and leaves the outside', () => {
  const L = FILM.lib;
  const c = FILM.makeCanvas(200, 200);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, 200, 200);
  L.blob(ctx, [[100, 100, 50]], { fill: '#ffffff', stroke: null });
  const px = (x, y) => ctx.getImageData(x, y, 1, 1).data[0];
  FILM.expect.eq(px(100, 100), 255);
  FILM.expect.eq(px(100, 140), 255);
  FILM.expect.eq(px(100, 160), 0);
  FILM.expect.eq(px(10, 10), 0);
});
