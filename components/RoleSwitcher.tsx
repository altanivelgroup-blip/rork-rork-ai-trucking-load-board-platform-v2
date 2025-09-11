import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Users, Truck, RefreshCw } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { UserRole } from '@/types';

export function RoleSwitcher() {
  const { user, switchRole } = useAuth();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const router = useRouter();

  if (!user) return null;

  const handleRoleSwitch = async (newRole: UserRole) => {
    if (newRole === user.role) return;

    Alert.alert(
      'Switch Role',
      `Switching to ${newRole === 'shipper' ? 'Shipper' : 'Driver'} will adjust your dashboard and available features. Your account data will be preserved. Confirm?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Switch',
          onPress: async () => {
            setIsLoading(true);
            try {
              await switchRole(newRole);
              
              // Navigate to appropriate dashboard
              if (newRole === 'shipper') {
                router.replace('/shipper-dashboard');
              } else {
                router.replace('/(tabs)/dashboard');
              }
            } catch (error) {
              console.error('[RoleSwitcher] Failed to switch role:', error);
              Alert.alert('Error', 'Failed to switch role. Please try again.');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Switch Role</Text>
      <Text style={styles.subtitle}>
        Currently signed in as: <Text style={styles.currentRole}>{user.role}</Text>
      </Text>
      
      <View style={styles.roleButtons}>
        <TouchableOpacity
          style={[
            styles.roleButton,
            user.role === 'driver' && styles.roleButtonActive,
            isLoading && styles.roleButtonDisabled,
          ]}
          onPress={() => handleRoleSwitch('driver')}
          disabled={isLoading || user.role === 'driver'}
        >
          <Truck size={20} color={user.role === 'driver' ? theme.colors.white : theme.colors.primary} />
          <Text style={[
            styles.roleButtonText,
            user.role === 'driver' && styles.roleButtonTextActive,
          ]}>
            Driver
          </Text>
          {user.role === 'driver' && <Text style={styles.currentLabel}>Current</Text>}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.roleButton,
            user.role === 'shipper' && styles.roleButtonActive,
            isLoading && styles.roleButtonDisabled,
          ]}
          onPress={() => handleRoleSwitch('shipper')}
          disabled={isLoading || user.role === 'shipper'}
        >
          <Users size={20} color={user.role === 'shipper' ? theme.colors.white : theme.colors.primary} />
          <Text style={[
            styles.roleButtonText,
            user.role === 'shipper' && styles.roleButtonTextActive,
          ]}>
            Shipper
          </Text>
          {user.role === 'shipper' && <Text style={styles.currentLabel}>Current</Text>}
        </TouchableOpacity>
      </View>

      {isLoading && (
        <View style={styles.loadingContainer}>
          <RefreshCw size={16} color={theme.colors.primary} />
          <Text style={styles.loadingText}>Switching role...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.white,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginVertical: theme.spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  title: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.dark,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginBottom: theme.spacing.lg,
  },
  currentRole: {
    fontWeight: '600',
    color: theme.colors.primary,
    textTransform: 'capitalize',
  },
  roleButtons: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  roleButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.white,
    gap: theme.spacing.xs,
    minHeight: 100,
  },
  roleButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  roleButtonDisabled: {
    opacity: 0.6,
  },
  roleButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  roleButtonTextActive: {
    color: theme.colors.white,
  },
  currentLabel: {
    fontSize: theme.fontSize.xs,
    fontWeight: '500',
    color: theme.colors.white,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  loadingText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: '500',
  },
});