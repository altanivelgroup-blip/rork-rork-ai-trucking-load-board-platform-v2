import React, { useMemo, memo, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Platform, GestureResponderEvent } from 'react-native';
import { MapPin, DollarSign, Package, TrendingUp, Fuel, Heart } from 'lucide-react-native';
import { Load } from '@/types';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { estimateFuelForLoad, formatCurrency } from '@/utils/fuel';
import { useLoads } from '@/hooks/useLoads';

interface LoadCardProps {
  load: Load;
  onPress: () => void;
  distanceMiles?: number;
}

const LoadCardComponent: React.FC<LoadCardProps> = ({ load, onPress, distanceMiles }) => {
  const { user } = useAuth();
  const { isFavorited, toggleFavorite } = useLoads();
  const fav = isFavorited(load.id);
  const vehicleColor = theme.colors[load.vehicleType as keyof typeof theme.colors] || theme.colors.primary;
  const fuel = useMemo(() => {
    try {
      return estimateFuelForLoad(load, user);
    } catch (e) {
      console.log('[LoadCard] fuel estimate error', e);
      return undefined;
    }
  }, [load, user]);

  const isPressingCard = useRef(false);
  const isPressingFav = useRef(false);

  const handleCardResponderRelease = useCallback((e: GestureResponderEvent) => {
    if (isPressingFav.current) {
      isPressingFav.current = false;
      return;
    }
    try { onPress(); } catch (err) { console.log('[LoadCard] onPress error', err); }
  }, [onPress]);

  const handleFavResponderRelease = useCallback(() => {
    isPressingFav.current = true;
    try { toggleFavorite(load.id); } catch (err) { console.log('[LoadCard] toggleFavorite error', err); }
  }, [toggleFavorite, load.id]);

  return (
    <View
      style={styles.container}
      onStartShouldSetResponder={() => true}
      onResponderRelease={handleCardResponderRelease}
      accessible
      accessibilityRole={Platform.OS === 'web' ? undefined : 'button'}
      accessibilityLabel={Platform.OS === 'web' ? undefined : 'Open load details'}
      testID="load-card"
    >
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
        <View
          onStartShouldSetResponder={() => true}
          onResponderRelease={handleFavResponderRelease}
          accessibilityRole={Platform.OS === 'web' ? undefined : 'button'}
          accessibilityLabel={Platform.OS === 'web' ? undefined : (fav ? 'Unfavorite load' : 'Favorite load')}
          testID={`favorite-${load.id}`}
          style={styles.favButton}
        >
          <Heart
            size={20}
            color={fav ? theme.colors.danger : theme.colors.gray}
            fill={fav ? theme.colors.danger : 'transparent'}
          />
        </View>
      </View>

      <View style={styles.route}>
        <View style={styles.location}>
          <MapPin size={16} color={theme.colors.gray} />
          <View style={styles.locationText}>
            <Text style={styles.city}>{load.origin.city}, {load.origin.state}</Text>
            <Text style={styles.date}>{new Date(load.pickupDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
          </View>
        </View>
        
        <View style={styles.divider}>
          <Text style={styles.distance} testID="labelDistance">{typeof distanceMiles === 'number' ? `${distanceMiles.toFixed(1)} mi` : `${load.distance} mi`}</Text>
        </View>
        
        <View style={styles.location}>
          <MapPin size={16} color={theme.colors.gray} />
          <View style={styles.locationText}>
            <Text style={styles.city}>{load.destination.city}, {load.destination.state}</Text>
            <Text style={styles.date}>{new Date(load.deliveryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
          </View>
        </View>
      </View>

      <View style={styles.details}>
        <View style={styles.detailItem}>
          <Package size={14} color={theme.colors.gray} />
          <Text style={styles.detailText}>{load.weight.toLocaleString()} lbs</Text>
        </View>
        
        <View style={styles.detailItem}>
          <DollarSign size={14} color={theme.colors.success} />
          <Text style={styles.rate}>{formatCurrency(load.rate)}</Text>
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
    </View>
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
    alignItems: 'center',
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
  favButton: {
    marginLeft: 'auto',
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    cursor: 'pointer',
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
  pressed: {
    opacity: 0.95,
  },
  favPressed: {
    opacity: 0.7,
  },
});

export const LoadCard = memo(
  LoadCardComponent,
  (prev, next) => {
    const a = prev.load;
    const b = next.load;
    if (prev.onPress !== next.onPress) return false;
    if (prev.distanceMiles !== next.distanceMiles) return false;
    if (a.id !== b.id) return false;
    if (a.status !== b.status) return false;
    if (a.rate !== b.rate || a.ratePerMile !== b.ratePerMile) return false;
    if (a.distance !== b.distance) return false;
    if ((a.aiScore ?? 0) !== (b.aiScore ?? 0)) return false;
    if ((a.isBackhaul ?? false) !== (b.isBackhaul ?? false)) return false;
    if (a.vehicleType !== b.vehicleType) return false;
    if (a.weight !== b.weight) return false;
    if (a.pickupDate.toString() !== b.pickupDate.toString()) return false;
    if (a.deliveryDate.toString() !== b.deliveryDate.toString()) return false;
    if (a.origin.city !== b.origin.city || a.origin.state !== b.origin.state) return false;
    if (a.destination.city !== b.destination.city || a.destination.state !== b.destination.state) return false;
    if (a.description !== b.description) return false;
    if (a.shipperName !== b.shipperName) return false;
    return true;
  }
);

LoadCardComponent.displayName = 'LoadCard';