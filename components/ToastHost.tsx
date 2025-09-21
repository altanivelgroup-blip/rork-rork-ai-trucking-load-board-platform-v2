import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '@/components/Toast';

export default function ToastHost() {
  const opacityRef = useRef(new Animated.Value(0));
  const translateYRef = useRef(new Animated.Value(30));
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();
  
  const toast = useToast();
  const msg = toast?.messages?.[0];

  // FIXED: Stabilize animation values with useCallback
  const opacity = useMemo(() => opacityRef.current, []);
  const translateY = useMemo(() => translateYRef.current, []);
  
  // FIXED: Memoize clear function to prevent re-renders
  const clearToast = useCallback(() => {
    console.log('[ToastHost] Update loop fixed - Toast cleared');
    toast?.clear();
  }, [toast]);
  
  useEffect(() => {
    if (!msg || !toast) return;
    
    console.log('[ToastHost] Update loop fixed - Stable render - Showing toast:', msg.text);
    
    if (timerRef.current) { 
      clearTimeout(timerRef.current); 
      timerRef.current = null; 
    }

    Animated.parallel([
      Animated.timing(opacity, { 
        toValue: 1, 
        duration: 200, 
        easing: Easing.out(Easing.ease), 
        useNativeDriver: Platform.OS !== 'web' 
      }),
      Animated.spring(translateY, { 
        toValue: 0, 
        bounciness: 6, 
        useNativeDriver: Platform.OS !== 'web' 
      }),
    ]).start();

    timerRef.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { 
          toValue: 0, 
          duration: 200, 
          useNativeDriver: Platform.OS !== 'web' 
        }),
        Animated.timing(translateY, { 
          toValue: 30, 
          duration: 200, 
          useNativeDriver: Platform.OS !== 'web' 
        }),
      ]).start(clearToast);
    }, msg.duration);

    return () => { 
      if (timerRef.current) { 
        clearTimeout(timerRef.current); 
        timerRef.current = null; 
      } 
    };
  }, [msg?.id, msg?.text, msg?.duration, opacity, translateY, clearToast]); // FIXED: Include stable dependencies

  const bg = useMemo(() => {
    switch (msg?.type) {
      case 'success': return '#16a34a';
      case 'error': return '#ef4444';
      case 'warning': return '#f59e0b';
      default: return '#2563eb';
    }
  }, [msg?.type]);

  if (!msg) return null;

  return (
    <View style={[styles.wrapper, { top: 60 + Math.max(insets.top, 0) }]} pointerEvents="none" testID="toastWrapper">
      <Animated.View style={[styles.toast, { backgroundColor: bg, opacity, transform: [{ translateY }] }]} pointerEvents="none" testID="toast">
        <Text style={styles.text} numberOfLines={5}>{msg.text}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 9999,
  },
  toast: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    maxWidth: '95%',
    minHeight: 60,
  },
  text: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 20,
  },
});