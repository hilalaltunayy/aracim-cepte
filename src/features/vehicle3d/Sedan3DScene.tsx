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
  /** Corner rounding at the roof/top edge as a fraction of the section height. */
  topRound?: number;
  /** Corner rounding at the sill/bottom edge as a fraction of the section height. */
  bottomRound?: number;
}

const RING_CORNER_STEPS = 3;

/** A closed rounded-rectangle ring of points (x,y) in the section's local plane. */
function ringPoints(section: HullSection): [number, number][] {
  const halfWidth = section.width / 2;
  const height = section.top - section.bottom;
  const topR = Math.max(0, Math.min(0.5, section.topRound ?? 0.32)) * Math.min(halfWidth, height);
  const bottomR =
    Math.max(0, Math.min(0.5, section.bottomRound ?? 0.16)) * Math.min(halfWidth, height);
  const arc = (
    cx: number,
    cy: number,
    r: number,
    from: number,
    to: number,
  ): [number, number][] => {
    if (r <= 0) return [[cx, cy]];
    const points: [number, number][] = [];
    for (let step = 0; step <= RING_CORNER_STEPS; step += 1) {
      const angle = from + ((to - from) * step) / RING_CORNER_STEPS;
      points.push([cx + Math.cos(angle) * r, cy + Math.sin(angle) * r]);
    }
    return points;
  };
  return [
    ...arc(halfWidth - bottomR, section.bottom + bottomR, bottomR, -Math.PI / 2, 0),
    ...arc(halfWidth - topR, section.top - topR, topR, 0, Math.PI / 2),
    ...arc(-halfWidth + topR, section.top - topR, topR, Math.PI / 2, Math.PI),
    ...arc(-halfWidth + bottomR, section.bottom + bottomR, bottomR, Math.PI, Math.PI * 1.5),
  ];
}

/** Lofts a smooth hull through rounded cross-sections along the z axis. */
function createSectionHull(sections: readonly HullSection[]): BufferGeometry {
  const rings = sections.map(ringPoints);
  const ringSize = rings[0].length;
  const positions: number[] = [];
  const indices: number[] = [];
  rings.forEach((ring, sectionIndex) => {
    for (const [x, y] of ring) positions.push(x, y, sections[sectionIndex].z);
  });
  for (let sectionIndex = 0; sectionIndex < rings.length - 1; sectionIndex += 1) {
    const a = sectionIndex * ringSize;
    const b = a + ringSize;
    for (let point = 0; point < ringSize; point += 1) {
      const next = (point + 1) % ringSize;
      indices.push(a + point, b + next, b + point, a + point, a + next, b + next);
    }
  }
  // Flat end caps (triangle fan around each terminal ring).
  const last = (rings.length - 1) * ringSize;
  for (let point = 1; point < ringSize - 1; point += 1) {
    indices.push(0, point + 1, point);
    indices.push(last, last + point, last + point + 1);
  }
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
  const width = radius * 0.42;
  return (
    <group position={position} rotation={[0, 0, Math.PI / 2]}>
      {/* tyre */}
      <mesh castShadow>
        <cylinderGeometry args={[radius, radius, width, 28]} />
        <meshStandardMaterial color="#15191E" roughness={0.92} metalness={0.02} />
      </mesh>
      {/* sidewall inset */}
      <mesh position={[0, width * 0.5 + 0.001, 0]}>
        <cylinderGeometry args={[radius * 0.7, radius * 0.7, 0.012, 24]} />
        <meshStandardMaterial color="#1E242B" roughness={0.8} />
      </mesh>
      {/* alloy rim */}
      <mesh position={[0, width * 0.52, 0]}>
        <cylinderGeometry args={[radius * 0.56, radius * 0.56, 0.03, 24]} />
        <meshStandardMaterial color="#C6D0D6" metalness={0.82} roughness={0.28} />
      </mesh>
      {/* hub + spokes hint */}
      <mesh position={[0, width * 0.54, 0]}>
        <cylinderGeometry args={[radius * 0.2, radius * 0.2, 0.036, 12]} />
        <meshStandardMaterial color="#8A959C" metalness={0.7} roughness={0.35} />
      </mesh>
      {[0, 1, 2, 3, 4].map((spoke) => (
        <mesh
          key={spoke}
          position={[0, width * 0.53, 0]}
          rotation={[0, (spoke * Math.PI) / 2.5, 0]}
        >
          <boxGeometry args={[radius * 0.9, 0.02, radius * 0.16]} />
          <meshStandardMaterial color="#AEB9BF" metalness={0.75} roughness={0.32} />
        </mesh>
      ))}
    </group>
  );
}

function WheelArch({
  position,
  radius,
  width,
}: {
  position: [number, number, number];
  radius: number;
  width: number;
}) {
  return (
    <mesh position={position} rotation={[0, 0, Math.PI / 2]}>
      <torusGeometry args={[radius * 1.12, width * 0.34, 8, 18, Math.PI]} />
      <meshStandardMaterial color="#20272D" roughness={0.7} />
    </mesh>
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
  const wheelWidth = profile.wheelRadius * 0.42;
  return (
    <group position={[0, -0.27, 0]}>
      <mesh geometry={mainBody} castShadow>
        <meshStandardMaterial
          color={vehicleColor}
          metalness={0.5}
          roughness={0.32}
          envMapIntensity={0.9}
          side={DoubleSide}
        />
      </mesh>
      <mesh geometry={cabin}>
        <meshStandardMaterial
          color={profile.openRoof ? '#202A30' : '#1C2A33'}
          metalness={0.1}
          roughness={0.12}
          transparent
          opacity={profile.openRoof ? 1 : 0.82}
          side={DoubleSide}
        />
      </mesh>
      {roof ? (
        <mesh geometry={roof}>
          <meshStandardMaterial
            color={vehicleColor}
            metalness={0.5}
            roughness={0.32}
            side={DoubleSide}
          />
        </mesh>
      ) : null}
      {/* front + rear bumpers */}
      {[profile.length / 2 - 0.02, -profile.length / 2 + 0.02].map((z, index) => (
        <mesh key={index} position={[0, 0.42, z]}>
          <boxGeometry args={[profile.width * 0.98, 0.3, 0.16]} />
          <meshStandardMaterial color="#2B343A" roughness={0.6} metalness={0.2} />
        </mesh>
      ))}
      {([-1, 1] as const).flatMap((side) =>
        [wheelZ, -wheelZ].map((z) => (
          <WheelArch
            key={`arch:${side}:${z}`}
            position={[side * wheelX * 0.98, profile.wheelRadius + 0.02, z]}
            radius={profile.wheelRadius}
            width={wheelWidth}
          />
        )),
      )}
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
      .minDistance(2)
      .averageTouches(true)
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
          <hemisphereLight args={['#ffffff', '#3a4750', 0.85]} />
          <ambientLight intensity={0.35} />
          <directionalLight position={[5, 8, 5]} intensity={1.9} castShadow />
          <directionalLight position={[-6, 4, -4]} intensity={0.5} color="#cfe6ff" />
          <spotLight position={[0, 6, -6]} angle={0.6} penumbra={1} intensity={0.5} />
          <ProceduralVehicle profile={profile} vehicleColor={vehicleColor} />
          {/* studio floor */}
          <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <circleGeometry args={[7, 48]} />
            <meshStandardMaterial color={colors.neutralSurface} roughness={0.95} metalness={0.02} />
          </mesh>
          {/* soft contact shadow */}
          <mesh position={[0, 0.012, -0.1]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[profile.length * 0.34, 32]} />
            <meshBasicMaterial color="#0d1418" transparent opacity={0.22} />
          </mesh>
          <OrbitController controllerRef={controllerRef} />
        </Canvas>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
