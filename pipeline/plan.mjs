// transcript.json (+ prompt + memory) -> plan.json
// Uses Claude when credentials exist (most flexible: invents new assets from primitives),
// otherwise a multilingual rule-based planner. Both honour memory/style.json + lessons.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MEM = path.join(ROOT, 'memory');
const readJ = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };

export function loadMemory() {
  return {
    style: readJ(path.join(MEM, 'style.json'), {}),
    lessons: readJ(path.join(MEM, 'lessons.json'), []),
    learned: readJ(path.join(MEM, 'learned_assets.json'), {}),
  };
}

// ---------- captions ----------
export function buildCaptions(tr, maxWords = 1, maxGap = 0.35) {
  const words = tr.segments.flatMap(s => s.words);
  const caps = [];
  for (let i = 0; i < words.length; i += maxWords) {
    const g = words.slice(i, i + maxWords);
    const text = g.map(w => w.w).join(' ').replace(/[.,;:!?¿¡"“”«»،؛]/g, '').trim();
    if (!text) continue;
    caps.push({ text, start: g[0].start, end: g[g.length - 1].end });
  }
  for (let i = caps.length - 2; i >= 0; i--) { // merge words too short to read into the next caption
    if (caps[i].end - caps[i].start < 0.15 && caps[i + 1].start - caps[i].end < 0.3 && caps[i + 1].text.split(' ').length < 3) {
      caps[i + 1] = { text: caps[i].text + ' ' + caps[i + 1].text, start: caps[i].start, end: caps[i + 1].end }; caps.splice(i, 1); }
  }
  for (let i = 0; i < caps.length - 1; i++) { // hold caption until next word if gap small (no flicker)
    if (caps[i + 1].start - caps[i].end < maxGap) caps[i].end = caps[i + 1].start;
  }
  return caps;
}

// ---------- beats from segments ----------
function beatsFromSegments(tr, minLen, maxLen) {
  const segs = tr.segments.filter(s => s.text);
  const beats = [];
  for (const s of segs) {
    const last = beats[beats.length - 1];
    if (last && (s.end - last.start) < minLen) { last.end = s.end; last.text += ' ' + s.text; continue; }
    if (s.end - s.start > maxLen && s.words.length > 6) { // split long sentence at a word near the middle
      const mid = s.words[Math.floor(s.words.length / 2)];
      beats.push({ start: s.start, end: mid.start, text: s.words.filter(w => w.start < mid.start).map(w => w.w).join(' ') });
      beats.push({ start: mid.start, end: s.end, text: s.words.filter(w => w.start >= mid.start).map(w => w.w).join(' ') });
    } else beats.push({ start: s.start, end: s.end, text: s.text });
  }
  // make beats contiguous over the whole audio
  beats.forEach((b, i) => { b.start = i === 0 ? 0 : beats[i - 1].end; });
  if (beats.length) beats[beats.length - 1].end = tr.duration;
  return beats;
}

// ---------- rule-based concept detection ----------
const RX = (s) => new RegExp(s, 'i');
const KIND = {
  problem: RX('\\b(pero|but|however|problem|problema|sin embargo)\\b|(^|\\s)(بس|لكن|المشكلة|مشكلة)'),
  solution: RX('\\b(entonces|so|then|solution|soluci[oó]n|therefore|that\'s why)\\b|(^|\\s)(فـ|عشان كده|لذلك|الحل|فالحل|يبقى)'),
  tip: RX('\\b(ojo|tip|important|remember|cuidado)\\b|(نصيحة|انتبه|خلي بالك|مهم)'),
  question: RX('(pregunta|question|السؤال|سؤال)'),
};
const C = [
  ['flock', 'gallin|pollo|chicken|\\bhens?\\b|دجاج|فراخ|فرخة|الفراخ'],
  ['crops', 'sembrad|cultiv|huert|\\bcrops?\\b|garden|vegetable|زرع|خضار|محصول'],
  ['frame', 'poste|\\bposts?\\b|pillar|column|عمود|اعمدة|أعمدة|خشب'],
  ['roof', 'techo|l[aá]mina|\\broof|سقف|سطح|صاج'],
  ['mesh_wall', 'malla|\\bmesh|fence|wire|سلك|شبك|سياج'],
  ['heat', 'calor|cuec|\\bsol\\b|\\bhot\\b|heat|\\bsun\\b|jade|حر|شمس|سخون'],
  ['paint_white', 'blanc|white|أبيض|ابيض'],
  ['night', 'noche|night|ليل|بالليل'],
  ['perch', 'percha|perch|roost|مجثم|عارضة|مسند'],
  ['nest_box', 'nido|nidal|caj[oó]n|\\bnest|بيض|عش|صندوق'],
  ['board', 'tabla|\\bboard|لوح'],
  ['droppings', 'caca|ensuci|poop|dropping|زرق|وسخ|فضلات'],
  ['feeder', 'comedero|feeder|\\bfood|\\bfeed\\b|علف|معلف|أكل|اكل'],
  ['waterer', 'bebedero|\\bwater(er)?\\b|agua|مياه|ماء|مشرب'],
  ['person', 'hombre|persona|\\buno anda|farmer|\\bman\\b|راجل|شخص|فلاح|المزارع'],
  ['tree', '[aá]rbol|\\btrees?\\b|شجر'],
  ['house', '\\bcasa|\\bhouse|\\bhome\\b|بيت|منزل'],
  ['animal', 'vaca|\\bcows?\\b|oveja|sheep|cabra|goat|بقر|خروف|ماعز|غنم'],
  ['measure', '(\\d+)\\s*(cm|cent[ií]metros?|metros?|meters?|m\\b|سم|سنتي|متر)|medio metro|half a meter|نص متر'],
];
const CONCEPTS = C.map(([k, r]) => [k, RX(r)]);

function ruleBeats(beats) {
  const F = { w: 7, d: 6, h: 3.2 };
  const present = new Set();
  let lastPreset = '';
  const out = [];
  const pickCam = (want) => { const alt = { hero: 'orbit', close: 'low', wide: 'hero', detail: 'close', inside: 'detail', low: 'close', orbit: 'hero' };
    const p = want === lastPreset ? alt[want] || 'hero' : want; lastPreset = p; return p; };
  beats.forEach((b, i) => {
    const t = b.text; const hits = CONCEPTS.filter(([, r]) => r.test(t)).map(([k]) => k);
    const kind = i === 0 ? 'intro' : KIND.tip.test(t) ? 'tip' : KIND.problem.test(t) ? 'problem' : KIND.solution.test(t) ? 'solution' : 'info';
    const beat = { ...b, kind, add: [], remove: [], modes: {}, effects: [] };
    const add = (id, type, pos, params = {}, anim = 'drop', delay = 0) => { if (present.has(id)) return; present.add(id); beat.add.push({ id, type, pos, params, anim, delay }); };
    const coop = present.has('frame');
    // always establish the subject in intro
    if (i === 0 && !hits.includes('flock') && !hits.length) hits.push('crops');
    let d = 0; const next = () => (d += .35) - .35;
    for (const h of hits) {
      switch (h) {
        case 'flock': add('flock', 'flock', [coop ? 0 : -1.5, 0, coop ? 0 : -1], { count: 10, area: coop ? [5, 4] : [7, 6] }, 'grow', next()); beat.modes.flock = coop ? 'wander' : 'scratch'; break;
        case 'crops': add('crops', 'crops', [0, 0, -4.6], { rows: 2, per: 12, spacing: .75 }, 'grow', next()); break;
        case 'frame': add('frame', 'frame', [0, 0, 0], F, 'drop', next()); break;
        case 'roof': if (!present.has('frame')) add('frame', 'frame', [0, 0, 0], F, 'drop', next());
          if (hits.includes('paint_white') && present.has('roof')) { beat.remove.push('roof'); present.delete('roof'); add('roof2', 'roof', [0, 0, 0], { ...F, color: '#f4f4f0', h: 3.6 }, 'drop', next()); }
          else add('roof', 'roof', [0, 0, 0], F, 'drop', next()); break;
        case 'mesh_wall': if (!present.has('frame')) add('frame', 'frame', [0, 0, 0], F, 'drop', next()); add('mesh', 'mesh_wall', [0, 0, 0], F, 'grow', next());
          if (present.has('flock')) beat.modes.flock = 'wander'; break;
        case 'paint_white': if (present.has('roof') && !hits.includes('roof')) { beat.remove.push('roof'); present.delete('roof'); add('roof2', 'roof', [0, 0, 0], { ...F, color: '#f4f4f0', h: 3.6 }, 'drop', next()); } break;
        case 'heat': beat.effects.push('heat'); add('heat' + i, 'heat', [0, 0, 0], { w: F.w, h: F.h, d: F.d }, 'fade'); if (present.has('flock')) beat.modes.flock = 'pant'; break;
        case 'night': beat.effects.push('night'); if (present.has('flock') && !hits.includes('perch')) beat.modes.flock = present.has('perch') ? { mode: 'perch', at: [-.5, 1.2, -1], len: 4 } : 'sleep'; break;
        case 'perch': add('perch', 'perch', [-.5, 0, -1], { len: 4, h: 1.2, rows: 2 }, 'rise', next()); if (present.has('flock')) beat.modes.flock = { mode: 'perch', at: [-.5, 1.2, -1], len: 4 }; break;
        case 'nest_box': add('nest', 'nest_box', [2.6, 0, -2.4], { count: 2, y: .9 }, 'drop', next()); break;
        case 'board': add('board', 'board', [-.5, 0, -1], { len: 4.2, d: 1.6, y: .35 }, 'drop', next()); break;
        case 'droppings': add('poop' + i, 'droppings', [-.5, 0, -1], { w: 3.8, d: 1.4, count: 40, y: present.has('board') ? .4 : 0 }, 'grow', next()); break;
        case 'feeder': add('feeder', 'feeder', [1.8, 0, 1.2], {}, 'drop', next()); break;
        case 'waterer': add('waterer', 'waterer', [2.6, 0, .6], {}, 'drop', next()); break;
        case 'person': add('person', 'person', [-4.5, 0, 3.5], {}, 'grow', next()); break;
        case 'tree': add('tree' + i, 'tree', [-4.6, 0, -4.4], {}, 'grow', next()); break;
        case 'house': add('house', 'house', [4, 0, -4], {}, 'drop', next()); break;
        case 'animal': add('animal' + i, 'animal', [-3.5, 0, 3], {}, 'grow', next()); break;
        case 'measure': { const m = t.match(CONCEPTS.find(c => c[0] === 'measure')[1]); const label = m ? m[0] : '';
          const y0 = 0, y1 = present.has('perch') ? 1.2 : F.h;
          add('measure' + i, 'arrow', [0, 0, 0], { from: [1.6, y0 + .05, .8], to: [1.6, y1, .8], double: true, label }, 'grow', .8); break; }
      }
    }
    // remove transient things from previous beat
    const prev = out[out.length - 1];
    if (prev) for (const a of prev.add) if (/^(heat|measure)/.test(a.id)) beat.remove.push(a.id);
    // camera choice per kind
    const tgt = present.has('perch') && beat.modes.flock?.mode === 'perch' ? [-.5, 1.2, -1] : [0, coop ? 1.2 : .6, 0];
    const want = kind === 'intro' ? 'wide' : kind === 'problem' ? (hits.includes('heat') ? 'hero' : 'close') : kind === 'tip' ? 'detail' : kind === 'solution' ? 'hero' : 'orbit';
    beat.camera = { preset: pickCam(want), target: tgt };
    if (i === beats.length - 1) beat.camera = { preset: 'low', target: [tgt[0], .8, tgt[2]], push: .2 };
    out.push(beat);
  });
  return out;
}

// ---------- Claude planner ----------
const CATALOG = `flock{count,area:[w,d]} (modes: wander|scratch|pant|sleep or {mode:'perch',at:[x,y,z],len}) chicken{} post{h} beam{len,axis} frame{w,d,h}
roof{w,d,h,color,slope} mesh_wall{w,d,h} wall{len,h,color} perch{len,h,rows} board{len,d,y} feeder{} waterer{} nest_box{count,y}
crops{rows,per,spacing,color} tree{scale,color} rock{r} water{r} house{w,d,h,color} person{color} animal{color,scale} crate{s}
barrel{color} sign{text,color,scale,y} arrow{from:[x,y,z],to:[x,y,z],double,label} heat{w,h,d} droppings{w,d,count,y}
custom{parts:[{shape:box|sphere|cylinder|cone,size:[x,y,z],pos:[x,y,z],rot:[x,y,z],color,metal,rough}]}`;

async function claudePlan(beats, tr, prompt, mem) {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic();
  const system = `You direct short vertical 3D explainer videos in the "blueprint diorama" style: a floating soil island (12x12 units, top at y=0, x/z in [-6,6]) inside a blue blueprint grid room. Each narration beat ADDS components that assemble into a cumulative build (problem -> fix -> new problem -> fix). Return ONLY JSON.
Asset catalog (type{params}): ${CATALOG}
If a needed object is not in the catalog, define it with type "custom" and parts, and also give it a reusable "name" field so it can be learned.
Object entry: {id,type,pos:[x,y,z],rotY,scale,params,anim:drop|grow|rise|fade,delay,name?}
Beat: {start,end,kind:intro|problem|solution|tip|info,add:[...],remove:[ids],modes:{id:mode},effects:[heat|night],camera:{preset:wide|hero|orbit|close|low|top|inside|detail,target:[x,y,z],dist?,elev?,az?,push?,cut?}}
Rules: keep the beat start/end times you are given. Make every beat visually different from the previous (new object, new mode, or new camera). Objects must stay on the island. Keep the main subject in frame.`;
  const lessons = mem.lessons.slice(-25).map(l => '- ' + l.rule).join('\n') || '- (none yet)';
  const learned = Object.keys(mem.learned).join(', ') || '(none)';
  const user = `Topic/prompt: ${prompt || '(infer from narration)'}
Learned custom assets available by name: ${learned}
Lessons from previous videos (MUST follow):
${lessons}
Beats (keep times):
${JSON.stringify(beats.map(b => ({ start: +b.start.toFixed(2), end: +b.end.toFixed(2), text: b.text })))}
Return {"beats":[...], "fades":[{"t":seconds,"dur":0.6}] (only at a real turning point, or empty), "env":{"bg":"#3d7fd0"}}`;
  const stream = client.messages.stream({ model: 'claude-opus-5-5', max_tokens: 32000, output_config: { effort: 'medium' }, system, messages: [{ role: 'user', content: user }] });
  const msg = await stream.finalMessage();
  if (msg.stop_reason === 'refusal') throw new Error('refusal');
  const text = msg.content.filter(b => b.type === 'text').map(b => b.text).join('');
  const json = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
  return json;
}

function validate(planBeats, beats) {
  return beats.map((b, i) => {
    const p = planBeats[i] || {};
    return { start: b.start, end: b.end, text: b.text, kind: p.kind || 'info', add: (p.add || []).filter(a => a && a.id && a.type), remove: p.remove || [], modes: p.modes || {}, effects: p.effects || [], camera: p.camera || { preset: 'hero' } };
  });
}

export async function makePlan(tr, { prompt = '', mode = 'auto', captionWords } = {}) {
  const mem = loadMemory();
  const S = { minBeat: 1.6, maxBeat: 6.5, captionWords: 1, ...mem.style };
  const beats = beatsFromSegments(tr, S.minBeat, S.maxBeat);
  let body, planner = 'rules';
  const hasKey = process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN;
  if (mode === 'claude' || (mode === 'auto' && hasKey)) {
    try { const j = await claudePlan(beats, tr, prompt, mem); body = { beats: validate(j.beats || [], beats), fades: j.fades || [], env: j.env || {} }; planner = 'claude';
      // learn new custom assets
      let changed = false; for (const b of body.beats) for (const a of b.add) if (a.type === 'custom' && a.name && a.params?.parts) { mem.learned[a.name] = a.params; changed = true; }
      if (changed) fs.writeFileSync(path.join(MEM, 'learned_assets.json'), JSON.stringify(mem.learned, null, 1));
    } catch (e) { console.error('[plan] Claude planner failed, using rules:', e.message); }
  }
  if (!body) {
    const rb = ruleBeats(beats);
    const fades = rb.filter(b => KIND.question.test(b.text)).map(b => ({ t: b.start, dur: .7 }));
    body = { beats: rb, fades, env: {} };
  }
  const isAr = tr.language === 'ar';
  return {
    version: 1, planner, duration: tr.duration, language: tr.language, prompt,
    captions: buildCaptions(tr, captionWords || (isAr ? Math.max(S.captionWords, 2) : S.captionWords)),
    style: S.render || {}, learnedAssets: mem.learned, ...body,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [tf, out, ...rest] = process.argv.slice(2);
  const prompt = rest.join(' ');
  const plan = await makePlan(JSON.parse(fs.readFileSync(tf, 'utf8')), { prompt });
  fs.writeFileSync(out, JSON.stringify(plan, null, 1));
  console.log(`planner=${plan.planner} beats=${plan.beats.length} captions=${plan.captions.length}`);
}
