import { afterEach, describe, expect, it, vi } from 'vitest';
import { classifyDataAccessFailure, createDataAccessError } from './dataAccessError';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('authenticated data access error classification', () => {
  it('distinguishes schema, permission, network and auth failures', () => {
    expect(classifyDataAccessFailure({ code: 'PGRST205', message: 'schema cache miss' })).toBe(
      'schema',
    );
    expect(classifyDataAccessFailure({ code: '42501', message: 'permission denied' })).toBe(
      'permission',
    );
    expect(classifyDataAccessFailure(new TypeError('Failed to fetch'))).toBe('network');
    expect(classifyDataAccessFailure({ message: 'JWT expired' })).toBe('auth');
  });

  it('returns a safe schema message instead of a false internet diagnosis', () => {
    vi.stubGlobal('__DEV__', false);
    const error = createDataAccessError('vehicles.primary-photos', {
      code: 'PGRST205',
      message: "Could not find table 'private_table' in the schema cache",
    });

    expect(error.code).toBe('DATA_SCHEMA_MISMATCH');
    expect(error.message).toContain('sunucu güncellemesi eksik');
    expect(error.message).not.toContain('İnternet');
    expect(error.message).not.toContain('private_table');
  });

  it('logs only safe operation/category/code metadata in development', () => {
    vi.stubGlobal('__DEV__', true);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    createDataAccessError('vehicles.list', {
      code: '42703',
      message: 'secret access_token=do-not-log user@example.com',
    });

    expect(warn).toHaveBeenCalledWith('[data-access]', {
      operation: 'vehicles.list',
      category: 'schema',
      providerCode: '42703',
    });
    expect(JSON.stringify(warn.mock.calls)).not.toContain('do-not-log');
    expect(JSON.stringify(warn.mock.calls)).not.toContain('user@example.com');
  });
});
