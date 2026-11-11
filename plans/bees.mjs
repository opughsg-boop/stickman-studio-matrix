// Hand-directed plan for "إزاي تعمل بيت للنحل" (uses the bee-keeping asset pack).
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8'));
const S = tr.segments;
const B = { w: 3.4, d: 4.2, h: 2 };
const H = 'hive';
const beats = [
  { s: 0, kind: 'intro', add: [
      { id: 'flowers', type: 'crops', pos: [-3.6, 0, 3.6], params: { rows: 3, per: 4, spacing: .7, color: '#d65fa0' }, anim: 'grow' },
      { id: 'flowers2', type: 'crops', pos: [3.8, 0, -3.8], params: { rows: 2, per: 5, spacing: .7, color: '#f2c230' }, anim: 'grow', delay: .3 },
      { id: 'bees', type: 'bees', pos: [0, 0, 0], params: { count: 22 }, anim: 'grow' }],
    modes: { bees: { mode: 'swarm', c: [0, 3, 0], r: 3.5, h: 1.2 } },
    camera: { preset: 'wide', target: [0, 1.5, 0], zoom: 'in' } },
  { s: 1, kind: 'info', add: [{ id: 'box', type: 'hive_box', tag: H, pos: [0, 0, 0], params: B }],
    modes: { bees: { mode: 'swarm', c: [0, 2.6, 0], r: 2.6, h: .8 } },
    camera: { preset: 'hero', target: [0, 1, 0], dist: 21, az: .5, zoom: 'in' } },
  { s: 2, kind: 'problem', add: [{ id: 'mess', type: 'wax_mess', tag: H, pos: [0, 0, 0], params: { count: 16 }, anim: 'grow' }],
    modes: { bees: { mode: 'messy', c: [0, 2.4, 0], r: 1.6, h: .5, flat: 1.3 } },
    camera: { preset: 'close', target: [0, 1, 0], dist: 15, elev: .62, az: .35, zoom: 'in' } },
  { s: 3, kind: 'solution', remove: ['mess'], add: [{ id: 'frames', type: 'frames', tag: H, pos: [0, .14, 0], params: { count: 8, spacing: .55 }, delay: .1 }],
    modes: { bees: { mode: 'swarm', c: [0, 3.2, 0], r: 3, h: .8 } },
    camera: { preset: 'close', target: [0, 1, 0], dist: 15, elev: .85, az: .5, zoom: 'out' } },
  { s: 4, kind: 'info', modes: { frames: { spacing: .22 } },
    camera: { preset: 'detail', target: [0, 1.2, 0], dist: 11, elev: .7, az: .15, spin: .2 } },
  { s: 5, kind: 'problem', add: [{ id: 'glue', type: 'glue', tag: H, pos: [0, .14, 0], params: { count: 8, spacing: .22 }, anim: 'fade' }],
    modes: { bees: { mode: 'messy', c: [0, 2.6, 0], r: 1.4, h: .3 } },
    camera: { preset: 'detail', target: [0, 1.3, 0], dist: 9, elev: .6, az: -.2, zoom: 'in' } },
  { s: 6, kind: 'solution', remove: ['glue'], modes: { frames: { spacing: .4 } },
    add: [{ id: 'gap', type: 'arrow', tag: H, pos: [0, 0, 0], params: { from: [-.2, 2.25, 1.9], to: [.2, 2.25, 1.9], double: true, head: .14, label: 'سنتي إلا ربع', labelUp: .55 }, anim: 'grow', delay: .5 }],
    camera: { preset: 'close', target: [0, 1.6, .8], dist: 10, elev: .5, az: .25, zoom: 'out' } },
  { s: 7, kind: 'info', remove: ['gap'], add: [{ id: 'lbl1', type: 'sign', tag: H, pos: [0, 0, 0], params: { text: 'مسافة النحل', y: 3.1, scale: .9 }, anim: 'grow' }],
    modes: { bees: { mode: 'swarm', c: [0, 1.9, 0], r: 1.1, h: .4, flat: 1.6 } },
    camera: { preset: 'low', target: [0, 1.4, 0], dist: 12, elev: .25, az: .9 } },
  { s: 8, kind: 'problem', remove: ['lbl1'], add: [
      { id: 'super', type: 'hive_box', tag: H, pos: [0, 2, 0], params: { ...B, entrance: false } },
      { id: 'superF', type: 'frames', tag: H, pos: [0, 2.14, 0], params: { count: 8, spacing: .4, comb: 'honey' }, delay: .35, dust: false },
      { id: 'queen', type: 'queen', tag: H, pos: [0, 4, 0], anim: 'grow', delay: .8 },
      { id: 'eggs', type: 'eggs', tag: H, pos: [0, 3.92, 0], params: { count: 40 }, anim: 'none', delay: 1.1 }],
    modes: { bees: { mode: 'swarm', c: [0, 4.6, 0], r: 2.4, h: .5 } },
    camera: { preset: 'hero', target: [0, 3.3, 0], dist: 15, elev: .6, az: .45, zoom: 'in' } },
  { s: 9, kind: 'solution', remove: ['queen', 'eggs', 'super', 'superF'], add: [
      { id: 'excl', type: 'excluder', tag: H, pos: [0, 2, 0], params: B },
      { id: 'super2', type: 'hive_box', tag: H, pos: [0, 2.12, 0], params: { ...B, entrance: false }, delay: .45 },
      { id: 'super2F', type: 'frames', tag: H, pos: [0, 2.26, 0], params: { count: 8, spacing: .4, comb: 'honey' }, delay: .6, dust: false }],
    camera: { preset: 'hero', target: [0, 2.4, 0], dist: 14, elev: .35, az: .3, zoom: 'out' } },
  { s: 10, kind: 'info', add: [
      { id: 'queen2', type: 'queen', tag: H, pos: [0, 1.75, .6], anim: 'grow' },
      { id: 'lid', type: 'lid', tag: H, pos: [0, 4.12, 0], params: B, delay: 1.2 }],
    modes: { bees: { mode: 'stream', from: [0, 1.2, 1], to: [0, 3.6, 1] } },
    camera: { preset: 'detail', target: [0, 2.1, .6], dist: 10, elev: .15, az: .05, spin: .15 } },
  { s: 12, kind: 'problem', remove: ['queen2'], effects: ['heat'], add: [
      { id: 'sun', type: 'sun', pos: [-9, 13, -8], params: { r: 1.6 }, anim: 'grow', dust: false },
      { id: 'haze', type: 'heat', tag: H, pos: [0, 0, 0], params: { w: 4.2, h: 4.6, d: 5 }, anim: 'fade' },
      { id: 'drips', type: 'drips', tag: H, pos: [0, .14, 0], params: { count: 22 }, anim: 'fade', delay: .4 }],
    modes: { bees: { mode: 'messy', c: [0, 4.8, 0], r: 2.2, h: .4 } },
    camera: { preset: 'wide', target: [-1.5, 4, 0], dist: 22, elev: .32, az: .25, zoom: 'in' } },
  { s: 13, kind: 'solution', remove: ['haze', 'drips'], add: [{ id: 'stand', type: 'stand', pos: [0, 0, 0], params: { ...B, h: 1 }, anim: 'grow', delay: .05, dust: false }],
    modes: { bees: { mode: 'swarm', c: [0, 5.6, 0], r: 2.8, h: .6 } },
    camera: { preset: 'hero', target: [0, 2.4, 0], dist: 15, elev: .2, az: .8, zoom: 'out' } },
  { s: 14, kind: 'info', remove: ['sun'], add: [{ id: 'tree', type: 'tree', pos: [-3.6, 0, -2.6], params: { scale: 2.3 } }],
    camera: { preset: 'hero', target: [-1.2, 3, -.6], dist: 18, elev: .3, az: -.35, spin: .2 } },
  { s: 15, kind: 'info', remove: ['lid'], add: [
      { id: 'lidv', type: 'lid', tag: H, pos: [0, 4.12, 0], params: { ...B, vent: true } },
      { id: 'up1', type: 'arrow', pos: [0, 0, 0], params: { from: [-.3, 6.2, 1.05], to: [-.3, 7.6, 1.05], head: .3, color: '#ff8a3d' }, anim: 'grow', delay: .7 },
      { id: 'up2', type: 'arrow', pos: [0, 0, 0], params: { from: [.4, 6.2, 1.05], to: [.4, 7.6, 1.05], head: .3, color: '#ff8a3d' }, anim: 'grow', delay: .85 }],
    camera: { preset: 'close', target: [0, 5.6, .6], dist: 11, elev: .55, az: .4, zoom: 'in' } },
  { s: 16, kind: 'tip', remove: ['up1', 'up2'], add: [
      { id: 'compass', type: 'arrow', pos: [0, 0, 0], params: { from: [2.4, .15, 0], to: [5.4, .15, 0], head: .6, label: 'الشرق', labelUp: 1.1 }, anim: 'grow' },
      { id: 'sun2', type: 'sun', pos: [16, 5, -4], params: { r: 1.8, rise: 7, color: '#ffcf5a' }, anim: 'none', dust: false }],
    modes: { bees: { mode: 'swarm', c: [1.6, 1.4, 0], r: 1.2, h: .3 } },
    camera: { preset: 'hero', target: [2.6, 1.6, 0], dist: 15, elev: .28, az: 1.25, zoom: 'in' } },
  { s: 18, kind: 'info', remove: ['compass'], modes: { bees: { mode: 'stream', from: [1.8, 1.2, 0], to: [12, 4.5, -3] } },
    camera: { preset: 'wide', target: [2.5, 2.4, 0], dist: 17, elev: .3, az: 1.05, zoom: 'out' } },
];
const segStart = i => (i === 0 ? 0 : S[i].start);
const plan = {
  version: 2, planner: 'directed', duration: tr.duration, language: 'ar', prompt: 'إزاي تعمل بيت للنحل',
  captions: buildCaptions(tr, 2), lifts: [{ t: segStart(13) + .15, dy: 1, dur: .9 }], fades: [], env: {}, style: { camEase: .32, captionY: .78 },
  beats: beats.map((b, i) => ({ start: segStart(b.s), end: i + 1 < beats.length ? segStart(beats[i + 1].s) : tr.duration, text: '', remove: [], modes: {}, effects: [], add: [], ...b })),
};
plan.beats.forEach(b => { b.text = S.filter(s => s.start >= b.start - .01 && s.start < b.end - .01).map(s => s.text).join(' '); });
fs.writeFileSync(out, JSON.stringify(plan, null, 1));
console.log(plan.beats.map(b => `${b.start.toFixed(2)}-${b.end.toFixed(2)} ${b.kind} ${b.text}`).join('\n'));
