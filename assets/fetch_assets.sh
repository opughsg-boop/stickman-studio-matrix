#!/usr/bin/env bash
# Re-downloads the 3D models + HDRIs used only by the "cine" engine (not needed for the diorama style).
set -e; cd "$(dirname "$0")"; mkdir -p models hdri
B=https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf
for f in RobotExpressive/RobotExpressive.glb Xbot.glb Michelle.glb Soldier.glb Horse.glb Flamingo.glb Parrot.glb Stork.glb facecap.glb LeePerrySmith/LeePerrySmith.glb ferrari.glb; do
  [ -f models/$(basename $f) ] || curl -sfL -o models/$(basename $f) $B/$f; done
[ -f models/Fox.glb ] || curl -sfL -o models/Fox.glb https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Fox/glTF-Binary/Fox.glb
for h in studio_small_09 kloofendal_48d_partly_cloudy_puresky potsdamer_platz brown_photostudio_02 forest_slope; do
  [ -f hdri/$h.hdr ] || curl -sfL -o hdri/$h.hdr https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/${h}_1k.hdr; done
echo "assets ready"
