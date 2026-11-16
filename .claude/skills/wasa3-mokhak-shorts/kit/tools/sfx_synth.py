#!/usr/bin/env python3
"""Synthesize SFX + music stems from story.json (no downloads needed).
   python3 sfx_synth.py story.json --duration 30.2 --out work     -> work/sfx.wav work/music.wav
Cues: whoosh_up whoosh_down swish whip thump pop ting impact shockwave riser click sparkle.
Each shot start gets a transition sound from its camera move; each fx adds its own; shot['sfx'] adds explicit cues
(string or {"cue":"pop","t":0.4} with t seconds after shot start)."""
import json, argparse, os
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt
SR = 44100; rng = np.random.default_rng(7)
def T(d): return np.arange(int(d * SR)) / SR
def bp(x, lo, hi): return sosfilt(butter(2, [max(20, lo), min(hi, SR / 2 - 100)], btype="band", fs=SR, output="sos"), x)
def lp(x, f): return sosfilt(butter(2, f, btype="low", fs=SR, output="sos"), x)
def hp(x, f): return sosfilt(butter(2, f, btype="high", fs=SR, output="sos"), x)
def ex(n, k): return np.exp(-k * np.arange(n) / SR)
def swept_noise(d, f0, f1, peak=0.5):
    n = int(d * SR); x = rng.standard_normal(n); out = np.zeros(n); seg = 14; L = n // seg
    for i in range(seg):
        f = f0 * (f1 / f0) ** (i / (seg - 1)); a, b = i * L, (i + 1) * L if i < seg - 1 else n
        out[a:b] = bp(x[max(0, a - 200):b], f * 0.6, f * 1.6)[-(b - a):]
    u = np.linspace(0, 1, n); env = np.sin(np.pi * u ** (1 + 2 * (0.5 - peak))) ** 2
    return out * env / (np.abs(out).max() + 1e-9)
def whoosh_up(): return 0.8 * swept_noise(0.55, 250, 3800, 0.65)
def whoosh_down(): return 0.8 * swept_noise(0.55, 3800, 250, 0.35)
def swish(): return 0.55 * swept_noise(0.7, 500, 1800, 0.5)
def whip(): return 0.9 * swept_noise(0.22, 400, 5000, 0.4)
def thump(d=0.3): t = T(d); f = 45 + 90 * np.exp(-t * 28); return np.sin(2 * np.pi * np.cumsum(f) / SR) * ex(len(t), 11)
def pop(): t = T(0.14); f = 350 + 650 * np.exp(-t * 45); return 0.7 * np.sin(2 * np.pi * np.cumsum(f) / SR) * ex(len(t), 30)
def ting(): t = T(0.7); return 0.35 * sum(np.sin(2 * np.pi * f * t) * a for f, a in [(1760, 1), (2349, .6), (3520, .35)]) * ex(len(t), 6)
def impact(): n = int(0.45 * SR); return 0.85 * thump(0.45) + 0.5 * bp(rng.standard_normal(n), 120, 3000) * ex(n, 14)
def shockwave(): t = T(0.9); f = 320 * np.exp(-t * 3.2) + 40; return 0.5 * np.sin(2 * np.pi * np.cumsum(f) / SR) * ex(len(t), 3.2) + 0.25 * swept_noise(0.9, 3000, 200, 0.3)
def riser(): n = int(1.0 * SR); x = swept_noise(1.0, 200, 6000, 0.9); return 0.8 * x * np.linspace(0.1, 1, n) ** 1.5
def click(): n = int(0.02 * SR); return 0.6 * hp(rng.standard_normal(n), 2000) * ex(n, 150)
def sparkle(): out = np.zeros(int(0.5 * SR)); [out.__setitem__(slice(int(s * SR), int(s * SR) + int(.12 * SR)), out[int(s * SR):int(s * SR) + int(.12 * SR)] + .2 * np.sin(2 * np.pi * f * T(.12)) * ex(int(.12 * SR), 30)) for s, f in zip(rng.uniform(0, .35, 5), rng.uniform(3000, 7000, 5))]; return out
CUES = dict(whoosh_up=whoosh_up, whoosh_down=whoosh_down, swish=swish, whip=whip, thump=thump, pop=pop, ting=ting, impact=impact, shockwave=shockwave, riser=riser, click=click, sparkle=sparkle)
MOVE = dict(push_in="whoosh_up", pull_out="whoosh_down", orbit="swish", dolly="swish", crane_up="whoosh_up", crane_down="whoosh_down", whip_pan="whip", tilt_down="whoosh_down", rack_focus="ting")
FX = dict(shockwave=["impact", "shockwave"], sparks=["sparkle"], arrow=["pop"], flash=["riser"], pulse=["ting"], impact=["impact"], outro=["sparkle", "ting"], gauge=["riser"])
PRE = dict(whoosh_up=0.3, whoosh_down=0.25, swish=0.3, whip=0.1)       # start early so the peak lands on the cut/beat

def place(buf, snd, t, g=1.0):
    i = max(0, int(t * SR)); j = min(len(buf), i + len(snd))
    if j > i: buf[i:j] += snd[:j - i] * g

def music(dur, bpm=112):
    n = int(dur * SR); out = np.zeros(n); beat = 60 / bpm; notes = [110, 110, 130.8, 98]   # A2 A2 C3 G2 (loop of 4 beats x 2)
    pad = [[220, 261.6, 329.6], [196, 246.9, 293.7]]
    for k in range(int(dur / beat) + 1):
        t0 = k * beat; f = notes[(k // 2) % 4] if k % 2 == 0 else notes[(k // 2) % 4] * 2
        d = beat * 0.9; tt = T(d); pl = (np.sin(2 * np.pi * f * tt) + .5 * np.sin(4 * np.pi * f * tt)) * ex(len(tt), 7); place(out, lp(pl, 900), t0, .5)
        if k % 2 == 0: place(out, 0.8 * thump(0.2), t0, .35)
        h = hp(rng.standard_normal(int(.05 * SR)), 7000) * ex(int(.05 * SR), 70); place(out, h, t0 + beat / 2, .08)
    for b in range(int(dur / (beat * 4)) + 1):
        ch = pad[b % 2]; tt = T(beat * 4); p = sum(np.sin(2 * np.pi * f * tt + i) for i, f in enumerate(ch)) / 3 * (np.sin(np.pi * np.linspace(0, 1, len(tt))) ** 0.5)
        place(out, lp(p, 1400), b * beat * 4, .3)
    fade = np.ones(n); a = int(.5 * SR); fade[:a] = np.linspace(0, 1, a); z = int(min(1.0, dur / 4) * SR); fade[-z:] = np.linspace(1, 0, z)
    return out * fade / (np.abs(out).max() + 1e-9) * 0.8

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("story"); ap.add_argument("--duration", type=float, required=True); ap.add_argument("--out", default="work"); o = ap.parse_args()
    S = json.load(open(o.story)); os.makedirs(o.out, exist_ok=True); n = int(o.duration * SR); sfx = np.zeros(n); log = []
    for i, sh in enumerate(S["shots"]):
        t0 = sh["t0"]; cues = []
        mv = (sh.get("camera") or {}).get("move")
        if i > 0 and mv in MOVE: cues.append((MOVE[mv], 0.0))
        for f in sh.get("fx", []): cues += [(c, 0.05 + 0.04 * j) for j, c in enumerate(FX.get(f, []))]
        for c in sh.get("sfx", []): cues.append((c, 0.0) if isinstance(c, str) else (c["cue"], c.get("t", 0)))
        for c, off in cues:
            if c not in CUES: raise SystemExit(f"unknown cue {c} in shot {sh.get('id')}")
            tt = t0 + off - PRE.get(c, 0.0); place(sfx, CUES[c](), tt, 1.0); log.append((round(tt, 2), c))
    if S.get("fade"): place(sfx, whoosh_down(), S["fade"]["at"] - 0.25, .8)
    sfx = sfx / (np.abs(sfx).max() + 1e-9) * 0.9; mus = music(o.duration)
    for name, x in (("sfx", sfx), ("music", mus)): wavfile.write(os.path.join(o.out, name + ".wav"), SR, (np.stack([x, x], 1) * 32767).astype(np.int16))
    print(f"{len(log)} sfx cues, music {o.duration:.1f}s ->", o.out); print(log[:12])
main()
