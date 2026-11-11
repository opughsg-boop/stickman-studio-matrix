#!/usr/bin/env python3
"""words.json -> shots.json: ~1.2-2.6s shots on phrase boundaries + 2-3 word caption chunks."""
import argparse, json, re

END_P = re.compile(r"[.!?؟,;:،]$")

def chunks(words, maxw=3):
    out, cur = [], []
    for w in words:
        cur.append(w)
        gap = False
        if len(cur) >= maxw or END_P.search(w["w"]):
            out.append(cur); cur = []
    if cur: out.append(cur)
    # merge dangling 1-word chunks into neighbour when it stays <=3 words and no punctuation break
    return out

def main():
    a = argparse.ArgumentParser(); a.add_argument("words"); a.add_argument("-o", default="work/shots.json")
    a.add_argument("--min", type=float, default=1.2); a.add_argument("--max", type=float, default=2.6)
    a = a.parse_args()
    d = json.load(open(a.words, encoding="utf-8")); W = d["words"]
    caps = [{"text": " ".join(x["w"] for x in c), "start": c[0]["start"], "end": c[-1]["end"]} for c in chunks(W)]
    # make captions continuous: each stays until next starts (cap gap at 0.35s)
    for i, c in enumerate(caps[:-1]): c["end"] = min(caps[i+1]["start"], c["end"] + 0.35)
    shots, cur = [], []
    def flush():
        if cur: shots.append(cur[:])
    for c in caps:
        if cur and (c["end"] - cur[0]["start"] > a.max or
                    (c["start"] - cur[0]["start"] >= a.min and END_P.search(cur[-1]["text"]))):
            flush(); cur.clear()
        cur.append(c)
    flush()
    out = []
    for i, s in enumerate(shots):
        start = 0.0 if i == 0 else s[0]["start"]
        end = d["duration"] if i == len(shots)-1 else shots[i+1][0]["start"]
        out.append({"id": i, "start": round(start,3), "end": round(end,3), "narration": " ".join(c["text"] for c in s),
                    "prompt": "", "camera": "push_in", "overlay": None, "asset": None, "captions": s})
    json.dump({"duration": d["duration"], "shots": out}, open(a.o, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"{len(out)} shots, avg {d['duration']/len(out):.2f}s -> {a.o}")
main()
