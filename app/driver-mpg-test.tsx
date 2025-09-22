import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useLiveAnalytics } from '@/hooks/useLiveAnalytics';
import LiveAnalyticsDashboard from '@/components/LiveAnalyticsDashboard';
import { Driver, FuelProfile, VehicleType } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock load for testing
const testLoad = {
  id: 'mpg-test-load',
  rate: 2500,
  distance: 500,
  origin: { city: 'Dallas', state: 'TX', lat: 32.7767, lng: -96.7970 },
  destination: { city: 'Chicago', state: 'IL', lat: 41.8781, lng: -87.6298 },
  vehicleType: 'truck' as const,
  status: 'available' as const,
  weight: 15000
};

export default function DriverMpgTestScreen() {
  const insets = useSafeAreaInsets();
  const { user, updateProfile } = useAuth();
  const [testMpg, setTestMpg] = useState<number>(10.5);
  const [profileData, setProfileData] = useState<any>(null);
  const { analytics, loading, error, refetch } = useLiveAnalytics(testLoad, true);

  // Load profile data on mount
  useEffect(() => {
    const loadProfileData = async () => {
      try {
        const cached = await AsyncStorage.getItem('auth:user:profile');
        if (cached) {
          const profile = JSON.parse(cached);
          setProfileData(profile);
          if (profile?.fuelProfile?.averageMpg) {
            setTestMpg(profile.fuelProfile.averageMpg);
          } else if (profile?.mpgRated) {
            setTestMpg(profile.mpgRated);
          }
        }
      } catch (error) {
        console.warn('Failed to load profile data:', error);
      }
    };
    loadProfileData();
  }, []);

  const handleUpdateMpg = async () => {
    if (!user || user.role !== 'driver') {
      Alert.alert('Error', 'Must be logged in as driver');
      return;
    }

    try {
      const driverProfile = user as Driver;
      const updatedProfile: Partial<Driver> = {
        ...driverProfile,
        mpgRated: testMpg,
        fuelProfile: {
          vehicleType: (driverProfile.fuelProfile?.vehicleType || 'truck') as VehicleType,
          averageMpg: testMpg,
          fuelPricePerGallon: driverProfile.fuelProfile?.fuelPricePerGallon || 3.50,
          fuelType: (driverProfile.fuelProfile?.fuelType || 'diesel') as 'diesel' | 'gasoline',
          tankCapacity: driverProfile.fuelProfile?.tankCapacity || 150
        }
      };

      await updateProfile(updatedProfile);
      
      // Refresh analytics to see the change
      setTimeout(() => {
        refetch();
      }, 500);
      
      Alert.alert('Success', `MPG updated to ${testMpg}. Analytics will refresh.`);
    } catch (error) {
      Alert.alert('Error', 'Failed to update MPG');
      console.error('MPG update failed:', error);
    }
  };

  const handleIncreaseMpg = () => {
    setTestMpg(prev => Math.min(prev + 0.5, 15));
  };

  const handleDecreaseMpg = () => {
    setTestMpg(prev => Math.max(prev - 0.5, 5));
  };

  const driverProfile = user as Driver;
  const currentMpg = driverProfile?.fuelProfile?.averageMpg || driverProfile?.mpgRated || 'Not set';

  return (
    <>
      <Stack.Screen options={{ title: 'Driver MPG Test' }} />
      <ScrollView style={[styles.container, { paddingTop: insets.top }]} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom }]}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Driver MPG Analytics Test</Text>
          <Text style={styles.subtitle}>Test that analytics use your actual MPG</Text>
        </View>

        {/* Driver Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Driver Profile</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Name:</Text>
            <Text style={styles.infoValue}>{user?.name || 'Not logged in'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Role:</Text>
            <Text style={styles.infoValue}>{user?.role || 'None'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Current MPG (fuelProfile):</Text>
            <Text style={[styles.infoValue, { color: theme.colors.primary, fontWeight: '700' }]}>
              {driverProfile?.fuelProfile?.averageMpg || 'Not set'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Current MPG (mpgRated):</Text>
            <Text style={[styles.infoValue, { color: theme.colors.secondary, fontWeight: '700' }]}>
              {driverProfile?.mpgRated || 'Not set'}
            </Text>
          </View>
        </View>

        {/* MPG Controls */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Update Your MPG</Text>
          <View style={styles.mpgControls}>
            <TouchableOpacity style={styles.mpgButton} onPress={handleDecreaseMpg}>
              <Text style={styles.mpgButtonText}>-0.5</Text>
            </TouchableOpacity>
            <View style={styles.mpgDisplay}>
              <Text style={styles.mpgValue}>{testMpg.toFixed(1)}</Text>
              <Text style={styles.mpgLabel}>MPG</Text>
            </View>
            <TouchableOpacity style={styles.mpgButton} onPress={handleIncreaseMpg}>
              <Text style={styles.mpgButtonText}>+0.5</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.updateButton} onPress={handleUpdateMpg}>
            <Text style={styles.updateButtonText}>Update Driver MPG to {testMpg.toFixed(1)}</Text>
          </TouchableOpacity>
        </View>

        {/* Analytics Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Analytics Status</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Loading:</Text>
            <Text style={[styles.infoValue, { color: loading ? theme.colors.warning : theme.colors.gray }]}>
              {loading.toString()}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Has Analytics:</Text>
            <Text style={[styles.infoValue, { color: analytics ? theme.colors.success : theme.colors.gray }]}>
              {(!!analytics).toString()}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Analytics MPG:</Text>
            <Text style={[styles.infoValue, { color: theme.colors.success, fontWeight: '700', fontSize: 18 }]}>
              {analytics?.mpg?.toFixed(1) || 'N/A'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Error:</Text>
            <Text style={[styles.infoValue, { color: error ? theme.colors.danger : theme.colors.gray }]}>
              {error || 'None'}
            </Text>
          </View>
        </View>

        {/* Live Analytics Dashboard */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Live Analytics (Should Use Your MPG)</Text>
          <LiveAnalyticsDashboard 
            load={testLoad} 
            enabled={true}
            showTitle={false}
          />
        </View>

        {/* Expected vs Actual */}
        {analytics && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Verification</Text>
            <View style={styles.verificationCard}>
              <Text style={styles.verificationTitle}>MPG Comparison</Text>
              <View style={styles.comparisonRow}>
                <Text style={styles.comparisonLabel}>Your Profile MPG:</Text>
                <Text style={[styles.comparisonValue, { color: theme.colors.primary }]}>
                  {currentMpg}
                </Text>
              </View>
              <View style={styles.comparisonRow}>
                <Text style={styles.comparisonLabel}>Analytics Using:</Text>
                <Text style={[styles.comparisonValue, { color: theme.colors.success, fontWeight: '700' }]}>
                  {analytics.mpg.toFixed(1)}
                </Text>
              </View>
              <View style={styles.comparisonRow}>
                <Text style={styles.comparisonLabel}>Match Status:</Text>
                <Text style={[
                  styles.comparisonValue, 
                  { 
                    color: Math.abs(analytics.mpg - (typeof currentMpg === 'number' ? currentMpg : testMpg)) < 0.1 
                      ? theme.colors.success 
                      : theme.colors.danger,
                    fontWeight: '700'
                  }
                ]}>
                  {Math.abs(analytics.mpg - (typeof currentMpg === 'number' ? currentMpg : testMpg)) < 0.1 
                    ? '✅ MATCH' 
                    : '❌ MISMATCH'
                  }
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Raw Data */}
        {profileData && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Raw Profile Data</Text>
            <View style={styles.rawDataContainer}>
              <Text style={styles.rawDataText}>
                {JSON.stringify({
                  mpgRated: profileData.mpgRated,
                  fuelProfile: profileData.fuelProfile,
                  name: profileData.name
                }, null, 2)}
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
    textAlign: 'center',
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
    textAlign: 'center',
  },
  section: {
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
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  infoLabel: {
    fontSize: theme.fontSize.md,
    color: theme.colors.dark,
    flex: 1,
  },
  infoValue: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.gray,
  },
  mpgControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  mpgButton: {
    backgroundColor: theme.colors.primary,
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mpgButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
  },
  mpgDisplay: {
    alignItems: 'center',
    backgroundColor: theme.colors.lightGray,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  mpgValue: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  mpgLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginTop: 4,
  },
  updateButton: {
    backgroundColor: theme.colors.success,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  updateButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
  verificationCard: {
    backgroundColor: theme.colors.lightGray,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  verificationTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  comparisonLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.dark,
  },
  comparisonValue: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
  rawDataContainer: {
    backgroundColor: theme.colors.lightGray,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
  },
  rawDataText: {
    fontSize: theme.fontSize.xs,
    fontFamily: 'monospace',
    color: theme.colors.dark,
  },
});