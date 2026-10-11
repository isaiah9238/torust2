/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import type { TorusDimensions } from '../../types/toroidalMatrix';
import { matrixCache } from '../../services/toroidalMatrixCache';
import { TWO_PI } from '../../utils/torusMath';

interface CurvatureDistributionGraphProps {
  readonly dimensions: TorusDimensions;
  readonly probedV: number | null;
}

export const CurvatureDistributionGraph: React.FC<CurvatureDistributionGraphProps> = ({
  dimensions,
  probedV,
}) => {
  const samples = useMemo(() => {
    return matrixCache.getCurvatureProfile(dimensions, 100);
  }, [dimensions]);

  const { minK, maxK } = useMemo(() => {
    let min = 0;
    let max = 0;
    for (const s of samples) {
      if (s.K < min) min = s.K;
      if (s.K > max) max = s.K;
    }
    const absMax = Math.max(Math.abs(min), Math.abs(max), 0.1);
    return { minK: -absMax, maxK: absMax };
  }, [samples]);

  // SVG coordinate transformation
  const svgWidth = 280;
  const svgHeight = 90;
  const zeroY = svgHeight / 2;

  const pathD = useMemo(() => {
    if (samples.length === 0) return '';
    return samples
      .map((s, i) => {
        const x = (i / (samples.length - 1)) * svgWidth;
        const normalizedY = (s.K / maxK) * (zeroY - 10);
        const y = zeroY - normalizedY;
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }, [samples, maxK, zeroY, svgWidth]);

  // Current probed marker position
  const markerX = probedV !== null ? ((probedV % TWO_PI) / TWO_PI) * svgWidth : null;

  return (
    <div className="flex flex-col gap-1.5 p-3 bg-slate-950/80 border border-slate-800/80 rounded-xl text-xs">
      <div className="flex items-center justify-between text-[11px] pb-1 border-b border-slate-800/80">
        <span className="font-semibold text-slate-200 uppercase tracking-wide">
          Gaussian Curvature Profile K(v)
        </span>
        <span className="text-[10px] text-cyan-400 font-mono">
          max K: +{maxK.toFixed(3)}
        </span>
      </div>

      <div className="relative bg-slate-900/50 rounded border border-slate-800/60 overflow-hidden py-1">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-20 overflow-visible"
        >
          {/* Zero line */}
          <line
            x1="0"
            y1={zeroY}
            x2={svgWidth}
            y2={zeroY}
            stroke="#475569"
            strokeDasharray="3 3"
            strokeWidth="1"
          />

          {/* Area under curve fill */}
          <path
            d={`${pathD} L ${svgWidth} ${zeroY} L 0 ${zeroY} Z`}
            fill="url(#curvatureGradient)"
            opacity="0.35"
          />

          {/* Main curve */}
          <path
            d={pathD}
            fill="none"
            stroke="#38bdf8"
            strokeWidth="1.8"
          />

          {/* Probed marker */}
          {markerX !== null && (
            <>
              <line
                x1={markerX}
                y1="0"
                x2={markerX}
                y2={svgHeight}
                stroke="#f43f5e"
                strokeWidth="1.5"
                strokeDasharray="2 2"
              />
              <circle
                cx={markerX}
                cy={zeroY}
                r="3.5"
                fill="#f43f5e"
              />
            </>
          )}

          <defs>
            <linearGradient id="curvatureGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#eab308" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.8" />
            </linearGradient>
          </defs>
        </svg>

        {/* Legend labels */}
        <div className="flex justify-between px-2 text-[9px] font-mono text-slate-400 mt-0.5">
          <span>v=0 (Outer, K &gt; 0)</span>
          <span>v=π/2 (K=0)</span>
          <span>v=π (Inner, K &lt; 0)</span>
          <span>v=2π</span>
        </div>
      </div>
    </div>
  );
};
