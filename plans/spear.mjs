// "طائر الرمح" - cine engine, one shot per phrase.
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8'));
const S = tr.segments, at = i => (i === 0 ? 0 : S[i].start), D = tr.duration;

const SKY = { type: 'ground', hdri: 'kloofendal_48d_partly_cloudy_puresky' };
const TEAL = { type: 'studio', color: '#2fb8cc' }, BLUE = { type: 'studio', color: '#2a6fd6' }, NAVY = { type: 'studio', color: '#1d3557', key: 2.6 };
const SAND = { type: 'studio', color: '#d9a35a' }, PALE = { type: 'studio', color: '#cfe6f2' };
const MUSEUM = { type: 'hdri', hdri: 'brown_photostudio_02', blur: .35, envIntensity: 1.1 };
const stork = (id, o = {}) => ({ id, model: 'Stork', height: .35, ...o });
const spear = (follow, o = {}) => ({ type: 'spear', id: 'sp_' + follow, follow, offset: [0, .09, .35], rot: [.25, 0, 1.35], len: .85, ...o });

const shots = [
  // HOOK
  { t: at(0), set: SKY, actors: [stork('b', { pos: [-4, 2.2, -1], to: [1.5, 2.0, .6], faceMove: true, speed: 1.1 })], props: [spear('b')],
    camera: { pos: [2.2, 1.7, 3], target: 'b', fov: 42, ease: 'linear' } },
  { t: at(1), set: SKY, actors: [stork('b', { pos: [0, 2, 0], rotY: 1.2, speed: .9 })], props: [spear('b', { holo: '#ff3b30' })],
    camera: { pos: [1.5, 2.25, 2.1], target: [0, 2.05, .3], to: { pos: [1.1, 2.15, 1.5] }, fov: 38, dof: { aperture: .03, maxblur: .015 } },
    ui: [{ type: 'counter', text: '١ متر', at: [.5, .2], start: .9, size: .13, color: '#ffd31a' }] },
  { t: at(2), set: TEAL, actors: [stork('b', { pos: [0, 1.6, 0], speed: 1 })], props: [spear('b')], flash: true,
    camera: { pos: [1.4, 1.7, 1.8], target: [0, 1.6, .2], orbit: 1.0, fov: 40 } },
  { t: at(3), set: BLUE, actors: [{ id: 'r', model: 'RobotExpressive', clip: 'Idle', height: 2, morph: { Surprised: [0, 1] } }],
    camera: { pos: [.3, 1.9, 3.4], target: [0, 1.55, 0], to: { pos: [.1, 1.7, 2.1] }, fov: 35 } },
  // 1822 / farmer
  { t: at(4), set: SKY, actors: [{ id: 'f', model: 'Xbot', clip: 'walk', pos: [-1.5, 0, -1], to: [.2, 0, .3], faceMove: true, height: 1.8 }],
    camera: { pos: [2.6, 1.2, 3.2], target: [-.4, 1, -.2], fov: 40 }, ui: [{ type: 'counter', text: '1822', at: [.5, .17], start: .15, size: .17, color: '#ffffff' }] },
  { t: S[4].start + 2.1, set: SKY, actors: [stork('b', { pos: [0, .25, 0], rotY: .6, speed: 0, clipOffset: .4 }), { id: 'f', model: 'Xbot', clip: 'idle', pos: [-1.2, 0, -2.6], rotY: .4, height: 1.8 }],
    props: [spear('b')], camera: { pos: [1.7, .7, 2.5], target: [-.3, .6, -.6], to: { pos: [1.3, .65, 1.9] }, fov: 42, dof: { aperture: .025, maxblur: .012 } },
    ui: [{ type: 'pin', text: 'ألمانيا', icon: '+', at: [.5, .2], start: .3 }] },
  // not German
  { t: at(5), set: NAVY, props: [{ type: 'spear', id: 's', pos: [0, 1.4, 0], rot: [0, 0, 1.2], len: 1.2, spin: .6, holo: '#ff9f1a' }],
    camera: { pos: [0, 1.5, 1.6], target: [0, 1.4, 0], to: { pos: [0, 1.45, 1.0] }, fov: 38 }, ui: [{ type: 'label', text: '؟', world: [0, 1.95, 0], size: .14, start: .5 }] },
  { t: at(6), set: SAND, props: [{ type: 'disc', r: .5, pos: [-1.4, .01, .8], color: '#3a8f4a' }, { type: 'disc', r: .5, pos: [1.6, .01, -1.6], color: '#2a6fd6' },
      { type: 'arc', from: [-1.4, .05, .8], to: [1.6, .05, -1.6], dur: 1.3, r: .035 }],
    camera: { pos: [0, 8, 6.5], target: [0, 0, -.4], fov: 46, handheld: .3 }, ui: [{ type: 'label', text: 'أفريقيا', world: [-1.4, .5, .8], size: .07 }, { type: 'label', text: 'ألمانيا', world: [1.6, .5, -1.6], size: .07, start: 1.1 }] },
  { t: at(7), set: SAND, props: [{ type: 'disc', r: .5, pos: [-1.4, .01, .8], color: '#3a8f4a' }, { type: 'disc', r: .5, pos: [1.6, .01, -1.6], color: '#2a6fd6' },
      { type: 'arc', from: [-1.4, .05, .8], to: [1.6, .05, -1.6], dur: .01, r: .035 }],
    actors: [stork('b', { pos: [-1.4, 1, .8], to: [1.6, 1, -1.6], faceMove: true, height: .3 })],
    camera: { pos: [2.6, 2.4, 2.6], target: 'b', fov: 42 }, ui: [{ type: 'counter', text: '+6000 كم', at: [.5, .17], start: .1, size: .12, color: '#ffd31a' }] },
  // shock + belief
  { t: at(8), set: BLUE, actors: [{ id: 'r', model: 'RobotExpressive', clip: 'No', height: 2, morph: { Surprised: 1 } }], flash: true,
    camera: { pos: [-.4, 1.8, 2.6], target: [0, 1.5, 0], to: { pos: [-.2, 1.7, 1.9] }, fov: 35 } },
  { t: at(9), set: TEAL, actors: [{ id: 'm1', model: 'Xbot', clip: 'headShake', pos: [-.6, 0, 0], rotY: .3, height: 1.8 }, { id: 'm2', model: 'Soldier', clip: 'Idle', pos: [.7, 0, -.4], rotY: -.3, height: 1.8 }],
    camera: { pos: [0, 1.5, 3.6], target: [0, 1.2, 0], to: { pos: [.3, 1.5, 3] }, fov: 40 } },
  { t: at(10), set: PALE, actors: [stork('b', { pos: [0, 1.6, 0], grow: [1, .001], speed: 1 })], props: [{ type: 'particles', count: 90, area: [4, 3, 3], pos: [-2, 0, -1.5], color: '#ffffff', glow: .3, size: .02 }],
    camera: { pos: [0, 1.7, 2.6], target: [0, 1.6, 0], fov: 40 }, ui: [{ type: 'label', text: '؟', world: [0, 2.1, 0], size: .16, start: 1.4 }] },
  { t: at(11), set: NAVY, actors: [{ id: 'fl', model: 'Flamingo', pos: [0, 1.4, 0], to: [0, -.4, .2], rotX: .6, height: .5 }],
    props: [{ type: 'box', size: [8, .02, 8], pos: [0, .6, 0], color: '#4fb3ff', opacity: .45, rough: .1 }],
    camera: { pos: [0, .7, 2.4], target: [0, .6, 0], fov: 42 } },
  { t: at(12), set: BLUE, actors: [stork('b', { pos: [0, 1.5, 0], grow: [1, .001], holo: '#9b5cff' }), { id: 'p', model: 'Parrot', pos: [0, 1.5, 0], grow: [.001, 1], height: .35, rotY: .6 }],
    flash: true, camera: { pos: [.8, 1.6, 2], target: [0, 1.5, 0], orbit: .7, fov: 40 } },
  // BUT
  { t: at(13), set: NAVY, actors: [stork('b', { pos: [0, 1.6, 0], rotY: .9, speed: .7, holo: '#ffc94a' })], props: [spear('b')],
    camera: { pos: [1.5, 1.5, 1.6], target: [0, 1.6, .2], to: { pos: [1.0, 1.58, 1.1] }, fov: 38, dof: { aperture: .02, maxblur: .012 } }, transition: 'cut', flash: true },
  { t: at(14), set: SKY, actors: [stork('b', { pos: [-3, 2.4, 2], to: [3, 3, -3], faceMove: true, speed: 1.1 })], props: [spear('b')],
    camera: { pos: [0, 1.2, 4], target: 'b', fov: 46 } },
  // rings
  { t: at(15), set: TEAL, actors: [stork('b', { pos: [0, 1.4, 0], speed: 0, clipOffset: .2, rotY: 1.2 }), { id: 's', model: 'Xbot', clip: 'agree', pos: [-1.5, 0, -1.3], rotY: .9, height: 1.8 }],
    props: [{ type: 'ring', r: .22, tube: .02, pos: [0, 1.3, 0], color: '#7dff9a' }],
    camera: { pos: [1.6, 1.6, 2.3], target: [0, 1.35, 0], to: { pos: [1.1, 1.5, 1.6] }, fov: 38 }, ui: [{ type: 'viewfinder' }] },
  // 20,000 km
  { t: at(16), set: SKY, actors: [0, 1, 2, 3, 4].map(i => stork('b' + i, { pos: [-5 + i * .6, 2.2 + (i % 2) * .5, -2 - i], to: [3 + i * .6, 2.6 + (i % 2) * .5, -1 - i], faceMove: true, clipOffset: i * .37 })),
    camera: { pos: [0, .8, 3.2], target: [0, 2.5, -2], fov: 50 } },
  { t: S[16].start + 2.1, set: SKY, actors: [stork('b', { pos: [-1, 2.3, 0], to: [1, 2.4, -.5], faceMove: true })],
    camera: { pos: [0, 1.9, 2.6], target: 'b', fov: 42 }, ui: [{ type: 'counter', text: '20,000 كم', at: [.5, .2], size: .13, color: '#ffd31a' }, { type: 'meter', at: [.16, .45], from: 0, to: 1, dur: 1.6, text: 'كل سنة' }] },
  // museum
  { t: at(17), set: MUSEUM, actors: [stork('b', { pos: [0, 1.5, 0], speed: 0, clipOffset: .25, rotY: .5 })], props: [{ type: 'pedestal', pos: [0, 0, 0], r: .45, h: 1 }, spear('b')],
    flash: true, camera: { pos: [1.6, 1.5, 2.6], target: [0, 1.35, 0], to: { pos: [1.1, 1.5, 1.8] }, fov: 40 } },
  { t: at(18), set: MUSEUM, actors: [stork('b', { pos: [0, 1.5, 0], speed: 0, clipOffset: .25, rotY: .5 })], props: [{ type: 'pedestal', pos: [0, 0, 0], r: .45, h: 1 }, spear('b')],
    camera: { pos: [-1.9, 1.6, 1.8], target: [0, 1.35, 0], orbit: -.9, fov: 40 }, ui: [{ type: 'label', text: 'متحف', world: [0, .55, .5], size: .07, start: .3 }] },
  { t: at(19), set: MUSEUM, actors: [stork('b', { pos: [0, 1.5, 0], speed: 0, clipOffset: .25, rotY: .5 })], props: [{ type: 'pedestal', pos: [0, 0, 0], r: .45, h: 1 }, spear('b', { holo: '#ff3b30' })],
    camera: { pos: [1.1, 1.6, 1.4], target: [.05, 1.55, .2], to: { pos: [.75, 1.58, 1.0] }, fov: 36, dof: { aperture: .03, maxblur: .015 } } },
  // CTA
  { t: at(20), set: TEAL, actors: [stork('b', { pos: [-.6, 1.9, -1], to: [.4, 1.7, .6], faceMove: true })], props: [spear('b')],
    camera: { pos: [0, 1.6, 3.2], target: [0, 1.6, 0], fov: 42 },
    ui: [{ type: 'button', text: 'تابعني +', at: [.5, .3], start: .4, tap: 1.4 }, { type: 'arrow', at: [.5, .2], start: .5 }] },
];
const plan = {
  engine: 'cine', duration: D, language: 'ar', prompt: 'طائر الرمح', captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))), style: {},
  learned: JSON.parse(fs.readFileSync(new URL('../memory/style.json', import.meta.url))).cine || {},
  shots: shots.map((s, i) => { const { t, ...rest } = s; return { start: t, end: i + 1 < shots.length ? shots[i + 1].t : D, transition: 'whip', whipDir: i % 2 ? -1 : 1, ...rest }; }),
};
fs.writeFileSync(out, JSON.stringify(plan, null, 1));
console.log(`${plan.shots.length} shots, avg ${(D / plan.shots.length).toFixed(2)}s`);
