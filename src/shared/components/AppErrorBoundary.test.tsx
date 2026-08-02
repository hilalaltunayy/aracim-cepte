/* eslint-disable import/first */
import type { ReactNode } from 'react';
import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { beforeAll, describe, expect, it, vi } from 'vitest';

const routerMock = vi.hoisted(() => ({ dismissAll: vi.fn(), replace: vi.fn() }));

vi.mock('react-native', () => ({
  StyleSheet: { create: <T,>(styles: T) => styles },
  Text: 'Text',
  View: 'View',
}));
vi.mock('expo-router', () => ({ router: routerMock }));
vi.mock('./ui', async () => {
  const React = await import('react');
  return {
    AppButton: ({ title, ...props }: Record<string, unknown> & { title?: ReactNode }) =>
      React.createElement('AppButton', { ...props, title }, title),
  };
});
vi.mock('@/shared/theme', () => {
  const colors = new Proxy({}, { get: (_target, key) => String(key) });
  const theme = { colors };
  return {
    spacing: { lg: 12, xl: 20 },
    typography: { body: {}, screenTitle: {} },
    useThemedStyles: (factory: (value: typeof theme) => unknown) => factory(theme),
  };
});

import { AppErrorBoundary, createSafeRuntimeDiagnostic } from './AppErrorBoundary';

describe('AppErrorBoundary diagnostics and reset', () => {
  beforeAll(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
      true;
  });

  it('keeps only sanitized application frames for development diagnostics', () => {
    const error = new Error(
      'failed for person@example.invalid at https://signed.example/file token=secret-value',
    );
    error.stack = [
      error.toString(),
      ' at open (C:/repo/src/app/expertise/edit.tsx:120:7)',
      ' at vendor (C:/repo/node_modules/vendor/index.js:1:1)',
    ].join('\n');
    const diagnostic = createSafeRuntimeDiagnostic(error, {
      componentStack: '\n at Expertise (person@example.invalid)',
    });
    expect(diagnostic.name).toBe('Error');
    expect(diagnostic.message).toContain('[redacted-email]');
    expect(diagnostic.message).toContain('[redacted-url]');
    expect(diagnostic.message).toContain('[redacted-secret]');
    expect(diagnostic.applicationStack).toEqual([
      ' at open (C:/repo/src/app/expertise/edit.tsx:120:7)',
    ]);
    expect(diagnostic.componentStack).not.toContain('person@example.invalid');
  });

  it('remounts children after retry and lets the home action reset navigation', async () => {
    let shouldThrow = true;
    let renderer: ReactTestRenderer | undefined;
    function FlakyRoute() {
      if (shouldThrow) throw new Error('route failed');
      return createElement('SuccessRoute', null, 'ready');
    }
    await act(async () => {
      renderer = create(
        <AppErrorBoundary>
          <FlakyRoute />
        </AppErrorBoundary>,
      );
    });
    expect(renderer!.root.findByProps({ title: 'Tekrar dene' })).toBeDefined();
    shouldThrow = false;
    act(() => renderer!.root.findByProps({ title: 'Tekrar dene' }).props.onPress());
    expect(
      renderer!.root.find((node) => String(node.type) === 'SuccessRoute').children,
    ).toContain('ready');

    shouldThrow = true;
    await act(async () => {
      renderer!.update(
        <AppErrorBoundary>
          <FlakyRoute />
        </AppErrorBoundary>,
      );
    });
    shouldThrow = false;
    act(() => renderer!.root.findByProps({ title: 'Ana sayfaya dön' }).props.onPress());
    expect(routerMock.dismissAll).toHaveBeenCalled();
    expect(routerMock.replace).toHaveBeenCalledWith('/');
  });
});
