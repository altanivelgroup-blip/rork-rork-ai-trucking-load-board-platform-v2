import React, { useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

export default function IndexScreen() {
  const router = useRouter();
  const [booting, setBooting] = useState<boolean>(true);
  const once = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (once.current) return;
    once.current = true;

    const go = async () => {
      try {
        const raw = await AsyncStorage.getItem('auth:user:driver');
        const hasUser = !!raw;
        const target = hasUser ? '/dashboard' : '/login';
        router.replace(target as any);
      } catch (e) {
        router.replace('/login' as any);
      } finally {
        setBooting(false);
      }
    };

    timeoutRef.current = setTimeout(() => {
      try {
        router.replace('/login' as any);
      } catch {}
      setBooting(false);
    }, 1200);

    go();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [router]);

  return (
    <View style={{
      flex: 1,
      backgroundColor: '#0b1220',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      {booting && <ActivityIndicator size="large" color="#EA580C" />}
    </View>
  );
}
