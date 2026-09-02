import type { BodyType } from '@/domain/entities';

export type Vehicle3DBodyFamily =
  'sedan' | 'hatchback' | 'suv' | 'wagon' | 'sport' | 'pickup' | 'van';

export interface Vehicle3DBodyProfile {
  family: Vehicle3DBodyFamily;
  length: number;
  width: number;
  bodyHeight: number;
  roofHeight: number;
  cabinStart: number;
  cabinEnd: number;
  wheelBase: number;
  wheelRadius: number;
  openRoof?: boolean;
  pickupBed?: boolean;
}

const familyByBodyType: Record<BodyType, Vehicle3DBodyFamily> = {
  sedan: 'sedan',
  hatchback: 'hatchback',
  crossover: 'suv',
  suv: 'suv',
  station_wagon: 'wagon',
  coupe: 'sport',
  cabrio: 'sport',
  roadster: 'sport',
  pickup: 'pickup',
  mpv_minivan: 'van',
  van: 'van',
  sports_car: 'sport',
  campervan: 'van',
  minibus: 'van',
  sedan_hatchback: 'sedan',
  suv_crossover: 'suv',
  pickup_light_commercial: 'pickup',
};

const profiles: Record<Vehicle3DBodyFamily, Vehicle3DBodyProfile> = {
  sedan: {
    family: 'sedan',
    length: 4.65,
    width: 1.86,
    bodyHeight: 0.76,
    roofHeight: 1.55,
    cabinStart: 1.15,
    cabinEnd: -1.26,
    wheelBase: 2.78,
    wheelRadius: 0.39,
  },
  hatchback: {
    family: 'hatchback',
    length: 4.18,
    width: 1.82,
    bodyHeight: 0.78,
    roofHeight: 1.52,
    cabinStart: 1.02,
    cabinEnd: -1.62,
    wheelBase: 2.54,
    wheelRadius: 0.38,
  },
  suv: {
    family: 'suv',
    length: 4.58,
    width: 1.94,
    bodyHeight: 0.94,
    roofHeight: 1.82,
    cabinStart: 1.18,
    cabinEnd: -1.52,
    wheelBase: 2.72,
    wheelRadius: 0.46,
  },
  wagon: {
    family: 'wagon',
    length: 4.73,
    width: 1.87,
    bodyHeight: 0.8,
    roofHeight: 1.6,
    cabinStart: 1.13,
    cabinEnd: -1.82,
    wheelBase: 2.83,
    wheelRadius: 0.4,
  },
  sport: {
    family: 'sport',
    length: 4.42,
    width: 1.9,
    bodyHeight: 0.65,
    roofHeight: 1.29,
    cabinStart: 0.83,
    cabinEnd: -0.96,
    wheelBase: 2.64,
    wheelRadius: 0.41,
  },
  pickup: {
    family: 'pickup',
    length: 5.22,
    width: 1.96,
    bodyHeight: 0.94,
    roofHeight: 1.76,
    cabinStart: 1.38,
    cabinEnd: -0.42,
    wheelBase: 3.18,
    wheelRadius: 0.47,
    pickupBed: true,
  },
  van: {
    family: 'van',
    length: 4.92,
    width: 1.98,
    bodyHeight: 0.98,
    roofHeight: 2.08,
    cabinStart: 1.78,
    cabinEnd: -1.88,
    wheelBase: 2.96,
    wheelRadius: 0.44,
  },
};

export function getVehicle3DBodyFamily(bodyType?: BodyType | null): Vehicle3DBodyFamily | null {
  return bodyType ? (familyByBodyType[bodyType] ?? null) : null;
}

export function getVehicle3DBodyProfile(bodyType?: BodyType | null): Vehicle3DBodyProfile | null {
  const family = getVehicle3DBodyFamily(bodyType);
  if (!family) return null;
  const base = profiles[family];
  return {
    ...base,
    openRoof: bodyType === 'cabrio' || bodyType === 'roadster',
  };
}
