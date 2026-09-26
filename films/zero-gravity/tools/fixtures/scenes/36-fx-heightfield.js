// Fixture plates for lib.heightfield: one island in all three modes, cut between them on the beat.
// fx-heightfield-mesh turns the perspective contour mesh on black, fx-heightfield is the same
// surface as a hillshaded false-colour map from above, fx-heightfield-contour the contour map.
// The same field, box, range and ramp in every shot, so the island does not move across the cuts;
// lib.heightPoint pins the summit marker in each mode.
const HF_BOX = [90, 470, 900, 900];
const HF_RANGE = [0, 1];
// Lightwave landscape: deep water, blue shallows, sand, red slopes, a yellow summit (pal names only)
const HF_RAMP = [[0, 'navyDeep'], [0.3, 'annBlue'], [0.36, 'tan'], [0.66, 'red'], [1, 'sun']];
const HF_PEAK = [0.56, 0.42];
const HF_LEVELS = [0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9]; // the coast, then every 0.05

function hfIsland(L) {
  return (u, v) => {
    // a warped mass with a summit and a ridge running south-west, on a nearly flat sea floor
    const wu = u + 0.08 * L.fbm2(u * 2.5, v * 2.5, 3, 2), wv = v + 0.08 * L.fbm2(u * 2.5 + 9, v * 2.5, 3, 2);
    const r = Math.hypot((wu - 0.5) * 1.15, wv - 0.52);
    const mass = L.smoothstep(0.56, 0.14, r);
    const peak = Math.exp(-((u - HF_PEAK[0]) ** 2 + (v - HF_PEAK[1]) ** 2) * 45);
    const ridge = Math.exp(-(((u - 0.34) * 0.8 + (v - 0.66) * 0.6) ** 2 * 25 + ((u - 0.34) * 0.6 - (v - 0.66) * 0.8) ** 2 * 260));
    const rough = L.fbm2(u * 10, v * 10, 5, 4);
    const land = 0.42 * mass + 0.44 * peak * mass + 0.24 * ridge * mass + 0.3 * rough * mass;
    return L.clamp(0.1 + 0.04 * rough + land, 0, 1);
  };
}

function hfFrame(ctx, info, title) {
  const L = info.lib;
  const P = L.pal;
  ctx.fillStyle = P.navyDeep;
  ctx.fillRect(0, 0, info.W, info.H);
  L.text(ctx, title, 90, 170, { size: 38, color: P.lineWhite, tracking: 1 });
  // legend: the ramp as a gradient under the plate
  const g = ctx.createLinearGradient(90, 0, 990, 0);
  for (const [at, hex] of L.rampStops(HF_RAMP)) g.addColorStop(at, hex);
  ctx.fillStyle = g;
  ctx.fillRect(90, 1440, 900, 22);
  L.text(ctx, 'sea', 90, 1500, { size: 22, color: P.paleBlue });
  L.text(ctx, 'summit', 900, 1500, { size: 22, color: P.paleBlue });
}

function hfMarker(ctx, info, p, label) {
  const P = info.lib.pal;
  ctx.save();
  ctx.strokeStyle = P.lineWhite;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(p[0], p[1]);
  ctx.lineTo(p[0] + 70, p[1] - 90);
  ctx.lineTo(p[0] + 150, p[1] - 90);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(p[0], p[1], 7, 0, Math.PI * 2);
  ctx.fillStyle = P.lineWhite;
  ctx.fill();
  ctx.restore();
  info.lib.text(ctx, label, p[0] + 78, p[1] - 104, { size: 24, color: P.lineWhite });
}

function drawHfMesh(ctx, t, info) {
  const L = info.lib;
  hfFrame(ctx, info, 'heightfield · mesh');
  const field = hfIsland(L);
  const u = L.clamp(t / info.dur);
  const opts = {
    mode: 'mesh', box: HF_BOX, range: HF_RANGE, ramp: HF_RAMP, key: 'fx-hf-island',
    rot: [0.95, -0.45 + 0.6 * L.ease.inOutQuad(u), 0], lift: 220, cut: 0.2, lines: 'grid', res: 48,
  };
  L.heightfield(ctx, field, opts);
  hfMarker(ctx, info, L.heightPoint(field, HF_PEAK[0], HF_PEAK[1], opts), 'summit');
}

function drawHfMap(ctx, t, info) {
  const L = info.lib;
  hfFrame(ctx, info, 'heightfield · fill');
  const field = hfIsland(L);
  // the sun swings from the north-west to the north-east: the hillshade moves, the colours hold
  const a = -2.3 + 1.4 * L.clamp(t / info.dur);
  const light = [Math.cos(a), Math.sin(a), 0.62];
  const opts = { mode: 'fill', box: HF_BOX, range: HF_RANGE, ramp: HF_RAMP, key: 'fx-hf-island', res: 128, shade: 0.45, lift: 220, light };
  L.heightfield(ctx, field, opts);
  hfMarker(ctx, info, L.heightPoint(field, HF_PEAK[0], HF_PEAK[1], opts), 'summit');
}

function drawHfContour(ctx, t, info) {
  const L = info.lib;
  hfFrame(ctx, info, 'heightfield · contour');
  const field = hfIsland(L);
  // contours climb from the coast to the summit over the shot
  const top = 0.42 + 0.5 * L.ease.outQuad(t / info.dur);
  const levels = HF_LEVELS.filter((h) => h <= top);
  const opts = { mode: 'contour', box: HF_BOX, range: HF_RANGE, ramp: HF_RAMP, key: 'fx-hf-island', levels, major: 4, width: 2 };
  L.heightfield(ctx, field, opts);
  hfMarker(ctx, info, L.heightPoint(field, HF_PEAK[0], HF_PEAK[1], opts), 'summit');
}

FILM.scene({ id: 'fx-heightfield-mesh', draw: drawHfMesh });
FILM.scene({ id: 'fx-heightfield', draw: drawHfMap });
FILM.scene({ id: 'fx-heightfield-contour', draw: drawHfContour });
