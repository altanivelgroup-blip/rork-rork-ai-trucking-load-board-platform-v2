import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { 
  User, 
  Settings, 
  CreditCard, 
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
  const insets = useSafeAreaInsets();

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: () => {
            logout();
            router.replace('/(auth)/login');
          }
        }
      ]
    );
  };

  const profileOptions: ProfileOption[] = [
    {
      id: 'edit-profile',
      title: 'Edit Profile',
      subtitle: 'Update your personal information',
      icon: <Edit3 size={20} color={theme.colors.primary} />,
      route: '/edit-profile',
      showChevron: true
    },
    {
      id: 'driver-profile',
      title: 'Driver Profile',
      subtitle: 'Vehicle, MPG, VIN, plate',
      icon: <Truck size={20} color={theme.colors.secondary} />,
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
      id: 'membership',
      title: 'Membership',
      subtitle: 'Manage your subscription',
      icon: <Crown size={20} color={theme.colors.warning} />,
      route: '/membership',
      showChevron: true
    },
    {
      id: 'wallet',
      title: 'Wallet',
      subtitle: 'Balance and payouts',
      icon: <Wallet size={20} color={theme.colors.success} />,
      route: '/wallet',
      showChevron: true
    },
    {
      id: 'payment-methods',
      title: 'Payment Methods',
      subtitle: 'Manage cards and billing',
      icon: <CreditCard size={20} color={theme.colors.success} />,
      route: '/payment-methods',
      showChevron: true
    },
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
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <User size={32} color={theme.colors.white} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name || 'User'}</Text>
            <Text style={styles.profileEmail}>{user?.email || 'user@example.com'}</Text>
            {user?.company && (
              <Text style={styles.profileCompany}>{user.company}</Text>
            )}
          </View>
        </View>

        {/* Profile Options */}
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

        {/* App Version */}
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
});