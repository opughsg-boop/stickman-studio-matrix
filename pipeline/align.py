#!/usr/bin/env python3
"""Align the user's exact script to the ASR word timings (no manual fixing).
Usage: align.py ASR.json SCRIPT.txt OUT_transcript.json
Each non-empty script line becomes one segment; every script word gets a start/end taken from the
best-matching ASR words (character-level alignment, robust to ASR spelling mistakes)."""
import json, sys, re, difflib

asr = json.load(open(sys.argv[1], encoding='utf-8'))
lines = [l.strip() for l in open(sys.argv[2], encoding='utf-8').read().splitlines() if l.strip()]
norm = lambda s: re.sub(r'[ً-ْـ.,،؛:!?؟"«»…\-]', '', s).replace('أ', 'ا').replace('إ', 'ا').replace('آ', 'ا').replace('ة', 'ه').replace('ى', 'ي').replace('ق', 'ا').lower()

# ASR characters with time per character
A, AT = [], []
for seg in asr['segments']:
    for w in seg['words']:
        t = norm(w['w']); n = max(1, len(t))
        for k, ch in enumerate(t): A.append(ch); AT.append(w['start'] + (w['end'] - w['start']) * k / n)
        A.append(' '); AT.append(w['end'])
# script characters with (line, word) index
S, SI, words = [], [], []
for li, line in enumerate(lines):
    for w in line.split():
        wi = len(words); words.append({'line': li, 'w': w})
        for ch in norm(w): S.append(ch); SI.append(wi)
        S.append(' '); SI.append(wi)
sm = difflib.SequenceMatcher(None, ''.join(S), ''.join(A), autojunk=False)
times = {}
for a, b, n in sm.get_matching_blocks():
    for k in range(n): times.setdefault(SI[a + k], []).append(AT[b + k])
# words without matches: interpolate between neighbours
known = sorted(times)
for i, w in enumerate(words):
    if i in times: w['start'], w['end'] = min(times[i]), max(times[i])
for i, w in enumerate(words):
    if 'start' in w: continue
    prev = next((words[j]['end'] for j in range(i - 1, -1, -1) if 'end' in words[j]), 0.0)
    nxt = next((words[j]['start'] for j in range(i + 1, len(words)) if 'start' in words[j]), asr['duration'])
    w['start'], w['end'] = prev, max(prev + .05, min(nxt, prev + .35))
for i in range(len(words) - 1):  # keep monotonic, small tail per word
    words[i]['end'] = max(words[i]['end'], words[i]['start'] + .06)
    if words[i + 1]['start'] < words[i]['start']: words[i + 1]['start'] = words[i]['end']
segs = []
for li, line in enumerate(lines):
    ws = [w for w in words if w['line'] == li]
    segs.append({'start': round(ws[0]['start'], 3), 'end': round(ws[-1]['end'] + .05, 3), 'text': line,
                 'words': [{'w': w['w'], 'start': round(w['start'], 3), 'end': round(w['end'], 3)} for w in ws]})
json.dump({'language': asr['language'], 'duration': asr['duration'], 'segments': segs}, open(sys.argv[3], 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
match = sum(n for *_, n in sm.get_matching_blocks()) / max(1, len(S))
print(f'aligned {len(lines)} lines / {len(words)} words, char match {match:.0%}')
