import { describe, expect, it } from 'vitest';
import { isPasswordVisibleAfter, type PasswordVisibilityEvent } from './passwordVisibility';

describe('press-and-hold password visibility', () => {
  it('shows a password only while press-in is active', () => {
    expect(isPasswordVisibleAfter('press-in')).toBe(true);
  });

  it.each<PasswordVisibilityEvent>(['press-out', 'cancel', 'blur', 'background', 'unmount'])(
    'hides the password on %s',
    (event) => {
      expect(isPasswordVisibleAfter(event)).toBe(false);
    },
  );
});
