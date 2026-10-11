/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Layers,
  Eye,
  EyeOff,
  Sliders,
  RotateCcw,
  Sparkles,
  Info,
} from 'lucide-react';
import type { ToroidalMatrixState, LayerTransformationConfig, MatrixLayerIndex } from '../../types/toroidalMatrix';

interface LayerStackInspectorProps {
  readonly state: ToroidalMatrixState;
  readonly onUpdateLayer: (index: MatrixLayerIndex, updates: Partial<LayerTransformationConfig>) => void;
  readonly onUpdateDimensions: (R: number, r: number) => void;
  readonly onUpdateCurvatureModulation: (val: number) => void;
  readonly onUpdateDriftSpeed: (val: number) => void;
  readonly onUpdateQuantization: (levels: number) => void;
  readonly onResetAll: () => void;
}

export const LayerStackInspector: React.FC<LayerStackInspectorProps> = ({
  state,
  onUpdateLayer,
  onUpdateDimensions,
  onUpdateCurvatureModulation,
  onUpdateDriftSpeed,
  onUpdateQuantization,
  onResetAll,
}) => {
  return (
    <div className="flex flex-col gap-3 text-xs">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-slate-200 tracking-wide uppercase text-[11px]">
            7-Layer Transformation Stack
          </span>
        </div>
        <button
          onClick={onResetAll}
          className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
          title="Reset all layer parameters to default"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>

      <div className="space-y-2.5 max-h-[calc(100vh-270px)] overflow-y-auto pr-1 custom-scrollbar">
        {state.layers.map((layer) => {
          const idx = layer.layerIndex;
          return (
            <div
              key={idx}
              className={`rounded-lg border transition-all duration-200 p-2.5 ${
                layer.enabled
                  ? 'bg-slate-900/80 border-slate-700/80 shadow-sm'
                  : 'bg-slate-950/40 border-slate-900/60 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded bg-cyan-950 border border-cyan-800/60 text-cyan-300 font-mono text-[10px] font-bold">
                    L{idx}
                  </span>
                  <div>
                    <h4 className="font-medium text-slate-200 text-[12px] leading-tight">
                      {layer.name}
                    </h4>
                    <p className="font-mono text-[9px] text-cyan-400/90 mt-0.5 select-all">
                      {layer.mathematicalFormula}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => onUpdateLayer(idx, { enabled: !layer.enabled })}
                  className={`p-1 rounded transition-colors ${
                    layer.enabled
                      ? 'text-cyan-400 hover:text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/50'
                      : 'text-slate-500 hover:text-slate-300 bg-slate-800/40'
                  }`}
                  title={layer.enabled ? 'Disable Layer' : 'Enable Layer'}
                >
                  {layer.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
              </div>

              {layer.enabled && (
                <div className="mt-2.5 pt-2 border-t border-slate-800/60 space-y-2">
                  {/* Layer-specific custom parameters */}
                  {idx === 1 && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                          <span>Major Radius (R)</span>
                          <span className="font-mono text-cyan-300">{state.dimensions.majorRadius.toFixed(1)}</span>
                        </div>
                        <input
                          type="range"
                          min="3.0"
                          max="10.0"
                          step="0.1"
                          value={state.dimensions.majorRadius}
                          onChange={(e) => onUpdateDimensions(parseFloat(e.target.value), state.dimensions.minorRadius)}
                          className="w-full accent-cyan-400 h-1 bg-slate-800 rounded-lg cursor-pointer"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                          <span>Minor Radius (r)</span>
                          <span className="font-mono text-cyan-300">{state.dimensions.minorRadius.toFixed(1)}</span>
                        </div>
                        <input
                          type="range"
                          min="0.8"
                          max={Math.max(1.0, state.dimensions.majorRadius - 0.5).toFixed(1)}
                          step="0.1"
                          value={state.dimensions.minorRadius}
                          onChange={(e) => onUpdateDimensions(state.dimensions.majorRadius, parseFloat(e.target.value))}
                          className="w-full accent-cyan-400 h-1 bg-slate-800 rounded-lg cursor-pointer"
                        />
                      </div>
                    </div>
                  )}

                  {idx === 2 && (
                    <div>
                      <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                        <span>Curvature Modulation (K Weight)</span>
                        <span className="font-mono text-cyan-300">{state.curvatureModulation.toFixed(2)}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.0"
                        max="3.0"
                        step="0.05"
                        value={state.curvatureModulation}
                        onChange={(e) => onUpdateCurvatureModulation(parseFloat(e.target.value))}
                        className="w-full accent-cyan-400 h-1 bg-slate-800 rounded-lg cursor-pointer"
                      />
                    </div>
                  )}

                  {idx === 4 && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                          <span>Radial Fold (N)</span>
                          <span className="font-mono text-cyan-300">{layer.symmetryFold}</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="32"
                          step="1"
                          value={layer.symmetryFold}
                          onChange={(e) => onUpdateLayer(idx, { symmetryFold: parseInt(e.target.value, 10) })}
                          className="w-full accent-cyan-400 h-1 bg-slate-800 rounded-lg cursor-pointer"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                          <span>Harmonic Weight</span>
                          <span className="font-mono text-cyan-300">{layer.weight.toFixed(2)}</span>
                        </div>
                        <input
                          type="range"
                          min="0.0"
                          max="2.0"
                          step="0.05"
                          value={layer.weight}
                          onChange={(e) => onUpdateLayer(idx, { weight: parseFloat(e.target.value) })}
                          className="w-full accent-cyan-400 h-1 bg-slate-800 rounded-lg cursor-pointer"
                        />
                      </div>
                    </div>
                  )}

                  {idx === 5 && (
                    <div>
                      <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                        <span>Phase Velocity (ω drift)</span>
                        <span className="font-mono text-cyan-300">{state.driftSpeed.toFixed(2)}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.0"
                        max="3.0"
                        step="0.05"
                        value={state.driftSpeed}
                        onChange={(e) => onUpdateDriftSpeed(parseFloat(e.target.value))}
                        className="w-full accent-cyan-400 h-1 bg-slate-800 rounded-lg cursor-pointer"
                      />
                    </div>
                  )}

                  {idx === 7 && (
                    <div>
                      <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                        <span>Stepped Quantization</span>
                        <span className="font-mono text-cyan-300">
                          {state.quantizationLevels === 0 ? 'Continuous' : `${state.quantizationLevels} levels`}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="16"
                        step="1"
                        value={state.quantizationLevels}
                        onChange={(e) => onUpdateQuantization(parseInt(e.target.value, 10))}
                        className="w-full accent-cyan-400 h-1 bg-slate-800 rounded-lg cursor-pointer"
                      />
                    </div>
                  )}

                  {/* General weight slider for non-L1 layers */}
                  {idx !== 1 && idx !== 4 && idx !== 7 && (
                    <div>
                      <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                        <span>Layer Influence Weight</span>
                        <span className="font-mono text-cyan-300">{layer.weight.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0.0"
                        max="2.0"
                        step="0.05"
                        value={layer.weight}
                        onChange={(e) => onUpdateLayer(idx, { weight: parseFloat(e.target.value) })}
                        className="w-full accent-cyan-400 h-1 bg-slate-800 rounded-lg cursor-pointer"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
