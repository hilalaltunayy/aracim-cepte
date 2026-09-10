import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { useDataStore } from '@/store/dataStore';

/**
 * Binds the data store's operational `error` slice to the screen that owns it.
 *
 * `useDataStore().error` is a single global field written by every failed
 * mutation and read by several unrelated screens (Settings, the reminder,
 * vehicle, record, document and expertise forms). With no lifecycle it only
 * resets when the next mutation starts, so a failed reminder save keeps its
 * banner visible after the user navigates to Settings.
 *
 * A screen that surfaces that banner calls this so the error is cleared both on
 * entry (it must never inherit a stale error from another screen) and on leave
 * (it must not carry its own error out). A successful retry already clears the
 * error earlier through the mutation itself; this only bounds a *failed* one to
 * its originating context.
 */
export function useClearDataErrorOnNavigation() {
  const clearError = useDataStore((state) => state.clearError);
  useFocusEffect(
    useCallback(() => {
      clearError();
      return () => clearError();
    }, [clearError]),
  );
}
