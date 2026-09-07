import type { Reminder, Vehicle } from '@/domain/entities';

export type ReminderNotificationDestination =
  { pathname: '/reminder/edit'; params: { id: string } } | { pathname: '/(tabs)/reminders' };

export interface ReminderNotificationTap {
  notificationIdentifier: unknown;
  data: unknown;
}

export interface ReminderNotificationRoute {
  destination: ReminderNotificationDestination;
  vehicleId: string | null;
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function notificationData(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/** Data embedded in every newly scheduled reminder notification. */
export function createReminderNotificationData(
  reminder: Pick<Reminder, 'id' | 'vehicleId'>,
  vehicleDisplayName?: string,
): Record<string, string> {
  const data: Record<string, string> = {
    route: '/(tabs)/reminders',
    reminderId: reminder.id,
    vehicleId: reminder.vehicleId,
  };
  const vehicleName = nonEmptyString(vehicleDisplayName);
  if (vehicleName) data.vehicleName = vehicleName;
  return data;
}

/**
 * Resolves a tap only to a vehicle currently owned by the authenticated user.
 * The identifier fallback keeps notifications scheduled by older builds usable.
 */
export function getReminderNotificationRoute(
  tap: ReminderNotificationTap,
  vehicles: readonly Pick<Vehicle, 'id'>[],
  activeVehicleId: string | null,
  activeVehicleReminders: readonly Reminder[],
): ReminderNotificationRoute {
  const data = notificationData(tap.data);
  const reminderId = nonEmptyString(data.reminderId);
  const payloadVehicleId = nonEmptyString(data.vehicleId);
  const ownedVehicleId =
    payloadVehicleId && vehicles.some((vehicle) => vehicle.id === payloadVehicleId)
      ? payloadVehicleId
      : null;

  if (reminderId && ownedVehicleId) {
    return {
      vehicleId: ownedVehicleId,
      destination: { pathname: '/reminder/edit', params: { id: reminderId } },
    };
  }

  const legacyReminder = activeVehicleReminders.find(
    (item) =>
      item.notificationId === nonEmptyString(tap.notificationIdentifier) && Boolean(item.id),
  );
  if (legacyReminder) {
    return {
      vehicleId: activeVehicleId,
      destination: { pathname: '/reminder/edit', params: { id: legacyReminder.id } },
    };
  }

  return { vehicleId: null, destination: { pathname: '/(tabs)/reminders' } };
}

export async function routeReminderNotificationTap(
  tap: ReminderNotificationTap,
  context: {
    vehicles: readonly Pick<Vehicle, 'id'>[];
    activeVehicleId: string | null;
    activeVehicleReminders: readonly Reminder[];
    setActiveVehicle: (vehicleId: string) => Promise<void>;
    navigate: (destination: ReminderNotificationDestination) => void;
  },
): Promise<ReminderNotificationRoute> {
  const route = getReminderNotificationRoute(
    tap,
    context.vehicles,
    context.activeVehicleId,
    context.activeVehicleReminders,
  );
  if (route.vehicleId && route.vehicleId !== context.activeVehicleId) {
    await context.setActiveVehicle(route.vehicleId);
  }
  context.navigate(route.destination);
  return route;
}

/** Backward-compatible helper retained for notifications scheduled by older builds. */
export function getReminderNotificationDestination(
  notificationIdentifier: unknown,
  reminders: readonly Reminder[],
): ReminderNotificationDestination {
  return getReminderNotificationRoute({ notificationIdentifier, data: null }, [], null, reminders)
    .destination;
}
