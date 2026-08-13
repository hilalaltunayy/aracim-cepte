import { useEffect, useState } from 'react';
import { Image, ImageStyle, StyleProp, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createPrivateAttachmentUrl } from '@/data/storage/attachments';
import { radii, useAppTheme } from '@/shared/theme';

export function VehiclePhotoImage({
  storagePath,
  style,
  accessibilityLabel,
}: {
  storagePath: string | null | undefined;
  style: StyleProp<ImageStyle>;
  accessibilityLabel: string;
}) {
  const { colors } = useAppTheme();
  const [signedImage, setSignedImage] = useState<{ storagePath: string; uri: string } | null>(null);
  const [retryPath, setRetryPath] = useState<string | null>(null);
  const uri = signedImage && signedImage.storagePath === storagePath ? signedImage.uri : null;
  const hasRetriedCurrentPath = retryPath === storagePath;

  useEffect(() => {
    let active = true;
    if (!storagePath) return () => {
      active = false;
    };
    void createPrivateAttachmentUrl(storagePath).then((signedUrl) => {
      if (active && signedUrl) setSignedImage({ storagePath, uri: signedUrl });
    });
    return () => {
      active = false;
    };
  }, [storagePath, retryPath]);

  if (uri) {
    return (
      <Image
        accessibilityLabel={accessibilityLabel}
        source={{ uri }}
        resizeMode="cover"
        style={style}
        onError={() => {
          if (storagePath && !hasRetriedCurrentPath) setRetryPath(storagePath);
          else setSignedImage((current) => current?.storagePath === storagePath ? null : current);
        }}
      />
    );
  }

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessible
      style={[styles.fallback, style, { backgroundColor: colors.paleAqua }]}
    >
      <Ionicons name="car-sport-outline" size={24} color={colors.primary} accessible={false} />
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, overflow: 'hidden' },
});
