// FILM.GEO: the storyboard's Shared geometry tables (docs/storyboard.md), as data.
// Owner: storyboard. Frame pixels on the 1080x1920 canvas, at the frames either side of each match cut.
// Pure data, no lib calls: tools evaluate this file on its own. Scenes read it with FILM.lib.geo(id);
// tools/check.cjs (check 7) measures every profile on the rendered frames either side of its cuts.
(function () {
  'use strict';
  const FILM = window.FILM;

  FILM.GEO = {
    // G1: egg, hanging under a leaf. Flat base glued to the leaf underside at y 520, rounded tip down at y 1280.
    // 02's first frame is the spark on black and 17 cuts to the hero, so only the two egg-to-egg cuts are measured.
    G1: {
      kind: 'profile',
      cx: 540,
      ys: [520, 560, 620, 700, 790, 880, 980, 1080, 1160, 1220, 1260, 1280],
      hs: [180, 225, 262, 282, 285, 276, 250, 208, 160, 110, 60, 0],
      shots: ['egg-blueprint', 'egg-hatch', 'spring-egg', 'egg-loop'],
      cuts: ['egg-blueprint>egg-hatch', 'spring-egg>egg-loop'],
    },

    // G2: J-hang body centre line, silk pad to head capsule (05 end, 06 start).
    G2: {
      kind: 'polyline',
      pts: [[540, 300], [540, 760], [556, 840], [600, 880], [660, 870], [705, 830]],
      shots: ['instar-ladder', 'j-hang'],
    },

    // G3: chrysalis, hanging. Cremaster from (540, 300) to (540, 332); head down at y 860 to 905.
    // 09 opens on a flash, so 08 > 09 is not listed; the empty shell is measured again across 09 > 10.
    G3: {
      kind: 'profile',
      cx: 540,
      ys: [332, 380, 440, 500, 600, 700, 800, 860, 895, 905],
      hs: [35, 72, 106, 124, 130, 127, 108, 78, 36, 0],
      shots: ['j-hang', 'inside-chrysalis', 'chrysalis-days', 'eclosion', 'wing-veins'],
      cuts: ['j-hang>inside-chrysalis', 'inside-chrysalis>chrysalis-days', 'eclosion>wing-veins'],
    },

    // G4: hanging adult after emergence (09 end, 10, 11 start).
    G4: {
      kind: 'points',
      pts: {
        head: [540, 935],
        thorax: [540, 995],
        clubLeft: [495, 760],
        clubRight: [590, 760],
        forewingBase: [565, 985],
        forewingApex: [790, 1450],
        forewingTornus: [560, 1290],
        hindwingBase: [570, 1005],
        hindwingLowest: [620, 1420],
        pushTarget: [735, 1400],
      },
      shots: ['eclosion', 'wing-veins', 'scale-mosaic'],
    },

    // G5: hero adult from above (01, 13 layer 1). Wingspan 920 px.
    G5: {
      kind: 'points',
      pts: {
        thorax: [540, 900],
        head: [540, 830],
        abdomenTip: [540, 1110],
        forewingTipLeft: [80, 640],
        forewingTipRight: [1000, 640],
        tornusLeft: [300, 1010],
        tornusRight: [780, 1010],
        hindwingLeft: [230, 1150],
        hindwingRight: [850, 1150],
        clubLeft: [470, 660],
        clubRight: [610, 660],
      },
      shots: ['hero-on-milkweed', 'pull-back-continent'],
    },

    // G6: map projection anchors (13 layer 5): x = 540 + (lon + 88) * 27, y = 1450 - (lat - 19.5) * 32.
    G6: {
      kind: 'points',
      pts: {
        michoacan: [208, 1447],
        mexicoCity: [240, 1453],
        sanAntonio: [256, 1133],
        floridaTip: [732, 1271],
        yucatanTip: [567, 1386],
        lakeSuperior: [554, 548],
        lakeMichigan: [567, 666],
        lakeHuron: [691, 640],
        lakeErie: [724, 723],
        lakeOntario: [815, 675],
        jamesBay: [756, 442],
        newYork: [918, 772],
        capeHatteras: [878, 948],
        ontarioFlight: [756, 666],
      },
      shots: ['pull-back-continent'],
    },

    // G7: sun-path arc through three points (08, 14); the sun disc has radius 46.
    G7: {
      kind: 'points',
      pts: { east: [60, 520], noon: [540, 200], west: [1020, 520] },
      shots: ['chrysalis-days', 'migration-column'],
    },
  };
})();
