export const UNSAVED_CHANGES_COPY = {
  title: 'Değişiklikler kaydedilmedi',
  message: 'Bu ekrandan çıkarsanız yaptığınız değişiklikler kaybolacak.',
  cancel: 'Vazgeç',
  confirm: 'Çık',
} as const;

export function haveFormValuesChanged<T>(initial: T, current: T): boolean {
  return JSON.stringify(initial) !== JSON.stringify(current);
}
