import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { AppButton, AppHeader, EmptyState, Screen, SectionHeader } from '@/shared/components/ui';
import { ReminderCard } from '@/shared/components/entityCards';
import { getReminderStatus } from '@/shared/utils/analytics';
import { useDataStore } from '@/store/dataStore';
import { spacing } from '@/shared/theme';

const urgency = { overdue: 0, upcoming: 1, planned: 2, completed: 3 };

export default function RemindersScreen() {
  const { reminders, vehicles, activeVehicleId, toggleReminder } = useDataStore();
  const vehicle = vehicles.find((item) => item.id === activeVehicleId);
  if (!vehicle) return null;
  const sorted = [...reminders].sort(
    (a, b) =>
      urgency[getReminderStatus(a, vehicle.currentKm)] -
      urgency[getReminderStatus(b, vehicle.currentKm)],
  );
  const active = sorted.filter((reminder) => !reminder.completed);
  const completed = sorted.filter((reminder) => reminder.completed);
  return (
    <Screen>
      <AppHeader title="Hatırlatıcılar" subtitle="Tarih ve kilometre planlarınız" />
      <AppButton
        title="Yeni hatırlatıcı"
        icon="add"
        onPress={() => router.push('/reminder/edit')}
      />
      <SectionHeader title="Aktif" />
      {active.length ? (
        <View style={styles.list}>
          {active.map((reminder) => (
            <ReminderCard
              key={reminder.id}
              reminder={reminder}
              currentKm={vehicle.currentKm}
              onToggle={() => void toggleReminder(reminder)}
              onPress={() =>
                router.push({ pathname: '/reminder/edit', params: { id: reminder.id } })
              }
            />
          ))}
        </View>
      ) : (
        <EmptyState
          title="Aktif hatırlatıcı yok"
          message="Muayene, sigorta veya bakım tarihlerinizi planlayın."
          icon="notifications-outline"
        />
      )}
      {completed.length ? (
        <>
          <SectionHeader title="Tamamlananlar" />
          <View style={styles.list}>
            {completed.map((reminder) => (
              <ReminderCard
                key={reminder.id}
                reminder={reminder}
                currentKm={vehicle.currentKm}
                onToggle={() => void toggleReminder(reminder)}
                onPress={() =>
                  router.push({ pathname: '/reminder/edit', params: { id: reminder.id } })
                }
              />
            ))}
          </View>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({ list: { gap: spacing.md } });
