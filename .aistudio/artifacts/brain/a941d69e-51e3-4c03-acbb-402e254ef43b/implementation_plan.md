# Stickman Studio & Blender Code Generator

A production-grade interactive Web Studio and GitHub-ready code suite for generating minimalist stickman animations with synchronized procedural sound effects, instant browser video export, and automated Blender (`bpy`) Python scripts for 3D/2D animation and rendering.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural decisions have been synthesized from your responses:
> - **Primary Workspace**: Interactive Web Studio delivering real-time Canvas preview, timeline control, and instant one-click code generation for Blender & Python.
> - **Animation Genre**: Educational and technical presentations with expressive character motions (explaining at whiteboard, typing code on laptops, thinking, presenting diagrams, celebratory milestones).
> - **Sound Effects Strategy**: Dual-mode audio engine—browser-native procedural Web Audio API for zero-latency live preview and export, paired with pure Python/Blender audio generation scripts (`wave` module and Blender VSE audio sequencer) with zero external setup headaches.

- **Confirmed Decision 1**: Interactive web app with multi-format export (WebM video, Blender Python script `stickman_blender.py`, standalone Python script `stickman_animator.py`, procedural audio synthesizer `generate_sfx.py`, and complete GitHub project ZIP/tarball).
- **Confirmed Decision 2**: Curated set of educational and technical motion routines (Teacher/Presenter, Programmer at Workstation, Whiteboard Diagram Solver, Eureka/Idea Revelation, Gesture Debate) plus custom keyframe parameter sliders.
- **Confirmed Decision 3**: Complete procedural audio generation without requiring complex external binaries—Blender scripts utilize Blender's built-in Video Sequence Editor (`bpy.context.scene.sequence_editor`) and Python scripts utilize standard library `wave` and `struct` to generate punchy pop, swoosh, click, and chime sound effects.

---

### 1. Overview & Core Concept

- **What It Does**: 
  - Allows creators, educators, and developers to choreograph educational stickman animations with realistic physics, expressive limb kinematics, and responsive facial gestures.
  - Generates ready-to-run, copy-pasteable Blender 4.x/3.x Python automation scripts that procedurally construct meshes, armature rigs, materials, cameras, keyframes, and audio tracks in Blender with a single click.
  - Generates standalone Python scripts using standard libraries and lightweight engines to render frames directly from the terminal or GitHub CI/CD.
  - Plays back animations smoothly at 60 FPS in the browser with live synthesized audio cues (footsteps, chalkboard scribbles, keyboard clicks, wooshes, bell chimes) and records them to video (WebM/MP4) on demand.
- **Target Audience**: Content creators making tech/coding tutorials, GitHub developers seeking an automated animation toolkit, and 3D animators looking for programmatic Blender rigs.
- **Key Value**: Eliminates the steep learning curve of keyframe rigging in Blender by turning high-level choreography and technical explanations into instant, tested code.

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Preset & Template Selection**: User selects an educational scene preset (e.g., *"Explaining an Algorithm on Whiteboard"*, *"Coder Debugging at Desk"*, *"Eureka Lightning Idea"*, *"Comparing Two Solutions"*).
  2. **Interactive Preview & Director Controls**: User scrubs the timeline, adjusts playback speed, changes stickman proportions (line thickness, head size, limb length, accent colors), toggles props (laptop, desk, blackboard, thought bubble), and tweaks audio pitch and volume.
  3. **Live Canvas Playback**: Real-time 60 FPS canvas with synchronized procedural sound effects (keyboard clatter, swooshes, chalk scribbles, pop bubbles).
  4. **Code Inspection & Customization**: Tabbed code viewers for:
     - **Blender Python (`bpy`)**: Ready to run in Blender's Scripting tab (or headless `blender -b -P script.py`).
     - **Standalone Python (`render.py`)**: Terminal-executable script with pure Python wave audio generation.
     - **GitHub Repo Bundle**: `README.md`, `run_animation.py`, `setup.sh`, and `.gitignore`.
  5. **Export Options**: 
     - Download recorded video directly (`.webm`).
     - Copy/Download Python and Blender scripts.
     - Download complete GitHub repository structure as a `.zip`.

- **Visual Identity & Theme**:
  - **Aesthetic Direction**: Clean, modern engineering studio aesthetic inspired by modern developer consoles and high-end 3D software (Blender, Linear, VS Code).
  - **Color Palette**: Dark slate canvas (`#090D16`), deep panel containers (`#111827`, `#1E293B`), sharp border lines (`#334155`), with an electric cyan accent (`#06B6D4` / `#0891B2`) and warm chalkboard amber (`#F59E0B`).
  - **Typography & Hierarchy**: 
    - Display font: `Plus Jakarta Sans` for crisp titles and clean hierarchy.
    - Mono font: `JetBrains Mono` / `tabular-nums` for timestamps, frame counts, slider parameters, and code viewports.
  - **Zero-Pill Discipline**: Clean textual metadata with subtle separators (`·`), structured split-pane workspace, and high-contrast code viewers with line numbers and copy buttons.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Procedural Stickman Rigging in Blender (`bpy`) vs Pre-packaged `.blend` files**:
  - *Chosen Approach*: Write a self-contained Python script using Blender's Python API (`bpy`) that creates all meshes (spheres, cylinders, curves or armature bones), materials (emission/toon shaders), cameras, lighting, and timeline keyframes on the fly.
  - *Why*: Self-contained scripts run seamlessly without external asset dependencies or version mismatches across Blender 3.6 to 4.3+. Users can run it headless (`blender -b -P stickman.py -a`) or open Blender and click "Run Script".
- **Decision 2: Dual Audio Pipeline (Browser Web Audio + Python Wave Synthesizer)**:
  - *Chosen Approach*: Implement Web Audio API synthesizers in the browser for instant feedback, and generate an accompanying `generate_sfx.py` that synthesizes the exact same sound waves (chalk, swoosh, click, bell, pop) into 16-bit PCM `.wav` files using standard Python `wave` and `math` modules.
  - *Why*: Eliminates hefty audio asset downloads, prevents missing-file errors on GitHub, and enables automated video assembly with Blender's Video Sequence Editor.
- **Decision 3: In-Browser Video Recording**:
  - *Chosen Approach*: Use HTML5 Canvas `captureStream()` combined with Web Audio `MediaStreamDestination` and `MediaRecorder`.
  - *Why*: Allows instant preview and immediate video download without requiring the user to leave the browser or wait for a server render.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Stickman Web Studio UI                          │
├─────────────────────┬──────────────────────────┬───────────────────────┤
│    Scene Director   │   Live 60 FPS Viewport   │  Code & Repo Exporter │
│  - Preset Selector  │  - Canvas 2D Kinematics  │  - Blender Script     │
│  - Character Custom │  - Real-time Timeline    │  - Python Render      │
│  - Props & Scene    │  - Procedural Web Audio  │  - Wave SFX Gen       │
│  - Timeline Scrub   │  - Video MediaRecorder   │  - GitHub ZIP Pack    │
└──────────┬──────────┴────────────┬─────────────┴───────────┬───────────┘
           │                       │                         │
           ▼                       ▼                         ▼
┌─────────────────────┐ ┌──────────────────────┐ ┌───────────────────────┐
│ Animation State &   │ │ Web Audio Engine     │ │ Script Generator      │
│ Kinematics Model    │ │ - Chalkboard scratch │ │ - bpy Python builder  │
│ - Keyframe curves   │ │ - Keyboard clicks    │ │ - Blender VSE tracks  │
│ - Bone angles       │ │ - Swooshes & pops    │ │ - Standard wave audio │
│ - Prop coordinates  │ │ - Audio buffer sync  │ │ - GitHub README & CLI │
└─────────────────────┘ └──────────────────────┘ └───────────────────────┘
```

#### Core Components & Modules:
1. **Kinematics & Scene Presets (`src/engine/presets.ts`, `src/engine/kinematics.ts`)**:
   - Algorithmic skeletal calculations (head, torso, shoulders, elbows, hands, hips, knees, feet).
   - Rich educational scenes:
     - *Algorithm & Whiteboard*: Stickman draws flowchart nodes, steps back, strokes chin, circles key insight.
     - *Developer at Terminal*: Stickman types furiously, screen glows, celebratory double-fist pump when test passes.
     - *Concept Explainer*: Pointing to floating 3D text/diagrams with synchronized accent chimes.
     - *Thinking & Eureka*: Stickman walks in thought loop, lightbulb appears overhead with a crisp ding sound.
2. **Audio Synthesizer Engine (`src/engine/audioSynth.ts`)**:
   - Web Audio oscillator and noise generators:
     - `playChalkScratch(duration)`
     - `playKeyClick()`
     - `playWhoosh()`
     - `playPop()`
     - `playChime()`
3. **Blender Script Generator (`src/engine/blenderGenerator.ts`)**:
   - Generates clean, PEP8-compliant Python code:
     - Clears scene, sets up camera (orthographic/perspective) and soft three-point lighting.
     - Builds stickman hierarchy using Armature + Bone IK or clean Bevel Curves / Mesh Cylinders with unshaded/Toon materials.
     - Adds props (monitor, whiteboard, desk, thought bubble).
     - Inserts keyframes (`fcurve`) matching the browser choreography.
     - Injects sound cues directly into Blender's Video Sequence Editor (`sequence_editor.sequences.new_sound`).
4. **Python Video & SFX Generator (`src/engine/pythonGenerator.ts`)**:
   - Standalone `generate_sfx.py` synthesizing uncompressed WAV audio files using only `wave`, `struct`, and `math`.
   - Standalone `render_stickman.py` that can render frames and assemble MP4 via MoviePy or OpenCV, with instructions for headless execution.
5. **Interactive Studio UI (`src/components/Studio.tsx`, `src/components/CodeViewer.tsx`, `src/components/Timeline.tsx`)**:
   - High-density developer dashboard with responsive panels, dark theme, smooth timeline scrubbing, play/pause, loop, frame stepping, and one-click copy and zip download.

---

### Verification & Testing Plan
- Verify smooth 60 FPS Canvas rendering across all educational scene presets.
- Test timeline scrubbing, frame stepping, and parameter adjustments.
- Verify real-time Web Audio synchronization with animation events.
- Test client-side video recording and verify recorded WebM file validity.
- Verify generated Blender Python script syntax, API compatibility with Blender 3.x/4.x, and headless command instructions.
- Verify generated Python wave audio generator syntax and standalone runnable code.
- Check build and linting with zero compilation or TypeScript errors.
