/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Point2D, SkeletalPose, StickmanStyle } from '../types.ts';

export function renderStickmanCanvas(
  ctx: CanvasRenderingContext2D,
  pose: SkeletalPose,
  style: StickmanStyle,
  width: number,
  height: number,
  presetId: string
) {
  // Clear frame
  ctx.fillStyle = '#090d16';
  ctx.fillRect(0, 0, width, height);

  // Subtle grid lines for high-tech studio feel
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.lineWidth = 1;
  const gridSize = 40;
  for (let x = 0; x < width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.restore();

  const groundY = height * 0.82;

  // Ground line with subtle gradient
  ctx.save();
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  ctx.lineTo(width, groundY);
  ctx.stroke();

  // Ground contact shadow
  if (style.shadowEnabled) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(pose.pelvis.x, groundY + 2, 45 * style.limbScale, 7, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 1. Render Props based on scene
  renderProps(ctx, pose, style, width, height, presetId, groundY);

  // 2. Render Stickman Character
  renderCharacter(ctx, pose, style);

  // 3. Render Speech / Status subtitle at bottom
  if (pose.speechText) {
    renderSubtitle(ctx, pose.speechText, width, height);
  }
}

function renderProps(
  ctx: CanvasRenderingContext2D,
  pose: SkeletalPose,
  style: StickmanStyle,
  width: number,
  height: number,
  presetId: string,
  groundY: number
) {
  const cx = width * 0.5;

  // A. Whiteboard / Blackboard
  if (presetId === 'algorithm_whiteboard') {
    const boardX = cx + 50;
    const boardY = groundY - 240;
    const boardW = 280;
    const boardH = 190;

    ctx.save();
    // Board shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(boardX + 6, boardY + 6, boardW, boardH);

    // Frame
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(boardX, boardY, boardW, boardH);

    // Board surface
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(boardX + 8, boardY + 8, boardW - 16, boardH - 16);

    // Board stand legs
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(boardX + 30, boardY + boardH);
    ctx.lineTo(boardX + 15, groundY);
    ctx.moveTo(boardX + boardW - 30, boardY + boardH);
    ctx.lineTo(boardX + boardW - 15, groundY);
    ctx.stroke();

    // Chalk tray
    ctx.fillStyle = '#475569';
    ctx.fillRect(boardX + 20, boardY + boardH - 2, boardW - 40, 6);

    // Chalk drawings (Binary Search Tree / Graph)
    const p = pose.chalkboardProgress || 0;
    if (p > 0.05) {
      ctx.strokeStyle = style.accentColor;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.fillStyle = 'rgba(6, 182, 212, 0.2)';

      // Root node
      const rootX = boardX + boardW * 0.5;
      const rootY = boardY + 45;
      drawNode(ctx, rootX, rootY, '10', true);

      if (p > 0.3) {
        // Left child
        const leftX = rootX - 55;
        const leftY = rootY + 50;
        ctx.beginPath();
        ctx.moveTo(rootX - 10, rootY + 12);
        ctx.lineTo(leftX + 10, leftY - 12);
        ctx.stroke();
        drawNode(ctx, leftX, leftY, '5');
      }

      if (p > 0.6) {
        // Right child
        const rightX = rootX + 55;
        const rightY = rootY + 50;
        ctx.beginPath();
        ctx.moveTo(rootX + 10, rootY + 12);
        ctx.lineTo(rightX - 10, rightY - 12);
        ctx.stroke();
        drawNode(ctx, rightX, rightY, '20');
      }

      if (p > 0.85) {
        // Optimal circled node
        const optimalX = rootX + 55;
        const optimalY = rootY + 50;
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(optimalX, optimalY, 22, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#f59e0b';
        ctx.font = '10px JetBrains Mono, monospace';
        ctx.fillText('Optimal O(1)', optimalX - 32, optimalY + 36);
      }
    }
    ctx.restore();
  }

  // B. Workstation & Laptop
  if (presetId === 'terminal_coder') {
    const deskX = cx - 10;
    const deskY = groundY - 80;
    const deskW = 180;
    const deskH = 14;

    ctx.save();
    // Desk surface
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(deskX, deskY, deskW, deskH);

    // Desk legs
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(deskX + 15, deskY + deskH);
    ctx.lineTo(deskX + 15, groundY);
    ctx.moveTo(deskX + deskW - 15, deskY + deskH);
    ctx.lineTo(deskX + deskW - 15, groundY);
    ctx.stroke();

    // Chair
    const chairX = cx - 60;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(chairX - 18, deskY + 10, 36, 8); // seat
    ctx.fillRect(chairX - 22, deskY - 30, 8, 48); // backrest
    ctx.beginPath();
    ctx.moveTo(chairX, deskY + 18);
    ctx.lineTo(chairX, groundY);
    ctx.stroke();

    // Laptop
    const laptopX = deskX + 45;
    const laptopY = deskY;
    // Base
    ctx.fillStyle = '#64748b';
    ctx.fillRect(laptopX, laptopY - 4, 52, 4);
    // Screen open at an angle
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(laptopX + 44, laptopY - 4);
    ctx.lineTo(laptopX + 54, laptopY - 36);
    ctx.stroke();

    // Glowing screen light beam
    const glow = pose.screenGlow || 0.5;
    ctx.save();
    const grad = ctx.createRadialGradient(
      laptopX + 44,
      laptopY - 20,
      2,
      laptopX + 20,
      laptopY - 20,
      60
    );
    grad.addColorStop(0, `rgba(6, 182, 212, ${0.4 * glow})`);
    grad.addColorStop(1, 'rgba(6, 182, 212, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(laptopX + 44, laptopY - 4);
    ctx.lineTo(laptopX - 10, laptopY - 45);
    ctx.lineTo(laptopX - 10, laptopY + 5);
    ctx.closePath();
    ctx.fill();

    // Terminal typing ripples
    if (pose.typingActivity) {
      ctx.fillStyle = style.accentColor;
      ctx.font = '9px JetBrains Mono, monospace';
      ctx.fillText('> git commit -m "feat"', laptopX - 55, laptopY - 50);
    }
    ctx.restore();
    ctx.restore();
  }

  // C. Eureka Lightbulb
  if (presetId === 'eureka_idea' && (pose.lightbulbAlpha || 0) > 0.01) {
    const alpha = pose.lightbulbAlpha || 0;
    const bulbX = pose.head.x;
    const bulbY = pose.head.y - 50;

    ctx.save();
    ctx.globalAlpha = Math.min(1, alpha);

    // Glowing aura
    const glowRadius = 35 + Math.sin(Date.now() * 0.01) * 4;
    const radial = ctx.createRadialGradient(bulbX, bulbY, 5, bulbX, bulbY, glowRadius);
    radial.addColorStop(0, 'rgba(245, 158, 11, 0.7)');
    radial.addColorStop(1, 'rgba(245, 158, 11, 0)');
    ctx.fillStyle = radial;
    ctx.beginPath();
    ctx.arc(bulbX, bulbY, glowRadius, 0, Math.PI * 2);
    ctx.fill();

    // Lightbulb glass
    ctx.strokeStyle = '#f59e0b';
    ctx.fillStyle = '#fef3c7';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(bulbX, bulbY, 13, 0.25 * Math.PI, 0.75 * Math.PI, true);
    ctx.lineTo(bulbX - 6, bulbY + 14);
    ctx.lineTo(bulbX + 6, bulbY + 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Screw base
    ctx.fillStyle = '#64748b';
    ctx.fillRect(bulbX - 4, bulbY + 14, 8, 4);

    // Radiating idea rays
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3 - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(bulbX + Math.cos(angle) * 19, bulbY + Math.sin(angle) * 19);
      ctx.lineTo(bulbX + Math.cos(angle) * 28, bulbY + Math.sin(angle) * 28);
      ctx.stroke();
    }
    ctx.restore();
  }

  // D. Presentation Chart Board
  if (presetId === 'teacher_presenter') {
    const boardX = cx + 40;
    const boardY = groundY - 230;
    const boardW = 260;
    const boardH = 180;
    const growth = pose.chartBarGrowth || 0;

    ctx.save();
    ctx.fillStyle = '#111827';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.fillRect(boardX, boardY, boardW, boardH);
    ctx.strokeRect(boardX, boardY, boardW, boardH);

    // Title on board
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px JetBrains Mono, monospace';
    ctx.fillText('BENCHMARK: FPS vs BATCH', boardX + 16, boardY + 24);

    // Chart Axes
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(boardX + 30, boardY + 40);
    ctx.lineTo(boardX + 30, boardY + boardH - 25);
    ctx.lineTo(boardX + boardW - 20, boardY + boardH - 25);
    ctx.stroke();

    // Rising Bars
    const barData = [
      { x: boardX + 50, h: 40, col: '#64748b', label: 'v1.0' },
      { x: boardX + 105, h: 75, col: '#0284c7', label: 'v2.0' },
      { x: boardX + 160, h: 110, col: '#06b6d4', label: 'v3.0' },
    ];

    barData.forEach((b) => {
      const curH = b.h * growth;
      ctx.fillStyle = b.col;
      ctx.fillRect(b.x, boardY + boardH - 25 - curH, 32, curH);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.fillText(b.label, b.x + 3, boardY + boardH - 12);
    });
    ctx.restore();
  }

  // E. Architecture Scales
  if (presetId === 'architecture_debate') {
    const scaleX = cx + 80;
    const scaleY = groundY - 140;
    const tilt = pose.scalesTilt || 0;

    ctx.save();
    // Stand
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(scaleX, scaleY);
    ctx.lineTo(scaleX, groundY);
    ctx.stroke();

    // Beam tilting
    const beamLen = 110;
    const angle = tilt * 0.35;
    const leftPlateX = scaleX - Math.cos(angle) * (beamLen / 2);
    const leftPlateY = scaleY - Math.sin(angle) * (beamLen / 2);
    const rightPlateX = scaleX + Math.cos(angle) * (beamLen / 2);
    const rightPlateY = scaleY + Math.sin(angle) * (beamLen / 2);

    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(leftPlateX, leftPlateY);
    ctx.lineTo(rightPlateX, rightPlateY);
    ctx.stroke();

    // Pans
    drawScalePan(ctx, leftPlateX, leftPlateY, 'Monolith', '#38bdf8');
    drawScalePan(ctx, rightPlateX, rightPlateY, 'Microservices', '#f59e0b');
    ctx.restore();
  }
}

function drawNode(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, isRoot = false) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, isRoot ? 14 : 12, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fill();

  ctx.fillStyle = '#f8fafc';
  ctx.font = '10px JetBrains Mono, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawScalePan(ctx: CanvasRenderingContext2D, x: number, y: number, label: string, color: string) {
  ctx.save();
  // Strings
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - 18, y + 28);
  ctx.moveTo(x, y);
  ctx.lineTo(x + 18, y + 28);
  ctx.stroke();

  // Plate
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(x, y + 28, 18, 0, Math.PI);
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.font = '9px JetBrains Mono, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(label, x, y + 44);
  ctx.restore();
}

function renderCharacter(ctx: CanvasRenderingContext2D, pose: SkeletalPose, style: StickmanStyle) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const strokeColor = style.color;
  const strokeWidth = style.lineThickness;

  // 1. Limbs (Legs)
  drawBone(ctx, pose.leftHip, pose.leftKnee, strokeColor, strokeWidth);
  drawBone(ctx, pose.leftKnee, pose.leftFoot, strokeColor, strokeWidth);
  drawBone(ctx, pose.rightHip, pose.rightKnee, strokeColor, strokeWidth);
  drawBone(ctx, pose.rightKnee, pose.rightFoot, strokeColor, strokeWidth);

  // 2. Spine / Torso
  drawBone(ctx, pose.pelvis, pose.neck, strokeColor, strokeWidth);

  // 3. Limbs (Arms)
  drawBone(ctx, pose.leftShoulder, pose.leftElbow, strokeColor, strokeWidth);
  drawBone(ctx, pose.leftElbow, pose.leftHand, strokeColor, strokeWidth);
  drawBone(ctx, pose.rightShoulder, pose.rightElbow, strokeColor, strokeWidth);
  drawBone(ctx, pose.rightElbow, pose.rightHand, strokeColor, strokeWidth);

  // 4. Head
  const headR = style.headSize;
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = strokeWidth;
  ctx.beginPath();
  ctx.arc(pose.head.x, pose.head.y, headR, 0, Math.PI * 2);

  if (style.headFill) {
    ctx.fillStyle = strokeColor;
    ctx.fill();
  } else {
    ctx.fillStyle = '#090d16';
    ctx.fill();
    ctx.stroke();
  }

  // 5. Facial features (unless head is solid filled)
  if (!style.headFill) {
    renderFace(ctx, pose.head.x, pose.head.y, headR, pose.facialExpression || style.facialExpression);
  }

  // 6. Developer wireframe bones mode
  if (style.wireframeBones) {
    ctx.fillStyle = '#06b6d4';
    const joints: Point2D[] = [
      pose.head,
      pose.neck,
      pose.pelvis,
      pose.leftShoulder,
      pose.rightShoulder,
      pose.leftElbow,
      pose.rightElbow,
      pose.leftHand,
      pose.rightHand,
      pose.leftHip,
      pose.rightHip,
      pose.leftKnee,
      pose.rightKnee,
      pose.leftFoot,
      pose.rightFoot,
    ];
    joints.forEach((j) => {
      ctx.beginPath();
      ctx.arc(j.x, j.y, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  ctx.restore();
}

function drawBone(
  ctx: CanvasRenderingContext2D,
  p1: Point2D,
  p2: Point2D,
  color: string,
  width: number
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();
}

function renderFace(
  ctx: CanvasRenderingContext2D,
  hx: number,
  hy: number,
  r: number,
  expression: string
) {
  ctx.save();
  ctx.fillStyle = '#f8fafc';
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 1.5;

  const eyeOffsetX = r * 0.35;
  const eyeOffsetY = -r * 0.1;
  const eyeR = 2.2;

  switch (expression) {
    case 'happy':
      // Eyes as curved arcs
      ctx.beginPath();
      ctx.arc(hx - eyeOffsetX, hy + eyeOffsetY, eyeR * 1.5, Math.PI, 0);
      ctx.arc(hx + eyeOffsetX, hy + eyeOffsetY, eyeR * 1.5, Math.PI, 0);
      ctx.stroke();
      // Smile
      ctx.beginPath();
      ctx.arc(hx, hy + r * 0.25, r * 0.4, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
      break;

    case 'thinking':
      // Eyes looking up
      ctx.beginPath();
      ctx.arc(hx - eyeOffsetX, hy + eyeOffsetY - 3, eyeR, 0, Math.PI * 2);
      ctx.arc(hx + eyeOffsetX, hy + eyeOffsetY - 3, eyeR, 0, Math.PI * 2);
      ctx.fill();
      // Straight questioning mouth
      ctx.beginPath();
      ctx.moveTo(hx - r * 0.25, hy + r * 0.35);
      ctx.lineTo(hx + r * 0.25, hy + r * 0.25);
      ctx.stroke();
      break;

    case 'surprised':
      // Wide circular eyes
      ctx.beginPath();
      ctx.arc(hx - eyeOffsetX, hy + eyeOffsetY, eyeR * 1.6, 0, Math.PI * 2);
      ctx.arc(hx + eyeOffsetX, hy + eyeOffsetY, eyeR * 1.6, 0, Math.PI * 2);
      ctx.fill();
      // Open mouth 'O'
      ctx.beginPath();
      ctx.arc(hx, hy + r * 0.35, r * 0.25, 0, Math.PI * 2);
      ctx.stroke();
      break;

    case 'focused':
      // Serious horizontal eyes
      ctx.beginPath();
      ctx.moveTo(hx - eyeOffsetX - 4, hy + eyeOffsetY);
      ctx.lineTo(hx - eyeOffsetX + 4, hy + eyeOffsetY);
      ctx.moveTo(hx + eyeOffsetX - 4, hy + eyeOffsetY);
      ctx.lineTo(hx + eyeOffsetX + 4, hy + eyeOffsetY);
      ctx.stroke();
      // Small determined line
      ctx.beginPath();
      ctx.moveTo(hx - r * 0.2, hy + r * 0.35);
      ctx.lineTo(hx + r * 0.2, hy + r * 0.35);
      ctx.stroke();
      break;

    default:
      // Neutral dots and subtle smile
      ctx.beginPath();
      ctx.arc(hx - eyeOffsetX, hy + eyeOffsetY, eyeR, 0, Math.PI * 2);
      ctx.arc(hx + eyeOffsetX, hy + eyeOffsetY, eyeR, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(hx, hy + r * 0.3, r * 0.3, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.stroke();
      break;
  }
  ctx.restore();
}

function renderSubtitle(
  ctx: CanvasRenderingContext2D,
  text: string,
  width: number,
  height: number
) {
  ctx.save();
  ctx.font = '13px JetBrains Mono, monospace';
  const textMetrics = ctx.measureText(text);
  const padX = 14;
  const padY = 7;
  const boxW = textMetrics.width + padX * 2;
  const boxH = 28;
  const boxX = (width - boxW) / 2;
  const boxY = height - 44;

  // Backdrop
  ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
  ctx.strokeStyle = 'rgba(51, 65, 85, 0.8)';
  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxW, boxH, 6);
  ctx.fill();
  ctx.stroke();

  // Text
  ctx.fillStyle = '#38bdf8';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, boxY + boxH / 2);
  ctx.restore();
}
