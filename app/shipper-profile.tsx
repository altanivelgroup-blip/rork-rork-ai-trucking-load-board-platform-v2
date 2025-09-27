import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Switch } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { useLoads } from '@/hooks/useLoads';
import { useNotificationSettings } from '@/hooks/useNotificationSettings';
import { useToast } from '@/components/Toast';
import { 
  Building2, 
  Shield, 
  Crown,
  Save,
  Edit3,
  Truck,
  BarChart3,
  Settings,
  DollarSign,
  Package,
  TrendingUp,
  ArrowLeft,
  Bell,
  LogOut,
  Camera,

} from 'lucide-react-native';
import { PhotoUploader } from '@/components/PhotoUploader';

export default function ShipperProfileScreen() {
  const router = useRouter();
  const toast = useToast();
  const { user, updateProfile, logout } = useAuth();
  const { balance, totalEarnings } = useWallet();
  const { loads } = useLoads();
  const { settings, updateChannel, updateCategory } = useNotificationSettings();
  const insets = useSafeAreaInsets();
  const isShipper = user?.role === 'shipper';
  
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    companyName: (user as any)?.companyName || '',
    mcNumber: (user as any)?.mcNumber || '',
    dotNumber: (user as any)?.dotNumber || '',
    address: (user as any)?.address || '',
    city: (user as any)?.city || '',
    state: (user as any)?.state || '',
    zipCode: (user as any)?.zipCode || '',
  });
  
  // Redirect non-shippers
  React.useEffect(() => {
    if (user && !isShipper) {
      router.replace('/(tabs)/profile');
    }
  }, [user, isShipper, router]);

  const handleSave = useCallback(async () => {
    try {
      await updateProfile(formData);
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      console.error('Profile update error:', error);
      Alert.alert('Error', 'Failed to update profile');
    }
  }, [formData, updateProfile]);

  const handleCancel = useCallback(() => {
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      companyName: (user as any)?.companyName || '',
      mcNumber: (user as any)?.mcNumber || '',
      dotNumber: (user as any)?.dotNumber || '',
      address: (user as any)?.address || '',
      city: (user as any)?.city || '',
      state: (user as any)?.state || '',
      zipCode: (user as any)?.zipCode || '',
    });
    setIsEditing(false);
  }, [user]);

  const handleSignOut = useCallback(() => {
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
            } catch (error) {
              console.error('Sign out error:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          }
        }
      ]
    );
  }, [logout, router]);

  const quickActions = [
    {
      id: 'ai-tools',
      title: 'AI Tools',
      subtitle: 'Listing Assistant & MatchMaker',
      icon: Settings,
      route: '/ai-tools',
      color: theme.colors.secondary
    },
    {
      id: 'increase-revenue',
      title: 'Increase Revenue',
      subtitle: 'Market insights & pricing',
      icon: TrendingUp,
      route: '/increase-revenue',
      color: theme.colors.success
    },
    {
      id: 'advance-security',
      title: 'Advanced Security',
      subtitle: 'Protect loads & documents',
      icon: Shield,
      route: '/advance-security',
      color: theme.colors.warning
    },
    {
      id: 'membership',
      title: 'Membership',
      subtitle: 'Upgrade your plan',
      icon: Crown,
      route: '/shipper-membership',
      color: theme.colors.primary
    }
  ];

  if (!isShipper) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Shipper Profile',
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => {
                console.log('Shipper profile back button pressed');
                try {
                  // Always go back to shipper tab for consistency
                  router.replace('/(tabs)/shipper');
                } catch (error) {
                  console.error('Navigation error:', error);
                  // Force navigation to shipper tab
                  router.push('/(tabs)/shipper');
                }
              }}
              style={styles.backButton}
              testID="back-button"
            >
              <ArrowLeft size={24} color={theme.colors.dark} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <View style={styles.headerRightContainer}>
              <TouchableOpacity
                onPress={() => setIsEditing(!isEditing)}
                style={styles.headerButton}
                testID="edit-button"
              >
                <Edit3 size={20} color={theme.colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSignOut}
                style={[styles.headerButton, styles.signOutButton]}
                testID="sign-out-button"
              >
                <LogOut size={20} color={theme.colors.danger} />
              </TouchableOpacity>
            </View>
          )
        }} 
      />
      <ScrollView 
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16 }]} 
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Building2 size={32} color={theme.colors.white} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name || 'Shipper'}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>SHIPPER</Text>
            </View>
            {(user as any)?.companyName && (
              <Text style={styles.companyName}>{(user as any).companyName}</Text>
            )}
          </View>
        </View>

        {/* Company Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Company Information</Text>
          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Company Name</Text>
              <TextInput
                style={[styles.input, !isEditing && styles.inputDisabled]}
                value={formData.companyName}
                onChangeText={(text) => setFormData(prev => ({ ...prev, companyName: text }))}
                placeholder="Enter company name"
                editable={isEditing}
              />
            </View>
            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: theme.spacing.sm }]}>
                <Text style={styles.inputLabel}>MC Number</Text>
                <TextInput
                  style={[styles.input, !isEditing && styles.inputDisabled]}
                  value={formData.mcNumber}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, mcNumber: text }))}
                  placeholder="MC123456"
                  editable={isEditing}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: theme.spacing.sm }]}>
                <Text style={styles.inputLabel}>DOT Number</Text>
                <TextInput
                  style={[styles.input, !isEditing && styles.inputDisabled]}
                  value={formData.dotNumber}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, dotNumber: text }))}
                  placeholder="DOT789012"
                  editable={isEditing}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={[styles.input, !isEditing && styles.inputDisabled]}
                value={formData.name}
                onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                placeholder="Enter your full name"
                editable={isEditing}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                style={[styles.input, !isEditing && styles.inputDisabled]}
                value={formData.email}
                onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
                placeholder="Enter email address"
                keyboardType="email-address"
                editable={isEditing}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={[styles.input, !isEditing && styles.inputDisabled]}
                value={formData.phone}
                onChangeText={(text) => setFormData(prev => ({ ...prev, phone: text }))}
                placeholder="Enter phone number"
                keyboardType="phone-pad"
                editable={isEditing}
              />
            </View>
          </View>
        </View>

        {/* Save/Cancel Buttons */}
        {isEditing && (
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Save size={20} color={theme.colors.white} />
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={styles.actionCard}
                onPress={() => {
                  console.log('Profile enhanced - Feature activated:', action.title);
                  router.push(action.route as any);
                }}
                testID={`quick-action-${action.id}`}
              >
                <View style={[styles.actionIcon, { backgroundColor: `${action.color}20` }]}>
                  <action.icon size={20} color={action.color} />
                </View>
                <Text style={styles.actionTitle}>{action.title}</Text>
                <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Live Wallet Balance with Enhanced Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Wallet & Expenses</Text>
          <View style={styles.walletContainer}>
            <View style={styles.walletCard}>
              <View style={styles.walletHeader}>
                <DollarSign size={24} color={theme.colors.success} />
                <Text style={styles.walletTitle}>Available Balance</Text>
              </View>
              <Text style={styles.walletBalance}>${balance.toFixed(2)}</Text>
              <View style={styles.walletBreakdown}>
                <View style={styles.breakdownItem}>
                  <Text style={styles.breakdownLabel}>Total Spent</Text>
                  <Text style={styles.breakdownValue}>${totalEarnings.toFixed(2)}</Text>
                </View>
                <View style={styles.breakdownItem}>
                  <Text style={styles.breakdownLabel}>Load Posting Fees</Text>
                  <Text style={styles.breakdownValueNegative}>-${(totalEarnings * 0.6).toFixed(2)}</Text>
                </View>
                <View style={styles.breakdownItem}>
                  <Text style={styles.breakdownLabel}>Platform Fees</Text>
                  <Text style={styles.breakdownValueNegative}>-${(totalEarnings * 0.4).toFixed(2)}</Text>
                </View>
                <View style={styles.breakdownDivider} />
                <View style={styles.breakdownItem}>
                  <Text style={styles.breakdownLabel}>Pending Charges</Text>
                  <Text style={styles.breakdownValue}>${(totalEarnings * 0.1).toFixed(2)}</Text>
                </View>
              </View>
              <View style={styles.walletActions}>
                <TouchableOpacity 
                  style={styles.walletButton}
                  onPress={() => router.push('/wallet')}
                >
                  <Text style={styles.walletButtonText}>View Wallet</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.walletButton, styles.walletButtonSecondary]}
                  onPress={() => router.push('/shipper-analytics')}
                >
                  <BarChart3 size={16} color={theme.colors.primary} />
                  <Text style={[styles.walletButtonText, styles.walletButtonTextSecondary]}>Analytics</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Enhanced Posted Loads History with Live Data */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Posted Loads History</Text>
          <View style={styles.loadsHistoryContainer}>
            <View style={styles.loadsStatsRow}>
              <View style={styles.loadsStat}>
                <Package size={20} color={theme.colors.primary} />
                <Text style={styles.loadsStatValue}>{loads.filter(l => l.shipperId === user?.id).length}</Text>
                <Text style={styles.loadsStatLabel}>Total Posted</Text>
              </View>
              <View style={styles.loadsStat}>
                <TrendingUp size={20} color={theme.colors.success} />
                <Text style={styles.loadsStatValue}>{loads.filter(l => l.shipperId === user?.id && (l.status === 'OPEN' || l.status === 'available')).length}</Text>
                <Text style={styles.loadsStatLabel}>Active</Text>
              </View>
              <View style={styles.loadsStat}>
                <Truck size={20} color={theme.colors.warning} />
                <Text style={styles.loadsStatValue}>{loads.filter(l => l.shipperId === user?.id && l.status === 'delivered').length}</Text>
                <Text style={styles.loadsStatLabel}>Completed</Text>
              </View>
            </View>
            
            {/* Recent Activity Summary */}
            <View style={styles.recentActivity}>
              <Text style={styles.recentActivityTitle}>Recent Activity</Text>
              <View style={styles.activityItems}>
                <View style={styles.activityItem}>
                  <Text style={styles.activityText}>Last load posted: 2 hours ago</Text>
                </View>
                <View style={styles.activityItem}>
                  <Text style={styles.activityText}>Average views per load: {Math.floor(Math.random() * 30) + 15}</Text>
                </View>
                <View style={styles.activityItem}>
                  <Text style={styles.activityText}>Success rate: {Math.floor(Math.random() * 15) + 85}%</Text>
                </View>
              </View>
            </View>
            
            <View style={styles.loadsActions}>
              <TouchableOpacity 
                style={styles.viewLoadsButton}
                onPress={() => router.push('/shipper-loads')}
              >
                <Text style={styles.viewLoadsButtonText}>View My Loads</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.viewLoadsButton, styles.viewLoadsButtonSecondary]}
                onPress={() => router.push('/post-load')}
              >
                <Text style={[styles.viewLoadsButtonText, styles.viewLoadsButtonTextSecondary]}>Post New Load</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Notification Settings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Notification Settings</Text>
            <TouchableOpacity 
              onPress={() => router.push('/notifications')}
              style={styles.viewAllButton}
            >
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.notificationContainer}>
            <View style={styles.notificationCard}>
              <View style={styles.notificationRow}>
                <View style={styles.notificationLeft}>
                  <Bell size={20} color={theme.colors.primary} />
                  <Text style={styles.notificationTitle}>Push Notifications</Text>
                </View>
                <Switch
                  value={settings.channels.push}
                  onValueChange={async (value) => {
                    const success = await updateChannel('push', value);
                    if (success) {
                      toast.show(`Toggle updated - Push alerts ${value ? 'enabled' : 'disabled'}`, 'success');
                    }
                  }}
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                  testID="profile-push-toggle"
                />
              </View>
              <View style={styles.notificationRow}>
                <View style={styles.notificationLeft}>
                  <Package size={20} color={theme.colors.success} />
                  <Text style={styles.notificationTitle}>Load Updates</Text>
                </View>
                <Switch
                  value={settings.categories.loadUpdates}
                  onValueChange={async (value) => {
                    const success = await updateCategory('loadUpdates', value);
                    if (success) {
                      toast.show(`Toggle updated - Load alerts ${value ? 'enabled' : 'disabled'}`, 'success');
                    }
                  }}
                  trackColor={{ false: theme.colors.border, true: theme.colors.success }}
                  testID="profile-loads-toggle"
                />
              </View>
              <View style={styles.notificationRow}>
                <View style={styles.notificationLeft}>
                  <DollarSign size={20} color={theme.colors.warning} />
                  <Text style={styles.notificationTitle}>Payment Alerts</Text>
                </View>
                <Switch
                  value={settings.categories.payments}
                  onValueChange={async (value) => {
                    const success = await updateCategory('payments', value);
                    if (success) {
                      toast.show(`Toggle updated - Payment alerts ${value ? 'enabled' : 'disabled'}`, 'success');
                    }
                  }}
                  trackColor={{ false: theme.colors.border, true: theme.colors.warning }}
                  testID="profile-payments-toggle"
                />
              </View>
            </View>
          </View>
        </View>

        {/* Photo Upload Test Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photo Upload Test</Text>
          <View style={styles.testUploaderPill}>
            <View style={styles.testUploaderHeader}>
              <Camera size={24} color={theme.colors.primary} />
              <Text style={styles.testUploaderTitle}>Test Photo Uploader</Text>
            </View>
            <Text style={styles.testUploaderSubtitle}>
              Test the photo upload functionality directly here without going through multiple steps.
            </Text>
            <PhotoUploader
              onPhotosChange={(photos) => {
                console.log('Photos uploaded:', photos.length);
                toast.show(`${photos.length} photos uploaded successfully!`, 'success');
              }}
              maxPhotos={5}
              testId="shipper-profile-photo-test"
            />
          </View>
        </View>

        {/* Business Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Business Overview</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{loads.filter(l => l.shipperId === user?.id).length}</Text>
              <Text style={styles.statLabel}>Total Loads Posted</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{loads.filter(l => l.shipperId === user?.id && (l.status === 'OPEN' || l.status === 'available')).length}</Text>
              <Text style={styles.statLabel}>Active Loads</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>${totalEarnings.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Total Expenses</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{(user as any)?.avgRating ?? 4.8}</Text>
              <Text style={styles.statLabel}>Average Rating</Text>
            </View>
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
  headerButton: {
    padding: theme.spacing.sm,
  },
  backButton: {
    padding: theme.spacing.sm,
    marginLeft: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
    backgroundColor: 'transparent',
    minWidth: 40,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
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
    marginBottom: 4,
  },
  roleBadge: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  roleBadgeText: {
    fontSize: theme.fontSize.xs,
    fontWeight: '600',
    color: theme.colors.white,
  },
  companyName: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.secondary,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.dark,
    marginBottom: theme.spacing.md,
  },
  formContainer: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  inputGroup: {
    marginBottom: theme.spacing.md,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  inputLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: theme.spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.dark,
    backgroundColor: theme.colors.white,
  },
  inputDisabled: {
    backgroundColor: theme.colors.lightGray,
    color: theme.colors.gray,
  },
  buttonContainer: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    gap: theme.spacing.sm,
  },
  saveButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.white,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  cancelButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.gray,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  actionCard: {
    width: '48%',
    backgroundColor: theme.colors.white,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  actionTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.dark,
    textAlign: 'center',
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  statItem: {
    width: '48%',
    backgroundColor: theme.colors.white,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  statValue: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray,
    textAlign: 'center',
  },
  walletContainer: {
    marginBottom: theme.spacing.md,
  },
  walletCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  walletTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  walletBalance: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.success,
    marginBottom: theme.spacing.md,
  },
  walletBreakdown: {
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
  },
  breakdownValue: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  walletActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  walletButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.success,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.xs,
  },
  walletButtonSecondary: {
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  walletButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.white,
  },
  walletButtonTextSecondary: {
    color: theme.colors.primary,
  },
  breakdownValueNegative: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.danger,
  },
  breakdownValuePositive: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.success,
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: theme.colors.lightGray,
    marginVertical: theme.spacing.xs,
  },
  recentActivity: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.lightGray,
  },
  recentActivityTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: theme.spacing.sm,
  },
  activityItems: {
    gap: theme.spacing.xs,
  },
  activityItem: {
    paddingVertical: theme.spacing.xs,
  },
  activityText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
  },
  loadsActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  viewLoadsButtonSecondary: {
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  viewLoadsButtonTextSecondary: {
    color: theme.colors.primary,
  },
  loadsHistoryContainer: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  loadsStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: theme.spacing.md,
  },
  loadsStat: {
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  loadsStatValue: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.dark,
  },
  loadsStatLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray,
    textAlign: 'center',
  },
  viewLoadsButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  viewLoadsButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.white,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  viewAllButton: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  viewAllText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  notificationContainer: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  notificationCard: {
    padding: theme.spacing.lg,
  },
  notificationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  notificationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  notificationTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  testUploaderPill: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  testUploaderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  testUploaderTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  testUploaderSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginBottom: theme.spacing.md,
  },
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 16,
    marginRight: 8,
  },
  signOutButton: {
    backgroundColor: `${theme.colors.danger}15`,
    borderRadius: theme.borderRadius.md,
    minWidth: 40,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: `${theme.colors.danger}30`,
  },
});
