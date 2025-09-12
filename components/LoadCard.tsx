import React, { memo, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Load } from '@/types';

interface LoadCardProps {
  load: Load;
  onPress: () => void;
  showBids?: boolean;
  showStatus?: boolean;
}

const LoadCardComponent: React.FC<LoadCardProps> = ({ load, onPress, showBids = true, showStatus = true }) => {
  const handleCardPress = useCallback(() => {
    try { onPress(); } catch (err) { console.log('[LoadCard] onPress error', err); }
  }, [onPress]);

  const formatCurrency = (amount: number) => {
    if (!amount || typeof amount !== 'number') return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = () => {
    if (!showStatus) return null;
    
    const status = load.status === 'available' || load.status === 'OPEN' ? 'Active' : 
                  load.status === 'delivered' ? 'Completed' : 
                  load.status === 'in-transit' ? 'Booked' : 'Active';
    
    const backgroundColor = status === 'Active' ? '#4CAF50' : 
                           status === 'Completed' ? '#F44336' : 
                           status === 'Booked' ? '#4CAF50' : '#4CAF50';
    
    return (
      <View style={[styles.statusBadge, { backgroundColor }]}>
        <Text style={styles.statusText}>{status}</Text>
      </View>
    );
  };

  const getRushBadge = () => {
    // Show rush badge if it's a rush delivery (you can add this field to Load type)
    // For now, showing it randomly for demo purposes
    if (load.aiScore && load.aiScore > 90) {
      return (
        <View style={styles.rushBadge}>
          <Text style={styles.rushText}>Rush Delivery</Text>
        </View>
      );
    }
    return null;
  };

  return (
    <Pressable
      style={styles.container}
      onPress={handleCardPress}
      accessibilityRole={'button'}
      accessibilityLabel={'Open load details'}
      testID="load-card"
    >
      {/* Top row with badges */}
      <View style={styles.topRow}>
        <View style={styles.leftBadges}>
          {getStatusBadge()}
        </View>
        <View style={styles.rightBadges}>
          {getRushBadge()}
        </View>
      </View>

      {/* Status line */}
      {showStatus && (
        <Text style={styles.statusLine}>
          Status: {load.status === 'available' || load.status === 'OPEN' ? 'Pending' : 
                  load.status === 'delivered' ? 'Completed' : 
                  load.status === 'in-transit' ? 'Booked' : 'Pending'}
        </Text>
      )}

      {/* Rate */}
      <Text style={styles.rate}>Rate: {formatCurrency(load.rate)}</Text>

      {/* Route */}
      <Text style={styles.route}>
        Route: {load.origin.city}, {load.origin.state} → {load.destination.city}, {load.destination.state}
      </Text>

      {/* Bottom row with bids and tap for details */}
      <View style={styles.bottomRow}>
        {showBids && (
          <Text style={styles.bidsText}>Bids: {Math.floor(Math.random() * 5) + 1}</Text>
        )}
        <Text style={styles.tapForDetails}>Tap for Details</Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  leftBadges: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightBadges: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  rushBadge: {
    backgroundColor: '#FFC107',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  rushText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  statusLine: {
    fontSize: 13,
    color: '#424242',
    marginBottom: 3,
  },
  rate: {
    fontSize: 13,
    color: '#424242',
    marginBottom: 3,
  },
  route: {
    fontSize: 13,
    color: '#424242',
    marginBottom: 8,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bidsText: {
    fontSize: 13,
    color: '#424242',
  },
  tapForDetails: {
    fontSize: 13,
    color: '#1976D2',
    fontWeight: '500',
  },
});

export const LoadCard = memo(
  LoadCardComponent,
  (prev, next) => {
    const a = prev.load;
    const b = next.load;
    if (prev.onPress !== next.onPress) return false;
    if (prev.showBids !== next.showBids) return false;
    if (prev.showStatus !== next.showStatus) return false;
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