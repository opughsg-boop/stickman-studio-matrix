// Storyboard (short JSON) + aligned transcript -> full cine plan.
// node plans/story.mjs TRANSCRIPT.json STORY.json OUT_plan.json
// STORY: { "hero": {...}, "lines": [ {"shot":"sky"}, {"shot":"close","counter":"١ متر"}, {"split":[{"shot":"walk","counter":"1822"},{"shot":"found","pin":"ألمانيا"}]} ] }
// One entry per script line (same order). "split" = several shots inside one line (time split evenly or by "at" seconds).
import fs from 'fs';
import { T } from './lib.mjs';
import { buildCaptions } from '../pipeline/plan.mjs';
const [trf, storyf, out] = process.argv.slice(2);
const tr = JSON.parse(fs.readFileSync(trf, 'utf8')), story = JSON.parse(fs.readFileSync(storyf, 'utf8'));
const S = tr.segments, D = tr.duration, H = story.hero || {};
if (story.lines.length !== S.length) throw new Error(`storyboard has ${story.lines.length} lines but the script has ${S.length}`);
const shots = [];
S.forEach((seg, i) => {
  const t0 = i === 0 ? 0 : seg.start, t1 = i + 1 < S.length ? S[i + 1].start : D, e = story.lines[i];
  const parts = e.split || [e];
  parts.forEach((p, k) => {
    if (!T[p.shot]) throw new Error(`line ${i + 1}: unknown shot "${p.shot}". Known: ${Object.keys(T).join(', ')}`);
    const st = p.at != null ? t0 + p.at : t0 + (t1 - t0) * k / parts.length;
    shots.push({ t: st, ...T[p.shot](H, p) });
  });
});
let learned = {}; try { learned = JSON.parse(fs.readFileSync(new URL('../memory/style.json', import.meta.url))).cine || {}; } catch {}
const plan = {
  engine: 'cine', duration: D, language: tr.language, prompt: story.title || '', learned, style: {},
  captions: S.flatMap((seg, si) => buildCaptions({ segments: [seg] }, story.captionWords || 2).map(c => ({ ...c, end: Math.min(c.end + .25, si + 1 < S.length ? S[si + 1].start : D) }))),
  shots: shots.map((s, i) => { const { t, ...rest } = s; return { start: t, end: i + 1 < shots.length ? shots[i + 1].t : D, transition: 'whip', whipDir: i % 2 ? -1 : 1, ...rest }; }),
};
fs.writeFileSync(out, JSON.stringify(plan, null, 1));
console.log(`${plan.shots.length} shots, avg ${(D / plan.shots.length).toFixed(2)}s, ${plan.captions.length} captions`);
