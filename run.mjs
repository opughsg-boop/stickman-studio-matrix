// One-shot pipeline: audio (+prompt, +script) -> transcript -> plan -> preview -> render -> self-review
// node run.mjs --audio voice.wav --script script.txt --story stories/NAME.json [--out runs/NAME] [--lang ar] [--preview-only] [--gpu]
//   (older: --plan plans/x.mjs, or no story/plan -> rule planner; --no-sfx; --fps 30)
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { makePlan } from './pipeline/plan.mjs';
import { render } from './pipeline/render.mjs';

export async function runJob(o, log = console.log) {
  const out = o.out || path.join('runs', new Date().toISOString().replace(/[:.]/g, '-'));
  fs.mkdirSync(out, { recursive: true });
  const step = (s, p) => { log({ step: s, progress: p }); fs.writeFileSync(path.join(out, 'status.json'), JSON.stringify({ step: s, progress: p, time: Date.now() })); };
  const tr = path.join(out, 'transcript.json');
  const asr = path.join(out, 'asr.json');
  if (!fs.existsSync(tr)) { step('transcribe', 0);
    if (!fs.existsSync(asr)) execFileSync('python3', ['pipeline/transcribe.py', o.audio, asr, '--lang', o.lang || 'auto'], { stdio: 'inherit' });
    if (o.script) execFileSync('python3', ['pipeline/align.py', asr, o.script, tr], { stdio: 'inherit' });  // exact script words, ASR timing
    else fs.copyFileSync(asr, tr); }
  step('plan', .1);
  let plan;
  if (o.story) { execFileSync('node', ['plans/story.mjs', tr, o.story, path.join(out, 'plan.json')], { stdio: 'inherit' }); plan = JSON.parse(fs.readFileSync(path.join(out, 'plan.json'), 'utf8')); }
  else if (o.plan) { execFileSync('node', [o.plan, tr, path.join(out, 'plan.json')], { stdio: 'inherit' }); plan = JSON.parse(fs.readFileSync(path.join(out, 'plan.json'), 'utf8')); }
  else { plan = await makePlan(JSON.parse(fs.readFileSync(tr, 'utf8')), { prompt: o.prompt || '', mode: o.planner || 'auto' });
    fs.writeFileSync(path.join(out, 'plan.json'), JSON.stringify(plan, null, 1)); }
  step('preview', .15);
  await render(path.join(out, 'plan.json'), o.audio, out, { preview: true, gpu: o.gpu });
  if (o.previewOnly) { step('preview-ready', 1); return { out }; }
  step('sfx', .18);
  const mix = path.join(out, 'mix.wav');
  if (!o.noSfx) execFileSync('python3', ['pipeline/sfx.py', path.join(out, 'plan.json'), o.audio, mix], { stdio: 'inherit' });
  step('render', .2);
  await render(path.join(out, 'plan.json'), o.noSfx ? o.audio : mix, out, { fps: +o.fps || 30, gpu: o.gpu, ...(o.workers ? { workers: +o.workers } : {}), onProgress: p => step('render', .2 + p * .7) });
  step('review', .92);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', path.join(out, 'final.mp4'), '-vf', `fps=${((plan.beats || plan.shots).length / plan.duration).toFixed(4)},scale=180:-1,tile=6x${Math.ceil((plan.beats || plan.shots).length / 6)}`, '-frames:v', '1', path.join(out, 'sheet_final.jpg')]);
  execFileSync('python3', ['pipeline/critic.py', out], { stdio: 'inherit' });
  step('done', 1);
  return { out, video: path.join(out, 'final.mp4'), report: JSON.parse(fs.readFileSync(path.join(out, 'report.json'), 'utf8')) };
}

if (process.argv[1].endsWith('run.mjs')) {
  const a = process.argv.slice(2), o = {};
  for (let i = 0; i < a.length; i++) if (a[i].startsWith('--')) { const k = a[i].slice(2).replace(/-(\w)/g, (_, c) => c.toUpperCase()); o[k] = a[i + 1] && !a[i + 1].startsWith('--') ? a[++i] : true; }
  if (!o.audio) { console.error('usage: node run.mjs --audio FILE [--prompt TEXT] [--script FILE] [--out DIR]'); process.exit(1); }
  const r = await runJob(o, s => console.log('[job]', s.step, Math.round(s.progress * 100) + '%'));
  console.log(r.video || r.out);
}
