/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Crosshair,
  Copy,
  Check,
  Compass,
  Activity,
  Maximize2,
} from 'lucide-react';
import type { ProbePointMetrics } from '../../types/toroidalMatrix';

interface ParametricProbePanelProps {
  readonly metrics: ProbePointMetrics | null;
  readonly onUpdateProbe: (u: number, v: number) => void;
}

export const ParametricProbePanel: React.FC<ParametricProbePanelProps> = ({
  metrics,
  onUpdateProbe,
}) => {
  const [copiedHex, setCopiedHex] = useState(false);

  if (!metrics) {
    return (
      <div className="p-4 rounded-lg border border-slate-800 bg-slate-900/50 text-slate-400 text-xs text-center">
        Click anywhere on the torus to probe surface metrics.
      </div>
    );
  }

  const {
    u,
    v,
    position,
    normal,
    gaussianCurvature: K,
    meanCurvature: H,
    principalCurvatures,
    metricTensor,
    oklab,
    rgb,
    hex,
    regime,
  } = metrics;

  const uDeg = ((u * 180) / Math.PI).toFixed(1);
  const vDeg = ((v * 180) / Math.PI).toFixed(1);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHex(true);
    setTimeout(() => setCopiedHex(false), 1500);
  };

  const regimeBadge = {
    elliptic: {
      text: 'Elliptic (K > 0)',
      bg: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60',
      desc: 'Outer convex boundary; geodesics converge locally',
    },
    parabolic: {
      text: 'Parabolic (K ≈ 0)',
      bg: 'bg-amber-950/80 text-amber-300 border-amber-700/60',
      desc: 'Inflection circle; Euclidean tangent space',
    },
    hyperbolic: {
      text: 'Hyperbolic (K < 0)',
      bg: 'bg-rose-950/80 text-rose-300 border-rose-700/60',
      desc: 'Inner throat saddle; geodesics diverge',
    },
  }[regime];

  return (
    <div className="flex flex-col gap-3 text-xs bg-slate-950/80 border border-slate-800/90 rounded-xl p-3 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <Crosshair className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-slate-200 tracking-wide uppercase text-[11px]">
            Surface Differential Probe
          </span>
        </div>
        <div className={`px-2 py-0.5 rounded text-[10px] font-mono border ${regimeBadge.bg}`} title={regimeBadge.desc}>
          {regimeBadge.text}
        </div>
      </div>

      {/* Coordinate Stepper Controls */}
      <div className="grid grid-cols-2 gap-2 bg-slate-900/60 p-2 rounded-lg border border-slate-800/50">
        <div>
          <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
            <span className="font-mono text-cyan-400">u (Major Angle)</span>
            <span className="font-mono text-slate-300">{u.toFixed(3)} rad ({uDeg}°)</span>
          </div>
          <input
            type="range"
            min="0"
            max={Math.PI * 2}
            step="0.01"
            value={u}
            onChange={(e) => onUpdateProbe(parseFloat(e.target.value), v)}
            className="w-full accent-cyan-400 h-1 bg-slate-800 rounded cursor-pointer"
          />
        </div>
        <div>
          <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
            <span className="font-mono text-cyan-400">v (Minor Angle)</span>
            <span className="font-mono text-slate-300">{v.toFixed(3)} rad ({vDeg}°)</span>
          </div>
          <input
            type="range"
            min="0"
            max={Math.PI * 2}
            step="0.01"
            value={v}
            onChange={(e) => onUpdateProbe(u, parseFloat(e.target.value))}
            className="w-full accent-cyan-400 h-1 bg-slate-800 rounded cursor-pointer"
          />
        </div>
      </div>

      {/* Geometric & Riemannian Metrics */}
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        {/* Curvatures */}
        <div className="p-2 rounded bg-slate-900/50 border border-slate-800/60 space-y-1">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Activity className="w-3 h-3 text-cyan-400" />
            Extrinsic Curvature
          </div>
          <div className="flex justify-between font-mono">
            <span className="text-slate-400">Gaussian (K)</span>
            <span className={`font-semibold ${K >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {K.toFixed(4)}
            </span>
          </div>
          <div className="flex justify-between font-mono">
            <span className="text-slate-400">Mean (H)</span>
            <span className="text-slate-200">{H.toFixed(4)}</span>
          </div>
          <div className="flex justify-between font-mono text-[10px]">
            <span className="text-slate-400">κ₁ = {principalCurvatures.kappa1.toFixed(3)}</span>
            <span className="text-slate-400">κ₂ = {principalCurvatures.kappa2.toFixed(3)}</span>
          </div>
        </div>

        {/* Metric Tensor */}
        <div className="p-2 rounded bg-slate-900/50 border border-slate-800/60 space-y-1">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Compass className="w-3 h-3 text-cyan-400" />
            Riemannian Metric g_ij
          </div>
          <div className="flex justify-between font-mono">
            <span className="text-slate-400">g_uu / g_vv</span>
            <span className="text-slate-200">{metricTensor.g_uu.toFixed(1)} / {metricTensor.g_vv.toFixed(1)}</span>
          </div>
          <div className="flex justify-between font-mono">
            <span className="text-slate-400">det(g)</span>
            <span className="text-slate-200">{metricTensor.det_g.toFixed(1)}</span>
          </div>
          <div className="flex justify-between font-mono">
            <span className="text-slate-400">Area dA</span>
            <span className="text-cyan-300 font-semibold">{metricTensor.areaElement.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Vectors (Position & Normal) */}
      <div className="p-2 rounded bg-slate-900/50 border border-slate-800/60 text-[10px] font-mono space-y-1">
        <div className="flex justify-between">
          <span className="text-slate-400">r(u,v)</span>
          <span className="text-slate-300">
            [{position.x.toFixed(2)}, {position.y.toFixed(2)}, {position.z.toFixed(2)}]
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">n(u,v)</span>
          <span className="text-cyan-300">
            [{normal.x.toFixed(3)}, {normal.y.toFixed(3)}, {normal.z.toFixed(3)}]
          </span>
        </div>
      </div>

      {/* OKLab & Colorimetric Output */}
      <div className="p-2 rounded bg-slate-900/80 border border-slate-800/80 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg border border-white/20 shadow-inner shrink-0 transition-colors"
            style={{ backgroundColor: hex }}
          />
          <div>
            <div className="font-mono font-bold text-slate-100 flex items-center gap-1.5 text-xs">
              <span>{hex.toUpperCase()}</span>
              <button
                onClick={() => copyToClipboard(hex)}
                className="text-slate-400 hover:text-cyan-300 transition-colors"
                title="Copy Hex Color"
              >
                {copiedHex ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
              RGB({(rgb.r * 255).toFixed(0)}, {(rgb.g * 255).toFixed(0)}, {(rgb.b * 255).toFixed(0)})
            </div>
          </div>
        </div>

        <div className="text-right text-[10px] font-mono text-slate-300">
          <div>OKLab:</div>
          <div className="text-cyan-400">
            L: {oklab.L.toFixed(3)}
          </div>
          <div className="text-slate-400">
            a: {oklab.a.toFixed(3)} | b: {oklab.b.toFixed(3)}
          </div>
        </div>
      </div>
    </div>
  );
};
