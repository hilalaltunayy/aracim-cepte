import { describe, expect, it, vi } from 'vitest';
import type { Reminder, Vehicle } from '@/domain/entities';
import {
  createReminderNotificationData,
  getReminderNotificationDestination,
  routeReminderNotificationTap,
} from './notificationRouting';

const reminder = {
  id: 'reminder-id',
  vehicleId: 'vehicle-a',
  notificationId: 'notification-id',
} as Reminder;

const vehicles = [{ id: 'vehicle-a' }, { id: 'vehicle-b' }] as Vehicle[];

describe('reminder notification routing', () => {
  it('opens the reminder matched by the scheduled notification identifier', () => {
    expect(getReminderNotificationDestination('notification-id', [reminder])).toEqual({
      pathname: '/reminder/edit',
      params: { id: 'reminder-id' },
    });
  });

  it('falls back safely for deleted reminders and unsupported payloads', () => {
    expect(getReminderNotificationDestination('deleted-notification', [reminder])).toEqual({
      pathname: '/(tabs)/reminders',
    });
    expect(getReminderNotificationDestination({ unsafe: true }, [reminder])).toEqual({
      pathname: '/(tabs)/reminders',
    });
  });

  it('embeds reminder and vehicle context in newly scheduled notification data', () => {
    expect(createReminderNotificationData(reminder, 'Kia Sportage')).toEqual({
      route: '/(tabs)/reminders',
      reminderId: 'reminder-id',
      vehicleId: 'vehicle-a',
      vehicleName: 'Kia Sportage',
    });
  });

  it('switches from active Vehicle B to notified Vehicle A before routing', async () => {
    const calls: string[] = [];
    const setActiveVehicle = vi.fn(async (vehicleId: string) => {
      calls.push(`switch:${vehicleId}`);
    });
    const navigate = vi.fn((destination: { pathname: string }) => {
      calls.push(`navigate:${destination.pathname}`);
    });

    const route = await routeReminderNotificationTap(
      {
        notificationIdentifier: 'notification-id',
        data: { reminderId: 'reminder-id', vehicleId: 'vehicle-a' },
      },
      {
        vehicles,
        activeVehicleId: 'vehicle-b',
        activeVehicleReminders: [],
        setActiveVehicle,
        navigate,
      },
    );

    expect(calls).toEqual(['switch:vehicle-a', 'navigate:/reminder/edit']);
    expect(route).toEqual({
      vehicleId: 'vehicle-a',
      destination: { pathname: '/reminder/edit', params: { id: 'reminder-id' } },
    });
  });

  it('does not switch to a vehicle that is no longer owned', async () => {
    const setActiveVehicle = vi.fn(async () => undefined);
    const navigate = vi.fn();

    await routeReminderNotificationTap(
      {
        notificationIdentifier: 'unknown',
        data: { reminderId: 'reminder-id', vehicleId: 'deleted-vehicle' },
      },
      {
        vehicles,
        activeVehicleId: 'vehicle-b',
        activeVehicleReminders: [],
        setActiveVehicle,
        navigate,
      },
    );

    expect(setActiveVehicle).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith({ pathname: '/(tabs)/reminders' });
  });
});
