/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Point2D, PresetId, SkeletalPose, StickmanStyle } from '../types.ts';

// Helper easing functions
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

export function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

/**
 * Computes the full 2D skeletal pose and prop states for any frame at time `t`
 */
export function computeSkeletalPose(
  presetId: PresetId,
  t: number,
  duration: number,
  style: StickmanStyle,
  canvasWidth: number = 800,
  canvasHeight: number = 500
): SkeletalPose {
  const scale = style.limbScale;
  const cx = canvasWidth * 0.5;
  const groundY = canvasHeight * 0.82;
  const progress = clamp(t / duration, 0, 1);

  // Default baseline proportions
  const headRadius = style.headSize;
  const torsoLength = 70 * scale;
  const armSegment = 38 * scale;
  const legSegment = 46 * scale;

  // Dispatch to specific scene choreographies
  switch (presetId) {
    case 'algorithm_whiteboard':
      return computeAlgorithmPose(t, duration, cx, groundY, torsoLength, armSegment, legSegment, headRadius, progress);

    case 'terminal_coder':
      return computeCoderPose(t, duration, cx, groundY, torsoLength, armSegment, legSegment, headRadius, progress);

    case 'eureka_idea':
      return computeEurekaPose(t, duration, cx, groundY, torsoLength, armSegment, legSegment, headRadius, progress);

    case 'teacher_presenter':
      return computePresenterPose(t, duration, cx, groundY, torsoLength, armSegment, legSegment, headRadius, progress);

    case 'architecture_debate':
      return computeDebatePose(t, duration, cx, groundY, torsoLength, armSegment, legSegment, headRadius, progress);

    default:
      return computeAlgorithmPose(t, duration, cx, groundY, torsoLength, armSegment, legSegment, headRadius, progress);
  }
}

/**
 * 1. Algorithm & Whiteboard choreography
 * 0.0 - 1.8s: Walks up to the board, holding chalk
 * 1.8 - 3.4s: Draws flowchart tree (root node, branches, leaf nodes)
 * 3.4 - 4.6s: Steps back, taps chin in thinking pose
 * 4.6 - 6.0s: Steps forward quickly, circles optimal algorithm node, presents it!
 */
function computeAlgorithmPose(
  t: number,
  duration: number,
  cx: number,
  groundY: number,
  torsoLen: number,
  armLen: number,
  legLen: number,
  _headR: number,
  p: number
): SkeletalPose {
  // Stickman X position moves from left to center-right near board
  let charX = cx - 120;
  let pelvisY = groundY - legLen * 1.9;
  let leftArmTargetX = 0;
  let leftArmTargetY = 0;
  let rightArmTargetX = 0;
  let rightArmTargetY = 0;
  let chalkProgress = 0;
  let expression: SkeletalPose['facialExpression'] = 'neutral';
  let speechText: string | undefined = undefined;

  // Board coordinates: center at cx + 110, y around groundY - 180
  const boardX = cx + 70;
  const boardY = groundY - 170;

  if (p < 0.28) {
    // Phase 1: Walking in
    const walkT = p / 0.28;
    charX = lerp(cx - 220, cx - 70, walkT);
    const bob = Math.abs(Math.sin(walkT * Math.PI * 4)) * 6;
    pelvisY -= bob;
    expression = 'focused';
    speechText = 'Algorithm Setup...';

    // Arms swinging while walking
    rightArmTargetX = charX + 25 + Math.sin(walkT * Math.PI * 4) * 20;
    rightArmTargetY = pelvisY - 10;
    leftArmTargetX = charX - 25 - Math.sin(walkT * Math.PI * 4) * 20;
    leftArmTargetY = pelvisY - 10;
    chalkProgress = 0;
  } else if (p < 0.58) {
    // Phase 2: Drawing on board
    charX = cx - 60;
    const drawT = (p - 0.28) / 0.3;
    chalkProgress = clamp(drawT * 1.2, 0, 1);
    expression = 'focused';
    speechText = 'Building Tree Nodes...';

    // Right arm moves to board to draw tree
    const drawOscX = Math.sin(drawT * Math.PI * 10) * 18;
    const drawOscY = Math.cos(drawT * Math.PI * 10) * 14;
    rightArmTargetX = boardX + 40 + drawOscX;
    rightArmTargetY = boardY - 30 + drawT * 50 + drawOscY;

    // Left hand on hip
    leftArmTargetX = charX - 28;
    leftArmTargetY = pelvisY - 12;
  } else if (p < 0.78) {
    // Phase 3: Stepping back, scratching chin / thinking
    const thinkT = (p - 0.58) / 0.2;
    charX = lerp(cx - 60, cx - 110, easeInOutQuad(thinkT));
    expression = 'thinking';
    speechText = 'Optimizing Complexity O(log N)...';
    chalkProgress = 1;

    // Right hand to chin
    const neckY = pelvisY - torsoLen;
    rightArmTargetX = charX + 14;
    rightArmTargetY = neckY - 10 + Math.sin(thinkT * Math.PI * 3) * 3;

    // Left arm relaxed
    leftArmTargetX = charX - 25;
    leftArmTargetY = pelvisY + 15;
  } else {
    // Phase 4: Found optimal solution! Circling and presenting
    const presentT = (p - 0.78) / 0.22;
    charX = cx - 75;
    expression = 'happy';
    speechText = 'Found Optimal Node: O(1)!';
    chalkProgress = 1;

    // Right hand circles node and opens up
    const circleAngle = presentT * Math.PI * 3;
    if (presentT < 0.5) {
      rightArmTargetX = boardX + 65 + Math.cos(circleAngle) * 24;
      rightArmTargetY = boardY - 10 + Math.sin(circleAngle) * 24;
    } else {
      rightArmTargetX = boardX + 10;
      rightArmTargetY = boardY - 15;
    }

    // Left arm gestures proudly
    leftArmTargetX = charX - 35;
    leftArmTargetY = pelvisY - 20;
  }

  return assemblePose(charX, pelvisY, torsoLen, armLen, legLen, rightArmTargetX, rightArmTargetY, leftArmTargetX, leftArmTargetY, {
    chalkboardProgress: chalkProgress,
    facialExpression: expression,
    speechText,
  });
}

/**
 * 2. Programmer at Workstation
 * Sits at desk, types furiously, stops to think, bug pops, celebration
 */
function computeCoderPose(
  t: number,
  duration: number,
  cx: number,
  groundY: number,
  torsoLen: number,
  armLen: number,
  legLen: number,
  _headR: number,
  p: number
): SkeletalPose {
  const charX = cx - 50;
  // Seated posture: pelvis lower and shifted
  const seatY = groundY - legLen * 1.05;
  const deskX = cx + 10;
  const deskY = groundY - legLen * 1.35;
  const laptopX = deskX + 15;
  const laptopY = deskY - 10;

  let expression: SkeletalPose['facialExpression'] = 'focused';
  let typing = false;
  let glow = 0.5;
  let speechText: string | undefined = 'Compiling TypeScript...';
  let celebrate = false;

  let rightHandX = laptopX - 5;
  let rightHandY = laptopY + 5;
  let leftHandX = laptopX - 20;
  let leftHandY = laptopY + 5;

  let headTilt = 0;

  if (p < 0.45) {
    // Furious typing
    typing = true;
    expression = 'focused';
    glow = 0.8 + Math.sin(t * 15) * 0.2;
    speechText = 'Writing Blender bmesh generator...';

    // Jitter hands for typing
    rightHandX += Math.sin(t * 30) * 4;
    rightHandY += Math.cos(t * 26) * 3;
    leftHandX += Math.sin(t * 28 + 1) * 4;
    leftHandY += Math.cos(t * 24 + 1) * 3;
  } else if (p < 0.70) {
    // Bug found! Leans back, hands to head
    typing = false;
    expression = 'surprised';
    glow = 0.4;
    speechText = 'Wait... IndexError on Line 42?';
    headTilt = -0.15;

    // Hands to head
    const neckY = seatY - torsoLen;
    rightHandX = charX + 15;
    rightHandY = neckY - 15;
    leftHandX = charX - 15;
    leftHandY = neckY - 15;
  } else {
    // Victory celebration! Both hands up!
    typing = false;
    expression = 'happy';
    glow = 1.0;
    celebrate = true;
    speechText = 'Build Passed! 0 Errors 0 Warnings';

    const celT = (p - 0.7) / 0.3;
    const wave = Math.sin(celT * Math.PI * 6) * 10;
    rightHandX = charX + 25 + wave;
    rightHandY = seatY - torsoLen - 45;
    leftHandX = charX - 25 - wave;
    leftHandY = seatY - torsoLen - 45;
  }

  // Construct seated legs:
  // Hips -> Knees go forward toward desk, then down to feet
  const hipX = charX;
  const hipY = seatY;
  const kneeX = hipX + legLen * 0.85;
  const kneeY = hipY + 10;
  const footX = kneeX;
  const footY = groundY - 4;

  const neckX = charX + 8 + headTilt * 20;
  const neckY = seatY - torsoLen;
  const headX = neckX + headTilt * 15;
  const headY = neckY - 26;

  // Shoulders
  const rShoulder = { x: neckX + 12, y: neckY + 10 };
  const lShoulder = { x: neckX - 12, y: neckY + 10 };

  // Calculate elbow bends using simple 2-segment IK
  const rElbow = solveElbow(rShoulder, { x: rightHandX, y: rightHandY }, armLen, 1);
  const lElbow = solveElbow(lShoulder, { x: leftHandX, y: leftHandY }, armLen, -1);

  return {
    head: { x: headX, y: headY },
    neck: { x: neckX, y: neckY },
    pelvis: { x: hipX, y: hipY },
    leftShoulder: lShoulder,
    rightShoulder: rShoulder,
    leftElbow: lElbow,
    rightElbow: rElbow,
    leftHand: { x: leftHandX, y: leftHandY },
    rightHand: { x: rightHandX, y: rightHandY },
    leftHip: { x: hipX - 6, y: hipY },
    rightHip: { x: hipX + 6, y: hipY },
    leftKnee: { x: kneeX - 8, y: kneeY },
    rightKnee: { x: kneeX, y: kneeY },
    leftFoot: { x: footX - 8, y: footY },
    rightFoot: { x: footX, y: footY },
    screenGlow: glow,
    typingActivity: typing,
    facialExpression: expression,
    speechText,
    eurekaFlash: celebrate,
  };
}

/**
 * 3. Eureka / Lightbulb Idea
 * Pacing back and forth, lightbulb spawns above head with ding, jumping celebration
 */
function computeEurekaPose(
  t: number,
  duration: number,
  cx: number,
  groundY: number,
  torsoLen: number,
  armLen: number,
  legLen: number,
  _headR: number,
  p: number
): SkeletalPose {
  let charX = cx;
  let pelvisY = groundY - legLen * 1.9;
  let expression: SkeletalPose['facialExpression'] = 'thinking';
  let speechText: string | undefined = 'Thinking...';
  let lightbulbAlpha = 0;
  let flash = false;

  let rHandX = charX + 16;
  let rHandY = pelvisY - torsoLen * 0.9;
  let lHandX = charX - 20;
  let lHandY = pelvisY + 10;

  if (p < 0.4) {
    // Pacing left and right in thought
    const paceT = p / 0.4;
    charX = cx + Math.sin(paceT * Math.PI * 3) * 60;
    const bob = Math.abs(Math.cos(paceT * Math.PI * 6)) * 5;
    pelvisY -= bob;
    expression = 'thinking';
    speechText = 'How to structure procedural blender meshes?';

    // Hand on chin
    rHandX = charX + 14;
    rHandY = pelvisY - torsoLen * 0.95;
    lHandX = charX - 22;
    lHandY = pelvisY + 12;
  } else if (p < 0.6) {
    // Sudden stop: Eureka!
    charX = cx;
    const sparkT = (p - 0.4) / 0.2;
    lightbulbAlpha = easeOutBack(clamp(sparkT * 1.5, 0, 1));
    expression = 'surprised';
    flash = sparkT < 0.3;
    speechText = 'AHA! Use BPY Armature with IK Curves!';

    // Both hands gesture upward to the idea
    rHandX = charX + 32;
    rHandY = pelvisY - torsoLen - 20;
    lHandX = charX - 32;
    lHandY = pelvisY - torsoLen - 20;
  } else {
    // Jump with joy
    const jumpT = (p - 0.6) / 0.4;
    const jumpCycle = Math.sin(jumpT * Math.PI * 4);
    const jumpHeight = Math.max(0, jumpCycle) * 35;
    pelvisY -= jumpHeight;
    lightbulbAlpha = 1;
    expression = 'happy';
    speechText = 'Code is clean and ready!';

    // Arms waving up high
    rHandX = charX + 35 + Math.sin(jumpT * Math.PI * 8) * 12;
    rHandY = pelvisY - torsoLen - 40;
    lHandX = charX - 35 - Math.sin(jumpT * Math.PI * 8) * 12;
    lHandY = pelvisY - torsoLen - 40;
  }

  return assemblePose(charX, pelvisY, torsoLen, armLen, legLen, rHandX, rHandY, lHandX, lHandY, {
    lightbulbAlpha,
    facialExpression: expression,
    speechText,
    eurekaFlash: flash,
  });
}

/**
 * 4. Technical Presenter
 * Explains rising chart board, uses laser pointer, gestures to audience
 */
function computePresenterPose(
  t: number,
  duration: number,
  cx: number,
  groundY: number,
  torsoLen: number,
  armLen: number,
  legLen: number,
  _headR: number,
  p: number
): SkeletalPose {
  const charX = cx - 100;
  const pelvisY = groundY - legLen * 1.9;
  const boardX = cx + 80;
  const boardY = groundY - 160;

  let expression: SkeletalPose['facialExpression'] = 'focused';
  let speechText: string | undefined = 'Presenting Performance Metrics...';
  let chartProgress = 0;

  let rHandX = charX + 25;
  let rHandY = pelvisY - 10;
  let lHandX = charX - 25;
  let lHandY = pelvisY - 10;

  if (p < 0.3) {
    // Walking into lecture stance
    const enterT = p / 0.3;
    expression = 'neutral';
    speechText = 'Welcome to the Technical Architecture Brief';
    chartProgress = 0.2;
    rHandX = charX + 20;
    rHandY = pelvisY + 5;
    lHandX = charX - 20;
    lHandY = pelvisY + 5;
  } else if (p < 0.7) {
    // Pointing stick/laser at rising chart
    const ptT = (p - 0.3) / 0.4;
    chartProgress = clamp(0.2 + ptT * 0.8, 0, 1);
    expression = 'focused';
    speechText = 'Rendering Speed: +340% FPS Gain!';

    // Right arm points directly at the peak bar
    rHandX = boardX - 30;
    rHandY = boardY - 40 + Math.sin(ptT * Math.PI * 4) * 8;

    // Left hand open palm gesture to audience
    lHandX = charX - 35;
    lHandY = pelvisY - 15;
  } else {
    // Open two-handed welcoming conclusion
    expression = 'happy';
    speechText = 'Conclusion: Ready for Production Deploy';
    chartProgress = 1.0;

    rHandX = charX + 45;
    rHandY = pelvisY - 25;
    lHandX = charX - 45;
    lHandY = pelvisY - 25;
  }

  return assemblePose(charX, pelvisY, torsoLen, armLen, legLen, rHandX, rHandY, lHandX, lHandY, {
    chartBarGrowth: chartProgress,
    facialExpression: expression,
    speechText,
  });
}

/**
 * 5. Architecture Debate & Scales
 * Weighing Monolith vs Microservices with animated scales
 */
function computeDebatePose(
  t: number,
  duration: number,
  cx: number,
  groundY: number,
  torsoLen: number,
  armLen: number,
  legLen: number,
  _headR: number,
  p: number
): SkeletalPose {
  const charX = cx;
  const pelvisY = groundY - legLen * 1.9;

  let tilt = 0;
  let expression: SkeletalPose['facialExpression'] = 'thinking';
  let speechText: string | undefined = 'Evaluating Architectural Trade-Offs';

  // Hands act like balance scales
  let rHandX = charX + 55;
  let rHandY = pelvisY - 20;
  let lHandX = charX - 55;
  let lHandY = pelvisY - 20;

  if (p < 0.4) {
    // Leaning left: Considering Option A
    const tiltT = Math.sin(p * Math.PI * 5);
    tilt = tiltT * 0.6;
    expression = 'thinking';
    speechText = 'Option A: Monolith (Simple, Fast Deployment)';
    lHandY = pelvisY - 35 - tilt * 25;
    rHandY = pelvisY - 5 + tilt * 25;
  } else if (p < 0.75) {
    // Leaning right: Considering Option B
    const tiltT = Math.sin(p * Math.PI * 5);
    tilt = -tiltT * 0.7;
    expression = 'focused';
    speechText = 'Option B: Event-Driven Microservices (Scale, Isolation)';
    lHandY = pelvisY - 10 + tilt * 25;
    rHandY = pelvisY - 40 - tilt * 25;
  } else {
    // Balanced synthesis!
    tilt = 0;
    expression = 'happy';
    speechText = 'Decision: Modular Monolith with Event Bus!';
    lHandX = charX - 45;
    lHandY = pelvisY - 30;
    rHandX = charX + 45;
    rHandY = pelvisY - 30;
  }

  return assemblePose(charX, pelvisY, torsoLen, armLen, legLen, rHandX, rHandY, lHandX, lHandY, {
    scalesTilt: tilt,
    facialExpression: expression,
    speechText,
  });
}

/**
 * Common pose assembler using 2-segment Inverse Kinematics
 */
function assemblePose(
  charX: number,
  pelvisY: number,
  torsoLen: number,
  armLen: number,
  legLen: number,
  rHandTargetX: number,
  rHandTargetY: number,
  lHandTargetX: number,
  lHandTargetY: number,
  extras: Partial<SkeletalPose> = {}
): SkeletalPose {
  const neckX = charX;
  const neckY = pelvisY - torsoLen;
  const headX = charX;
  const headY = neckY - 26;

  // Shoulders
  const rShoulder = { x: neckX + 15, y: neckY + 8 };
  const lShoulder = { x: neckX - 15, y: neckY + 8 };

  // Arms IK
  const rElbow = solveElbow(rShoulder, { x: rHandTargetX, y: rHandTargetY }, armLen, 1);
  const lElbow = solveElbow(lShoulder, { x: lHandTargetX, y: lHandTargetY }, armLen, -1);

  // Legs standard standing/slight stance
  const rHip = { x: charX + 10, y: pelvisY };
  const lHip = { x: charX - 10, y: pelvisY };

  const rFoot = { x: charX + 16, y: pelvisY + legLen * 1.9 };
  const lFoot = { x: charX - 16, y: pelvisY + legLen * 1.9 };

  const rKnee = solveElbow(rHip, rFoot, legLen, 0.4);
  const lKnee = solveElbow(lHip, lFoot, legLen, -0.4);

  return {
    head: { x: headX, y: headY },
    neck: { x: neckX, y: neckY },
    pelvis: { x: charX, y: pelvisY },
    leftShoulder: lShoulder,
    rightShoulder: rShoulder,
    leftElbow: lElbow,
    rightElbow: rElbow,
    leftHand: { x: lHandTargetX, y: lHandTargetY },
    rightHand: { x: rHandTargetX, y: rHandTargetY },
    leftHip: lHip,
    rightHip: rHip,
    leftKnee: lKnee,
    rightKnee: rKnee,
    leftFoot: lFoot,
    rightFoot: rFoot,
    ...extras,
  };
}

/**
 * 2D Two-Bone IK solver for natural elbow / knee flexion
 */
function solveElbow(root: Point2D, target: Point2D, segmentLen: number, bendSign: number): Point2D {
  const dx = target.x - root.x;
  const dy = target.y - root.y;
  const dist = Math.hypot(dx, dy);

  // Max reach clamp
  const maxReach = segmentLen * 1.98;
  const clampedDist = Math.min(dist, maxReach);

  // Angle from root to target
  const baseAngle = Math.atan2(dy, dx);

  // Cosine rule for angle
  const cosAlpha = clampedDist / (2 * segmentLen);
  const safeAlpha = clamp(cosAlpha, -1, 1);
  const alpha = Math.acos(safeAlpha);

  const finalAngle = baseAngle + alpha * (bendSign >= 0 ? 1 : -1);

  return {
    x: root.x + Math.cos(finalAngle) * segmentLen,
    y: root.y + Math.sin(finalAngle) * segmentLen,
  };
}
