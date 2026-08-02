import { describe, expect, it, vi } from 'vitest';
import { createRequestId } from './requestId';

const nativeUuids = vi.hoisted(() => [
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
]);

vi.mock('expo-crypto', () => ({ randomUUID: vi.fn(() => nativeUuids.shift()) }));

describe('createRequestId', () => {
  it('creates distinct UUID request keys for idempotent mutations', () => {
    const first = createRequestId();
    const second = createRequestId();
    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(second).not.toBe(first);
  });
});
