/* eslint-disable react/no-unknown-property -- React Three Fiber JSX uses renderer-specific props. */
/* eslint-disable react-hooks/refs -- Gesture callbacks intentionally read imperative camera refs. */
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { Canvas, useThree } from '@react-three/fiber/native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { BufferGeometry, DoubleSide, Float32BufferAttribute, type PerspectiveCamera } from 'three';
import { useAppTheme } from '@/shared/theme';
import type { Vehicle3DBodyProfile } from './bodyFamilies';
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

interface HullSection {
  z: number;
  width: number;
  bottom: number;
  top: number;
}

function createSectionHull(sections: readonly HullSection[]): BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  for (const section of sections) {
    const halfWidth = section.width / 2;
    positions.push(
      -halfWidth,
      section.bottom,
      section.z,
      halfWidth,
      section.bottom,
      section.z,
      halfWidth,
      section.top,
      section.z,
      -halfWidth,
      section.top,
      section.z,
    );
  }
  for (let index = 0; index < sections.length - 1; index += 1) {
    const a = index * 4;
    const b = a + 4;
    indices.push(
      a,
      b + 1,
      b,
      a,
      a + 1,
      b + 1,
      a + 1,
      a + 2,
      b + 2,
      a + 1,
      b + 2,
      b + 1,
      a + 2,
      a + 3,
      b + 3,
      a + 2,
      b + 3,
      b + 2,
      a + 3,
      a,
      b,
      a + 3,
      b,
      b + 3,
    );
  }
  const last = (sections.length - 1) * 4;
  indices.push(0, 3, 2, 0, 2, 1, last, last + 1, last + 2, last, last + 2, last + 3);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
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
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') invalidate();
    });
    return () => {
      controllerRef.current = null;
      subscription.remove();
    };
  }, [controllerRef, invalidate, updateCamera]);
  return null;
}

function Wheel({ position, radius }: { position: [number, number, number]; radius: number }) {
  return (
    <group position={position} rotation={[0, 0, Math.PI / 2]}>
      <mesh>
        <cylinderGeometry args={[radius, radius, radius * 0.44, 20]} />
        <meshStandardMaterial color="#172127" roughness={0.86} />
      </mesh>
      <mesh position={[0, radius * 0.24, 0]}>
        <cylinderGeometry args={[radius * 0.49, radius * 0.49, 0.025, 10]} />
        <meshStandardMaterial color="#9AAAB1" metalness={0.58} roughness={0.36} />
      </mesh>
    </group>
  );
}

function ProceduralVehicle({
  profile,
  vehicleColor,
}: {
  profile: Vehicle3DBodyProfile;
  vehicleColor: string;
}) {
  const mainBody = useMemo(
    () =>
      createSectionHull([
        {
          z: profile.length / 2,
          width: profile.width * 0.62,
          bottom: 0.36,
          top: profile.bodyHeight * 0.7,
        },
        {
          z: profile.length * 0.39,
          width: profile.width * 0.9,
          bottom: 0.3,
          top: profile.bodyHeight * 0.92,
        },
        { z: profile.length * 0.15, width: profile.width, bottom: 0.29, top: profile.bodyHeight },
        {
          z: -profile.length * 0.34,
          width: profile.width,
          bottom: 0.29,
          top: profile.bodyHeight * 0.98,
        },
        {
          z: -profile.length / 2,
          width: profile.width * 0.76,
          bottom: 0.35,
          top: profile.bodyHeight * 0.72,
        },
      ]),
    [profile],
  );
  const cabinTop = profile.openRoof ? profile.bodyHeight + 0.27 : profile.roofHeight;
  const cabin = useMemo(
    () =>
      createSectionHull([
        {
          z: profile.cabinStart,
          width: profile.width * 0.76,
          bottom: profile.bodyHeight * 0.79,
          top: profile.bodyHeight * 0.93,
        },
        {
          z: profile.cabinStart * 0.62,
          width: profile.width * 0.88,
          bottom: profile.bodyHeight * 0.8,
          top: cabinTop,
        },
        {
          z: profile.cabinEnd * 0.62,
          width: profile.width * 0.9,
          bottom: profile.bodyHeight * 0.8,
          top: cabinTop * 0.99,
        },
        {
          z: profile.cabinEnd,
          width: profile.width * 0.78,
          bottom: profile.bodyHeight * 0.79,
          top: profile.bodyHeight * 0.94,
        },
      ]),
    [cabinTop, profile],
  );
  const roof = useMemo(
    () =>
      profile.openRoof
        ? null
        : createSectionHull([
            {
              z: profile.cabinStart * 0.6,
              width: profile.width * 0.83,
              bottom: profile.roofHeight - 0.055,
              top: profile.roofHeight,
            },
            {
              z: profile.cabinEnd * 0.6,
              width: profile.width * 0.85,
              bottom: profile.roofHeight - 0.055,
              top: profile.roofHeight,
            },
          ]),
    [profile],
  );

  useEffect(
    () => () => {
      mainBody.dispose();
      cabin.dispose();
      roof?.dispose();
    },
    [cabin, mainBody, roof],
  );

  const wheelX = profile.width * 0.51;
  const wheelZ = profile.wheelBase / 2;
  return (
    <group position={[0, -0.27, 0]}>
      <mesh geometry={mainBody}>
        <meshStandardMaterial
          color={vehicleColor}
          metalness={0.24}
          roughness={0.34}
          side={DoubleSide}
        />
      </mesh>
      <mesh geometry={cabin}>
        <meshStandardMaterial
          color={profile.openRoof ? '#28363C' : '#638C9C'}
          metalness={0.12}
          roughness={0.22}
          side={DoubleSide}
        />
      </mesh>
      {roof ? (
        <mesh geometry={roof}>
          <meshStandardMaterial
            color={vehicleColor}
            metalness={0.2}
            roughness={0.34}
            side={DoubleSide}
          />
        </mesh>
      ) : null}
      {profile.pickupBed ? (
        <mesh position={[0, profile.bodyHeight + 0.015, -profile.length * 0.34]}>
          <boxGeometry args={[profile.width * 0.76, 0.04, profile.length * 0.26]} />
          <meshStandardMaterial color="#26363C" roughness={0.78} />
        </mesh>
      ) : null}
      <mesh position={[0, profile.bodyHeight * 0.65, profile.length * 0.498]}>
        <boxGeometry args={[profile.width * 0.55, 0.14, 0.035]} />
        <meshStandardMaterial color="#EEF7F5" emissive="#B7DDD8" emissiveIntensity={0.22} />
      </mesh>
      <mesh position={[0, profile.bodyHeight * 0.62, -profile.length * 0.498]}>
        <boxGeometry args={[profile.width * 0.5, 0.12, 0.035]} />
        <meshStandardMaterial color="#A33C3C" emissive="#6A1616" emissiveIntensity={0.24} />
      </mesh>
      {([-1, 1] as const).flatMap((side) =>
        [wheelZ, -wheelZ].map((z) => (
          <Wheel
            key={`${side}:${z}`}
            position={[side * wheelX, profile.wheelRadius, z]}
            radius={profile.wheelRadius}
          />
        )),
      )}
    </group>
  );
}

export default function Sedan3DScene({
  vehicleColor,
  profile,
  onInteractionChange,
}: {
  vehicleColor: string;
  profile: Vehicle3DBodyProfile;
  onInteractionChange?: (active: boolean) => void;
}) {
  const { colors } = useAppTheme();
  const controllerRef = useRef<OrbitControllerApi | null>(null);
  const activeGestureCount = useRef(0);
  const handlePan = useCallback(
    (changeX: number, changeY: number) => controllerRef.current?.pan(changeX, changeY),
    [],
  );
  const handlePinchBegin = useCallback(() => controllerRef.current?.startPinch(), []);
  const handlePinch = useCallback((scale: number) => controllerRef.current?.pinch(scale), []);
  const beginInteraction = useCallback(() => {
    activeGestureCount.current += 1;
    if (activeGestureCount.current === 1) onInteractionChange?.(true);
  }, [onInteractionChange]);
  const endInteraction = useCallback(() => {
    activeGestureCount.current = Math.max(0, activeGestureCount.current - 1);
    if (activeGestureCount.current === 0) onInteractionChange?.(false);
  }, [onInteractionChange]);
  useEffect(() => () => onInteractionChange?.(false), [onInteractionChange]);
  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .maxPointers(1)
      .minDistance(1)
      .onBegin(beginInteraction)
      .onChange((event) => handlePan(event.changeX, event.changeY))
      .onFinalize(endInteraction)
      .runOnJS(true);
    const pinch = Gesture.Pinch()
      .onBegin(() => {
        beginInteraction();
        handlePinchBegin();
      })
      .onUpdate((event) => handlePinch(event.scale))
      .onFinalize(endInteraction)
      .runOnJS(true);
    return Gesture.Simultaneous(pan, pinch);
  }, [beginInteraction, endInteraction, handlePan, handlePinch, handlePinchBegin]);

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.fill} testID="vehicle-3d-scene">
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
          <ambientLight intensity={1.55} />
          <directionalLight position={[4, 7, 6]} intensity={2.05} />
          <directionalLight position={[-4, 3, -3]} intensity={0.65} />
          <ProceduralVehicle profile={profile} vehicleColor={vehicleColor} />
          <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[4.4, 36]} />
            <meshStandardMaterial color={colors.neutralSurface} roughness={1} />
          </mesh>
          <OrbitController controllerRef={controllerRef} />
        </Canvas>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
