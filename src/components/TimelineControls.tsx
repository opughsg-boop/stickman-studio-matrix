/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  FastForward,
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  Video,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { ScenePreset } from '../types.ts';

interface TimelineControlsProps {
  currentTime: number;
  duration: number;
  fps: number;
  isPlaying: boolean;
  isLooping: boolean;
  audioEnabled: boolean;
  playbackSpeed: number;
  preset: ScenePreset;
  isRecording: boolean;
  recordingProgress: number;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onStepFrame: (delta: number) => void;
  onToggleLoop: () => void;
  onToggleAudio: () => void;
  onChangeSpeed: (speed: number) => void;
  onStartRecord: () => void;
  onReset: () => void;
}

export const TimelineControls: React.FC<TimelineControlsProps> = ({
  currentTime,
  duration,
  fps,
  isPlaying,
  isLooping,
  audioEnabled,
  playbackSpeed,
  preset,
  isRecording,
  recordingProgress,
  onPlayPause,
  onSeek,
  onStepFrame,
  onToggleLoop,
  onToggleAudio,
  onChangeSpeed,
  onStartRecord,
  onReset,
}) => {
  const currentFrame = Math.round(currentTime * fps);
  const totalFrames = Math.round(duration * fps);
  const progressPercent = (currentTime / duration) * 100;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms
      .toString()
      .padStart(2, '0')}`;
  };

  return (
    <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-3.5 space-y-3">
      {/* 1. Timeline Scrubber Bar with Audio Cue Markers */}
      <div className="space-y-1.5">
        <div className="relative w-full h-7 bg-slate-950 rounded-md border border-slate-800/80 overflow-hidden cursor-pointer flex items-center group">
          {/* Progress fill */}
          <div
            className="absolute left-0 top-0 bottom-0 bg-cyan-500/15 pointer-events-none transition-all duration-75"
            style={{ width: `${progressPercent}%` }}
          />

          {/* Audio cue pin indicators */}
          {preset.audioCues.map((cue, idx) => {
            const cuePercent = (cue.time / duration) * 100;
            return (
              <div
                key={idx}
                className="absolute top-0 bottom-0 w-0.5 bg-amber-400/80 z-10 pointer-events-none"
                style={{ left: `${cuePercent}%` }}
                title={`SFX: ${cue.type} @ ${cue.time.toFixed(2)}s`}
              >
                <div className="w-1.5 h-1.5 -ml-0.5 rounded-full bg-amber-400" />
              </div>
            );
          })}

          {/* Interactive Range Input */}
          <input
            type="range"
            min={0}
            max={duration}
            step={1 / fps}
            value={currentTime}
            onChange={(e) => onSeek(parseFloat(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
          />

          {/* Scrubber Playhead handle */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)] z-30 pointer-events-none"
            style={{ left: `${progressPercent}%` }}
          >
            <div className="w-2.5 h-2.5 -ml-1 -top-1 absolute rounded-full bg-cyan-300 border border-slate-950" />
          </div>
        </div>

        {/* Timestamps & Frame Counter (Anti-slop tabular numerals) */}
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <span className="text-cyan-400 tabular-nums">{formatTime(currentTime)}</span>
            <span className="text-slate-600">/</span>
            <span className="tabular-nums">{formatTime(duration)}</span>
          </div>

          <div className="flex items-center gap-2">
            <span>
              Frame <strong className="text-white tabular-nums">{currentFrame}</strong> /{' '}
              <span className="tabular-nums">{totalFrames}</span>
            </span>
            <span className="text-slate-600">·</span>
            <span className="tabular-nums">{fps} FPS</span>
          </div>
        </div>
      </div>

      {/* 2. Control Buttons & Action Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-800/60">
        {/* Playback Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onReset}
            title="Return to start"
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onStepFrame(-1)}
            title="Previous Frame"
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition-colors cursor-pointer"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onPlayPause}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              isPlaying
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Play</span>
              </>
            )}
          </button>

          <button
            onClick={() => onStepFrame(1)}
            title="Next Frame"
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition-colors cursor-pointer"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          {/* Loop button */}
          <button
            onClick={onToggleLoop}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-colors cursor-pointer ${
              isLooping
                ? 'bg-cyan-950/80 border-cyan-500/60 text-cyan-400'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Loop
          </button>

          {/* Speed selector */}
          <div className="flex items-center rounded-lg bg-slate-900 border border-slate-800 p-0.5">
            {[0.5, 1.0, 1.5, 2.0].map((spd) => (
              <button
                key={spd}
                onClick={() => onChangeSpeed(spd)}
                className={`px-2 py-0.5 text-[11px] font-mono rounded transition-colors cursor-pointer ${
                  playbackSpeed === spd
                    ? 'bg-slate-800 text-cyan-400 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>

        {/* Audio & Video Recording Actions */}
        <div className="flex items-center gap-2">
          {/* Audio Mute Toggle */}
          <button
            onClick={onToggleAudio}
            title={audioEnabled ? 'Mute SFX' : 'Enable SFX'}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
              audioEnabled
                ? 'bg-slate-900 border-slate-800 text-emerald-400 hover:border-emerald-500/50'
                : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
            }`}
          >
            {audioEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{audioEnabled ? 'SFX On' : 'SFX Off'}</span>
          </button>

          {/* In-Browser Video Recording Button */}
          <button
            onClick={onStartRecord}
            disabled={isRecording}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              isRecording
                ? 'bg-rose-500 text-white animate-pulse'
                : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>
              {isRecording
                ? `Recording ${(recordingProgress * 100).toFixed(0)}%`
                : 'Export WebM Video'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
