// Negative-theme invariants: grade.invert, glow, blinkAt, lineIcon. Loaded only by check.cjs --fixtures.

function negPlate(w, h, grade) {
  const c = FILM.makeCanvas(w, h);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, w, h / 2);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, h / 2, w, h / 2);
  ctx.fillStyle = FILM.lib.pal.magenta;
  ctx.fillRect(w / 4, h / 4, w / 2, h / 2);
  if (grade !== undefined) FILM.applyGrade(ctx, grade);
  return c;
}

function negPx(c, x, y) {
  return c.getContext('2d', { willReadFrequently: true }).getImageData(x, y, 1, 1).data;
}

FILM.assert('grade invert 0 leaves the frame untouched', () => {
  FILM.expect.eq(FILM.pixels(negPlate(64, 64, { invert: 0 })).hash(), FILM.pixels(negPlate(64, 64)).hash());
});

FILM.assert('grade invert 1 is the exact negative, and twice is the identity', () => {
  const c = negPlate(64, 64, { invert: 1 });
  const top = negPx(c, 2, 2), bottom = negPx(c, 2, 62), mid = negPx(c, 32, 32);
  FILM.expect.eq([top[0], top[1], top[2]].join(), '255,255,255');
  FILM.expect.eq([bottom[0], bottom[1], bottom[2]].join(), '0,0,0');
  FILM.expect.eq([mid[0], mid[1], mid[2]].join(), '0,194,103');
  FILM.applyGrade(c.getContext('2d'), { invert: 1 });
  FILM.expect.eq(FILM.pixels(c).hash(), FILM.pixels(negPlate(64, 64)).hash());
});

FILM.assert('grade invert 0.5 lands between the plate and its negative', () => {
  const g = negPx(negPlate(64, 64, { invert: 0.5 }), 2, 2);
  FILM.expect.true(g[0] > 110 && g[0] < 145, `black at invert 0.5 reads ${g[0]}, not mid grey`);
});

FILM.assert('blinkAt: every blink is exactly 2 frames, gaps 7 to 38, same seed same schedule', () => {
  const L = FILM.lib;
  for (const seed of [1, 2, 77, L.hash('critter')]) {
    const shut = [];
    for (let f = 0; f < 192; f++) shut.push(L.blinkAt(f, seed));
    const runs = [];
    let f = 0;
    while (f < 192) {
      if (shut[f]) {
        let e = f;
        while (e < 192 && shut[e]) e++;
        runs.push([f, e]);
        f = e;
      } else f++;
    }
    FILM.expect.true(runs.length >= 5, `seed ${seed}: only ${runs.length} blinks in 8 s`);
    runs.forEach(([a, b], i) => {
      FILM.expect.eq(b - a, 2, `seed ${seed}: blink at ${a} lasts ${b - a} frames`);
      if (i) FILM.expect.true(a - runs[i - 1][1] >= 7 && a - runs[i - 1][1] <= 38, `seed ${seed}: gap ${a - runs[i - 1][1]} before frame ${a}`);
    });
    for (let k = 0; k < 192; k++) FILM.expect.eq(L.blinkAt(k + 192, seed), shut[k], `seed ${seed}: the loop does not repeat at ${k}`);
  }
  let differ = 0;
  for (let k = 0; k < 192; k++) if (L.blinkAt(k, 1) !== L.blinkAt(k, 2)) differ++;
  FILM.expect.true(differ > 0, 'seeds 1 and 2 blink on the same frames');
});

FILM.assert('glow is brightest on the line and fades out by its radius', () => {
  const c = FILM.makeCanvas(80, 80);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, 80, 80);
  FILM.lib.glow(ctx, [[10, 40], [70, 40]], { color: '#ffffff', width: 2, radius: 12 });
  const on = negPx(c, 40, 40)[0], near = negPx(c, 40, 46)[0], far = negPx(c, 40, 60)[0];
  FILM.expect.eq(on, 255);
  FILM.expect.true(near > far && near < on, `halo 6 px out reads ${near} (line ${on}, 20 px out ${far})`);
  FILM.expect.eq(far, 0);
});

FILM.assert('lineIcon: shut eyes draw a bar, and a filled part knocks out what is behind it', () => {
  const L = FILM.lib;
  const draw = (shut) => {
    const c = FILM.makeCanvas(100, 100);
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 100, 100);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 50);
    ctx.lineTo(100, 50);
    ctx.stroke();
    L.lineIcon(ctx, [{ circle: [0, 0, 0.4], fill: true }, { eye: [0, 0, 0.2] }], 50, 50, 100, { bg: '#000000', color: '#ffffff', width: 0.03, shut });
    return c;
  };
  const open = draw(false), shut = draw(true);
  FILM.expect.eq(negPx(open, 20, 50)[0], 0, 'the line behind the filled circle still shows');
  FILM.expect.true(negPx(shut, 36, 50)[0] > 200 && negPx(open, 36, 50)[0] < 60, 'the shut eye has no bar across it');
});
