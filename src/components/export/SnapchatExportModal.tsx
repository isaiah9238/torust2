/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Share2,
  Download,
  Copy,
  Check,
  X,
  Sparkles,
  Smartphone,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import type { ToroidalMatrixState, ProbePointMetrics } from '../../types/toroidalMatrix';

interface SnapchatExportModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly state: ToroidalMatrixState;
  readonly metrics: ProbePointMetrics | null;
}

export const SnapchatExportModal: React.FC<SnapchatExportModalProps> = ({
  isOpen,
  onClose,
  state,
  metrics,
}) => {
  const [caption, setCaption] = useState('My 7-Layer Toroidal Manifold ✨ #ToroidalColorMatrix');
  const [includeStats, setIncludeStats] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Generate 9:16 vertical 1080x1920 Snapchat story card
  useEffect(() => {
    if (!isOpen) return;
    setIsGenerating(true);

    const timer = setTimeout(() => {
      generateSnapCard();
    }, 150);

    return () => clearTimeout(timer);
  }, [isOpen, state, metrics, caption, includeStats]);

  const generateSnapCard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 1080;
    const height = 1920;
    canvas.width = width;
    canvas.height = height;

    // 1. Cosmic Deep Background with Starfield & Nebula Glows
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#03050a');
    bgGrad.addColorStop(0.35, '#080d1a');
    bgGrad.addColorStop(0.7, '#0f0b1e');
    bgGrad.addColorStop(1, '#05060b');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Nebula glow circles
    const radGlow1 = ctx.createRadialGradient(540, 850, 50, 540, 850, 550);
    radGlow1.addColorStop(0, 'rgba(56, 189, 248, 0.25)');
    radGlow1.addColorStop(0.5, 'rgba(168, 85, 247, 0.15)');
    radGlow1.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = radGlow1;
    ctx.fillRect(0, 300, width, 1100);

    // Procedural Stars
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 280; i++) {
      // Deterministic pseudo-random stars
      const sx = ((i * 383) % width);
      const sy = ((i * 929) % height);
      const sRadius = (i % 7 === 0) ? 2.5 : (i % 3 === 0) ? 1.5 : 0.8;
      const sAlpha = 0.3 + (i % 5) * 0.14;
      ctx.globalAlpha = sAlpha;
      ctx.beginPath();
      ctx.arc(sx, sy, sRadius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    // 2. Snapchat Header Safe-Zone (Yellow Branding & Badge)
    // Top safe zone is ~180px on phones
    const topY = 220;

    // Snapchat Ghost Yellow Pill
    ctx.save();
    ctx.fillStyle = '#FFFC00'; // Snapchat Official Yellow
    ctx.beginPath();
    ctx.roundRect(540 - 160, topY, 320, 56, 28);
    ctx.fill();

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 24px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚡ SNAPCHAT EXPORT', 540, topY + 28);
    ctx.restore();

    // Title & Subtitle
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 48px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TOROIDAL COLOR MATRIX', 540, topY + 110);

    ctx.fillStyle = '#38bdf8';
    ctx.font = '500 24px "Fira Code", monospace';
    ctx.fillText('7-LAYER PARAMETRIC MANIFOLD • T² = S¹ × S¹', 540, topY + 155);

    // 3. Capture 3D WebGL Torus from the DOM
    const webglCanvas = document.querySelector('canvas') as HTMLCanvasElement | null;
    if (webglCanvas) {
      try {
        const torusSize = 780;
        const torusX = (width - torusSize) / 2;
        const torusY = 470;

        // Soft outer ring frame
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(540, torusY + torusSize / 2, torusSize / 2 + 10, 0, Math.PI * 2);
        ctx.stroke();

        ctx.drawImage(webglCanvas, torusX, torusY, torusSize, torusSize);
      } catch (err) {
        console.warn('Could not copy WebGL canvas frame:', err);
      }
    }

    // 4. Mathematical Telemetry Overlays
    if (includeStats) {
      const cardY = 1320;
      const cardW = 920;
      const cardH = 260;
      const cardX = (width - cardW) / 2;

      // Glassmorphic dark card
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, 24);
      ctx.fill();
      ctx.stroke();

      // Stats Columns
      const col1X = cardX + 50;
      const col2X = cardX + 360;
      const col3X = cardX + 670;

      // Row 1
      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 20px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('GEOMETRY', col1X, cardY + 50);
      ctx.fillText('SYMMETRY & HARMONICS', col2X, cardY + 50);
      ctx.fillText('OKLAB CHROMINANCE', col3X, cardY + 50);

      // Row 1 Values
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 30px "Fira Code", monospace';
      ctx.fillText(
        `R=${state.dimensions.majorRadius.toFixed(1)} r=${state.dimensions.minorRadius.toFixed(1)}`,
        col1X,
        cardY + 95
      );
      ctx.fillText(
        `Fold N = ${state.layers[3]?.symmetryFold || 8}`,
        col2X,
        cardY + 95
      );

      // Probed Color swatch & Hex
      const hex = metrics?.hex || '#38bdf8';
      ctx.fillStyle = hex;
      ctx.beginPath();
      ctx.roundRect(col3X, cardY + 70, 36, 36, 8);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px "Fira Code", monospace';
      ctx.fillText(hex.toUpperCase(), col3X + 50, cardY + 95);

      // Row 2
      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 20px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('GAUSSIAN CURVATURE', col1X, cardY + 160);
      ctx.fillText('PHASE DRIFT VELOCITY', col2X, cardY + 160);
      ctx.fillText('RECURRENCE PERIOD', col3X, cardY + 160);

      // Row 2 Values
      ctx.fillStyle = metrics && metrics.gaussianCurvature >= 0 ? '#34d399' : '#fb7185';
      ctx.font = 'bold 28px "Fira Code", monospace';
      ctx.fillText(
        metrics ? `K = ${metrics.gaussianCurvature.toFixed(4)}` : 'K = +0.069',
        col1X,
        cardY + 205
      );

      ctx.fillStyle = '#38bdf8';
      ctx.fillText(`ω = ${(state.driftSpeed * 0.4).toFixed(2)} rad/s`, col2X, cardY + 205);

      const recurrence = (6.283 / (0.4 * Math.max(0.01, state.driftSpeed))).toFixed(1);
      ctx.fillStyle = '#c084fc';
      ctx.fillText(`T = ${recurrence}s`, col3X, cardY + 205);
    }

    // 5. Custom Caption Pill
    if (caption.trim()) {
      const capY = 1620;
      ctx.fillStyle = 'rgba(255, 252, 0, 0.15)';
      ctx.strokeStyle = '#FFFC00';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(540 - 440, capY, 880, 70, 20);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#FFFC00';
      ctx.font = 'bold 24px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`💬 "${caption}"`, 540, capY + 44);
    }

    // 6. Bottom Snapchat Footer / Watermark
    ctx.fillStyle = '#64748b';
    ctx.font = '500 20px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Created with Toroidal Color Matrix Engine', 540, 1740);

    const dataUrl = canvas.toDataURL('image/png');
    setPreviewDataUrl(dataUrl);
    setIsGenerating(false);
  };

  const handleDownload = () => {
    if (!previewDataUrl) return;
    const a = document.createElement('a');
    a.href = previewDataUrl;
    a.download = `toroidal-manifold-snap-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSnapchatShare = () => {
    const currentUrl = window.location.href;
    const snapUrl = `https://www.snapchat.com/share?link=${encodeURIComponent(currentUrl)}`;

    // Try Web Share API if available on mobile
    if (navigator.share) {
      navigator.share({
        title: 'Toroidal Color Matrix Manifold',
        text: caption,
        url: currentUrl,
      }).catch(() => {
        window.open(snapUrl, '_blank');
      });
    } else {
      window.open(snapUrl, '_blank');
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 1500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-3xl bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-xs">
        {/* Header with Snapchat Yellow Badge */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FFFC00] flex items-center justify-center shadow-md shadow-yellow-500/20 text-black font-black text-sm">
              👻
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                <span>Snapchat Story Export</span>
                <span className="px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-300 border border-yellow-500/40 text-[10px] font-mono">
                  9:16 Vertical (1080×1920)
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Generate and export an interactive celestial Snap Story card with live 3D telemetry
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

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 custom-scrollbar">
          {/* Left: 9:16 Phone Mockup Preview */}
          <div className="flex flex-col items-center justify-center bg-slate-900/40 border border-slate-800/80 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-2 font-mono">
              <Smartphone className="w-3.5 h-3.5 text-yellow-400" />
              <span>Snap Story Live Preview</span>
            </div>

            <div className="relative w-56 aspect-[9/16] rounded-2xl overflow-hidden border-2 border-slate-700 shadow-2xl bg-black">
              {isGenerating ? (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin text-yellow-400" />
                  <span className="text-[10px]">Rendering Snap Card...</span>
                </div>
              ) : previewDataUrl ? (
                <img
                  src={previewDataUrl}
                  alt="Snapchat Story Preview"
                  className="w-full h-full object-contain"
                />
              ) : null}

              {/* Snapchat UI Mockup Icons overlay */}
              <div className="absolute top-2 right-2 flex flex-col gap-1.5 text-white/70 text-[10px] pointer-events-none drop-shadow">
                <span>⚡</span>
                <span>💬</span>
                <span>✂️</span>
              </div>
            </div>
          </div>

          {/* Right: Controls & Actions */}
          <div className="flex flex-col justify-between gap-3">
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Snap Story Caption
                </label>
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Add a custom caption or question for your Snap..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 placeholder:text-slate-500 text-xs focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/70 border border-slate-800">
                <span className="text-slate-300 font-medium">
                  Overlay Manifold Telemetry Card
                </span>
                <input
                  type="checkbox"
                  checked={includeStats}
                  onChange={(e) => setIncludeStats(e.target.checked)}
                  className="w-4 h-4 accent-yellow-400 cursor-pointer"
                />
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900/40 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
                <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                  <span>Snapchat Story Specifications</span>
                </div>
                <p>• Native 1080 × 1920 px resolution (9:16 vertical ratio)</p>
                <p>• Top & bottom UI safe-zones preserved for lenses and buttons</p>
                <p>• High-contrast cosmic starry backdrop with real-time 3D capture</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <button
                onClick={handleSnapchatShare}
                className="w-full py-2.5 px-3 rounded-xl bg-[#FFFC00] hover:bg-[#ffe600] text-black font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/10 transition-all cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>Share to Snapchat</span>
              </button>

              <button
                onClick={handleDownload}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4 text-yellow-400" />
                <span>Download 9:16 Snap Story Image (PNG)</span>
              </button>

              <button
                onClick={handleCopyLink}
                className="w-full py-2 px-3 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-[11px] flex items-center justify-center gap-1.5 transition-colors"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Link Copied!' : 'Copy Shareable Manifold Link'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Hidden Canvas for High-Resolution Card Generation */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
};
