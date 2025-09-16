import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { useNavigation } from '@/hooks/useNavigation';
import { CheckCircle, ArrowLeft, MapPin, AlertCircle } from 'lucide-react-native';

export default function PickupScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  
  useEffect(() => {
    console.log('[PickupScreen] Loaded successfully');
    console.log('[PickupScreen] Navigation state:', navigation?.state || 'Navigation hook not available');
    
    // Get location with web/mobile fallback
    const getLocation = async () => {
      try {
        if (Platform.OS === 'web') {
          // Web fallback: Use browser geolocation
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                console.log('[PickupScreen/Web] Location success:', position.coords);
                setLocation({
                  lat: position.coords.latitude,
                  lng: position.coords.longitude
                });
                setLocationError(null);
              },
              (err) => {
                console.error('[PickupScreen/Web] Geolocation denied:', err);
                // Mock fallback location (Las Vegas coords for testing)
                const mockLocation = { lat: 36.1699, lng: -115.1398 };
                console.log('[PickupScreen/Web] Using mock location:', mockLocation);
                setLocation(mockLocation);
                setLocationError('Using mock location (permission denied)');
              },
              { enableHighAccuracy: true, timeout: 5000 }
            );
          } else {
            console.log('[PickupScreen/Web] Geolocation not supported - Using mock');
            const mockLocation = { lat: 36.1699, lng: -115.1398 };
            setLocation(mockLocation);
            setLocationError('Geolocation not supported - using mock');
          }
        } else {
          // Native (mobile) - Use expo-location
          try {
            const Location = await import('expo-location');
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
              console.log('[PickupScreen/Native] Permission denied - Using mock');
              const mockLocation = { lat: 36.1699, lng: -115.1398 };
              setLocation(mockLocation);
              setLocationError('Location permission denied - using mock');
            } else {
              const locationResult = await Location.getCurrentPositionAsync({ 
                accuracy: Location.Accuracy.High 
              });
              console.log('[PickupScreen/Native] Location success:', locationResult.coords);
              setLocation({
                lat: locationResult.coords.latitude,
                lng: locationResult.coords.longitude
              });
              setLocationError(null);
            }
          } catch (nativeError) {
            console.error('[PickupScreen/Native] Location error:', nativeError);
            const mockLocation = { lat: 36.1699, lng: -115.1398 };
            setLocation(mockLocation);
            setLocationError('Location service error - using mock');
          }
        }
      } catch (err) {
        console.error('[PickupScreen] Location error:', err);
        const mockLocation = { lat: 36.1699, lng: -115.1398 };
        setLocation(mockLocation);
        setLocationError('Location unavailable - using mock');
      }
    };

    getLocation();
  }, [navigation]);

  const handleGoBack = () => {
    console.log('[PickupScreen] Going back');
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <ArrowLeft size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pickup Screen</Text>
      </View>
      
      <View style={styles.content}>
        <CheckCircle size={48} color={theme.colors.success} />
        <Text style={styles.title}>Navigation Successful!</Text>
        <Text style={styles.subtitle}>This confirms the routing is working properly.</Text>
        
        {location && (
          <View style={styles.locationInfo}>
            <MapPin size={20} color={theme.colors.primary} />
            <View style={styles.locationDetails}>
              <Text style={styles.locationTitle}>Current Location</Text>
              <Text style={styles.locationCoords}>
                {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
              </Text>
              {locationError && (
                <View style={styles.locationError}>
                  <AlertCircle size={16} color={theme.colors.warning} />
                  <Text style={styles.locationErrorText}>{locationError}</Text>
                </View>
              )}
            </View>
          </View>
        )}
        
        {navigation?.state && (
          <View style={styles.debugInfo}>
            <Text style={styles.debugTitle}>Navigation Debug Info:</Text>
            <Text style={styles.debugText}>Online: {navigation.state.isOffline ? 'No' : 'Yes'}</Text>
            <Text style={styles.debugText}>Loading: {navigation.state.isLoading ? 'Yes' : 'No'}</Text>
            <Text style={styles.debugText}>Error: {navigation.state.error || 'None'}</Text>
            <Text style={styles.debugText}>Voice: {navigation.state.voiceEnabled ? 'Enabled' : 'Disabled'}</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.lightGray,
    backgroundColor: theme.colors.white,
  },
  backButton: {
    marginRight: theme.spacing.md,
  },
  headerTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.dark,
    textAlign: 'center',
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  debugInfo: {
    backgroundColor: theme.colors.white,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    width: '100%',
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  debugTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: theme.spacing.sm,
  },
  debugText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginBottom: theme.spacing.xs,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.white,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  locationDetails: {
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
  locationTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: theme.spacing.xs,
  },
  locationCoords: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    fontFamily: 'monospace',
  },
  locationError: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
    gap: theme.spacing.xs,
  },
  locationErrorText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.warning,
    flex: 1,
  },
});