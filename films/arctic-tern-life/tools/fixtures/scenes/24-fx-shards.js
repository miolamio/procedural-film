// Fixture plates for the shards theme: a Voronoi field of flat shards that part and close on the
// beat with a lit box among them, then a flight down a polygon tunnel (faces3d). The tunnel opens
// through a shatter transition.
function drawShardsPlate(ctx, t, info) {
  const L = info.lib;
  const P = L.pal;
  ctx.fillStyle = P.navyDeep;
  ctx.fillRect(0, 0, info.W, info.H);
  const rng = L.rng(L.hash('fx-shards', 1));
  const sites = [];
  for (let i = 0; i < 42; i++) sites.push([80 + rng() * 920, 260 + rng() * 1300]);
  const cells = L.voronoi(sites, [80, 260, 920, 1300]);
  const tones = [P.navyLight, P.grid, P.paleBlue, P.navyLight];
  const gap = 0.05 * (0.5 - 0.5 * Math.cos(L.beat(info.T).frac * Math.PI * 2));
  for (const c of cells) {
    if (c.poly.length < 3) continue;
    let cx = 0, cy = 0;
    for (const q of c.poly) {
      cx += q[0];
      cy += q[1];
    }
    cx /= c.poly.length;
    cy /= c.poly.length;
    const ox = (cx - 540) * gap, oy = (cy - 910) * gap;
    ctx.beginPath();
    c.poly.forEach((q, k) => (k ? ctx.lineTo(q[0] + ox, q[1] + oy) : ctx.moveTo(q[0] + ox, q[1] + oy)));
    ctx.closePath();
    ctx.fillStyle = tones[(L.hash('shard', c.i) >>> 0) % tones.length];
    ctx.fill();
    ctx.strokeStyle = P.lineWhite;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
  L.faces3d(ctx, L.mesh3d.box(), { at: [540, 910], scale: 110, rot: [0.5, info.T * 0.9, 0], color: P.magenta, stroke: P.lineWhite, width: 1.5, ambient: 0.3 });
}

let fxTunnel = null;
function drawPolygonPlate(ctx, t, info) {
  const L = info.lib;
  const P = L.pal;
  ctx.fillStyle = P.navyDeep;
  ctx.fillRect(0, 0, info.W, info.H);
  if (!fxTunnel) fxTunnel = L.mesh3d.tunnel(8, 14, 1, 13);
  const seg = 8;
  const travel = (info.T * 3) % fxTunnel.ringStep;
  L.faces3d(ctx, fxTunnel, {
    at: [540, 960], scale: 620, persp: 1.6, rot: [0, 0, info.T * 0.25], shift: [0, 0, travel],
    color: (i) => ((i % seg) + Math.floor(i / seg)) % 2 ? P.navyLight : P.grid,
    fog: 0.95, fogColor: P.navyDeep, stroke: P.paleBlue, strokeAlpha: 0.6, width: 1.2,
  });
}

FILM.scene({ id: 'fx-shards', draw: drawShardsPlate });
FILM.scene({ id: 'fx-polygon', draw: drawPolygonPlate });
