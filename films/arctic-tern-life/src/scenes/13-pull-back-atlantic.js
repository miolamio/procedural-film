// 13 pull-back-atlantic : Pull-back, colony, fjord, Greenland, Atlantic.  T 23.5 to 26.5, illustrated.
//
// One continuous log-scale zoom out through nested drawings:
//   L1  (T 23.5) the colony on Sand Island at eye level: a display pair with a sand eel, adults and
//       juveniles on the shingle, the far shore of Young Sound, terns in the air. Its own drawing in its
//       own 1080x1920 frame, shrunk into the world as an inset card with an annYellow frame.
//   WORLD (T 24.0 to 26.5) one geography in G4 map pixels drawn at every zoom with level-of-detail:
//       L2  (T 24.0, zoom 864)  Sand Island from above, hundreds of tern dots, surf lines;
//       L3  (T 24.5, zoom 36)   Young Sound and the NE Greenland coast, mountains, floes, the ice cap;
//       L4  (T 25.0, zoom 1)    the Atlantic on G4: engraved coasts, graticule, ice cap, pack ice.
// Layers, back to front: paper; L1 open (while the world fades in around it); the world (sea, land,
// ice cap, floes, mountains, island, coasts, map furniture); the L1 card; overlays (framing rects, the
// route legs on G4, the stopover box, the wintering ring, the northbound S-track, tern glyphs).
// The camera puts the colony (74.7 N, 20.5 W) on screen at A(t) with zoom Z(t): screen = A + Z (w - colony).
// At T 25.0 Z = 1 and A = the colony's G4 pixel, so the map sits exactly on G4 from then on.
(function () {
  'use strict';

  const ID = 'pull-back-atlantic';
  const LIB = FILM.lib;
  const TAU = Math.PI * 2;
  const FW = 1080, FH = 1920;
  const FR = 1 / 24;

  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v);
  const sstep = (a, b, x) => {
    const t = clamp((x - a) / (b - a));
    return t * t * (3 - 2 * t);
  };
  const sd = (...k) => LIB.hash(ID, ...k) & 0x7fffffff;

  // ---------------------------------------------------------------------------
  // small geometry
  // ---------------------------------------------------------------------------

  function trace(ctx, pts, closed = true) {
    for (let i = 0; i < pts.length; i++) {
      if (i === 0) ctx.moveTo(pts[i][0], pts[i][1]);
      else ctx.lineTo(pts[i][0], pts[i][1]);
    }
    if (closed) ctx.closePath();
  }

  function fillPoly(ctx, pts, color, alpha = 1) {
    if (!pts || pts.length < 3) return;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    trace(ctx, pts, true);
    ctx.fill();
    ctx.restore();
  }

  function strokePath(ctx, path, color, width, alpha = 1, dash = null) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.globalAlpha *= alpha;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (dash) ctx.setLineDash(dash);
    ctx.stroke(path);
    ctx.restore();
  }

  // Sutherland-Hodgman: clip a closed polygon to an axis-aligned rectangle
  function clipPolyRect(pts, x0, y0, x1, y1) {
    let out = pts;
    const edges = [(p) => p[0] >= x0, (p) => p[0] <= x1, (p) => p[1] >= y0, (p) => p[1] <= y1];
    const cut = [
      (a, b) => [x0, lerp(a[1], b[1], (x0 - a[0]) / (b[0] - a[0]))],
      (a, b) => [x1, lerp(a[1], b[1], (x1 - a[0]) / (b[0] - a[0]))],
      (a, b) => [lerp(a[0], b[0], (y0 - a[1]) / (b[1] - a[1])), y0],
      (a, b) => [lerp(a[0], b[0], (y1 - a[1]) / (b[1] - a[1])), y1],
    ];
    for (let e = 0; e < 4; e++) {
      const inp = out;
      out = [];
      if (!inp.length) break;
      for (let i = 0; i < inp.length; i++) {
        const a = inp[(i + inp.length - 1) % inp.length], b = inp[i];
        const ina = edges[e](a), inb = edges[e](b);
        if (inb) {
          if (!ina) out.push(cut[e](a, b));
          out.push(b);
        } else if (ina) {
          out.push(cut[e](a, b));
        }
      }
    }
    return out;
  }

  // open runs of a closed ring (or open line) that fall inside a rectangle, each with one point of lead-in
  function runsInside(pts, closed, x0, y0, x1, y1) {
    const inside = (p) => p[0] >= x0 && p[0] <= x1 && p[1] >= y0 && p[1] <= y1;
    const n = pts.length;
    const runs = [];
    let start = 0;
    if (closed) {
      while (start < n && inside(pts[start])) start++;
      if (start === n) return [pts.concat([pts[0]])];
    }
    let cur = null;
    for (let c = 0; c <= n; c++) {
      if (!closed && c === n) break;
      const i = (start + c) % n;
      const p = pts[i];
      if (inside(p)) {
        if (!cur) {
          cur = [];
          if (c > 0 || closed) cur.push(pts[(i - 1 + n) % n]);
        }
        cur.push(p);
      } else if (cur) {
        cur.push(p);
        runs.push(cur);
        cur = null;
      }
    }
    if (cur) runs.push(cur);
    return runs;
  }

  function signedArea(pts) {
    let s = 0;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) s += (pts[j][0] - pts[i][0]) * (pts[j][1] + pts[i][1]);
    return s / 2;
  }

  function bboxOf(pts) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of pts) {
      if (p[0] < x0) x0 = p[0];
      if (p[1] < y0) y0 = p[1];
      if (p[0] > x1) x1 = p[0];
      if (p[1] > y1) y1 = p[1];
    }
    return [x0, y0, x1, y1];
  }
  const boxHit = (b, v) => !(b[2] < v[0] || b[0] > v[2] || b[3] < v[1] || b[1] > v[3]);

  function cumLen(pts) {
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    return cum;
  }

  // point, tangent and the drawn prefix of a polyline at arc fraction u
  function polyCut(pts, cum, u) {
    const total = cum[cum.length - 1];
    const d = clamp(u) * total;
    let i = 1;
    while (i < pts.length - 1 && cum[i] < d) i++;
    const a = pts[i - 1], b = pts[i];
    const seg = cum[i] - cum[i - 1] || 1;
    const f = clamp((d - cum[i - 1]) / seg);
    const p = [lerp(a[0], b[0], f), lerp(a[1], b[1], f)];
    return { p, tx: (b[0] - a[0]) / seg, ty: (b[1] - a[1]) / seg, prefix: pts.slice(0, i).concat([p]) };
  }

  // seeded midpoint displacement: subdivide until each segment is shorter than target(midpoint)
  function crinkle(pts, closed, target, key, amp) {
    const r = LIB.rng(sd('crinkle', key));
    const out = [pts[0]];
    const n = pts.length;
    const segs = closed ? n : n - 1;
    const rec = (a, b, depth) => {
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const l = Math.hypot(dx, dy);
      const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      if (depth > 15 || l <= target(m) || l < 1e-6) {
        out.push(b);
        return;
      }
      const d = (r() * 2 - 1) * amp * Math.min(l, 10);
      const mm = [m[0] - (dy / l) * d, m[1] + (dx / l) * d];
      rec(a, mm, depth + 1);
      rec(mm, b, depth + 1);
    };
    for (let i = 0; i < segs; i++) rec(pts[i], pts[(i + 1) % n], 0);
    if (closed) out.pop();
    return out;
  }

  // ---------------------------------------------------------------------------
  // G4 projection and the colony
  // ---------------------------------------------------------------------------

  const gx = (lon) => 540 + (lon + 20) * 8.6;
  const gy = (lat) => 880 - lat * 8.6;
  const LL = (p) => [gx(p[0]), gy(p[1])]; // [lon, lat] -> G4 px
  const LATLON = (p) => [gx(p[1]), gy(p[0])]; // (lat, lon) as the storyboard writes it -> G4 px
  const COL = [gx(-20.5), gy(74.7)]; // Sand Island colony: (535.7, 237.58)
  const dCol = (p) => Math.hypot(p[0] - COL[0], p[1] - COL[1]);

  // ---------------------------------------------------------------------------
  // Coastlines, [lon, lat]. Hand-authored outlines; the east Greenland coast around the colony is
  // written in G4 pixels (FJORD) so Young Sound and Sand Island sit where the zoom needs them.
  // ---------------------------------------------------------------------------

  // Young Sound: the north shore runs west from the mouth to the fjord head, the south shore back east.
  const FJORD = [
    [544.2, 234.4], [542.6, 235.6], [540.6, 236.5], [538.4, 236.75], [536.2, 236.8], [533.6, 236.6], [531.0, 236.0],
    [528.4, 235.4], [526.0, 235.2], [524.0, 235.7], [522.8, 236.7], [524.0, 237.6], [526.2, 238.1], [528.6, 238.5],
    [531.2, 238.7], [533.8, 238.65], [536.4, 238.6], [538.8, 238.8], [540.8, 239.6], [541.6, 241.0],
  ];

  const GREENLAND = [
    [-33, 83.6], [-27, 83.3], [-22, 82.9], [-17, 82.2], [-12, 81.6], [-11.5, 81.2], [-14.5, 80.6], [-17.5, 80.1],
    [-19.5, 79.4], [-19.2, 78.6], [-18.2, 78.0], [-18.8, 77.2], [-19.5, 76.6], [-18.4, 76.1], [-18.9, 75.6], [-19.3, 75.3],
    'FJORD',
    [-20.6, 73.8], [-21.3, 73.3], [-22.1, 72.8], [-21.9, 72.2], [-22.4, 71.6], [-21.9, 71.1], [-22.3, 70.6],
    [-24.5, 70.9], [-27.5, 71.2], [-28.2, 70.8], [-26, 70.35], [-23.5, 70.3], [-22.4, 70.1],
    [-22.6, 69.6], [-24.5, 69.3], [-27, 68.6], [-30, 68.2], [-32.5, 68.0], [-34.5, 66.8], [-36.5, 66.0], [-38.5, 65.6],
    [-40.2, 64.8], [-40.8, 63.8], [-41.8, 62.8], [-42.6, 61.6], [-43, 60.6], [-43.9, 59.8],
    [-45.3, 60.2], [-46.5, 60.8], [-48.3, 61.4], [-49.6, 62.4], [-50.6, 63.6], [-51.8, 64.4], [-52.6, 65.6], [-53.6, 66.6],
    [-53.8, 67.8], [-52.8, 68.6], [-54.2, 69.3], [-51.2, 70.2], [-54.6, 70.9], [-55.6, 71.8], [-55.2, 72.8], [-56.8, 73.8],
    [-58.2, 75.0], [-60.8, 75.9], [-64, 76.2], [-67.5, 76.2], [-70.5, 76.8], [-72.8, 77.6], [-71.5, 78.4], [-73, 78.9],
    [-70, 79.7], [-66, 80.4], [-62.5, 81.2], [-57, 82.0], [-51, 82.3], [-45, 82.8], [-39, 83.3],
  ];

  const ICECAP = [
    [-38, 82.2], [-30, 82], [-24, 81.2], [-22, 80], [-22.5, 78.5], [-22, 77], [-22.3, 76], [-21.9, 75.2], [-21.8, 74.5],
    [-22.4, 73.6], [-24, 72.6], [-25, 71.8], [-29, 71.8], [-30, 70.5], [-29, 69.5], [-32, 69], [-36, 67.5], [-39, 66.2],
    [-41.5, 65], [-42.5, 63.5], [-43.8, 62], [-44.5, 61], [-46, 61.3], [-48, 62.3], [-49.5, 63.8], [-50, 65.5], [-50.3, 67.5],
    [-50, 69.5], [-50.5, 70.8], [-52.5, 72.3], [-54, 74], [-56, 75.5], [-60, 76.8], [-65, 77.6], [-66, 79], [-62, 80.5],
    [-55, 81.3], [-46, 81.8],
  ];

  const ICELAND = [
    [-22.7, 66.4], [-21, 66.2], [-18.5, 66.2], [-16.2, 66.5], [-14.6, 66.3], [-14.8, 65.6], [-13.6, 65.1], [-14.4, 64.5],
    [-15.8, 64.2], [-18, 63.5], [-20.2, 63.5], [-22.5, 63.8], [-22, 64.4], [-24, 64.9], [-22.3, 65.2], [-24.3, 65.6], [-23.2, 66.2],
  ];

  const N_AMERICA = [
    [-100, 18], [-97, 18.5], [-97.5, 25], [-94, 29.6], [-89, 30.2], [-84, 30], [-83, 29], [-82.6, 27.5], [-81.7, 25.9],
    [-80.4, 25.3], [-80.1, 26.8], [-80.6, 28.6], [-81.4, 30.6], [-81, 32], [-79.2, 33.2], [-77.6, 34.2], [-75.6, 35.5],
    [-76, 37], [-75.5, 38.5], [-74.2, 39.8], [-73.8, 40.6], [-71.8, 41.3], [-70, 41.7], [-70.6, 42.6], [-70.2, 43.7],
    [-68, 44.4], [-66.5, 45], [-64.5, 45.4], [-65.8, 43.6], [-63.5, 44.6], [-61, 45.2], [-60, 46], [-61.5, 46.9], [-64, 46.5],
    [-64.8, 48.5], [-66, 50.2], [-60, 50.2], [-57.2, 51.4], [-56, 52.5], [-55.8, 53.8], [-58, 54.6], [-60.5, 55.8],
    [-61.8, 57.5], [-63.5, 58.8], [-64.6, 60.3], [-67.5, 58.5], [-69.5, 59], [-70, 61], [-73, 62.2], [-77.5, 62.5],
    [-78, 60.5], [-77.3, 58.5], [-76.6, 56.5], [-79, 54.8], [-79, 52], [-82.3, 52.9], [-82.3, 55.1], [-87, 56], [-92.5, 57],
    [-94.5, 59], [-94, 61], [-91, 63], [-86, 66.5], [-88, 68.5], [-95, 70], [-104, 70], [-104, 18],
  ];

  const NEWFOUNDLAND = [
    [-59.3, 47.6], [-56, 47.6], [-53, 46.7], [-52.7, 47.8], [-53.6, 49.4], [-55.6, 49.9], [-55.5, 51.6], [-57, 51.3], [-59, 49], [-58.5, 48.5],
  ];

  const BAFFIN = [
    [-80, 73.7], [-72, 72.3], [-68, 70.5], [-67, 69.2], [-62, 67], [-64, 65.5], [-65, 63], [-68, 62.5], [-71, 63.5], [-74, 64.5],
    [-78, 64.5], [-73.5, 66.5], [-73, 68], [-77, 69.5], [-80, 70], [-88, 70], [-90, 72.5], [-85, 73.5],
  ];

  const ELLESMERE = [
    [-75, 76.3], [-78, 76.2], [-82, 76.4], [-90, 76.8], [-92, 80.5], [-85, 82.5], [-75, 83.1], [-65, 82.8], [-61.5, 82.2],
    [-66, 80.8], [-71, 79.4], [-75, 78.6], [-74, 77.2],
  ];

  const DEVON = [[-80, 74.5], [-86, 74.4], [-92, 74.8], [-92, 76], [-85, 76.3], [-80, 75.8]];

  // Europe, the Mediterranean, Africa and the Red Sea as one ring; it closes far to the east off the frame
  const EURAFRICA = [
    [70, 72], [44, 68.5], [40, 67.5], [33, 69.3], [28, 71.0], [24, 71.1], [19, 70.2], [15, 68.8], [13, 67.5], [12.5, 66],
    [10, 64], [5.5, 62.3], [5, 61], [5.3, 59.2], [6.5, 58.1], [8, 58.1], [10.5, 59.3], [11.3, 58.7], [12, 57.3], [12.8, 56],
    [14.2, 55.4], [16, 56.2], [16.6, 57.8], [18.8, 59.5], [17.3, 60.7], [17.5, 62.3], [21, 64.2], [22.2, 65.8], [24.5, 65.8],
    [25.4, 64.9], [21.5, 62.7], [21.4, 60.9], [23, 60], [26, 60.4], [29.8, 60], [28, 59.5], [23.5, 59.2], [23.4, 58.2],
    [24.4, 57.3], [21.1, 57], [21, 55.8], [19.6, 54.4], [14.2, 53.9], [11, 54.1], [10, 55], [10.6, 57.6], [8.6, 57.1],
    [8.1, 55.5], [8.6, 53.6], [7, 53.4], [4.8, 52.9], [3.5, 51.5], [1.7, 51], [1.6, 50.2], [0, 49.6], [-1.3, 49.7],
    [-1.9, 48.7], [-4.7, 48.5], [-4.3, 47.8], [-2.2, 47.2], [-1.2, 46], [-1.3, 44.3], [-1.8, 43.4], [-4.5, 43.4], [-8, 43.7],
    [-9.3, 43], [-8.8, 41.8], [-9.5, 38.7], [-8.8, 37], [-7.4, 37.2], [-6, 36.2], [-5.4, 36], [-4.4, 36.7], [-2.1, 36.8],
    [-0.4, 38.3], [0.2, 39.9], [3.2, 41.9], [3, 43.3], [4.6, 43.4], [6.5, 43.1], [8.5, 44.2], [10.3, 43.6], [12.2, 41.8],
    [15.6, 40], [16.2, 38], [17.1, 39.1], [18.5, 40.1], [16.2, 41.3], [13.9, 42.8], [12.3, 44.5], [13.7, 45.7], [14.5, 45.2],
    [15.3, 44], [17.5, 43], [19.5, 41.8], [19.3, 40.2], [21, 38.5], [22.5, 36.5], [23.3, 38], [22.9, 40.5], [24.4, 40.9],
    [26.2, 40.8], [26.4, 40.0], [26.2, 39.3], [27.2, 37.4], [28.5, 36.7], [30.6, 36.8], [32.8, 36.1], [36, 36.8], [35.9, 35],
    [35.1, 33.1], [34.4, 31.5], [32.3, 31.2], [30, 31.3], [25.2, 31.6], [20.1, 32.1], [20, 30.8], [18.3, 30.6], [15.5, 31.9],
    [11.2, 33.2], [10.1, 34.3], [11.1, 35.2], [10.3, 36.9], [9.8, 37.3], [8.6, 36.9], [5.3, 36.6], [3, 36.8], [-1, 35.6],
    [-2.2, 35.1], [-5.3, 35.9], [-5.9, 35.8], [-6.8, 34], [-9.6, 30.5], [-9.8, 29.5], [-11.8, 28], [-13.2, 27.5],
    [-14.5, 26.1], [-16.1, 24], [-17, 21.5], [-16, 19.5], [-16.5, 16.3], [-17.2, 14.7], [-16.8, 13.2], [-16.7, 12.4],
    [-15, 11], [-13.5, 9.6], [-13.2, 8.7], [-12, 7.3], [-10.7, 6.4], [-7.5, 4.4], [-4, 5.2], [-1.9, 4.8], [1.2, 6.1],
    [3.4, 6.4], [5.6, 4.5], [7, 4.4], [8.5, 4.7], [9.7, 3.4], [9.8, 1], [9.3, -1], [11.1, -3.8], [12, -5], [13.2, -8.4],
    [13.6, -11], [12.2, -14.3], [11.8, -17], [13.2, -20], [14.5, -22.9], [15.2, -27], [16.5, -28.6], [17.4, -31], [18.3, -33.8],
    [18.5, -34.4], [20, -34.8], [22.5, -34], [25.7, -34], [27.4, -33.2], [30, -31.3], [32.4, -28.6], [32.6, -26], [35.5, -24],
    [35.4, -22], [34.9, -20], [36.8, -18.2], [40.5, -15.5], [40.5, -11], [39.3, -8], [39.1, -5], [41, -2], [43, 0.5], [50, 4],
    [51.3, 11.8], [43.5, 11.6], [43.3, 12.7], [42.2, 15], [39.5, 15.7], [38.5, 18], [37.2, 21], [35.6, 23.9], [33.7, 27.3],
    [32.5, 29.9], [32.9, 29.5], [34.5, 28], [35.7, 27.3], [37.6, 24.3], [39.2, 21.5], [40.8, 19], [42.6, 16.5], [43.4, 12.8],
    [45, 12.8], [52, 15], [60, 22], [70, 30],
  ];

  const BLACK_SEA = [
    [28, 41.2], [28.6, 43.4], [29.7, 45.2], [30.9, 46.5], [33.5, 46], [32.6, 45.4], [33.5, 44.5], [36.6, 45.3], [38, 44.4],
    [40, 43.4], [41.6, 41.6], [39.5, 41], [36.5, 41.3], [35, 42], [33.3, 42], [31, 41.1], [29.2, 41.2],
  ];

  const BRITAIN = [
    [-5.7, 50.1], [-3.5, 50.3], [-1, 50.7], [1.4, 51.2], [1.7, 52.6], [0.3, 53.1], [-0.2, 54.1], [-1.5, 55.3], [-2, 56],
    [-3.2, 56.1], [-1.8, 57.5], [-3.2, 58.6], [-5, 58.6], [-6.2, 57.5], [-5.6, 56.3], [-6.3, 55.9], [-4.9, 55.1],
    [-3.2, 54.9], [-3.6, 54.2], [-2.9, 53.4], [-4.6, 53.2], [-4.1, 52.3], [-5.3, 51.8], [-3.3, 51.4], [-4.5, 51.1],
  ];
  const IRELAND = [
    [-6, 52.1], [-6.2, 53.3], [-5.6, 54.6], [-6.3, 55.3], [-7.4, 55.3], [-8.5, 54.9], [-10, 54.2], [-9.6, 53.2], [-10.2, 51.8],
    [-8.2, 51.5], [-6.3, 52.2],
  ];
  const SVALBARD = [[11, 78.9], [13.5, 78.2], [16, 76.6], [19, 77.5], [21, 78.6], [27, 79.3], [27, 80.1], [20, 80.5], [16, 80], [11.5, 79.8]];

  const S_AMERICA = [
    [-86, 11], [-83, 9.5], [-80, 9.2], [-77.5, 8.7], [-76, 9.4], [-75.2, 10.8], [-73, 11.3], [-71.6, 12.4], [-70, 12.2],
    [-68, 10.6], [-64.5, 10.2], [-61.8, 10.7], [-61, 9.9], [-59.8, 8.3], [-57.5, 6], [-54, 5.7], [-51.5, 4.2], [-50, 1.8],
    [-50.3, 0.5], [-48.5, -1.2], [-44.5, -2.4], [-41.5, -2.9], [-38.5, -3.7], [-35.3, -5.3], [-34.8, -7.5], [-35.3, -9.5],
    [-37.1, -11.1], [-38.9, -13.6], [-39.1, -17.6], [-40, -20], [-41, -22], [-42, -23], [-44.6, -23.3], [-47.9, -25.4],
    [-48.6, -28.2], [-50.3, -30.5], [-52.5, -33.1], [-53.4, -33.8], [-54.9, -34.9], [-56.4, -34.8], [-58.4, -34.3],
    [-57.5, -36.2], [-57.4, -37.8], [-58.9, -38.6], [-62, -39], [-62.2, -40.7], [-65, -40.9], [-64.3, -42.3], [-65, -44],
    [-67.5, -46], [-66, -47.5], [-67.6, -49.4], [-69, -51], [-68.4, -52.4], [-68.6, -53.5], [-65.3, -54.8], [-67.3, -55.2],
    [-69.8, -55.3], [-71.6, -54.2], [-74, -52.5], [-75.3, -50], [-74.5, -47.5], [-75.6, -46.6], [-73.8, -45.5], [-73.1, -42],
    [-73.7, -40], [-73.3, -37.5], [-72, -35], [-71.5, -32], [-71.3, -28.5], [-70.5, -25], [-70.2, -21], [-70.3, -18.3],
    [-71.4, -17.6], [-75, -15.4], [-76.3, -13.6], [-77.8, -11], [-79.3, -8], [-81.2, -5.8], [-81, -4.2], [-80.2, -3.5],
    [-80, -2.2], [-80.9, -1], [-80, 0.8], [-79, 1.6], [-78.8, 2.8], [-77.5, 4], [-77.4, 6.6], [-78, 7.5], [-79.5, 8.3],
    [-80.5, 7.3], [-82, 8.2], [-83, 8.5], [-86, 8],
  ];

  const CUBA = [[-84.9, 21.9], [-82.8, 22.7], [-80, 23.1], [-77.5, 21.8], [-74.2, 20.2], [-77.7, 19.9], [-80.5, 21.8], [-83.2, 22]];
  const HISPANIOLA = [[-74.4, 18.4], [-72, 19.9], [-68.4, 18.6], [-71.4, 17.6]];

  const ANTARCTICA = [
    [-95, -72], [-90, -72], [-80, -73], [-75, -71.5], [-68, -70], [-67, -67], [-64.5, -65], [-62.5, -64], [-57, -63.3],
    [-57, -64], [-60, -66], [-62, -68.5], [-61.5, -71], [-61, -74], [-60, -75.5], [-55, -76.5], [-48, -77.8], [-40, -77.8],
    [-35, -78], [-30, -76], [-25, -75.5], [-20, -74], [-15, -72.5], [-10, -71], [-5, -70.5], [0, -70], [5, -70], [10, -70],
    [15, -70], [20, -70], [25, -70], [30, -69.5], [35, -69.5], [40, -69], [45, -67.8], [50, -66.8], [60, -66], [60, -95], [-95, -95],
  ];

  // small islands as ellipses [lon, lat, rx deg, ry deg]
  const ISLETS = [
    [-24.3, 16.6, 0.25, 0.2], [-23.6, 15.1, 0.3, 0.2], [-22.9, 16.1, 0.2, 0.2], [-25, 17, 0.3, 0.2], [-24.7, 14.9, 0.15, 0.15],
    [-25.5, 37.8, 0.35, 0.15], [-28.3, 38.5, 0.3, 0.12], [-27.2, 38.7, 0.25, 0.1], [-31.2, 39.4, 0.15, 0.1],
    [-15.5, 28, 0.25, 0.2], [-16.6, 28.3, 0.3, 0.2], [-13.7, 28.9, 0.25, 0.3], [-17.9, 27.7, 0.15, 0.15], [-17, 32.7, 0.25, 0.12],
    [-59.3, -51.7, 1.6, 0.5], [-36.8, -54.4, 1.0, 0.25], [-45.5, -60.6, 0.8, 0.2], [-58.5, -62.1, 1.2, 0.25],
    [14, 37.5, 1.3, 0.7], [9, 40, 0.6, 1.0], [9.1, 42.2, 0.4, 0.5], [24.9, 35.3, 1.3, 0.25], [33.2, 35.1, 0.9, 0.3],
    [-77.3, 18.1, 0.8, 0.25], [-66.4, 18.2, 0.8, 0.2], [-61, 14.4, 0.2, 0.3], [-61.3, 15.9, 0.2, 0.2], [-60.9, 10.4, 0.4, 0.3],
    [5.5, 3.5, 0.3, 0.3],
  ];

  // islands off the colony, written in G4 pixels: [cx, cy, rx, ry, rot]
  const NEAR_ISLES = [
    [545.2, 238.3, 1.2, 0.8, 0.3], [556.0, 229.5, 3.0, 1.9, -0.4], [547.4, 236.3, 0.35, 0.22, 0.1], [543.6, 244.2, 0.8, 0.45, 0.6],
    [549.4, 244.9, 0.5, 0.3, 0.0], [530.2, 237.5, 0.2, 0.12, 0.0],
  ];

  // Sand Island from above, written in L2 pixels (zoom 864, colony at screen 540, 960)
  const SAND_L2 = [
    [250, 1010], [282, 958], [340, 925], [420, 900], [500, 882], [590, 868], [680, 860], [760, 857], [830, 866], [872, 893],
    [880, 935], [852, 970], [790, 996], [720, 1015], [640, 1035], [560, 1052], [470, 1063], [390, 1066], [320, 1058], [270, 1040],
  ];
  const ZL2 = 864;
  const L2W = (p) => [COL[0] + (p[0] - 540) / ZL2, COL[1] + (p[1] - 960) / ZL2];

  // ---------------------------------------------------------------------------
  // the world geometry, built once
  // ---------------------------------------------------------------------------

  function ellipseRing(cx, cy, rx, ry, rot, n) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      const x = Math.cos(a) * rx, y = Math.sin(a) * ry;
      out.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]);
    }
    return out;
  }

  const WORLD = (() => {
    const rings = [];
    const add = (key, coarse, kind, target, amp) => {
      const pts = crinkle(coarse, true, target, key, amp);
      rings.push({ key, coarse, pts, kind, box: bboxOf(pts), sign: Math.sign(signedArea(coarse)) || 1 });
    };
    const mapTarget = () => 2.6;
    // Greenland: very fine near the colony, map-scale far away
    const gl = [];
    for (const p of GREENLAND) {
      if (p === 'FJORD') FJORD.forEach((q) => gl.push(q));
      else gl.push(LL(p));
    }
    add('greenland', gl, 'land', (m) => Math.min(2.2, 0.01 + 0.016 * dCol(m)), 0.09);
    add('iceland', ICELAND.map(LL), 'land', mapTarget, 0.1);
    add('namerica', N_AMERICA.map(LL), 'land', mapTarget, 0.1);
    add('newfoundland', NEWFOUNDLAND.map(LL), 'land', mapTarget, 0.1);
    add('baffin', BAFFIN.map(LL), 'land', mapTarget, 0.1);
    add('ellesmere', ELLESMERE.map(LL), 'land', mapTarget, 0.1);
    add('devon', DEVON.map(LL), 'land', mapTarget, 0.1);
    add('eurafrica', EURAFRICA.map(LL), 'land', mapTarget, 0.09);
    add('blacksea', BLACK_SEA.map(LL), 'hole', mapTarget, 0.09);
    add('britain', BRITAIN.map(LL), 'land', mapTarget, 0.1);
    add('ireland', IRELAND.map(LL), 'land', mapTarget, 0.1);
    add('svalbard', SVALBARD.map(LL), 'land', mapTarget, 0.1);
    add('samerica', S_AMERICA.map(LL), 'land', mapTarget, 0.09);
    add('cuba', CUBA.map(LL), 'land', mapTarget, 0.09);
    add('hispaniola', HISPANIOLA.map(LL), 'land', mapTarget, 0.09);
    add('antarctica', ANTARCTICA.map(LL), 'ice', mapTarget, 0.09);
    ISLETS.forEach((e, i) => add('islet' + i, ellipseRing(gx(e[0]), gy(e[1]), e[2] * 8.6, e[3] * 8.6, 0.3 * ((i % 3) - 1), 9), 'land', () => 0.8, 0.18));
    NEAR_ISLES.forEach((e, i) => add('near' + i, ellipseRing(e[0], e[1], e[2], e[3], e[4], 11), 'land', (m) => Math.min(1, 0.01 + 0.016 * dCol(m)), 0.14));
    add('sand', SAND_L2.map(L2W), 'sand', () => 0.004, 0.1);
    const byKey = {};
    rings.forEach((r) => (byKey[r.key] = r));
    const green = byKey.greenland;
    const sand = byKey.sand;

    // the ice cap in G4 px, clipped to Greenland when drawn
    const icecap = crinkle(ICECAP.map(LL), true, (m) => Math.min(2, 0.03 + 0.03 * dCol(m)), 'icecap', 0.2);
    const icecapSm = LIB.smoothPts(ICECAP.map(LL), true, 3);
    const icecapContours = [0.82, 0.62, 0.42, 0.24].map((f) => {
      const c = [gx(-40), gy(74)];
      return icecapSm.map((p) => [c[0] + (p[0] - c[0]) * f, c[1] + (p[1] - c[1]) * f]);
    });

    // engraved offsets on the sea side of every coast and hachure on the land side, in G4 px
    const LEVELS = [3.2, 6.6, 10.6, 15.4, 21];
    const offsets = LEVELS.map(() => new Path2D());
    const hachure = new Path2D();
    for (const rg of rings) {
      if (rg.kind === 'sand' || rg.key.startsWith('near')) continue;
      const src = rg.key === 'greenland' ? LIB.smoothPts(rg.coarse, true, 2.5) : LIB.smoothPts(rg.coarse, true, 2.5);
      const n = src.length;
      const out = rg.kind === 'hole' ? -rg.sign : rg.sign;
      for (let li = 0; li < LEVELS.length; li++) {
        if (rg.key.startsWith('islet') && li > 2) break;
        let pen = false;
        for (let i = 0; i <= n; i += 2) {
          const a = src[(i - 3 + n) % n], b = src[(i + 3) % n], q = src[i % n];
          const tx = b[0] - a[0], ty = b[1] - a[1];
          const tl = Math.hypot(tx, ty) || 1;
          const d = LEVELS[li] * (1 + 0.1 * LIB.noise1(i * 0.05 + li, sd('eng', rg.key))) * out;
          const x = q[0] + (ty / tl) * d, y = q[1] - (tx / tl) * d;
          if (!pen) offsets[li].moveTo(x, y);
          else offsets[li].lineTo(x, y);
          pen = true;
        }
      }
      if (rg.kind === 'ice') continue;
      // hachure: short strokes inland, every 4.5 px along the crinkled coast
      const pts = rg.pts;
      let dist = 0, next = 0;
      const inn = rg.kind === 'hole' ? rg.sign : -rg.sign;
      for (let i = 1; i <= pts.length; i++) {
        const a = pts[i - 1], b = pts[i % pts.length];
        const seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (seg < 1e-9) continue;
        const tx = (b[0] - a[0]) / seg, ty = (b[1] - a[1]) / seg;
        while (next <= dist + seg) {
          const u = (next - dist) / seg;
          const x = lerp(a[0], b[0], u), y = lerp(a[1], b[1], u);
          const l = 3.2 + 1.6 * LIB.h3(i, next | 0, 5);
          hachure.moveTo(x, y);
          hachure.lineTo(x + ty * inn * l, y - tx * inn * l);
          next += 4.5;
        }
        dist += seg;
      }
    }

    // world path of all land (even-odd, so the Black Sea is a hole) for clipping the map-level sea work
    const landWorld = new Path2D();
    for (const rg of rings) {
      trace(landWorld, rg.pts, true);
    }

    const inLand = (x, y) => {
      let inside = false;
      for (const rg of rings) {
        if (x < rg.box[0] || x > rg.box[2] || y < rg.box[1] || y > rg.box[3]) continue;
        if (LIB.polyContains(rg.pts, x, y)) inside = !inside;
      }
      return inside;
    };
    const coarseRings = rings.map((r) => r.coarse);
    const inLandCoarse = (x, y) => {
      let inside = false;
      for (const c of coarseRings) if (LIB.polyContains(c, x, y)) inside = !inside;
      return inside;
    };

    return { rings, byKey, green, sand, icecap, icecapContours, offsets, LEVELS, hachure, landWorld, inLand, inLandCoarse };
  })();

  // ---------------------------------------------------------------------------
  // world features, all in G4 px
  // ---------------------------------------------------------------------------

  // L3 mountains between the coast and the ice cap: [x, y (base centre), half width]
  const PEAKS3 = (() => {
    const r = LIB.rng(sd('peaks3'));
    const out = [];
    const cap = WORLD.icecap;
    const land = (x, y) => LIB.polyContains(WORLD.green.pts, x, y);
    // massifs: cluster centres on the ice-free strip, peaks packed around each
    const centres = [];
    for (let i = 0; i < 600 && centres.length < 34; i++) {
      const x = COL[0] + r.range(-24, 20), y = COL[1] + r.range(-28, 46);
      if (land(x, y) && !LIB.polyContains(cap, x, y)) centres.push([x, y, r.range(1.2, 3.2)]);
    }
    for (let i = 0; i < 5000 && out.length < 420; i++) {
      const c = centres[i % centres.length];
      const a = r.range(0, TAU), d = c[2] * Math.sqrt(r());
      const x = c[0] + Math.cos(a) * d * 1.3, y = c[1] + Math.sin(a) * d * 0.8;
      const w = r.range(0.28, 0.75) * (1 + 0.9 * (1 - d / c[2]) * r());
      if (!land(x, y) || !land(x - w, y) || !land(x + w, y)) continue;
      if (LIB.polyContains(cap, x, y - w)) continue;
      if (Math.abs(x - COL[0]) < 2.6 && Math.abs(y - COL[1]) < 1.3) continue;
      let clash = false;
      for (const q of out) if (Math.abs(q[0] - x) < (q[2] + w) * 0.5 && Math.abs(q[1] - y) < (q[2] + w) * 0.22) { clash = true; break; }
      if (clash) continue;
      out.push([x, y, w, r.range(0.6, 1.05), r.range(-0.25, 0.25), r()]);
    }
    return out.sort((a, b) => a[1] - b[1]);
  })();

  // map-level mountain glyph chains, [lon, lat] polylines
  const RANGES = [
    [[-78, 6], [-76, 1], [-78.5, -3], [-77, -9], [-73, -14], [-69, -18], [-68.5, -24], [-69.5, -30], [-70.2, -35], [-71.2, -40], [-72, -45], [-73, -50]],
    [[6, 60], [8, 62], [10, 63.5], [13, 65.5], [15.5, 67.5], [18, 68.8]],
    [[-7, 31], [-4, 32.5], [-1, 33.5], [3, 34.5], [7, 35]],
    [[-1, 42.8], [2, 42.6]], [[6.5, 45.8], [9, 46.3], [11.5, 46.8], [14, 47]],
    [[29.5, -30.5], [28.5, -28.8], [30.5, -26], [31, -24]], [[-43, -21], [-46, -22.5], [-49, -25]],
    [[-24, 72.8], [-25, 71.9], [-27, 69], [-31, 68.5], [-35, 66.6], [-39.5, 65.3], [-41.5, 63], [-43, 61]],
    [[-51.5, 64], [-52.8, 66], [-53.4, 67.6]], [[-60, 77.5], [-67, 78.6], [-60, 80.8]], [[-20.4, 77.5], [-20.6, 79.5]],
    [[-66, 67.5], [-70, 69.5], [-75, 71.5]], [[-66, 57.5], [-63, 55], [-61, 53.5]],
  ];
  const PEAKS_MAP = (() => {
    const r = LIB.rng(sd('peaksmap'));
    const out = [];
    for (const rg of RANGES) {
      const pts = LIB.smoothPts(rg.map(LL), false, 3);
      let acc = 0;
      for (let i = 1; i < pts.length; i++) {
        acc += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
        if (acc < 11) continue;
        acc = 0;
        out.push([pts[i][0] + r.range(-3, 3), pts[i][1] + r.range(-2, 2), r.range(4.5, 7), r.range(6, 10)]);
      }
    }
    return out.sort((a, b) => a[1] - b[1]);
  })();

  // floes near the colony, L3 scale: [x, y, radius, vx, vy, seed]
  const FLOES3 = (() => {
    const r = LIB.rng(sd('floes3'));
    const out = [];
    for (let i = 0; i < 9000 && out.length < 950; i++) {
      const x = COL[0] + r.range(-16, 34), y = COL[1] + r.range(-30, 70);
      const d = Math.hypot(x - COL[0], (y - COL[1]) * 1.6);
      if (d < 1.1) continue;
      const rad = r.range(0.05, 0.16) + (r() < 0.2 ? r.range(0.1, 0.34) : 0);
      // pack thickest along the outer coast, thinner in the fjord and far offshore
      const off = x - (548 + (y - COL[1]) * -0.25);
      if (r() > 0.4 + 0.6 * sstep(-10, 2, off) * (1 - sstep(20, 34, off))) continue;
      if (WORLD.inLand(x, y) || WORLD.inLand(x + rad, y) || WORLD.inLand(x - rad, y) || WORLD.inLand(x, y + rad) || WORLD.inLand(x, y - rad)) continue;
      out.push([x, y, rad, r.range(-0.05, 0.03), r.range(0.1, 0.2), i]);
    }
    return out;
  })();

  // brash ice around Sand Island, seen at the island zoom
  const FLOES2 = (() => {
    const r = LIB.rng(sd('floes2'));
    const out = [];
    const sand = WORLD.sand.pts;
    for (let i = 0; i < 3000 && out.length < 300; i++) {
      const x = COL[0] + r.range(-2.2, 2.6), y = COL[1] + r.range(-1.3, 1.5);
      const rad = r.range(0.004, 0.018) + (r() < 0.15 ? r.range(0.01, 0.035) : 0);
      // loose streaks drifting out of the fjord mouth
      const band = 0.5 + 0.5 * Math.sin((x - COL[0]) * 2.2 + (y - COL[1]) * 5.5);
      if (r() > 0.25 + 0.75 * band) continue;
      if (LIB.polyContains(sand, x, y)) continue;
      let near = false;
      for (let k = 0; k < sand.length; k += 4) if (Math.hypot(sand[k][0] - x, sand[k][1] - y) < 0.06) { near = true; break; }
      if (near || WORLD.inLand(x, y)) continue;
      out.push([x, y, rad, r.range(-0.012, 0.008), r.range(0.01, 0.025), i]);
    }
    return out;
  })();

  // boulders and moss on the fjord shores, fixed in G4 px so they scale with the zoom: [x, y, r, kind, seed]
  const SHORE = (() => {
    const r = LIB.rng(sd('shore'));
    const out = [];
    for (let i = 0; i < 14000 && out.length < 900; i++) {
      const x = COL[0] + r.range(-7, 7), y = COL[1] + r.range(-5, 6);
      const moss = r() < 0.3;
      const rad = moss ? r.range(0.02, 0.09) : r.range(0.008, 0.05) * (r() < 0.1 ? 2.2 : 1);
      if (!WORLD.inLand(x, y) || !WORLD.inLand(x + rad, y) || !WORLD.inLand(x - rad, y)) continue;
      if (LIB.polyContains(WORLD.sand.pts, x, y)) continue;
      out.push([x, y, rad, moss ? 1 : 0, i]);
    }
    return out;
  })();

  // icebergs and loose pack carried south by the East Greenland current, seen at the mid zooms: [x, y, r, seed]
  const BERGS = (() => {
    const r = LIB.rng(sd('bergs'));
    const out = [];
    for (let i = 0; i < 9000 && out.length < 700; i++) {
      const lat = r.range(46, 74.5), lon = r.range(-52, -8);
      const p = LL([lon, lat]);
      // dense along the east coast and round Cape Farewell, thinning out into the open Atlantic
      const coastLon = lat > 66 ? lerp(-34, -19, sstep(66, 74, lat)) : lerp(-44, -34, sstep(60, 66, lat));
      const dist = Math.abs(lon - coastLon);
      const keep = lat > 58 ? Math.exp(-dist / 5) : 0.12 * Math.exp(-(lat < 52 ? 52 - lat : 0) / 4) * Math.exp(-Math.abs(lon + 45) / 8);
      if (r() > keep) continue;
      if (WORLD.inLandCoarse(p[0], p[1])) continue;
      out.push([p[0], p[1], r.range(0.4, 1.6) * (lat > 60 ? 1 : 0.85), (r() * 12) | 0]);
    }
    return out;
  })();

  // floe outlines in unit coordinates (12 shapes, picked by seed)
  const FLOE_SHAPES = (() => {
    const out = [];
    for (let k = 0; k < 12; k++) {
      const r = LIB.rng(sd('floeshape', k));
      const n = r.int(6, 9);
      const pts = [];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + r.range(-0.2, 0.2);
        const rr = r.range(0.7, 1.08);
        pts.push([Math.cos(a) * rr, Math.sin(a) * rr * r.range(0.75, 1)]);
      }
      out.push(pts);
    }
    return out;
  })();

  // map-scale sea ice: the East Greenland current, the Arctic, and the Antarctic pack: [x, y, r]
  const PACK_EDGE = [
    [-95, -66.5], [-85, -66], [-75, -65.5], [-68, -63.5], [-62, -61.3], [-55, -60.2], [-45, -59.8], [-35, -60.1], [-25, -60.6],
    [-15, -61.4], [-5, -62.2], [5, -63], [15, -63.8], [25, -64.3], [35, -64.6], [45, -65], [60, -65],
  ].map(LL);
  const PACK_EDGE_SM = LIB.smoothPts(PACK_EDGE, false, 3);
  const packLatAt = (x) => {
    for (let i = 1; i < PACK_EDGE.length; i++) {
      if (x <= PACK_EDGE[i][0]) {
        const a = PACK_EDGE[i - 1], b = PACK_EDGE[i];
        return lerp(a[1], b[1], (x - a[0]) / (b[0] - a[0]));
      }
    }
    return PACK_EDGE[PACK_EDGE.length - 1][1];
  };
  const SEAICE_MAP = (() => {
    const r = LIB.rng(sd('seaicemap'));
    const out = [];
    for (let i = 0; i < 9000 && out.length < 2000; i++) {
      const k = r();
      let x, y, rad;
      if (k < 0.55) {
        x = r.range(-60, 1140);
        const ye = packLatAt(x);
        const u = Math.pow(r(), 0.7);
        y = ye + u * 140 + r.range(-6, 4);
        if (r() > 0.45 + 0.55 * u) continue;
        rad = r.range(1.6, 4.2) * (0.6 + 0.6 * u);
      } else if (k < 0.8) {
        x = r.range(-40, 1120);
        y = r.range(107, 200);
        rad = r.range(1.0, 2.8);
        if (r() > sstep(200, 120, y)) continue;
      } else {
        const lat = r.range(64, 81.5);
        const coast = LL([lerp(-40, -16, sstep(64, 76, lat)) + (lat > 78 ? 1.5 : 0), lat]);
        x = coast[0] + r.range(0, 34) * (0.3 + 0.7 * r());
        y = coast[1] + r.range(-4, 4);
        rad = r.range(0.9, 2.2);
      }
      if (WORLD.inLandCoarse(x, y)) continue;
      out.push([x, y, rad, (r() * 12) | 0]);
    }
    return out;
  })();

  // land stipple for the map, fixed in G4 px so it does not swim: [x, y, r]
  const LAND_DOTS = (() => {
    const out = [];
    for (let i = 0; i < 150; i++) {
      for (let j = 0; j < 66; j++) {
        const x = j * 17 + (i & 1 ? 8.5 : 0) + (LIB.h3(i, j, 41) - 0.5) * 10 - 20;
        const y = 100 + i * 11 + (LIB.h3(j, i, 43) - 0.5) * 8;
        const d = 0.22 + 0.35 * LIB.fbm2(x * 0.006, y * 0.006, sd('landtone'), 3);
        if (LIB.h3(i, j, 47) > d) continue;
        if (!WORLD.inLandCoarse(x, y)) continue;
        out.push([x, y, 0.7 + 0.6 * LIB.h3(i, j, 49)]);
      }
    }
    return out;
  })();

  // Sand Island detail (G4 px, from L2 pixels): moss, ponds, pebbles, tern dots, surf
  const ISLAND = (() => {
    const sand = WORLD.sand.pts;
    const r = LIB.rng(sd('island'));
    const blob = (cx, cy, rx, ry, rot, key) =>
      crinkle(ellipseRing(cx, cy, rx, ry, rot, 10), true, () => 3, key, 0.18).map(L2W);
    const moss = [
      blob(330, 1020, 55, 26, 0.1, 'm0'), blob(760, 900, 60, 24, -0.1, 'm1'), blob(620, 1010, 40, 18, 0.2, 'm2'),
      blob(450, 925, 36, 14, -0.15, 'm3'), blob(830, 940, 22, 14, 0.4, 'm4'),
    ];
    const ponds = [blob(700, 948, 34, 13, -0.12, 'p0'), blob(395, 985, 22, 10, 0.2, 'p1'), blob(520, 1030, 16, 7, 0, 'p2')];
    const inside = (x, y) => LIB.polyContains(sand, x, y);
    const nearPond = (x, y) => ponds.some((p) => LIB.polyContains(p, x, y));
    // terns: denser around the L1 site at the colony point and along the north beach
    const terns = [];
    for (let i = 0; i < 6000 && terns.length < 520; i++) {
      const lx = r.range(250, 880), ly = r.range(855, 1068);
      const w = L2W([lx, ly]);
      if (!inside(w[0], w[1]) || nearPond(w[0], w[1])) continue;
      const dens = 0.25 + 0.75 * Math.exp(-(((lx - 540) / 170) ** 2 + ((ly - 960) / 70) ** 2)) + 0.3 * sstep(930, 880, ly);
      if (r() > dens) continue;
      terns.push([w[0], w[1], r.range(-Math.PI, Math.PI), r(), r.int(0, 9)]);
    }
    // pebbles for the close end of the zoom (only drawn when they are big enough to read)
    const pebbles = [];
    for (let i = 0; i < 2200 && pebbles.length < 700; i++) {
      const lx = r.range(470, 610), ly = r.range(915, 1005);
      const w = L2W([lx, ly]);
      if (!inside(w[0], w[1])) continue;
      pebbles.push([w[0], w[1], r.range(0.3, 1.1) / ZL2, r.range(0.6, 1), r.range(0, Math.PI), r()]);
    }
    // surf: offsets of the island outline out into the sea
    const surf = [0.014, 0.03, 0.05, 0.075].map((d, k) => {
      const n = sand.length;
      const sg = Math.sign(signedArea(sand)) || 1;
      const out = [];
      for (let i = 0; i < n; i += 2) {
        const a = sand[(i - 3 + n) % n], b = sand[(i + 3) % n], q = sand[i];
        const tx = b[0] - a[0], ty = b[1] - a[1];
        const tl = Math.hypot(tx, ty) || 1;
        const dd = d * (1 + 0.25 * LIB.noise1(i * 0.08 + k * 3, sd('surf', k))) * sg;
        out.push([q[0] + (ty / tl) * dd, q[1] - (tx / tl) * dd]);
      }
      return out;
    });
    // flying terns over the island: loops in L2 px
    const fliers = [];
    for (let i = 0; i < 46; i++) {
      const wide = i >= 18;
      fliers.push({
        cx: wide ? r.range(-40, 1120) : r.range(220, 900), cy: wide ? r.range(80, 1840) : r.range(700, 1200),
        rx: r.range(40, 160), ry: r.range(30, 110), w: r.range(1.2, 2.4) * r.sign(), ph: r.range(0, TAU), fp: r.int(0, 3), sz: wide ? r.range(0.8, 1.15) : 1,
      });
    }
    // a feeding cloud of specks over the water off the island's east end (L2 px): terns hovering and diving
    const specks = [];
    for (let i = 0; i < 90; i++) {
      const a = r.range(0, TAU), d = Math.sqrt(r());
      specks.push({ x: 880 + Math.cos(a) * d * 230, y: 1260 + Math.sin(a) * d * 170, jx: r.range(4, 14), ph: r.int(0, 11), ang: r.range(-Math.PI, Math.PI) });
    }
    for (let i = 0; i < 40; i++) {
      const a = r.range(0, TAU), d = Math.sqrt(r());
      specks.push({ x: 180 + Math.cos(a) * d * 150, y: 560 + Math.sin(a) * d * 120, jx: r.range(4, 14), ph: r.int(0, 11), ang: r.range(-Math.PI, Math.PI) });
    }
    return { moss, ponds, terns, pebbles, surf, fliers, specks };
  })();

  // ---------------------------------------------------------------------------
  // the camera: layers land on the beats, log-scale zoom between them
  // ---------------------------------------------------------------------------

  const ZL = [6912, 864, 36, 1]; // zoom (screen px per G4 px) when L1, L2, L3 and L4 are at identity
  const BEATS = [0, 0.5, 1.0, 1.5]; // T 23.5, 24.0, 24.5, 25.0
  const A_NEAR = [540, 960];
  const K1 = 6912; // L1 local px per G4 px

  // log-zoom ease per segment: slow through each landing so the layer reads on its beat, quick between
  function segEase(i, u) {
    u = clamp(u);
    const io = 0.5 - 0.5 * Math.cos(Math.PI * u);
    if (i === 0) return lerp(u, io, 0.9);
    if (i === 1) return lerp(u, io, 0.86);
    return Math.pow(lerp(u, io, 0.9), 1.6); // linger near the fjord, then settle onto the map
  }

  function cameraAt(t) {
    t = clamp(t, 0, 1.5);
    const i = t >= 1.0 ? 2 : t >= 0.5 ? 1 : 0;
    const u = (t - BEATS[i]) / 0.5;
    const lz = Math.log(ZL[i]) + (Math.log(ZL[i + 1]) - Math.log(ZL[i])) * segEase(i, u);
    const Z = t >= 1.5 ? 1 : Math.exp(lz);
    const s0 = t >= 1.5 ? 0 : clamp(lz / Math.log(ZL2));
    const s = 1 - (1 - s0) * (1 - s0); // keep the colony low on screen through the mid zoom
    const A = s <= 0 ? [COL[0], COL[1]] : [lerp(COL[0], A_NEAR[0], s), lerp(COL[1], A_NEAR[1], s)];
    const p0 = clamp((Math.log(ZL[0]) - lz) / Math.log(ZL[0] / ZL[1]));
    return { Z, A, lz, p0, k1: Z / K1 };
  }

  const W2S = (cam, x, y) => [cam.A[0] + cam.Z * (x - COL[0]), cam.A[1] + cam.Z * (y - COL[1])];
  const mapPts = (cam, pts) => pts.map((p) => [cam.A[0] + cam.Z * (p[0] - COL[0]), cam.A[1] + cam.Z * (p[1] - COL[1])]);
  function viewW(cam, pad) {
    return [COL[0] + (-pad - cam.A[0]) / cam.Z, COL[1] + (-pad - cam.A[1]) / cam.Z, COL[0] + (FW + pad - cam.A[0]) / cam.Z, COL[1] + (FH + pad - cam.A[1]) / cam.Z];
  }
  // world transform on a context: after this, drawing in G4 px lands on screen
  function worldTransform(ctx, cam) {
    ctx.translate(cam.A[0] - cam.Z * COL[0], cam.A[1] - cam.Z * COL[1]);
    ctx.scale(cam.Z, cam.Z);
  }
  // the L1 card rectangle on screen
  const cardRect = (cam) => {
    const k = cam.k1;
    return { x: cam.A[0] - 540 * k, y: cam.A[1] - 960 * k, w: FW * k, h: FH * k };
  };

  // ---------------------------------------------------------------------------
  // L1 terns, side view (art bible 10.1, 10.6). Canonical units are mm, feet at (0, 0), facing left.
  //   o: { x, y, s (px per mm), dir (1 faces left, -1 faces right), juv, neck, billUp, droop, tailUp, open, fish, key }
  // ---------------------------------------------------------------------------

  function ternStanding(ctx, P, o, ws, lod) {
    const s = o.s;
    const T = (p) => [o.x + (o.dir > 0 ? p[0] : -p[0]) * s, o.y + p[1] * s];
    const TA = (arr) => arr.map(T);
    const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
    const neck = o.neck || 0;
    const H = [-50 - 8 * neck, -72 - 22 * neck + (o.bob || 0)];
    const h = (dx, dy) => add(H, [dx, dy]);
    const juv = !!o.juv;
    const lw = Math.max(1.4, 4.2 * (s / 1.3)) * ws;
    const key = o.key;

    // tail (behind the body)
    const tu = o.tailUp || 0;
    const tailTip = juv ? [[132, -62 - 10 * tu], [126, -52 - 8 * tu]] : [[226, -70 - 36 * tu], [218, -58 - 30 * tu]];
    const tail = [[76, -60], [110, -63 - 8 * tu], tailTip[0], [juv ? 110 : 130, -57 - 10 * tu], tailTip[1], [110, -50 - 6 * tu], [78, -45]];
    LIB.inkPath(ctx, TA(tail), { closed: true, width: lw * 0.6, fill: P.plumeWhite, seed: sd('tail', key), wobble: 0.6 * ws, taper: [4, 8], smooth: false });
    LIB.inkPath(ctx, TA([[84, -57], [tailTip[0][0] - 6, tailTip[0][1] + 1]]), { width: 1.6 * ws * (s / 1.2), color: P.mantleGrey, seed: sd('tailweb', key), taper: [2, 20], wobble: 0.3 });

    // far leg, then the silhouette
    const leg = (a, b, toe, k) => {
      LIB.inkPath(ctx, TA([a, b]), { width: Math.max(1.5, 3.2 * s) * ws, color: juv ? P.juvBill : P.legRed, seed: sd('leg', key, k), taper: 0, smooth: false, wobble: 0.2 });
      LIB.inkPath(ctx, TA([b, toe]), { width: Math.max(1.2, 2.4 * s) * ws, color: juv ? P.juvBill : P.legRed, seed: sd('toe', key, k), taper: [0, 6], smooth: false, wobble: 0.2 });
    };
    leg([9, -16], [11, 0], [0, 0.5], 1);

    const K = [-16, -60];
    const nape = h(18, -6), throat = h(-12, 14);
    const sil = [
      h(-15, -9), h(-5, -18), h(8, -17), nape,
      [(nape[0] + K[0]) / 2 + 3, (nape[1] + K[1]) / 2 + 2], K, [20, -67], [62, -63], [84, -56],
      [84, -46], [60, -30], [20, -16], [-15, -16], [-38, -28], [-47, -44],
      [(throat[0] - 47) / 2 - 3, (throat[1] - 44) / 2], throat, h(-17, 5),
    ];
    const silS = LIB.smoothPts(TA(sil), true, 3);
    LIB.inkPath(ctx, silS, { closed: true, width: lw, fill: juv ? P.plumeWhite : P.breastGrey, seed: sd('sil', key), wobble: 0.8 * ws, double: lod ? { alpha: 0.35 } : false });
    // white cheek, throat and fore-neck; white rump
    const cheek = [h(-17, 4), h(-16, -2), h(20, 3), h(17, 11), [(throat[0] - 30) / 2, (throat[1] - 40) / 2], [-44, -40], throat];
    fillPoly(ctx, LIB.smoothPts(TA(cheek), true, 4), P.plumeWhite, 0.95);
    fillPoly(ctx, TA([[66, -60], [84, -56], [84, -46], [62, -34]]), P.plumeWhite);
    if (lod) {
      const bc = T([20, -40]);
      LIB.hatch(ctx, silS, {
        angle: -Math.PI / 4, spacing: Math.max(3.5, 5.5 * (s / 1.2)) * Math.max(1, ws), width: 1.2 * ws, color: P.mantleDeep, alpha: 0.7,
        length: [8 * s, 22 * s], seed: sd('bodyh', key),
        density: (x, y) => sstep(-0.1, 0.7, (((x - bc[0]) * 0.45 + (y - bc[1])) / (34 * s))),
      });
    }

    // near leg, in front of the belly
    leg([-5, -16], [-4, 0], [-15, 0.6], 0);

    // folded wing
    const dr = o.droop || 0;
    const tip = juv ? [165 - 12 * dr, -54 + 26 * dr] : [182 - 14 * dr, -56 + 30 * dr];
    const wing = [
      [-24, -58], [-6, -68], [40, -71], [100, -65], [150, -59], tip, [140, -50 + 14 * dr], [92, -44 + 12 * dr],
      [40, -38 + 8 * dr], [2, -38 + 5 * dr], [-20, -46],
    ];
    const wingS = LIB.smoothPts(TA(wing), true, 3);
    LIB.inkPath(ctx, wingS, { closed: true, width: lw * 0.85, fill: P.mantleGrey, seed: sd('wing', key), wobble: 0.7 * ws });
    if (lod) {
      // primaries: long edges converging on the tip, tertials and covert rows as short arcs
      const pp = new Path2D();
      for (let k = 0; k < 5; k++) {
        const y0 = -58 + k * 3.2 + dr * (6 + k * 1.5);
        const a = T([70 + k * 6, y0]), b = T([tip[0] - 6 - k * 4, tip[1] + 1.4 * k - 1]);
        pp.moveTo(a[0], a[1]);
        pp.lineTo(b[0], b[1]);
      }
      for (let k = 0; k < 4; k++) {
        const c = T([10 + k * 16, -50 + dr * 5 + (k & 1) * 3]);
        const e = T([30 + k * 16, -42 + dr * 7]);
        pp.moveTo(c[0], c[1]);
        pp.quadraticCurveTo((c[0] + e[0]) / 2, c[1] + 6 * s, e[0], e[1]);
      }
      for (let k = 0; k < 7; k++) {
        const c = T([-10 + k * 9, -62 + (k & 1) * 2]);
        pp.moveTo(c[0], c[1]);
        const e = T([-4 + k * 9, -56]);
        pp.quadraticCurveTo(c[0] + (e[0] - c[0]) * 0.2, e[1], e[0], e[1]);
      }
      strokePath(ctx, pp, P.mantleDeep, 1.3 * ws, 0.85);
      LIB.hatch(ctx, wingS, {
        angle: -0.1 * (o.dir > 0 ? -1 : 1), spacing: Math.max(3, 4.5 * (s / 1.2)) * Math.max(1, ws), width: 1.1 * ws, color: P.mantleDeep,
        alpha: 0.55, length: [10 * s, 30 * s], seed: sd('wingh', key),
        density: (x, y) => { const q = T([120, -52]); return 0.8 * sstep(90 * s, 10 * s, Math.hypot(x - q[0], y - q[1])); },
      });
      // white leading edge of the folded wing
      LIB.inkPath(ctx, TA([[-20, -60], [-4, -67], [36, -69.5]]), { width: 2.2 * ws * (s / 1.2), color: P.plumeWhite, seed: sd('wlead', key), taper: [4, 14], wobble: 0.3 });
    }
    if (juv) {
      // dark carpal bar along the inner leading edge and orange-brown fringes on the mantle
      const bar = [[-22, -58], [-6, -67], [40, -70], [44, -64], [0, -61], [-16, -54]];
      fillPoly(ctx, LIB.smoothPts(TA(bar), true, 3), P.carpalBar, 0.95);
      if (lod) {
        const fr = new Path2D();
        for (let row = 0; row < 3; row++) {
          for (let k = 0; k < 7; k++) {
            const cx = 50 + k * 12 + row * 6, cy = -62 + row * 6 + dr * 5;
            if (cx > 128) continue;
            const a = T([cx - 5, cy - 2]), m = T([cx, cy + 2.5]), b = T([cx + 5, cy - 2]);
            fr.moveTo(a[0], a[1]);
            fr.quadraticCurveTo(m[0], m[1], b[0], b[1]);
          }
        }
        strokePath(ctx, fr, P.juvFringe, 2.2 * ws * (s / 1.2), 0.95);
      }
    }

    // cap and eye
    const cap = juv
      ? [h(-3, -17), h(8, -17.5), h(18, -6), h(20, 2), h(8, 2), h(-3, 0), h(-7, -5), h(-5, -12)]
      : [h(-16.5, -4), h(-15.5, -9.5), h(-5, -18.5), h(8, -17.5), h(18.5, -6), h(21, 2.5), h(8, 1.5), h(-4, 0.5), h(-12, 0.5)];
    LIB.inkPath(ctx, LIB.smoothPts(TA(cap), true, 3), { closed: true, width: 1.2 * ws, fill: P.capBlack, color: P.capBlack, seed: sd('cap', key), wobble: 0.4 });
    const eye = T(h(-5.5, -3.5));
    ctx.save();
    ctx.fillStyle = P.capBlack;
    ctx.beginPath();
    ctx.arc(eye[0], eye[1], 2.8 * s, 0, TAU);
    ctx.fill();
    ctx.fillStyle = P.white;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(eye[0] - 0.8 * s * (o.dir > 0 ? 1 : -1), eye[1] - 0.9 * s, 0.8 * s, 0, TAU);
    ctx.fill();
    ctx.restore();

    // bill: blood red to the tip on adults, black on juveniles
    const bu = o.billUp || 0;
    const bl = juv ? 26 : 31;
    const dv = [-Math.cos(bu), -Math.sin(bu)];
    const base = h(-16, 0.5);
    const btip = add(base, [dv[0] * bl, dv[1] * bl]);
    const nrm = [-dv[1], dv[0]];
    const up = add(base, [nrm[0] * -4.6, nrm[1] * -4.6]);
    const lo = add(base, [nrm[0] * 4.2, nrm[1] * 4.2]);
    const op = o.open || 0;
    const lowTip = op ? add(base, [(dv[0] * Math.cos(op) - dv[1] * Math.sin(op)) * bl * 0.95, (dv[0] * Math.sin(op) + dv[1] * Math.cos(op)) * bl * 0.95]) : btip;
    const bcol = juv ? P.juvBill : P.billRed;
    if (op) LIB.inkPath(ctx, TA([lo, base, lowTip]), { closed: true, width: 1.4 * ws, fill: bcol, seed: sd('billlo', key), smooth: false, wobble: 0.2, taper: 0 });
    LIB.inkPath(ctx, TA(op ? [up, btip, base] : [up, btip, lo]), { closed: true, width: 1.6 * ws, fill: bcol, seed: sd('bill', key), smooth: false, wobble: 0.2, taper: 0 });
    if (!juv) LIB.inkPath(ctx, TA([base, add(base, [dv[0] * bl * 0.72, dv[1] * bl * 0.72])]), { width: 1.2 * ws, color: P.billDeep, seed: sd('gape', key), taper: [0, 8], wobble: 0.2 });

    // a sand eel held crosswise in the bill tip (10.8)
    if (o.fish) {
      const c = add(btip, [-dv[0] * 5, -dv[1] * 5]);
      const ax = [nrm[0], nrm[1]];
      const L = 70;
      const body = [], back = [];
      for (let i = 0; i <= 12; i++) {
        const u = i / 12 - 0.5;
        const sag = 9 * (1 - u * u * 4) * 0 + 14 * u * u * 4 - 4;
        const wdt = 5.4 * Math.sin(Math.PI * clamp(i / 12 * 1.05 + 0.02)) + 1.0;
        const px = c[0] + ax[0] * u * L + dv[0] * sag * 0.2, py = c[1] + ax[1] * u * L + sag;
        body.push([px - nrm[1] * 0, py - wdt]);
        back.unshift([px, py + wdt]);
      }
      const fishPts = body.concat(back);
      LIB.inkPath(ctx, TA(fishPts), { closed: true, width: 1.4 * ws, fill: P.sandEel, seed: sd('fish', key), wobble: 0.3, taper: [2, 4] });
      LIB.inkPath(ctx, TA(body.slice(1, 11)), { width: 2.4 * ws * s, color: P.sandEelBack, seed: sd('fishback', key), taper: [6, 6], wobble: 0.2 });
      const tl = body[12], tb = back[0];
      LIB.inkPath(ctx, TA([tl, [tl[0] + ax[0] * 7 - 3, tl[1] + ax[1] * 7 - 4], [tb[0] + ax[0] * 6, tb[1] + ax[1] * 6 + 3], tb]), { closed: true, width: 1.1 * ws, fill: P.sandEelBack, seed: sd('fishtail', key), smooth: false, taper: 0 });
    }
  }

  // a flying adult, side view from slightly below; flap: +1 wings up, -1 down
  function ternFlying(ctx, P, x, y, s, dir, flap, key, ws) {
    const T = (p) => [x + (dir > 0 ? p[0] : -p[0]) * s, y + p[1] * s];
    const TA = (arr) => arr.map(T);
    const lw = Math.max(1.2, 3.2 * (s / 1)) * ws;
    const up = flap;
    const farTip = [60, -8 - 150 * up], farWrist = [-10, -10 - 70 * up];
    const nearTip = [80, -4 - 190 * up], nearWrist = [0, -6 - 85 * up];
    const wingPoly = (wr, tp, back) => [[-18, -6], wr, tp, [tp[0] - 24, tp[1] + (up > 0 ? 26 : -18) * 0.6], back, [30, 2]];
    const farW = wingPoly(farWrist, farTip, [30, -8 - 40 * up]);
    LIB.inkPath(ctx, LIB.smoothPts(TA(farW), true, 3), { closed: true, width: lw * 0.8, fill: P.plumeShade, seed: sd('fwf', key), wobble: 0.5 });
    // tail
    LIB.inkPath(ctx, TA([[50, -2], [150, -12], [96, 0], [140, 8], [52, 6]]), { closed: true, width: lw * 0.6, fill: P.plumeWhite, seed: sd('ftail', key), smooth: false, taper: 0 });
    // body
    const body = LIB.smoothPts(TA([[-60, -2], [-40, -12], [0, -12], [50, -6], [58, 2], [20, 12], [-30, 12], [-52, 8]]), true, 3);
    LIB.inkPath(ctx, body, { closed: true, width: lw, fill: P.breastGrey, seed: sd('fbody', key), wobble: 0.5 });
    // head and cap
    const head = LIB.ellipsePts(-66, -8, 15, 13, 18).map(T);
    LIB.inkPath(ctx, head, { closed: true, width: lw * 0.8, fill: P.plumeWhite, seed: sd('fhead', key), wobble: 0.3 });
    fillPoly(ctx, TA([[-80, -12], [-70, -21], [-56, -19], [-50, -9], [-62, -7], [-76, -8]]), P.capBlack);
    LIB.inkPath(ctx, TA([[-79, -9], [-110, -2], [-79, -3]]), { closed: true, width: 1 * ws, fill: P.billRed, seed: sd('fbill', key), smooth: false, taper: 0 });
    // near wing: white coverts, translucent primaries, thin black trailing edge on the hand
    const nearW = wingPoly(nearWrist, nearTip, [34, -4 - 40 * up]);
    const nw = LIB.smoothPts(TA(nearW), true, 3);
    LIB.inkPath(ctx, nw, { closed: true, width: lw * 0.9, fill: P.primaryGlow, seed: sd('fwn', key), wobble: 0.5 });
    const te = TA([nearWrist, nearTip, [nearTip[0] - 24, nearTip[1] + (up > 0 ? 16 : -11)]]);
    LIB.inkPath(ctx, [te[1], te[2]], { width: 2.4 * ws, color: P.capBlack, seed: sd('fte', key), taper: [2, 8], wobble: 0.3 });
    LIB.inkPath(ctx, TA([[-10, -6], [nearWrist[0] + 6, nearWrist[1] + 10 * Math.sign(up || 1)]]), { width: 1.2 * ws, color: P.mantleDeep, seed: sd('fcov', key), taper: [4, 8], wobble: 0.3 });
  }

  // ---------------------------------------------------------------------------
  // L1: the colony at eye level, drawn in its own 1080x1920 frame (world beyond the frame runs on for
  // the open phase of the zoom)
  // ---------------------------------------------------------------------------

  const L1_HORIZON = 980, L1_SHORE = 1172;
  const ridgeY = (x) => {
    const h = 70 + 58 * LIB.fbm1(x * 0.0032, sd('ridge'), 4) + 16 * LIB.noise1(x * 0.021, sd('ridge2'));
    return L1_HORIZON - Math.min(h, 104 + 6 * LIB.noise1(x * 0.05, sd('ridge3')));
  };

  const PEBBLES = (() => {
    const r = LIB.rng(sd('pebbles'));
    const out = [];
    let y = 1206;
    while (y < 4200) {
      const rad = 4 + (y - 1180) * 0.046;
      // inside the frame from the water line down; beyond it (seen only while the frame shrinks) larger stones
      const xa = rad > 11 ? -2400 : -420, xb = rad > 11 ? 3500 : 1500;
      for (let x = xa + r.range(0, rad * 2); x < xb; x += rad * r.range(1.7, 2.5)) {
        const rr = rad * r.range(0.6, 1.15);
        out.push([x, y + r.range(-rad * 0.5, rad * 0.5), rr, rr * r.range(0.55, 0.75), r.range(-0.3, 0.3), (r() * 3) | 0, r() < 0.07, r()]);
      }
      y += rad * r.range(1.05, 1.35);
    }
    return out;
  })();

  const TUFTS = (() => {
    const r = LIB.rng(sd('tufts'));
    const out = [];
    for (let i = 0; i < 70; i++) out.push([r.range(-300, 1380), r.range(1190, 1330), r.range(8, 20), r.int(4, 8), r()]);
    return out;
  })();

  // distant colony birds along the upper beach: [x, y, size, facing]
  const FAR_BIRDS = (() => {
    const r = LIB.rng(sd('farbirds'));
    const out = [];
    for (let i = 0; i < 46; i++) {
      const y = r.range(1182, 1230);
      out.push([r.range(-360, 1440), y, 3 + (y - 1180) * 0.14, r.sign(), r()]);
    }
    return out.sort((a, b) => a[1] - b[1]);
  })();

  const L1_FLOES = [[160, 1030, 90, 0], [520, 1000, 60, 1], [830, 1060, 130, 2], [1000, 1012, 50, 3], [-150, 1050, 110, 4], [1260, 1040, 90, 5]];

  function drawL1(ctx, P, V, tt, T) {
    const k = V.k;
    const ws = k >= 1 ? 1 : Math.pow(k, -0.5);
    const lod = k > 0.3 ? 1 : 0;
    const tw = LIB.onTwos(tt);
    const x0 = V.x0, x1 = V.x1, y0 = V.y0, y1 = V.y1;

    // 1. sky stripes (polarSky and stripeCream), 6 px per beat drift
    LIB.stripes(ctx, { colors: [P.stripeCream, P.polarSky], width: 140, angle: -0.52, offset: 12 * T, seed: sd('stripes'), bounds: { x: x0, y: y0, w: x1 - x0, h: L1_HORIZON + 4 - y0 } });

    // 2. the far shore of Young Sound: plateau mountains with snow in the gullies
    const ridge = [];
    const step = Math.max(8, 10 / k);
    for (let x = x0 - step; x <= x1 + step; x += step) ridge.push([x, ridgeY(x)]);
    const mount = ridge.concat([[x1 + step, L1_HORIZON + 2], [x0 - step, L1_HORIZON + 2]]);
    fillPoly(ctx, mount, LIB.mix(P.shingle, P.polarSky, 0.35));
    if (lod) {
      LIB.hatch(ctx, mount, {
        angle: -Math.PI / 4, spacing: 6, width: 1.2 * ws, color: P.shingleDeep, alpha: 0.75, length: [10, 34], seed: sd('mounth'),
        density: (x, y) => {
          const d = ridgeY(x + 6) - ridgeY(x - 6);
          return clamp(d * 0.08 + 0.15) * sstep(L1_HORIZON, ridgeY(x) + 10, y) * 0.95;
        },
      });
      // snow: lingering ledges under the plateau rim and thin streaks down the gullies
      const snow = new Path2D();
      const r = LIB.rng(sd('snow'));
      for (let i = 0; i < 90; i++) {
        const x = r.range(-600, 1700);
        const kind = r();
        if (x < x0 - 60 || x > x1 + 60) {
          r();
          r();
          r();
          continue;
        }
        const top = ridgeY(x) + r.range(3, 10);
        if (kind < 0.45) {
          // a ledge: a thin lens along the slope
          const l = r.range(18, 60), th = r.range(2, 4.5), dy = (ridgeY(x + l) - ridgeY(x)) * 0.6;
          snow.moveTo(x, top);
          snow.quadraticCurveTo(x + l * 0.5, top + dy * 0.5 - th, x + l, top + dy);
          snow.quadraticCurveTo(x + l * 0.5, top + dy * 0.5 + th, x, top);
          snow.closePath();
        } else {
          // a gully streak broken into a few patches down the slope
          const len = r.range(16, 52) * Math.min(1, (L1_HORIZON - top) / 60), wd = r.range(1.5, 3.2), wv = r.range(-6, 6);
          let yy = top;
          let seg = 0;
          while (yy < top + len && seg < 4) {
            const l = len * (0.18 + 0.2 * LIB.h3(i, seg, 11));
            const xx = x + wv * ((yy - top) / len);
            const w = wd * (1 - 0.18 * seg);
            snow.moveTo(xx, yy);
            snow.quadraticCurveTo(xx + w, yy + l * 0.5, xx + wv * 0.1, yy + l);
            snow.quadraticCurveTo(xx - w, yy + l * 0.5, xx, yy);
            snow.closePath();
            yy += l + len * 0.12;
            seg++;
          }
        }
      }
      ctx.save();
      ctx.fillStyle = P.ice;
      ctx.globalAlpha = 0.92;
      ctx.fill(snow);
      ctx.strokeStyle = P.iceDeep;
      ctx.lineWidth = 0.8 * ws;
      ctx.globalAlpha = 0.45;
      ctx.stroke(snow);
      ctx.restore();
    }
    LIB.inkPath(ctx, ridge, { width: 2.4 * ws, color: P.inkSoft, seed: sd('ridgeline'), taper: 0, wobble: 1 });

    // 3. the sound: sea band with horizontal hatching, foam streaks and drifting floes
    const sea = [[x0 - 20, L1_HORIZON], [x1 + 20, L1_HORIZON], [x1 + 20, L1_SHORE + 30], [x0 - 20, L1_SHORE + 30]];
    fillPoly(ctx, sea, P.sea);
    LIB.hatch(ctx, sea, {
      angle: 0, spacing: 7 * Math.max(1, ws * 0.8), width: 1.3 * ws, color: P.seaDeep, alpha: 0.8, length: [20, 90], gap: [6, 18], seed: sd('seah'),
      angleJitter: 0.01, flow: 0, density: (x, y) => 0.35 + 0.5 * sstep(L1_HORIZON, L1_SHORE, y),
    });
    LIB.inkLine(ctx, x0 - 20, L1_HORIZON, x1 + 20, L1_HORIZON, { width: 2.2 * ws, color: P.ink, seed: sd('horizon'), taper: 0, wobble: 0.6 });
    {
      const fp = new Path2D();
      const r = LIB.rng(sd('foam'));
      const shift = -4 * Math.floor(tw * 2);
      for (let i = 0; i < 60; i++) {
        const y = r.range(L1_HORIZON + 14, L1_SHORE - 10);
        const x = r.range(-500, 1600) + shift * (0.5 + (y - L1_HORIZON) / 200);
        if (x < x0 - 80 || x > x1 + 80) continue;
        const l = r.range(20, 70) * (0.5 + (y - L1_HORIZON) / 200);
        fp.moveTo(x, y);
        fp.quadraticCurveTo(x + l * 0.5, y - 3, x + l, y);
      }
      strokePath(ctx, fp, P.foam, 2 * ws, 0.9);
    }
    for (const [fx, fy, fw, fk] of L1_FLOES) {
      const x = fx - 8 * tw;
      if (x + fw < x0 || x - fw > x1) continue;
      const sh = FLOE_SHAPES[fk];
      const top = sh.map((p) => [x + p[0] * fw * 0.5, fy + p[1] * fw * 0.09 - fw * 0.05]);
      const side = [[x - fw * 0.48, fy - fw * 0.03], [x + fw * 0.5, fy - fw * 0.03], [x + fw * 0.46, fy + fw * 0.07], [x - fw * 0.44, fy + fw * 0.07]];
      fillPoly(ctx, side, P.iceShade);
      LIB.inkPath(ctx, top, { closed: true, width: 1.6 * ws, color: P.iceDeep, fill: P.ice, seed: sd('l1floe', fk), wobble: 0.6 });
      LIB.inkLine(ctx, x - fw * 0.44, fy + fw * 0.07, x + fw * 0.46, fy + fw * 0.07, { width: 1.4 * ws, color: P.iceDeep, seed: sd('l1floeb', fk), taper: 4 });
    }

    // 4. the shingle beach: surf at the water line, wet band, pebbles
    const shore = [];
    for (let x = x0 - step; x <= x1 + step; x += step) shore.push([x, L1_SHORE + 6 * LIB.noise1(x * 0.01, sd('shore'))]);
    const beach = shore.concat([[x1 + step, y1 + 20], [x0 - step, y1 + 20]]);
    fillPoly(ctx, beach, P.shingle);
    fillPoly(ctx, shore.concat(shore.slice().reverse().map((p) => [p[0], p[1] + 16])), P.shingleDeep, 0.35);
    const surfL = shore.map((p, i) => [p[0], p[1] - 3 - 2 * Math.sin(p[0] * 0.03 + tw * 6)]);
    LIB.inkPath(ctx, surfL, { width: 4 * ws, color: P.foam, seed: sd('surfline'), taper: 0, wobble: 1 });
    LIB.inkPath(ctx, shore, { width: 1.8 * ws, color: P.ink, alpha: 0.8, seed: sd('shoreline'), taper: 0, wobble: 0.8 });
    // stipple grit between the pebbles (screen-constant density)
    LIB.stipple(ctx, beach, { spacing: 7 / Math.min(1, k), density: 0.45, r: [1.0 * ws, 1.8 * ws], color: P.shingleDeep, alpha: 0.7, seed: sd('grit') });

    // pebbles, back row to front row so nearer stones overlap farther ones: under-shadow, body in
    // three tones, lit top, a shadow-side outline and lichen crusts; batched per row
    {
      const minR = 1.4 / k;
      const tones = [P.shingle, P.shinglePale, LIB.mix(P.shingle, P.shingleDeep, 0.4)];
      let row = null;
      const flush = () => {
        if (!row) return;
        ctx.fillStyle = P.shingleDeep;
        ctx.globalAlpha = 0.85;
        ctx.fill(row.sh);
        ctx.globalAlpha = 1;
        for (let i = 0; i < 3; i++) {
          ctx.fillStyle = tones[i];
          ctx.fill(row.b[i]);
        }
        ctx.fillStyle = P.shinglePale;
        ctx.globalAlpha = 0.9;
        ctx.fill(row.lit);
        ctx.fillStyle = P.lichen;
        ctx.globalAlpha = 0.9;
        ctx.fill(row.li);
        ctx.globalAlpha = 0.8;
        ctx.strokeStyle = P.inkSoft;
        ctx.lineWidth = 1.3 * ws;
        ctx.stroke(row.out);
        row = null;
      };
      ctx.save();
      let rowY = -1;
      for (const pb of PEBBLES) {
        const [x, y, rx, ry, rot, tone, li, ph] = pb;
        if (rx < minR || x + rx < x0 || x - rx > x1 || y + ry < y0 || y - ry > y1) continue;
        if (y - rowY > rx * 0.7 || !row) {
          flush();
          rowY = y;
          row = { sh: new Path2D(), b: [new Path2D(), new Path2D(), new Path2D()], lit: new Path2D(), li: new Path2D(), out: new Path2D(), rim: new Path2D() };
        }
        row.sh.moveTo(x + rx * 0.14 + rx, y + ry * 0.28);
        row.sh.ellipse(x + rx * 0.14, y + ry * 0.28, rx, ry, rot, 0, TAU);
        row.b[tone].moveTo(x + rx, y);
        row.b[tone].ellipse(x, y, rx, ry, rot, 0, TAU);
        if (lod && rx > 5) {
          row.lit.moveTo(x - rx * 0.22 + rx * 0.52, y - ry * 0.34);
          row.lit.ellipse(x - rx * 0.22, y - ry * 0.34, rx * 0.52, ry * 0.38, rot, 0, TAU);
          const a0 = -0.35 + ph * 0.3, a1 = 2.3 + ph * 0.4;
          row.out.moveTo(x + Math.cos(a0) * rx, y + Math.sin(a0) * ry);
          row.out.ellipse(x, y, rx, ry, rot, a0, a1);
          row.rim.moveTo(x + Math.cos(a1) * rx, y + Math.sin(a1) * ry);
          row.rim.ellipse(x, y, rx, ry, rot, a1, a0 + TAU);
        }
        if (li && rx > 6) {
          for (let m = 0; m < 3; m++) {
            const lx = x + (LIB.h3(x | 0, m, 3) - 0.6) * rx, ly = y + (LIB.h3(y | 0, m, 5) - 0.7) * ry * 0.8;
            const lr = rx * (0.18 + 0.15 * LIB.h3(m, x | 0, 7));
            row.li.moveTo(lx + lr, ly);
            row.li.ellipse(lx, ly, lr, lr * 0.6, 0, 0, TAU);
          }
        }
      }
      flush();
      ctx.restore();
    }
    // moss tufts toward the back of the beach
    if (lod) {
      const mp = new Path2D();
      for (const [x, y, hgt, n, ph] of TUFTS) {
        if (x < x0 - 30 || x > x1 + 30) continue;
        for (let i = 0; i < n; i++) {
          const a = -Math.PI / 2 + (i / (n - 1) - 0.5) * 1.3 + (ph - 0.5) * 0.3;
          mp.moveTo(x + (i - n / 2) * 2, y);
          mp.lineTo(x + (i - n / 2) * 2 + Math.cos(a) * hgt, y + Math.sin(a) * hgt);
        }
      }
      strokePath(ctx, mp, P.mossDeep, 1.8 * ws, 0.9);
    }

    // 5. far colony birds on the upper beach (tiny white bodies with black caps)
    {
      const bp = new Path2D(), cp = new Path2D();
      for (const [x, y, sz, f, ph] of FAR_BIRDS) {
        if (x < x0 - 20 || x > x1 + 20 || sz * k < 0.8) continue;
        const bob = LIB.h3(Math.floor(tw * 12), (x | 0), 3) < 0.2 ? -sz * 0.15 : 0;
        bp.moveTo(x + sz, y - sz * 0.35 + bob);
        bp.ellipse(x, y - sz * 0.35 + bob, sz, sz * 0.36, -0.1 * f, 0, TAU);
        cp.moveTo(x - f * sz * 0.8 + sz * 0.28, y - sz * 0.72 + bob);
        cp.arc(x - f * sz * 0.8, y - sz * 0.72 + bob, sz * 0.28, 0, TAU);
      }
      ctx.save();
      ctx.fillStyle = P.plumeWhite;
      ctx.fill(bp);
      ctx.strokeStyle = P.inkSoft;
      ctx.lineWidth = 1 * ws;
      ctx.stroke(bp);
      ctx.fillStyle = P.capBlack;
      ctx.fill(cp);
      ctx.restore();
    }

    // 6. the terns: background adults and juveniles, then the display pair
    const d = Math.floor(tw * 12 + 1e-6);
    const birds = [
      { key: 'a1', x: 440, y: 1206, s: 0.42, dir: -1, neck: 0, billUp: 0.05, open: 0 },
      { key: 'a2', x: 590, y: 1228, s: 0.5, dir: 1, neck: 0.1, billUp: -0.1, bob: d % 4 < 2 ? 0 : 3 },
      { key: 'j1', x: 170, y: 1266, s: 0.62, dir: -1, juv: 1, neck: 0.2, billUp: 0.35, open: d % 6 < 3 ? 0.35 : 0 },
      { key: 'j2', x: 890, y: 1292, s: 0.7, dir: 1, juv: 1, neck: 0, billUp: -0.05, droop: 0.1 },
      { key: 'm', x: 372, y: 1500, s: 1.72, dir: -1, neck: 0.85, billUp: 0.3 + (d % 4 < 2 ? 0 : 0.06), droop: 0.75, tailUp: 0.28, fish: 1, bob: d % 4 < 2 ? 0 : -2 },
      { key: 'f', x: 752, y: 1372, s: 1.3, dir: 1, neck: 0.65, billUp: 0.48, droop: 0.4, tailUp: 0.12 + (d % 6 < 3 ? 0 : 0.05), open: d % 8 < 2 ? 0.3 : 0 },
    ];
    birds.sort((a, b) => a.y - b.y);
    for (const b of birds) {
      if (b.x + 260 * b.s < x0 || b.x - 260 * b.s > x1) continue;
      // contact shadow on the shingle
      fillPoly(ctx, LIB.ellipsePts(b.x + 18 * b.s * (b.dir > 0 ? 1 : -1), b.y + 2, 70 * b.s, 9 * b.s, 24), P.shingleDeep, 0.55);
      ternStanding(ctx, P, b, ws, lod && b.s > 0.45 ? 1 : 0);
    }

    // 7. terns in the air, flapping on twos
    const flaps = [0.9, 0.35, -0.55, 0.1];
    const fl = [
      { x: 790, y: 520, s: 0.85, dir: -1, ph: 0, key: 'fl0', vx: -30 },
      { x: 250, y: 760, s: 0.55, dir: 1, ph: 2, key: 'fl1', vx: 26 },
      { x: 640, y: 330, s: 0.34, dir: 1, ph: 1, key: 'fl2', vx: 18 },
    ];
    for (const f of fl) {
      const x = f.x + f.vx * tw;
      ternFlying(ctx, P, x, f.y, f.s, f.dir, flaps[(d + f.ph) % 4], f.key, ws);
    }
  }

  function drawL1Layer(ctx, P, cam, tt, T, card) {
    const k = cam.k1;
    const ox = cam.A[0] - 540 * k, oy = cam.A[1] - 960 * k;
    ctx.save();
    if (card) {
      ctx.beginPath();
      ctx.rect(ox, oy, FW * k, FH * k);
      ctx.clip();
    }
    ctx.translate(ox, oy);
    ctx.scale(k, k);
    let x0 = (-8 - ox) / k, y0 = (-8 - oy) / k, x1 = (FW + 8 - ox) / k, y1 = (FH + 8 - oy) / k;
    if (card) {
      x0 = Math.max(x0, -4);
      y0 = Math.max(y0, -4);
      x1 = Math.min(x1, FW + 4);
      y1 = Math.min(y1, FH + 4);
    }
    drawL1(ctx, P, { k, x0, y0, x1, y1 }, tt, T);
    ctx.restore();
    if (card) {
      ctx.save();
      ctx.strokeStyle = P.ink;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(ox, oy, FW * k, FH * k);
      ctx.restore();
    }
  }

  // ---------------------------------------------------------------------------
  // world drawing helpers
  // ---------------------------------------------------------------------------

  const SEA_WORLD = (() => {
    const p = new Path2D();
    p.rect(-6000, -6000, 12000, 12000);
    p.addPath(WORLD.landWorld);
    return p;
  })();

  // a mini tern seen from above: facing angle ang, body length len (px), flap 0..1 wing spread
  function ternTop(ctx, P, x, y, ang, len, flap, alpha = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.globalAlpha *= alpha;
    const sp = len * (0.5 + 0.95 * flap);
    const sw = 0.25 + 0.2 * (1 - flap); // sweep of the hand behind the wrist
    const wing = new Path2D();
    for (const sg of [-1, 1]) {
      wing.moveTo(len * 0.1, 0);
      wing.quadraticCurveTo(len * 0.12, sg * sp * 0.45, -len * 0.02, sg * sp * 0.62);
      wing.lineTo(-len * (0.2 + sw), sg * sp);
      wing.quadraticCurveTo(-len * 0.12, sg * sp * 0.5, -len * 0.16, sg * len * 0.06);
      wing.closePath();
    }
    ctx.fillStyle = P.mantleGrey;
    ctx.fill(wing);
    ctx.strokeStyle = P.ink;
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(0.8, len * 0.045);
    ctx.stroke(wing);
    const body = new Path2D();
    body.moveTo(len * 0.36, 0);
    body.quadraticCurveTo(len * 0.25, -len * 0.1, 0, -len * 0.09);
    body.quadraticCurveTo(-len * 0.3, -len * 0.07, -len * 0.42, -len * 0.03);
    body.lineTo(-len * 0.74, -len * 0.14);
    body.lineTo(-len * 0.5, 0);
    body.lineTo(-len * 0.74, len * 0.14);
    body.lineTo(-len * 0.42, len * 0.03);
    body.quadraticCurveTo(-len * 0.3, len * 0.07, 0, len * 0.09);
    body.quadraticCurveTo(len * 0.25, len * 0.1, len * 0.36, 0);
    ctx.fillStyle = P.plumeWhite;
    ctx.fill(body);
    ctx.stroke(body);
    ctx.fillStyle = P.capBlack;
    ctx.beginPath();
    ctx.ellipse(len * 0.25, 0, len * 0.09, len * 0.075, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = P.juvBill;
    ctx.lineWidth = Math.max(0.8, len * 0.05);
    ctx.beginPath();
    ctx.moveTo(len * 0.34, 0);
    ctx.lineTo(len * 0.52, 0);
    ctx.stroke();
    ctx.restore();
  }

  function drawPeak(ctx, P, sx, sy, w, hf, lean, key) {
    const h = w * 0.95 * hf;
    const top = [sx + lean * w, sy - h];
    const sh = [sx + w * 0.18 + lean * w * 0.5, sy];
    const L = [sx - w, sy], R = [sx + w, sy];
    const shoulderL = [sx - w * 0.45, sy - h * 0.55], shoulderR = [sx + w * 0.55, sy - h * 0.5];
    const outline = [L, shoulderL, top, shoulderR, R];
    fillPoly(ctx, outline, P.mapLand);
    const shade = [top, shoulderR, R, sh];
    fillPoly(ctx, shade, LIB.mix(P.mapLand, P.shingleDeep, 0.45));
    if (w > 5) {
      const hp = new Path2D();
      const n = Math.min(9, Math.max(2, Math.round(w / 5)));
      for (let i = 1; i <= n; i++) {
        const u = i / (n + 1);
        const a = [lerp(top[0], R[0], u), lerp(top[1], R[1], u)];
        hp.moveTo(a[0], a[1]);
        hp.lineTo(lerp(a[0], sh[0], 0.55), lerp(a[1], sh[1], 0.55));
      }
      strokePath(ctx, hp, P.inkSoft, Math.max(0.8, Math.min(1.5, w * 0.05)), 0.8);
    }
    // snow cap
    const sn = [top, [lerp(top[0], shoulderL[0], 0.45), lerp(top[1], shoulderL[1], 0.45)], [top[0] - w * 0.05, top[1] + h * 0.32], [lerp(top[0], shoulderR[0], 0.5), lerp(top[1], shoulderR[1], 0.5)]];
    fillPoly(ctx, sn, P.ice);
    if (w > 10) LIB.inkPath(ctx, outline, { width: Math.min(2.4, 0.8 + w * 0.04), color: P.ink, seed: sd('peak', key), taper: [3, 3], wobble: Math.min(1, w * 0.03), smooth: false });
    else strokePath(ctx, (() => { const p = new Path2D(); trace(p, outline, false); return p; })(), P.ink, Math.max(0.7, w * 0.12), 0.9);
  }

  // ---------------------------------------------------------------------------
  // the world at zoom Z
  // ---------------------------------------------------------------------------

  // pass 'static' draws only what does not boil or move, 'dynamic' only what does, anything else both
  function drawWorld(ctx, P, cam, tt, hole, pass) {
    const Z = cam.Z;
    const S = pass !== 'dynamic', D = pass !== 'static';
    const tw = LIB.onTwos(tt);
    const vw = viewW(cam, 30);
    const mapA = sstep(9, 1.8, Z);
    const l3A = sstep(1.3, 4, Z) * (1 - sstep(900, 2600, Z));
    const islA = sstep(45, 180, Z);
    const sy0 = cam.A[1] + Z * (gy(90) - COL[1]), sy1 = cam.A[1] + Z * (gy(-90) - COL[1]);

    ctx.save();
    ctx.beginPath();
    if (hole) {
      ctx.rect(-20, -20, FW + 40, FH + 40);
      ctx.rect(hole.x, hole.y, hole.w, hole.h);
      ctx.clip('evenodd');
      ctx.beginPath();
    }
    ctx.rect(-20, Math.max(-20, sy0), FW + 40, Math.min(FH + 20, sy1) - Math.max(-20, sy0));
    ctx.clip();

    // 1. sea
    if (S) ctx.fillStyle = LIB.mix(P.sea, P.mapSea, sstep(12, 1.6, Z));
    if (S) ctx.fillRect(-20, -20, FW + 40, FH + 40);

    // land polygons in screen space
    const landPath = new Path2D();
    const icePolys = [];
    let sandPoly = null, greenVis = false;
    for (const rg of WORLD.rings) {
      if (!boxHit(rg.box, vw)) continue;
      const c = clipPolyRect(rg.pts, vw[0], vw[1], vw[2], vw[3]);
      if (c.length < 3) continue;
      const s = mapPts(cam, c);
      trace(landPath, s, true);
      if (rg.kind === 'ice') icePolys.push(s);
      if (rg.kind === 'sand') sandPoly = s;
      if (rg.key === 'greenland') greenVis = true;
    }
    const seaPath = new Path2D();
    seaPath.rect(-20, -20, FW + 40, FH + 40);
    seaPath.addPath(landPath);

    // 2. sea texture: ruled hatching at the close zooms, engraved offsets at the map
    const hA = 0.6 * sstep(2.2, 7, Z);
    if (D && hA > 0.01) {
      ctx.save();
      ctx.clip(seaPath, 'evenodd');
      LIB.hatch(ctx, null, {
        bounds: { x: 0, y: 0, w: FW, h: FH }, angle: 0, spacing: 11, width: 1.3, color: P.seaDeep, alpha: hA, length: [24, 110], gap: [8, 26],
        seed: sd('seahatch'), angleJitter: 0.012, flow: 0, density: 0.75,
      });
      ctx.restore();
    }
    if (S && mapA > 0.01) {
      ctx.save();
      worldTransform(ctx, cam);
      ctx.clip(SEA_WORLD, 'evenodd');
      for (let li = WORLD.LEVELS.length - 1; li >= 0; li--) {
        ctx.lineWidth = lerp(1.5, 0.9, li / (WORLD.LEVELS.length - 1)) / Z;
        ctx.strokeStyle = P.seaDeep;
        ctx.globalAlpha = mapA * lerp(0.7, 0.16, li / (WORLD.LEVELS.length - 1));
        ctx.stroke(WORLD.offsets[li]);
      }
      ctx.restore();
    }

    // 3. sea ice: the Antarctic pack as a hatched band south of its edge, map-scale floes, then the
    // L3 floes drifting south on twos
    if (S && mapA > 0.01) {
      const band = clipPolyRect(mapPts(cam, PACK_EDGE.concat([[PACK_EDGE[PACK_EDGE.length - 1][0], gy(-92)], [PACK_EDGE[0][0], gy(-92)]])), -20, -20, FW + 20, FH + 20);
      ctx.save();
      ctx.globalAlpha = mapA;
      fillPoly(ctx, band, P.iceShade, 0.35);
      if (band.length > 2) LIB.hatch(ctx, band, { angle: 0, spacing: 6.5, width: 1, color: P.iceDeep, alpha: 0.4, length: [6, 22], gap: [4, 14], seed: sd('packh'), angleJitter: 0.02, flow: 0, boil: false });
      ctx.restore();
    }
    if (S && mapA > 0.01) {
      ctx.save();
      worldTransform(ctx, cam);
      const ip = new Path2D();
      for (const [x, y, r, k] of SEAICE_MAP) {
        if (x < vw[0] || x > vw[2] || y < vw[1] || y > vw[3]) continue;
        const sh = FLOE_SHAPES[k];
        sh.forEach((p, i) => (i ? ip.lineTo(x + p[0] * r, y + p[1] * r) : ip.moveTo(x + p[0] * r, y + p[1] * r)));
        ip.closePath();
      }
      ctx.globalAlpha = mapA;
      ctx.fillStyle = P.ice;
      ctx.fill(ip);
      ctx.strokeStyle = P.iceDeep;
      ctx.lineWidth = 0.8 / Z;
      ctx.globalAlpha = mapA * 0.8;
      ctx.stroke(ip);
      ctx.restore();
    }
    const bergA = sstep(26, 9, Z) * (1 - 0.5 * mapA);
    if (D && (l3A > 0.01 || bergA > 0.01)) {
      const fp = new Path2D(), sp = new Path2D();
      const brash = sstep(90, 200, Z) * (1 - sstep(3000, 5000, Z));
      const list = (brash > 0 ? FLOES2 : []).concat(l3A > 0.01 ? FLOES3 : []).concat(bergA > 0.01 ? BERGS.map((b) => [b[0], b[1], b[2], 0, 0, b[3]]) : []);
      for (const [x, y, r, vx, vy, k] of list) {
        const wx = x + vx * tw, wy = y + vy * tw;
        const rs = r * Z;
        if (rs < 0.9 || wx + r < vw[0] || wx - r > vw[2] || wy + r < vw[1] || wy - r > vw[3]) continue;
        const c = W2S(cam, wx, wy);
        const sh = FLOE_SHAPES[k % 12];
        const rot = (k % 7) * 0.9;
        const cr = Math.cos(rot), sr = Math.sin(rot);
        sh.forEach((p, i) => {
          const px = c[0] + (p[0] * cr - p[1] * sr) * rs, py = c[1] + (p[0] * sr + p[1] * cr) * rs;
          if (i) fp.lineTo(px, py);
          else fp.moveTo(px, py);
        });
        fp.closePath();
        if (rs > 3) {
          sh.forEach((p, i) => {
            const px = c[0] + (p[0] * cr - p[1] * sr) * rs + rs * 0.12, py = c[1] + (p[0] * sr + p[1] * cr) * rs + rs * 0.16;
            if (i) sp.lineTo(px, py);
            else sp.moveTo(px, py);
          });
          sp.closePath();
        }
      }
      ctx.save();
      ctx.globalAlpha = Math.max(l3A, bergA);
      ctx.fillStyle = P.iceShade;
      ctx.fill(sp);
      ctx.fillStyle = P.ice;
      ctx.fill(fp);
      ctx.strokeStyle = P.iceDeep;
      ctx.lineWidth = 1.2;
      ctx.stroke(fp);
      ctx.restore();
    }

    // 4. land, Antarctica's ice, Sand Island's shingle
    if (S) {
      ctx.fillStyle = P.mapLand;
      ctx.fill(landPath, 'evenodd');
      for (const s of icePolys) fillPoly(ctx, s, P.ice);
      if (sandPoly) fillPoly(ctx, sandPoly, P.shingle);
    }

    // 5. land texture: tundra stipple close in, engraved stipple and hachure on the map
    if (D && l3A > 0.01) {
      ctx.save();
      ctx.clip(landPath, 'evenodd');
      LIB.stipple(ctx, null, { bounds: { x: 0, y: 0, w: FW, h: FH }, spacing: 9, density: 0.32, r: [1.0, 1.9], color: P.mossDeep, alpha: 0.55 * l3A, seed: sd('tundra') });
      ctx.restore();
    }
    if (S && mapA > 0.01) {
      ctx.save();
      worldTransform(ctx, cam);
      const lp = new Path2D();
      for (const [x, y, r] of LAND_DOTS) {
        if (x < vw[0] || x > vw[2] || y < vw[1] || y > vw[3]) continue;
        lp.moveTo(x + r / Z, y);
        lp.arc(x, y, r / Z, 0, TAU);
      }
      ctx.fillStyle = P.inkFaint;
      ctx.globalAlpha = 0.45 * mapA;
      ctx.fill(lp);
      ctx.strokeStyle = P.inkSoft;
      ctx.lineWidth = 1 / Z;
      ctx.globalAlpha = 0.34 * mapA;
      ctx.stroke(WORLD.hachure);
      ctx.restore();
    }

    // 6. Greenland's ice cap (clipped to the land), with engraved contour rings on the map
    if (greenVis && Z < 80) {
      const capA = sstep(80, 30, Z);
      const cc = clipPolyRect(WORLD.icecap, vw[0], vw[1], vw[2], vw[3]);
      if (S && cc.length > 2) {
        const cs = mapPts(cam, cc);
        ctx.save();
        ctx.clip(landPath, 'evenodd');
        ctx.globalAlpha = capA;
        fillPoly(ctx, cs, P.ice);
        ctx.beginPath();
        trace(ctx, cs, true);
        ctx.clip();
        LIB.stipple(ctx, null, { bounds: { x: 0, y: 0, w: FW, h: FH }, spacing: 8, density: 0.22, r: [0.9, 1.6], color: P.iceShade, alpha: 0.8, seed: sd('capst'), boil: false });
        if (mapA > 0.01) {
          ctx.save();
          worldTransform(ctx, cam);
          const cp = new Path2D();
          for (const c of WORLD.icecapContours) trace(cp, c, true);
          ctx.strokeStyle = P.iceShade;
          ctx.lineWidth = 1.2 / Z;
          ctx.globalAlpha = capA * mapA;
          ctx.stroke(cp);
          ctx.restore();
        }
        ctx.restore();
      }
      if (D && cc.length > 2) {
        // the ice margin
        const runs = runsInside(WORLD.icecap, true, vw[0], vw[1], vw[2], vw[3]);
        ctx.save();
        ctx.clip(landPath, 'evenodd');
        for (let i = 0; i < runs.length; i++) {
          if (runs[i].length < 2) continue;
          LIB.inkPath(ctx, mapPts(cam, runs[i]), { width: 1.6, color: P.iceDeep, alpha: capA * 0.9, seed: sd('capedge', i), taper: 0, wobble: 0.6 });
        }
        ctx.restore();
      }
    }
    // Antarctic interior: a few engraved ice ridges
    if (S && mapA > 0.01 && icePolys.length) {
      ctx.save();
      ctx.globalAlpha = mapA;
      for (const s of icePolys) {
        if (s.length > 2) LIB.hatch(ctx, s, { angle: 0, spacing: 7, width: 1, color: P.iceShade, alpha: 0.7, length: [10, 40], gap: [6, 20], seed: sd('anth'), boil: false, angleJitter: 0.03, density: (x, y) => 0.25 + 0.5 * sstep(1560, 1440, y) });
      }
      ctx.restore();
    }

    // 6b. boulders and moss on the shores at the close zooms
    const shoreA = sstep(25, 70, Z);
    if (D && shoreA > 0.01) {
      const mp = new Path2D(), rp = new Path2D(), rl = new Path2D(), ro = new Path2D();
      for (const [x, y, r, kind, k] of SHORE) {
        const rs = r * Z;
        if (rs < 1.1 || rs > 400 || x + r < vw[0] || x - r > vw[2] || y + r < vw[1] || y - r > vw[3]) continue;
        const c = W2S(cam, x, y);
        const sh = FLOE_SHAPES[k % 12];
        if (kind) {
          mp.moveTo(c[0] + rs, c[1]);
          mp.ellipse(c[0], c[1], rs, rs * 0.55, (k % 9) * 0.35, 0, TAU);
          continue;
        }
        const tgt = rp;
        const e = 0.7;
        sh.forEach((q, i) => (i ? tgt.lineTo(c[0] + q[0] * rs, c[1] + q[1] * rs * e) : tgt.moveTo(c[0] + q[0] * rs, c[1] + q[1] * rs * e)));
        tgt.closePath();
        if (!kind && rs > 3) {
          rl.moveTo(c[0] - rs * 0.2 + rs * 0.45, c[1] - rs * 0.22);
          rl.ellipse(c[0] - rs * 0.2, c[1] - rs * 0.22, rs * 0.45, rs * 0.28, 0, 0, TAU);
          ro.moveTo(c[0] + rs * 0.95, c[1]);
          ro.ellipse(c[0], c[1], rs * 0.95, rs * 0.66, 0, -0.4, 2.4);
        }
      }
      ctx.save();
      ctx.globalAlpha = shoreA;
      ctx.fillStyle = P.moss;
      ctx.fill(mp);
      ctx.strokeStyle = P.mossDeep;
      ctx.lineWidth = 1.1;
      ctx.stroke(mp);
      ctx.fillStyle = P.shingle;
      ctx.fill(rp);
      ctx.fillStyle = P.shinglePale;
      ctx.fill(rl);
      ctx.strokeStyle = P.inkSoft;
      ctx.lineWidth = 1.2;
      ctx.stroke(ro);
      ctx.restore();
    }

    // 7. mountains: L3 peaks close in, glyph chains on the map
    if (D && l3A > 0.01) {
      ctx.save();
      ctx.globalAlpha = l3A;
      for (const [x, y, w, hf, lean, ph] of PEAKS3) {
        const ws = w * Z;
        if (ws < 1.6 || ws > 200) continue;
        if (x + w < vw[0] || x - w > vw[2] || y < vw[1] || y - w * 1.2 > vw[3]) continue;
        const c = W2S(cam, x, y);
        ctx.globalAlpha = l3A * sstep(200, 110, ws);
        drawPeak(ctx, P, c[0], c[1], ws, hf, lean, (ph * 1000) | 0);
      }
      ctx.restore();
    }
    if (S && mapA > 0.01) {
      ctx.save();
      ctx.globalAlpha = mapA;
      for (const [x, y, h, w] of PEAKS_MAP) {
        if (x < vw[0] || x > vw[2] || y < vw[1] || y > vw[3]) continue;
        const c = W2S(cam, x, y);
        drawPeak(ctx, P, c[0], c[1], w * 0.5 * Z, (h / w) * 1.4, 0, (x * 7 + y) | 0);
      }
      ctx.restore();
    }

    // 8. graticule every 10 degrees, the equator and the tropics and polar circles
    if (S && mapA > 0.01) {
      ctx.save();
      worldTransform(ctx, cam);
      const g = new Path2D(), eq = new Path2D(), circ = new Path2D();
      for (let lon = -90; lon <= 60; lon += 10) {
        g.moveTo(gx(lon), gy(90));
        g.lineTo(gx(lon), gy(-90));
      }
      for (let lat = -80; lat <= 80; lat += 10) {
        if (lat === 0) continue;
        g.moveTo(gx(-100), gy(lat));
        g.lineTo(gx(70), gy(lat));
      }
      eq.moveTo(gx(-100), gy(0));
      eq.lineTo(gx(70), gy(0));
      for (const lat of [23.44, -23.44, 66.56, -66.56]) {
        circ.moveTo(gx(-100), gy(lat));
        circ.lineTo(gx(70), gy(lat));
      }
      ctx.strokeStyle = P.inkFaint;
      ctx.globalAlpha = 0.34 * mapA;
      ctx.lineWidth = 1.1 / Z;
      ctx.stroke(g);
      ctx.globalAlpha = 0.6 * mapA;
      ctx.lineWidth = 1.8 / Z;
      ctx.stroke(eq);
      ctx.setLineDash([8 / Z, 6 / Z]);
      ctx.globalAlpha = 0.45 * mapA;
      ctx.lineWidth = 1.2 / Z;
      ctx.stroke(circ);
      ctx.restore();
    }

    // 9. Sand Island from above: surf, moss, ponds, shingle, pebbles, the colony
    if (D && islA > 0.01 && sandPoly) {
      ctx.save();
      ctx.globalAlpha = islA;
      for (let k = 0; k < ISLAND.surf.length; k++) {
        const ring = ISLAND.surf[k];
        const runs = runsInside(ring, true, vw[0], vw[1], vw[2], vw[3]);
        const sp = new Path2D();
        for (const run of runs) trace(sp, mapPts(cam, run), false);
        const pulse = (tw * 2 + k * 0.7) % 1;
        strokePath(ctx, sp, P.foam, lerp(3.2, 1.6, k / 3), lerp(0.95, 0.45, k / 3) * (0.8 + 0.2 * Math.sin(pulse * TAU)), k ? [18 + k * 8, 10 + k * 6] : null);
      }
      for (let i = 0; i < ISLAND.moss.length; i++) {
        const m = mapPts(cam, ISLAND.moss[i]);
        fillPoly(ctx, m, P.moss);
        LIB.hatch(ctx, m, { angle: -Math.PI / 4, spacing: 5, width: 1.1, color: P.mossDeep, alpha: 0.8, length: [6, 18], seed: sd('mossh', i) });
        LIB.inkPath(ctx, m, { closed: true, width: 1.3, color: P.mossDeep, seed: sd('mosso', i), wobble: 0.5 });
      }
      LIB.stipple(ctx, sandPoly, { spacing: 6, density: 0.55, r: [1.0, 2.0], color: P.shingleDeep, alpha: 0.75, seed: sd('sandst') });
      LIB.stipple(ctx, sandPoly, { spacing: 11, density: 0.3, r: [1.2, 2.2], color: P.shinglePale, alpha: 0.9, seed: sd('sandst2') });
      for (let i = 0; i < ISLAND.ponds.length; i++) {
        const m = mapPts(cam, ISLAND.ponds[i]);
        fillPoly(ctx, m, P.sea);
        LIB.hatch(ctx, m, { angle: 0, spacing: 4, width: 1, color: P.seaDeep, alpha: 0.7, length: [6, 20], seed: sd('pondh', i), angleJitter: 0.01 });
        LIB.inkPath(ctx, m, { closed: true, width: 1.6, color: P.ink, seed: sd('pondo', i), wobble: 0.4 });
      }
      // pebbles, only once they are big enough to read
      if (Z > 1300) {
        const pa = sstep(1300, 2600, Z);
        const pb = new Path2D(), pl = new Path2D(), po = new Path2D();
        for (const [x, y, r, e, rot] of ISLAND.pebbles) {
          const rs = r * Z;
          if (rs < 1.6 || x < vw[0] || x > vw[2] || y < vw[1] || y > vw[3]) continue;
          const c = W2S(cam, x, y);
          pb.moveTo(c[0] + rs, c[1]);
          pb.ellipse(c[0], c[1], rs, rs * e, rot, 0, TAU);
          pl.moveTo(c[0] - rs * 0.2 + rs * 0.45, c[1] - rs * 0.2);
          pl.ellipse(c[0] - rs * 0.2, c[1] - rs * 0.2, rs * 0.45, rs * e * 0.4, rot, 0, TAU);
          po.moveTo(c[0] + rs, c[1]);
          po.ellipse(c[0], c[1], rs, rs * e, rot, 0, TAU);
        }
        ctx.save();
        ctx.globalAlpha *= pa;
        ctx.fillStyle = LIB.mix(P.shingle, P.shingleDeep, 0.3);
        ctx.fill(pb);
        ctx.fillStyle = P.shinglePale;
        ctx.fill(pl);
        ctx.strokeStyle = P.inkSoft;
        ctx.lineWidth = 1;
        ctx.stroke(po);
        ctx.restore();
      }
      // the terns: hundreds of dots that flicker on twos; close up they become little birds
      const di = Math.floor(tw * 12 + 1e-6);
      const len = 0.0075 * Z;
      const dots = new Path2D(), caps = new Path2D(), flash = new Path2D();
      const big = [];
      for (let i = 0; i < ISLAND.terns.length; i++) {
        const [x, y, ang, ph, k] = ISLAND.terns[i];
        if (x < vw[0] || x > vw[2] || y < vw[1] || y > vw[3]) continue;
        const h = LIB.h3(i, di, 91);
        if (h > 0.94) continue;
        const hop = h < 0.12 ? 1 : 0;
        const c = W2S(cam, x, y);
        const cx = c[0] + (hop ? Math.cos(ang) * len * 0.4 : 0), cy = c[1] + (hop ? Math.sin(ang) * len * 0.4 : 0);
        if (len > 11) {
          big.push([cx, cy, ang, hop]);
          continue;
        }
        // a white fleck along the heading with a dark cap tick at the front
        const ca = Math.cos(ang), sa = Math.sin(ang);
        const hl = Math.max(2.4, len * 0.8), hw = Math.max(1.1, len * 0.26);
        dots.moveTo(cx + ca * hl, cy + sa * hl);
        dots.quadraticCurveTo(cx - sa * hw * 1.6, cy + ca * hw * 1.6, cx - ca * hl, cy - sa * hl);
        dots.quadraticCurveTo(cx + sa * hw * 1.6, cy - ca * hw * 1.6, cx + ca * hl, cy + sa * hl);
        dots.closePath();
        caps.moveTo(cx + ca * hl * 0.45, cy + sa * hl * 0.45);
        caps.lineTo(cx + ca * hl * 1.05, cy + sa * hl * 1.05);
        if (hop) {
          // wings open: a grey V across the body
          const nx = -sa, ny = ca;
          flash.moveTo(cx - nx * hl * 1.3 - ca * hl * 0.5, cy - ny * hl * 1.3 - sa * hl * 0.5);
          flash.lineTo(cx, cy);
          flash.lineTo(cx + nx * hl * 1.3 - ca * hl * 0.5, cy + ny * hl * 1.3 - sa * hl * 0.5);
        }
      }
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = P.mantleGrey;
      ctx.lineWidth = Math.max(1.4, len * 0.25);
      ctx.stroke(flash);
      ctx.fillStyle = P.plumeWhite;
      ctx.fill(dots);
      ctx.strokeStyle = P.mantleDeep;
      ctx.globalAlpha *= 0.8;
      ctx.lineWidth = Math.max(0.6, len * 0.06);
      ctx.stroke(dots);
      ctx.globalAlpha /= 0.8;
      ctx.strokeStyle = P.capBlack;
      ctx.lineWidth = Math.max(1.1, len * 0.16);
      ctx.stroke(caps);
      ctx.restore();
      for (const [cx, cy, ang, hop] of big) ternTop(ctx, P, cx, cy, ang, len, hop ? 0.9 : 0);
      // terns wheeling over the colony (L2 px loops), flapping on twos
      if (Z > 150) {
        const fa = sstep(150, 500, Z);
        for (let i = 0; i < ISLAND.fliers.length; i++) {
          const f = ISLAND.fliers[i];
          const a = f.ph + f.w * tw;
          const lx = f.cx + Math.cos(a) * f.rx, ly = f.cy + Math.sin(a) * f.ry;
          const wpt = L2W([lx, ly]);
          const c = W2S(cam, wpt[0], wpt[1]);
          const hd = Math.atan2(Math.cos(a) * f.ry * f.w, -Math.sin(a) * f.rx * f.w);
          ternTop(ctx, P, c[0], c[1], hd, Math.max(6, 0.015 * Z) * f.sz, [1, 0.35, 0.7, 0.2][(di + f.fp) % 4], fa);
        }
        // the feeding cloud: grey Vs that jitter on twos, a few folding into a dive
        const vp = new Path2D(), cp2 = new Path2D();
        const vl = Math.max(3, 0.0072 * Z);
        for (const sp of ISLAND.specks) {
          const ph = (di + sp.ph) % 12;
          const wpt = L2W([sp.x + Math.sin(ph * 1.7) * sp.jx, sp.y + Math.cos(ph * 2.3) * sp.jx * 0.6]);
          const c = W2S(cam, wpt[0], wpt[1]);
          if (c[0] < -20 || c[0] > FW + 20 || c[1] < -20 || c[1] > FH + 20) continue;
          const dive = ph === 5 || ph === 6;
          const span = dive ? vl * 0.45 : vl;
          const lift = (ph & 1 ? 0.55 : 0.2) * vl;
          vp.moveTo(c[0] - span, c[1] - lift);
          vp.quadraticCurveTo(c[0] - span * 0.4, c[1] - lift * 0.2, c[0], c[1]);
          vp.quadraticCurveTo(c[0] + span * 0.4, c[1] - lift * 0.2, c[0] + span, c[1] - lift);
          cp2.moveTo(c[0] + 1.2, c[1] - 0.6);
          cp2.arc(c[0], c[1] - 0.6, 1.2, 0, TAU);
        }
        ctx.save();
        ctx.globalAlpha *= fa;
        ctx.lineCap = 'round';
        ctx.strokeStyle = P.mantleDeep;
        ctx.lineWidth = Math.max(1.3, vl * 0.22);
        ctx.stroke(vp);
        ctx.fillStyle = P.capBlack;
        ctx.fill(cp2);
        ctx.restore();
      }
      ctx.restore();
    }

    // 9b. engraved water lines along the coasts at the close zooms (screen space, sea side only)
    const engA = l3A * (1 - mapA * 0.7);
    if (D && engA > 0.01) {
      const lv = [5, 11, 18, 27];
      const eng = lv.map(() => new Path2D());
      for (const rg of WORLD.rings) {
        if (!boxHit(rg.box, vw) || rg.kind === 'sand') continue;
        const runs = runsInside(rg.pts, true, vw[0], vw[1], vw[2], vw[3]);
        for (const run of runs) {
          if (run.length < 3) continue;
          const sp = LIB.smoothPts(mapPts(cam, run), false, 6);
          const n = sp.length;
          for (let li = 0; li < lv.length; li++) {
            let pen = false;
            for (let i = 0; i < n; i++) {
              const a = sp[Math.max(0, i - 2)], b = sp[Math.min(n - 1, i + 2)];
              const tx = b[0] - a[0], ty = b[1] - a[1];
              const tl = Math.hypot(tx, ty) || 1;
              for (const side of [1]) {
                const d = lv[li] * (1 + 0.15 * LIB.noise1(i * 0.07 + li * 3, sd('engl', rg.key))) * side * (rg.kind === 'hole' ? -rg.sign : rg.sign);
                const x = sp[i][0] + (ty / tl) * d, y = sp[i][1] - (tx / tl) * d;
                if (!pen) eng[li].moveTo(x, y);
                else eng[li].lineTo(x, y);
                pen = true;
              }
            }
          }
        }
      }
      ctx.save();
      ctx.clip(seaPath, 'evenodd');
      for (let li = 0; li < lv.length; li++) strokePath(ctx, eng[li], P.seaDeep, lerp(1.6, 1.0, li / 3), engA * lerp(0.9, 0.3, li / 3));
      ctx.restore();
    }

    // 10. coastlines in ink
    const cw = lerp(2.2, 3.4, sstep(2, 40, Z));
    for (const rg of D ? WORLD.rings : []) {
      if (!boxHit(rg.box, vw)) continue;
      const runs = runsInside(rg.pts, true, vw[0], vw[1], vw[2], vw[3]);
      for (let i = 0; i < runs.length; i++) {
        if (runs[i].length < 2) continue;
        const sp = mapPts(cam, runs[i]);
        if (rg.kind === 'sand' && Z < 20) {
          const p = new Path2D();
          trace(p, sp, false);
          strokePath(ctx, p, P.ink, 1.4);
          continue;
        }
        LIB.inkPath(ctx, sp, {
          width: rg.kind === 'sand' ? 3.4 : cw, color: rg.kind === 'ice' ? P.iceDeep : P.ink, seed: sd('coast', rg.key, i),
          taper: runs[i].length === rg.pts.length + 1 ? [0, 0] : [4, 4], wobble: 0.6, tremble: 0.3, boilAmp: 0.5, step: Z < 3 ? 3.5 : 2.5,
        });
      }
    }

    // 11. the Antarctic pack-ice edge, the compass rose and the neat line
    if (mapA > 0.01) {
      ctx.save();
      ctx.globalAlpha = mapA;
      const peRuns = D ? runsInside(PACK_EDGE_SM, false, vw[0], vw[1], vw[2], vw[3]) : [];
      for (let i = 0; i < peRuns.length; i++) {
        if (peRuns[i].length > 1) LIB.inkPath(ctx, mapPts(cam, peRuns[i]), { width: 1.8, color: P.iceDeep, seed: sd('packedge', i), taper: 0, wobble: 1.2 });
      }
      const c = W2S(cam, gx(-60), gy(35));
      const R = 48 * Z;
      if (S) {
      LIB.guideCircle(ctx, c[0], c[1], R, { color: P.ink, alpha: 0.6, width: 1.4 });
      LIB.guideCircle(ctx, c[0], c[1], R * 0.8, { color: P.ink, alpha: 0.4, width: 1, dash: [2, 4] });
      for (let k = 0; k < 8; k++) {
        const a = -Math.PI / 2 + (k / 8) * TAU;
        const len = (k % 2 ? 30 : 64) * Z;
        const w = (k % 2 ? 6 : 10) * Z;
        const tip = [c[0] + Math.cos(a) * len, c[1] + Math.sin(a) * len];
        const l = [c[0] + Math.cos(a - Math.PI / 2) * w, c[1] + Math.sin(a - Math.PI / 2) * w];
        const rr = [c[0] + Math.cos(a + Math.PI / 2) * w, c[1] + Math.sin(a + Math.PI / 2) * w];
        fillPoly(ctx, [c, l, tip], k === 0 ? P.ink : P.paper);
        fillPoly(ctx, [c, tip, rr], P.ink);
        const o = new Path2D();
        trace(o, [l, tip, rr, c], true);
        strokePath(ctx, o, P.ink, 1.2, 1);
      }
      }
      ctx.restore();
    }
    ctx.restore();

    // neat line along the top and bottom of the sheet with degree ticks (outside the sheet clip)
    if (D && mapA > 0.01) {
      ctx.save();
      ctx.globalAlpha = mapA;
      for (const yy of [sy0, sy1]) {
        const sgn = yy === sy0 ? -1 : 1;
        LIB.inkLine(ctx, -20, yy, FW + 20, yy, { width: 2.2, color: P.ink, seed: sd('neat', sgn), taper: 0, wobble: 0.5 });
        LIB.inkLine(ctx, -20, yy + sgn * 7, FW + 20, yy + sgn * 7, { width: 1.2, color: P.ink, seed: sd('neat2', sgn), taper: 0, wobble: 0.5 });
        const tp = new Path2D();
        for (let lon = -90; lon <= 60; lon += 5) {
          const x = W2S(cam, gx(lon), 0)[0];
          tp.moveTo(x, yy);
          tp.lineTo(x, yy + sgn * (lon % 10 === 0 ? 7 : 4));
        }
        strokePath(ctx, tp, P.ink, 1.1, 0.9);
      }
      ctx.restore();
    }
  }

  // ---------------------------------------------------------------------------
  // compositing with alpha
  // ---------------------------------------------------------------------------

  let scratch = null;
  function withAlpha(ctx, alpha, fn) {
    if (alpha >= 0.999) {
      fn(ctx);
      return;
    }
    const w = ctx.canvas.width, h = ctx.canvas.height;
    if (!scratch || scratch.canvas.width !== w || scratch.canvas.height !== h) {
      const c = FILM.makeCanvas(w, h);
      scratch = { canvas: c, ctx: c.getContext('2d') };
    }
    const s = scratch.ctx;
    s.setTransform(1, 0, 0, 1, 0, 0);
    s.globalAlpha = 1;
    s.globalCompositeOperation = 'source-over';
    s.clearRect(0, 0, w, h);
    FILM.baseTransform(s);
    fn(s);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(scratch.canvas, 0, 0, FW, FH);
    ctx.restore();
  }

  // the static layers of the finished G4 map (zoom 1), rendered once per canvas size
  let MAPBASE = null;
  function mapBase(P, cam) {
    const w = FILM.canvas ? FILM.canvas.width : FW, h = FILM.canvas ? FILM.canvas.height : FH;
    if (MAPBASE && MAPBASE.w === w && MAPBASE.h === h) return MAPBASE.canvas;
    const c = FILM.makeCanvas(w, h);
    const g = c.getContext('2d');
    FILM.baseTransform(g);
    drawWorld(g, P, cam, 1.5, null, 'static');
    MAPBASE = { w, h, canvas: c };
    return c;
  }

  // ---------------------------------------------------------------------------
  // overlays: nested frames, the route on G4, tern glyphs
  // ---------------------------------------------------------------------------

  const LAND_CAMS = [cameraAt(0), cameraAt(0.5), cameraAt(1.0)];
  const RECT_MIN = [12, 18, 26];

  function framingRects(ctx, P, cam, t) {
    const fade = 1 - sstep(1.5, 1.75, t);
    if (fade <= 0) return;
    const rects = [];
    for (let i = 0; i < 3; i++) {
      const L = LAND_CAMS[i];
      if (cam.Z > L.Z * 0.985) continue;
      if (i === 0 && cam.p0 < 0.25) continue;
      const a = W2S(cam, COL[0] + (0 - L.A[0]) / L.Z, COL[1] + (0 - L.A[1]) / L.Z);
      const b = W2S(cam, COL[0] + (FW - L.A[0]) / L.Z, COL[1] + (FH - L.A[1]) / L.Z);
      let x0 = a[0], y0 = a[1], w = b[0] - a[0], h = b[1] - a[1];
      if (w < RECT_MIN[i]) {
        const cx = x0 + w / 2, cy = y0 + h / 2;
        w = RECT_MIN[i];
        h = w * (FH / FW);
        x0 = cx - w / 2;
        y0 = cy - h / 2;
      }
      const alpha = i === 0 ? sstep(0.25, 0.4, cam.p0) : 1;
      rects.push({ i, x0, y0, w, h, alpha });
    }
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.strokeStyle = P.annYellow;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 1.2;
    ctx.globalAlpha = fade * 0.7;
    ctx.beginPath();
    for (let a = 0; a + 1 < rects.length; a++) {
      const A = rects[a], B = rects[a + 1];
      for (const [u, v] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
        ctx.moveTo(A.x0 + A.w * u, A.y0 + A.h * v);
        ctx.lineTo(B.x0 + B.w * u, B.y0 + B.h * v);
      }
    }
    ctx.stroke();
    for (const R of rects) {
      ctx.globalAlpha = fade * R.alpha;
      ctx.lineWidth = 2;
      ctx.strokeRect(R.x0, R.y0, R.w, R.h);
      const c = Math.min(22, R.w * 0.22);
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      for (const [x, y, sx, sy] of [[R.x0, R.y0, 1, 1], [R.x0 + R.w, R.y0, -1, 1], [R.x0, R.y0 + R.h, 1, -1], [R.x0 + R.w, R.y0 + R.h, -1, -1]]) {
        ctx.moveTo(x, y + sy * c);
        ctx.lineTo(x, y);
        ctx.lineTo(x + sx * c, y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  // route legs from the storyboard's G4 polylines, (lat, lon)
  const smoothRoute = (ll) => LIB.smoothPts(ll.map(LATLON), false, 3);
  const ROUTE = (() => {
    const mk = (pts) => ({ pts, cum: cumLen(pts) });
    return {
      a: mk(smoothRoute([[74.7, -20.5], [72, -22.5], [68, -26], [63, -30], [57, -33], [51, -34.5], [47, -34]])),
      b: mk(smoothRoute([[47, -34], [45.2, -37.5], [43.4, -35.4], [44.8, -31.2], [47.6, -32.6], [44, -32.5], [38, -29.5], [30, -26.5], [22, -24.6], [15, -23.8], [10, -23]])),
      af: mk(smoothRoute([[10, -23], [5, -15], [0, -5], [-10, 5], [-22, 10], [-33, 12], [-39, 5], [-50, -10], [-62, -25]])),
      br: mk(smoothRoute([[10, -23], [0, -30], [-12, -34], [-25, -40], [-39, -45], [-50, -40], [-62, -32]])),
      n: mk(smoothRoute([[-64, -25], [-45, -10], [-30, 0], [-12, -8], [0, -25], [15, -38], [30, -42], [45, -38], [60, -30], [74.7, -20.5]])),
    };
  })();
  const STOP_BOX = [gx(-41), gy(53), gx(-27), gy(41)]; // x 359.4..479.8, y 424.2..527.4
  const WINTER = { x0: gx(-61), x1: gx(0), y0: gy(-58) }; // x 187.4..712, y 1378.8 down
  const WINTER_C = [(WINTER.x0 + WINTER.x1) / 2, 1462];

  function drawRouteLine(ctx, P, R, u, color, dashed, key) {
    if (u <= 0) return null;
    const c = polyCut(R.pts, R.cum, u);
    const pth = new Path2D();
    trace(pth, c.prefix, false);
    strokePath(ctx, pth, P.mapSea, 6.5, 0.75);
    strokePath(ctx, pth, color, 2.5, 1, dashed ? [14, 10] : null);
    return c;
  }

  function arrowHead(ctx, P, c, color) {
    const a = Math.atan2(c.ty, c.tx);
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(c.p[0] + Math.cos(a) * 9, c.p[1] + Math.sin(a) * 9);
    ctx.lineTo(c.p[0] + Math.cos(a + 2.5) * 11, c.p[1] + Math.sin(a + 2.5) * 11);
    ctx.lineTo(c.p[0] + Math.cos(a - 2.5) * 11, c.p[1] + Math.sin(a - 2.5) * 11);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function glyph(ctx, P, c, t, ph) {
    const flap = [1, 0.3][(Math.floor(t * 12 + 1e-6) + ph) % 2];
    const a = Math.atan2(c.ty, c.tx);
    ctx.save();
    ctx.fillStyle = P.paper;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(c.p[0], c.p[1], 15, 0, TAU);
    ctx.fill();
    ctx.restore();
    ternTop(ctx, P, c.p[0], c.p[1], a, 26, flap);
  }

  function migration(ctx, P, t) {
    if (t < 1.5 - 1e-6) return;
    const E = LIB.ease;
    // draw-on progress, visible on the start frame (one frame of lead)
    const prog = (a, b, e) => (t < a - 1e-6 ? 0 : (e || E.inOutSine)(clamp((t - a + FR) / (b - a))));
    const uA = prog(1.5, 1.875);
    const uB = prog(2.0, 2.25);
    const uF = prog(2.25, 2.5);
    const uN = prog(2.75, 2.958, E.outCubic);

    // the colony: a ring pops on the beat, with a flash
    const col = [COL[0], COL[1]];
    {
      const pop = E.outBack(clamp((t - 1.5 + FR) / (3 * FR)));
      ctx.save();
      ctx.strokeStyle = P.annMagenta;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(col[0], col[1], 13 * pop, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = P.annMagenta;
      ctx.beginPath();
      ctx.arc(col[0], col[1], 3.5, 0, TAU);
      ctx.fill();
      const fl = clamp((t - 1.5 + FR) / (10 * FR));
      if (fl < 1) {
        ctx.globalAlpha = 1 - fl;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(col[0], col[1], 13 + 70 * E.outExpo(fl), 0, TAU);
        ctx.stroke();
      }
      ctx.restore();
    }

    // the North Atlantic stopover box, drawn on from its top-left corner
    if (t >= 1.75 - 1e-6) {
      const u = E.outExpo(clamp((t - 1.75 + FR) / (6 * FR)));
      const [x0, y0, x1, y1] = STOP_BOX;
      const per = 2 * (x1 - x0 + y1 - y0);
      ctx.save();
      ctx.strokeStyle = P.annYellow;
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.setLineDash([per * u, per]);
      ctx.beginPath();
      ctx.rect(x0, y0, x1 - x0, y1 - y0);
      ctx.stroke();
      ctx.setLineDash([]);
      const c = 12;
      ctx.lineWidth = 4;
      ctx.globalAlpha = u;
      ctx.beginPath();
      for (const [x, y, sx, sy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]]) {
        ctx.moveTo(x, y + sy * c);
        ctx.lineTo(x, y);
        ctx.lineTo(x + sx * c, y);
      }
      ctx.stroke();
      ctx.restore();
    }

    // southbound legs in magenta dashes
    const cA = drawRouteLine(ctx, P, ROUTE.a, uA, P.annMagenta, true, 'a');
    const cB = drawRouteLine(ctx, P, ROUTE.b, uB, P.annMagenta, true, 'b');
    const cAf = drawRouteLine(ctx, P, ROUTE.af, uF, P.annMagenta, true, 'af');
    const cBr = drawRouteLine(ctx, P, ROUTE.br, uF, P.annMagenta, true, 'br');
    // the split south of Cape Verde
    if (t >= 2.25 - 1e-6) {
      const s = LATLON([10, -23]);
      const pop = E.outBack(clamp((t - 2.25 + FR) / (3 * FR)));
      ctx.save();
      ctx.fillStyle = P.annMagenta;
      ctx.beginPath();
      ctx.arc(s[0], s[1], 6 * pop, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = P.annMagenta;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(s[0], s[1], 12 * pop, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }

    // the Weddell Sea wintering area: the box edges and a ring around it
    if (t >= 2.5 - 1e-6) {
      const u = clamp((t - 2.5 + FR) / (6 * FR));
      const coastY = (x) => {
        const lon = (x - 540) / 8.6 - 20;
        return gy(lon < -35 ? lerp(-74, -78, clamp((lon + 61) / 13)) : lon < -30 ? -77 : lerp(-75.5, -70, clamp((lon + 25) / 25)));
      };
      ctx.save();
      ctx.strokeStyle = P.annYellow;
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 7]);
      ctx.globalAlpha = E.outExpo(u);
      ctx.beginPath();
      ctx.moveTo(WINTER.x0, coastY(WINTER.x0));
      ctx.lineTo(WINTER.x0, WINTER.y0);
      ctx.lineTo(lerp(WINTER.x0, WINTER.x1, E.outExpo(u)), WINTER.y0);
      if (u >= 1) ctx.lineTo(WINTER.x1, coastY(WINTER.x1));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      const rx = 352, ry = 142;
      const pop = E.outBack(clamp((t - 2.5 + FR) / (3 * FR)));
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(WINTER_C[0], WINTER_C[1], rx * pop, ry * pop, -0.03, 0, TAU);
      ctx.stroke();
      const fl = clamp((t - 2.5 + FR) / (12 * FR));
      if (fl < 1) {
        ctx.globalAlpha = 1 - fl;
        ctx.beginPath();
        ctx.ellipse(WINTER_C[0], WINTER_C[1], rx + 90 * E.outExpo(fl), ry + 50 * E.outExpo(fl), -0.03, 0, TAU);
        ctx.stroke();
      }
      ctx.restore();
    }

    // the northbound S-track in blue, with chevrons along it
    const cN = drawRouteLine(ctx, P, ROUTE.n, uN, P.annBlue, false, 'n');
    if (cN) {
      const pts = cN.prefix;
      const cum = cumLen(pts);
      const tot = cum[cum.length - 1];
      ctx.save();
      ctx.strokeStyle = P.annBlue;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let d = 60; d < tot - 20; d += 90) {
        const q = polyCut(pts, cum, d / tot);
        const a = Math.atan2(q.ty, q.tx);
        ctx.moveTo(q.p[0] + Math.cos(a + 2.6) * 9, q.p[1] + Math.sin(a + 2.6) * 9);
        ctx.lineTo(q.p[0], q.p[1]);
        ctx.lineTo(q.p[0] + Math.cos(a - 2.6) * 9, q.p[1] + Math.sin(a - 2.6) * 9);
      }
      ctx.stroke();
      ctx.restore();
      if (uN < 1) arrowHead(ctx, P, cN, P.annBlue);
    }

    // tern glyphs riding the heads of the lines
    if (t < 2.0 && cA) glyph(ctx, P, cA, t, 0);
    else if (t < 2.25 && cB) glyph(ctx, P, cB, t, 0);
    else if (t < 2.75) {
      if (cAf) glyph(ctx, P, cAf, t, 0);
      if (cBr) glyph(ctx, P, cBr, t, 1);
    } else if (cN) {
      if (cAf) glyph(ctx, P, polyCut(ROUTE.af.pts, ROUTE.af.cum, 1), t, 0);
      glyph(ctx, P, cN, t, 1);
    }
  }

  // ---------------------------------------------------------------------------
  // the shot
  // ---------------------------------------------------------------------------

  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const L = info.lib;
      const P = L.pal;
      const t = clamp(tIn, 0, info.dur);
      const cam = cameraAt(t);
      L.paper(ctx);
      const aW = sstep(0.3, 0.7, cam.p0);
      const cr = cardRect(cam);
      if (aW < 1) drawL1Layer(ctx, P, cam, t, info.T, false);
      if (t >= 1.5) {
        ctx.drawImage(mapBase(P, cam), 0, 0, FW, FH);
        drawWorld(ctx, P, cam, t, null, 'dynamic');
      } else if (aW > 0) withAlpha(ctx, aW, (c) => drawWorld(c, P, cam, t, aW < 1 ? cr : null));
      if (aW >= 1) {
        const aC = sstep(14, 40, cr.w);
        if (aC > 0) withAlpha(ctx, aC, (c) => drawL1Layer(c, P, cam, t, info.T, true));
      }
      framingRects(ctx, P, cam, t);
      migration(ctx, P, t);
    },
  });
})();
