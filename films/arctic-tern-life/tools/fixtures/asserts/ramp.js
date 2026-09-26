// Ramp invariants: lib.ramp, lib.rampRGB, lib.rampStops, lib.ramps. Loaded only by check.cjs --fixtures.

function rampThrows(fn) {
  try {
    fn();
  } catch (e) {
    return e instanceof TypeError;
  }
  return false;
}

FILM.assert('ramp ends on its first and last stop and clamps outside 0..1', () => {
  const L = FILM.lib;
  const P = L.pal;
  const rgb = (name) => `rgb(${L.rgb(P[name]).join(',')})`;
  for (const name of Object.keys(L.ramps)) {
    const list = L.ramps[name];
    const first = typeof list[0] === 'string' ? list[0] : list[0][1];
    const lastS = list[list.length - 1];
    const last = typeof lastS === 'string' ? lastS : lastS[1];
    FILM.expect.eq(L.ramp(name, 0), rgb(first), `${name} at 0`);
    FILM.expect.eq(L.ramp(name, 1), rgb(last), `${name} at 1`);
    FILM.expect.eq(L.ramp(name, -3), rgb(first), `${name} below 0`);
    FILM.expect.eq(L.ramp(name, 7), rgb(last), `${name} above 1`);
    FILM.expect.eq(L.ramp(name, NaN), rgb(first), `${name} at NaN`);
  }
});

FILM.assert('ramp hits every stop exactly and mixes like lib.mix between two', () => {
  const L = FILM.lib;
  const P = L.pal;
  const stops = L.rampStops('heat');
  for (const [at, hex] of stops) FILM.expect.eq(L.ramp('heat', at), `rgb(${L.rgb(hex).join(',')})`, `heat at ${at}`);
  const two = ['night', 'sun'];
  for (const v of [0.1, 0.25, 0.5, 0.9]) FILM.expect.eq(L.ramp(two, v), L.mix(P.night, P.sun, v), `night→sun at ${v}`);
});

FILM.assert('rampStops: evenly spaced names, explicit positions kept, frozen', () => {
  const L = FILM.lib;
  const P = L.pal;
  const s = L.rampStops(['paper', 'ink', 'sun']);
  FILM.expect.eq(JSON.stringify(s), JSON.stringify([[0, P.paper], [0.5, P.ink], [1, P.sun]]));
  const t = L.rampStops('terrain');
  FILM.expect.eq(t[1][0], 0.38);
  FILM.expect.eq(t[1][1], P.teal);
  FILM.expect.true(Object.isFrozen(t) && Object.isFrozen(t[0]), 'stops are not frozen');
  FILM.expect.true(Object.isFrozen(L.ramps) && Object.isFrozen(L.ramps.heat), 'the ramps table is not frozen');
  FILM.expect.eq(L.rampStops('heat'), L.rampStops('heat'), 'a named ramp is built once');
});

FILM.assert('two stops at one position make a hard edge', () => {
  const L = FILM.lib;
  const P = L.pal;
  const edge = [[0, 'ink'], [0.5, 'ink'], [0.5, 'white'], [1, 'white']];
  FILM.expect.eq(L.ramp(edge, 0.4999), `rgb(${L.rgb(P.ink).join(',')})`);
  FILM.expect.eq(L.ramp(edge, 0.5), `rgb(${L.rgb(P.ink).join(',')})`);
  FILM.expect.eq(L.ramp(edge, 0.5001), `rgb(${L.rgb(P.white).join(',')})`);
});

FILM.assert('rampRGB matches ramp and writes into out', () => {
  const L = FILM.lib;
  const out = [0, 0, 0];
  for (let i = 0; i <= 20; i++) {
    const v = i / 20;
    const r = L.rampRGB('blueprint', v, out);
    FILM.expect.true(r === out, 'rampRGB did not return out');
    FILM.expect.eq(`rgb(${r.join(',')})`, L.ramp('blueprint', v), `blueprint at ${v}`);
    for (const c of r) FILM.expect.true(Number.isInteger(c) && c >= 0 && c <= 255, `channel ${c}`);
  }
  FILM.expect.eq(L.rampRGB('tone', 0.3).length, 3);
});

FILM.assert('an inline list equals the same list by text, and bad ramps throw TypeError', () => {
  const L = FILM.lib;
  FILM.expect.eq(L.ramp(['night', 'sun'], 0.3), L.ramp(['night', 'sun'], 0.3));
  FILM.expect.eq(L.rampStops(['night', 'sun']), L.rampStops(['night', 'sun']), 'an inline list is rebuilt every call');
  FILM.expect.true(rampThrows(() => L.ramp('nope', 0.5)), 'an unknown ramp name');
  FILM.expect.true(rampThrows(() => L.ramp(['ink'], 0.5)), 'a single stop');
  FILM.expect.true(rampThrows(() => L.ramp(['ink', '#FF0000'], 0.5)), 'a hex instead of a pal name');
  FILM.expect.true(rampThrows(() => L.ramp([[0.6, 'ink'], [0.2, 'sun']], 0.5)), 'decreasing positions');
  FILM.expect.true(rampThrows(() => L.ramp([[0, 'ink'], [1.5, 'sun']], 0.5)), 'a position above 1');
  FILM.expect.true(rampThrows(() => L.ramp(42, 0.5)), 'a number as the ramp');
});

FILM.assert('ramp is monotone in brightness along heat, and deterministic', () => {
  const L = FILM.lib;
  let prev = -1;
  for (let i = 0; i <= 64; i++) {
    const [r, g, b] = L.rampRGB('heat', i / 64);
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    FILM.expect.true(lum >= prev - 0.5, `heat darkens at ${i / 64}`);
    prev = lum;
  }
  const a = [];
  const b = [];
  for (let i = 0; i < 50; i++) a.push(L.ramp('terrain', i / 49));
  for (let i = 49; i >= 0; i--) b.unshift(L.ramp('terrain', i / 49));
  FILM.expect.eq(a.join(' '), b.join(' '));
});
