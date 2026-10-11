/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Center, Grid, Stars } from '@react-three/drei';
import { TorusMeshNode } from './TorusMeshNode';
import type { ToroidalMatrixState } from '../../types/toroidalMatrix';

interface ToroidalCanvasProps {
  readonly state: ToroidalMatrixState;
  readonly onProbePoint?: (u: number, v: number) => void;
  readonly autoRotate?: boolean;
  readonly showGrid?: boolean;
  readonly showAxes?: boolean;
  readonly showStars?: boolean;
}

export const ToroidalCanvas: React.FC<ToroidalCanvasProps> = ({
  state,
  onProbePoint,
  autoRotate = false,
  showGrid = true,
  showAxes = false,
  showStars = true,
}) => {
  return (
    <div className="relative w-full h-full select-none bg-[#05070d]">
      <Canvas
        camera={{ position: [0, 9, 18], fov: 42 }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
          preserveDrawingBuffer: true, // Needed for Snapchat high-res canvas frame capture
        }}
      >
        <color attach="background" args={['#04060a']} />

        {/* Deep Cosmic Starfield */}
        {showStars && (
          <Stars
            radius={90}
            depth={50}
            count={7000}
            factor={4.5}
            saturation={0.4}
            fade
            speed={1.0}
          />
        )}

        {/* Ambient & soft environment light */}
        <ambientLight intensity={0.45} />
        <directionalLight position={[10, 15, 10]} intensity={1.3} />
        <directionalLight position={[-10, -10, -5]} intensity={0.35} color="#4f46e5" />
        <pointLight position={[0, 0, 0]} intensity={0.8} color="#38bdf8" distance={15} />

        {showGrid && (
          <Grid
            position={[0, -5.5, 0]}
            args={[32, 32]}
            cellSize={1}
            cellThickness={0.5}
            cellColor="#1e293b"
            sectionSize={5}
            sectionThickness={1.0}
            sectionColor="#334155"
            fadeDistance={28}
            fadeStrength={1.4}
          />
        )}

        {showAxes && <axesHelper args={[7]} />}

        <Suspense fallback={null}>
          <Center>
            <TorusMeshNode
              matrixState={state}
              onProbePoint={onProbePoint}
              showWireframe={state.renderMode === 'wireframe'}
            />
          </Center>
        </Suspense>

        <OrbitControls
          makeDefault
          autoRotate={autoRotate}
          autoRotateSpeed={0.8}
          enableDamping
          dampingFactor={0.05}
          maxDistance={45}
          minDistance={4}
        />
      </Canvas>
    </div>
  );
};
