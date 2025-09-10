import React, { useMemo, memo, useCallback } from 'react';
import { View, Text, StyleSheet, Platform, Pressable } from 'react-native';
import { MapPin, DollarSign, Package, TrendingUp, Fuel, Heart } from 'lucide-react-native';
import { Load } from '@/types';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { estimateFuelForLoad, formatCurrency, simpleFuelMetrics } from '@/utils/fuel';
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

  const simple = useMemo(() => {
    try {
      return simpleFuelMetrics({ rate: load.rate, distance: load.distance, vehicleType: load.vehicleType }, user ?? undefined);
    } catch (e) {
      console.log('[LoadCard] simple fuel metrics error', e);
      return undefined;
    }
  }, [load.rate, load.distance, load.vehicleType, user]);

  const handleCardPress = useCallback(() => {
    try { onPress(); } catch (err) { console.log('[LoadCard] onPress error', err); }
  }, [onPress]);

  const handleFavPress = useCallback((e?: any) => {
    try {
      if (Platform.OS === 'web') { try { e?.stopPropagation?.(); } catch {} }
      toggleFavorite(load.id);
    } catch (err) { console.log('[LoadCard] toggleFavorite error', err); }
  }, [toggleFavorite, load.id]);

  return (
    <>
      {Platform.OS === 'web' ? (
        <View
          style={styles.container}
          onStartShouldSetResponder={() => true}
          onResponderRelease={handleCardPress}
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
            {load.bulkImportId && (
              <View style={styles.bulkTag}>
                <Text style={styles.bulkText}>BULK</Text>
              </View>
            )}
            <Pressable
              onPress={handleFavPress}
              testID={`favorite-${load.id}`}
              style={styles.favButton}
            >
              <Heart
                size={20}
                color={fav ? theme.colors.danger : theme.colors.gray}
                fill={fav ? theme.colors.danger : 'transparent'}
              />
            </Pressable>
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

      {simple ? (
        <View style={styles.chipsRow} testID="load-metrics-chips">
          {typeof simple.rpm === 'number' ? (
            <View style={styles.chip} testID="chip-rpm">
              <Text style={styles.chipLabel}>RPM</Text>
              <Text style={styles.chipValue}>${simple.rpm.toFixed(2)}</Text>
            </View>
          ) : null}
          {typeof simple.mpg === 'number' ? (
            <View style={styles.chip} testID="chip-mpg">
              <Text style={styles.chipLabel}>MPG</Text>
              <Text style={styles.chipValue}>~{simple.mpg.toFixed(1)}</Text>
            </View>
          ) : null}
          {typeof simple.fuelCost === 'number' ? (
            <View style={styles.chip} testID="chip-fuel">
              <Text style={styles.chipLabel}>Fuel est</Text>
              <Text style={styles.chipValue}>{formatCurrency(simple.fuelCost)}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

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
      ) : (
        <Pressable
          style={styles.container}
          onPress={handleCardPress}
          accessibilityRole={'button'}
          accessibilityLabel={'Open load details'}
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
            {load.bulkImportId && (
              <View style={styles.bulkTag}>
                <Text style={styles.bulkText}>BULK</Text>
              </View>
            )}
            <Pressable
              onPress={handleFavPress}
              accessibilityRole={'button'}
              accessibilityLabel={(fav ? 'Unfavorite load' : 'Favorite load')}
              testID={`favorite-${load.id}`}
              style={styles.favButton}
            >
              <Heart
                size={20}
                color={fav ? theme.colors.danger : theme.colors.gray}
                fill={fav ? theme.colors.danger : 'transparent'}
              />
            </Pressable>
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
        </Pressable>
      )}
    </>
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
  bulkTag: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  bulkText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.xs,
    fontWeight: '600',
  },
  favButton: {
    marginLeft: 'auto',
    width: 40,
    height: 40,
    minWidth: 40,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
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
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: theme.spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: theme.colors.lightGray,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray,
  },
  chipValue: {
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
    color: theme.colors.dark,
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
    if (a.bulkImportId !== b.bulkImportId) return false;
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