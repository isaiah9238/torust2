/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  AngleRadians,
  TorusDimensions,
  Vector3D,
  ColorRGB,
  ColorOKLab,
  MetricTensor,
  ProbePointMetrics,
  ToroidalMatrixState,
  TrajectoryForecastPoint,
  ForecastSummary,
} from '../types/toroidalMatrix';

export const TWO_PI = Math.PI * 2;

/**
 * Normalizes an angle into [0, 2pi).
 */
export const normalizeAngle = (angle: AngleRadians): AngleRadians => {
  const mod = angle % TWO_PI;
  return mod < 0 ? mod + TWO_PI : mod;
};

/**
 * L1 & L6: Manifold Projection & Analytical Normal Generation
 * Evaluates exact Cartesian position and unit normal vector.
 */
export const calculateManifoldSurface = (
  u: AngleRadians,
  v: AngleRadians,
  dimensions: TorusDimensions
): { position: Vector3D; normal: Vector3D } => {
  const { majorRadius: R, minorRadius: r } = dimensions;
  const cosU = Math.cos(u);
  const sinU = Math.sin(u);
  const cosV = Math.cos(v);
  const sinV = Math.sin(v);

  const factor = R + r * cosV;

  return {
    position: {
      x: factor * cosU,
      y: factor * sinU,
      z: r * sinV,
    },
    normal: {
      x: cosV * cosU,
      y: cosV * sinU,
      z: sinV,
    },
  };
};

/**
 * L2: Metric Tensor Calculation on Torus
 */
export const calculateMetricTensor = (
  v: AngleRadians,
  dimensions: TorusDimensions
): MetricTensor => {
  const { majorRadius: R, minorRadius: r } = dimensions;
  const cosV = Math.cos(v);
  const factor = R + r * cosV;

  const g_uu = factor * factor;
  const g_vv = r * r;
  const g_uv = 0;
  const det_g = g_uu * g_vv;
  const areaElement = Math.sqrt(Math.max(0, det_g));

  return {
    g_uu,
    g_vv,
    g_uv,
    det_g,
    areaElement,
  };
};

/**
 * L2: Gaussian Curvature K(u, v)
 */
export const getGaussianCurvature = (
  v: AngleRadians,
  dimensions: TorusDimensions
): number => {
  const { majorRadius: R, minorRadius: r } = dimensions;
  const cosV = Math.cos(v);
  const denominator = r * (R + r * cosV);
  if (Math.abs(denominator) < 1e-7) return 0;
  return cosV / denominator;
};

/**
 * Mean Curvature H(u, v)
 */
export const getMeanCurvature = (
  v: AngleRadians,
  dimensions: TorusDimensions
): number => {
  const { majorRadius: R, minorRadius: r } = dimensions;
  const cosV = Math.cos(v);
  const denominator = 2 * r * (R + r * cosV);
  if (Math.abs(denominator) < 1e-7) return 0;
  return (R + 2 * r * cosV) / denominator;
};

/**
 * Principal Curvatures kappa_1, kappa_2
 */
export const getPrincipalCurvatures = (
  v: AngleRadians,
  dimensions: TorusDimensions
): { kappa1: number; kappa2: number } => {
  const { majorRadius: R, minorRadius: r } = dimensions;
  const cosV = Math.cos(v);
  const denominator = R + r * cosV;
  const kappa1 = Math.abs(denominator) < 1e-7 ? 0 : cosV / denominator;
  const kappa2 = 1 / r;
  return { kappa1, kappa2 };
};

/**
 * L3: OKLab to Linear sRGB Matrix Transformation
 */
export const okLabToLinearRGB = (oklab: ColorOKLab): ColorRGB => {
  const { L, a, b } = oklab;
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  return {
    r: +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    b: -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  };
};

/**
 * Linear sRGB to standard gamma-corrected sRGB with optional quantization.
 */
export const linearToSrgb = (c: number, quantizationLevels = 0): number => {
  const clamped = Math.max(0, Math.min(1, c));
  let gamma = Math.pow(clamped, 1 / 2.2);

  if (quantizationLevels > 1) {
    const steps = quantizationLevels - 1;
    gamma = Math.round(gamma * steps) / steps;
  }

  return Math.max(0, Math.min(1, gamma));
};

export const rgbToHex = (rgb: ColorRGB): string => {
  const toHex = (n: number) => {
    const int = Math.round(Math.max(0, Math.min(1, n)) * 255);
    return int.toString(16).padStart(2, '0');
  };
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
};

/**
 * Evaluates the full 7-layer pipeline analytically for a specific (u, v) point on the torus at time t.
 */
export const evaluateProbeMetrics = (
  u: AngleRadians,
  v: AngleRadians,
  state: ToroidalMatrixState,
  timeOverride?: number
): ProbePointMetrics => {
  const normU = normalizeAngle(u);
  const normV = normalizeAngle(v);
  const { dimensions, layers, curvatureModulation, quantizationLevels } = state;
  const effectiveTime = timeOverride !== undefined ? timeOverride : state.timeEpoch + (state.forecastTimeOffset || 0);

  // L1 & L6
  const { position, normal } = calculateManifoldSurface(normU, normV, dimensions);

  // L2: Metric tensor & Curvature
  const metricTensor = calculateMetricTensor(normV, dimensions);
  const K = getGaussianCurvature(normV, dimensions);
  const H = getMeanCurvature(normV, dimensions);
  const principal = getPrincipalCurvatures(normV, dimensions);

  const kNormalized = Math.max(-1, Math.min(1, K * dimensions.minorRadius * dimensions.majorRadius));

  const regime: 'elliptic' | 'parabolic' | 'hyperbolic' =
    Math.abs(K) < 0.005 ? 'parabolic' : K > 0 ? 'elliptic' : 'hyperbolic';

  const l2Cfg = layers[1]; // Curvature
  const l3Cfg = layers[2]; // OKLab
  const l4Cfg = layers[3]; // Harmonics
  const l5Cfg = layers[4]; // Hysteresis / Drift
  const l6Cfg = layers[5]; // Lighting
  const l7Cfg = layers[6]; // Fragment / Quantization

  // L5: Phase Drift
  const drift = (effectiveTime * 0.4 * state.driftSpeed + (l5Cfg.enabled ? l5Cfg.phaseShift : 0)) * (l5Cfg.enabled ? l5Cfg.weight : 0);

  // L4: Harmonics
  const fold = l4Cfg.enabled ? l4Cfg.symmetryFold : 8;
  const harmonic = l4Cfg.enabled
    ? Math.sin(fold * normU + drift) * Math.cos(fold * normV + drift) * l4Cfg.weight
    : 0;

  // L2 Curvature modulation factor
  const curvatureShift = l2Cfg.enabled
    ? kNormalized * 0.5 * curvatureModulation * l2Cfg.weight
    : 0;

  // L3: OKLab color mapping
  const l3Weight = l3Cfg.enabled ? l3Cfg.weight : 1.0;
  const L = Math.max(0.2, Math.min(0.95, 0.72 + 0.12 * harmonic));
  const a = 0.16 * Math.cos(normU + drift + curvatureShift) * l3Weight;
  const b = 0.16 * Math.sin(normV + drift) * l3Weight;
  const oklab: ColorOKLab = { L, a, b };

  // Convert to linear RGB
  const linearRGB = okLabToLinearRGB(oklab);

  // L6: Analytical normal & lighting
  const lightDir = { x: 5, y: 5, z: 5 };
  const lightLen = Math.hypot(lightDir.x, lightDir.y, lightDir.z);
  const lightNorm = { x: lightDir.x / lightLen, y: lightDir.y / lightLen, z: lightDir.z / lightLen };

  const dotDiff = Math.max(0, normal.x * lightNorm.x + normal.y * lightNorm.y + normal.z * lightNorm.z);
  const diffuseFactor = l6Cfg.enabled ? Math.max(0.15, dotDiff * l6Cfg.weight) : 0.8;

  // Specular Blinn-Phong
  const viewDir = { x: 0, y: 0, z: 1 };
  const halfDir = { x: lightNorm.x + viewDir.x, y: lightNorm.y + viewDir.y, z: lightNorm.z + viewDir.z };
  const halfLen = Math.hypot(halfDir.x, halfDir.y, halfDir.z) || 1;
  const halfNorm = { x: halfDir.x / halfLen, y: halfDir.y / halfLen, z: halfDir.z / halfLen };
  const dotSpec = Math.max(0, normal.x * halfNorm.x + normal.y * halfNorm.y + normal.z * halfNorm.z);
  const specularFactor = l6Cfg.enabled ? Math.pow(dotSpec, 24) * 0.25 * l6Cfg.weight : 0;

  const litR = linearRGB.r * diffuseFactor + specularFactor;
  const litG = linearRGB.g * diffuseFactor + specularFactor;
  const litB = linearRGB.b * diffuseFactor + specularFactor;

  // L7: Gamma correction and quantization
  const qLevels = l7Cfg.enabled ? quantizationLevels : 0;
  const finalRGB: ColorRGB = {
    r: linearToSrgb(litR, qLevels),
    g: linearToSrgb(litG, qLevels),
    b: linearToSrgb(litB, qLevels),
  };

  const hex = rgbToHex(finalRGB);

  return {
    u: normU,
    v: normV,
    position,
    normal,
    gaussianCurvature: K,
    meanCurvature: H,
    principalCurvatures: principal,
    metricTensor,
    oklab,
    rgb: finalRGB,
    hex,
    regime,
  };
};

/**
 * Forecasting Engine: Computes forward trajectory points and Poincaré recurrence metrics.
 */
export const generateTrajectoryForecast = (
  u: AngleRadians,
  v: AngleRadians,
  state: ToroidalMatrixState,
  horizonSeconds = 30,
  stepCount = 60
): ForecastSummary => {
  const trajectory: TrajectoryForecastPoint[] = [];
  const dt = horizonSeconds / stepCount;
  const baseTime = state.timeEpoch;
  const driftOmega = 0.4 * Math.max(0.01, state.driftSpeed);

  // Estimated recurrence period T = 2pi / omega
  const recurrencePeriod = TWO_PI / driftOmega;
  const symmetryFold = state.layers[3]?.symmetryFold || 8;
  const harmonicResonanceRatio = symmetryFold;

  let totalVelocity = 0;
  let prevOklab: ColorOKLab | null = null;

  for (let i = 0; i <= stepCount; i++) {
    const deltaT = i * dt;
    const simTime = baseTime + deltaT;
    const metrics = evaluateProbeMetrics(u, v, state, simTime);

    // Compute spectral velocity in OKLab space: dE / dt
    let spectralVelocity = 0;
    if (prevOklab) {
      const dL = metrics.oklab.L - prevOklab.L;
      const da = metrics.oklab.a - prevOklab.a;
      const db = metrics.oklab.b - prevOklab.b;
      const deltaE = Math.sqrt(dL * dL + da * da + db * db);
      spectralVelocity = deltaE / dt;
      totalVelocity += spectralVelocity;
    }
    prevOklab = metrics.oklab;

    // Harmonic intensity at this step
    const phaseOffset = simTime * driftOmega;
    const harmonicVal = Math.sin(symmetryFold * u + phaseOffset) * Math.cos(symmetryFold * v + phaseOffset);

    trajectory.push({
      deltaT,
      timeEpoch: simTime,
      oklab: metrics.oklab,
      rgb: metrics.rgb,
      hex: metrics.hex,
      harmonicIntensity: harmonicVal,
      spectralVelocity,
      phaseOffset,
    });
  }

  const averageSpectralVelocity = stepCount > 0 ? totalVelocity / stepCount : 0;
  const nextPhaseInversionTime = Math.PI / driftOmega;

  const colorLoopType =
    Math.abs(recurrencePeriod - Math.round(recurrencePeriod)) < 0.05
      ? 'periodic'
      : symmetryFold % 2 === 0
      ? 'harmonic-resonance'
      : 'quasi-periodic';

  return {
    horizonSeconds,
    recurrencePeriod,
    harmonicResonanceRatio,
    averageSpectralVelocity,
    colorLoopType,
    nextPhaseInversionTime,
    trajectory,
  };
};

/**
 * Creates default 7-layer configurations.
 */
export const createDefaultLayers = () => [
  {
    layerIndex: 1 as const,
    name: 'Base Manifold Coordinate Mapping',
    description: 'Evaluates canonical surface coordinates (u, v) on compact 2-manifold T² = S¹ × S¹.',
    mathematicalFormula: 'x(u,v) = (R + r cos v) cos u, y = (R + r cos v) sin u, z = r sin v',
    enabled: true,
    weight: 1.0,
    phaseShift: 0.0,
    symmetryFold: 1,
  },
  {
    layerIndex: 2 as const,
    name: 'Metric Tensor & Curvature Modulation',
    description: 'Riemannian metric g_ij and local density modulated by Gaussian curvature K(u,v).',
    mathematicalFormula: 'K(u, v) = cos(v) / [r(R + r cos v)], det(g) = r²(R + r cos v)²',
    enabled: true,
    weight: 1.0,
    phaseShift: 0.0,
    symmetryFold: 1,
  },
  {
    layerIndex: 3 as const,
    name: 'OKLab Polar Chrominance Transformation',
    description: 'Maps angular coordinates to perceptually uniform OKLab color coordinates (L, a, b).',
    mathematicalFormula: 'L_OKLab = 0.72 + ΔH, a = 0.16 cos(u + φ), b = 0.16 sin(v + φ)',
    enabled: true,
    weight: 1.0,
    phaseShift: 0.0,
    symmetryFold: 1,
  },
  {
    layerIndex: 4 as const,
    name: '8-Fold Radial Symmetry Harmonics',
    description: 'Periodic harmonic boundary modulation applying cyclic folding across u and v.',
    mathematicalFormula: 'f_harm(u, v) = sin(N·u + φ_t) · cos(N·v + φ_t), N ∈ {1..32}',
    enabled: true,
    weight: 1.0,
    phaseShift: 0.0,
    symmetryFold: 8,
  },
  {
    layerIndex: 5 as const,
    name: 'Hysteresis Field & Phase Drift',
    description: 'Dynamical time-evolution relaxation phase offset modeling continuous fluid flux.',
    mathematicalFormula: 'φ_t = t · ω_drift + δ_phase; ∇²φ - ∂²φ/∂t² = 0',
    enabled: true,
    weight: 1.0,
    phaseShift: 0.0,
    symmetryFold: 1,
  },
  {
    layerIndex: 6 as const,
    name: 'Normal Vector & Lighting Differential',
    description: 'Analytical normal field computation with diffuse Lambertian and Blinn-Phong specular radiance.',
    mathematicalFormula: 'n(u,v) = (cos v cos u, cos v sin u, sin v)ᵀ; I = (n · l) + (n · h)^p',
    enabled: true,
    weight: 1.0,
    phaseShift: 0.0,
    symmetryFold: 1,
  },
  {
    layerIndex: 7 as const,
    name: 'Viewport Fragment Projection & Quantization',
    description: 'Projects radiance into linear sRGB space with gamma 2.2 correction and discrete stepped quantization.',
    mathematicalFormula: 'C_sRGB = clamp(C_linear, 0, 1)^(1 / 2.2), Q_k = ⌊k · C⌉ / k',
    enabled: true,
    weight: 1.0,
    phaseShift: 0.0,
    symmetryFold: 1,
  },
];

/**
 * Creates initial default state for the Toroidal Matrix Engine.
 */
export const createInitialMatrixState = (): ToroidalMatrixState => ({
  dimensions: {
    majorRadius: 6.0,
    minorRadius: 2.4,
    radialSegments: 64,
    tubularSegments: 128,
  },
  layers: createDefaultLayers(),
  timeEpoch: 0,
  isDynamic: true,
  driftSpeed: 1.0,
  curvatureModulation: 1.0,
  quantizationLevels: 0, // Continuous
  renderMode: 'full',
  probedPoint: { u: Math.PI * 0.25, v: Math.PI * 0.5 },
  forecastTimeOffset: 0,
});
