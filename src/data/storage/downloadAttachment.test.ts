import { describe, expect, it, vi } from 'vitest';
import { AppError } from '@/shared/utils/errors';
import {
  downloadPrivateAttachment,
  type AttachmentDownloadGateway,
} from './downloadAttachment';

const request = {
  storagePath: 'owner/vehicle/doc.pdf',
  fileName: 'Trafik_Sigortasi.pdf',
  mimeType: 'application/pdf',
};

function gateway(overrides: Partial<AttachmentDownloadGateway> = {}): AttachmentDownloadGateway {
  return {
    createSignedUrl: vi.fn(async () => 'https://storage.test/signed?token=abc'),
    downloadToCache: vi.fn(async () => 'file:///cache/Trafik_Sigortasi.pdf'),
    isSharingAvailable: vi.fn(async () => true),
    share: vi.fn(async () => undefined),
    cleanup: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe('downloadPrivateAttachment', () => {
  it('signs, downloads, hands the file to the save sheet and clears the cache copy', async () => {
    const deps = gateway();
    const result = await downloadPrivateAttachment(request, deps);
    expect(deps.createSignedUrl).toHaveBeenCalledWith('owner/vehicle/doc.pdf');
    expect(deps.downloadToCache).toHaveBeenCalledWith(
      'https://storage.test/signed?token=abc',
      'Trafik_Sigortasi.pdf',
    );
    expect(deps.share).toHaveBeenCalledWith(
      'file:///cache/Trafik_Sigortasi.pdf',
      'application/pdf',
      'Trafik_Sigortasi.pdf',
    );
    expect(deps.cleanup).toHaveBeenCalledWith('file:///cache/Trafik_Sigortasi.pdf');
    expect(result).toEqual({ fileName: 'Trafik_Sigortasi.pdf', saved: true });
  });

  it.each([
    ['no signed url returned', { createSignedUrl: vi.fn(async () => null) }],
    [
      'signing threw',
      { createSignedUrl: vi.fn(async () => Promise.reject(new Error('rls'))) },
    ],
  ])('reports a missing or forbidden object honestly when %s', async (_label, overrides) => {
    const deps = gateway(overrides);
    await expect(downloadPrivateAttachment(request, deps)).rejects.toMatchObject({
      message: 'Dosya bulutta bulunamadı. Kayıt silinmiş olabilir.',
    });
    expect(deps.downloadToCache).not.toHaveBeenCalled();
  });

  it('never follows a non-https URL', async () => {
    const deps = gateway({ createSignedUrl: vi.fn(async () => 'file:///etc/passwd') });
    await expect(downloadPrivateAttachment(request, deps)).rejects.toBeInstanceOf(AppError);
    expect(deps.downloadToCache).not.toHaveBeenCalled();
  });

  it('rejects an empty storage path before touching the network', async () => {
    const deps = gateway();
    await expect(
      downloadPrivateAttachment({ ...request, storagePath: '   ' }, deps),
    ).rejects.toBeInstanceOf(AppError);
    expect(deps.createSignedUrl).not.toHaveBeenCalled();
  });

  it('surfaces a network failure as a friendly error rather than crashing', async () => {
    const deps = gateway({
      downloadToCache: vi.fn(async () => Promise.reject(new Error('offline'))),
    });
    await expect(downloadPrivateAttachment(request, deps)).rejects.toMatchObject({
      message: 'Dosya indirilemedi. Lütfen bağlantınızı kontrol edip tekrar deneyin.',
    });
  });

  it('explains when the platform cannot offer a save sheet', async () => {
    const deps = gateway({ isSharingAvailable: vi.fn(async () => false) });
    await expect(downloadPrivateAttachment(request, deps)).rejects.toMatchObject({
      code: 'ATTACHMENT_DOWNLOAD_UNSUPPORTED',
    });
    // The staged copy is still removed.
    expect(deps.cleanup).toHaveBeenCalled();
  });

  it('still cleans the cache when sharing fails', async () => {
    const deps = gateway({ share: vi.fn(async () => Promise.reject(new Error('cancelled'))) });
    await expect(downloadPrivateAttachment(request, deps)).rejects.toBeInstanceOf(AppError);
    expect(deps.cleanup).toHaveBeenCalledWith('file:///cache/Trafik_Sigortasi.pdf');
  });

  it('does not fail a completed download because cleanup failed', async () => {
    const deps = gateway({
      cleanup: vi.fn(async () => Promise.reject(new Error('busy'))),
    });
    await expect(downloadPrivateAttachment(request, deps)).resolves.toEqual({
      fileName: 'Trafik_Sigortasi.pdf',
      saved: true,
    });
  });
});
