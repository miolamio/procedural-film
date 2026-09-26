// Fixture plates for the xerox theme: a stencil poster run through a photocopier. Plate A: white
// sheet, a stencil wordmark that comes in letter by letter and drops letters, a figure whose head
// is a television of static, standing in a broken ring and holding its own unplugged cord, a cast
// shadow that the threshold cuts off halfway, and a torn black band at the foot with a knocked-out
// line, a counter running to midnight and test bars the threshold turns into a barcode. Every
// black shape is a stencil: flat fill, white bridges where a loop would close, a white keyline
// where two shapes overlap. Drawings hold on threes on one global clock; the xerox carrier adds the
// copy jitter on 12. Plate B: the same frame under grade { invert: 1 }, cut on the figure's
// silhouette. Colours are the theme's rows (themes/xerox/palette.js); the fixture film keeps the
// house lib.pal, so the plate carries them here.
const XX = { sheet: '#FFFFFF', toner: '#141414', smudge: '#4A4A4A', glare: '#C4C4C4' };
// plate A's start, read from the timeline: both plates run on one global clock from it
const XX_T0 = (FILM.TIMELINE.shots.find((s) => s.id === 'fx-xerox-theme') || { start: 86 }).start;
const XX_GROUND = 1510; // the figure's sole line
const XX_KEY = 11; // keyline: the white gap between two overlapping stencil shapes
const XX_BRIDGE = 16; // bridge: the white gap that breaks a stencil shape

// The drawing index on threes (8 drawings a second) from the global clock.
function xxDrawing(T) {
  return Math.floor((T - XX_T0) * 8 + 1e-6);
}

// A white bridge across a bar from a to b at u (0..1), `gap` wide, reaching `reach` px each side.
function xxBridge(ctx, a, b, u, reach, gap = XX_BRIDGE) {
  const x = a[0] + (b[0] - a[0]) * u, y = a[1] + (b[1] - a[1]) * u;
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.fillStyle = XX.sheet;
  ctx.fillRect(-gap / 2, -reach, gap, reach * 2);
  ctx.restore();
}

// The figure as stencil parts, back to front: bars (polylines with a width) and filled shapes.
// Pure in the drawing index (only the plug swings), so plate A and plate B draw the same parts.
function xxFigure(n) {
  const swing = 0.32 * Math.sin(n * 0.95) + 0.12 * Math.sin(n * 2.3);
  const hand = [792, 1196];
  const plugLen = 150;
  const plug = [hand[0] + Math.sin(swing) * plugLen, hand[1] + Math.cos(swing) * plugLen];
  const parts = [
    { bar: [[472, 1236], [466, 1372], [462, 1480]], w: 66 },
    { bar: [[608, 1236], [614, 1372], [622, 1480]], w: 66 },
    { shape: 'rrect', x: 410, y: 1462, w: 104, h: 48, r: 18 },
    { shape: 'rrect', x: 586, y: 1462, w: 112, h: 48, r: 18 },
    { shape: 'poly', pts: [[402, 862], [678, 862], [724, 900], [760, 1262], [320, 1262], [356, 900]] },
    { bar: [[372, 910], [334, 1080], [352, 1214]], w: 60 },
    { dot: [356, 1226], r: 36 },
    { bar: [[706, 910], [770, 1066], [788, 1180]], w: 60 },
    { cable: [[708, 742], [880, 770], [900, 1000], [800, 1160]], w: 16 },
    { dot: hand, r: 38 },
    { cable: [hand, [hand[0] + Math.sin(swing) * 70, hand[1] + Math.cos(swing) * 70], plug], w: 16 },
    { shape: 'plug', at: plug, ang: -swing },
    { bar: [[540, 800], [540, 870]], w: 70, cap: 'butt' },
    { bar: [[520, 580], [432, 424]], w: 18 },
    { bar: [[560, 580], [664, 404]], w: 18 },
    { dot: [428, 416], r: 19 },
    { dot: [668, 396], r: 19 },
    { shape: 'rrect', x: 368, y: 566, w: 344, h: 256, r: 36 },
  ];
  return { parts, plug, swing, hand };
}

function xxPartPath(p) {
  const path = new Path2D();
  if (p.bar || p.cable) {
    const P = p.bar || p.cable;
    path.moveTo(P[0][0], P[0][1]);
    if (p.cable && P.length === 4) path.bezierCurveTo(P[1][0], P[1][1], P[2][0], P[2][1], P[3][0], P[3][1]);
    else if (p.cable) path.quadraticCurveTo(P[1][0], P[1][1], P[2][0], P[2][1]);
    else for (let i = 1; i < P.length; i++) path.lineTo(P[i][0], P[i][1]);
  } else if (p.dot) {
    path.arc(p.dot[0], p.dot[1], p.r, 0, Math.PI * 2);
  } else if (p.shape === 'rrect') {
    path.roundRect(p.x, p.y, p.w, p.h, p.r);
  } else if (p.shape === 'poly') {
    p.pts.forEach((q, i) => (i ? path.lineTo(q[0], q[1]) : path.moveTo(q[0], q[1])));
    path.closePath();
  } else if (p.shape === 'plug') {
    const m = new DOMMatrix().translate(p.at[0], p.at[1]).rotate((p.ang * 180) / Math.PI);
    const body = new Path2D();
    body.roundRect(-28, -6, 56, 74, 8);
    body.rect(-18, 66, 11, 42);
    body.rect(7, 66, 11, 42);
    path.addPath(body, m);
  }
  return path;
}

// Keyline, then the part: a stroked bar or a filled shape, in one colour.
function xxPart(ctx, p, color, key) {
  const path = xxPartPath(p);
  if (p.bar || p.cable) {
    ctx.lineCap = p.cap || 'round';
    ctx.lineJoin = 'round';
    if (key) {
      ctx.strokeStyle = XX.sheet;
      ctx.lineWidth = p.w + 2 * key;
      ctx.stroke(path);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = p.w;
    ctx.stroke(path);
  } else {
    if (key) {
      ctx.strokeStyle = XX.sheet;
      ctx.lineJoin = 'round';
      ctx.lineWidth = 2 * key;
      ctx.stroke(path);
    }
    ctx.fillStyle = color;
    ctx.fill(path);
  }
}

// The cut in the figure: bridges at knees, elbows, the coat's front and hem, the collar notch,
// the antenna feet; then the screen, knobs and grille knocked out of the head.
function xxFigureCuts(ctx, fig) {
  const P = fig.parts;
  xxBridge(ctx, P[0].bar[0], P[0].bar[2], 0.52, 40);
  xxBridge(ctx, P[1].bar[0], P[1].bar[2], 0.52, 40);
  xxBridge(ctx, P[5].bar[1], P[5].bar[2], 0.12, 36);
  xxBridge(ctx, P[7].bar[1], P[7].bar[2], 0.12, 36);
  ctx.fillStyle = XX.sheet;
  ctx.fillRect(540 - XX_BRIDGE / 2, 930, XX_BRIDGE, 340); // the coat's front
  ctx.beginPath();
  ctx.moveTo(494, 858);
  ctx.lineTo(586, 858);
  ctx.lineTo(540, 944);
  ctx.closePath();
  ctx.fill(); // the collar notch
  ctx.fillRect(330, 1180, 190, 12); // the hem, broken at the front
  ctx.fillRect(560, 1180, 190, 12);
  // the head: screen, two knobs, the grille
  const scr = new Path2D();
  scr.roundRect(398, 596, 222, 196, 30);
  ctx.fill(scr);
  ctx.beginPath();
  ctx.arc(664, 636, 17, 0, Math.PI * 2);
  ctx.moveTo(681, 690);
  ctx.arc(664, 690, 17, 0, Math.PI * 2);
  ctx.fill();
  for (let k = 0; k < 4; k++) ctx.fillRect(642, 734 + k * 18, 46, 8);
  return scr;
}

// What the screen shows: static (a noisePlate, a new field every drawing, soft so the threshold
// has greys to cut) with a rolling bar, or for one drawing every half second a pair of eyes.
function xxScreen(ctx, L, scr, n) {
  ctx.save();
  ctx.clip(scr);
  if (((n % 4) + 4) % 4 === 2) {
    ctx.fillStyle = XX.toner;
    [[462, 694], [556, 694]].forEach(([x, y]) => {
      ctx.beginPath();
      ctx.ellipse(x, y, 13, 42, 0, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillRect(418, 626, 76, 10); // one lid, half closed
  } else {
    L.noisePlate(ctx, { x: 398, y: 596, w: 222, h: 196, seed: 80 + (((n % 6) + 6) % 6), scale: 7, threshold: 0.5, soft: 0.5, grain: 0.75, color: XX.toner, res: 0.5 });
    const y = 596 + ((((n * 37) % 196) + 196) % 196);
    ctx.fillStyle = XX.smudge;
    ctx.fillRect(398, y, 222, 26);
    ctx.fillStyle = XX.glare;
    ctx.fillRect(398, y + 26, 222, 16);
  }
  ctx.restore();
}

// The broken ring behind the head: six bridges that step round by 6 degrees a drawing.
function xxRing(ctx, n) {
  const cx = 540, cy = 694, R = 318, w = 58;
  ctx.strokeStyle = XX.toner;
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.stroke();
  const a0 = (n * 6 * Math.PI) / 180;
  for (let k = 0; k < 6; k++) {
    const a = a0 + (k * Math.PI) / 3 + 0.3 * Math.sin(k * 2.1);
    xxBridge(ctx, [cx, cy], [cx + Math.cos(a), cy + Math.sin(a)], R, w / 2 + 3, XX_BRIDGE + 4);
  }
}

// The cast shadow: the figure flattened onto the ground and thrown to the right, filled with a
// grey ramp from smudge to glare. The threshold cuts it where the ramp crosses mid grey.
function xxShadow(ctx, fig) {
  ctx.save();
  // y' = G + (G - y) · 0.12, x' = x + (G - y) · 0.8: flattened below the sole line, thrown right
  ctx.transform(1, 0, -0.8, -0.12, 0.8 * XX_GROUND, XX_GROUND * 1.12);
  const g = ctx.createLinearGradient(0, XX_GROUND, 0, 400);
  g.addColorStop(0, XX.smudge);
  g.addColorStop(1, XX.glare);
  for (const p of fig.parts) {
    const q = Object.assign({}, p);
    xxPart(ctx, q, g, 0);
  }
  ctx.restore();
}

// Letters laid out by the stroke font's own metrics, so each can be dropped on its own.
function xxLetters(L, str, size, tracking, cx) {
  const SF = L.strokeFont;
  const u = size / 10, weight = size * 0.17, gap = 1.8 * u + weight + tracking * u;
  const chars = Array.from(str);
  let w = weight;
  chars.forEach((ch, k) => (w += SF[ch].w * u + (k < chars.length - 1 ? gap : 0)));
  let pen = cx - w / 2;
  return chars.map((ch) => {
    const at = pen;
    pen += SF[ch].w * u + gap;
    return { ch, x: at };
  });
}

// The wordmark: letters come in on threes in a shuffled order, then a letter drops out now and
// then (a toner skip), and one is misfed a few px for a drawing.
function xxWordmark(ctx, L, n) {
  const order = [3, 0, 6, 1, 5, 7, 2, 4];
  const glyphs = xxLetters(L, 'DEAD AIR', 132, 0.6, 540);
  glyphs.forEach((g, j) => {
    if (g.ch === ' ') return;
    if (order[j] > n + 3) return; // four letters on frame 0, the word whole by the fifth drawing
    if (n >= 5 && L.h3(n, j, 67) < 0.045) return;
    const dx = L.h3(n, j, 68) < 0.06 ? 10 : 0;
    L.strokeText(ctx, g.ch, g.x + dx, 104, { style: 'stencil', size: 132, color: XX.toner });
  });
  L.strokeText(ctx, 'CH 7 / OFF AIR', 540, 282, { style: 'stencil', size: 40, tracking: 2, color: XX.toner, align: 'center' });
}

// The foot of the sheet: a torn black band, a knocked-out line, a counter that runs to midnight
// (00:00:00 at the cut) and test bars the threshold turns into a barcode.
function xxBand(ctx, L, n) {
  const top = 1652;
  ctx.fillStyle = XX.toner;
  ctx.beginPath();
  ctx.moveTo(0, 1920);
  for (let x = 0; x <= 1080; x += 12) ctx.lineTo(x, top + 14 * L.noise1(x * 0.02, 5) + 7 * L.h3(x, 3, 69));
  ctx.lineTo(1080, 1920);
  ctx.closePath();
  ctx.fill();
  L.strokeText(ctx, 'STAY TUNED', 540, 1686, { style: 'stencil', size: 80, tracking: 1.2, color: XX.sheet, align: 'center' });
  const day = 24 * 3600 * 24;
  const ff = (((day - 24 + n * 3) % day) + day) % day; // frames since midnight, a drawing at a time
  const p2 = (v) => String(v).padStart(2, '0');
  const tc = `${p2(Math.floor(ff / 86400))}:${p2(Math.floor(ff / 1440) % 60)}:${p2(Math.floor(ff / 24) % 60)}:${p2(ff % 24)}`;
  L.strokeText(ctx, tc, 540, 1790, { style: 'stencil', size: 34, tracking: 1.5, color: XX.sheet, align: 'center' });
  // the copier's grey scale: ten steps from black to white in a white frame; the threshold cuts
  // it in half, so the dark steps merge with the band and only their white ticks remain
  const x0 = 150, x1 = 930, y0 = 1846, h = 40, k = 10, gap = 6;
  const sw = (x1 - x0 - (k - 1) * gap) / k;
  ctx.fillStyle = XX.sheet;
  ctx.fillRect(x0 - 8, y0 - 8, x1 - x0 + 16, h + 16);
  for (let i = 0; i < k; i++) {
    const v = Math.round((255 * i) / (k - 1)).toString(16).padStart(2, '0');
    ctx.fillStyle = '#' + v + v + v;
    ctx.fillRect(x0 + i * (sw + gap), y0, sw, h);
  }
}

function drawXeroxTheme(ctx, t, info) {
  const L = info.lib;
  const n = xxDrawing(info.T);
  ctx.fillStyle = XX.sheet;
  ctx.fillRect(0, 0, info.W, info.H);
  const fig = xxFigure(n);
  xxShadow(ctx, fig);
  xxRing(ctx, n);
  for (const p of fig.parts) xxPart(ctx, p, XX.toner, XX_KEY);
  const scr = xxFigureCuts(ctx, fig);
  xxScreen(ctx, L, scr, n);
  xxBand(ctx, L, n);
  xxWordmark(ctx, L, n);
}

FILM.scene({ id: 'fx-xerox-theme', draw: drawXeroxTheme });
FILM.scene({ id: 'fx-xerox-theme-b', draw: drawXeroxTheme });
