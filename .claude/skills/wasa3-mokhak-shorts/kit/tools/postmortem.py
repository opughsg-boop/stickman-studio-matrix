#!/usr/bin/env python3
"""QA + self-improvement loop. Run on EVERY finished video.
  python3 postmortem.py out.mp4 --slug name [--profile ../references/profile_chicken_coop.json] [--no-captions] [--no-learn]
Checks container, loudness, black/frozen frames, dead camera, stagnant windows, repeated shots, captions.
Writes reports/<slug>.md + a contact sheet, and files every issue into memory/lessons.jsonl
(repeats raise the lesson's count so the next build's `lessons.py brief` shows it first)."""
import cv2, json, os, re, subprocess, sys, argparse, time
import numpy as np
from scipy.spatial.distance import cdist
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lessons import add_lesson
HERE = os.path.dirname(os.path.abspath(__file__))
def run(c): return subprocess.run(c, capture_output=True, text=True)

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("video"); ap.add_argument("--slug", default="video"); ap.add_argument("--profile")
    ap.add_argument("--no-captions", action="store_true"); ap.add_argument("--no-learn", action="store_true"); ap.add_argument("--size", default="1080x1920"); ap.add_argument("--fade-at", type=float)
    o = ap.parse_args(); V = o.video; issues = []
    def bad(id, sev, msg, fix, area): issues.append(dict(id=id, sev=sev, msg=msg, fix=fix, area=area))
    prof = json.load(open(o.profile)) if o.profile else {}
    pj = json.loads(run(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", V]).stdout)
    vs = [s for s in pj["streams"] if s["codec_type"] == "video"][0]; au = [s for s in pj["streams"] if s["codec_type"] == "audio"]
    fps = eval(vs["r_frame_rate"]); W, H = vs["width"], vs["height"]; dur = float(pj["format"]["duration"])
    if abs(fps - 30) > 0.01: bad("fps", 3, f"fps={fps:.2f}, required 30", "Render 30 fps natively; set -framerate 30 and -r 30.", "pipeline")
    if f"{W}x{H}" != o.size: bad("size", 2, f"size {W}x{H}, expected {o.size}", "Export 1080x1920 (upscale drafts with lanczos).", "pipeline")
    if not au: bad("no-audio", 3, "no audio stream", "Mux the user's voice + mix.wav.", "audio")
    else:
        ad = float(au[0].get("duration", dur))
        if abs(ad - dur) > 0.15: bad("av-drift", 2, f"audio {ad:.2f}s vs video {dur:.2f}s", "Video length must equal voice length; trim/pad tail.", "pipeline")
        e = run(["ffmpeg", "-nostats", "-i", V, "-af", "ebur128=peak=true", "-f", "null", "-"]).stderr; s = e[e.rfind("Summary"):]
        I = re.search(r"I:\s+(-?[\d.]+) LUFS", s); TP = re.search(r"Peak:\s+(-?[\d.]+) dBFS", s)
        if I and abs(float(I.group(1)) + 14) > 1.5: bad("lufs", 2, f"loudness {I.group(1)} LUFS (target -14)", "Run mix.py (loudnorm I=-14).", "audio")
        if TP and float(TP.group(1)) > -0.9: bad("true-peak", 1, f"true peak {TP.group(1)} dBFS (>-1)", "Limit to -1.5 dBTP in mix.py.", "audio")
    fz = run(["ffmpeg", "-nostats", "-i", V, "-vf", "freezedetect=n=0.0005:d=0.4,blackdetect=d=0.12:pix_th=0.05", "-an", "-f", "null", "-"]).stderr
    frozen = re.findall(r"freeze_duration: ([\d.]+)", fz); blk = re.findall(r"black_duration:([\d.]+)", fz)
    if frozen: bad("frozen", 3, f"{len(frozen)} frozen span(s), longest {max(map(float, frozen)):.1f}s", "Nothing may hold still >0.4 s: add creep zoom, idle motion, particles.", "motion")
    long_blk = [float(b) for b in blk if float(b) > 0.6]
    if long_blk: bad("black", 3, f"black span {max(long_blk):.1f}s", "Only the pivot fade may go black (<=0.4 s).", "pipeline")
    cap = cv2.VideoCapture(V); n = int(cap.get(7)); step = max(1, round(fps / 6)); G = []; T = []; ci = []
    for i in range(n):
        if not cap.grab(): break
        if i % step: continue
        _, fr = cap.retrieve(); sm = cv2.resize(fr, (90, 160)); G.append(cv2.cvtColor(sm, cv2.COLOR_BGR2GRAY).astype(np.float32))
        w = (sm.min(axis=2) >= 245).astype(np.uint8); b = (sm.max(axis=2) <= 25).astype(np.uint8)
        t = w & cv2.dilate(b, np.ones((3, 3), np.uint8)); t[:80] = 0; T.append(int(t.sum()))
        ci.append(i)
    G = np.array(G); sps = fps / step; m = np.abs(np.diff(G, axis=0)).mean(axis=(1, 2))
    dead = (m < 0.6).astype(int); runs = []; r = 0
    for v in dead:
        r = r + 1 if v else 0; runs.append(r)
    if runs and max(runs) / sps > 0.7: bad("dead-camera", 2, f"near-static for {max(runs) / sps:.1f}s", "Camera must always move (push-in creep); add ambient motion.", "motion")
    k = int(2 * sps); stag = [float(np.abs(G[i + k] - G[i]).mean()) < 7 for i in range(0, len(G) - k, max(1, k // 2))]
    if stag and np.mean(stag) > 0.15: bad("stagnant", 2, f"{np.mean(stag) * 100:.0f}% of 2s windows show no visual change", "Change view/prop/annotation every 1.5-3 s.", "motion")
    Wn = 6; F = G[:, ::2, ::2].reshape(len(G), -1)
    st = list(range(0, len(G) - Wn, 3)); rep = 0; seen = set()
    if len(st) >= 2: V2 = np.array([F[s:s + Wn].ravel() for s in st]); D = cdist(V2, V2, "cityblock") / V2.shape[1]
    else: st = []
    for a in range(len(st)):
        for b in range(a + 1, len(st)):
            if st[b] - st[a] >= int(3 * sps) and D[a, b] < 6.5 and m[st[a]:st[a] + Wn - 1].mean() > 0.8 and (a // 2) not in seen: rep += 1; seen.add(a // 2); break
    if rep >= 2: bad("repeat", 3, f"{rep} repeated shot segment(s)", "Build new props/views per sentence; never loop a shot.", "visual")
    if not o.no_captions:
        pres = np.mean(np.array(T) > 8)
        if pres < 0.6: bad("captions", 2, f"captions visible in only {pres * 100:.0f}% of frames", "Burn captions (tools/captions.py) 1-3 words, synced.", "caption")
    dd = np.abs(np.diff(G, axis=0)).mean(axis=(1, 2)); tt = np.array(ci[1:]) / fps
    ok = np.ones(len(dd), bool) if o.fade_at is None else np.abs(tt - o.fade_at) > 0.7      # ignore the intentional pivot fade
    hc = int(((dd > 40) & ok).sum())
    if hc > 2 and prof.get("hard_cuts", 0) == 0: bad("hard-cuts", 2, f"{hc} hard cuts, reference style has none", "Blend camera continuously between shots.", "motion")
    os.makedirs(os.path.join(HERE, "..", "reports"), exist_ok=True)
    idx = np.linspace(0, n - 1, 12).astype(int); tiles = []
    for j in idx:
        cap.set(1, int(j)); ok, fr = cap.read()
        if ok: tiles.append(cv2.resize(fr, (180, 320)))
    sheet = os.path.join(HERE, "..", "reports", f"{o.slug}_sheet.jpg")
    if tiles: cv2.imwrite(sheet, np.vstack([np.hstack(tiles[i:i + 6]) for i in range(0, len(tiles) - len(tiles) % 6, 6)]))
    rp = os.path.join(HERE, "..", "reports", f"{o.slug}.md")
    with open(rp, "w", encoding="utf-8") as f:
        f.write(f"# Postmortem: {o.slug} ({time.strftime('%Y-%m-%d %H:%M')})\n{W}x{H} @ {fps:.2f} fps, {dur:.1f}s\n\n")
        f.write("PASS: no issues\n" if not issues else "| sev | id | finding | fix |\n|---|---|---|---|\n" + "".join(f"| {i['sev']} | {i['id']} | {i['msg']} | {i['fix']} |\n" for i in issues))
        f.write("\nHUMAN LOOK (do not skip): open the contact sheet; check framing, caption legibility/shaping, repeated looks, camera variety.\n")
    for i in issues:
        print(f"[sev{i['sev']}] {i['id']}: {i['msg']}  -> {i['fix']}")
        if not o.no_learn: add_lesson("pm:" + i["id"], f"{i['msg']}. {i['fix']}", i["area"], i["sev"], "postmortem")
    print(("PASS" if not issues else f"{len(issues)} issue(s)") + f"  report: {rp}")
    sys.exit(2 if any(i["sev"] == 3 for i in issues) else 0)
main()
