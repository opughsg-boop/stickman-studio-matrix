#!/usr/bin/env python3
"""words.json -> ASS with ONE word at a time (uppercase, bold italic condensed, white + black outline, ~80% height)."""
import argparse, json, re
def ts(t): return f"{int(t//3600)}:{int(t%3600//60):02d}:{t%60:05.2f}"
a = argparse.ArgumentParser(); a.add_argument("words"); a.add_argument("-o", default="work/words.ass")
a.add_argument("--font", default="Bebas Neue"); a.add_argument("--size", type=int, default=120)
a.add_argument("--w", type=int, default=1080); a.add_argument("--h", type=int, default=1920); a = a.parse_args()
W = json.load(open(a.words, encoding="utf-8"))["words"]
hdr = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {a.w}
PlayResY: {a.h}
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding
Style: W,{a.font},{a.size},&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,1,1,0,0,100,100,2,0,1,7,3,2,40,40,{int(a.h*.17)},1

[Events]
Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text
"""
ev = []
for i, w in enumerate(W):
    end = W[i+1]["start"] if i+1 < len(W) and W[i+1]["start"] - w["end"] < .4 else w["end"] + .12
    txt = re.sub(r"[.,;:!?،؛]+$", "", w["w"]).upper()
    ev.append(f"Dialogue: 0,{ts(w['start'])},{ts(max(end, w['start']+.12))},W,,0,0,0,,{{\\fscx88\\fscy88\\t(0,80,\\fscx100\\fscy100)}}{txt}")
with open(a.o, "w", encoding="utf-8") as f: f.write(hdr + "\n".join(ev) + "\n")
print(len(ev), "words ->", a.o)
