import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Navigation, MapPin } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useLoads } from '@/hooks/useLoads';
import { DriverNavigation } from '@/components/DriverNavigation';
import { mockLoads } from '@/mocks/loads';

export default function NavigationTestScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { updateLoadStatus } = useLoads();
  const [testLoad, setTestLoad] = useState(() => ({
    ...mockLoads[0],
    status: 'in-transit' as const,
    assignedDriverId: user?.id || '1',
  }));

  const handlePickupConfirmed = () => {
    console.log('[NavigationTest] Pickup confirmed - switching to delivery');
    setTestLoad(prev => ({ ...prev, status: 'in-transit' as const }));
  };

  const handleDeliveryConfirmed = () => {
    console.log('[NavigationTest] Delivery confirmed - load completed');
    setTestLoad(prev => ({ ...prev, status: 'delivered' as const }));
    updateLoadStatus(testLoad.id, 'delivered');
  };

  const resetTest = () => {
    setTestLoad(prev => ({ ...prev, status: 'in-transit' as const }));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={theme.colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Navigation Test</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.infoCard}>
          <MapPin size={20} color={theme.colors.primary} />
          <Text style={styles.infoTitle}>Driver Navigation Flow Test</Text>
          <Text style={styles.infoText}>
            This demonstrates the basic driver navigation flow:
            {'\n'}• Accept load → Auto-navigate to pickup
            {'\n'}• Confirm pickup → Switch to delivery route
            {'\n'}• Confirm delivery → Complete navigation
          </Text>
        </View>

        <View style={styles.testCard}>
          <Text style={styles.testTitle}>Test Load Details</Text>
          <Text style={styles.testDetail}>
            Route: {testLoad.origin.city}, {testLoad.origin.state} → {testLoad.destination.city}, {testLoad.destination.state}
          </Text>
          <Text style={styles.testDetail}>
            Rate: ${testLoad.rate.toLocaleString()}
          </Text>
          <Text style={styles.testDetail}>
            Status: {testLoad.status}
          </Text>
        </View>

        {user?.role === 'driver' && testLoad.status === 'in-transit' && (
          <DriverNavigation
            load={testLoad}
            onPickupConfirmed={handlePickupConfirmed}
            onDeliveryConfirmed={handleDeliveryConfirmed}
          />
        )}

        {testLoad.status === 'delivered' && (
          <View style={styles.completedCard}>
            <Text style={styles.completedTitle}>Test Completed!</Text>
            <Text style={styles.completedText}>
              The navigation flow worked correctly. The driver can now:
              {'\n'}• Navigate to pickup location
              {'\n'}• Confirm pickup and switch to delivery
              {'\n'}• Complete the delivery process
            </Text>
            <TouchableOpacity style={styles.resetButton} onPress={resetTest}>
              <Text style={styles.resetButtonText}>Reset Test</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>Testing Instructions</Text>
          <Text style={styles.instructionsText}>
            1. Ensure you&apos;re logged in as a driver
            {'\n'}2. The test load above should show navigation controls
            {'\n'}3. Tap &quot;Navigate to Pickup&quot; to test route guidance
            {'\n'}4. Tap &quot;Confirm Pickup&quot; to switch to delivery route
            {'\n'}5. Tap &quot;Navigate to Delivery&quot; for delivery guidance
            {'\n'}6. Tap &quot;Confirm Delivery&quot; to complete the flow
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.lightGray,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.lightGray,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  infoCard: {
    backgroundColor: theme.colors.white,
    margin: theme.spacing.lg,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
  },
  infoTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.dark,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  infoText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
    textAlign: 'center',
    lineHeight: 20,
  },
  testCard: {
    backgroundColor: theme.colors.white,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
  },
  testTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: theme.spacing.sm,
  },
  testDetail: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginBottom: theme.spacing.xs,
  },
  completedCard: {
    backgroundColor: theme.colors.white,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  completedTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.success,
    marginBottom: theme.spacing.sm,
  },
  completedText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: theme.spacing.lg,
  },
  resetButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  resetButtonText: {
    color: theme.colors.white,
    fontWeight: '600',
  },
  instructionsCard: {
    backgroundColor: theme.colors.white,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
  },
  instructionsTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: theme.spacing.sm,
  },
  instructionsText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    lineHeight: 18,
  },
});