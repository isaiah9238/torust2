/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini API
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

/**
 * Endpoint: High Thinking Topological & Colorimetric Deep Analysis
 * Model: gemini-3.1-pro-preview
 * ThinkingLevel: HIGH
 * No maxOutputTokens set (as per instructions)
 */
app.post('/api/ai/high-thinking-analyze', async (req: Request, res: Response): Promise<void> => {
  try {
    const { matrixState, userQuery } = req.body;

    const systemPrompt = `You are a Principal Differential Geometer and Color Space Physicist analyzing a 7-layer Toroidal Color Matrix manifold (T^2 = S^1 x S^1 embedded in R^3).
The manifold is parameterized by:
x(u, v) = (R + r cos v) cos u
y(u, v) = (R + r cos v) sin u
z(u, v) = r sin v
where R is major radius, r is minor radius.

The 7 Transformation Layers are:
L1: Canonical Manifold Coordinate Mapping (u, v in [0, 2pi))
L2: Riemannian Metric Tensor g_ij and Gaussian Curvature K(u,v) = cos(v) / [r(R + r cos v)]
L3: OKLab Polar Chrominance Transformation (L, a, b perceptual space)
L4: N-fold Radial Symmetry Harmonics: f(u,v) = sin(N u + phi) cos(N v + phi)
L5: Hysteresis Field & Phase Drift: phi_t = omega*t + delta
L6: Analytical Normal Vector n(u,v) = (cos v cos u, cos v sin u, sin v)^T & Blinn-Phong differential scattering
L7: Viewport Fragment Projection & Quantization: sRGB gamma 2.2 with optional step quantization

Perform rigorous mathematical analysis, calculate invariants (Euler characteristic chi(T^2) = 0, Gauss-Bonnet integral ∫∫ K dA = 0), diagnose elliptic/parabolic/hyperbolic regions, examine harmonic phase stability, evaluate OKLab gamut bounds, and provide actionable recommendations for tuning the 7 layers.`;

    const contents = `Current Toroidal Matrix Configuration:
- Major Radius (R): ${matrixState?.dimensions?.majorRadius ?? 6.0}
- Minor Radius (r): ${matrixState?.dimensions?.minorRadius ?? 2.4}
- Ratio R/r: ${((matrixState?.dimensions?.majorRadius ?? 6.0) / (matrixState?.dimensions?.minorRadius ?? 2.4)).toFixed(3)}
- Curvature Modulation Weight: ${matrixState?.curvatureModulation ?? 1.0}
- Harmonic Fold Order (N): ${matrixState?.layers?.[3]?.symmetryFold ?? 8}
- Harmonic Layer Enabled: ${matrixState?.layers?.[3]?.enabled ?? true} (weight: ${matrixState?.layers?.[3]?.weight ?? 1.0})
- Phase Drift Speed: ${matrixState?.driftSpeed ?? 1.0}
- Quantization Levels: ${matrixState?.quantizationLevels ?? 0}
- Probed Point: u = ${matrixState?.probedPoint?.u?.toFixed(3) ?? '0.785'}, v = ${matrixState?.probedPoint?.v?.toFixed(3) ?? '1.571'}

User Query:
${userQuery || 'Perform a comprehensive topological, Riemannian metric, and colorimetric audit of this manifold.'}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents,
      config: {
        systemInstruction: systemPrompt,
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.HIGH,
        },
      },
    });

    const analysisText = response.text || 'Analysis completed.';
    res.json({
      success: true,
      modelUsed: 'gemini-3.1-pro-preview',
      analysisText,
    });
  } catch (error: any) {
    console.error('Error in high-thinking analysis:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'High-thinking manifold analysis failed',
    });
  }
});

/**
 * Endpoint: Synthesize Preset via Gemini 3.5 Flash
 * Generates an optimized 7-layer parametric vector matching user requirements.
 */
app.post('/api/ai/synthesize-preset', async (req: Request, res: Response): Promise<void> => {
  try {
    const { prompt } = req.body;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `Design a mathematically coherent 7-layer Toroidal Color Matrix based on this description: "${prompt}".
Generate appropriate major radius R (3.0 to 9.0), minor radius r (1.0 to 3.5, with r < R), harmonic fold (1 to 24), curvature modulation (0.2 to 2.5), drift speed (0.0 to 2.5), quantization (0 for smooth, 3 to 12 for stepped), and a name/description.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            majorRadius: { type: Type.NUMBER },
            minorRadius: { type: Type.NUMBER },
            symmetryFold: { type: Type.INTEGER },
            curvatureModulation: { type: Type.NUMBER },
            driftSpeed: { type: Type.NUMBER },
            quantizationLevels: { type: Type.INTEGER },
            layerWeights: {
              type: Type.ARRAY,
              items: { type: Type.NUMBER },
              description: 'Weights for layers 1 to 7',
            },
          },
          required: [
            'name',
            'description',
            'majorRadius',
            'minorRadius',
            'symmetryFold',
            'curvatureModulation',
            'driftSpeed',
            'quantizationLevels',
          ],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json({ success: true, preset: parsed });
  } catch (error: any) {
    console.error('Error in synthesize-preset:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Preset synthesis failed',
    });
  }
});

/**
 * Endpoint: Dynamical Horizon & Phase Drift Forecaster
 * Model: gemini-3.1-pro-preview
 * ThinkingLevel: HIGH
 * No maxOutputTokens set
 */
app.post('/api/ai/forecast-analysis', async (req: Request, res: Response): Promise<void> => {
  try {
    const { matrixState, forecastSummary, probedU, probedV } = req.body;

    const systemPrompt = `You are a Principal Nonlinear Dynamical Systems Mathematician and Theoretical Color Space Physicist.
You are analyzing the forward temporal trajectory and phase evolution of a 7-layer Toroidal Color Matrix manifold T^2 = S^1 x S^1.

In this manifold:
Layer 5 imposes dynamical hysteresis phase drift: phi_t = t * omega_drift + delta_phase
Layer 4 imposes periodic harmonic boundary modulation: f(u, v, t) = sin(N * u + phi_t) * cos(N * v + phi_t)
Layer 3 maps into perceptually uniform OKLab space (L(t), a(t), b(t)).

Analyze the forward trajectory across the specified time horizon. Evaluate:
1. Poincaré Recurrence & Periodicity: Assess whether the phase trajectory is strictly periodic, quasi-periodic, or exhibits irrational winding on T^2 (KAM torus dynamics).
2. Chromatic Hodograph & Spectral Velocity: Examine the rate of color change dE_OKLab / dt and whether the color path forms closed loops or open Lissajous figures in the (a, b) chrominance plane.
3. Topological Stability & Phase Inversion Points: Predict when constructive harmonic resonance creates peak luminance versus destructive chromatic cancellation.
4. Mathematical Invariants: Relate the evolution to geodesic flows and conserved quantities on the Riemannian 2-torus.`;

    const contents = `Forecast Simulation Parameters:
- Major Radius R: ${matrixState?.dimensions?.majorRadius ?? 6.0}, Minor Radius r: ${matrixState?.dimensions?.minorRadius ?? 2.4}
- Drift Speed Factor: ${matrixState?.driftSpeed ?? 1.0}
- Angular Velocity omega: ${(0.4 * (matrixState?.driftSpeed ?? 1.0)).toFixed(4)} rad/s
- Radial Symmetry Fold N: ${matrixState?.layers?.[3]?.symmetryFold ?? 8}
- Projected Horizon: ${forecastSummary?.horizonSeconds ?? 30} seconds
- Calculated Poincaré Recurrence Period: ${forecastSummary?.recurrencePeriod?.toFixed(2) ?? '15.71'} seconds
- Average Spectral Velocity: ${forecastSummary?.averageSpectralVelocity?.toFixed(4) ?? '0.05'} deltaE/s
- Color Loop Type: ${forecastSummary?.colorLoopType ?? 'harmonic-resonance'}
- Next Phase Inversion: in ${forecastSummary?.nextPhaseInversionTime?.toFixed(2) ?? '7.85'} seconds
- Probed Coordinate: u = ${probedU?.toFixed(3) ?? '0.785'} rad, v = ${probedV?.toFixed(3) ?? '1.571'} rad

Provide a rigorous dynamical forecast report with exact mathematical reasoning.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents,
      config: {
        systemInstruction: systemPrompt,
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.HIGH,
        },
      },
    });

    res.json({
      success: true,
      modelUsed: 'gemini-3.1-pro-preview',
      forecastReport: response.text || 'Forecast calculation completed.',
    });
  } catch (error: any) {
    console.error('Error in forecast analysis:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'High-thinking forecast analysis failed',
    });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Toroidal Color Matrix engine running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
