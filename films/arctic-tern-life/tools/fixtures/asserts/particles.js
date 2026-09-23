// Check 8. lib.particles is a closed function of time: order, live-count, fall direction, loop.
// Canvas +y points down, so gravity > 0 pulls downward and y increases after the apex.
FILM.assert('particleAt(i, T) does not depend on call order', () => {
  const o = {
    seed: 'order', n: 40, emitter: { x: 12, y: -4, r: 18 }, rate: 9, life: 1.25,
    v0: [20, 80], angle: 0.4, spread: 1.1, gravity: 90, drag: 0.7, wind: 30, size: 4,
  };
  const snap = (i, T) => {
    const p = FILM.lib.particleAt(i, T, o);
    return [p.x, p.y, p.age, p.alive ? 1 : 0];
  };
  const times = [0.2, 1.7, 4.2, 0.2, -0.4, 0.05, 3.1];
  const forward = times.map((T) => snap(4, T));
  const backward = times.slice().reverse().map((T) => snap(4, T));
  for (let k = 0; k < times.length; k++) FILM.expect.near(forward[k], backward[times.length - 1 - k], 0);
  const again = snap(4, 0.2);
  FILM.expect.near(again, forward[0], 0);
  const other = snap(11, 0.55);
  const back = snap(4, 0.2);
  FILM.expect.near(back, forward[0], 0);
  FILM.expect.true(other[0] !== back[0] || other[1] !== back[1], 'a different index should be able to land elsewhere');
});

FILM.assert('live count is at most ceil(rate * life) + 1, and T < 0 is empty', () => {
  const rate = 17;
  const life = 0.8;
  const o = {
    seed: 42, n: 400, emitter: { x: 0, y: 0 }, rate, life, v0: [10, 30],
    angle: -1.2, spread: 0.4, gravity: 200, drag: 0.4, wind: 0, size: 2,
  };
  const cap = Math.ceil(rate * life) + 1;
  const times = [-2, -0.001, 0, 0.013, 0.2, 0.8, 1, 1.333, 2.5, 4.25, 8.75, 40];
  for (let k = 0; k < times.length; k++) {
    const T = times[k];
    let c = 0;
    for (let i = 0; i < o.n; i++) if (FILM.lib.particleAt(i, T, o).alive) c++;
    FILM.expect.true(c <= cap, 'live ' + c + ' exceeds ' + cap + ' at T=' + T);
    if (T < 0) FILM.expect.eq(c, 0);
  }
  const looped = {
    seed: 42, n: 1000, emitter: { x: 0, y: 0, r: 6 }, rate, life, v0: [10, 30],
    gravity: 40, drag: 0.2, wind: 15, loop: 3,
  };
  for (const T of [0, 0.4, 1.2, 2.8, 3, 5.5]) {
    let c = 0;
    for (let i = 0; i < looped.n; i++) if (FILM.lib.particleAt(i, T, looped).alive) c++;
    FILM.expect.true(c <= cap, 'looped live ' + c + ' exceeds ' + cap + ' at T=' + T);
    if (T < 0) FILM.expect.eq(c, 0);
  }
});

FILM.assert('with gravity > 0 and no wind, y increases after the apex', () => {
  // +y is down the canvas. An upward throw (angle -pi/2) climbs, then falls: y grows after the apex.
  const run = (drag) => {
    const o = {
      seed: 7, n: 6, emitter: { x: 200, y: 400, r: 0 }, rate: 4, life: 3,
      v0: [180, 180], angle: -Math.PI / 2, spread: 0, gravity: 500, drag, wind: 0, size: 2,
    };
    for (let i = 0; i < 4; i++) {
      const ys = [];
      for (let s = 0; s <= 80; s++) {
        const p = FILM.lib.particleAt(i, s * 0.05, o);
        if (!p.alive) continue;
        ys.push(p.y);
        FILM.expect.near(p.x, 200, 1e-6);
      }
      FILM.expect.true(ys.length > 20, 'drag ' + drag + ' particle ' + i + ' lived ' + ys.length + ' samples');
      let minAt = 0;
      for (let s = 1; s < ys.length; s++) if (ys[s] < ys[minAt]) minAt = s;
      FILM.expect.true(minAt < ys.length - 4, 'drag ' + drag + ' particle ' + i + ' never reached an apex');
      for (let s = minAt + 1; s < ys.length; s++) {
        FILM.expect.true(ys[s] >= ys[s - 1] - 1e-3, 'drag ' + drag + ' i ' + i + ' y fell after the apex: ' + ys[s - 1] + ' -> ' + ys[s]);
      }
      FILM.expect.true(ys[ys.length - 1] > ys[minAt] + 30, 'drag ' + drag + ' i ' + i + ' did not fall downward');
    }
  };
  run(0.8);
  run(0);
});

FILM.assert('loop: state at T equals state at T+period', () => {
  const period = 2;
  const o = {
    seed: 3, n: 80, emitter: { x: 10, y: 20, r: 8, pts: [[0, 0], [40, 10], [10, 30]] },
    rate: 20, life: 0.6, v0: [30, 90], angle: -1, spread: 0.5,
    gravity: 120, drag: 0.5, wind: 40, size: 3, loop: period,
  };
  const times = [0, 0.25, 0.5, 1, 1.5, 1.75];
  for (let i = 0; i < o.n; i++) {
    for (let k = 0; k < times.length; k++) {
      const T = times[k];
      const a = FILM.lib.particleAt(i, T, o);
      const b = FILM.lib.particleAt(i, T + period, o);
      const c = FILM.lib.particleAt(i, T + period * 2, o);
      FILM.expect.eq(a.alive, b.alive);
      FILM.expect.eq(a.alive, c.alive);
      FILM.expect.near(a.age, b.age, 1e-6);
      FILM.expect.near(a.x, b.x, 1e-6);
      FILM.expect.near(a.y, b.y, 1e-6);
      FILM.expect.near(a.x, c.x, 1e-6);
      FILM.expect.near(a.y, c.y, 1e-6);
      FILM.expect.near(a.age, c.age, 1e-6);
    }
  }
});
