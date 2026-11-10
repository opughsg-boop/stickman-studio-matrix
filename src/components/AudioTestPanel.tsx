/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Bell, Sparkles, Terminal, Volume2, Wind, Zap } from 'lucide-react';
import { audioSynth } from '../engine/audioSynth.ts';
import { AudioCue } from '../types.ts';

export const AudioTestPanel: React.FC = () => {
  const handlePlay = (type: AudioCue['type']) => {
    audioSynth.unlock();
    audioSynth.triggerCue(type);
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between pb-1 border-b border-slate-800/80">
        <div className="flex items-center gap-1.5">
          <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Procedural SFX Engine
          </h3>
        </div>
        <span className="text-[11px] text-slate-500 font-mono">Web Audio API</span>
      </div>

      <p className="text-[11px] text-slate-400 leading-relaxed">
        Test synthesized audio effects generated procedurally in browser and Blender VSE:
      </p>

      <div className="grid grid-cols-2 gap-1.5">
        <button
          onClick={() => handlePlay('chalk')}
          className="flex items-center gap-2 p-2 rounded bg-slate-900 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-800/60 transition-colors text-left cursor-pointer text-xs"
        >
          <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <div className="truncate">
            <span className="font-medium text-slate-200 block truncate">Chalk Scratch</span>
            <span className="text-[10px] text-slate-500 font-mono">Board drawing</span>
          </div>
        </button>

        <button
          onClick={() => handlePlay('click')}
          className="flex items-center gap-2 p-2 rounded bg-slate-900 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-800/60 transition-colors text-left cursor-pointer text-xs"
        >
          <Terminal className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <div className="truncate">
            <span className="font-medium text-slate-200 block truncate">Key Click</span>
            <span className="text-[10px] text-slate-500 font-mono">Terminal typing</span>
          </div>
        </button>

        <button
          onClick={() => handlePlay('whoosh')}
          className="flex items-center gap-2 p-2 rounded bg-slate-900 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-800/60 transition-colors text-left cursor-pointer text-xs"
        >
          <Wind className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <div className="truncate">
            <span className="font-medium text-slate-200 block truncate">Whoosh</span>
            <span className="text-[10px] text-slate-500 font-mono">Limb gesture</span>
          </div>
        </button>

        <button
          onClick={() => handlePlay('pop')}
          className="flex items-center gap-2 p-2 rounded bg-slate-900 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-800/60 transition-colors text-left cursor-pointer text-xs"
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
          <div className="truncate">
            <span className="font-medium text-slate-200 block truncate">Bubble Pop</span>
            <span className="text-[10px] text-slate-500 font-mono">UI popup</span>
          </div>
        </button>

        <button
          onClick={() => handlePlay('bell')}
          className="flex items-center gap-2 p-2 rounded bg-slate-900 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-800/60 transition-colors text-left cursor-pointer text-xs"
        >
          <Bell className="w-3.5 h-3.5 text-amber-300 shrink-0" />
          <div className="truncate">
            <span className="font-medium text-slate-200 block truncate">Eureka Ding</span>
            <span className="text-[10px] text-slate-500 font-mono">Harmonic bell</span>
          </div>
        </button>

        <button
          onClick={() => handlePlay('celebrate')}
          className="flex items-center gap-2 p-2 rounded bg-slate-900 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-800/60 transition-colors text-left cursor-pointer text-xs"
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <div className="truncate">
            <span className="font-medium text-slate-200 block truncate">Celebrate</span>
            <span className="text-[10px] text-slate-500 font-mono">C-major chime</span>
          </div>
        </button>
      </div>
    </div>
  );
};
