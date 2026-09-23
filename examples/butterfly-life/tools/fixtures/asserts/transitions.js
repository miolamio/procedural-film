// Check 8: whip, inkwash and morph. First frame of each transition matches the outgoing shot
// alone; the first frame at or after dur matches the incoming shot alone. The inkwash mask
// (pixels of the incoming shot, or the ink rim) only grows.
// No Math.random / Date. Loaded only by check.cjs --fixtures.

function trFrames(dur) {
  // Same split as core's interiorFrames: frame starts strictly inside dur.
  const span = (dur - 1e-6) * FILM.FPS;
  if (!(span > 0)) return 0;
  const f = Math.floor(span);
  return span - f < 1e-9 ? f : f + 1;
}

function trHex(hex) {
  let h = String(hex || '').replace('#', '');
  if (h.length === 3) h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2);
  const n = parseInt(h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function trHash(T) {
  const prev = FILM.post;
  FILM.errors = [];
  FILM.post = false;
  try {
    FILM.renderFrame(T);
    return FILM.pixels(FILM.canvas).hash();
  } finally {
    FILM.post = prev;
  }
}

FILM.assert('transition endpoints match the outgoing and incoming shots', () => {
  const shots = FILM.shots;
  for (const id of ['fx-whip', 'fx-inkwash', 'fx-morphcut']) {
    const shot = shots.find((s) => s.id === id);
    FILM.expect.true(!!shot, `missing shot ${id}`);
    const prev = shots[shot.index - 1];
    const T0 = shot.start;
    const T1 = shot.start + trFrames(shot.transitionIn.dur) / FILM.FPS;
    const h0 = trHash(T0);
    const end = prev.end;
    prev.end = T0 + 1 / FILM.FPS;
    let hOut;
    try {
      hOut = trHash(T0);
    } finally {
      prev.end = end;
    }
    FILM.expect.eq(h0, hOut);
    const h1 = trHash(T1);
    const dur = shot.transitionIn.dur;
    shot.transitionIn.dur = 0;
    let hIn;
    try {
      hIn = trHash(T1);
    } finally {
      shot.transitionIn.dur = dur;
    }
    FILM.expect.eq(h1, hIn);
  }
});

FILM.assert('inkwash mask area is monotonic', () => {
  const shot = FILM.shots.find((s) => s.id === 'fx-inkwash');
  FILM.expect.true(!!shot, 'missing fx-inkwash');
  const n = trFrames(shot.transitionIn.dur);
  const saved = shot.transitionIn.dur;
  const name = shot.transitionIn.color;
  const hex = (FILM.lib.pal && FILM.lib.pal[name]) || name;
  const ink = trHex(hex);
  const prevPost = FILM.post;
  FILM.post = false;
  let prevArea = -1;
  let first = 0;
  try {
    for (let k = 0; k < n; k++) {
      const T = shot.start + k / FILM.FPS;
      FILM.renderFrame(T);
      const c = FILM.canvas;
      const comp = FILM.ctx.getImageData(0, 0, c.width, c.height).data;
      shot.transitionIn.dur = 0;
      FILM.renderFrame(T);
      const inn = FILM.ctx.getImageData(0, 0, c.width, c.height).data;
      shot.transitionIn.dur = saved;
      let area = 0;
      for (let i = 0; i < comp.length; i += 4) {
        const matchIn = comp[i] === inn[i] && comp[i + 1] === inn[i + 1] && comp[i + 2] === inn[i + 2];
        const matchInk = comp[i] === ink[0] && comp[i + 1] === ink[1] && comp[i + 2] === ink[2];
        if (matchIn || matchInk) area++;
      }
      if (k === 0) first = area;
      FILM.expect.true(area >= prevArea, `inkwash area dipped at k=${k}: ${area} < ${prevArea}`);
      prevArea = area;
    }
    FILM.expect.true(prevArea > first, `inkwash mask did not grow (${first} -> ${prevArea})`);
  } finally {
    shot.transitionIn.dur = saved;
    FILM.post = prevPost;
  }
});
