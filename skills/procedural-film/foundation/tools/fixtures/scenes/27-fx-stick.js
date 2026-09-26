// Fixture plate for the stick figures: a jointed walker holding a red balloon, a spring figure
// that reaches, crouches and jumps, and a row of small figures showing every head and spring kind.
// Poses change on twos (lib.onTwos), the line trembles on the boil clock.
FILM.scene({
  id: 'fx-stick',
  draw(ctx, t, info) {
    const L = info.lib;
    const P = L.pal;
    const S = L.stickPoses;
    L.paper(ctx, { seed: 7, fibres: 0.3 });
    const tt = L.onTwos(L.clamp(t, 0, info.dur));

    // pose along a list of [time, pose] keys, eased between them
    const track = (keys, u) => {
      let i = 0;
      while (i < keys.length - 2 && u >= keys[i + 1][0]) i++;
      const [t0, a] = keys[i], [t1, b] = keys[i + 1];
      return L.poseMix(a, b, L.ease.inOutSine(L.clamp((u - t0) / (t1 - t0))));
    };

    const GROUND = 1480;
    L.inkLine(ctx, 50, GROUND + 4, 1030, GROUND - 6, { width: 3, seed: 3 });
    L.inkLine(ctx, 90, GROUND + 26, 640, GROUND + 22, { width: 1.4, seed: 4, alpha: 0.5 });

    // the walker: one stride a second, the balloon arm held up
    const cyc = (tt % 1) * 4;
    const walk = [S.walk1, S.walk2, S.walk3, S.walk4, S.walk1];
    const k = Math.floor(cyc);
    const stride = L.poseMix(walk[k], walk[k + 1], cyc - k);
    const pose = Object.assign({}, stride, { armR: 2.55, elbowR: 0.35 });
    const A = L.stickFigure(ctx, pose, { x: 170 + 110 * tt, y: GROUND, height: 600, head: 'scribble', seed: 2 });
    const hand = A.handR;
    const sway = 18 * Math.sin(tt * 3.1);
    const bx = hand[0] + 60 + sway, by = hand[1] - 330;
    L.inkPath(ctx, [hand, [hand[0] + 30 + sway * 0.3, hand[1] - 150], [bx, by + 78]], { width: 1.6, seed: 5, taper: [4, 6] });
    L.inkCircle(ctx, bx, by, 58, { ry: 72, fill: P.red, width: 3, seed: 6 });

    // the spring figure: stand, reach, crouch, jump, land
    const idle = { armL: 0.55, elbowL: 0.5, armR: -0.4, elbowR: 0.3, legL: 0.12, legR: -0.12 };
    const keys = [[0, idle], [0.45, S.reach], [0.95, S.crouch], [1.25, S.jump], [1.6, S.crouch], [2, idle]];
    const lift = 190 * Math.sin(Math.PI * L.clamp((tt - 1.05) / 0.55)) ** 1.2;
    L.stickFigure(ctx, track(keys, tt), { x: 830, y: GROUND - lift, height: 1000, facing: -1, limb: 'zigzag', seed: 8 });

    // the row: every head, and the coil and ladder springs
    const ROW = 1840;
    L.inkLine(ctx, 40, ROW + 3, 1040, ROW - 3, { width: 2.2, seed: 9 });
    const nod = Math.sin(tt * Math.PI * 2) * 0.5 + 0.5;
    L.stickFigure(ctx, S.sit, { x: 120, y: ROW, height: 250, head: 'solid', seed: 10 });
    L.stickFigure(ctx, L.poseMix(S.wave, Object.assign({}, S.wave, { elbowR: 1.7 }), nod), { x: 320, y: ROW, height: 250, head: 'hatch', seed: 11 });
    L.stickFigure(ctx, { neck: 0.25 * nod, armL: 0.2, armR: 0.15 }, { x: 510, y: ROW, height: 250, head: 'face', facing: -1, seed: 12 });
    L.stickFigure(ctx, S.fall, { x: 710, y: ROW, height: 250, head: 'scribble', joint: 1.9, tremble: 0, seed: 13 });
    const coilA = { armL: 1.1, elbowL: -0.5, armR: 1.9, elbowR: 0.5, legL: 0.15, legR: -0.15 };
    const coilB = { armL: 0.5, elbowL: 0.4, armR: 2.5, elbowR: -0.2, legL: 0.15, legR: -0.15 };
    L.stickFigure(ctx, L.poseMix(coilA, coilB, nod), { x: 860, y: ROW, height: 290, limb: 'coil', facing: -1, seed: 14 });
    L.stickFigure(ctx, L.poseMix(S.walk1, S.walk3, nod), { x: 990, y: ROW, height: 290, limb: 'ladder', facing: -1, seed: 15 });

    L.text(ctx, 'stickFigure · springLimb', 540, 180, { size: 40, align: 'center', color: P.inkSoft });
  },
});
