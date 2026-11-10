/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { audioSynth } from './audioSynth.ts';

export interface RecorderState {
  isRecording: boolean;
  progress: number; // 0 to 1
  recordedBlob: Blob | null;
  recordedUrl: string | null;
}

export class VideoRecorderEngine {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];

  public startRecording(
    canvas: HTMLCanvasElement,
    fps: number = 60,
    onFinish: (blob: Blob) => void
  ): boolean {
    try {
      this.recordedChunks = [];
      const canvasStream = canvas.captureStream(fps);

      // Try to attach audio stream track from procedural synthesizer
      const audioTrack = audioSynth.getAudioStreamTrack();
      const tracks: MediaStreamTrack[] = [...canvasStream.getVideoTracks()];
      if (audioTrack) {
        tracks.push(audioTrack);
      }

      const combinedStream = new MediaStream(tracks);

      // Check supported MIME types
      let mimeType = 'video/webm;codecs=vp9,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp8,opus';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm';
        }
      }

      this.mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 5000000,
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        const finalBlob = new Blob(this.recordedChunks, { type: 'video/webm' });
        onFinish(finalBlob);
      };

      this.mediaRecorder.start(100);
      return true;
    } catch (err) {
      console.error('Failed to start MediaRecorder:', err);
      return false;
    }
  }

  public stopRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
  }
}

export const videoRecorder = new VideoRecorderEngine();
