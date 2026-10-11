/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect } from 'react';
import type { ToroidalMatrixState } from '../../types/toroidalMatrix';
import { evaluateProbeMetrics, TWO_PI } from '../../utils/torusMath';

interface UnwrappedManifoldChartProps {
  readonly state: ToroidalMatrixState;
  readonly onSelectCoords: (u: number, v: number) => void;
}

export const UnwrappedManifoldChart: React.FC<UnwrappedManifoldChartProps> = ({
  state,
  onSelectCoords,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Render 2D unwrap texture onto canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;

    // Discretized sampling across (u, v)
    for (let py = 0; py < height; py++) {
      const v = (py / height) * TWO_PI;
      for (let px = 0; px < width; px++) {
        const u = (px / width) * TWO_PI;

        const { rgb } = evaluateProbeMetrics(u, v, state);
        const idx = (py * width + px) * 4;
        data[idx] = Math.round(rgb.r * 255);
        data[idx + 1] = Math.round(rgb.g * 255);
        data[idx + 2] = Math.round(rgb.b * 255);
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);

    // Overlay guide lines
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    // v = pi/2 (top parabolic circle)
    const yParabolicTop = (0.25) * height;
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.7)';
    ctx.beginPath();
    ctx.moveTo(0, yParabolicTop);
    ctx.lineTo(width, yParabolicTop);
    ctx.stroke();

    // v = pi (inner throat)
    const yInnerThroat = (0.5) * height;
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.8)';
    ctx.beginPath();
    ctx.moveTo(0, yInnerThroat);
    ctx.lineTo(width, yInnerThroat);
    ctx.stroke();

    // v = 3pi/2 (bottom parabolic circle)
    const yParabolicBot = (0.75) * height;
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.7)';
    ctx.beginPath();
    ctx.moveTo(0, yParabolicBot);
    ctx.lineTo(width, yParabolicBot);
    ctx.stroke();

    ctx.setLineDash([]);

    // Draw probed point crosshair
    if (state.probedPoint) {
      const px = ((state.probedPoint.u % TWO_PI) / TWO_PI) * width;
      const py = ((state.probedPoint.v % TWO_PI) / TWO_PI) * height;

      // Glow beacon
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(px, py, 10, 0, Math.PI * 2);
      ctx.stroke();
    }
  }, [
    state.dimensions.majorRadius,
    state.dimensions.minorRadius,
    state.curvatureModulation,
    state.driftSpeed,
    state.quantizationLevels,
    state.timeEpoch,
    state.probedPoint,
    state.layers,
  ]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const u = (x / rect.width) * TWO_PI;
    const v = (y / rect.height) * TWO_PI;
    onSelectCoords(u, v);
  };

  return (
    <div className="flex flex-col gap-2 p-3 bg-slate-950/80 border border-slate-800/80 rounded-xl text-xs">
      <div className="flex items-center justify-between text-[11px] pb-1 border-b border-slate-800/80">
        <span className="font-semibold text-slate-200 uppercase tracking-wide">
          2D Unwrapped Manifold Domain (u, v)
        </span>
        <span className="text-[10px] text-slate-400 font-mono">
          [0, 2π) × [0, 2π)
        </span>
      </div>

      <div className="relative rounded-lg overflow-hidden border border-slate-800 cursor-crosshair group">
        <canvas
          ref={canvasRef}
          width={240}
          height={160}
          onClick={handleCanvasClick}
          className="w-full h-auto block"
        />

        <div className="absolute top-1 left-2 pointer-events-none text-[9px] font-mono text-white/70 bg-black/50 px-1 py-0.5 rounded">
          v=0: Outer Equator (K &gt; 0)
        </div>
        <div className="absolute top-[23%] left-2 pointer-events-none text-[9px] font-mono text-amber-300/80 bg-black/50 px-1 py-0.5 rounded">
          v=π/2: Parabolic (K = 0)
        </div>
        <div className="absolute top-[48%] left-2 pointer-events-none text-[9px] font-mono text-rose-400/80 bg-black/50 px-1 py-0.5 rounded">
          v=π: Inner Throat (K &lt; 0)
        </div>
        <div className="absolute bottom-1 right-2 pointer-events-none text-[9px] font-mono text-white/70 bg-black/50 px-1 py-0.5 rounded">
          Click to probe coordinates
        </div>
      </div>
    </div>
  );
};
