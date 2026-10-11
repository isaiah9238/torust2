/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useRef } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import type { ToroidalMatrixState } from '../../types/toroidalMatrix';

interface TorusMeshNodeProps {
  readonly matrixState: ToroidalMatrixState;
  readonly onProbePoint?: (u: number, v: number) => void;
  readonly showWireframe?: boolean;
}

const vertexShader = `
  varying vec2 vUv;
  varying vec3 vNormalVec;
  varying vec3 vViewPosition;
  varying vec3 vWorldPosition;

  void main() {
    vUv = uv;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    vNormalVec = normalize(normalMatrix * normal);
    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  uniform float uTime;
  uniform float uMajorRadius;
  uniform float uMinorRadius;
  uniform float uSymmetryFold;
  uniform float uCurvatureModulation;
  uniform float uDriftSpeed;
  uniform float uQuantizationLevels;
  uniform int uRenderMode; // 0: full, 1: curvature heatmap, 2: normals

  // 7-layer individual toggles & weights
  uniform float uL1Enabled;
  uniform float uL2Enabled;
  uniform float uL3Enabled;
  uniform float uL4Enabled;
  uniform float uL5Enabled;
  uniform float uL6Enabled;
  uniform float uL7Enabled;

  uniform float uL2Weight;
  uniform float uL3Weight;
  uniform float uL4Weight;
  uniform float uL5Weight;
  uniform float uL6Weight;
  uniform float uL7Weight;

  uniform vec2 uProbeCoord; // Probed (u, v) normalized to [0, 1]
  uniform float uHasProbe;

  varying vec2 vUv;
  varying vec3 vNormalVec;
  varying vec3 vViewPosition;
  varying vec3 vWorldPosition;

  // L3: Exact OKLab to Linear sRGB Matrix Conversion
  vec3 oklab_to_linear_rgb(vec3 c) {
    float l_ = c.x + 0.3963377774 * c.y + 0.2158037573 * c.z;
    float m_ = c.x - 0.1055613458 * c.y - 0.0638541728 * c.z;
    float s_ = c.x - 0.0894841775 * c.y - 1.2914855480 * c.z;
    
    float l = l_ * l_ * l_;
    float m = m_ * m_ * m_;
    float s = s_ * s_ * s_;
    
    return vec3(
      +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
    );
  }

  // Gaussian curvature false-color palette
  vec3 curvature_to_color(float K) {
    // K > 0 (elliptic/outer torus): Cyan/Emerald
    // K = 0 (parabolic crown): Gold/Amber
    // K < 0 (hyperbolic/inner tube): Crimson/Violet
    if (K > 0.0) {
      float t = clamp(K * 2.5, 0.0, 1.0);
      return mix(vec3(0.9, 0.8, 0.2), vec3(0.0, 0.9, 0.6), t);
    } else {
      float t = clamp(-K * 2.5, 0.0, 1.0);
      return mix(vec3(0.9, 0.8, 0.2), vec3(0.9, 0.1, 0.4), t);
    }
  }

  void main() {
    // Layer 1: Base Manifold Coordinate Mapping (u, v in [0, 2pi))
    float u = vUv.x * 6.28318530718;
    float v = vUv.y * 6.28318530718;

    // Layer 2: Riemannian Metric Tensor & Gaussian Curvature
    // K(u, v) = cos(v) / (r * (R + r * cos(v)))
    float cosV = cos(v);
    float denom = uMinorRadius * (uMajorRadius + uMinorRadius * cosV);
    float K = cosV / max(denom, 0.0001);
    float kNormalized = clamp(K * uMinorRadius * uMajorRadius, -1.0, 1.0);

    // If pure curvature heatmap mode is chosen:
    if (uRenderMode == 1) {
      vec3 heatRgb = curvature_to_color(kNormalized * uCurvatureModulation);
      // Diffuse shading for 3D depth
      vec3 lightDir = normalize(vec3(4.0, 6.0, 5.0));
      float diff = max(dot(vNormalVec, lightDir), 0.25);
      gl_FragColor = vec4(heatRgb * diff, 1.0);
      return;
    }

    // If normal vector view mode:
    if (uRenderMode == 2) {
      vec3 normColor = vNormalVec * 0.5 + 0.5;
      gl_FragColor = vec4(normColor, 1.0);
      return;
    }

    // Layer 5: Hysteresis Field & Phase Drift
    float drift = 0.0;
    if (uL5Enabled > 0.5) {
      drift = uTime * 0.4 * uDriftSpeed * uL5Weight;
    }

    // Layer 4: N-Fold Radial Symmetry Harmonics
    float harmonic = 0.0;
    if (uL4Enabled > 0.5) {
      harmonic = sin(uSymmetryFold * u + drift) * cos(uSymmetryFold * v + drift) * uL4Weight;
    }

    // Layer 2 Curvature modulation on chromatic phase
    float curvatureOffset = 0.0;
    if (uL2Enabled > 0.5) {
      curvatureOffset = kNormalized * 0.5 * uCurvatureModulation * uL2Weight;
    }

    // Layer 3: OKLab / Polar Chrominance Transformation
    float L = 0.72 + (0.12 * harmonic);
    float a = 0.16 * cos(u + drift + curvatureOffset) * uL3Weight;
    float b = 0.16 * sin(v + drift) * uL3Weight;

    if (uL3Enabled < 0.5) {
      // Monochrome fallback if L3 is disabled
      a = 0.0;
      b = 0.0;
    }

    vec3 linearRGB = oklab_to_linear_rgb(vec3(L, a, b));

    // Layer 6: Normal Vector & Lighting Differential (Lambert + Blinn-Phong)
    vec3 lightDir = normalize(vec3(5.0, 7.0, 6.0));
    float diffuse = 0.85;
    float specular = 0.0;

    if (uL6Enabled > 0.5) {
      diffuse = max(dot(vNormalVec, lightDir), 0.18) * uL6Weight;
      vec3 viewDir = normalize(vViewPosition);
      vec3 halfDir = normalize(lightDir + viewDir);
      float specAngle = max(dot(vNormalVec, halfDir), 0.0);
      specular = pow(specAngle, 28.0) * 0.35 * uL6Weight;
    }

    vec3 compositeColor = linearRGB * diffuse + vec3(specular);

    // Layer 7: Viewport Fragment Projection, Gamma Correction & Quantization
    vec3 gammaCorrected = compositeColor;
    if (uL7Enabled > 0.5) {
      gammaCorrected = pow(clamp(compositeColor, 0.0, 1.0), vec3(1.0 / 2.2));
      
      if (uQuantizationLevels > 1.0) {
        float steps = uQuantizationLevels - 1.0;
        gammaCorrected = floor(gammaCorrected * steps + 0.5) / steps;
      }
    }

    // Analytical probe indicator on torus surface
    if (uHasProbe > 0.5) {
      // Distance in uv coordinates taking seam wrapping into account
      vec2 dUv = abs(vUv - uProbeCoord);
      dUv.x = min(dUv.x, 1.0 - dUv.x);
      dUv.y = min(dUv.y, 1.0 - dUv.y);
      float dist = length(dUv);
      if (dist < 0.015) {
        // Glowing target beacon
        float ring = smoothstep(0.015, 0.008, dist);
        gammaCorrected = mix(gammaCorrected, vec3(1.0, 1.0, 1.0), ring * 0.95);
      } else if (dist < 0.035 && dist > 0.025) {
        float halo = smoothstep(0.035, 0.030, dist) * smoothstep(0.025, 0.030, dist);
        gammaCorrected = mix(gammaCorrected, vec3(0.1, 0.9, 1.0), halo * 0.8);
      }
    }

    gl_FragColor = vec4(gammaCorrected, 1.0);
  }
`;

export const TorusMeshNode: React.FC<TorusMeshNodeProps> = ({
  matrixState,
  onProbePoint,
  showWireframe = false,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const { majorRadius, minorRadius, radialSegments, tubularSegments } = matrixState.dimensions;

  // Extract layer configurations
  const l1 = matrixState.layers[0];
  const l2 = matrixState.layers[1];
  const l3 = matrixState.layers[2];
  const l4 = matrixState.layers[3];
  const l5 = matrixState.layers[4];
  const l6 = matrixState.layers[5];
  const l7 = matrixState.layers[6];

  const renderModeCode =
    matrixState.renderMode === 'curvature-heatmap'
      ? 1
      : matrixState.renderMode === 'normals'
      ? 2
      : 0;

  const probedUv = matrixState.probedPoint
    ? [
        (matrixState.probedPoint.u / (Math.PI * 2)) % 1,
        (matrixState.probedPoint.v / (Math.PI * 2)) % 1,
      ]
    : [0, 0];

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMajorRadius: { value: majorRadius },
      uMinorRadius: { value: minorRadius },
      uSymmetryFold: { value: l4.symmetryFold },
      uCurvatureModulation: { value: matrixState.curvatureModulation },
      uDriftSpeed: { value: matrixState.driftSpeed },
      uQuantizationLevels: { value: matrixState.quantizationLevels },
      uRenderMode: { value: renderModeCode },

      uL1Enabled: { value: l1.enabled ? 1.0 : 0.0 },
      uL2Enabled: { value: l2.enabled ? 1.0 : 0.0 },
      uL3Enabled: { value: l3.enabled ? 1.0 : 0.0 },
      uL4Enabled: { value: l4.enabled ? 1.0 : 0.0 },
      uL5Enabled: { value: l5.enabled ? 1.0 : 0.0 },
      uL6Enabled: { value: l6.enabled ? 1.0 : 0.0 },
      uL7Enabled: { value: l7.enabled ? 1.0 : 0.0 },

      uL2Weight: { value: l2.weight },
      uL3Weight: { value: l3.weight },
      uL4Weight: { value: l4.weight },
      uL5Weight: { value: l5.weight },
      uL6Weight: { value: l6.weight },
      uL7Weight: { value: l7.weight },

      uProbeCoord: { value: new THREE.Vector2(probedUv[0], probedUv[1]) },
      uHasProbe: { value: matrixState.probedPoint ? 1.0 : 0.0 },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      majorRadius,
      minorRadius,
      l4.symmetryFold,
      matrixState.curvatureModulation,
      matrixState.driftSpeed,
      matrixState.quantizationLevels,
      renderModeCode,
      l1.enabled,
      l2.enabled,
      l3.enabled,
      l4.enabled,
      l5.enabled,
      l6.enabled,
      l7.enabled,
      l2.weight,
      l3.weight,
      l4.weight,
      l5.weight,
      l6.weight,
      l7.weight,
      probedUv[0],
      probedUv[1],
      !!matrixState.probedPoint,
    ]
  );

  // Sync animation clock
  useFrame((state) => {
    if (!materialRef.current) return;
    const baseTime = matrixState.isDynamic ? state.clock.getElapsedTime() : matrixState.timeEpoch;
    materialRef.current.uniforms.uTime.value = baseTime + (matrixState.forecastTimeOffset || 0);
  });

  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    if (event.uv && onProbePoint) {
      const u = event.uv.x * Math.PI * 2;
      const v = event.uv.y * Math.PI * 2;
      onProbePoint(u, v);
    }
  };

  return (
    <group>
      <mesh
        ref={meshRef}
        rotation={[Math.PI / 2, 0, 0]}
        onPointerDown={handlePointerDown}
      >
        <torusGeometry
          args={[majorRadius, minorRadius, radialSegments, tubularSegments]}
        />
        <shaderMaterial
          ref={materialRef}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
          side={THREE.DoubleSide}
          wireframe={showWireframe}
        />
      </mesh>
    </group>
  );
};
