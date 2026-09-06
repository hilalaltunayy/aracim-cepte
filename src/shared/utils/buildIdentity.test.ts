import { describe, expect, it } from 'vitest';
import { getBuildIdentity } from './buildIdentity';

describe('build identity stamp', () => {
  it('shows the version code so an installed artifact identifies itself', () => {
    expect(getBuildIdentity({ version: '1.0.0', versionCode: 4 })).toBe('1.0.0 (4)');
  });

  it('appends a short build id when the build injects one', () => {
    expect(getBuildIdentity({ version: '1.0.0', versionCode: 4, buildId: '6585675' })).toBe(
      '1.0.0 (4 · 6585675)',
    );
  });

  it('truncates an over-long build id and rejects unexpected characters', () => {
    expect(
      getBuildIdentity({ version: '1.0.0', versionCode: 4, buildId: '6585675aefba97caf65e1214' }),
    ).toBe('1.0.0 (4 · 6585675aefba)');
    // Anything that is not a plain token is dropped rather than rendered.
    expect(getBuildIdentity({ version: '1.0.0', versionCode: 4, buildId: 'a b/c' })).toBe(
      '1.0.0 (4)',
    );
  });

  it('degrades safely when the manifest has no version code', () => {
    expect(getBuildIdentity({ version: '1.0.0', versionCode: null })).toBe('1.0.0');
    expect(getBuildIdentity({})).toBe('1.0.0');
  });

  it('accepts a version code supplied as a string', () => {
    expect(getBuildIdentity({ version: '1.0.0', versionCode: '4' })).toBe('1.0.0 (4)');
  });

  it('never emits anything secret-shaped', () => {
    const rendered = getBuildIdentity({
      version: '1.0.0',
      versionCode: 4,
      buildId: 'sk-should-be-dropped-because-too-long-and-not-a-token!!',
    });
    expect(rendered).toBe('1.0.0 (4)');
  });
});
