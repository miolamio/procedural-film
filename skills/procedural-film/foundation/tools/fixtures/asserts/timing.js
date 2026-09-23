// Check 8. lib beat, hit, popTwos and cue envelopes against the fixture timeline (120 bpm).
// Loaded only by check.cjs --fixtures, after the engine. No Math.random / Date.
FILM.assert('beat and onBeat at 120 bpm', () => {
  const b = FILM.lib.beat(0.5);
  FILM.expect.eq(b.n, 1);
  FILM.expect.near(b.frac, 0);
  FILM.expect.eq(b.bar, 0);
  FILM.expect.eq(b.beatInBar, 1);
  const z = FILM.lib.beat(0);
  FILM.expect.eq(z.n, 0);
  FILM.expect.eq(z.bar, 0);
  FILM.expect.eq(z.beatInBar, 0);
  const bar = FILM.lib.beat(2);
  FILM.expect.eq(bar.n, 4);
  FILM.expect.eq(bar.bar, 1);
  FILM.expect.eq(bar.beatInBar, 0);
  FILM.expect.near(FILM.lib.beat(0.25).frac, 0.5);
  FILM.expect.near(FILM.lib.onBeat(0.625, 4), 0);
  FILM.expect.near(FILM.lib.onBeat(0.6875, 4), 0.0625);
  FILM.expect.near(FILM.lib.onBeat(0.75), 0.25);
  FILM.expect.eq(FILM.lib.beat(1.25).n, FILM.lib.beat(1.25).n);
});

FILM.assert('hit is visible on the beat frame when lead is 1', () => {
  const a = 1;
  const frames = 6;
  const on = FILM.lib.hit(a, a, frames);
  FILM.expect.true(on > 0, 'hit at t = a was ' + on);
  FILM.expect.near(on, 1 / frames);
  FILM.expect.eq(FILM.lib.hit(a - 1 / 24, a, frames), 0);
  FILM.expect.eq(FILM.lib.hit(a, a, frames, null, 0), 0);
  FILM.expect.near(FILM.lib.hit(a + 1 / 24, a, frames), 1 / 3);
  FILM.expect.near(FILM.lib.hit(a, a, 4, (u) => u * 2, 1), 0.5);
  FILM.expect.eq(FILM.lib.hit(a, a, frames), FILM.lib.hit(a, a, frames));
});

FILM.assert('popTwos yields the three drawings', () => {
  const a = 2;
  const got = [0, 1, 2].map((i) => FILM.lib.popTwos(a + i / 12, a));
  FILM.expect.eq(got, [0.72, 1.08, 1]);
  FILM.expect.eq(FILM.lib.popTwos(a + 5 / 12, a), 1);
  FILM.expect.eq(FILM.lib.popTwos(a - 1 / 12, a), 0);
  FILM.expect.eq(FILM.lib.drawing(a, a), 0);
  FILM.expect.eq(FILM.lib.drawing(a + 1 / 12, a), 1);
  FILM.expect.eq(FILM.lib.drawing(a + 2 / 12, a), 2);
});

FILM.assert('cue returns the previous cue and Infinity before the first', () => {
  const early = FILM.lib.cue(-0.25);
  FILM.expect.eq(early.since, Infinity);
  FILM.expect.eq(early.cue, null);
  const mid = FILM.lib.cue(3);
  FILM.expect.eq(mid.cue.t, 2.5);
  FILM.expect.eq(mid.cue.kind, 'cut');
  FILM.expect.near(mid.since, 0.5);
  const on = FILM.lib.cue(4, 'burst');
  FILM.expect.near(on.since, 0);
  FILM.expect.eq(on.cue.kind, 'burst');
  const later = FILM.lib.cue(6.5, 'cut');
  FILM.expect.eq(later.cue.t, 6);
  FILM.expect.near(later.since, 0.5);
  const none = FILM.lib.cue(3.9, 'burst');
  FILM.expect.eq(none.since, Infinity);
  const nxt = FILM.lib.nextCue(2.5);
  FILM.expect.eq(nxt.cue.t, 4);
  FILM.expect.near(nxt.until, 1.5);
  const after = FILM.lib.nextCue(4);
  FILM.expect.eq(after.cue.t, 4.5);
  const done = FILM.lib.nextCue(1000);
  FILM.expect.eq(done.until, Infinity);
  FILM.expect.eq(done.cue, null);
});

FILM.assert('pulse is 1 on the cue frame and falls until the next', () => {
  const opt = { decay: 0.5, shape: 'linear' };
  FILM.expect.eq(FILM.lib.pulse(4, 'burst', opt), 1);
  FILM.expect.eq(FILM.lib.pulse(0, 'open', opt), 1);
  FILM.expect.eq(FILM.lib.pulse(2.5, 'cut', opt), 1);
  FILM.expect.eq(FILM.lib.pulse(-1, 'open', opt), 0);
  FILM.expect.near(FILM.lib.pulse(2.5, 'cut'), 1);
  let prev = 1;
  for (let i = 1; i <= 8; i++) {
    const T = 4 + (0.5 * i) / 8;
    const v = FILM.lib.pulse(T, 'burst', opt);
    FILM.expect.true(v <= prev + 1e-9, 'burst pulse rose at ' + T + ': ' + prev + ' -> ' + v);
    prev = v;
  }
  FILM.expect.true(FILM.lib.pulse(4.25, 'burst', opt) < 1, 'pulse did not fall');
  prev = FILM.lib.pulse(4, undefined, opt);
  FILM.expect.eq(prev, 1);
  for (let i = 1; i <= 9; i++) {
    const T = 4 + (0.5 * i) / 10;
    const v = FILM.lib.pulse(T, undefined, opt);
    FILM.expect.true(v <= prev + 1e-9, 'pulse rose at ' + T + ': ' + prev + ' -> ' + v);
    prev = v;
  }
  FILM.expect.true(prev < 0.15, 'envelope was still ' + prev + ' just before the next cue');
  let expo = FILM.lib.pulse(4, 'burst', { decay: 0.5, shape: 'outExpo' });
  FILM.expect.eq(expo, 1);
  for (let i = 1; i <= 8; i++) {
    const v = FILM.lib.pulse(4 + (0.5 * i) / 8, 'burst', { decay: 0.5, shape: 'outExpo' });
    FILM.expect.true(v <= expo + 1e-9, 'outExpo pulse rose');
    expo = v;
  }
});
