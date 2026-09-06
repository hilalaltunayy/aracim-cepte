import type { Vehicle } from '@/domain/entities';
import { AppError } from '@/shared/utils/errors';
import { buildSafeFileName } from '@/shared/utils/safeFileName';

/**
 * Orchestrates PDF export without importing any native module, so the flow is
 * testable and the Expo dependency stays at the edge (same split as
 * `openAttachment` / `attachments`).
 */
export interface ReportPdfGateway {
  /** Renders HTML to a PDF file and resolves its local `file://` URI. */
  printToFile(html: string): Promise<string>;
  /** Best-effort rename so the shared file carries a meaningful name. */
  rename(uri: string, fileName: string): Promise<string>;
  isSharingAvailable(): Promise<boolean>;
  share(uri: string, fileName: string): Promise<void>;
}

export interface VehicleReportPdfResult {
  uri: string;
  fileName: string;
  /** False when the platform has no share sheet; the file still exists. */
  shared: boolean;
}

export const REPORT_PDF_ERROR_MESSAGE =
  'Rapor oluşturulamadı. Lütfen tekrar deneyin.';

/** `Aracim_Cepte_Rapor_34ABC123_2026-09-06.pdf` */
export function buildVehicleReportFileName(
  vehicle: Pick<Vehicle, 'brand' | 'model' | 'plate'>,
  now = new Date(),
): string {
  const identity = vehicle.plate?.trim() || `${vehicle.brand} ${vehicle.model}`.trim();
  const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate(),
  ).padStart(2, '0')}`;
  return buildSafeFileName(`Aracim_Cepte_Rapor_${identity}_${day}`, 'pdf', 'Aracim_Cepte_Rapor');
}

export async function exportVehicleReportPdf(
  html: string,
  fileName: string,
  gateway: ReportPdfGateway,
): Promise<VehicleReportPdfResult> {
  let uri: string;
  try {
    uri = await gateway.printToFile(html);
    if (!uri) throw new Error('empty pdf uri');
  } catch {
    throw new AppError(REPORT_PDF_ERROR_MESSAGE, 'REPORT_PDF_RENDER_FAILED');
  }
  // A failed rename must not lose an otherwise valid report.
  const finalUri = await gateway.rename(uri, fileName).catch(() => uri);
  try {
    if (!(await gateway.isSharingAvailable())) {
      return { uri: finalUri, fileName, shared: false };
    }
    await gateway.share(finalUri, fileName);
    return { uri: finalUri, fileName, shared: true };
  } catch {
    throw new AppError(
      'Rapor oluşturuldu ancak paylaşım ekranı açılamadı.',
      'REPORT_PDF_SHARE_FAILED',
    );
  }
}
