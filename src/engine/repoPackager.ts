/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import JSZip from 'jszip';
import { ScenePreset, StickmanStyle } from '../types.ts';
import { generateBlenderScript } from './blenderGenerator.ts';
import {
  generateBatchScript,
  generatePythonRenderScript,
  generateReadme,
  generateRequirements,
  generateSfxScript,
  generateShellScript,
} from './pythonGenerator.ts';

export async function packageGithubRepository(preset: ScenePreset, style: StickmanStyle): Promise<Blob> {
  const zip = new JSZip();

  // Root folder in zip for clean extraction
  const root = zip.folder('stickman-studio-blender') || zip;

  root.file('stickman_blender.py', generateBlenderScript(preset, style));
  root.file('generate_sfx.py', generateSfxScript());
  root.file('render_stickman.py', generatePythonRenderScript(preset, style));
  root.file('README.md', generateReadme(preset, style));
  root.file('requirements.txt', generateRequirements());
  root.file('run_blender.sh', generateShellScript());
  root.file('run_blender.bat', generateBatchScript());
  root.file(
    '.gitignore',
    `__pycache__/
*.pyc
renders/
*.mp4
*.webm
.DS_Store
`
  );

  // sfx folder placeholder
  root.file('sfx/.gitkeep', '');

  return await zip.generateAsync({ type: 'blob' });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadTextFile(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  downloadBlob(blob, filename);
}
