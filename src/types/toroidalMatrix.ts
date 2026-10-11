/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AngleRadians = number;

export interface TorusDimensions {
  readonly majorRadius: number; // R (distance from tube center to torus center)
  readonly minorRadius: number; // r (radius of the interior tube, r < R)
  readonly radialSegments: number;
  readonly tubularSegments: number;
}

export interface Vector3D {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface ColorRGB {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

export interface ColorOKLab {
  readonly L: number; // Lightness [0, 1]
  readonly a: number; // Green-Red chrominance [-0.4, 0.4]
  readonly b: number; // Blue-Yellow chrominance [-0.4, 0.4]
}

export type MatrixLayerIndex = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface LayerTransformationConfig {
  readonly layerIndex: MatrixLayerIndex;
  readonly name: string;
  readonly description: string;
  readonly mathematicalFormula: string;
  readonly enabled: boolean;
  readonly weight: number; // [0, 2]
  readonly phaseShift: number; // [0, 2pi]
  readonly symmetryFold: number; // integer 1..32
}

export interface ToroidalMatrixState {
  readonly dimensions: TorusDimensions;
  readonly layers: readonly LayerTransformationConfig[];
  readonly timeEpoch: number;
  readonly isDynamic: boolean;
  readonly driftSpeed: number;
  readonly curvatureModulation: number;
  readonly quantizationLevels: number; // 0 = continuous, >0 = quantized steps
  readonly renderMode: 'full' | 'curvature-heatmap' | 'normals' | 'wireframe';
  readonly probedPoint: { readonly u: AngleRadians; readonly v: AngleRadians } | null;
  readonly forecastTimeOffset?: number; // Forward time offset in seconds for simulation projection
}

export interface MetricTensor {
  readonly g_uu: number;
  readonly g_vv: number;
  readonly g_uv: number;
  readonly det_g: number;
  readonly areaElement: number;
}

export interface ProbePointMetrics {
  readonly u: AngleRadians;
  readonly v: AngleRadians;
  readonly position: Vector3D;
  readonly normal: Vector3D;
  readonly gaussianCurvature: number; // K
  readonly meanCurvature: number; // H
  readonly principalCurvatures: { readonly kappa1: number; readonly kappa2: number };
  readonly metricTensor: MetricTensor;
  readonly oklab: ColorOKLab;
  readonly rgb: ColorRGB;
  readonly hex: string;
  readonly regime: 'elliptic' | 'parabolic' | 'hyperbolic';
}

export interface SavedManifoldPreset {
  readonly id: string;
  readonly userId: string;
  readonly name: string;
  readonly description: string;
  readonly state: ToroidalMatrixState;
  readonly createdAt: string;
  readonly updatedAt?: string;
  readonly isBuiltin?: boolean;
}

export interface TopologicalEvaluationRecord {
  readonly id: string;
  readonly userId: string;
  readonly matrixName: string;
  readonly modelUsed: string;
  readonly query: string;
  readonly analysisText: string;
  readonly thinkingProcess?: string;
  readonly createdAt: string;
}

export interface TrajectoryForecastPoint {
  readonly deltaT: number; // Seconds into the future
  readonly timeEpoch: number;
  readonly oklab: ColorOKLab;
  readonly rgb: ColorRGB;
  readonly hex: string;
  readonly harmonicIntensity: number;
  readonly spectralVelocity: number; // Rate of chromatic shift dE/dt
  readonly phaseOffset: number;
}

export interface ForecastSummary {
  readonly horizonSeconds: number;
  readonly recurrencePeriod: number; // Estimated Poincaré recurrence cycle time
  readonly harmonicResonanceRatio: number; // Frequency relationship
  readonly averageSpectralVelocity: number;
  readonly colorLoopType: 'periodic' | 'quasi-periodic' | 'harmonic-resonance';
  readonly nextPhaseInversionTime: number;
  readonly trajectory: readonly TrajectoryForecastPoint[];
}

export interface ForecastRecord {
  readonly id: string;
  readonly userId: string;
  readonly title: string;
  readonly horizonSeconds: number;
  readonly recurrencePeriod: number;
  readonly probedU: number;
  readonly probedV: number;
  readonly summary: string;
  readonly createdAt: string;
}
