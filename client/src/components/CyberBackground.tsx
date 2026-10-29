/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * bdfight - Cybernetic Background & Ambient FX Canvas
 */

import React, { useEffect, useRef } from 'react';

interface Props {
  accentColor?: string;
}

export const CyberBackground: React.FC<Props> = ({ accentColor = '#00F0FF' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const onResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);

    // Particle pool
    const particles = Array.from({ length: 48 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2 + 0.8,
      speedY: -(Math.random() * 0.7 + 0.3),
      speedX: (Math.random() - 0.5) * 0.4,
      alpha: Math.random() * 0.6 + 0.2,
      pulseSpeed: Math.random() * 0.03 + 0.01,
    }));

    let gridOffset = 0;

    const render = () => {
      gridOffset = (gridOffset + 0.6) % 40;

      // Deep cyber background gradient
      const bgGrad = ctx.createRadialGradient(
        width * 0.5,
        height * 0.4,
        50,
        width * 0.5,
        height * 0.5,
        Math.max(width, height)
      );
      bgGrad.addColorStop(0, '#060a17');
      bgGrad.addColorStop(0.6, '#02040a');
      bgGrad.addColorStop(1, '#000002');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Floor perspective grid
      const horizon = height * 0.68;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, horizon, width, height - horizon);
      ctx.clip();

      ctx.strokeStyle = 'rgba(0, 240, 255, 0.12)';
      ctx.lineWidth = 1;

      // Horizontal lines receding into distance
      for (let y = horizon; y < height; y += 4) {
        const factor = (y - horizon) / (height - horizon);
        const yPos = horizon + Math.pow(factor, 2.2) * (height - horizon);
        const dynamicY = (yPos + gridOffset * factor) % (height - horizon) + horizon;
        ctx.beginPath();
        ctx.moveTo(0, dynamicY);
        ctx.lineTo(width, dynamicY);
        ctx.stroke();
      }

      // Vanishing perspective vertical lines
      const vanishingX = width * 0.5;
      const numLines = 28;
      for (let i = -numLines; i <= numLines; i++) {
        const bottomX = vanishingX + i * 80;
        ctx.beginPath();
        ctx.moveTo(vanishingX, horizon);
        ctx.lineTo(bottomX, height);
        ctx.stroke();
      }
      ctx.restore();

      // Atmospheric horizon laser line
      const laserGrad = ctx.createLinearGradient(0, horizon, width, horizon);
      laserGrad.addColorStop(0, 'rgba(0,0,0,0)');
      laserGrad.addColorStop(0.3, accentColor + '44');
      laserGrad.addColorStop(0.5, accentColor + 'aa');
      laserGrad.addColorStop(0.7, accentColor + '44');
      laserGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.strokeStyle = laserGrad;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, horizon);
      ctx.lineTo(width, horizon);
      ctx.stroke();

      // Ambient particles / sparks floating upward
      particles.forEach((p) => {
        p.y += p.speedY;
        p.x += p.speedX;
        p.alpha += Math.sin(Date.now() * 0.003) * 0.01;

        if (p.y < 0) {
          p.y = height;
          p.x = Math.random() * width;
        }
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;

        ctx.fillStyle = `rgba(0, 240, 255, ${Math.max(0.1, Math.min(0.8, p.alpha))})`;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      });

      // Subtle CRT scanlines
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      for (let sl = 0; sl < height; sl += 4) {
        ctx.fillRect(0, sl, width, 1.2);
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
    };
  }, [accentColor]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
      aria-hidden="true"
    />
  );
};
