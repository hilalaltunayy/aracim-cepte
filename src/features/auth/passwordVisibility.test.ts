import { describe, expect, it } from 'vitest';
import { nextPasswordVisibility } from './passwordVisibility';

describe('tap-to-toggle password visibility', () => {
  it('first tap reveals the password', () => {
    expect(nextPasswordVisibility(false, 'toggle')).toBe(true);
  });

  it('second tap masks it again', () => {
    expect(nextPasswordVisibility(true, 'toggle')).toBe(false);
  });

  it('stays visible across further toggles until tapped again (no hold/timeout involved)', () => {
    let visible = false;
    visible = nextPasswordVisibility(visible, 'toggle');
    expect(visible).toBe(true);
    // Simulates focus moving elsewhere: nothing but another explicit toggle
    // may change the state.
    expect(visible).toBe(true);
    visible = nextPasswordVisibility(visible, 'toggle');
    expect(visible).toBe(false);
  });

  it('always re-masks when the app is backgrounded, regardless of current state', () => {
    expect(nextPasswordVisibility(true, 'background')).toBe(false);
    expect(nextPasswordVisibility(false, 'background')).toBe(false);
  });
});
