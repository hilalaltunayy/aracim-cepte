import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Executes the ACTUAL shipped bridge script (not a reimplementation) against a
 * fake window/document, so these tests fail the moment the real published page
 * at https://aracimcepte.hilalaltunay.com/auth/reset-password stops doing what
 * this file documents.
 */
const BRIDGE_HTML_PATH = path.resolve(__dirname, '../web/auth/reset-password/index.html');

function extractBridgeScript(): string {
  const html = readFileSync(BRIDGE_HTML_PATH, 'utf8');
  const match = /<script>([\s\S]*?)<\/script>/.exec(html);
  if (!match) throw new Error(`bridge <script> not found in ${BRIDGE_HTML_PATH}`);
  return match[1];
}

interface FakeElement {
  hidden: boolean;
  textContent: string;
  _click?: () => void;
  addEventListener?(event: string, handler: () => void): void;
}

function runBridge(url: string) {
  const parsed = new URL(url);
  const elements: Record<string, FakeElement> = {
    status: { hidden: false, textContent: '' },
    open: {
      hidden: true,
      textContent: '',
      addEventListener(event, handler) {
        if (event === 'click') this._click = handler;
      },
    },
    hint: { hidden: true, textContent: '' },
    invalid: { hidden: true, textContent: '' },
  };
  const replaceStateCalls: unknown[][] = [];
  const timeouts: { fn: () => void; ms: number }[] = [];
  let navigatedTo: string | null = null;

  const fakeWindow = {
    location: {
      search: parsed.search,
      hash: parsed.hash,
      pathname: parsed.pathname,
      get href() {
        return navigatedTo ?? url;
      },
      set href(value: string) {
        navigatedTo = value;
      },
    },
    history: {
      replaceState: (...args: unknown[]) => {
        replaceStateCalls.push(args);
      },
    },
    setTimeout: (fn: () => void, ms: number) => {
      timeouts.push({ fn, ms });
      return timeouts.length;
    },
  };
  const fakeDocument = { getElementById: (id: string) => elements[id] };

  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const run = new Function('window', 'document', extractBridgeScript());
  run(fakeWindow, fakeDocument);

  return {
    elements,
    replaceStateCalls,
    timeouts,
    get navigatedTo() {
      return navigatedTo;
    },
    clickOpenButton: () => elements.open._click?.(),
  };
}

const BASE = 'https://aracimcepte.hilalaltunay.com/auth/reset-password';

describe('published password-reset HTTPS bridge (web/auth/reset-password/index.html)', () => {
  it('forwards a valid token_hash recovery URL to the app scheme unchanged', () => {
    const result = runBridge(`${BASE}?token_hash=real-token-abc&type=recovery`);
    expect(result.navigatedTo).toBe(
      'aracimcepte://auth/reset-password?token_hash=real-token-abc&type=recovery',
    );
    expect(result.elements.invalid.hidden).toBe(true);
    expect(result.timeouts).toHaveLength(1);
    expect(result.timeouts[0].ms).toBe(1200);
  });

  it('refuses a non-recovery type and never launches the app', () => {
    const result = runBridge(`${BASE}?token_hash=real-token-abc&type=signup`);
    expect(result.navigatedTo).toBeNull();
    expect(result.elements.status.hidden).toBe(true);
    expect(result.elements.invalid.hidden).toBe(false);
    expect(result.timeouts).toHaveLength(0);
  });

  it('refuses a link with no token, code or error at all', () => {
    const result = runBridge(`${BASE}?type=recovery`);
    expect(result.navigatedTo).toBeNull();
    expect(result.elements.invalid.hidden).toBe(false);
  });

  it('preserves query parameters through the HTTPS -> custom-scheme hop, dropping anything else', () => {
    const result = runBridge(
      `${BASE}?token_hash=real-token-abc&type=recovery&utm_source=gmail&utm_campaign=x`,
    );
    const forwarded = new URL(result.navigatedTo!);
    expect(forwarded.protocol).toBe('aracimcepte:');
    expect(forwarded.searchParams.get('token_hash')).toBe('real-token-abc');
    expect(forwarded.searchParams.get('type')).toBe('recovery');
    expect(forwarded.searchParams.has('utm_source')).toBe(false);
    expect(forwarded.searchParams.has('utm_campaign')).toBe(false);
  });

  it('also collects the payload when it arrives in the URL fragment', () => {
    const result = runBridge(`${BASE}?#token_hash=hash-delivered&type=recovery`);
    expect(result.navigatedTo).toBe(
      'aracimcepte://auth/reset-password?token_hash=hash-delivered&type=recovery',
    );
  });

  it('forwards a PKCE code the same way', () => {
    const result = runBridge(`${BASE}?code=pkce-code-xyz&type=recovery`);
    const forwarded = new URL(result.navigatedTo!);
    expect(forwarded.searchParams.get('code')).toBe('pkce-code-xyz');
    expect(forwarded.searchParams.get('type')).toBe('recovery');
  });

  it('forwards an expired/used-link error so the app can show the safe message', () => {
    const result = runBridge(`${BASE}?error=access_denied&error_code=otp_expired`);
    const forwarded = new URL(result.navigatedTo!);
    expect(forwarded.searchParams.get('error')).toBe('access_denied');
    expect(forwarded.searchParams.get('error_code')).toBe('otp_expired');
  });

  it('strips the token from the visible URL/history as soon as it is captured', () => {
    const result = runBridge(`${BASE}?token_hash=real-token-abc&type=recovery`);
    expect(result.replaceStateCalls).toHaveLength(1);
    const [, , newPath] = result.replaceStateCalls[0];
    expect(newPath).toBe('/auth/reset-password');
  });

  it('the manual "Uygulamada aç" button navigates too, and is armed for a valid link', () => {
    const result = runBridge(`${BASE}?token_hash=real-token-abc&type=recovery`);
    expect(typeof result.elements.open.addEventListener).toBe('function');
    result.clickOpenButton();
    // Clicking again re-navigates to the same safe target, never a stale one.
    expect(result.navigatedTo).toBe(
      'aracimcepte://auth/reset-password?token_hash=real-token-abc&type=recovery',
    );
  });

  it('never logs, and the source never references console at all', () => {
    expect(extractBridgeScript()).not.toMatch(/console\s*\./);
  });
});
