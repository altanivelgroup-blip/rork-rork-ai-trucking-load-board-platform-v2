import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Fuel, AlertTriangle } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { useFuelMonitor } from '@/hooks/useFuelMonitor';

interface FuelSelectorProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (fuelLevel: number) => void;
  loadId: string;
}

const FUEL_LEVELS = [
  { value: 100, label: 'Full Tank (100%)', color: '#10b981' },
  { value: 75, label: '3/4 Tank (75%)', color: '#10b981' },
  { value: 50, label: '1/2 Tank (50%)', color: '#f59e0b' },
  { value: 25, label: '1/4 Tank (25%)', color: '#ef4444' },
  { value: 10, label: 'Low (10%)', color: '#dc2626' },
];

export const FuelSelector: React.FC<FuelSelectorProps> = ({
  visible,
  onClose,
  onConfirm,
  loadId,
}) => {
  const [selectedFuel, setSelectedFuel] = useState<number>(100);
  const { setStartingFuel } = useFuelMonitor();

  const handleConfirm = useCallback(async () => {
    try {
      console.log('[FuelSelector] Setting starting fuel:', selectedFuel + '%');
      await setStartingFuel(loadId, selectedFuel);
      onConfirm(selectedFuel);
      onClose();
    } catch (error) {
      console.error('[FuelSelector] Failed to set starting fuel:', error);
    }
  }, [selectedFuel, loadId, setStartingFuel, onConfirm, onClose]);

  const handleCancel = useCallback(() => {
    setSelectedFuel(100); // Reset to full
    onClose();
  }, [onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Fuel size={24} color={theme.colors.primary} />
            <Text style={styles.title}>Select Starting Fuel Level</Text>
          </View>
          
          <Text style={styles.subtitle}>
            Choose your current fuel level at pickup
          </Text>

          <View style={styles.fuelOptions}>
            {FUEL_LEVELS.map((level) => (
              <TouchableOpacity
                key={level.value}
                style={[
                  styles.fuelOption,
                  selectedFuel === level.value && styles.selectedOption,
                ]}
                onPress={() => setSelectedFuel(level.value)}
              >
                <View style={styles.fuelIndicator}>
                  <View
                    style={[
                      styles.fuelBar,
                      {
                        width: `${level.value}%`,
                        backgroundColor: level.color,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.fuelLabel}>{level.label}</Text>
                {level.value <= 25 && (
                  <AlertTriangle size={16} color={theme.colors.warning} />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {selectedFuel <= 25 && (
            <View style={styles.warningContainer}>
              <AlertTriangle size={16} color={theme.colors.warning} />
              <Text style={styles.warningText}>
                Low fuel detected - Consider refueling before starting
              </Text>
            </View>
          )}

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
              <Text style={styles.confirmButtonText}>Confirm Pickup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  container: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  title: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  subtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginBottom: theme.spacing.lg,
  },
  fuelOptions: {
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  fuelOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 2,
    borderColor: theme.colors.lightGray,
    gap: theme.spacing.md,
  },
  selectedOption: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.lightGray,
  },
  fuelIndicator: {
    width: 60,
    height: 8,
    backgroundColor: theme.colors.lightGray,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fuelBar: {
    height: '100%',
    borderRadius: 4,
  },
  fuelLabel: {
    flex: 1,
    fontSize: theme.fontSize.md,
    fontWeight: '500',
    color: theme.colors.dark,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: '#fef3c7',
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  warningText: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    color: '#92400e',
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.gray,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.gray,
  },
  confirmButton: {
    flex: 2,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.success,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.white,
  },
});