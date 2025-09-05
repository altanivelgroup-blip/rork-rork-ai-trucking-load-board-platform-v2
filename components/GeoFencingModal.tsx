import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { X, MapPin } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { LocationSearch } from './LocationSearch';
import { RadiusSlider } from './RadiusSlider';
import { GeoCoords } from '@/hooks/useLiveLocation';

interface GeoFencingModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (location: { address: string; coords: GeoCoords }, radius: number) => void;
  currentLocation?: string;
  currentRadius?: number;
}

export const GeoFencingModal: React.FC<GeoFencingModalProps> = ({
  visible,
  onClose,
  onApply,
  currentLocation,
  currentRadius = 50,
}) => {
  const [selectedLocation, setSelectedLocation] = useState<{ address: string; coords: GeoCoords } | null>(null);
  const [radius, setRadius] = useState<number>(currentRadius);

  const handleLocationSelect = useCallback((location: { address: string; coords: GeoCoords }) => {
    setSelectedLocation(location);
    console.log('[GeoFencing] Location selected:', location);
  }, []);

  const handleApply = useCallback(() => {
    if (selectedLocation) {
      onApply(selectedLocation, radius);
      onClose();
    }
  }, [selectedLocation, radius, onApply, onClose]);

  const handleClose = useCallback(() => {
    setSelectedLocation(null);
    setRadius(currentRadius);
    onClose();
  }, [currentRadius, onClose]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <MapPin size={24} color={theme.colors.primary} />
            <Text style={styles.title}>Location Search</Text>
          </View>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            testID="close-geo-fencing"
          >
            <X size={24} color={theme.colors.gray} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={styles.description}>
            Find loads within a specific radius of your location or any city.
          </Text>

          <LocationSearch
            onLocationSelect={handleLocationSelect}
            currentLocation={currentLocation}
            placeholder="Enter city, state, or ZIP code"
          />

          <RadiusSlider
            value={radius}
            onValueChange={setRadius}
          />

          {selectedLocation && (
            <View style={styles.selectedLocation}>
              <Text style={styles.selectedLocationLabel}>Selected Location:</Text>
              <Text style={styles.selectedLocationText}>{selectedLocation.address}</Text>
              <Text style={styles.selectedLocationCoords}>
                {selectedLocation.coords.latitude.toFixed(4)}, {selectedLocation.coords.longitude.toFixed(4)}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleClose}
            testID="cancel-geo-fencing"
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.applyButton,
              !selectedLocation && styles.applyButtonDisabled,
            ]}
            onPress={handleApply}
            disabled={!selectedLocation}
            testID="apply-geo-fencing"
          >
            <Text style={[
              styles.applyButtonText,
              !selectedLocation && styles.applyButtonTextDisabled,
            ]}>
              Apply Filter
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.lightGray,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  description: {
    fontSize: 16,
    color: theme.colors.gray,
    marginBottom: 24,
    lineHeight: 22,
  },
  selectedLocation: {
    backgroundColor: theme.colors.lightGray,
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  selectedLocationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: 4,
  },
  selectedLocationText: {
    fontSize: 16,
    color: theme.colors.dark,
    marginBottom: 4,
  },
  selectedLocationCoords: {
    fontSize: 12,
    color: theme.colors.gray,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.lightGray,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.gray,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.gray,
  },
  applyButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
  },
  applyButtonDisabled: {
    backgroundColor: theme.colors.lightGray,
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.white,
  },
  applyButtonTextDisabled: {
    color: theme.colors.gray,
  },
});