import React, { memo, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Platform } from 'react-native';
import { Load } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { useLiveAnalytics } from '@/hooks/useLiveAnalytics';
import { SHOW_ANALYTICS_ON_CARDS } from '@/src/config/runtime';
import { formatCurrency } from '@/utils/fuel';
import { theme } from '@/constants/theme';
import { Fuel, DollarSign, Clock, AlertCircle } from 'lucide-react-native';

interface LoadCardProps {
  load: Load;
  onPress: () => void;
  showBids?: boolean;
  showStatus?: boolean;
  showActions?: boolean;
  showAnalytics?: boolean;
}



const LoadCardComponent: React.FC<LoadCardProps> = ({ 
  load, 
  onPress, 
  showBids = true, 
  showStatus = true, 
  showActions = false,
  showAnalytics = SHOW_ANALYTICS_ON_CARDS
}) => {
  const { user } = useAuth();
  // PERMANENT FIX: Always enable analytics for drivers with enhanced error handling
  const { analytics, loading: analyticsLoading, error: analyticsError } = useLiveAnalytics(
    load, 
    showAnalytics && user?.role === 'driver'
  );
  
  // Log analytics state for debugging
  React.useEffect(() => {
    if (user?.role === 'driver' && showAnalytics) {
      console.log('[LoadCard] 📊 PERMANENT ANALYTICS - Load card analytics state:', {
        loadId: load.id,
        hasAnalytics: !!analytics,
        loading: analyticsLoading,
        error: analyticsError,
        userRole: user.role,
        showAnalytics,
        platform: Platform.OS
      });
    }
  }, [analytics, analyticsLoading, analyticsError, user?.role, showAnalytics, load.id]);
  const handleCardPress = useCallback(() => {
    try { onPress(); } catch (err) { console.log('[LoadCard] onPress error', err); }
  }, [onPress]);

  const formatCurrency = useCallback((amount: number) => {
    if (!amount || typeof amount !== 'number' || amount < 0) return '$0';
    const sanitizedAmount = Math.min(amount, 999999); // Cap at reasonable max
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(sanitizedAmount);
  }, []);

  const statusBadgeData = useMemo(() => {
    if (!showStatus) return null;
    
    const status = load.status === 'available' || load.status === 'OPEN' ? 'Active' : 
                  load.status === 'delivered' ? 'Completed' : 
                  load.status === 'in-transit' ? 'Booked' : 'Active';
    
    const backgroundColor = status === 'Active' ? '#4CAF50' : 
                           status === 'Completed' ? '#F44336' : 
                           status === 'Booked' ? '#4CAF50' : '#4CAF50';
    
    return { status, backgroundColor };
  }, [showStatus, load.status]);

  const getStatusBadge = () => {
    if (!statusBadgeData) return null;
    
    return (
      <View style={[styles.statusBadge, { backgroundColor: statusBadgeData.backgroundColor }]}>
        <Text style={styles.statusText}>{statusBadgeData.status}</Text>
      </View>
    );
  };

  const isRushDelivery = useMemo(() => {
    // Show rush badge based on aiScore or use load ID for consistent demo behavior
    return (load.aiScore && load.aiScore > 90) || load.id.charCodeAt(0) % 3 === 0;
  }, [load.aiScore, load.id]);

  const getRushBadge = () => {
    if (isRushDelivery) {
      return (
        <View style={styles.rushBadge}>
          <Text style={styles.rushText}>Rush Delivery</Text>
        </View>
      );
    }
    return null;
  };

  const originText = useMemo(() => {
    if (typeof load.origin === "object" && load.origin?.city) {
      return `${load.origin.city}, ${load.origin.state || ''}`;
    }
    return (load as any).originCity || 'Unknown';
  }, [load.origin, (load as any).originCity]);
  
  const destText = useMemo(() => {
    if (typeof load.destination === "object" && load.destination?.city) {
      return `${load.destination.city}, ${load.destination.state || ''}`;
    }
    return (load as any).destCity || 'Unknown';
  }, [load.destination, (load as any).destCity]);
  
  const rateVal = useMemo(() => {
    return load.rate ?? (load as any).rateAmount ?? (load as any).rateTotalUSD ?? 0;
  }, [load.rate, (load as any).rateAmount, (load as any).rateTotalUSD]);

  const bidsCount = useMemo(() => {
    // Use load ID for consistent demo behavior instead of random
    return (load.id.charCodeAt(0) % 5) + 1;
  }, [load.id]);
  
  const statusText = useMemo(() => {
    return load.status === 'available' || load.status === 'OPEN' ? 'Pending' : 
           load.status === 'delivered' ? 'Completed' : 
           load.status === 'in-transit' ? 'Booked' : 'Pending';
  }, [load.status]);



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
      <Text style={styles.rate}>Rate: {formatCurrency(rateVal)}</Text>
      <Text style={styles.route}>Route: {originText} → {destText}</Text>
      
      {showBids && (
        <Text style={styles.bidsText}>Bids: {bidsCount}</Text>
      )}
      
      {/* PERMANENT FIX: Enhanced Live Analytics Section - Always show for drivers */}
      {showAnalytics && user?.role === 'driver' && (
        <View style={styles.analyticsSection}>
          <Text style={styles.analyticsTitle}>🔥 Live Analytics ({Platform.OS})</Text>
          {analyticsLoading ? (
            <View style={styles.analyticsLoading}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Calculating ETA, fuel, ROI...</Text>
            </View>
          ) : analytics ? (
            <View style={styles.analyticsGrid}>
              <View style={styles.analyticsPill}>
                <Fuel size={14} color={theme.colors.warning} />
                <Text style={styles.analyticsLabel}>Fuel Cost</Text>
                <Text style={styles.analyticsValue}>{formatCurrency(analytics.fuelCost || 0)}</Text>
              </View>
              <View style={styles.analyticsPill}>
                <DollarSign size={14} color={analytics.netAfterFuel >= 0 ? theme.colors.success : theme.colors.danger} />
                <Text style={styles.analyticsLabel}>Net Profit</Text>
                <Text style={[styles.analyticsValue, { color: (analytics.netAfterFuel || 0) >= 0 ? theme.colors.success : theme.colors.danger }]}>
                  {formatCurrency(analytics.netAfterFuel || 0)}
                </Text>
              </View>
              <View style={styles.analyticsPill}>
                <DollarSign size={14} color={theme.colors.primary} />
                <Text style={styles.analyticsLabel}>Profit/Mile</Text>
                <Text style={styles.analyticsValue}>${(analytics.profitPerMile || 0).toFixed(2)}</Text>
              </View>
              <View style={styles.analyticsPill}>
                <Clock size={14} color={theme.colors.secondary} />
                <Text style={styles.analyticsLabel}>ETA</Text>
                <Text style={styles.analyticsValue}>{analytics.eta || 'Calculating...'}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.analyticsErrorContainer}>
              <AlertCircle size={12} color={theme.colors.warning} />
              <Text style={styles.analyticsError}>
                {analyticsError || `Analytics initializing on ${Platform.OS}...`}
              </Text>
            </View>
          )}
          
          {/* Additional analytics info for debugging */}
          {__DEV__ && analytics && (
            <View style={styles.debugInfo}>
              <Text style={styles.debugText}>
                {analytics.estimatedMiles || 0}mi • {(analytics.gallonsNeeded || 0).toFixed(1)}gal • {(analytics.mpg || 0).toFixed(1)}mpg
              </Text>
            </View>
          )}
        </View>
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
    padding: 16,
    marginHorizontal: 0,
    marginVertical: 0,
    borderWidth: 2,
    borderColor: '#2563EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    color: '#374151',
    marginBottom: 4,
    fontWeight: '500',
  },
  rate: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 4,
    fontWeight: '600',
  },
  route: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
    fontWeight: '500',
  },
  bidsText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 12,
    fontWeight: '500',
  },
  tapForDetails: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '600',
    textAlign: 'center',
  },
  analyticsSection: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  analyticsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
    textAlign: 'center',
  },
  analyticsLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#64748B',
  },
  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'space-between',
  },
  analyticsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minWidth: '48%',
  },
  analyticsLabel: {
    fontSize: 10,
    color: '#64748B',
    flex: 1,
  },
  analyticsValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1E293B',
  },
  analyticsErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  analyticsError: {
    fontSize: 10,
    color: '#64748B',
    textAlign: 'center',
    fontStyle: 'italic',
    flex: 1,
  },
  debugInfo: {
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  debugText: {
    fontSize: 9,
    color: '#64748B',
    textAlign: 'center',
    opacity: 0.7,
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