import { create } from 'zustand';
import type { VehicleAssistantResult } from '../domain/assistantContract';

export interface AssistantChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text?: string;
  result?: VehicleAssistantResult;
  error?: string;
  pending?: boolean;
  question?: string;
}

interface AssistantSessionState {
  /** Chat threads keyed by vehicle id, so switching vehicles never mixes history. */
  threads: Record<string, AssistantChatMessage[]>;
  /** Unsent composer text, kept per vehicle for the same session lifetime. */
  drafts: Record<string, string>;
  sequence: number;
  createMessageId(): string;
  appendMessages(vehicleId: string, messages: AssistantChatMessage[]): void;
  patchMessage(vehicleId: string, messageId: string, patch: Partial<AssistantChatMessage>): void;
  removeMessage(vehicleId: string, messageId: string): void;
  setDraft(vehicleId: string, draft: string): void;
  clearVehicleSession(vehicleId: string): void;
  resetAllSessions(): void;
}

/**
 * Session-only Araç Asistanı chat memory.
 *
 * Deliberately a plain Zustand store with NO `persist` middleware and no
 * AsyncStorage or Supabase writer anywhere in this module: the thread survives
 * tab and route changes (the screen unmounts, this module does not) and is
 * expected to be gone after a full app restart. Assistant answers can quote a
 * user's vehicle records, so nothing here may outlive the process.
 */
export const useAssistantSessionStore = create<AssistantSessionState>((set, get) => ({
  threads: {},
  drafts: {},
  sequence: 0,

  createMessageId() {
    const next = get().sequence + 1;
    set({ sequence: next });
    return `m${next}`;
  },

  appendMessages(vehicleId, messages) {
    set((state) => ({
      threads: { ...state.threads, [vehicleId]: [...(state.threads[vehicleId] ?? []), ...messages] },
    }));
  },

  patchMessage(vehicleId, messageId, patch) {
    set((state) => {
      const thread = state.threads[vehicleId];
      if (!thread) return state;
      return {
        threads: {
          ...state.threads,
          [vehicleId]: thread.map((message) =>
            message.id === messageId ? { ...message, ...patch } : message,
          ),
        },
      };
    });
  },

  removeMessage(vehicleId, messageId) {
    set((state) => {
      const thread = state.threads[vehicleId];
      if (!thread) return state;
      return {
        threads: {
          ...state.threads,
          [vehicleId]: thread.filter((message) => message.id !== messageId),
        },
      };
    });
  },

  setDraft(vehicleId, draft) {
    set((state) => ({ drafts: { ...state.drafts, [vehicleId]: draft } }));
  },

  clearVehicleSession(vehicleId) {
    set((state) => {
      const threads = { ...state.threads };
      const drafts = { ...state.drafts };
      delete threads[vehicleId];
      delete drafts[vehicleId];
      return { threads, drafts };
    });
  },

  resetAllSessions() {
    set({ threads: {}, drafts: {}, sequence: 0 });
  },
}));
