// 12 two-summers : "Chasing the light pole to pole" (schematic, global T 22.0 to 23.5)
//
// Layers, back to front:
//   1 blueprint plate: grid, guide circles r 470 / 520 at the globe centre with a 5-degree tick ring, two long
//     diagonals, the frame axis, left ruler, bottom ruler and registration crosses, the globe-width bracket
//   2 the far side of the globe: hidden graticule as faint dashes
//   3 the globe disc (navy plate so the grid stops at the limb), the day-side glow wash centred on the subsolar point
//   4 the night side: lavender hatching at 45 degrees, a 105-degree cross layer deep in the night, a stippled
//     twilight band along the terminator
//   5 the 15-degree graticule, equator, tropics and polar circles (the polar circle of the lit pole brightens),
//     the sun's parallel, the two Atlantic gyres
//   6 land: stipple fixed to the sphere, lat/lon coastlines (Greenland, Iceland, the Americas, Europe, Africa,
//     Madagascar, Britain, Ireland, Antarctica), shelf echo lines, the pack-ice edge
//   7 the terminator: bright visible half, hidden half dashed, its major axis and the tilt arc against the pole axis
//   8 globe double outline, latitude scale on the left limb, pole axis, rotation arrow
//   9 the sun beyond the right limb on its declination ruler, parallel rays onto the day side, subsolar crosshair
//  10 the route (G4 southbound, Africa leg): faint dashes ahead, lineWhite trail behind, waypoint rings, home ring
//  11 the tern marker (glow dot with a schemBill tick) hopping on 8ths, landing rings, the magenta ring on T 23.0
//  12 polar cap arcs on T 23.25 (Arctic fading, Antarctic bright)
//  13 network: two 24-hour daylight dials, Sand Island (left) and the tern (right)
//  14 the canonical cycle ring, migration arc lit
//
// Geometry: orthographic globe centred (540, 900), radius 360, on latitude 0; the central meridian runs from 20 W to
// 30 W over the shot (the globe turns 10 degrees east, centred on 25 W at mid-shot). The sun sits 60 degrees east of
// the central meridian, its declination swinging from +23.44 (June) to -23.44 (December); the terminator is the great
// circle perpendicular to the sun vector, computed exactly.
//
// Beats (local t): 0.0 June, marker on Sand Island; 0.5 the terminator starts its 12-frame swing, first hop;
// 0.75 second hop; 1.0 December, last hop to the Weddell Sea, magenta ring; 1.25 polar cap arcs.
// Clamped to the final pose for t > dur.
(function () {
  'use strict';

  const ID = 'two-summers';
  const L = FILM.lib;
  const P = L.pal;
  const E = L.ease;
  const TAU = Math.PI * 2;
  const DEG = Math.PI / 180;
  const FR = 1 / 24;

  const LAV = P.lavender;
  const WHITE = P.lineWhite;
  const GLOW = P.glow;
  const MAG = P.magenta;
  const PALE = P.paleBlue;
  const NAVY = P.navy;
  const BILL = P.schemBill; // the shot's one subject tint: the marker's tick and the tern dial glyph only

  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, u) => a + (b - a) * u;
  const sstep = (a, b, x) => {
    const u = clamp((x - a) / (b - a));
    return u * u * (3 - 2 * u);
  };
  const sd = (...k) => L.hash(ID, ...k) & 0x7fffffff;
  const SEED = sd('base') % 100000;

  // ---------------------------------------------------------------------------
  // Beats
  // ---------------------------------------------------------------------------

  const B_SWING = 0.5; // T 22.5: the terminator starts to swing, hop 1
  const B_HOP2 = 0.75; // T 22.75: hop 2
  const B_DEC = 1.0; // T 23.0: December, hop 3 lands in the Weddell Sea, magenta ring
  const B_CAPS = 1.25; // T 23.25: polar cap arcs
  const HOPS = [B_SWING, B_HOP2, B_DEC];

  // stepK: already under way on the beat frame (1/frames of the way), nothing on the frame before
  const stepK = (t, tb, frames) => clamp((t - tb + FR - 1e-4) / (frames * FR));
  // decay: full on the beat frame, fading to nothing over the given frames
  const decay = (t, tb, frames) => {
    const u = (t - tb + 1e-4) / (frames * FR);
    return u < 0 || u > 1 ? 0 : (1 - u) * (1 - u);
  };

  // ---------------------------------------------------------------------------
  // Globe and sun (docs/storyboard.md, section 12)
  // ---------------------------------------------------------------------------

  const G = { x: 540, y: 900, r: 360 };
  const OBL = 23.44; // solstice declination
  const POLAR = 90 - OBL; // 66.56, the polar circles
  const SUN_DLON = 60 * DEG; // the subsolar meridian sits 60 degrees east of the central meridian
  const LON_A = -20, LON_B = -30; // central meridian at t 0 and at t dur: the globe turns 10 degrees east
  const SUN_X = 975; // the sun glyph column, just beyond the right limb

  // view vector of (lat, lon) for the central meridian lon0: X right, Y up, Z toward the viewer
  function vec(la, lo, lon0) {
    const f = la * DEG, d = (lo - lon0) * DEG, c = Math.cos(f);
    return [c * Math.sin(d), Math.sin(f), c * Math.cos(d)];
  }
  const scr = (X, Y) => [G.x + G.r * X, G.y - G.r * Y];
  // the sun vector in view space for declination dec (degrees)
  function sunVec(dec) {
    const d = dec * DEG, c = Math.cos(d);
    return [c * Math.sin(SUN_DLON), Math.sin(d), c * Math.cos(SUN_DLON)];
  }
  // lit fraction of the sphere at screen (x, y): n . s, and the inverse projection
  function nAt(x, y) {
    const X = (x - G.x) / G.r, Y = (G.y - y) / G.r;
    const q = 1 - X * X - Y * Y;
    return [X, Y, q > 0 ? Math.sqrt(q) : 0];
  }
  // hours of daylight at latitude lat for declination dec
  function dayHours(lat, dec) {
    const c = -Math.tan(lat * DEG) * Math.tan(dec * DEG);
    return (2 * Math.acos(clamp(c, -1, 1))) / (15 * DEG);
  }

  // split a lat/lon polyline into screen runs on the visible (or hidden) hemisphere, cutting exactly at the limb
  function runs(pts, lon0, back) {
    const out = [];
    let cur = null, prev = null;
    for (let i = 0; i < pts.length; i++) {
      const v = vec(pts[i][0], pts[i][1], lon0);
      const vis = back ? v[2] < 0 : v[2] >= 0;
      if (prev) {
        const pvis = back ? prev[2] < 0 : prev[2] >= 0;
        if (vis !== pvis) {
          const f = prev[2] / (prev[2] - v[2]);
          let x = lerp(prev[0], v[0], f), y = lerp(prev[1], v[1], f);
          const n = Math.hypot(x, y) || 1;
          const q = scr(x / n, y / n);
          if (cur) {
            cur.push(q);
            if (cur.length > 1) out.push(cur);
            cur = null;
          } else cur = [q];
        }
      }
      if (vis) (cur || (cur = [])).push(scr(v[0], v[1]));
      prev = v;
    }
    if (cur && cur.length > 1) out.push(cur);
    return out;
  }

  // linear densify in lat/lon so long edges follow the sphere
  function densify(pts, step = 1.5, closed = false) {
    const src = closed ? pts.concat([pts[0]]) : pts;
    const out = [];
    for (let i = 0; i < src.length - 1; i++) {
      const [a0, o0] = src[i], [a1, o1] = src[i + 1];
      const n = Math.max(1, Math.ceil(Math.hypot(a1 - a0, (o1 - o0) * Math.cos(((a0 + a1) / 2) * DEG)) / step));
      for (let k = 0; k < n; k++) out.push([lerp(a0, a1, k / n), lerp(o0, o1, k / n)]);
    }
    out.push(src[src.length - 1]);
    return out;
  }

  // ---------------------------------------------------------------------------
  // Coastlines, hand-authored as [lat, lon] (south and west negative)
  //   coast: the stroked coastline; close: extra vertices that only close the land polygon (behind the limb or
  //   along coasts not drawn). A land without close is a closed ring.
  // ---------------------------------------------------------------------------

  const GREENLAND = [[83.5, -35], [83, -25], [81.5, -12], [80, -17], [78, -18.5], [76.5, -18.5], [74.7, -19.5], [73, -22],
    [71.5, -21.8], [70.3, -22.5], [69, -25], [68.2, -29], [67, -33], [65.6, -37.5], [64.5, -40], [63, -41.5], [61, -42.8],
    [60, -44], [60.5, -46], [61.5, -48.5], [63, -50.5], [64.5, -51.5], [66.5, -53.5], [68.5, -53], [69.5, -51], [70.5, -54],
    [72, -55.5], [74, -57], [75.5, -60], [76.5, -67], [77.5, -71], [78.5, -72.5], [79.5, -67], [80.5, -64], [81.5, -60],
    [82.2, -50], [83, -42]];
  const ICELAND = [[66.5, -16], [66.2, -14.5], [65.3, -13.6], [64.3, -14.9], [63.8, -17], [63.4, -19.5], [63.8, -22.7],
    [64.8, -22], [65.5, -24], [66.4, -23], [66.1, -20]];
  const BAFFIN = [[73.5, -80], [72, -72], [70, -68], [68, -66], [66.5, -61.8], [64.5, -64.5], [63, -65], [62, -66.5],
    [63.5, -72], [65, -74], [66.5, -73], [68, -75], [70, -79], [72, -85]];
  const NEWFOUNDLAND = [[51.6, -55.5], [49.5, -53.5], [47.6, -52.7], [46.7, -53.2], [47.6, -56], [47.6, -59.3], [49, -58.4],
    [50.5, -57.4]];
  const CUBA = [[23.1, -82.5], [23.2, -81], [22.9, -79.5], [21.5, -77.5], [20.7, -75], [20.2, -74.2], [19.9, -75.7],
    [19.9, -77.7], [21.5, -79.5], [21.9, -81.7], [21.8, -84.9], [22.7, -83.3]];
  const HISPANIOLA = [[19.9, -72.8], [19.7, -70], [18.5, -68.4], [18.2, -70.5], [18.2, -72.7], [18.5, -74.4]];
  // the Americas, from Hudson Bay down the east coast, round Cape Horn and up the Pacific side to Baja
  const AMERICAS = [[61, -94], [58.8, -94.2], [57, -92], [55.5, -86], [54.5, -82.3], [52, -79.5], [55, -77.3], [58, -77],
    [60.5, -78], [62.5, -77.5], [61.5, -74], [60.5, -70], [58.5, -67.5], [60.3, -64.6], [58.5, -62.8], [56.5, -61.3],
    [55, -59], [53.5, -56], [52.2, -55.7], [51.5, -57], [50.2, -60], [50, -66.5], [49, -68.5], [48.5, -64.5], [47, -65],
    [46, -64], [45.3, -61], [44.5, -63.5], [43.5, -65.8], [45, -67], [43.7, -70], [42.5, -70.8], [41.7, -70], [41.5, -71.5],
    [40.6, -74], [39, -74.8], [38.8, -75.1], [37, -76], [35.2, -75.5], [34.5, -77], [33.5, -79], [32, -80.8], [30.5, -81.4],
    [28.5, -80.6], [26.5, -80], [25.2, -80.4], [25.9, -81.7], [27.8, -82.7], [29.7, -83.6], [30.1, -85.6], [30.4, -88],
    [29.1, -89.3], [29.6, -91.5], [29.7, -94], [28, -97], [25.9, -97.2], [23, -97.8], [21, -97.3], [19, -95.9], [18.5, -94.5],
    [18.6, -91.8], [19.8, -90.5], [21.5, -90], [21.4, -87.1], [18.5, -87.7], [16, -88.5], [15.8, -86], [15.9, -84],
    [13.5, -83.5], [11, -83.7], [9.5, -82.3], [9.5, -79.5], [8.7, -77.4], [9.4, -76], [10.8, -75.3], [11.2, -74],
    [12.4, -71.7], [11.5, -70], [11, -68], [10.6, -66], [10.1, -64], [10.7, -62], [9.8, -61], [8.5, -59.8], [6.8, -58],
    [5.8, -55], [5.5, -53], [4.2, -51.6], [1.8, -50], [0, -50], [-1, -48.5], [-0.8, -46], [-2.3, -43], [-2.9, -40],
    [-4, -38.3], [-5.1, -36], [-7.5, -34.8], [-10, -36], [-13, -38.8], [-16, -39], [-19, -39.7], [-21.5, -40.9], [-23, -43.5],
    [-23.8, -46], [-25.5, -48.4], [-28.5, -48.8], [-31, -50.8], [-33.7, -53.4], [-34.9, -56], [-34.5, -58.4], [-36.3, -57],
    [-38.2, -57.7], [-39, -62], [-41, -62.8], [-42.5, -64.5], [-45, -65.7], [-47, -67.5], [-49.5, -68], [-51.6, -69],
    [-53, -68.4], [-54.8, -65.2], [-55.2, -67.5], [-55, -70], [-53.5, -73], [-50, -75.5], [-46, -75], [-42, -74],
    [-37, -73.5], [-33, -71.7], [-28, -71], [-23, -70.5], [-18.3, -70.3], [-15, -75.5], [-12, -77.2], [-8, -79.5],
    [-5, -81.2], [-2.3, -80.5], [1, -80], [3.5, -77.5], [7, -77.8], [8.5, -79.5], [7.2, -80.5], [8, -82.5], [9.5, -85],
    [11.5, -86.5], [13.2, -88], [13.9, -91.5], [15.8, -94], [16, -97], [17, -100], [18.2, -103.5], [20.5, -105.4],
    [23, -106.5], [26, -109.3], [30, -114.7], [34, -120.5], [38, -123], [42, -124.3], [48, -124.7], [54, -130],
    [58, -137], [60, -146], [57, -156], [55, -163], [60, -165], [66, -168], [70.5, -160], [71.3, -156.5], [70, -142],
    [69.5, -133], [69.8, -125], [68.5, -115], [68, -108], [67.5, -98], [64.5, -88]];
  // Europe and the Middle East: Kola, Norway, the Baltic, the Atlantic coast, the north shore of the Mediterranean,
  // the Levant, the Red Sea and Arabia
  const EURASIA = [[69.5, 33], [71, 28], [70.5, 22], [69.5, 18], [68, 14], [66.5, 13], [64.5, 10.5], [63, 7.5], [61.5, 5],
    [59.5, 5.3], [58, 7], [58.5, 9.5], [59.5, 10.5], [57.8, 11.8], [56, 12.6], [55.4, 13], [56, 14.5], [57, 16.5],
    [58.5, 16.8], [59.5, 18.7], [61, 17.2], [63, 18.5], [65.5, 22.3], [64.5, 24.5], [62, 21.3], [60.5, 22.5], [60.2, 25],
    [60.4, 29], [59.5, 28], [59.4, 24], [58, 22], [57, 21], [56, 21], [54.5, 19.5], [54.5, 16.5], [54, 14], [54.3, 11],
    [55, 10], [57.5, 10.5], [57, 8.5], [55.5, 8.1], [53.5, 8.5], [53.5, 6], [52.5, 4.6], [51.3, 3.5], [50.9, 1.6], [50, 1.5],
    [49.7, 0], [49.4, -1], [49.7, -1.9], [48.7, -1.6], [48.7, -4.5], [47.8, -4.3], [47.3, -2.4], [46, -1.2], [44.5, -1.3],
    [43.4, -1.8], [43.5, -5], [43.6, -8], [42.9, -9.3], [41, -8.7], [38.7, -9.5], [37, -9], [37, -7.4], [36.1, -5.6],
    [36.7, -4.2], [36.8, -2], [37.6, -0.7], [39.5, -0.3], [40.8, 1], [41.3, 2.2], [42.4, 3.2], [43.3, 3.5], [43.5, 5],
    [43.1, 6.2], [43.7, 7.4], [44.4, 8.8], [43.8, 10.3], [42.4, 11.2], [41.2, 13], [40, 15.6], [38.2, 15.6], [39, 17],
    [40.5, 17.2], [40, 18.4], [41, 17], [42.5, 14.5], [44, 12.4], [45.5, 12.3], [45.7, 13.7], [44.8, 13.9], [43, 17],
    [41.8, 19.5], [40, 19.9], [38.6, 21.1], [36.7, 21.8], [36.5, 22.9], [38, 24], [39.5, 22.8], [40.3, 22.6], [40.9, 24.5],
    [40.8, 26.5], [40.2, 26.3], [39.2, 26.7], [38.3, 26.3], [37, 27.5], [36.6, 29], [36.2, 30.5], [36.8, 31.5], [36.1, 33.5],
    [36.8, 35], [36.6, 36.2], [35, 35.9], [33, 35.1], [31.5, 34.4], [29.5, 34.9], [27, 35.8], [24, 37.8], [21, 39.2],
    [17, 42.5], [13, 43.4], [12.7, 45], [14, 48.5], [15.5, 52], [17, 54.5], [18.5, 56.6], [21, 58.8], [22.5, 59.8], [24, 57],
    [26.4, 56.3], [25.5, 55.2], [24, 52], [25.8, 50.6], [27, 49.7], [29.5, 48], [30.5, 47.8]];
  const EURASIA_CLOSE = [[30, 50], [27, 56], [25.5, 62], [25, 66], [40, 80], [73, 80], [72, 55], [69, 40]];
  const BRITAIN = [[58.6, -3], [57.7, -2], [56, -3], [55, -1.5], [53.6, 0.1], [52.9, 1.6], [51.4, 1.4], [50.8, 0.3],
    [50.6, -1.3], [50.3, -4], [50, -5.5], [51.2, -4.2], [51.5, -3], [52.1, -4.8], [53.3, -4.5], [53.5, -3], [54.7, -3.5],
    [55.5, -4.8], [56.5, -5.8], [57.6, -5.8], [58.5, -5]];
  const IRELAND = [[55.2, -7.3], [54.6, -5.6], [53.3, -6.1], [52.2, -6.4], [51.5, -9.6], [52.2, -10.2], [53.3, -9.9],
    [54.3, -10], [55.2, -8.3]];
  const AFRICA = [[31.2, 32.3], [31.5, 30], [30.9, 28.5], [31.5, 25.2], [32.8, 22.5], [32.5, 20.5], [30.3, 19.5], [31.2, 17.5],
    [32.4, 15.2], [32.9, 12.5], [33.8, 11], [35.2, 11.1], [36.9, 11], [37.2, 9.7], [36.9, 8.2], [36.8, 5], [36.6, 2],
    [35.7, -0.6], [35, -2], [35.8, -5.9], [34, -6.8], [33, -8.6], [31.5, -9.8], [30.4, -9.6], [28.7, -11.2], [27.6, -13.1],
    [26, -14.5], [24, -15.9], [21.3, -17], [19.5, -16.3], [17, -16.2], [14.7, -17.5], [13.7, -16.8], [12, -16.8],
    [11, -15.2], [9.5, -13.4], [8.4, -13.2], [7, -11.5], [6, -10], [4.4, -7.5], [5, -5.5], [5.3, -3.5], [5, -1.8],
    [5.8, 0.5], [6.3, 2.5], [6.4, 4.5], [4.3, 6], [4.5, 7.5], [4.2, 9], [2.5, 9.8], [0, 9.4], [-2, 9.5], [-4.5, 11.6],
    [-6, 12.3], [-8.8, 13.3], [-12.4, 13.6], [-15.8, 11.8], [-17.3, 11.8], [-21, 13.4], [-23, 14.4], [-26.5, 15.1],
    [-28.6, 16.5], [-31, 17.7], [-33, 18], [-34.3, 18.5], [-34.8, 20], [-34, 22.5], [-34, 25.5], [-33.2, 27.5],
    [-31.5, 29.7], [-29, 32], [-26.5, 32.9], [-25, 33.5], [-23.5, 35.5], [-21, 35.3], [-19.8, 34.8], [-17, 38.5],
    [-15.5, 40.6], [-12, 40.5], [-8, 39.4], [-4.5, 39.3], [-2, 41], [0, 42.5], [2, 45.3], [4.5, 47.8], [8, 50],
    [10.5, 51.2], [11.8, 51.1], [11.2, 49], [10.4, 45.5], [11.7, 43.5], [12.6, 43.3], [15.2, 41], [18, 38.5], [20.8, 37.2],
    [22.5, 36.5], [24, 35.6], [26, 34.6], [28, 33.5], [29.9, 32.5]];
  const MADAGASCAR = [[-12, 49.3], [-15.5, 50.3], [-19, 48.8], [-23, 47.6], [-25.5, 45.2], [-23.5, 43.6], [-21.3, 43.7],
    [-17, 44.4], [-15.7, 46.3], [-13.4, 48.3]];
  // Antarctica, round the whole continent west to east; the Weddell Sea is the deep bay at 30 to 60 W
  const ANTARCTICA = [[-77.5, -180], [-78, -165], [-77, -150], [-75, -140], [-74, -128], [-74, -115], [-73.5, -103],
    [-72.5, -95], [-73, -85], [-72, -75], [-69, -72], [-67, -68.5], [-65, -64], [-63.3, -57], [-64.5, -58], [-66, -61],
    [-68, -65], [-71, -62], [-74, -61], [-77, -58], [-78.5, -50], [-78, -40], [-76, -30], [-74, -20], [-71.5, -12],
    [-70.5, 0], [-70, 10], [-69.8, 20], [-69, 30], [-68, 40], [-67.5, 50], [-66.5, 60], [-67.5, 70], [-69.5, 75], [-67, 80],
    [-66.5, 90], [-66, 100], [-66, 110], [-66.5, 120], [-66.5, 130], [-67, 140], [-68.5, 150], [-70, 160], [-71.5, 170],
    [-77.5, 180]];
  // monotonic in longitude, for the land test only: [lon, coast latitude]
  const ANT_TEST = [[-180, -77.5], [-150, -77], [-128, -74], [-103, -73.5], [-85, -73], [-72, -72], [-66, -70], [-62, -66],
    [-58, -64], [-50, -78.5], [-40, -78], [-30, -76], [-20, -74], [-12, -71.5], [0, -70.5], [20, -69.8], [40, -68],
    [60, -66.5], [80, -67], [100, -66], [140, -67], [160, -70], [180, -77.5]];
  // the December pack-ice edge round the Weddell sector (lat, lon)
  const PACK = [[-60, -75], [-61.5, -65], [-60.5, -55], [-58.5, -45], [-58, -35], [-59, -25], [-60.5, -15], [-61.5, -5],
    [-62, 5], [-63, 15], [-63.5, 25], [-64, 35]];

  const LANDS = [
    { coast: GREENLAND },
    { coast: ICELAND },
    { coast: BAFFIN },
    { coast: NEWFOUNDLAND },
    { coast: CUBA },
    { coast: HISPANIOLA },
    { coast: AMERICAS },
    { coast: EURASIA, close: EURASIA_CLOSE },
    { coast: BRITAIN },
    { coast: IRELAND },
    { coast: AFRICA },
    { coast: MADAGASCAR },
  ];

  // the two Atlantic gyres the S-shaped track rides: centre, radii (deg lat, deg lon), sense (+1 clockwise from above)
  const GYRES = [
    { la: 33, lo: -42, ra: 13, ro: 26, dir: 1 },
    { la: -25, lo: -15, ra: 12, ro: 22, dir: -1 },
  ];

  // ---------------------------------------------------------------------------
  // The route: G4 southbound, colony to the North Atlantic stopover, to the split at 10 N, the Africa leg, on to the
  // Weddell Sea wintering centre (-65, -30). Waypoints are indices into ROUTE.
  // ---------------------------------------------------------------------------

  const COLONY = [74.7, -20.5];
  // the first leg swings south-west and hooks east into the stopover, as in Egevang 2010
  const ROUTE = [COLONY, [69, -27], [60, -35], [51, -39.5], [47, -34], [36, -29], [22, -25], [10, -23], [5, -15], [0, -5],
    [-10, 5], [-22, 10], [-33, 12], [-39, 5], [-50, -10], [-62, -25], [-65, -30]];
  const WAYPOINTS = [0, 4, 7, 16];
  // the North Atlantic stopover area (G4): 41 to 53 N, 41 to 27 W
  const STOPOVER = [[41, -41], [53, -41], [53, -27], [41, -27]];

  // ---------------------------------------------------------------------------
  // Memoized t-independent geometry
  // ---------------------------------------------------------------------------

  function pip(poly, lo, la) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const yi = poly[i][0], xi = poly[i][1], yj = poly[j][0], xj = poly[j][1];
      if (yi > la !== yj > la && lo < ((xj - xi) * (la - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  function antLat(lo) {
    let i = 0;
    while (i < ANT_TEST.length - 2 && ANT_TEST[i + 1][0] < lo) i++;
    const [x0, y0] = ANT_TEST[i], [x1, y1] = ANT_TEST[i + 1];
    return lerp(y0, y1, clamp((lo - x0) / (x1 - x0)));
  }

  // offset a lat/lon polyline by d degrees to one side (sgn), measured on the local tangent plane
  function offsetLL(pts, d, sgn) {
    const n = pts.length, out = [];
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 2)], b = pts[Math.min(n - 1, i + 2)];
      const c = Math.cos(pts[i][0] * DEG);
      let tx = (b[1] - a[1]) * c, ty = b[0] - a[0];
      const tl = Math.hypot(tx, ty) || 1;
      tx /= tl;
      ty /= tl;
      // normal to the right of travel (east-north plane): (ty, -tx)
      const nx = ty * sgn, ny = -tx * sgn;
      out.push([pts[i][0] + ny * d, pts[i][1] + (nx * d) / Math.max(0.2, c)]);
    }
    return out;
  }
  function signedArea(poly) {
    let s = 0;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const c = Math.cos(((poly[i][0] + poly[j][0]) / 2) * DEG);
      s += (poly[j][1] * c) * poly[i][0] - (poly[i][1] * c) * poly[j][0];
    }
    return s / 2;
  }

  let GEO = null;
  function geo() {
    if (GEO) return GEO;
    const lands = LANDS.map((ld) => {
      const ring = !ld.close;
      const coast = densify(ld.coast, 1.2, ring);
      const poly = ld.coast.concat(ld.close || []);
      // counter-clockwise in (east, north) means the land lies to the left of travel, so the sea is to the right
      const sgn = signedArea(poly) > 0 ? 1 : -1;
      const shelf = offsetLL(coast, 1.3, sgn);
      return { coast, poly, shelf, ring };
    });
    const ant = densify(ANTARCTICA, 1.5, false);
    const antShelf = ant.map(([la, lo]) => [la + 1.6, lo]);
    const pack = densify(PACK, 1.2, false);
    const isLand = (la, lo) => {
      if (la < antLat(lo)) return true;
      for (const ld of lands) if (pip(ld.poly, lo, la)) return true;
      return false;
    };
    // stipple fixed to the sphere: land dots in the band the globe ever shows, and an even field for the twilight
    const r = L.rng(sd('dots'));
    const land = [];
    for (let i = 0; i < 15000; i++) {
      const lo = -128 + r() * 216;
      const la = Math.asin(r() * 2 - 1) / DEG;
      const k = r();
      if (isLand(la, lo)) land.push([la, lo, k]);
    }
    const r2 = L.rng(sd('twilight'));
    const field = [];
    for (let i = 0; i < 7000; i++) {
      const lo = -128 + r2() * 216;
      const la = Math.asin(r2() * 2 - 1) / DEG;
      field.push([la, lo, r2()]);
    }
    // graticule, 15 degrees
    const meridians = [];
    for (let lo = -180; lo < 180; lo += 15) {
      const m = [];
      for (let la = -90; la <= 90; la += 2) m.push([la, lo]);
      meridians.push({ lo, pts: m });
    }
    const parallels = [];
    for (let la = -75; la <= 75; la += 15) {
      const q = [];
      for (let lo = -180; lo <= 180; lo += 2) q.push([la, lo]);
      parallels.push({ la, pts: q });
    }
    const circle = (la) => {
      const q = [];
      for (let lo = -180; lo <= 180; lo += 2) q.push([la, lo]);
      return q;
    };
    const special = { cancer: circle(OBL), capricorn: circle(-OBL), arctic: circle(POLAR), antarctic: circle(-POLAR) };
    // gyres as lat/lon ellipses
    const gyres = GYRES.map((g) => {
      const q = [];
      for (let k = 0; k <= 72; k++) {
        const a = (k / 72) * TAU * g.dir;
        q.push([g.la + Math.sin(a) * g.ra, g.lo + Math.cos(a) * g.ro]);
      }
      return q;
    });
    // route, densified, with cumulative angular length and the waypoint fractions
    const route = [];
    const wpIdx = [];
    for (let i = 0; i < ROUTE.length - 1; i++) {
      if (WAYPOINTS.includes(i)) wpIdx.push(route.length);
      const seg = densify([ROUTE[i], ROUTE[i + 1]], 1, false);
      for (let k = 0; k < seg.length - 1; k++) route.push(seg[k]);
    }
    wpIdx.push(route.length);
    route.push(ROUTE[ROUTE.length - 1]);
    const cum = [0];
    for (let i = 1; i < route.length; i++) {
      const a = vec(route[i - 1][0], route[i - 1][1], 0), b = vec(route[i][0], route[i][1], 0);
      cum.push(cum[i - 1] + Math.acos(clamp(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], -1, 1)));
    }
    const total = cum[cum.length - 1];
    const wpFrac = wpIdx.map((i) => cum[i] / total);
    GEO = { lands, ant, antShelf, pack, land, field, meridians, parallels, special, gyres, route, cum, total, wpFrac };
    return GEO;
  }

  // position along the route at fraction f: [lat, lon, heading index]
  function routeAt(g, f) {
    const target = clamp(f) * g.total;
    let i = 1;
    while (i < g.cum.length - 1 && g.cum[i] < target) i++;
    const a = g.route[i - 1], b = g.route[i];
    const u = clamp((target - g.cum[i - 1]) / (g.cum[i] - g.cum[i - 1] || 1));
    return [lerp(a[0], b[0], u), lerp(a[1], b[1], u), i];
  }
  // route vertices up to fraction f (ending exactly at f), or from f to the end
  function routeCut(g, f, tail) {
    const target = clamp(f) * g.total;
    const [la, lo, i] = routeAt(g, f);
    if (tail) return [[la, lo]].concat(g.route.slice(i));
    const out = g.route.slice(0, i).filter((_, k) => g.cum[k] <= target);
    out.push([la, lo]);
    return out;
  }

  // ---------------------------------------------------------------------------
  // Drawing helpers
  // ---------------------------------------------------------------------------

  // a schematic line: thin, even, boiling on the 12 fps clock
  function sl(ctx, pts, o) {
    if (!pts || pts.length < 2) return;
    L.inkPath(
      ctx,
      pts,
      Object.assign(
        { width: 1.5, color: LAV, alpha: 0.6, wobble: 0.6, tremble: 0.1, boilAmp: 0.5, taper: [3, 3], minWidth: 0.55, widthJitter: 0.1, swell: 0, rough: 0.1, step: 3 },
        o
      )
    );
  }

  function strokeP(ctx, p, color, alpha, width, dash) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha *= alpha;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (dash) ctx.setLineDash(dash);
    ctx.stroke(p);
    ctx.restore();
  }

  function fillP(ctx, p, color, alpha) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.globalAlpha *= alpha;
    ctx.fill(p);
    ctx.restore();
  }

  // boil jitter for hand-built Path2D geometry
  const jit = (i, k, bi, amp = 0.45) => (L.h3(i, k * 31 + 7, bi * 13 + SEED) - 0.5) * 2 * amp;

  // add screen runs to a Path2D, boiling
  function addRuns(p, rs, bi, k, amp = 0.35) {
    for (let r = 0; r < rs.length; r++) {
      const run = rs[r];
      for (let i = 0; i < run.length; i++) {
        const x = run[i][0] + jit(i + r * 97, k, bi, amp), y = run[i][1] + jit(i + r * 97, k + 1, bi, amp);
        if (i === 0) p.moveTo(x, y);
        else p.lineTo(x, y);
      }
    }
  }

  function lengthOf(pts) {
    let s = 0;
    for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    return s;
  }
  // first fraction u of a screen polyline, by arc length
  function cut(pts, u) {
    if (u >= 1) return pts;
    if (u <= 0 || pts.length < 2) return [];
    const target = lengthOf(pts) * u;
    const out = [pts[0]];
    let acc = 0;
    for (let i = 1; i < pts.length; i++) {
      const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      if (acc + d >= target) {
        const f = d ? (target - acc) / d : 0;
        out.push([lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f)]);
        break;
      }
      out.push(pts[i]);
      acc += d;
    }
    return out;
  }
  function quadPts(x0, y0, cx, cy, x1, y1, n = 40) {
    const out = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n, v = 1 - u;
      out.push([v * v * x0 + 2 * u * v * cx + u * u * x1, v * v * y0 + 2 * u * v * cy + u * u * y1]);
    }
    return out;
  }
  function arcPts(cx, cy, r, a0, a1, step = 5) {
    const n = Math.max(2, Math.ceil((Math.abs(a1 - a0) * r) / step));
    const out = [];
    for (let i = 0; i <= n; i++) {
      const a = lerp(a0, a1, i / n);
      out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    return out;
  }

  // radial ticks along an arc, boiling; dir +1 outward, -1 inward
  function tickArc(ctx, cx, cy, r, o) {
    const n = o.n;
    const a0 = o.a0 != null ? o.a0 : 0;
    const span = o.span != null ? o.span : TAU;
    const full = Math.abs(span - TAU) < 1e-6;
    const dir = o.dir || 1;
    const bi = o.bi || 0;
    const minor = new Path2D();
    const major = new Path2D();
    const count = full ? n : n + 1;
    for (let i = 0; i < count; i++) {
      const a = a0 + (i / n) * span + jit(i, 1, bi, 0.002);
      const isMajor = o.major && i % o.major === 0;
      const len = (isMajor ? o.majorLen : o.len) * dir;
      const c = Math.cos(a), s = Math.sin(a);
      const r0 = r + jit(i, 2, bi, 0.4), r1 = r + len + jit(i, 3, bi, 0.5);
      const tgt = isMajor ? major : minor;
      tgt.moveTo(cx + c * r0, cy + s * r0);
      tgt.lineTo(cx + c * r1, cy + s * r1);
    }
    strokeP(ctx, minor, o.color || LAV, o.alpha != null ? o.alpha : 0.5, o.width || 1.2);
    if (o.major) strokeP(ctx, major, o.majorColor || o.color || WHITE, o.majorAlpha != null ? o.majorAlpha : 0.6, o.majorWidth || 1.5);
  }

  // small open ring glyph
  function ring(ctx, x, y, r, color, alpha, width, dash) {
    const p = new Path2D();
    p.arc(x, y, r, 0, TAU);
    strokeP(ctx, p, color, alpha, width, dash);
  }

  // ===========================================================================
  // CANONICAL cycleRing — copied verbatim from src/scenes/02-egg-blueprint.js. Never edit a copy.
  //   stage    0 egg, 1 chick, 2 flight, 3 migration: the arc being lit now; 4 = all four arcs complete
  //   progress 0..1, how far the lit arc has filled (clockwise from its start)
  //   bi       boil index, L.boil(info.T)
  // Ring radius 44 at (900, 300); four arcs with 10-degree gaps from 12 o'clock clockwise.
  // Base arcs lavender 40 % 2 px, finished arcs lavender 70 %, the lit arc lineWhite 3 px with a glow dot
  // of radius 5 on its leading end. Draws on a navy plate; honours the caller's ctx.globalAlpha for fades.
  // ===========================================================================
  function cycleRing(ctx, L, stage, progress, bi) {
    const P = L.pal;
    const CX = 900, CY = 300, R = 44;
    const D = Math.PI / 180;
    const pr = progress < 0 ? 0 : progress > 1 ? 1 : progress;
    const arcA = (q) => [(-90 + q * 90 + 5) * D, (-90 + (q + 1) * 90 - 5) * D];
    ctx.save();
    const a0 = ctx.globalAlpha;
    ctx.lineCap = 'round';
    // plate, so the grid and anything behind never shows through the arcs
    ctx.beginPath();
    ctx.arc(CX, CY, 64, 0, 2 * Math.PI);
    ctx.fillStyle = P.navy;
    ctx.globalAlpha = a0 * 0.92;
    ctx.fill();
    ctx.fillStyle = P.navyLight;
    ctx.globalAlpha = a0 * 0.35;
    ctx.fill();
    ctx.strokeStyle = P.lavender;
    ctx.lineWidth = 1;
    ctx.globalAlpha = a0 * 0.28;
    ctx.stroke();
    ctx.globalAlpha = a0;
    L.ticks(ctx, CX, CY, { r: 53, n: 48, len: 4, major: 12, majorLen: 8, color: P.lavender, alpha: 0.3, width: 1 });
    // the four stage arcs
    for (let q = 0; q < 4; q++) {
      const [s, e] = arcA(q);
      const done = stage >= 4 || q < stage;
      ctx.beginPath();
      ctx.arc(CX, CY, R, s, e);
      ctx.strokeStyle = P.lavender;
      ctx.lineWidth = 2;
      ctx.globalAlpha = a0 * (done ? 0.7 : 0.4);
      ctx.stroke();
    }
    // radial ticks in the four gaps, so the split into stages reads at phone size
    ctx.beginPath();
    for (let q = 0; q < 4; q++) {
      const a = (-90 + q * 90) * D;
      ctx.moveTo(CX + Math.cos(a) * 39, CY + Math.sin(a) * 39);
      ctx.lineTo(CX + Math.cos(a) * 49, CY + Math.sin(a) * 49);
    }
    ctx.strokeStyle = P.lavender;
    ctx.lineWidth = 1.2;
    ctx.globalAlpha = a0 * 0.5;
    ctx.stroke();
    // the lit arc and its glow dot
    if (stage >= 0 && stage < 4) {
      const [s, e] = arcA(stage);
      const ae = s + (e - s) * pr;
      if (pr > 0) {
        ctx.beginPath();
        ctx.arc(CX, CY, R, s, ae);
        ctx.strokeStyle = P.lineWhite;
        ctx.lineWidth = 3;
        ctx.globalAlpha = a0;
        ctx.stroke();
      }
      ctx.globalAlpha = a0;
      L.glowDot(ctx, CX + Math.cos(ae) * R, CY + Math.sin(ae) * R, 5, { rays: 4, rayLen: 2.6, glow: 4, rot: (bi % 2) * 45 * D, seed: 4401, boil: bi });
    }
    // centre pip
    ctx.beginPath();
    ctx.arc(CX, CY, 3, 0, 2 * Math.PI);
    ctx.fillStyle = P.lavender;
    ctx.globalAlpha = a0 * 0.5;
    ctx.fill();
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // 1 Plate and guides
  // ---------------------------------------------------------------------------

  const NODE_L = { x: 168, y: 1408, r: 52 };
  const NODE_R = { x: 882, y: 1408, r: 52 };

  function drawPlate(ctx, bi, u) {
    L.blueprint(ctx, { center: [G.x, G.y], circles: 0, diagonals: 0, seed: 12 });
    // two long diagonals crossing at the globe centre
    const diag = new Path2D();
    diag.moveTo(G.x - 1100, G.y - 1100 * 1.3);
    diag.lineTo(G.x + 1100, G.y + 1100 * 1.3);
    diag.moveTo(G.x + 1100, G.y - 1100 * 1.3);
    diag.lineTo(G.x - 1100, G.y + 1100 * 1.3);
    strokeP(ctx, diag, LAV, 0.11, 1);
    // guide circles and their 5-degree tick ring
    L.guideCircle(ctx, G.x, G.y, 470, { alpha: 0.16, width: 1.5 });
    L.guideCircle(ctx, G.x, G.y, 520, { alpha: 0.1, width: 1, dash: [2, 8] });
    L.guideCircle(ctx, G.x, G.y, 610, { alpha: 0.08, width: 1 });
    tickArc(ctx, G.x, G.y, 470, { n: 72, len: 7, major: 3, majorLen: 15, color: LAV, alpha: 0.22, majorColor: LAV, majorAlpha: 0.34, width: 1, majorWidth: 1.3, bi });
    // construction: the equator extended across the frame, the frame axis, the tropic and polar-circle heights
    const cons = new Path2D();
    cons.moveTo(0, G.y);
    cons.lineTo(1080, G.y);
    strokeP(ctx, cons, LAV, 0.1, 1);
    const axis = new Path2D();
    axis.moveTo(G.x, 110);
    axis.lineTo(G.x, 1800);
    strokeP(ctx, axis, LAV, 0.08, 1, [10, 8]);
    const lvl = new Path2D();
    for (const la of [OBL, -OBL, POLAR, -POLAR]) {
      const y = G.y - G.r * Math.sin(la * DEG);
      const x0 = G.x - G.r * Math.cos(la * DEG);
      lvl.moveTo(92, y);
      lvl.lineTo(x0 - 30, y);
    }
    strokeP(ctx, lvl, LAV, 0.14, 1, [2, 6]);
    // left ruler
    const rule = new Path2D();
    const majorRule = new Path2D();
    rule.moveTo(60, 230);
    rule.lineTo(60, 1530);
    for (let y = 240, i = 0; y <= 1520; y += 20, i++) {
      const tgt = i % 5 === 0 ? majorRule : rule;
      tgt.moveTo(60, y + jit(i, 5, bi, 0.3));
      tgt.lineTo(60 + (i % 5 === 0 ? 20 : 9), y + jit(i, 6, bi, 0.3));
    }
    strokeP(ctx, rule, LAV, 0.3, 1);
    strokeP(ctx, majorRule, LAV, 0.45, 1.3);
    // tick ruler along the bottom at y 1660, with registration crosses under its ends
    const RY = 1660, RX0 = 100, RX1 = 980;
    const rl = new Path2D();
    const rlMaj = new Path2D();
    rl.moveTo(RX0, RY);
    rl.lineTo(RX1, RY);
    for (let x = RX0, i = 0; x <= RX1 + 0.1; x += 30, i++) {
      const maj = i % 5 === 0;
      const tgt = maj ? rlMaj : rl;
      tgt.moveTo(x + jit(i, 61, bi, 0.3), RY);
      tgt.lineTo(x + jit(i, 62, bi, 0.3), RY + (maj ? 24 : 12));
    }
    strokeP(ctx, rl, LAV, 0.3, 1.5);
    strokeP(ctx, rlMaj, LAV, 0.35, 1.5);
    const rf = new Path2D();
    for (let x = RX0 + 15, i = 0; x <= RX1; x += 30, i++) {
      rf.moveTo(x, RY);
      rf.lineTo(x, RY + 5 + jit(i, 63, bi, 0.4));
    }
    strokeP(ctx, rf, LAV, 0.2, 1);
    const reg = new Path2D();
    for (const x of [RX0, RX1]) {
      const y = 1760;
      reg.moveTo(x - 18, y);
      reg.lineTo(x + 18, y);
      reg.moveTo(x, y - 18);
      reg.lineTo(x, y + 18);
      reg.moveTo(x + 9, y);
      reg.arc(x, y, 9, 0, TAU);
    }
    strokeP(ctx, reg, LAV, 0.4, 1.2);
    // the globe-width bracket below the globe, with extension lines from the limb
    L.bracket(ctx, G.x - G.r, 1306, G.x + G.r, 1306, { p: u, alpha: 0.45, cap: 16 });
    const ext = new Path2D();
    ext.moveTo(G.x - G.r, G.y + 20);
    ext.lineTo(G.x - G.r, 1320);
    ext.moveTo(G.x + G.r, G.y + 20);
    ext.lineTo(G.x + G.r, 1320);
    strokeP(ctx, ext, LAV, 0.13, 1, [2, 5]);
  }

  // ---------------------------------------------------------------------------
  // 2 Far side
  // ---------------------------------------------------------------------------

  function drawFarSide(ctx, g, lon0, bi) {
    const p = new Path2D();
    for (const m of g.meridians) addRuns(p, runs(m.pts, lon0, true), bi, 10, 0.3);
    for (const q of g.parallels) addRuns(p, runs(q.pts, lon0, true), bi, 12, 0.3);
    strokeP(ctx, p, LAV, 0.07, 1, [2, 7]);
  }

  // ---------------------------------------------------------------------------
  // 3-4 Disc, day wash, night
  // ---------------------------------------------------------------------------

  // the terminator: the great circle perpendicular to s. Returns the visible half (screen points, from +u to -u),
  // the hidden half, the night polygon (visible half closed along the night limb) and the axis ends
  function terminator(s) {
    const n = Math.hypot(s[0], s[1]) || 1;
    const u = [s[1] / n, -s[0] / n, 0];
    let v = [s[1] * u[2] - s[2] * u[1], s[2] * u[0] - s[0] * u[2], s[0] * u[1] - s[1] * u[0]];
    if (v[2] < 0) v = [-v[0], -v[1], -v[2]];
    const front = [], back = [];
    const N = 96;
    for (let k = 0; k <= N; k++) {
      const th = (k / N) * Math.PI;
      const c = Math.cos(th), sn = Math.sin(th);
      front.push(scr(c * u[0] + sn * v[0], c * u[1] + sn * v[1]));
      back.push(scr(c * u[0] - sn * v[0], c * u[1] - sn * v[1]));
    }
    // night limb from -u back to +u through the side facing away from the sun
    const aU = Math.atan2(-u[1], u[0]); // screen angle of +u (y down)
    const aNight = Math.atan2(s[1], -s[0]); // screen angle of -s projected
    let a1 = aU + Math.PI, span = Math.PI;
    // choose the sweep direction whose middle lands on the night side
    const mid = a1 + span / 2;
    if (Math.cos(mid - aNight) < 0) span = -Math.PI;
    const night = front.slice();
    const M = 80;
    for (let k = 1; k < M; k++) {
      const a = a1 + (k / M) * span;
      night.push([G.x + Math.cos(a) * G.r, G.y + Math.sin(a) * G.r]);
    }
    return { front, back, night, uEnd: scr(u[0], u[1]), uEnd2: scr(-u[0], -u[1]) };
  }

  function drawDisc(ctx) {
    const d = new Path2D();
    d.arc(G.x, G.y, G.r, 0, TAU);
    fillP(ctx, d, NAVY, 0.9);
    fillP(ctx, d, P.navyLight, 0.3);
  }

  function drawDayWash(ctx, s, term) {
    const sx = G.x + G.r * s[0], sy = G.y - G.r * s[1];
    ctx.save();
    ctx.beginPath();
    ctx.arc(G.x, G.y, G.r, 0, TAU);
    L.tracePath(ctx, term.night, true);
    ctx.clip('evenodd');
    ctx.globalCompositeOperation = 'lighter';
    const gr = ctx.createRadialGradient(sx, sy, 0, sx, sy, 560);
    gr.addColorStop(0, L.rgba(GLOW, 0.2));
    gr.addColorStop(0.35, L.rgba(GLOW, 0.1));
    gr.addColorStop(0.75, L.rgba(GLOW, 0.035));
    gr.addColorStop(1, L.rgba(GLOW, 0));
    ctx.fillStyle = gr;
    ctx.fillRect(G.x - G.r, G.y - G.r, G.r * 2, G.r * 2);
    ctx.restore();
  }

  function drawNight(ctx, s, term) {
    // depth of night at a screen point: 0 on the terminator, 1 at the antisolar point
    const depth = (x, y) => {
      const n = nAt(x, y);
      return clamp(-(n[0] * s[0] + n[1] * s[1] + n[2] * s[2]));
    };
    ctx.save();
    ctx.beginPath();
    L.tracePath(ctx, term.night, true);
    ctx.fillStyle = NAVY;
    ctx.globalAlpha = 0.6;
    ctx.fill();
    ctx.restore();
    L.hatch(ctx, term.night, {
      angle: -Math.PI / 4,
      spacing: 8,
      width: 1.1,
      color: LAV,
      alpha: 0.42,
      length: [22, 70],
      gap: [3, 8],
      density: (x, y) => 0.45 + 0.55 * sstep(0, 0.25, depth(x, y)),
      seed: sd('night'),
    });
    L.hatch(ctx, term.night, {
      angle: -105 * DEG,
      spacing: 7,
      width: 1,
      color: LAV,
      alpha: 0.24,
      length: [16, 48],
      gap: [3, 9],
      density: (x, y) => sstep(0.3, 0.7, depth(x, y)),
      seed: sd('night-x'),
    });
  }

  function drawTwilight(ctx, g, lon0, s, bi) {
    const near = new Path2D(), far = new Path2D();
    for (let i = 0; i < g.field.length; i++) {
      const [la, lo, k] = g.field[i];
      const v = vec(la, lo, lon0);
      if (v[2] < 0.02) continue;
      const d = v[0] * s[0] + v[1] * s[1] + v[2] * s[2];
      if (d > 0.07 || d < -0.16) continue;
      const w = d > 0 ? 1 - d / 0.07 : 1 + d / 0.16;
      if (k > w) continue;
      const [x, y] = scr(v[0], v[1]);
      const rr = 0.8 + 0.9 * w;
      const tgt = w > 0.6 ? near : far;
      const px = x + jit(i, 40, bi, 0.5), py = y + jit(i, 41, bi, 0.5);
      tgt.moveTo(px + rr, py);
      tgt.arc(px, py, rr, 0, TAU);
    }
    fillP(ctx, near, PALE, 0.55);
    fillP(ctx, far, PALE, 0.3);
  }

  // ---------------------------------------------------------------------------
  // 5 Graticule
  // ---------------------------------------------------------------------------

  function drawGraticule(ctx, g, lon0, dec, bi) {
    const p = new Path2D();
    for (const m of g.meridians) addRuns(p, runs(m.pts, lon0, false), bi, 20);
    for (const q of g.parallels) if (q.la !== 0) addRuns(p, runs(q.pts, lon0, false), bi, 22);
    strokeP(ctx, p, LAV, 0.3, 1);
    // the equator, a step brighter
    const eq = g.parallels.find((q) => q.la === 0);
    const pe = new Path2D();
    addRuns(pe, runs(eq.pts, lon0, false), bi, 24);
    strokeP(ctx, pe, LAV, 0.5, 1.4);
    // tropics and polar circles, dashed; the polar circle of the lit pole brightens with the season
    const tr = new Path2D();
    addRuns(tr, runs(g.special.cancer, lon0, false), bi, 26);
    addRuns(tr, runs(g.special.capricorn, lon0, false), bi, 28);
    strokeP(ctx, tr, LAV, 0.42, 1.2, [7, 6]);
    const ac = new Path2D(), aa = new Path2D();
    addRuns(ac, runs(g.special.arctic, lon0, false), bi, 30);
    addRuns(aa, runs(g.special.antarctic, lon0, false), bi, 32);
    strokeP(ctx, ac, LAV, 0.42, 1.2, [3, 5]);
    strokeP(ctx, aa, LAV, 0.42, 1.2, [3, 5]);
    const kN = clamp(dec / OBL), kS = clamp(-dec / OBL);
    if (kN > 0) strokeP(ctx, ac, WHITE, 0.75 * kN, 1.8);
    if (kS > 0) strokeP(ctx, aa, WHITE, 0.75 * kS, 1.8);
    // the sun's parallel: where the sun stands overhead today
    const sp = [];
    for (let lo = -180; lo <= 180; lo += 2) sp.push([dec, lo]);
    const ps = new Path2D();
    addRuns(ps, runs(sp, lon0, false), bi, 34, 0.25);
    strokeP(ctx, ps, WHITE, 0.4, 1.2, [2, 5]);
  }

  function drawGyres(ctx, g, lon0, bi) {
    for (let k = 0; k < g.gyres.length; k++) {
      const rs = runs(g.gyres[k], lon0, false);
      const p = new Path2D();
      addRuns(p, rs, bi, 50 + k * 4, 0.4);
      strokeP(ctx, p, LAV, 0.2, 1.2, [10, 8]);
      // three chevrons along each loop in the sense of the flow
      const q = g.gyres[k];
      const ch = new Path2D();
      for (const f of [0.1, 0.43, 0.76]) {
        const i = Math.floor(f * (q.length - 2));
        const a = vec(q[i][0], q[i][1], lon0), b = vec(q[i + 1][0], q[i + 1][1], lon0);
        if (a[2] < 0.1) continue;
        const [x0, y0] = scr(a[0], a[1]), [x1, y1] = scr(b[0], b[1]);
        const dl = Math.hypot(x1 - x0, y1 - y0) || 1;
        const dx = (x1 - x0) / dl, dy = (y1 - y0) / dl;
        ch.moveTo(x0 - dx * 7 - dy * 5, y0 - dy * 7 + dx * 5);
        ch.lineTo(x0, y0);
        ch.lineTo(x0 - dx * 7 + dy * 5, y0 - dy * 7 - dx * 5);
      }
      strokeP(ctx, ch, LAV, 0.35, 1.3);
    }
  }

  // ---------------------------------------------------------------------------
  // 6 Land
  // ---------------------------------------------------------------------------

  function drawLandDots(ctx, g, lon0, s, bi) {
    const lit = new Path2D(), dark = new Path2D();
    for (let i = 0; i < g.land.length; i++) {
      const [la, lo, k] = g.land[i];
      const v = vec(la, lo, lon0);
      if (v[2] < 0.01) continue;
      const [x, y] = scr(v[0], v[1]);
      const d = v[0] * s[0] + v[1] * s[1] + v[2] * s[2];
      const rr = 0.75 + 0.6 * k;
      const px = x + jit(i, 44, bi, 0.35), py = y + jit(i, 45, bi, 0.35);
      const tgt = d > 0 ? lit : dark;
      tgt.moveTo(px + rr, py);
      tgt.arc(px, py, rr, 0, TAU);
    }
    fillP(ctx, lit, LAV, 0.55);
    fillP(ctx, dark, LAV, 0.25);
  }

  function drawCoasts(ctx, g, lon0, bi) {
    // shelf echo lines, one step offshore
    const sh = new Path2D();
    for (let k = 0; k < g.lands.length; k++) addRuns(sh, runs(g.lands[k].shelf, lon0, false), bi, 60 + k, 0.3);
    addRuns(sh, runs(g.antShelf, lon0, false), bi, 80, 0.3);
    strokeP(ctx, sh, LAV, 0.2, 1, [4, 4]);
    // coastlines, inked
    for (let k = 0; k < g.lands.length; k++) {
      const rs = runs(g.lands[k].coast, lon0, false);
      for (let r = 0; r < rs.length; r++) sl(ctx, rs[r], { width: 1.5, alpha: 0.62, seed: SEED + 100 + k * 13 + r });
    }
    const ra = runs(g.ant, lon0, false);
    for (let r = 0; r < ra.length; r++) sl(ctx, ra[r], { width: 1.5, alpha: 0.62, seed: SEED + 300 + r });
    // pack-ice edge round the Weddell sector: short paleBlue dashes with floe dots behind
    const pk = new Path2D();
    addRuns(pk, runs(g.pack, lon0, false), bi, 82, 0.4);
    strokeP(ctx, pk, PALE, 0.5, 1.2, [3, 4]);
  }

  // ---------------------------------------------------------------------------
  // 7-8 Terminator, outline, limb scale, axis
  // ---------------------------------------------------------------------------

  function drawTerminator(ctx, term, s, pulse) {
    // the major axis of the terminator ellipse, extended past the limb
    const [x0, y0] = term.uEnd, [x1, y1] = term.uEnd2;
    const dx = (x1 - x0) / (2 * G.r), dy = (y1 - y0) / (2 * G.r);
    const ax = new Path2D();
    ax.moveTo(x0 - dx * 70, y0 - dy * 70);
    ax.lineTo(x1 + dx * 70, y1 + dy * 70);
    strokeP(ctx, ax, LAV, 0.22, 1, [8, 6]);
    sl(ctx, term.front, { width: 2.6, color: WHITE, alpha: 0.85 + 0.15 * pulse, seed: SEED + 400 });
    // inner echo on the night side, 6 px in
    const s0 = term.front;
    const inner = [];
    for (let i = 0; i < s0.length; i++) {
      const a = s0[Math.max(0, i - 1)], b = s0[Math.min(s0.length - 1, i + 1)];
      const tl = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      inner.push([s0[i][0] - ((b[1] - a[1]) / tl) * 7, s0[i][1] + ((b[0] - a[0]) / tl) * 7]);
    }
    // the echo goes to whichever side is night: test the middle point
    const mid = inner[inner.length >> 1];
    const nm = nAt(mid[0], mid[1]);
    const useInner = nm[0] * s[0] + nm[1] * s[1] + nm[2] * s[2] < 0;
    const echo = useInner ? inner : inner.map((q, i) => [2 * s0[i][0] - q[0], 2 * s0[i][1] - q[1]]);
    sl(ctx, echo.slice(3, -3), { width: 1.2, color: LAV, alpha: 0.5, seed: SEED + 401 });
  }

  function drawOutline(ctx, bi) {
    const outer = arcPts(G.x, G.y, G.r, 0, TAU, 5);
    const inner = arcPts(G.x, G.y, G.r - 9, 0, TAU, 5);
    sl(ctx, outer, { closed: true, overlap: 6, width: 2.5, alpha: 0.85, seed: SEED + 500 });
    sl(ctx, inner, { closed: true, overlap: 6, width: 1.5, alpha: 0.5, seed: SEED + 501 });
    // latitude scale on the left limb: 5-degree ticks, 15-degree majors, tropics and polar circles in lineWhite
    const minor = new Path2D(), major = new Path2D(), spec = new Path2D();
    for (let la = -90, i = 0; la <= 90; la += 5, i++) {
      const a = la * DEG - Math.PI;
      const c = Math.cos(a), s = Math.sin(a);
      const maj = la % 15 === 0;
      const len = maj ? 16 : 8;
      const r0 = G.r + 3 + jit(i, 90, bi, 0.4);
      (maj ? major : minor).moveTo(G.x + c * r0, G.y + s * r0);
      (maj ? major : minor).lineTo(G.x + c * (r0 + len), G.y + s * (r0 + len));
    }
    for (const la of [OBL, -OBL, POLAR, -POLAR]) {
      const a = la * DEG - Math.PI;
      const c = Math.cos(a), s = Math.sin(a);
      spec.moveTo(G.x + c * (G.r + 3), G.y + s * (G.r + 3));
      spec.lineTo(G.x + c * (G.r + 26), G.y + s * (G.r + 26));
    }
    strokeP(ctx, minor, LAV, 0.45, 1.1);
    strokeP(ctx, major, LAV, 0.65, 1.5);
    strokeP(ctx, spec, WHITE, 0.7, 1.6);
    // the pole axis, dashed through the globe and past both poles, with small pole crosses
    const ax = new Path2D();
    ax.moveTo(G.x, G.y - G.r - 62);
    ax.lineTo(G.x, G.y + G.r + 62);
    strokeP(ctx, ax, LAV, 0.35, 1.2, [10, 7]);
    const pc = new Path2D();
    for (const y of [G.y - G.r, G.y + G.r]) {
      pc.moveTo(G.x - 9, y);
      pc.lineTo(G.x + 9, y);
      pc.moveTo(G.x + 5, y);
      pc.arc(G.x, y, 5, 0, TAU);
    }
    strokeP(ctx, pc, WHITE, 0.6, 1.3);
    // rotation arrow round the north end of the axis: the globe turns east
    const ry = G.y - G.r - 40;
    const rot = [];
    for (let k = 0; k <= 30; k++) {
      const a = lerp(200, 340, k / 30) * DEG;
      rot.push([G.x + Math.cos(a) * 64, ry - Math.sin(a) * 13]);
    }
    sl(ctx, rot, { width: 1.5, alpha: 0.55, seed: SEED + 510 });
    const [ex, ey] = rot[rot.length - 1], [px, py] = rot[rot.length - 3];
    const dl = Math.hypot(ex - px, ey - py) || 1;
    const ux = (ex - px) / dl, uy = (ey - py) / dl;
    const ah = new Path2D();
    ah.moveTo(ex - ux * 9 - uy * 5, ey - uy * 9 + ux * 5);
    ah.lineTo(ex, ey);
    ah.lineTo(ex - ux * 9 + uy * 5, ey - uy * 9 - ux * 5);
    strokeP(ctx, ah, LAV, 0.6, 1.5);
  }

  // the tilt: an arc between the pole axis and the top end of the terminator's major axis
  function drawTilt(ctx, term) {
    const [x0, y0] = term.uEnd, [x1, y1] = term.uEnd2;
    const top = y0 < y1 ? [x0, y0] : [x1, y1];
    const at = Math.atan2(top[1] - G.y, top[0] - G.x);
    L.arcAnnotation(ctx, G.x, G.y, G.r + 44, -Math.PI / 2, at, { color: LAV, alpha: 0.7, width: 1.5, endTicks: 10 });
    const bot = y0 < y1 ? [x1, y1] : [x0, y0];
    const ab = Math.atan2(bot[1] - G.y, bot[0] - G.x);
    L.arcAnnotation(ctx, G.x, G.y, G.r + 44, Math.PI / 2, ab, { color: LAV, alpha: 0.4, width: 1.2, endTicks: 8 });
  }

  // ---------------------------------------------------------------------------
  // 9 Sun
  // ---------------------------------------------------------------------------

  // the sun glyph stands level with the subsolar latitude on the limb scale: +-23.44 degrees is +-143 px about y 900
  const DEC_Y = (d) => G.y - G.r * Math.sin(d * DEG);
  const sunY = (s) => G.y - G.r * s[1];

  function drawSun(ctx, s, bi, u, pop) {
    const sy = sunY(s);
    // declination ruler the sun rides: solstices and equinox as majors
    const RX = 1030;
    const yA = DEC_Y(OBL) - 40, yB = DEC_Y(-OBL) + 40;
    const rl = new Path2D(), maj = new Path2D();
    rl.moveTo(RX, yA);
    rl.lineTo(RX, yB);
    for (let y = yA, i = 0; y <= yB; y += 18, i++) {
      rl.moveTo(RX, y + jit(i, 70, bi, 0.3));
      rl.lineTo(RX - 8, y + jit(i, 71, bi, 0.3));
    }
    for (const d of [OBL, 0, -OBL]) {
      const y = DEC_Y(d);
      maj.moveTo(RX + 6, y);
      maj.lineTo(RX - 22, y);
    }
    strokeP(ctx, rl, LAV, 0.4, 1.1);
    strokeP(ctx, maj, WHITE, 0.6, 1.5);
    // parallel rays onto the day side, arrowed toward the globe
    const dl = Math.hypot(SUN_X - G.x, sy - G.y);
    const dx = (SUN_X - G.x) / dl, dy = (sy - G.y) / dl; // screen direction toward the sun glyph
    const px = -dy, py = dx;
    const rays = new Path2D(), heads = new Path2D();
    for (let k = -6; k <= 6; k++) {
      const o = k * 50;
      if (Math.abs(o) > G.r - 20) continue;
      const tt = Math.sqrt(G.r * G.r - o * o);
      const bx = G.x + px * o + dx * (tt + 10), by = G.y + py * o + dy * (tt + 10);
      const len = (560 - tt) * u;
      if (len <= 0) continue;
      rays.moveTo(bx + dx * len, by + dy * len);
      rays.lineTo(bx, by);
      const hx = bx + dx * 26, hy = by + dy * 26;
      heads.moveTo(hx + dx * 8 + px * 5, hy + dy * 8 + py * 5);
      heads.lineTo(hx, hy);
      heads.lineTo(hx + dx * 8 - px * 5, hy + dy * 8 - py * 5);
    }
    strokeP(ctx, rays, LAV, 0.16, 1, [6, 7]);
    strokeP(ctx, heads, LAV, 0.35 * u, 1.2);
    // the central ray to the subsolar point
    const ssx = G.x + G.r * s[0], ssy = G.y - G.r * s[1];
    const cr = new Path2D();
    cr.moveTo(SUN_X - 20 * dx, sy - 20 * dy);
    cr.lineTo(ssx, ssy);
    strokeP(ctx, cr, WHITE, 0.3, 1.2, [3, 6]);
    // subsolar crosshair: the sun stands overhead here
    const ch = new Path2D();
    ch.moveTo(ssx - 16, ssy);
    ch.lineTo(ssx - 6, ssy);
    ch.moveTo(ssx + 6, ssy);
    ch.lineTo(ssx + 16, ssy);
    ch.moveTo(ssx, ssy - 16);
    ch.lineTo(ssx, ssy - 6);
    ch.moveTo(ssx, ssy + 6);
    ch.lineTo(ssx, ssy + 16);
    strokeP(ctx, ch, WHITE, 0.75, 1.5);
    ring(ctx, ssx, ssy, 10, WHITE, 0.5, 1.2);
    // the sun glyph with 12 ticks
    const sc = 0.8 + 0.2 * pop;
    L.glowDot(ctx, SUN_X, sy, 10 * sc, { rays: 12, rayLen: 3, glow: 6, seed: SEED + 600, boil: bi });
    L.ticks(ctx, SUN_X, sy, { r: 27 * sc, n: 12, len: 9, color: WHITE, alpha: 0.6, width: 1.5, rot: (bi % 2) * 2 * DEG });
    ring(ctx, SUN_X, sy, 22 * sc, LAV, 0.4, 1);
  }

  // ---------------------------------------------------------------------------
  // 10-11 Route and marker
  // ---------------------------------------------------------------------------

  function drawRoute(ctx, g, lon0, f, bi) {
    // ahead: faint dashes
    const ahead = new Path2D();
    addRuns(ahead, runs(densify(routeCut(g, f, true), 1, false), lon0, false), bi, 100, 0.3);
    strokeP(ctx, ahead, LAV, 0.4, 1.2, [4, 7]);
    // behind: the trail in lineWhite
    if (f > 0.001) {
      const rs = runs(routeCut(g, f, false), lon0, false);
      for (let r = 0; r < rs.length; r++) sl(ctx, rs[r], { width: 2, color: WHITE, alpha: 0.85, seed: SEED + 700 + r });
    }
    // the stopover area as a dashed lat/lon box
    const box = new Path2D();
    addRuns(box, runs(densify(STOPOVER, 1, true), lon0, false), bi, 104, 0.3);
    strokeP(ctx, box, WHITE, 0.55, 1.5, [5, 4]);
    // waypoint rings: stopover and split
    for (let k = 1; k < 3; k++) {
      const [la, lo] = routeAt(g, g.wpFrac[k]);
      const v = vec(la, lo, lon0);
      if (v[2] < 0) continue;
      const [x, y] = scr(v[0], v[1]);
      ring(ctx, x, y, 7, LAV, 0.7, 1.3);
      ring(ctx, x, y, 13, LAV, 0.25, 1, [2, 3]);
    }
    // home: Sand Island ring and cross
    const hv = vec(COLONY[0], COLONY[1], lon0);
    const [hx, hy] = scr(hv[0], hv[1]);
    ring(ctx, hx, hy, 11, WHITE, 0.7, 1.4);
    const hc = new Path2D();
    hc.moveTo(hx - 18, hy);
    hc.lineTo(hx - 13, hy);
    hc.moveTo(hx + 13, hy);
    hc.lineTo(hx + 18, hy);
    hc.moveTo(hx, hy - 18);
    hc.lineTo(hx, hy - 13);
    hc.moveTo(hx, hy + 13);
    hc.lineTo(hx, hy + 18);
    strokeP(ctx, hc, WHITE, 0.6, 1.3);
    return [hx, hy];
  }

  function drawMarker(ctx, g, lon0, f, bi) {
    const [la, lo, i] = routeAt(g, f);
    const v = vec(la, lo, lon0);
    const [x, y] = scr(v[0], v[1]);
    // heading: the route's direction here, on screen
    const a = g.route[Math.max(0, i - 1)], b = g.route[Math.min(g.route.length - 1, i)];
    const va = vec(a[0], a[1], lon0), vb = vec(b[0], b[1], lon0);
    let hx = (vb[0] - va[0]) * G.r, hy = -(vb[1] - va[1]) * G.r;
    const hl = Math.hypot(hx, hy) || 1;
    hx /= hl;
    hy /= hl;
    ring(ctx, x, y, 17, LAV, 0.55, 1.2);
    L.glowDot(ctx, x, y, 7, { rays: 8, rayLen: 2.6, glow: 5, seed: SEED + 800, boil: bi });
    const tk = new Path2D();
    tk.moveTo(x + hx * 9, y + hy * 9);
    tk.lineTo(x + hx * 24, y + hy * 24);
    strokeP(ctx, tk, NAVY, 0.8, 5.5);
    strokeP(ctx, tk, BILL, 1, 3);
    return [x, y, la];
  }

  // ---------------------------------------------------------------------------
  // 13 Network: daylight dials
  // ---------------------------------------------------------------------------

  function nodeFrame(ctx, N, u, seed, bi) {
    const p = new Path2D();
    p.arc(N.x, N.y, N.r, 0, TAU);
    fillP(ctx, p, NAVY, 0.9 * u);
    fillP(ctx, p, P.navyLight, 0.4 * u);
    sl(ctx, arcPts(N.x, N.y, N.r, -Math.PI / 2, -Math.PI / 2 + TAU * u, 4), { width: 2, alpha: 0.8, seed });
    sl(ctx, arcPts(N.x, N.y, N.r - 6, -Math.PI / 2, -Math.PI / 2 + TAU * u, 4), { width: 1.1, alpha: 0.4, seed: seed + 1 });
    tickArc(ctx, N.x, N.y, N.r + 3, { n: 48, len: 4, major: 12, majorLen: 8, color: LAV, alpha: 0.35, majorColor: LAV, majorAlpha: 0.55, width: 1, majorWidth: 1.2, bi });
  }

  // a 24-hour dial, noon at the top: lit hours as a lineWhite arc with spokes, night hours hatched
  function dial(ctx, N, hours, u, bi, pulse) {
    const FACE = 40;
    const h = clamp(hours / 24);
    const half = h * Math.PI;
    const top = -Math.PI / 2;
    // night sector hatch (short parallel strokes, clipped to the dark part of the face)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(N.x, N.y);
    ctx.arc(N.x, N.y, FACE, top + half, top + TAU - half);
    ctx.closePath();
    ctx.clip();
    const hp = new Path2D();
    for (let k = -8; k <= 8; k++) {
      const o = k * 6;
      hp.moveTo(N.x + o - 50, N.y + 50);
      hp.lineTo(N.x + o + 50, N.y - 50);
    }
    strokeP(ctx, hp, LAV, 0.3 * u, 1);
    ctx.restore();
    // lit sector: spokes every 7.5 degrees
    if (h > 0.002) {
      const sp = new Path2D();
      const n = Math.max(1, Math.round((2 * half) / (7.5 * DEG)));
      for (let k = 0; k <= n; k++) {
        const a = top - half + (k / n) * 2 * half;
        sp.moveTo(N.x + Math.cos(a) * 8, N.y + Math.sin(a) * 8);
        sp.lineTo(N.x + Math.cos(a) * (FACE - 4 + jit(k, 120, bi, 0.5)), N.y + Math.sin(a) * (FACE - 4));
      }
      strokeP(ctx, sp, WHITE, 0.35 * u, 1);
      const la = new Path2D();
      if (h >= 0.999) la.arc(N.x, N.y, FACE, 0, TAU);
      else la.arc(N.x, N.y, FACE, top - half, top + half);
      strokeP(ctx, la, WHITE, (0.9 + 0.1 * pulse) * u, 3);
    }
    // the hour ring: 24 ticks inward, the four quarters longer
    tickArc(ctx, N.x, N.y, FACE + 5, { n: 24, len: -5, major: 6, majorLen: -10, color: LAV, alpha: 0.5 * u, majorColor: WHITE, majorAlpha: 0.6 * u, width: 1, majorWidth: 1.4, bi });
    // horizon diameter
    const hz = new Path2D();
    hz.moveTo(N.x - FACE - 8, N.y);
    hz.lineTo(N.x + FACE + 8, N.y);
    strokeP(ctx, hz, LAV, 0.25 * u, 1, [3, 3]);
  }

  function drawNodes(ctx, u, bi, home, mark, dec, pulse) {
    // network lines from the globe to the dials
    const [hx, hy] = home;
    const l1 = quadPts(hx - 12, hy - 4, 40, 430, NODE_L.x, NODE_L.y - NODE_L.r - 2, 48);
    sl(ctx, cut(l1, u), { width: 1.2, alpha: 0.45, seed: SEED + 900 });
    const [mx, my] = mark;
    const l2 = quadPts(mx + 14, my + 6, lerp(mx, NODE_R.x, 0.75), my + 30, NODE_R.x - 20, NODE_R.y - NODE_R.r + 4, 32);
    sl(ctx, cut(l2, u), { width: 1.2, alpha: 0.45, seed: SEED + 901 });
    for (const [x, y] of [l1[l1.length - 1], l2[l2.length - 1]]) ring(ctx, x, y, 3, LAV, 0.8 * u, 1.2);
    // left: Sand Island's day, 24 h in June to polar night in December
    nodeFrame(ctx, NODE_L, u, SEED + 910, bi);
    dial(ctx, NODE_L, dayHours(COLONY[0], dec), u, bi, pulse);
    ring(ctx, NODE_L.x, NODE_L.y, 5, WHITE, 0.8 * u, 1.3);
    // right: the tern's day, at the marker's latitude
    nodeFrame(ctx, NODE_R, u, SEED + 920, bi);
    dial(ctx, NODE_R, dayHours(mark[2], dec), u, bi, pulse);
    L.glowDot(ctx, NODE_R.x, NODE_R.y, 4, { rays: 4, rayLen: 2.4, glow: 4, intensity: u, seed: SEED + 921, boil: bi });
    const tk = new Path2D();
    tk.moveTo(NODE_R.x - 6, NODE_R.y + 1);
    tk.lineTo(NODE_R.x - 17, NODE_R.y + 4);
    strokeP(ctx, tk, BILL, u, 2.5);
  }

  // ---------------------------------------------------------------------------
  // Scene
  // ---------------------------------------------------------------------------

  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const t = clamp(tIn, 0, info.dur);
      const bi = L.boil(info.T);
      const tw = L.onTwos(t);
      const g = geo();

      // the globe turns 10 degrees east at 24 fps (a camera-like move)
      const lon0 = lerp(LON_A, LON_B, t / info.dur);
      // the season: June until the beat, then a 12-frame swing to December
      const sw = E.inOutSine(stepK(t, B_SWING, 12));
      const dec = OBL * Math.cos(Math.PI * sw);
      const s = sunVec(dec);
      const term = terminator(s);

      // the marker hops on 8ths, on twos: one in-between drawing (55 percent of the way) two frames before the 8th,
      // landed on the 8th itself
      let f = g.wpFrac[0];
      for (let k = 0; k < 3; k++) {
        const h = tw >= HOPS[k] - 1e-6 ? 1 : tw >= HOPS[k] - 2 * FR - 1e-6 ? 0.55 : 0;
        f += (g.wpFrac[k + 1] - g.wpFrac[k]) * h;
      }

      const uIn = E.outExpo(stepK(t, 0, 6));
      const pop = E.outBack(stepK(t, 0, 3));
      const pulse = Math.max(decay(t, 0, 8), decay(t, B_SWING, 8), decay(t, B_DEC, 10));

      // 1 plate
      drawPlate(ctx, bi, uIn);
      // 2 far side
      drawFarSide(ctx, g, lon0, bi);
      // 3 disc and day wash
      drawDisc(ctx);
      drawDayWash(ctx, s, term);
      // 4 night
      drawNight(ctx, s, term);
      drawTwilight(ctx, g, lon0, s, bi);
      // 5 graticule and gyres
      drawGraticule(ctx, g, lon0, dec, bi);
      drawGyres(ctx, g, lon0, bi);
      // 6 land
      drawLandDots(ctx, g, lon0, s, bi);
      drawCoasts(ctx, g, lon0, bi);
      // 7 terminator
      drawTerminator(ctx, term, s, pulse);
      // 8 outline, limb scale, axis, tilt
      drawOutline(ctx, bi);
      drawTilt(ctx, term);
      // 9 sun
      drawSun(ctx, s, bi, uIn, pop);
      // 10 route
      const home = drawRoute(ctx, g, lon0, f, bi);
      // 11 marker, landing rings, the magenta ring on December
      const mark = drawMarker(ctx, g, lon0, f, bi);
      for (let k = 0; k < 2; k++) {
        const dk = decay(t, HOPS[k], 8);
        if (dk <= 0) continue;
        const [la, lo] = routeAt(g, g.wpFrac[k + 1]);
        const v = vec(la, lo, lon0);
        const [x, y] = scr(v[0], v[1]);
        const e = E.outExpo(1 - Math.sqrt(dk));
        ring(ctx, x, y, lerp(12, 46, e), LAV, 0.8 * Math.sqrt(dk), 2);
      }
      const dm = decay(t, B_DEC, 12);
      if (dm > 0) {
        const e = E.outExpo(clamp((t - B_DEC + FR) / (12 * FR)));
        ring(ctx, mark[0], mark[1], lerp(14, 78, e), MAG, Math.sqrt(dm), 3);
        ring(ctx, mark[0], mark[1], lerp(10, 44, e), MAG, 0.6 * dm, 1.5);
      }
      // 12 polar cap arcs: the Arctic fading, the Antarctic bright
      if (t >= B_CAPS - FR / 2) {
        const cap = POLAR * DEG; // arc half-width seen on the limb: 90 - 66.56 degrees either side of the pole
        const hw = Math.PI / 2 - cap;
        const uN = E.outExpo(stepK(t, B_CAPS, 6));
        const fadeN = lerp(0.8, 0.18, E.outExpo(stepK(t, B_CAPS + 2 * FR, 6)));
        L.arcAnnotation(ctx, G.x, G.y, G.r + 22, -Math.PI / 2 - hw, -Math.PI / 2 + hw, { color: LAV, alpha: fadeN, width: 2, p: uN, endTicks: 8 });
        L.arcAnnotation(ctx, G.x, G.y, G.r + 22, Math.PI / 2 + hw, Math.PI / 2 - hw, { color: WHITE, alpha: 1, width: 3, p: uN, endTicks: 10 });
        L.arcAnnotation(ctx, G.x, G.y, G.r + 30, Math.PI / 2 + hw, Math.PI / 2 - hw, { color: LAV, alpha: 0.5 * uN, width: 1.2, endTicks: 0 });
      }
      // 13 network and dials
      drawNodes(ctx, uIn, bi, home, mark, dec, pulse);
      // 14 cycle ring, migration arc filling over the shot
      cycleRing(ctx, L, 3, clamp(t / info.dur), bi);
    },
  });
})();
