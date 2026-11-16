# Scene pack: ancient Egyptian bread and beer. register(PROPS, FOCUS, helpers, HOOKS) -> adds props used by story.json.
def register(P, F, H, HOOKS):
    box, V3 = H["box"], H["V3"]
    # clay oven (bread), warm terracotta with a dark mouth
    o = box((-2.6, 1.0, -1.4), (1.7, 2.0, 1.7), (176, 112, 70), top=(150, 90, 56))
    P["oven"] = o
    # loaves on a mat
    l = []
    for x, z in [(1.1, 1.1), (1.9, 0.6), (1.4, -0.2)]:
        l += box((x, 0.22, z), (0.9, 0.44, 0.55), (214, 160, 96), top=(238, 194, 124))
    P["loaves"] = l
    # grain sack
    P["grain"] = box((-4.2, 0.4, 1.8), (1.0, 0.8, 0.7), (190, 160, 100), top=(206, 178, 118))
    # beer jug with a foam top
    P["jug"] = box((0.6, 0.5, -0.4), (0.5, 1.0, 0.5), (120, 70, 40), top=(238, 216, 150))
    # cup
    P["cup"] = box((1.7, 0.25, -1.1), (0.4, 0.5, 0.4), (200, 140, 70), top=(246, 222, 160))
    # coins (payment), a short stack
    c = []
    for k in range(3):
        c += box((-1.1, 0.05 + k * 0.1, 1.0), (0.5, 0.1, 0.5), (226, 190, 80), top=(255, 230, 120))
    P["coins"] = c
    F["oven"] = V3(-2.6, 1.6, -1.4)
    F["loaves"] = V3(1.5, 0.4, 0.5)
    F["jug"] = V3(0.6, 1.0, -0.4)
    F["cup"] = V3(1.7, 0.5, -1.1)
    F["coins"] = V3(-1.1, 0.3, 1.0)
    F["field"] = V3(-3.0, 1.2, 1.0)
