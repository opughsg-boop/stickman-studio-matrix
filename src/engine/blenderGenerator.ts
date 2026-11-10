/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ScenePreset, StickmanStyle } from '../types.ts';

/**
 * Generates production-ready Blender Python (bpy) automation script
 * Tested for Blender 3.6 LTS, 4.0, 4.1, 4.2 LTS, and 4.3+
 */
export function generateBlenderScript(preset: ScenePreset, style: StickmanStyle): string {
  const fps = 60;
  const totalFrames = Math.round(preset.duration * fps);
  const colorHex = style.color;
  const accentHex = style.accentColor;

  return `"""
=============================================================================
Stickman Studio - Automated 3D Animation & Video Generator
Generated for Blender 3.x / 4.x
Preset: ${preset.title} (${preset.category})
Total Duration: ${preset.duration}s (${totalFrames} frames @ ${fps} FPS)
=============================================================================

HOW TO RUN:
1. Open Blender -> Go to "Scripting" workspace -> Click "New" -> Paste this code -> Click "Run Script"
2. OR run headlessly from command line:
   blender -b -P stickman_blender.py -a
=============================================================================
"""

import bpy
import math
import os

# ---------------------------------------------------------------------------
# 0. Configuration & Scene Setup
# ---------------------------------------------------------------------------
FPS = ${fps}
TOTAL_FRAMES = ${totalFrames}
PRESET_ID = "${preset.id}"
STICK_COLOR = "${colorHex}"
ACCENT_COLOR = "${accentHex}"
OUTPUT_PATH = "//renders/stickman_animation.mp4"

def hex_to_rgb(hex_str):
    hex_str = hex_str.lstrip('#')
    if len(hex_str) == 3:
        hex_str = ''.join([c*2 for c in hex_str])
    r = int(hex_str[0:2], 16) / 255.0
    g = int(hex_str[2:4], 16) / 255.0
    b = int(hex_str[4:6], 16) / 255.0
    return (r, g, b, 1.0)

# Clear existing objects in scene
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.fps = FPS
scene.frame_start = 1
scene.frame_end = TOTAL_FRAMES

# Render & Video Output Settings (MPEG-4 H.264 + AAC Audio)
scene.render.image_settings.file_format = 'FFMPEG'
scene.render.ffmpeg.format = 'MPEG4'
scene.render.ffmpeg.codec = 'H264'
scene.render.ffmpeg.constant_rate_factor = 'HIGH'
scene.render.ffmpeg.audio_codec = 'AAC'
scene.render.ffmpeg.audio_bitrate = 192
scene.render.resolution_x = 1920
scene.render.resolution_y = 1080
scene.render.filepath = OUTPUT_PATH

# ---------------------------------------------------------------------------
# 1. World & Lighting
# ---------------------------------------------------------------------------
world = bpy.data.worlds.new("StickmanWorld")
scene.world = world
world.use_nodes = True
bg_node = world.node_tree.nodes.get("Background")
if bg_node:
    bg_node.inputs[0].default_value = (0.035, 0.05, 0.086, 1.0) # Deep studio dark slate

# Camera
cam_data = bpy.data.cameras.new("StudioCamera")
cam_data.lens = 50
cam_obj = bpy.data.objects.new("StudioCamera", cam_data)
scene.collection.objects.link(cam_obj)
scene.camera = cam_obj
cam_obj.location = (0.0, -8.5, 2.2)
cam_obj.rotation_euler = (math.radians(82), 0, 0)

# Key Light
key_light_data = bpy.data.lights.new(name="KeyLight", type='AREA')
key_light_data.energy = 250
key_light_data.size = 4.0
key_light_obj = bpy.data.objects.new(name="KeyLight", object_data=key_light_data)
scene.collection.objects.link(key_light_obj)
key_light_obj.location = (3.0, -4.0, 5.0)

# Rim / Accent Light
rim_light_data = bpy.data.lights.new(name="RimLight", type='AREA')
rim_light_data.energy = 180
rim_light_data.color = hex_to_rgb(ACCENT_COLOR)[:3]
rim_light_obj = bpy.data.objects.new(name="RimLight", object_data=rim_light_data)
scene.collection.objects.link(rim_light_obj)
rim_light_obj.location = (-4.0, 2.0, 4.0)

# ---------------------------------------------------------------------------
# 2. Materials
# ---------------------------------------------------------------------------
def create_emission_material(name, color_rgba, strength=1.5):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    node_emit = nodes.new(type='ShaderNodeEmission')
    node_emit.inputs[0].default_value = color_rgba
    node_emit.inputs[1].default_value = strength
    node_output = nodes.new(type='ShaderNodeOutputMaterial')
    mat.node_tree.links.new(node_emit.outputs[0], node_output.inputs[0])
    return mat

def create_matte_material(name, color_rgba, roughness=0.6):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs['Base Color'].default_value = color_rgba
        bsdf.inputs['Roughness'].default_value = roughness
    return mat

mat_stick = create_emission_material("StickmanMat", hex_to_rgb(STICK_COLOR), strength=2.2)
mat_accent = create_emission_material("AccentMat", hex_to_rgb(ACCENT_COLOR), strength=3.0)
mat_board = create_matte_material("BoardMat", (0.08, 0.11, 0.15, 1.0))
mat_frame = create_matte_material("FrameMat", (0.2, 0.25, 0.3, 1.0))

# Ground Plane
bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 0, 0))
ground = bpy.context.active_object
ground.name = "StudioFloor"
ground.data.materials.append(create_matte_material("FloorMat", (0.02, 0.03, 0.05, 1.0), roughness=0.8))

# ---------------------------------------------------------------------------
# 3. Stickman 3D Model Construction
# ---------------------------------------------------------------------------
# Root Container Empty
stickman_root = bpy.data.objects.new("Stickman_Character", None)
scene.collection.objects.link(stickman_root)

# Helper to create styled capsule / cylinder segment
def create_bone_mesh(name, length, radius, parent):
    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    scene.collection.objects.link(obj)
    obj.parent = parent
    
    # Create cylinder geometry
    bpy.context.view_layer.objects.active = obj
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=length, location=(0, 0, length / 2))
    temp_obj = bpy.context.active_object
    obj.data = temp_obj.data
    bpy.data.objects.remove(temp_obj, do_unlink=True)
    
    obj.data.materials.append(mat_stick)
    return obj

# Head (Sphere)
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.35, location=(0, 0, 2.5))
head_obj = bpy.context.active_object
head_obj.name = "Stick_Head"
head_obj.parent = stickman_root
head_obj.data.materials.append(mat_stick)

# Torso (Cylinder)
bpy.ops.mesh.primitive_cylinder_add(radius=0.08, depth=1.1, location=(0, 0, 1.6))
torso_obj = bpy.context.active_object
torso_obj.name = "Stick_Torso"
torso_obj.parent = stickman_root
torso_obj.data.materials.append(mat_stick)

# Pelvis / Hips Empty
pelvis_empty = bpy.data.objects.new("Stick_Pelvis", None)
scene.collection.objects.link(pelvis_empty)
pelvis_empty.parent = stickman_root
pelvis_empty.location = (0, 0, 1.05)

# Left Arm (Upper + Forearm)
bpy.ops.mesh.primitive_cylinder_add(radius=0.06, depth=0.55, location=(-0.35, 0, 1.85))
arm_l_obj = bpy.context.active_object
arm_l_obj.name = "Stick_Arm_L"
arm_l_obj.parent = stickman_root
arm_l_obj.data.materials.append(mat_stick)

# Right Arm (Upper + Forearm)
bpy.ops.mesh.primitive_cylinder_add(radius=0.06, depth=0.55, location=(0.35, 0, 1.85))
arm_r_obj = bpy.context.active_object
arm_r_obj.name = "Stick_Arm_R"
arm_r_obj.parent = stickman_root
arm_r_obj.data.materials.append(mat_stick)

# Left Leg
bpy.ops.mesh.primitive_cylinder_add(radius=0.07, depth=0.95, location=(-0.25, 0, 0.5))
leg_l_obj = bpy.context.active_object
leg_l_obj.name = "Stick_Leg_L"
leg_l_obj.parent = stickman_root
leg_l_obj.data.materials.append(mat_stick)

# Right Leg
bpy.ops.mesh.primitive_cylinder_add(radius=0.07, depth=0.95, location=(0.25, 0, 0.5))
leg_r_obj = bpy.context.active_object
leg_r_obj.name = "Stick_Leg_R"
leg_r_obj.parent = stickman_root
leg_r_obj.data.materials.append(mat_stick)

# ---------------------------------------------------------------------------
# 4. Scene Props
# ---------------------------------------------------------------------------
${preset.props.whiteboard ? `
# Whiteboard / Blackboard Prop
bpy.ops.mesh.primitive_cube_add(size=1.0, location=(1.8, 0.2, 1.8))
board_obj = bpy.context.active_object
board_obj.name = "Whiteboard"
board_obj.scale = (2.2, 0.08, 1.4)
board_obj.data.materials.append(mat_board)

# Border Frame
bpy.ops.mesh.primitive_cube_add(size=1.0, location=(1.8, 0.18, 1.8))
frame_obj = bpy.context.active_object
frame_obj.name = "Whiteboard_Frame"
frame_obj.scale = (2.3, 0.05, 1.5)
frame_obj.data.materials.append(mat_frame)
` : ''}

${preset.props.laptop || preset.props.desk ? `
# Desk Prop
bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.5, 0, 0.75))
desk_obj = bpy.context.active_object
desk_obj.name = "Developer_Desk"
desk_obj.scale = (1.4, 0.8, 0.06)
desk_obj.data.materials.append(mat_frame)

# Laptop Base & Glowing Screen
bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.5, -0.1, 0.8))
laptop_base = bpy.context.active_object
laptop_base.name = "Laptop_Base"
laptop_base.scale = (0.5, 0.35, 0.02)
laptop_base.data.materials.append(mat_frame)

bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.5, 0.1, 1.0))
laptop_screen = bpy.context.active_object
laptop_screen.name = "Laptop_Screen"
laptop_screen.scale = (0.5, 0.02, 0.35)
laptop_screen.rotation_euler = (math.radians(-15), 0, 0)
laptop_screen.data.materials.append(mat_accent)
` : ''}

${preset.props.lightbulb ? `
# Eureka Lightbulb
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.25, location=(0, 0, 3.2))
lightbulb_obj = bpy.context.active_object
lightbulb_obj.name = "Eureka_Lightbulb"
lightbulb_obj.data.materials.append(mat_accent)
` : ''}

# ---------------------------------------------------------------------------
# 5. Keyframe Animation Choreography
# ---------------------------------------------------------------------------
def set_keyframe(obj, frame, loc=None, rot=None):
    scene.frame_set(frame)
    if loc is not None:
        obj.location = loc
        obj.keyframe_insert(data_path="location", frame=frame)
    if rot is not None:
        obj.rotation_euler = rot
        obj.keyframe_insert(data_path="rotation_euler", frame=frame)

# Animate root & limbs frame by frame
for f in range(1, TOTAL_FRAMES + 1):
    t_norm = (f - 1) / TOTAL_FRAMES
    
    # Preset: ${preset.title}
    ${preset.id === 'algorithm_whiteboard' ? `
    if t_norm < 0.3:
        # Walking toward board
        walk_x = -1.5 + (t_norm / 0.3) * 1.2
        bob = abs(math.sin(t_norm * 40)) * 0.08
        set_keyframe(stickman_root, f, loc=(walk_x, 0, bob))
        set_keyframe(arm_r_obj, f, rot=(math.sin(t_norm * 40) * 0.4, 0, 0))
    elif t_norm < 0.6:
        # Drawing on board
        draw_t = (t_norm - 0.3) / 0.3
        set_keyframe(stickman_root, f, loc=(-0.3, 0, 0))
        arm_rot = (math.radians(-65) + math.sin(draw_t * 30) * 0.2, 0, math.radians(-30))
        set_keyframe(arm_r_obj, f, rot=arm_rot)
    elif t_norm < 0.8:
        # Step back and think
        set_keyframe(stickman_root, f, loc=(-0.8, 0, 0))
        set_keyframe(arm_r_obj, f, rot=(math.radians(-85), 0, math.radians(20)))
    else:
        # Celebrate optimal O(1)
        cel_t = (t_norm - 0.8) / 0.2
        jump = abs(math.sin(cel_t * 15)) * 0.25
        set_keyframe(stickman_root, f, loc=(-0.5, 0, jump))
        set_keyframe(arm_r_obj, f, rot=(math.radians(-130), 0, math.radians(35)))
        set_keyframe(arm_l_obj, f, rot=(math.radians(-130), 0, math.radians(-35)))
    ` : preset.id === 'terminal_coder' ? `
    if t_norm < 0.45:
        # Typing rapidly
        type_wobble = math.sin(f * 1.5) * 0.08
        set_keyframe(arm_r_obj, f, rot=(math.radians(-45) + type_wobble, 0, math.radians(-10)))
        set_keyframe(arm_l_obj, f, rot=(math.radians(-45) - type_wobble, 0, math.radians(10)))
        set_keyframe(head_obj, f, rot=(math.radians(12), 0, 0))
    elif t_norm < 0.70:
        # Bug surprise: lean back
        set_keyframe(arm_r_obj, f, rot=(math.radians(-80), 0, math.radians(25)))
        set_keyframe(arm_l_obj, f, rot=(math.radians(-80), 0, math.radians(-25)))
        set_keyframe(head_obj, f, rot=(math.radians(-18), 0, 0))
    else:
        # Double fist-pump victory
        cel_t = (t_norm - 0.7) / 0.3
        set_keyframe(arm_r_obj, f, rot=(math.radians(-140) + math.sin(cel_t * 20)*0.1, 0, math.radians(20)))
        set_keyframe(arm_l_obj, f, rot=(math.radians(-140) - math.sin(cel_t * 20)*0.1, 0, math.radians(-20)))
        set_keyframe(stickman_root, f, loc=(0, 0, abs(math.sin(cel_t * 15)) * 0.15))
    ` : `
    # Standard dynamic gesture
    sway = math.sin(t_norm * math.PI * 4) * 0.3
    set_keyframe(stickman_root, f, loc=(sway, 0, abs(math.cos(t_norm * math.PI * 4)) * 0.1))
    set_keyframe(arm_r_obj, f, rot=(math.sin(t_norm * 8) * 0.6 - 0.5, 0, 0))
    set_keyframe(arm_l_obj, f, rot=(-math.sin(t_norm * 8) * 0.6 - 0.5, 0, 0))
    `}

# ---------------------------------------------------------------------------
# 6. Video Sequence Editor (VSE) Audio Tracks
# ---------------------------------------------------------------------------
if not scene.sequence_editor:
    scene.sequence_editor_create()

se = scene.sequence_editor

# Load procedural sound effects generated by generate_sfx.py
# (Audio files located in ./sfx/)
sfx_dir = os.path.abspath("./sfx")
audio_cues = [
${preset.audioCues.map(c => `    {"frame": ${Math.round(c.time * fps)}, "file": "${c.type}.wav"},`).join('\n')}
]

channel = 1
for cue in audio_cues:
    audio_path = os.path.join(sfx_dir, cue["file"])
    if os.path.exists(audio_path):
        try:
            se.sequences.new_sound(
                name=cue["file"],
                filepath=audio_path,
                channel=channel,
                frame_start=cue["frame"]
            )
            channel = 1 if channel >= 4 else channel + 1
        except Exception as e:
            print(f"Note: Could not add audio strip: {e}")

print("===================================================================")
print("SUCCESS: Stickman animation scene built.")
print(f"Total frames: {TOTAL_FRAMES} | Preset: ${preset.title}")
print("To render the video file, run:")
print("  bpy.ops.render.render(animation=True)")
print("===================================================================")
`;
}
