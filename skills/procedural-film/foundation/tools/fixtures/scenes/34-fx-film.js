// Fixture plate for the film carrier: a windmill turning at dusk, warm midtones where the dust,
// the scratches and the perforations show. The carrier does all of the film look.
function drawFilmPlate(ctx, t, info) {
  const L = info.lib;
  const P = L.pal;
  const sky = ctx.createLinearGradient(0, 0, 0, 1400);
  sky.addColorStop(0, P.paperShade);
  sky.addColorStop(1, P.duskRose);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, info.W, info.H);
  ctx.fillStyle = P.stripeYellow;
  ctx.beginPath();
  ctx.arc(700, 1050, 150, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = P.inkSoft;
  ctx.beginPath();
  ctx.moveTo(0, 1360);
  ctx.quadraticCurveTo(540, 1250, 1080, 1340);
  ctx.lineTo(1080, 1920);
  ctx.lineTo(0, 1920);
  ctx.fill();
  // the windmill: a tapered tower, a cap and four sails turning slowly
  const cx = 420, cy = 820;
  ctx.fillStyle = P.ink;
  ctx.beginPath();
  ctx.moveTo(cx - 70, 1330);
  ctx.lineTo(cx - 38, cy + 30);
  ctx.lineTo(cx + 38, cy + 30);
  ctx.lineTo(cx + 70, 1330);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy + 30, 42, Math.PI, 0);
  ctx.fill();
  const a0 = info.T * 0.9;
  for (let k = 0; k < 4; k++) {
    const a = a0 + (k * Math.PI) / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(a);
    ctx.fillRect(-5, 0, 10, 330);
    ctx.strokeStyle = P.ink;
    ctx.lineWidth = 3;
    ctx.strokeRect(8, 60, 60, 260);
    for (let y = 90; y < 320; y += 30) {
      ctx.beginPath();
      ctx.moveTo(8, y);
      ctx.lineTo(68, y);
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.fillStyle = P.inkFaint;
  ctx.beginPath();
  ctx.arc(cx, cy, 14, 0, Math.PI * 2);
  ctx.fill();
}

FILM.scene({ id: 'fx-film', draw: drawFilmPlate });
