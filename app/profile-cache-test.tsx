import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { useProfileCache } from '@/hooks/useProfileCache';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useAuth } from '@/hooks/useAuth';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Clock, 
  User, 
  CheckCircle, 
  XCircle,
  AlertCircle
} from 'lucide-react-native';

export default function ProfileCacheTestScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { online: isOnline } = useOnlineStatus();
  const { 
    cachedProfile, 
    isOffline, 
    isSyncing, 
    lastSyncTime, 
    pendingChanges, 
    syncProfile, 
    updateCachedProfile,
    validateExperience 
  } = useProfileCache();

  const [testExperience, setTestExperience] = useState<string>('');
  const [validationResult, setValidationResult] = useState<{ valid: boolean; message: string } | null>(null);
  const [validating, setValidating] = useState<boolean>(false);

  const handleTestValidation = async () => {
    if (!testExperience) return;
    
    setValidating(true);
    try {
      const result = await validateExperience(parseInt(testExperience));
      setValidationResult(result);
    } catch (error) {
      setValidationResult({ valid: false, message: 'Validation failed' });
    } finally {
      setValidating(false);
    }
  };

  const handleTestProfileUpdate = async () => {
    await updateCachedProfile({
      yearsExperience: Math.floor(Math.random() * 20) + 1,
      truckType: 'flatbed',
      tankSize: 100,
    });
  };

  const handleManualSync = async () => {
    await syncProfile();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ title: 'Profile Cache Test' }} />
      
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Connection Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connection Status</Text>
          <View style={styles.statusRow}>
            {isOnline ? (
              <View style={styles.onlineIndicator}>
                <Wifi size={16} color={theme.colors.success} />
                <Text style={styles.onlineText}>Online</Text>
              </View>
            ) : (
              <View style={styles.offlineIndicator}>
                <WifiOff size={16} color={theme.colors.warning} />
                <Text style={styles.offlineText}>Offline</Text>
              </View>
            )}
          </View>
        </View>

        {/* Cache Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cache Status</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Cached Profile</Text>
              <Text style={styles.infoValue}>
                {cachedProfile ? '✓ Available' : '✗ None'}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Offline Mode</Text>
              <Text style={styles.infoValue}>
                {isOffline ? '✓ Active' : '✗ Inactive'}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Pending Changes</Text>
              <Text style={styles.infoValue}>
                {pendingChanges ? '⚠ Yes' : '✓ None'}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Syncing</Text>
              <Text style={styles.infoValue}>
                {isSyncing ? '⏳ Yes' : '✓ No'}
              </Text>
            </View>
          </View>
          
          {lastSyncTime && (
            <View style={styles.lastSyncRow}>
              <Clock size={14} color={theme.colors.gray} />
              <Text style={styles.lastSyncText}>
                Last sync: {lastSyncTime.toLocaleString()}
              </Text>
            </View>
          )}
        </View>

        {/* Profile Data */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile Data</Text>
          <View style={styles.profileData}>
            <Text style={styles.dataLabel}>Active Profile Source:</Text>
            <Text style={styles.dataValue}>
              {isOffline && cachedProfile ? 'Cached Profile' : 'Live Profile'}
            </Text>
            
            <Text style={styles.dataLabel}>Name:</Text>
            <Text style={styles.dataValue}>
              {(isOffline && cachedProfile ? cachedProfile : user)?.name || 'N/A'}
            </Text>
            
            <Text style={styles.dataLabel}>Years Experience:</Text>
            <Text style={styles.dataValue}>
              {(isOffline && cachedProfile ? cachedProfile : user)?.yearsExperience || 'N/A'}
            </Text>
            
            <Text style={styles.dataLabel}>Truck Type:</Text>
            <Text style={styles.dataValue}>
              {(isOffline && cachedProfile ? cachedProfile : user)?.truckType || 'N/A'}
            </Text>
          </View>
        </View>

        {/* Experience Validation Test */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>API Validation Test</Text>
          <View style={styles.validationTest}>
            <TextInput
              style={styles.input}
              value={testExperience}
              onChangeText={setTestExperience}
              placeholder="Enter years of experience"
              keyboardType="numeric"
            />
            <TouchableOpacity
              style={styles.testButton}
              onPress={handleTestValidation}
              disabled={validating || !testExperience}
            >
              <Text style={styles.testButtonText}>
                {validating ? 'Validating...' : 'Test Validation'}
              </Text>
            </TouchableOpacity>
            
            {validationResult && (
              <View style={[
                styles.validationResult,
                { backgroundColor: validationResult.valid ? theme.colors.success + '20' : theme.colors.danger + '20' }
              ]}>
                {validationResult.valid ? (
                  <CheckCircle size={16} color={theme.colors.success} />
                ) : (
                  <XCircle size={16} color={theme.colors.danger} />
                )}
                <Text style={[
                  styles.validationText,
                  { color: validationResult.valid ? theme.colors.success : theme.colors.danger }
                ]}>
                  {validationResult.message}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Test Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Actions</Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleTestProfileUpdate}
            >
              <User size={16} color={theme.colors.white} />
              <Text style={styles.actionButtonText}>Update Profile</Text>
            </TouchableOpacity>
            
            {pendingChanges && isOnline && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: theme.colors.warning }]}
                onPress={handleManualSync}
                disabled={isSyncing}
              >
                <RefreshCw size={16} color={theme.colors.white} />
                <Text style={styles.actionButtonText}>
                  {isSyncing ? 'Syncing...' : 'Manual Sync'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Progress Messages */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Progress Messages</Text>
          <View style={styles.messagesList}>
            {isOffline && (
              <View style={styles.messageItem}>
                <AlertCircle size={14} color={theme.colors.warning} />
                <Text style={styles.messageText}>Offline Mode - Using cached data</Text>
              </View>
            )}
            
            {pendingChanges && (
              <View style={styles.messageItem}>
                <Clock size={14} color={theme.colors.primary} />
                <Text style={styles.messageText}>Profile changes pending sync</Text>
              </View>
            )}
            
            {isSyncing && (
              <View style={styles.messageItem}>
                <RefreshCw size={14} color={theme.colors.primary} />
                <Text style={styles.messageText}>Profile syncing...</Text>
              </View>
            )}
            
            {!pendingChanges && !isSyncing && isOnline && (
              <View style={styles.messageItem}>
                <CheckCircle size={14} color={theme.colors.success} />
                <Text style={styles.messageText}>Profile synced - Ready</Text>
              </View>
            )}
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
    padding: theme.spacing.md,
  },
  section: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.dark,
    marginBottom: theme.spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  offlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  onlineText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.success,
    fontWeight: '600',
  },
  offlineText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.warning,
    fontWeight: '600',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  infoItem: {
    flex: 1,
    minWidth: '45%',
  },
  infoLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  lastSyncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  lastSyncText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
  },
  profileData: {
    gap: theme.spacing.sm,
  },
  dataLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    fontWeight: '600',
  },
  dataValue: {
    fontSize: theme.fontSize.md,
    color: theme.colors.dark,
    marginBottom: theme.spacing.xs,
  },
  validationTest: {
    gap: theme.spacing.md,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    fontSize: theme.fontSize.md,
    backgroundColor: theme.colors.white,
  },
  testButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    alignItems: 'center',
  },
  testButtonText: {
    color: theme.colors.white,
    fontWeight: '600',
  },
  validationResult: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  validationText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  actionButtonText: {
    color: theme.colors.white,
    fontWeight: '600',
  },
  messagesList: {
    gap: theme.spacing.sm,
  },
  messageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  messageText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.dark,
  },
});