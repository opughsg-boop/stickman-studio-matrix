/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Check, Copy, Download, FileCode, FolderArchive, Terminal } from 'lucide-react';
import { generateBlenderScript } from '../engine/blenderGenerator.ts';
import {
  generateReadme,
  generatePythonRenderScript,
  generateSfxScript,
  generateShellScript,
} from '../engine/pythonGenerator.ts';
import { downloadTextFile } from '../engine/repoPackager.ts';
import { ScenePreset, StickmanStyle } from '../types.ts';

interface CodeViewerProps {
  preset: ScenePreset;
  style: StickmanStyle;
  onDownloadZip: () => void;
  isDownloadingZip: boolean;
}

type TabKey = 'blender' | 'sfx' | 'python' | 'readme' | 'shell';

export const CodeViewer: React.FC<CodeViewerProps> = ({
  preset,
  style,
  onDownloadZip,
  isDownloadingZip,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('blender');
  const [copied, setCopied] = useState(false);

  // Generate code on the fly based on current preset & styles
  const codeFiles: Record<TabKey, { name: string; lang: string; content: string }> = {
    blender: {
      name: 'stickman_blender.py',
      lang: 'python',
      content: generateBlenderScript(preset, style),
    },
    sfx: {
      name: 'generate_sfx.py',
      lang: 'python',
      content: generateSfxScript(),
    },
    python: {
      name: 'render_stickman.py',
      lang: 'python',
      content: generatePythonRenderScript(preset, style),
    },
    readme: {
      name: 'README.md',
      lang: 'markdown',
      content: generateReadme(preset, style),
    },
    shell: {
      name: 'run_blender.sh',
      lang: 'bash',
      content: generateShellScript(),
    },
  };

  const currentFile = codeFiles[activeTab];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadFile = () => {
    downloadTextFile(currentFile.content, currentFile.name);
  };

  const lines = currentFile.content.split('\n');

  return (
    <div className="bg-[#0b101c] border border-slate-800 rounded-xl overflow-hidden flex flex-col h-full shadow-lg">
      {/* 1. Header Toolbar with File Tabs & Actions */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 bg-[#0f172a] px-3 py-2 gap-2">
        {/* Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {(Object.keys(codeFiles) as TabKey[]).map((tab) => {
            const file = codeFiles[tab];
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setCopied(false);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono transition-colors whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-slate-800 text-cyan-400 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>{file.name}</span>
              </button>
            );
          })}
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer border border-slate-700/80"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownloadFile}
            title={`Download ${currentFile.name}`}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer border border-slate-700/80"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Download</span>
          </button>

          <button
            onClick={onDownloadZip}
            disabled={isDownloadingZip}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-colors cursor-pointer disabled:opacity-50"
          >
            <FolderArchive className="w-3.5 h-3.5" />
            <span>GitHub ZIP</span>
          </button>
        </div>
      </div>

      {/* 2. Command Quick-Run Banner */}
      <div className="px-4 py-2 bg-slate-950/80 border-b border-slate-800/60 flex items-center justify-between text-[11px] font-mono text-slate-400">
        <div className="flex items-center gap-2 truncate">
          <Terminal className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="text-slate-500">Run:</span>
          {activeTab === 'blender' && (
            <code className="text-cyan-300 font-semibold truncate">
              blender -b -P stickman_blender.py -a
            </code>
          )}
          {activeTab === 'sfx' && (
            <code className="text-cyan-300 font-semibold truncate">python3 generate_sfx.py</code>
          )}
          {activeTab === 'python' && (
            <code className="text-cyan-300 font-semibold truncate">python3 render_stickman.py</code>
          )}
          {activeTab === 'readme' && (
            <span className="text-slate-300 truncate">GitHub Documentation &amp; Setup Guide</span>
          )}
          {activeTab === 'shell' && (
            <code className="text-cyan-300 font-semibold truncate">chmod +x run_blender.sh &amp;&amp; ./run_blender.sh</code>
          )}
        </div>
        <span className="text-slate-500 text-[10px] shrink-0 font-mono">
          {lines.length} lines
        </span>
      </div>

      {/* 3. Code Viewport with Line Numbers */}
      <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed bg-[#080d17] text-slate-300 select-text">
        <div className="table w-full">
          {lines.map((line, idx) => (
            <div key={idx} className="table-row hover:bg-slate-800/30">
              <span className="table-cell select-none text-right pr-4 text-slate-600 text-[11px] w-12 tabular-nums">
                {idx + 1}
              </span>
              <span className="table-cell whitespace-pre">{line || ' '}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
