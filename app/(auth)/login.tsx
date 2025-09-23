import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Users, Truck, Settings } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { moderateScale } from '@/src/ui/scale';
import { useAuth } from '@/hooks/useAuth';

const AUTH_ICON_URL = 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/wcevsahzwhm5yc2aczcz8';

type UserRole = 'driver' | 'shipper' | 'admin';

interface RoleOption {
  role: UserRole;
  title: string;
  subtitle: string;
  icon: React.ComponentType<any>;
  color: string;
  testCredentials: {
    email: string;
    password: string;
  };
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    role: 'driver',
    title: 'Driver',
    subtitle: 'Find and book loads',
    icon: Truck,
    color: theme.colors.primary,
    testCredentials: {
      email: 'driver@test1.com',
      password: 'RealUnlock123-'
    }
  },
  {
    role: 'shipper',
    title: 'Shipper',
    subtitle: 'Post loads and manage shipments',
    icon: Users,
    color: theme.colors.secondary,
    testCredentials: {
      email: 'shipper@test1.com',
      password: 'RealShipper123'
    }
  },
  {
    role: 'admin',
    title: 'Admin',
    subtitle: 'Manage platform and users',
    icon: Settings,
    color: theme.colors.warning,
    testCredentials: {
      email: 'admin@test1.com',
      password: 'RealBoss123'
    }
  },
];

export default function LoginScreen() {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const router = useRouter();
  // Auth hook for state management
  useAuth();

  const handleRoleLogin = async (roleOption: RoleOption) => {
    setIsLoading(roleOption.role);
    setErrorText(null);

    try {
      console.log(`[Login] Attempting ${roleOption.role} login with ${roleOption.testCredentials.email}`);
      
      // Import Firebase auth functions
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
      const { auth, db } = await import('@/utils/firebase');
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      
      // Sign in with Firebase
      const userCredential = await signInWithEmailAndPassword(
        auth,
        roleOption.testCredentials.email,
        roleOption.testCredentials.password
      );
      
      const firebaseUser = userCredential.user;
      console.log(`[Login] Firebase authentication successful for ${firebaseUser.email}`);
      
      // Store emergency access data
      const emergencyUserData = {
        id: firebaseUser.uid,
        email: firebaseUser.email,
        role: roleOption.role,
        name: firebaseUser.email?.split('@')[0]?.toUpperCase() || 'USER',
        phone: '',
        membershipTier: roleOption.role === 'admin' ? 'enterprise' : 'basic',
        createdAt: new Date().toISOString()
      };
      
      await AsyncStorage.setItem('auth:emergency:user', JSON.stringify(emergencyUserData));
      console.log(`[Login] Emergency access data stored for ${roleOption.role}`);
      
      // Try to update Firestore (best effort)
      try {
        const userRef = doc(db, 'users', firebaseUser.uid);
        const profileData = {
          fullName: emergencyUserData.name,
          email: emergencyUserData.email,
          phone: '',
          company: roleOption.role === 'shipper' ? 'Test Logistics' : ''
        };
        
        await setDoc(userRef, {
          role: roleOption.role,
          profileData,
          updatedAt: serverTimestamp()
        }, { merge: true });
        
        console.log(`[Login] Firestore profile updated for ${roleOption.role}`);
      } catch (firestoreError) {
        console.warn(`[Login] Firestore update failed (continuing anyway):`, firestoreError);
      }
      
      console.log(`[Login] ${roleOption.role} login successful, navigating...`);

      // Navigate based on role
      if (roleOption.role === 'admin') {
        router.replace('/(tabs)/admin');
      } else if (roleOption.role === 'shipper') {
        router.replace('/(tabs)/shipper');
      } else {
        router.replace('/(tabs)/dashboard');
      }

    } catch (error: any) {
      console.error(`[Login] ${roleOption.role} login failed:`, error);
      let errorMessage = `${roleOption.title} login failed. Please try again.`;
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = `${roleOption.title} account not found. Please check credentials.`;
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = `Invalid password for ${roleOption.title} account.`;
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your connection.';
      }
      
      setErrorText(errorMessage);
    } finally {
      setIsLoading(null);
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
          <Text style={styles.roleTitle}>Choose Your Role</Text>
          
          {ROLE_OPTIONS.map((roleOption) => {
            const IconComponent = roleOption.icon;
            const isLoadingThis = isLoading === roleOption.role;
            
            return (
              <TouchableOpacity
                key={roleOption.role}
                style={[
                  styles.roleButton,
                  { backgroundColor: roleOption.color },
                  isLoadingThis && styles.roleButtonDisabled
                ]}
                onPress={() => handleRoleLogin(roleOption)}
                disabled={!!isLoading}
                testID={`login-${roleOption.role}`}
              >
                <View style={styles.roleButtonContent}>
                  <View style={styles.roleButtonLeft}>
                    <IconComponent size={24} color={theme.colors.white} />
                    <View style={styles.roleButtonText}>
                      <Text style={styles.roleButtonTitle}>{roleOption.title}</Text>
                      <Text style={styles.roleButtonSubtitle}>{roleOption.subtitle}</Text>
                    </View>
                  </View>
                  {isLoadingThis && (
                    <ActivityIndicator color={theme.colors.white} size="small" />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {!!errorText && (
          <Text style={styles.errorText} testID="login-error">{errorText}</Text>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don&apos;t have an account?</Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/signup')} testID="signup-link">
            <Text style={styles.signUpText}>Sign Up</Text>
          </TouchableOpacity>
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
    marginBottom: theme.spacing.md,
    padding: theme.spacing.lg,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  roleButtonDisabled: {
    opacity: 0.7,
  },
  roleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roleButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  roleButtonText: {
    marginLeft: theme.spacing.md,
    flex: 1,
  },
  roleButtonTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.white,
    marginBottom: theme.spacing.xs,
  },
  roleButtonSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.white,
    opacity: 0.9,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.xs,
  },
  footerText: {
    color: theme.colors.gray,
    fontSize: theme.fontSize.sm,
  },
  signUpText: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
  errorText: {
    color: theme.colors.danger,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
    fontSize: theme.fontSize.sm,
    textAlign: 'center',
  },
});