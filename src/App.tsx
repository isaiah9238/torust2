/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  RotateCcw,
  Play,
  Pause,
  Grid,
  Compass,
  Layers,
  Sparkles,
  Brain,
  FolderOpen,
  Maximize2,
  Activity,
  Sliders,
  ChevronLeft,
  ChevronRight,
  Eye,
  TrendingUp,
} from 'lucide-react';
import { ToroidalCanvas } from './components/visualizers/ToroidalCanvas';
import { LayerStackInspector } from './components/analytics/LayerStackInspector';
import { ParametricProbePanel } from './components/analytics/ParametricProbePanel';
import { UnwrappedManifoldChart } from './components/analytics/UnwrappedManifoldChart';
import { CurvatureDistributionGraph } from './components/analytics/CurvatureDistributionGraph';
import { HighThinkingManifoldPanel } from './components/analytics/HighThinkingManifoldPanel';
import { ParametricForecasterPanel } from './components/analytics/ParametricForecasterPanel';
import { PresetManagerModal } from './components/analytics/PresetManagerModal';
import { SnapchatExportModal } from './components/export/SnapchatExportModal';
import {
  createInitialMatrixState,
  createDefaultLayers,
  evaluateProbeMetrics,
  normalizeAngle,
} from './utils/torusMath';
import type {
  ToroidalMatrixState,
  MatrixLayerIndex,
  LayerTransformationConfig,
} from './types/toroidalMatrix';
import {
  testFirestoreConnection,
  subscribeAuthState,
  signInWithGoogle,
  logOut,
} from './services/firebaseService';
import type { User } from 'firebase/auth';

export default function App() {
  const [matrixState, setMatrixState] = useState<ToroidalMatrixState>(createInitialMatrixState());
  const [autoRotate, setAutoRotate] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showAxes, setShowAxes] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [isSnapchatModalOpen, setIsSnapchatModalOpen] = useState(false);
  const [showStars, setShowStars] = useState(true);
  const [activeRightTab, setActiveRightTab] = useState<'probe' | 'curvature' | 'forecast' | 'ai'>('probe');
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);

  // Update forecast simulation time offset
  const handleUpdateTimeOffset = useCallback((offset: number) => {
    setMatrixState((prev) => ({
      ...prev,
      forecastTimeOffset: offset,
    }));
  }, []);

  // Initialize and test connection on boot
  useEffect(() => {
    testFirestoreConnection();
    const unsubscribe = subscribeAuthState((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Update probe coordinates callback
  const handleProbePoint = useCallback((u: number, v: number) => {
    setMatrixState((prev) => ({
      ...prev,
      probedPoint: {
        u: normalizeAngle(u),
        v: normalizeAngle(v),
      },
    }));
  }, []);

  // Evaluated probe metrics
  const probedMetrics = useMemo(() => {
    if (!matrixState.probedPoint) return null;
    return evaluateProbeMetrics(
      matrixState.probedPoint.u,
      matrixState.probedPoint.v,
      matrixState
    );
  }, [matrixState]);

  // Update layer configuration
  const handleUpdateLayer = (
    index: MatrixLayerIndex,
    updates: Partial<LayerTransformationConfig>
  ) => {
    setMatrixState((prev) => ({
      ...prev,
      layers: prev.layers.map((l) =>
        l.layerIndex === index ? { ...l, ...updates } : l
      ),
    }));
  };

  // Update dimensions
  const handleUpdateDimensions = (majorRadius: number, minorRadius: number) => {
    setMatrixState((prev) => ({
      ...prev,
      dimensions: {
        ...prev.dimensions,
        majorRadius,
        minorRadius,
      },
    }));
  };

  // Reset to default
  const handleResetAll = () => {
    setMatrixState(createInitialMatrixState());
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#06080d] text-slate-100 font-sans">
      {/* Top Navigation Bar */}
      <header className="h-14 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-4 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-indigo-600 shadow-md shadow-cyan-500/20 text-white font-mono font-bold text-sm">
            T²
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold tracking-tight text-sm text-slate-100">
                TOROIDAL COLOR MATRIX
              </h1>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60 font-semibold">
                7-LAYER ENGINE
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono hidden sm:block">
              Continuous Parameterization • Riemannian Metric • OKLab Gamut • WebGL
            </p>
          </div>
        </div>

        {/* Global Action Controls */}
        <div className="flex items-center gap-1.5 text-xs">
          {/* Render mode selector */}
          <div className="flex rounded-lg bg-slate-900 border border-slate-800 p-0.5">
            <button
              onClick={() => setMatrixState((s) => ({ ...s, renderMode: 'full' }))}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                matrixState.renderMode === 'full'
                  ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Composite
            </button>
            <button
              onClick={() => setMatrixState((s) => ({ ...s, renderMode: 'curvature-heatmap' }))}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                matrixState.renderMode === 'curvature-heatmap'
                  ? 'bg-amber-500/20 text-amber-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Curvature K
            </button>
            <button
              onClick={() => setMatrixState((s) => ({ ...s, renderMode: 'normals' }))}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                matrixState.renderMode === 'normals'
                  ? 'bg-purple-500/20 text-purple-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Normals
            </button>
            <button
              onClick={() => setMatrixState((s) => ({ ...s, renderMode: 'wireframe' }))}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                matrixState.renderMode === 'wireframe'
                  ? 'bg-slate-700 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Wire
            </button>
          </div>

          {/* Dynamic Play / Pause */}
          <button
            onClick={() => setMatrixState((s) => ({ ...s, isDynamic: !s.isDynamic }))}
            className={`p-1.5 rounded-lg border transition-colors ${
              matrixState.isDynamic
                ? 'bg-cyan-950/60 border-cyan-800 text-cyan-400 hover:bg-cyan-900/60'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title={matrixState.isDynamic ? 'Pause temporal phase drift' : 'Play temporal phase drift'}
          >
            {matrixState.isDynamic ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>

          {/* Auto-Rotate */}
          <button
            onClick={() => setAutoRotate((v) => !v)}
            className={`p-1.5 rounded-lg border transition-colors ${
              autoRotate
                ? 'bg-cyan-950/60 border-cyan-800 text-cyan-400 hover:bg-cyan-900/60'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle camera auto-rotation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Grid Toggle */}
          <button
            onClick={() => setShowGrid((v) => !v)}
            className={`p-1.5 rounded-lg border transition-colors ${
              showGrid
                ? 'bg-slate-800 border-slate-700 text-slate-200'
                : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
            }`}
            title="Toggle reference grid"
          >
            <Grid className="w-3.5 h-3.5" />
          </button>

          {/* Stars Background Toggle */}
          <button
            onClick={() => setShowStars((v) => !v)}
            className={`p-1.5 rounded-lg border transition-colors ${
              showStars
                ? 'bg-indigo-950/80 border-indigo-700/80 text-indigo-300 shadow-sm'
                : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
            }`}
            title={showStars ? 'Disable cosmic starfield' : 'Enable cosmic starfield'}
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>

          {/* Snapchat Export Button */}
          <button
            onClick={() => setIsSnapchatModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FFFC00] hover:bg-[#fffa33] text-black font-extrabold shadow-md shadow-yellow-500/20 transition-all cursor-pointer"
            title="Export 9:16 vertical Snapchat Story"
          >
            <span className="text-sm">👻</span>
            <span className="hidden sm:inline">Snapchat</span>
          </button>

          {/* Presets & Cloud button */}
          <button
            onClick={() => setIsPresetModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 hover:text-white transition-all"
          >
            <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-medium hidden md:inline">Presets & Cloud</span>
          </button>

          {/* User auth badge */}
          {currentUser ? (
            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-800">
              <img
                src={currentUser.photoURL || 'https://www.gravatar.com/avatar?d=mp'}
                alt={currentUser.displayName || 'User'}
                className="w-6 h-6 rounded-full border border-cyan-400/50"
              />
            </div>
          ) : (
            <button
              onClick={() => signInWithGoogle()}
              className="px-2.5 py-1 rounded-lg bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-200 border border-cyan-500/40 text-[11px] font-medium transition-colors"
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* Main Workspace Body */}
      <div className="flex flex-1 relative overflow-hidden">
        {/* Left Drawer: 7-Layer Stack Inspector */}
        <aside
          className={`relative z-10 transition-all duration-300 ease-in-out border-r border-slate-800/80 bg-slate-950/90 backdrop-blur-md flex flex-col ${
            isLeftPanelOpen ? 'w-80 md:w-96' : 'w-0 overflow-hidden border-r-0'
          }`}
        >
          {isLeftPanelOpen && (
            <div className="p-3 overflow-y-auto flex-1 custom-scrollbar">
              <LayerStackInspector
                state={matrixState}
                onUpdateLayer={handleUpdateLayer}
                onUpdateDimensions={handleUpdateDimensions}
                onUpdateCurvatureModulation={(val) =>
                  setMatrixState((s) => ({ ...s, curvatureModulation: val }))
                }
                onUpdateDriftSpeed={(val) =>
                  setMatrixState((s) => ({ ...s, driftSpeed: val }))
                }
                onUpdateQuantization={(levels) =>
                  setMatrixState((s) => ({ ...s, quantizationLevels: levels }))
                }
                onResetAll={handleResetAll}
              />
            </div>
          )}

          {/* Toggle Tab */}
          <button
            onClick={() => setIsLeftPanelOpen((v) => !v)}
            className="absolute -right-3.5 top-6 z-20 w-7 h-7 rounded-full bg-slate-800 border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110"
            title={isLeftPanelOpen ? 'Collapse Layer Inspector' : 'Expand Layer Inspector'}
          >
            {isLeftPanelOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </aside>

        {/* Central 3D Canvas Viewport */}
        <main className="flex-1 relative h-full">
          <ToroidalCanvas
            state={matrixState}
            onProbePoint={handleProbePoint}
            autoRotate={autoRotate}
            showGrid={showGrid}
            showAxes={showAxes}
            showStars={showStars}
          />

          {/* Forecast Time Offset HUD Badge */}
          {matrixState.forecastTimeOffset && matrixState.forecastTimeOffset > 0 ? (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-pink-950/80 border border-pink-700/80 backdrop-blur-md shadow-lg shadow-pink-950/50 text-xs">
              <span className="flex h-2 w-2 rounded-full bg-pink-400 animate-ping" />
              <span className="font-mono font-semibold text-pink-200">
                FORECAST HORIZON: +{matrixState.forecastTimeOffset.toFixed(2)}s
              </span>
              <button
                onClick={() => handleUpdateTimeOffset(0)}
                className="px-2 py-0.5 rounded-full bg-pink-900/80 hover:bg-pink-800 text-pink-200 text-[10px] font-mono transition-colors"
                title="Return to real-time present"
              >
                Reset t=0
              </button>
            </div>
          ) : null}

          {/* Floating Canvas Quick Hints */}
          <div className="absolute bottom-4 left-4 pointer-events-none z-10 hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-md border border-slate-800 text-[10px] text-slate-400 font-mono">
            <span>🖱️ Click Torus to Probe (u, v)</span>
            <span>•</span>
            <span>Rotate / Zoom / Pan</span>
            <span>•</span>
            <span className="text-cyan-400">
              R={matrixState.dimensions.majorRadius.toFixed(1)} r={matrixState.dimensions.minorRadius.toFixed(1)}
            </span>
          </div>
        </main>

        {/* Right Drawer: Probing, Analytics & AI High-Thinking Panel */}
        <aside
          className={`relative z-10 transition-all duration-300 ease-in-out border-l border-slate-800/80 bg-slate-950/90 backdrop-blur-md flex flex-col ${
            isRightPanelOpen ? 'w-80 md:w-96' : 'w-0 overflow-hidden border-l-0'
          }`}
        >
          {/* Toggle Tab */}
          <button
            onClick={() => setIsRightPanelOpen((v) => !v)}
            className="absolute -left-3.5 top-6 z-20 w-7 h-7 rounded-full bg-slate-800 border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110"
            title={isRightPanelOpen ? 'Collapse Analytics' : 'Expand Analytics'}
          >
            {isRightPanelOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          {isRightPanelOpen && (
            <div className="flex flex-col h-full overflow-hidden">
              {/* Tab Selector */}
              <div className="flex border-b border-slate-800/80 p-1.5 gap-1 shrink-0 bg-slate-900/40">
                <button
                  onClick={() => setActiveRightTab('probe')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors ${
                    activeRightTab === 'probe'
                      ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Probe & 2D</span>
                </button>
                <button
                  onClick={() => setActiveRightTab('curvature')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors ${
                    activeRightTab === 'curvature'
                      ? 'bg-amber-500/20 text-amber-300 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Curvature</span>
                </button>
                <button
                  onClick={() => setActiveRightTab('forecast')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors ${
                    activeRightTab === 'forecast'
                      ? 'bg-pink-500/20 text-pink-300 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5 text-pink-400" />
                  <span>Forecast</span>
                </button>
                <button
                  onClick={() => setActiveRightTab('ai')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors ${
                    activeRightTab === 'ai'
                      ? 'bg-purple-500/20 text-purple-300 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <Brain className="w-3.5 h-3.5 text-purple-400" />
                  <span>High Thinking</span>
                </button>
              </div>

              {/* Tab Content */}
              <div className="p-3 overflow-y-auto flex-1 custom-scrollbar space-y-3">
                {activeRightTab === 'probe' && (
                  <>
                    <ParametricProbePanel
                      metrics={probedMetrics}
                      onUpdateProbe={handleProbePoint}
                    />
                    <UnwrappedManifoldChart
                      state={matrixState}
                      onSelectCoords={handleProbePoint}
                    />
                  </>
                )}

                {activeRightTab === 'curvature' && (
                  <>
                    <CurvatureDistributionGraph
                      dimensions={matrixState.dimensions}
                      probedV={matrixState.probedPoint?.v ?? null}
                    />
                    <div className="p-3 bg-slate-900/50 border border-slate-800 rounded-xl text-xs space-y-2 text-slate-300 leading-relaxed">
                      <h4 className="font-semibold text-slate-100 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                        <Compass className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Gauss-Bonnet Global Invariant</span>
                      </h4>
                      <p className="text-[11px]">
                        The total integrated Gaussian curvature over any compact 2-torus T² equals zero:
                      </p>
                      <div className="font-mono text-cyan-300 bg-slate-950 p-2 rounded border border-slate-800 text-center text-[11px]">
                        ∬_T² K dA = 2π · χ(T²) = 2π · 0 = 0
                      </div>
                      <p className="text-[10px] text-slate-400">
                        The positive curvature on the outer torus exactly offsets the negative curvature on the inner tube, guaranteeing topological genus g = 1.
                      </p>
                    </div>
                  </>
                )}

                {activeRightTab === 'forecast' && (
                  <ParametricForecasterPanel
                    state={matrixState}
                    onUpdateTimeOffset={handleUpdateTimeOffset}
                    currentUser={currentUser}
                  />
                )}

                {activeRightTab === 'ai' && (
                  <HighThinkingManifoldPanel
                    state={matrixState}
                    user={currentUser}
                  />
                )}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Preset Modal */}
      <PresetManagerModal
        isOpen={isPresetModalOpen}
        onClose={() => setIsPresetModalOpen(false)}
        currentState={matrixState}
        onLoadState={(newState) => setMatrixState(newState)}
        currentUser={currentUser}
      />

      {/* Snapchat Export Modal */}
      <SnapchatExportModal
        isOpen={isSnapchatModalOpen}
        onClose={() => setIsSnapchatModalOpen(false)}
        state={matrixState}
        metrics={probedMetrics}
      />
    </div>
  );
}
