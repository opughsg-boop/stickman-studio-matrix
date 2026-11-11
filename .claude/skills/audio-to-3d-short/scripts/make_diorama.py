#!/usr/bin/env python3
"""audio + diorama spec -> final.mp4 : render 3D (node diorama/render.mjs), one-word captions, original audio."""
import argparse, json, os, subprocess, sys
h = os.path.dirname(os.path.abspath(__file__)); root = os.path.dirname(h)
a = argparse.ArgumentParser(); a.add_argument("audio"); a.add_argument("spec"); a.add_argument("--words", required=True)
a.add_argument("--out", default="out/final.mp4"); a.add_argument("--work", default="work"); a = a.parse_args()
os.makedirs(a.work, exist_ok=True); os.makedirs(os.path.dirname(a.out) or ".", exist_ok=True)
vid, ass = f"{a.work}/diorama.mp4", f"{a.work}/words.ass"
subprocess.run(["node", f"{root}/diorama/render.mjs", a.spec, vid], check=True)
subprocess.run([sys.executable, f"{h}/word_captions.py", a.words, "-o", ass], check=True)
subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", vid, "-i", a.audio, "-vf", f"ass={ass}:fontsdir={root}/assets/fonts",
                "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
                "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", a.out], check=True)
print("->", a.out)
