import React, { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';

interface HeaderBackProps {
  tintColor?: string;
  size?: number;
  testID?: string;
  fallbackPath?: string;
  targetPath?: string;
}

export default function HeaderBack({ tintColor, size = 28, testID, fallbackPath, targetPath }: HeaderBackProps) {
  const router = useRouter();

  const onPress = useCallback(() => {
    try {
      if (targetPath) {
        router.replace(targetPath as any);
        return;
      }
      if ((router as any).canGoBack?.()) {
        router.back();
      } else if (fallbackPath) {
        router.replace(fallbackPath as any);
      } else {
        router.replace('/');
      }
    } catch (e) {
      console.log('[HeaderBack] back press error', e);
    }
  }, [router, fallbackPath, targetPath]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Go back"
      onPress={onPress}
      style={styles.button}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      testID={testID ?? 'header-back-button'}
    >
      <View style={styles.iconWrap}>
        <ChevronLeft color={tintColor ?? '#111'} size={size} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
