import { describe, expect, it } from 'vitest';
import { isAutomaticReminderTitle, titleAfterReminderTypeChange } from './reminderTitle';

describe('reminder title synchronization', () => {
  it('updates an untouched automatic title with the selected type', () => {
    expect(
      titleAfterReminderTypeChange('Periyodik bakım', 'periodic_maintenance', 'inspection', true),
    ).toBe('Araç muayenesi');
  });

  it('preserves a user-defined title when the type changes', () => {
    expect(
      titleAfterReminderTypeChange(
        'Kış öncesi özel kontrol',
        'periodic_maintenance',
        'inspection',
        false,
      ),
    ).toBe('Kış öncesi özel kontrol');
  });

  it('recognizes a stored default label as automatic', () => {
    expect(isAutomaticReminderTitle('Araç muayenesi', 'inspection')).toBe(true);
  });
});
