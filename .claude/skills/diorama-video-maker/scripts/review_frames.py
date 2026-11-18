#!/usr/bin/env python3
"""Frame-by-frame check of a rendered video.

Usage: python3 review_frames.py VIDEO OUT_DIR
Writes OUT_DIR/report.json (per-frame numbers + flagged frames) and OUT_DIR/sheet_NN.jpg
(contact sheets of every 15th frame, 180 px tiles, labelled by frame index and time).
Only checks numbers; the model still looks at the sheets to judge the look.
"""
import json, os, subprocess, sys, re

def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True, check=False)

def main():
    video, out = sys.argv[1], sys.argv[2]
    os.makedirs(out, exist_ok=True)
    # 1) per-frame luma (YAVG), motion (SAD vs previous frame) and scene change, read from ffmpeg's signalstats
    r = run(["ffmpeg", "-hide_banner", "-i", video, "-vf",
             "signalstats,metadata=mode=print:file=-", "-an", "-f", "null", "-"])
    lum, cur = {}, None
    for line in r.stdout.splitlines() + r.stderr.splitlines():
        m = re.search(r"frame:(\d+)\s+pts:", line)
        if m: cur = int(m.group(1))
        m = re.search(r"lavfi\.signalstats\.YAVG=([\d.]+)", line)
        if m and cur is not None: lum[cur] = float(m.group(1))
    n = len(lum)
    # 2) motion between frames at 1/4 resolution (mean abs diff of gray frames)
    cmd = ["ffmpeg", "-hide_banner", "-i", video, "-vf", "scale=270:480,format=gray", "-f", "rawvideo", "-"]
    raw = subprocess.run(cmd, capture_output=True, check=False).stdout
    w, h = 270, 480; fs = w * h
    prev, motion, count = None, [], 0
    for i in range(len(raw) // fs):
        f = raw[i * fs:(i + 1) * fs]
        if prev is not None:
            motion.append(sum(abs(a - b) for a, b in zip(f, prev)) / fs)
        prev = f; count += 1
    flags = []
    frames = []
    for i in range(count):
        y = lum.get(i)
        mv = motion[i - 1] if i >= 1 and i - 1 < len(motion) else None
        frames.append({"frame": i, "t": round(i / 30, 2), "luma": y, "motion": None if mv is None else round(mv, 2)})
        if y is not None and y < 60: flags.append({"frame": i, "t": round(i / 30, 2), "issue": "dark (luma<60)"})
        if y is not None and y > 200: flags.append({"frame": i, "t": round(i / 30, 2), "issue": "blown out (luma>200)"})
        if mv is not None and mv < 0.3: flags.append({"frame": i, "t": round(i / 30, 2), "issue": "frozen (motion<0.3)"})
        if mv is not None and mv > 25: flags.append({"frame": i, "t": round(i / 30, 2), "issue": "flash or cut (motion>25)"})
    # 3) contact sheets: every 15th frame, 180 px wide tiles, 6 per row, 10 per sheet
    step, per = 15, 60
    picks = list(range(0, count, step))
    for s in range(0, len(picks), per):
        chunk = picks[s:s + per]
        sel = "+".join(f"eq(n\\,{i})" for i in chunk)
        vf = f"select='{sel}',scale=180:-1,tile=6x{(len(chunk) + 5) // 6}"
        run(["ffmpeg", "-y", "-hide_banner", "-i", video, "-vf", vf, "-frames:v", "1", "-q:v", "4",
             os.path.join(out, f"sheet_{s // per:02d}.jpg")])
    json.dump({"video": video, "frames": count, "flags": flags, "per_frame": frames},
              open(os.path.join(out, "report.json"), "w"), ensure_ascii=False)
    print(json.dumps({"frames": count, "flagged": len(flags), "sheets": (len(picks) + per - 1) // per,
                      "first_flags": flags[:15]}, ensure_ascii=False))

if __name__ == "__main__":
    main()
