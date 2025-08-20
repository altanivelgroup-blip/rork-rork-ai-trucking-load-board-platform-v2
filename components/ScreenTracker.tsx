import React, { PropsWithChildren, useEffect, useRef } from 'react';
import { usePathname } from 'expo-router';
import Logger from '@/utils/logger';
import { View } from 'react-native';

export default function ScreenTracker({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;
    if (last.current === pathname) return;
    last.current = pathname;
    Logger.logScreenView(pathname).catch(() => {});
  }, [pathname]);

  return <View style={{ flex: 1 }} testID="screen-tracker-wrap">{children}</View>;
}
