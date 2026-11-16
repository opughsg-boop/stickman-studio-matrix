#!/usr/bin/env python3
"""Self-review of a finished video. Finds defects, scores the video, and writes lessons + automatic
style corrections into memory/ so the next video does not repeat them.
Usage: critic.py RUN_DIR"""
import json, os, re, subprocess, sys, time
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MEM = os.path.join(ROOT, 'memory')
run = sys.argv[1]
video = os.path.join(run, 'final.mp4')
plan = json.load(open(os.path.join(run, 'plan.json'), encoding='utf-8'))
D = plan['duration']
if 'beats' not in plan:  # cine plans: treat shots as beats
    plan['beats'] = [{'start': x['start'], 'end': x['end'], 'kind': 'info', 'add': x.get('actors', []) + x.get('props', []), 'modes': {}, 'effects': [], 'camera': {'preset': str(i)}} for i, x in enumerate(plan['shots'])]
issues = []

def issue(code, sev, msg, t=None, fix=None):
    issues.append({'code': code, 'severity': sev, 'message': msg, 't': t, 'fix': fix})

def ff(args):
    return subprocess.run(['ffmpeg', '-hide_banner', '-nostats'] + args, capture_output=True, text=True).stderr

# ---- 1. black / frozen video ----
fades = [(f['t'] - f.get('dur', .6), f['t'] + f.get('dur', .6)) for f in plan.get('fades', [])] + [(0, .5), (D - .6, D + 1)]
for m in re.finditer(r'black_start:([\d.]+) black_end:([\d.]+)', ff(['-i', video, '-vf', 'blackdetect=d=0.25:pix_th=0.08', '-an', '-f', 'null', '-'])):
    a, b = float(m[1]), float(m[2])
    if not any(a >= x - .2 and b <= y + .2 for x, y in fades):
        issue('unexpected_black', 3, f'unplanned black frames {a:.2f}-{b:.2f}s', a)
for m in re.finditer(r'freeze_start: ([\d.]+)[\s\S]*?freeze_duration: ([\d.]+)', ff(['-i', video, '-vf', 'freezedetect=n=0.002:d=2.5', '-an', '-f', 'null', '-'])):
    issue('frozen', 2, f'picture almost static for {float(m[2]):.1f}s', float(m[1]))

# ---- 2. loudness ----
lo = re.findall(r'I:\s+(-?[\d.]+) LUFS', ff(['-i', video, '-af', 'ebur128', '-vn', '-f', 'null', '-']))
lufs = float(lo[-1]) if lo else None
if lufs is not None and abs(lufs + 14) > 1.5:
    issue('loudness', 1, f'integrated loudness {lufs} LUFS (target -14)')

# ---- 3. per-beat frame analysis ----
def frame(t):
    t = min(max(t, 0), D - .05)
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', f'{t:.3f}', '-i', video, '-frames:v', '1', '-vf', 'scale=135:240', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(240, 135, 3).astype(np.float32) if len(raw) == 240 * 135 * 3 else None

mids, metrics = [], []
for i, b in enumerate(plan['beats']):
    t = (b['start'] + b['end']) / 2; f = frame(t)
    if f is None: continue
    scene = f[:int(240 * .66)]  # exclude caption band
    luma = (scene @ [.299, .587, .114]).mean()
    r, g, bl = scene[..., 0], scene[..., 1], scene[..., 2]
    blue = ((bl > r + 35) & (bl > g + 10)).mean()
    night = 'night' in (b.get('effects') or [])
    metrics.append({'beat': i, 't': round(t, 2), 'luma': round(float(luma), 1), 'blueprint_ratio': round(float(blue), 3)})
    if luma < (38 if night else 60): issue('too_dark', 2, f'beat {i} too dark (luma {luma:.0f})', t, {'exposure': +.08})
    if luma > 205: issue('too_bright', 2, f'beat {i} washed out (luma {luma:.0f})', t, {'exposure': -.06})
    sky = (plan.get('env') or {}).get('sky', True) is not False  # realistic sky is the default: no blueprint room to look for
    if not sky and blue > .78: issue('subject_lost', 2, f'beat {i}: subject too small / off-frame ({blue:.0%} background)', t, {'camScale': .92})
    if not sky and blue < .03 and not night and b['camera'].get('preset') not in ('inside', 'detail'):
        issue('no_context', 1, f'beat {i}: blueprint room not visible, framing too tight', t, {'camScale': 1.05})
    mids.append((i, f))
for (i, a), (j, b2) in zip(mids, mids[1:]):
    d = np.abs(a - b2).mean()
    if d < 6: issue('repetitive_beats', 2, f'beats {i} and {j} look almost identical (diff {d:.1f})', plan['beats'][j]['start'], {'drift': +.03})

# ---- 4. plan / timing checks ----
S = json.load(open(os.path.join(MEM, 'style.json'))) if os.path.exists(os.path.join(MEM, 'style.json')) else {}
for i, b in enumerate(plan['beats']):
    L = b['end'] - b['start']
    if L < 1.2: issue('beat_too_short', 1, f'beat {i} lasts {L:.1f}s', b['start'], {'minBeat': +.2})
    if L > 7.5: issue('beat_too_long', 2, f'beat {i} lasts {L:.1f}s without a new idea', b['start'], {'maxBeat': -.5})
    if i and not b.get('add') and not b.get('modes') and not b.get('effects') and b['camera'].get('preset') == plan['beats'][i - 1]['camera'].get('preset'):
        issue('dead_beat', 2, f'beat {i} adds nothing new visually', b['start'])
caps = plan.get('captions', [])
for c in caps:
    if c['end'] - c['start'] < .08: issue('caption_flash', 1, f'caption "{c["text"]}" shown only {c["end"]-c["start"]:.2f}s', c['start'])
    if c['end'] > D + .1: issue('caption_overflow', 2, f'caption "{c["text"]}" after audio end', c['start'])
if not caps: issue('no_captions', 3, 'no captions were produced')
elif sum(len(c['text'].split()) > 3 for c in caps) > 0: issue('caption_too_long', 1, 'some captions exceed 3 words')

# ---- 4b. compare with the learned reference profile (style "training" target) ----
refp = os.path.join(MEM, 'ref_profile_zd.json')
if plan.get('engine') == 'cine' and os.path.exists(refp):
    tgt = json.load(open(refp))['target']
    me = json.loads(subprocess.run(['python3', os.path.join(ROOT, 'pipeline/ref_profile.py'), os.path.join(run, 'profile.json'), video], capture_output=True, text=True) and open(os.path.join(run, 'profile.json')).read())['target']
    if me['luma'] > tgt['luma'] * 1.2: issue('ref_too_bright', 2, f"brighter than reference (luma {me['luma']:.0f} vs {tgt['luma']:.0f})", None, {'cineBright': -.06})
    if me['luma'] < tgt['luma'] * .8: issue('ref_too_dark', 2, f"darker than reference (luma {me['luma']:.0f} vs {tgt['luma']:.0f})", None, {'cineBright': +.06})
    if me['saturation'] > tgt['saturation'] * 1.25: issue('ref_oversaturated', 1, f"more saturated than reference ({me['saturation']:.2f} vs {tgt['saturation']:.2f})", None, {'cineSat': -.06})
    if me['motion'] < tgt['motion'] * .75: issue('ref_static', 2, f"less motion than reference ({me['motion']:.1f} vs {tgt['motion']:.1f})", None, {'cineHandheld': +.15})
    if me['avg_shot'] > tgt['avg_shot'] * 1.5: issue('ref_slow_cuts', 2, f"cuts slower than reference ({me['avg_shot']:.2f}s vs {tgt['avg_shot']:.2f}s)")

# ---- 5. optional vision review by Claude ----
vision = None
if (os.environ.get('ANTHROPIC_API_KEY') or os.environ.get('ANTHROPIC_AUTH_TOKEN')) and os.path.exists(os.path.join(run, 'sheet_final.jpg')):
    try:
        import anthropic, base64
        client = anthropic.Anthropic()
        img = base64.b64encode(open(os.path.join(run, 'sheet_final.jpg'), 'rb').read()).decode()
        ref = open(os.path.join(ROOT, 'STYLE.md'), encoding='utf-8').read()
        msg = client.messages.create(model='claude-opus-5-5', max_tokens=4000, output_config={'effort': 'medium'}, messages=[{'role': 'user', 'content': [
            {'type': 'image', 'source': {'type': 'base64', 'media_type': 'image/jpeg', 'data': img}},
            {'type': 'text', 'text': f'Target style:\n{ref}\n\nThis contact sheet shows one frame per beat of a generated video. Narration beats: '
             + json.dumps([b['text'] for b in plan['beats']], ensure_ascii=False)
             + '\nList up to 6 concrete visual defects vs the target style and the narration, as JSON: {"defects":[{"beat":i,"problem":"...","rule":"a short reusable directing rule to avoid this next time"}]}'}]}])
        if msg.stop_reason != 'refusal':
            tx = ''.join(b.text for b in msg.content if b.type == 'text'); vision = json.loads(tx[tx.index('{'):tx.rindex('}') + 1])
            for d in vision.get('defects', []):
                issue('vision:' + re.sub(r'\W+', '_', d['rule'].lower())[:40], 2, f"beat {d.get('beat')}: {d['problem']}", None, None)
                issues[-1]['rule'] = d['rule']
    except Exception as e:
        print('[critic] vision review skipped:', e)

if plan.get('engine') == 'cine':  # diorama-only checks do not apply; route exposure fixes to the cine grade
    issues = [x for x in issues if x['code'] not in ('no_context', 'subject_lost')]
    for x in issues:
        if x['code'] in ('too_bright', 'too_dark') and x.get('fix'): x['fix'] = {'cineBright': x['fix']['exposure']}
# ---- 6. score + learn ----
score = max(0, 100 - sum({1: 2, 2: 5, 3: 15}[x['severity']] for x in issues))
RULES = {
    'unexpected_black': 'Never leave the camera inside geometry or outside the room; only fade at planned turning points.',
    'frozen': 'Every beat needs motion: camera push/orbit plus animated characters.',
    'too_dark': 'Keep night scenes readable: dim the light but keep the subject clearly visible.',
    'too_bright': 'Avoid white objects filling the frame; lower exposure or change angle.',
    'subject_lost': 'Keep the main subject filling at least a third of the frame; move the camera closer.',
    'no_context': 'Show some of the blueprint room in most shots so the diorama look is preserved.',
    'repetitive_beats': 'Consecutive beats must differ: new object, new camera preset or new action.',
    'beat_too_short': 'Merge very short sentences; a beat should last at least ~1.5 s.',
    'beat_too_long': 'Split long sentences into two beats with a camera change.',
    'dead_beat': 'Each beat must add an object, change a character mode, add an effect or change the camera.',
    'caption_flash': 'Hold each caption until the next word starts.',
    'caption_overflow': 'Clamp captions to the audio duration.',
    'caption_too_long': 'Captions: 1 to 3 words only.',
    'loudness': 'Normalize audio to -14 LUFS.',
    'no_captions': 'Always produce word-synced captions.',
    'ref_too_bright': 'Match the reference exposure: avoid white sets and large bright surfaces filling the frame.',
    'ref_too_dark': 'Match the reference exposure: light characters with a strong key and use bright studio colors.',
    'ref_oversaturated': 'Keep colors natural, slightly desaturated like the reference.',
    'ref_static': 'Keep the camera always moving (push/orbit/handheld) like the reference.',
    'ref_slow_cuts': 'Cut every 1-2 seconds; one visual per phrase.',
}
os.makedirs(MEM, exist_ok=True)
lp = os.path.join(MEM, 'lessons.json'); lessons = json.load(open(lp)) if os.path.exists(lp) else []
by = {l['code']: l for l in lessons}
style = S; render = style.setdefault('render', {})
applied = []; done_keys = set()
for x in issues:
    rule = x.get('rule') or RULES.get(x['code'])
    if rule:
        l = by.get(x['code']) or {'code': x['code'], 'rule': rule, 'count': 0}
        l['count'] += 1; l['last_seen'] = time.strftime('%Y-%m-%d'); l['example'] = x['message']; by[x['code']] = l
    for k, dv in (x.get('fix') or {}).items():
        if k in done_keys: continue  # one correction per knob per video (avoid over-steering)
        done_keys.add(k)
        if k.startswith('cine'):
            cs = style.setdefault('cine', {}); key = {'cineBright': 'bright', 'cineSat': 'sat', 'cineHandheld': 'handheld'}[k]
            cs[key] = round(min(1.6, max(.5, cs.get(key, {'bright': 1.06, 'sat': .92, 'handheld': .5}[key]) + dv)), 3); applied.append(f'cine.{key}->{cs[key]}'); continue
        if k in ('minBeat', 'maxBeat'):
            style[k] = round(min(3, max(1.2, style.get(k, 1.6) + dv)) if k == 'minBeat' else min(9, max(3.5, style.get(k, 6.5) + dv)), 2)
        elif k == 'camScale':
            render[k] = round(min(1.4, max(.7, render.get(k, 1) * dv)), 3)
        else:
            lo_, hi_ = {'exposure': (.7, 1.5), 'drift': (.02, .25)}[k]
            render[k] = round(min(hi_, max(lo_, render.get(k, {'exposure': 1, 'drift': .08}[k]) + dv)), 3)
        applied.append(f'{k}->{render.get(k, style.get(k))}')
json.dump(list(by.values()), open(lp, 'w'), ensure_ascii=False, indent=1)
json.dump(style, open(os.path.join(MEM, 'style.json'), 'w'), indent=1)
report = {'video': video, 'score': score, 'lufs': lufs, 'issues': issues, 'metrics': metrics, 'style_updates': sorted(set(applied)), 'vision': vision, 'planner': plan.get('planner')}
json.dump(report, open(os.path.join(run, 'report.json'), 'w'), ensure_ascii=False, indent=1)
with open(os.path.join(MEM, 'history.jsonl'), 'a') as h:
    h.write(json.dumps({'run': os.path.basename(run.rstrip('/')), 'time': time.strftime('%Y-%m-%d %H:%M'), 'score': score, 'issues': len(issues), 'codes': sorted({i['code'] for i in issues})}) + '\n')
print(f'score={score} issues={len(issues)} lufs={lufs} updates={sorted(set(applied))}')
for x in issues: print(f"  [{x['severity']}] {x['code']}: {x['message']}")
