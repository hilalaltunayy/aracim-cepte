/* eslint-disable import/first */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { VehicleDraft } from '@/domain/entities';

const mocks = vi.hoisted(() => ({ getSupabaseClient: vi.fn() }));
vi.mock('react-native', () => ({}));
vi.mock('@/data/supabase/client', () => ({ getSupabaseClient: mocks.getSupabaseClient }));
vi.mock('@/features/reminders/notifications', () => ({
  cancelReminderNotification: vi.fn(), cancelUnknownReminderNotifications: vi.fn(), reconcileReminderNotification: vi.fn(),
}));
vi.mock('@/features/reminders/notificationPreferences', () => ({
  removeNotificationPreferences: vi.fn(), setNotificationLeadDays: vi.fn(),
}));
vi.mock('@/data/storage/attachments', () => ({ reconcileAttachments: vi.fn() }));
vi.mock('@/shared/utils/requestId', () => ({ createRequestId: () => 'request-id' }));

import { SupabaseAppRepository } from './SupabaseAppRepository';

const draft: VehicleDraft = {
  brand: 'Kia', model: 'Sportage', year: 2024, plate: '42 ABC 123', currentKm: 12000,
  fuelType: 'gasoline', bodyType: 'suv', colorId: 'white', color: 'Beyaz',
};
const row = {
  id: 'vehicle-a', owner_id: 'owner-a', brand: 'Kia', model: 'Sportage', year: 2024,
  plate: '42 ABC 123', current_km: 12000, fuel_type: 'gasoline', body_type: 'suv', color_id: 'white',
  color: 'Beyaz', archived_at: null, created_at: '2026-08-13T00:00:00.000Z', updated_at: '2026-08-13T00:00:00.000Z',
};

describe('vehicle creation entitlement gateway', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses the server-authoritative RPC for creation, not a direct vehicles insert', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: row, error: null });
    const from = vi.fn();
    mocks.getSupabaseClient.mockReturnValue({ auth: { getUser: vi.fn() }, rpc, from });

    await expect(new SupabaseAppRepository().saveVehicle(draft)).resolves.toMatchObject({ id: 'vehicle-a' });
    expect(rpc).toHaveBeenCalledWith('create_vehicle_with_limit', expect.objectContaining({
      p_brand: 'Kia', p_current_km: 12000, p_body_type: 'suv', p_color_id: 'white',
    }));
    expect(from).not.toHaveBeenCalled();
  });
});
