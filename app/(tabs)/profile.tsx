import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { useLoads } from '@/hooks/useLoads';

import { 
  User, 
  Users,
  Settings, 
  Bell, 
  Shield, 
  HelpCircle, 
  LogOut, 
  Edit3,
  Crown,
  FileText,
  ChevronRight,
  Truck,
  Wallet,
  Wrench,
  BarChart3
} from 'lucide-react-native';

type ProfileOption = {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  route?: string;
  action?: () => void;
  showChevron?: boolean;
};

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { balance, totalEarnings, isLoading: walletLoading } = useWallet();
  const { loads } = useLoads();
  const insets = useSafeAreaInsets();
  
  // Logout handler
  const handleLogout = React.useCallback(() => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              router.replace('/login');
            } catch {
              Alert.alert('Sign out failed', 'Please try again.');
            }
          }
        }
      ]
    );
  }, [logout, router]);
  
  // Redirect shippers to their dedicated profile page
  useEffect(() => {
    if (user?.role === 'shipper') {
      console.log('[Profile] Redirecting shipper to dedicated profile page');
      router.replace('/shipper-profile');
      return;
    }
  }, [user?.role, router]);
  
  // Early return for shippers - they should be redirected
  if (user?.role === 'shipper') {
    return null;
  }
  
  const isDriver = user?.role === 'driver';
  const isAdmin = user?.role === 'admin';

  const driverOptions: ProfileOption[] = [

    {
      id: 'driver-profile',
      title: 'Edit Profile',
      subtitle: 'Personal info, vehicle, MPG, VIN, plate',
      icon: <Edit3 size={20} color={theme.colors.primary} />,
      route: '/driver-profile',
      showChevron: true
    },
    {
      id: 'add-vehicle',
      title: 'Add Vehicle',
      subtitle: 'Set MPG and details',
      icon: <Truck size={20} color={theme.colors.secondary} />,
      route: '/vehicle-edit',
      showChevron: true
    },
    {
      id: 'equipment-maintenance',
      title: 'Equipment & Maintenance',
      subtitle: 'Trucks, trailers, service schedule',
      icon: <Wrench size={20} color={theme.colors.primary} />,
      route: '/equipment',
      showChevron: true
    },
    {
      id: 'wallet',
      title: 'Wallet',
      subtitle: 'Balance, earnings, and payouts',
      icon: <Wallet size={20} color={theme.colors.success} />,
      route: '/wallet',
      showChevron: true
    },
    {
      id: 'membership',
      title: 'Membership',
      subtitle: 'Upgrade for AI features',
      icon: <Crown size={20} color={theme.colors.warning} />,
      route: '/membership',
      showChevron: true
    },
  ];



  const commonOptions: ProfileOption[] = [
    {
      id: 'notifications',
      title: 'Notifications',
      subtitle: 'Manage your preferences',
      icon: <Bell size={20} color={theme.colors.secondary} />,
      route: '/notifications',
      showChevron: true
    },
    {
      id: 'privacy-security',
      title: 'Privacy & Security',
      subtitle: 'Control your data and security',
      icon: <Shield size={20} color={theme.colors.danger} />,
      route: '/privacy-security',
      showChevron: true
    },
    {
      id: 'documents',
      title: 'Documents',
      subtitle: 'Manage your documents',
      icon: <FileText size={20} color={theme.colors.gray} />,
      route: '/documents',
      showChevron: true
    },
    {
      id: 'settings',
      title: 'Settings',
      subtitle: 'App preferences and more',
      icon: <Settings size={20} color={theme.colors.dark} />,
      route: '/settings',
      showChevron: true
    },
    {
      id: 'help-support',
      title: 'Help & Support',
      subtitle: 'Get help and contact us',
      icon: <HelpCircle size={20} color={theme.colors.primary} />,
      route: '/help-support',
      showChevron: true
    },
    {
      id: 'logout',
      title: 'Sign Out',
      icon: <LogOut size={20} color={theme.colors.danger} />,
      action: handleLogout,
      showChevron: false
    }
  ];

  const adminOptions: ProfileOption[] = [
    {
      id: 'admin-dashboard',
      title: 'Admin Dashboard',
      subtitle: 'System monitoring and analytics',
      icon: <BarChart3 size={20} color={theme.colors.primary} />,
      route: '/admin',
      showChevron: true
    },
    {
      id: 'user-management',
      title: 'User Management',
      subtitle: 'Manage drivers and shippers',
      icon: <Users size={20} color={theme.colors.secondary} />,
      route: '/admin-assignment',
      showChevron: true
    },
    {
      id: 'system-reports',
      title: 'System Reports',
      subtitle: 'Analytics and performance reports',
      icon: <FileText size={20} color={theme.colors.success} />,
      route: '/reports',
      showChevron: true
    },
  ];

  const profileOptions = isAdmin ? [...adminOptions, ...commonOptions] : isDriver ? [...driverOptions, ...commonOptions] : commonOptions;

  const handleOptionPress = (option: ProfileOption) => {
    if (option.action) {
      option.action();
    } else if (option.route) {
      router.push(option.route as any);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16 }]}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <User size={32} color={theme.colors.white} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name || 'User'}</Text>
            <Text style={styles.profileEmail}>{user?.email || 'user@example.com'}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>
                {(user?.role || 'USER').toUpperCase()}
              </Text>
            </View>
            {(user as any)?.company && (
              <Text style={styles.profileCompany}>{(user as any).company}</Text>
            )}
          </View>
        </View>
        
        {/* Live Stats Section */}
        {(isDriver || isAdmin) && (
          <View style={styles.liveStatsContainer}>
            <View style={styles.liveStatsHeader}>
              <Text style={styles.liveStatsTitle}>Live Dashboard</Text>
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>Live</Text>
              </View>
            </View>
            
            <View style={styles.statsGrid}>
              {isDriver && (
                <>
                  <View style={styles.statCard}>
                    <Text style={styles.statValue}>
                      {walletLoading ? '...' : `${balance.toLocaleString()}`}
                    </Text>
                    <Text style={styles.statLabel}>Available Balance</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statValue}>
                      {walletLoading ? '...' : `${totalEarnings.toLocaleString()}`}
                    </Text>
                    <Text style={styles.statLabel}>Total Earnings</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statValue}>
                      {(user as any)?.truckType?.replace('-', ' ').toUpperCase() || 'TRUCK'}
                    </Text>
                    <Text style={styles.statLabel}>Truck Type</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statValue}>
                      {(user as any)?.yearsExperience || '0'}
                    </Text>
                    <Text style={styles.statLabel}>Years Experience</Text>
                  </View>
                </>
              )}
              
              {isAdmin && (
                <>
                  <View style={styles.statCard}>
                    <Text style={styles.statValue}>
                      {loads.length}
                    </Text>
                    <Text style={styles.statLabel}>Total Loads</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statValue}>
                      247
                    </Text>
                    <Text style={styles.statLabel}>Total Users</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statValue}>
                      ADMIN
                    </Text>
                    <Text style={styles.statLabel}>Access Level</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statValue}>
                      FULL
                    </Text>
                    <Text style={styles.statLabel}>Permissions</Text>
                  </View>
                </>
              )}
            </View>
          </View>
        )}



        <View style={styles.optionsContainer}>
          {profileOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={styles.optionItem}
              onPress={() => handleOptionPress(option)}
              testID={`profile-option-${option.id}`}
            >
              <View style={styles.optionLeft}>
                <View style={styles.optionIcon}>
                  {option.icon}
                </View>
                <View style={styles.optionText}>
                  <Text style={styles.optionTitle}>{option.title}</Text>
                  {option.subtitle && (
                    <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
                  )}
                </View>
              </View>
              {option.showChevron && (
                <ChevronRight size={20} color={theme.colors.gray} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>LoadRush v1.0.0</Text>
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
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.dark,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
    marginBottom: 2,
  },
  profileCompany: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.secondary,
    fontWeight: '600',
  },
  optionsContainer: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.lg,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  versionText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
  },
  roleBadge: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    alignSelf: 'flex-start',
    marginTop: 4,
    marginBottom: 4,
  },
  roleBadgeText: {
    fontSize: theme.fontSize.xs,
    fontWeight: '600',
    color: theme.colors.white,
    textTransform: 'uppercase',
  },
  liveStatsContainer: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  liveStatsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  liveStatsTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.dark,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.success,
  },
  liveText: {
    fontSize: theme.fontSize.xs,
    fontWeight: '600',
    color: theme.colors.success,
    textTransform: 'uppercase',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: theme.colors.lightGray,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  statLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    textAlign: 'center',
  },
  refreshIndicator: {
    marginLeft: 4,
  },
  syncStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
    gap: theme.spacing.sm,
  },
  offlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  offlineText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.warning,
    fontWeight: '500',
  },
  onlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  onlineText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.success,
    fontWeight: '500',
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.lightGray,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
    gap: 4,
  },
  syncButtonText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  lastSyncIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lastSyncText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray,
  },
});