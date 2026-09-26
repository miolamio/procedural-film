// Check 8. lib.branch is a cached space-colonization tree; drawBranch reveals it in growth order.
// No Math.random / Date. Loaded only by check.cjs --fixtures.
const BRANCH_CLIP = [[16, 16], [200, 16], [200, 150], [16, 150]];

function branchSpec(over) {
  return Object.assign({
    seed: 4,
    root: [100, 132],
    clip: BRANCH_CLIP,
    attractors: 42,
    step: 12,
    killDist: 16,
    influence: 50,
    maxNodes: 55,
  }, over);
}

FILM.assert('every branch node stays inside the clip', () => {
  const tree = FILM.lib.branch(branchSpec({
    attractors: [[-40, -40], [40, 40], [80, 60], [90, 100], [150, 40], [160, 120], [70, 80], [120, 90], [50, 50], [180, 70]],
  }));
  FILM.expect.true(tree.nodes.length > 1, 'tree did not grow');
  for (let i = 0; i < tree.nodes.length; i++) {
    const n = tree.nodes[i];
    FILM.expect.true(FILM.lib.polyContains(BRANCH_CLIP, n.x, n.y), `node ${i} (${n.x}, ${n.y}) is outside the clip`);
  }
});

FILM.assert('the branch graph is a tree', () => {
  const trunk = FILM.lib.branch(branchSpec({
    seed: 2,
    root: [[100, 132], [100, 112], [102, 92]],
    maxNodes: 40,
  }));
  const nodes = trunk.nodes;
  FILM.expect.true(nodes.length >= 3, 'trunk was not kept');
  FILM.expect.eq(nodes[0].parent, null);
  FILM.expect.eq(nodes[1].parent, 0);
  FILM.expect.eq(nodes[2].parent, 1);
  FILM.expect.eq(nodes[0].depth, 0);
  let roots = 0;
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (n.parent == null) {
      roots++;
      FILM.expect.eq(n.depth, 0);
      continue;
    }
    FILM.expect.true(Number.isInteger(n.parent) && n.parent >= 0 && n.parent < i, `parent of ${i} is ${n.parent}`);
    FILM.expect.eq(n.depth, nodes[n.parent].depth + 1);
    let p = i, guard = 0;
    while (nodes[p].parent != null) {
      p = nodes[p].parent;
      FILM.expect.true(++guard < nodes.length, 'cycle');
    }
  }
  FILM.expect.eq(roots, 1);
});

FILM.assert('a parent vein is at least as thick as its child', () => {
  const nodes = FILM.lib.branch(branchSpec()).nodes;
  const kids = nodes.map(() => []);
  for (let i = 0; i < nodes.length; i++) if (nodes[i].parent != null) kids[nodes[i].parent].push(i);
  let forks = 0;
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    FILM.expect.true(n.thickness >= 1, `thickness ${n.thickness}`);
    if (n.parent != null) {
      FILM.expect.true(nodes[n.parent].thickness + 1e-9 >= n.thickness, `parent ${nodes[n.parent].thickness} < child ${n.thickness}`);
    }
    if (!kids[i].length) FILM.expect.eq(n.thickness, 1);
    if (kids[i].length >= 2) {
      forks++;
      let sum = 0;
      for (let c = 0; c < kids[i].length; c++) sum += Math.pow(nodes[kids[i][c]].thickness, 2.5);
      FILM.expect.near(Math.pow(n.thickness, 2.5), sum, 1e-3 * sum + 1e-4);
    }
  }
  FILM.expect.true(forks > 0, 'expected a fork so the da Vinci sum is exercised');
});

FILM.assert('branch is deterministic and cached, and maxNodes is respected', () => {
  const a = FILM.lib.branch(branchSpec());
  const b = FILM.lib.branch(branchSpec());
  FILM.expect.true(a === b, 'same parameters must return the cached tree');
  const capped = FILM.lib.branch(branchSpec({ maxNodes: 6, attractors: 80 }));
  FILM.expect.true(capped !== a, 'maxNodes is part of the cache key');
  FILM.expect.true(capped.nodes.length <= 6, `maxNodes 6 grew ${capped.nodes.length}`);
  FILM.expect.true(capped.nodes.length > 1, 'capped tree did not grow');
  const other = FILM.lib.branch(branchSpec({ seed: 9 }));
  FILM.expect.true(other !== a, 'seed is part of the cache key');
  const sig = (tree) => tree.nodes.slice(0, 8).map((n) => [n.x, n.y, n.parent]).join(';');
  FILM.expect.true(sig(a) !== sig(other), 'a different seed must grow a different tree');
  const paths = a.paths();
  FILM.expect.true(paths.length > 0, 'no paths');
  for (let i = 0; i < paths.length; i++) FILM.expect.true(paths[i].length >= 2, 'path shorter than 2 points');
  FILM.expect.eq(a.paths(1e9).length, 0);
  FILM.expect.eq(a.paths().length, a.paths(0).length);
});

FILM.assert('reveal 0 draws nothing, reveal 1 draws every path, and pixels are monotonic', () => {
  const tree = FILM.lib.branch(branchSpec());
  const paint = (reveal) => {
    const c = FILM.makeCanvas(220, 170);
    const ctx = c.getContext('2d');
    const opts = { width: 3.2, color: FILM.lib.pal.ink };
    if (reveal !== undefined) opts.reveal = reveal;
    FILM.lib.drawBranch(ctx, tree, opts);
    return FILM.pixels(c);
  };
  FILM.expect.eq(paint(0).count((r, g, b, al) => al > 0), 0);
  const full = paint(1);
  FILM.expect.eq(full.hash(), paint(undefined).hash());
  const paths = tree.paths();
  FILM.expect.true(paths.length > 0, 'nothing to reveal');
  for (let i = 0; i < paths.length; i++) {
    const path = paths[i];
    const mid = path[Math.floor((path.length - 1) / 2)];
    const hit = full.count((r, g, b, al, x, y) => al > 0 && Math.hypot(x - mid[0], y - mid[1]) <= 5);
    FILM.expect.true(hit > 0, `path ${i} missed at ${mid[0].toFixed(1)},${mid[1].toFixed(1)}`);
  }
  let prev = 0;
  for (let s = 0; s <= 10; s++) {
    const n = paint(s / 10).count((r, g, b, al) => al > 0);
    FILM.expect.true(n >= prev, `reveal ${s}/10 painted ${n} after ${prev}`);
    prev = n;
  }
  FILM.expect.true(prev > 0, 'reveal 1 painted nothing');
});
