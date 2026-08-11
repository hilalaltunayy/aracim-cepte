import { lazy, Suspense } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { BodyType, VehicleColorId } from '@/domain/entities';
import { getVehicleRenderColor } from '@/features/vehicles/config/vehicleColors';
import { featureFlags } from '@/shared/config/featureFlags';
import { radii, spacing, typography, useThemedStyles, type AppTheme } from '@/shared/theme';
import { VEHICLE_3D_CONFIG } from './config';
import { Vehicle3DErrorBoundary } from './Vehicle3DErrorBoundary';
import { Vehicle3DViewportState } from './Vehicle3DViewportState';
import { getVehicle3DMode } from './vehicle3dMode';

const LazySedan3DScene = lazy(() => import('./Sedan3DScene'));

export interface Vehicle3DRegionProps {
  bodyType?: BodyType | null;
  colorId?: VehicleColorId | null;
  enabled?: boolean;
}

export function Vehicle3DRegion({
  bodyType,
  colorId,
  enabled = featureFlags.vehicle3dEnabled,
}: Vehicle3DRegionProps) {
  const styles = useThemedStyles(createStyles);
  const mode = getVehicle3DMode(enabled, bodyType);
  if (mode === 'disabled') return null;

  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <Text style={styles.title}>Etkileşimli araç görünümü</Text>
        <Text style={styles.hint}>
          Döndürmek için sürükleyin, yakınlaştırmak için iki parmağınızı kullanın.
        </Text>
      </View>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel="Etkileşimli üç boyutlu sedan araç görünümü"
        accessibilityHint="Araç bilgileri bu görselin dışında metin olarak da sunulur."
        style={styles.viewport}
      >
        {mode === 'unsupported' ? (
          <Vehicle3DViewportState state="unsupported" />
        ) : (
          <Vehicle3DErrorBoundary>
            <Suspense fallback={<Vehicle3DViewportState state="loading" />}>
              <LazySedan3DScene vehicleColor={getVehicleRenderColor(colorId)} />
            </Suspense>
          </Vehicle3DErrorBoundary>
        )}
      </View>
    </View>
  );
}

const createStyles = ({ colors }: AppTheme) =>
  StyleSheet.create({
    section: { gap: spacing.md },
    heading: { gap: spacing.xs },
    title: { color: colors.textPrimary, ...typography.sectionTitle },
    hint: { color: colors.textSecondary, ...typography.caption },
    viewport: {
      height: VEHICLE_3D_CONFIG.viewportHeight,
      overflow: 'hidden',
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.diagramBackground,
    },
  });
