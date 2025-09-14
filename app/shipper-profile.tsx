import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { useLoads } from '@/hooks/useLoads';
import { 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  Shield, 
  Crown,
  Save,
  Edit3,
  FileText,
  Truck,
  BarChart3,
  Settings,
  DollarSign,
  Package,
  TrendingUp
} from 'lucide-react-native';

export default function ShipperProfileScreen() {
  const router = useRouter();
  const { user, updateProfile } = useAuth();
  const { balance, totalEarnings, transactions } = useWallet();
  const { loads } = useLoads();
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

  const quickActions = [
    {
      id: 'settings',
      title: 'Settings',
      subtitle: 'App preferences & privacy',
      icon: Settings,
      route: '/settings',
      color: theme.colors.primary
    },
    {
      id: 'notifications',
      title: 'Notifications',
      subtitle: 'Manage alerts & updates',
      icon: Shield,
      route: '/notifications',
      color: theme.colors.success
    },
    {
      id: 'membership',
      title: 'Membership',
      subtitle: 'Upgrade your plan',
      icon: Crown,
      route: '/shipper-membership',
      color: theme.colors.warning
    },
    {
      id: 'documents',
      title: 'Documents',
      subtitle: 'Certificates & permits',
      icon: FileText,
      route: '/documents',
      color: theme.colors.secondary
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
          headerRight: () => (
            <TouchableOpacity
              onPress={() => setIsEditing(!isEditing)}
              style={styles.headerButton}
            >
              <Edit3 size={20} color={theme.colors.primary} />
            </TouchableOpacity>
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
                onPress={() => router.push(action.route as any)}
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

        {/* Live Wallet Balance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Wallet & Earnings</Text>
          <View style={styles.walletContainer}>
            <View style={styles.walletCard}>
              <View style={styles.walletHeader}>
                <DollarSign size={24} color={theme.colors.success} />
                <Text style={styles.walletTitle}>Available Balance</Text>
              </View>
              <Text style={styles.walletBalance}>${balance.toFixed(2)}</Text>
              <View style={styles.walletBreakdown}>
                <View style={styles.breakdownItem}>
                  <Text style={styles.breakdownLabel}>Total Earnings</Text>
                  <Text style={styles.breakdownValue}>${totalEarnings.toFixed(2)}</Text>
                </View>
                <View style={styles.breakdownItem}>
                  <Text style={styles.breakdownLabel}>Platform Fee (5%)</Text>
                  <Text style={styles.breakdownValue}>-${(totalEarnings * 0.05).toFixed(2)}</Text>
                </View>
              </View>
              <TouchableOpacity 
                style={styles.walletButton}
                onPress={() => router.push('/wallet')}
              >
                <Text style={styles.walletButtonText}>View Wallet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Posted Loads History */}
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
            <TouchableOpacity 
              style={styles.viewLoadsButton}
              onPress={() => router.push('/(tabs)/loads')}
            >
              <Text style={styles.viewLoadsButtonText}>View All Loads</Text>
            </TouchableOpacity>
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
              <Text style={styles.statLabel}>Total Revenue</Text>
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
  walletButton: {
    backgroundColor: theme.colors.success,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  walletButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.white,
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
});