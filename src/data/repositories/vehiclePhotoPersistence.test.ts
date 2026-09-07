/* eslint-disable import/first */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PendingAttachment } from '@/features/attachments/domain/types';

const mocks = vi.hoisted(() => ({
  getSupabaseClient: vi.fn(),
  uploadParentAttachment: vi.fn(),
}));

vi.mock('react-native', () => ({}));
vi.mock('@/data/supabase/client', () => ({ getSupabaseClient: mocks.getSupabaseClient }));
vi.mock('@/features/reminders/notifications', () => ({
  cancelReminderNotification: vi.fn(),
  cancelUnknownReminderNotifications: vi.fn(),
  reconcileReminderNotification: vi.fn(),
}));
vi.mock('@/features/reminders/notificationPreferences', () => ({
  removeNotificationPreferences: vi.fn(),
  setNotificationLeadDays: vi.fn(),
}));
vi.mock('@/data/storage/attachments', () => ({
  reconcileAttachments: vi.fn(),
  uploadParentAttachment: mocks.uploadParentAttachment,
}));
vi.mock('@/shared/utils/requestId', () => ({ createRequestId: () => 'request-id' }));

import { SupabaseAppRepository } from './SupabaseAppRepository';

const OWNER = 'owner-a';
const VEHICLE = 'vehicle-a';
const PHOTO_ID = 'photo-1';
// The durable object path the upload edge function returns — this is the only
// value that may ever become the canonical profile-photo reference.
const OBJECT_PATH = `${OWNER}/${VEHICLE}/vehicle_photo/${PHOTO_ID}/att-1.jpg`;
const ATTACHMENT_ID = 'att-1';

const localPick: PendingAttachment = {
  id: PHOTO_ID,
  requestId: 'req-1',
  // A transient device URI. It must never reach the database.
  uri: 'file:///data/user/0/app/cache/ImageManipulator/abc.jpg',
  originalName: 'fotograf.jpg',
  mimeType: 'image/jpeg',
  sizeBytes: 42_000,
  source: 'gallery',
};

/** One shared backend state both repository reads resolve from. */
function backend() {
  const vehicles = [
    {
      id: VEHICLE,
      owner_id: OWNER,
      brand: 'Kia',
      model: 'Sportage',
      year: 2024,
      plate: null,
      current_km: 1,
      fuel_type: 'gasoline',
      body_type: 'suv',
      color_id: 'white',
      color: null,
      archived_at: null,
      created_at: '2026-09-01T00:00:00Z',
      updated_at: '2026-09-01T00:00:00Z',
    },
  ];
  const vehiclePhotos: Record<string, unknown>[] = [];
  const attachments: Record<string, unknown>[] = [];

  const table = (name: string) => {
    const rows =
      name === 'vehicles' ? vehicles : name === 'vehicle_photos' ? vehiclePhotos : attachments;
    const builder: Record<string, unknown> = {};
    let filtered = [...rows];
    const chain = () => builder;
    builder.select = chain;
    builder.eq = (col: string, val: unknown) => {
      filtered = filtered.filter((r) => (r as Record<string, unknown>)[col] === val);
      return builder;
    };
    builder.in = (col: string, vals: unknown[]) => {
      filtered = filtered.filter((r) => vals.includes((r as Record<string, unknown>)[col]));
      return builder;
    };
    builder.is = (col: string, val: unknown) => {
      filtered = filtered.filter((r) => (r as Record<string, unknown>)[col] === val);
      return builder;
    };
    builder.order = chain;
    builder.then = (resolve: (value: { data: unknown; error: null }) => void) =>
      resolve({ data: filtered, error: null });
    return builder;
  };

  const rpc = vi.fn(async (name: string, args: Record<string, unknown>) => {
    if (name === 'save_vehicle_photo') {
      // The server only ever receives the object path, never the local uri.
      expect(args.p_attachment_path).toBe(OBJECT_PATH);
      attachments.push({
        id: ATTACHMENT_ID,
        owner_id: OWNER,
        vehicle_id: VEHICLE,
        parent_type: 'vehicle_photo',
        parent_id: args.p_photo_id,
        source: 'gallery',
        original_filename: 'fotograf.jpg',
        storage_path: args.p_attachment_path,
        mime_type: 'image/jpeg',
        size_bytes: 42_000,
        created_at: '2026-09-02T00:00:00Z',
      });
      vehiclePhotos.push({
        id: args.p_photo_id,
        owner_id: OWNER,
        vehicle_id: VEHICLE,
        attachment_id: ATTACHMENT_ID,
        is_primary: true,
        sort_order: 0,
        created_at: '2026-09-02T00:00:00Z',
        updated_at: '2026-09-02T00:00:00Z',
      });
      return { data: vehiclePhotos[0], error: null };
    }
    throw new Error(`unexpected rpc ${name}`);
  });

  return {
    client: { auth: { getUser: vi.fn(async () => ({ data: { user: { id: OWNER } } })) }, from: table, rpc },
    vehiclePhotos,
    attachments,
  };
}

describe('vehicle profile photo — durable persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.uploadParentAttachment.mockResolvedValue({
      path: OBJECT_PATH,
      attachmentId: ATTACHMENT_ID,
    });
  });

  it('persists the storage object path as the canonical value, never the local file:// uri', async () => {
    const state = backend();
    mocks.getSupabaseClient.mockReturnValue(state.client);

    await new SupabaseAppRepository().saveVehiclePhoto(VEHICLE, localPick);

    expect(state.attachments[0].storage_path).toBe(OBJECT_PATH);
    expect(JSON.stringify(state.vehiclePhotos)).not.toContain('file://');
    expect(JSON.stringify(state.attachments)).not.toContain('file://');
  });

  it('rehydrates the same photo from the backend after a fresh repository/bootstrap', async () => {
    const state = backend();
    mocks.getSupabaseClient.mockReturnValue(state.client);
    await new SupabaseAppRepository().saveVehiclePhoto(VEHICLE, localPick);

    // A brand-new repository instance == a cold app start with no in-memory state.
    const afterRestart = new SupabaseAppRepository();
    const photos = await afterRestart.listVehiclePhotos(VEHICLE);
    expect(photos).toHaveLength(1);
    expect(photos[0].storagePath).toBe(OBJECT_PATH);
    expect(photos[0].isPrimary).toBe(true);
  });

  it('resolves the header avatar and the "Profil fotoğrafı" section from one backend source', async () => {
    const state = backend();
    mocks.getSupabaseClient.mockReturnValue(state.client);
    await new SupabaseAppRepository().saveVehiclePhoto(VEHICLE, localPick);

    const repository = new SupabaseAppRepository();
    const [vehicles, galleryPhotos] = await Promise.all([
      repository.listVehicles(), // header/avatar reads vehicle.primaryPhoto
      repository.listVehiclePhotos(VEHICLE), // gallery section reads this
    ]);

    const primary = galleryPhotos.find((photo) => photo.isPrimary);
    expect(vehicles[0].primaryPhoto?.storagePath).toBe(OBJECT_PATH);
    expect(primary?.storagePath).toBe(OBJECT_PATH);
    // Same object path, same photo id — not two independent sources.
    expect(vehicles[0].primaryPhoto?.id).toBe(primary?.id);
  });

  it('does not fabricate a primary photo for a vehicle that has none', async () => {
    const state = backend();
    mocks.getSupabaseClient.mockReturnValue(state.client);

    const vehicles = await new SupabaseAppRepository().listVehicles();
    expect(vehicles[0].primaryPhoto ?? null).toBeNull();
  });
});
