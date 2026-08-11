import type { BodyCondition } from '@/domain/entities';

export type BodyConditionKind = 'primary' | 'additive' | 'exclusive';

export interface BodyConditionDefinition {
  id: BodyCondition;
  label: string;
  kind: BodyConditionKind;
}

export const bodyConditionCatalog: readonly BodyConditionDefinition[] = [
  { id: 'original', label: 'Orijinal', kind: 'primary' },
  { id: 'painted', label: 'Boyalı', kind: 'primary' },
  { id: 'locally_painted', label: 'Lokal Boyalı', kind: 'primary' },
  { id: 'replaced', label: 'Değişen', kind: 'primary' },
  { id: 'damaged', label: 'Hasarlı', kind: 'additive' },
  { id: 'unknown', label: 'Bilinmiyor', kind: 'exclusive' },
] as const;

export const bodyConditionLabels: Record<BodyCondition, string> = Object.fromEntries(
  bodyConditionCatalog.map((condition) => [condition.id, condition.label]),
) as Record<BodyCondition, string>;

export const primaryBodyConditions = bodyConditionCatalog
  .filter((condition) => condition.kind === 'primary')
  .map((condition) => condition.id) as BodyCondition[];

export const bodyConditionIds = bodyConditionCatalog.map((condition) => condition.id);
