// xerox carrier invariants. Loaded only by check.cjs --fixtures.

function xeroxPlate(w, h, fill) {
  const c = FILM.makeCanvas(w, h);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, w, h);
  return c;
}
const XEROX_OFF = { kind: 'xerox', jitter: 0, mono: 0, contrast: 0, exposure: 0, speckle: 0, toner: 0, dropouts: 0, streaks: 0 };
function xeroxApply(c, o, T) {
  FILM.applyCarrier(c.getContext('2d'), { carrier: Object.assign({}, XEROX_OFF, o) }, T);
  return c;
}
function xeroxPx(c, x, y) {
  return c.getContext('2d', { willReadFrequently: true }).getImageData(x, y, 1, 1).data;
}

FILM.assert('xerox with every part off leaves the frame alone', () => {
  const bare = FILM.pixels(xeroxPlate(FILM.W, 60, '#c0603a')).hash();
  FILM.expect.eq(FILM.pixels(xeroxApply(xeroxPlate(FILM.W, 60, '#c0603a'), {}, 3)).hash(), bare);
});

FILM.assert('xerox mono drops the colour', () => {
  const d = xeroxPx(xeroxApply(xeroxPlate(40, 40, '#c0603a'), { mono: 1 }, 0), 20, 20);
  FILM.expect.true(Math.abs(d[0] - d[1]) <= 2 && Math.abs(d[1] - d[2]) <= 2, `rgb ${d[0]},${d[1]},${d[2]}`);
});

FILM.assert('xerox contrast and exposure: dark stays dark, light greys blow out to white', () => {
  const at = (fill) => xeroxPx(xeroxApply(xeroxPlate(40, 40, fill), { mono: 1, contrast: 0.6, exposure: 0.35 }, 0), 20, 20)[0];
  FILM.expect.true(at('#202020') < 16, `dark grey went to ${at('#202020')}`);
  FILM.expect.true(at('#a0a0a0') > 245, `light grey went to ${at('#a0a0a0')}`);
  FILM.expect.true(at('#ffffff') === 255 && at('#000000') === 0, 'white and black are fixed points');
  // exposure alone only brightens
  const ex = xeroxPx(xeroxApply(xeroxPlate(40, 40, '#606060'), { exposure: 1 }, 0), 20, 20)[0];
  FILM.expect.true(ex > 0x60, `exposure darkened grey 96 to ${ex}`);
});

FILM.assert('xerox speckle breaks a mid grey into grain, black and white stay solid', () => {
  const o = { mono: 1, contrast: 0.6, exposure: 0.35, speckle: 1 };
  const spread = (fill) => {
    const d = xeroxApply(xeroxPlate(FILM.W, 40, fill), o, 0).getContext('2d', { willReadFrequently: true }).getImageData(0, 0, FILM.W, 40).data;
    let lo = 255, hi = 0;
    for (let i = 0; i < d.length; i += 4) {
      lo = Math.min(lo, d[i]);
      hi = Math.max(hi, d[i]);
    }
    return [lo, hi];
  };
  const [glo, ghi] = spread('#707070');
  FILM.expect.true(ghi - glo > 100, `mid grey ran ${glo}..${ghi}`);
  FILM.expect.eq(spread('#000000').join(), '0,0');
  FILM.expect.eq(spread('#ffffff').join(), '255,255');
});

FILM.assert('xerox jitter moves the copy by whole px within the limit, once per boil drawing', () => {
  const edge = (T) => {
    const c = FILM.makeCanvas(200, 40);
    const g = c.getContext('2d', { willReadFrequently: true });
    g.fillStyle = '#000000';
    g.fillRect(0, 0, 200, 40);
    g.fillStyle = '#ffffff';
    g.fillRect(100, 0, 100, 40);
    xeroxApply(c, { jitter: 8 }, T);
    const d = g.getImageData(0, 20, 200, 1).data;
    let x = 0;
    while (x < 200 && d[(x + 20) * 4] < 128) x++;
    return x + 20;
  };
  const seen = new Set();
  for (let f = 0; f < 48; f++) {
    const x = edge(f / FILM.FPS);
    FILM.expect.true(Math.abs(x - 100) <= 8, `frame ${f}: the edge moved to x ${x}`);
    seen.add(x);
  }
  FILM.expect.true(seen.size > 2, 'the copy never jittered');
  FILM.expect.eq(edge(1.0), edge(1.04), 'the copy moved inside one boil drawing');
});

FILM.assert('xerox toner skips and dropouts lighten the ink, bounded; streaks darken the paper', () => {
  const mean = (c) => {
    const d = c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, c.width, c.height).data;
    let s = 0;
    for (let i = 0; i < d.length; i += 4) s += d[i];
    return s / (d.length / 4);
  };
  const ink = mean(xeroxApply(xeroxPlate(FILM.W, 400, '#141414'), { toner: 1, dropouts: 1 }, 0.5));
  FILM.expect.true(ink > 0x14 + 4 && ink < 0x14 + 110, `inked plate mean ${ink.toFixed(1)}`);
  const paper = mean(xeroxApply(xeroxPlate(FILM.W, 400, '#ffffff'), { streaks: 1 }, 0.5));
  FILM.expect.true(paper < 255 && paper > 240, `paper mean ${paper.toFixed(1)}`);
});

FILM.assert('xerox is a function of T and registered', () => {
  const paint = (T) => FILM.pixels(xeroxApply(xeroxPlate(FILM.W, 300, '#707070'), { jitter: 3, mono: 1, contrast: 0.6, exposure: 0.35, toner: 0.5, dropouts: 0.5, streaks: 0.5 }, T)).hash();
  FILM.expect.eq(paint(2.3), paint(2.3));
  FILM.expect.true(paint(2.3) !== paint(2.5), 'the copy is the same on two boil drawings');
  FILM.expect.true(FILM.carrierKinds().includes('xerox'));
});
