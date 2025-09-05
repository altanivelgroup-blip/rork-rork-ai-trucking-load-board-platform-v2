import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { MapPin, Crosshair, Loader } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { useLiveLocation, GeoCoords } from '@/hooks/useLiveLocation';

interface LocationSearchProps {
  onLocationSelect: (location: { address: string; coords: GeoCoords }) => void;
  placeholder?: string;
  currentLocation?: string;
}

export const LocationSearch: React.FC<LocationSearchProps> = ({
  onLocationSelect,
  placeholder = "Enter city, state or ZIP",
  currentLocation,
}) => {
  const [searchText, setSearchText] = useState<string>(currentLocation || '');
  const [isLoadingGPS, setIsLoadingGPS] = useState<boolean>(false);
  const { requestPermissionAsync, startWatching } = useLiveLocation();

  useEffect(() => {
    if (currentLocation) {
      setSearchText(currentLocation);
    }
  }, [currentLocation]);

  const handleUseCurrentLocation = useCallback(async () => {
    setIsLoadingGPS(true);
    try {
      const hasPermission = await requestPermissionAsync();
      if (!hasPermission) {
        Alert.alert(
          'Location Permission Required',
          'Please enable location permissions to use your current location.'
        );
        return;
      }

      if (Platform.OS === 'web') {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const coords = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            };
            
            // Reverse geocode to get address
            const address = await reverseGeocode(coords);
            setSearchText(address);
            onLocationSelect({ address, coords });
            setIsLoadingGPS(false);
          },
          (error) => {
            console.error('GPS error:', error);
            Alert.alert('Error', 'Unable to get your current location.');
            setIsLoadingGPS(false);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
      } else {
        const unsubscribe = await startWatching(
          async (coords) => {
            const address = await reverseGeocode(coords);
            setSearchText(address);
            onLocationSelect({ address, coords });
            setIsLoadingGPS(false);
            unsubscribe();
          },
          { distanceIntervalMeters: 0 }
        );
      }
    } catch (error) {
      console.error('Location error:', error);
      Alert.alert('Error', 'Unable to get your current location.');
      setIsLoadingGPS(false);
    }
  }, [requestPermissionAsync, startWatching, onLocationSelect]);

  const reverseGeocode = async (coords: GeoCoords): Promise<string> => {
    try {
      // Simple reverse geocoding using a free service
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${coords.latitude}&longitude=${coords.longitude}&localityLanguage=en`
      );
      const data = await response.json();
      
      if (data.city && data.principalSubdivision) {
        return `${data.city}, ${data.principalSubdivision}`;
      }
      return `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`;
    }
  };

  const handleTextSubmit = useCallback(async () => {
    if (!searchText.trim()) return;

    try {
      // Simple geocoding for common formats
      const coords = await geocodeAddress(searchText.trim());
      if (coords) {
        onLocationSelect({ address: searchText.trim(), coords });
      } else {
        Alert.alert('Location Not Found', 'Please enter a valid city, state, or ZIP code.');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      Alert.alert('Error', 'Unable to find the specified location.');
    }
  }, [searchText, onLocationSelect]);

  const geocodeAddress = async (address: string): Promise<GeoCoords | null> => {
    try {
      // Use a free geocoding service
      const encodedAddress = encodeURIComponent(address);
      const response = await fetch(
        `https://api.opencagedata.com/geocode/v1/json?q=${encodedAddress}&key=demo&limit=1&countrycode=us`
      );
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        return {
          latitude: result.geometry.lat,
          longitude: result.geometry.lng,
        };
      }
      
      // Fallback: try to parse coordinates if entered directly
      const coordMatch = address.match(/^(-?\d+\.\d+),\s*(-?\d+\.\d+)$/);
      if (coordMatch) {
        return {
          latitude: parseFloat(coordMatch[1]),
          longitude: parseFloat(coordMatch[2]),
        };
      }
      
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <MapPin size={20} color={theme.colors.gray} style={styles.icon} />
        <TextInput
          style={styles.input}
          value={searchText}
          onChangeText={setSearchText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.gray}
          onSubmitEditing={handleTextSubmit}
          returnKeyType="search"
          testID="location-search-input"
        />
        <TouchableOpacity
          style={styles.gpsButton}
          onPress={handleUseCurrentLocation}
          disabled={isLoadingGPS}
          testID="use-current-location"
        >
          {isLoadingGPS ? (
            <Loader size={20} color={theme.colors.primary} />
          ) : (
            <Crosshair size={20} color={theme.colors.primary} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.lightGray,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.dark,
    paddingVertical: 4,
  },
  gpsButton: {
    padding: 4,
    marginLeft: 8,
  },
});