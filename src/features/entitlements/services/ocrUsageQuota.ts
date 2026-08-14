import { getSupabaseClient } from '@/data/supabase/client';
import { AppError } from '@/shared/utils/errors';
import { createRequestId } from '@/shared/utils/requestId';

export type OcrPurpose = 'document' | 'fuel_receipt' | 'maintenance_receipt';
export interface OcrUsage { usedCount: number; monthlyQuota: number; periodStart: string }

function row(value: { used_count: number; monthly_quota: number; period_start: string } | null): OcrUsage {
  if (!value) throw new AppError('Kullanım limiti şu anda kontrol edilemiyor. Lütfen tekrar deneyin.');
  return { usedCount: value.used_count, monthlyQuota: value.monthly_quota, periodStart: value.period_start };
}

export async function reserveOcrUsage(purpose: OcrPurpose, operationId = createRequestId()) {
  const { data, error } = await getSupabaseClient().rpc('reserve_ocr_usage', { p_operation_id: operationId, p_purpose: purpose });
  if (error) {
    if (error.message.includes('OCR_MONTHLY_QUOTA_EXCEEDED')) throw new AppError('Bu ayki tarama limitinize ulaştınız.');
    throw new AppError('Kullanım limiti şu anda kontrol edilemiyor. Lütfen tekrar deneyin.');
  }
  return { operationId, usage: row(data?.[0] ?? null) };
}

export async function commitOcrUsage(operationId: string): Promise<OcrUsage> {
  const { data, error } = await getSupabaseClient().rpc('commit_ocr_usage', { p_operation_id: operationId });
  if (error) throw new AppError('Tarama sonucu kaydedilemedi. Lütfen tekrar deneyin.');
  return row(data?.[0] ?? null);
}

export async function releaseOcrUsage(operationId: string): Promise<void> {
  await getSupabaseClient().rpc('release_ocr_usage', { p_operation_id: operationId });
}

export async function getMyOcrUsage(): Promise<OcrUsage> {
  const { data, error } = await getSupabaseClient().rpc('get_my_ocr_usage');
  if (error) throw new AppError('Kullanım limiti şu anda kontrol edilemiyor. Lütfen tekrar deneyin.');
  return row(data?.[0] ?? null);
}
