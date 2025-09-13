import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import { BarChart3, ArrowLeft, ChevronRight, FileText, TrendingUp } from 'lucide-react-native';
import { theme } from '@/constants/theme';

import { isAdminClient } from '@/src/lib/authz';

const fontWeight700 = '700' as const;

export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState<boolean>(true);
  
  // Check admin privileges for UI visibility
  useEffect(() => {
    let isMounted = true;
    
    const checkAdminAccess = async () => {
      try {
        console.log('[Reports] Checking admin access for UI visibility...');
        const adminResult = await isAdminClient();
        
        if (isMounted) {
          setIsAdmin(adminResult);
          setIsCheckingAdmin(false);
          console.log('[Reports] Admin check complete:', adminResult);
        }
      } catch (error) {
        console.error('[Reports] Admin check failed:', error);
        if (isMounted) {
          setIsAdmin(false);
          setIsCheckingAdmin(false);
        }
      }
    };
    
    checkAdminAccess();
    
    return () => {
      isMounted = false;
    };
  }, []);
  


  const handleBackPress = () => {
    // Navigate back to admin loads page
    router.push('/(tabs)/loads');
  };

  const handleOpenReportAnalytics = () => {
    console.log('[Reports] Opening Report Analytics screen');
    router.push('/reports-analytics' as any);
  };

  return (
    <>
      <Stack.Screen 
        options={{
          title: 'Reports',
          headerLeft: () => (
            <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
              <ArrowLeft size={24} color={theme.colors.dark} />
            </TouchableOpacity>
          ),
          headerStyle: {
            backgroundColor: theme.colors.white,
          },
          headerTitleStyle: {
            color: theme.colors.dark,
            fontSize: theme.fontSize.lg,
            fontWeight: '600' as const,
          },
        }}
      />
      <ScrollView style={[styles.container, { paddingTop: insets.top }]} testID="reportsScreen">
        {/* Header Section */}
        <View style={styles.headerSection}>
          <Text style={styles.headerTitle}>LoadRush Reports</Text>
          <Text style={styles.headerSubtitle}>Access comprehensive analytics and reporting tools</Text>
        </View>

        {/* Report Analytics Card - Only show for admins */}
        {!isCheckingAdmin && isAdmin && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Analytics</Text>
            <TouchableOpacity 
              style={styles.reportCard} 
              onPress={handleOpenReportAnalytics}
              testID="open-report-analytics-button"
            >
              <View style={styles.reportCardLeft}>
                <View style={styles.reportIcon}>
                  <BarChart3 size={24} color="#3B82F6" />
                </View>
                <View style={styles.reportContent}>
                  <Text style={styles.reportTitle}>Report Analytics</Text>
                  <Text style={styles.reportDescription}>Live performance graphs, KPI metrics, and activity monitoring</Text>
                  <View style={styles.reportFeatures}>
                    <View style={styles.featureItem}>
                      <TrendingUp size={12} color="#10B981" />
                      <Text style={styles.featureText}>Live Graphs</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <FileText size={12} color="#10B981" />
                      <Text style={styles.featureText}>KPI Cards</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <BarChart3 size={12} color="#10B981" />
                      <Text style={styles.featureText}>Activity Tables</Text>
                    </View>
                  </View>
                </View>
              </View>
              <ChevronRight size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        )}

        {/* Coming Soon Section - Show for all users */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{isAdmin ? 'Coming Soon' : 'Reports'}</Text>
          <View style={styles.comingSoonCard}>
            <Text style={styles.comingSoonTitle}>
              {isAdmin ? 'Additional Reports' : 'Report Analytics'}
            </Text>
            <Text style={styles.comingSoonDescription}>
              {isAdmin 
                ? 'More reporting features will be available in future updates'
                : 'Advanced analytics are available for admin users only'
              }
            </Text>
          </View>
        </View>
      </ScrollView>
    </>
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
  backButton: {
    padding: theme.spacing.sm,
    marginLeft: -theme.spacing.sm,
  },
  headerSection: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700' as const,
    color: theme.colors.dark,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
  },
  section: {
    padding: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600' as const,
    color: theme.colors.dark,
    marginBottom: theme.spacing.md,
  },
  reportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  reportCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  reportIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EBF8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  reportContent: {
    flex: 1,
  },
  reportTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.dark,
    marginBottom: 4,
  },
  reportDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginBottom: 8,
  },
  reportFeatures: {
    flexDirection: 'row',
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  featureText: {
    fontSize: theme.fontSize.xs,
    color: '#10B981',
    fontWeight: '500' as const,
  },
  comingSoonCard: {
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  comingSoonTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  comingSoonDescription: {
    fontSize: theme.fontSize.sm,
    color: '#9CA3AF',
  },
});