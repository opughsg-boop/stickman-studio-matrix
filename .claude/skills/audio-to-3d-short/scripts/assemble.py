#!/usr/bin/env python3
"""shots.json + audio -> final.mp4 (9:16, camera moves, burned word-synced captions, original audio).
Shot media priority: shot.asset -> --gen-cmd output -> gradient placeholder."""
import argparse, json, os, shlex, subprocess, sys
from PIL import Image, ImageDraw, ImageFont

W, H, FPS = 1080, 1920, 30
PALETTES = [((40,150,230),(190,235,250)), ((20,120,150),(120,215,215)), ((60,60,120),(150,160,220)),
            ((200,120,60),(250,210,150)), ((40,110,70),(170,220,150))]
IMG = {".png", ".jpg", ".jpeg", ".webp"}

def run(cmd):
    r = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True)
    if r.returncode: sys.exit(r.stderr[-1500:])

def placeholder(shot, path):
    top, bot = PALETTES[shot["id"] % len(PALETTES)]
    im = Image.new("RGB", (W, H)); px = im.load()
    for y in range(H):
        t = y / H; c = tuple(int(top[i]*(1-t)+bot[i]*t) for i in range(3))
        for x in range(W): px[x, y] = c
    d = ImageDraw.Draw(im)
    try: f = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 54)
    except Exception: f = ImageFont.load_default()
    txt = (shot.get("prompt") or shot["narration"])[:140]
    words, lines, ln = txt.split(), [], ""
    for w in words:
        if len(ln + w) > 22: lines.append(ln); ln = ""
        ln += w + " "
    lines.append(ln)
    y = H//2 - 40*len(lines)
    for l in lines:
        d.text((W//2, y), l.strip(), font=f, fill=(255,255,255), anchor="mm"); y += 80
    im.save(path)

# camera: (zoom0, zoom1, pan dx, pan dy, shake) in fractions of travel room
CAM = {"push_in": (1.00, 1.22, 0, 0, 0), "pull_out": (1.22, 1.00, 0, 0, 0),
       "drift_l": (1.15, 1.15, -1, 0, 0), "drift_r": (1.15, 1.15, 1, 0, 0),
       "tilt_up": (1.15, 1.15, 0, -1, 0), "tilt_down": (1.15, 1.15, 0, 1, 0),
       "shake": (1.10, 1.10, 0, 0, 1), "whip": (1.00, 1.60, 0, 0, 0)}

def camera_vf(cam, dur):
    z0, z1, dx, dy, sh = CAM.get(cam, CAM["push_in"])
    z = f"({z0}+({z1}-{z0})*min(t/{dur:.3f},1))"
    if cam == "whip": z = f"(1+0.6*pow(min(t/{dur:.3f},1),3))"
    pw, ph = int(W*1.25)//2*2, int(H*1.25)//2*2   # >= crop size even at zoom 1, leaves pan room
    cx = f"(in_w-{W})/2+{dx}*(in_w-{W})/2*(t/{dur:.3f}*2-1)*0.8"
    cy = f"(in_h-{H})/2+{dy}*(in_h-{H})/2*(t/{dur:.3f}*2-1)*0.8"
    if sh: cx += "+14*sin(t*37)+6*sin(t*71)"; cy += "+14*cos(t*29)+6*sin(t*53)"
    vf = (f"scale={pw}:{ph}:force_original_aspect_ratio=increase,crop={pw}:{ph},"
          f"scale=w='trunc({pw}*{z}/2)*2':h='trunc({ph}*{z}/2)*2':eval=frame,"
          f"crop={W}:{H}:x='{cx}':y='{cy}',fps={FPS},format=yuv420p")
    if cam == "whip": vf += f",boxblur=enable='gt(t,{dur*0.7:.3f})':luma_radius=10:luma_power=2"
    return vf

def make_clip(shot, args, wd):
    out = f"{wd}/clips/{shot['id']:03d}.mp4"
    if os.path.exists(out) and not args.force: return out
    dur = shot["end"] - shot["start"]
    src = shot.get("asset")
    if not src and args.gen_cmd and shot.get("prompt"):
        gen = f"{wd}/assets/{shot['id']:03d}.mp4"
        if not os.path.exists(gen):
            cmd = args.gen_cmd.format(prompt=shlex.quote(shot["prompt"]), out=shlex.quote(gen), dur=f"{dur:.2f}",
                                      id=shot["id"], camera=shot["camera"])
            subprocess.run(cmd, shell=True, check=True)
        src = gen
    if not src:
        src = f"{wd}/assets/{shot['id']:03d}.png"; placeholder(shot, src)
    pre = ["-loop", "1", "-framerate", str(FPS)] if os.path.splitext(src)[1].lower() in IMG else ["-stream_loop", "-1"]
    run(["ffmpeg", "-y", "-v", "error", *pre, "-i", src, "-t", f"{dur:.3f}", "-an",
         "-vf", camera_vf(shot.get("camera", "push_in"), dur), "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", out])
    return out

def ts(t):
    h, m, s = int(t//3600), int(t%3600//60), t%60
    return f"{h}:{m:02d}:{s:05.2f}"

def build_ass(data, font, path):
    hdr = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding
Style: Cap,{font},74,&H00FFFFFF,&H00FFFFFF,&H99000000,&H80000000,1,0,0,0,100,100,0,0,1,5,4,2,60,60,400,1
Style: Big,{font},190,&H004040FF,&H004040FF,&H00FFFFFF,&H80000000,1,0,0,0,100,100,0,0,1,6,6,8,60,60,330,1

[Events]
Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text
"""
    ev = []
    for s in data["shots"]:
        for c in s["captions"]:
            ev.append(f"Dialogue: 1,{ts(c['start'])},{ts(c['end'])},Cap,,0,0,0,,"
                      r"{\fscx82\fscy82\t(0,90,\fscx100\fscy100)}" + c["text"].replace("\n", " "))
        o = s.get("overlay")
        if o and o.get("text"):
            ev.append(f"Dialogue: 2,{ts(s['start']+0.1)},{ts(s['end'])},Big,,0,0,0,,"
                      r"{\fad(120,0)\fscx60\fscy60\t(0,200,\fscx100\fscy100)}" + o["text"])
    with open(path, "w", encoding="utf-8") as fh: fh.write(hdr + "\n".join(ev) + "\n")

def main():
    a = argparse.ArgumentParser()
    a.add_argument("--shots", default="work/shots.json"); a.add_argument("--audio", required=True)
    a.add_argument("--out", default="out/final.mp4"); a.add_argument("--work", default="work")
    a.add_argument("--gen-cmd"); a.add_argument("--font", default="DejaVu Sans"); a.add_argument("--force", action="store_true")
    args = a.parse_args()
    data = json.load(open(args.shots, encoding="utf-8")); wd = args.work
    for d in ("clips", "assets"): os.makedirs(f"{wd}/{d}", exist_ok=True)
    os.makedirs(os.path.dirname(args.out) or ".", exist_ok=True)
    clips = []
    for s in data["shots"]:
        clips.append(make_clip(s, args, wd)); print(f"shot {s['id']:03d} {s['end']-s['start']:.2f}s {s.get('camera')}", file=sys.stderr)
    lst = f"{wd}/concat.txt"
    with open(lst, "w") as fh: fh.write("".join(f"file '{os.path.abspath(c)}'\n" for c in clips))
    ass = f"{wd}/captions.ass"; build_ass(data, args.font, ass)
    run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", lst, "-i", args.audio,
         "-vf", f"ass={ass}", "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-preset", "medium", "-crf", "18",
         "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", args.out])
    print("->", args.out)
main()
