export function parseDecimal(value: string): number | null {
  const normalized = value.trim().replace(/\s/g, '').replace(',', '.');
  if (!normalized || !/^-?\d+(\.\d+)?$/.test(normalized)) return null;
  const result = Number(normalized);
  return Number.isFinite(result) ? result : null;
}

export function formatCurrency(value: number | null | undefined): string {
  const safe = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 2,
  }).format(safe);
}

export function formatNumber(value: number | null | undefined, fractionDigits = 0): string {
  const safe = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat('tr-TR', {
    maximumFractionDigits: fractionDigits,
  }).format(safe);
}

export function parseDateOnly(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? date
    : null;
}

export function toDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayDateOnly(): string {
  return toDateOnly(new Date());
}

export function parseTimeOnly(value: string, anchor = new Date()): Date | null {
  const match = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  const date = new Date(anchor);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

export function toTimeOnly(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return 'Tarih yok';
  const date = parseDateOnly(value) ?? new Date(value);
  if (Number.isNaN(date.getTime())) return 'Geçersiz tarih';
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function formatCompactDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = parseDateOnly(value) ?? new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'short',
  }).format(date);
}
