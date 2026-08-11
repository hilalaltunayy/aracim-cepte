import { describe, expect, it } from 'vitest';
import { FUEL_STATIONS, getFuelStationLabel, isFuelStationId } from './fuelStations';

describe('normalized fuel station catalog', () => {
  it('contains every approved stable ID exactly once', () => {
    expect(FUEL_STATIONS.map((station) => station.id)).toEqual([
      'opet',
      'shell',
      'petrol_ofisi',
      'bp',
      'totalenergies',
      'aytemiz',
      'other',
    ]);
  });

  it('maps internal IDs to user-facing labels', () => {
    expect(getFuelStationLabel('petrol_ofisi')).toBe('Petrol Ofisi');
    expect(getFuelStationLabel('other')).toBe('Diğer');
    expect(getFuelStationLabel('opet')).not.toBe('opet');
  });

  it('keeps station optional and rejects unknown IDs', () => {
    expect(getFuelStationLabel(null)).toBeNull();
    expect(isFuelStationId(undefined)).toBe(false);
    expect(isFuelStationId('unknown')).toBe(false);
  });
});
