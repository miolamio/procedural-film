// film carrier invariants. Loaded only by check.cjs --fixtures.

function filmPlate(w, h, fill, line) {
  const c = FILM.makeCanvas(w, h);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, w, h);
  if (line) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(500, 0, 1, h);
  }
  return c;
}
const FILM_OFF = { kind: 'film', perf: 0, weave: 0, scratches: 0, dust: 0, flicker: 0, gate: 0 };
function filmApply(c, o, T) {
  FILM.applyCarrier(c.getContext('2d'), { carrier: Object.assign({}, FILM_OFF, o) }, T);
  return c;
}
function filmRow(c, y) {
  return c.getContext('2d', { willReadFrequently: true }).getImageData(0, y, c.width, 1).data;
}

FILM.assert('film with every part off leaves the frame alone', () => {
  const bare = FILM.pixels(filmPlate(FILM.W, 60, '#808080')).hash();
  FILM.expect.eq(FILM.pixels(filmApply(filmPlate(FILM.W, 60, '#808080'), {}, 3)).hash(), bare);
});

FILM.assert('film weave moves the picture by whole px, never more than 2', () => {
  const seen = new Set();
  for (let f = 0; f < 48; f++) {
    const d = filmRow(filmApply(filmPlate(FILM.W, 40, '#000000', true), { weave: 2 }, f / FILM.FPS), 20);
    const xs = [];
    for (let x = 0; x < FILM.W; x++) if (d[x * 4] > 127) xs.push(x);
    FILM.expect.true(xs.length >= 1 && xs.length <= 3, `frame ${f}: the line is ${xs.length} px wide`);
    const x = xs[xs.length - 1];
    FILM.expect.true(Math.abs(x - 500) <= 2, `frame ${f}: the picture moved to x ${x}`);
    seen.add(x);
  }
  FILM.expect.true(seen.size > 1, 'the picture never moved');
});

FILM.assert('film flicker stays within 4% of full scale, under check 9', () => {
  let lo = 255, hi = 0;
  for (let f = 0; f < 48; f++) {
    const v = filmRow(filmApply(filmPlate(FILM.W, 4, '#808080'), { flicker: 1 }, f / FILM.FPS), 2)[400];
    lo = Math.min(lo, v);
    hi = Math.max(hi, v);
  }
  FILM.expect.true(hi > lo, 'the exposure never flickered');
  FILM.expect.true(hi - lo < 0.1 * 255 && lo >= 118 && hi <= 139, `exposure ran ${lo}..${hi}`);
});

FILM.assert('film perforations: dark strips with light holes on both edges, the centre untouched', () => {
  const c = filmApply(filmPlate(FILM.W, 400, '#808080'), { perf: 1 }, 0);
  const m = Math.min(FILM.W, 400);
  const col = (x) => {
    const g = c.getContext('2d', { willReadFrequently: true });
    const out = [];
    for (let y = 0; y < 400; y++) out.push(g.getImageData(x, y, 1, 1).data[0]);
    return out;
  };
  for (const x of [Math.round(m * 0.0275), FILM.W - 1 - Math.round(m * 0.0275)]) {
    const v = col(x);
    FILM.expect.true(Math.min(...v) < 30 && Math.max(...v) > 220, `edge column ${x} runs ${Math.min(...v)}..${Math.max(...v)}`);
  }
  FILM.expect.eq(filmRow(c, 200)[(FILM.W >> 1) * 4], 128);
});

FILM.assert('film dust changes on the boil clock, and film is a function of T', () => {
  const paint = (T, o) => FILM.pixels(filmApply(filmPlate(FILM.W, 600, '#808080'), o, T)).hash();
  const all = { perf: 1, weave: 1.2, scratches: 0.5, dust: 0.5, flicker: 0.02, gate: 0.3 };
  FILM.expect.eq(paint(2.3, all), paint(2.3, all));
  FILM.expect.eq(paint(1.0, { dust: 1 }), paint(1.04, { dust: 1 }), 'dust moved inside one boil drawing');
  FILM.expect.true(FILM.carrierKinds().includes('film'));
});
