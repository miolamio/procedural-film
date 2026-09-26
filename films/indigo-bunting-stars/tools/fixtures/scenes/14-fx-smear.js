// Fixture scene: a wingbeat on twos. Left wing is one drawing; the right wing carries
// ghosts and speed lines across the same three-drawing flap, then both hold.
FILM.scene({
  id: 'fx-smear',
  draw(ctx, t, info) {
    const L = info.lib;
    const P = L.pal;
    t = L.clamp(t, 0, info.dur);
    L.paper(ctx, { seed: 7, fibres: 0.3 });

    const HY = 980;
    const LX = 330;
    const RX = 750;
    // up, mid, down. Drawings 1, 2 and 3 of each six are the flap; the rest hold up.
    const ANGLES = [-1.02, 0.08, 1.22];
    const d = Math.floor(L.onTwos(t) * 12 + 1e-6);
    const pose = (i) => {
      const c = ((i % 6) + 6) % 6;
      return c === 1 ? 1 : c === 2 ? 2 : 0;
    };
    const a1 = ANGLES[pose(d)];
    const a0 = ANGLES[pose(d <= 0 ? 0 : d - 1)];
    const wob = L.noise1(L.boil(info.T) * 0.21, 11) * 3.5;

    const wing = (g, hx, sign, ang) => {
      g.save();
      g.translate(hx, HY);
      g.rotate(ang);
      g.scale(sign, 1);
      g.beginPath();
      g.moveTo(24, -8);
      g.quadraticCurveTo(36, -86, 118, -112 + wob);
      g.quadraticCurveTo(206, -132, 246, -42);
      g.quadraticCurveTo(272, 22, 208, 74);
      g.quadraticCurveTo(132, 112, 56, 42);
      g.quadraticCurveTo(16, 14, 24, -8);
      g.closePath();
      g.fillStyle = P.orange;
      g.fill();
      g.lineJoin = 'round';
      g.lineWidth = 5.5;
      g.strokeStyle = P.ink;
      g.stroke();
      g.lineWidth = 2.4;
      g.strokeStyle = P.inkSoft;
      g.beginPath();
      g.moveTo(40, -2);
      g.quadraticCurveTo(120, -18, 214, -28);
      g.moveTo(44, 10);
      g.quadraticCurveTo(112, 28, 176, 52);
      g.moveTo(78, -46);
      g.quadraticCurveTo(136, -8, 154, 36);
      g.stroke();
      g.fillStyle = P.ink;
      g.beginPath();
      g.arc(164, -16, 13, 0, L.TAU);
      g.arc(192, 26, 8, 0, L.TAU);
      g.fill();
      g.fillStyle = P.white;
      g.beginPath();
      g.arc(160, -20, 4.2, 0, L.TAU);
      g.fill();
      g.restore();
    };

    const body = (g, x) => {
      g.save();
      g.fillStyle = P.ink;
      g.beginPath();
      g.ellipse(x, HY, 16, 34, 0, 0, L.TAU);
      g.fill();
      g.fillStyle = P.ochre;
      g.beginPath();
      g.ellipse(x, HY - 8, 6, 10, 0, 0, L.TAU);
      g.fill();
      g.strokeStyle = P.ink;
      g.lineWidth = 2.6;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(x, HY - 28);
      g.quadraticCurveTo(x - 18, HY - 70, x - 32, HY - 94);
      g.moveTo(x, HY - 28);
      g.quadraticCurveTo(x + 18, HY - 70, x + 32, HY - 94);
      g.stroke();
      g.beginPath();
      g.arc(x - 32, HY - 94, 3.2, 0, L.TAU);
      g.arc(x + 32, HY - 94, 3.2, 0, L.TAU);
      g.fill();
      g.restore();
    };

    ctx.save();
    ctx.strokeStyle = P.inkFaint;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 12]);
    ctx.beginPath();
    ctx.moveTo(540, 300);
    ctx.lineTo(540, 1460);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = P.paperDeep;
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.ellipse(LX, HY + 176, 120, 15, 0, 0, L.TAU);
    ctx.ellipse(RX, HY + 176, 120, 15, 0, 0, L.TAU);
    ctx.fill();
    ctx.restore();

    wing(ctx, LX, -1, a1);
    const drawR = (g, u) => wing(g, RX, 1, u);
    if (a0 !== a1) {
      L.smear(ctx, drawR, { from: a0, to: a1, n: 5, mode: 'ghosts', alpha: 1, falloff: 0.75, seed: L.hash('fx-smear', 'ghosts') });
      L.smear(ctx, drawR, { from: a0, to: a1, n: 5, mode: 'lines', alpha: 0.95, falloff: 1.1, seed: L.hash('fx-smear', 'lines') });
    } else {
      drawR(ctx, a1);
    }
    body(ctx, LX);
    body(ctx, RX);
  },
});
