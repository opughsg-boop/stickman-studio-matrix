#!/usr/bin/env python3
"""Word-synced captions in the reference look -> .ass, optionally burned in.
   python3 captions.py words.json out.ass [--lang ar] [--font Lalezar] [--fontsdir DIR] [--fix fixes.json]
        [--max-words 3] [--max-chars 22] [--y 0.80] [--size 1080x1920] [--upper] [--burn in.mp4 out.mp4]
Look: 1-3 words, bold white fill, thick black outline, bottom-third (y = text bottom as fraction of height), 80ms pop-in.
Arabic: needs a font with Arabic glyphs (Lalezar > Noto Sans Arabic Bold > DejaVu Sans Bold); libass shapes RTL."""
import json, argparse, subprocess, shutil, sys

def t(x): h = int(x // 3600); m = int(x % 3600 // 60); s = x % 60; return f"{h}:{m:02d}:{s:05.2f}"

def pick_font(name, lang):
    have = subprocess.run(["fc-list", ":", "family"], capture_output=True, text=True).stdout
    for f in ([name] if name else []) + (["Lalezar", "Noto Sans Arabic", "Noto Kufi Arabic", "DejaVu Sans"] if lang == "ar" else ["Barlow Condensed", "Inter Display", "Inter"]):
        if f and f.lower() in have.lower(): return f
    return "DejaVu Sans"

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("words"); ap.add_argument("out")
    ap.add_argument("--lang", default="ar"); ap.add_argument("--font"); ap.add_argument("--fontsdir"); ap.add_argument("--fix")
    ap.add_argument("--max-words", type=int, default=3); ap.add_argument("--max-chars", type=int, default=22); ap.add_argument("--y", type=float, default=0.80)
    ap.add_argument("--size", default="1080x1920"); ap.add_argument("--upper", action="store_true"); ap.add_argument("--burn", nargs=2); ap.add_argument("--callouts"); ap.add_argument("--brand"); ap.add_argument("--brand-from", type=float); ap.add_argument("--brand-to", type=float); ap.add_argument("--fs", type=int)
    o = ap.parse_args(); W, H = map(int, o.size.split("x")); words = json.load(open(o.words, encoding="utf-8"))
    fx = json.load(open(o.fix, encoding="utf-8")) if o.fix else {}
    import re
    for w in words: w["w"] = re.sub(r"[\.,،;:!؟?…\"“”]+$|^[\"“”]+", "", w["w"]) or w["w"]; w["w"] = fx.get(w["w"], w["w"]); w["w"] = w["w"].upper() if o.upper else w["w"]
    font = pick_font(o.font, o.lang); fs = o.fs or int(W * (0.092 if o.lang == "ar" else 0.10)); mv = int((1 - o.y) * H)
    groups = []; cur = []
    for w in words:
        if cur and (len(cur) >= o.max_words or len(" ".join(x["w"] for x in cur + [w])) > o.max_chars or w["s"] - cur[-1]["e"] > 0.45): groups.append(cur); cur = []
        cur.append(w)
    if cur: groups.append(cur)
    ev = []
    for i, g in enumerate(groups):
        s = max(0, g[0]["s"] - 0.04); nxt = groups[i + 1][0]["s"] - 0.02 if i + 1 < len(groups) else g[-1]["e"] + 0.5
        e = min(nxt, g[-1]["e"] + 0.6); e = max(e, s + 0.18)
        ev.append(f"Dialogue: 0,{t(s)},{t(e)},Cap,,0,0,0,,{{\\fscx82\\fscy82\\t(0,80,\\fscx100\\fscy100)}}{' '.join(x['w'] for x in g)}")
    if o.callouts:
        for k_ in json.load(open(o.callouts, encoding="utf-8")):
            ev.append(f"Dialogue: 2,{t(k_['t0'])},{t(k_['t1'])},Call,,0,0,0,,{{\\an5\\pos({int(k_.get('x', 0.5) * W)},{int(k_['y'] * H)})\\fscx70\\fscy70\\t(0,200,\\fscx100\\fscy100)}}{k_['text']}")
    if o.brand and o.brand_from is not None: ev.append(f"Dialogue: 1,{t(o.brand_from)},{t(o.brand_to or o.brand_from + 3)},Brand,,0,0,0,,{{\\fscx60\\fscy60\\t(0,260,\\fscx100\\fscy100)}}{o.brand}")
    hdr = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding
Style: Brand,{font},{int(W*0.15)},&H0000D4FF,&H00FFFFFF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,{max(8, W // 70)},4,5,60,60,0,1
Style: Call,{font},{int(W*0.095)},&H0000D4FF,&H00FFFFFF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,{max(7, W // 80)},4,5,60,60,0,1
Style: Cap,{font},{fs},&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,-1,{0 if o.lang == 'ar' else -1},0,0,100,100,0,0,1,{max(6, fs // 13)},3,2,60,60,{mv},1

[Events]
Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text
"""
    open(o.out, "w", encoding="utf-8").write(hdr + "\n".join(ev) + "\n"); print(f"{len(groups)} caption groups, font={font}, size={fs}, {o.out}")
    if o.burn:
        fd = f":fontsdir={o.fontsdir}" if o.fontsdir else ""
        r = subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", o.burn[0], "-vf", f"ass={o.out}{fd}", "-c:v", "libx264", "-crf", "17", "-pix_fmt", "yuv420p", "-c:a", "copy", o.burn[1]], capture_output=True, text=True)
        print(r.stderr or "burned", o.burn[1])
main()
