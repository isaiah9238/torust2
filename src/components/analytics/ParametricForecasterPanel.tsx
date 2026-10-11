/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  TrendingUp,
  Clock,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Brain,
  BookmarkCheck,
  ChevronRight,
  Activity,
  Layers,
  Zap,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import type {
  ToroidalMatrixState,
  TrajectoryForecastPoint,
  ForecastSummary,
} from '../../types/toroidalMatrix';
import { generateTrajectoryForecast, TWO_PI } from '../../utils/torusMath';
import { saveForecastRecord } from '../../services/firebaseService';
import type { User } from 'firebase/auth';

interface ParametricForecasterPanelProps {
  readonly state: ToroidalMatrixState;
  readonly onUpdateTimeOffset: (offset: number) => void;
  readonly currentUser: User | null;
}

export const ParametricForecasterPanel: React.FC<ParametricForecasterPanelProps> = ({
  state,
  onUpdateTimeOffset,
  currentUser,
}) => {
  const [horizon, setHorizon] = useState<number>(30); // 10, 30, 60, 120
  const [isPlayingForecast, setIsPlayingForecast] = useState<boolean>(false);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);

  const probedU = state.probedPoint?.u ?? Math.PI * 0.25;
  const probedV = state.probedPoint?.v ?? Math.PI * 0.5;
  const currentTimeOffset = state.forecastTimeOffset ?? 0;

  // Compute analytical forward trajectory
  const forecast: ForecastSummary = useMemo(() => {
    return generateTrajectoryForecast(probedU, probedV, state, horizon, 75);
  }, [probedU, probedV, state, horizon]);

  // Forecast playback animation loop
  useEffect(() => {
    if (!isPlayingForecast) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    let lastTime = performance.now();
    const step = () => {
      const now = performance.now();
      const deltaSec = (now - lastTime) / 1000;
      lastTime = now;

      onUpdateTimeOffset((currentTimeOffset + deltaSec * 2.0) % horizon);
      animFrameRef.current = requestAnimationFrame(step);
    };

    animFrameRef.current = requestAnimationFrame(step);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlayingForecast, currentTimeOffset, horizon, onUpdateTimeOffset]);

  // Draw OKLab chromatic hodograph (a, b phase plane orbit)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;
    const scale = width * 1.8; // Map [-0.25, 0.25] to pixels

    // Axes
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, height);
    ctx.stroke();

    // Subtle concentric reference circles
    ctx.strokeStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 0.1 * scale, 0, Math.PI * 2);
    ctx.arc(centerX, centerY, 0.2 * scale, 0, Math.PI * 2);
    ctx.stroke();

    if (forecast.trajectory.length < 2) return;

    // Draw full future orbit trajectory
    ctx.lineWidth = 2;
    ctx.beginPath();
    forecast.trajectory.forEach((pt, i) => {
      const px = centerX + pt.oklab.a * scale;
      const py = centerY - pt.oklab.b * scale; // Inverted Y for Cartesian
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });

    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#38bdf8');
    grad.addColorStop(0.5, '#a855f7');
    grad.addColorStop(1, '#ec4899');
    ctx.strokeStyle = grad;
    ctx.stroke();

    // Find current scrubbed position on trajectory
    const scrubT = currentTimeOffset % horizon;
    const scrubRatio = scrubT / horizon;
    const ptIdx = Math.min(
      forecast.trajectory.length - 1,
      Math.floor(scrubRatio * (forecast.trajectory.length - 1))
    );
    const curPt = forecast.trajectory[ptIdx];

    if (curPt) {
      const curX = centerX + curPt.oklab.a * scale;
      const curY = centerY - curPt.oklab.b * scale;

      // Current point beacon
      ctx.fillStyle = curPt.hex;
      ctx.beginPath();
      ctx.arc(curX, curY, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }, [forecast, currentTimeOffset, horizon]);

  // Trigger Gemini 3.1 Pro Preview with HIGH THINKING
  const handleRunAiForecast = async () => {
    setIsAiLoading(true);
    setErrorMsg(null);
    setSavedSuccess(false);

    try {
      const res = await fetch('/api/ai/forecast-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matrixState: state,
          forecastSummary: forecast,
          probedU,
          probedV,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Forecast analysis failed');
      }

      setAiReport(data.forecastReport);

      // Auto-save to Firestore if user logged in
      if (currentUser) {
        try {
          await saveForecastRecord({
            id: `forecast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            userId: currentUser.uid,
            title: `Forecast Horizon ${horizon}s (N=${state.layers[3]?.symmetryFold || 8})`,
            horizonSeconds: horizon,
            recurrencePeriod: forecast.recurrencePeriod,
            probedU,
            probedV,
            summary: data.forecastReport,
            createdAt: new Date().toISOString(),
          });
          setSavedSuccess(true);
        } catch (err) {
          console.warn('Could not save forecast record:', err);
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to complete forecast reasoning');
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 text-xs bg-slate-950/80 border border-slate-800/90 rounded-xl p-3 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-slate-200 tracking-wide uppercase text-[11px]">
            Dynamical Phase & Trajectory Forecaster
          </span>
        </div>
        <div className="flex items-center gap-1 font-mono text-[10px] text-purple-300 bg-purple-950/60 border border-purple-800/60 px-2 py-0.5 rounded">
          <Clock className="w-3 h-3" />
          <span>Horizon: {horizon}s</span>
        </div>
      </div>

      {/* Horizon selector buttons */}
      <div className="flex gap-1 bg-slate-900/60 p-1 rounded-lg border border-slate-800/60">
        {[10, 30, 60, 120].map((h) => (
          <button
            key={h}
            onClick={() => {
              setHorizon(h);
              onUpdateTimeOffset(0);
            }}
            className={`flex-1 py-1 rounded text-[10px] font-mono transition-colors ${
              horizon === h
                ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            +{h}s
          </button>
        ))}
      </div>

      {/* Interactive Timeline Scrubber */}
      <div className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800/80 space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlayingForecast(!isPlayingForecast)}
              className={`p-1.5 rounded-md transition-colors ${
                isPlayingForecast
                  ? 'bg-rose-950/80 text-rose-300 border border-rose-700/60'
                  : 'bg-cyan-950/80 text-cyan-300 border border-cyan-700/60 hover:bg-cyan-900'
              }`}
              title={isPlayingForecast ? 'Pause simulation' : 'Play future trajectory'}
            >
              {isPlayingForecast ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => onUpdateTimeOffset(0)}
              className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Reset offset to t=0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-slate-200">
              Δt: +{currentTimeOffset.toFixed(2)}s
            </span>
          </div>

          <div className="flex gap-1 text-[9px] font-mono">
            <button
              onClick={() => onUpdateTimeOffset((currentTimeOffset + 5) % horizon)}
              className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              +5s
            </button>
            <button
              onClick={() => onUpdateTimeOffset(forecast.recurrencePeriod % horizon)}
              className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-purple-900 text-purple-300"
              title="Jump to Poincaré Recurrence time"
            >
              Recurrence (T)
            </button>
          </div>
        </div>

        <input
          type="range"
          min="0"
          max={horizon}
          step="0.1"
          value={currentTimeOffset}
          onChange={(e) => onUpdateTimeOffset(parseFloat(e.target.value))}
          className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded cursor-pointer"
        />

        {/* Future Chromatic Swatch Strip */}
        <div className="flex h-3 w-full rounded overflow-hidden border border-slate-700/60">
          {forecast.trajectory.filter((_, idx) => idx % 3 === 0).map((pt, i) => (
            <div
              key={i}
              className="flex-1 transition-opacity hover:opacity-80"
              style={{ backgroundColor: pt.hex }}
              title={`t=+${pt.deltaT.toFixed(1)}s: ${pt.hex}`}
            />
          ))}
        </div>
      </div>

      {/* Recurrence & Dynamical Quantities */}
      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
        <div className="p-2 rounded bg-slate-900/50 border border-slate-800/60 space-y-1">
          <div className="text-slate-400 font-sans text-[9px] uppercase tracking-wider">
            Poincaré Recurrence (T)
          </div>
          <div className="text-purple-300 font-bold text-xs">
            {forecast.recurrencePeriod.toFixed(2)}s
          </div>
          <div className="text-[9px] text-slate-400 font-sans">
            Loop: <span className="text-cyan-300">{forecast.colorLoopType}</span>
          </div>
        </div>

        <div className="p-2 rounded bg-slate-900/50 border border-slate-800/60 space-y-1">
          <div className="text-slate-400 font-sans text-[9px] uppercase tracking-wider">
            Mean Spectral Velocity
          </div>
          <div className="text-cyan-300 font-bold text-xs">
            {forecast.averageSpectralVelocity.toFixed(4)} ΔE/s
          </div>
          <div className="text-[9px] text-slate-400 font-sans">
            Inversion: in <span className="text-amber-300">{(forecast.nextPhaseInversionTime).toFixed(1)}s</span>
          </div>
        </div>
      </div>

      {/* OKLab Chromatic Hodograph Canvas (Phase Space Trajectory) */}
      <div className="p-2 rounded-lg bg-slate-900/50 border border-slate-800/60 space-y-1">
        <div className="flex items-center justify-between text-[10px] text-slate-300">
          <span className="font-semibold uppercase tracking-wider text-[9px]">
            OKLab Chromatic Hodograph Orbit (a vs b)
          </span>
          <span className="font-mono text-[9px] text-slate-400">
            Lissajous Phase Space
          </span>
        </div>

        <div className="relative rounded bg-slate-950 flex items-center justify-center p-1 border border-slate-800">
          <canvas
            ref={canvasRef}
            width={240}
            height={130}
            className="w-full h-auto block"
          />
          <div className="absolute top-1 left-2 pointer-events-none text-[8px] font-mono text-slate-500">
            +b (Yellow)
          </div>
          <div className="absolute bottom-1 left-2 pointer-events-none text-[8px] font-mono text-slate-500">
            -b (Blue)
          </div>
          <div className="absolute top-1 right-2 pointer-events-none text-[8px] font-mono text-slate-500">
            +a (Red)
          </div>
        </div>
      </div>

      {/* High-Thinking AI Deep Horizon Forecasting */}
      <div className="pt-1">
        <button
          onClick={handleRunAiForecast}
          disabled={isAiLoading}
          className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
        >
          {isAiLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Brain className="w-4 h-4" />
          )}
          <span>High-Thinking Dynamical Forecast (Gemini 3.1 Pro)</span>
        </button>

        {errorMsg && (
          <div className="mt-2 p-2 rounded bg-rose-950/50 border border-rose-800 text-rose-300 text-[11px] flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {isAiLoading && (
          <div className="mt-2 p-4 rounded-lg bg-slate-900/60 border border-slate-800 text-center space-y-1.5">
            <Loader2 className="w-5 h-5 animate-spin text-purple-400 mx-auto" />
            <div className="text-slate-200 text-xs font-medium">
              Forecasting Non-Linear KAM Torus Evolution...
            </div>
            <div className="text-[10px] text-slate-400">
              Evaluating Poincaré recurrence, quasi-periodic winding numbers, and hysteresis relaxation bifurcations.
            </div>
          </div>
        )}

        {aiReport && !isAiLoading && (
          <div className="mt-2 rounded-lg bg-slate-900/80 border border-slate-800 p-3 space-y-2">
            <div className="flex items-center justify-between text-[10px] pb-1 border-b border-slate-800 text-slate-400">
              <span className="flex items-center gap-1 text-purple-300 font-mono font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                Dynamical Horizon Proof
              </span>
              {savedSuccess && (
                <span className="flex items-center gap-1 text-emerald-400">
                  <BookmarkCheck className="w-3.5 h-3.5" />
                  Saved to Cloud Firestore
                </span>
              )}
            </div>
            <div className="text-slate-200 text-[11px] leading-relaxed whitespace-pre-wrap font-sans max-h-60 overflow-y-auto pr-1 custom-scrollbar">
              {aiReport}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
