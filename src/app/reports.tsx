import { router } from 'expo-router';
import { VehicleReportsScreen } from '@/features/reports/components/VehicleReportsScreen';

export default function ReportsRoute() {
  return <VehicleReportsScreen onUpgrade={() => router.push('/premium' as never)} />;
}
