// Fixture scene: circles swell on the fixture cues inside this shot; a metronome ticks sixteenths.
// Global T 10..12. Cues at 10, 10.5, 11, 11.5 light open, cut, burst, fade in turn.
// Frame 0 is a full drawing: paper, the open orb at full pulse, the downbeat pop and the first tick.
FILM.scene({
  id: 'fx-pulse',
  draw(ctx, t, info) {
    const L = info.lib, P = L.pal;
    const T = info.T;
    const bpm = (FILM.TIMELINE && FILM.TIMELINE.bpm) || 120;
    const spb = 60 / bpm;
    const step = spb / 4;
    const beat = L.beat(T);
    const aBeat = beat.n * spb;
    const pop = L.popTwos(T, aBeat) || 0.72;
    const hit = L.hit(T, aBeat, 6, 'outExpo', 1);
    const since16 = L.onBeat(T, 4);
    const tick = since16 <= 1 / 48 ? 1 : Math.max(0, 1 - since16 / (step * 0.9));
    const heard = L.cue(T);

    // 1. plate
    L.paper(ctx, { seed: 16 });
    L.text(ctx, 'pulse', 80, 150, { size: 56, color: P.ink, tracking: 1 });
    const cueName = heard.cue ? heard.cue.kind : 'rest';
    L.text(ctx, cueName, 1000, 158, { size: 32, color: P.annMagenta, align: 'right', italic: true });

    // 2. one orb per fixture cue kind, radius = the falling pulse of the latest cue of that kind
    const orbs = [
      ['open', P.ochre, 320, 470],
      ['cut', P.teal, 760, 470],
      ['burst', P.orange, 320, 900],
      ['fade', P.annBlue, 760, 900],
    ];
    orbs.forEach(([kind, color, x, y], i) => {
      const env = L.pulse(T, kind, { decay: 0.6, shape: 'linear' });
      const r = 40 + 150 * env;
      L.inkCircle(ctx, x, y, r, { fill: color, color: P.ink, width: 4, seed: 20 + i });
      L.inkCircle(ctx, x, y, r * 0.38, { fill: P.white, color: P.inkSoft, width: 2, seed: 40 + i });
      L.text(ctx, kind, x, y + r + 36, { size: 26, color: P.inkSoft, align: 'center' });
    });

    // 3. sixteenth staff. The live division is the tall mark; a beat dot pops on twos above it.
    const n = 16;
    const x0 = 100, x1 = 980, yb = 1470;
    const origin = Math.floor(info.shot.start / step + 1e-6);
    const live = Math.floor(T / step + 1e-6);
    ctx.save();
    ctx.fillStyle = P.inkSoft;
    ctx.fillRect(x0, yb, x1 - x0, 4);
    let liveX = x0;
    for (let i = 0; i < n; i++) {
      const x = x0 + ((x1 - x0) * i) / (n - 1);
      const on = origin + i === live;
      if (on) liveX = x;
      const h = on ? 36 + 150 * tick : (i % 4 === 0 ? 78 : 40);
      ctx.fillStyle = on ? P.annMagenta : (i % 4 === 0 ? P.ink : P.inkFaint);
      ctx.fillRect(x - (on ? 8 : 3), yb - h, on ? 16 : 6, h);
    }
    ctx.restore();
    const dot = 16 + 28 * pop;
    L.inkCircle(ctx, liveX, yb - 210, dot + 10 + 16 * hit, {
      color: P.annMagenta, width: 3 + 8 * hit, alpha: 0.35 + 0.65 * hit, seed: 8,
    });
    L.inkCircle(ctx, liveX, yb - 210, dot, { fill: P.rose, color: P.ink, width: 3, seed: 9 });
  },
});
