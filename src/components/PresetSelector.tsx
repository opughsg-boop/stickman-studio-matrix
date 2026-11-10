/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BookOpen, Code2, Lightbulb, Presentation, Scale } from 'lucide-react';
import { SCENE_PRESETS } from '../engine/presets.ts';
import { PresetId, ScenePreset } from '../types.ts';

interface PresetSelectorProps {
  currentPresetId: PresetId;
  onSelectPreset: (preset: ScenePreset) => void;
}

const PRESET_ICONS: Record<PresetId, React.ReactNode> = {
  algorithm_whiteboard: <BookOpen className="w-4 h-4 text-cyan-400" />,
  terminal_coder: <Code2 className="w-4 h-4 text-emerald-400" />,
  eureka_idea: <Lightbulb className="w-4 h-4 text-amber-400" />,
  teacher_presenter: <Presentation className="w-4 h-4 text-sky-400" />,
  architecture_debate: <Scale className="w-4 h-4 text-violet-400" />,
};

export const PresetSelector: React.FC<PresetSelectorProps> = ({
  currentPresetId,
  onSelectPreset,
}) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between pb-1">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Educational Scenes
        </h3>
        <span className="text-xs font-mono text-slate-500">{SCENE_PRESETS.length} presets</span>
      </div>

      <div className="space-y-1.5">
        {SCENE_PRESETS.map((preset) => {
          const isSelected = preset.id === currentPresetId;
          return (
            <button
              key={preset.id}
              onClick={() => onSelectPreset(preset)}
              className={`w-full text-left p-3 rounded-lg border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-slate-800/90 border-cyan-500/60 shadow-sm'
                  : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/50 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <div className="p-1.5 rounded bg-slate-950/60 border border-slate-800 mt-0.5 shrink-0">
                  {PRESET_ICONS[preset.id]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4
                      className={`text-xs font-semibold truncate ${
                        isSelected ? 'text-white' : 'text-slate-200'
                      }`}
                    >
                      {preset.title}
                    </h4>
                  </div>

                  {/* Clean unboxed metadata with bullet separators (anti-slop rule) */}
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                    <span>{preset.category}</span>
                    <span aria-hidden="true" className="text-slate-600">·</span>
                    <span className="font-mono tabular-nums">{preset.duration.toFixed(1)}s</span>
                    <span aria-hidden="true" className="text-slate-600">·</span>
                    <span className="font-mono">{preset.audioCues.length} audio cues</span>
                  </div>

                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {preset.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
