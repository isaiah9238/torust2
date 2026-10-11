/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  AngleRadians,
  TorusDimensions,
  ToroidalMatrixState,
  ProbePointMetrics,
  SavedManifoldPreset,
} from '../types/toroidalMatrix';
import {
  evaluateProbeMetrics,
  getGaussianCurvature,
  getMeanCurvature,
  getPrincipalCurvatures,
  TWO_PI,
  createDefaultLayers,
} from '../utils/torusMath';

interface CurvatureProfilePoint {
  readonly v: AngleRadians;
  readonly K: number;
  readonly H: number;
  readonly kappa1: number;
  readonly kappa2: number;
  readonly regime: 'elliptic' | 'parabolic' | 'hyperbolic';
}

class ToroidalMatrixCacheService {
  private curvatureCache = new Map<string, readonly CurvatureProfilePoint[]>();
  private probeCache = new Map<string, ProbePointMetrics>();

  /**
   * Generates a stable key for torus dimensions.
   */
  private getDimensionsKey(dims: TorusDimensions): string {
    return `${dims.majorRadius.toFixed(3)}_${dims.minorRadius.toFixed(3)}`;
  }

  /**
   * Retrieves memoized curvature profile for a given geometry.
   */
  public getCurvatureProfile(dims: TorusDimensions, samples = 120): readonly CurvatureProfilePoint[] {
    const key = `${this.getDimensionsKey(dims)}_${samples}`;
    const cached = this.curvatureCache.get(key);
    if (cached) return cached;

    const points: CurvatureProfilePoint[] = [];
    const step = TWO_PI / samples;

    for (let i = 0; i < samples; i++) {
      const v = i * step;
      const K = getGaussianCurvature(v, dims);
      const H = getMeanCurvature(v, dims);
      const { kappa1, kappa2 } = getPrincipalCurvatures(v, dims);
      const regime = Math.abs(K) < 0.005 ? 'parabolic' : K > 0 ? 'elliptic' : 'hyperbolic';

      points.push({ v, K, H, kappa1, kappa2, regime });
    }

    this.curvatureCache.set(key, points);
    return points;
  }

  /**
   * Evaluates and memoizes probe metrics for a specific (u, v) and state.
   */
  public getProbedMetrics(
    u: AngleRadians,
    v: AngleRadians,
    state: ToroidalMatrixState
  ): ProbePointMetrics {
    const key = `${u.toFixed(3)}_${v.toFixed(3)}_${state.timeEpoch.toFixed(1)}_${state.dimensions.majorRadius}_${state.dimensions.minorRadius}_${state.layers.map(l => (l.enabled ? '1' : '0') + l.weight.toFixed(1)).join('')}`;
    const cached = this.probeCache.get(key);
    if (cached) return cached;

    const result = evaluateProbeMetrics(u, v, state);
    if (this.probeCache.size > 200) {
      this.probeCache.clear();
    }
    this.probeCache.set(key, result);
    return result;
  }

  /**
   * Built-in curated mathematical presets.
   */
  public getBuiltinPresets(): readonly SavedManifoldPreset[] {
    const defaultLayers = createDefaultLayers();

    return [
      {
        id: 'preset-standard-clifford',
        userId: 'system',
        name: 'Standard Clifford Analogue',
        description: 'Harmonious 8-fold radial symmetry with balanced curvature modulation and OKLab luminance.',
        isBuiltin: true,
        createdAt: new Date().toISOString(),
        state: {
          dimensions: { majorRadius: 6.0, minorRadius: 2.5, radialSegments: 64, tubularSegments: 128 },
          layers: defaultLayers,
          timeEpoch: 0,
          isDynamic: true,
          driftSpeed: 1.0,
          curvatureModulation: 1.0,
          quantizationLevels: 0,
          renderMode: 'full',
          probedPoint: { u: Math.PI * 0.25, v: Math.PI * 0.5 },
        },
      },
      {
        id: 'preset-octahedral-drift',
        userId: 'system',
        name: 'Octahedral Harmonic Soliton',
        description: '16-fold dense harmonic ripples with accelerated phase drift and high specular radiance.',
        isBuiltin: true,
        createdAt: new Date().toISOString(),
        state: {
          dimensions: { majorRadius: 7.0, minorRadius: 2.0, radialSegments: 80, tubularSegments: 160 },
          layers: defaultLayers.map(l =>
            l.layerIndex === 4
              ? { ...l, symmetryFold: 16, weight: 1.6 }
              : l.layerIndex === 5
              ? { ...l, weight: 1.8 }
              : l
          ),
          timeEpoch: 0,
          isDynamic: true,
          driftSpeed: 1.8,
          curvatureModulation: 0.8,
          quantizationLevels: 0,
          renderMode: 'full',
          probedPoint: { u: 0.8, v: 1.2 },
        },
      },
      {
        id: 'preset-hyper-curvature',
        userId: 'system',
        name: 'Riemannian Curvature Singularity',
        description: 'Extreme minor-to-major ratio (R=4.2, r=3.8) amplifying hyperbolic inner curvature and negative Gaussian metric.',
        isBuiltin: true,
        createdAt: new Date().toISOString(),
        state: {
          dimensions: { majorRadius: 4.8, minorRadius: 3.6, radialSegments: 96, tubularSegments: 192 },
          layers: defaultLayers.map(l =>
            l.layerIndex === 2
              ? { ...l, weight: 2.0 }
              : l.layerIndex === 4
              ? { ...l, symmetryFold: 6, weight: 0.7 }
              : l
          ),
          timeEpoch: 0,
          isDynamic: true,
          driftSpeed: 0.7,
          curvatureModulation: 2.0,
          quantizationLevels: 0,
          renderMode: 'full',
          probedPoint: { u: Math.PI, v: Math.PI },
        },
      },
      {
        id: 'preset-quantized-stepped',
        userId: 'system',
        name: 'Quantized Chromatic Bands',
        description: '7-level stepped fragment quantization creating distinct topological isoclines and discrete chromatic boundaries.',
        isBuiltin: true,
        createdAt: new Date().toISOString(),
        state: {
          dimensions: { majorRadius: 5.5, minorRadius: 2.2, radialSegments: 64, tubularSegments: 128 },
          layers: defaultLayers.map(l =>
            l.layerIndex === 4 ? { ...l, symmetryFold: 12, weight: 1.2 } : l
          ),
          timeEpoch: 0,
          isDynamic: true,
          driftSpeed: 0.5,
          curvatureModulation: 1.2,
          quantizationLevels: 7,
          renderMode: 'full',
          probedPoint: { u: 1.5, v: 2.0 },
        },
      },
      {
        id: 'preset-pure-curvature-heatmap',
        userId: 'system',
        name: 'Pure Gaussian Curvature Heatmap',
        description: 'Isolated metric layer: emerald/gold elliptic zones (K > 0) transition into crimson hyperbolic interior (K < 0).',
        isBuiltin: true,
        createdAt: new Date().toISOString(),
        state: {
          dimensions: { majorRadius: 6.0, minorRadius: 2.5, radialSegments: 64, tubularSegments: 128 },
          layers: defaultLayers,
          timeEpoch: 0,
          isDynamic: false,
          driftSpeed: 0.0,
          curvatureModulation: 1.5,
          quantizationLevels: 0,
          renderMode: 'curvature-heatmap',
          probedPoint: { u: 0, v: 0 },
        },
      },
    ];
  }
}

export const matrixCache = new ToroidalMatrixCacheService();
