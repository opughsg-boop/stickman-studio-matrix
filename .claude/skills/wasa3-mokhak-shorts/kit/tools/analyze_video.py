#!/usr/bin/env python3
"""Measure the style of a reference video -> JSON profile.
   python3 analyze_video.py ref.mp4 [--out ../references/profile_<name>.json]
Measures: size/fps/duration, loudness, pauses, cut count & shot length, camera-motion energy,
palette, caption band (white text with black outline) position and words/sec."""
import cv2, json, re, subprocess, sys, argparse, numpy as np

def run(c): return subprocess.run(c, capture_output=True, text=True)

def audio_stats(p):
    e = run(["ffmpeg", "-nostats", "-i", p, "-af", "ebur128=peak=true", "-f", "null", "-"]).stderr
    s = e[e.rfind("Summary"):]
    g = lambda r: (lambda m: float(m.group(1)) if m else None)(re.search(r, s))
    sil = run(["ffmpeg", "-nostats", "-i", p, "-af", "silencedetect=n=-35dB:d=0.25", "-f", "null", "-"]).stderr
    st = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", sil)]
    return dict(lufs=g(r"I:\s+(-?[\d.]+) LUFS"), lra=g(r"LRA:\s+([\d.]+) LU"), true_peak=g(r"Peak:\s+(-?[\d.]+) dBFS"), pause_starts=[round(x, 2) for x in st])

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("video"); ap.add_argument("--out"); o = ap.parse_args()
    cap = cv2.VideoCapture(o.video); fps = cap.get(cv2.CAP_PROP_FPS); n = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    W, H = int(cap.get(3)), int(cap.get(4)); dur = n / fps; step = max(1, round(fps / 10))
    prev = None; motion = []; cuts = []; samples = 0; pix = []; ti = []
    for i in range(n):
        ok = cap.grab()
        if not ok: break
        if i % step: continue
        ok, fr = cap.retrieve(); small = cv2.resize(fr, (180, 320)); g = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY).astype(np.float32)
        if prev is not None:
            d = float(np.abs(g - prev).mean()); motion.append(d)
            if d > 40: cuts.append(round(i / fps, 2))
        prev = g
        white = (small.min(axis=2) >= 245).astype(np.uint8); black = (small.max(axis=2) <= 25).astype(np.uint8)
        text = white & cv2.dilate(black, np.ones((5, 5), np.uint8)); text[:int(320 * .5)] = 0   # text only in lower half
        samples += 1; ti.append(text)
        if (samples % 3) == 0: pix.append(small.reshape(-1, 3))
    A = np.array(ti); present = (A.sum(axis=(1, 2)) > 25).mean() if len(A) else 0
    ys = np.where(A.sum(axis=(0, 2)) > A.shape[0] * 0.5)[0] if len(A) else []
    band = [round(float(ys.min() / 320), 3), round(float(ys.max() / 320), 3)] if len(ys) else None
    ch = 0
    for a, b in zip(A[:-1], A[1:]):
        sa, sb = a.sum(), b.sum()
        if sa > 25 and sb > 25 and (a & b).sum() / max(1, (a | b).sum()) < 0.35: ch += 1
        elif (sa > 25) != (sb > 25): ch += 1
    P = np.concatenate(pix).astype(np.float32); K = 6
    _, lab, cen = cv2.kmeans(P[::max(1, len(P) // 40000)], K, None, (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 20, 1.0), 3, cv2.KMEANS_PP_CENTERS)
    share = np.bincount(lab.flatten(), minlength=K) / len(lab)
    pal = [dict(hex="#%02x%02x%02x" % tuple(int(v) for v in c[::-1]), share=round(float(s), 3)) for c, s in sorted(zip(cen, share), key=lambda x: -x[1])]
    m = np.array(motion)
    shots = np.diff([0] + cuts + [dur]) if cuts else np.array([dur])
    prof = dict(file=o.video, width=W, height=H, fps=round(fps, 3), duration=round(dur, 2), **audio_stats(o.video),
                hard_cuts=len(cuts), cut_times=cuts, avg_shot_len=round(float(shots.mean()), 2),
                camera_motion_mean=round(float(m.mean()), 2), camera_motion_p95=round(float(np.percentile(m, 95)), 2), static_share=round(float((m < 0.5).mean()), 3),
                caption_present_share=round(float(present), 2), caption_band_y=band, caption_changes_per_sec=round(ch / dur, 2), palette=pal)
    s = json.dumps(prof, indent=1, ensure_ascii=False); print(s)
    if o.out: open(o.out, "w").write(s)

main()
