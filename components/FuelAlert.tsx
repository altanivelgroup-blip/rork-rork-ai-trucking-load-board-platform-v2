import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AlertTriangle, Fuel, X } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { useFuelMonitor, useFuelDisplay } from '@/hooks/useFuelMonitor';

interface FuelAlertProps {
  onDismiss?: () => void;
  onFindFuelStops?: () => void;
}

export const FuelAlert: React.FC<FuelAlertProps> = ({
  onDismiss,
  onFindFuelStops,
}) => {
  const { isLowFuel, currentLoad } = useFuelMonitor();
  const { fuelLevel, fuelColor } = useFuelDisplay();

  const handleDismiss = useCallback(() => {
    console.log('[FuelAlert] Alert dismissed');
    onDismiss?.();
  }, [onDismiss]);

  const handleFindFuelStops = useCallback(() => {
    console.log('[FuelAlert] Finding fuel stops');
    onFindFuelStops?.();
  }, [onFindFuelStops]);

  if (!isLowFuel || !currentLoad) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.alertCard}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <AlertTriangle size={20} color={theme.colors.white} />
          </View>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Low Fuel Alert</Text>
            <Text style={styles.subtitle}>Fuel level at {fuelLevel}%</Text>
          </View>
          {onDismiss && (
            <TouchableOpacity style={styles.dismissButton} onPress={handleDismiss}>
              <X size={20} color={theme.colors.gray} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.fuelIndicator}>
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
          <Text style={styles.fuelText}>{fuelLevel}%</Text>
        </View>

        <Text style={styles.message}>
          Low fuel - Suggest refuel
        </Text>

        {onFindFuelStops && (
          <TouchableOpacity style={styles.actionButton} onPress={handleFindFuelStops}>
            <Fuel size={16} color={theme.colors.white} />
            <Text style={styles.actionButtonText}>Find Fuel Stops</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    padding: theme.spacing.md,
  },
  alertCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.warning,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.warning,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  subtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
  },
  dismissButton: {
    padding: theme.spacing.xs,
  },
  fuelIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  fuelTrack: {
    flex: 1,
    height: 8,
    backgroundColor: theme.colors.lightGray,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fuelBar: {
    height: '100%',
    borderRadius: 4,
  },
  fuelText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.dark,
    minWidth: 40,
    textAlign: 'right',
  },
  message: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.xs,
  },
  actionButtonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.white,
  },
});