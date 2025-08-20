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
      hitSlop={{ top: 0, bottom: 0, left: 0, right: 0 }}
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
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
