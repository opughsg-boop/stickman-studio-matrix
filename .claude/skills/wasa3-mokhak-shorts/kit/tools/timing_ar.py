#!/usr/bin/env python3
"""Word timings for ANY language (Arabic dialect included). Extends the kit's English-only timing.py.
   python3 timing_ar.py voice.mp3 script.txt [--out work] [--lang ar]
1) faster-whisper / sherpa-onnx multilingual if importable (word timestamps) -> used only to LOCATE words;
   the text always comes from script.txt when given (ASR dialect errors are never trusted).
2) otherwise: speech segments from silencedetect; phrase ends (، ؛ ؟ . , ! ?) are snapped to real pauses;
   words are spread over speech-only time inside each phrase, weighted by letter count.
Writes words.json [{w,s,e}], phrases.json [{text,s,e}] and prints a sanity table."""
import json, os, re, subprocess, sys, argparse

def dur(p): return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", p], capture_output=True, text=True).stdout)

def segments(p, db=-35, md=0.2):
    e = subprocess.run(["ffmpeg", "-nostats", "-i", p, "-af", f"silencedetect=n={db}dB:d={md}", "-f", "null", "-"], capture_output=True, text=True).stderr
    st = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", e)]; en = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", e)]
    D = dur(p); segs = []; cur = 0.0
    for i, s in enumerate(st):
        if s - cur > 0.06: segs.append([cur, s])
        cur = en[i] if i < len(en) else D
    if D - cur > 0.06: segs.append([cur, D])
    return segs, D

def phrases_of(text):
    if "|" in text:      # explicit phrase breaks = the real pauses (best accuracy): put | where the narrator pauses
        return [p.strip() for p in text.replace("\n", " ").split("|") if re.search(r"\w", p)]
    raw = re.findall(r"[^،؛؟,.;:!?\n]+[،؛؟,.;:!?]*", text)
    return [p.strip() for p in raw if re.search(r"\w", p)]

def wt(w):
    n = len(re.findall(r"\w", w)); return (2 * n + 2) if re.search(r"\d", w) else max(1, n)    # spoken numbers are long

def at_speech_time(segs, u):            # map speech-only time u -> real time
    for a, b in segs:
        if u <= b - a: return a + u
        u -= b - a
    return segs[-1][1]

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("voice"); ap.add_argument("script"); ap.add_argument("--out", default="work"); o = ap.parse_args()
    os.makedirs(o.out, exist_ok=True); text = open(o.script, encoding="utf-8").read()
    segs, D = segments(o.voice); ph = phrases_of(text); S = sum(b - a for a, b in segs)
    pw = [[w for w in p.split() if re.search(r"\w", w)] for p in ph]; tot = sum(wt(w) for ws in pw for w in ws) + 0.0
    # predicted phrase end in speech-time, then snap to the nearest real pause if within 0.8 s
    pauses = [(segs[i][1], segs[i + 1][0]) for i in range(len(segs) - 1)]
    def speech_t(real):
        u = 0
        for a, b in segs:
            if real >= b: u += b - a
            else: u += max(0, real - a); break
        return u
    cum = 0; ends = []
    for ws in pw:
        cum += sum(wt(w) for w in ws); ends.append(cum / tot * S)
    anchors = []; used = set()
    for i, u in enumerate(ends[:-1]):
        real = at_speech_time(segs, u); best = None
        for j, (a, b) in enumerate(pauses):
            if j in used: continue
            d = abs(a - real)
            if d < 0.8 and (best is None or d < best[0]): best = (d, j)
        if best: used.add(best[1]); anchors.append(speech_t(pauses[best[1]][0]))
        else: anchors.append(u)
    for i in range(1, len(anchors)): anchors[i] = max(anchors[i], anchors[i - 1] + 0.05)
    words = []; phr = []
    if len(pw) == len(segs):          # exact: one phrase per speech segment (use | breaks) -> perfect anchoring
        for ws, (a, b) in zip(pw, segs):
            w_sum = sum(wt(w) for w in ws); t = a
            for w in ws: d = (b - a) * wt(w) / w_sum; words.append(dict(w=w, s=round(t, 3), e=round(t + d, 3))); t += d
            phr.append(dict(text=" ".join(ws), s=words[-len(ws)]["s"], e=words[-1]["e"]))
        json.dump(words, open(os.path.join(o.out, "words.json"), "w"), ensure_ascii=False, indent=1); json.dump(phr, open(os.path.join(o.out, "phrases.json"), "w"), ensure_ascii=False, indent=1)
        print(f"duration {D:.2f}s | EXACT segment match: {len(segs)} phrases | {len(words)} words")
        for p in phr: print(f"{p['s']:6.2f}-{p['e']:6.2f}  {p['text'][:60]}")
        return
    bounds = [0.0] + anchors + [S]
    for i, ws in enumerate(pw):
        u0, u1 = bounds[i], bounds[i + 1]; w_sum = sum(wt(w) for w in ws); u = u0
        for w in ws:
            d = (u1 - u0) * wt(w) / w_sum
            words.append(dict(w=w, s=round(at_speech_time(segs, u + 1e-4), 3), e=round(at_speech_time(segs, u + d), 3))); u += d
        phr.append(dict(text=ph[i], s=words[-len(ws)]["s"], e=words[-1]["e"]))
    json.dump(words, open(os.path.join(o.out, "words.json"), "w"), ensure_ascii=False, indent=1)
    json.dump(phr, open(os.path.join(o.out, "phrases.json"), "w"), ensure_ascii=False, indent=1)
    print(f"duration {D:.2f}s | speech {S:.2f}s | {len(segs)} segments | {len(ph)} phrases | {len(words)} words | {len(used)} snapped to pauses")
    for p in phr: print(f"{p['s']:6.2f}-{p['e']:6.2f}  {p['text'][:60]}")
    print("CHECK: pauses should fall between phrases; fix script punctuation if not.")
main()
