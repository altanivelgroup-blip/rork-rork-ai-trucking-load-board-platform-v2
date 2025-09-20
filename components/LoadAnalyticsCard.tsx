import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '@/constants/theme';
import { calculateLoadAnalytics, formatCurrency } from '@/utils/fuelCalculator';

interface LoadAnalyticsCardProps {
  load: any;
  driver: any;
  dieselPrice?: number;
  gasPrice?: number;
}

export default function LoadAnalyticsCard({ load, driver, dieselPrice, gasPrice }: LoadAnalyticsCardProps) {
  const analytics = calculateLoadAnalytics(load, driver, { dieselPrice, gasPrice });

  if (!analytics) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Fuel Analytics</Text>
        <Text style={styles.note}>Add MPG and distance to see estimates.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Fuel Analytics</Text>
      
      <View style={styles.metricsGrid}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Miles</Text>
          <Text style={styles.metricValue}>{Math.round(analytics.miles)}</Text>
        </View>
        
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>MPG</Text>
          <Text style={styles.metricValue}>{analytics.mpg.toFixed(1)}</Text>
        </View>
        
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Fuel Type</Text>
          <Text style={styles.metricValue}>{analytics.fuel === 'gasoline' ? 'Gas' : 'Diesel'}</Text>
        </View>
        
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Fuel $/gal</Text>
          <Text style={styles.metricValue}>${analytics.ppg.toFixed(2)}</Text>
        </View>
        
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Gallons Needed</Text>
          <Text style={styles.metricValue}>{analytics.gallonsNeeded.toFixed(1)}</Text>
        </View>
        
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Fuel Cost</Text>
          <Text style={styles.metricValue}>{formatCurrency(analytics.fuelCost)}</Text>
        </View>
        
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Gross</Text>
          <Text style={styles.metricValue}>{formatCurrency(analytics.gross)}</Text>
        </View>
        
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Net</Text>
          <Text style={[styles.metricValue, { color: analytics.netRevenue >= 0 ? theme.colors.success : theme.colors.danger }]}>
            {formatCurrency(analytics.netRevenue)}
          </Text>
        </View>
      </View>
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
  title: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: theme.spacing.md,
  },
  note: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  metricItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  metricLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark,
  },
});