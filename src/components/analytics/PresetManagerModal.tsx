/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  FolderOpen,
  Save,
  Trash2,
  Sparkles,
  Plus,
  LogIn,
  LogOut,
  X,
  Check,
  Wand2,
  Loader2,
} from 'lucide-react';
import type { SavedManifoldPreset, ToroidalMatrixState } from '../../types/toroidalMatrix';
import { matrixCache } from '../../services/toroidalMatrixCache';
import {
  saveMatrixPreset,
  getUserMatrixPresets,
  deleteMatrixPreset,
  signInWithGoogle,
  logOut,
} from '../../services/firebaseService';
import type { User } from 'firebase/auth';

interface PresetManagerModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly currentState: ToroidalMatrixState;
  readonly onLoadState: (state: ToroidalMatrixState) => void;
  readonly currentUser: User | null;
}

export const PresetManagerModal: React.FC<PresetManagerModalProps> = ({
  isOpen,
  onClose,
  currentState,
  onLoadState,
  currentUser,
}) => {
  const [userPresets, setUserPresets] = useState<SavedManifoldPreset[]>([]);
  const [saveName, setSaveName] = useState('');
  const [saveDesc, setSaveDesc] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const builtinPresets = matrixCache.getBuiltinPresets();

  useEffect(() => {
    if (currentUser && isOpen) {
      loadUserPresets();
    }
  }, [currentUser, isOpen]);

  const loadUserPresets = async () => {
    if (!currentUser) return;
    try {
      const presets = await getUserMatrixPresets(currentUser.uid);
      setUserPresets(presets);
    } catch (err) {
      console.warn('Could not load presets from Firestore:', err);
    }
  };

  const handleSaveCurrent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setFeedbackMsg('Please sign in with Google to save presets to the cloud.');
      return;
    }
    if (!saveName.trim()) return;

    setIsSaving(true);
    setFeedbackMsg(null);
    try {
      const newPreset: SavedManifoldPreset = {
        id: `preset_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        userId: currentUser.uid,
        name: saveName.trim(),
        description: saveDesc.trim(),
        state: currentState,
        createdAt: new Date().toISOString(),
      };

      await saveMatrixPreset(newPreset);
      setSaveName('');
      setSaveDesc('');
      setFeedbackMsg('Manifold saved successfully!');
      await loadUserPresets();
    } catch (err: any) {
      setFeedbackMsg(err?.message || 'Failed to save to Firestore');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!currentUser) return;
    try {
      await deleteMatrixPreset(id);
      setUserPresets((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error('Failed to delete preset:', err);
    }
  };

  const handleSynthesizeAiPreset = async () => {
    if (!aiPrompt.trim()) return;
    setIsSynthesizing(true);
    setFeedbackMsg(null);
    try {
      const res = await fetch('/api/ai/synthesize-preset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt }),
      });
      const data = await res.json();
      if (!data.success || !data.preset) {
        throw new Error(data.error || 'Synthesis failed');
      }

      const p = data.preset;
      // Construct synthesized state
      const newState: ToroidalMatrixState = {
        ...currentState,
        dimensions: {
          ...currentState.dimensions,
          majorRadius: p.majorRadius || 6.0,
          minorRadius: p.minorRadius || 2.4,
        },
        curvatureModulation: p.curvatureModulation || 1.0,
        driftSpeed: p.driftSpeed || 1.0,
        quantizationLevels: p.quantizationLevels || 0,
        layers: currentState.layers.map((l) => {
          if (l.layerIndex === 4 && p.symmetryFold) {
            return { ...l, symmetryFold: p.symmetryFold };
          }
          return l;
        }),
      };

      onLoadState(newState);
      setFeedbackMsg(`Generated & Applied: "${p.name}"!`);
      setAiPrompt('');
    } catch (err: any) {
      setFeedbackMsg(err?.message || 'AI Synthesis error');
    } finally {
      setIsSynthesizing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-2xl bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-xs">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/40">
          <div className="flex items-center gap-2.5">
            <FolderOpen className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="font-bold text-slate-100 text-sm">
                Manifold Preset Repository & Cloud Storage
              </h3>
              <p className="text-[11px] text-slate-400">
                Load canonical presets, synthesize new manifolds with Gemini, or sync to Firestore
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Auth Bar */}
        <div className="px-4 py-2.5 bg-slate-900/60 border-b border-slate-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            {currentUser ? (
              <>
                <img
                  src={currentUser.photoURL || 'https://www.gravatar.com/avatar?d=mp'}
                  alt={currentUser.displayName || 'User'}
                  className="w-5 h-5 rounded-full border border-cyan-400/40"
                />
                <span className="text-slate-200 font-medium">{currentUser.displayName || currentUser.email}</span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 text-[10px]">
                  Cloud Synced
                </span>
              </>
            ) : (
              <span className="text-slate-400 text-[11px]">
                Sign in with Google to persist your custom toroidal configurations to Firestore.
              </span>
            )}
          </div>

          <div>
            {currentUser ? (
              <button
                onClick={() => logOut()}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            ) : (
              <button
                onClick={() => signInWithGoogle()}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium transition-all shadow-md"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Google Sign-In</span>
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto space-y-4 custom-scrollbar">
          {/* Status feedback */}
          {feedbackMsg && (
            <div className="p-2.5 rounded-lg bg-cyan-950/60 border border-cyan-800 text-cyan-200 text-xs flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>{feedbackMsg}</span>
            </div>
          )}

          {/* AI Synthesizer Section */}
          <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
            <div className="flex items-center gap-1.5 text-slate-200 font-semibold text-[11px]">
              <Wand2 className="w-3.5 h-3.5 text-purple-400" />
              <span>Gemini 3.5 AI Parametric Synthesizer</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="e.g. Tight Riemannian ring with 14-fold symmetry and high specular gleam"
                disabled={isSynthesizing}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200 placeholder:text-slate-500 text-xs focus:outline-none focus:border-purple-500"
              />
              <button
                onClick={handleSynthesizeAiPreset}
                disabled={isSynthesizing || !aiPrompt.trim()}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-medium transition-all shrink-0"
              >
                {isSynthesizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>Synthesize</span>
              </button>
            </div>
          </div>

          {/* Built-in Canonical Presets */}
          <div>
            <h4 className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider mb-2">
              Canonical Mathematical Presets
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {builtinPresets.map((preset) => (
                <div
                  key={preset.id}
                  className="p-3 rounded-xl bg-slate-900/50 hover:bg-slate-900 border border-slate-800/80 hover:border-cyan-500/40 transition-all flex flex-col justify-between gap-2"
                >
                  <div>
                    <div className="font-semibold text-slate-200 text-xs flex items-center justify-between">
                      <span>{preset.name}</span>
                      <span className="font-mono text-[10px] text-cyan-400">
                        R={preset.state.dimensions.majorRadius} r={preset.state.dimensions.minorRadius}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                      {preset.description}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      onLoadState(preset.state);
                      onClose();
                    }}
                    className="w-full py-1.5 rounded bg-slate-800 hover:bg-cyan-600 text-slate-200 hover:text-white font-medium transition-colors text-center"
                  >
                    Load into Engine
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* User Saved Presets */}
          {currentUser && (
            <div>
              <h4 className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider mb-2">
                Your Saved Cloud Matrices ({userPresets.length})
              </h4>
              {userPresets.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-slate-800 text-center text-slate-500">
                  No custom saved matrices yet. Save the current state below.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {userPresets.map((preset) => (
                    <div
                      key={preset.id}
                      className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 flex flex-col justify-between gap-2"
                    >
                      <div>
                        <div className="font-semibold text-slate-200 text-xs flex items-center justify-between">
                          <span>{preset.name}</span>
                          <button
                            onClick={() => handleDelete(preset.id)}
                            className="text-slate-500 hover:text-rose-400 p-0.5"
                            title="Delete preset"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {preset.description && (
                          <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                            {preset.description}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          onLoadState(preset.state);
                          onClose();
                        }}
                        className="w-full py-1.5 rounded bg-slate-800 hover:bg-cyan-600 text-slate-200 hover:text-white font-medium transition-colors text-center"
                      >
                        Load into Engine
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Save Current State Form */}
          {currentUser && (
            <form onSubmit={handleSaveCurrent} className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 space-y-2">
              <h4 className="font-semibold text-slate-200 text-[11px] flex items-center gap-1.5">
                <Save className="w-3.5 h-3.5 text-cyan-400" />
                <span>Save Current Toroidal Manifold</span>
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Matrix Title (e.g. Emerald 12-Fold)"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  required
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 placeholder:text-slate-500 text-xs focus:outline-none focus:border-cyan-500"
                />
                <input
                  type="text"
                  placeholder="Description / Notes"
                  value={saveDesc}
                  onChange={(e) => setSaveDesc(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 placeholder:text-slate-500 text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>
              <button
                type="submit"
                disabled={isSaving || !saveName.trim()}
                className="w-full py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-medium transition-all flex items-center justify-center gap-1.5"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Save to Firestore</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
