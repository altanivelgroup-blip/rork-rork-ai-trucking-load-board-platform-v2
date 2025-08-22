import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import { useToast } from '@/components/Toast';

export default function ToastHost() {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(30)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const toastContext = useToast();
  const { messages, clear } = toastContext || { messages: [], clear: () => {} };
  const msg = messages[0];

  useEffect(() => {
    if (!msg || !toastContext) return;
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }

    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 200, easing: Easing.out(Easing.ease), useNativeDriver: Platform.OS !== 'web' }),
      Animated.spring(translateY, { toValue: 0, bounciness: 6, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();

    timerRef.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(translateY, { toValue: 30, duration: 200, useNativeDriver: Platform.OS !== 'web' }),
      ]).start(() => clear());
    }, msg.duration);

    return () => { if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; } };
  }, [msg, opacity, translateY, clear, toastContext]);

  const bg = useMemo(() => {
    switch (msg?.type) {
      case 'success': return '#16a34a';
      case 'error': return '#ef4444';
      case 'warning': return '#f59e0b';
      default: return '#2563eb';
    }
  }, [msg?.type]);

  if (!msg || !toastContext) return null;

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <Animated.View style={[styles.toast, { backgroundColor: bg, opacity, transform: [{ translateY }] }]} testID="toast">
        <Text style={styles.text} numberOfLines={3}>{msg.text}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  toast: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
    maxWidth: 680,
  },
  text: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});