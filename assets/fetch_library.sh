#!/usr/bin/env bash
# Downloads the ready-made CC0 3D library (Quaternius packs, ~46 MB) into assets/lib/<pack>/*.glb
# Source: github.com/trebeljahr/quaternius-showcase (models by Quaternius, CC0 1.0; see assets/lib/QUATERNIUS_LICENSES.md)
set -e; cd "$(dirname "$0")"; [ -f lib/animals_pack/Cow.glb ] && { echo "library already present"; exit 0; }
T=$(mktemp -d); git clone -q --depth 1 --filter=blob:none --no-checkout https://github.com/trebeljahr/quaternius-showcase "$T/q"
cd "$T/q"; git sparse-checkout set --no-cone $(for p in animals_pack modular_men modular_women nature_pack crops_pack simple_nature_pack fish_pack medieval_village_pack; do echo public/glb/$p; done)
git checkout -q HEAD 2>/dev/null; cd - >/dev/null; mkdir -p lib; cp -r "$T"/q/public/glb/* lib/; rm -rf "$T"; echo "library ready: $(ls lib | wc -l) packs"
