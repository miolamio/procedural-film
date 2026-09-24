// Check 8: whip, inkwash and morph. First frame of each transition matches the outgoing shot
// alone; the first frame at or after dur matches the incoming shot alone. The inkwash mask
// (pixels of the incoming shot, or the ink rim) only grows. The last interior frame of an
// inkwash is measured on solid contrast plates, so shared colours do not count as coverage.
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
      if (k === n - 1) {
        const cover = area / (comp.length / 4);
        FILM.expect.true(cover >= 0.95, `last interior frame covers ${(cover * 100).toFixed(1)}%`);
      }
    }
    FILM.expect.true(prevArea > first, `inkwash mask did not grow (${first} -> ${prevArea})`);
  } finally {
    shot.transitionIn.dur = saved;
    FILM.post = prevPost;
  }
});

function trSnap() {
  const c = FILM.canvas;
  return new Uint8ClampedArray(FILM.ctx.getImageData(0, 0, c.width, c.height).data);
}

function trFill(color) {
  return function (ctx) {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, FILM.W, FILM.H);
  };
}

// Outgoing pixels on the last interior frame, as a fraction of the pixels where the two
// plates differ. The rim is ink, not the outgoing plate, so it does not count as still open.
function trOutgoingFrac(comp, out, inn) {
  let differ = 0;
  let still = 0;
  for (let i = 0; i < comp.length; i += 4) {
    if (out[i] === inn[i] && out[i + 1] === inn[i + 1] && out[i + 2] === inn[i + 2]) continue;
    differ++;
    if (comp[i] === out[i] && comp[i + 1] === out[i + 1] && comp[i + 2] === out[i + 2]) still++;
  }
  return { differ: differ, still: still, frac: differ ? still / differ : 1 };
}

FILM.assert('inkwash closes on the last interior frame for any dur', () => {
  const shot = FILM.shots.find((s) => s.id === 'fx-inkwash');
  FILM.expect.true(!!shot, 'missing fx-inkwash');
  const prev = FILM.shots[shot.index - 1];
  FILM.expect.true(!!prev, 'missing the shot before fx-inkwash');
  const inDef = FILM.registry[shot.id];
  const outDef = FILM.registry[prev.id];
  FILM.expect.true(!!(inDef && outDef && shot.transitionIn), 'missing inkwash plates');
  const savedDur = shot.transitionIn.dur;
  const savedEnd = prev.end;
  const savedIn = inDef.draw;
  const savedOut = outDef.draw;
  const prevPost = FILM.post;
  const P = FILM.lib.pal;
  // Solid plates. The striped fixture shares colours, which would count as already covered.
  inDef.draw = trFill(P.leaf);
  outDef.draw = trFill(P.paper);
  FILM.post = false;
  try {
    for (const dur of [0.25, 0.5, 1.0]) {
      const n = trFrames(dur);
      FILM.expect.true(n >= 2, `dur ${dur} has no interior frame after p = 0`);
      const T = shot.start + (n - 1) / FILM.FPS;
      shot.transitionIn.dur = dur;
      FILM.renderFrame(T);
      const comp = trSnap();
      shot.transitionIn.dur = 0;
      FILM.renderFrame(T);
      const inn = trSnap();
      prev.end = T + 1 / FILM.FPS;
      FILM.renderFrame(T);
      const out = trSnap();
      prev.end = savedEnd;
      const got = trOutgoingFrac(comp, out, inn);
      FILM.expect.true(got.differ > 0, `dur ${dur} contrast plates did not differ`);
      FILM.expect.true(
        got.frac <= 0.01,
        `dur ${dur} leaves ${(got.frac * 100).toFixed(2)}% outgoing on the last interior frame (${got.still}/${got.differ})`
      );
    }
    // p = 0 is the outgoing plate alone, including when the seam is not the fixture's 0.5s.
    shot.transitionIn.dur = 0.25;
    const T0 = shot.start;
    FILM.renderFrame(T0);
    const at0 = trSnap();
    prev.end = T0 + 1 / FILM.FPS;
    FILM.renderFrame(T0);
    const plate = trSnap();
    let mismatch = 0;
    for (let i = 0; i < at0.length; i += 4) {
      if (at0[i] !== plate[i] || at0[i + 1] !== plate[i + 1] || at0[i + 2] !== plate[i + 2]) mismatch++;
    }
    FILM.expect.eq(mismatch, 0);
  } finally {
    shot.transitionIn.dur = savedDur;
    prev.end = savedEnd;
    inDef.draw = savedIn;
    outDef.draw = savedOut;
    FILM.post = prevPost;
  }
});
