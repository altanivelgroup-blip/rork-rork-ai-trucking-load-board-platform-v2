import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View } from 'react-native';

export default function Screen({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView edges={['top','left','right','bottom']} style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ flex: 1 }}>{children}</View>
    </SafeAreaView>
  );
}