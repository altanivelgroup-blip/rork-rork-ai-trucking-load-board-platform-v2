import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import ReportAnalyticsDashboard from '@/components/analytics/ReportAnalyticsDashboard';

export default function ReportsScreen() {
  return (
    <>
      <Stack.Screen 
        options={{
          title: 'Report Analytics',
          headerShown: false,
        }}
      />
      <SafeAreaView style={styles.container}>
        <ReportAnalyticsDashboard />
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});