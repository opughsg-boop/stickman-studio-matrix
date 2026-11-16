#!/usr/bin/env python3
"""Validate a story.json against the style rules and emit timeline.json (frames @30 fps).
   python3 storyboard.py story.json --duration 30.2 [--out work/timeline.json]
Rules (from the reference video + lessons): shots tile [0,duration]; shot 1.2-4.5 s (avg 1.8-3.2);
no two consecutive identical camera moves; >=40% zoom moves (push_in/pull_out); fx on >=50% of shots;
every shot names world/focus/props (no shot reuse); fade (pivot) inside the video."""
import json, argparse, sys
MOVES = {"push_in", "pull_out", "orbit", "dolly", "crane_up", "crane_down", "whip_pan", "tilt_down", "rack_focus", "drift"}
FXS = {"shockwave", "sparks", "arrow", "flash", "pulse", "impact", "outro", "gauge"}
def main():
    ap = argparse.ArgumentParser(); ap.add_argument("story"); ap.add_argument("--duration", type=float, required=True); ap.add_argument("--out"); o = ap.parse_args()
    S = json.load(open(o.story)); sh = S["shots"]; err = []; warn = []; fps = S.get("fps", 30)
    if abs(sh[0]["t0"]) > 1e-6: err.append("first shot must start at 0")
    if abs(sh[-1]["t1"] - o.duration) > 0.05: err.append(f"last shot ends {sh[-1]['t1']} but audio is {o.duration}")
    for i, s in enumerate(sh):
        d = s["t1"] - s["t0"]
        if i and abs(s["t0"] - sh[i - 1]["t1"]) > 1e-6: err.append(f"{s['id']}: gap/overlap with previous")
        if d < 1.2: warn.append(f"{s['id']}: {d:.1f}s is very short")
        if d > 4.5: err.append(f"{s['id']}: {d:.1f}s > 4.5s, split it or add a new prop/annotation phase")
        c = s.get("camera", {})
        if c.get("move") not in MOVES: err.append(f"{s['id']}: camera.move must be one of {sorted(MOVES)}")
        if i and c.get("move") == sh[i - 1].get("camera", {}).get("move"): warn.append(f"{s['id']}: same move as previous shot")
        for f in s.get("fx", []):
            if f not in FXS: err.append(f"{s['id']}: unknown fx {f}")
        for k in ("world", "focus"):
            if not s.get(k): err.append(f"{s['id']}: missing {k}")
    L = [s["t1"] - s["t0"] for s in sh]; avg = sum(L) / len(L)
    if not 1.8 <= avg <= 3.2: warn.append(f"average shot length {avg:.2f}s (target 1.8-3.2)")
    z = sum(s["camera"]["move"] in ("push_in", "pull_out") for s in sh) / len(sh)
    if z < 0.4: warn.append(f"only {z * 100:.0f}% zoom in/out moves (target >=40%)")
    fx = sum(bool(s.get("fx")) for s in sh) / len(sh)
    if fx < 0.5: warn.append(f"fx on {fx * 100:.0f}% of shots (target >=50%)")
    keys = [(s.get("world"), s.get("focus"), s["camera"]["move"]) for s in sh]
    if len(set(keys)) < len(keys): err.append("two shots share world+focus+move (repeat): vary them")
    if "outro" not in sh[-1].get("fx", []): err.append("last shot must carry fx [\"outro\"] = like/follow end card (\u0648\u0633\u0651\u0639 \u0645\u062e\u0643) with the spoken CTA")
    if not S.get("fade") or not (0 < S["fade"]["at"] < o.duration): warn.append("no pivot fade defined")
    tl = [dict(id=s["id"], f0=round(s["t0"] * fps), f1=round(s["t1"] * fps), **{k: s.get(k) for k in ("world", "focus", "camera", "fx", "props", "show", "grade", "bg")}) for s in sh]
    if o.out: json.dump(dict(fps=fps, frames=round(o.duration * fps), shots=tl, fade=S.get("fade"), scene=S.get("scene"), persist=S.get("persist")), open(o.out, "w"), indent=1)
    print(f"{len(sh)} shots, avg {avg:.2f}s, zoom {z * 100:.0f}%, fx {fx * 100:.0f}%, frames {round(o.duration * fps)}")
    for w in warn: print("WARN", w)
    for e in err: print("ERROR", e)
    sys.exit(1 if err else 0)
main()
