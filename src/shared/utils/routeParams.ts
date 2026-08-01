import type { Href } from 'expo-router';
import type { RecordType } from '@/domain/entities';

const recordTypes = new Set<RecordType>(['fuel', 'maintenance', 'expense']);
const entityIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function firstRouteParam(value: string | string[] | undefined): string | undefined {
  const candidate = Array.isArray(value) ? value[0] : value;
  const normalized = candidate?.trim();
  return normalized ? normalized : undefined;
}

export function safeRecordType(value: string | string[] | undefined): RecordType {
  const candidate = firstRouteParam(value);
  return candidate && recordTypes.has(candidate as RecordType) ? (candidate as RecordType) : 'fuel';
}

export function safeEntityId(value: string | string[] | undefined): string | undefined {
  const candidate = firstRouteParam(value);
  return candidate && entityIdPattern.test(candidate) ? candidate : undefined;
}

export function createRecordHref(type: RecordType): Href {
  return { pathname: '/record/edit', params: { type } };
}

export function editRecordHref(id: string): Href {
  return { pathname: '/record/edit', params: { id } };
}
