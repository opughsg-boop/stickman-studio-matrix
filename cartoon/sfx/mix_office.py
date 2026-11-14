import numpy as np, wave, subprocess, os
SR = 48000; DUR = 7.0
LIB = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sfx')
rng = np.random.default_rng(3)
track = np.zeros(int(SR * DUR))

def load(fid, peak=0.5):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', f'{LIB}/{fid}.mp3', '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True).stdout
    x = np.frombuffer(raw, dtype='<f4').astype(float)
    return x / (np.max(np.abs(x)) + 1e-9) * peak
def put(sig, at, gain):
    i = int(max(0, at) * SR); j = min(len(track), i + len(sig)); track[i:j] += sig[:j - i] * gain
def lp(x, k):
    y = np.empty_like(x); acc = 0.0
    for i in range(len(x)): acc += k * (x[i] - acc); y[i] = acc
    return y
def soft_transition(d=.6):   # the approved soft low "whoom" (kept)
    n = int(SR * d); t = np.arange(n) / SR; k = t / d
    f = 220 - 120 * k
    tone = np.sin(2*np.pi*np.cumsum(f)/SR)*.8 + np.sin(4*np.pi*np.cumsum(f)/SR)*.15
    air = lp(lp(rng.standard_normal(n), .02), .05) * 3
    return (tone + air) * np.sin(np.pi * k) ** 2
def key(d=.05):              # keyboard tap, synthesized (no good keyboard sample found)
    n = int(SR*d); t = np.arange(n)/SR
    return (np.sin(2*np.pi*2200*t)*.5 + lp(rng.standard_normal(n), .3)*.5) * np.exp(-t/.012)

BOING = load('2894', .9); METAL = load('2895', .8); SPLAT = load('2889', .9)
POP = load('2364', .7); PUNCH = load('2151', .9); LAUGH = load('2882', .8); GIGGLE = load('2885', .8)
BLIP = load('2359', .7); BELL = load('2256', .5)

# 1) keyboard taps while typing (0.2 - 2.3 s)
for x in np.arange(.2, 2.35, .24 + rng.uniform(0, .05)): put(key(), x, .35)
# 2) phone at full volume, 1.0 - 4.2 s: silly pop cluster bursts, laughs from the phone and the coworker
for x in np.arange(1.0, 4.2, .42): put(BLIP, x, .45)
put(LAUGH, 1.4, .55); put(GIGGLE, 2.5, .5); put(LAUGH, 3.4, .45)
# 3) camera push and the hero's startle at 2.4 s
put(soft_transition(.6), 2.3, .22)
put(BOING, 2.4, .85)
# 4) camera ease back out at 5.4 s
put(soft_transition(.6), 5.3, .14)
# 5) coworker slaps the desk 3 times (frames 112, 119, 126); the mug hops on the first two
for k in (112, 119, 126):
    put(PUNCH, k / 30, .75)
for k in (112, 119):
    put(POP, k / 30 + .04, .35)
# 6) mug lands at 4.77 s: splat and the cup's thud
put(SPLAT, 4.77, .7)
# 7) headphones on at 5.4 s
put(BELL, 5.4, .3); put(POP, 5.42, .45)

track = track / (np.max(np.abs(track)) + 1e-9) * .89
pcm = (track * 32767).astype('<i2')
with wave.open('mix_raw.wav', 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('ok', round(len(pcm)/SR, 2))
