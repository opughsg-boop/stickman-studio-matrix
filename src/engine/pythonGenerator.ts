/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ScenePreset, StickmanStyle } from '../types.ts';

/**
 * Generates pure Python procedural audio synthesizer (100% standard library, no pip install needed)
 */
export function generateSfxScript(): string {
  return `#!/usr/bin/env python3
"""
=============================================================================
Procedural Sound Effects Synthesizer for Stickman Animations
Zero Dependencies: Uses only Python standard library ('wave', 'struct', 'math', 'random')
=============================================================================
"""

import wave
import struct
import math
import random
import os

SAMPLE_RATE = 44100
SFX_DIR = os.path.join(os.path.dirname(__file__), "sfx")
os.makedirs(SFX_DIR, exist_ok=True)

def write_wav(filename, samples):
    filepath = os.path.join(SFX_DIR, filename)
    with wave.open(filepath, 'w') as wav_file:
        # 1 channel (mono), 2 bytes per sample (16-bit PCM), 44100 Hz
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(SAMPLE_RATE)
        
        # Pack float samples into signed 16-bit integers
        raw_data = bytearray()
        for s in samples:
            clamped = max(-1.0, min(1.0, s))
            int_val = int(clamped * 32767)
            raw_data.extend(struct.pack('<h', int_val))
        
        wav_file.writeframes(raw_data)
    print(f"Generated: {filepath} ({len(samples)/SAMPLE_RATE:.2f}s)")

def synthesize_chalk(duration=0.15, freq=2400):
    """Synthesizes high-frequency abrasive friction chalk scratching noise"""
    total_samples = int(SAMPLE_RATE * duration)
    samples = []
    prev = 0.0
    for i in range(total_samples):
        t = i / total_samples
        # Exponential fade envelope
        env = (1.0 - t) * math.exp(-2.5 * t)
        # Bandpass filtered noise
        noise = (random.random() * 2.0 - 1.0)
        # Simple IIR resonance
        angle = 2.0 * math.pi * freq / SAMPLE_RATE
        val = 0.7 * prev + 0.3 * noise * math.sin(angle * i)
        prev = val
        samples.append(val * env * 0.45)
    return samples

def synthesize_click():
    """Synthesizes mechanical keyboard click transient"""
    duration = 0.035
    total_samples = int(SAMPLE_RATE * duration)
    samples = []
    for i in range(total_samples):
        t = i / total_samples
        env = math.exp(-t * 80.0)
        # Frequency drop
        f = 1600.0 - t * 1200.0
        val = math.sin(2.0 * math.pi * f * (i / SAMPLE_RATE))
        noise = (random.random() * 2.0 - 1.0) * 0.2
        samples.append((val * 0.8 + noise) * env * 0.5)
    return samples

def synthesize_whoosh(duration=0.25):
    """Synthesizes smooth aerodynamic swoosh / whoosh"""
    total_samples = int(SAMPLE_RATE * duration)
    samples = []
    for i in range(total_samples):
        t = i / total_samples
        # Bell curve envelope
        env = math.sin(t * math.pi) ** 2
        f = 250.0 + math.sin(t * math.pi) * 850.0
        noise = (random.random() * 2.0 - 1.0)
        val = math.sin(2.0 * math.pi * f * (i / SAMPLE_RATE)) * 0.4 + noise * 0.6
        samples.append(val * env * 0.4)
    return samples

def synthesize_pop():
    """Synthesizes clean bubble pop"""
    duration = 0.08
    total_samples = int(SAMPLE_RATE * duration)
    samples = []
    for i in range(total_samples):
        t = i / total_samples
        env = math.exp(-t * 45.0)
        f = 520.0 * math.exp(-t * 22.0) + 80.0
        val = math.sin(2.0 * math.pi * f * (i / SAMPLE_RATE))
        samples.append(val * env * 0.6)
    return samples

def synthesize_bell():
    """Synthesizes crystal-clear Eureka ding / bell chime with harmonics"""
    duration = 1.3
    total_samples = int(SAMPLE_RATE * duration)
    samples = []
    partials = [(880.0, 0.45, 3.2), (1760.0, 0.25, 4.8), (2640.0, 0.12, 6.5)]
    for i in range(total_samples):
        t_sec = i / SAMPLE_RATE
        val = 0.0
        for freq, amp, decay in partials:
            env = amp * math.exp(-decay * t_sec)
            val += math.sin(2.0 * math.pi * freq * t_sec) * env
        samples.append(val)
    return samples

def synthesize_celebrate():
    """Synthesizes cheerful success arpeggio (C5 - E5 - G5 - C6)"""
    notes = [523.25, 659.25, 783.99, 1046.50]
    note_duration = 0.10
    samples = []
    for note_idx, freq in enumerate(notes):
        num_samples = int(SAMPLE_RATE * note_duration)
        for i in range(num_samples):
            t_sec = i / SAMPLE_RATE
            env = math.exp(-t_sec * 12.0) * 0.4
            val = math.sin(2.0 * math.pi * freq * t_sec) * env
            samples.append(val)
    # Ring out final note
    tail_samples = int(SAMPLE_RATE * 0.5)
    final_freq = 1046.50
    for i in range(tail_samples):
        t_sec = i / SAMPLE_RATE
        env = math.exp(-t_sec * 6.0) * 0.4
        val = math.sin(2.0 * math.pi * final_freq * t_sec) * env
        samples.append(val)
    return samples

def main():
    print("Synthesizing procedural sound effects...")
    write_wav("chalk.wav", synthesize_chalk())
    write_wav("click.wav", synthesize_click())
    write_wav("whoosh.wav", synthesize_whoosh())
    write_wav("pop.wav", synthesize_pop())
    write_wav("bell.wav", synthesize_bell())
    write_wav("celebrate.wav", synthesize_celebrate())
    print("All sound effects generated successfully in ./sfx/")

if __name__ == "__main__":
    main()
`;
}

/**
 * Generates standalone headless Python 2D renderer using Pillow and MoviePy / FFmpeg
 */
export function generatePythonRenderScript(preset: ScenePreset, style: StickmanStyle): string {
  const fps = 60;
  const totalFrames = Math.round(preset.duration * fps);

  return `#!/usr/bin/env python3
"""
=============================================================================
Stickman Headless 2D Video Renderer
Preset: ${preset.title}
Duration: ${preset.duration}s (${totalFrames} frames @ ${fps} FPS)
=============================================================================
Dependencies:
    pip install pillow opencv-python numpy
=============================================================================
"""

import os
import math
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

FPS = ${fps}
TOTAL_FRAMES = ${totalFrames}
WIDTH = 1280
HEIGHT = 720
OUTPUT_VIDEO = "stickman_rendered.mp4"

def ease_in_out(t):
    return 2 * t * t if t < 0.5 else -1 + (4 - 2 * t) * t

def render_frame(frame_num):
    t_norm = frame_num / TOTAL_FRAMES
    # Create dark slate background canvas
    img = Image.new("RGB", (WIDTH, HEIGHT), color=(9, 13, 22))
    draw = ImageDraw.Draw(img)
    
    # Ground floor line
    ground_y = int(HEIGHT * 0.82)
    draw.line([(0, ground_y), (WIDTH, ground_y)], fill=(40, 52, 70), width=2)
    
    cx = WIDTH // 2
    char_x = cx - 80
    pelvis_y = ground_y - 120
    
    # Motion logic matching preset: ${preset.id}
    ${preset.id === 'algorithm_whiteboard' ? `
    # Draw whiteboard
    board_rect = [cx + 40, ground_y - 320, cx + 460, ground_y - 40]
    draw.rectangle(board_rect, fill=(20, 26, 36), outline=(55, 68, 88), width=3)
    
    # Progressive chalk drawing
    if t_norm > 0.28:
        p_draw = min(1.0, (t_norm - 0.28) / 0.3)
        # Binary tree root
        draw.ellipse([cx + 230, ground_y - 280, cx + 270, ground_y - 240], outline=(6, 182, 212), width=3)
        if p_draw > 0.4:
            draw.line([(cx + 240, ground_y - 240), (cx + 170, ground_y - 180)], fill=(6, 182, 212), width=3)
            draw.ellipse([cx + 150, ground_y - 180, cx + 190, ground_y - 140], outline=(6, 182, 212), width=3)
        if p_draw > 0.7:
            draw.line([(cx + 260, ground_y - 240), (cx + 330, ground_y - 180)], fill=(6, 182, 212), width=3)
            draw.ellipse([cx + 310, ground_y - 180, cx + 350, ground_y - 140], outline=(245, 158, 11), width=4)
    ` : preset.props.laptop ? `
    # Desk and laptop
    desk_rect = [cx - 20, ground_y - 110, cx + 180, ground_y - 95]
    draw.rectangle(desk_rect, fill=(45, 55, 72))
    # Laptop base & glowing screen
    draw.line([(cx + 40, ground_y - 110), (cx + 110, ground_y - 110)], fill=(120, 140, 160), width=4)
    draw.line([(cx + 105, ground_y - 110), (cx + 125, ground_y - 155)], fill=(6, 182, 212), width=4)
    ` : ''}

    # Head
    head_radius = ${style.headSize}
    head_y = pelvis_y - 90
    draw.ellipse([char_x - head_radius, head_y - head_radius, char_x + head_radius, head_y + head_radius],
                 outline="${style.color}", fill="${style.headFill ? style.color : '#090d16'}", width=${style.lineThickness})
                 
    # Spine / Torso
    draw.line([(char_x, head_y + head_radius), (char_x, pelvis_y)], fill="${style.color}", width=${style.lineThickness})
    
    # Limbs (Legs)
    draw.line([(char_x, pelvis_y), (char_x - 30, ground_y)], fill="${style.color}", width=${style.lineThickness})
    draw.line([(char_x, pelvis_y), (char_x + 30, ground_y)], fill="${style.color}", width=${style.lineThickness})
    
    # Limbs (Arms)
    shoulder_y = head_y + head_radius + 15
    arm_anim = math.sin(t_norm * math.pi * 6) * 30
    draw.line([(char_x, shoulder_y), (char_x + 40 + arm_anim, shoulder_y + 30)], fill="${style.color}", width=${style.lineThickness})
    draw.line([(char_x, shoulder_y), (char_x - 35, shoulder_y + 35)], fill="${style.color}", width=${style.lineThickness})

    # Return as RGB numpy array for OpenCV
    return np.array(img)

def main():
    print(f"Rendering {TOTAL_FRAMES} frames @ {FPS} FPS to {OUTPUT_VIDEO}...")
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(OUTPUT_VIDEO, fourcc, FPS, (WIDTH, HEIGHT))
    
    for f in range(TOTAL_FRAMES):
        frame = render_frame(f)
        bgr_frame = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)
        out.write(bgr_frame)
        if f % 30 == 0:
            print(f"  Frame {f}/{TOTAL_FRAMES} ({(f/TOTAL_FRAMES)*100:.1f}%)")
            
    out.release()
    print(f"SUCCESS: Rendered video saved to {OUTPUT_VIDEO}")

if __name__ == "__main__":
    main()
`;
}

/**
 * Generates comprehensive GitHub repository documentation
 */
export function generateReadme(preset: ScenePreset, style: StickmanStyle): string {
  return `# 🎬 Stickman Animation & Blender Video Studio

[![Blender 3.x/4.x](https://img.shields.io/badge/Blender-3.6%20%7C%204.x-orange.svg)](https://www.blender.org/)
[![Python 3.9+](https://img.shields.io/badge/Python-3.9+-blue.svg)](https://www.python.org/)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

An open-source toolkit for generating minimalist stickman animations with synchronized procedural sound effects, interactive browser previews, and automated **Blender (bpy)** 3D scripts.

---

## 🌟 Features

- **Procedural 3D Blender Rig**: Complete automation script using Blender's Python API (\`bpy\`) to construct character meshes, emission materials, camera angles, lighting, and timeline keyframes with zero manual rigging.
- **Synchronized Audio Sequencer**: Integrates procedural sound effects (chalk scratch, keyboard clatter, whooshes, pops, bell dings) into Blender's Video Sequence Editor (VSE) automatically.
- **Zero-Dependency Sound Synthesizer**: \`generate_sfx.py\` synthesizes pure 16-bit PCM WAV audio using only Python standard library (\`wave\`, \`struct\`, \`math\`).
- **Headless CLI Rendering**: Run and render animations directly in CI/CD or headless servers without launching the Blender GUI.
- **Web Studio Preview**: Real-time 60 FPS HTML5 Canvas workspace with instant WebM video recording and export.

---

## 📁 Repository Structure

\`\`\`
.
├── stickman_blender.py     # Main Blender Python automation script
├── generate_sfx.py         # Pure Python procedural audio generator
├── render_stickman.py      # Standalone headless 2D video renderer
├── sfx/                    # Generated WAV audio files (chalk, click, bell, etc.)
├── run_blender.sh          # Linux / macOS headless execution script
├── run_blender.bat         # Windows execution script
├── requirements.txt        # Optional Python packages for 2D renderer
└── README.md               # Documentation & usage guide
\`\`\`

---

## 🚀 Quick Start Guide

### Step 1: Synthesize Sound Effects
Run the zero-dependency sound generator:
\`\`\`bash
python3 generate_sfx.py
\`\`\`
This creates \`./sfx/chalk.wav\`, \`./sfx/click.wav\`, \`./sfx/whoosh.wav\`, \`./sfx/bell.wav\`, and \`./sfx/celebrate.wav\`.

---

### Step 2: Run in Blender

#### Option A: Inside Blender GUI (Interactive)
1. Open **Blender 3.6+ or 4.x**.
2. Switch to the **Scripting** tab at the top.
3. Click **Open** or **New**, and paste the contents of \`stickman_blender.py\`.
4. Click the **▶ Run Script** button.
5. Press **Spacebar** in the 3D Viewport to play the animation with sound!

#### Option B: Headless Terminal Render (Automated)
To render the final MP4 video directly from your terminal:

**Linux / macOS:**
\`\`\`bash
chmod +x run_blender.sh
./run_blender.sh
\`\`\`
Or manually:
\`\`\`bash
blender -b -P stickman_blender.py -a
\`\`\`

**Windows:**
\`\`\`cmd
run_blender.bat
\`\`\`

---

### Step 3: Standalone 2D Python Renderer (Optional)
If you do not have Blender installed and want to render 2D frames directly:
\`\`\`bash
pip install -r requirements.txt
python3 render_stickman.py
\`\`\`

---

## ⚙️ Customization

In \`stickman_blender.py\`, you can tweak:
- \`STICK_COLOR\`: Stickman line color (Current: \`${style.color}\`)
- \`ACCENT_COLOR\`: Props & lighting accent color (Current: \`${style.accentColor}\`)
- \`FPS\`: Frame rate (Default: \`60\`)
- \`PRESET_ID\`: Scene choreography (\`${preset.id}\`)

---

## 📄 License
Licensed under Apache 2.0. Feel free to use in educational channels, YouTube videos, and open-source projects!
`;
}

export function generateRequirements(): string {
  return `# Optional dependencies for standalone 2D renderer
# (Blender execution requires NO pip packages)
pillow>=10.0.0
opencv-python>=4.8.0
numpy>=1.24.0
`;
}

export function generateShellScript(): string {
  return `#!/usr/bin/env bash
# Headless Blender render script
set -e

echo "=== Generating Procedural Sound Effects ==="
python3 generate_sfx.py

echo "=== Rendering Stickman Animation with Blender ==="
# Search for blender binary in PATH or standard macOS/Linux paths
BLENDER_BIN="blender"
if ! command -v blender &> /dev/null; then
    if [ -f "/Applications/Blender.app/Contents/MacOS/Blender" ]; then
        BLENDER_BIN="/Applications/Blender.app/Contents/MacOS/Blender"
    else
        echo "Error: Blender executable not found in PATH or Applications."
        echo "Please install Blender or add it to PATH."
        exit 1
    fi
fi

$BLENDER_BIN -b -P stickman_blender.py -a
echo "=== Done! Video saved in ./renders/ ==="
`;
}

export function generateBatchScript(): string {
  return `@echo off
echo === Generating Procedural Sound Effects ===
python generate_sfx.py

echo === Rendering Stickman Animation with Blender ===
blender -b -P stickman_blender.py -a

echo === Done! Video saved in .\\renders\\ ===
pause
`;
}
