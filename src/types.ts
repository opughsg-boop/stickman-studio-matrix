/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PresetId = 
  | 'algorithm_whiteboard'
  | 'terminal_coder'
  | 'eureka_idea'
  | 'teacher_presenter'
  | 'architecture_debate';

export interface ScenePreset {
  id: PresetId;
  title: string;
  category: string;
  duration: number; // in seconds
  description: string;
  props: {
    whiteboard?: boolean;
    laptop?: boolean;
    desk?: boolean;
    lightbulb?: boolean;
    chartBoard?: boolean;
    scales?: boolean;
  };
  audioCues: AudioCue[];
}

export interface AudioCue {
  time: number; // seconds
  type: 'chalk' | 'click' | 'whoosh' | 'pop' | 'bell' | 'celebrate';
  duration?: number;
  pitch?: number;
}

export type FacialExpression = 'neutral' | 'happy' | 'thinking' | 'surprised' | 'focused';

export interface StickmanStyle {
  lineThickness: number; // 2 - 12 px
  color: string; // Hex color for stick body
  headSize: number; // 14 - 36 px
  headFill: boolean;
  limbScale: number; // 0.8 - 1.3
  accentColor: string; // Color for props, glowing screen, chalk
  shadowEnabled: boolean;
  wireframeBones: boolean;
  facialExpression: FacialExpression;
}

export interface Point2D {
  x: number;
  y: number;
}

export interface SkeletalPose {
  head: Point2D;
  neck: Point2D;
  pelvis: Point2D;
  leftShoulder: Point2D;
  rightShoulder: Point2D;
  leftElbow: Point2D;
  rightElbow: Point2D;
  leftHand: Point2D;
  rightHand: Point2D;
  leftHip: Point2D;
  rightHip: Point2D;
  leftKnee: Point2D;
  rightKnee: Point2D;
  leftFoot: Point2D;
  rightFoot: Point2D;
  
  // Dynamic props / effects state for this frame
  chalkboardProgress?: number; // 0 - 1
  screenGlow?: number; // 0 - 1
  typingActivity?: boolean;
  lightbulbAlpha?: number; // 0 - 1
  eurekaFlash?: boolean;
  chartBarGrowth?: number; // 0 - 1
  scalesTilt?: number; // -1 to 1
  facialExpression?: FacialExpression;
  speechText?: string;
}

export type ExportTab = 'blender' | 'sfx' | 'python' | 'readme' | 'repo';
