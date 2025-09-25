import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useLiveAnalytics } from '@/hooks/useLiveAnalytics';
import LiveAnalyticsDashboard from '@/components/LiveAnalyticsDashboard';
import { LoadCard } from '@/components/LoadCard';
import { ANALYTICS_AUTO_CALCULATE, ENABLE_LOAD_ANALYTICS, SHOW_ANALYTICS_ON_CARDS } from '@/src/config/runtime';

// Mock load data for testing
const mockLoad: any = {
  id: 'test-load-1',
  shipperId: 'test-shipper-1',
  rate: 2500,
  rateAmount: 2500,
  ratePerMile: 5.56,
  total: 2500,
  distance: 450,
  distanceMiles: 450,
  weight: 15000,
  vehicleType: 'truck' as const,
  status: 'available' as const,
  origin: {
    city: 'Dallas',
    state: 'TX',
    zip: '75201',
    zipCode: '75201',
    address: '123 Main St, Dallas, TX 75201',
    lat: 32.7767,
    lng: -96.7970
  },
  destination: {
    city: 'Chicago',
    state: 'IL',
    zip: '60601',
    zipCode: '60601',
    address: '456 Oak Ave, Chicago, IL 60601',
    lat: 41.8781,
    lng: -87.6298
  },
  pickupDate: new Date(),
  deliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
  description: 'Test load for analytics',
  shipperName: 'Test Shipper'
};

export default function AnalyticsTestScreen() {
  const insets = useSafeAreaInsets();
  const { user, updateProfile } = useAuth();
  const [testEnabled, setTestEnabled] = useState(true);
  const { analytics, loading, error, refetch } = useLiveAnalytics(mockLoad, testEnabled);

  const handleRefetch = () => {
    refetch();
  };

  const handleToggleEnabled = () => {
    setTestEnabled(!testEnabled);
  };
  // Copy profile mpgRated -> fuelProfile.averageMpg, then refetch analytics
const syncMpgFromProfile = async () => {
  const driver: any = user;
  const newMpg = driver?.mpgRated ?? driver?.fuelProfile?.averageMpg;
  if (!newMpg) return;

  if (typeof updateProfile === 'function') {
    await updateProfile({
      fuelProfile: {
        ...(driver?.fuelProfile || {}),
        averageMpg: newMpg,
      },
    });
  }

  setTimeout(() => {
    refetch();
  }, 300);
};


  return (
    <>
      <Stack.Screen options={{ title: 'Analytics Test' }} />
      <ScrollView style={[styles.container, { paddingTop: insets.top }]} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Live Analytics Test</Text>
          <Text style={styles.subtitle}>Platform: {Platform.OS}</Text>
        </View>

        {/* Configuration Status */}
        <View style={styles.configSection}>
          <Text style={styles.sectionTitle}>Configuration</Text>
          <View style={styles.configRow}>
            <Text style={styles.configLabel}>ANALYTICS_AUTO_CALCULATE:</Text>
            <Text style={[styles.configValue, { color: ANALYTICS_AUTO_CALCULATE ? theme.colors.success : theme.colors.danger }]}>
              {ANALYTICS_AUTO_CALCULATE.toString()}
            </Text>
          </View>
          <View style={styles.configRow}>
            <Text style={styles.configLabel}>ENABLE_LOAD_ANALYTICS:</Text>
            <Text style={[styles.configValue, { color: ENABLE_LOAD_ANALYTICS ? theme.colors.success : theme.colors.danger }]}>
              {ENABLE_LOAD_ANALYTICS.toString()}
            </Text>
          </View>
          <View style={styles.configRow}>
            <Text style={styles.configLabel}>SHOW_ANALYTICS_ON_CARDS:</Text>
            <Text style={[styles.configValue, { color: SHOW_ANALYTICS_ON_CARDS ? theme.colors.success : theme.colors.danger }]}>
              {SHOW_ANALYTICS_ON_CARDS.toString()}
            </Text>
          </View>
          <View style={styles.configRow}>
            <Text style={styles.configLabel}>User Role:</Text>
            <Text style={styles.configValue}>{user?.role || 'Not logged in'}</Text>
          </View>
          <View style={styles.configRow}>
            <Text style={styles.configLabel}>Has Fuel Profile:</Text>
            <Text style={[styles.configValue, { color: (user as any)?.fuelProfile?.averageMpg ? theme.colors.success : theme.colors.warning }]}>
              {(user as any)?.fuelProfile?.averageMpg ? 'Yes' : 'No'}
            </Text>
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controlsSection}>
          <TouchableOpacity style={styles.button} onPress={syncMpgFromProfile}>
       <Text style={styles.buttonText}>Sync MPG from Profile</Text>
         </TouchableOpacity>
           <TouchableOpacity style={styles.button} onPress={handleToggleEnabled}>
            <Text style={styles.buttonText}>
              {testEnabled ? 'Disable' : 'Enable'} Analytics
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={handleRefetch}>
            <TouchableOpacity style={styles.button} onPress={syncMpgFromProfile}>
             <Text style={styles.buttonText}>Sync MPG from Profile</Text>
            </TouchableOpacity>
           <Text style={styles.buttonText}>Refetch Analytics</Text>
          </TouchableOpacity>
        </View>

        {/* Analytics Status */}
        <View style={styles.statusSection}>
          <Text style={styles.sectionTitle}>Analytics Status</Text>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Loading:</Text>
            <Text style={[styles.statusValue, { color: loading ? theme.colors.warning : theme.colors.gray }]}>
              {loading.toString()}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Has Analytics:</Text>
            <Text style={[styles.statusValue, { color: analytics ? theme.colors.success : theme.colors.gray }]}>
              {(!!analytics).toString()}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Error:</Text>
            <Text style={[styles.statusValue, { color: error ? theme.colors.danger : theme.colors.gray }]}>
              {error || 'None'}
            </Text>
          </View>
        </View>

        {/* Analytics Dashboard */}
        <View style={styles.dashboardSection}>
          <Text style={styles.sectionTitle}>Live Analytics Dashboard</Text>
          <LiveAnalyticsDashboard 
            load={mockLoad} 
            enabled={testEnabled}
            showTitle={false}
          />
        </View>

        {/* Load Card with Analytics */}
        <View style={styles.cardSection}>
          <Text style={styles.sectionTitle}>Load Card with Analytics</Text>
          <LoadCard 
            load={mockLoad}
            onPress={() => console.log('Load card pressed')}
            showAnalytics={true}
          />
        </View>

        {/* Raw Analytics Data */}
        {analytics && (
          <View style={styles.dataSection}>
            <Text style={styles.sectionTitle}>Raw Analytics Data</Text>
            <View style={styles.dataContainer}>
              <Text style={styles.dataText}>
                {JSON.stringify(analytics, null, 2)}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.lightGray,
  },
  content: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.dark,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
  },
  configSection: {
    backgroundColor: theme.colors.white,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: theme.spacing.md,
  },
  configRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  configLabel: {
    fontSize: theme.fontSize.md,
    color: theme.colors.dark,
    flex: 1,
  },
  configValue: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
  controlsSection: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  button: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  buttonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
  statusSection: {
    backgroundColor: theme.colors.white,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  statusLabel: {
    fontSize: theme.fontSize.md,
    color: theme.colors.dark,
  },
  statusValue: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
  dashboardSection: {
    marginBottom: theme.spacing.md,
  },
  cardSection: {
    marginBottom: theme.spacing.md,
  },
  dataSection: {
    backgroundColor: theme.colors.white,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
  },
  dataContainer: {
    backgroundColor: theme.colors.lightGray,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
  },
  dataText: {
    fontSize: theme.fontSize.sm,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: theme.colors.dark,
  },
});