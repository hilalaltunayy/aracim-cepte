import { describe, expect, it } from 'vitest';
import { createRequestId } from './requestId';

describe('createRequestId', () => {
  it('creates distinct UUID request keys for idempotent mutations', () => {
    const first = createRequestId();
    const second = createRequestId();
    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(second).not.toBe(first);
  });
});
