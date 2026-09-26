// FILM.TIMELINE: the shot list and audio cue list for "North Is Where the Sky Stands Still".
// Owner: storyboard. Human-readable plan: docs/storyboard.md. Visual rules: docs/art-bible.md.
// 120 bpm: beat 0.5 s, bar 2 s. 12 s = 6 bars = 288 frames at 24 fps, 1920×1080 (theme negative).
(function () {
  'use strict';
  const INV = { invert: 1 }; // plate B: the negative

  window.FILM.TIMELINE = {
    title: 'North Is Where the Sky Stands Still',
    bpm: 120,
    duration: 12,
    fps: 24,
    width: 1920,
    height: 1080,
    shots: [
      {
        id: 'first-summer', file: '01-first-summer.js', start: 0, end: 2, mode: 'schematic', post: 0.55,
        title: 'The first summer',
        brief: 'Void plate. The young bunting as a constellation perched lower left (G4), head up to Polaris (G1, accent). The sky of G1 at phi 0 with 260 background stars; Big and Little Dipper edges draw on per 8th. Dashed sight line from the eye toward Polaris from T 1. Owns the WORLD block (sky, phi(T), dust, bunting constructor, twig).',
      },
      {
        id: 'sky-turns', file: '02-sky-turns.js', start: 2, end: 4, mode: 'schematic', post: 0.55,
        title: 'The sky turns',
        brief: 'Match cut from 01: identical frame, adding star trails on the downbeat. The sky turns counter-clockwise about Polaris, phi 0 to 40 deg inOutSine; every star draws its arc. Dashed guide ellipse r 150 about Polaris with a lit tick at phi.',
      },
      {
        id: 'still-point', file: '03-still-point.js', start: 4, end: 5.5, mode: 'schematic', post: 0.55,
        title: 'The star that stays',
        brief: 'Push-in 1 to 1.45 about Polaris. The instrument lands on Polaris (T 4), the pointer line Merak-Dubhe-Polaris draws (T 4.5), the dotted ring pulses (T 5). Trails at 30%.',
      },
      {
        id: 'funnel-autumn', file: '04-funnel-autumn.js', start: 5.5, end: 7, mode: 'schematic', post: 0.55, grade: INV,
        title: 'Footprints away from the pole',
        brief: 'Negative plate. The Emlen funnel from above (G3): rim, pad, radial rules, the see-through mesh. Pole marker at the top with the accent. The top-view bird hops to the lower wall on T 6 and 6.5, printing inked three-toed footprints in a 70 deg sector away from the pole. Owns the funnel constructor.',
      },
      {
        id: 'false-pole', file: '05-false-pole.js', start: 7, end: 8.5, mode: 'schematic', post: 0.55,
        title: 'A sky turned around Betelgeuse',
        brief: 'Planetarium: dome ribs, the dumbbell projector at bottom centre. Orion (G2) turning counter-clockwise about Betelgeuse (accent), 30 deg inOutSine, with trails; Polaris a plain star. The small perched bird lower left looks at Betelgeuse. Instrument lands on Betelgeuse at T 7.5.',
      },
      {
        id: 'funnel-false', file: '06-funnel-false.js', start: 8.5, end: 10, mode: 'schematic', post: 0.55, grade: INV,
        title: 'Footprints away from Betelgeuse',
        brief: 'Negative plate. 04 funnel copied verbatim; the marker at the Betelgeuse side (G3 poleFalse), the print cluster on the opposite wall toward (1211, 705). Hops on T 9 and 9.5.',
      },
      {
        id: 'night-flight', file: '07-night-flight.js', start: 10, end: 12, mode: 'schematic', post: 0.55,
        title: 'South',
        brief: 'The sky of 01 (phi -6 to 0 deg), Polaris lit. The bunting in flight, a constellation seen from below, span 420 px, flies from (1180, 470) to (560, 840), away from the pole, wings on a 6-frame flap, dashed trail. Loops into 01.',
      },
    ],
    cues: [
      { t: 0, kind: 'swell', note: 'Night pad opens: A minor add9, slow attack; glass ping A5 for Polaris' },
      { t: 0.5, kind: 'sfx', note: 'Glass pluck G5, a Dipper edge' },
      { t: 1, kind: 'sfx', note: 'Glass pluck A5, a Dipper edge' },
      { t: 1.5, kind: 'sfx', note: 'Glass pluck C6, the last Dipper edge' },
      { t: 2, kind: 'cut', note: 'Low swell; soft 16th clicks that follow the turn' },
      { t: 3, kind: 'swell', note: 'Pad to F maj7' },
      { t: 4, kind: 'hit', note: 'Bell on Polaris: A5 + E6, long decay' },
      { t: 4.5, kind: 'sfx', note: 'Glass figure E5 A5 E6 on 8ths with the pointer line' },
      { t: 5, kind: 'hit', note: 'Soft pulse thump' },
      { t: 5.5, kind: 'cut', note: 'Paper thump as the plate inverts; pad drops to A2' },
      { t: 6, kind: 'sfx', note: 'Ink taps, two per hop' },
      { t: 6.5, kind: 'sfx', note: 'Ink taps, two per hop' },
      { t: 7, kind: 'cut', note: 'Planetarium hum 55 / 55.4 Hz, projector click; pad in D minor' },
      { t: 7.5, kind: 'hit', note: 'Bell on Betelgeuse: D#5 + A5' },
      { t: 8.5, kind: 'cut', note: 'Paper thump' },
      { t: 9, kind: 'sfx', note: 'Ink taps' },
      { t: 9.5, kind: 'sfx', note: 'Ink taps' },
      { t: 10, kind: 'cut', note: 'Wing whooshes on each beat; pad resolves to A minor add9' },
      { t: 11.5, kind: 'hit', note: 'Polaris ping A5, long tail into the loop' },
    ],
  };
})();
