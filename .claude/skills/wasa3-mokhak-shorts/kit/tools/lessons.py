#!/usr/bin/env python3
"""Self-improvement memory. Lessons live in ../memory/lessons.jsonl (one JSON per line).
  lessons.py brief [--area A] [--n 25]      # READ THIS BEFORE EVERY BUILD (top rules by severity*count)
  lessons.py add KEY "text" [--area A] [--sev 1-3] [--source user|postmortem|build]
  lessons.py list | resolve KEY "note"
Same KEY again => count += 1 (a repeated mistake rises in the brief). Importable: add_lesson(...)."""
import json, os, sys, time, argparse
MEM = os.environ.get("KIT_MEMORY") or os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "memory", "lessons.jsonl")

def load():
    if not os.path.exists(MEM): return []
    return [json.loads(l) for l in open(MEM, encoding="utf-8") if l.strip()]

def save(rows):
    os.makedirs(os.path.dirname(MEM), exist_ok=True)
    with open(MEM, "w", encoding="utf-8") as f:
        for r in rows: f.write(json.dumps(r, ensure_ascii=False) + "\n")

def add_lesson(key, text, area="general", sev=2, source="build"):
    rows = load(); now = time.strftime("%Y-%m-%d")
    for r in rows:
        if r["key"] == key:
            r["count"] += 1; r["last"] = now; r["status"] = "open"
            r["sev"] = max(r["sev"], sev); save(rows); return r
    r = dict(key=key, text=text, area=area, sev=sev, source=source, count=1, first=now, last=now, status="open")
    rows.append(r); save(rows); return r

def brief(area=None, n=25):
    rows = [r for r in load() if r["status"] == "open" and (not area or r["area"] == area)]
    rows.sort(key=lambda r: -(r["sev"] * (1 + r["count"])))
    for r in rows[:n]:
        print(f"[{r['area']}|sev{r['sev']}|x{r['count']}] {r['text']}")
    print(f"-- {len(rows)} open lessons ({min(n, len(rows))} shown)")

if __name__ == "__main__":
    a = sys.argv[1:] or ["brief"]
    p = argparse.ArgumentParser(); p.add_argument("cmd"); p.add_argument("key", nargs="?"); p.add_argument("text", nargs="?")
    p.add_argument("--area", default=None); p.add_argument("--sev", type=int, default=2); p.add_argument("--source", default="user"); p.add_argument("--n", type=int, default=25)
    o = p.parse_args(a)
    if o.cmd == "brief": brief(o.area, o.n)
    elif o.cmd == "add": print(add_lesson(o.key, o.text, o.area or "general", o.sev, o.source))
    elif o.cmd == "list":
        for r in load(): print(r["status"], r["key"], r["count"], r["text"][:90])
    elif o.cmd == "resolve":
        rows = load()
        for r in rows:
            if r["key"] == o.key: r["status"] = "resolved"; r["note"] = o.text
        save(rows)
