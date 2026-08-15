import { FUEL_PRICE_REFERENCE_AVAILABILITY } from '../config/fuelPriceConfig';
import type {
  FuelPriceQuery,
  FuelPriceReferenceAvailability,
  NormalizedFuelPrice,
} from '../domain/fuelPrice';

/**
 * Mobile code owns no EPDK transport. A future approved trusted backend/cache adapter implements
 * this boundary and can be injected without exposing source behavior to form components.
 */
export interface FuelPriceReferenceLookup {
  lookup(query: FuelPriceQuery): Promise<NormalizedFuelPrice | null>;
}

export const fuelPriceReferenceAvailability: FuelPriceReferenceAvailability =
  FUEL_PRICE_REFERENCE_AVAILABILITY;

export const disabledFuelPriceReferenceLookup: FuelPriceReferenceLookup = {
  async lookup() {
    return null;
  },
};
