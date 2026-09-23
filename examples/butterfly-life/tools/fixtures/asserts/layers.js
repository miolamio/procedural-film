// Check 8: lib.layers. Loaded only by check.cjs --fixtures, after the engine.
// No Math.random / Date / performance.now.
function layerCanvas(draw) {
  const c = FILM.makeCanvas(FILM.W, FILM.H);
  draw(c.getContext('2d'));
  return c;
}

function centroid(canvas, pred) {
  let sx = 0, sy = 0, n = 0;
  FILM.pixels(canvas).count((r, g, b, a, x, y) => {
    if (!pred(r, g, b, a)) return false;
    sx += x;
    sy += y;
    n++;
    return true;
  });
  return { x: n ? sx / n : 0, y: n ? sy / n : 0, n };
}

function redDot(ctx) {
  ctx.fillStyle = FILM.lib.pal.red;
  // 1100 on a 1920-tall frame. On a shorter frame, stay within a quarter of the
  // height of centre so zoom 2 (which scales that offset) does not leave the plate.
  const y = FILM.H >= 1920 ? 1100 : FILM.H / 2 + Math.min(140, FILM.H / 4 - 40);
  ctx.fillRect(700, y, 28, 28);
}

FILM.assert('one layer at z = 1 matches lib.camera', () => {
  const cam = { x: 470, y: 880, zoom: 1.6, rot: 0.35 };
  const draw = (ctx) => {
    ctx.fillStyle = FILM.lib.pal.leaf;
    ctx.fillRect(360, 720, 220, 140);
    ctx.beginPath();
    ctx.arc(540, 900, 46, 0, Math.PI * 2);
    ctx.fill();
  };
  const a = layerCanvas((ctx) => FILM.lib.camera(ctx, cam, draw));
  const b = layerCanvas((ctx) => FILM.lib.layers(ctx, cam, [{ z: 1, draw }]));
  FILM.expect.eq(FILM.pixels(a).hash(), FILM.pixels(b).hash());
});

FILM.assert('a marker on z = 4 moves less than on z = 1 as zoom goes from 1 to 2', () => {
  const at = (z, zoom) => {
    const c = layerCanvas((ctx) => FILM.lib.layers(ctx, { x: FILM.W / 2, y: FILM.H / 2, zoom }, [{ z, draw: redDot }]));
    const p = centroid(c, (r, g, b, a) => r > 140 && g < 100 && b < 80 && a > 200);
    FILM.expect.true(p.n > 30, `marker missing at z ${z} zoom ${zoom} (${p.n} px)`);
    return p;
  };
  const dist = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);
  const d1 = dist(at(1, 1), at(1, 2));
  const d4 = dist(at(4, 1), at(4, 2));
  FILM.expect.true(d4 < d1, `z=4 moved ${d4.toFixed(2)}px, z=1 moved ${d1.toFixed(2)}px`);
});

FILM.assert('near planes paint over far ones', () => {
  const c = layerCanvas((ctx) => {
    FILM.lib.layers(ctx, { zoom: 1 }, [
      { z: 0.5, draw(g) { g.fillStyle = FILM.lib.pal.red; g.fillRect(500, 900, 80, 80); } },
      { z: 4, draw(g) { g.fillStyle = FILM.lib.pal.navy; g.fillRect(500, 900, 80, 80); } },
    ]);
  });
  let red = 0, navy = 0;
  FILM.pixels(c).count((r, g, b, a, x, y) => {
    if (x < 520 || x > 560 || y < 920 || y > 960) return false;
    if (r > 150 && g < 90) red++;
    else if (r < 40 && b > 30 && g < 40) navy++;
    return false;
  });
  FILM.expect.true(red > 100, `near red missing (${red})`);
  FILM.expect.eq(navy, 0);
});

FILM.assert('a static blurred layer does not create a canvas on the second call', () => {
  const c = FILM.makeCanvas(64, 64);
  const ctx = c.getContext('2d');
  const plane = {
    z: 4,
    static: true,
    blur: 3,
    draw(g) {
      g.fillStyle = FILM.lib.pal.teal;
      g.fillRect(8, 8, 24, 24);
    },
  };
  const frame = (zoom) => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    FILM.lib.layers(ctx, { zoom }, [plane]);
  };
  const n0 = window.__canvases;
  frame(1);
  const n1 = window.__canvases;
  const h1 = FILM.pixels(c).hash();
  FILM.expect.true(n1 > n0, 'the first static blur did not allocate a canvas');
  FILM.expect.true(FILM.pixels(c).count((r, g, b, a) => a > 20) > 10, 'static blur painted nothing');
  frame(1);
  FILM.expect.eq(window.__canvases, n1);
  FILM.expect.eq(FILM.pixels(c).hash(), h1);
  frame(2);
  FILM.expect.eq(window.__canvases, n1);
});

FILM.assert('layers is deterministic', () => {
  const cam = { x: 500, y: 940, zoom: 1.4, rot: -0.2 };
  const once = () => {
    const c = layerCanvas((ctx) => {
      FILM.lib.layers(ctx, cam, [
        { z: 0.7, draw(g) { g.fillStyle = FILM.lib.pal.ochre; g.fillRect(480, 1000, 70, 40); } },
        {
          z: 2.5,
          fog: { color: FILM.lib.pal.white, amount: 0.2 },
          draw(g) { g.fillStyle = FILM.lib.pal.sage; g.fillRect(200, 600, 800, 500); },
        },
        { z: 1, draw(g) { g.fillStyle = FILM.lib.pal.leaf; g.beginPath(); g.arc(540, 960, 50, 0, Math.PI * 2); g.fill(); } },
      ]);
    });
    return FILM.pixels(c).hash();
  };
  FILM.expect.eq(once(), once());
});
