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
import { AppError, getFriendlyError } from '@/shared/utils/errors';

interface AuthState {
  session: Session | null;
  recoveryMode: boolean;
  ready: boolean;
  busy: boolean;
  error: string | null;
  initialize: () => Promise<() => void>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string, displayName: string) => Promise<boolean>;
  sendPasswordReset: (email: string) => Promise<boolean>;
  establishRecovery: (url: string | null) => Promise<boolean>;
  updateRecoveredPassword: (password: string) => Promise<boolean>;
  deleteAccount: () => Promise<boolean>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  recoveryMode: false,
  ready: false,
  busy: false,
  error: null,

  initialize: async () => {
    if (!isSupabaseConfigured) {
      set({ ready: true, session: null });
      return () => undefined;
    }
    const client = getSupabaseClient();
    const { data } = await client.auth.getSession();
    set({ session: data.session, ready: true });
    const subscription = client.auth.onAuthStateChange((event, session) =>
      set((state) => ({
        session,
        recoveryMode:
          event === 'PASSWORD_RECOVERY'
            ? true
            : event === 'SIGNED_OUT'
              ? false
              : state.recoveryMode,
      })),
    );
    return () => subscription.data.subscription.unsubscribe();
  },

  signIn: async (email, password) => {
    set({ busy: true, error: null });
    try {
      const { error } = await getSupabaseClient().auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw error;
      set({ busy: false });
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
      const { error: signOutError } = await client.auth.signOut({ scope: 'global' });
      if (signOutError) await client.auth.signOut({ scope: 'local' });
      set({ busy: false, session: null, recoveryMode: false });
      return true;
    } catch (error) {
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
      await client.auth.signOut({ scope: 'local' });
      set({ busy: false, session: null, recoveryMode: false });
      return true;
    } catch (error) {
      set({ busy: false, error: getFriendlyError(error) });
      return false;
    }
  },

  signOut: async () => {
    set({ busy: true, error: null });
    try {
      await getSupabaseClient().auth.signOut();
    } finally {
      set({ busy: false, session: null, recoveryMode: false });
    }
  },

  clearError: () => set({ error: null }),
}));
