// lib.dryBrush / lib.dryBrushFill invariants. Loaded only by check.cjs --fixtures. No Math.random / Date.
// Every call pins boil to a number, so nothing here depends on lib.T.

function dbCanvas(w, h) {
  const c = FILM.makeCanvas(w, h);
  return { c, ctx: c.getContext('2d', { willReadFrequently: true }) };
}

// Inked pixels (alpha over 40) in a box, as a fraction of the box.
function dbCover(c, x0, y0, x1, y1) {
  let n = 0;
  const hit = FILM.pixels(c).count((r, g, b, a, x, y) => {
    if (x < x0 || x >= x1 || y < y0 || y >= y1) return false;
    n++;
    return a > 40;
  });
  return n ? hit / n : 0;
}

// A horizontal stroke from x 30 to 330 at y 70, 28 px wide, on a 360×140 canvas.
function dbStroke(opts) {
  const k = dbCanvas(360, 140);
  FILM.lib.dryBrush(k.ctx, [[30, 70], [180, 70], [330, 70]], Object.assign({ width: 28, seed: 4, boil: 0 }, opts));
  return k.c;
}

FILM.assert('dryBrush stays near its path and is deterministic', () => {
  const a = dbStroke({ dry: 0.5 });
  const b = dbStroke({ dry: 0.5 });
  FILM.expect.eq(FILM.pixels(a).hash(), FILM.pixels(b).hash());
  const stray = FILM.pixels(a).count((r, g, b, al, x, y) => al > 0 && (Math.abs(y + 0.5 - 70) > 28 || x < 30 - 28 || x > 330 + 28));
  FILM.expect.true(stray === 0, `${stray} inked pixel(s) farther than one brush width from the path`);
  FILM.expect.true(dbCover(a, 40, 62, 120, 78) > 0.5, 'the stroke core near its start is not inked');
});

FILM.assert('dryBrush runs dry along its length and with dry', () => {
  const s = dbStroke({ dry: 0.5 });
  const head = dbCover(s, 40, 60, 110, 80);
  const tail = dbCover(s, 250, 60, 320, 80);
  FILM.expect.true(tail < head - 0.1, `tail coverage ${tail.toFixed(2)} is not below head ${head.toFixed(2)}`);
  const wet = dbCover(dbStroke({ dry: 0.05 }), 30, 55, 330, 85);
  const dry = dbCover(dbStroke({ dry: 0.95 }), 30, 55, 330, 85);
  FILM.expect.true(dry < wet - 0.1, `dry 0.95 covers ${dry.toFixed(2)}, dry 0.05 covers ${wet.toFixed(2)}`);
  // a loaded brush is dense in its core but still shows bristle gaps somewhere
  const core = dbCover(dbStroke({ dry: 0.05 }), 50, 64, 200, 76);
  FILM.expect.true(core > 0.8, `loaded core coverage ${core.toFixed(2)}`);
  FILM.expect.true(dbCover(dbStroke({ dry: 0.6 }), 60, 58, 300, 82) < 0.95, 'a dry stroke has no gaps');
});

FILM.assert('dryBrush pressure sets the width', () => {
  const rows = (c) => {
    let top = 140, bottom = -1;
    FILM.pixels(c).count((r, g, b, a, x, y) => {
      if (a > 40 && x >= 90 && x < 200) {
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
      return false;
    });
    return bottom - top;
  };
  const full = rows(dbStroke({ dry: 0.1, splay: 0, pressure: () => 1 }));
  const light = rows(dbStroke({ dry: 0.1, splay: 0, pressure: () => 0.4 }));
  FILM.expect.true(full > 20 && full <= 34, `full-pressure band ${full}px for a 28 px brush`);
  FILM.expect.true(light < full * 0.65, `pressure 0.4 band ${light}px is not narrower than ${full}px`);
});

FILM.assert('dryBrush boils in three cached drawings, never by time', () => {
  const h = (boil) => FILM.pixels(dbStroke({ boil })).hash();
  const v0 = h(0), v1 = h(1), v2 = h(2);
  FILM.expect.true(v0 !== v1 && v1 !== v2 && v0 !== v2, 'the three boil drawings are not distinct');
  FILM.expect.eq(h(3), v0);
  FILM.expect.eq(FILM.pixels(dbStroke({ boil: false })).hash(), v0);
  const k = dbCanvas(360, 140);
  const n = window.__canvases;
  for (let i = 0; i < 3; i++) FILM.lib.dryBrush(k.ctx, [[30, 70], [180, 70], [330, 70]], { width: 28, seed: 4, boil: i });
  FILM.expect.eq(window.__canvases, n);
});

FILM.assert('dryBrush takes a set of strokes on one plate', () => {
  const k = dbCanvas(360, 200);
  const lines = [[[30, 50], [330, 50]], [[30, 150], [330, 150]]];
  FILM.lib.dryBrush(k.ctx, lines, { width: 24, seed: 9, boil: 0, dry: 0.2 });
  FILM.expect.true(dbCover(k.c, 40, 44, 200, 56) > 0.5 && dbCover(k.c, 40, 144, 200, 156) > 0.5, 'a stroke of the set is missing');
  FILM.expect.eq(dbCover(k.c, 0, 90, 360, 110), 0);
});

const DBF_RECT = [[60, 30], [140, 30], [140, 330], [60, 330]];

FILM.assert('dryBrushFill covers the silhouette and frays only a little past it', () => {
  const k = dbCanvas(200, 360);
  FILM.lib.dryBrushFill(k.ctx, DBF_RECT, { width: 24, seed: 3, boil: 0, dry: 0.2, fringe: 8 });
  const core = dbCover(k.c, 72, 60, 128, 300);
  FILM.expect.true(core > 0.75, `core coverage ${core.toFixed(2)}`);
  // tall shape: strokes run vertically, so hairs may run past the top and bottom by fringe,
  // and past the sides by under a third of it
  const out = FILM.pixels(k.c).count((r, g, b, a, x, y) => {
    if (!(a > 0)) return false;
    const cx = x + 0.5, cy = y + 0.5;
    return cx < 60 - 4 || cx > 140 + 4 || cy < 30 - 10 || cy > 330 + 10;
  });
  FILM.expect.true(out === 0, `${out} pixel(s) past the outline plus fringe`);
  const again = dbCanvas(200, 360);
  FILM.lib.dryBrushFill(again.ctx, DBF_RECT, { width: 24, seed: 3, boil: 0, dry: 0.2, fringe: 8 });
  FILM.expect.eq(FILM.pixels(again.c).hash(), FILM.pixels(k.c).hash());
});

FILM.assert('dryBrushFill takes a lib.geo entry and several outlines', () => {
  const geoCanvas = dbCanvas(1080, 1920);
  const ptsCanvas = dbCanvas(1080, 1920);
  const leaf = FILM.lib.geo('leaf');
  FILM.lib.dryBrushFill(geoCanvas.ctx, leaf, { width: 30, seed: 5, boil: 0 });
  FILM.lib.dryBrushFill(ptsCanvas.ctx, leaf.outline(), { width: 30, seed: 5, boil: 0 });
  FILM.expect.eq(FILM.pixels(geoCanvas.c).hash(), FILM.pixels(ptsCanvas.c).hash());
  const k = dbCanvas(300, 360);
  FILM.lib.dryBrushFill(k.ctx, [DBF_RECT, [[180, 30], [260, 30], [260, 330], [180, 330]]], { width: 24, seed: 3, boil: 0, dry: 0.2, fringe: 8 });
  FILM.expect.true(dbCover(k.c, 72, 60, 128, 300) > 0.75 && dbCover(k.c, 192, 60, 248, 300) > 0.75, 'one of two outlines is not filled');
  FILM.expect.eq(dbCover(k.c, 150, 40, 170, 320), 0);
});
