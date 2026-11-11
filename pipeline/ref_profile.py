#!/usr/bin/env python3
"""Learn a measurable style profile from reference videos.
Usage: ref_profile.py OUT.json VIDEO [VIDEO...]
Measures per video: shot cuts (histogram jump), average shot length, brightness, saturation,
dominant palette, motion energy, centre-vs-edge sharpness (depth of field proxy)."""
import sys, json, subprocess
import numpy as np

def frames(path, fps=10, w=96, h=170):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-vf', f'fps={fps},scale={w}:{h}', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, h, w, 3).astype(np.float32)

def hsv_sat(f):
    mx, mn = f.max(-1), f.min(-1); return np.where(mx > 0, (mx - mn) / np.maximum(mx, 1), 0)

def profile(path, fps=10):
    F = frames(path, fps); n = len(F); dur = n / fps
    hist = np.stack([np.concatenate([np.histogram(f[..., c], 16, (0, 255))[0] for c in range(3)]) for f in F]).astype(np.float32)
    hist /= hist.sum(1, keepdims=True)
    d = np.abs(np.diff(hist, axis=0)).sum(1)
    thr = max(.22, 3.5 * np.median(d))
    cuts = [i + 1 for i in range(len(d)) if d[i] > thr and (i == 0 or d[i] >= d[i - 1])]
    shots = np.diff([0] + cuts + [n]) / fps
    motion = np.abs(np.diff(F, axis=0)).mean((1, 2, 3))
    luma = (F @ [.299, .587, .114])
    gy = np.abs(np.diff(luma, axis=1)).mean
    c = luma[:, 50:120, 24:72]; e = np.concatenate([luma[:, :30], luma[:, -30:]], 1)
    sharp_c = np.abs(np.diff(c, axis=2)).mean(); sharp_e = np.abs(np.diff(e, axis=2)).mean()
    px = F[::5].reshape(-1, 3); q = (px // 32).astype(int); keys, cnt = np.unique(q[:, 0] * 64 + q[:, 1] * 8 + q[:, 2], return_counts=True)
    top = keys[np.argsort(-cnt)[:6]]
    pal = ['#%02x%02x%02x' % tuple(int(v * 32 + 16) for v in (k // 64, (k // 8) % 8, k % 8)) for k in top]
    return {'file': path.split('/')[-1], 'duration': round(dur, 2), 'cuts': len(cuts), 'avg_shot': round(float(shots.mean()), 2),
            'median_shot': round(float(np.median(shots)), 2), 'min_shot': round(float(shots.min()), 2),
            'luma': round(float(luma.mean()), 1), 'saturation': round(float(hsv_sat(F).mean()), 3),
            'motion': round(float(motion.mean()), 2), 'dof_ratio': round(float(sharp_c / max(sharp_e, 1e-3)), 2), 'palette': pal}

out, vids = sys.argv[1], sys.argv[2:]
P = [profile(v) for v in vids]
agg = {k: round(float(np.mean([p[k] for p in P])), 3) for k in ('avg_shot', 'median_shot', 'luma', 'saturation', 'motion', 'dof_ratio')}
json.dump({'videos': P, 'target': agg}, open(out, 'w'), indent=1)
for p in P: print(p)
print('TARGET', agg)
