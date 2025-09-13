import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import ReportAnalyticsDashboard from '@/components/analytics/ReportAnalyticsDashboard';

export default function ReportsAnalyticsPage() {
  return (
    <>
      <Stack.Screen 
        options={{
          title: 'Report Analytics',
          headerShown: false, // Hide header to show full dashboard
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