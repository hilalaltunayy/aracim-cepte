import { describe, expect, it } from 'vitest';
import { LEGAL_ROUTES } from './legalRoutes';

describe('legal route smoke contract', () => {
  it('exposes the five canonical in-app documents from one list', () => {
    expect(LEGAL_ROUTES.map((item) => item.href)).toEqual([
      '/legal/kvkk-notice',
      '/legal/privacy-policy',
      '/legal/retention-and-deletion',
      '/legal/account-and-data-deletion',
      '/legal/kvkk-application',
    ]);
  });
});
