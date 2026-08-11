import { describe, expect, it } from 'vitest';
import { DOCUMENT_EXPIRY_SOON_DAYS, getDocumentStatus } from './documentStatus';

describe('document expiry status', () => {
  it('derives active and expiring-soon states from one threshold', () => {
    expect(DOCUMENT_EXPIRY_SOON_DAYS).toBe(30);
    expect(getDocumentStatus('2026-03-15', '2026-02-01')).toBe('active');
    expect(getDocumentStatus('2026-02-20', '2026-02-01')).toBe('expiring_soon');
  });

  it('keeps expired and no-expiry documents classifiable without deleting them', () => {
    expect(getDocumentStatus('2026-01-31', '2026-02-01')).toBe('expired');
    expect(getDocumentStatus(null, '2026-02-01')).toBe('no_expiry');
  });
});
