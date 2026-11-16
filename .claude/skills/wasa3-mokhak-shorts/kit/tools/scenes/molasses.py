# Scene pack: Boston molasses flood (1919). register(PROPS, FOCUS, helpers, HOOKS) -> adds props used by story.json.
FPS = 30
MOLA, MOLA_TOP, MOLA_HI = (92, 48, 24), (128, 72, 34), (196, 124, 62)


def register(P, F, H, HOOKS):
    box, quad, V3, shade = H["box"], H["quad"], H["V3"], H["shade"]; np, math = H["np"], H["math"]; eo, sm, cl, bk = H["eo"], H["sm"], H["cl"], H["bk"]
    # ---------------- street diorama: block, road, sidewalks, brick buildings with windows, lamps ----------------
    g = []
    g += box((0, -0.8, 0), (26, 1.6, 12), (170, 150, 120), top=(190, 180, 160))
    for a, b, c, d, n in [((-13, -0.7, 6), (13, -0.7, 6), (13, 0, 6), (-13, 0, 6), (0, 0, 1)), ((13, -0.7, 6), (13, -0.7, -6), (13, 0, -6), (13, 0, 6), (1, 0, 0)), ((-13, -0.7, -6), (-13, -0.7, 6), (-13, 0, 6), (-13, 0, -6), (-1, 0, 0))]:
        g.append(quad(a, b, c, d, (104, 78, 56), n))
    g += box((0, 0.04, 0.2), (26, 0.08, 3.4), (70, 72, 82))
    for x in np.arange(-11.5, 12, 2.4): g += box((x, 0.1, 0.2), (1.0, 0.04, 0.12), (232, 205, 90))
    g += box((0, 0.08, -2.5), (26, 0.16, 1.0), (206, 198, 182)); g += box((0, 0.08, 2.8), (26, 0.16, 1.0), (206, 198, 182))
    bricks = [(168, 84, 62), (182, 100, 72), (150, 76, 58), (176, 92, 66)]
    for k, (x, w, h) in enumerate([(-6.0, 2.6, 4.2), (-3.2, 3.0, 5.0), (0.0, 3.2, 4.4), (3.4, 3.2, 5.4), (6.8, 3.4, 4.6), (10.0, 2.8, 4.0)]):
        col = bricks[k % 4]; zc = -4.1; zf = zc + 1.3
        fs = box((x, h / 2, zc), (w, h, 2.6), col, top=(120, 110, 105)); fs[1]["hatch"] = (int(h / 0.24), shade(col, 0.7)); fs[1]["vhatch"] = (int(w / 0.5), shade(col, 0.82)); g += fs
        g += box((x, h + 0.1, zc), (w + 0.2, 0.2, 2.8), (140, 134, 128))
        for row in range(int((h - 1.2) / 1.2)):
            for cx_ in (-w / 4, w / 4):
                wy = 1.5 + row * 1.2; g.append(quad((x + cx_ - 0.4, wy - 0.45, zf + 0.02), (x + cx_ + 0.4, wy - 0.45, zf + 0.02), (x + cx_ + 0.4, wy + 0.45, zf + 0.02), (x + cx_ - 0.4, wy + 0.45, zf + 0.02), (232, 226, 210), (0, 0, 1)))
                g.append(quad((x + cx_ - 0.32, wy - 0.37, zf + 0.04), (x + cx_ + 0.32, wy - 0.37, zf + 0.04), (x + cx_ + 0.32, wy + 0.37, zf + 0.04), (x + cx_ - 0.32, wy + 0.37, zf + 0.04), (44, 66, 96), (0, 0, 1)))
        g.append(quad((x - 0.4, 0.16, zf + 0.03), (x + 0.4, 0.16, zf + 0.03), (x + 0.4, 1.5, zf + 0.03), (x - 0.4, 1.5, zf + 0.03), (92, 58, 40), (0, 0, 1)))
    for x in (-8, -2, 4, 10): g += box((x, 1.3, 3.2), (0.1, 2.6, 0.1), (50, 52, 58)); g += box((x, 2.7, 3.2), (0.34, 0.28, 0.34), (255, 226, 130))
    P["street"] = g
    # ---------------- tank (intact and burst) ----------------
    cx, cz, R, Ht = -9.4, -0.2, 1.9, 5.8
    def tank(burst):
        fs = []; N = 16
        for k in range(N):
            a0, a1 = 2 * math.pi * k / N, 2 * math.pi * (k + 1) / N; am = (a0 + a1) / 2
            if burst and (am < 0.9 or am > 2 * math.pi - 0.9): continue
            p0 = (cx + R * math.cos(a0), cz + R * math.sin(a0)); p1 = (cx + R * math.cos(a1), cz + R * math.sin(a1))
            f_ = quad((p0[0], 0, p0[1]), (p1[0], 0, p1[1]), (p1[0], Ht, p1[1]), (p0[0], Ht, p0[1]), (128, 142, 164), (math.cos(am), 0, math.sin(am))); f_["hatch"] = (7, (88, 100, 124)); f_["vhatch"] = (3, (160, 172, 192)); fs.append(f_)
        top = np.array([(cx + R * math.cos(2 * math.pi * k / N), Ht, cz + R * math.sin(2 * math.pi * k / N)) for k in range(N)])
        fs.append(dict(v=top, col=(176, 182, 196), n=np.array([0, 1, 0.0])))
        if burst:
            fs.append(quad((cx - 0.4, 0, cz - 1.5), (cx - 0.4, 0, cz + 1.5), (cx - 0.4, Ht, cz + 1.5), (cx - 0.4, Ht, cz - 1.5), (62, 32, 16), (1, 0, 0)))
            for (px, pz, ry) in ((-6.6, -1.2, 0.5), (-5.6, 1.4, -0.4), (-7.2, 0.6, 0.2)):
                fs.append(dict(v=np.array([(px, 0.5, pz), (px + 1.2, 0.2, pz + ry), (px + 1.3, 0.9, pz + ry + 0.1), (px + 0.1, 1.2, pz + 0.1)], float), col=(150, 156, 170), n=None))
        return fs
    base = [quad((cx + (R + 0.12) * math.cos(2 * math.pi * k / 16), 0.02, cz + (R + 0.12) * math.sin(2 * math.pi * k / 16)), (cx + (R + 0.12) * math.cos(2 * math.pi * (k + 1) / 16), 0.02, cz + (R + 0.12) * math.sin(2 * math.pi * (k + 1) / 16)), (cx + (R + 0.12) * math.cos(2 * math.pi * (k + 1) / 16), 0.5, cz + (R + 0.12) * math.sin(2 * math.pi * (k + 1) / 16)), (cx + (R + 0.12) * math.cos(2 * math.pi * k / 16), 0.5, cz + (R + 0.12) * math.sin(2 * math.pi * k / 16)), (80, 90, 110), (math.cos(2 * math.pi * (k + .5) / 16), 0, math.sin(2 * math.pi * (k + .5) / 16))) for k in range(16)]
    P["tank"] = tank(False) + base; P["tank_burst"] = tank(True) + base
    F["tank"] = V3(cx, 3.2, cz); F["tank_base"] = V3(cx + 2.4, 1.2, cz)
    # ---------------- molasses wave (animated) ----------------
    def wave(f, t0, x0, v, Hm=2.4, zw=1.9, L=5.2):
        t = f / FPS - t0
        if t < 0: return []
        xf = min(x0 + v * t, 12.0); Hh = Hm * math.exp(-0.16 * t); st = 0.32; n = int(L / st); xs = [xf - i * st for i in range(n + 1)]; hs = [Hh * (1 - i / n) ** 0.75 for i in range(n + 1)]
        fs = [quad((xf + 0.45, 0, -zw), (xf + 0.45, 0, zw), (xf, hs[0], zw), (xf, hs[0], -zw), MOLA, (1, 0, 0))]
        for i in range(n):
            a, b, ha, hb = xs[i], xs[i + 1], hs[i], hs[i + 1]
            fs.append(quad((a, ha, -zw), (a, ha, zw), (b, hb, zw), (b, hb, -zw), MOLA_TOP if i % 3 else MOLA_HI, (0, 1, 0)))
            fs.append(quad((a, 0.02, zw), (b, 0.02, zw), (b, hb, zw), (a, ha, zw), MOLA, (0, 0, 1))); fs.append(quad((b, 0.02, -zw), (a, 0.02, -zw), (a, ha, -zw), (b, hb, -zw), MOLA, (0, 0, -1)))
        return fs
    P["wave_teaser"] = lambda f: wave(f, 0.0, -5.0, 3.0, 2.6)
    P["wave_a"] = lambda f: wave(f, 10.0, -7.6, 5.0, 3.4, 1.9, 6.5)
    def front(f, t0, x0, v): return min(x0 + v * max(0.0, f / FPS - t0), 12.0)
    def drops(img, cam, f, dot, t0, x0, v, Hm):
        t = f / FPS - t0
        if t < 0: return
        xf = front(f, t0, x0, v)
        for i in range(16):
            ph = (t * 1.6 + i / 16) % 1.0; dot(img, cam, (xf + 0.3 + 0.9 * ph, 0.5 + 2.2 * Hm / 2.4 * math.sin(math.pi * ph), -1.6 + 3.2 * ((i * 0.37) % 1)), 0.1, (150, 86, 40))
    HOOKS["wave_teaser"] = lambda img, cam, f, dot: drops(img, cam, f, dot, 0.0, -5.0, 3.0, 2.0)
    HOOKS["wave_a"] = lambda img, cam, f, dot: drops(img, cam, f, dot, 10.0, -7.6, 5.0, 2.6)
    F["wave_front"] = lambda f: V3(front(f, 10.0, -7.6, 5.0) - 0.5, 1.0, 0.2)
    F["chase"] = lambda f: V3(((1.4 + 2.2 * (f / FPS) + 0.5) + front(f, 0.0, -5.0, 3.0)) / 2, 1.2, 0.5)
    F["wave_teaser_front"] = lambda f: V3(front(f, 0.0, -5.0, 3.0), 1.0, 0.2)
    # ---------------- aftermath puddle ----------------
    pd = box((1.2, 0.09, 0.2), (21, 0.06, 3.7), MOLA, top=MOLA_TOP)
    for z in (-1.0, -0.2, 0.7, 1.5): pd += box((1.2, 0.125, z), (20.5, 0.02, 0.08), MOLA_HI)
    pd += box((-5.0, 0.1, 2.9), (3.0, 0.06, 0.9), MOLA, top=MOLA_TOP) + box((6.5, 0.1, -2.4), (4.0, 0.06, 0.8), MOLA, top=MOLA_TOP)
    P["puddle"] = pd
    # ---------------- vintage car (drives ahead of the teaser wave) ----------------
    def car(f):
        t = f / FPS; x = 1.4 + 2.2 * t; y = 0.03 * math.sin(t * 18); z = 0.7
        fs = box((x, 0.58 + y, z), (1.9, 0.5, 1.0), (200, 52, 46)) + box((x - 0.2, 1.05 + y, z), (1.0, 0.46, 0.86), (186, 44, 40))
        fs.append(quad((x + 0.31, 0.88 + y, z - 0.38), (x + 0.31, 0.88 + y, z + 0.38), (x + 0.31, 1.24 + y, z + 0.34), (x + 0.31, 1.24 + y, z - 0.34), (150, 190, 220), (1, 0, 0)))
        for dx in (-0.62, 0.62):
            for dz in (-0.55, 0.55): fs += box((x + dx, 0.24 + y, z + dz), (0.42, 0.42, 0.14), (28, 28, 30))
        fs.append(quad((x + 0.96, 0.5 + y, z - 0.3), (x + 0.96, 0.5 + y, z + 0.3), (x + 0.96, 0.68 + y, z + 0.3), (x + 0.96, 0.68 + y, z - 0.3), (255, 232, 140), (1, 0, 0)))
        return fs
    P["car"] = car; F["car"] = lambda f: V3(1.4 + 2.2 * (f / FPS) + 1.5, 0.9, 0.7)
    # ---------------- blueprint board (tank wall check + approval stamp) ----------------
    bx, bz = 3.0, 3.3
    bp = box((bx, 1.5, bz), (3.6, 2.5, 0.1), (236, 242, 250)); bp[1]["hatch"] = (12, (150, 185, 235)); bp[1]["vhatch"] = (16, (190, 210, 240))
    def line(x0, y0, x1, y1, w=0.07): return quad((bx + x0, 1.5 + y0, bz + 0.07), (bx + x1, 1.5 + y1, bz + 0.07), (bx + x1, 1.5 + y1 + w, bz + 0.07), (bx + x0, 1.5 + y0 + w, bz + 0.07), (40, 90, 200), (0, 0, 1))
    for (a, b_, c, d) in [(-1.5, -0.8, -0.2, -0.8), (-1.5, 0.8, -0.2, 0.8)]: bp.append(line(a, b_, c, d))
    for xv in (-1.5, -0.2): bp.append(quad((bx + xv, 1.5 - 0.8, bz + 0.07), (bx + xv + 0.07, 1.5 - 0.8, bz + 0.07), (bx + xv + 0.07, 1.5 + 0.9, bz + 0.07), (bx + xv, 1.5 + 0.9, bz + 0.07), (40, 90, 200), (0, 0, 1)))
    ring = np.array([(bx + 1.0 + 0.55 * math.cos(2 * math.pi * k / 20), 1.5 - 0.1 + 0.55 * math.sin(2 * math.pi * k / 20), bz + 0.075) for k in range(20)])
    bp.append(dict(v=ring, col=(216, 54, 54), n=np.array([0, 0, 1.0])))
    bp.append(dict(v=np.array([(bx + 0.72, 1.4, bz + 0.08), (bx + 0.85, 1.52, bz + 0.08), (bx + 1.02, 1.22, bz + 0.08), (bx + 1.38, 1.7, bz + 0.08), (bx + 1.28, 1.76, bz + 0.08), (bx + 1.0, 1.4, bz + 0.08), (bx + 0.88, 1.58, bz + 0.08)] if False else [(bx + 0.7, 1.35, bz + 0.08), (bx + 0.82, 1.27, bz + 0.08), (bx + 1.0, 1.05, bz + 0.08), (bx + 1.38, 1.62, bz + 0.08), (bx + 1.28, 1.68, bz + 0.08), (bx + 1.0, 1.25, bz + 0.08)], float), col=(255, 255, 255), n=np.array([0, 0, 1.0])))
    P["blueprint"] = bp; F["blueprint"] = V3(bx, 1.5, bz)
    # ---------------- smell ----------------
    def smell(img, cam, f, dot):
        t = f / FPS
        for i in range(34):
            u = (i / 34 + t * 0.16) % 1.0; x = -7 + (i * 0.43) % 15; dot(img, cam, (x + 0.5 * math.sin(t * 2 + i), 0.5 + u * 4.2, 0.4 + 0.9 * math.sin(i * 1.7 + t * 1.5)), 0.07 + 0.09 * u, (246, 196, 84))
    P["smell"] = []; HOOKS["smell"] = smell
    F["street"] = V3(2.0, 1.8, 0.0); F["street_wide"] = V3(1.0, 2.2, 0.0); F["houses"] = V3(2.5, 2.6, -3.4); F["gauge"] = V3(0, 1.0, 0); F["gauge_view"] = V3(8.0, 1.6, 0.2)
