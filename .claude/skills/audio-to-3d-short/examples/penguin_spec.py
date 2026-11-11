#!/usr/bin/env python3
"""Example spec writer: emperor-penguin huddle (10 s). Claude writes a file like this per narration:
object cues (t0) are placed on the words' timestamps from words.json."""
import json, math, sys
D = float(sys.argv[1]) if len(sys.argv) > 1 else 10.1
S, objs = .6, []
rings = [(1.2, 5, -.5), (2.6, 10, .4), (4.0, 15, -.3), (5.4, 20, .25)]   # radius, count, orbit speed
n = 0
for r, c, sp in rings:
    for k in range(c):
        a = 2*math.pi*k/c; hero = (r == 5.4 and k == 0)
        objs.append({"kind": "penguin", "pos": [r*math.sin(a), r*math.cos(a)], "scale": S, "phase": n,
                     "t0": .15 if hero else 2.9 + n*.03, "orbit": {"center": [0, 0], "speed": sp, "from": 4.3}, "face": a})
        n += 1
objs += [
 {"kind": "label", "text": "-40°C", "pos": [0, 3], "y": 2.6, "t0": 1.3, "t1": 3.6, "w": 7, "scale": 1, "color": "#ff3b3b"},
 {"kind": "penguin", "pos": [0, -7], "tint": 0xe8742a, "scale": S*1.1, "t0": 5.8, "face": math.pi,
  "path": [{"t": 5.8, "pos": [0, -7]}, {"t": 7.4, "pos": [0, 0]}]},
 {"kind": "penguin", "pos": [2.2, 7.2], "scale": S*1.25, "t0": 7.3, "face": 0.3, "idle": False},
 {"kind": "egg", "pos": [2.2, 7.62], "scale": 1.25, "t0": 9.0, "y": .06}]
cam = [(0,[0,1.8,11],[0,.9,5.4]), (1.2,[-7,3,12],[0,.8,3]), (2.9,[-12,12,20],[0,.5,0]), (4.3,[10,14,18],[0,0,0]),
       (5.7,[0,19,9],[0,0,0]), (7.3,[-3,9,17],[2.2,.8,7.2]), (9.0,[3.6,1.5,10.7],[2.2,.7,7.4]), (D,[3.2,1.3,9.6],[2.2,.6,7.3])]
print(json.dumps({"duration": D, "fps": 30, "fov": 45, "block": {"w": 16, "h": 3, "d": 16}, "snow": {"from": 1.2},
                  "camera": [{"t": t, "pos": p, "look": l} for t, p, l in cam], "objects": objs}))
