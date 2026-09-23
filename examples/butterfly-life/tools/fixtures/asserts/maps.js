// Check 8. projection / graticule / plot. Anchors are the G6 table in
// examples/butterfly-life/src/geo.js (read-only): x = 540 + (lon + 88) * 27,
// y = 1450 - (lat - 19.5) * 32. No Math.random / Date.
const G6 = {
  michoacan: [208, 1447],
  mexicoCity: [240, 1453],
  sanAntonio: [256, 1133],
  floridaTip: [732, 1271],
  yucatanTip: [567, 1386],
  lakeSuperior: [554, 548],
  lakeMichigan: [567, 666],
  lakeHuron: [691, 640],
  lakeErie: [724, 723],
  lakeOntario: [815, 675],
  jamesBay: [756, 442],
  newYork: [918, 772],
  capeHatteras: [878, 948],
  ontarioFlight: [756, 666],
};

function g6Lon(x) {
  return (x - 540) / 27 - 88;
}
function g6Lat(y) {
  return 19.5 - (y - 1450) / 32;
}

function stepIsNice(step) {
  if (!(step > 0)) return false;
  const exp = Math.floor(Math.log10(step));
  const mant = step / Math.pow(10, exp);
  return [1, 2, 5].some((m) => Math.abs(mant - m) < 1e-6);
}

function valueIsNice(v) {
  if (v === 0) return true;
  const exp = Math.floor(Math.log10(Math.abs(v)));
  const mant = Math.abs(v) / Math.pow(10, exp);
  return [1, 2, 5].some((m) => Math.abs(mant - m) < 1e-6);
}

FILM.assert('equirect in the butterfly G6 frame hits every G6 anchor within 1px', () => {
  const proj = FILM.lib.projection({
    kind: 'equirect',
    lon0: -88,
    lat0: 19.5,
    scale: [27, 32],
    at: [540, 1450],
  });
  const names = Object.keys(G6);
  FILM.expect.eq(names.length, 14);
  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    const xy = G6[name];
    const hit = proj.project(g6Lon(xy[0]), g6Lat(xy[1]));
    FILM.expect.true(hit != null, name + ' did not project');
    FILM.expect.near(hit[0], xy[0], 1);
    FILM.expect.near(hit[1], xy[1], 1);
  }
  // Storyboard coordinates, not the rounded pixels run backwards.
  FILM.expect.near(proj.project(-100.3, 19.6), G6.michoacan, 1);
  FILM.expect.near(proj.project(-80, 44), G6.ontarioFlight, 1);
});

FILM.assert('invert(project(p)) returns p, and ortho is null on the far side', () => {
  const eq = FILM.lib.projection({
    kind: 'equirect',
    lon0: -88,
    lat0: 19.5,
    scale: [27, 32],
    at: [540, 1450],
    rot: 0.35,
  });
  const names = Object.keys(G6);
  for (let i = 0; i < names.length; i++) {
    const xy = G6[names[i]];
    const ll = [g6Lon(xy[0]), g6Lat(xy[1])];
    const hit = eq.project(ll[0], ll[1]);
    FILM.expect.near(eq.invert(hit[0], hit[1]), ll, 1e-6);
  }

  const merc = FILM.lib.projection({ kind: 'mercator', lon0: -20, lat0: 15, scale: [4, 4], at: [100, 200], rot: -0.4 });
  const mll = [33, -28];
  const mxy = merc.project(mll[0], mll[1]);
  FILM.expect.true(mxy != null, 'mercator dropped an interior point');
  FILM.expect.near(merc.invert(mxy[0], mxy[1]), mll, 1e-6);
  FILM.expect.eq(merc.project(0, 89), null);

  const globe = FILM.lib.projection({ kind: 'ortho', lon0: 10, lat0: -20, scale: 180, at: [400, 500], rot: 0.25 });
  FILM.expect.near(globe.project(10, -20), [400, 500], 1e-6);
  FILM.expect.eq(globe.project(10 + 180, 20), null);
  const front = [25, 8];
  const gxy = globe.project(front[0], front[1]);
  FILM.expect.true(gxy != null, 'ortho dropped a facing point');
  FILM.expect.near(globe.invert(gxy[0], gxy[1]), front, 1e-4);
  FILM.expect.eq(globe.invert(400 + 400, 500), null);

  const side = FILM.lib.projection({ kind: 'ortho', lon0: 0, lat0: 0, scale: 100, at: [50, 80] });
  FILM.expect.near(side.project(0, 90), [50, -20], 1e-6);
  FILM.expect.near(side.project(90, 0), [150, 80], 1e-6);
  FILM.expect.near(side.project(60, 0)[0], 50 + 100 * Math.sin((60 * Math.PI) / 180), 1e-6);
  FILM.expect.eq(side.project(180, 0), null);
  const limb = side.project(90, 0);
  FILM.expect.near(side.invert(limb[0], limb[1]), [90, 0], 1e-4);
});

FILM.assert('plot ticks sit on a 1, 2 or 5 × 10^k grid', () => {
  const c = FILM.makeCanvas(360, 280);
  const ctx = c.getContext('2d');
  const odd = FILM.lib.plot(ctx, {
    box: [48, 36, 280, 180],
    x: [-7, 7],
    y: [-7, 7],
    ticks: 4,
    series: [{ pts: [[-7, -5], [0, 0], [7, 5]], reveal: 0.4, color: FILM.lib.pal.lavender }],
  });
  FILM.expect.near(odd.x, [-5, 0, 5], 1e-9);
  FILM.expect.near(odd.y, [-5, 0, 5], 1e-9);
  for (let i = 0; i < odd.x.length; i++) FILM.expect.true(valueIsNice(odd.x[i]), 'x tick ' + odd.x[i]);

  const unit = FILM.lib.plot(ctx, { box: [40, 30, 200, 140], x: [0, 1], y: [0, 1], ticks: 4, series: [] });
  FILM.expect.near(unit.x, [0, 0.2, 0.4, 0.6, 0.8, 1], 1e-9);
  FILM.expect.true(stepIsNice(unit.x[1] - unit.x[0]), 'unit step ' + (unit.x[1] - unit.x[0]));

  const wide = FILM.lib.plot(ctx, { box: [40, 30, 200, 140], x: [0, 10], y: [0, 100], ticks: 5 });
  FILM.expect.near(wide.x, [0, 2, 4, 6, 8, 10], 1e-9);
  FILM.expect.near(wide.y, [0, 20, 40, 60, 80, 100], 1e-9);
  FILM.expect.true(stepIsNice(wide.x[1] - wide.x[0]) && stepIsNice(wide.y[1] - wide.y[0]));

  const messy = FILM.lib.plot(ctx, { box: [40, 30, 200, 140], x: [0.03, 2.7], y: [-90, 40], ticks: { x: 6, y: 5 } });
  FILM.expect.true(stepIsNice(messy.x[1] - messy.x[0]), 'messy x step ' + (messy.x[1] - messy.x[0]));
  FILM.expect.true(stepIsNice(messy.y[1] - messy.y[0]), 'messy y step ' + (messy.y[1] - messy.y[0]));
  for (let i = 1; i < messy.x.length; i++) {
    const step = messy.x[1] - messy.x[0];
    FILM.expect.near(messy.x[i] - messy.x[i - 1], step, Math.abs(step) * 1e-6 + 1e-9);
  }
});
