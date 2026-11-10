/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ScenePreset } from '../types.ts';

export const SCENE_PRESETS: ScenePreset[] = [
  {
    id: 'algorithm_whiteboard',
    title: 'Algorithm & Whiteboard',
    category: 'Computer Science',
    duration: 6.0,
    description: 'Stickman walks in, draws binary tree nodes on blackboard, strokes chin in thought, then circles optimal O(1) solution.',
    props: {
      whiteboard: true,
    },
    audioCues: [
      { time: 0.2, type: 'whoosh' },
      { time: 1.8, type: 'chalk', duration: 0.15 },
      { time: 2.2, type: 'chalk', duration: 0.15 },
      { time: 2.6, type: 'chalk', duration: 0.18 },
      { time: 3.4, type: 'whoosh' },
      { time: 4.8, type: 'chalk', duration: 0.25 },
      { time: 5.1, type: 'celebrate' },
    ],
  },
  {
    id: 'terminal_coder',
    title: 'Programmer at Workstation',
    category: 'Software Engineering',
    duration: 5.5,
    description: 'Seated developer typing furiously on a glowing laptop, pausing in surprise over a compiler error, then cheering a clean build.',
    props: {
      desk: true,
      laptop: true,
    },
    audioCues: [
      { time: 0.3, type: 'click' },
      { time: 0.5, type: 'click' },
      { time: 0.8, type: 'click' },
      { time: 1.1, type: 'click' },
      { time: 1.4, type: 'click' },
      { time: 1.8, type: 'click' },
      { time: 2.7, type: 'pop' },
      { time: 3.9, type: 'click' },
      { time: 4.2, type: 'celebrate' },
    ],
  },
  {
    id: 'eureka_idea',
    title: 'Eureka / Lightbulb Revelation',
    category: 'Creativity & Logic',
    duration: 5.0,
    description: 'Pacing back and forth trying to solve an architectural puzzle, until a glowing lightbulb springs overhead with a crisp ding.',
    props: {
      lightbulb: true,
    },
    audioCues: [
      { time: 0.4, type: 'whoosh' },
      { time: 1.2, type: 'whoosh' },
      { time: 2.1, type: 'bell' },
      { time: 3.1, type: 'pop' },
      { time: 3.5, type: 'celebrate' },
    ],
  },
  {
    id: 'teacher_presenter',
    title: 'Technical Lecturer & Chart',
    category: 'Data & Metrics',
    duration: 5.5,
    description: 'Presenter points laser pointer to animated growth metric bars, breaking down performance gains for the audience.',
    props: {
      chartBoard: true,
    },
    audioCues: [
      { time: 0.3, type: 'whoosh' },
      { time: 1.8, type: 'pop' },
      { time: 2.4, type: 'pop' },
      { time: 3.0, type: 'pop' },
      { time: 4.5, type: 'celebrate' },
    ],
  },
  {
    id: 'architecture_debate',
    title: 'Architecture Trade-Off Scales',
    category: 'System Design',
    duration: 6.0,
    description: 'Balancing Monolithic simplicity against Microservice scalability with animated physical scales and decisive resolution.',
    props: {
      scales: true,
    },
    audioCues: [
      { time: 0.5, type: 'whoosh' },
      { time: 1.8, type: 'whoosh' },
      { time: 3.2, type: 'whoosh' },
      { time: 4.8, type: 'bell' },
      { time: 5.2, type: 'celebrate' },
    ],
  },
];
