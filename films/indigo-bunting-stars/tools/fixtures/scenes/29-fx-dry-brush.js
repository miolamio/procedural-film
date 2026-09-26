// Fixture scene: a forest in three planes painted with lib.dryBrushFill, and branches and ground
// strokes with lib.dryBrush, on grey paper inside a black passe-partout. The camera tracks right
// through lib.layers. Every plate is cached per (shape, seed, boil variant); a frame only blits.
function dryTrunk(L, x, base, top, wBase, wTop, lean, seed) {
  const n = 22;
  const left = [];
  const right = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n; // 0 at the base
    const y = base + (top - base) * u;
    const flare = Math.pow(1 - u, 7) * wBase * 0.9;
    const hw = (wBase + (wTop - wBase) * u) / 2 + flare;
    const cx = x + lean * u * u + L.noise1(u * 3.1, seed) * wBase * 0.12;
    left.push([cx - hw + L.noise1(u * 9, seed + 1) * 2.2, y]);
    right.push([cx + hw + L.noise1(u * 9, seed + 2) * 2.2, y]);
  }
  return left.concat(right.reverse());
}

function dryPlane(L, spec) {
  const rnd = L.rng(spec.seed);
  const out = [];
  for (let i = 0; i < spec.count; i++) {
    const x = spec.x0 + (spec.x1 - spec.x0) * ((i + 0.2 + rnd() * 0.6) / spec.count);
    const w = spec.w[0] + rnd() * (spec.w[1] - spec.w[0]);
    out.push(dryTrunk(L, x, spec.base + rnd() * 20, spec.top - rnd() * 60, w, w * 0.62, (rnd() - 0.5) * spec.lean, spec.seed * 10 + i));
  }
  return out;
}

FILM.scene({
  id: 'fx-dry-brush',
  draw(ctx, t, info) {
    const L = info.lib;
    const P = L.pal;
    const paperGrey = L.mix(P.white, P.stripeSky, 0.55);
    L.paper(ctx, { color: paperGrey, seed: 29, vignette: 0.2, fibres: 0.6 });

    const far = dryPlane(L, { seed: 291, count: 9, x0: -260, x1: 1400, base: 1420, top: 180, w: [34, 52], lean: 40 });
    const mid = dryPlane(L, { seed: 292, count: 5, x0: -200, x1: 1320, base: 1560, top: 20, w: [70, 96], lean: 60 });
    const near = dryPlane(L, { seed: 293, count: 3, x0: -120, x1: 1220, base: 1980, top: -120, w: [118, 146], lean: 50 });
    const inkFar = L.mix(paperGrey, P.ink, 0.28);
    const inkMid = L.mix(paperGrey, P.ink, 0.58);

    const planes = [
      {
        z: 3,
        draw: (g) => {
          L.dryBrushFill(g, far, { color: inkFar, width: 18, dry: 0.5, seed: 31, boil: false });
          L.dryBrush(g, [[[-300, 1438], [300, 1430], [760, 1446], [1500, 1432]]], { color: inkFar, width: 22, dry: 0.7, seed: 32, boil: false });
        },
      },
      {
        z: 1.6,
        draw: (g) => {
          L.dryBrushFill(g, mid, { color: inkMid, width: 24, dry: 0.4, seed: 33, boil: false });
          L.dryBrush(g, [[[-260, 1572], [420, 1560], [1000, 1582], [1480, 1566]]], { color: inkMid, width: 30, dry: 0.6, seed: 34, boil: false });
        },
      },
      {
        z: 0.8,
        draw: (g) => {
          L.dryBrushFill(g, near, { color: P.ink, width: 30, dry: 0.3, seed: 35 });
          // branches: one plate for all of them, each stroke starts loaded at the trunk
          const br = [];
          near.forEach((trunk, i) => {
            const cx = (trunk[6][0] + trunk[trunk.length - 7][0]) / 2;
            const y = 520 + i * 180;
            const s = i % 2 ? 1 : -1;
            br.push([[cx, y], [cx + s * 150, y - 70], [cx + s * 290, y - 190], [cx + s * 360, y - 300]]);
            br.push([[cx, y + 260], [cx - s * 120, y + 200], [cx - s * 230, y + 120]]);
          });
          L.dryBrush(g, br, { color: P.ink, width: 26, dry: 0.5, seed: 36 });
          L.dryBrush(g, [[[-200, 1770], [360, 1745], [900, 1780], [1400, 1752]]], { color: P.ink, width: 60, dry: 0.45, seed: 37 });
        },
      },
    ];
    L.layers(ctx, { x: L.lerp(470, 610, L.ease.inOutSine(info.p)), y: info.H / 2, zoom: 1 }, planes);

    // passe-partout: a black mount with a slightly uneven opening
    const m = 64;
    ctx.fillStyle = P.ink;
    ctx.beginPath();
    ctx.rect(0, 0, info.W, info.H);
    ctx.rect(m, m * 1.6, info.W - 2 * m, info.H - m * 3.2);
    ctx.fill('evenodd');
  },
});
