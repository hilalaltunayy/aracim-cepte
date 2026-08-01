import { describe, expect, it } from 'vitest';
import { getAttachmentTypeLabel } from './attachmentPresentation';

describe('attachment presentation', () => {
  it('shows only a safe type label and never the object identifier', () => {
    expect(getAttachmentTypeLabel('owner/vehicle/random-id.pdf')).toBe('PDF');
    expect(getAttachmentTypeLabel('owner/vehicle/random-id.jpeg')).toBe('JPG');
    expect(getAttachmentTypeLabel('owner/vehicle/random-id.png')).toBe('PNG');
    expect(getAttachmentTypeLabel(null)).toBeNull();
  });
});
