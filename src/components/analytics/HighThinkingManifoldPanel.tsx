/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Brain,
  Sparkles,
  Send,
  Loader2,
  BookmarkCheck,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react';
import type { ToroidalMatrixState } from '../../types/toroidalMatrix';
import { saveEvaluationRecord } from '../../services/firebaseService';
import type { User } from 'firebase/auth';

interface HighThinkingManifoldPanelProps {
  readonly state: ToroidalMatrixState;
  readonly user: User | null;
  readonly onApplyPresetParams?: (params: any) => void;
}

export const HighThinkingManifoldPanel: React.FC<HighThinkingManifoldPanelProps> = ({
  state,
  user,
  onApplyPresetParams,
}) => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [analysisText, setAnalysisText] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const quickPrompts = [
    'Topological & Singularity Audit (Gauss-Bonnet & Invariants)',
    'Harmonic Resonance & Chromatic Stability Proof',
    'OKLab Gamut Bound & Perceptual Lightness Analysis',
    'Riemannian Metric Distortion & Geodesic Behavior',
  ];

  const handleRunAnalysis = async (customPrompt?: string) => {
    const promptToSend = customPrompt || query || 'Perform a comprehensive topological, Riemannian metric, and colorimetric audit of this manifold.';
    setIsLoading(true);
    setErrorMsg(null);
    setSavedSuccess(false);

    try {
      const res = await fetch('/api/ai/high-thinking-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matrixState: state,
          userQuery: promptToSend,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Analysis failed');
      }

      setAnalysisText(data.analysisText);

      // Auto-save to Firestore if user logged in
      if (user) {
        try {
          await saveEvaluationRecord({
            id: `eval_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            userId: user.uid,
            matrixName: `Torus R=${state.dimensions.majorRadius.toFixed(1)} r=${state.dimensions.minorRadius.toFixed(1)}`,
            modelUsed: 'gemini-3.1-pro-preview',
            query: promptToSend,
            analysisText: data.analysisText,
            createdAt: new Date().toISOString(),
          });
          setSavedSuccess(true);
        } catch (err) {
          console.warn('Could not auto-save evaluation to firestore:', err);
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to complete high-thinking evaluation');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 text-xs bg-slate-950/90 border border-slate-800/90 rounded-xl p-3 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-purple-950/80 border border-purple-700/60 text-purple-300">
            <Brain className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="font-semibold text-slate-100 flex items-center gap-1.5 text-[12px]">
              <span>Manifold AI Analyst</span>
              <span className="px-1.5 py-0.2 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 text-[9px] font-mono">
                Thinking: HIGH
              </span>
            </div>
            <div className="text-[10px] text-slate-400">
              gemini-3.1-pro-preview deep topological reasoning
            </div>
          </div>
        </div>
      </div>

      {/* Quick Prompts */}
      <div className="flex flex-wrap gap-1.5">
        {quickPrompts.map((p, i) => (
          <button
            key={i}
            disabled={isLoading}
            onClick={() => handleRunAnalysis(p)}
            className="px-2 py-1 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-800/90 hover:border-cyan-500/40 text-[10px] transition-all text-left truncate max-w-full"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Query input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask a deep mathematical or chromatic query..."
          disabled={isLoading}
          onKeyDown={(e) => e.key === 'Enter' && handleRunAnalysis()}
          className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 placeholder:text-slate-500 text-xs focus:outline-none focus:border-cyan-500 transition-colors"
        />
        <button
          onClick={() => handleRunAnalysis()}
          disabled={isLoading}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-medium disabled:opacity-50 transition-all shrink-0"
        >
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
          <span>Audit</span>
        </button>
      </div>

      {/* Error alert */}
      {errorMsg && (
        <div className="p-2 rounded bg-rose-950/50 border border-rose-800 text-rose-300 text-[11px] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Results Box */}
      {isLoading && (
        <div className="p-6 rounded-lg bg-slate-900/60 border border-slate-800 flex flex-col items-center justify-center gap-2.5 text-center">
          <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
          <div className="text-slate-200 font-medium text-xs">
            Engaging High-Thinking Deep Reasoning...
          </div>
          <div className="text-[10px] text-slate-400 max-w-xs">
            Evaluating Gauss-Bonnet invariants, Riemannian metric tensor tensor field eigenvalues, and OKLab polar gamut boundaries.
          </div>
        </div>
      )}

      {analysisText && !isLoading && (
        <div className="rounded-lg bg-slate-900/80 border border-slate-800 p-3 space-y-2">
          <div className="flex items-center justify-between text-[11px] pb-1 border-b border-slate-800 text-slate-400">
            <span className="flex items-center gap-1 text-cyan-300 font-mono">
              <Sparkles className="w-3.5 h-3.5" />
              Mathematical Report
            </span>
            {savedSuccess && (
              <span className="flex items-center gap-1 text-emerald-400 text-[10px]">
                <BookmarkCheck className="w-3.5 h-3.5" />
                Synced to Cloud Firestore
              </span>
            )}
          </div>

          <div className="text-slate-200 text-[11px] leading-relaxed whitespace-pre-wrap font-sans max-h-72 overflow-y-auto pr-1 custom-scrollbar">
            {analysisText}
          </div>
        </div>
      )}
    </div>
  );
};
