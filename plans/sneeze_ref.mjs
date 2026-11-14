// Sneeze explainer in the "glossy toy" reference look (cine engine + renderer/cine_ref.js):
// glossy clear-coated objects at real sizes on a warm wood floor under a purple-orange sunset sky,
// micro scenes on a flat deep red, rounded bold captions near the top with cyan underlined key words,
// orange counter badges, soft cross-dissolves and a slow continuous push/orbit in every shot.
// node plans/sneeze_ref.mjs TRANSCRIPT.json OUT_plan.json [UNTIL_SECONDS]   (UNTIL = sample length)
import fs from 'fs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, out, untilArg] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), S = tr.segments, D = untilArg ? +untilArg : tr.duration;
const at = (i, k = 0) => S[i].words[k].start;

// sets: real-scale tabletop (metres) for everyday objects and organs, red micro set for cells (1 unit = 100 um)
const SUNSET = { type: 'sunset', key: 2.2, keyColor: '#ffe2c4', keyPos: [2, 5, 4], fill: .5, skyFill: '#ffd6e6', groundFill: '#7a3b1c',
  rim: .9, rimColor: '#ff9ad0', envIntensity: .6, shadowSize: .5, fogNear: 2.5, fogFar: 14 };
const RED = { type: 'flat', color: '#8a0f1f', key: 2.4, keyPos: [2, 6, 4], fill: .65, skyFill: '#ffd0d8', groundFill: '#4a0610', rim: 1.1, rimColor: '#ff8fa8', envIntensity: .9, shadowSize: 3, fogNear: 2.6, fogFar: 8 };
const CYAN = '#4fd6ff';
// realism pass (lines 5-10): one warm sun key + soft purple sky fill, low pink rim, detailed wood, grain; organs/skin/fabric use realMat
const REAL = { ...SUNSET, real: true, key: 2.5, keyColor: '#ffd2a1', keyPos: [3, 4, 5], fill: .55, skyFill: '#e6c2d6', rim: .3, rimColor: '#ffb38a', envIntensity: .45 };
const RFX = { bloom: .12, grain: .06 };

const shots = [
  // 1 hook: a tissue box on a warm wooden table at sunset, dust motes in the light; slow push toward the tissue
  { t: 0, set: SUNSET, props: [
      { id: 'box', type: 'tissuebox', pos: [0, 0, 0], rotY: .5 },
      { id: 'motes', type: 'particles', count: 70, area: [.6, .35, .5], pos: [-.3, .02, -.25], size: .0011, color: '#fff1c9', glow: 1.2, drift: .5, shadow: false }],
    camera: { pos: [.62, .26, .88], target: [0, .1, 0], to: { pos: [.44, .2, .64], target: [0, .11, 0] }, fov: 34, handheld: .25, dof: { aperture: .02, maxblur: .012 } }, fx: { bloom: .25 } },
  // 2 pollen and dust land on the wet nose lining (cilia beating) - microscope scale on deep red
  { t: at(1), set: RED, props: [
      { id: 'lining', type: 'lining', pos: [0, 0, 0] },
      { id: 'p1', type: 'pollen', r: .15, pos: [-.4, 1.9, .5], to: [-.15, .23, .45], moveDur: 1.9, ease: 'out', spin: .8, spinStop: 1.9 },
      { id: 'p2', type: 'pollen', r: .12, pos: [.8, 2.2, -.5], to: [.55, .27, -.4], moveAt: .3, moveDur: 2.1, ease: 'out', spin: -.7, spinStop: 2.4, color: '#f7c536' },
      { id: 'd1', type: 'dust', r: .07, pos: [.2, 2.4, .9], to: [.15, .12, .8], moveAt: .5, moveDur: 2, ease: 'out', spin: 1, spinStop: 2.5 },
      { id: 'd2', type: 'dust', r: .05, seed: 9, pos: [-1, 2, -.6], to: [-.9, 0, -.7], moveAt: .2, moveDur: 2.2, ease: 'out', spin: -1, spinStop: 2.4 }],
    camera: { pos: [.2, 1.9, 2.1], target: [0, .5, 0], to: { pos: [.05, 1.35, 1.35], target: [0, .1, .2] }, fov: 38, handheld: .25, dof: { aperture: .01, maxblur: .01 } },
    fx: { vignette: .55, bloom: .2 }, ui: [{ type: 'badge', text: '0.03 mm', at: [.72, .33], start: at(1, 2) - at(1) }] },
  // 3 nerve signal races from the nose up into the brain, the brain fires ("blast it out!")
  { t: at(2), set: SUNSET, props: [
      { id: 'brain', type: 'brain', pos: [0, .3, 0], flashAt: at(2, 7) - at(2), bob: .004 },
      { id: 'n1', type: 'arc', from: [.025, .13, .12], to: [.012, .262, .045], lift: .05, r: .0022, color: CYAN, delay: at(2, 1) - at(2) - .1, dur: 1.1, shadow: false },
      { id: 'n2', type: 'arc', from: [-.025, .13, .12], to: [-.012, .262, .045], lift: .05, r: .0022, color: CYAN, delay: at(2, 1) - at(2) + .05, dur: 1.1, shadow: false },
      { id: 's1', type: 'sphere', r: .006, pos: [.025, .13, .12], color: CYAN, glow: 1.6 }, { id: 's2', type: 'sphere', r: .006, pos: [-.025, .13, .12], color: CYAN, glow: 1.6 }],
    camera: { pos: [.5, .4, .45], target: [0, .28, 0], orbit: .55, to: { pos: [.36, .35, .32] }, fov: 34, handheld: .25, dof: { aperture: .015, maxblur: .01 } }, fx: { bloom: .35 } },
  // 4 deep inhale (lungs swell, O2 streams in), then the throat snaps shut; camera rises to the throat
  { t: at(3), set: SUNSET, props: [
      { id: 'lungs', type: 'lungs', pos: [0, .3, 0], inhale: [at(3, 1) - at(3), at(3, 3) - at(3)], shutAt: at(3, 6) - at(3), bob: .003 }],
    camera: { pos: [.3, .42, 1.05], target: [0, .31, 0], to: { pos: [.12, .66, .42], target: [0, .48, 0] }, fov: 34, handheld: .25, dof: { aperture: .012, maxblur: .01 } }, fx: { bloom: .25 } },
  // 5 chest muscles squeeze the full lungs (rib cage clamps in on "squeeze", harder on "hard"); camera eases back down to the chest
  { t: at(4), set: REAL, props: [
      { id: 'lungs', type: 'lungs', pos: [0, .3, 0], inhale: [-2, -1], shutAt: -5, noAir: true, real: true, squeeze: [at(4, 4) - at(4), at(4, 5) - at(4)], bob: .002 },
      { id: 'ribs', type: 'ribs', pos: [0, .3, 0], real: true, squeeze: [at(4, 4) - at(4), at(4, 5) - at(4)], bob: .002 }],
    camera: { pos: [.1, .5, .62], target: [0, .36, 0], to: { pos: [.34, .36, .7], target: [0, .3, 0] }, fov: 34, handheld: .3, dof: { aperture: .012, maxblur: .01 } }, fx: RFX },
  // 6 the wild part: a glossy toy person leans back (ah... ah...), then the air rockets out of the nose; 100 MPH badge on "100"
  { t: at(5), set: REAL, props: [
      { id: 'kid', type: 'person', pos: [0, 0, 0], rotY: Math.PI / 2, tilt: [.25, at(5, 6) - at(5)], halfLids: [.6, 1.6], sneezeAt: at(5, 7) - at(5) },
      { id: 'air', type: 'burst', from: [.15, .615, 0], dir: [1, -.25, 0], len: .6, at: at(5, 7) - at(5) + .02, dur: at(5, 15) - at(5, 7) + .3, travel: .6, count: 300, streaks: 220, dust: 40, shadow: false }],
    camera: { pos: [1.2, .76, 1.0], target: [.12, .52, 0], to: { pos: [1.32, .72, 1.12], target: [.16, .5, 0] }, fov: 36, handheld: .3, dof: { aperture: .01, maxblur: .008 } },
    fx: RFX, ui: [{ type: 'badge', text: '100 MPH', at: [.7, .34], start: at(5, 12) - at(5) }] },
  // 7 droplets arc out and land on the floor up to ~6 ft (1.8 m) away; camera rises and pulls back to show the distance
  { t: at(6), set: { ...REAL, shadowSize: 2.4, fogNear: 4, fogFar: 16 }, props: [
      { id: 'kid', type: 'person', pos: [0, 0, 0], rotY: Math.PI / 2, sneezeAt: .12 },
      { id: 'drops', type: 'spray', from: [.15, .615, 0], dir: [1, 0, 0], near: .35, far: 1.85, count: 80, at: .14, emit: .5, spread: .6, rMin: .004, rMax: .011 }],
    camera: { pos: [-.42, 1.0, .72], target: [.55, .38, 0], to: { pos: [-.62, 1.35, .98], target: [1.0, .1, 0] }, fov: 36, handheld: .25, dof: { aperture: .006, maxblur: .006 } },
    fx: RFX },
  // 8 the eyes slam shut on "slam" and the head jolts forward - the reflex cannot be stopped; slow push into the face
  { t: at(7), set: REAL, props: [
      { id: 'kid', type: 'person', pos: [0, 0, 0], closeAt: at(7, 2) - at(7), sneezeAt: at(7, 2) - at(7) + .14, snapAmp: .2, reopen: 99 }],
    camera: { pos: [.1, .7, .6], target: [0, .67, .07], to: { pos: [.06, .69, .5], target: [0, .668, .08] }, fov: 34, handheld: .35, dof: { aperture: .008, maxblur: .008 } }, fx: RFX },
  // 9 tip: the right arm comes up and the sneeze goes into the elbow (check), an open hand pops up beside (cross)
  { t: at(8), set: REAL, props: [
      { id: 'kid', type: 'person', pos: [0, 0, 0], rotY: .45, raise: [.4, at(8, 4) - at(8) - .1], sneezeAt: at(8, 4) - at(8) + .25, snapAmp: .14 },
      { id: 'hand', type: 'hand', pos: [-.1, .74, .2], rotY: .5, popAt: at(8, 5) - at(8) }],
    camera: { pos: [.8, .8, 1.15], target: [0, .6, .05], orbit: -.15, to: { pos: [.66, .74, 1.0] }, fov: 44, handheld: .25, dof: { aperture: .008, maxblur: .008 } },
    fx: RFX, ui: [{ type: 'label', text: '✓', world: [.27, .72, .2], size: .14, color: '#2fd25a', start: at(8, 4) - at(8) },
      { type: 'label', text: '✗', world: [-.1, .87, .2], size: .14, color: '#ff3347', start: at(8, 7) - at(8) }] },
  // 10 closing card: the glossy brain breathes softly, a heart (like) and a plus (follow) pop in, the brain glows on "thank you"
  { t: at(9), set: REAL, props: [
      { id: 'brain', type: 'brain', pos: [0, .075, 0], real: true, pulse: .012, flashAt: at(9, 11) - at(9), bob: .004 },
      { id: 'heart', type: 'heart', pos: [-.055, .25, .02], size: .08, popAt: at(9, 5) - at(9), bob: .006 },
      { id: 'plus', type: 'plus', pos: [.06, .25, .02], size: .06, popAt: at(9, 7) - at(9), bob: .006, bobPh: 1.5 },
      { id: 'motes', type: 'particles', count: 50, area: [.5, .3, .4], pos: [-.25, .05, -.2], size: .0011, color: '#fff1c9', glow: 1.2, drift: .5, shadow: false }],
    camera: { pos: [.12, .3, .92], target: [0, .17, 0], orbit: .15, to: { pos: [.08, .27, .8] }, fov: 34, handheld: .2, dof: { aperture: .012, maxblur: .01 } }, fx: RFX },
].filter(s => s.t < D);

const HL = { inside: CYAN, nose: CYAN, brain: CYAN, throat: CYAN, pollen: '#ffd84d', chest: CYAN, air: CYAN, droplets: CYAN, eyes: CYAN, 'elbow,': CYAN };
const caps = S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) })))
  .filter(c => c.start < D).map(c => { const hl = {}; c.text.split(' ').forEach(w => { const k = w.toLowerCase(); if (HL[k]) hl[k] = HL[k]; }); return Object.keys(hl).length ? { ...c, hl } : c; });
const plan = {
  engine: 'cine', duration: D, language: tr.language || 'en', prompt: 'What happens inside you when you sneeze (reference look)', learned: {},
  style: { captionFont: 'CapRound', captionY: .2, captionSize: .04, exposure: .9, allowText: true, handheld: .25, grade: { sat: 1.15, bright: 1, contrast: 1.07 } },
  captions: caps,
  shots: shots.map((s, i) => { const { t, ...rest } = s; return { start: t, end: i + 1 < shots.length ? shots[i + 1].t : D, transition: 'dissolve', dissolve: .45, ...rest }; }),
};
fs.writeFileSync(out, JSON.stringify(plan, null, 1));
console.log(`${plan.shots.length} shots, ${plan.captions.length} captions, ${D.toFixed(2)}s`);
