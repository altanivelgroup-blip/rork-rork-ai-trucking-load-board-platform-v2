import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Crown,
  Truck,
  Bell,
  CreditCard,
  Wallet,
  Shield,
  HelpCircle,
  Settings as SettingsIcon,
  LogOut,
  ChevronRight,
  User as UserIcon,
  Mail,
  Phone,
  Trash2,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const rows = useMemo(
    () => [
      {
        key: 'membership',
        title: 'Membership',
        subtitle: `${user?.membershipTier ? `${user.membershipTier} Plan` : 'Free Plan'} - 0/month`,
        icon: Crown,
        onPress: () => router.push('/membership'),
        testID: 'row-membership',
      },
      {
        key: 'equipment',
        title: 'Equipment & Maintenance',
        subtitle: 'Manage your trucks and trailers',
        icon: Truck,
        onPress: () => router.push('/equipment'),
        testID: 'row-equipment',
      },
      {
        key: 'notifications',
        title: 'Notifications',
        subtitle: 'Manage your alert preferences',
        icon: Bell,
        onPress: () => router.push('/notifications'),
        testID: 'row-notifications',
      },
      {
        key: 'documents',
        title: 'Documents & Verification',
        subtitle: 'Company, insurance, vehicle & trailer docs',
        icon: Shield,
        onPress: () => router.push('/documents'),
        testID: 'row-documents',
      },
      {
        key: 'wallet',
        title: 'Wallet & Payouts',
        subtitle: 'Balance, transfers, payout history',
        icon: Wallet,
        onPress: () => router.push('/wallet'),
        testID: 'row-wallet',
      },
      {
        key: 'payments',
        title: 'Payment Methods',
        subtitle: 'Manage your payment options',
        icon: CreditCard,
        onPress: () => router.push('/payment-methods'),
        testID: 'row-payments',
      },
      {
        key: 'privacy',
        title: 'Privacy & Security',
        subtitle: 'Manage your account security',
        icon: Shield,
        onPress: () => router.push('/privacy-security'),
        testID: 'row-privacy',
      },
      {
        key: 'help',
        title: 'Help & Support',
        subtitle: 'Get assistance and FAQs',
        icon: HelpCircle,
        onPress: () => router.push('/help-support'),
        testID: 'row-help',
      },
      {
        key: 'settings',
        title: 'Settings',
        subtitle: 'App preferences and account settings',
        icon: SettingsIcon,
        onPress: () => {
          console.log('Navigating to settings');
          try {
            router.push('/settings');
          } catch (error) {
            console.error('Settings navigation error:', error);
            Alert.alert('Navigation Error', 'Could not navigate to settings. Please try again.');
          }
        },
        testID: 'row-settings',
      },
      {
        key: 'contact',
        title: 'Contact Support',
        subtitle: 'Email us for account or billing help',
        icon: Mail,
        onPress: () => {
          console.log('Contact support pressed');
          const email = 'support@haulmate.app';
          const url = `mailto:${email}?subject=Support%20Request`;
          Linking.canOpenURL(url).then((can) => {
            if (can) {
              console.log('Opening email client');
              Linking.openURL(url);
            } else {
              console.log('Email client not available');
              Alert.alert('Email not available', `Reach us at ${email}`);
            }
          }).catch((error) => {
            console.error('Email error:', error);
            Alert.alert('Email not available', `Reach us at ${email}`);
          });
        },
        testID: 'row-contact-support',
      },
      {
        key: 'delete',
        title: 'Delete Account',
        subtitle: 'Request permanent account deletion',
        icon: Trash2,
        onPress: () => router.push('/account-deletion'),
        testID: 'row-delete-account',
      },
      {
        key: 'debug',
        title: 'Debug Navigation',
        subtitle: 'Test navigation to different screens',
        icon: SettingsIcon,
        onPress: () => router.push('/debug-nav'),
        testID: 'row-debug-nav',
      },
    ],
    [user?.membershipTier, router],
  );

  const handleLogout = async () => {
    try {
      console.log('Logging out...');
      await logout();
      router.replace('/');
    } catch (e) {
      console.error('Logout error', e);
    }
  };

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'bottom']} testID="profile-safe-area">
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.headerTitle} testID="profile-title">Profile</Text>

          <View style={styles.card} testID="profile-card">
            <View style={styles.rowTop}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText} testID="profile-avatar-letter">
                  {(user?.name?.[0] ?? 'B').toUpperCase()}
                </Text>
              </View>
              <View style={styles.userBlock}>
                <Text style={styles.name} numberOfLines={1} testID="profile-name">{user?.name ?? 'Bob'}</Text>
                <Text style={styles.company} numberOfLines={1}>Independent</Text>
                <View style={styles.badge} testID="profile-role-badge">
                  <Text style={styles.badgeText}>Carrier • {user?.verificationStatus ?? 'unverified'}</Text>
                </View>
                <View style={styles.contactRow}>
                  <Mail size={16} color={theme.colors.gray} />
                  <Text style={styles.contactText} numberOfLines={1}>{user?.email ?? 'lvrobert996@gmail.com'}</Text>
                </View>
                <View style={styles.contactRow}>
                  <Phone size={16} color={theme.colors.gray} />
                  <Text style={styles.contactText} numberOfLines={1}>{user?.phone ?? ''}</Text>
                </View>
              </View>
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1520975916090-3105956dac38?w=120&auto=format&fit=crop&q=60' }}
                style={styles.brand}
                resizeMode="cover"
              />
            </View>
          </View>

          {rows.map((r) => (
            <TouchableOpacity
              key={r.key}
              onPress={r.onPress}
              style={styles.listItem}
              activeOpacity={0.7}
              testID={r.testID}
            >
              <View style={styles.iconWrap}>{<r.icon size={20} color={theme.colors.primary} />}</View>
              <View style={styles.listTextWrap}>
                <Text style={styles.listTitle}>{r.title}</Text>
                <Text style={styles.listSubtitle}>{r.subtitle}</Text>
              </View>
              <ChevronRight size={20} color={theme.colors.gray} />
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={styles.logout} onPress={handleLogout} testID="logout-button">
            <LogOut size={18} color={theme.colors.danger} />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>

          <Text style={styles.version} accessibilityRole="text" testID="app-version">
            Version 1.0.0
          </Text>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: theme.colors.lightGray,
  },
  container: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  headerTitle: {
    textAlign: 'center',
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.dark,
    marginVertical: theme.spacing.sm,
  },
  card: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  avatarText: {
    color: theme.colors.white,
    fontSize: 32,
    fontWeight: '700',
  },
  userBlock: {
    flex: 1,
  },
  name: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.dark,
  },
  company: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginTop: 2,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.lightGray,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
    marginTop: 6,
  },
  badgeText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.dark,
    fontWeight: '700',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  contactText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    flexShrink: 1,
    marginLeft: 8,
  },
  brand: {
    width: 56,
    height: 56,
    borderRadius: 10,
    marginLeft: theme.spacing.md,
  },
  listItem: {
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  listTextWrap: {
    flex: 1,
  },
  listTitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.dark,
    fontWeight: '700',
  },
  listSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginTop: 2,
  },
  logout: {
    marginTop: theme.spacing.lg,
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.danger,
  },
  logoutText: {
    color: theme.colors.danger,
    fontWeight: '700',
    fontSize: theme.fontSize.md,
    marginLeft: 8,
  },
  version: {
    textAlign: 'center',
    color: theme.colors.gray,
    marginTop: theme.spacing.md,
  },
});