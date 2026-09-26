// Stick-figure invariants: stickPose, poseMix, stickFigure, springLimb, scribbleBall.
// Loaded only by check.cjs --fixtures.

FILM.assert('stickPose: a standing figure is exactly `height` tall and stands on y', () => {
  const L = FILM.lib;
  for (const limb of ['line', 'zigzag']) {
    const J = L.stickPose({}, { x: 300, y: 1500, height: 600, limb });
    FILM.expect.near(J.head[1] - J.headR, 900, 1e-6);
    FILM.expect.near(Math.max(J.ankleL[1], J.ankleR[1], J.toeL[1], J.toeR[1]), 1500, 1e-6);
    FILM.expect.near(J.hip[0], 300, 1e-6);
    FILM.expect.near(J.head[0], 300, 1e-6);
  }
});

FILM.assert('stickPose: facing -1 mirrors facing 1 about the hip', () => {
  const L = FILM.lib;
  const pose = L.stickPoses.walk1;
  const a = L.stickPose(pose, { x: 500, y: 1400, height: 500 });
  const b = L.stickPose(pose, { x: 500, y: 1400, height: 500, facing: -1 });
  for (const k of ['head', 'handL', 'elbowR', 'kneeL', 'toeR']) {
    FILM.expect.near(a[k][0] - 500, 500 - b[k][0], 1e-9);
    FILM.expect.near(a[k][1], b[k][1], 1e-9);
  }
  FILM.expect.true(a.toeL[0] > a.ankleL[0], 'the foot does not point the way the figure faces');
});

FILM.assert('stickPose: the lowest point of any pose rests on y; anchor hip puts the hip there', () => {
  const L = FILM.lib;
  for (const name of Object.keys(L.stickPoses)) {
    const J = L.stickPose(L.stickPoses[name], { x: 540, y: 1600, height: 700 });
    let low = J.head[1] + J.headR;
    for (const k of ['hip', 'shoulder', 'elbowL', 'handL', 'elbowR', 'handR', 'kneeL', 'ankleL', 'toeL', 'kneeR', 'ankleR', 'toeR']) low = Math.max(low, J[k][1]);
    FILM.expect.near(low, 1600, 1e-6, name);
  }
  const H = L.stickPose(L.stickPoses.jump, { x: 100, y: 200, anchor: 'hip' });
  FILM.expect.near(H.hip[0], 100, 1e-9);
  FILM.expect.near(H.hip[1], 200, 1e-9);
  const lie = L.stickPose(L.stickPoses.lie, { x: 540, y: 1600, height: 700 });
  FILM.expect.true(Math.abs(lie.head[1] - lie.hip[1]) < lie.D, 'lie is not lying down');
});

FILM.assert('poseMix hits both ends and the middle; presets are frozen', () => {
  const L = FILM.lib;
  const a = { armL: 1, kneeL: 0.4 }, b = { armL: 3, legR: -1 };
  FILM.expect.eq(L.poseMix(a, b, 0).armL, 1);
  FILM.expect.eq(L.poseMix(a, b, 1).legR, -1);
  const m = L.poseMix(a, b, 0.5);
  FILM.expect.near(m.armL, 2);
  FILM.expect.near(m.kneeL, 0.2);
  FILM.expect.near(m.legR, -0.5);
  FILM.expect.true(Object.isFrozen(L.stickPoses) && Object.isFrozen(L.stickPoses.walk1), 'stickPoses can be changed');
});

function stickHash(boil, extra) {
  const c = FILM.makeCanvas(400, 600);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 400, 600);
  const o = Object.assign({ x: 200, y: 580, height: 520, boil, head: 'scribble' }, extra);
  FILM.lib.stickFigure(ctx, FILM.lib.stickPoses.walk2, o);
  return FILM.pixels(c).hash();
}

FILM.assert('stickFigure is deterministic per boil drawing and trembles between drawings', () => {
  FILM.expect.eq(stickHash(3), stickHash(3));
  FILM.expect.true(stickHash(3) !== stickHash(4), 'the line does not boil');
  FILM.expect.eq(stickHash(3, { limb: 'coil', head: 'knot' }), stickHash(3, { limb: 'coil', head: 'knot' }));
  FILM.expect.true(stickHash(3, { head: 'solid' }) !== stickHash(3), 'the head option changes nothing');
});

FILM.assert('springLimb stays inside its band and reaches both ends', () => {
  const L = FILM.lib;
  for (const kind of ['zigzag', 'coil', 'ladder']) {
    const c = FILM.makeCanvas(600, 200);
    const ctx = c.getContext('2d', { willReadFrequently: true });
    const len = L.springLimb(ctx, [50, 100], [550, 100], { kind, amp: 20, step: 16, width: 2, jitter: 0, color: '#000000' });
    FILM.expect.near(len, 500, 1e-6);
    const px = FILM.pixels(c);
    const outside = px.count((r, g, b, a, x, y) => a > 0 && Math.abs(y - 100) > 20 + 2);
    FILM.expect.eq(outside, 0, `${kind}: ink outside the band`);
    FILM.expect.true(px.count((r, g, b, a, x) => a > 128 && x < 60) > 0, `${kind}: does not start on a`);
    FILM.expect.true(px.count((r, g, b, a, x) => a > 128 && x > 540) > 0, `${kind}: does not reach b`);
    FILM.expect.eq(px.count((r, g, b, a, x) => a > 0 && (x < 47 || x > 553)), 0, `${kind}: runs past its ends`);
  }
});

FILM.assert('scribbleBall stays inside its radius', () => {
  const c = FILM.makeCanvas(200, 200);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  FILM.lib.scribbleBall(ctx, 100, 100, 60, { width: 3, boil: 2 });
  const px = FILM.pixels(c);
  FILM.expect.eq(px.count((r, g, b, a, x, y) => a > 0 && Math.hypot(x + 0.5 - 100, y + 0.5 - 100) > 60 + 2.5), 0);
  FILM.expect.true(px.count((r, g, b, a) => a > 128) > 2000, 'the knot is too sparse');
});
