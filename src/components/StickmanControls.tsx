/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { FacialExpression, StickmanStyle } from '../types.ts';

interface StickmanControlsProps {
  style: StickmanStyle;
  onChange: (updated: Partial<StickmanStyle>) => void;
}

const COLOR_PRESETS = [
  { name: 'Crisp White', hex: '#FFFFFF' },
  { name: 'Cyan Neon', hex: '#06B6D4' },
  { name: 'Emerald', hex: '#10B981' },
  { name: 'Amber Glow', hex: '#F59E0B' },
  { name: 'Violet', hex: '#A855F7' },
];

const ACCENT_PRESETS = [
  { name: 'Electric Cyan', hex: '#06B6D4' },
  { name: 'Warm Amber', hex: '#F59E0B' },
  { name: 'Lime', hex: '#84CC16' },
  { name: 'Rose', hex: '#F43F5E' },
];

export const StickmanControls: React.FC<StickmanControlsProps> = ({ style, onChange }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-1 border-b border-slate-800/80">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Stickman Rig &amp; Style
        </h3>
        <button
          onClick={() =>
            onChange({
              lineThickness: 4,
              headSize: 20,
              limbScale: 1.0,
              color: '#FFFFFF',
              accentColor: '#06B6D4',
              headFill: false,
              shadowEnabled: true,
              wireframeBones: false,
              facialExpression: 'neutral',
            })
          }
          className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
        >
          Reset Defaults
        </button>
      </div>

      {/* Primary Line Color */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-300">Stick Color</span>
          <span className="font-mono text-[11px] text-slate-400">{style.color}</span>
        </div>
        <div className="flex items-center gap-2">
          {COLOR_PRESETS.map((c) => (
            <button
              key={c.hex}
              onClick={() => onChange({ color: c.hex })}
              title={c.name}
              className={`w-6 h-6 rounded border transition-all cursor-pointer ${
                style.color.toLowerCase() === c.hex.toLowerCase()
                  ? 'border-cyan-400 ring-2 ring-cyan-400/30 scale-110'
                  : 'border-slate-700 hover:border-slate-500'
              }`}
              style={{ backgroundColor: c.hex }}
            />
          ))}
          <input
            type="color"
            value={style.color}
            onChange={(e) => onChange({ color: e.target.value })}
            className="w-6 h-6 rounded bg-transparent border border-slate-700 cursor-pointer p-0"
            title="Custom color"
          />
        </div>
      </div>

      {/* Accent Color for Props & Lighting */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-300">Accent &amp; Lighting Color</span>
          <span className="font-mono text-[11px] text-slate-400">{style.accentColor}</span>
        </div>
        <div className="flex items-center gap-2">
          {ACCENT_PRESETS.map((c) => (
            <button
              key={c.hex}
              onClick={() => onChange({ accentColor: c.hex })}
              title={c.name}
              className={`w-6 h-6 rounded border transition-all cursor-pointer ${
                style.accentColor.toLowerCase() === c.hex.toLowerCase()
                  ? 'border-cyan-400 ring-2 ring-cyan-400/30 scale-110'
                  : 'border-slate-700 hover:border-slate-500'
              }`}
              style={{ backgroundColor: c.hex }}
            />
          ))}
          <input
            type="color"
            value={style.accentColor}
            onChange={(e) => onChange({ accentColor: e.target.value })}
            className="w-6 h-6 rounded bg-transparent border border-slate-700 cursor-pointer p-0"
            title="Custom accent"
          />
        </div>
      </div>

      {/* Sliders Grid */}
      <div className="space-y-3 pt-1">
        {/* Line Thickness */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-slate-300">Line Thickness</span>
            <span className="font-mono text-[11px] text-cyan-400 tabular-nums">
              {style.lineThickness}px
            </span>
          </div>
          <input
            type="range"
            min={2}
            max={10}
            step={1}
            value={style.lineThickness}
            onChange={(e) => onChange({ lineThickness: Number(e.target.value) })}
            className="w-full accent-cyan-400 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Head Size */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-slate-300">Head Radius</span>
            <span className="font-mono text-[11px] text-cyan-400 tabular-nums">
              {style.headSize}px
            </span>
          </div>
          <input
            type="range"
            min={14}
            max={32}
            step={1}
            value={style.headSize}
            onChange={(e) => onChange({ headSize: Number(e.target.value) })}
            className="w-full accent-cyan-400 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Limb Scale */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-slate-300">Limb Scale</span>
            <span className="font-mono text-[11px] text-cyan-400 tabular-nums">
              {style.limbScale.toFixed(2)}x
            </span>
          </div>
          <input
            type="range"
            min={0.8}
            max={1.3}
            step={0.05}
            value={style.limbScale}
            onChange={(e) => onChange({ limbScale: Number(e.target.value) })}
            className="w-full accent-cyan-400 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>

      {/* Facial Expression Base */}
      <div className="space-y-1.5">
        <span className="text-xs text-slate-300">Facial Style</span>
        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-900 rounded-md border border-slate-800">
          {(['neutral', 'happy', 'focused', 'thinking', 'surprised'] as FacialExpression[]).map(
            (expr) => (
              <button
                key={expr}
                onClick={() => onChange({ facialExpression: expr })}
                className={`py-1 px-2 text-[11px] font-medium rounded transition-colors capitalize cursor-pointer whitespace-nowrap ${
                  style.facialExpression === expr
                    ? 'bg-slate-800 text-cyan-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {expr}
              </button>
            )
          )}
        </div>
      </div>

      {/* Toggles */}
      <div className="space-y-2 pt-1 border-t border-slate-800/80">
        <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
          <span>Solid Filled Head</span>
          <input
            type="checkbox"
            checked={style.headFill}
            onChange={(e) => onChange({ headFill: e.target.checked })}
            className="rounded accent-cyan-400 bg-slate-800 border-slate-700 w-4 h-4 cursor-pointer"
          />
        </label>

        <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
          <span>Ground Shadow</span>
          <input
            type="checkbox"
            checked={style.shadowEnabled}
            onChange={(e) => onChange({ shadowEnabled: e.target.checked })}
            className="rounded accent-cyan-400 bg-slate-800 border-slate-700 w-4 h-4 cursor-pointer"
          />
        </label>

        <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
          <span>Show Kinematics Joint Rig</span>
          <input
            type="checkbox"
            checked={style.wireframeBones}
            onChange={(e) => onChange({ wireframeBones: e.target.checked })}
            className="rounded accent-cyan-400 bg-slate-800 border-slate-700 w-4 h-4 cursor-pointer"
          />
        </label>
      </div>
    </div>
  );
};
