// "Floating Solar Panels" - Realistic PBR Cutaway Diorama (Desert Heat vs Floating Lake Cooling).
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';

const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8'));
const S = tr.segments, D = tr.duration;
const at = (i, k = 0) => (i === 0 && k === 0 ? 0 : S[i].words[k].start);

const beats = [
  // 0. Hook: wide sweeping view of split cutaway island (desert + floating lake)
  { t: 0, kind: 'info',
    add: [
      { id: 'dio', type: 'floating_solar_diorama', pos: [0, 0, 0], anim: 'none' },
      { id: 'sun', type: 'sun', pos: [-4.5, 6.2, -4.5], anim: 'fade' },
      { id: 'c1', type: 'cloud', pos: [2.5, 5.2, -3.5], anim: 'fade', delay: .1 },
      { id: 'cac1', type: 'cactus', pos: [-5.6, 0, -2.5], params: { scale: 1.05 }, anim: 'grow', delay: .15 },
      { id: 'cac2', type: 'cactus', pos: [-5.4, 0, 2.8], params: { scale: .9 }, anim: 'grow', delay: .2 },
      { id: 'rk1', type: 'rock', pos: [-2.1, 0, -3.2], anim: 'grow', delay: .15 },
      { id: 'pt1', type: 'palm_tree', pos: [5.8, 0, -2.6], params: { h: 2.9 }, anim: 'grow', delay: .2 },
      { id: 'tr1', type: 'pine_tree', pos: [5.9, 0, 2.8], params: { scale: .95 }, anim: 'grow', delay: .25 },
    ],
    modes: { dio: { mode: 'idle' } },
    camera: { preset: 'wide', target: [.4, .5, 0], dist: 14.5, elev: .34, az: .32, zoom: 'in' } },

  // 1. Desert sun looks unbeatable
  { t: at(1), kind: 'info',
    modes: { dio: { mode: 'idle' } },
    camera: { preset: 'close', target: [-3.6, .6, 0], dist: 8.6, elev: .24, az: -.28, zoom: 'in' } },

  // 2. Problem: extreme heat bakes desert panels -> output drops
  { t: at(2), kind: 'problem',
    modes: { dio: { mode: 'heat_drop' } },
    camera: { preset: 'close', target: [-3.2, .7, .2], dist: 6.8, elev: .22, az: -.14, zoom: 'in' } },

  // 3. Problem: intense heat builds resistance inside cells
  { t: at(3), kind: 'problem',
    modes: { dio: { mode: 'resistance' } },
    camera: { preset: 'detail', target: [-3.6, .75, .9], dist: 4.4, elev: .28, az: .16, zoom: 'in' } },

  // 4. Solution: float panels on water -> giant natural cooler
  { t: at(4), kind: 'solution',
    modes: { dio: { mode: 'lake_cool' } },
    camera: { preset: 'hero', target: [2.0, .35, -.2], dist: 8.2, elev: .25, az: .36, zoom: 'out' } },

  // 5. Solution: +15% electricity output -> powers shore house
  { t: at(5), kind: 'solution',
    modes: { dio: { mode: 'boost' } },
    camera: { preset: 'close', target: [3.6, .75, .4], dist: 7.2, elev: .22, az: -.22, zoom: 'in' } },

  // 6. Solution: shade cuts lake evaporation by up to 70% (cutaway edge view!)
  { t: at(6), kind: 'solution',
    modes: { dio: { mode: 'evap_compare' } },
    camera: { preset: 'detail', target: [2.0, .25, 2.2], dist: 6.8, elev: .16, az: .28, zoom: 'in' } },

  // 7. Solution: more power, more water, zero land wasted
  { t: at(7), kind: 'solution',
    modes: { dio: { mode: 'thrive' } },
    camera: { preset: 'hero', target: [2.6, .6, .2], dist: 9.8, elev: .3, az: -.24, zoom: 'out' } },

  // 8. CTA: wide pull-out orbit
  { t: at(8), kind: 'info',
    modes: { dio: { mode: 'thrive' } },
    camera: { preset: 'orbit', target: [.4, .5, 0], dist: 14.8, elev: .35, az: .42, zoom: 'out' } },
];

const plan = {
  version: 2,
  planner: 'directed',
  duration: D,
  language: 'en',
  prompt: 'Floating Solar Panels on Lakes vs Desert (Realistic PBR)',
  captions: S.flatMap((seg, si) =>
    buildCaptions({ segments: [seg] }, 1).map(c => ({
      ...c,
      end: Math.min(c.end + .18, si + 1 < S.length ? S[si + 1].start : D)
    }))
  ),
  fades: [],
  env: { sky: 'realistic', hideIsland: true, exposure: 0.92 },
  style: { camEase: .65, captionY: .78, exposure: 0.92, camScale: 1.0 },
  beats: beats.map((b, i) => ({
    start: b.t,
    end: i + 1 < beats.length ? beats[i + 1].t : D,
    text: '',
    remove: [],
    modes: {},
    effects: [],
    add: [],
    ...b,
    camera: { punch: false, ...b.camera }
  })),
};

plan.beats.forEach(b => {
  delete b.t;
  b.text = S.flatMap(s => s.words)
    .filter(x => x.start >= b.start - .01 && x.start < b.end - .01)
    .map(x => x.w)
    .join(' ');
});

fs.writeFileSync(out, JSON.stringify(plan, null, 1));
console.log(plan.beats.length + ' beats -> ' + out);
