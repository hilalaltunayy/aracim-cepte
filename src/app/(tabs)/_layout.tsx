import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontFamilies, radii, shadows } from '@/shared/theme';

const icons = {
  index: ['home-outline', 'home'],
  history: ['time-outline', 'time'],
  vehicle: ['car-outline', 'car'],
  reminders: ['notifications-outline', 'notifications'],
  settings: ['settings-outline', 'settings'],
} as const;

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          position: 'absolute',
          marginHorizontal: 12,
          marginBottom: 10,
          height: 68,
          borderRadius: radii.lg,
          borderTopWidth: 0,
          backgroundColor: colors.white,
          paddingTop: 7,
          paddingBottom: 7,
          ...shadows.floating,
        },
        tabBarItemStyle: { borderRadius: radii.md },
        tabBarLabelStyle: { fontSize: 10.5, fontFamily: fontFamilies.semibold },
        tabBarIcon: ({ color, focused, size }) => {
          const pair = icons[route.name as keyof typeof icons] ?? icons.index;
          return <Ionicons name={focused ? pair[1] : pair[0]} color={color} size={size} />;
        },
      })}
    >
      <Tabs.Screen name="index" options={{ title: 'Ana Sayfa' }} />
      <Tabs.Screen name="history" options={{ title: 'Geçmiş' }} />
      <Tabs.Screen name="vehicle" options={{ title: 'Araç' }} />
      <Tabs.Screen name="reminders" options={{ title: 'Hatırlatıcılar' }} />
      <Tabs.Screen name="settings" options={{ title: 'Ayarlar' }} />
    </Tabs>
  );
}
