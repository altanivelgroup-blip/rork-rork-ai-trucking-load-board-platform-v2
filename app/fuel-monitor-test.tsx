import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { Stack } from 'expo-router';
import { Fuel, MapPin, Navigation, Gauge } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { FuelMonitorProvider, useFuelMonitor, useFuelDisplay } from '@/hooks/useFuelMonitor';
import { FuelAlert } from '@/components/FuelAlert';
import { FuelSelector } from '@/components/FuelSelector';
import { Location } from '@/types';

function FuelMonitorTestContent() {
  const {
    currentLoad,
    fuelLevel,
    isLowFuel,
    nearbyFuelStops,
    isLoadingFuelStops,
    currentLocation,
    setStartingFuel,
    updateFuelLevel,
    findNearbyFuelStops,
    updateCurrentLocation,
    resetFuelMonitor,
  } = useFuelMonitor();
  
  const { fuelColor, fuelText } = useFuelDisplay();
  const [showFuelSelector, setShowFuelSelector] = useState<boolean>(false);
  const [showAlert, setShowAlert] = useState<boolean>(false);

  const mockLocation: Location = {
    address: '123 Test Street',
    city: 'Test City',
    state: 'TX',
    zipCode: '12345',
    lat: 32.7767,
    lng: -96.7970,
  };

  const handleStartLoad = useCallback(() => {
    setShowFuelSelector(true);
  }, []);

  const handleFuelSelected = useCallback(async (fuelLevel: number) => {
    console.log('[FuelMonitorTest] Fuel selected:', fuelLevel + '%');
    await updateCurrentLocation(mockLocation);
  }, [updateCurrentLocation]);

  const handleUpdateFuel = useCallback(async (newLevel: number) => {
    await updateFuelLevel(newLevel);
    if (newLevel <= 25) {
      setShowAlert(true);
    }
  }, [updateFuelLevel]);

  const handleFindStops = useCallback(async () => {
    console.log('[FuelMonitorTest] Finding fuel stops');
    await findNearbyFuelStops(currentLocation || mockLocation);
  }, [findNearbyFuelStops, currentLocation]);

  const handleNavigateToStop = useCallback((stopId: string) => {
    console.log('[FuelMonitorTest] Navigate to stop:', stopId);
    // In real app, this would integrate with navigation
  }, []);

  const handleReset = useCallback(() => {
    resetFuelMonitor();
    setShowAlert(false);
  }, [resetFuelMonitor]);

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Fuel Monitor Test' }} />
      
      {/* Show fuel alert if low fuel */}
      {showAlert && isLowFuel && (
        <FuelAlert
          onDismiss={() => setShowAlert(false)}
          onFindFuelStops={handleFindStops}
          onNavigateToStop={handleNavigateToStop}
        />
      )}
      
      <ScrollView style={styles.content}>
        {/* Current Status */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Gauge size={24} color={theme.colors.primary} />
            <Text style={styles.statusTitle}>Fuel Monitor Status</Text>
          </View>
          
          <View style={styles.fuelDisplay}>
            <View style={styles.fuelGauge}>
              <View style={styles.fuelTrack}>
                <View
                  style={[
                    styles.fuelBar,
                    {
                      width: `${fuelLevel}%`,
                      backgroundColor: fuelColor,
                    },
                  ]}
                />
              </View>
              <Text style={styles.fuelText}>{fuelText}</Text>
            </View>
            
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Load Active:</Text>
              <Text style={[styles.statusValue, { color: currentLoad ? theme.colors.success : theme.colors.gray }]}>
                {currentLoad ? 'Yes' : 'No'}
              </Text>
            </View>
            
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Low Fuel Alert:</Text>
              <Text style={[styles.statusValue, { color: isLowFuel ? theme.colors.error : theme.colors.success }]}>
                {isLowFuel ? 'Active' : 'Normal'}
              </Text>
            </View>
            
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Location:</Text>
              <Text style={styles.statusValue}>
                {currentLocation ? `${currentLocation.city}, ${currentLocation.state}` : 'Not set'}
              </Text>
            </View>
            
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Nearby Stops:</Text>
              <Text style={styles.statusValue}>
                {nearbyFuelStops.length} found
              </Text>
            </View>
          </View>
        </View>

        {/* Test Controls */}
        <View style={styles.controlsCard}>
          <Text style={styles.controlsTitle}>Test Controls</Text>
          
          <TouchableOpacity style={styles.primaryButton} onPress={handleStartLoad}>
            <Fuel size={16} color={theme.colors.white} />
            <Text style={styles.primaryButtonText}>Start Load (Select Fuel)</Text>
          </TouchableOpacity>
          
          <View style={styles.fuelButtons}>
            <TouchableOpacity
              style={styles.fuelButton}
              onPress={() => handleUpdateFuel(75)}
            >
              <Text style={styles.fuelButtonText}>Set 75%</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.fuelButton}
              onPress={() => handleUpdateFuel(50)}
            >
              <Text style={styles.fuelButtonText}>Set 50%</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.fuelButton, styles.lowFuelButton]}
              onPress={() => handleUpdateFuel(20)}
            >
              <Text style={[styles.fuelButtonText, styles.lowFuelButtonText]}>Set 20% (Low)</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity style={styles.secondaryButton} onPress={handleFindStops}>
            <MapPin size={16} color={theme.colors.primary} />
            <Text style={styles.secondaryButtonText}>
              {isLoadingFuelStops ? 'Finding Stops...' : 'Find Fuel Stops'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
            <Text style={styles.resetButtonText}>Reset Monitor</Text>
          </TouchableOpacity>
        </View>

        {/* Fuel Stops List */}
        {nearbyFuelStops.length > 0 && (
          <View style={styles.stopsCard}>
            <Text style={styles.stopsTitle}>Nearby Fuel Stops ({nearbyFuelStops.length})</Text>
            
            {nearbyFuelStops.map((stop) => (
              <TouchableOpacity
                key={stop.id}
                style={[
                  styles.stopItem,
                  stop.isSponsored && styles.sponsoredStopItem,
                ]}
                onPress={() => handleNavigateToStop(stop.id)}
              >
                <View style={styles.stopHeader}>
                  <Text style={styles.stopName}>{stop.name}</Text>
                  <Text style={styles.stopDistance}>{stop.distance.toFixed(1)} mi</Text>
                </View>
                
                <Text style={styles.stopAddress}>
                  {stop.location.address}, {stop.location.city}
                </Text>
                
                {stop.pricePerGallon && (
                  <Text style={styles.stopPrice}>
                    ${stop.pricePerGallon.toFixed(2)}/gal
                  </Text>
                )}
                
                <View style={styles.stopFooter}>
                  <Text style={styles.stopAmenities}>
                    {stop.amenities.slice(0, 2).join(', ')}
                    {stop.amenities.length > 2 && ` +${stop.amenities.length - 2} more`}
                  </Text>
                  
                  {stop.isSponsored && (
                    <View style={styles.sponsoredBadge}>
                      <Text style={styles.sponsoredText}>Sponsored</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
      
      {/* Fuel Selector Modal */}
      <FuelSelector
        visible={showFuelSelector}
        onClose={() => setShowFuelSelector(false)}
        onConfirm={handleFuelSelected}
        loadId="test-load-001"
      />
    </SafeAreaView>
  );
}

export default function FuelMonitorTestScreen() {
  return (
    <FuelMonitorProvider>
      <FuelMonitorTestContent />
    </FuelMonitorProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    padding: theme.spacing.md,
  },
  statusCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  statusTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  fuelDisplay: {
    gap: theme.spacing.sm,
  },
  fuelGauge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  fuelTrack: {
    flex: 1,
    height: 12,
    backgroundColor: theme.colors.lightGray,
    borderRadius: 6,
    overflow: 'hidden',
  },
  fuelBar: {
    height: '100%',
    borderRadius: 6,
  },
  fuelText: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.dark,
    minWidth: 50,
    textAlign: 'right',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
  },
  statusLabel: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
  },
  statusValue: {
    fontSize: theme.fontSize.md,
    fontWeight: '500',
    color: theme.colors.dark,
  },
  controlsCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  controlsTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: theme.spacing.md,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  primaryButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.white,
  },
  fuelButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  fuelButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    alignItems: 'center',
  },
  fuelButtonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  lowFuelButton: {
    backgroundColor: theme.colors.error,
    borderColor: theme.colors.error,
  },
  lowFuelButtonText: {
    color: theme.colors.white,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  secondaryButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  resetButton: {
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
  },
  stopsCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stopsTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: theme.spacing.md,
  },
  stopItem: {
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.lightGray,
    marginBottom: theme.spacing.sm,
  },
  sponsoredStopItem: {
    borderColor: theme.colors.primary,
    backgroundColor: '#f0f9ff',
  },
  stopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  stopName: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark,
    flex: 1,
  },
  stopDistance: {
    fontSize: theme.fontSize.sm,
    fontWeight: '500',
    color: theme.colors.primary,
  },
  stopAddress: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginBottom: theme.spacing.xs,
  },
  stopPrice: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.success,
    marginBottom: theme.spacing.xs,
  },
  stopFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stopAmenities: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    flex: 1,
  },
  sponsoredBadge: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  sponsoredText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.white,
  },
});