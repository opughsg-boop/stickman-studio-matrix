#!/usr/bin/env bash
# Downloads the free scanned 3D person from Renderpeople (real human scan, GLB, ~16 MB zip) into assets/lib/people_rp/.
# Licence: Renderpeople free models may be used commercially (same terms as their shop models): https://renderpeople.com/free-3d-people/
# Use in a plan: { type:'glb', params:{ model:'people_rp/rp_posed_00178_29', height:1.75 } }   (file is in cm; height rescales it)
set -e; cd "$(dirname "$0")"; F=lib/people_rp/rp_posed_00178_29.glb
[ -f "$F" ] && { echo "people already present"; exit 0; }
T=$(mktemp -d); curl -sSL --max-time 300 -o "$T/p.zip" "https://renderpeople.com/sample/free/rp_posed_00178_29_GLB.zip"
mkdir -p lib/people_rp; unzip -q -o -j "$T/p.zip" rp_posed_00178_29.glb -d lib/people_rp; rm -rf "$T"; echo "people ready: $F"
