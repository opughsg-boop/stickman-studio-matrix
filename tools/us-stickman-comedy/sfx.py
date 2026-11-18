# python3 sfx.py cues.json out.wav  - synthesized SFX bed, no music
# cues.json: {"dur": 9.0, "tone": "room"|"night"|"none", "cues": [[t, "name", gain_db, {opts}], ...]}
import json, sys, numpy as np, wave
SR = 48000
rng = np.random.default_rng(1)
def env(n, a=.005, r=.1):
    t = np.arange(n) / SR; return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / max(r, 1e-4))
def noise(d): return rng.standard_normal(int(SR * d))
def lp(x, k=.05):
    if np.ndim(k) == 0:
        from scipy.signal import lfilter
        return lfilter([k], [1, k - 1], x)
    y = np.empty_like(x); acc = 0.
    for i in range(len(x)): acc += k[i] * (x[i] - acc); y[i] = acc
    return y
def hp(x, k=.05): return x - lp(x, k)
def tone(f, d, shape='sine'):
    t = np.arange(int(SR * d)) / SR; ph = 2 * np.pi * np.cumsum(np.broadcast_to(f, t.shape) if np.ndim(f) else np.full(t.shape, f)) / SR
    return np.sin(ph) if shape == 'sine' else np.sign(np.sin(ph)) * .5 if shape == 'square' else 2 * (ph / (2 * np.pi) % 1) - 1
L = {}
def sfx(fn): L[fn.__name__] = fn; return fn
@sfx
def pop(o): d = .12; f = np.linspace(900, 300, int(SR * d)); return tone(f, d) * env(int(SR * d), .002, .03)
@sfx
def tap(o): d = .05; return hp(noise(d), .3) * env(int(SR * d), .001, .008) * .8
@sfx
def tick(o): d = .03; return tone(2500, d) * env(int(SR * d), .0005, .004)
@sfx
def whoosh(o):
    d = o.get('d', .45); n = int(SR * d); x = noise(d); t = np.linspace(0, 1, n)
    return lp(x, .02 + .25 * np.sin(np.pi * t) ** 2) * np.sin(np.pi * t) ** 2 * 3
@sfx
def thud(o): d = .35; f = np.linspace(120, 45, int(SR * d)); return (tone(f, d) + .3 * lp(noise(d), .05)) * env(int(SR * d), .002, .09)
@sfx
def clink(o):
    d = .9; n = int(SR * d); return sum(tone(f, d) * env(n, .001, r) * g for f, r, g in [(2350, .25, 1), (3720, .18, .6), (5310, .1, .4), (1180, .3, .3)]) * .5
@sfx
def ding(o): d = 1.2; n = int(SR * d); return (tone(1320, d) + .5 * tone(2640, d) + .2 * tone(3960, d)) * env(n, .002, .35) * .5
@sfx
def alarm(o):
    d = o.get('d', 3); out = np.zeros(int(SR * d)); pat = [(1568, .09), (2093, .09), (1568, .09)]; t = 0.
    while t < d - .4:
        for f, ln in pat:
            s = int(SR * t); seg = (tone(f, ln, 'square') * .6 + tone(f * 2, ln) * .2) * env(int(SR * ln), .003, .2)
            out[s:s + len(seg)] += seg[:len(out) - s]; t += ln + .03
        t += .35
    return out * .7
@sfx
def buzz(o):
    d = o.get('d', 1.5); n = int(SR * d); t = np.arange(n) / SR
    g = ((t % .6) < .4).astype(float); return tone(160, d, 'saw') * lp(g, .01) * .4
@sfx
def snore(o):
    d = o.get('d', 1.6); n = int(SR * d); t = np.linspace(0, 1, n)
    am = (1 + np.sin(2 * np.pi * 38 * t * d)) / 2; return lp(noise(d), .04) * am * np.sin(np.pi * t) ** 1.5 * 2.2
@sfx
def gasp(o):
    d = .35; n = int(SR * d); t = np.linspace(0, 1, n); return hp(lp(noise(d), .25), .02) * np.sin(np.pi * t) ** .6 * 1.4
@sfx
def boing(o):
    d = .6; n = int(SR * d); t = np.arange(n) / SR; f = 220 + 90 * np.sin(2 * np.pi * 9 * t) * np.exp(-t * 4); return tone(f, d) * env(n, .003, .25)
@sfx
def riser(o):
    d = o.get('d', 1.5); n = int(SR * d); f = np.geomspace(200, 1400, n); return tone(f, d) * np.linspace(0, 1, n) ** 2 * .35 + lp(noise(d), .1) * np.linspace(0, 1, n) ** 2 * .4
@sfx
def heartbeat(o):
    d = o.get('d', 2); out = np.zeros(int(SR * d)); t = 0.
    while t < d - .3:
        for dt in (0, .18):
            s = int(SR * (t + dt)); seg = thud({})[: int(SR * .25)] * (1 if dt == 0 else .7); out[s:s + len(seg)] += seg[:len(out) - s]
        t += .8
    return out
@sfx
def scratch(o):
    d = .45; n = int(SR * d); t = np.linspace(0, 1, n); return hp(noise(d), .2) * np.abs(np.sin(2 * np.pi * 7 * t)) * (1 - t) * 1.2
@sfx
def sting(o):
    d = 1.0; n = int(SR * d); f = np.linspace(330, 180, n); return (tone(f, d, 'saw') * .3 + tone(f / 2, d) * .4) * env(n, .01, .5)
def bed(kind, d):
    n = int(SR * d)
    if kind == 'none': return np.zeros(n)
    x = lp(noise(d), .008) * (2.5 if kind == 'room' else 3.5)
    if kind == 'night':
        t = np.arange(n) / SR; x += tone(4300, d) * (((t * 14) % 1) < .25) * ((t % 2.3) < .9) * .02
    return x * .25
def main():
    cfg = json.load(open(sys.argv[1])); d = cfg['dur']; out = bed(cfg.get('tone', 'room'), d)
    for c in cfg['cues']:
        t, name, gdb = c[0], c[1], c[2] if len(c) > 2 else 0; o = c[3] if len(c) > 3 else {}
        s = L[name](o) * 10 ** (gdb / 20); i = int(SR * t); out[i:i + len(s)] += s[:max(0, len(out) - i)]
    out = out / max(1e-6, np.abs(out).max()) * .89
    st = np.stack([out, out], 1); w = wave.open(sys.argv[2], 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((st * 32767).astype('<i2').tobytes()); w.close()
main()
