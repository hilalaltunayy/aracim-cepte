import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
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
  VehiclePhoto,
  VehicleRecord,
} from '@/domain/entities';
import type { PendingAttachment } from '@/features/attachments/domain/types';
import { appRepository } from '@/data/repositories/SupabaseAppRepository';
import { getFriendlyError, isSessionExpiredError } from '@/shared/utils/errors';
import { createSafeStringStorage } from '@/data/storage/safeStorage';
import { canStartMutation, requiresVehicleMileageCorrection } from '@/shared/utils/repositoryRules';
import { evaluateMileageTimeline } from '@/shared/utils/mileageTimeline';
import { useAuthStore } from '@/store/authStore';
import { resolveActiveVehicleId } from '@/shared/utils/vehicleState';
import {
  FREE_ENTITLEMENTS,
  type PlanEntitlements,
} from '@/features/entitlements/domain/entitlements';
import {
  resolveEntitlementSnapshot,
  type EntitlementMirrorStatus,
  type EntitlementStatus,
  type StoreEntitlementStatus,
} from '@/features/entitlements/domain/entitlementResolution';
import { loadEntitlementMirrorStatus } from '@/features/entitlements/services/entitlementService';
import { reconcileEntitlement } from '@/features/entitlements/services/entitlementReconciliation';
import {
  canApplyVehicleData,
  getVehicleCreationGate,
  getVehicleDisplayName,
} from '@/features/vehicles/domain/multiVehicle';
import { getVehicleWriteTargetError } from '@/features/vehicles/domain/vehicleWriteTarget';
import { reminderWriteNeedsCustomTimeEntitlement } from '@/features/reminders/reminderSchedulePreferences';
import { useAssistantSessionStore } from '@/features/vehicleAssistant/state/assistantSessionStore';
import {
  DEFAULT_REPORT_PERIOD_ID,
  isReportPeriodId,
  sanitizeStoredReportPeriod,
  type ReportPeriodId,
} from '@/features/reports/domain/vehicleReports';

interface DataState {
  vehicles: Vehicle[];
  activeVehicleId: string | null;
  /** Effective plan limits for display. Fail-closed to Free while unresolved. */
  entitlements: Readonly<PlanEntitlements>;
  /**
   * Canonical resolved plan. `unknown` means entitlement is still being read —
   * screens must show a short loading state, never the Free upgrade lock.
   */
  entitlementStatus: EntitlementStatus;
  /** The store says Premium but the trusted mirror has not caught up yet. */
  entitlementAwaitingSync: boolean;
  /**
   * The trusted `user_entitlements` mirror confirms the plan, so server-enforced
   * operations (vehicle create, custom reminder time, quotas) will accept it.
   * Premium that is only known from the store is not yet server-authoritative.
   */
  entitlementServerConfirmed: boolean;
  /** Raw trusted-mirror answer, kept so the two sources stay separable. */
  entitlementMirror: EntitlementMirrorStatus;
  /** Raw RevenueCat answer, pushed in by the single app-level billing bridge. */
  billingStatus: StoreEntitlementStatus;
  records: VehicleRecord[];
  reminders: Reminder[];
  bodyConditions: BodyPartCondition[];
  expertiseReports: ExpertiseReport[];
  notes: VehicleNote[];
  documents: VehicleDocument[];
  maintenanceTemplates: MaintenanceTemplate[];
  vehiclePhotos: VehiclePhoto[];
  onboardingSeen: boolean;
  /** Last report period the user chose; persisted so Reports reopens on it. */
  reportPeriodId: ReportPeriodId;
  hydrated: boolean;
  bootstrapped: boolean;
  bootstrapError: string | null;
  loading: boolean;
  error: string | null;
  lastReminderNotice: string | null;
  lastBootstrapDurationMs: number | null;
  setOnboardingSeen: () => void;
  setReportPeriod: (id: ReportPeriodId) => void;
  /** Single entry point for RevenueCat state; only the app-level bridge calls it. */
  applyBillingStatus: (status: StoreEntitlementStatus) => void;
  /** Re-reads the trusted mirror, reconciling with the store first when it lags. */
  syncEntitlements: () => Promise<void>;
  setActiveVehicle: (id: string) => Promise<void>;
  bootstrap: () => Promise<void>;
  refresh: () => Promise<void>;
  saveVehicle: (
    draft: VehicleDraft,
    id?: string,
    options?: { allowMileageDecrease?: boolean },
  ) => Promise<boolean>;
  deleteVehicle: (id: string) => Promise<boolean>;
  /**
   * Vehicle-scoped writes take the target vehicle explicitly.
   *
   * The caller captured it when the form opened (or read it off the record
   * being edited), so switching the active vehicle mid-form cannot retarget
   * the write. Passing a vehicle this account no longer owns fails loudly
   * rather than falling back to whatever is active.
   */
  saveVehiclePhoto: (
    targetVehicleId: string | null,
    attachment: PendingAttachment,
    replacesPhotoId?: string,
  ) => Promise<boolean>;
  setVehiclePhotoPrimary: (id: string) => Promise<boolean>;
  deleteVehiclePhoto: (id: string) => Promise<boolean>;
  saveRecord: (
    targetVehicleId: string | null,
    draft: RecordDraft,
    id?: string,
    requestId?: string,
  ) => Promise<boolean>;
  deleteRecord: (id: string) => Promise<boolean>;
  saveMaintenanceTemplate: (draft: MaintenanceTemplateDraft, id?: string) => Promise<boolean>;
  deleteMaintenanceTemplate: (id: string) => Promise<boolean>;
  saveReminder: (
    targetVehicleId: string | null,
    draft: ReminderDraft,
    id?: string,
  ) => Promise<boolean>;
  toggleReminder: (reminder: Reminder) => Promise<boolean>;
  deleteReminder: (id: string) => Promise<boolean>;
  saveBodyCondition: (
    targetVehicleId: string | null,
    partKey: string,
    conditions: BodyPartCondition['conditions'],
    note: string | null,
  ) => Promise<boolean>;
  saveExpertise: (
    targetVehicleId: string | null,
    draft: ExpertiseDraft,
    id?: string,
  ) => Promise<boolean>;
  deleteExpertise: (id: string) => Promise<boolean>;
  saveNote: (targetVehicleId: string | null, draft: NoteDraft, id?: string) => Promise<boolean>;
  deleteNote: (id: string) => Promise<boolean>;
  saveDocument: (
    targetVehicleId: string | null,
    draft: DocumentDraft,
    id?: string,
  ) => Promise<boolean>;
  deleteDocument: (id: string) => Promise<boolean>;
  clearSection: (
    targetVehicleId: string | null,
    section: 'records' | 'reminders' | 'body' | 'documents',
  ) => Promise<boolean>;
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
  vehiclePhotos: [],
};

export const useDataStore = create<DataState>()(
  persist(
    (set, get) => {
      let vehicleLoadSequence = 0;
      // One in-flight reconciliation at a time. The gap is closed by asking the
      // server once, not by retrying from every screen that notices it.
      let reconciling: Promise<void> | null = null;
      /** Recomputes the one canonical answer from the two raw sources. */
      const applyEntitlementSources = (
        mirror: EntitlementMirrorStatus,
        billing: StoreEntitlementStatus,
      ) => {
        const snapshot = resolveEntitlementSnapshot(mirror, billing);
        set({
          entitlementMirror: mirror,
          billingStatus: billing,
          entitlements: snapshot.entitlements,
          entitlementStatus: snapshot.status,
          entitlementAwaitingSync: snapshot.awaitingServerSync,
          entitlementServerConfirmed: snapshot.serverConfirmed,
        });
      };
      const handleError = (error: unknown) => {
        if (isSessionExpiredError(error)) useAuthStore.getState().markSessionExpired();
        return getFriendlyError(error);
      };
      const loadActiveData = async (vehicleId: string) => {
        const loadSequence = ++vehicleLoadSequence;
        const bundle = await appRepository.loadVehicleData(vehicleId);
        if (
          !canApplyVehicleData(get().activeVehicleId, vehicleId, loadSequence, vehicleLoadSequence)
        )
          return;
        set(bundle);
        const vehicle = get().vehicles.find((item) => item.id === vehicleId);
        void appRepository
          .reconcileVehicleData(
            vehicleId,
            bundle.reminders,
            vehicle ? getVehicleDisplayName(vehicle) : undefined,
          )
          .then((reconciled) => {
            if (
              canApplyVehicleData(
                get().activeVehicleId,
                vehicleId,
                loadSequence,
                vehicleLoadSequence,
              )
            )
              set(reconciled);
          })
          .catch(() => undefined);
      };
      const reloadAvailableData = async () => {
        const [vehicles, mirror] = await Promise.all([
          appRepository.listVehicles(),
          loadEntitlementMirrorStatus(),
        ]);
        const activeVehicleId = resolveActiveVehicleId(vehicles, get().activeVehicleId);
        set({ vehicles, activeVehicleId, ...emptyVehicleData });
        applyEntitlementSources(mirror, get().billingStatus);
        if (activeVehicleId) await loadActiveData(activeVehicleId);
        else set(emptyVehicleData);
      };
      const reloadVehiclePhotos = async (vehicleId: string) => {
        const [vehicles, vehiclePhotos] = await Promise.all([
          appRepository.listVehicles(),
          appRepository.listVehiclePhotos(vehicleId),
        ]);
        if (get().activeVehicleId === vehicleId) set({ vehicles, vehiclePhotos });
        else set({ vehicles });
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
      /**
       * Validates a caller-supplied write target and reports why it is unusable.
       *
       * Returns the id only when this account still owns it, so a form left
       * open across a vehicle switch, a vehicle deletion or a sign-out fails
       * with a clear message instead of silently writing somewhere else.
       */
      const resolveWriteTarget = (targetVehicleId: string | null): string | null => {
        const failure = getVehicleWriteTargetError(targetVehicleId, get().vehicles);
        if (failure) {
          set({ error: failure });
          return null;
        }
        return targetVehicleId;
      };

      return {
        vehicles: [],
        activeVehicleId: null,
        // Limits fail closed to Free, but the *status* starts unknown so no
        // screen renders an entitled user through the Free upgrade lock while
        // the mirror and the store are still answering.
        entitlements: FREE_ENTITLEMENTS,
        entitlementStatus: 'unknown',
        entitlementAwaitingSync: false,
        entitlementServerConfirmed: false,
        entitlementMirror: 'unknown',
        billingStatus: 'unknown',
        ...emptyVehicleData,
        onboardingSeen: false,
        reportPeriodId: DEFAULT_REPORT_PERIOD_ID,
        hydrated: false,
        bootstrapped: false,
        bootstrapError: null,
        loading: false,
        error: null,
        lastReminderNotice: null,
        lastBootstrapDurationMs: null,

        setOnboardingSeen: () => set({ onboardingSeen: true }),

        setReportPeriod: (id) => {
          if (isReportPeriodId(id)) set({ reportPeriodId: id });
        },

        applyBillingStatus: (status) => {
          if (get().billingStatus === status) return;
          applyEntitlementSources(get().entitlementMirror, status);
        },

        syncEntitlements: async () => {
          if (reconciling) return reconciling;
          reconciling = (async () => {
            try {
              // Only pay for a round-trip when the two sources actually disagree;
              // otherwise re-reading the mirror is enough.
              if (get().entitlementAwaitingSync) await reconcileEntitlement();
              applyEntitlementSources(await loadEntitlementMirrorStatus(), get().billingStatus);
            } finally {
              reconciling = null;
            }
          })();
          return reconciling;
        },

        setActiveVehicle: async (id) => {
          const nextId = resolveActiveVehicleId(get().vehicles, id);
          if (!nextId) {
            set({ activeVehicleId: null, ...emptyVehicleData });
            return;
          }
          set({ activeVehicleId: nextId, loading: true, error: null, ...emptyVehicleData });
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
            const [vehicles, mirror] = await Promise.all([
              appRepository.listVehicles(),
              loadEntitlementMirrorStatus(),
            ]);
            const activeVehicleId = resolveActiveVehicleId(vehicles, get().activeVehicleId);
            set({ vehicles, activeVehicleId, ...emptyVehicleData });
            applyEntitlementSources(mirror, get().billingStatus);
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
          const creationGate = getVehicleCreationGate(
            get().vehicles.length,
            get().entitlementStatus,
            get().entitlements,
            get().entitlementServerConfirmed,
          );
          if (!id && creationGate.status === 'verifying') {
            // Store-only Premium: pull the trusted mirror so the next attempt is
            // decided by the server-authoritative plan, not a client guess the
            // server would reject with a false "limit reached".
            if (creationGate.reason === 'server_confirmation') void get().syncEntitlements();
            set({
              error: 'Araç ekleme hakkınız doğrulanıyor. Lütfen kısa süre sonra tekrar deneyin.',
            });
            return Promise.resolve(false);
          }
          if (!id && creationGate.status === 'limit_reached') {
            set({
              error: `Planınızda en fazla ${creationGate.capacity.maximum} araç ekleyebilirsiniz.`,
            });
            return Promise.resolve(false);
          }
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
            useAssistantSessionStore.getState().clearVehicleSession(id);
          }),

        saveVehiclePhoto: async (targetVehicleId, attachment, replacesPhotoId) => {
          const vehicleId = resolveWriteTarget(targetVehicleId);
          if (!vehicleId || !canStartMutation(get().loading)) return false;
          if (
            !replacesPhotoId &&
            get().vehiclePhotos.length >= get().entitlements.maxVehiclePhotos
          ) {
            set({
              error: `Planınızda en fazla ${get().entitlements.maxVehiclePhotos} araç fotoğrafı ekleyebilirsiniz.`,
            });
            return false;
          }
          set({ loading: true, error: null });
          try {
            await appRepository.saveVehiclePhoto(vehicleId, attachment, replacesPhotoId);
            await reloadVehiclePhotos(vehicleId);
            set({ loading: false });
            return true;
          } catch (error) {
            set({ loading: false, error: handleError(error) });
            return false;
          }
        },

        setVehiclePhotoPrimary: async (id) => {
          if (!canStartMutation(get().loading)) return false;
          const photo = get().vehiclePhotos.find((item) => item.id === id);
          if (!photo) return false;
          set({ loading: true, error: null });
          try {
            await appRepository.setVehiclePhotoPrimary(id);
            await reloadVehiclePhotos(photo.vehicleId);
            set({ loading: false });
            return true;
          } catch (error) {
            set({ loading: false, error: handleError(error) });
            return false;
          }
        },

        deleteVehiclePhoto: async (id) => {
          if (!canStartMutation(get().loading)) return false;
          const photo = get().vehiclePhotos.find((item) => item.id === id);
          if (!photo) return false;
          set({ loading: true, error: null });
          try {
            const deleted = await appRepository.deleteVehiclePhoto(id);
            if (deleted) await reloadVehiclePhotos(photo.vehicleId);
            set({ loading: false });
            return deleted;
          } catch (error) {
            set({ loading: false, error: handleError(error) });
            return false;
          }
        },

        saveRecord: (targetVehicleId, draft, id, requestId) => {
          const vehicleId = resolveWriteTarget(targetVehicleId);
          if (!vehicleId) return Promise.resolve(false);
          const vehicle = get().vehicles.find((item) => item.id === vehicleId) ?? null;
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

        saveReminder: (targetVehicleId, draft, id) => {
          const vehicleId = resolveWriteTarget(targetVehicleId);
          if (!vehicleId) return Promise.resolve(false);
          const vehicle = get().vehicles.find((item) => item.id === vehicleId);
          const existingReminder = id
            ? get().reminders.find((reminder) => reminder.id === id)
            : null;
          return mutate(async () => {
            // Store-only Premium choosing a new custom time: confirm the trusted
            // mirror first so `enforce_reminder_due_time_entitlement` accepts it
            // on this attempt, instead of the user waiting out the webhook and
            // tapping Save again. A genuinely Free/expired plan still fails here.
            if (
              get().entitlementStatus === 'premium' &&
              !get().entitlementServerConfirmed &&
              reminderWriteNeedsCustomTimeEntitlement(draft.dueTime, existingReminder?.dueTime)
            ) {
              await get().syncEntitlements();
            }
            const saved = await appRepository.saveReminder(
              vehicleId,
              draft,
              id,
              vehicle ? getVehicleDisplayName(vehicle) : undefined,
            );
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
          });
        },

        toggleReminder: (reminder) => {
          const vehicle = get().vehicles.find((item) => item.id === reminder.vehicleId);
          return mutate(async () => {
            await appRepository.setReminderCompleted(
              reminder,
              !reminder.completed,
              vehicle ? getVehicleDisplayName(vehicle) : undefined,
            );
          });
        },

        deleteReminder: (id) => mutate(() => appRepository.deleteReminder(id)),

        saveBodyCondition: (targetVehicleId, partKey, conditions, note) => {
          const vehicleId = resolveWriteTarget(targetVehicleId);
          const vehicle = get().vehicles.find((item) => item.id === vehicleId) ?? null;
          if (!vehicle) return Promise.resolve(false);
          return mutate(async () => {
            await appRepository.saveBodyCondition(vehicle, partKey, conditions, note);
          });
        },

        saveExpertise: (targetVehicleId, draft, id) => {
          const vehicleId = resolveWriteTarget(targetVehicleId);
          if (!vehicleId) return Promise.resolve(false);
          return mutate(async () => {
            await appRepository.saveExpertise(vehicleId, draft, id);
          });
        },

        deleteExpertise: (id) => mutate(() => appRepository.deleteExpertise(id)),

        saveNote: (targetVehicleId, draft, id) => {
          const vehicleId = resolveWriteTarget(targetVehicleId);
          if (!vehicleId) return Promise.resolve(false);
          return mutate(async () => {
            await appRepository.saveNote(vehicleId, draft, id);
          });
        },

        deleteNote: (id) => mutate(() => appRepository.deleteNote(id)),

        saveDocument: (targetVehicleId, draft, id) => {
          const vehicleId = resolveWriteTarget(targetVehicleId);
          if (!vehicleId) return Promise.resolve(false);
          return mutate(async () => {
            await appRepository.saveDocument(vehicleId, draft, id);
          });
        },

        deleteDocument: (id) => mutate(() => appRepository.deleteDocument(id)),

        clearSection: (targetVehicleId, section) => {
          const vehicleId = resolveWriteTarget(targetVehicleId);
          if (!vehicleId) return Promise.resolve(false);
          return mutate(async () => {
            await appRepository.clearVehicleSection(vehicleId, section);
          });
        },

        clear: () =>
          // Sign-out must drop the previous account's entitlement entirely, or
          // the next account inherits it until its own bootstrap finishes.
          set({
            vehicles: [],
            activeVehicleId: null,
            bootstrapped: false,
            bootstrapError: null,
            lastReminderNotice: null,
            lastBootstrapDurationMs: null,
            entitlements: FREE_ENTITLEMENTS,
            entitlementStatus: 'unknown',
            entitlementAwaitingSync: false,
            entitlementServerConfirmed: false,
            entitlementMirror: 'unknown',
            billingStatus: 'unknown',
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
        reportPeriodId: state.reportPeriodId,
      }),
      // A stored period id from an older build (or a corrupted value) falls back
      // to the product default instead of being trusted blindly.
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<DataState>;
        return {
          ...current,
          ...saved,
          reportPeriodId: sanitizeStoredReportPeriod(saved.reportPeriodId),
        };
      },
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    },
  ),
);
