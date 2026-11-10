/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Download, Sparkles } from 'lucide-react';

interface HeaderProps {
  onDownloadZip: () => void;
  isDownloadingZip: boolean;
  onSelectTab: (tab: 'viewport' | 'code' | 'presets') => void;
  activeView: 'viewport' | 'code' | 'presets';
}

export const Header: React.FC<HeaderProps> = ({
  onDownloadZip,
  isDownloadingZip,
  onSelectTab,
  activeView,
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3.5 border-b border-slate-800 bg-[#0d131f] text-slate-200">
      {/* Zone 1: Brand wordmark (single text element) */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
          <Sparkles className="w-4 h-4" />
        </div>
        <span className="text-base font-bold tracking-tight text-white whitespace-nowrap">
          Stickman Studio &amp; Blender
        </span>
      </div>

      {/* Zone 2: Navigation links */}
      <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-400">
        <button
          onClick={() => onSelectTab('viewport')}
          className={`hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0 ${
            activeView === 'viewport' ? 'text-cyan-400 font-semibold' : ''
          }`}
        >
          Studio Viewport
        </button>
        <button
          onClick={() => onSelectTab('presets')}
          className={`hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0 ${
            activeView === 'presets' ? 'text-cyan-400 font-semibold' : ''
          }`}
        >
          Scene Presets
        </button>
        <button
          onClick={() => onSelectTab('code')}
          className={`hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0 ${
            activeView === 'code' ? 'text-cyan-400 font-semibold' : ''
          }`}
        >
          Blender &amp; Python Code
        </button>
      </nav>

      {/* Zone 3: 1 Primary CTA */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onDownloadZip}
          disabled={isDownloadingZip}
          className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{isDownloadingZip ? 'Packaging...' : 'Download GitHub Repo'}</span>
        </button>
      </div>
    </header>
  );
};
