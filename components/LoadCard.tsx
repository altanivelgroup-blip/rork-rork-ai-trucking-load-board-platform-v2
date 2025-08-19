import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MapPin, DollarSign, Package, Calendar, TrendingUp, Fuel } from 'lucide-react-native';
import { Load } from '@/types';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { estimateFuelForLoad, formatCurrency } from '@/utils/fuel';

interface LoadCardProps {
  load: Load;
  onPress: () => void;
}

export const LoadCard: React.FC<LoadCardProps> = ({ load, onPress }) => {
  const { user } = useAuth();
  const vehicleColor = theme.colors[load.vehicleType as keyof typeof theme.colors] || theme.colors.primary;
  const fuel = useMemo(() => {
    try {
      return estimateFuelForLoad(load, user);
    } catch (e) {
      console.log('[LoadCard] fuel estimate error', e);
      return undefined;
    }
  }, [load, user]);
  
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7} testID="load-card">
      {load.aiScore && load.aiScore > 90 && (
        <View style={styles.aiRecommended}>
          <TrendingUp size={14} color={theme.colors.white} />
          <Text style={styles.aiText}>AI Match {load.aiScore}%</Text>
        </View>
      )}
      
      <View style={styles.header}>
        <View style={[styles.vehicleTag, { backgroundColor: vehicleColor }]}>
          <Text style={styles.vehicleText}>{load.vehicleType.replace('-', ' ').toUpperCase()}</Text>
        </View>
        {load.isBackhaul && (
          <View style={styles.backhaulTag}>
            <Text style={styles.backhaulText}>BACKHAUL</Text>
          </View>
        )}
      </View>

      <View style={styles.route}>
        <View style={styles.location}>
          <MapPin size={16} color={theme.colors.gray} />
          <View style={styles.locationText}>
            <Text style={styles.city}>{load.origin.city}, {load.origin.state}</Text>
            <Text style={styles.date}>{new Date(load.pickupDate).toLocaleDateString()}</Text>
          </View>
        </View>
        
        <View style={styles.divider}>
          <Text style={styles.distance}>{load.distance} mi</Text>
        </View>
        
        <View style={styles.location}>
          <MapPin size={16} color={theme.colors.gray} />
          <View style={styles.locationText}>
            <Text style={styles.city}>{load.destination.city}, {load.destination.state}</Text>
            <Text style={styles.date}>{new Date(load.deliveryDate).toLocaleDateString()}</Text>
          </View>
        </View>
      </View>

      <View style={styles.details}>
        <View style={styles.detailItem}>
          <Package size={14} color={theme.colors.gray} />
          <Text style={styles.detailText}>{(load.weight / 1000).toFixed(1)}k lbs</Text>
        </View>
        
        <View style={styles.detailItem}>
          <DollarSign size={14} color={theme.colors.success} />
          <Text style={styles.rate}>${load.rate.toLocaleString()}</Text>
          <Text style={styles.ratePerMile}>(${load.ratePerMile.toFixed(2)}/mi)</Text>
        </View>
      </View>

      {fuel ? (
        <View style={styles.fuelRow} testID="fuel-estimate-row">
          <Fuel size={14} color={theme.colors.gray} />
          <Text style={styles.fuelText}>
            Est fuel {fuel.gallons.toFixed(1)} gal • {formatCurrency(fuel.cost)}
          </Text>
          <Text style={styles.fuelMeta}>@ {fuel.mpg.toFixed(1)} mpg • {formatCurrency(fuel.pricePerGallon)}/gal</Text>
        </View>
      ) : null}

      <Text style={styles.description} numberOfLines={2}>{load.description}</Text>
      
      <Text style={styles.shipper}>{load.shipperName}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  aiRecommended: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: theme.colors.success,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderTopRightRadius: theme.borderRadius.lg,
    borderBottomLeftRadius: theme.borderRadius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  aiText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.xs,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  vehicleTag: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  vehicleText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.xs,
    fontWeight: '600',
  },
  backhaulTag: {
    backgroundColor: theme.colors.warning,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  backhaulText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.xs,
    fontWeight: '600',
  },
  route: {
    marginBottom: theme.spacing.md,
  },
  location: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  locationText: {
    flex: 1,
  },
  city: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  date: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
  },
  divider: {
    marginVertical: theme.spacing.sm,
    paddingLeft: 24,
  },
  distance: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
  },
  details: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
  },
  rate: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.success,
  },
  ratePerMile: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginLeft: 4,
  },
  description: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginBottom: theme.spacing.sm,
  },
  fuelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: theme.spacing.sm,
  },
  fuelText: {
    color: theme.colors.dark,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
  fuelMeta: {
    marginLeft: 6,
    color: theme.colors.gray,
    fontSize: theme.fontSize.xs,
  },
  shipper: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: '500',
  },
});