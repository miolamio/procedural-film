// Phosphor-theme invariants: the crt carrier, sprite, pixelText. Loaded only by check.cjs --fixtures.

function crtPlate(w, h) {
  const c = FILM.makeCanvas(w, h);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  return c;
}
function crtRow(c, y) {
  return c.getContext('2d', { willReadFrequently: true }).getImageData(Math.floor(c.width / 2), y, 1, 1).data[0];
}
const CRT_BARE = { kind: 'crt', mask: 0, edge: 0, hum: 0, flicker: 0 };

FILM.assert('crt scanlines darken at most 10% and repeat every 6 px at full scale', () => {
  const c = crtPlate(FILM.W, 60);
  FILM.applyCarrier(c.getContext('2d'), { carrier: CRT_BARE }, 0);
  const rows = [];
  for (let y = 12; y < 24; y++) rows.push(crtRow(c, y));
  const lo = Math.min(...rows), hi = Math.max(...rows);
  FILM.expect.true(hi - lo >= 12 && lo >= 229, `scanline rows run ${lo}..${hi}`);
  for (let y = 12; y < 18; y++) FILM.expect.eq(crtRow(c, y), crtRow(c, y + 6), `row ${y} and ${y + 6} differ`);
});

FILM.assert('crt scanlines drop out on a quarter-scale frame, where they would moire', () => {
  const c = crtPlate(Math.round(FILM.W / 4), 40);
  FILM.applyCarrier(c.getContext('2d'), { carrier: CRT_BARE }, 0);
  for (let y = 0; y < 40; y++) FILM.expect.eq(crtRow(c, y), 255, `row ${y} darkened at scale 0.25`);
});

FILM.assert('crt draws the rounded screen: a black corner, an untouched centre', () => {
  const c = crtPlate(FILM.W, 400);
  FILM.applyCarrier(c.getContext('2d'), { carrier: { kind: 'crt', scanlines: 0, edge: 0, hum: 0, flicker: 0 } }, 0);
  const d = c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, 1, 1).data;
  FILM.expect.eq(d[0], 0, 'the corner is not black');
  FILM.expect.eq(crtRow(c, 200), 255);
});

FILM.assert('the carrier ignores FILM.post but not FILM.carrier = false, and a shot can opt out', () => {
  const bare = FILM.pixels(crtPlate(FILM.W, 60)).hash();
  const post = FILM.post;
  try {
    FILM.post = false;
    const a = crtPlate(FILM.W, 60);
    FILM.applyCarrier(a.getContext('2d'), { carrier: CRT_BARE }, 0);
    FILM.expect.true(FILM.pixels(a).hash() !== bare, 'FILM.post = false turned the carrier off');
    FILM.carrier = false;
    const b = crtPlate(FILM.W, 60);
    FILM.applyCarrier(b.getContext('2d'), { carrier: CRT_BARE }, 0);
    FILM.expect.eq(FILM.pixels(b).hash(), bare, 'FILM.carrier = false left a carrier on');
  } finally {
    FILM.post = post;
    FILM.carrier = true;
  }
  const c = crtPlate(FILM.W, 60);
  FILM.applyCarrier(c.getContext('2d'), { carrier: false }, 0);
  FILM.expect.eq(FILM.pixels(c).hash(), bare, 'carrier: false on a shot still drew one');
});

FILM.assert('crt is a function of T: same T same frame', () => {
  const paint = (T) => {
    const c = crtPlate(FILM.W, 120);
    FILM.applyCarrier(c.getContext('2d'), { carrier: { kind: 'crt' } }, T);
    return FILM.pixels(c).hash();
  };
  FILM.expect.eq(paint(3.25), paint(3.25));
});

FILM.assert('pixelText: glyphs sit on a 6-cell advance and draw the same bits', () => {
  const c = FILM.makeCanvas(40, 20);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, 40, 20);
  const size = FILM.lib.pixelText(ctx, 'ab', 0, 0, 2, { color: '#ffffff' });
  FILM.expect.eq(size.width, 22);
  FILM.expect.eq(size.height, 14);
  const at = (x, y) => ctx.getImageData(x, y, 1, 1).data[0];
  // A's top row is .###. and its middle row #####; B starts at x 12 with ####.
  FILM.expect.eq(at(0, 0), 0);
  FILM.expect.eq(at(2, 0), 255);
  FILM.expect.eq(at(0, 6), 255);
  FILM.expect.eq(at(12, 0), 255);
  FILM.expect.eq(at(10, 0), 0);
});

FILM.assert('pixelText types: chars shows a prefix, and the cursor follows it', () => {
  const draw = (o) => {
    const c = FILM.makeCanvas(60, 40);
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 60, 40);
    FILM.lib.pixelText(ctx, 'AB\nCD', 0, 0, 2, Object.assign({ color: '#ffffff' }, o));
    return ctx;
  };
  const one = draw({ chars: 1 });
  FILM.expect.eq(one.getImageData(12, 0, 1, 1).data[0], 0, 'B shows with chars 1');
  const cur = draw({ chars: 1, cursor: true });
  FILM.expect.eq(cur.getImageData(13, 5, 1, 1).data[0], 255, 'no cursor after A');
  const all = draw({});
  FILM.expect.eq(all.getImageData(2, 18, 1, 1).data[0], 255, 'the second line did not draw');
});

FILM.assert('sprite merges runs and snaps to whole pixels', () => {
  const c = FILM.makeCanvas(12, 4);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, 12, 4);
  FILM.lib.sprite(ctx, ['##.#'], 0, 0, 3, { color: '#ffffff' });
  const px = (x) => ctx.getImageData(x, 1, 1, 1).data[0];
  FILM.expect.eq([px(0), px(5), px(6), px(8), px(9), px(11)].join(), '255,255,0,0,255,255');
});
