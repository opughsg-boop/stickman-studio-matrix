// Web studio: upload a voice-over (+ prompt / script) -> get a finished video + self-review report.
// node server.mjs   (PORT env, default 8787)
import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { runJob } from './run.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
process.chdir(ROOT);
const app = express();
const upload = multer({ dest: path.join(ROOT, 'uploads') });
const RUNS = path.join(ROOT, 'runs');
fs.mkdirSync(RUNS, { recursive: true });
const queue = []; let busy = false;

async function pump() {
  if (busy || !queue.length) return; busy = true;
  const job = queue.shift();
  try { await runJob(job, () => {}); }
  catch (e) { fs.writeFileSync(path.join(job.out, 'status.json'), JSON.stringify({ step: 'error', error: String(e.message || e), progress: 0 })); }
  busy = false; pump();
}

app.use(express.static(path.join(ROOT, 'web')));
app.use('/runs', express.static(RUNS));
app.use(express.json());

app.post('/api/jobs', upload.fields([{ name: 'audio' }, { name: 'script' }]), (req, res) => {
  const a = req.files?.audio?.[0]; if (!a) return res.status(400).json({ error: 'audio required' });
  const id = new Date().toISOString().replace(/[:.]/g, '-'); const out = path.join(RUNS, id); fs.mkdirSync(out, { recursive: true });
  const audio = path.join(out, 'voice' + (path.extname(a.originalname) || '.mp3')); fs.renameSync(a.path, audio);
  let script; if (req.body.scriptText?.trim()) { script = path.join(out, 'script.txt'); fs.writeFileSync(script, req.body.scriptText); }
  fs.writeFileSync(path.join(out, 'meta.json'), JSON.stringify({ prompt: req.body.prompt || '', lang: req.body.lang || 'auto', created: Date.now() }));
  fs.writeFileSync(path.join(out, 'status.json'), JSON.stringify({ step: 'queued', progress: 0 }));
  queue.push({ audio, out, prompt: req.body.prompt, lang: req.body.lang || 'auto', script, previewOnly: req.body.previewOnly === '1', planner: req.body.planner || 'auto' });
  pump(); res.json({ id });
});

app.get('/api/jobs', (req, res) => {
  const list = fs.readdirSync(RUNS).filter(d => fs.existsSync(path.join(RUNS, d, 'status.json'))).sort().reverse().map(id => {
    const r = f => { try { return JSON.parse(fs.readFileSync(path.join(RUNS, id, f), 'utf8')); } catch { return null; } };
    const rep = r('report.json');
    return { id, status: r('status.json'), meta: r('meta.json'), score: rep?.score, issues: rep?.issues?.length,
      hasVideo: fs.existsSync(path.join(RUNS, id, 'final.mp4')), hasPreview: fs.existsSync(path.join(RUNS, id, 'sheet_preview.jpg')) };
  });
  res.json(list);
});
app.get('/api/jobs/:id/report', (req, res) => res.sendFile(path.join(RUNS, path.basename(req.params.id), 'report.json')));
app.get('/api/memory', (req, res) => {
  const r = f => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'memory', f), 'utf8')); } catch { return null; } };
  const hist = fs.existsSync('memory/history.jsonl') ? fs.readFileSync('memory/history.jsonl', 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse) : [];
  res.json({ lessons: r('lessons.json'), style: r('style.json'), learned: Object.keys(r('learned_assets.json') || {}), history: hist });
});

const port = +process.env.PORT || 8787;
app.listen(port, () => console.log(`Diorama Studio on http://localhost:${port}`));
