# python3 -I sfx.py cues.json out.wav
# cues.json: {"dur": 45.0, "bed_db": -33, "cues": [[t_seconds, "name", gain_db], ...]}
# Writes 48 kHz true-stereo 16-bit PCM with the wave module (no soundfile).
import json, sys, wave
import numpy as np

SR = 48000
rng = np.random.default_rng(7)


def env(n, a, d):
    t = np.arange(n) / SR
    return np.minimum(t / a, 1.0) * np.exp(-t / d)


def noise(n):
    return rng.standard_normal(n)


def lowpass(x, k):
    kern = np.ones(k) / k
    return np.convolve(x, kern, mode="same")


def tone(n, f0, f1=None, d=0.2, a=0.002):
    t = np.arange(n) / SR
    f1 = f0 if f1 is None else f1
    f = np.linspace(f0, f1, n)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * env(n, a, d)


def synth(name):
    if name == "tick":
        n = int(0.03 * SR); return tone(n, 2400, d=0.008) * 0.6 + noise(n) * env(n, 0.001, 0.004) * 0.3
    if name == "tap":
        n = int(0.09 * SR); return tone(n, 700, 400, d=0.03) * 0.8 + noise(n) * env(n, 0.001, 0.01) * 0.4
    if name == "thud":
        n = int(0.4 * SR); return tone(n, 90, 40, d=0.12) * 1.0 + lowpass(noise(n), 40) * env(n, 0.002, 0.08) * 2
    if name == "whoosh":
        n = int(0.5 * SR); return lowpass(noise(n), 60) * env(n, 0.15, 0.18) * 6
    if name == "boing":
        n = int(0.6 * SR); return tone(n, 320, 140, d=0.25) * 0.8
    if name == "gasp":
        n = int(0.35 * SR); return lowpass(noise(n), 12) * env(n, 0.05, 0.12) * 4
    if name == "buzz":
        n = int(0.35 * SR); t = np.arange(n) / SR
        return np.sign(np.sin(2 * np.pi * 170 * t)) * 0.25 * (0.6 + 0.4 * np.sin(2 * np.pi * 30 * t)) * env(n, 0.005, 0.2)
    if name == "clink":
        n = int(0.4 * SR); return (tone(n, 2600, d=0.12) + tone(n, 3900, d=0.08) * 0.6) * 0.6
    if name == "ding":
        n = int(1.2 * SR); return (tone(n, 1320, d=0.5) + tone(n, 2640, d=0.2) * 0.3) * 0.7
    if name == "pop":
        n = int(0.08 * SR); return tone(n, 520, 260, d=0.03)
    if name == "scratch":
        n = int(0.35 * SR); x = noise(n); x = np.diff(x, prepend=0); return x * env(n, 0.02, 0.2) * 1.2
    if name == "sting":
        n = int(0.9 * SR); return (tone(n, 392, d=0.5) + tone(n, 523, d=0.5) * 0.7 + tone(n, 659, d=0.5) * 0.5) * 0.45
    if name == "sigh":
        n = int(0.9 * SR); return lowpass(noise(n), 30) * env(n, 0.3, 0.3) * 1.5
    if name == "heartbeat":
        n = int(0.5 * SR); return tone(n, 60, d=0.06) * 0.9
    raise SystemExit("unknown cue " + name)


def bed(n, db):
    x = lowpass(noise(n), 90)
    x = x / (np.std(x) + 1e-9) * 10 ** (db / 20)
    return x


def main(cues_path, out):
    spec = json.load(open(cues_path))
    dur = float(spec["dur"])
    n = int(round(dur * SR))
    L = bed(n, float(spec.get("bed_db", -33)))
    R = bed(n, float(spec.get("bed_db", -33))) * 0.97
    for c in spec["cues"]:
        t, name, gain = c[0], c[1], c[2] if len(c) > 2 else 0.0
        s = synth(name) * 10 ** (gain / 20)
        i = int(round(t * SR))
        if i >= n:
            continue
        m = min(len(s), n - i)
        pan = 0.5 + 0.2 * np.sin(t)  # slight stereo spread so cues sit in space
        L[i:i + m] += s[:m] * (1 - pan) * 1.4
        R[i:i + m] += s[:m] * pan * 1.4
    stereo = np.stack([L, R], axis=1)
    peak = np.max(np.abs(stereo)) + 1e-9
    stereo = stereo / peak * 0.8
    pcm = (np.clip(stereo, -1, 1) * 32767).astype("<i2").tobytes()
    with wave.open(out, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm)
    print("wrote", out, round(dur, 2), "s")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
