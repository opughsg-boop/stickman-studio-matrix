/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Code2,
  Download,
  Eye,
  Sliders,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { audioSynth } from './engine/audioSynth.ts';
import { renderStickmanCanvas } from './engine/canvasRenderer.ts';
import { computeSkeletalPose } from './engine/kinematics.ts';
import { SCENE_PRESETS } from './engine/presets.ts';
import { downloadBlob, packageGithubRepository } from './engine/repoPackager.ts';
import { videoRecorder } from './engine/videoRecorder.ts';
import { AudioTestPanel } from './components/AudioTestPanel.tsx';
import { CodeViewer } from './components/CodeViewer.tsx';
import { Header } from './components/Header.tsx';
import { PresetSelector } from './components/PresetSelector.tsx';
import { StickmanControls } from './components/StickmanControls.tsx';
import { TimelineControls } from './components/TimelineControls.tsx';
import { ScenePreset, StickmanStyle } from './types.ts';

const DEFAULT_STYLE: StickmanStyle = {
  lineThickness: 4,
  color: '#FFFFFF',
  headSize: 20,
  headFill: false,
  limbScale: 1.0,
  accentColor: '#06B6D4',
  shadowEnabled: true,
  wireframeBones: false,
  facialExpression: 'neutral',
};

export default function App() {
  const [preset, setPreset] = useState<ScenePreset>(SCENE_PRESETS[0]);
  const [style, setStyle] = useState<StickmanStyle>(DEFAULT_STYLE);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isLooping, setIsLooping] = useState<boolean>(true);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isDownloadingZip, setIsDownloadingZip] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingProgress, setRecordingProgress] = useState<number>(0);
  const [activeSidebarTab, setActiveSidebarTab] = useState<'presets' | 'style' | 'sfx'>('presets');
  const [activeMainTab, setActiveMainTab] = useState<'viewport' | 'code'>('viewport');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const triggeredCuesRef = useRef<Set<number>>(new Set());

  // Keep refs in sync for requestAnimationFrame loop
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const isLoopingRef = useRef(isLooping);
  isLoopingRef.current = isLooping;
  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;
  const durationRef = useRef(preset.duration);
  durationRef.current = preset.duration;
  const speedRef = useRef(playbackSpeed);
  speedRef.current = playbackSpeed;
  const audioEnabledRef = useRef(audioEnabled);
  audioEnabledRef.current = audioEnabled;
  const isRecordingRef = useRef(isRecording);
  isRecordingRef.current = isRecording;

  // Handle preset change
  const handleSelectPreset = (newPreset: ScenePreset) => {
    setPreset(newPreset);
    setCurrentTime(0);
    currentTimeRef.current = 0;
    triggeredCuesRef.current.clear();
  };

  // Main 60 FPS Animation & Audio loop
  useEffect(() => {
    let animId: number;

    const loop = (timestamp: number) => {
      const deltaSec = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;

      // Update time if playing
      if (isPlayingRef.current) {
        let nextTime = currentTimeRef.current + deltaSec * speedRef.current;

        // Check audio cues for this preset
        if (audioEnabledRef.current) {
          preset.audioCues.forEach((cue, index) => {
            if (
              !triggeredCuesRef.current.has(index) &&
              currentTimeRef.current <= cue.time &&
              nextTime >= cue.time
            ) {
              triggeredCuesRef.current.add(index);
              audioSynth.triggerCue(cue.type);
            }
          });
        }

        // Loop or stop
        if (nextTime >= durationRef.current) {
          if (isRecordingRef.current) {
            // Finish video recording when reaching end
            videoRecorder.stopRecording();
            setIsRecording(false);
            isRecordingRef.current = false;
            setIsPlaying(false);
            nextTime = durationRef.current;
          } else if (isLoopingRef.current) {
            nextTime = 0;
            triggeredCuesRef.current.clear();
          } else {
            nextTime = durationRef.current;
            setIsPlaying(false);
          }
        }

        currentTimeRef.current = nextTime;
        setCurrentTime(nextTime);

        if (isRecordingRef.current) {
          setRecordingProgress(nextTime / durationRef.current);
        }
      }

      // Render to canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const pose = computeSkeletalPose(
            preset.id,
            currentTimeRef.current,
            preset.duration,
            style,
            canvas.width,
            canvas.height
          );
          renderStickmanCanvas(ctx, pose, style, canvas.width, canvas.height, preset.id);
        }
      }

      animId = requestAnimationFrame(loop);
    };

    lastTimeRef.current = performance.now();
    animId = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(animId);
  }, [preset, style]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is inside an input or textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => {
          if (!p) audioSynth.unlock();
          return !p;
        });
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        stepFrame(-1);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        stepFrame(1);
      } else if (e.code === 'KeyR') {
        e.preventDefault();
        resetPlayhead();
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        setAudioEnabled((a) => !a);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [preset.duration]);

  const stepFrame = (delta: number) => {
    setIsPlaying(false);
    const fps = 60;
    const newTime = Math.max(0, Math.min(preset.duration, currentTimeRef.current + delta / fps));
    currentTimeRef.current = newTime;
    setCurrentTime(newTime);
  };

  const seekTime = (time: number) => {
    currentTimeRef.current = time;
    setCurrentTime(time);
    // Reset cues ahead of new time
    const updated = new Set<number>();
    preset.audioCues.forEach((c, idx) => {
      if (c.time < time) updated.add(idx);
    });
    triggeredCuesRef.current = updated;
  };

  const resetPlayhead = () => {
    seekTime(0);
  };

  const togglePlayPause = () => {
    audioSynth.unlock();
    setIsPlaying((prev) => !prev);
  };

  // Start in-browser video export
  const handleStartRecord = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    audioSynth.unlock();
    seekTime(0);
    setIsRecording(true);
    setRecordingProgress(0);
    isRecordingRef.current = true;

    const started = videoRecorder.startRecording(canvas, 60, (recordedBlob) => {
      downloadBlob(recordedBlob, `stickman_${preset.id}.webm`);
    });

    if (started) {
      setIsPlaying(true);
    } else {
      setIsRecording(false);
      isRecordingRef.current = false;
    }
  };

  // Download GitHub repository package
  const handleDownloadZip = async () => {
    try {
      setIsDownloadingZip(true);
      const zipBlob = await packageGithubRepository(preset, style);
      downloadBlob(zipBlob, 'stickman-studio-blender.zip');
    } catch (err) {
      console.error('Failed to package zip:', err);
    } finally {
      setIsDownloadingZip(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* 1. Top Bar Contract Header */}
      <Header
        onDownloadZip={handleDownloadZip}
        isDownloadingZip={isDownloadingZip}
        onSelectTab={(tab) => {
          if (tab === 'presets') setActiveSidebarTab('presets');
          else if (tab === 'code') setActiveMainTab('code');
          else setActiveMainTab('viewport');
        }}
        activeView={activeMainTab}
      />

      {/* 2. Main Studio Workspace Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Sidebar: Presets, Stickman Rig, and Audio SFX Engine */}
        <aside className="w-full lg:w-84 xl:w-92 bg-[#0c121e] border-r border-slate-800/80 flex flex-col shrink-0">
          {/* Sidebar Tab Switcher */}
          <div className="flex items-center p-2 border-b border-slate-800/80 bg-[#090e18] gap-1">
            <button
              onClick={() => setActiveSidebarTab('presets')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                activeSidebarTab === 'presets'
                  ? 'bg-slate-800 text-cyan-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Presets</span>
            </button>
            <button
              onClick={() => setActiveSidebarTab('style')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                activeSidebarTab === 'style'
                  ? 'bg-slate-800 text-cyan-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Rig &amp; Style</span>
            </button>
            <button
              onClick={() => setActiveSidebarTab('sfx')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                activeSidebarTab === 'sfx'
                  ? 'bg-slate-800 text-cyan-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>SFX Audition</span>
            </button>
          </div>

          {/* Sidebar Content Panel */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {activeSidebarTab === 'presets' && (
              <PresetSelector
                currentPresetId={preset.id}
                onSelectPreset={handleSelectPreset}
              />
            )}
            {activeSidebarTab === 'style' && (
              <StickmanControls
                style={style}
                onChange={(updated) => setStyle((s) => ({ ...s, ...updated }))}
              />
            )}
            {activeSidebarTab === 'sfx' && <AudioTestPanel />}
          </div>

          {/* GitHub Repository Quick Export Card in Sidebar Footer */}
          <div className="p-3.5 border-t border-slate-800 bg-[#0a0f1a]">
            <button
              onClick={handleDownloadZip}
              disabled={isDownloadingZip}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isDownloadingZip ? 'Packaging Repo...' : 'Export GitHub Suite (.zip)'}</span>
            </button>
            <p className="text-[10px] text-slate-500 text-center mt-1.5">
              Includes Blender 3D script, SFX generator, and CLI runners
            </p>
          </div>
        </aside>

        {/* Right Main Stage: Viewport & Code Inspection */}
        <main className="flex-1 flex flex-col overflow-y-auto bg-[#090d16] p-4 lg:p-6 space-y-4">
          {/* Main View Mode Selector (Viewport vs Code) */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 p-1 bg-slate-900/90 rounded-lg border border-slate-800">
              <button
                onClick={() => setActiveMainTab('viewport')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  activeMainTab === 'viewport'
                    ? 'bg-slate-800 text-cyan-400 shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Animation Viewport</span>
              </button>
              <button
                onClick={() => setActiveMainTab('code')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  activeMainTab === 'code'
                    ? 'bg-slate-800 text-cyan-400 shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Blender &amp; Python Code</span>
              </button>
            </div>

            {/* Current Preset Breadcrumb Text */}
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 font-mono">
              <span className="text-slate-300 font-semibold">{preset.title}</span>
              <span aria-hidden="true">·</span>
              <span className="text-cyan-400">{preset.category}</span>
            </div>
          </div>

          {/* Viewport Stage */}
          {activeMainTab === 'viewport' ? (
            <div className="space-y-4">
              {/* Canvas Container with Frame Border & Vignette */}
              <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-[#090d16] shadow-2xl flex items-center justify-center">
                <canvas
                  ref={canvasRef}
                  width={800}
                  height={500}
                  className="w-full max-w-[800px] h-auto aspect-[16/10] block"
                />

                {/* Status Badges Overlay */}
                <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-950/80 backdrop-blur border border-slate-800 text-[11px] font-mono text-slate-300">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    <span>60 FPS</span>
                  </div>
                  {isRecording && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-950/90 border border-rose-700/80 text-[11px] font-mono text-rose-300">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                      <span>REC {(recordingProgress * 100).toFixed(0)}%</span>
                    </div>
                  )}
                </div>

                {/* Keyboard Shortcuts Hint Overlay */}
                <div className="absolute top-3 right-3 hidden sm:flex items-center gap-2 pointer-events-none text-[10px] text-slate-500 font-mono bg-slate-950/60 px-2 py-0.5 rounded border border-slate-800/60">
                  <span>[Space] Play/Pause</span>
                  <span>·</span>
                  <span>[←/→] Step</span>
                  <span>·</span>
                  <span>[R] Reset</span>
                </div>
              </div>

              {/* Timeline Controls */}
              <TimelineControls
                currentTime={currentTime}
                duration={preset.duration}
                fps={60}
                isPlaying={isPlaying}
                isLooping={isLooping}
                audioEnabled={audioEnabled}
                playbackSpeed={playbackSpeed}
                preset={preset}
                isRecording={isRecording}
                recordingProgress={recordingProgress}
                onPlayPause={togglePlayPause}
                onSeek={seekTime}
                onStepFrame={stepFrame}
                onToggleLoop={() => setIsLooping((l) => !l)}
                onToggleAudio={() => setAudioEnabled((a) => !a)}
                onChangeSpeed={setPlaybackSpeed}
                onStartRecord={handleStartRecord}
                onReset={resetPlayhead}
              />

              {/* Quick Code Snippet Strip */}
              <div className="p-4 rounded-xl border border-slate-800/80 bg-[#0d1322] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <h4 className="text-xs font-semibold text-white">
                      Blender 3D Script Ready for this Choreography
                    </h4>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Automated <code className="text-cyan-300 font-mono">stickman_blender.py</code>{' '}
                    recreates this exact pose choreography, procedural lighting, and VSE sound
                    tracks in Blender.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setActiveMainTab('code')}
                    className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors cursor-pointer"
                  >
                    View &amp; Copy Code
                  </button>
                  <button
                    onClick={handleDownloadZip}
                    disabled={isDownloadingZip}
                    className="px-3.5 py-1.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-xs font-semibold text-slate-950 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Download ZIP
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Code & Repository Viewport */
            <div className="h-[620px]">
              <CodeViewer
                preset={preset}
                style={style}
                onDownloadZip={handleDownloadZip}
                isDownloadingZip={isDownloadingZip}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
