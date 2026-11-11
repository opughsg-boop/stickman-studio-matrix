#!/usr/bin/env python3
"""One-shot: audio -> words -> shots -> final.mp4. Pause after plan so Claude can fill prompts (use --no-pause to skip)."""
import argparse, os, subprocess, sys
h = os.path.dirname(os.path.abspath(__file__)); py = sys.executable
a = argparse.ArgumentParser(); a.add_argument("audio"); a.add_argument("--transcript"); a.add_argument("--lang")
a.add_argument("--gen-cmd"); a.add_argument("--font", default="DejaVu Sans"); a.add_argument("--work", default="work"); a.add_argument("--no-pause", action="store_true")
x = a.parse_args(); os.makedirs(x.work, exist_ok=True)
t = [py, f"{h}/transcribe.py", x.audio, "-o", f"{x.work}/words.json"] + (["--transcript", x.transcript] if x.transcript else []) + (["--lang", x.lang] if x.lang else [])
subprocess.run(t, check=True)
subprocess.run([py, f"{h}/plan_shots.py", f"{x.work}/words.json", "-o", f"{x.work}/shots.json"], check=True)
if not x.no_pause: print("Fill prompt/camera/overlay in shots.json, then re-run assemble.py"); sys.exit(0)
subprocess.run([py, f"{h}/assemble.py", "--shots", f"{x.work}/shots.json", "--audio", x.audio, "--work", x.work, "--font", x.font] + (["--gen-cmd", x.gen_cmd] if x.gen_cmd else []), check=True)
