// Fixture plate for the xerox carrier: a flyer for a radio mast going off the air, drawn in
// colour with soft tones (a sky gradient, a lit globe) so the copy has something to crush.
// The carrier does all of the photocopy look.
function drawXeroxPlate(ctx, t, info) {
  const L = info.lib;
  const P = L.pal;
  ctx.fillStyle = P.paper;
  ctx.fillRect(0, 0, info.W, info.H);
  // the "photo": a sky gradient in a frame
  const px = 90, py = 380, pw = 900, ph = 900;
  const sky = ctx.createLinearGradient(0, py, 0, py + ph);
  sky.addColorStop(0, P.nightSky);
  sky.addColorStop(0.6, P.duskRose);
  sky.addColorStop(1, P.stripeYellow);
  ctx.fillStyle = sky;
  ctx.fillRect(px, py, pw, ph);
  ctx.save();
  ctx.beginPath();
  ctx.rect(px, py, pw, ph);
  ctx.clip();
  // a lit globe (the moon) with a soft terminator
  const g = ctx.createRadialGradient(760, 560, 10, 800, 600, 150);
  g.addColorStop(0, P.white);
  g.addColorStop(0.7, P.tan);
  g.addColorStop(1, P.inkSoft);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(800, 600, 130, 0, Math.PI * 2);
  ctx.fill();
  // hills
  ctx.fillStyle = P.leaf;
  ctx.beginPath();
  ctx.moveTo(px, 1120);
  ctx.quadraticCurveTo(400, 1020, px + pw, 1100);
  ctx.lineTo(px + pw, py + ph);
  ctx.lineTo(px, py + ph);
  ctx.fill();
  // the mast: a lattice tower, broadcast rings expanding from the top
  const mx = 380, top = 560, base = 1180;
  ctx.strokeStyle = P.ink;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(mx - 90, base);
  ctx.lineTo(mx, top);
  ctx.lineTo(mx + 90, base);
  for (let y = top + 60; y < base; y += 70) {
    const a = ((y - top) / (base - top)) * 90;
    const b = ((y + 70 - top) / (base - top)) * 90;
    ctx.moveTo(mx - a, y);
    ctx.lineTo(mx + b, Math.min(base, y + 70));
    ctx.moveTo(mx + a, y);
    ctx.lineTo(mx - b, Math.min(base, y + 70));
  }
  ctx.stroke();
  ctx.lineWidth = 6;
  for (let k = 0; k < 4; k++) {
    const r = 40 + ((t * 160 + k * 110) % 440);
    ctx.globalAlpha = 1 - r / 480;
    ctx.beginPath();
    ctx.arc(mx, top, r, -Math.PI * 0.8, -Math.PI * 0.2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = P.red;
  ctx.beginPath();
  ctx.arc(mx, top, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.lineWidth = 4;
  ctx.strokeRect(px, py, pw, ph);
  // the flyer's type
  L.strokeText(ctx, 'DEAD AIR', 540, 130, { style: 'stencil', size: 120, color: P.ink, align: 'center' });
  L.strokeText(ctx, 'mast 7 / last broadcast', 540, 1350, { style: 'stencil', size: 44, color: P.red, align: 'center', tracking: 0.4 });
  L.strokeText(ctx, 'the signal stops at midnight.\nkeep this copy.', 90, 1500, { size: 44, color: P.inkSoft, seed: 4 });
  ctx.fillStyle = P.teal;
  ctx.fillRect(90, 1760, 900, 40);
}

FILM.scene({ id: 'fx-xerox', draw: drawXeroxPlate });
FILM.scene({ id: 'fx-xerox-b', draw: drawXeroxPlate });
