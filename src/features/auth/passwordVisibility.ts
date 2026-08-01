export type PasswordVisibilityEvent =
  'press-in' | 'press-out' | 'cancel' | 'blur' | 'background' | 'unmount';

export function isPasswordVisibleAfter(event: PasswordVisibilityEvent): boolean {
  return event === 'press-in';
}
