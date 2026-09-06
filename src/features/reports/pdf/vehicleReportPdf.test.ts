import { describe, expect, it, vi } from 'vitest';
import { AppError } from '@/shared/utils/errors';
import {
  buildVehicleReportFileName,
  exportVehicleReportPdf,
  type ReportPdfGateway,
} from './vehicleReportPdf';

function gateway(overrides: Partial<ReportPdfGateway> = {}): ReportPdfGateway {
  return {
    printToFile: vi.fn(async () => 'file:///cache/print-abc123.pdf'),
    rename: vi.fn(async (_uri: string, fileName: string) => `file:///cache/${fileName}`),
    isSharingAvailable: vi.fn(async () => true),
    share: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe('buildVehicleReportFileName', () => {
  it('prefers the plate and transliterates Turkish characters', () => {
    expect(
      buildVehicleReportFileName(
        { brand: 'Kia', model: 'Sportage', plate: '34 ABÇ 123' },
        new Date('2026-09-06T10:00:00'),
      ),
    ).toBe('Aracim_Cepte_Rapor_34_ABC_123_2026-09-06.pdf');
  });

  it('falls back to brand and model when no plate is recorded', () => {
    expect(
      buildVehicleReportFileName(
        { brand: 'Kia', model: 'Sportage', plate: null },
        new Date('2026-09-06T10:00:00'),
      ),
    ).toBe('Aracim_Cepte_Rapor_Kia_Sportage_2026-09-06.pdf');
  });
});

describe('exportVehicleReportPdf', () => {
  it('renders, renames and shares the report', async () => {
    const deps = gateway();
    const result = await exportVehicleReportPdf('<html></html>', 'rapor.pdf', deps);
    expect(deps.printToFile).toHaveBeenCalledWith('<html></html>');
    expect(deps.rename).toHaveBeenCalledWith('file:///cache/print-abc123.pdf', 'rapor.pdf');
    expect(deps.share).toHaveBeenCalledWith('file:///cache/rapor.pdf', 'rapor.pdf');
    expect(result).toEqual({ uri: 'file:///cache/rapor.pdf', fileName: 'rapor.pdf', shared: true });
  });

  it('keeps the generated report when renaming fails', async () => {
    const deps = gateway({ rename: vi.fn(async () => Promise.reject(new Error('locked'))) });
    const result = await exportVehicleReportPdf('<html></html>', 'rapor.pdf', deps);
    expect(result.uri).toBe('file:///cache/print-abc123.pdf');
    expect(deps.share).toHaveBeenCalled();
  });

  it('reports a render failure as a friendly error instead of crashing', async () => {
    const deps = gateway({ printToFile: vi.fn(async () => Promise.reject(new Error('boom'))) });
    await expect(exportVehicleReportPdf('<html></html>', 'rapor.pdf', deps)).rejects.toBeInstanceOf(
      AppError,
    );
    expect(deps.share).not.toHaveBeenCalled();
  });

  it('still returns the file when the platform offers no share sheet', async () => {
    const deps = gateway({ isSharingAvailable: vi.fn(async () => false) });
    const result = await exportVehicleReportPdf('<html></html>', 'rapor.pdf', deps);
    expect(result.shared).toBe(false);
    expect(deps.share).not.toHaveBeenCalled();
  });

  it('surfaces a share failure separately from a render failure', async () => {
    const deps = gateway({ share: vi.fn(async () => Promise.reject(new Error('no activity'))) });
    await expect(
      exportVehicleReportPdf('<html></html>', 'rapor.pdf', deps),
    ).rejects.toMatchObject({ code: 'REPORT_PDF_SHARE_FAILED' });
  });
});
