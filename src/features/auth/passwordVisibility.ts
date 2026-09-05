export type PasswordVisibilityEvent = 'toggle' | 'background';

/**
 * Tap-to-reveal toggle: a tap flips visibility and it stays that way until the
 * next tap, regardless of focus. Backgrounding the app always re-masks it,
 * regardless of the current state, as a screenshot/app-switcher safeguard.
 */
export function nextPasswordVisibility(current: boolean, event: PasswordVisibilityEvent): boolean {
  if (event === 'background') return false;
  return !current;
}
