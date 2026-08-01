import { Session } from '@supabase/supabase-js';
import { create } from 'zustand';
import { getSupabaseClient, isSupabaseConfigured } from '@/data/supabase/client';
import {
  getAccountDeletionErrorMessage,
  getFunctionErrorCode,
} from '@/data/supabase/functionErrors';
import { establishPasswordRecoverySession } from '@/features/auth/passwordRecovery';
import { getPasswordRecoveryRedirectUrl } from '@/features/auth/recoveryRedirect';
import {
  getPasswordResetFriendlyError,
  logPasswordResetErrorInDevelopment,
} from '@/features/auth/passwordResetError';
import {
  getConfirmationResendError,
  resendSignupConfirmation,
} from '@/features/auth/confirmationResend';
import { SESSION_EXPIRED_MESSAGE } from '@/features/auth/sessionRouting';
import { AppError, getFriendlyError, isSessionExpiredError } from '@/shared/utils/errors';
import { markHasSignedInBefore, readHasSignedInBefore } from '@/features/auth/returningUser';

interface AuthState {
  session: Session | null;
  recoveryMode: boolean;
  ready: boolean;
  busy: boolean;
  error: string | null;
  sessionNotice: string | null;
  hasSignedInBefore: boolean;
  initialize: () => Promise<() => void>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string, displayName: string) => Promise<boolean>;
  resendConfirmation: (email: string) => Promise<boolean>;
  sendPasswordReset: (email: string) => Promise<boolean>;
  establishRecovery: (url: string | null) => Promise<boolean>;
  updateRecoveredPassword: (password: string) => Promise<boolean>;
  deleteAccount: () => Promise<boolean>;
  signOut: () => Promise<void>;
  markSessionExpired: () => void;
  clearError: () => void;
}

let intentionalSessionEnd = false;

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  recoveryMode: false,
  ready: false,
  busy: false,
  error: null,
  sessionNotice: null,
  hasSignedInBefore: false,

  initialize: async () => {
    if (!isSupabaseConfigured) {
      set({ ready: true, session: null });
      return () => undefined;
    }
    const client = getSupabaseClient();
    const [{ data, error }, storedReturningUser] = await Promise.all([
      client.auth.getSession(),
      readHasSignedInBefore(),
    ]);
    const hasSignedInBefore = storedReturningUser || Boolean(data.session);
    if (data.session && !storedReturningUser) void markHasSignedInBefore();
    set({
      session: data.session,
      ready: true,
      hasSignedInBefore,
      sessionNotice: error && isSessionExpiredError(error) ? SESSION_EXPIRED_MESSAGE : null,
    });
    const subscription = client.auth.onAuthStateChange((event, session) => {
      const previousSession = get().session;
      const unexpectedSignOut =
        event === 'SIGNED_OUT' && Boolean(previousSession) && !intentionalSessionEnd;
      set((state) => ({
        session,
        sessionNotice: session
          ? null
          : unexpectedSignOut
            ? SESSION_EXPIRED_MESSAGE
            : state.sessionNotice,
        recoveryMode:
          event === 'PASSWORD_RECOVERY'
            ? true
            : event === 'SIGNED_OUT'
              ? false
              : state.recoveryMode,
      }));
    });
    return () => subscription.data.subscription.unsubscribe();
  },

  signIn: async (email, password) => {
    set({ busy: true, error: null, sessionNotice: null });
    try {
      const { error } = await getSupabaseClient().auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw error;
      await markHasSignedInBefore();
      set({ busy: false, hasSignedInBefore: true });
      return true;
    } catch (error) {
      set({ busy: false, error: getFriendlyError(error) });
      return false;
    }
  },

  signUp: async (email, password, displayName) => {
    set({ busy: true, error: null });
    try {
      const { error } = await getSupabaseClient().auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { data: { display_name: displayName.trim() || undefined } },
      });
      if (error) throw error;
      set({ busy: false });
      return true;
    } catch (error) {
      set({ busy: false, error: getFriendlyError(error) });
      return false;
    }
  },

  resendConfirmation: async (email) => {
    set({ busy: true, error: null });
    try {
      await resendSignupConfirmation(getSupabaseClient().auth, email);
      set({ busy: false });
      return true;
    } catch (error) {
      set({ busy: false, error: getConfirmationResendError(error) });
      return false;
    }
  },

  sendPasswordReset: async (email) => {
    set({ busy: true, error: null });
    try {
      const redirectTo = getPasswordRecoveryRedirectUrl();
      const { error } = await getSupabaseClient().auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo },
      );
      if (error) throw error;
      set({ busy: false });
      return true;
    } catch (error) {
      logPasswordResetErrorInDevelopment(error);
      set({ busy: false, error: getPasswordResetFriendlyError(error) });
      return false;
    }
  },

  establishRecovery: async (url) => {
    set({ busy: true, error: null, recoveryMode: false });
    const result = await establishPasswordRecoverySession(getSupabaseClient().auth, url);
    if (result.error || !result.session) {
      set({ busy: false, error: result.error, recoveryMode: false });
      return false;
    }
    set({ busy: false, session: result.session, recoveryMode: true });
    return true;
  },

  updateRecoveredPassword: async (password) => {
    set({ busy: true, error: null });
    const client = getSupabaseClient();
    try {
      const { error } = await client.auth.updateUser({ password });
      if (error) throw error;
      intentionalSessionEnd = true;
      const { error: signOutError } = await client.auth.signOut({ scope: 'global' });
      if (signOutError) await client.auth.signOut({ scope: 'local' });
      set({ busy: false, session: null, recoveryMode: false, sessionNotice: null });
      intentionalSessionEnd = false;
      return true;
    } catch (error) {
      intentionalSessionEnd = false;
      set({ busy: false, error: getFriendlyError(error) });
      return false;
    }
  },

  deleteAccount: async () => {
    set({ busy: true, error: null });
    const client = getSupabaseClient();
    try {
      const { error } = await client.functions.invoke('delete-account', { body: {} });
      if (error) {
        const code = await getFunctionErrorCode(error);
        throw new AppError(getAccountDeletionErrorMessage(code), code ?? 'ACCOUNT_DELETE_FAILED');
      }
      intentionalSessionEnd = true;
      await client.auth.signOut({ scope: 'local' });
      set({ busy: false, session: null, recoveryMode: false, sessionNotice: null });
      intentionalSessionEnd = false;
      return true;
    } catch (error) {
      intentionalSessionEnd = false;
      set({ busy: false, error: getFriendlyError(error) });
      return false;
    }
  },

  signOut: async () => {
    intentionalSessionEnd = true;
    set({ busy: true, error: null, sessionNotice: null });
    try {
      await getSupabaseClient().auth.signOut();
    } finally {
      intentionalSessionEnd = false;
      set({ busy: false, session: null, recoveryMode: false, sessionNotice: null });
    }
  },

  markSessionExpired: () => {
    set({ session: null, recoveryMode: false, sessionNotice: SESSION_EXPIRED_MESSAGE });
    if (!isSupabaseConfigured) return;
    intentionalSessionEnd = true;
    void getSupabaseClient()
      .auth.signOut({ scope: 'local' })
      .finally(() => {
        intentionalSessionEnd = false;
      });
  },

  clearError: () => set({ error: null }),
}));
