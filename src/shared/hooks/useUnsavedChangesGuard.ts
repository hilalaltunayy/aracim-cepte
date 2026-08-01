import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/build/react-navigation/native';
import { UNSAVED_CHANGES_COPY } from '@/shared/utils/unsavedChanges';

type DeferredNavigation = () => void;

function confirmDiscard(onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm(`${UNSAVED_CHANGES_COPY.title}\n\n${UNSAVED_CHANGES_COPY.message}`)) {
      onConfirm();
    }
    return;
  }
  Alert.alert(UNSAVED_CHANGES_COPY.title, UNSAVED_CHANGES_COPY.message, [
    { text: UNSAVED_CHANGES_COPY.cancel, style: 'cancel' },
    { text: UNSAVED_CHANGES_COPY.confirm, style: 'destructive', onPress: onConfirm },
  ]);
}

export function useUnsavedChangesGuard(isDirty: boolean) {
  const navigation = useNavigation();
  const [bypass, setBypass] = useState(false);
  const pendingNavigation = useRef<DeferredNavigation | null>(null);

  useEffect(() => {
    if (!bypass || !pendingNavigation.current) return;
    const navigate = pendingNavigation.current;
    pendingNavigation.current = null;
    const frame = requestAnimationFrame(navigate);
    return () => cancelAnimationFrame(frame);
  }, [bypass]);

  usePreventRemove(isDirty && !bypass, ({ data }) => {
    confirmDiscard(() => {
      pendingNavigation.current = () => navigation.dispatch(data.action);
      setBypass(true);
    });
  });

  return useCallback((navigate: DeferredNavigation) => {
    pendingNavigation.current = navigate;
    setBypass(true);
  }, []);
}
