import { Component, type ErrorInfo, type PropsWithChildren, type ReactNode } from 'react';
import { act, create } from 'react-test-renderer';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequestId } from './requestId';

const { nativeRandomUuid } = vi.hoisted(() => ({
  nativeRandomUuid: vi.fn(() => '11111111-1111-4111-8111-111111111111'),
}));

vi.mock('expo-crypto', () => ({ randomUUID: nativeRandomUuid }));

interface Diagnostic {
  error: Error;
  componentStack: string;
}

let diagnostic: Diagnostic | null = null;

class DiagnosticBoundary extends Component<PropsWithChildren, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    diagnostic = { error, componentStack: info.componentStack ?? '' };
  }

  render(): ReactNode {
    return this.state.failed ? null : this.props.children;
  }
}

function RecordEditRenderProbe() {
  createRequestId();
  return null;
}

describe('TASK-011 request ID runtime regression', () => {
  const originalCrypto = globalThis.crypto;

  beforeAll(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
      true;
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'crypto', { configurable: true, value: originalCrypto });
    diagnostic = null;
  });

  it('mounts without Web Crypto by using the Expo native UUID implementation', async () => {
    Object.defineProperty(globalThis, 'crypto', { configurable: true, value: undefined });

    await act(async () => {
      create(
        <DiagnosticBoundary>
          <RecordEditRenderProbe />
        </DiagnosticBoundary>,
      );
    });

    expect(diagnostic).toBeNull();
    expect(nativeRandomUuid).toHaveBeenCalledOnce();
    expect(createRequestId()).toBe('11111111-1111-4111-8111-111111111111');
  });
});
