// music.js : the score and sound design for "The life of an Arctic tern".
// Owner: music. Contract: docs/CONTRACT.md, section Audio.
//
// FILM.audio.render(ctx, { start = 0, dest = ctx.destination }) schedules the whole piece,
// music and effects, from global time `start` into any BaseAudioContext.
// Every sound is synthesised here: oscillators, periodic waves, seeded noise, filters, envelopes,
// a ping-pong delay, convolver reverbs on generated impulse responses, a glue compressor and a
// soft limiter. Randomness comes only from FILM.lib.rng, seeded per event, so any start time
// schedules the same notes at the same global times.
//
// The engine, instruments, effects and master chain below are film-agnostic. The film is the CH
// chord table, the MIX.ride section automation and score(): E major with add9 colour at 120 bpm,
// composed against FILM.TIMELINE.cues so every hit lands on its cut.
(function () {
  'use strict';
  const FILM = window.FILM;
  const lib = FILM.lib;
  const TAU = Math.PI * 2;
  const FLOOR = 1e-5;

  // DynamicsCompressorNode delays its output by a fixed 6 ms look-ahead (measured: 288 samples at
  // 48 kHz). Every event before the compressor is scheduled that much early, so it leaves the master
  // exactly on its cue. Only an event inside the first 6 ms of a render window can land late.
  const LAT = 0.006;

  // Mix constants, tuned by measurement (tools/audio): loudness, peaks, per-bar profile.
  const MIX = {
    trim: 1.05,
    ceiling: 0.66, // soft limiter output ceiling (about -3.6 dBFS)
    knee: 0.5,
    bus: { drums: 0.6, perc: 0.8, bass: 0.3, pad: 0.26, keys: 0.6, bells: 0.45, lead: 0.5, sfx: 0.62, amb: 0.5 },
    // Master tilt EQ in dB: a low shelf under the subs, presence and air for phone speakers.
    eq: { low: -4, presence: 5, air: 3 },
    comp: { threshold: -18, knee: 10, ratio: 2, attack: 0.006, release: 0.2 },
    // Section fader rides in dB at global times, pre-compressor: quiet egg, hushed sheath, the
    // midnight sun climbing into the full-level first flight, a hushed pack-ice breakdown, and an
    // ending level that meets the opening level at the loop seam.
    ride: [
      [0, -1], [1.49, -1], [1.51, -3], [3.98, -3], [4.0, -2], [7.98, -2], [8.0, -1.5], [11.48, -1.5], [11.52, -5.5],
      [12.98, -5.5], [13.0, -4], [15.0, -3], [15.98, -2], [16.0, 0], [17.98, 0], [18.0, -1], [21.98, -1], [22.0, -2],
      [23.48, -2], [23.5, -2.5], [24.0, -2], [25.98, -0.5], [26.0, 0], [27.98, 0], [28.02, -4.5], [28.98, -4.5], [29.02, -3],
      [29.48, -3], [29.5, -2], [30.5, -1.2], [32, -0.5],
    ],
  };

  // ---------------------------------------------------------------- pitch
  const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function hz(n) {
    if (typeof n === 'number') return n;
    const m = /^([A-G])(#|b)?(-?\d)$/.exec(n);
    const midi = 12 * (Number(m[3]) + 1) + SEMI[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  // ---------------------------------------------------------------- envelopes
  // pts: [[dt, value, shape]] with dt from the note start; shape is the ramp INTO that point:
  // 'lin' (default), 'exp' or 'set'. The first point must sit at dt 0.
  // When the voice started before the render window (skip > 0) the value at `skip` is computed
  // and automation resumes from there, so a seek hears the same envelope.
  function setEnv(param, pts, c0, skip) {
    let i;
    let prev;
    if (skip > 0) {
      let v = pts[0][1];
      for (i = 1; i < pts.length; i++) {
        const a = pts[i - 1];
        const b = pts[i];
        if (skip < b[0]) {
          const f = (skip - a[0]) / Math.max(1e-9, b[0] - a[0]);
          const sh = b[2] || 'lin';
          if (sh === 'set') v = a[1];
          else if (sh === 'exp' && a[1] > 0) v = a[1] * Math.pow(Math.max(b[1], FLOOR) / a[1], f);
          else v = a[1] + (b[1] - a[1]) * f;
          break;
        }
        v = b[1];
      }
      param.setValueAtTime(v, c0 + skip);
      prev = v;
    } else {
      param.setValueAtTime(pts[0][1], c0);
      prev = pts[0][1];
      i = 1;
    }
    for (; i < pts.length; i++) {
      const v = pts[i][1];
      const sh = pts[i][2] || 'lin';
      const w = c0 + pts[i][0];
      if (sh === 'set') {
        param.setValueAtTime(v, w);
        prev = v;
      } else if (sh === 'exp' && prev > 0) {
        param.exponentialRampToValueAtTime(Math.max(v, FLOOR), w);
        prev = Math.max(v, FLOOR);
      } else {
        param.linearRampToValueAtTime(v, w);
        prev = v;
      }
    }
  }

  // Percussive amplitude envelope: attack then exponential decay to silence.
  const perc = (vel, att, dec) => [[0, 0], [att, vel], [att + dec, FLOOR, 'exp']];

  // ---------------------------------------------------------------- generated buffers
  function noiseBuffer(ctx, secs, channels, seed) {
    const n = Math.floor(secs * ctx.sampleRate);
    const buf = ctx.createBuffer(channels, n, ctx.sampleRate);
    for (let ch = 0; ch < channels; ch++) {
      const r = lib.rng(lib.hash('film-noise', seed, ch));
      const d = buf.getChannelData(ch);
      for (let i = 0; i < n; i++) d[i] = r() * 2 - 1;
    }
    return buf;
  }

  // Impulse response: seeded stereo noise, exponential decay to -60 dB at `secs`, a two-pole
  // lowpass that darkens over the tail, a pre-delay and a few early reflections.
  function impulse(ctx, secs, seed, o) {
    const sr = ctx.sampleRate;
    const n = Math.floor(secs * sr);
    const buf = ctx.createBuffer(2, n, sr);
    const pre = Math.floor(o.pre * sr);
    const tail = secs - o.pre;
    for (let ch = 0; ch < 2; ch++) {
      const r = lib.rng(lib.hash('film-ir', seed, ch));
      const d = buf.getChannelData(ch);
      let l1 = 0;
      let l2 = 0;
      for (let i = pre; i < n; i++) {
        const t = (i - pre) / sr;
        const u = t / tail;
        const env = Math.exp(-6.9 * u) * (t < 0.005 ? t / 0.005 : 1);
        const a = o.bright + (o.dark - o.bright) * Math.sqrt(u);
        l1 += a * (r() * 2 - 1 - l1);
        l2 += a * (l1 - l2);
        d[i] = l2 * env;
      }
      for (let k = 0; k < o.early; k++) {
        const i = pre + Math.floor((0.003 + r() * o.spread) * sr);
        if (i < n) d[i] += (r() * 2 - 1) * 0.35 * (1 - k / o.early);
      }
    }
    return buf;
  }

  // Grains rendered straight into a stereo buffer: band-passed noise flaps and clicks, or short sines.
  // g: { t, dur, amp, pan (-1..1), f, q, att, dec, sine }
  function grainBuffer(ctx, key, secs, grains) {
    const sr = ctx.sampleRate;
    const n = Math.max(1, Math.ceil(secs * sr));
    const buf = ctx.createBuffer(2, n, sr);
    const L = buf.getChannelData(0);
    const R = buf.getChannelData(1);
    const r = lib.rng(lib.hash('film-grain', key));
    for (const g of grains) {
      const i0 = Math.floor(g.t * sr);
      const m = Math.floor(g.dur * sr);
      const gl = Math.cos(((g.pan + 1) * Math.PI) / 4);
      const gr = Math.sin(((g.pan + 1) * Math.PI) / 4);
      const att = g.att || 0.002;
      const dec = g.dec || g.dur * 0.3;
      const w = (TAU * g.f) / sr;
      const al = Math.sin(w) / (2 * (g.q || 1));
      const cw = Math.cos(w);
      const a0 = 1 + al;
      let x1 = 0;
      let x2 = 0;
      let y1 = 0;
      let y2 = 0;
      const ph = r() * TAU;
      for (let k = 0; k < m; k++) {
        const j = i0 + k;
        if (j >= n) break;
        const tt = k / sr;
        let s;
        if (g.sine) s = Math.sin(ph + w * k);
        else {
          const x = r() * 2 - 1;
          s = (al * x - al * x2 + 2 * cw * y1 - (1 - al) * y2) / a0;
          x2 = x1;
          x1 = x;
          y2 = y1;
          y1 = s;
        }
        const env = tt < att ? tt / att : Math.exp(-(tt - att) / dec);
        const tailFade = k > m - 64 ? (m - k) / 64 : 1;
        const v = s * env * tailFade * g.amp;
        if (j >= 0) {
          L[j] += v * gl;
          R[j] += v * gr;
        }
      }
    }
    return buf;
  }

  // Stick-slip creak: irregular pulses, each ringing three damped wooden resonances.
  function creakBuffer(ctx, key, secs, rate0, rate1, formants) {
    const sr = ctx.sampleRate;
    const n = Math.ceil(secs * sr);
    const buf = ctx.createBuffer(1, n, sr);
    const d = buf.getChannelData(0);
    const r = lib.rng(lib.hash('film-creak', key));
    let t = 0.004;
    while (t < secs - 0.01) {
      const u = t / secs;
      const swell = Math.sin(Math.PI * Math.min(1, u * 1.15)) * (0.55 + 0.45 * r());
      const i0 = Math.floor(t * sr);
      for (const [f, tau, a] of formants) {
        const m = Math.min(n - i0, Math.floor(tau * 5 * sr));
        const fj = f * (0.94 + 0.12 * r());
        for (let k = 0; k < m; k++) d[i0 + k] += swell * a * Math.exp(-k / sr / tau) * Math.sin((TAU * fj * k) / sr);
      }
      const rate = rate0 + (rate1 - rate0) * u;
      t += (1 / rate) * (0.7 + 0.6 * r());
    }
    for (let k = 0; k < 96 && k < n; k++) d[n - 1 - k] *= k / 96;
    return buf;
  }

  // Soft limiter transfer curve. The shaper is fed at half level, so the curve covers inputs up to
  // +6 dBFS: linear to the knee, then a tanh shoulder that never passes the ceiling.
  function limiterCurve(ceiling, knee) {
    const n = 16385;
    const c = new Float32Array(n);
    const room = ceiling - knee;
    for (let i = 0; i < n; i++) {
      const x = ((i / (n - 1)) * 2 - 1) * 2;
      const a = Math.abs(x);
      const y = a <= knee ? a : knee + room * Math.tanh((a - knee) / room);
      c[i] = x < 0 ? -y : y;
    }
    return c;
  }

  function periodic(ctx, n, amp) {
    const real = new Float32Array(n + 1);
    const imag = new Float32Array(n + 1);
    for (let k = 1; k <= n; k++) imag[k] = amp(k);
    return ctx.createPeriodicWave(real, imag);
  }

  // ---------------------------------------------------------------- engine
  function makeEngine(ctx, start, dest, DUR, MIX) {
    const base = ctx.currentTime;
    const E = { ctx, sr: ctx.sampleRate, start, base, DUR, duckTargets: [] };

    // A voice is a note or effect that starts at global time t0 and lasts len seconds (release included).
    // A sustained voice whose compensated start falls before the window resumes mid-envelope on time.
    // A short voice that starts inside the first 6 ms plays whole, up to 6 ms late; one that began
    // earlier is skipped.
    E.w0 = -Infinity;
    E.w1 = Infinity;
    E.voice = function (t0, len, sustain) {
      if (t0 < E.w0 || t0 >= E.w1) return null; // belongs to another scheduling window
      if (t0 >= DUR || t0 + len <= start) return null;
      const c = base + (t0 - start) - LAT;
      let c0 = c;
      let skip = 0;
      if (c < base) {
        if (sustain) skip = base - c;
        else if (t0 >= start) c0 = base;
        else return null;
      }
      return {
        c0,
        skip,
        len,
        env: (param, pts) => setEnv(param, pts, c0, skip),
        osc(node, stopDt) {
          node.start(c0 + skip);
          node.stop(c0 + Math.max(stopDt === undefined ? len : stopDt, skip + 0.002));
          return node;
        },
        buf(node, offset, stopDt) {
          const d = node.buffer.duration;
          let off = (offset || 0) + skip;
          if (node.loop) off %= d;
          else if (off >= d) return node;
          node.start(c0 + skip, off);
          node.stop(c0 + Math.max(stopDt === undefined ? len : stopDt, skip + 0.002));
          return node;
        },
      };
    };

    E.gain = (v) => {
      const g = ctx.createGain();
      g.gain.value = v === undefined ? 1 : v;
      return g;
    };
    E.osc = (type, f) => {
      const o = ctx.createOscillator();
      if (typeof type === 'string') o.type = type;
      else o.setPeriodicWave(type);
      o.frequency.value = f;
      return o;
    };
    E.filt = (type, f, q) => {
      const b = ctx.createBiquadFilter();
      b.type = type;
      b.frequency.value = f;
      b.Q.value = q === undefined ? 0.707 : q;
      return b;
    };
    E.panner = (p) => {
      const s = ctx.createStereoPanner();
      s.pan.value = p;
      return s;
    };
    E.rng = (...k) => lib.rng(lib.hash('film-score', ...k));

    // ---- master: highpass, glue compressor, trim, soft limiter, output fades
    const master = E.gain(1);
    const hp = E.filt('highpass', 26, 0.6);
    const lowShelf = E.filt('lowshelf', 140, 0.7);
    lowShelf.gain.value = MIX.eq.low;
    const presence = E.filt('peaking', 3000, 0.7);
    presence.gain.value = MIX.eq.presence;
    const air = E.filt('highshelf', 8000, 0.7);
    air.gain.value = MIX.eq.air;
    const comp = ctx.createDynamicsCompressor();
    for (const k in MIX.comp) comp[k].value = MIX.comp[k];
    const trim = E.gain(MIX.trim * 0.5);
    const lim = ctx.createWaveShaper();
    lim.curve = limiterCurve(MIX.ceiling, MIX.knee);
    lim.oversample = 'none';
    const out = E.gain(1);
    master.connect(hp);
    hp.connect(lowShelf);
    lowShelf.connect(presence);
    presence.connect(air);
    air.connect(comp);
    comp.connect(trim);
    trim.connect(lim);
    lim.connect(out);
    out.connect(dest);
    E.master = master;
    // Output fades sit after the compressor, so they use uncompensated times. The compressor's
    // first 6 ms are silent; the output then opens over 3 ms, and the last 10 ms taper to zero, so the
    // loop seam and every seek start without a click.
    out.gain.setValueAtTime(0, base);
    out.gain.setValueAtTime(0, base + LAT);
    out.gain.linearRampToValueAtTime(1, base + LAT + 0.003);
    const cEnd = base + (DUR - start);
    if (DUR - start > 0.05) {
      out.gain.setValueAtTime(1, cEnd - 0.01);
      out.gain.linearRampToValueAtTime(0, cEnd);
    }
    // Section rides on the master input, compensated like every other pre-compressor event.
    setEnv(master.gain, MIX.ride.map(([t, d], i) => [t, Math.pow(10, d / 20), i ? 'lin' : undefined]), base - start - LAT, start + LAT);

    // ---- shared buffers
    E.white = noiseBuffer(ctx, 2.5, 1, 'white');
    E.wide = noiseBuffer(ctx, 5, 2, 'wide');
    E.warmSaw = periodic(ctx, 48, (k) => Math.pow(k, -1.35) * (k > 24 ? Math.exp(-(k - 24) / 10) : 1));
    E.softSquare = periodic(ctx, 31, (k) => (k % 2 ? Math.pow(k, -1.5) : 0.04 / k));
    E.brassSaw = periodic(ctx, 40, (k) => Math.pow(k, -1.05));

    // ---- effects returns
    E.fx = {};
    const verb = (name, secs, o, ret) => {
      const c = ctx.createConvolver();
      c.buffer = impulse(ctx, secs, name, o);
      const g = E.gain(ret);
      c.connect(g);
      g.connect(master);
      E.fx[name] = c;
    };
    verb('room', 0.9, { pre: 0.006, bright: 0.55, dark: 0.18, early: 10, spread: 0.035 }, 0.9);
    verb('hall', 2.8, { pre: 0.018, bright: 0.45, dark: 0.09, early: 14, spread: 0.07 }, 0.9);
    verb('cave', 6.0, { pre: 0.03, bright: 0.35, dark: 0.05, early: 18, spread: 0.12 }, 0.85);

    // Ping-pong delay, a dotted 8th (0.375 s) each side.
    const dIn = E.gain(1);
    dIn.channelCount = 1;
    dIn.channelCountMode = 'explicit';
    const dL = ctx.createDelay(1);
    const dR = ctx.createDelay(1);
    dL.delayTime.value = 0.375;
    dR.delayTime.value = 0.375;
    const fL = E.filt('lowpass', 4200, 0.5);
    const fR = E.filt('lowpass', 3400, 0.5);
    const gL = E.gain(0.4);
    const gR = E.gain(0.4);
    dIn.connect(dL);
    dL.connect(fL);
    fL.connect(gL);
    gL.connect(dR);
    dR.connect(fR);
    fR.connect(gR);
    gR.connect(dL);
    const mrg = ctx.createChannelMerger(2);
    fL.connect(mrg, 0, 0);
    fR.connect(mrg, 0, 1);
    const dRet = E.gain(0.75);
    mrg.connect(dRet);
    dRet.connect(master);
    const dVerb = E.gain(0.25);
    dRet.connect(dVerb);
    dVerb.connect(E.fx.hall);
    E.fx.delay = dIn;

    // ---- buses
    E.bus = {};
    // Per-voice sends pass through a tap scaled by the bus gain, so a bus fader moves its reverb too.
    E.tap = {};
    const taps = (name) => {
      E.tap[name] = {};
      for (const k of ['room', 'hall', 'cave', 'delay']) {
        const g = E.gain(MIX.bus[name]);
        g.connect(E.fx[k]);
        E.tap[name][k] = g;
      }
    };
    const bus = (name, sends, duck, hpf) => {
      taps(name);
      const b = E.gain(MIX.bus[name]);
      let tail = b;
      if (hpf) {
        const h = E.filt('highpass', hpf, 0.6);
        tail.connect(h);
        tail = h;
      }
      if (duck) {
        const d = E.gain(1);
        b.connect(d);
        tail = d;
        E.duckTargets.push(d.gain);
      }
      tail.connect(master);
      for (const k in sends) {
        const s = E.gain(sends[k]);
        tail.connect(s);
        s.connect(E.fx[k]);
      }
      E.bus[name] = b;
    };
    // Drum bus: a gentle saturator adds harmonics so the kick reads on phone speakers.
    {
      const b = E.gain(MIX.bus.drums);
      const drive = E.gain(1.6);
      const sat = ctx.createWaveShaper();
      const curve = new Float32Array(2049);
      for (let i = 0; i < curve.length; i++) {
        const x = (i / (curve.length - 1)) * 2 - 1;
        curve[i] = Math.tanh(x * 1.4) / Math.tanh(1.4);
      }
      sat.curve = curve;
      const back = E.gain(0.72);
      b.connect(drive);
      drive.connect(sat);
      sat.connect(back);
      back.connect(master);
      const rs = E.gain(0.1);
      back.connect(rs);
      rs.connect(E.fx.room);
      E.bus.drums = b;
      taps('drums');
    }
    bus('perc', { room: 0.1 });
    bus('bass', {}, true);
    bus('pad', { hall: 0.22 }, true, 180);
    bus('keys', { room: 0.12, hall: 0.14, delay: 0.06 });
    bus('bells', { hall: 0.3, cave: 0.06, delay: 0.14 });
    bus('lead', { hall: 0.22, delay: 0.18 });
    bus('sfx', { room: 0.14 });
    bus('amb', { hall: 0.12 });

    // Route a voice's last node to a bus, with an optional pan and extra sends.
    E.out = (node, busName, o) => {
      o = o || {};
      let n = node;
      if (o.pan) {
        const p = E.panner(o.pan);
        n.connect(p);
        n = p;
      }
      n.connect(E.bus[busName]);
      for (const k of ['room', 'hall', 'cave', 'delay']) {
        if (o[k]) {
          const s = E.gain(o[k]);
          n.connect(s);
          s.connect(E.tap[busName][k]);
        }
      }
      return n;
    };

    // Looping noise source with a per-event deterministic read offset.
    E.noise = (V, key, stereo) => {
      const s = ctx.createBufferSource();
      s.buffer = stereo ? E.wide : E.white;
      s.loop = true;
      const off = ((lib.hash('film-nz', key) % 100003) / 100003) * s.buffer.duration;
      return V.buf(s, off);
    };

    // Sidechain-style pump: a decaying negative curve added to the pad and bass bus gains on a kick.
    const duckLen = 0.32;
    E.duckBuf = ctx.createBuffer(1, Math.floor(duckLen * E.sr), E.sr);
    {
      const d = E.duckBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) {
        const t = i / E.sr;
        d[i] = -(t < 0.006 ? t / 0.006 : Math.exp(-(t - 0.006) / 0.085)) * (i > d.length - 48 ? (d.length - i) / 48 : 1);
      }
    }
    E.duck = (t, depth) => {
      const V = E.voice(t, duckLen, false);
      if (!V) return;
      const s = ctx.createBufferSource();
      s.buffer = E.duckBuf;
      for (const p of E.duckTargets) {
        const g = E.gain(depth);
        s.connect(g);
        g.connect(p);
      }
      V.buf(s, 0);
    };
    return E;
  }

  // ---------------------------------------------------------------- instruments
  function instruments(E) {
    const ctx = E.ctx;
    const I = {};

    // Felt, full, heartbeat or thud kick: a pitch-dropping sine with a short filtered click.
    I.kick = (t, vel, kind) => {
      const P = {
        felt: { f0: 125, f1: 50, fd: 0.055, dec: 0.36, click: 0.18, cf: 1600 },
        full: { f0: 165, f1: 47, fd: 0.065, dec: 0.5, click: 0.3, cf: 4200 },
        heart: { f0: 96, f1: 46, fd: 0.05, dec: 0.3, click: 0.16, cf: 1500 },
        thud: { f0: 95, f1: 52, fd: 0.04, dec: 0.2, click: 0.12, cf: 1200 },
      }[kind || 'felt'];
      const V = E.voice(t, P.dec + 0.03, false);
      if (!V) return;
      const o = E.osc('sine', P.f0);
      V.env(o.frequency, [[0, P.f0], [P.fd, P.f1, 'exp'], [P.dec, P.f1 * 0.92, 'exp']]);
      const g = E.gain(0);
      V.env(g.gain, [[0, 0], [0.002, vel], [0.06, vel * 0.75, 'exp'], [P.dec, FLOOR, 'exp']]);
      o.connect(g);
      E.out(g, 'drums');
      V.osc(o);
      const n = E.noise(V, ['kick', t]);
      const f = E.filt('lowpass', P.cf, 0.7);
      const cg = E.gain(0);
      V.env(cg.gain, perc(vel * P.click, 0.0008, 0.012));
      n.connect(f);
      f.connect(cg);
      E.out(cg, 'drums');
    };

    I.brush = (t, vel, pan) => {
      const V = E.voice(t, 0.26, false);
      if (!V) return;
      const n = E.noise(V, ['brush', t]);
      const f = E.filt('bandpass', 3000, 0.55);
      const g = E.gain(0);
      V.env(g.gain, [[0, 0], [0.004, vel], [0.05, vel * 0.45, 'exp'], [0.24, FLOOR, 'exp']]);
      n.connect(f);
      f.connect(g);
      E.out(g, 'perc', { pan: pan || 0.12 });
      const o = E.osc('sine', 185);
      const og = E.gain(0);
      V.env(og.gain, perc(vel * 0.35, 0.002, 0.06));
      o.connect(og);
      E.out(og, 'drums');
      V.osc(o, 0.1);
    };

    I.hat = (t, vel, open) => {
      const len = open ? 0.22 : 0.055;
      const V = E.voice(t, len + 0.01, false);
      if (!V) return;
      const n = E.noise(V, ['hat', t]);
      const f = E.filt('highpass', 7200, 0.8);
      const f2 = E.filt('peaking', 10500, 1.2);
      f2.gain.value = 5;
      const g = E.gain(0);
      V.env(g.gain, perc(vel, 0.001, len));
      n.connect(f);
      f.connect(f2);
      f2.connect(g);
      E.out(g, 'perc', { pan: -0.25 });
    };

    I.shaker = (t, vel, pan) => {
      const V = E.voice(t, 0.09, false);
      if (!V) return;
      const n = E.noise(V, ['shaker', t]);
      const f = E.filt('bandpass', 6500, 1.1);
      const g = E.gain(0);
      V.env(g.gain, [[0, 0], [0.01, vel], [0.075, FLOOR, 'exp']]);
      n.connect(f);
      f.connect(g);
      E.out(g, 'perc', { pan: pan || 0.3 });
    };

    I.crash = (t, vel, o) => {
      o = o || {};
      const dec = o.dec || 1.55;
      const V = E.voice(t, dec + 0.05, false);
      if (!V) return;
      const n = E.noise(V, ['crash', t], true);
      const f = E.filt('highpass', 4800, 0.6);
      const g = E.gain(0);
      V.env(g.gain, [[0, 0], [0.003, vel], [0.12, vel * 0.45, 'exp'], [dec, FLOOR, 'exp']]);
      n.connect(f);
      f.connect(g);
      E.out(g, 'perc', o);
    };

    // Woodblock tock or small wooden click.
    I.tock = (t, vel, f, o) => {
      o = o || {};
      const V = E.voice(t, 0.1, false);
      if (!V) return;
      const s = E.osc('sine', f * 1.5);
      V.env(s.frequency, [[0, f * 1.5], [0.006, f, 'exp']]);
      const g = E.gain(0);
      V.env(g.gain, perc(vel, 0.001, o.dec || 0.06));
      s.connect(g);
      E.out(g, o.bus || 'perc', o);
      V.osc(s);
      const tri = E.osc('triangle', f * 2.71);
      const tg = E.gain(0);
      V.env(tg.gain, perc(vel * 0.25, 0.001, 0.025));
      tri.connect(tg);
      E.out(tg, o.bus || 'perc', o);
      V.osc(tri, 0.05);
      const n = E.noise(V, ['tock', t, f]);
      const nf = E.filt('bandpass', Math.min(9000, f * 2.4), 2.5);
      const ng = E.gain(0);
      V.env(ng.gain, perc(vel * 0.5, 0.0005, 0.01));
      n.connect(nf);
      nf.connect(ng);
      E.out(ng, o.bus || 'perc', o);
    };

    // FM marimba: soft-mallet FM attack on the fundamental, the tuned 4th partial, a mallet thump.
    I.marimba = (t, f, vel, o) => {
      o = o || {};
      const dec = o.dec || Math.min(2.2, Math.max(0.35, 1.5 * Math.sqrt(220 / f)));
      const V = E.voice(t, dec + 0.05, false);
      if (!V) return;
      const c = E.osc('sine', f);
      const m = E.osc('sine', f);
      const mg = E.gain(0);
      V.env(mg.gain, [[0, f * 1.4], [0.04, f * 0.04, 'exp'], [dec, FLOOR, 'exp']]);
      m.connect(mg);
      mg.connect(c.frequency);
      const g = E.gain(0);
      V.env(g.gain, [[0, 0], [0.003, vel], [dec, FLOOR, 'exp']]);
      c.connect(g);
      E.out(g, o.bus || 'keys', o);
      V.osc(c);
      V.osc(m);
      if (f * 4 < 16000) {
        const p = E.osc('sine', f * 4);
        const pg = E.gain(0);
        V.env(pg.gain, perc(vel * 0.22, 0.002, 0.12));
        p.connect(pg);
        E.out(pg, o.bus || 'keys', o);
        V.osc(p, 0.2);
      }
      const n = E.noise(V, ['mar', t, f]);
      const nf = E.filt('lowpass', 1400, 0.7);
      const ng = E.gain(0);
      V.env(ng.gain, perc(vel * 0.12, 0.001, 0.012));
      n.connect(nf);
      nf.connect(ng);
      E.out(ng, o.bus || 'keys', o);
    };

    // Kalimba: sine tine with a small pitch settle, an inharmonic overtone and a thumb click.
    I.kalimba = (t, f, vel, o) => {
      o = o || {};
      const dec = o.dec || 1.5;
      const V = E.voice(t, dec + 0.05, false);
      if (!V) return;
      const s = E.osc('sine', f);
      V.env(s.frequency, [[0, f * 1.007], [0.03, f, 'exp']]);
      const g = E.gain(0);
      V.env(g.gain, [[0, 0], [0.002, vel], [0.09, vel * 0.55, 'exp'], [dec, FLOOR, 'exp']]);
      s.connect(g);
      E.out(g, o.bus || 'keys', o);
      V.osc(s);
      if (f * 5.93 < 17000) {
        const p = E.osc('sine', f * 5.93);
        const pg = E.gain(0);
        V.env(pg.gain, perc(vel * 0.28, 0.001, 0.07));
        p.connect(pg);
        E.out(pg, o.bus || 'keys', o);
        V.osc(p, 0.12);
      }
      const h = E.osc('sine', f * 2);
      const hg = E.gain(0);
      V.env(hg.gain, perc(vel * 0.1, 0.002, 0.35));
      h.connect(hg);
      E.out(hg, o.bus || 'keys', o);
      V.osc(h, 0.5);
      const n = E.noise(V, ['kal', t, f]);
      const nf = E.filt('bandpass', 3300, 1.8);
      const ng = E.gain(0);
      V.env(ng.gain, perc(vel * 0.3, 0.0005, 0.008));
      n.connect(nf);
      nf.connect(ng);
      E.out(ng, o.bus || 'keys', o);
    };

    // Glockenspiel: free-bar partial ratios, higher partials die first.
    I.glock = (t, f, vel, o) => {
      o = o || {};
      const dec = o.dec || 1.8;
      const V = E.voice(t, dec + 0.05, false);
      if (!V) return;
      const parts = [
        [1, 1, 1],
        [2.756, 0.3, 0.35],
        [5.404, 0.11, 0.14],
        [8.933, 0.05, 0.06],
      ];
      for (const [ratio, a, d] of parts) {
        if (f * ratio > 18000) continue;
        const s = E.osc('sine', f * ratio);
        const g = E.gain(0);
        V.env(g.gain, perc(vel * a, 0.001, dec * d));
        s.connect(g);
        E.out(g, o.bus || 'bells', o);
        V.osc(s, dec * d + 0.02);
      }
    };

    // Glassy sine ping.
    I.glass = (t, f, vel, o) => {
      o = o || {};
      const dec = o.dec || 1.6;
      const V = E.voice(t, dec + 0.05, false);
      if (!V) return;
      const parts = [
        [1, 1, 1],
        [2, 0.12, 0.35],
        [3.01, 0.05, 0.18],
      ];
      for (const [ratio, a, d] of parts) {
        const s = E.osc('sine', f * ratio);
        const g = E.gain(0);
        V.env(g.gain, perc(vel * a, o.att || 0.003, dec * d));
        s.connect(g);
        E.out(g, o.bus || 'bells', o);
        V.osc(s, dec * d + 0.02);
      }
    };

    // FM bell: modulator at an inharmonic or harmonic ratio, index decaying with the note.
    I.fmBell = (t, f, vel, o) => {
      o = o || {};
      const dec = o.dec || 1.6;
      const ratio = o.ratio || 1.4;
      const idx = o.index || 3;
      const V = E.voice(t, dec + 0.05, false);
      if (!V) return;
      const c = E.osc('sine', f);
      const m = E.osc('sine', f * ratio);
      const mg = E.gain(0);
      V.env(mg.gain, [[0, f * idx], [dec * 0.5, f * idx * 0.08, 'exp']]);
      m.connect(mg);
      mg.connect(c.frequency);
      const g = E.gain(0);
      V.env(g.gain, perc(vel, o.att || 0.002, dec));
      c.connect(g);
      E.out(g, o.bus || 'bells', o);
      V.osc(c);
      V.osc(m);
    };

    // Soft FM gong.
    I.gong = (t, f, vel, o) => {
      o = o || {};
      const dec = o.dec || 2.2;
      const V = E.voice(t, dec + 0.05, false);
      if (!V) return;
      const c = E.osc('sine', f);
      const m = E.osc('sine', f * 1.41);
      const mg = E.gain(0);
      V.env(mg.gain, [[0, f * 0.3], [0.09, f * 2.2], [dec, f * 0.15, 'exp']]);
      m.connect(mg);
      mg.connect(c.frequency);
      const lp = E.filt('lowpass', 1900, 0.5);
      const g = E.gain(0);
      V.env(g.gain, [[0, 0], [0.012, vel], [dec, FLOOR, 'exp']]);
      c.connect(lp);
      lp.connect(g);
      E.out(g, o.bus || 'bells', o);
      V.osc(c);
      V.osc(m);
    };

    // Metallic FM ting for the gold dots.
    I.ting = (t, f, vel, o) => I.fmBell(t, f, vel, Object.assign({ ratio: 3.51, index: 1.6, dec: 0.45 }, o || {}));

    // Warm detuned pad: two warm-saw voices per note, spread left and right, one shared lowpass.
    // o: att, rel, cut0, cut1 (cutoff at the start and at t1), q, sine (hushed sine pad), bus, sends
    I.pad = (t0, t1, notes, vel, o) => {
      o = o || {};
      const att = Math.min(o.att === undefined ? 0.25 : o.att, t1 - t0);
      const rel = o.rel === undefined ? 0.35 : o.rel;
      const hold = t1 - t0;
      const len = hold + rel;
      const V = E.voice(t0, len, true);
      if (!V) return;
      const lp = E.filt('lowpass', o.cut0 || 1200, o.q || 0.6);
      V.env(lp.frequency, [[0, o.cut0 || 1200], [hold, o.cut1 || o.cut0 || 1200, 'exp'], [len, (o.cut1 || o.cut0 || 1200) * 0.7, 'exp']]);
      const g = E.gain(0);
      const pts = [[0, 0], [att, vel, o.attShape || 'lin']];
      if (hold > att) pts.push([hold, vel * (o.sus === undefined ? 1 : o.sus), 'lin']);
      pts.push([len, 0, 'lin']);
      V.env(g.gain, pts);
      lp.connect(g);
      E.out(g, o.bus || 'pad', o);
      const per = 1 / Math.sqrt(notes.length * 2);
      notes.forEach((nm, i) => {
        const f = hz(nm);
        const sides = o.sine ? [0] : [-1, 1];
        for (const side of sides) {
          const s = E.osc(o.sine ? 'sine' : E.warmSaw, f);
          s.detune.value = side * (o.detune || 8) + (i % 2 ? 1.5 : -1.5);
          const sg = E.gain(per * (o.sine ? 1.4 : 1));
          const p = E.panner(side * (o.width === undefined ? 0.55 : o.width) * (i % 2 ? 0.8 : 1));
          s.connect(sg);
          sg.connect(p);
          p.connect(lp);
          V.osc(s);
        }
      });
    };

    // Sub bass: sine with a little 2nd and 3rd harmonic so it survives small speakers.
    I.sub = (t0, t1, note, vel, o) => {
      o = o || {};
      const att = Math.min(o.att === undefined ? 0.008 : o.att, t1 - t0);
      const rel = o.rel === undefined ? 0.06 : o.rel;
      const hold = t1 - t0;
      const len = hold + rel;
      const V = E.voice(t0, len, true);
      if (!V) return;
      const f = hz(note);
      const g = E.gain(0);
      const pts = [[0, 0], [att, vel, o.attShape || 'lin']];
      if (hold > att) pts.push([hold, vel * (o.sus === undefined ? 0.85 : o.sus), 'lin']);
      pts.push([len, 0, 'lin']);
      V.env(g.gain, pts);
      const lp = E.filt('lowpass', 420, 0.5);
      for (const [k, a] of [
        [1, 1],
        [2, 0.3],
        [3, 0.1],
      ]) {
        const s = E.osc('sine', f * k);
        const sg = E.gain(a);
        s.connect(sg);
        sg.connect(lp);
        V.osc(s);
      }
      lp.connect(g);
      E.out(g, 'bass');
    };

    // Sub drop: a sine sweeping down under a hit.
    I.subDrop = (t, f0, f1, len, vel) => {
      const V = E.voice(t, len + 0.02, false);
      if (!V) return;
      const s = E.osc('sine', f0);
      V.env(s.frequency, [[0, f0], [len, f1, 'exp']]);
      const g = E.gain(0);
      V.env(g.gain, [[0, 0], [0.004, vel], [len * 0.5, vel * 0.7, 'lin'], [len, FLOOR, 'exp']]);
      s.connect(g);
      E.out(g, 'bass');
      V.osc(s);
    };

    // Warm pluck: warm saw plus soft square an octave up, a fast lowpass sweep.
    I.pluck = (t, note, vel, o) => {
      o = o || {};
      const f = hz(note);
      const dec = o.dec || 0.8;
      const V = E.voice(t, dec + 0.05, false);
      if (!V) return;
      const lp = E.filt('lowpass', 2000, o.q || 1.2);
      const top = Math.min(11000, f * (o.bright || 9));
      V.env(lp.frequency, [[0, top], [0.16, Math.max(180, f * 1.8), 'exp'], [dec, Math.max(150, f * 1.2), 'exp']]);
      const g = E.gain(0);
      V.env(g.gain, [[0, 0], [0.003, vel], [0.14, vel * 0.45, 'exp'], [dec, FLOOR, 'exp']]);
      const a = E.osc(E.warmSaw, f);
      a.detune.value = -5;
      const b = E.osc(E.softSquare, f * 2);
      b.detune.value = 6;
      const bg = E.gain(0.35);
      a.connect(lp);
      b.connect(bg);
      bg.connect(lp);
      lp.connect(g);
      E.out(g, o.bus || 'keys', o);
      V.osc(a);
      V.osc(b);
    };

    // FM boop with an upward bend (the molts).
    I.boop = (t, note, vel, o) => {
      o = o || {};
      const f = hz(note);
      const V = E.voice(t, 0.32, false);
      if (!V) return;
      const c = E.osc('sine', f * 0.8);
      V.env(c.frequency, [[0, f * 0.8], [0.06, f, 'exp']]);
      const m = E.osc('sine', f * 1.6);
      V.env(m.frequency, [[0, f * 1.6], [0.06, f * 2, 'exp']]);
      const mg = E.gain(0);
      V.env(mg.gain, [[0, f * 2.2], [0.14, f * 0.2, 'exp']]);
      m.connect(mg);
      mg.connect(c.frequency);
      const g = E.gain(0);
      V.env(g.gain, [[0, 0], [0.004, vel], [0.08, vel * 0.6, 'exp'], [0.3, FLOOR, 'exp']]);
      c.connect(g);
      E.out(g, 'keys', Object.assign({ room: 0.2 }, o));
      V.osc(c);
      V.osc(m);
    };

    // Detuned, band-passed saw stab.
    I.stab = (t, notes, vel, o) => {
      o = o || {};
      const len = o.len || 0.22;
      const V = E.voice(t, len + 0.02, false);
      if (!V) return;
      const bp = E.filt('bandpass', o.f || 1500, 1.4);
      const g = E.gain(0);
      V.env(g.gain, [[0, 0], [0.003, vel], [len, FLOOR, 'exp']]);
      bp.connect(g);
      E.out(g, 'keys', o);
      for (const nm of notes) {
        for (const d of [-14, 14]) {
          const s = E.osc('sawtooth', hz(nm));
          s.detune.value = d;
          const sg = E.gain(0.5 / notes.length);
          s.connect(sg);
          sg.connect(bp);
          V.osc(s);
        }
      }
    };

    // Continuous FM lead with glides and delayed vibrato. phrase: [[t, note, glide]]
    I.lead = (phrase, tEnd, vel, o) => {
      o = o || {};
      const t0 = phrase[0][0];
      const rel = o.rel || 0.3;
      const len = tEnd - t0 + rel;
      const V = E.voice(t0, len, true);
      if (!V) return;
      const pitch = ctx.createConstantSource();
      const pp = [[0, hz(phrase[0][1])]];
      const vib = [[0, 0]];
      for (let i = 1; i < phrase.length; i++) {
        const dt = phrase[i][0] - t0;
        const gl = Math.max(0.005, phrase[i][2] || 0);
        pp.push([dt, hz(phrase[i - 1][1]), 'set']);
        pp.push([dt + gl, hz(phrase[i][1]), 'exp']);
      }
      for (let i = 0; i < phrase.length; i++) {
        const a = phrase[i][0] - t0;
        const b = (i + 1 < phrase.length ? phrase[i + 1][0] : tEnd + rel) - t0;
        const f = hz(phrase[i][1]);
        vib.push([a, 0, 'set']);
        if (b - a > 0.35) {
          vib.push([a + 0.18, 0, 'set']);
          vib.push([Math.min(b, a + 0.45), f * 0.008, 'lin']);
          vib.push([b, f * 0.008, 'lin']);
        }
      }
      V.env(pitch.offset, pp);
      const c = E.osc('sine', 0);
      const m = E.osc('sine', 0);
      const sub = E.osc('triangle', 0);
      pitch.connect(c.frequency);
      const mr = E.gain(1);
      pitch.connect(mr);
      mr.connect(m.frequency);
      const sr = E.gain(0.5);
      pitch.connect(sr);
      sr.connect(sub.frequency);
      const mg = E.gain(hz(phrase[0][1]) * 0.9);
      m.connect(mg);
      mg.connect(c.frequency);
      const lfo = E.osc('sine', 5.3);
      const vg = E.gain(0);
      V.env(vg.gain, vib);
      lfo.connect(vg);
      vg.connect(c.frequency);
      const lp = E.filt('lowpass', 3200, 0.8);
      const g = E.gain(0);
      V.env(g.gain, [[0, 0], [0.012, vel], [tEnd - t0, vel * 0.9, 'lin'], [len, 0, 'lin']]);
      const sg = E.gain(0.35);
      c.connect(lp);
      sub.connect(sg);
      sg.connect(lp);
      lp.connect(g);
      E.out(g, 'lead', o);
      V.osc(pitch);
      V.osc(c);
      V.osc(m);
      V.osc(sub);
      V.osc(lfo);
    };

    // Synth horn: two brass saws with a filter swell per note and a scoop into pitch.
    I.horn = (phrase, tEnd, vel, o) => {
      o = o || {};
      const t0 = phrase[0][0];
      const rel = 0.25;
      const len = tEnd - t0 + rel;
      const V = E.voice(t0, len, true);
      if (!V) return;
      const pitch = ctx.createConstantSource();
      const pp = [];
      const cut = [];
      phrase.forEach(([t, nm], i) => {
        const dt = t - t0;
        const f = hz(nm);
        if (i === 0) pp.push([0, f * 0.97]);
        else pp.push([dt, f * 0.97, 'set']);
        pp.push([dt + 0.07, f, 'exp']);
        cut.push([dt, 300, i === 0 ? 'lin' : 'set']);
        cut.push([dt + 0.16, 2400, 'exp']);
        cut.push([dt + 0.45, 1500, 'exp']);
      });
      cut[0] = [0, 300];
      V.env(pitch.offset, pp);
      const lp = E.filt('lowpass', 300, 1.1);
      V.env(lp.frequency, cut);
      const g = E.gain(0);
      V.env(g.gain, [[0, 0], [0.06, vel], [tEnd - t0, vel, 'lin'], [len, 0, 'lin']]);
      for (const d of [-7, 7]) {
        const s = E.osc(E.brassSaw, 0);
        s.detune.value = d;
        pitch.connect(s.frequency);
        const sg = E.gain(0.5);
        s.connect(sg);
        sg.connect(lp);
        V.osc(s);
      }
      lp.connect(g);
      E.out(g, 'lead', o);
      V.osc(pitch);
    };

    // Generic filtered noise: whooshes, sweeps, cracks, risers.
    // o: { type, f: env pts, q, amp: env pts, pan, panEnv, bus, sustain, stereo, sends }
    I.nz = (t, len, o) => {
      const V = E.voice(t, len, !!o.sustain);
      if (!V) return;
      const n = E.noise(V, ['nz', t, len, o.key || ''], !!o.stereo);
      const f = E.filt(o.type || 'bandpass', o.f[0][1], o.q || 0.8);
      V.env(f.frequency, o.f);
      const g = E.gain(0);
      V.env(g.gain, o.amp);
      n.connect(f);
      let last = f;
      if (o.type2) {
        const f2 = E.filt(o.type2, o.f2, o.q2 || 0.7);
        f.connect(f2);
        last = f2;
      }
      last.connect(g);
      let node = g;
      if (o.panEnv) {
        const p = E.panner(0);
        V.env(p.pan, o.panEnv);
        g.connect(p);
        node = p;
      }
      E.out(node, o.bus || 'sfx', o);
    };

    // A generated buffer played through an optional filter. make() builds the buffer only when the
    // voice is actually scheduled; secs must match its length.
    I.play = (t, secs, make, vel, o) => {
      o = o || {};
      const V = E.voice(t, secs + 0.01, o.sustain !== false);
      if (!V) return;
      const s = ctx.createBufferSource();
      s.buffer = make();
      let last = s;
      if (o.filt) {
        const f = E.filt(o.filt[0], o.filt[1], o.filt[2]);
        s.connect(f);
        last = f;
      }
      const g = E.gain(vel);
      last.connect(g);
      E.out(g, o.bus || 'sfx', o);
      V.buf(s, 0);
    };

    // Wing flutter: band-passed noise sweeping f0 to f1 with a flap on each listed offset.
    I.flutter = (t, len, flaps, o) => {
      const amp = [[0, 0]];
      const fl = o.floor || 0.08;
      flaps.forEach((dt, i) => {
        const pk = o.vel * (o.grow ? 0.6 + (0.4 * i) / Math.max(1, flaps.length - 1) : 1);
        amp.push([dt, amp.length > 1 ? o.vel * fl : 0, 'lin']);
        amp.push([dt + 0.008, pk, 'lin']);
        amp.push([dt + 0.06, o.vel * fl, 'exp']);
      });
      amp.push([len, FLOOR, 'exp']);
      I.nz(t, len, {
        type: 'bandpass',
        q: 1.1,
        f: [[0, o.f0], [len, o.f1, 'exp']],
        amp,
        panEnv: o.pan ? [[0, -o.pan], [len, o.pan, 'lin']] : null,
        bus: 'sfx',
        room: 0.25,
        key: 'flutter',
      });
    };

    I.chew = (t, vel, pan) =>
      I.nz(t, 0.02, { type: 'highpass', q: 0.7, f: [[0, 4200]], amp: perc(vel, 0.0008, 0.012), pan, key: 'chew' });

    I.plip = (t, f0, f1, vel, o) => {
      o = o || {};
      const V = E.voice(t, 0.14, false);
      if (!V) return;
      for (const [k, a] of [
        [1, 1],
        [2, 0.25],
      ]) {
        const s = E.osc('sine', f0 * k);
        V.env(s.frequency, [[0, f0 * k], [0.05, f1 * k, 'exp']]);
        const g = E.gain(0);
        V.env(g.gain, [[0, 0], [0.002, vel * a], [0.02, vel * a * 0.6, 'exp'], [0.12, FLOOR, 'exp']]);
        s.connect(g);
        E.out(g, 'sfx', Object.assign({ room: 0.2 }, o));
        V.osc(s);
      }
    };

    I.glide = (t, f0, f1, len, vel, o) => {
      o = o || {};
      const V = E.voice(t, len + 0.3, false);
      if (!V) return;
      const s = E.osc('sine', f0);
      V.env(s.frequency, [[0, f0], [len, f1, 'exp']]);
      const g = E.gain(0);
      V.env(g.gain, [[0, 0], [0.003, vel], [len, vel * 0.5, 'exp'], [len + 0.28, FLOOR, 'exp']]);
      s.connect(g);
      E.out(g, o.bus || 'sfx', o);
      V.osc(s);
    };

    // Low whump for the wing pumps: a rising sine body plus a soft rising noise sweep.
    I.whump = (t, vel) => {
      const V = E.voice(t, 0.42, false);
      if (!V) return;
      const s = E.osc('sine', 55);
      V.env(s.frequency, [[0, 55], [0.14, 88, 'exp'], [0.4, 80, 'lin']]);
      const g = E.gain(0);
      V.env(g.gain, [[0, 0], [0.006, vel], [0.12, vel * 0.7, 'exp'], [0.4, FLOOR, 'exp']]);
      s.connect(g);
      E.out(g, 'bass');
      V.osc(s);
      const h = E.osc('triangle', 110);
      V.env(h.frequency, [[0, 110], [0.14, 176, 'exp']]);
      const hg = E.gain(0);
      V.env(hg.gain, perc(vel * 0.25, 0.005, 0.18));
      h.connect(hg);
      E.out(hg, 'sfx');
      V.osc(h, 0.25);
      I.nz(t, 0.3, {
        type: 'bandpass',
        q: 1.5,
        f: [[0, 220], [0.26, 1500, 'exp']],
        amp: [[0, 0], [0.02, vel * 0.08], [0.2, vel * 0.18, 'lin'], [0.3, FLOOR, 'exp']],
        key: 'whump',
      });
    };

    I.whistle = (t, len, f0, f1, vel) => {
      const V = E.voice(t, len + 0.05, false);
      if (!V) return;
      const s = E.osc('sine', f0);
      V.env(s.frequency, [[0, f0], [len, f1, 'exp']]);
      const g = E.gain(0);
      V.env(g.gain, [[0, 0], [0.015, vel], [len, FLOOR, 'exp']]);
      s.connect(g);
      E.out(g, 'sfx', { hall: 0.15 });
      V.osc(s);
    };

    I.bleep = (t, f, vel) => {
      const V = E.voice(t, 0.07, false);
      if (!V) return;
      const s = E.osc('sine', f);
      const lp = E.filt('lowpass', 6500, 0.7);
      const g = E.gain(0);
      V.env(g.gain, [[0, 0], [0.002, vel], [0.062, FLOOR, 'exp']]);
      s.connect(lp);
      lp.connect(g);
      E.out(g, 'sfx', { room: 0.15 });
      V.osc(s);
    };

    // Striated buzz: a rising saw, chopped at 30 Hz, through a feedback comb.
    I.buzz = (t, len, vel) => {
      const V = E.voice(t, len + 0.05, false);
      if (!V) return;
      const s = E.osc('sawtooth', 98);
      V.env(s.frequency, [[0, 98], [len, 196, 'exp']]);
      const chop = E.gain(0.5);
      const lfo = E.osc('square', 30);
      const lg = E.gain(0.45);
      lfo.connect(lg);
      lg.connect(chop.gain);
      const d = ctx.createDelay(0.05);
      d.delayTime.value = 0.0034;
      const fb = E.gain(0.55);
      const bp = E.filt('bandpass', 1300, 0.8);
      const g = E.gain(0);
      V.env(g.gain, [[0, 0], [0.04, vel * 0.5], [len * 0.85, vel, 'lin'], [len, FLOOR, 'exp']]);
      s.connect(chop);
      chop.connect(bp);
      chop.connect(d);
      d.connect(fb);
      fb.connect(d);
      d.connect(bp);
      bp.connect(g);
      E.out(g, 'sfx', { hall: 0.25 });
      V.osc(s);
      V.osc(lfo);
    };

    // Reverse swell: noise rising exponentially into a hard stop at t + len.
    I.revSwell = (t, len, vel, o) => {
      o = o || {};
      const hi = o.hi || false;
      I.nz(t, len, {
        type: hi ? 'highpass' : 'lowpass',
        q: 0.7,
        f: hi ? [[0, 9000], [len, 3500, 'exp']] : [[0, 400], [len, o.fTop || 3500, 'exp']],
        type2: hi ? 'peaking' : null,
        f2: 9500,
        amp: [[0, vel * 0.004], [len - 0.012, vel, 'exp'], [len, FLOOR, 'lin']],
        stereo: true,
        sustain: true,
        bus: o.bus || 'sfx',
        hall: o.hall || 0.2,
        key: 'rev',
      });
    };

    // Stereo wind bed: wide noise through a slowly wandering band-pass. amp: env pts.
    I.wind = (t0, t1, amp, o) => {
      o = o || {};
      const len = t1 - t0;
      const f = [[0, 700]];
      for (let k = 1; k * 0.25 < len; k++) f.push([k * 0.25, 650 + 380 * lib.noise1(k * 0.23 + t0, 'film-wind'), 'lin']);
      I.nz(t0, len, { type: 'bandpass', q: 0.45, f, type2: 'lowpass', f2: o.lp || 2600, amp, stereo: true, sustain: true, bus: 'amb', key: 'wind' });
    };

    return I;
  }

  // ---------------------------------------------------------------- grain textures
  function flapGrains(r, t0, len, rate, o) {
    const out = [];
    const n = Math.floor(len * rate);
    for (let i = 0; i < n; i++) {
      const t = t0 + r() * len;
      out.push({
        t,
        dur: 0.05 + r() * 0.05,
        amp: (o.amp || 0.3) * (0.4 + 0.6 * r()),
        pan: (r() * 2 - 1) * (o.width || 0.9),
        f: (o.f0 || 380) + r() * (o.f1 || 1200),
        q: 0.9,
        att: 0.008 + r() * 0.008,
        dec: 0.02 + r() * 0.02,
      });
    }
    return out;
  }
  function clickGrains(r, t0, len, count, o) {
    const out = [];
    for (let i = 0; i < count; i++) {
      const u = o.shape ? Math.pow(r(), o.shape) : r();
      out.push({
        t: t0 + u * len,
        dur: 0.008,
        amp: (o.amp || 0.3) * (0.3 + 0.7 * r()),
        pan: (r() * 2 - 1) * (o.width || 0.9),
        f: (o.f0 || 3000) + r() * (o.f1 || 5000),
        q: o.q || 1.2,
        att: 0.0004,
        dec: o.dec || 0.0015,
      });
    }
    return out;
  }

  // ---------------------------------------------------------------- the score
  // E major, add9 colour, 120 bpm, 16 bars. Every time below is a cue from FILM.TIMELINE.cues.
  const CH = {
    Eadd9: ['E3', 'B3', 'F#4', 'G#4'],
    E: ['E3', 'B3', 'E4', 'G#4'],
    Ehi: ['E3', 'B3', 'E4', 'G#4', 'B4'],
    EG: ['G#3', 'B3', 'E4', 'G#4'],
    Amaj9: ['A3', 'C#4', 'G#4', 'B4'],
    Amaj7: ['A3', 'C#4', 'E4', 'G#4'],
    A: ['A3', 'C#4', 'E4', 'B4'],
    A69: ['A3', 'E4', 'B4', 'F#5'],
    Cm7: ['C#3', 'G#3', 'B3', 'E4'],
    Cm9: ['C#4', 'E4', 'G#4', 'D#5'],
    Fm7: ['F#3', 'A3', 'C#4', 'E4'],
    B: ['B3', 'D#4', 'F#4', 'B4'],
    BD: ['D#4', 'F#4', 'B4'],
    Bsus4: ['B3', 'E4', 'F#4', 'B4'],
    B7sus4: ['B3', 'E4', 'F#4', 'A4'],
    B7: ['B3', 'D#4', 'F#4', 'A4'],
  };

  function score(E, I) {
    const ctx = E.ctx;
    const { kick, brush, hat, shaker, crash, tock, marimba, kalimba, glock, glass, fmBell, gong, ting, pad, sub, subDrop, pluck, boop, stab, horn, nz, play, flutter, chew, plip, glide, whump, revSwell, wind } = I;
    const range = (a, b, step) => {
      const out = [];
      for (let t = a; t < b - 1e-9; t += step) out.push(Math.round(t * 10000) / 10000);
      return out;
    };
    const G = (key, secs, grains) => grainBuffer(ctx, key, secs, grains);
    const R = (key) => lib.rng(lib.hash('tern-tex', key));

    // Tern calls. 'keear': a harsh two-part whistle, a short rising "kee" then a long "ar" gliding
    // 2.8 to 2.2 kHz, rasped by a sawtooth ring modulation and breath noise. 'kip': a short high chirp.
    // o: { len, scale (pitch, one bird to the next), pan, hall, room }
    const call = (t, kind, vel, o) => {
      o = o || {};
      const k = o.scale || 1;
      let len, f, a, rasp;
      if (kind === 'kip') {
        len = 0.075;
        f = [[0, 3300], [0.022, 3950, 'exp'], [len, 3450, 'exp']];
        a = [[0, 0], [0.004, 1], [0.03, 0.55, 'exp'], [len, FLOOR, 'exp']];
        rasp = [[0, 0.2]];
      } else {
        len = o.len || 0.36;
        f = [[0, 2550], [0.04, 3000, 'exp'], [0.085, 2950, 'lin'], [0.11, 2800, 'exp'], [len, 2200, 'exp']];
        a = [[0, 0], [0.006, 0.85], [0.07, 0.7, 'lin'], [0.092, 0.25, 'exp'], [0.12, 1, 'lin'], [len * 0.65 + 0.04, 0.65, 'lin'], [len, FLOOR, 'exp']];
        rasp = [[0, 0.12], [0.1, 0.12, 'lin'], [0.13, 0.6, 'lin'], [len, 0.45, 'lin']];
      }
      f = f.map(([dt, v, s]) => [dt, v * k, s]);
      const V = E.voice(t, len + 0.02, false);
      if (!V) return;
      const am = E.gain(1);
      const lfo = E.osc('sawtooth', 165 * k);
      const lg = E.gain(0);
      V.env(lg.gain, rasp);
      lfo.connect(lg);
      lg.connect(am.gain);
      const s1 = E.osc('triangle', f[0][1]);
      V.env(s1.frequency, f);
      const s2 = E.osc('sine', f[0][1] * 2);
      V.env(s2.frequency, f.map(([dt, v, s]) => [dt, v * 2, s]));
      const g2 = E.gain(0.12);
      s1.connect(am);
      s2.connect(g2);
      g2.connect(am);
      const lp = E.filt('lowpass', 7000, 0.7);
      const g = E.gain(0);
      V.env(g.gain, a.map(([dt, v, s]) => [dt, v * vel, s]));
      am.connect(lp);
      lp.connect(g);
      const sends = { pan: o.pan, hall: o.hall === undefined ? 0.15 : o.hall, room: o.room || 0.1 };
      E.out(g, 'sfx', sends);
      const n = E.noise(V, ['call', t, kind]);
      const bp = E.filt('bandpass', f[0][1], 3.5);
      V.env(bp.frequency, f);
      const ng = E.gain(0);
      V.env(ng.gain, a.map(([dt, v, s]) => [dt, v * vel * 0.35, s]));
      n.connect(bp);
      bp.connect(ng);
      E.out(ng, 'sfx', sends);
      V.osc(s1);
      V.osc(s2);
      V.osc(lfo);
    };

    // Cold high pad for the ice: sine voices under a slow tremolo. The tremolo is gain automation
    // rather than an LFO, so a seek lands on the same phase as a full render.
    const coldPad = (t0, t1, notes, vel, o) => {
      o = o || {};
      const rel = 0.3;
      const len = t1 - t0 + rel;
      const V = E.voice(t0, len, true);
      if (!V) return;
      const g = E.gain(0);
      V.env(g.gain, [[0, 0], [o.att || 0.08, vel], [t1 - t0, vel * 0.85, 'lin'], [len, 0, 'lin']]);
      const trem = E.gain(1);
      const rate = o.rate || 3.3;
      const tp = [];
      for (let dt = 0; dt <= len + 1e-9; dt += 0.02) tp.push([dt, 0.72 + 0.28 * Math.sin(TAU * rate * dt), dt ? 'lin' : undefined]);
      V.env(trem.gain, tp);
      notes.forEach((nm, i) => {
        const s = E.osc('sine', hz(nm));
        s.detune.value = i % 2 ? 5 : -5;
        const sg = E.gain(1 / Math.sqrt(notes.length));
        const p = E.panner(((i / Math.max(1, notes.length - 1)) * 2 - 1) * 0.5);
        s.connect(sg);
        sg.connect(p);
        p.connect(trem);
        V.osc(s);
      });
      trem.connect(g);
      E.out(g, 'pad', { hall: 0.4, cave: 0.1 });
    };

    // Kip chatter: n calls scattered over [t0, t1), kept clear of the 8th grid so the cue hits stay sharp.
    const chatter = (key, t0, t1, n, vel, o) => {
      const r = R(key);
      for (let i = 0; i < n; i++) {
        let t = t0 + r() * (t1 - t0);
        const g = (t / 0.125) % 1;
        if (g < 0.35) t += 0.045;
        if (g > 0.65) t -= 0.045;
        call(Math.round(t * 1000) / 1000, 'kip', vel * (0.5 + 0.5 * r()), { scale: 0.92 + r() * 0.16, pan: (r() * 2 - 1) * (o.width || 0.7), hall: o.hall || 0.25 });
      }
    };

    // =========================================================== ACT 1: tender, plucked
    // ---- bar 1 (0.0-2.0) the tern hovers with a fish
    kick(0, 0.75, 'felt');
    ['E3', 'B3', 'F#4', 'G#4', 'E5'].forEach((n, i) => marimba(0, hz(n), 0.3 - i * 0.02, { room: 0.2, hall: 0.12 }));
    sub(0, 1.5, 'E2', 0.5, { att: 0.004, rel: 0.05 });
    pad(0, 1.5, CH.Eadd9, 0.42, { att: 0.004, rel: 0.06, cut0: 1100, cut1: 1500 });
    // 0.083 the wings rise in three drawings, then snap down on the beat
    flutter(0.083, 0.417, [0, 0.084, 0.167], { vel: 0.3, f0: 900, f1: 2800, grow: true, floor: 0.2, pan: 0.2 });
    [0.083, 0.167, 0.25].forEach((t, i) => nz(t, 0.03, { type: 'bandpass', q: 1.1, f: [[0, 2600 + i * 400]], amp: perc(0.16 + i * 0.03, 0.0008, 0.02), pan: -0.2 + i * 0.2, key: 'wingsnap' }));
    kick(0.5, 0.8, 'full');
    E.duck(0.5, 0.35);
    subDrop(0.5, 124, 41, 0.45, 0.5);
    nz(0.5, 0.4, { type: 'bandpass', q: 0.9, f: [[0, 2800], [0.32, 320, 'exp']], amp: [[0, 0], [0.004, 0.55], [0.08, 0.25, 'exp'], [0.4, FLOOR, 'exp']], room: 0.3, stereo: true, key: 'slam' });
    [['E5', 0.5], ['G#5', 0.75], ['B5', 1.0], ['F#5', 1.25]].forEach(([n, t], i) => kalimba(t, hz(n), 0.5 - i * 0.03, { hall: 0.18, delay: 0.14, pan: i % 2 ? 0.15 : -0.15 }));
    call(0.52, 'keear', 0.2, { pan: 0.3, hall: 0.2 });
    flutter(1.0, 0.2, [0, 0.083], { vel: 0.18, f0: 900, f1: 1900, floor: 0.1 });
    tock(1.0, 0.2, 1700, { pan: 0.3 });
    [0.75, 1.25].forEach((t) => hat(t, 0.12));
    // 1.5 everything drops out: the spark
    glass(1.5, hz('E6'), 0.42, { cave: 0.55, hall: 0.2, dec: 2.2 });

    // ---- bar 2 (2.0-4.0) the blueprint egg, the nucleus divides
    revSwell(2.0, 0.5, 0.16, { fTop: 2600, hall: 0.3 });
    glide(2.0, 3000, 1200, 0.25, 0.2, { hall: 0.35, pan: -0.15 });
    glass(2.0, hz('E7'), 0.12, { dec: 0.5, hall: 0.3 });
    pad(2.0, 4.0, CH.Amaj9, 0.3, { att: 0.6, rel: 0.12, cut0: 500, cut1: 1300, hall: 0.2 });
    sub(2.5, 4.0, 'A1', 0.22, { att: 0.5, rel: 0.1 });
    ['E5', 'F#5', 'G#5', 'B5'].forEach((n, i) => glock(2.5 + i * 0.125, hz(n), 0.34 + i * 0.02, { dec: 1.2, pan: i % 2 ? 0.35 : -0.35 }));
    glass(3.0, hz('B5'), 0.26, { dec: 1.2, att: 0.001, pan: -0.25, hall: 0.2 });
    glass(3.0, hz('E6'), 0.22, { dec: 1.2, att: 0.001, pan: 0.25, hall: 0.2 });
    ['G#5', 'B5', 'E6', 'F#6'].forEach((n, i) => glass(3.25 + i * 0.0625, hz(n), i ? 0.18 : 0.26, { dec: 0.8, att: 0.001, pan: [-0.5, 0.5, -0.2, 0.2][i] }));
    ['B5', 'C#6', 'E6', 'F#6', 'G#6', 'B6', 'C#7', 'E7'].forEach((n, i) => glass(3.5 + i * 0.0625, hz(n), i ? 0.15 - i * 0.012 : 0.22, { dec: 0.6, att: 0.001, pan: Math.sin(i * 1.9) * 0.7, delay: 0.1 }));
    [3.75, 3.7917, 3.8333].forEach((t, i) => nz(t, 0.012, { type: 'highpass', q: 0.8, f: [[0, 5200]], amp: perc(0.5 - i * 0.08, 0.0005, 0.006), pan: [-0.4, 0.4, 0][i], hall: 0.25, key: 'crackle' }));

    // ---- bar 3 (4.0-5.5) pipping on the shingle
    tock(4.0, 0.55, 1050);
    CH.Cm7.forEach((n, i) => pluck(4.0 + i * 0.012, n, 0.26, { dec: 1.1, hall: 0.2, pan: i % 2 ? 0.2 : -0.2 }));
    sub(4.0, 5.0, 'C#2', 0.42);
    sub(5.0, 5.5, 'B1', 0.42);
    pad(4.0, 5.0, CH.Cm7, 0.3, { att: 0.05, rel: 0.1, cut0: 900, cut1: 1100 });
    pad(5.0, 5.5, CH.B7sus4, 0.3, { att: 0.03, rel: 0.1, cut0: 1100 });
    marimba(4.0, hz('C#3'), 0.28);
    marimba(4.75, hz('G#3'), 0.18);
    marimba(5.0, hz('B2'), 0.26);
    marimba(5.375, hz('F#3'), 0.16);
    chew(4.25, 0.2, 0.2);
    // 4.5 the ring crack: crack, pitched pop on B4, fragments, then a lowpassed whoosh across the pull-back
    nz(4.5, 0.05, { type: 'bandpass', q: 1.3, f: [[0, 2400]], amp: perc(0.75, 0.0005, 0.03), room: 0.3, key: 'crack' });
    nz(4.5, 0.01, { type: 'highpass', q: 0.7, f: [[0, 6000]], amp: perc(0.5, 0.0003, 0.004), key: 'crack2' });
    plip(4.5, hz('B5'), hz('B4'), 0.3);
    [4.583, 4.667, 4.75].forEach((t, i) => chew(t, 0.1 - i * 0.02, [-0.5, 0.5, 0][i]));
    nz(4.52, 0.8, { type: 'lowpass', q: 0.6, f: [[0, 250], [0.45, 2600, 'exp'], [0.8, 1400, 'exp']], amp: [[0, 0], [0.35, 0.12, 'lin'], [0.8, FLOOR, 'exp']], stereo: true, panEnv: [[0, -0.3], [0.8, 0.4, 'lin']], key: 'pullback' });
    // 5.0 the cap tips over: a hollow clack on E5 and a pebble rattle
    tock(5.0, 0.42, hz('E5'), { bus: 'sfx', dec: 0.11, room: 0.25 });
    nz(5.0, 0.06, { type: 'bandpass', q: 9, f: [[0, hz('E5') * 2]], amp: perc(0.16, 0.0006, 0.04), key: 'hollow' });
    play(5.02, 0.24, () => G('rattle', 0.24, clickGrains(R('rattle'), 0, 0.2, 14, { amp: 0.28, f0: 1400, f1: 2400, shape: 1.8, dec: 0.004 })), 0.7, { sustain: false });
    // 5.25 the chick's first peep
    plip(5.25, 3500, 4000, 0.22, { pan: -0.1 });

    // ---- bar 4 (5.5-8.0) four fish, four days
    [5.5, 5.625, 5.75, 5.875].forEach((t, i) => plip(t, 3500 + i * 60, 4100, 0.17 - i * 0.015, { pan: i % 2 ? 0.45 : -0.45 }));
    [5.5, 5.75].forEach((t, i) => shaker(t, 0.14 - i * 0.03, 0.3));
    marimba(5.5, hz('B2'), 0.2);
    const feeds = [
      [6.0, 'E4', 'A', 'A1'],
      [6.5, 'G#4', 'Amaj7', 'A1'],
      [7.0, 'B4', 'B', 'B1'],
      [7.5, 'E5', 'Bsus4', 'B1'],
    ];
    feeds.forEach(([t, note, chord], i) => {
      whump(t, 0.3 + i * 0.03);
      play(t, 0.14, () => G('crunch' + t, 0.14, clickGrains(R('crunch' + t), 0, 0.12, 24, { amp: 0.34, f0: 1500, f1: 3000, shape: 1.7, dec: 0.003 })), 0.8, { sustain: false });
      boop(t, note, 0.36 + i * 0.03, { pan: -0.1 + i * 0.07, delay: 0.05 });
      // the gulp: a band-passed click sliding 1.2 kHz down to 600 Hz
      nz(t + 0.29, 0.06, { type: 'bandpass', q: 6, f: [[0, 1200], [0.05, 600, 'exp']], amp: perc(0.3, 0.001, 0.03), pan: 0.1, key: 'gulp' });
      pad(t, t + 0.5, CH[chord], 0.3 + i * 0.02, { att: 0.02, rel: 0.08, cut0: 1100 + i * 150, cut1: 1300 + i * 150 });
    });
    kick(6.0, 0.7, 'felt');
    kick(7.0, 0.75, 'felt');
    sub(6.0, 7.0, 'A1', 0.48);
    sub(7.0, 8.0, 'B1', 0.5);
    CH.A.slice(0, 3).forEach((n) => pluck(6.0, n, 0.16, { dec: 0.6 }));
    CH.B.slice(0, 3).forEach((n) => pluck(7.0, n, 0.17, { dec: 0.6 }));
    range(7.0, 11.5, 0.25).forEach((t, i) => shaker(t, i % 2 ? 0.2 : 0.13, i % 2 ? 0.35 : 0.2));
    // 7.5 the parent calls as it lifts off
    call(7.56, 'keear', 0.17, { pan: 0.4, hall: 0.25, scale: 1.03 });

    // =========================================================== ACT 2: growing
    // ---- bar 5 (8.0-9.5) thirteen grams to a hundred
    ['G#5', 'B5', 'C#6', 'D#6', 'E6'].forEach((n, i) => glass(8.0 + i * 0.125, hz(n), 0.2 + i * 0.02, { dec: 0.9, pan: -0.4 + i * 0.2, hall: 0.15 }));
    kick(8.0, 0.7, 'felt');
    sub(8.0, 9.0, 'C#2', 0.5, { att: 0.45 });
    pad(8.0, 9.0, CH.Cm9, 0.32, { att: 0.08, rel: 0.1, cut0: 900, cut1: 1800 });
    fmBell(8.5, hz('G#5'), 0.26, { ratio: 2, index: 1.6, dec: 1.2, hall: 0.3 });
    [8.5, 8.531, 8.562].forEach((t, i) => nz(t, 0.01, { type: 'highpass', f: [[0, 6000]], amp: perc(0.16 - i * 0.04, 0.0004, 0.004), pan: [0.3, -0.3, 0.5][i], key: 'pin' }));
    // 9.0 the juvenile stands: an upward pitch-bend whoosh
    nz(9.0, 0.45, { type: 'bandpass', q: 1.2, f: [[0, 350], [0.4, 3200, 'exp']], amp: [[0, 0], [0.006, 0.22], [0.3, 0.3, 'lin'], [0.45, FLOOR, 'exp']], stereo: true, key: 'stand' });
    glide(9.0, 220, 880, 0.4, 0.08);
    kick(9.0, 0.55, 'felt');
    sub(9.0, 9.5, 'A1', 0.45);
    pad(9.0, 9.5, CH.Amaj7, 0.3, { att: 0.02, rel: 0.08, cut0: 1600 });

    // ---- bar 6 (9.5-11.5) down becomes wings
    tock(9.5, 0.5, 900);
    CH.Fm7.forEach((n, i) => pluck(9.5 + i * 0.01, n, 0.24, { dec: 0.9, hall: 0.15 }));
    sub(9.5, 10.5, 'F#2', 0.45);
    pad(9.5, 10.5, CH.Fm7, 0.3, { att: 0.03, rel: 0.1, cut0: 1200 });
    kick(10.0, 0.6, 'felt');
    play(10.0, 0.46, () => creakBuffer(ctx, 'stretch', 0.46, 30, 20, [[240, 0.014, 0.5], [610, 0.008, 0.35], [1400, 0.004, 0.2]]), 0.5, { sustain: false, room: 0.25 });
    nz(10.5, 0.24, { type: 'bandpass', q: 2.2, f: [[0, 400], [0.2, 3000, 'exp']], amp: [[0, 0], [0.02, 0.2], [0.19, 0.36, 'lin'], [0.24, FLOOR, 'exp']], key: 'unfold' });
    play(10.5, 0.24, () => G('unfold', 0.24, flapGrains(R('unfold'), 0, 0.2, 90, { amp: 0.14, f0: 500, f1: 2200 })), 0.8, { sustain: false });
    [['G#4', 10.5], ['E4', 10.75]].forEach(([n, t]) => pluck(t, n, 0.3, { dec: 1.0, bright: 12, hall: 0.18, delay: 0.1 }));
    sub(10.5, 11.0, 'G#1', 0.42);
    pad(10.5, 11.0, CH.EG, 0.3, { att: 0.02, rel: 0.08, cut0: 1300 });
    // 11.0 the wings go up: a bright stab and three rising plucks
    stab(11.0, ['A4', 'C#5', 'E5', 'B5'], 0.3, { f: 2200, hall: 0.2 });
    kick(11.0, 0.55, 'thud');
    [['B4', 11.0], ['E5', 11.125], ['G#5', 11.25]].forEach(([n, t], i) => pluck(t, n, 0.34 + i * 0.02, { dec: 1.0, bright: 14, bus: 'lead', hall: 0.18, delay: 0.14 }));
    sub(11.0, 11.5, 'A1', 0.42, { rel: 0.12 });
    pad(11.0, 11.5, CH.A, 0.3, { att: 0.02, rel: 0.2, cut0: 1500, cut1: 800 });

    // ---- 11.5-13.0 the feather unrolls from its sheath: drums out
    glass(11.5, hz('B5'), 0.3, { dec: 1.4, cave: 0.3 });
    pluck(11.5, 'A2', 0.28, { dec: 1.4, bright: 5, cave: 0.35 });
    pad(11.5, 13.0, CH.Amaj9, 0.42, { att: 0.7, rel: 0.2, cut0: 320, cut1: 950, cave: 0.12 });
    sub(11.5, 13.0, 'A1', 0.16, { att: 0.8, rel: 0.2 });
    glide(11.583, 900, 2600, 0.42, 0.2, { hall: 0.3, pan: 0.15 });
    glass(11.583, hz('B6'), 0.1, { dec: 0.35, att: 0.001, pan: 0.15 });
    // 12.0 the sheath splits: a paper-tear crackle
    nz(12.0, 0.3, { type: 'bandpass', q: 1.8, f: [[0, 2600], [0.3, 5200, 'exp']], amp: [[0, 0], [0.003, 0.3], [0.3, FLOOR, 'exp']], key: 'tear' });
    nz(12.0, 0.012, { type: 'highpass', q: 0.7, f: [[0, 4500]], amp: perc(0.45, 0.0003, 0.006), key: 'tear-snap' });
    play(12.0, 0.3, () => G('tear', 0.3, clickGrains(R('tear'), 0, 0.26, 60, { amp: 0.34, f0: 2000, f1: 5000, shape: 1.4 })), 0.8, { sustain: false, hall: 0.2 });
    // 12.5 the vane unrolls: glock E6 down to E5 over six frames
    ['E6', 'C#6', 'B5', 'G#5', 'F#5', 'E5'].forEach((n, i) => glock(12.5 + i / 24, hz(n), 0.32 - i * 0.02, { dec: 1.3, pan: 0.4 - i * 0.16, delay: 0.12 }));
    // 12.75 every primary unrolls: a ripple of eight pings
    ['E7', 'B6', 'G#6', 'E6', 'F#6', 'B6', 'C#7', 'E7'].forEach((n, i) => ting(12.75 + i / 32, hz(n), i ? 0.1 : 0.17, { pan: Math.sin(i * 2.1) * 0.6, hall: 0.3 }));

    // ---- 13.0-16.0 days under the midnight sun: the open-fifth pad of the endless day
    tock(13.0, 0.45, 1050);
    CH.E.forEach((n, i) => pluck(13.0 + i * 0.01, n, 0.24, { dec: 1.1, hall: 0.2 }));
    pad(13.0, 16.0, ['E4', 'B4', 'E5', 'B5'], 0.34, { sine: true, att: 0.5, rel: 0.1, cut0: 5000, hall: 0.4, cave: 0.1 });
    pad(13.0, 14.0, CH.Eadd9, 0.3, { att: 0.15, rel: 0.12, cut0: 500, cut1: 800 });
    pad(14.0, 15.0, CH.Cm7, 0.33, { att: 0.08, rel: 0.12, cut0: 800, cut1: 1300 });
    pad(15.0, 15.5, CH.B7sus4, 0.38, { att: 0.05, rel: 0.1, cut0: 1300, cut1: 1800 });
    pad(15.5, 16.0, CH.B7, 0.42, { att: 0.05, rel: 0.05, cut0: 1800, cut1: 2800 });
    sub(13.0, 14.0, 'E2', 0.22, { att: 0.2 });
    sub(14.0, 15.0, 'C#2', 0.28, { att: 0.2 });
    sub(15.0, 16.0, 'B1', 0.42, { att: 0.1, rel: 0.02 });
    // the sun circles: a soft marimba ostinato in 8ths, climbing each circuit
    const circuit = [['E4', 'B4', 'E5', 'B4'], ['E4', 'C#5', 'E5', 'C#5'], ['F#4', 'B4', 'D#5', 'F#5']];
    circuit.forEach((ns, c) => ns.forEach((n, i) => marimba(13.25 + c + i * 0.25, hz(n), 0.1 + c * 0.03, { pan: i % 2 ? 0.3 : -0.3, hall: 0.15, dec: 0.5 })));
    flutter(13.5, 0.3, [0, 0.083, 0.167], { vel: 0.16, f0: 800, f1: 2000, floor: 0.12, pan: -0.2 });
    flutter(14.5, 0.4, [0, 0.083, 0.167, 0.25], { vel: 0.26, f0: 800, f1: 2600, grow: true, floor: 0.15, pan: 0.25 });
    [[13.958, 'B5'], [14.958, 'C#6'], [15.958, 'E6']].forEach(([t, n], i) => ting(t, hz(n), 0.3 + i * 0.03, { dec: 0.6, hall: 0.35, pan: -0.3 + i * 0.3 }));
    tock(15.5, 0.4, 820, { pan: -0.1 });
    // heartbeat into the midpoint
    [[15.0, 0.45], [15.25, 0.3], [15.5, 0.52], [15.75, 0.6]].forEach(([t, v]) => kick(t, v, 'heart'));
    nz(15.0, 0.94, { type: 'highpass', q: 0.7, f: [[0, 1200], [0.94, 7000, 'exp']], amp: [[0, 0.004], [0.93, 0.12, 'exp'], [0.94, FLOOR, 'lin']], stereo: true, sustain: true, hall: 0.2, key: 'riser' });

    // =========================================================== ACT 3: bright, airy
    // ---- bar 9 (16.0-18.0) first flight
    kick(16.0, 1.0, 'full');
    crash(16.0, 0.2, { hall: 0.3 });
    pad(16.0, 17.0, CH.Ehi, 0.62, { att: 0.005, rel: 0.12, cut0: 3000, cut1: 1600, hall: 0.45, cave: 0.12 });
    pad(17.0, 17.5, CH.BD, 0.52, { att: 0.03, rel: 0.05, cut0: 1500, cut1: 1400, hall: 0.3 });
    pad(17.5, 18.0, CH.BD, 0.55, { att: 0.02, rel: 0.1, cut0: 1400, cut1: 3600, hall: 0.4 });
    ['E4', 'G#4', 'B4', 'E5'].forEach((n, i) => pluck(16.0 + i * 0.008, n, 0.3, { dec: 1.5, bright: 11, hall: 0.35, cave: 0.1 }));
    subDrop(16.0, 124, 41, 0.5, 0.45);
    sub(16.0, 17.0, 'E2', 0.62);
    sub(17.0, 18.0, 'D#2', 0.6);
    [['E6', 16.0], ['G#6', 16.25], ['B6', 16.5], ['F#6', 16.75]].forEach(([n, t], i) => kalimba(t, hz(n), 0.42 - i * 0.03, { hall: 0.22, delay: 0.16, pan: i % 2 ? 0.2 : -0.2 }));
    [[16.0, 0.5], [16.25, 0.42], [16.5, 0.55], [16.75, 0.48]].forEach(([t, v]) => {
      whump(t, v);
      play(t + 0.01, 0.12, () => G('beat' + t, 0.12, flapGrains(R('beat' + t), 0, 0.1, 160, { amp: 0.2, f0: 500, f1: 1500 })), 0.6, { sustain: false });
    });
    nz(16.5, 0.45, { type: 'highpass', q: 0.7, f: [[0, 1500], [0.4, 8000, 'exp']], amp: [[0, 0], [0.004, 0.12], [0.38, 0.22, 'lin'], [0.45, FLOOR, 'exp']], stereo: true, hall: 0.25, key: 'rings' });
    kick(17.0, 0.85, 'full');
    call(17.02, 'keear', 0.24, { len: 0.62, pan: -0.15, hall: 0.35 });

    // Act 3 groove: kicks, brushes on 2 and 4, hats in 16ths, a 3-3-2 pluck bass, pumps on the pad
    [16.0, 17.0, 18.0, 19.0, 19.5, 20.0, 20.5, 21.0].forEach((t) => E.duck(t, 0.3));
    [17.5, 18.5, 19.5, 20.5, 21.5].forEach((t) => brush(t, 0.3));
    brush(16.5, 0.4);
    range(16.5, 22.0, 0.25).forEach((t, i) => hat(t, (i % 2 ? 0.28 : 0.17) * (t >= 21.0 ? 0.7 : 1)));
    const bassCells = [
      [16.0, ['E3', 'B3', 'E4']],
      [17.0, ['D#3', 'F#3', 'B3']],
      [18.0, ['C#3', 'G#3', 'C#4']],
      [19.0, ['B2', 'F#3', 'B3']],
      [20.0, ['A2', 'E3', 'A3']],
      [21.0, ['A2', 'E3', 'B3']],
    ];
    bassCells.forEach(([t, ns]) => ns.forEach((n, i) => pluck(t + [0, 0.375, 0.75][i], n, (t >= 18 && t < 19.5 ? 0.22 : 0.3) * (i ? 0.8 : 1), { dec: 0.45, bright: 7, q: 2 })));

    // ---- bar 10 (18.0-19.5) the wing: hand and arm
    kick(18.0, 0.75, 'full');
    kick(19.0, 0.7, 'full');
    glass(18.0, hz('E6'), 0.34, { hall: 0.3, cave: 0.18, dec: 1.8 });
    glock(18.0, hz('B5'), 0.2, { dec: 1.4, pan: -0.35 });
    glock(18.0, hz('G#6'), 0.14, { dec: 1.2, pan: 0.35 });
    pad(18.0, 19.5, CH.Cm9, 0.44, { att: 0.03, rel: 0.1, cut0: 1300, cut1: 1900 });
    sub(18.0, 19.0, 'C#2', 0.56);
    sub(19.0, 20.0, 'B1', 0.58);
    // 18.5 one glock note per primary: ten up the E major scale in 32nds
    ['E5', 'F#5', 'G#5', 'A5', 'B5', 'C#6', 'D#6', 'E6', 'F#6', 'G#6'].forEach((n, i) => glock(18.5 + i * 0.0625, hz(n), 0.18 + i * 0.012, { dec: 0.9, pan: -0.5 + i * 0.11, delay: i === 9 ? 0.25 : 0.05 }));
    // 19.0 airflow over the wing
    nz(19.0, 0.5, { type: 'bandpass', q: 1.4, f: [[0, 800], [0.45, 2000, 'exp']], amp: [[0, 0], [0.08, 0.1], [0.4, 0.18, 'lin'], [0.5, FLOOR, 'exp']], stereo: true, hall: 0.3, key: 'airflow' });

    // ---- 19.5-22.0 the push-in to the hooklets
    kick(19.5, 0.7, 'full');
    glass(19.5, hz('B6'), 0.12, { dec: 0.4 });
    pad(19.5, 20.0, CH.B7sus4, 0.44, { att: 0.02, rel: 0.08, cut0: 1900 });
    nz(19.5, 1.5, { type: 'bandpass', q: 0.8, f: [[0, 300], [1.45, 6500, 'exp']], amp: [[0, 0], [0.05, 0.05], [1.45, 0.22, 'exp'], [1.5, FLOOR, 'lin']], stereo: true, sustain: true, key: 'push' });
    [...range(19.5, 20.0, 0.125), ...range(20.0, 20.5, 0.0625)].forEach((t, i) => nz(t, 0.01, { type: 'highpass', q: 0.8, f: [[0, 5500]], amp: perc(0.1 + i * 0.01, 0.0004, 0.005), pan: i % 2 ? 0.4 : -0.4, key: 'push-tick' }));
    // three deepening zoom thumps: sub drops landing on E2, B1, E1
    [[20.0, 'E2', 0.8], [20.5, 'B1', 0.84], [21.0, 'E1', 0.9]].forEach(([t, n, v], i) => {
      kick(t, v, 'full');
      subDrop(t, hz(n) * 2.2, hz(n), 0.4 + i * 0.1, 0.42 + i * 0.04);
      nz(t, 0.25, { type: 'bandpass', q: 1, f: [[0, 2500 - i * 500], [0.25, 700 - i * 150, 'exp']], amp: perc(0.16, 0.003, 0.2), stereo: true, key: 'zoom' });
    });
    pad(20.0, 21.0, CH.Amaj7, 0.46, { att: 0.02, rel: 0.1, cut0: 1600, cut1: 2200 });
    sub(20.0, 21.0, 'A1', 0.5);
    pad(21.0, 21.5, CH.A69, 0.44, { att: 0.02, rel: 0.1, cut0: 2200, cut1: 1600 });
    sub(21.0, 21.5, 'A1', 0.46);
    [0, 0.5].forEach((o, k) => ['E6', 'G#6', 'B6', 'F#6'].forEach((n, i) => glock(21.0 + o + i * 0.125, hz(n), (0.17 - i * 0.015) * (k ? 0.55 : 1), { dec: 1.0, delay: 0.22, pan: -0.5 + i * 0.33 })));
    // 21.5 the vane zips shut, hook by hook, left to right; the chord resolves home
    range(21.5, 21.99, 1 / 24).forEach((t, i) => nz(t, 0.012, { type: 'bandpass', q: 1.5, f: [[0, 3800 + i * 150]], amp: perc(i ? 0.22 : 0.34, 0.0004, 0.005), pan: -0.8 + (i / 11) * 1.6, key: 'zip' }));
    ['E5', 'B5', 'F#6'].forEach((n, i) => glass(21.5, hz(n), 0.16, { dec: 2.2, pan: [-0.4, 0.4, 0][i], hall: 0.35 }));
    pad(21.5, 22.0, CH.Eadd9, 0.42, { att: 0.04, rel: 0.12, cut0: 1600, cut1: 1300 });
    sub(21.5, 22.0, 'E2', 0.46, { rel: 0.08 });

    // ---- bar 12 (22.0-23.5) two summers, pole to pole
    glass(22.0, hz('E6'), 0.32, { hall: 0.3, cave: 0.2, dec: 1.8 });
    kick(22.0, 0.55, 'felt');
    pad(22.0, 23.0, CH.Amaj9, 0.36, { att: 0.05, rel: 0.1, cut0: 1100, cut1: 1600 });
    sub(22.0, 23.0, 'A1', 0.46, { att: 0.02 });
    // the marker steps south: descending 8th plucks
    [['C#6', 22.5], ['B5', 22.75], ['G#5', 23.0], ['F#5', 23.25]].forEach(([n, t], i) => pluck(t, n, 0.3 - i * 0.02, { dec: 0.7, bright: 12, bus: 'lead', delay: 0.18, pan: 0.3 - i * 0.2 }));
    range(22.0, 23.5, 0.25).forEach((t, i) => tock(t, i % 2 ? 0.08 : 0.12, i % 2 ? 2100 : 2600, { pan: i % 2 ? 0.4 : -0.4 }));
    // 23.0 the Weddell Sea: a bright bell and the magenta stab
    glock(23.0, hz('B6'), 0.34, { dec: 1.6, delay: 0.2 });
    fmBell(23.0, hz('D#6'), 0.2, { ratio: 3.51, index: 1.4, dec: 1.0, hall: 0.3 });
    stab(23.0, ['B4', 'D#5', 'F#5', 'C#6'], 0.3, { f: 2000, hall: 0.25 });
    kick(23.0, 0.6, 'felt');
    pad(23.0, 23.5, CH.B, 0.38, { att: 0.03, rel: 0.05, cut0: 1500, cut1: 2000 });
    sub(23.0, 23.5, 'B1', 0.46);

    // =========================================================== ACT 4: travelling, then home
    // ---- 23.5-26.5 pull-back to the Atlantic, the route draws on
    marimba(23.5, hz('C#3'), 0.3, { hall: 0.2 });
    glass(23.5, hz('B5'), 0.12, { dec: 0.6 });
    tock(23.5, 0.3, 1300, { pan: -0.2 });
    pad(23.5, 24.0, CH.Cm7, 0.36, { att: 0.3, rel: 0.02, cut0: 500, cut1: 1800 });
    sub(23.5, 24.0, 'C#2', 0.4, { att: 0.3, rel: 0.02 });
    // wind and surf under the whole migration, the colony chatter fading as the camera leaves
    wind(23.5, 28.2, [[0, 0], [0.8, 0.12], [3.0, 0.15, 'lin'], [3.2, 0.2, 'lin'], [4.2, 0.26, 'lin'], [4.5, 0.12, 'lin'], [4.7, 0, 'lin']]);
    [23.5, 24.75, 26.0].forEach((t, i) => nz(t + 0.05, 1.4, { type: 'lowpass', q: 0.5, f: [[0, 300], [0.7, 900, 'exp'], [1.4, 350, 'exp']], amp: [[0, 0], [0.7, 0.1 - i * 0.02, 'lin'], [1.4, 0, 'lin']], stereo: true, sustain: true, bus: 'amb', key: 'surf' }));
    chatter('colony', 23.55, 24.9, 11, 0.14, { width: 0.8, hall: 0.2 });
    // three pull-out whooshes, each lower
    [[24.0, 2600], [24.5, 1800], [25.0, 1200]].forEach(([t, f], i) => {
      nz(t, 0.5, { type: 'bandpass', q: 0.9, f: [[0, f], [0.45, f * 0.25, 'exp']], amp: [[0, 0], [0.004, 0.32 - i * 0.03], [0.1, 0.18, 'exp'], [0.5, FLOOR, 'exp']], stereo: true, room: 0.3, key: 'pullout' });
      nz(t, 0.012, { type: 'highpass', q: 0.7, f: [[0, 5000]], amp: perc(0.3, 0.0003, 0.006), key: 'pullout-snap' });
    });
    const stages = [
      [24.0, CH.Cm7, 'C#2', 25.0, { room: 0.5 }, 0.85],
      [25.0, CH.A, 'A1', 25.5, { hall: 0.3 }, 0.9],
      [25.5, CH.B, 'B1', 26.0, { hall: 0.5 }, 0.95],
      [26.0, ['E4', 'G#4', 'B4', 'E5'], 'E2', 26.5, { cave: 0.4, hall: 0.3 }, 0.88],
    ];
    stages.forEach(([t, notes, bass, t1, sends, v], i) => {
      kick(t, v, 'full');
      E.duck(t, 0.3);
      notes.forEach((n, k) => pluck(t + k * 0.006, n, 0.24 + i * 0.02, Object.assign({ dec: 1.3, bright: 10, pan: k % 2 ? 0.25 : -0.25 }, sends)));
      pad(t, t1, i === 3 ? CH.Ehi : notes, 0.44 + i * 0.05, { att: 0.01, rel: 0.1, cut0: 1400 + i * 300, cut1: 1700 + i * 300, hall: 0.2 + i * 0.08 });
      sub(t, t1, bass, 0.58);
    });
    brush(24.5, 0.3);
    range(24.0, 28.0, 0.25).forEach((t, i) => hat(t, i % 2 ? 0.19 : 0.1));
    // 25.0-26.0 the travelling marimba follows the route south
    ['B5', 'G#5', 'F#5', 'E5'].forEach((n, i) => marimba(25.0 + i * 0.25, hz(n), 0.34 - i * 0.02, { pan: 0.35 - i * 0.2, hall: 0.2, delay: 0.1 }));
    ['E4', 'B3', 'A3', 'F#3'].forEach((n, i) => marimba(25.0 + i * 0.25, hz(n), 0.16, { pan: -0.2 }));
    // 26.0 the Weddell Sea: a gong-like swell
    gong(26.0, hz('E3'), 0.3, { dec: 2.2, hall: 0.3, cave: 0.15 });
    marimba(26.0, hz('E5'), 0.22, { hall: 0.3 });
    crash(26.0, 0.1, { cave: 0.12, dec: 0.6 });
    // 26.25 the return track: a fast rising arpeggio
    ['E5', 'G#5', 'B5', 'E6', 'F#6', 'G#6', 'B6', 'E7'].forEach((n, i) => glock(26.25 + i / 48, hz(n), 0.22 + i * 0.01, { dec: 0.8, pan: -0.5 + i * 0.14, delay: i === 7 ? 0.25 : 0 }));

    // ---- 26.5-28.0 riding the winds south
    play(
      26.5,
      1.55,
      () => {
        const r = R('flock');
        const grains = flapGrains(r, 0, 1.5, 90, { amp: 0.12 });
        [0.5, 1.0].forEach((w) => grains.push(...flapGrains(r, w, 0.25, 160, { amp: 0.2, f0: 500, f1: 1400 })));
        return G('flock', 1.55, grains.filter((g) => [0, 0.5, 1.0].every((b) => g.t < b - 0.03 || g.t > b + 0.012)));
      },
      0.8,
      { sustain: true, hall: 0.15 }
    );
    chatter('flock', 26.55, 27.95, 7, 0.08, { width: 0.9, hall: 0.4 });
    kalimba(26.5, hz('E5'), 0.3, { hall: 0.2, delay: 0.16, pan: -0.2 });
    pad(26.5, 27.0, CH.E, 0.5, { att: 0.02, rel: 0.08, cut0: 2200 });
    pad(27.0, 27.5, CH.A, 0.52, { att: 0.02, rel: 0.08, cut0: 2600 });
    pad(27.5, 28.0, CH.Bsus4, 0.52, { att: 0.02, rel: 0.12, cut0: 2600, cut1: 1500 });
    sub(26.5, 27.0, 'E2', 0.56);
    sub(27.0, 27.5, 'A1', 0.58);
    sub(27.5, 28.0, 'B1', 0.58, { rel: 0.03 });
    [26.5, 27.0, 27.5].forEach((t, i) => {
      kick(t, [0.65, 0.9, 0.75][i], 'full');
      E.duck(t, 0.3);
    });
    brush(26.5, 0.45, -0.1);
    brush(27.5, 0.3);
    // 27.0 the flock banks on a gust
    nz(27.0, 0.6, { type: 'bandpass', q: 0.8, f: [[0, 600], [0.25, 2400, 'exp'], [0.6, 900, 'exp']], amp: [[0, 0], [0.005, 0.2], [0.25, 0.3, 'lin'], [0.6, FLOOR, 'exp']], stereo: true, panEnv: [[0, 0.5], [0.6, -0.5, 'lin']], key: 'gust' });
    range(27.0, 28.0, 0.125).forEach((t, i) => shaker(t, i % 2 ? 0.1 : 0.17, i % 2 ? -0.35 : 0.35));
    // 27.5 the motif soars on a soft horn in half-beats, over the cut, across the ice and into the lift-off
    // (horn notes sit at least 0.45 s apart so its filter automation stays in time order)
    horn([[27.5, 'E5'], [28.0, 'G#5'], [28.5, 'B5'], [29.0, 'F#5']], 29.45, 0.17, { hall: 0.35, delay: 0.15 });

    // ---- 28.0-29.5 summer on the Antarctic ice: breakdown
    coldPad(28.0, 29.0, ['E5', 'B5', 'F#6', 'G#6'], 0.16);
    // the cut to the ice: a glassy ping and a sharp ice crack
    glass(28.0, hz('B6'), 0.2, { dec: 1.2, att: 0.001, hall: 0.4, pan: 0.2 });
    nz(28.0, 0.05, { type: 'bandpass', q: 1.2, f: [[0, 3200]], amp: perc(0.5, 0.0004, 0.025), hall: 0.35, key: 'ice-crack' });
    pad(28.0, 29.0, CH.Cm9, 0.26, { sine: true, att: 0.06, rel: 0.15, cut0: 5000, hall: 0.35 });
    pad(29.0, 29.5, CH.A, 0.28, { sine: true, att: 0.03, rel: 0.1, cut0: 5000, hall: 0.35 });
    play(28.0, 1.2, () => creakBuffer(ctx, 'ice', 1.2, 14, 8, [[140, 0.03, 0.5], [390, 0.012, 0.3], [950, 0.005, 0.15]]), 0.4, { filt: ['lowpass', 1400, 0.7], sustain: true, hall: 0.3 });
    nz(28.0, 1.1, { type: 'lowpass', q: 0.6, f: [[0, 260]], amp: [[0, 0], [0.2, 0.1, 'lin'], [1.1, 0, 'lin']], stereo: true, sustain: true, bus: 'amb', key: 'ice-rumble' });
    // one ting per month, Jan to Apr
    [[28.25, 'E6'], [28.5, 'F#6'], [28.75, 'G#6'], [29.0, 'B6']].forEach(([t, n], i) => {
      ting(t, hz(n), 0.34 + i * 0.02, { dec: 0.7, hall: 0.4, pan: -0.4 + i * 0.27 });
      glass(t, hz(n) * 2, 0.05, { dec: 0.2, att: 0.0008, pan: -0.4 + i * 0.27 });
    });
    // 29.0 the flock lifts off north: a rising wing burst and a bright call
    nz(29.0, 0.45, { type: 'highpass', q: 0.7, f: [[0, 700], [0.4, 5000, 'exp']], amp: [[0, 0], [0.004, 0.14], [0.35, 0.22, 'lin'], [0.45, FLOOR, 'exp']], stereo: true, key: 'liftoff' });
    play(29.0, 0.5, () => G('liftoff', 0.5, [{ t: 0, dur: 0.07, amp: 0.4, pan: 0.2, f: 1000, q: 0.8, att: 0.002, dec: 0.03 }, ...flapGrains(R('liftoff'), 0.03, 0.42, 200, { amp: 0.18, f0: 600, f1: 1800 })]), 0.8, { sustain: true, hall: 0.2 });
    call(29.05, 'keear', 0.22, { pan: 0.2, hall: 0.3, scale: 1.05 });

    // ---- 29.5-30.5 home: a new egg
    tock(29.5, 0.45, 1050);
    CH.E.forEach((n, i) => pluck(29.5 + i * 0.01, n, 0.22, { dec: 0.9, hall: 0.2 }));
    pad(29.5, 30.0, CH.EG, 0.32, { att: 0.05, rel: 0.08, cut0: 1000, cut1: 1400 });
    sub(29.5, 30.0, 'G#1', 0.4);
    chatter('home', 29.55, 29.7, 2, 0.1, { width: 0.7 });
    // 29.75 the fish flight: a call and its answer
    call(29.75, 'keear', 0.18, { pan: -0.35, hall: 0.25, len: 0.3 });
    call(29.8, 'keear', 0.13, { pan: 0.35, hall: 0.25, scale: 0.94, len: 0.17 });
    kick(30.0, 0.62, 'felt');
    nz(30.0, 0.012, { type: 'highpass', q: 0.7, f: [[0, 5000]], amp: perc(0.4, 0.0003, 0.006), key: 'snap-click' });
    sub(30.0, 30.5, 'B1', 0.44);
    pad(30.0, 30.5, CH.B7, 0.34, { att: 0.02, rel: 0.06, cut0: 1400, cut1: 1800 });
    // 30.0 the snap zoom: a fast rising whoosh into the glass ping
    nz(30.0, 0.5, { type: 'bandpass', q: 0.9, f: [[0, 600], [0.5, 4200, 'exp']], amp: [[0, 0.003], [0.49, 0.2, 'exp'], [0.5, FLOOR, 'lin']], stereo: true, sustain: true, key: 'snap' });

    // ---- 30.5-32.0 back to the egg, and the loop
    glass(30.5, hz('E6'), 0.4, { cave: 0.5, hall: 0.2, dec: 2.2 });
    pad(30.5, 31.0, CH.E, 0.36, { att: 0.02, rel: 0.06, cut0: 1100 });
    sub(30.5, 31.0, 'E2', 0.36);
    // 31.0 a soft bell chord for the wordmark
    kick(31.0, 0.45, 'felt');
    ['E3', 'B3', 'E4', 'G#4'].forEach((n, i) => marimba(31.0, hz(n), 0.24 - i * 0.02, { room: 0.2, hall: 0.12 }));
    glock(31.0, hz('B5'), 0.3, { dec: 1.6, pan: -0.25 });
    glock(31.0, hz('E6'), 0.26, { dec: 1.6, pan: 0.25 });
    fmBell(31.0, hz('G#5'), 0.12, { ratio: 2, index: 1.2, dec: 1.4, hall: 0.3 });
    sub(31.0, 31.5, 'E2', 0.42);
    // the end pad meets the opening pad at the same level and cutoff, so the loop seam is continuous
    pad(31.0, 32.0, CH.Eadd9, 0.42, { att: 0.03, rel: 0.02, cut0: 1300, cut1: 1100 });
    glass(31.5, hz('B5'), 0.22, { dec: 1.2, pan: -0.25, hall: 0.2 });
    glass(31.5, hz('E6'), 0.19, { dec: 1.2, pan: 0.25, hall: 0.2 });
    pluck(31.5, 'E2', 0.4, { dec: 1.6, bright: 6, cave: 0.4 });
    sub(31.5, 32.0, 'E2', 0.3, { att: 0.01, rel: 0.02 });
    kalimba(31.75, hz('B4'), 0.3, { hall: 0.15 });
    // a faint reverse swell under the pickup leads the loop back into the downbeat
    revSwell(31.5, 0.5, 0.1, { hi: true, hall: 0.1 });
  }

  FILM.audio = {
    render(ctx, opts) {
      const o = opts || {};
      const start = Math.max(0, Number(o.start) || 0);
      const dest = o.dest || ctx.destination;
      const DUR = (FILM.TIMELINE && FILM.TIMELINE.duration) || FILM.DURATION || 32;
      // opts.mix overrides the mix constants (bus gains, trim); the analysis tools use it for solo renders.
      const om = o.mix || {};
      const mix = Object.assign({}, MIX, om, {
        bus: Object.assign({}, MIX.bus, om.bus || {}),
        eq: Object.assign({}, MIX.eq, om.eq || {}),
        comp: Object.assign({}, MIX.comp, om.comp || {}),
      });
      const E = makeEngine(ctx, start, dest, DUR, mix);
      const I = instruments(E);
      // The score is scheduled one bar at a time, so the audio graph only ever holds the voices of
      // the next few seconds. Each voice belongs to exactly one bar by its start time, so the output
      // is the same as scheduling everything at once. The first bar also takes every earlier voice
      // still sounding at `start`.
      const BAR = 240 / ((FILM.TIMELINE && FILM.TIMELINE.bpm) || 120);
      const first = Math.floor(start / BAR);
      const last = Math.ceil(DUR / BAR) - 1;
      const run = (k) => {
        E.w0 = k === first ? -Infinity : k * BAR;
        E.w1 = k === last ? Infinity : (k + 1) * BAR;
        score(E, I);
      };
      const due = (k) => E.base + (k * BAR - start) - LAT; // context time of bar k's first event
      run(first);
      let k = first + 1;
      const isOffline = typeof OfflineAudioContext !== 'undefined' && ctx instanceof OfflineAudioContext;
      if (isOffline && typeof ctx.suspend !== 'function') {
        // An offline context that cannot pause mid-render gets every bar up front.
        for (; k <= last; k++) run(k);
      } else if (isOffline) {
        // Offline: pause the render 0.25 s before each bar, schedule it, resume.
        const q = 128 / ctx.sampleRate;
        const end = ctx.length / ctx.sampleRate;
        for (; k <= last; k++) {
          const j = k;
          const when = Math.floor((due(j) - 0.25) / q) * q;
          if (when >= end - q) break; // this bar starts after the render window ends
          let paused = null;
          if (when > ctx.currentTime + q) {
            try {
              paused = ctx.suspend(when);
            } catch (e) {
              paused = null;
            }
          }
          if (!paused) run(j);
          else
            paused.then(
              () => {
                run(j);
                ctx.resume();
              },
              () => run(j)
            );
        }
      } else {
        // Live: a look-ahead timer schedules each bar 1.5 s before it sounds.
        const AHEAD = 1.5;
        const pump = () => {
          while (k <= last && due(k) - ctx.currentTime < AHEAD) run(k++);
          return k <= last;
        };
        if (pump()) {
          const timer = setInterval(() => {
            if (ctx.state === 'closed' || !pump()) clearInterval(timer);
          }, 100);
        }
      }
    },
  };
})();
