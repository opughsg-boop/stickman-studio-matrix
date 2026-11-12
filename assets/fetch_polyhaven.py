#!/usr/bin/env python3
"""Huge scanned trees (pine/jacaranda/island/tree_small, 64-914 MB) are excluded on purpose; use nature_pack trees instead.
Download realistic CC0 Poly Haven models (1k textures, glTF) into assets/ph/<id>/ and soil textures into assets/ph_tex/.
Re-run safe (skips what exists). Add ids to MODELS to grow the library. List: https://polyhaven.com/models"""
import json, os, urllib.request, sys
MODELS = """island_tree_01 jacaranda_tree pine_tree_01 fir_sapling tree_small_02 tree_stump_01 dead_tree_trunk_02
grass_medium_01 grass_medium_02 grass_bermuda_01 shrub_01 shrub_02 shrub_03 fern_02 dandelion_01 flower_gazania weed_plant_02 nettle_plant moss_01
boulder_01 rock_07 rock_moss_set_01 namaqualand_stones_01 stone_01
food_apple_01 bananas yellow_onion sweet_potato lemon
Barrel_01 garden_sprinkler_01 hatchet plastic_broom metal_jerrycan compost_bag_02 ladder_sectioned_01 wooden_cutting_board
modular_chainlink_fence modular_wooden_pier stone_fire_pit""".split()
TEXTURES = ["brown_mud_leaves_01", "forrest_ground_01", "aerial_grass_rock", "coast_sand_rocks_02"]
ROOT = os.path.dirname(os.path.abspath(__file__))
get = lambda u: urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "diorama-studio"}), timeout=60).read()
def save(url, path):
    if os.path.exists(path): return 0
    os.makedirs(os.path.dirname(path), exist_ok=True); b = get(url); open(path, "wb").write(b); return len(b)
total = 0
for mid in MODELS:
    try:
        f = json.loads(get(f"https://api.polyhaven.com/files/{mid}"))["gltf"]["1k"]["gltf"]
        d = os.path.join(ROOT, "ph", mid); total += save(f["url"], os.path.join(d, f"{mid}.gltf"))
        for rel, inc in f.get("include", {}).items(): total += save(inc["url"], os.path.join(d, rel))
    except Exception as e: print("skip", mid, e, file=sys.stderr)
for tid in TEXTURES:
    try:
        f = json.loads(get(f"https://api.polyhaven.com/files/{tid}"))
        for key, name in [("Diffuse", "diff"), ("nor_gl", "nor"), ("Rough", "rough")]:
            if key in f: total += save(f[key]["1k"]["jpg"]["url"], os.path.join(ROOT, "ph_tex", tid, f"{name}.jpg"))
    except Exception as e: print("skip tex", tid, e, file=sys.stderr)
print(f"poly haven ready ({total/1048576:.1f} MB downloaded now)")
