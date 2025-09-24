import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { moderateScale } from '@/src/ui/scale';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { getFirebase } from '@/utils/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Truck, Building, Shield } from 'lucide-react-native';

const AUTH_ICON_URL = 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/wcevsahzwhm5yc2aczcz8';

// Your test accounts with Firebase UIDs
const TEST_ACCOUNTS = {
  driver: {
    email: 'driver@test1.com',
    password: 'RealUnlock123',
    uid: 'OK0pPByFYicnOu6Z0B7tzR17Qz',
    role: 'driver',
    name: 'DRIVER'
  },
  shipper: {
    email: 'shipper@test1.com', 
    password: 'RealShipper123',
    uid: 'pu2bP7pzfuW39mgNDtO6im2ZQof',
    role: 'shipper',
    name: 'SHIPPER'
  },
  admin: {
    email: 'admin@test1.com',
    password: 'RealBoss123', 
    uid: 'IFHGF8LVUTQY6mnBqw5rblU167',
    role: 'admin',
    name: 'ADMIN'
  }
};

export default function LoginScreen() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingRole, setLoadingRole] = useState<string | null>(null);
  const router = useRouter();

  const handleRoleLogin = async (roleKey: 'driver' | 'shipper' | 'admin') => {
    setIsLoading(true);
    setLoadingRole(roleKey);

    try {
      const account = TEST_ACCOUNTS[roleKey];
      console.log(`[Login] Signing in as ${roleKey}: ${account.email}`);

      // Firebase authentication
      const { auth, db } = getFirebase();
      const userCredential = await signInWithEmailAndPassword(auth, account.email, account.password);
      const firebaseUser = userCredential.user;

      console.log(`[Login] Firebase Success: UID ${firebaseUser.uid}`);

      // Store emergency access data
      const emergencyUserData = {
        id: firebaseUser.uid,
        email: account.email,
        role: account.role,
        name: account.name,
        phone: '',
        membershipTier: account.role === 'admin' ? 'enterprise' : 'basic',
        createdAt: new Date().toISOString()
      };
      
      await AsyncStorage.setItem('auth:emergency:user', JSON.stringify(emergencyUserData));
      console.log(`[Login] Emergency access stored for ${account.role}`);

      // Also ensure Firestore has the user data
      try {
        const userRef = doc(db, 'users', firebaseUser.uid);
        const profileData = {
          fullName: account.name,
          email: account.email,
          phone: '',
          company: account.role === 'shipper' ? 'Test Logistics' : ''
        };
        
        const userDoc = {
          role: account.role,
          profileData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        await setDoc(userRef, userDoc, { merge: true });
        console.log(`[Login] User profile saved to Firestore for ${account.role}`);
      } catch (firestoreError) {
        console.warn(`[Login] Firestore save failed (continuing anyway):`, firestoreError);
      }

      // Wait a moment for auth state to update
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Route based on role with explicit navigation
      console.log(`[Login] Navigating to ${account.role} dashboard`);
      
      // Force navigation with router.push first, then replace
      if (account.role === 'driver') {
        console.log('[Login] Routing to driver dashboard');
        router.push('/(tabs)/dashboard');
        setTimeout(() => router.replace('/(tabs)/dashboard'), 100);
      } else if (account.role === 'shipper') {
        console.log('[Login] Routing to shipper dashboard');
        router.push('/(tabs)/shipper');
        setTimeout(() => router.replace('/(tabs)/shipper'), 100);
      } else if (account.role === 'admin') {
        console.log('[Login] Routing to admin dashboard');
        router.push('/(tabs)/admin');
        setTimeout(() => router.replace('/(tabs)/admin'), 100);
      }
      
    } catch (error: any) {
      console.error(`[Login] ${roleKey} login failed:`, error);
      Alert.alert(
        'Login Failed',
        `Failed to sign in as ${roleKey}. Error: ${error.message || error.code}`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
      setLoadingRole(null);
    }
  };

  return (
    <SafeAreaView style={styles.container} testID="login-safe">
      <View style={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => {
              console.log('[login] logo pressed -> navigating to auth-debug');
              try { router.push('/auth-debug'); } catch (e) { console.warn('nav error', e); }
            }}
            onLongPress={() => {
              console.log('[login] logo long-pressed -> navigating to dev-bulk-tools');
              try { router.push('/dev-bulk-tools'); } catch (e) { console.warn('nav error', e); }
            }}
            delayLongPress={500}
            style={styles.logoContainer}
            testID="login-logo-hotspot"
            accessibilityRole="imagebutton"
            accessibilityLabel="App logo"
          >
            <Image
              source={{ uri: AUTH_ICON_URL }}
              style={styles.logoImage}
              resizeMode="contain"
              accessibilityLabel="LoadRun AI Load Board for Car Haulers"
              testID="login-logo-image"
            />
          </TouchableOpacity>
          <Text style={styles.title} testID="login-title">LoadRun</Text>
          <Text style={styles.subtitle}>AI Load Board for Car Haulers</Text>
        </View>

        <View style={styles.roleSelection}>
          <Text style={styles.roleTitle}>Select Your Role</Text>
          
          <TouchableOpacity
            style={[styles.roleButton, styles.driverButton, (isLoading && loadingRole === 'driver') && styles.roleButtonDisabled]}
            onPress={() => handleRoleLogin('driver')}
            disabled={isLoading}
            testID="driver-login-button"
          >
            {isLoading && loadingRole === 'driver' ? (
              <ActivityIndicator color={theme.colors.white} size="large" />
            ) : (
              <>
                <Truck size={32} color={theme.colors.white} />
                <Text style={styles.roleButtonText}>DRIVER</Text>
                <Text style={styles.roleButtonSubtext}>Find and haul loads</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.roleButton, styles.shipperButton, (isLoading && loadingRole === 'shipper') && styles.roleButtonDisabled]}
            onPress={() => handleRoleLogin('shipper')}
            disabled={isLoading}
            testID="shipper-login-button"
          >
            {isLoading && loadingRole === 'shipper' ? (
              <ActivityIndicator color={theme.colors.white} size="large" />
            ) : (
              <>
                <Building size={32} color={theme.colors.white} />
                <Text style={styles.roleButtonText}>SHIPPER</Text>
                <Text style={styles.roleButtonSubtext}>Post loads for drivers</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.roleButton, styles.adminButton, (isLoading && loadingRole === 'admin') && styles.roleButtonDisabled]}
            onPress={() => handleRoleLogin('admin')}
            disabled={isLoading}
            testID="admin-login-button"
          >
            {isLoading && loadingRole === 'admin' ? (
              <ActivityIndicator color={theme.colors.white} size="large" />
            ) : (
              <>
                <Shield size={32} color={theme.colors.white} />
                <Text style={styles.roleButtonText}>ADMIN</Text>
                <Text style={styles.roleButtonSubtext}>Manage platform</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')} testID="manual-login-link">
            <Text style={styles.manualLoginText}>Manual Login</Text>
          </TouchableOpacity>
          
          <View style={styles.testCredentials}>
            <Text style={styles.testCredentialsTitle}>Test Credentials:</Text>
            <Text style={styles.testCredentialsText}>Driver: driver@test1.com / RealUnlock123</Text>
            <Text style={styles.testCredentialsText}>Shipper: shipper@test1.com / RealShipper123</Text>
            <Text style={styles.testCredentialsText}>Admin: admin@test1.com / RealBoss123</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl * 2,
  },
  logoContainer: {
    width: moderateScale(120),
    height: moderateScale(120),
    borderRadius: moderateScale(24),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    overflow: 'hidden',
  },
  logoImage: {
    width: moderateScale(120),
    height: moderateScale(120),
    borderRadius: moderateScale(24),
  },
  title: {
    fontSize: theme.fontSize.xxl,
    fontWeight: '700',
    color: theme.colors.dark,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
  },
  roleSelection: {
    marginBottom: theme.spacing.xl,
  },
  roleTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.dark,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  roleButton: {
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.md,
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    minHeight: 100,
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  roleButtonDisabled: {
    opacity: 0.7,
  },
  driverButton: {
    backgroundColor: '#007AFF',
  },
  shipperButton: {
    backgroundColor: '#34C759',
  },
  adminButton: {
    backgroundColor: '#FF3B30',
  },
  roleButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    marginBottom: 4,
  },
  roleButtonSubtext: {
    color: theme.colors.white,
    fontSize: theme.fontSize.sm,
    opacity: 0.9,
  },
  footer: {
    alignItems: 'center',
    marginTop: theme.spacing.lg,
  },
  manualLoginText: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.sm,
    fontWeight: '500',
  },
  testCredentials: {
    marginTop: theme.spacing.lg,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.lightGray,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  testCredentialsTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: theme.spacing.sm,
  },
  testCredentialsText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray,
    marginBottom: 2,
    fontFamily: 'monospace',
  },
});
