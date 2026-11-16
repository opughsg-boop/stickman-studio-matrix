#!/usr/bin/env python3
"""Mix voice + music + sfx with FIXED levels relative to the voice, then loudnorm to -14 LUFS / -1.5 dBTP.
   python3 mix.py voice.mp3 music.wav sfx.wav out.wav [--music-db -14] [--sfx-db -7]
Levels are gated-RMS(voice) + offset. No ducking: one linear gain per stem, so narration stays clear. Prints measured levels."""
import argparse, subprocess, numpy as np
SR = 44100
def dec(p): return np.frombuffer(subprocess.run(["ffmpeg", "-v", "error", "-i", p, "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"], capture_output=True).stdout, dtype=np.float32).reshape(-1, 2)
def grms(x):   # gated RMS in dB: ignore 400 ms blocks quieter than -50 dBFS
    b = SR * 4 // 10; v = [np.sqrt((x[i:i + b] ** 2).mean()) for i in range(0, len(x) - b, b)]; v = [a for a in v if a > 10 ** (-50 / 20)]
    return 20 * np.log10(np.sqrt(np.mean(np.square(v))) + 1e-12) if v else -90
def main():
    ap = argparse.ArgumentParser(); ap.add_argument("voice"); ap.add_argument("music"); ap.add_argument("sfx"); ap.add_argument("out")
    ap.add_argument("--music-db", type=float, default=-14); ap.add_argument("--sfx-db", type=float, default=-7); o = ap.parse_args()
    v = dec(o.voice); n = len(v); mix = v.copy(); vr = grms(v); rep = [f"voice {vr:.1f} dB"]
    for name, p, off in (("music", o.music, o.music_db), ("sfx", o.sfx, o.sfx_db)):
        s = dec(p)[:n]; s = np.pad(s, ((0, n - len(s)), (0, 0)))
        g = 10 ** ((vr + off - grms(s)) / 20); s = s * g
        cap = np.abs(v).max() * 0.9          # SFX/music peaks never poke over the narration peak
        if np.abs(s).max() > cap and name == "sfx": s *= cap / np.abs(s).max()
        mix += s; rep.append(f"{name} {grms(s):.1f} dB ({grms(s) - vr:+.1f} vs voice)")
    np.clip(mix, -1, 1).astype(np.float32).tofile(o.out + ".raw")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", o.out + ".raw", "-af", "loudnorm=I=-14:TP=-1.5:LRA=7", "-ar", "48000", o.out], check=True)
    import os; os.remove(o.out + ".raw"); print(" | ".join(rep), "->", o.out)
main()
