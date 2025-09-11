import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { PlusCircle, Upload, Package, FileText, BarChart3, Eye } from 'lucide-react-native';

type PostOption = {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  route: string;
  testID: string;
};

export default function ShipperPostScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const isShipper = user?.role === 'shipper';
  
  // Redirect non-shippers
  React.useEffect(() => {
    if (user && !isShipper) {
      router.replace('/(tabs)/dashboard');
    }
  }, [user, isShipper, router]);
  
  const handleOptionPress = useCallback((route: string) => {
    try {
      router.push(route as any);
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Error', 'Unable to navigate to this page');
    }
  }, [router]);

  const postOptions: PostOption[] = [
    {
      id: 'post-single',
      title: 'Post Single Load',
      subtitle: 'Create a new load posting with details',
      icon: PlusCircle,
      route: '/post-load',
      testID: 'post-single-load'
    },
    {
      id: 'bulk-upload',
      title: 'Bulk Upload (CSV)',
      subtitle: 'Import multiple loads from CSV file',
      icon: Upload,
      route: '/csv-bulk-upload',
      testID: 'bulk-upload-csv'
    },
    {
      id: 'my-loads',
      title: 'My Posted Loads',
      subtitle: 'View and manage your active postings',
      icon: Package,
      route: '/loads',
      testID: 'my-posted-loads'
    },
    {
      id: 'load-templates',
      title: 'Load Templates',
      subtitle: 'Save and reuse common load configurations',
      icon: FileText,
      route: '/load-templates',
      testID: 'load-templates'
    }
  ];

  if (!isShipper) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Post Loads' }} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.heading}>Post & Manage Loads</Text>
          <Text style={styles.subheading}>Create new postings and manage existing ones</Text>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Package size={20} color={theme.colors.primary} />
            <Text style={styles.statValue}>{(user as any)?.activeLoads ?? 0}</Text>
            <Text style={styles.statLabel}>Active Loads</Text>
          </View>
          <View style={styles.statCard}>
            <BarChart3 size={20} color={theme.colors.success} />
            <Text style={styles.statValue}>{(user as any)?.totalLoadsPosted ?? 0}</Text>
            <Text style={styles.statLabel}>Total Posted</Text>
          </View>
          <View style={styles.statCard}>
            <Eye size={20} color={theme.colors.warning} />
            <Text style={styles.statValue}>{Math.floor(((user as any)?.totalLoadsPosted ?? 0) * 0.7)}</Text>
            <Text style={styles.statLabel}>Views</Text>
          </View>
        </View>

        {/* Post Options */}
        <View style={styles.optionsContainer}>
          {postOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={styles.optionCard}
              onPress={() => handleOptionPress(option.route)}
              testID={option.testID}
              activeOpacity={0.7}
            >
              <View style={styles.optionIconContainer}>
                <option.icon size={24} color={theme.colors.primary} />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>{option.title}</Text>
                <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsRow}>
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => handleOptionPress('/post-load')}
              testID="quick-post-load"
            >
              <PlusCircle size={20} color={theme.colors.white} />
              <Text style={styles.quickActionText}>Post Load</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.quickActionButton, styles.quickActionSecondary]}
              onPress={() => handleOptionPress('/csv-bulk-upload')}
              testID="quick-bulk-upload"
            >
              <Upload size={20} color={theme.colors.primary} />
              <Text style={[styles.quickActionText, styles.quickActionTextSecondary]}>Bulk Upload</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.lightGray,
  },
  scroll: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  header: {
    marginBottom: theme.spacing.lg,
  },
  heading: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.dark,
    marginBottom: 4,
  },
  subheading: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.white,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  statValue: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.dark,
    marginTop: theme.spacing.xs,
  },
  statLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray,
    marginTop: 2,
  },
  optionsContainer: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  optionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.dark,
    marginBottom: 4,
  },
  optionSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
  },
  quickActionsContainer: {
    marginTop: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.dark,
    marginBottom: theme.spacing.md,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    gap: theme.spacing.sm,
  },
  quickActionSecondary: {
    backgroundColor: theme.colors.white,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  quickActionText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.white,
  },
  quickActionTextSecondary: {
    color: theme.colors.primary,
  },
});