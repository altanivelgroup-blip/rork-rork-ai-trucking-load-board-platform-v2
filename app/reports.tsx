import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { BarChart3 } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/Toast';

const fontWeight700 = '700' as const;
const fontWeight600 = '600' as const;

export default function ReportAnalyticsScreen() {
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
      <View style={styles.content}>
        <View style={styles.header}>
          <BarChart3 size={32} color={theme.colors.primary} />
          <Text style={styles.title}>Report Analytics</Text>
          <Text style={styles.subtitle}>Admin-only analytics and reporting dashboard</Text>
        </View>
        
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>Report Analytics Dashboard</Text>
          <Text style={styles.placeholderSubtext}>
            This is the new Report Analytics page accessible only to admin users.
            Future analytics features will be implemented here.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.lightGray,
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  title: {
    fontSize: theme.fontSize.xxl,
    fontWeight: fontWeight700,
    color: theme.colors.dark,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  placeholderText: {
    fontSize: theme.fontSize.lg,
    fontWeight: fontWeight600,
    color: theme.colors.dark,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  placeholderSubtext: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
    textAlign: 'center',
    lineHeight: 22,
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