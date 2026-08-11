import type { VehicleDraft } from '@/domain/entities';

export function getVehicleTaxonomyPersistenceFields(draft: VehicleDraft) {
  return {
    body_type: draft.bodyType,
    color_id: draft.colorId,
    color: draft.color?.trim() || null,
  } as const;
}
