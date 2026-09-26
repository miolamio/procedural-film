// extract.cjs : measure a reference video before writing a reference analysis.
// Needs ffmpeg only (on PATH, or set FFMPEG). Nothing here touches the film's src/.
//
//   node tools/ref/extract.cjs ref.mp4                       everything into .tmp/ref/<name>/
//   node tools/ref/extract.cjs ref.mp4 --bpm 120             shot lengths also in beats, cut offsets from the grid
//   node tools/ref/extract.cjs ref.mp4 --every 0.5 --cols 8  a denser timed sheet
//
// Writes:
//   sheet-shots.png   one frame from the middle of every detected shot: index, start, length
//   sheet-every.png   one frame every --every seconds (default 1): the stepping-through view
//   palette.png       the --colors dominant colours, widths by share of screen time
//   report.md         format, cut rhythm, drawing cadence, palette, one row per shot
//   extract.json      the same numbers for scripts
//
// Options:
//   --out DIR       output folder (default .tmp/ref/<video name>)
//   --every S       seconds between frames on the timed sheet (default 1)
//   --cols N        sheet columns (default 6)
//   --thumb W       thumbnail width in px (default 270)
//   --colors K      palette size (default 8)
//   --cut X         a cut is a frame whose luma change is X times the median of the 12 around it (default 8)
//   --corr R        ...and whose luma pattern correlates with the previous frame under R (default 0.3)
//   --min-shot N    frames; a cut closer than this to the previous one is dropped (default 3)
//   --still L       mean luma change (0..255, at the 120 px analysis size) under which a frame
//                   repeats the previous drawing (default 0.6)
//   --bpm N         beat grid for the rhythm section
//
// Limits: a cut is one frame that changes far more than its neighbours and keeps little of the
// previous picture, so dissolves and wipes longer than a frame or two go unseen, a hard lighting
// change on the whole frame (night to day in one frame) reads as a cut, and a flash reads as two
// cuts unless --min-shot swallows it.
// Frames stay in .tmp/: they are notes about someone else's film, never material for this one.
'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { spawn, spawnSync } = require('child_process');
const C = require('../common.cjs');

const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const AW = 120; // analysis width: coarse enough that grain averages out, fine enough for a palette

// ---------- ffmpeg ----------

function probe(file) {
  const r = spawnSync(FFMPEG, ['-hide_banner', '-i', file], { encoding: 'utf8' });
  if (r.error) C.die(`could not start ffmpeg (${FFMPEG}): ${r.error.message}`);
  const err = r.stderr || '';
  const video = err.split('\n').find((l) => /Stream .*Video:/.test(l));
  if (!video) C.die(`no video stream in ${file}\n${err.trim().split('\n').slice(-3).join('\n')}`);
  const size = video.match(/, (\d{2,5})x(\d{2,5})[, ]/);
  const fps = video.match(/, ([\d.]+) fps/) || video.match(/, ([\d.]+) tbr/);
  const dur = err.match(/Duration: (\d+):(\d+):([\d.]+)/);
  if (!size) C.die(`could not read the frame size from: ${video.trim()}`);
  return {
    width: +size[1],
    height: +size[2],
    fps: fps ? +fps[1] : 0,
    duration: dur ? +dur[1] * 3600 + +dur[2] * 60 + +dur[3] : 0,
  };
}

/** Decode every frame at w×h RGB and hand each to onFrame(buf, index). */
function decode(file, w, h, vf, onFrame) {
  return new Promise((resolve, reject) => {
    const args = ['-v', 'error', '-i', file, '-vf', vf, '-fps_mode', 'passthrough', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'];
    const proc = spawn(FFMPEG, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const size = w * h * 3;
    let pending = Buffer.alloc(0);
    let n = 0;
    let err = '';
    proc.stderr.on('data', (d) => (err += d));
    proc.stdout.on('data', (d) => {
      pending = pending.length ? Buffer.concat([pending, d]) : d;
      while (pending.length >= size) {
        onFrame(pending.subarray(0, size), n++);
        pending = pending.subarray(size);
      }
      pending = Buffer.from(pending); // detach from the big chunk so it can be freed
    });
    proc.on('error', (e) => reject(new Error(`could not start ffmpeg (${FFMPEG}): ${e.message}`)));
    proc.on('close', (code) => (code === 0 ? resolve(n) : reject(new Error(`ffmpeg exited ${code}\n${err.trim()}`))));
  });
}

// ---------- PNG and a 5×7 label font ----------

const CRC = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
function crc32(buf) {
  let c = -1;
  for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}
function png(img) {
  const { w, h, px } = img;
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) px.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr.set([8, 2, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 6 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const GLYPHS = {
  0: '01110 10001 10011 10101 11001 10001 01110',
  1: '00100 01100 00100 00100 00100 00100 01110',
  2: '01110 10001 00001 00010 00100 01000 11111',
  3: '11110 00001 00001 01110 00001 00001 11110',
  4: '00010 00110 01010 10010 11111 00010 00010',
  5: '11111 10000 11110 00001 00001 10001 01110',
  6: '00110 01000 10000 11110 10001 10001 01110',
  7: '11111 00001 00010 00100 01000 01000 01000',
  8: '01110 10001 10001 01110 10001 10001 01110',
  9: '01110 10001 10001 01111 00001 00010 01100',
  a: '00000 00000 01110 00001 01111 10001 01111',
  b: '10000 10000 10110 11001 10001 10001 11110',
  c: '00000 00000 01110 10000 10000 10001 01110',
  d: '00001 00001 01101 10011 10001 10001 01111',
  e: '00000 00000 01110 10001 11111 10000 01110',
  f: '00110 01001 01000 11100 01000 01000 01000',
  s: '00000 00000 01111 10000 01110 00001 11110',
  '.': '00000 00000 00000 00000 00000 01100 01100',
  '#': '01010 01010 11111 01010 11111 01010 01010',
  '%': '11000 11001 00010 00100 01000 10011 00011',
  '+': '00000 00100 00100 11111 00100 00100 00000',
  '-': '00000 00000 00000 11111 00000 00000 00000',
};

function image(w, h, rgb) {
  const px = Buffer.alloc(w * h * 3);
  for (let i = 0; i < w * h; i++) px.set(rgb, i * 3);
  return { w, h, px };
}
function fillRect(img, x0, y0, w, h, rgb) {
  for (let y = Math.max(0, y0); y < Math.min(img.h, y0 + h); y++)
    for (let x = Math.max(0, x0); x < Math.min(img.w, x0 + w); x++) img.px.set(rgb, (y * img.w + x) * 3);
}
function text(img, x, y, str, rgb, s = 2) {
  for (const ch of String(str).toLowerCase()) {
    const g = GLYPHS[ch];
    if (g)
      g.split(' ').forEach((row, ry) => {
        for (let rx = 0; rx < 5; rx++) if (row[rx] === '1') fillRect(img, x + rx * s, y + ry * s, s, s, rgb);
      });
    x += 6 * s;
  }
}
function blit(img, src, sw, sh, x0, y0) {
  for (let y = 0; y < sh; y++) src.copy(img.px, ((y0 + y) * img.w + x0) * 3, y * sw * 3, (y + 1) * sw * 3);
}

/** Thumbnails in a grid, a label strip under each. */
function sheet(thumbs, tw, th, cols, labels) {
  const pad = 8;
  const lh = 26;
  cols = Math.max(1, Math.min(cols, thumbs.length));
  const rows = Math.ceil(thumbs.length / cols);
  const img = image(pad + cols * (tw + pad), pad + rows * (th + lh + pad), [17, 17, 17]);
  thumbs.forEach((t, i) => {
    const x = pad + (i % cols) * (tw + pad);
    const y = pad + Math.floor(i / cols) * (th + lh + pad);
    blit(img, t, tw, th, x, y);
    text(img, x + 4, y + th + 6, labels[i], [230, 230, 230]);
  });
  return img;
}

// ---------- colour ----------

const hex = (c) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
const luma = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;

function mulberry32(a) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** k-means++ on RGB samples, seeded so the same video gives the same palette. */
function kmeans(samples, k) {
  const n = samples.length / 3;
  const rnd = mulberry32(7);
  const cent = [];
  const d2 = new Float64Array(n).fill(Infinity);
  let pick = Math.floor(rnd() * n);
  while (cent.length < Math.min(k, n)) {
    cent.push([samples[pick * 3], samples[pick * 3 + 1], samples[pick * 3 + 2]]);
    const c = cent[cent.length - 1];
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const dr = samples[i * 3] - c[0], dg = samples[i * 3 + 1] - c[1], db = samples[i * 3 + 2] - c[2];
      d2[i] = Math.min(d2[i], dr * dr + dg * dg + db * db);
      sum += d2[i];
    }
    if (sum === 0) break;
    let r = rnd() * sum;
    for (pick = 0; pick < n - 1 && (r -= d2[pick]) > 0; pick++);
  }
  const label = new Uint8Array(n);
  for (let iter = 0; iter < 16; iter++) {
    const acc = cent.map(() => [0, 0, 0, 0]);
    for (let i = 0; i < n; i++) {
      let best = 0, bd = Infinity;
      for (let j = 0; j < cent.length; j++) {
        const dr = samples[i * 3] - cent[j][0], dg = samples[i * 3 + 1] - cent[j][1], db = samples[i * 3 + 2] - cent[j][2];
        const d = dr * dr + dg * dg + db * db;
        if (d < bd) (bd = d), (best = j);
      }
      label[i] = best;
      const a = acc[best];
      a[0] += samples[i * 3], a[1] += samples[i * 3 + 1], a[2] += samples[i * 3 + 2], a[3]++;
    }
    cent.forEach((c, j) => acc[j][3] && (cent[j] = [acc[j][0] / acc[j][3], acc[j][1] / acc[j][3], acc[j][2] / acc[j][3]]));
  }
  return { cent, label };
}

// ---------- main ----------

async function main() {
  const args = C.parseArgs(process.argv.slice(2));
  const file = args._[0];
  if (!file) C.die('usage: node tools/ref/extract.cjs <video> [--out DIR] [--every S] [--bpm N] ...');
  const src = path.resolve(file);
  if (!fs.existsSync(src)) C.die(`no such file: ${src}`);
  const name = path.basename(src, path.extname(src)).replace(/\s+/g, '-');
  const outDir = args.out ? C.resolveOut(args.out) : path.join(C.TMP, 'ref', name);
  const every = +args.every || 1;
  const cols = +args.cols || 6;
  const tw = +args.thumb || 270;
  const K = +args.colors || 8;
  const cutAt = args.cut !== undefined ? +args.cut : 8;
  const corrAt = args.corr !== undefined ? +args.corr : 0.3;
  const minShot = args['min-shot'] !== undefined ? +args['min-shot'] : 3;
  const still = args.still !== undefined ? +args.still : 0.6;
  const bpm = +args.bpm || 0;

  const info = probe(src);
  const AH = Math.max(2, Math.round((AW * info.height) / info.width / 2) * 2);
  const expect = Math.max(1, Math.round(info.duration * (info.fps || 24)));
  const stride = Math.max(1, Math.floor((expect * AW * AH) / 80000)); // about 80k palette samples in all

  // pass 1: per-frame change, correlation with the previous frame, palette samples
  const diffs = [];
  const corr = [];
  const meanY = [];
  const samples = [];
  const sampleFrame = [];
  let prevY = null, prevMean = 0, sampleAt = 0;
  const frames = await decode(src, AW, AH, `scale=${AW}:${AH}:flags=area`, (buf, n) => {
    const Y = new Float32Array(AW * AH);
    let sy = 0;
    for (let i = 0; i < AW * AH; i++) sy += Y[i] = luma(buf[i * 3], buf[i * 3 + 1], buf[i * 3 + 2]);
    const my = sy / Y.length;
    for (; sampleAt < (n + 1) * AW * AH; sampleAt += stride) {
      const i = sampleAt - n * AW * AH;
      samples.push(buf[i * 3], buf[i * 3 + 1], buf[i * 3 + 2]);
      sampleFrame.push(n);
    }
    let d = 0, ab = 0, aa = 0, bb = 0;
    if (prevY)
      for (let i = 0; i < Y.length; i++) {
        const a = Y[i] - my, b = prevY[i] - prevMean;
        d += Math.abs(Y[i] - prevY[i]);
        ab += a * b, aa += a * a, bb += b * b;
      }
    diffs.push(prevY ? d / Y.length : Infinity);
    corr.push(prevY ? ab / Math.sqrt(aa * bb + 1e-9) : 0);
    meanY.push(my);
    prevY = Y;
    prevMean = my;
  });
  if (!frames) C.die('ffmpeg decoded no frames');
  const fps = info.fps || 24;
  const duration = frames / fps;

  // cuts: a spike against the frames around it that also loses the previous picture, thinned by --min-shot
  const spike = (n) => {
    const around = [];
    for (let k = Math.max(1, n - 6); k <= Math.min(frames - 1, n + 6); k++) if (k !== n) around.push(diffs[k]);
    around.sort((a, b) => a - b);
    return diffs[n] / ((around.length ? around[around.length >> 1] : 0) + 1);
  };
  const cuts = [0];
  for (let n = 1; n < frames; n++) if (corr[n] < corrAt && spike(n) >= cutAt && n - cuts[cuts.length - 1] >= minShot) cuts.push(n);
  const shots = cuts.map((a, i) => {
    const b = i + 1 < cuts.length ? cuts[i + 1] : frames;
    let fresh = 0, y = 0;
    for (let n = a; n < b; n++) (fresh += n === a || diffs[n] > still ? 1 : 0), (y += meanY[n]);
    return { index: i + 1, startFrame: a, frames: b - a, start: a / fps, dur: (b - a) / fps, mid: Math.floor((a + b - 1) / 2), luma: y / (b - a), fresh };
  });

  // palette, then each shot's share of it
  const { cent, label } = kmeans(Float64Array.from(samples), K);
  const count = cent.map(() => 0);
  const shotOf = new Int32Array(frames);
  shots.forEach((s, i) => shotOf.fill(i, s.startFrame, s.startFrame + s.frames));
  const perShot = shots.map(() => cent.map(() => 0));
  label.forEach((l, i) => (count[l]++, perShot[shotOf[sampleFrame[i]]][l]++));
  const order = cent.map((_, j) => j).sort((a, b) => count[b] - count[a]);
  const total = label.length;
  const palette = order.map((j) => ({ hex: hex(cent[j]), share: count[j] / total, luma: luma(...cent[j]) }));
  shots.forEach((s, i) => {
    const t = perShot[i].reduce((a, b) => a + b, 0) || 1;
    s.colors = order
      .filter((j) => perShot[i][j] / t >= 0.08)
      .sort((a, b) => perShot[i][b] - perShot[i][a])
      .slice(0, 3)
      .map((j) => hex(cent[j]));
    s.plate = s.luma < 70 ? 'dark' : s.luma > 170 ? 'light' : 'mid';
  });

  // cadence: how many frames carry a new drawing
  let fresh = 0;
  for (let n = 1; n < frames; n++) if (diffs[n] > still) fresh++;
  const freshRate = (fresh / Math.max(1, frames - 1)) * fps;
  const onN = freshRate > 0 ? fps / freshRate : Infinity;
  const cadence = onN < 1.25 ? 'on ones' : onN < 1.75 ? 'ones and twos mixed' : onN < 2.4 ? 'on twos' : onN < 3.5 ? 'on threes' : 'mostly held';

  // rhythm
  const lens = shots.map((s) => s.dur).sort((a, b) => a - b);
  const median = lens.length % 2 ? lens[lens.length >> 1] : (lens[lens.length / 2 - 1] + lens[lens.length / 2]) / 2;
  const beat = bpm ? 60 / bpm : 0;
  const offGrid = beat ? cuts.slice(1).map((n) => { const t = n / fps; return t - Math.round(t / beat) * beat; }) : [];

  // pass 2: thumbnails for both sheets
  const th = Math.max(2, Math.round((tw * info.height) / info.width / 2) * 2);
  const everyFrames = [];
  for (let t = 0; t < duration - 1e-6; t += every) everyFrames.push(Math.min(frames - 1, Math.round(t * fps)));
  const want = [...new Set([...shots.map((s) => s.mid), ...everyFrames])].sort((a, b) => a - b);
  const thumbs = new Map();
  const wantSet = new Set(want);
  await decode(src, tw, th, `select='${want.map((n) => `eq(n\\,${n})`).join('+')}',scale=${tw}:${th}:flags=area`, (buf, i) => {
    if (i < want.length && wantSet.has(want[i])) thumbs.set(want[i], Buffer.from(buf));
  });
  const blank = Buffer.alloc(tw * th * 3);
  const f2 = (x) => x.toFixed(2);

  fs.mkdirSync(outDir, { recursive: true });
  const write = (f, data) => (fs.writeFileSync(path.join(outDir, f), data), console.log(`${f.padEnd(16)} -> ${C.rel(path.join(outDir, f))}`));
  write('sheet-shots.png', png(sheet(shots.map((s) => thumbs.get(s.mid) || blank), tw, th, cols, shots.map((s) => `#${s.index} ${f2(s.start)}s +${f2(s.dur)}`))));
  write('sheet-every.png', png(sheet(everyFrames.map((n) => thumbs.get(n) || blank), tw, th, cols, everyFrames.map((n) => `${f2(n / fps)}s`))));
  const pw = 960, ph = 150, strip = image(pw, ph, [17, 17, 17]);
  let x = 0;
  palette.forEach((p, i) => {
    const w = i === palette.length - 1 ? pw - x : Math.round(p.share * pw);
    const rgb = [1, 3, 5].map((k) => parseInt(p.hex.slice(k, k + 2), 16));
    fillRect(strip, x, 0, w, ph, rgb);
    if (w >= 90) {
      const ink = p.luma > 128 ? [17, 17, 17] : [240, 240, 240];
      text(strip, x + 8, ph - 44, p.hex.slice(1), ink);
      text(strip, x + 8, ph - 20, `${Math.round(p.share * 100)}%`, ink);
    }
    x += w;
  });
  write('palette.png', png(strip));

  const report = {
    source: src,
    format: { width: info.width, height: info.height, fps, frames, duration: +duration.toFixed(3) },
    rhythm: {
      shots: shots.length,
      cutsPer10s: +((10 * (shots.length - 1)) / duration).toFixed(2),
      median: +median.toFixed(3),
      mean: +(duration / shots.length).toFixed(3),
      min: +lens[0].toFixed(3),
      max: +lens[lens.length - 1].toFixed(3),
      ...(bpm ? { bpm, beat: +beat.toFixed(4), offGridMs: offGrid.map((o) => Math.round(o * 1000)) } : {}),
    },
    cadence: { newDrawingsPerSecond: +freshRate.toFixed(2), framesPerDrawing: +onN.toFixed(2), call: cadence },
    palette: palette.map((p) => ({ hex: p.hex, share: +p.share.toFixed(3) })),
    shots: shots.map((s) => ({
      index: s.index, start: +s.start.toFixed(3), dur: +s.dur.toFixed(3), plate: s.plate, luma: Math.round(s.luma),
      drawingsPerSecond: +((s.fresh / s.frames) * fps).toFixed(1), colors: s.colors,
    })),
    settings: { cut: cutAt, corr: corrAt, minShot, still, every, colors: K },
  };
  write('extract.json', JSON.stringify(report, null, 2) + '\n');

  const md = [];
  md.push(`# Extract: ${path.basename(src)}`, '');
  md.push(`Measured by \`tools/ref/extract.cjs\`. Numbers to check your notes against, not a style: read the sheets, then write the analysis.`, '');
  md.push('## Format', '', `${info.width}x${info.height}, ${fps} fps, ${frames} frames, ${f2(duration)} s.`, '');
  md.push('## Cut rhythm', '');
  md.push(`${shots.length} shots, ${report.rhythm.cutsPer10s} cuts per 10 s.`);
  md.push(`Shot length: median ${f2(median)} s, mean ${f2(report.rhythm.mean)} s, shortest ${f2(lens[0])} s, longest ${f2(lens[lens.length - 1])} s.`);
  if (bpm) {
    const off = offGrid.map((o) => Math.abs(o) * 1000);
    const near = off.filter((o) => o <= 1000 / fps + 1).length;
    md.push(`At ${bpm} bpm (beat ${f2(beat)} s): ${near} of ${off.length} cuts within a frame of a beat; worst ${Math.round(Math.max(0, ...off))} ms off.`);
  }
  md.push('', '## Drawing cadence', '');
  md.push(`${f2(freshRate)} new drawings per second, one per ${f2(onN)} frames: **${cadence}**.`);
  md.push(`A frame counts as new when its mean luma moves more than ${still} levels from the previous one at ${AW} px wide, so grain alone does not count.`, '');
  md.push('## Palette', '', '| Colour | Share |', '|---|---|');
  palette.forEach((p) => md.push(`| \`${p.hex}\` | ${Math.round(p.share * 100)}% |`));
  md.push('', '## Shots', '', '| # | Start | Length | Plate | Luma | Drawings/s | Colours |', '|---|---|---|---|---|---|---|');
  report.shots.forEach((s) => md.push(`| ${s.index} | ${f2(s.start)} | ${f2(s.dur)} | ${s.plate} | ${s.luma} | ${s.drawingsPerSecond} | ${s.colors.map((c) => `\`${c}\``).join(' ')} |`));
  md.push('', `Plate: mean luma under 70 is dark, over 170 is light. Settings: cut ${cutAt}, corr ${corrAt}, min-shot ${minShot}, still ${still}.`, '');
  write('report.md', md.join('\n'));
}

main().catch((e) => C.die(e.stack || String(e)));
