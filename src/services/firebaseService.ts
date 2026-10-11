/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  collection,
  getDocFromServer,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import type { SavedManifoldPreset, TopologicalEvaluationRecord, ForecastRecord } from '../types/toroidalMatrix';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((p) => ({
          providerId: p.providerId,
          email: p.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connection on boot
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline, check connection.');
      return false;
    }
    // Return true even if test doc does not exist, connection is alive
    return true;
  }
}

// Authentication helpers
export async function signInWithGoogle(): Promise<User | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Google Sign-In failed:', error);
    throw error;
  }
}

export async function logOut(): Promise<void> {
  await signOut(auth);
}

export function subscribeAuthState(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

// Firestore operations for saved toroidal matrices
export async function saveMatrixPreset(preset: SavedManifoldPreset): Promise<void> {
  const path = `matrices/${preset.id}`;
  try {
    const docRef = doc(db, 'matrices', preset.id);
    await setDoc(docRef, {
      id: preset.id,
      userId: preset.userId,
      name: preset.name,
      description: preset.description || '',
      majorRadius: preset.state.dimensions.majorRadius,
      minorRadius: preset.state.dimensions.minorRadius,
      radialSegments: preset.state.dimensions.radialSegments,
      tubularSegments: preset.state.dimensions.tubularSegments,
      isDynamic: preset.state.isDynamic,
      symmetryFold: preset.state.layers[3]?.symmetryFold || 8,
      curvatureWeight: preset.state.curvatureModulation,
      driftSpeed: preset.state.driftSpeed,
      quantizationLevels: preset.state.quantizationLevels,
      layerWeights: JSON.stringify(preset.state.layers.map((l) => ({ idx: l.layerIndex, en: l.enabled, w: l.weight }))),
      createdAt: preset.createdAt,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function getUserMatrixPresets(userId: string): Promise<SavedManifoldPreset[]> {
  const path = 'matrices';
  try {
    const q = query(collection(db, path), where('userId', '==', userId));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((d) => {
      const data = d.data();
      return {
        id: data.id,
        userId: data.userId,
        name: data.name,
        description: data.description,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        state: {
          dimensions: {
            majorRadius: data.majorRadius,
            minorRadius: data.minorRadius,
            radialSegments: data.radialSegments || 64,
            tubularSegments: data.tubularSegments || 128,
          },
          layers: [
            {
              layerIndex: 1,
              name: 'Base Manifold Coordinate Mapping',
              description: 'Canonical surface coordinates',
              mathematicalFormula: 'x(u,v) = (R + r cos v) cos u, y = (R + r cos v) sin u, z = r sin v',
              enabled: true,
              weight: 1.0,
              phaseShift: 0,
              symmetryFold: 1,
            },
            {
              layerIndex: 2,
              name: 'Metric Tensor & Curvature Modulation',
              description: 'Riemannian metric and Gaussian curvature',
              mathematicalFormula: 'K(u, v) = cos(v) / [r(R + r cos v)]',
              enabled: true,
              weight: 1.0,
              phaseShift: 0,
              symmetryFold: 1,
            },
            {
              layerIndex: 3,
              name: 'OKLab Polar Chrominance Transformation',
              description: 'Perceptually uniform OKLab space',
              mathematicalFormula: 'L_OKLab = 0.72 + ΔH, a = 0.16 cos(u+φ), b = 0.16 sin(v+φ)',
              enabled: true,
              weight: 1.0,
              phaseShift: 0,
              symmetryFold: 1,
            },
            {
              layerIndex: 4,
              name: '8-Fold Radial Symmetry Harmonics',
              description: 'Harmonic folding',
              mathematicalFormula: 'f_harm(u, v) = sin(N·u) · cos(N·v)',
              enabled: true,
              weight: 1.0,
              phaseShift: 0,
              symmetryFold: data.symmetryFold || 8,
            },
            {
              layerIndex: 5,
              name: 'Hysteresis Field & Phase Drift',
              description: 'Relaxation phase offset',
              mathematicalFormula: 'φ_t = t · ω_drift + δ_phase',
              enabled: true,
              weight: 1.0,
              phaseShift: 0,
              symmetryFold: 1,
            },
            {
              layerIndex: 6,
              name: 'Normal Vector & Lighting Differential',
              description: 'Analytical normal field',
              mathematicalFormula: 'n(u,v) = (cos v cos u, cos v sin u, sin v)ᵀ',
              enabled: true,
              weight: 1.0,
              phaseShift: 0,
              symmetryFold: 1,
            },
            {
              layerIndex: 7,
              name: 'Viewport Fragment Projection & Quantization',
              description: 'Linear sRGB with gamma 2.2',
              mathematicalFormula: 'C_sRGB = clamp(C_linear, 0, 1)^(1 / 2.2)',
              enabled: true,
              weight: 1.0,
              phaseShift: 0,
              symmetryFold: 1,
            },
          ],
          timeEpoch: 0,
          isDynamic: data.isDynamic ?? true,
          driftSpeed: data.driftSpeed ?? 1.0,
          curvatureModulation: data.curvatureWeight ?? 1.0,
          quantizationLevels: data.quantizationLevels ?? 0,
          renderMode: 'full',
          probedPoint: { u: 0.785, v: 1.571 },
        },
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function deleteMatrixPreset(presetId: string): Promise<void> {
  const path = `matrices/${presetId}`;
  try {
    await deleteDoc(doc(db, 'matrices', presetId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveEvaluationRecord(evalRecord: TopologicalEvaluationRecord): Promise<void> {
  const path = `evaluations/${evalRecord.id}`;
  try {
    await setDoc(doc(db, 'evaluations', evalRecord.id), {
      id: evalRecord.id,
      userId: evalRecord.userId,
      matrixName: evalRecord.matrixName,
      modelUsed: evalRecord.modelUsed,
      query: evalRecord.query,
      analysisText: evalRecord.analysisText,
      createdAt: evalRecord.createdAt,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveForecastRecord(record: ForecastRecord): Promise<void> {
  const path = `forecasts/${record.id}`;
  try {
    await setDoc(doc(db, 'forecasts', record.id), {
      id: record.id,
      userId: record.userId,
      title: record.title,
      horizonSeconds: record.horizonSeconds,
      recurrencePeriod: record.recurrencePeriod,
      probedU: record.probedU,
      probedV: record.probedV,
      summary: record.summary,
      createdAt: record.createdAt,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
