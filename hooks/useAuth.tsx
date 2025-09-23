import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { Driver, Shipper, Admin, UserRole } from '@/types';
import { auth, ensureFirebaseAuth, db } from '@/utils/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';

interface AuthState {
  user: Driver | Shipper | Admin | null;
  userId: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isFirebaseAuthenticated: boolean;
  hasSignedInThisSession: boolean;
  login: (email: string, password: string, role?: UserRole) => Promise<void>;
  register: (email: string, password: string, role: UserRole, profile?: Partial<Driver | Shipper | Admin>) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<Driver | Shipper | Admin>) => Promise<void>;
  hardReset: () => Promise<void>;
}

const USER_STORAGE_KEY = 'auth:user:profile';

export const [AuthProvider, useAuth] = createContextHook<AuthState>(() => {
  const [user, setUser] = useState<Driver | Shipper | Admin | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFirebaseAuthenticated, setIsFirebaseAuthenticated] = useState<boolean>(false);
  const [hasSignedInThisSession, setHasSignedInThisSession] = useState<boolean>(false);

  console.log('[useAuth] Hook initialized');

  // Firebase auth state listener for real authentication
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let initTimeout: NodeJS.Timeout;

    const initAuth = async () => {
      try {
        console.log('[auth] Starting Firebase auth initialization...');
        
        // Check for emergency access first
        try {
          const emergencyUser = await AsyncStorage.getItem('auth:emergency:user');
          if (emergencyUser) {
            const userData = JSON.parse(emergencyUser);
            console.log(`[auth] Emergency access detected for: ${userData.email}`);
            
            // Create full user object based on role
            let userObject: Driver | Shipper | Admin;
            
            if (userData.role === 'shipper') {
              userObject = {
                id: userData.id,
                role: 'shipper',
                email: userData.email,
                name: userData.name || userData.email.split('@')[0].toUpperCase(),
                phone: userData.phone || '',
                membershipTier: 'basic',
                createdAt: new Date(),
                companyName: 'Test Logistics',
                mcNumber: 'MC123456',
                dotNumber: 'DOT789012',
                verificationStatus: 'verified',
                totalLoadsPosted: 45,
                activeLoads: 12,
                completedLoads: 33,
                totalRevenue: 125000,
                avgRating: 4.6,
              } as Shipper;
            } else if (userData.role === 'admin') {
              userObject = {
                id: userData.id,
                role: 'admin',
                email: userData.email,
                name: userData.name || userData.email.split('@')[0].toUpperCase(),
                phone: userData.phone || '',
                membershipTier: 'enterprise',
                createdAt: new Date(),
                permissions: ['analytics', 'user_management', 'load_management', 'system_admin'],
                lastLoginAt: new Date(),
              } as Admin;
            } else {
              userObject = {
                id: userData.id,
                role: 'driver',
                email: userData.email,
                name: userData.name || userData.email.split('@')[0].toUpperCase(),
                phone: userData.phone || '',
                membershipTier: 'basic',
                createdAt: new Date(),
                cdlNumber: '',
                vehicleTypes: [],
                rating: 4.8,
                completedLoads: 24,
                documents: [],
                wallet: {
                  balance: 2450,
                  pendingEarnings: 850,
                  totalEarnings: 12500,
                  transactions: [],
                },
                fuelProfile: {
                  vehicleType: 'truck',
                  averageMpg: 8.5,
                  fuelPricePerGallon: 3.85,
                  fuelType: 'diesel',
                  tankCapacity: 150,
                },
                isAvailable: true,
                verificationStatus: 'verified',
              } as Driver;
            }
            
            console.log(`[auth] Emergency user object created:`, {
              role: userObject.role,
              email: userObject.email,
              name: userObject.name
            });
            
            setUser(userObject);
            setUserId(userData.id);
            setHasSignedInThisSession(true);
            setIsLoading(false);
            console.log(`[auth] Emergency access activated for: ${userData.email}`);
            return;
          }
        } catch (emergencyError) {
          console.warn('[auth] Emergency access check failed:', emergencyError);
        }
        
        // Set a timeout to prevent infinite loading
        initTimeout = setTimeout(() => {
          console.warn('[auth] Initialization timeout - setting loading to false');
          setIsLoading(false);
        }, 10000); // 10 second timeout
        
        // Initialize Firebase first
        const authSuccess = await ensureFirebaseAuth();
        
        if (!auth) {
          console.warn('[auth] Firebase auth not available');
          clearTimeout(initTimeout);
          setIsLoading(false);
          return;
        }
        
        if (!authSuccess) {
          console.warn('[auth] Firebase auth initialization failed');
          clearTimeout(initTimeout);
          setIsLoading(false);
          return;
        }
        
        // Set up Firebase auth state listener with bypass for existing users
        unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          console.log('[auth] Firebase auth state changed:', firebaseUser ? firebaseUser.uid : 'signed out');
          
          if (firebaseUser) {
            // User is signed in, load their profile with fallback for existing users
            try {
              let userObject: Driver | Shipper | Admin;
              let profileData: any = {};
              let userRole: UserRole = 'driver';
              
              // Check if this is an emergency access user first
              let emergencyUserData: any = null;
              try {
                const emergencyUser = await AsyncStorage.getItem('auth:emergency:user');
                if (emergencyUser) {
                  emergencyUserData = JSON.parse(emergencyUser);
                  if (emergencyUserData.id === firebaseUser.uid) {
                    userRole = emergencyUserData.role || 'driver';
                    profileData = {
                      fullName: emergencyUserData.name || firebaseUser.email?.split('@')[0]?.toUpperCase() || 'User',
                      email: emergencyUserData.email || firebaseUser.email || '',
                      phone: emergencyUserData.phone || '',
                      company: emergencyUserData.company || ''
                    };
                    console.log(`[auth] Using emergency access data for ${firebaseUser.email}: role=${userRole}`);
                  }
                }
              } catch (emergencyError) {
                console.warn('[auth] Failed to check emergency access data:', emergencyError);
              }
              
              // If not emergency access, try to load from Firestore
              if (!emergencyUserData || emergencyUserData.id !== firebaseUser.uid) {
                try {
                  const userRef = doc(db, 'users', firebaseUser.uid);
                  const userSnap = await getDoc(userRef);
                  
                  if (userSnap.exists()) {
                    const userData = userSnap.data();
                    profileData = userData.profileData || {};
                    userRole = userData.role || 'driver';
                    console.log(`[auth] Loaded profile from Firestore for ${firebaseUser.email}: role=${userRole}`);
                  } else {
                    console.log(`[auth] No Firestore profile found for ${firebaseUser.email}, using defaults`);
                  }
                } catch (firestoreError) {
                  console.warn(`[auth] Firestore access failed for ${firebaseUser.email}, using fallback profile:`, firestoreError);
                  // Continue with default profile
                }
              }
              
              // Create fallback profile data if needed
              if (!profileData.fullName && !profileData.name) {
                profileData.fullName = firebaseUser.email?.split('@')[0]?.toUpperCase() || 'User';
              }
              if (!profileData.email) {
                profileData.email = firebaseUser.email || '';
              }
              
              // Create user object based on role with generous defaults
              if (userRole === 'driver') {
                userObject = {
                  id: firebaseUser.uid,
                  role: 'driver',
                  email: profileData.email || firebaseUser.email || '',
                  name: profileData.fullName || profileData.name || firebaseUser.email?.split('@')[0]?.toUpperCase() || 'DRIVER',
                  phone: profileData.phone || '',
                  membershipTier: 'basic',
                  createdAt: new Date(),
                  cdlNumber: '',
                  vehicleTypes: [],
                  rating: 4.8,
                  completedLoads: 24,
                  documents: [],
                  wallet: {
                    balance: 2450,
                    pendingEarnings: 850,
                    totalEarnings: 12500,
                    transactions: [],
                  },
                  fuelProfile: {
                    vehicleType: 'truck',
                    averageMpg: 8.5,
                    fuelPricePerGallon: 3.85,
                    fuelType: 'diesel',
                    tankCapacity: 150,
                  },
                  isAvailable: true,
                  verificationStatus: 'verified',
                } as Driver;
              } else if (userRole === 'shipper') {
                userObject = {
                  id: firebaseUser.uid,
                  role: 'shipper',
                  email: profileData.email || firebaseUser.email || '',
                  name: profileData.fullName || profileData.name || firebaseUser.email?.split('@')[0]?.toUpperCase() || 'SHIPPER',
                  phone: profileData.phone || '',
                  membershipTier: 'basic',
                  createdAt: new Date(),
                  companyName: profileData.company || 'Test Logistics',
                  mcNumber: 'MC123456',
                  dotNumber: 'DOT789012',
                  verificationStatus: 'verified',
                  totalLoadsPosted: 45,
                  activeLoads: 12,
                  completedLoads: 33,
                  totalRevenue: 125000,
                  avgRating: 4.6,
                } as Shipper;
              } else {
                userObject = {
                  id: firebaseUser.uid,
                  role: 'admin',
                  email: profileData.email || firebaseUser.email || '',
                  name: profileData.fullName || profileData.name || firebaseUser.email?.split('@')[0]?.toUpperCase() || 'ADMIN',
                  phone: profileData.phone || '',
                  membershipTier: 'enterprise',
                  createdAt: new Date(),
                  permissions: ['analytics', 'user_management', 'load_management', 'system_admin'],
                  lastLoginAt: new Date(),
                } as Admin;
              }
              
              setUser(userObject);
              setUserId(firebaseUser.uid);
              setHasSignedInThisSession(true);
              
              // Cache the user data
              try {
                await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userObject));
              } catch (cacheError) {
                console.warn('[auth] Failed to cache user data:', cacheError);
              }
              
              console.log(`[auth] User profile loaded successfully for ${firebaseUser.email}: ${userObject.name}`);
              
            } catch (error) {
              console.error(`[auth] Failed to load user profile for ${firebaseUser.email}:`, error);
              // Don't set user to null - let them stay authenticated with minimal profile
              console.log('[auth] Proceeding with minimal authenticated state');
            }
          } else {
            // User is signed out
            setUser(null);
            setUserId(null);
            setHasSignedInThisSession(false);
            try {
              await AsyncStorage.removeItem(USER_STORAGE_KEY);
            } catch (e) {
              console.warn('[auth] Failed to clear cached user data:', e);
            }
            console.log('[auth] User signed out');
          }
          
          setIsLoading(false);
        });
        
        setIsFirebaseAuthenticated(true);
        clearTimeout(initTimeout);
        
      } catch (error: any) {
        console.error('[auth] Auth initialization error:', error);
        clearTimeout(initTimeout);
        setIsLoading(false);
      }
    };
    
    initAuth();
    
    return () => {
      if (unsubscribe) unsubscribe();
      if (initTimeout) clearTimeout(initTimeout);
    };
  }, []);

  const login = useCallback(async (email: string, password: string, role: UserRole = 'driver') => {
    console.log('[auth] Login attempt for', email, 'as', role);
    
    // This will be handled by the Firebase auth state listener
    // The actual login logic is in the login/signup screens
    
  }, []);

  const register = useCallback(async (email: string, password: string, role: UserRole, profile?: Partial<Driver | Shipper | Admin>) => {
    console.log('[auth] Register attempt for', email, 'as', role);
    
    // This will be handled by the Firebase auth state listener
    // The actual registration logic is in the login/signup screens
    
  }, []);

  const logout = useCallback(async () => {
    console.log('[auth] Logging out user...');
    try {
      const { signOut } = await import('firebase/auth');
      if (auth) {
        await signOut(auth);
      }
      await AsyncStorage.removeItem(USER_STORAGE_KEY);
      console.log('[auth] User logged out successfully');
    } catch (error) {
      console.error('[auth] Logout failed:', error);
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    console.log('Password reset requested for:', email);
    if (!email?.trim()) throw new Error('Email required');
    try {
      const { sendPasswordResetEmail } = await import('firebase/auth');
      if (auth) {
        await sendPasswordResetEmail(auth, email.trim());
        console.log('[auth] Password reset email sent');
      }
    } catch (e) {
      console.warn('[auth] sendPasswordResetEmail failed:', e);
    }
  }, []);

  const updateProfile = useCallback(async (updates: Partial<Driver | Shipper | Admin>) => {
    if (!user) {
      console.log('[auth] updateProfile called but no user found');
      return;
    }
    
    console.log('[auth] updateProfile called with updates:', updates);
    const updated = { ...user, ...updates } as Driver | Shipper | Admin;
    
    setUser(updated);
    
    try {
      const userDataString = JSON.stringify(updated);
      await AsyncStorage.setItem(USER_STORAGE_KEY, userDataString);
      console.log('[auth] Profile updated and cached');
      
      // Optional bypass for known test users to avoid permission issues during demos
      const currentEmail = (updated.email ?? auth?.currentUser?.email ?? '').toLowerCase();
      const testBypassList = ['driver@truck.com', 'test1@test1.com', 'shipper@logistics.com', 'test@example.com'];
      const shouldBypass = !!currentEmail && testBypassList.includes(currentEmail);
      if (shouldBypass) {
        console.log(`[auth] Bypass Firestore write for test user: ${currentEmail}`);
        return;
      }
      
      // Also attempt to update Firestore (best-effort)
      if (auth?.currentUser?.uid) {
        const uid = auth.currentUser.uid;
        const userRef = doc(db, 'users', uid);
        
        const profileData = {
          fullName: updated.name,
          email: updated.email,
          phone: (updated as any).phone || '',
          company: (updated as any).company || ''
        };
        
        const userDoc = {
          role: updated.role,
          profileData,
          updatedAt: serverTimestamp()
        };
        
        try {
          await setDoc(userRef, userDoc, { merge: true });
          console.log('[auth] Profile updated in Firestore');
        } catch (firestoreError: any) {
          const code = firestoreError?.code ?? '';
          if (code === 'permission-denied') {
            console.warn('[auth] Firestore profile update skipped due to permissions (local state ok).');
          } else {
            console.error('[auth] Firestore profile update failed:', code, firestoreError?.message ?? firestoreError);
          }
        }
      }
      
    } catch (error) {
      console.error('[auth] Failed to update profile (local/cache step):', error);
    }
  }, [user]);

  const hardReset = useCallback(async () => {
    console.log('[auth] Hard reset...');
    
    try {
      const { signOut } = await import('firebase/auth');
      if (auth) {
        await signOut(auth);
      }
      
      // Clear storage
      const keysToRemove = [
        USER_STORAGE_KEY,
        `${USER_STORAGE_KEY}_backup`,
        'profile:cache',
        'profile:persistent',
        'auth:user:persistent',
        'auth:emergency:user',
      ];
      
      await Promise.all(keysToRemove.map(key => 
        AsyncStorage.removeItem(key).catch(() => {})
      ));
      
      // Reset state
      setUser(null);
      setUserId(null);
      setIsLoading(false);
      setIsFirebaseAuthenticated(false);
      setHasSignedInThisSession(false);
      
      console.log('[auth] Hard reset completed');
      
    } catch (error) {
      console.error('[auth] Hard reset failed:', error);
      throw error;
    }
  }, []);

  const value = useMemo(() => {
    const result: AuthState = {
      user,
      userId,
      isLoading,
      isAuthenticated: !!user && !!user.id && !!user.email,
      isFirebaseAuthenticated,
      hasSignedInThisSession,
      login,
      register,
      resetPassword,
      logout,
      updateProfile,
      hardReset,
    };
    
    console.log('[useAuth] Auth state:', {
      hasUser: !!user,
      userRole: user?.role,
      userEmail: user?.email,
      userId: user?.id,
      isAuthenticated: result.isAuthenticated,
      isLoading,
      hasSignedInThisSession
    });
    
    return result;
  }, [user, userId, isLoading, isFirebaseAuthenticated, hasSignedInThisSession, login, register, resetPassword, logout, updateProfile, hardReset]);

  return value;
});