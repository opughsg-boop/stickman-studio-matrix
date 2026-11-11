#!/usr/bin/env python3
"""Audio -> transcript.json  {language, duration, segments:[{start,end,text,words:[{w,start,end}]}]}
Usage: transcribe.py AUDIO OUT.json [--lang ar|es|en|auto] [--model small] [--script script.txt]
If --script is given, the exact script words replace the ASR words (timed by character weight inside
each ASR segment), so captions are always spelled correctly."""
import argparse, json, subprocess, tempfile, wave, os, re
import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument('audio'); ap.add_argument('out')
ap.add_argument('--lang', default='auto'); ap.add_argument('--model', default=os.environ.get('WHISPER_MODEL', 'small'))
ap.add_argument('--script', default=None)
a = ap.parse_args()

tmp = tempfile.mktemp(suffix='.wav')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', a.audio, '-ac', '1', '-ar', '16000', tmp], check=True)
w = wave.open(tmp); pcm = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768; w.close(); os.remove(tmp)
duration = len(pcm) / 16000

from faster_whisper import WhisperModel
m = WhisperModel(a.model, device='cpu', compute_type='int8')
segs, info = m.transcribe(pcm, language=None if a.lang == 'auto' else a.lang, word_timestamps=True, vad_filter=True)
out = {'language': info.language, 'duration': duration, 'segments': []}
for s in segs:
    words = [{'w': x.word.strip(), 'start': round(x.start, 3), 'end': round(x.end, 3)} for x in (s.words or []) if x.word.strip()]
    out['segments'].append({'start': round(s.start, 3), 'end': round(s.end, 3), 'text': s.text.strip(), 'words': words})

if a.script and os.path.exists(a.script):
    text = open(a.script, encoding='utf-8').read()
    sw = text.split()
    # distribute script words over ASR segments proportionally to ASR character counts
    seg_chars = [max(1, len(s['text'])) for s in out['segments']]
    total = sum(seg_chars); tot_script = sum(len(x) for x in sw); idx = 0
    for k, s in enumerate(out['segments']):
        quota = seg_chars[k] / total * tot_script; taken = []; acc = 0
        while idx < len(sw) and (acc < quota * .98 or k == len(out['segments']) - 1):
            taken.append(sw[idx]); acc += len(sw[idx]); idx += 1
        span = s['end'] - s['start']; cw = sum(len(x) + 1 for x in taken) or 1; t = s['start']; words = []
        for x in taken:
            d = span * (len(x) + 1) / cw; words.append({'w': x, 'start': round(t, 3), 'end': round(t + d, 3)}); t += d
        s['words'] = words; s['text'] = ' '.join(taken)
json.dump(out, open(a.out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(f"lang={out['language']} dur={duration:.2f}s segments={len(out['segments'])}")
