#!/usr/bin/env python3
"""Synthesize a sound-effects track synced to plan.json and mix it under the voice (ducked).
Usage: sfx.py PLAN.json VOICE OUT_MIX.wav"""
import json, sys, subprocess, os
import numpy as np

SR = 48000
plan_f, voice, out = sys.argv[1:4]
plan = json.load(open(plan_f, encoding='utf-8'))
D = plan['duration']
rng = np.random.default_rng(7)
IMPACT_T = .42

def env(n, a=.005, r=.2):
    t = np.arange(n) / SR; e = np.minimum(1, t / a) * np.exp(-t / r); return e
def noise(n): return rng.standard_normal(n)
def lp(x, k):  # one-pole low-pass, k in (0,1)
    y = np.empty_like(x); acc = 0.0
    for i, v in enumerate(x): acc += k * (v - acc); y[i] = acc
    return y
def soft_transition(d=.5):
    """Soft low 'whoom' (user rejected the hissy 'tsh tsh' noise whoosh): pitch-glide sine + heavily filtered air."""
    n = int(SR * d); t = np.arange(n) / SR; k = t / d
    f = 220 - 120 * k                                   # gentle downward glide
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * .8 + np.sin(4 * np.pi * np.cumsum(f) / SR) * .15
    air = lp(lp(noise(n), .02), .05) * 3                # very dark, no hiss
    return (tone + air) * np.sin(np.pi * k) ** 2
def whoosh(d=.45):
    n = int(SR * d); t = np.arange(n) / n; x = noise(n)
    cut = .02 + .25 * np.sin(np.pi * t) ** 2; y = np.empty(n); acc = 0.0
    for i in range(n): acc += cut[i] * (x[i] - acc); y[i] = acc
    return y * np.sin(np.pi * t) ** 1.5 * 2.2
def thud(metal=False):
    n = int(SR * (.6 if metal else .35)); t = np.arange(n) / SR
    if metal:
        y = sum(np.sin(2 * np.pi * f * t) * a for f, a in [(523, .5), (1187, .35), (2210, .2), (3301, .12)]) * np.exp(-t / .18)
        return y + lp(noise(n), .3) * env(n, .001, .02) * .8
    body = np.sin(2 * np.pi * (95 + 60 * np.exp(-t / .03)) * t) * np.exp(-t / .09)
    knock = lp(noise(n), .25) * env(n, .001, .025)
    return body * 1.1 + knock * 1.2
def ding():
    n = int(SR * .9); t = np.arange(n) / SR
    return sum(np.sin(2 * np.pi * f * t) * a for f, a in [(1318.5, .6), (1975.5, .35), (2637, .15)]) * np.exp(-t / .28) * env(n, .003, 10)
def buzz():
    n = int(SR * .38); t = np.arange(n) / SR; f = 140
    saw = 2 * ((t * f) % 1) - 1; saw2 = 2 * ((t * f * 1.06) % 1) - 1
    return lp((saw + saw2) * .5, .2) * np.minimum(1, t / .01) * np.minimum(1, (t[-1] - t) / .05) * 1.6
def pop():
    n = int(SR * .12); t = np.arange(n) / SR
    return np.sin(2 * np.pi * (400 + 900 * t / t[-1]) * t) * np.exp(-t / .04)
def sizzle(d):
    n = int(SR * d); x = noise(n) - lp(noise(n), .3)
    crack = (rng.random(n) > .9993) * rng.standard_normal(n) * 4
    return (x * .35 + crack) * np.minimum(1, np.arange(n) / (SR * .3)) * np.minimum(1, (n - np.arange(n)) / (SR * .3))
def bee_bed(d, level):
    n = int(SR * d); t = np.arange(n) / SR; y = np.zeros(n)
    for k in range(6):
        f = 210 + k * 23 + 8 * np.sin(2 * np.pi * (.3 + k * .07) * t + k)
        ph = 2 * np.pi * np.cumsum(f) / SR; y += np.sign(np.sin(ph)) * (.5 + .5 * np.sin(2 * np.pi * (1.3 + k * .4) * t + k))
    return lp(y / 6, .08) * level

track = np.zeros(int(SR * (D + 1)))
def put(sig, at, gain):
    i = int(max(0, at) * SR); j = min(len(track), i + len(sig)); track[i:j] += sig[:j - i] * gain

beats = plan.get('beats') or [{'start': x['start'], 'end': x['end'], 'kind': 'solution' if x.get('flash') else '', 'add': [], 'effects': []} for x in plan['shots']]
for i, b in enumerate(beats):
    if i: put(soft_transition(), b['start'] - .22, .16)
    if b.get('kind') == 'solution': put(ding(), b['start'] + .05, .30)
    if b.get('kind') == 'problem': put(buzz(), b['start'] + .05, .22)
    if 'heat' in (b.get('effects') or []): put(sizzle(b['end'] - b['start']), b['start'], .25)
    for a in b.get('add', []):
        sp = b['start'] + a.get('delay', 0); anim = a.get('anim', 'drop')
        metal = a['type'] in ('excluder', 'lid')
        if anim == 'drop' and a.get('dust', True) is not False: put(thud(metal), sp + IMPACT_T, .55 if not metal else .35)
        elif anim in ('grow', 'rise', 'drop'): put(pop(), sp + .05, .18)
# bee ambience across the beats where bees exist, louder when "messy"
bees_from = next((b['start'] for b in beats if any(a['type'] == 'bees' for a in b.get('add', []))), None)
if bees_from is not None:
    mode = None
    for b in beats:
        mode = (b.get('modes') or {}).get('bees', mode)
        if b['start'] < bees_from: continue
        lvl = .11 if (mode or {}).get('mode') == 'messy' else .06
        seg = bee_bed(b['end'] - b['start'] + .05, lvl); put(seg, b['start'], 1)

track = np.tanh(track * 1.2) / 1.2
tmp = out + '.sfx.wav'
pcm = (np.clip(track, -1, 1) * 32767).astype('<i2')
import wave
w = wave.open(tmp, 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes()); w.close()
# duck SFX under the voice, then mix (loudness is normalised later in render)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', voice, '-i', tmp, '-filter_complex',
    '[0:a]aresample=48000,aformat=channel_layouts=mono,asplit=2[v][sc];'
    '[1:a][sc]sidechaincompress=threshold=0.03:ratio=6:attack=15:release=250[duck];'
    '[v][duck]amix=inputs=2:weights=1 0.9:normalize=0:duration=first[m]', '-map', '[m]', '-ar', '48000', out], check=True)
os.remove(tmp)
print('sfx mixed ->', out)
