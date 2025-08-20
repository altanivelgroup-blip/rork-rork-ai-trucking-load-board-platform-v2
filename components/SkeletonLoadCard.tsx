import React, { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import { theme } from '@/constants/theme';

export default function SkeletonLoadCard() {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 1200, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(shimmer, { toValue: 0, duration: 1200, useNativeDriver: Platform.OS !== 'web' }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const bg = shimmer.interpolate ? shimmer.interpolate({ inputRange: [0, 1], outputRange: ['#e5e7eb', '#f3f4f6'] }) : '#e5e7eb';

  return (
    <View style={styles.card} testID="skeleton-load-card">
      <Animated.View style={[styles.block, { width: 120, height: 18, backgroundColor: bg }]} />
      <Animated.View style={[styles.block, { width: '80%', height: 14, backgroundColor: bg }]} />
      <View style={{ height: 8 }} />
      <Animated.View style={[styles.row]}>
        <Animated.View style={[styles.dot, { backgroundColor: bg }]} />
        <Animated.View style={[styles.flex, { backgroundColor: bg }]} />
      </Animated.View>
      <View style={{ height: 8 }} />
      <Animated.View style={[styles.row]}>
        <Animated.View style={[styles.dot, { backgroundColor: bg }]} />
        <Animated.View style={[styles.flex, { backgroundColor: bg }]} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.sm,
  },
  block: {
    borderRadius: 8,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  flex: {
    height: 12,
    flex: 1,
    borderRadius: 6,
  },
});