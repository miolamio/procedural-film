// Fixture scene: multiplane pull-back. Leaf on the focus plane, grass nearer, hills and sky farther.
FILM.scene({
  id: 'fx-parallax',
  draw(ctx, t, info) {
    const L = info.lib;
    const P = L.pal;
    const zoom = L.lerp(3, 1, info.p);

    const drawSky = (g) => {
      g.fillStyle = P.stripeSky;
      g.fillRect(-2200, -2200, 5600, 7000);
      g.save();
      g.globalAlpha *= 0.55;
      g.fillStyle = P.duskRose;
      g.fillRect(-2200, 620, 5600, 820);
      g.restore();
      g.fillStyle = P.white;
      g.beginPath();
      g.ellipse(780, 380, 210, 70, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = P.stripeCream;
      g.beginPath();
      g.ellipse(860, 410, 140, 52, 0.25, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = P.white;
      g.beginPath();
      g.ellipse(420, 300, 120, 40, -0.2, 0, Math.PI * 2);
      g.fill();
      L.glowDot(g, 250, 340, 58, {
        color: P.sun, core: P.glow, additive: false, rays: 14, rayLen: 2.2, rayWidth: 0.16, twinkle: 0, glow: 3.2,
      });
    };

    const drawHills = (g) => {
      const ridge = (color, y0, humps) => {
        g.beginPath();
        g.moveTo(-1800, 3200);
        g.lineTo(-1800, y0);
        for (let i = 0; i < humps.length; i++) g.lineTo(humps[i][0], humps[i][1]);
        g.lineTo(3000, y0);
        g.lineTo(3000, 3200);
        g.closePath();
        g.fillStyle = color;
        g.fill();
      };
      ridge(P.dusk, 1120, [[-400, 1040], [80, 820], [420, 980], [780, 740], [1160, 960], [1560, 860], [2000, 1000]]);
      ridge(P.teal, 1280, [[-500, 1220], [40, 1060], [380, 1200], [760, 1020], [1120, 1180], [1520, 1080], [1960, 1200]]);
      ridge(P.sage, 1460, [[-600, 1420], [20, 1280], [340, 1400], [700, 1240], [1080, 1380], [1480, 1260], [1920, 1400]]);
    };

    const drawLeaf = (g) => {
      const leaf = [[540, 760], [700, 900], [660, 1100], [540, 1180], [420, 1100], [380, 900]];
      L.inkPath(g, leaf, { closed: true, smooth: true, fill: P.leaf, color: P.ink, width: 6, seed: 11 });
      L.inkPath(g, [[540, 840], [545, 1120]], { color: P.ink, width: 4, seed: 12 });
      L.inkPath(g, [[540, 940], [640, 900]], { color: P.inkSoft, width: 3, seed: 13 });
      L.inkPath(g, [[538, 1000], [450, 960]], { color: P.inkSoft, width: 3, seed: 14 });
      L.inkPath(g, [[542, 1060], [620, 1080]], { color: P.inkSoft, width: 2.5, seed: 15 });
    };

    const drawGrass = (g) => {
      const rnd = L.rng(25);
      g.lineCap = 'round';
      g.lineJoin = 'round';
      for (let i = 0; i < 64; i++) {
        const x = -280 + rnd() * 1640;
        const y = 980 + rnd() * 1200;
        const h = 90 + rnd() * 200;
        const lean = (rnd() - 0.5) * 70;
        g.strokeStyle = rnd() < 0.55 ? P.leaf : P.sage;
        g.lineWidth = 4 + rnd() * 6;
        g.beginPath();
        g.moveTo(x, y + 30);
        g.quadraticCurveTo(x + lean * 0.35, y - h * 0.5, x + lean, y - h);
        g.stroke();
      }
      const clumps = [[630, 1120, 38], [470, 1088, 30], [560, 1200, 24], [160, 1320, 52], [960, 1280, 48], [300, 1500, 40]];
      for (let i = 0; i < clumps.length; i++) {
        const x = clumps[i][0], y = clumps[i][1], r = clumps[i][2];
        g.fillStyle = i % 2 ? P.orange : P.ochre;
        g.beginPath();
        g.arc(x, y, r, 0, Math.PI * 2);
        g.fill();
        g.lineWidth = 5;
        g.strokeStyle = P.ink;
        g.stroke();
        g.fillStyle = P.sun;
        g.beginPath();
        g.arc(x, y, r * 0.36, 0, Math.PI * 2);
        g.fill();
      }
    };

    // Listed out of depth order on purpose: layers sorts far to near.
    L.layers(ctx, { x: 540, y: 960, zoom }, [
      { z: 1, draw: drawLeaf },
      { z: 0.6, draw: drawGrass },
      { z: 3, draw: drawHills },
      { z: 10, draw: drawSky, fog: { color: P.white, amount: 0.1 } },
    ]);
  },
});
