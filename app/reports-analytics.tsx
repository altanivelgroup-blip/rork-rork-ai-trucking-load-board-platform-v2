import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ReportAnalyticsScreen from '@/src/screens/ReportAnalyticsScreen';

export default function ReportsAnalyticsPage() {
  const insets = useSafeAreaInsets();
  
  return (
    <>
      <Stack.Screen 
        options={{
          title: 'Report Analytics',
          headerStyle: {
            backgroundColor: '#FFFFFF',
          },
          headerTitleStyle: {
            color: '#1F2937',
            fontSize: 18,
            fontWeight: '600',
          },
        }}
      />
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ReportAnalyticsScreen />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});