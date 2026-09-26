// strokeText invariants: deterministic, no system font, bridges in the stencil style, reveal,
// layout. Loaded only by check.cjs --fixtures.

function sfPlate(w, h, draw) {
  const c = FILM.makeCanvas(w, h);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.fillText = ctx.strokeText = () => {
    throw new Error('strokeText reached a system font');
  };
  const out = draw(ctx);
  return { c, ctx, out, hash: FILM.pixels(c).hash(), ink: FILM.pixels(c).count((r) => r < 128) };
}
const SF_ALL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,:;!?\'"-/+=()АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ';

FILM.assert('strokeText is a function of its inputs: same call, same pixels, in both styles', () => {
  for (const style of ['hand', 'stencil']) {
    const paint = () => sfPlate(900, 160, (ctx) => FILM.lib.strokeText(ctx, 'Crater 42!', 20, 30, { style, size: 90, color: '#000000', seed: 7, boil: 3 })).hash;
    FILM.expect.eq(paint(), paint(), `${style} differs between two identical calls`);
  }
});

FILM.assert('strokeText hand boils with the boil index; the stencil does not boil', () => {
  const hand = (b) => sfPlate(600, 140, (ctx) => FILM.lib.strokeText(ctx, 'SCRATCH', 20, 30, { size: 80, color: '#000000', boil: b })).hash;
  FILM.expect.true(hand(3) !== hand(4), 'hand drawing did not change with the boil index');
  const sten = (b) => sfPlate(600, 140, (ctx) => FILM.lib.strokeText(ctx, 'SCRATCH', 20, 30, { style: 'stencil', size: 80, color: '#000000', boil: b })).hash;
  FILM.expect.eq(sten(3), sten(4));
});

FILM.assert('strokeText draws every glyph of the set with ink, and lower case as upper case', () => {
  for (const style of ['hand', 'stencil']) {
    for (const ch of SF_ALL) {
      if (ch === ' ') continue;
      FILM.expect.true(!!FILM.lib.strokeFont[ch], `no glyph for '${ch}'`);
      const p = sfPlate(120, 140, (ctx) => FILM.lib.strokeText(ctx, ch, 30, 40, { style, size: 60, color: '#000000', jitter: 0, boil: 0 }));
      FILM.expect.true(p.ink > 20, `${style} '${ch}' drew ${p.ink} ink pixels`);
    }
  }
  const up = sfPlate(600, 140, (ctx) => FILM.lib.strokeText(ctx, 'ПЁС AND CAT', 20, 30, { size: 60, color: '#000000', boil: 0 })).hash;
  const low = sfPlate(600, 140, (ctx) => FILM.lib.strokeText(ctx, 'пёс and cat', 20, 30, { size: 60, color: '#000000', boil: 0 })).hash;
  FILM.expect.eq(low, up);
  const unk = sfPlate(120, 140, (ctx) => FILM.lib.strokeText(ctx, '§', 30, 40, { size: 60, color: '#000000', boil: 0 })).hash;
  const q = sfPlate(120, 140, (ctx) => FILM.lib.strokeText(ctx, '?', 30, 40, { size: 60, color: '#000000', boil: 0 })).hash;
  FILM.expect.eq(unk, q, 'an unknown character is not drawn as ?');
});

FILM.assert('stencil O keeps bridges at top and bottom and ink on its sides; hand O is closed', () => {
  const at = (ctx, x, y) => ctx.getImageData(x, y, 1, 1).data[0];
  // any paper along the middle third of a row
  const gapIn = (ctx, x0, x1, y) => {
    for (let x = Math.round(x0); x <= Math.round(x1); x++) if (at(ctx, x, y) > 200) return true;
    return false;
  };
  const s = sfPlate(200, 200, (ctx) => FILM.lib.strokeText(ctx, 'O', 20, 40, { style: 'stencil', size: 100, color: '#000000' }));
  const w = s.out.width;
  FILM.expect.true(gapIn(s.ctx, 20 + w / 3, 20 + (2 * w) / 3, 40), 'no bridge at the top of O');
  FILM.expect.true(gapIn(s.ctx, 20 + w / 3, 20 + (2 * w) / 3, 140), 'no bridge at the bottom of O');
  FILM.expect.eq(at(s.ctx, Math.round(20 + w * 0.07), 90), 0, 'the left side of O is not inked');
  const h = sfPlate(200, 200, (ctx) => FILM.lib.strokeText(ctx, 'O', 20, 40, { size: 100, color: '#000000', jitter: 0, slant: 0, boil: 0 }));
  let top = 0;
  for (let y = 34; y < 48; y++) top += at(h.ctx, Math.round(20 + h.out.width / 2), y) < 128 ? 1 : 0;
  FILM.expect.true(top > 0, 'hand O has a gap at the top');
});

FILM.assert('stencil T: the stem stops short of the bar by the bridge', () => {
  const size = 100, weight = 17, bridge = 8;
  const p = sfPlate(200, 200, (ctx) => FILM.lib.strokeText(ctx, 'T', 20, 40, { style: 'stencil', size, weight, bridge, color: '#000000' }));
  const x = Math.round(20 + weight / 2 + 30); // stem centre: 3 units in from the left edge of the glyph
  const col = [];
  for (let y = 40; y < 90; y++) col.push(p.ctx.getImageData(x, y, 1, 1).data[0] < 128 ? 1 : 0);
  const bar = col.indexOf(0), stem = col.indexOf(1, bar);
  FILM.expect.true(bar > 0 && stem > bar, `column at x ${x}: ${col.join('')}`);
  FILM.expect.near(stem - bar, bridge, 1.5);
});

FILM.assert('strokeText reveal: 0 draws nothing, 1 is the whole text, and ink grows with it', () => {
  const draw = (reveal) => sfPlate(700, 160, (ctx) => FILM.lib.strokeText(ctx, 'Wordmark', 20, 30, { size: 90, color: '#000000', boil: 2, reveal }));
  FILM.expect.eq(draw(0).ink, 0);
  FILM.expect.eq(draw(1).hash, draw(undefined).hash);
  const a = draw(0.3).ink, b = draw(0.7).ink, c = draw(1).ink;
  FILM.expect.true(a > 0 && a < b && b < c, `ink at 0.3, 0.7, 1: ${a}, ${b}, ${c}`);
});

FILM.assert('strokeText layout: returns its size, align centre and right move it, \\n adds a line', () => {
  const L = FILM.lib;
  const c = FILM.makeCanvas(10, 10).getContext('2d');
  const one = L.strokeText(c, 'HIE', 0, 0, { style: 'stencil', size: 50 });
  const two = L.strokeText(c, 'HIE\nHIE', 0, 0, { style: 'stencil', size: 50 });
  FILM.expect.eq(one.height, 50);
  FILM.expect.eq(two.height, 130);
  FILM.expect.near(two.width, one.width);
  // the inked span of each placement: same width, shifted by the align offset
  const span = (x, align) => {
    const p = sfPlate(600, 100, (ctx) => L.strokeText(ctx, 'HIE', x, 20, { style: 'stencil', size: 50, align }));
    const d = p.ctx.getImageData(0, 45, 600, 1).data;
    let lo = -1, hi = -1;
    for (let i = 0; i < 600; i++) if (d[i * 4] < 128) (lo < 0 ? (lo = i) : 0), (hi = i);
    return [lo, hi];
  };
  const left = span(100, 'left');
  FILM.expect.true(left[0] >= 99 && left[0] <= 102, `left edge at ${left[0]}`);
  FILM.expect.near(span(100 + one.width / 2, 'center')[0], left[0], 1);
  FILM.expect.near(span(100 + one.width, 'right')[1], left[1], 1);
});

FILM.assert('the stroke font table is frozen', () => {
  const F = FILM.lib.strokeFont;
  FILM.expect.true(Object.isFrozen(F) && Object.isFrozen(F.A) && Object.isFrozen(F.A.s) && Object.isFrozen(F.A.s[0]));
});
