import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Stack } from 'expo-router';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { LogIn, User, Truck, Package, LogOut } from 'lucide-react-native';

type TestUser = {
  email: string;
  password: string;
  role: 'driver' | 'shipper';
  equipment?: string;
  membership?: string;
  displayName: string;
};

const TEST_USERS: TestUser[] = [
  {
    email: 'driver@truck.com',
    password: 'T23456',
    role: 'driver',
    equipment: 'truck',
    displayName: 'Truck Driver'
  },
  {
    email: 'driver@cargovan.com',
    password: 'C23456',
    role: 'driver',
    equipment: 'cargo van',
    displayName: 'Cargo Van Driver'
  },
  {
    email: 'driver@boxtruck.com',
    password: 'B23456',
    role: 'driver',
    equipment: 'box truck',
    displayName: 'Box Truck Driver'
  },
  {
    email: 'driver@reefer.com',
    password: 'R23456',
    role: 'driver',
    equipment: 'reefer',
    displayName: 'Reefer Driver'
  },
  {
    email: 'driver@flatbed.com',
    password: 'F23456',
    role: 'driver',
    equipment: 'flatbed',
    displayName: 'Flatbed Driver'
  },
  {
    email: 'base@shipper.com',
    password: 'B23456',
    role: 'shipper',
    membership: 'base',
    displayName: 'Base Shipper'
  },
  {
    email: 'pro@shipper.com',
    password: 'P23456',
    role: 'shipper',
    membership: 'pro',
    displayName: 'Pro Shipper'
  }
];

export default function TestLoginScreen() {
  const router = useRouter();
  const { login, logout, user } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);

  const handleLogin = async (testUser: TestUser) => {
    setLoading(testUser.email);
    try {
      console.log(`[TestLogin] Logging in as ${testUser.displayName}...`);
      await login(testUser.email, testUser.password);
      
      Alert.alert(
        'Login Successful',
        `Logged in as ${testUser.displayName}`,
        [
          {
            text: 'Go to Dashboard',
            onPress: () => {
              if (testUser.role === 'driver') {
                router.replace('/(tabs)/dashboard');
              } else {
                router.replace('/(tabs)/shipper');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('[TestLogin] Login failed:', error);
      Alert.alert('Login Failed', 'Please check your credentials and try again.');
    } finally {
      setLoading(null);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      Alert.alert('Logged Out', 'You have been signed out successfully.');
    } catch (error) {
      console.error('[TestLogin] Logout failed:', error);
    }
  };

  const getIcon = (testUser: TestUser) => {
    if (testUser.role === 'driver') {
      return <Truck size={24} color={theme.colors.primary} />;
    } else {
      return <Package size={24} color={theme.colors.secondary} />;
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Test Login', headerShown: true }} />
      
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>Quick Test Login</Text>
          <Text style={styles.subtitle}>Tap any user to login instantly</Text>
          
          {user && (
            <View style={styles.currentUser}>
              <Text style={styles.currentUserLabel}>Currently logged in as:</Text>
              <Text style={styles.currentUserEmail}>{user.email}</Text>
              <Text style={styles.currentUserRole}>{user.role?.toUpperCase()}</Text>
              <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <LogOut size={16} color={theme.colors.white} />
                <Text style={styles.logoutButtonText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.usersContainer}>
          <Text style={styles.sectionTitle}>🚛 Drivers</Text>
          {TEST_USERS.filter(u => u.role === 'driver').map((testUser) => (
            <TouchableOpacity
              key={testUser.email}
              style={[
                styles.userCard,
                loading === testUser.email && styles.userCardLoading
              ]}
              onPress={() => handleLogin(testUser)}
              disabled={loading === testUser.email}
            >
              <View style={styles.userIcon}>
                {getIcon(testUser)}
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{testUser.displayName}</Text>
                <Text style={styles.userEmail}>{testUser.email}</Text>
                <Text style={styles.userDetails}>{testUser.equipment}</Text>
              </View>
              <View style={styles.loginIcon}>
                {loading === testUser.email ? (
                  <Text style={styles.loadingText}>...</Text>
                ) : (
                  <LogIn size={20} color={theme.colors.gray} />
                )}
              </View>
            </TouchableOpacity>
          ))}

          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>📦 Shippers</Text>
          {TEST_USERS.filter(u => u.role === 'shipper').map((testUser) => (
            <TouchableOpacity
              key={testUser.email}
              style={[
                styles.userCard,
                loading === testUser.email && styles.userCardLoading
              ]}
              onPress={() => handleLogin(testUser)}
              disabled={loading === testUser.email}
            >
              <View style={styles.userIcon}>
                {getIcon(testUser)}
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{testUser.displayName}</Text>
                <Text style={styles.userEmail}>{testUser.email}</Text>
                <Text style={styles.userDetails}>{testUser.membership} membership</Text>
              </View>
              <View style={styles.loginIcon}>
                {loading === testUser.email ? (
                  <Text style={styles.loadingText}>...</Text>
                ) : (
                  <LogIn size={20} color={theme.colors.gray} />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>🔧 For testing different user roles and features</Text>
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
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.dark,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  currentUser: {
    backgroundColor: theme.colors.white,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    width: '100%',
    borderWidth: 2,
    borderColor: theme.colors.success,
  },
  currentUserLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginBottom: 4,
  },
  currentUserEmail: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: 2,
  },
  currentUserRole: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.success,
    marginBottom: theme.spacing.sm,
  },
  logoutButton: {
    backgroundColor: theme.colors.danger,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  logoutButtonText: {
    color: theme.colors.white,
    fontWeight: '600',
    fontSize: theme.fontSize.sm,
  },
  usersContainer: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.dark,
    marginBottom: theme.spacing.md,
  },
  userCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userCardLoading: {
    opacity: 0.6,
  },
  userIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginBottom: 2,
  },
  userDetails: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.secondary,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  loginIcon: {
    marginLeft: theme.spacing.sm,
  },
  loadingText: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
  },
  footerText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    textAlign: 'center',
  },
});