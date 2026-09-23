// Check 8: lib.smear. A held phase matches one draw, ghosts do not blow out, draw runs n times.
FILM.assert('smear n:1 and a held phase match one draw at to', () => {
  const cases = [
    { n: 1, from: 0, to: 1, mode: 'ghosts', alpha: 0.25, falloff: 0 },
    { n: 1, from: 0, to: 1, mode: 'stretch', alpha: 0.2, falloff: 2, seed: 4 },
    { n: 1, from: 0.2, to: 0.8, mode: 'lines', alpha: 0.3, seed: 9, falloff: 2 },
    { n: 6, from: 0.4, to: 0.4, mode: 'ghosts', alpha: 0.3, falloff: 0 },
    { n: 4, from: -1, to: -1, mode: 'stretch', alpha: 0.5, falloff: 3, seed: 4 },
    { n: 5, from: 2, to: 2, mode: 'lines', alpha: 0.4, seed: 8, falloff: 2 },
  ];
  for (let i = 0; i < cases.length; i++) {
    const opt = cases[i];
    const draw = (g, u) => {
      g.fillStyle = FILM.lib.pal.teal;
      g.fillRect(6 + u * 8, 5, 10, 12);
      g.strokeStyle = FILM.lib.pal.ink;
      g.lineWidth = 2;
      g.strokeRect(6 + u * 8, 5, 10, 12);
    };
    const lone = FILM.makeCanvas(48, 32);
    const lctx = lone.getContext('2d');
    lctx.fillStyle = FILM.lib.pal.paper;
    lctx.fillRect(0, 0, 48, 32);
    draw(lctx, opt.to);
    const smeared = FILM.makeCanvas(48, 32);
    const sctx = smeared.getContext('2d');
    sctx.fillStyle = FILM.lib.pal.paper;
    sctx.fillRect(0, 0, 48, 32);
    let calls = 0;
    FILM.lib.smear(sctx, (g, u) => {
      calls += 1;
      draw(g, u);
    }, opt);
    FILM.expect.eq(calls, opt.n);
    FILM.expect.true(
      FILM.pixels(smeared).hash() === FILM.pixels(lone).hash(),
      'pixels differ for ' + opt.mode + ' n=' + opt.n + ' from=' + opt.from + ' to=' + opt.to
    );
  }
});

FILM.assert('smear calls draw once per copy from the trailing phase to the leading one', () => {
  const modes = ['ghosts', 'stretch', 'lines'];
  for (let m = 0; m < modes.length; m++) {
    const us = [];
    const c = FILM.makeCanvas(64, 32);
    const ctx = c.getContext('2d');
    FILM.lib.smear(ctx, (g, u) => {
      us.push(u);
      g.fillStyle = FILM.lib.pal.ink;
      g.fillRect(4 + u * 24, 6, 10, 12);
    }, { from: 0.25, to: 0.75, n: 5, mode: modes[m], seed: 3, alpha: 1, falloff: 1 });
    FILM.expect.eq(us.length, 5);
    FILM.expect.near(us[0], 0.25);
    FILM.expect.near(us[4], 0.75);
  }
});

FILM.assert('smear ghosts keep per-pixel alpha at or below 255', () => {
  const c = FILM.makeCanvas(48, 48);
  const ctx = c.getContext('2d');
  FILM.lib.smear(ctx, (g) => {
    g.fillStyle = FILM.lib.pal.red;
    g.fillRect(8, 8, 28, 28);
  }, { from: 0, to: 1, n: 8, mode: 'ghosts', alpha: 1, falloff: 0 });
  const px = FILM.pixels(c);
  FILM.expect.eq(px.count((r, g, b, a) => a > 255), 0);
  FILM.expect.true(px.count((r, g, b, a) => a === 255) > 0, 'expected an opaque ghost');
  // pal.red is opaque; source-over of that ink must not climb toward white
  FILM.expect.eq(px.count((r, g, b) => r > 196 || g > 80 || b > 60), 0);
});

FILM.assert('smear ghosts composite instead of stacking to opaque', () => {
  const c = FILM.makeCanvas(32, 32);
  const ctx = c.getContext('2d');
  FILM.lib.smear(ctx, (g) => {
    g.fillStyle = FILM.lib.pal.ink;
    g.fillRect(4, 4, 20, 20);
  }, { from: 0, to: 0.2, n: 6, mode: 'ghosts', alpha: 0.2, falloff: 0 });
  const px = FILM.pixels(c);
  FILM.expect.eq(px.count((r, g, b, a) => a === 255), 0);
  FILM.expect.true(px.count((r, g, b, a) => a > 40 && a < 255) > 0, 'faint ghosts did not land');
});

FILM.assert('smear stretch covers more ground than the pose alone', () => {
  const pose = (g, u) => {
    g.fillStyle = FILM.lib.pal.ink;
    g.fillRect(8 + u * 40, 10, 14, 18);
  };
  const count = (use) => {
    const c = FILM.makeCanvas(96, 40);
    const ctx = c.getContext('2d');
    if (use) FILM.lib.smear(ctx, pose, { from: 0, to: 1, n: 4, mode: 'stretch', falloff: 1, alpha: 1, seed: 2 });
    else pose(ctx, 1);
    return FILM.pixels(c).count((r, g, b, a) => a > 20);
  };
  const stretched = count(true);
  const lone = count(false);
  FILM.expect.true(stretched > lone, 'stretch did not enlarge the pose (' + stretched + ' vs ' + lone + ')');
});

FILM.assert('smear lines add strokes behind the pose', () => {
  const c = FILM.makeCanvas(96, 48);
  const ctx = c.getContext('2d');
  FILM.lib.smear(ctx, (g, u) => {
    g.fillStyle = FILM.lib.pal.teal;
    g.fillRect(8 + u * 40, 10, 16, 22);
  }, { from: 0, to: 1, n: 4, mode: 'lines', alpha: 1, falloff: 1, seed: 3 });
  // leading rect starts at x = 48. Lines run back toward the previous pose.
  const behind = FILM.pixels(c).count((r, g, b, a, x) => a > 20 && x < 46);
  FILM.expect.true(behind > 8, 'no speed lines behind the pose (' + behind + ')');
});

FILM.assert('smear is deterministic', () => {
  const run = (mode, seed) => {
    const c = FILM.makeCanvas(72, 40);
    const ctx = c.getContext('2d');
    ctx.fillStyle = FILM.lib.pal.paper;
    ctx.fillRect(0, 0, 72, 40);
    FILM.lib.smear(ctx, (g, u) => {
      g.fillStyle = FILM.lib.pal.orange;
      g.beginPath();
      g.moveTo(10 + u * 22, 20);
      g.quadraticCurveTo(22 + u * 22, 6, 36 + u * 22, 18);
      g.quadraticCurveTo(30 + u * 22, 32, 10 + u * 22, 20);
      g.fill();
    }, { from: 0, to: 1, n: 5, mode: mode, alpha: 0.9, falloff: 1.2, seed: seed });
    return FILM.pixels(c).hash();
  };
  const modes = ['ghosts', 'stretch', 'lines'];
  for (let i = 0; i < modes.length; i++) FILM.expect.eq(run(modes[i], 5), run(modes[i], 5));
  FILM.expect.true(run('lines', 1) !== run('lines', 2), 'line seed was ignored');
});
