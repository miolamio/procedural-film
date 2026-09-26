// Fixture plate for the vhs carrier: colour bars (the chroma lag shows on their edges), a home-video
// sunset with a kite on a string, and a night plate the tracking transition rolls into.
function drawVhsPlate(ctx, t, info) {
  const L = info.lib;
  const P = L.pal;
  const night = info.shot.id === 'fx-vhs-tracking';
  const sky = ctx.createLinearGradient(0, 0, 0, 1300);
  sky.addColorStop(0, night ? P.night : P.dusk);
  sky.addColorStop(1, night ? P.nightSky : P.sunset);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, info.W, info.H);
  const bars = [P.white, P.sun, P.teal, P.leaf, P.magenta, P.red, P.annBlue, P.ink];
  bars.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.fillRect(90 + i * 112.5, 240, 112.5, 220);
  });
  ctx.fillStyle = night ? P.lineWhite : P.sun;
  ctx.beginPath();
  ctx.arc(760, night ? 700 : 1080, night ? 90 : 170, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = night ? P.tealDeep : P.sage;
  ctx.beginPath();
  ctx.moveTo(0, 1250);
  ctx.quadraticCurveTo(360, 1080, 700, 1220);
  ctx.quadraticCurveTo(900, 1300, 1080, 1180);
  ctx.lineTo(1080, 1920);
  ctx.lineTo(0, 1920);
  ctx.fill();
  ctx.fillStyle = night ? P.night : P.leaf;
  ctx.fillRect(0, 1480, info.W, 440);
  // the kite: a diamond swaying on a string from the grass
  const kx = 380 + 60 * Math.sin(info.T * 1.3);
  const ky = 760 + 40 * Math.sin(info.T * 2.1);
  ctx.strokeStyle = P.white;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(kx, ky + 110);
  ctx.quadraticCurveTo(kx + 120, 1200, 240, 1560);
  ctx.stroke();
  ctx.fillStyle = night ? P.paleBlue : P.red;
  ctx.beginPath();
  ctx.moveTo(kx, ky - 110);
  ctx.lineTo(kx + 75, ky);
  ctx.lineTo(kx, ky + 110);
  ctx.lineTo(kx - 75, ky);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = P.ink;
  ctx.stroke();
}

for (const id of ['fx-vhs', 'fx-vhs-tracking']) {
  FILM.scene({ id, draw: drawVhsPlate });
}
