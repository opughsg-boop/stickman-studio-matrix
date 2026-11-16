#!/usr/bin/env python3
"""soft3d: CPU software 3D renderer (numpy + OpenCV). Same timeline.json contract as engine/main.js, but needs NO Chromium/WebGL/network.
   python3 soft3d.py timeline.json --stills 10,60,200 --out stills      # contact-sheet check
   python3 soft3d.py timeline.json --video work/video_silent.mkv         # full render piped to ffmpeg (1080x1920 @30)
Look: blue studio void + white blueprint grid floor, soil diorama block, cutaway house, flat-shaded faces with dark outlines,
animated airflow particles, 2D annotations (double arrow, pulse ring, sparks, shockwave, flash). Camera moves = engine/main.js pose()."""
import json, math, argparse, subprocess, os
import numpy as np, cv2
W, H, FPS = 1080, 1920, 30
cl = lambda x, a=0.0, b=1.0: max(a, min(b, x)); lerp = lambda a, b, t: a + (b - a) * t
def sm(t): t = cl(t); return t * t * t * (t * (t * 6 - 15) + 10)
def eo(t): return 1 - (1 - cl(t)) ** 3
def bk(t, s=1.7): t = cl(t) - 1; return t * t * ((s + 1) * t + s) + 1
EZ = dict(smooth=sm, easeOut=eo, back=bk)
V3 = lambda *a: np.array(a, float)
def bgr(c): return (int(c[2]), int(c[1]), int(c[0]))
def shade(c, k): return tuple(max(0, min(255, v * k)) for v in c)
# ---------------- geometry ----------------
def box(c, s, col, top=None):
    x0, y0, z0 = np.array(c) - np.array(s) / 2; x1, y1, z1 = np.array(c) + np.array(s) / 2
    P = np.array([[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]])
    spec = [((0, 1, 2, 3), (0, 0, -1)), ((5, 4, 7, 6), (0, 0, 1)), ((4, 0, 3, 7), (-1, 0, 0)), ((1, 5, 6, 2), (1, 0, 0)), ((3, 2, 6, 7), (0, 1, 0)), ((4, 5, 1, 0), (0, -1, 0))]
    return [dict(v=P[list(i)], col=(top if (top and n == (0, 1, 0)) else col), n=np.array(n, float)) for i, n in spec]
def quad(a, b, c, d, col, n=None, alpha=1.0): return dict(v=np.array([a, b, c, d], float), col=col, n=None if n is None else np.array(n, float), alpha=alpha)
MUD, MUD2, ROOF, SAND, INSIDE = (218, 164, 112), (190, 132, 86), (170, 118, 76), (226, 200, 146), (170, 120, 84)
def build():
    P = {}
    g = []
    g += box((0, -0.8, 0), (14, 1.6, 10), (190, 160, 112), top=SAND)
    for (a, b, c, d, n) in [((-7, -0.7, 5), (7, -0.7, 5), (7, 0, 5), (-7, 0, 5), (0, 0, 1)), ((7, -0.7, 5), (7, -0.7, -5), (7, 0, -5), (7, 0, 5), (1, 0, 0)), ((-7, -0.7, -5), (-7, -0.7, 5), (-7, 0, 5), (-7, 0, -5), (-1, 0, 0))]:
        g.append(quad(a, b, c, d, (104, 78, 56), n))
    rng = np.random.default_rng(3)
    for _ in range(26): x, z, s = rng.uniform(-6.3, 6.3), rng.uniform(-4.4, 4.4), rng.uniform(0.12, 0.3); g += box((x, 0.03, z), (s, 0.06, s * 0.8), (190, 160, 112))
    P["ground"] = g
    pm = []
    for (x, z) in [(-5.2, -3.0), (5.3, -3.4), (-5.6, 3.0), (5.2, 3.3)]:
        pm += box((x, 1.3, z), (0.26, 2.6, 0.26), (120, 84, 52))
        for k in range(7):
            a = k * 2 * math.pi / 7; tip = (x + math.cos(a) * 1.5, 2.2, z + math.sin(a) * 1.5); pa = (x + math.cos(a + 1.5) * 0.18, 2.62, z + math.sin(a + 1.5) * 0.18); pb = (x + math.cos(a - 1.5) * 0.18, 2.62, z + math.sin(a - 1.5) * 0.18)
            pm.append(dict(v=np.array([pa, tip, pb], float), col=(70, 140, 70) if k % 2 else (90, 160, 80), n=None))
    P["palms"] = pm
    h = []
    h += box((0, 0.1, 0), (4.4, 0.2, 3.0), INSIDE)                                   # floor
    h += box((0, 1.2, -1.35), (4.4, 2.4, 0.3), MUD)                                  # back wall
    h += box((-2.05, 1.2, 0), (0.3, 2.4, 3.0), MUD2)                                 # left wall
    h += box((2.05, 1.2, -0.95), (0.3, 2.4, 1.1), MUD2); h += box((2.05, 1.2, 0.95), (0.3, 2.4, 1.1), MUD2)       # right wall pillars
    h += box((2.05, 0.6, 0), (0.3, 1.2, 0.8), MUD2); h += box((2.05, 2.1, 0), (0.3, 0.6, 0.8), MUD2)             # sill + lintel (window)
    h += box((0, 2.5, 0), (4.8, 0.22, 3.4), ROOF, top=(196, 142, 92))                # roof slab
    h += box((1.2, 2.9, 0), (0.5, 0.6, 0.5), (186, 132, 88))                         # roof vent (shuksheika)
    h.append(quad((1.0, 3.2, 0.25), (1.4, 3.2, 0.25), (1.4, 3.2, -0.25), (1.0, 3.2, -0.25), (60, 40, 30), (0, 1, 0)))
    h.append(quad((2.2, 0.62, -0.4), (2.2, 0.62, 0.4), (2.2, 1.8, 0.4), (2.2, 1.8, -0.4), (70, 110, 150), (1, 0, 0), 0.0))
    P["house"] = h
    m = []
    m += box((0, 3.9, -0.95), (1.3, 2.8, 1.0), (196, 140, 92), top=(214, 160, 108))   # tower body above roof
    m += box((0, 1.25, -1.0), (0.9, 2.5, 0.5), (232, 214, 176))                       # duct inside the room (visible against back wall)
    m.append(quad((-0.66, 4.9, -1.35), (-0.66, 4.9, -0.55), (-0.66, 3.3, -0.55), (-0.66, 3.3, -1.35), (62, 42, 32), (-1, 0, 0)))   # wind-facing opening
    m.append(quad((-1.0, 5.0, -1.3), (-1.0, 5.0, -0.6), (-0.66, 5.35, -0.6), (-0.66, 5.35, -1.3), (176, 122, 80), (-0.5, 0.8, 0)))    # slanted wind scoop
    P["malqaf"] = m
    P["basin"] = box((0.05, 0.4, -0.55), (1.0, 0.3, 0.6), (96, 160, 214)) + box((0.05, 0.22, -0.55), (1.1, 0.14, 0.7), (150, 110, 80))
    P["airflow"] = []; P["hot_air"] = []; P["vapor"] = []; P["sun"] = []
    return P
PROPS = build(); HOOKS = {}
def fo(name, f=0):
    v = FOCUS.get(name, V3(0, 1, 0)); v = v(f) if callable(v) else v
    return np.array(v, float).copy()
FOCUS = dict(village=V3(0, 1.6, 0), house=V3(0, 1.3, 0), malqaf=V3(-0.1, 4.0, -1.0), opening=V3(-0.7, 4.4, -1.0), duct=V3(0, 1.4, -0.9), vent=V3(1.2, 2.6, 0), basin=V3(0.05, 0.5, -0.55), room=V3(0.6, 1.2, 0))
# ---------------- paths / particles ----------------
WIND = np.array([(-9, 5.6, -1.0), (-3, 5.0, -1.0), (-0.9, 4.5, -1.0), (-0.1, 3.3, -1.0), (-0.1, 1.4, -0.95), (0.3, 0.8, -0.55), (1.2, 0.95, -0.15), (2.2, 1.45, 0.0), (5.8, 1.9, 0.3)], float)
HOT = np.array([(1.0, 0.4, 0.1), (1.15, 1.4, 0.0), (1.2, 2.5, 0.0), (1.2, 3.4, 0.0), (1.25, 5.0, 0.0)], float)
def along(path, u):
    seg = np.linalg.norm(np.diff(path, axis=0), axis=1); c = np.concatenate([[0], np.cumsum(seg)]); s = (u % 1.0) * c[-1]
    i = min(len(seg) - 1, int(np.searchsorted(c, s, "right") - 1)); return path[i] + (path[i + 1] - path[i]) * (s - c[i]) / max(1e-9, seg[i])
# ---------------- camera ----------------
def pose(s, u, f=0):
    c = s.get("camera") or {}; tgt = fo(s["focus"], f) + np.array(c.get("offset", [0, 0, 0]), float)
    d, az, el, fov = c.get("dist", 5.5), c.get("az", 25), c.get("el", 22), c.get("fov", 50); e = EZ[c.get("ease", "smooth")](u); dr = c.get("dir", 1); mv = c.get("move")
    if mv == "push_in": d = lerp(d, d * 0.5, e)
    elif mv == "pull_out": d = lerp(d * 0.5, d, e)
    elif mv == "orbit": az += lerp(0, 45 * dr, e)
    elif mv == "dolly": tgt[0] += lerp(-1.6, 1.6, e) * dr
    elif mv == "crane_up": el = lerp(el, el + 32, e)
    elif mv == "crane_down": el = lerp(el + 32, el, e)
    elif mv == "whip_pan": az += lerp(-75 * dr, 0, eo(u))
    elif mv == "tilt_down": tgt[1] += lerp(2, 0, e); el += lerp(20, 0, e)
    elif mv == "rack_focus": d = lerp(d * 0.92, d * 0.8, e)
    else: az += 8 * e; d *= 1 - 0.05 * e
    d *= 1 - 0.03 * u; a, l = math.radians(az), math.radians(el)
    return dict(pos=tgt + V3(d * math.cos(l) * math.sin(a), d * math.sin(l), d * math.cos(l) * math.cos(a)), tgt=tgt, fov=fov)
class Cam:
    def __init__(s, p):
        s.pos = p["pos"]; f = p["tgt"] - s.pos; s.f = f / np.linalg.norm(f); r = np.cross(s.f, V3(0, 1, 0)); s.r = r / np.linalg.norm(r); s.u = np.cross(s.r, s.f); s.foc = (H / 2) / math.tan(math.radians(p["fov"]) / 2)
    def to_cam(s, P): d = P - s.pos; return np.stack([d @ s.r, d @ s.u, d @ s.f], -1)
    def proj(s, C): return np.stack([W / 2 + C[..., 0] / C[..., 2] * s.foc, H / 2 - C[..., 1] / C[..., 2] * s.foc], -1)
def clip_near(C, n=0.15):
    out = []
    for i in range(len(C)):
        a, b = C[i], C[(i + 1) % len(C)]; ia, ib = a[2] >= n, b[2] >= n
        if ia: out.append(a)
        if ia != ib: t = (n - a[2]) / (b[2] - a[2]); out.append(a + (b - a) * t)
    return np.array(out)
# ---------------- backdrop ----------------
def backdrop():
    t = np.linspace(0, 1, H)[:, None, None]; top = np.array([29, 92, 168]); bot = np.array([86, 150, 214]); bg = (top + (bot - top) * t) * np.ones((1, W, 1))
    yy, xx = np.mgrid[0:H, 0:W]; shaft = np.clip(1 - np.abs((xx * 0.55 + yy * 0.25) - 760) / 260, 0, 1) * 34; bg = bg + shaft[..., None] * np.array([1, 1, 1])
    return np.clip(bg, 0, 255).astype(np.uint8)[:, :, ::-1].copy()
BG = backdrop(); yy, xx = np.mgrid[0:H, 0:W]; VIG = (1 - 0.28 * (((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2) / 2)[..., None].astype(np.float32)
FLOOR_Y = -1.7
def space_bg():
    t = np.linspace(0, 1, H)[:, None, None]; bg = (np.array([6, 8, 26]) + (np.array([22, 30, 70]) - np.array([6, 8, 26])) * t) * np.ones((1, W, 1)); rng = np.random.default_rng(4)
    grad = np.clip(bg, 0, 255).astype(np.uint8)[:, :, ::-1].copy(); stars = np.zeros_like(grad)
    for _ in range(420): x, y = int(rng.uniform(0, W)), int(rng.uniform(0, H)); v = int(rng.uniform(120, 255)); cv2.circle(stars, (x, y), int(rng.choice([1, 1, 2, 3])), (v, v, v), -1, cv2.LINE_AA)
    return grad, stars
SPACE_GRAD, SPACE_STARS = space_bg()
def draw_floor(img, cam):
    big = np.array([[-300, FLOOR_Y, -300], [300, FLOOR_Y, -300], [300, FLOOR_Y, 300], [-300, FLOOR_Y, 300]], float); C = clip_near(cam.to_cam(big))
    if len(C) >= 3: cv2.fillConvexPoly(img, cam.proj(C).astype(np.int32), bgr((43, 108, 176)), cv2.LINE_AA)
    for k in range(-60, 61, 3):
        for (a, b) in (((k, FLOOR_Y, -60), (k, FLOOR_Y, 60)), ((-60, FLOOR_Y, k), (60, FLOOR_Y, k))):
            C = clip_near(cam.to_cam(np.array([a, b], float)), 0.15) if False else None
            ca, cb = cam.to_cam(np.array(a, float)), cam.to_cam(np.array(b, float))
            if ca[2] < 0.15 and cb[2] < 0.15: continue
            if ca[2] < 0.15: ca = ca + (cb - ca) * ((0.15 - ca[2]) / (cb[2] - ca[2]))
            if cb[2] < 0.15: cb = cb + (ca - cb) * ((0.15 - cb[2]) / (ca[2] - cb[2]))
            z = (ca[2] + cb[2]) / 2; f = cl(z / 70); col = np.array([232, 242, 252]) * (1 - f) + np.array([43, 108, 176]) * f
            p = cam.proj(np.array([ca, cb])); cv2.line(img, tuple(p[0].astype(int)), tuple(p[1].astype(int)), bgr(col), max(1, int(3.2 * cam.foc / (z * 700) + 0.7)), cv2.LINE_AA)
LIGHT = V3(0.45, 0.8, 0.4) / np.linalg.norm(V3(0.45, 0.8, 0.4))
def draw_faces(img, cam, faces):
    items = []
    for fc in faces:
        C = cam.to_cam(fc["v"]); n = fc.get("n"); ctr = fc["v"].mean(0)
        if n is not None:
            if (cam.pos - ctr) @ n <= 0: continue
            nn = n
        else:
            nn = np.cross(fc["v"][1] - fc["v"][0], fc["v"][2] - fc["v"][0]); nn = nn / (np.linalg.norm(nn) + 1e-9)
            if (cam.pos - ctr) @ nn < 0: nn = -nn
        C = clip_near(C)
        if len(C) < 3: continue
        items.append((C[:, 2].mean(), cam.proj(C), shade(fc["col"], 0.62 + 0.5 * max(0.0, float(nn @ LIGHT))), fc.get("alpha", 1.0), fc, cam.to_cam(fc["v"])))
    for _, p2, col, al, fcc, C0 in sorted(items, key=lambda t: -t[0]):
        if al <= 0: continue
        pts = p2.astype(np.int32)
        if al < 1: ov = img.copy(); cv2.fillConvexPoly(ov, pts, bgr(col), cv2.LINE_AA); img[:] = cv2.addWeighted(ov, al, img, 1 - al, 0)
        else:
            cv2.fillConvexPoly(img, pts, bgr(col), cv2.LINE_AA); cv2.polylines(img, [pts], True, bgr(shade(col, 0.5)), 2, cv2.LINE_AA)
            for key, vert in (("hatch", False), ("vhatch", True)):
                h = fcc.get(key)
                if h and len(C0) >= 4 and C0[:, 2].min() >= 0.15:
                    Q = cam.proj(C0); a_, b_, c_, d_ = Q[0], Q[1], Q[2], Q[3]; hc = bgr(shade(h[1], 0.62 + 0.5 * 0.5))
                    for tt in np.linspace(0, 1, h[0] + 2)[1:-1]:
                        p0, p1 = (a_ + (b_ - a_) * tt, d_ + (c_ - d_) * tt) if vert else (a_ + (d_ - a_) * tt, b_ + (c_ - b_) * tt)
                        cv2.line(img, tuple(p0.astype(int)), tuple(p1.astype(int)), hc, 1, cv2.LINE_AA)
def dot(img, cam, P, r, col, tail=None, al=1.0):
    C = cam.to_cam(np.array(P, float))
    if C[2] < 1.5: return
    p = cam.proj(C); rad = min(46, max(2, int(r * cam.foc / C[2])))
    if tail is not None:
        Ct = cam.to_cam(np.array(tail, float))
        if Ct[2] > 0.2: pt = cam.proj(Ct); cv2.line(img, tuple(pt.astype(int)), tuple(p.astype(int)), bgr(col), max(2, int(rad * 0.6)), cv2.LINE_AA)
    cv2.circle(img, tuple(p.astype(int)), rad, bgr(col), -1, cv2.LINE_AA)
def blend(img, ov, a): img[:] = cv2.addWeighted(ov, a, img, 1 - a, 0)
def overlays(img, cam, s, n, tl, props):
    fx = s.get("fx", []); fp = cam.proj(cam.to_cam(fo(s["focus"], s["f0"] + n))); fx_, fy_ = int(fp[0]), int(fp[1])
    if "pulse" in fx:
        k = tl / 0.7
        if k < 1: ov = img.copy(); cv2.circle(ov, (fx_, fy_), int(80 + 300 * eo(k)), (80, 220, 255), 14, cv2.LINE_AA); blend(img, ov, 0.8 * (1 - k))
    if "shockwave" in fx:
        k = tl / 0.9
        if k < 1: ov = img.copy(); cv2.ellipse(ov, (fx_, fy_), (int(60 + 420 * eo(k)),) * 2, 0, 0, 360, (40, 59, 255), 22, cv2.LINE_AA); blend(img, ov, 0.85 * (1 - k))
    if "sparks" in fx:
        rng = np.random.default_rng(9); t = min(tl, 1.4)
        for _ in range(46): a = rng.uniform(0, 6.283); v = rng.uniform(250, 700); cv2.circle(img, (int(fx_ + math.cos(a) * v * t), int(fy_ + math.sin(a) * v * t + 500 * t * t)), 6, (0, 196, 255), -1, cv2.LINE_AA)
    if "arrow" in fx:
        k = bk(tl / 0.3); cy = fy_ - 170 + int(14 * math.sin(tl * 6)); L = int(250 * k)
        if L > 8:
            cv2.line(img, (fx_ - L, cy), (fx_ + L, cy), (0, 0, 0), 22, cv2.LINE_AA); cv2.line(img, (fx_ - L, cy), (fx_ + L, cy), (0, 212, 255), 12, cv2.LINE_AA)
            for sg in (-1, 1): tri = np.array([[fx_ + sg * (L + 36), cy], [fx_ + sg * (L - 18), cy - 34], [fx_ + sg * (L - 18), cy + 34]], np.int32); cv2.fillConvexPoly(img, tri, (0, 212, 255), cv2.LINE_AA); cv2.polylines(img, [tri], True, (0, 0, 0), 3, cv2.LINE_AA)
    if "sun" in props:
        c = (int(W * 0.82), int(H * 0.14)); r = 120 + int(8 * math.sin(n * 0.2)); ov = img.copy()
        for q in range(12): a = q * math.pi / 6 + n * 0.01; cv2.line(ov, (int(c[0] + math.cos(a) * (r + 30)), int(c[1] + math.sin(a) * (r + 30))), (int(c[0] + math.cos(a) * (r + 90)), int(c[1] + math.sin(a) * (r + 90))), (60, 215, 255), 16, cv2.LINE_AA)
        cv2.circle(ov, c, r + 40, (150, 230, 255), -1, cv2.LINE_AA); cv2.circle(ov, c, r, (40, 190, 255), -1, cv2.LINE_AA); blend(img, ov, 0.9)
    if "outro" in fx:
        cx, cy = W // 2, int(H * 0.34); ov = img.copy()
        for k in range(4): r = (tl * 0.9 + k * 0.25) % 1.0; cv2.circle(ov, (cx, cy), int(120 + 720 * eo(r)), (255, 222, 120), 10, cv2.LINE_AA)
        blend(img, ov, 0.55)
        sc = 150 * (0.92 + 0.08 * math.sin(tl * 8)) * bk(tl / 0.4); t = np.linspace(0, 2 * math.pi, 90)
        hx = 16 * np.sin(t) ** 3; hy = 13 * np.cos(t) - 5 * np.cos(2 * t) - 2 * np.cos(3 * t) - np.cos(4 * t)
        pts = np.stack([cx + hx * sc / 16, cy - hy * sc / 16], 1).astype(np.int32)
        cv2.fillPoly(img, [pts], (60, 60, 235), cv2.LINE_AA); cv2.polylines(img, [pts], True, (255, 255, 255), 8, cv2.LINE_AA)
    if "gauge" in fx:
        cx, cy, r = W // 2, int(H * 0.30), 270; ov = img.copy(); cv2.circle(ov, (cx, cy), r + 46, (40, 30, 20), -1, cv2.LINE_AA)
        for k in range(24): cv2.ellipse(ov, (cx, cy), (r, r), 0, 150 + k * 10, 150 + (k + 1) * 10 + 1, (60, 200 - k * 5, 60 + k * 8)[::-1] if False else (80, 210 - k * 7, 70 + k * 7), 30, cv2.LINE_AA)
        v = eo(tl / 1.1) * 0.78; ang = math.radians(150 + 240 * v); tip = (int(cx + (r - 20) * math.cos(ang)), int(cy + (r - 20) * math.sin(ang)))
        cv2.line(ov, (cx, cy), tip, (0, 0, 0), 22, cv2.LINE_AA); cv2.line(ov, (cx, cy), tip, (40, 40, 235), 12, cv2.LINE_AA); cv2.circle(ov, (cx, cy), 26, (255, 255, 255), -1, cv2.LINE_AA); blend(img, ov, 0.92)
    if "flash" in fx and n < 6: ov = np.full_like(img, 255); blend(img, ov, 0.9 * (1 - n / 6))
def particles(img, cam, props, f, n_unused=0):
    t = f / FPS
    for nm in props:
        if nm in HOOKS: HOOKS[nm](img, cam, f, dot)
    if "airflow" in props:
        for i in range(22):
            u = i / 22 + t * 0.16; off = V3(0, math.sin(i * 2.3) * 0.12, math.cos(i * 1.7) * 0.12); P = along(WIND, u) + off; Q = along(WIND, u - 0.012) + off if (u % 1.0) > 0.02 else None; dot(img, cam, P, 0.07, (170, 235, 255), Q)
    if "hot_air" in props:
        for i in range(14):
            u = i / 14 + t * 0.2; off = V3(math.sin(i * 1.9) * 0.2, 0, math.cos(i * 2.9) * 0.2); P = along(HOT, u) + off; Q = along(HOT, u - 0.02) + off if (u % 1.0) > 0.03 else None; dot(img, cam, P, 0.08, (255, 140, 60), Q)
    if "vapor" in props:
        for i in range(10):
            u = (i / 10 + t * 0.3) % 1; dot(img, cam, V3(0.05 + math.sin(i * 3.1) * 0.4, 0.6 + u * 1.2, -0.55 + math.cos(i * 2.1) * 0.2), 0.09 * (1 + u), (235, 245, 255))
def render(f, TL, persist):
    sh = TL["shots"]; i = next((k for k, s in enumerate(sh) if s["f0"] <= f < s["f1"]), len(sh) - 1); s = sh[i]; n = f - s["f0"]; u = cl(n / max(1, s["f1"] - s["f0"] - 1)); tl = n / FPS
    p = pose(s, u, f)
    if i > 0 and n < 18: q = pose(sh[i - 1], 1.0, sh[i - 1]["f1"] - 1); k = sm(n / 18); p = dict(pos=q["pos"] + (p["pos"] - q["pos"]) * k, tgt=q["tgt"] + (p["tgt"] - q["tgt"]) * k, fov=lerp(q["fov"], p["fov"], k))
    if any(x in s.get("fx", []) for x in ("impact", "shockwave")): kk = max(0, 1 - tl / 0.25); p["pos"] = p["pos"] + V3(math.sin(tl * 90) * 0.07 * kk, math.cos(tl * 70) * 0.05 * kk, 0)
    cam = Cam(p); space = s.get("bg") == "space"; img = (np.maximum(SPACE_GRAD, np.roll(SPACE_STARS, (int(math.asin(cam.f[1]) * 900), int(-math.atan2(cam.f[0], cam.f[2]) * 1100)), axis=(0, 1))) if space else BG).copy(); props = list(dict.fromkeys(persist + (s.get("props") or [])))
    if "sun" in props: overlays_sun = True
    (None if space else draw_floor(img, cam)); faces = []
    for nm in props: g_ = PROPS.get(nm, []); faces += g_(f) if callable(g_) else g_
    draw_faces(img, cam, faces); particles(img, cam, props, f); overlays(img, cam, s, f, tl, props) if False else None
    overlays(img, cam, s, n, tl, props)
    out = (img.astype(np.float32) * VIG)
    if i > 0 and n < 24 and ((sh[i - 1].get("bg") == "space") != space):      # dissolve between different worlds (roof <-> space)
        prv = render(sh[i - 1]["f1"] - 1, TL, persist).astype(np.float32); kk = sm(n / 24); out = prv * (1 - kk) + out * kk
    cur = s.get("grade") or {}; prv = (sh[i - 1].get("grade") or {}) if i > 0 else {}; k = sm(n / 14) if i > 0 else 1.0
    def gp(g): return np.array([g.get("sat", 1.0), g.get("bright", 1.0)] + list(g.get("tint", [1, 1, 1])), np.float32)
    G = gp(prv) + (gp(cur) - gp(prv)) * k
    if np.abs(G - np.array([1, 1, 1, 1, 1], np.float32)).max() > 1e-3:
        gray = out.mean(axis=2, keepdims=True); out = gray + (out - gray) * G[0]; out = out * G[1] * G[2:5][::-1]
    return np.clip(out, 0, 255).astype(np.uint8)
def main():
    ap = argparse.ArgumentParser(); ap.add_argument("timeline"); ap.add_argument("--stills"); ap.add_argument("--out", default="stills"); ap.add_argument("--video"); ap.add_argument("--range"); o = ap.parse_args()
    TL = json.load(open(o.timeline)); persist = TL.get("persist") or ["ground", "palms"]; N = TL["frames"]
    if TL.get("scene"):
        import importlib.util; sp = os.path.join(os.path.dirname(os.path.abspath(__file__)), "scenes", TL["scene"] + ".py"); spec = importlib.util.spec_from_file_location("scene_" + TL["scene"], sp); mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
        mod.register(PROPS, FOCUS, dict(box=box, quad=quad, V3=V3, shade=shade, np=np, math=math, eo=eo, sm=sm, bk=bk, cl=cl, along=along), HOOKS)
    if o.stills:
        os.makedirs(o.out, exist_ok=True)
        for f in [int(x) for x in o.stills.split(",")]: cv2.imwrite(os.path.join(o.out, f"f{f:04d}.jpg"), render(f, TL, persist), [cv2.IMWRITE_JPEG_QUALITY, 92])
        return
    a, b = (0, N - 1) if not o.range else map(int, o.range.split("-"))
    pr = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{W}x{H}", "-r", "30", "-i", "-", "-c:v", "libx264", "-crf", "16", "-preset", "veryfast", "-pix_fmt", "yuv420p", o.video], stdin=subprocess.PIPE)
    for f in range(a, b + 1):
        pr.stdin.write(render(f, TL, persist).tobytes())
        if f % 100 == 0: print("frame", f, "/", N, flush=True)
    pr.stdin.close(); pr.wait(); print("done", o.video)
main()
