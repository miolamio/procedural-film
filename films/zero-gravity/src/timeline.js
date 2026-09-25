// FILM.TIMELINE: the shot list and audio cue list for "Zero Gravity and No Attraction".
// Owner: storyboard. Human-readable plan: docs/storyboard.md. Visual rules: docs/art-bible.md.
// Full length of the song (2:52.042). The grid is measured from the recording: 140 bpm, first beat
// at T 0.105, bar 0's downbeat at T 0.962 (the song opens on a two-beat pickup). One shot per
// scenario window S05_01..S05_08, each boundary on a downbeat of that grid. The grid is offset from
// T 0, so the gate's 16th-grid check warns on every boundary; the boundaries are exact on the song.
(function () {
  'use strict';
  const FILM = window.FILM;
  const BEAT = 3 / 7;
  const BAR = 12 / 7;
  const T_BAR0 = 0.105 + 2 * BEAT;
  const B = (n) => T_BAR0 + n * BAR; // downbeat of bar n
  const END = 172.042449; // the recording's length
  const SNAP = B(70);
  const LEAVE = B(92);

  FILM.TIMELINE = {
    title: 'Zero Gravity and No Attraction',
    bpm: 140,
    duration: END,
    fps: 24,
    width: 1920,
    height: 1080,
    shots: [
      {
        id: 'shared-orbit', file: '01-shared-orbit.js', start: 0, end: B(8), mode: 'schematic', post: 0.55,
        title: 'A shared centre',
        brief: 'S05_01, 0–14.676. Void plate. Two outlined bodies (lens A, three-lobe B) on one dashed common orbit about the centre glyph at (960,540), turning together clockwise (one turn per 8 bars), distance constant. Guide ellipses, diagonals, a heartbeat ring out of the centre and a lit tick under A on every beat. Loop: 16 pulses (2 bars). Owns the WORLD block.',
      },
      {
        id: 'breathing-shells', file: '02-breathing-shells.js', start: B(8), end: B(24), mode: 'schematic', post: 0.55,
        title: 'Shells breathe together',
        brief: 'S05_02, 14.676–42.105. Once, on the first downbeat: each body grows its own two-line shell. Loop: the shells breathe in sync, one breath per 16 pulses, peaks on even downbeats; the centre and orbit hold; the orbit keeps turning.',
      },
      {
        id: 'visible-thread', file: '03-visible-thread.js', start: B(24), end: B(38), mode: 'schematic', post: 0.55,
        title: 'The thread shows',
        brief: 'S05_03, 42.105–66.105. Once, on the first downbeat: the amber thread draws from A to B over two beats. Then the loop: the thread bends and sways every 16 pulses, the distance wobbles ±12 px on the same loop and grows 310 → 380; the orbit fades over 4 bars into two diverging trails; a distance bracket rides beside the thread; the centre dims.',
      },
      {
        id: 'crossing-fields', file: '04-crossing-fields.js', start: B(38), end: B(54), mode: 'schematic', post: 0.55,
        title: 'Fields pass through',
        brief: 'S05_04, 66.105–93.534. Each body emits a field of concentric rings, A on the beats and B on the off-beats, crossing in a moire band. Loop: one ring per beat each. The centre glyph flickers on every downbeat and loses its dotted ring across the window.',
      },
      {
        id: 'out-of-phase', file: '05-out-of-phase.js', start: B(54), end: B(68), mode: 'schematic', post: 0.55,
        title: 'Out of phase',
        brief: 'S05_05, 93.534–117.534. Once, over the first two beats: the breathing slides into opposite phase. Loop: one shell full while the other is contracted, every 16 pulses. The turning dies away, B lags, B field flows inward, the centre breaks into fragments that drift out and are gone by bar 62.',
      },
      {
        id: 'thread-release', file: '06-thread-release.js', start: B(68), end: B(84), mode: 'schematic', post: 0.55,
        title: 'The thread lets go',
        brief: 'S05_06, 117.534–144.962. Two bars of tension (tremble, straightening), then on the bar-70 downbeat T 120.962 the thread breaks at B, once: a single accent ring, the free end whips back. Loop: the free end swings from A every 8 pulses (one bar). The bodies keep drifting apart, each on its own loop; the fields fade.',
      },
      {
        id: 'far-drift', file: '07-far-drift.js', start: B(84), end: B(96), mode: 'schematic', post: 0.55,
        title: 'Far apart',
        brief: 'S05_07, 144.962–165.534. A left, B right, ~1280 px of void; slow independent drift on the 16-pulse loop, no approach; the thread trails from A and never reaches B; a faint dashed gap rule. Once, from bar 92 (T 158.676): B leaves right, A leaves left dragging the thread taut across the frame; both are off-frame by bar 95.5.',
      },
      {
        id: 'last-string', file: '08-last-string.js', start: B(96), end: END, mode: 'schematic', post: 0.55,
        title: 'One string',
        brief: 'S05_08, 165.534–172.042. Only the thread: one nearly horizontal taut line from the left edge to (1740,522). Loop: a residual tremble with a soft re-excitation on every downbeat (8 pulses); it never stops before the last frame.',
      },
    ],
    cues: [
      { t: 0.105, kind: 'swell', note: 'First beat of the song: the felt pulse starts on every beat; a low D drone and airy pad fade in over one bar from T 0' },
      { t: B(8), kind: 'cut', note: 'Shells: a soft chime; the pad opens and breathes, one filter swell per 2 bars' },
      { t: B(24), kind: 'hit', note: 'Thread appears: one glassy pluck A4 with a long tail' },
      { t: B(24) + 2 * BEAT, kind: 'sfx', note: 'Thread reveal ends: a high harmonic ping' },
      { t: B(38), kind: 'cut', note: 'Fields: two soft arpeggio voices in 8ths, one on beats (left), one on off-beats (right)' },
      { t: B(54), kind: 'cut', note: 'Hinge: the pad splits into two detuned beating layers; the felt pulse drops out' },
      { t: B(68), kind: 'swell', note: 'Two-bar riser: bowed tone climbing plus noise swell' },
      { t: SNAP, kind: 'hit', note: 'THE SNAP (once): bright string pluck, noise crack, sub drop, long reverb; the riser cuts dead' },
      { t: B(84), kind: 'cut', note: 'Void: the pad thins to a high held fifth, one soft bell per bar' },
      { t: LEAVE, kind: 'sfx', note: 'The bodies leave: a slow falling glide' },
      { t: B(96), kind: 'cut', note: 'One string: a sustained string tone on D3 with decaying vibrato rings to the end' },
    ],
  };
})();
