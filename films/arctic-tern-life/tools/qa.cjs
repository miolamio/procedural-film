#!/usr/bin/env node
// qa.cjs : check a delivered mp4. Exit 0 when nothing FAILs. WARN does not fail the run.
//
//   node tools/qa.cjs exports/<slug>.mp4
//   node tools/qa.cjs draft.mp4 --scale 0.5 --lufs -14
//   node tools/qa.cjs clip.mp4 --timeline src/timeline.js
//
// Container: h264, yuv420p, 24 fps, frame size = timeline width/height times --scale
// (default 1; the same even rounding as FILM.mount). faststart means moov precedes mdat.
// Duration: video matches the timeline ± 1 frame, and audio matches video ± 1 frame.
// With no timeline, audio is compared to video and the timeline check is skipped.
// Audio: AAC, 48 kHz, stereo. Integrated loudness is --lufs ± 1 (default -14).
// True peak ≤ -1 dBTP. Black or silence longer than 0.25 s is a WARN, not a FAIL,
// unless the overlapping shot id contains "black" or "silence", or grade.fade explains
// the darkness. One ffmpeg pass runs ebur128, blackdetect and silencedetect.
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const C = require('./common.cjs');

const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const FFPROBE = process.env.FFPROBE || siblingBin(FFMPEG, 'ffprobe');
const FRAME = 1 / C.FPS;
const BLACK_MIN = 0.25; // longer than this is a WARN
const LUFS_TOL = 1;
const TRUE_PEAK_MAX = -1; // dBTP

function siblingBin(bin, name) {
  if (!bin || !path.isAbsolute(bin)) return name;
  return path.join(path.dirname(bin), name);
}

const results = [];
function report(name, ok, summary, details = []) {
  const tag = ok === true ? 'PASS' : ok === false ? 'FAIL' : ok;
  results.push({ tag, name, summary });
  console.log(`[${tag}] ${name}: ${summary}`);
  for (const d of details) console.log(`       ${d}`);
}

function run(bin, args) {
  const r = spawnSync(bin, args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (r.error) throw new Error(`could not start ${bin}: ${r.error.message}`);
  return r;
}

function parseRate(s) {
  if (s == null || s === '0/0') return null;
  const m = /^(\d+(?:\.\d+)?)(?:\/(\d+(?:\.\d+)?))?$/.exec(String(s));
  if (!m) return null;
  const n = Number(m[1]);
  const d = m[2] != null ? Number(m[2]) : 1;
  if (!(d > 0) || !isFinite(n)) return null;
  return n / d;
}

function streamDuration(stream, fps) {
  const d = Number(stream && stream.duration);
  if (isFinite(d) && d > 0) return d;
  const n = Number(stream && stream.nb_frames);
  if (fps > 0 && isFinite(n) && n > 0) return n / fps;
  return null;
}

function withinFrame(a, b) {
  return Math.abs(a - b) <= FRAME + 1e-3;
}

function fmt(t) {
  const n = Math.round(Number(t) * 1000) / 1000;
  return String(n);
}

// FILM.mount rounds each side to an even device size. yuv420p needs that too.
function mountedSize(logical, scale) {
  return Math.max(2, Math.round((logical * scale) / 2) * 2);
}

function loadTimeline(args) {
  const explicit = typeof args.timeline === 'string' ? path.resolve(args.timeline) : null;
  const candidates = explicit
    ? [explicit]
    : [path.join(process.cwd(), 'src', 'timeline.js'), path.join(process.cwd(), 'timeline.js'), path.join(C.ROOT, 'src', 'timeline.js')];
  const seen = new Set();
  for (const file of candidates) {
    const abs = path.resolve(file);
    if (seen.has(abs)) continue;
    seen.add(abs);
    if (!fs.existsSync(abs)) continue;
    try {
      return { file: abs, timeline: C.loadTimeline(abs) };
    } catch (e) {
      return { file: abs, error: e.message };
    }
  }
  return null;
}

// Top-level MP4 boxes only. moov before mdat is faststart; the mdat payload is not read.
function topLevelBoxes(file) {
  const fd = fs.openSync(file, 'r');
  try {
    const size = fs.fstatSync(fd).size;
    const boxes = [];
    let pos = 0;
    const hdr = Buffer.alloc(16);
    while (pos + 8 <= size) {
      if (fs.readSync(fd, hdr, 0, 8, pos) < 8) return { boxes, error: `short read at ${pos}` };
      let boxSize = hdr.readUInt32BE(0);
      const type = hdr.toString('latin1', 4, 8);
      let header = 8;
      if (boxSize === 1) {
        if (pos + 16 > size || fs.readSync(fd, hdr, 0, 8, pos + 8) < 8) return { boxes, error: `truncated box at ${pos}` };
        const big = hdr.readBigUInt64BE(0);
        if (big > BigInt(Number.MAX_SAFE_INTEGER)) return { boxes, error: `box too large at ${pos}` };
        boxSize = Number(big);
        header = 16;
      } else if (boxSize === 0) {
        boxSize = size - pos;
      }
      if (boxSize < header) return { boxes, error: `bad box size ${boxSize} at ${pos}` };
      boxes.push(type);
      pos += boxSize;
    }
    return { boxes };
  } finally {
    fs.closeSync(fd);
  }
}

function shotFade(shot) {
  const g = shot && shot.grade;
  if (!g || typeof g !== 'object' || Array.isArray(g)) return 0;
  const n = Number(g.fade);
  return isFinite(n) ? n : 0;
}

function idHas(shot, word) {
  return String(shot && shot.id || '').toLowerCase().includes(word);
}

// Black is expected on a shot whose id contains "black" or "silence", and wherever
// grade.fade is on: that is the timeline saying the picture is given to the grade.
// Silence is expected when the id contains "silence" or "black".
function explainedRanges(tl, kind) {
  if (!tl) return [];
  const out = [];
  for (const s of tl.shots) {
    let why = null;
    if (kind === 'black') {
      if (idHas(s, 'black')) why = `shot id ${s.id} contains "black"`;
      else if (idHas(s, 'silence')) why = `shot id ${s.id} contains "silence"`;
      else if (shotFade(s) > 0) why = `grade fade ${shotFade(s)} on ${s.id}`;
    } else if (idHas(s, 'silence')) why = `shot id ${s.id} contains "silence"`;
    else if (idHas(s, 'black')) why = `shot id ${s.id} contains "black"`;
    if (why) out.push({ start: s.start, end: s.end, why });
  }
  return out;
}

function leftover(span, explained) {
  let parts = [{ start: span.start, end: span.end }];
  for (const ex of explained) {
    const next = [];
    for (const p of parts) {
      const a = Math.max(p.start, ex.start);
      const b = Math.min(p.end, ex.end);
      if (!(b - a > 1e-4)) {
        next.push(p);
        continue;
      }
      if (a > p.start + 1e-4) next.push({ start: p.start, end: a });
      if (p.end > b + 1e-4) next.push({ start: b, end: p.end });
    }
    parts = next;
  }
  return parts.filter((p) => p.end - p.start > BLACK_MIN);
}

function shotsCovering(tl, t0, t1) {
  if (!tl) return [];
  return tl.shots.filter((s) => s.end > t0 + 1e-4 && s.start < t1 - 1e-4).map((s) => s.id);
}

function parseSignals(log) {
  const black = [];
  const reB = /black_start:\s*([0-9.]+)\s+black_end:\s*([0-9.]+)\s+black_duration:\s*([0-9.]+)/g;
  let m;
  while ((m = reB.exec(log))) black.push({ start: Number(m[1]), end: Number(m[2]), duration: Number(m[3]) });
  const silence = [];
  const reS = /silence_end:\s*([0-9.]+)\s*\|\s*silence_duration:\s*([0-9.]+)/g;
  const starts = [];
  const reStart = /silence_start:\s*([0-9.]+)/g;
  while ((m = reStart.exec(log))) starts.push(Number(m[1]));
  let i = 0;
  while ((m = reS.exec(log))) {
    const end = Number(m[1]);
    const duration = Number(m[2]);
    const start = i < starts.length ? starts[i] : end - duration;
    i++;
    silence.push({ start, end, duration });
  }
  while (i < starts.length) {
    silence.push({ start: starts[i], end: null, duration: null });
    i++;
  }
  const loud = /Integrated loudness:[\s\S]*?\bI:\s*([-+0-9.]+)\s*LUFS/.exec(log);
  const peak = /True peak:[\s\S]*?\bPeak:\s*([-+0-9.]+)\s*dBFS/.exec(log);
  return {
    black,
    silence,
    lufs: loud ? Number(loud[1]) : null,
    truePeak: peak ? Number(peak[1]) : null,
  };
}

function spanText(span) {
  const dur = span.duration != null ? span.duration : span.end - span.start;
  return `${fmt(dur)}s at ${fmt(span.start)}–${fmt(span.end)}`;
}

function reportHolds(kind, spans, tl) {
  const explained = explainedRanges(tl, kind);
  const warns = [];
  const excused = [];
  for (const span of spans) {
    if (!(span.duration > BLACK_MIN)) continue;
    const open = leftover(span, explained);
    if (!open.length) {
      const why = explained.filter((ex) => ex.end > span.start + 1e-4 && ex.start < span.end - 1e-4).map((ex) => ex.why);
      excused.push(`${spanText(span)} explained by ${why.join('; ') || 'the timeline'}`);
      continue;
    }
    for (const part of open) {
      const ids = shotsCovering(tl, part.start, part.end);
      warns.push(`${spanText(part)}${ids.length ? ` (shots: ${ids.join(', ')})` : ''}`);
    }
  }
  if (warns.length) {
    report(kind, 'WARN', `${warns.length} span${warns.length === 1 ? '' : 's'} longer than ${BLACK_MIN}s`, warns.concat(excused));
    return;
  }
  if (excused.length) {
    report(kind, true, excused.length === 1 ? excused[0] : `${excused.length} spans explained by the timeline`, excused.length === 1 ? [] : excused);
    return;
  }
  report(kind, true, `none longer than ${BLACK_MIN}s`);
}

function main() {
  const t0 = Date.now();
  const args = C.parseArgs(process.argv.slice(2), []);
  const fileArg = args._[0];
  if (!fileArg) C.die('usage: node tools/qa.cjs <file.mp4> [--scale 1] [--lufs -14] [--timeline path]');
  const file = path.resolve(fileArg);
  if (!fs.existsSync(file)) C.die(`no such file: ${file}`);
  const scale = args.scale != null ? Number(args.scale) : 1;
  if (!(scale > 0) || !isFinite(scale)) C.die(`--scale must be a positive number, got ${args.scale}`);
  const lufsTarget = args.lufs != null ? Number(args.lufs) : -14;
  if (!isFinite(lufsTarget)) C.die(`--lufs must be a number, got ${args.lufs}`);

  const probed = run(FFPROBE, ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', file]);
  if (probed.status !== 0) C.die(`ffprobe failed (${probed.status})\n${(probed.stderr || '').trim()}`);
  let probe;
  try {
    probe = JSON.parse(probed.stdout || '{}');
  } catch (e) {
    C.die(`ffprobe did not return JSON: ${e.message}`);
  }
  const streams = Array.isArray(probe.streams) ? probe.streams : [];
  const video = streams.find((s) => s.codec_type === 'video' && !(s.disposition && s.disposition.attached_pic));
  const audio = streams.find((s) => s.codec_type === 'audio');
  const found = loadTimeline(args);

  const videoProblems = [];
  let fps = null;
  if (!video) videoProblems.push('no video stream');
  else {
    fps = parseRate(video.r_frame_rate) || parseRate(video.avg_frame_rate);
    if (video.codec_name !== 'h264') videoProblems.push(`codec ${video.codec_name || 'missing'} is not h264`);
    if (video.pix_fmt !== 'yuv420p') videoProblems.push(`pix_fmt ${video.pix_fmt || 'missing'} is not yuv420p`);
    const w = Number(video.width);
    const h = Number(video.height);
    if (found && found.timeline) {
      const ew = mountedSize(found.timeline.width, scale);
      const eh = mountedSize(found.timeline.height, scale);
      if (w !== ew || h !== eh) {
        videoProblems.push(`frame ${w}×${h} is not ${ew}×${eh} (timeline ${found.timeline.width}×${found.timeline.height} × scale ${scale})`);
      }
    }
    const sizeNote = found && found.timeline ? `${w}×${h}` : `${w}×${h} (no timeline; frame size not compared)`;
    if (!videoProblems.length) report('video', true, `h264 yuv420p ${sizeNote}`);
  }
  if (videoProblems.length) report('video', false, videoProblems.join('; '));

  if (fps == null) report('fps', false, 'frame rate missing');
  else if (Math.abs(fps - C.FPS) > 0.01) report('fps', false, `${fmt(fps)} is not ${C.FPS}`);
  else report('fps', true, String(C.FPS));

  let boxes;
  try {
    boxes = topLevelBoxes(file);
  } catch (e) {
    boxes = { boxes: [], error: e.message };
  }
  if (boxes.error) report('faststart', false, boxes.error);
  else {
    const moov = boxes.boxes.indexOf('moov');
    const mdat = boxes.boxes.indexOf('mdat');
    if (moov < 0) report('faststart', false, 'no moov box');
    else if (mdat < 0) report('faststart', false, 'no mdat box');
    else if (moov > mdat) report('faststart', false, 'moov follows mdat');
    else report('faststart', true, 'moov before mdat');
  }

  const videoDur = video ? streamDuration(video, fps) : null;
  const audioDur = audio ? streamDuration(audio, null) : null;
  const formatDur = probe.format && isFinite(Number(probe.format.duration)) ? Number(probe.format.duration) : null;
  const vDur = videoDur != null ? videoDur : formatDur;
  const aDur = audioDur != null ? audioDur : formatDur;
  const durProblems = [];
  const durNotes = [];
  if (!found) durNotes.push('timeline check skipped');
  else if (found.error) durNotes.push(`timeline check skipped (${path.basename(found.file)}: ${found.error})`);
  else if (vDur == null) durProblems.push('video duration missing');
  else if (!withinFrame(vDur, found.timeline.duration)) {
    durProblems.push(`video ${fmt(vDur)}s differs from timeline ${fmt(found.timeline.duration)}s by more than 1 frame`);
  } else durNotes.push(`video ${fmt(vDur)}s is within 1 frame of timeline ${fmt(found.timeline.duration)}s`);
  if (vDur == null || aDur == null) durProblems.push('audio and video durations could not both be read');
  else if (!withinFrame(aDur, vDur)) durProblems.push(`audio ${fmt(aDur)}s differs from video ${fmt(vDur)}s by more than 1 frame`);
  else durNotes.push(`audio ${fmt(aDur)}s matches video ${fmt(vDur)}s`);
  if (durProblems.length) report('duration', false, durProblems.join('; '), durNotes);
  else report('duration', true, durNotes.join('; '));

  const audioProblems = [];
  if (!audio) audioProblems.push('no audio stream');
  else {
    if (audio.codec_name !== 'aac') audioProblems.push(`codec ${audio.codec_name || 'missing'} is not aac`);
    if (Number(audio.sample_rate) !== 48000) audioProblems.push(`sample rate ${audio.sample_rate || 'missing'} is not 48000`);
    if (Number(audio.channels) !== 2) audioProblems.push(`${audio.channels || 'missing'} channels is not stereo`);
    if (!audioProblems.length) report('audio', true, 'aac 48000 Hz stereo');
  }
  if (audioProblems.length) report('audio', false, audioProblems.join('; '));

  const measured = run(FFMPEG, [
    '-hide_banner', '-nostats',
    '-i', file,
    '-vf', `blackdetect=d=${BLACK_MIN}:pic_th=0.98:pix_th=0.10`,
    '-af', `silencedetect=n=-60dB:d=${BLACK_MIN},ebur128=peak=true:framelog=quiet`,
    '-f', 'null', '-',
  ]);
  const log = `${measured.stderr || ''}\n${measured.stdout || ''}`;
  if (measured.status !== 0) C.die(`ffmpeg measure failed (${measured.status})\n${log.trim().slice(-2000)}`);
  const signals = parseSignals(log);
  if (aDur != null) {
    for (const s of signals.silence) {
      if (s.end == null) {
        s.end = aDur;
        s.duration = s.end - s.start;
      }
    }
  }

  if (signals.lufs == null) report('loudness', false, 'integrated loudness was not measured');
  else if (Math.abs(signals.lufs - lufsTarget) > LUFS_TOL) {
    report('loudness', false, `${fmt(signals.lufs)} LUFS is outside ${fmt(lufsTarget)} ± ${LUFS_TOL}`);
  } else report('loudness', true, `${fmt(signals.lufs)} LUFS (target ${fmt(lufsTarget)} ± ${LUFS_TOL})`);

  if (signals.truePeak == null) report('true peak', false, 'true peak was not measured');
  else if (signals.truePeak > TRUE_PEAK_MAX) report('true peak', false, `${fmt(signals.truePeak)} dBTP is above ${TRUE_PEAK_MAX}`);
  else report('true peak', true, `${fmt(signals.truePeak)} dBTP (limit ${TRUE_PEAK_MAX})`);

  const tl = found && found.timeline ? found.timeline : null;
  reportHolds('black', signals.black, tl);
  reportHolds('silence', signals.silence, tl);

  const failed = results.some((r) => r.tag === 'FAIL');
  const seconds = ((Date.now() - t0) / 1000).toFixed(2);
  console.log(`${failed ? 'FAILED' : 'OK'} in ${seconds}s`);
  process.exit(failed ? 1 : 0);
}

main();
