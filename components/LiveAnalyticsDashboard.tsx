import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { theme } from '@/constants/theme';
import { useLiveAnalytics, LiveAnalytics } from '@/hooks/useLiveAnalytics';
import { formatCurrency } from '@/utils/fuel';
import { Fuel, DollarSign, Clock, TrendingUp, MapPin, AlertCircle } from 'lucide-react-native';

interface LiveAnalyticsDashboardProps {
  load: any;
  compact?: boolean;
  showTitle?: boolean;
  enabled?: boolean;
}

export default function LiveAnalyticsDashboard({ 
  load, 
  compact = false, 
  showTitle = true,
  enabled = true 
}: LiveAnalyticsDashboardProps) {
  const { analytics, loading, error } = useLiveAnalytics(load, enabled);

  if (!enabled) {
    return null;
  }

  if (loading) {
    return (
      <View style={[styles.container, compact && styles.containerCompact]}>
        {showTitle && <Text style={styles.title}>Live Analytics</Text>}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Calculating analytics...</Text>
        </View>
      </View>
    );
  }

  if (error || !analytics) {
    return (
      <View style={[styles.container, compact && styles.containerCompact]}>
        {showTitle && <Text style={styles.title}>Live Analytics</Text>}
        <View style={styles.errorContainer}>
          <AlertCircle size={20} color={theme.colors.warning} />
          <Text style={styles.errorText}>
            {error || `Live analytics initializing on ${Platform.OS}...`}
          </Text>
        </View>
        {__DEV__ && (
          <Text style={styles.debugText}>
            Platform: {Platform.OS} • Load: {!!load} • Enabled: {enabled.toString()}
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      {showTitle && <Text style={styles.title}>🔥 Live Analytics ({Platform.OS})</Text>}
      
      <View style={[styles.metricsGrid, compact && styles.metricsGridCompact]}>
        {/* Fuel Cost */}
        <View style={[styles.metricCard, compact && styles.metricCardCompact]}>
          <View style={styles.metricHeader}>
            <Fuel size={compact ? 16 : 20} color={theme.colors.warning} />
            <Text style={[styles.metricLabel, compact && styles.metricLabelCompact]}>
              Fuel Cost
            </Text>
          </View>
          <Text style={[styles.metricValue, compact && styles.metricValueCompact]}>
            {formatCurrency(analytics.fuelCost)}
          </Text>
          <Text style={[styles.metricSubtext, compact && styles.metricSubtextCompact]}>
            {analytics.gallonsNeeded.toFixed(1)} gal @ {analytics.mpg.toFixed(1)} mpg
          </Text>
        </View>

        {/* Net After Fuel */}
        <View style={[styles.metricCard, compact && styles.metricCardCompact]}>
          <View style={styles.metricHeader}>
            <DollarSign 
              size={compact ? 16 : 20} 
              color={analytics.netAfterFuel >= 0 ? theme.colors.success : theme.colors.danger} 
            />
            <Text style={[styles.metricLabel, compact && styles.metricLabelCompact]}>
              Net After Fuel
            </Text>
          </View>
          <Text style={[
            styles.metricValue, 
            compact && styles.metricValueCompact,
            { color: analytics.netAfterFuel >= 0 ? theme.colors.success : theme.colors.danger }
          ]}>
            {formatCurrency(analytics.netAfterFuel)}
          </Text>
          <Text style={[styles.metricSubtext, compact && styles.metricSubtextCompact]}>
            {analytics.netAfterFuel >= 0 ? 'Profitable' : 'Loss'}
          </Text>
        </View>

        {/* Profit Per Mile */}
        <View style={[styles.metricCard, compact && styles.metricCardCompact]}>
          <View style={styles.metricHeader}>
            <TrendingUp size={compact ? 16 : 20} color={theme.colors.primary} />
            <Text style={[styles.metricLabel, compact && styles.metricLabelCompact]}>
              Profit/Mile
            </Text>
          </View>
          <Text style={[styles.metricValue, compact && styles.metricValueCompact]}>
            ${analytics.profitPerMile.toFixed(2)}
          </Text>
          <Text style={[styles.metricSubtext, compact && styles.metricSubtextCompact]}>
            per mile
          </Text>
        </View>

        {/* ETA */}
        <View style={[styles.metricCard, compact && styles.metricCardCompact]}>
          <View style={styles.metricHeader}>
            <Clock size={compact ? 16 : 20} color={theme.colors.gray} />
            <Text style={[styles.metricLabel, compact && styles.metricLabelCompact]}>
              ETA
            </Text>
          </View>
          <Text style={[styles.metricValue, compact && styles.metricValueCompact]}>
            {analytics.eta}
          </Text>
          <Text style={[styles.metricSubtext, compact && styles.metricSubtextCompact]}>
            {analytics.estimatedMiles} miles
          </Text>
        </View>
      </View>

      {/* Summary Row */}
      {!compact && (
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <MapPin size={16} color={theme.colors.gray} />
            <Text style={styles.summaryText}>
              {analytics.estimatedMiles} mi • {analytics.gallonsNeeded.toFixed(1)} gal • {analytics.mpg.toFixed(1)} mpg
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.white,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.lightGray,
  },
  containerCompact: {
    padding: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  title: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.lg,
  },
  loadingText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.lg,
  },
  errorText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    textAlign: 'center',
    fontStyle: 'italic',
    flex: 1,
  },
  debugText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray,
    textAlign: 'center',
    opacity: 0.7,
    marginTop: theme.spacing.sm,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
    justifyContent: 'space-between',
  },
  metricsGridCompact: {
    gap: theme.spacing.sm,
  },
  metricCard: {
    flex: 1,
    minWidth: '48%',
    backgroundColor: theme.colors.lightGray,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  metricCardCompact: {
    padding: theme.spacing.sm,
    minWidth: '47%',
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  metricLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    fontWeight: '500',
  },
  metricLabelCompact: {
    fontSize: theme.fontSize.xs,
  },
  metricValue: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.dark,
    marginBottom: 2,
  },
  metricValueCompact: {
    fontSize: theme.fontSize.lg,
  },
  metricSubtext: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray,
    textAlign: 'center',
  },
  metricSubtextCompact: {
    fontSize: 10,
  },
  summaryRow: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.lightGray,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    justifyContent: 'center',
  },
  summaryText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
  },
});