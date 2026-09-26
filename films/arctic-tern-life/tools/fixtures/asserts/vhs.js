// vhs carrier and tracking transition invariants. Loaded only by check.cjs --fixtures.

function vhsPlate(w, h) {
  const c = FILM.makeCanvas(w, h);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#ffffff';
  for (let x = 100; x < w; x += 200) ctx.fillRect(x, 0, 100, h);
  return c;
}
function vhsPx(c, x, y) {
  return Array.from(c.getContext('2d', { willReadFrequently: true }).getImageData(x, y, 1, 1).data.slice(0, 3));
}
function vhsRowsChanged(a, b) {
  const w = a.width;
  const h = a.height;
  const da = a.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data;
  const db = b.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data;
  const rows = [];
  for (let y = 0; y < h; y++) {
    for (let i = y * w * 4, e = i + w * 4; i < e; i++) {
      if (da[i] !== db[i]) {
        rows.push(y);
        break;
      }
    }
  }
  return rows;
}
const VHS_OFF = { kind: 'vhs', chroma: 0, tracking: 0, head: 0, timecode: 0 };
function vhsApply(c, o, T) {
  FILM.applyCarrier(c.getContext('2d'), { carrier: Object.assign({}, VHS_OFF, o) }, T);
  return c;
}

FILM.assert('vhs with every part off leaves the frame alone', () => {
  const bare = FILM.pixels(vhsPlate(FILM.W, 80)).hash();
  FILM.expect.eq(FILM.pixels(vhsApply(vhsPlate(FILM.W, 80), {}, 2)).hash(), bare);
});

FILM.assert('vhs chroma: red lags the picture by chroma px, green and blue stay put', () => {
  const c = vhsApply(vhsPlate(FILM.W, 20), { chroma: 3 }, 0);
  FILM.expect.eq(vhsPx(c, 100, 10).join(), '0,255,255', 'the leading edge of a white bar is not cyan');
  FILM.expect.eq(vhsPx(c, 103, 10).join(), '255,255,255', 'the bar is not white 3 px in');
  FILM.expect.eq(vhsPx(c, 201, 10).join(), '255,0,0', 'red does not trail past the bar');
  FILM.expect.eq(vhsPx(c, 203, 10).join(), '0,0,0', 'the trail is longer than 3 px');
});

FILM.assert('vhs head switching tears only the bottom strip', () => {
  const h = 400;
  const bare = vhsPlate(FILM.W, h);
  const rows = vhsRowsChanged(bare, vhsApply(vhsPlate(FILM.W, h), { head: 1 }, 1.5));
  FILM.expect.true(rows.length > 0, 'nothing tore');
  FILM.expect.true(rows[0] >= h - Math.round(h * 0.022), `row ${rows[0]} tore above the head strip`);
});

FILM.assert('vhs tracking band covers a narrow band of rows and rolls with T', () => {
  const h = 600;
  const bare = vhsPlate(FILM.W, h);
  const at = (T) => vhsRowsChanged(bare, vhsApply(vhsPlate(FILM.W, h), { tracking: 1, trackPeriod: 4 }, T));
  const a = at(1);
  const b = at(2);
  FILM.expect.true(a.length > 0 && b.length > 0, 'the band drew nothing');
  FILM.expect.true(a[a.length - 1] - a[0] <= Math.round(h * 0.06) + 3, `band spans rows ${a[0]}..${a[a.length - 1]}`);
  FILM.expect.true(b[0] > a[0], `band did not roll down: ${a[0]} then ${b[0]}`);
});

FILM.assert('vhs is a function of T; the counter changes on the second', () => {
  const paint = (T, o) => FILM.pixels(vhsApply(vhsPlate(FILM.W, 300), o, T)).hash();
  FILM.expect.eq(paint(7.3, { chroma: 3, tracking: 0.5, head: 1, timecode: 1 }), paint(7.3, { chroma: 3, tracking: 0.5, head: 1, timecode: 1 }));
  FILM.expect.eq(paint(5.1, { timecode: 1 }), paint(5.9, { timecode: 1 }), 'the display moved within a second');
  FILM.expect.true(paint(5.1, { timecode: 1 }) !== paint(6.1, { timecode: 1 }), 'the counter did not tick');
});

FILM.assert('tracking is a transition kind', () => {
  FILM.expect.true(FILM.TRANSITION_KINDS.includes('tracking'));
  FILM.expect.true(FILM.carrierKinds().includes('vhs'));
});
