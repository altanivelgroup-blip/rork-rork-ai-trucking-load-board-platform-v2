import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { BarChart3 } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/Toast';
import ReportAnalyticsDashboard from '@/components/analytics/ReportAnalyticsDashboard';

const fontWeight700 = '700' as const;

export default function ReportsScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { show } = useToast();
  
  // Admin access control with role-based redirects
  useEffect(() => {
    console.log('[ReportAnalytics] Checking user access:', { role: user?.role, email: user?.email });
    
    // Check if user is admin
    const isAdmin = (user?.role as string) === 'admin' || user?.email === 'admin@loadrush.com';
    
    if (!isAdmin) {
      console.log('[ReportAnalytics] Access denied - not admin, redirecting');
      show('Not authorized', 'info', 3000);
      
      // Role-based redirect
      if (user?.role === 'driver') {
        router.replace('/dashboard');
      } else if (user?.role === 'shipper') {
        router.replace('/shipper');
      } else {
        router.replace('/dashboard');
      }
      return;
    }
    
    console.log('[ReportAnalytics] Admin access granted');
  }, [user, show]);
  
  // Show loading or access denied state while checking permissions
  const isAdmin = (user?.role as string) === 'admin' || user?.email === 'admin@loadrush.com';
  
  if (!isAdmin) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.accessDenied}>
          <BarChart3 size={48} color={theme.colors.gray} />
          <Text style={styles.accessDeniedTitle}>Checking Access...</Text>
          <Text style={styles.accessDeniedText}>Verifying admin privileges</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]} testID="reportAnalyticsScreen">
      <ReportAnalyticsDashboard />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  accessDenied: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  accessDeniedTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: fontWeight700,
    color: theme.colors.gray,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  accessDeniedText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
});