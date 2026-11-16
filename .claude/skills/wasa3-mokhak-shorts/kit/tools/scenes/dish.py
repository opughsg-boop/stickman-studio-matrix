# Scene pack: satellite dishes on Egyptian rooftops + geostationary orbit view.
FPS = 30


def register(P, F, H, HOOKS):
    box, quad, V3, shade = H["box"], H["quad"], H["V3"], H["shade"]; np, math = H["np"], H["math"]; eo, sm, cl, bk = H["eo"], H["sm"], H["cl"], H["bk"]
    DD = np.array([-0.25, 0.55, 0.8]); DD = DD / np.linalg.norm(DD)           # all dishes face south-south-west and up

    def disc(c, d, r, col, n=18):
        d = np.array(d, float); d = d / np.linalg.norm(d); a = np.cross(d, [0, 1, 0])
        if np.linalg.norm(a) < 1e-6: a = np.cross(d, [1, 0, 0])
        a = a / np.linalg.norm(a); b = np.cross(d, a)
        return dict(v=np.array([np.array(c, float) + r * (math.cos(2 * math.pi * k / n) * a + math.sin(2 * math.pi * k / n) * b) for k in range(n)]), col=col, n=d)

    def dish(fs, x, y, z, s=0.6, col=(238, 240, 246)):
        c = V3(x, y, z)
        fs.append(disc(c - DD * 0.04, -DD, s * 1.04, (130, 134, 146))); fs.append(disc(c, DD, s, col)); fs.append(disc(c + DD * 0.02, DD, s * 0.55, (206, 212, 226)))
        fs += box(c + DD * s * 0.95, (0.07, 0.07, 0.07), (50, 52, 58)); fs += box((x, y - 0.5 * s - 0.15, z - 0.04), (0.06, 0.5 * s + 0.3, 0.06), (96, 98, 106))
        return fs

    # ---------------- ground, main building, neighbours ----------------
    g = box((0, -0.8, 0), (30, 1.6, 16), (176, 156, 126), top=(204, 196, 176))
    for a, b, c, d, n in [((-15, -0.7, 8), (15, -0.7, 8), (15, 0, 8), (-15, 0, 8), (0, 0, 1)), ((15, -0.7, 8), (15, -0.7, -8), (15, 0, -8), (15, 0, 8), (1, 0, 0)), ((-15, -0.7, -8), (-15, -0.7, 8), (-15, 0, 8), (-15, 0, -8), (-1, 0, 0))]:
        g.append(quad(a, b, c, d, (104, 78, 56), n))
    g += box((0, 0.04, 6.2), (30, 0.08, 3.0), (70, 72, 82))
    for x in np.arange(-13.5, 14, 2.4): g += box((x, 0.1, 6.2), (1.0, 0.04, 0.12), (232, 205, 90))
    def building(cx, w, h, depth, col, nwin, dishes_on_roof, balconies=False):
        fs = box((cx, h / 2, 0), (w, h, depth), col); fs[1]["hatch"] = (int(h / 1.55), shade(col, 0.82))
        zf = depth / 2 + 0.02
        for fl in range(int(h / 1.55)):
            for k in range(nwin):
                wx = cx + (k - (nwin - 1) / 2) * (w / nwin) * 0.9; wy = 1.0 + fl * 1.55
                fs.append(quad((wx - 0.38, wy - 0.45, zf), (wx + 0.38, wy - 0.45, zf), (wx + 0.38, wy + 0.5, zf), (wx - 0.38, wy + 0.5, zf), (236, 230, 214), (0, 0, 1)))
                fs.append(quad((wx - 0.3, wy - 0.38, zf + 0.02), (wx + 0.3, wy - 0.38, zf + 0.02), (wx + 0.3, wy + 0.42, zf + 0.02), (wx - 0.3, wy + 0.42, zf + 0.02), (52, 74, 104), (0, 0, 1)))
        fs += box((cx, h + 0.1, 0), (w + 0.3, 0.2, depth + 0.3), (170, 164, 154), top=(188, 182, 170))
        for (px, pz, sw, sd) in [(0, depth / 2 + 0.05, w + 0.3, 0.15), (0, -depth / 2 - 0.05, w + 0.3, 0.15), (-w / 2 - 0.05, 0, 0.15, depth + 0.3), (w / 2 + 0.05, 0, 0.15, depth + 0.3)]:
            fs += box((cx + px, h + 0.45, pz), (sw, 0.5, sd), (196, 188, 172))
        return fs
    main = building(0, 6.8, 8.0, 5.6, (224, 200, 154), 3, [], True)
    nb = []
    for (cx, w, h, col) in [(-7.4, 4.2, 6.4, (214, 176, 140)), (-11.4, 3.6, 9.4, (200, 190, 168)), (7.4, 4.2, 7.2, (226, 190, 150)), (11.4, 3.6, 5.6, (206, 178, 150))]:
        nb += building(cx, w, h, 5.0, col, 2, [])
    # water tank on the main roof
    tk = []
    N = 14
    for k in range(N):
        a0, a1 = 2 * math.pi * k / N, 2 * math.pi * (k + 1) / N; am = (a0 + a1) / 2; cx_, cz_, R_ = -2.4, -1.4, 0.8
        tk.append(quad((cx_ + R_ * math.cos(a0), 8.2, cz_ + R_ * math.sin(a0)), (cx_ + R_ * math.cos(a1), 8.2, cz_ + R_ * math.sin(a1)), (cx_ + R_ * math.cos(a1), 9.7, cz_ + R_ * math.sin(a1)), (cx_ + R_ * math.cos(a0), 9.7, cz_ + R_ * math.sin(a0)), (58, 66, 82), (math.cos(am), 0, math.sin(am))))
    tk.append(dict(v=np.array([(-2.4 + 0.8 * math.cos(2 * math.pi * k / N), 9.7, -1.4 + 0.8 * math.sin(2 * math.pi * k / N)) for k in range(N)]), col=(84, 94, 112), n=np.array([0, 1, 0.0])))
    P["rooftop"] = g + main + nb + tk
    # ---------------- dishes: dozens, all facing the same way ----------------
    ds = []
    rng = np.random.default_rng(11)
    for (x, z) in [(-3.0, 1.9), (-1.8, 0.4), (-0.4, 1.8), (1.0, 0.2), (2.4, 1.7), (3.0, -0.6), (-3.0, -0.5), (0.4, -1.2), (1.8, -1.6), (-1.2, -1.6)]:
        dish(ds, x, 8.55 + 0.35, z, float(rng.uniform(0.45, 0.72)))
    for k in range(8): dish(ds, -3.1 + k * 0.9, 9.1 + 0.2, 2.95, float(rng.uniform(0.35, 0.55)))                      # on the front parapet
    for (fl, x) in [(2, -2.3), (3, 1.9), (4, -0.2), (1, 2.2), (4, 2.4), (2, 0.4)]: dish(ds, x, 1.0 + fl * 1.55 - 0.7, 3.2, 0.42)         # balconies (slabs added below)
    for (bx, bh, n) in [(-7.4, 6.5, 5), (-11.4, 9.5, 4), (7.4, 7.3, 5), (11.4, 5.7, 4)]:
        for k in range(n): dish(ds, bx + (k - (n - 1) / 2) * 0.85, bh + 0.8, float(rng.uniform(-1.5, 1.5)), float(rng.uniform(0.4, 0.62)))
    P["dishes"] = ds
    for (fl, x) in [(2, -2.3), (3, 1.9), (4, -0.2), (1, 2.2), (4, 2.4), (2, 0.4)]: P["rooftop"] += box((x, 1.0 + fl * 1.55 - 0.95, 3.2), (1.0, 0.1, 0.8), (190, 176, 150))
    # ---------------- the dish a crow turns into a nest ----------------
    nest = []; dish(nest, 1.6, 9.3, 0.9, 0.8, (236, 238, 244))
    nest.append(disc(V3(1.6, 9.3, 0.9) + DD * 0.04, DD, 0.5, (150, 112, 60), 12)); nest += box((1.6, 9.45, 0.95), (0.3, 0.22, 0.34), (28, 28, 32))
    P["nest"] = nest; F["nest"] = V3(1.6, 9.3, 0.9)
    # ---------------- crows (blocky, flapping) ----------------
    def crow(x, y, z, fl=0.0):
        fs = box((x, y, z), (0.5, 0.26, 0.28), (26, 26, 32)) + box((x + 0.3, y + 0.14, z), (0.2, 0.2, 0.2), (26, 26, 32)) + box((x + 0.45, y + 0.12, z), (0.14, 0.06, 0.08), (240, 170, 50))
        for sg in (-1, 1): fs.append(dict(v=np.array([(x - 0.15, y + 0.05, z + sg * 0.14), (x + 0.2, y + 0.05, z + sg * 0.14), (x + 0.1, y + 0.05 + math.sin(fl) * 0.55, z + sg * 0.75), (x - 0.25, y + 0.05 + math.sin(fl) * 0.55, z + sg * 0.75)]), col=(34, 34, 42), n=None))
        return fs
    def crows(f):
        t = f / FPS; fs = []
        for (x, z) in [(-2.6, 2.95), (0.2, 2.95), (2.9, 2.95)]: fs += crow(x, 9.5, z, 0.0)
        a, b = 5.2, 7.2
        if t < a: p = V3(-9 + 3 * t, 13 - 0.4 * t, 5); fl = t * 14
        elif t < b: u = sm((t - a) / (b - a)); p = V3(-6 + 7.6 * u, 12 - 2.4 * u + 0.4 * math.sin(u * 6), 5 - 4.1 * u); fl = t * 16
        else: p = V3(1.35, 9.62, 0.85); fl = 0.0
        return fs + crow(p[0], p[1], p[2], fl)
    P["crows"] = crows
    # ---------------- sky beams from dishes + south arrow ----------------
    def beams(img, cam, f, dot):
        t = f / FPS
        for i, (x, z) in enumerate([(1.6, 0.9), (-3.0, 1.9), (2.4, 1.7), (-0.4, 1.8), (1.0, 0.2), (3.0, -0.6)]):
            base = V3(x, 8.9 + (0.45 if i == 0 else 0.0), z)
            for k in range(7): u = (k / 7 + t * 0.5) % 1.0; dot(img, cam, base + DD * (0.8 + 16 * u), 0.07 + 0.05 * u, (255, 224, 90), base + DD * (0.8 + 16 * max(0, u - 0.04)))
    P["sky_beam"] = []; HOOKS["sky_beam"] = beams
    P["south_arrow"] = box((0, 8.32, 4.0), (0.5, 0.06, 2.6), (255, 212, 0)) + [dict(v=np.array([(-0.9, 8.34, 5.3), (0.9, 8.34, 5.3), (0.0, 8.34, 6.4)]), col=(255, 212, 0), n=np.array([0, 1, 0.0]))]
    F["skyline"] = V3(0, 8.0, 0); F["dishes"] = V3(-0.5, 9.0, 0.8); F["roof"] = V3(0, 8.6, 0)
    # ---------------- space: Earth, GEO ring, satellites, beam ----------------
    R, RG, RL = 3.0, 19.9, 5.6
    def sph(lat, lon, r): lat, lon = math.radians(lat), math.radians(lon); return np.array([r * math.cos(lat) * math.sin(lon), r * math.sin(lat), r * math.cos(lat) * math.cos(lon)])
    def ry(v, a): c, s = math.cos(a), math.sin(a); return np.array([c * v[0] + s * v[2], v[1], -s * v[0] + c * v[2]])
    blobs = [(5, 20, 38, (86, 150, 84)), (28, 22, 22, (212, 190, 120)), (50, 15, 18, (96, 160, 90)), (45, 90, 44, (110, 160, 92)), (-10, -60, 36, (84, 150, 86)), (40, -100, 30, (96, 160, 90)), (-25, 135, 20, (200, 176, 110))]
    def ground_col(lat, lon):
        for (la, lo, r, col) in blobs:
            dl = abs(((lon - lo + 180) % 360) - 180)
            if (lat - la) ** 2 + dl ** 2 < r * r: return col
        return (36, 98, 196)
    cells = []
    for i in range(14):
        la0, la1 = -90 + i * 180 / 14, -90 + (i + 1) * 180 / 14
        for j in range(28):
            lo0, lo1 = -180 + j * 360 / 28, -180 + (j + 1) * 360 / 28
            vs = np.array([sph(la0, lo0, R), sph(la0, lo1, R), sph(la1, lo1, R), sph(la1, lo0, R)]); cells.append((vs, ground_col((la0 + la1) / 2, (lo0 + lo1) / 2)))
    def ringq(r, y, col, w=0.13, n=96):
        qs = []
        for k in range(n):
            a0, a1 = 2 * math.pi * k / n, 2 * math.pi * (k + 1) / n
            qs.append(dict(v=np.array([(r * math.sin(a0), y, r * math.cos(a0)), (r * math.sin(a1), y, r * math.cos(a1)), ((r + w) * math.sin(a1), y, (r + w) * math.cos(a1)), ((r + w) * math.sin(a0), y, (r + w) * math.cos(a0))]), col=col, n=None))
        return qs
    def sat(c, scale=1.0, col=(240, 200, 60)):
        fs = box(c, (0.9 * scale, 0.6 * scale, 0.6 * scale), col)
        for sg in (-1, 1): fs += box((c[0] + sg * 1.3 * scale, c[1], c[2]), (1.6 * scale, 0.05, 0.8 * scale), (60, 110, 230))
        return fs
    def space(f, low):
        t = f / FPS; phi = 0.05 * t; fs = []
        for vs, col in cells:
            v2 = np.array([ry(v, phi) for v in vs]); ctr = v2.mean(0); n = ctr / np.linalg.norm(ctr); fs.append(dict(v=v2, col=col, n=n))
        for k in range(48): a0, a1 = 2 * math.pi * k / 48, 2 * math.pi * (k + 1) / 48; fs.append(dict(v=np.array([(R * 1.01 * math.sin(a0), 0, R * 1.01 * math.cos(a0)), (R * 1.01 * math.sin(a1), 0, R * 1.01 * math.cos(a1)), (R * 1.01 * math.sin(a1), 0.07, R * 1.01 * math.cos(a1)), (R * 1.01 * math.sin(a0), 0.07, R * 1.01 * math.cos(a0))]), col=(255, 255, 255), n=None))   # equator
        fs += ringq(RG, 0, (255, 232, 130))
        eg = ry(sph(30, 31, R * 1.02), phi); gs = ry(sph(0, -7, RG), phi)
        fs += sat(gs, 1.0); fs += box(eg, (0.22, 0.22, 0.22), (255, 80, 60))
        if low: fs += ringq(RL, 0.0, (255, 120, 120), 0.08); psi = 1.5 * t; fs += sat(V3(RL * math.sin(psi), 0.4, RL * math.cos(psi)), 0.42, (230, 80, 80))
        return fs
    P["space_a"] = lambda f: space(f, False); P["space_b"] = lambda f: space(f, True)
    def spbeam(img, cam, f, dot):
        t = f / FPS; phi = 0.05 * t; eg = ry(sph(30, 31, R * 1.02), phi); gs = ry(sph(0, -7, RG), phi)
        for k in range(14): u = (k / 14 + t * 0.6) % 1.0; dot(img, cam, eg + (gs - eg) * u, 0.12, (255, 220, 60), eg + (gs - eg) * max(0, u - 0.03))
    HOOKS["space_a"] = spbeam; HOOKS["space_b"] = spbeam
    F["earth"] = V3(0, 0, 0); F["geo"] = lambda f: V3(*(ry(sph(0, -7, RG), 0.05 * f / FPS) * 0.45))
