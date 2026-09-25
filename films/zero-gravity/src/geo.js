// FILM.GEO: the storyboard's Shared geometry as data (docs/storyboard.md, "Shared geometry").
// Pure data. The world model itself lives in the WORLD block that every scene copies from 01-shared-orbit.js.
(function () {
  'use strict';
  window.FILM.GEO = {
    G1: {
      kind: 'points',
      pts: {
        centre: [960, 540],
        farA: [299, 514], // body A's rest in S05_07 (T 145–158.7)
        farB: [1581, 437], // body B's rest in S05_07
        stringA: [-240, 560], // the thread's anchor (A, off-frame) from T 164.7
        stringEnd: [1740, 522], // the thread's free end in S05_08
      },
      shots: ['shared-orbit', 'breathing-shells', 'visible-thread', 'crossing-fields', 'out-of-phase', 'thread-release', 'far-drift', 'last-string'],
    },
  };
})();
