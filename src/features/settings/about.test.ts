import { describe, expect, it } from 'vitest';
import { DEVELOPER_INFO } from './about';

describe('settings about content', () => {
  it('contains the approved developer identity', () => {
    expect(DEVELOPER_INFO).toEqual({
      title: 'Geliştirici',
      name: 'Hilal Yeşim Altunay',
    });
  });
});
