// "الأسفلت المسامي" - diorama engine, cutaway road + gravel reservoir + continuous camera + wordless graphics.
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';

const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8'));
const S = tr.segments, D = tr.duration;
const at = (i, k = 0) => (i === 0 && k === 0 ? 0 : S[i].words[k].start);

const beats = [
  // 0. Hook: heavy rain flooding the cutaway road (problem)
  { t: 0, kind: 'problem',
    add: [
      { id: 'road', type: 'porous_road', pos: [0, .72, 0], anim: 'grow' },
      { id: 'rain', type: 'rain', pos: [0, 0, 0], anim: 'fade' },
      { id: 't1', type: 'tree', pos: [-4.9, 0, -2.5], params: { h: 2.3 }, anim: 'grow', delay: .2 },
      { id: 't2', type: 'tree', pos: [4.8, 0, -2.4], params: { h: 2.1 }, anim: 'grow', delay: .3 }
    ],
    modes: { road: { mode: 'normal' } },
    camera: { preset: 'wide', target: [0, .8, 0], dist: 12.5, elev: .32, az: .25, zoom: 'in' } },

  // 1. Sealed asphalt traps water -> puddles (problem)
  { t: at(1), kind: 'problem',
    modes: { road: { mode: 'normal' } },
    camera: { preset: 'close', target: [0, .5, .4], dist: 7.2, elev: .22, az: -.15, zoom: 'in' } },

  // 2. Porous asphalt removes fine sand -> open voids (solution)
  { t: at(2), kind: 'solution',
    modes: { road: { mode: 'porous' } },
    camera: { preset: 'detail', target: [0, .35, 1.8], dist: 5.4, elev: .14, az: .12, zoom: 'out' } },

  // 3. Water sinks straight down in a flash (solution)
  { t: at(3), kind: 'solution',
    modes: { road: { mode: 'porous' } },
    camera: { preset: 'close', target: [.4, .4, 1.2], dist: 6.0, elev: .18, az: -.2, zoom: 'in' } },

  // 4. Without base, water hits soil -> mud & sinking road (problem)
  { t: at(4), kind: 'problem',
    modes: { road: { mode: 'mud_risk' } },
    camera: { preset: 'close', target: [0, .2, 1.4], dist: 6.8, elev: .12, az: .22, zoom: 'out' } },

  // 5. Gravel reservoir tank drops in underneath & drains calmly (solution)
  { t: at(5), kind: 'solution',
    add: [{ id: 'gravel', type: 'gravel_tank', pos: [0, 0, 0], params: { h: .72 }, anim: 'drop' }],
    modes: { road: { mode: 'drain' }, gravel: { mode: 'fill' } },
    lifts: [],
    camera: { preset: 'hero', target: [0, .6, 1.0], dist: 8.6, elev: .16, az: -.18, zoom: 'in' } },

  // 6a. Dust clogs pores (problem)
  { t: at(6), kind: 'problem',
    modes: { road: { mode: 'clogged' }, gravel: { mode: 'drain' } },
    camera: { preset: 'detail', target: [-.5, .6, .8], dist: 5.8, elev: .26, az: .15, zoom: 'in' } },

  // 6b. High-pressure water jet blasts pores clean (solution)
  { t: at(6, 5), kind: 'solution',
    modes: { road: { mode: 'jet_clean' }, gravel: { mode: 'drain' } },
    camera: { preset: 'close', target: [.2, .8, .5], dist: 7.4, elev: .24, az: -.12, zoom: 'out' } },

  // 7. Tip: reduces tire noise & cools street in summer (solution)
  { t: at(7), kind: 'solution',
    remove: ['rain'],
    modes: { road: { mode: 'cool_quiet' }, gravel: { mode: 'drain' } },
    camera: { preset: 'close', target: [0, .7, .4], dist: 7.8, elev: .2, az: .28, zoom: 'in' } },

  // 8. CTA: wide pull-out orbit
  { t: at(8), kind: 'info',
    modes: { road: { mode: 'cta' }, gravel: { mode: 'drain' } },
    camera: { preset: 'orbit', target: [0, .7, 0], dist: 13.0, elev: .3, az: -.35, zoom: 'out' } },
];

const plan = {
  version: 2,
  planner: 'directed',
  duration: D,
  language: 'ar',
  prompt: 'الأسفلت المسامي',
  captions: S.flatMap((seg, si) =>
    buildCaptions({ segments: [seg] }, 2).map(c => ({
      ...c,
      end: Math.min(c.end + .22, si + 1 < S.length ? S[si + 1].start : D)
    }))
  ),
  fades: [],
  env: { exposure: 0.98 },
  style: { camEase: .6, captionY: .78, exposure: 0.98 },
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
