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
      {/* Status and Rush badges row */}
      <View style={styles.badgesRow}>
        {getStatusBadge()}
        {getRushBadge()}
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

      {/* Bids */}
      {showBids && (
        <View style={styles.bidsRow}>
          <Text style={styles.bidsText}>Bids: {Math.floor(Math.random() * 5) + 1}</Text>
          <Text style={styles.tapForDetails}>Tap for Details</Text>
        </View>
      )}

      {/* Updated via API indicator */}
      <Text style={styles.apiIndicator}>Updated via API</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1976D2',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  rushBadge: {
    backgroundColor: '#FFC107',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  rushText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  statusLine: {
    fontSize: 14,
    color: '#333333',
    marginBottom: 4,
  },
  rate: {
    fontSize: 14,
    color: '#333333',
    marginBottom: 4,
  },
  route: {
    fontSize: 14,
    color: '#333333',
    marginBottom: 8,
  },
  bidsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bidsText: {
    fontSize: 14,
    color: '#333333',
  },
  tapForDetails: {
    fontSize: 14,
    color: '#1976D2',
    fontWeight: '500',
  },
  apiIndicator: {
    fontSize: 12,
    color: '#666666',
    fontStyle: 'italic',
    textAlign: 'right',
    marginTop: 4,
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