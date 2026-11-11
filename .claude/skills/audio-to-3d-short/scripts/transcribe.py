#!/usr/bin/env python3
"""Audio -> words.json [{w,start,end}] using faster-whisper, or a transcript fallback."""
import argparse, json, re, subprocess, sys

def duration(path):
    return float(subprocess.check_output(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",path]).decode())

def load_pcm(path):
    # decode with ffmpeg ourselves: avoids PyAV version mismatches inside faster-whisper
    import numpy as np
    raw = subprocess.check_output(["ffmpeg","-v","error","-i",path,"-vn","-ac","1","-ar","16000","-f","f32le","-"])
    return np.frombuffer(raw, dtype="float32")

def syl(w):
    return max(1, len(re.findall(r"[aeiouyاوي]+", w.lower())) ) + len(w)/8

def from_transcript(text, dur):
    words = text.split()
    wt = [syl(w) for w in words]; tot = sum(wt); t = 0.0; out = []
    for w, k in zip(words, wt):
        d = dur * k / tot
        out.append({"w": w, "start": round(t,3), "end": round(t+d,3)}); t += d
    return out

def main():
    a = argparse.ArgumentParser()
    a.add_argument("audio"); a.add_argument("-o", default="work/words.json")
    a.add_argument("--transcript"); a.add_argument("--lang"); a.add_argument("--model", default="small")
    a = a.parse_args()
    import os; os.makedirs(os.path.dirname(a.o) or ".", exist_ok=True)
    dur = duration(a.audio)
    words = None
    try:
        from faster_whisper import WhisperModel
        m = WhisperModel(a.model, device="auto", compute_type="int8")
        segs, _ = m.transcribe(load_pcm(a.audio), language=a.lang, word_timestamps=True, vad_filter=True)
        words = [{"w": w.word.strip(), "start": round(w.start,3), "end": round(w.end,3)}
                 for s in segs for w in s.words if w.word.strip()]
    except Exception as e:
        print(f"[transcribe] whisper unavailable ({type(e).__name__}: {e})", file=sys.stderr)
    if not words:
        if not a.transcript: sys.exit("No whisper result; pass --transcript script.txt")
        words = from_transcript(open(a.transcript, encoding="utf-8").read(), dur)
    json.dump({"duration": dur, "words": words}, open(a.o, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"{len(words)} words, {dur:.1f}s -> {a.o}")
main()
