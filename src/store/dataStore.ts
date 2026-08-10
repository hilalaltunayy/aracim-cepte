import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  BodyCondition,
  BodyPartCondition,
  DocumentDraft,
  ExpertiseDraft,
  ExpertiseReport,
  MaintenanceTemplate,
  MaintenanceTemplateDraft,
  NoteDraft,
  RecordDraft,
  Reminder,
  ReminderDraft,
  Vehicle,
  VehicleDocument,
  VehicleDraft,
  VehicleNote,
  VehicleRecord,
} from '@/domain/entities';
import { appRepository } from '@/data/repositories/SupabaseAppRepository';
import { getFriendlyError, isSessionExpiredError } from '@/shared/utils/errors';
import { createSafeStringStorage } from '@/data/storage/safeStorage';
import {
  canStartMutation,
  requiresVehicleMileageCorrection,
} from '@/shared/utils/repositoryRules';
import { evaluateMileageTimeline } from '@/shared/utils/mileageTimeline';
import { useAuthStore } from '@/store/authStore';
import { resolveActiveVehicleId } from '@/shared/utils/vehicleState';

interface DataState {
  vehicles: Vehicle[];
  activeVehicleId: string | null;
  records: VehicleRecord[];
  reminders: Reminder[];
  bodyConditions: BodyPartCondition[];
  expertiseReports: ExpertiseReport[];
  notes: VehicleNote[];
  documents: VehicleDocument[];
  maintenanceTemplates: MaintenanceTemplate[];
  onboardingSeen: boolean;
  hydrated: boolean;
  bootstrapped: boolean;
  bootstrapError: string | null;
  loading: boolean;
  error: string | null;
  lastReminderNotice: string | null;
  lastBootstrapDurationMs: number | null;
  setOnboardingSeen: () => void;
  setActiveVehicle: (id: string) => Promise<void>;
  bootstrap: () => Promise<void>;
  refresh: () => Promise<void>;
  saveVehicle: (
    draft: VehicleDraft,
    id?: string,
    options?: { allowMileageDecrease?: boolean },
  ) => Promise<boolean>;
  deleteVehicle: (id: string) => Promise<boolean>;
  saveRecord: (draft: RecordDraft, id?: string, requestId?: string) => Promise<boolean>;
  deleteRecord: (id: string) => Promise<boolean>;
  saveMaintenanceTemplate: (draft: MaintenanceTemplateDraft, id?: string) => Promise<boolean>;
  deleteMaintenanceTemplate: (id: string) => Promise<boolean>;
  saveReminder: (draft: ReminderDraft, id?: string) => Promise<boolean>;
  toggleReminder: (reminder: Reminder) => Promise<boolean>;
  deleteReminder: (id: string) => Promise<boolean>;
  saveBodyCondition: (
    partKey: string,
    condition: BodyCondition,
    note: string | null,
  ) => Promise<boolean>;
  saveExpertise: (draft: ExpertiseDraft, id?: string) => Promise<boolean>;
  deleteExpertise: (id: string) => Promise<boolean>;
  saveNote: (draft: NoteDraft, id?: string) => Promise<boolean>;
  deleteNote: (id: string) => Promise<boolean>;
  saveDocument: (draft: DocumentDraft, id?: string) => Promise<boolean>;
  deleteDocument: (id: string) => Promise<boolean>;
  clearSection: (section: 'records' | 'reminders' | 'body' | 'documents') => Promise<boolean>;
  clear: () => void;
  clearError: () => void;
  setHydrated: () => void;
}

const emptyVehicleData = {
  records: [],
  reminders: [],
  bodyConditions: [],
  expertiseReports: [],
  notes: [],
  documents: [],
  maintenanceTemplates: [],
};

export const useDataStore = create<DataState>()(
  persist(
    (set, get) => {
      const handleError = (error: unknown) => {
        if (isSessionExpiredError(error)) useAuthStore.getState().markSessionExpired();
        return getFriendlyError(error);
      };
      const loadActiveData = async (vehicleId: string) => {
        const bundle = await appRepository.loadVehicleData(vehicleId);
        set(bundle);
        void appRepository
          .reconcileVehicleData(vehicleId, bundle.reminders)
          .then((reconciled) => {
            if (get().activeVehicleId === vehicleId) set(reconciled);
          })
          .catch(() => undefined);
      };
      const reloadAvailableData = async () => {
        const vehicles = await appRepository.listVehicles();
        const activeVehicleId = resolveActiveVehicleId(vehicles, get().activeVehicleId);
        set({ vehicles, activeVehicleId });
        if (activeVehicleId) await loadActiveData(activeVehicleId);
        else set(emptyVehicleData);
      };
      const mutate = async (operation: () => Promise<void>): Promise<boolean> => {
        if (!canStartMutation(get().loading)) return false;
        set({ loading: true, error: null });
        try {
          await operation();
          await reloadAvailableData();
          set({ loading: false, bootstrapped: true, bootstrapError: null });
          return true;
        } catch (error) {
          set({ loading: false, error: handleError(error) });
          return false;
        }
      };
      const activeVehicle = () =>
        get().vehicles.find((vehicle) => vehicle.id === get().activeVehicleId) ?? null;

      return {
        vehicles: [],
        activeVehicleId: null,
        ...emptyVehicleData,
        onboardingSeen: false,
        hydrated: false,
        bootstrapped: false,
        bootstrapError: null,
        loading: false,
        error: null,
        lastReminderNotice: null,
        lastBootstrapDurationMs: null,

        setOnboardingSeen: () => set({ onboardingSeen: true }),

        setActiveVehicle: async (id) => {
          const nextId = resolveActiveVehicleId(get().vehicles, id);
          if (!nextId) {
            set({ activeVehicleId: null, ...emptyVehicleData });
            return;
          }
          set({ activeVehicleId: nextId, loading: true, error: null });
          try {
            await loadActiveData(nextId);
            set({ loading: false });
          } catch (error) {
            set({ loading: false, error: handleError(error), ...emptyVehicleData });
          }
        },

        bootstrap: async () => {
          const startedAt = Date.now();
          set({ loading: true, error: null, bootstrapError: null, bootstrapped: false });
          try {
            const vehicles = await appRepository.listVehicles();
            const activeVehicleId = resolveActiveVehicleId(vehicles, get().activeVehicleId);
            set({ vehicles, activeVehicleId });
            if (activeVehicleId) await loadActiveData(activeVehicleId);
            else set(emptyVehicleData);
            set({
              loading: false,
              bootstrapped: true,
              bootstrapError: null,
              lastBootstrapDurationMs: Date.now() - startedAt,
            });
          } catch (error) {
            const message = handleError(error);
            set({ loading: false, bootstrapped: false, error: message, bootstrapError: message });
          }
        },

        refresh: async () => {
          set({ loading: true, error: null });
          try {
            await reloadAvailableData();
            set({ loading: false, bootstrapped: true, bootstrapError: null });
          } catch (error) {
            set({ loading: false, error: handleError(error) });
          }
        },

        saveVehicle: (draft, id, options) => {
          const existing = id ? get().vehicles.find((vehicle) => vehicle.id === id) : null;
          if (
            existing &&
            requiresVehicleMileageCorrection(existing.currentKm, draft.currentKm) &&
            !options?.allowMileageDecrease
          ) {
            set({ error: 'Kilometre düzeltmesi için kullanıcı onayı gerekiyor.' });
            return Promise.resolve(false);
          }
          return mutate(async () => {
            const saved = await appRepository.saveVehicle(draft, id);
            set({ activeVehicleId: saved.id });
          });
        },

        deleteVehicle: (id) =>
          mutate(async () => {
            await appRepository.deleteVehicle(id);
          }),

        saveRecord: (draft, id, requestId) => {
          const vehicle = activeVehicle();
          const mileageEvaluation = evaluateMileageTimeline({
            currentMileage: vehicle?.currentKm ?? 0,
            targetRecordId: id,
            targetRecordDate: draft.recordDate,
            targetMileage: draft.kilometer,
            records: get().records,
          });
          if (mileageEvaluation.level === 'blockingError') {
            set({
              error:
                mileageEvaluation.blockingCode === 'negative_mileage'
                  ? 'Kilometre negatif olamaz.'
                  : 'Geçerli bir kilometre girin.',
            });
            return Promise.resolve(false);
          }
          return mutate(async () => {
            const vehicleId = get().activeVehicleId;
            if (!vehicleId) throw new Error('Aktif araç yok.');
            await appRepository.saveRecord(vehicleId, draft, id, requestId);
          });
        },

        deleteRecord: (id) => mutate(() => appRepository.deleteRecord(id)),

        saveMaintenanceTemplate: (draft, id) =>
          mutate(async () => {
            await appRepository.saveMaintenanceTemplate(draft, id);
          }),

        deleteMaintenanceTemplate: (id) =>
          mutate(async () => {
            await appRepository.deleteMaintenanceTemplate(id);
          }),

        saveReminder: (draft, id) =>
          mutate(async () => {
            const vehicleId = get().activeVehicleId;
            if (!vehicleId) throw new Error('Aktif araç yok.');
            const saved = await appRepository.saveReminder(vehicleId, draft, id);
            const notificationFailed =
              Boolean(saved.dueDate) &&
              saved.notificationStatus !== 'scheduled' &&
              saved.notificationStatus !== 'not_required';
            set({
              lastReminderNotice: notificationFailed
                ? saved.notificationErrorCode === 'NOTIFICATION_TRIGGER_PAST'
                  ? 'Hatırlatıcı kaydedildi ancak seçilen bildirim zamanı geçmişte kaldığı için cihaz bildirimi kurulmadı. Tarihi veya uyarı zamanını düzenleyebilirsiniz.'
                  : 'Hatırlatıcı kaydedildi ancak cihaz bildirimi kurulamadı. Hatırlatıcılar ekranında yeniden denenecek.'
                : null,
            });
          }),

        toggleReminder: (reminder) =>
          mutate(async () => {
            await appRepository.setReminderCompleted(reminder, !reminder.completed);
          }),

        deleteReminder: (id) => mutate(() => appRepository.deleteReminder(id)),

        saveBodyCondition: (partKey, condition, note) =>
          mutate(async () => {
            const vehicle = activeVehicle();
            if (!vehicle) throw new Error('Aktif araç yok.');
            await appRepository.saveBodyCondition(vehicle, partKey, condition, note);
          }),

        saveExpertise: (draft, id) =>
          mutate(async () => {
            const vehicleId = get().activeVehicleId;
            if (!vehicleId) throw new Error('Aktif araç yok.');
            await appRepository.saveExpertise(vehicleId, draft, id);
          }),

        deleteExpertise: (id) => mutate(() => appRepository.deleteExpertise(id)),

        saveNote: (draft, id) =>
          mutate(async () => {
            const vehicleId = get().activeVehicleId;
            if (!vehicleId) throw new Error('Aktif araç yok.');
            await appRepository.saveNote(vehicleId, draft, id);
          }),

        deleteNote: (id) => mutate(() => appRepository.deleteNote(id)),

        saveDocument: (draft, id) =>
          mutate(async () => {
            const vehicleId = get().activeVehicleId;
            if (!vehicleId) throw new Error('Aktif araç yok.');
            await appRepository.saveDocument(vehicleId, draft, id);
          }),

        deleteDocument: (id) => mutate(() => appRepository.deleteDocument(id)),

        clearSection: (section) =>
          mutate(async () => {
            const vehicleId = get().activeVehicleId;
            if (!vehicleId) throw new Error('Aktif araç yok.');
            await appRepository.clearVehicleSection(vehicleId, section);
          }),

        clear: () =>
          set({
            vehicles: [],
            activeVehicleId: null,
            bootstrapped: false,
            bootstrapError: null,
            lastReminderNotice: null,
            lastBootstrapDurationMs: null,
            ...emptyVehicleData,
          }),
        clearError: () => set({ error: null }),
        setHydrated: () => set({ hydrated: true }),
      };
    },
    {
      name: 'aracim-cepte-preferences',
      storage: createJSONStorage(() => createSafeStringStorage(AsyncStorage)),
      partialize: (state) => ({
        activeVehicleId: state.activeVehicleId,
        onboardingSeen: state.onboardingSeen,
      }),
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    },
  ),
);
