/* eslint-disable react/no-unknown-property -- React Three Fiber JSX uses renderer-specific props. */
/* eslint-disable react-hooks/refs -- Gesture callbacks intentionally read an imperative camera ref after render. */
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { Canvas, useThree } from '@react-three/fiber/native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import type { PerspectiveCamera } from 'three';
import { useAppTheme } from '@/shared/theme';
import { VEHICLE_3D_CONFIG } from './config';
import {
  applyOrbitPan,
  applyOrbitPinch,
  createInitialOrbit,
  getOrbitCameraPosition,
  type OrbitState,
} from './orbit';

interface OrbitControllerApi {
  pan: (changeX: number, changeY: number) => void;
  startPinch: () => void;
  pinch: (scale: number) => void;
}

function OrbitController({
  controllerRef,
}: {
  controllerRef: React.MutableRefObject<OrbitControllerApi | null>;
}) {
  const { camera, invalidate } = useThree();
  const orbitRef = useRef<OrbitState>(createInitialOrbit());
  const pinchStartDistanceRef = useRef<number>(VEHICLE_3D_CONFIG.initialCameraDistance);

  const updateCamera = useCallback(
    (next: OrbitState) => {
      orbitRef.current = next;
      const position = getOrbitCameraPosition(next);
      const perspectiveCamera = camera as PerspectiveCamera;
      perspectiveCamera.position.set(position.x, position.y, position.z);
      perspectiveCamera.lookAt(0, VEHICLE_3D_CONFIG.cameraTargetY, 0);
      perspectiveCamera.updateProjectionMatrix();
      invalidate();
    },
    [camera, invalidate],
  );

  useEffect(() => {
    updateCamera(orbitRef.current);
    controllerRef.current = {
      pan: (changeX, changeY) => updateCamera(applyOrbitPan(orbitRef.current, changeX, changeY)),
      startPinch: () => {
        pinchStartDistanceRef.current = orbitRef.current.cameraDistance;
      },
      pinch: (scale) =>
        updateCamera(
          applyOrbitPinch(
            { ...orbitRef.current, cameraDistance: pinchStartDistanceRef.current },
            scale,
          ),
        ),
    };

    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') invalidate();
    });
    return () => {
      controllerRef.current = null;
      appStateSubscription.remove();
    };
  }, [controllerRef, invalidate, updateCamera]);

  return null;
}

function Wheel({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} rotation={[0, 0, Math.PI / 2]}>
      <mesh>
        <cylinderGeometry args={[0.42, 0.42, 0.32, 12]} />
        <meshStandardMaterial color="#17232A" roughness={0.82} />
      </mesh>
      <mesh position={[0, 0.17, 0]}>
        <cylinderGeometry args={[0.21, 0.21, 0.02, 8]} />
        <meshStandardMaterial color="#91A4AD" metalness={0.45} roughness={0.42} />
      </mesh>
    </group>
  );
}

function ProceduralSedan({ vehicleColor }: { vehicleColor: string }) {
  return (
    <group position={[0, -0.15, 0]}>
      <mesh position={[0, 0.72, 0]}>
        <boxGeometry args={[2.6, 0.62, 4.5]} />
        <meshStandardMaterial color={vehicleColor} metalness={0.2} roughness={0.38} />
      </mesh>
      <mesh position={[0, 1.25, -0.15]}>
        <boxGeometry args={[2.12, 0.65, 2.45]} />
        <meshStandardMaterial color={vehicleColor} metalness={0.16} roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.33, 0.08]}>
        <boxGeometry args={[2.16, 0.43, 1.62]} />
        <meshStandardMaterial color="#82ACBC" metalness={0.1} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.71, 2.32]}>
        <boxGeometry args={[2.3, 0.28, 0.18]} />
        <meshStandardMaterial color="#213640" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.71, -2.32]}>
        <boxGeometry args={[2.3, 0.28, 0.18]} />
        <meshStandardMaterial color="#213640" roughness={0.6} />
      </mesh>
      <Wheel position={[-1.32, 0.43, 1.38]} />
      <Wheel position={[1.32, 0.43, 1.38]} />
      <Wheel position={[-1.32, 0.43, -1.38]} />
      <Wheel position={[1.32, 0.43, -1.38]} />
    </group>
  );
}

export default function Sedan3DScene({ vehicleColor }: { vehicleColor: string }) {
  const { colors } = useAppTheme();
  const controllerRef = useRef<OrbitControllerApi | null>(null);
  const handlePan = useCallback((changeX: number, changeY: number) => {
    controllerRef.current?.pan(changeX, changeY);
  }, []);
  const handlePinchBegin = useCallback(() => controllerRef.current?.startPinch(), []);
  const handlePinch = useCallback((scale: number) => controllerRef.current?.pinch(scale), []);
  const gesture = useMemo(() => {
    const panGesture = Gesture.Pan()
      .minDistance(2)
      .onChange((event) => handlePan(event.changeX, event.changeY))
      .runOnJS(true);
    const pinchGesture = Gesture.Pinch()
      .onBegin(handlePinchBegin)
      .onUpdate((event) => handlePinch(event.scale))
      .runOnJS(true);
    return Gesture.Simultaneous(panGesture, pinchGesture);
  }, [handlePan, handlePinch, handlePinchBegin]);

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.fill} testID="sedan-3d-scene">
        <Canvas
          frameloop="demand"
          camera={{
            fov: 42,
            near: 0.1,
            far: 60,
            position: [0, 2, VEHICLE_3D_CONFIG.initialCameraDistance],
          }}
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        >
          <color attach="background" args={[colors.diagramBackground]} />
          <ambientLight intensity={1.8} />
          <directionalLight position={[4, 7, 6]} intensity={2.2} />
          <directionalLight position={[-4, 3, -3]} intensity={0.7} />
          <ProceduralSedan vehicleColor={vehicleColor} />
          <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[4.5, 32]} />
            <meshStandardMaterial color={colors.neutralSurface} roughness={1} />
          </mesh>
          <OrbitController controllerRef={controllerRef} />
        </Canvas>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
