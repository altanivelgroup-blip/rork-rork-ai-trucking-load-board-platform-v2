import React, { memo, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Load } from '@/types';

interface LoadCardProps {
  load: Load;
  onPress: () => void;
  showBids?: boolean;
  showStatus?: boolean;
  showActions?: boolean;
}

const LoadCardComponent: React.FC<LoadCardProps> = ({ 
  load, 
  onPress, 
  showBids = true, 
  showStatus = true, 
  showActions = false 
}) => {
  const handleCardPress = useCallback(() => {
    try { onPress(); } catch (err) { console.log('[LoadCard] onPress error', err); }
  }, [onPress]);

  const formatCurrency = (amount: number) => {
    if (!amount || typeof amount !== 'number' || amount < 0) return '$0';
    const sanitizedAmount = Math.min(amount, 999999); // Cap at reasonable max
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(sanitizedAmount);
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
    // Show rush badge based on aiScore or randomly for demo
    const isRushDelivery = (load.aiScore && load.aiScore > 90) || Math.random() > 0.7;
    
    if (isRushDelivery) {
      return (
        <View style={styles.rushBadge}>
          <Text style={styles.rushText}>Rush Delivery</Text>
        </View>
      );
    }
    return null;
  };

  const originText = typeof load.origin === 'string'
    ? load.origin
    : `${load.origin?.city ?? 'Dallas'}, ${load.origin?.state ?? 'TX'}`;
  
  const destText = typeof load.destination === 'string'
    ? load.destination
    : `${load.destination?.city ?? 'Chicago'}, ${load.destination?.state ?? 'IL'}`;

  const bidsCount = Math.floor(Math.random() * 5) + 1;
  const statusText = load.status === 'available' || load.status === 'OPEN' ? 'Pending' : 
                    load.status === 'delivered' ? 'Completed' : 
                    load.status === 'in-transit' ? 'Booked' : 'Pending';

  return (
    <Pressable
      style={styles.container}
      onPress={handleCardPress}
      accessibilityRole={'button'}
      accessibilityLabel={'Open load details'}
      testID="load-card"
    >
      {/* Status Pills Row */}
      <View style={styles.statusRow}>
        {getStatusBadge()}
        {getRushBadge()}
      </View>

      {/* Load Details */}
      <Text style={styles.statusLine}>Status: {statusText}</Text>
      <Text style={styles.rate}>Rate: {formatCurrency(load.rate)}</Text>
      <Text style={styles.route}>Route: {originText} → {destText}</Text>
      
      {showBids && (
        <Text style={styles.bidsText}>Bids: {bidsCount}</Text>
      )}
      
      {/* Tap for Details */}
      <Text style={styles.tapForDetails}>Tap for Details</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1976D2',
    padding: 16,
    marginHorizontal: 0,
    marginVertical: 0,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  rushBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  rushText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '600',
  },
  statusLine: {
    fontSize: 14,
    color: '#424242',
    marginBottom: 4,
    fontWeight: '500',
  },
  rate: {
    fontSize: 16,
    color: '#424242',
    marginBottom: 4,
    fontWeight: '600',
  },
  route: {
    fontSize: 14,
    color: '#424242',
    marginBottom: 4,
    fontWeight: '500',
  },
  bidsText: {
    fontSize: 14,
    color: '#424242',
    marginBottom: 12,
    fontWeight: '500',
  },
  tapForDetails: {
    fontSize: 14,
    color: '#1976D2',
    fontWeight: '600',
    textAlign: 'center',
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