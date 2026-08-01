import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  BodyCondition,
  BodyPartCondition,
  DocumentDraft,
  ExpertiseDraft,
  ExpertiseReport,
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
import { getFriendlyError } from '@/shared/utils/errors';
import { createSafeStringStorage } from '@/data/storage/safeStorage';
import { canStartMutation } from '@/shared/utils/repositoryRules';

interface DataState {
  vehicles: Vehicle[];
  activeVehicleId: string | null;
  records: VehicleRecord[];
  reminders: Reminder[];
  bodyConditions: BodyPartCondition[];
  expertiseReports: ExpertiseReport[];
  notes: VehicleNote[];
  documents: VehicleDocument[];
  onboardingSeen: boolean;
  hydrated: boolean;
  bootstrapped: boolean;
  loading: boolean;
  error: string | null;
  setOnboardingSeen: () => void;
  setActiveVehicle: (id: string) => Promise<void>;
  bootstrap: () => Promise<void>;
  refresh: () => Promise<void>;
  saveVehicle: (draft: VehicleDraft, id?: string) => Promise<boolean>;
  deleteVehicle: (id: string) => Promise<boolean>;
  saveRecord: (draft: RecordDraft, id?: string) => Promise<boolean>;
  deleteRecord: (id: string) => Promise<boolean>;
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
};

export const useDataStore = create<DataState>()(
  persist(
    (set, get) => {
      const loadActiveData = async (vehicleId: string) => {
        const bundle = await appRepository.loadVehicleData(vehicleId);
        set(bundle);
      };
      const mutate = async (operation: () => Promise<void>): Promise<boolean> => {
        if (!canStartMutation(get().loading)) return false;
        set({ loading: true, error: null });
        try {
          await operation();
          const activeId = get().activeVehicleId;
          const vehicles = await appRepository.listVehicles();
          set({ vehicles });
          if (activeId && vehicles.some((vehicle) => vehicle.id === activeId)) {
            await loadActiveData(activeId);
          }
          set({ loading: false });
          return true;
        } catch (error) {
          set({ loading: false, error: getFriendlyError(error) });
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
        loading: false,
        error: null,

        setOnboardingSeen: () => set({ onboardingSeen: true }),

        setActiveVehicle: async (id) => {
          set({ activeVehicleId: id, loading: true, error: null });
          try {
            await loadActiveData(id);
            set({ loading: false });
          } catch (error) {
            set({ loading: false, error: getFriendlyError(error), ...emptyVehicleData });
          }
        },

        bootstrap: async () => {
          set({ loading: true, error: null });
          try {
            const vehicles = await appRepository.listVehicles();
            const persistedId = get().activeVehicleId;
            const activeVehicleId =
              vehicles.find((vehicle) => vehicle.id === persistedId)?.id ?? vehicles[0]?.id ?? null;
            set({ vehicles, activeVehicleId });
            if (activeVehicleId) await loadActiveData(activeVehicleId);
            else set(emptyVehicleData);
            set({ loading: false, bootstrapped: true });
          } catch (error) {
            set({ loading: false, bootstrapped: true, error: getFriendlyError(error) });
          }
        },

        refresh: async () => {
          const id = get().activeVehicleId;
          if (!id) return get().bootstrap();
          set({ loading: true, error: null });
          try {
            await loadActiveData(id);
            set({ vehicles: await appRepository.listVehicles(), loading: false });
          } catch (error) {
            set({ loading: false, error: getFriendlyError(error) });
          }
        },

        saveVehicle: (draft, id) =>
          mutate(async () => {
            const saved = await appRepository.saveVehicle(draft, id);
            set({ activeVehicleId: saved.id });
          }),

        deleteVehicle: (id) =>
          mutate(async () => {
            await appRepository.deleteVehicle(id);
            set({ activeVehicleId: null, ...emptyVehicleData });
          }),

        saveRecord: (draft, id) =>
          mutate(async () => {
            const vehicleId = get().activeVehicleId;
            if (!vehicleId) throw new Error('Aktif araç yok.');
            await appRepository.saveRecord(vehicleId, draft, id);
          }),

        deleteRecord: (id) => mutate(() => appRepository.deleteRecord(id)),

        saveReminder: (draft, id) =>
          mutate(async () => {
            const vehicleId = get().activeVehicleId;
            if (!vehicleId) throw new Error('Aktif araç yok.');
            await appRepository.saveReminder(vehicleId, draft, id);
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
          set({ vehicles: [], activeVehicleId: null, bootstrapped: false, ...emptyVehicleData }),
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
