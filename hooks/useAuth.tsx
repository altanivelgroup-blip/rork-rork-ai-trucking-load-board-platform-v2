import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { Driver, Shipper, Admin, UserRole } from '@/types';
import { auth, db } from '@/utils/firebase';
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

  // Simple Firebase auth state listener
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let mounted = true;
    
    const initAuth = async () => {
      try {
        console.log('[auth] Starting simple auth initialization...');
        
        // Add timeout to prevent hanging
        const timeoutId = setTimeout(() => {
          if (mounted) {
            console.log('[auth] Auth initialization timeout, setting loading to false');
            setIsLoading(false);
          }
        }, 3000);
        
        // Set up Firebase auth state listener
        unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          clearTimeout(timeoutId);
          if (!mounted) return;
          console.log('[auth] Firebase auth state changed:', firebaseUser ? `${firebaseUser.uid} (${firebaseUser.email})` : 'signed out');
          
          if (firebaseUser) {
            // Check for emergency access data to get role
            let userRole: UserRole = 'driver';
            try {
              const emergencyUser = await AsyncStorage.getItem('auth:emergency:user');
              if (emergencyUser) {
                const userData = JSON.parse(emergencyUser);
                if (userData.id === firebaseUser.uid) {
                  userRole = userData.role || 'driver';
                  console.log(`[auth] Using emergency access role: ${userRole}`);
                }
              }
              
              // Also check Firestore for role if available
              try {
                const userRef = doc(db, 'users', firebaseUser.uid);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) {
                  const firestoreData = userSnap.data();
                  if (firestoreData.role) {
                    userRole = firestoreData.role;
                    console.log(`[auth] Using Firestore role: ${userRole}`);
                  }
                }
              } catch (firestoreError) {
                console.warn('[auth] Failed to check Firestore role:', firestoreError);
              }
            } catch (e) {
              console.warn('[auth] Failed to check emergency access:', e);
            }
            
            // Create user object based on role
            let userObject: Driver | Shipper | Admin;
            const email = firebaseUser.email || '';
            const name = email.split('@')[0].toUpperCase();
            
            if (userRole === 'shipper') {
              userObject = {
                id: firebaseUser.uid,
                role: 'shipper',
                email,
                name,
                phone: '',
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
            } else if (userRole === 'admin') {
              userObject = {
                id: firebaseUser.uid,
                role: 'admin',
                email,
                name,
                phone: '',
                membershipTier: 'enterprise',
                createdAt: new Date(),
                permissions: ['analytics', 'user_management', 'load_management', 'system_admin'],
                lastLoginAt: new Date(),
              } as Admin;
            } else {
              // For drivers, try to load complete saved profile from Firestore
              console.log('[auth] Loading driver profile from Firestore...');
              try {
                const { getDriverProfile } = await import('@/lib/firebase');
                const profileResult = await getDriverProfile(firebaseUser.uid);
                
                if (profileResult.success && profileResult.data) {
                  const profile = profileResult.data;
                  console.log('[auth] ✅ Loaded complete driver profile from Firestore:', {
                    name: profile.fullName || profile.name,
                    email: profile.email,
                    phone: profile.phone,
                    vehicleMake: profile.vehicleMake,
                    vehicleModel: profile.vehicleModel,
                    mpgRated: profile.mpgRated,
                    hasCompanyInfo: !!(profile.companyName || profile.mcNumber)
                  });
                  
                  // Use the complete saved profile
                  userObject = {
                    id: firebaseUser.uid,
                    role: 'driver',
                    email: profile.email || email,
                    name: profile.fullName || profile.name || name,
                    phone: profile.phone || '',
                    membershipTier: 'basic',
                    createdAt: new Date(),
                    cdlNumber: profile.cdlNumber || '',
                    vehicleTypes: profile.vehicleTypes || [],
                    rating: 4.8,
                    completedLoads: 24,
                    documents: [],
                    wallet: {
                      balance: profile.balance || 2450,
                      pendingEarnings: 850,
                      totalEarnings: 12500,
                      transactions: [],
                    },
                    fuelProfile: profile.fuelProfile || {
                      vehicleType: profile.truckType || 'truck',
                      averageMpg: profile.mpgRated || 8.5,
                      fuelPricePerGallon: 3.85,
                      fuelType: profile.fuelType || 'diesel',
                      tankCapacity: profile.tankGallons || 150,
                    },
                    mpgRated: profile.mpgRated || 8.5,
                    isAvailable: true,
                    verificationStatus: profile.verificationStatus || 'verified',
                    // Include all the saved profile fields
                    company: profile.company,
                    truckType: profile.truckType,
                    tankSize: profile.tankSize,
                    fuelTypePreference: profile.fuelTypePreference,
                    yearsExperience: profile.yearsExperience,
                    safetyCertifications: profile.safetyCertifications,
                    vehicleMake: profile.vehicleMake,
                    vehicleModel: profile.vehicleModel,
                    vehicleYear: profile.vehicleYear,
                    fuelType: profile.fuelType,
                    vin: profile.vin,
                    plate: profile.plate,
                    tankGallons: profile.tankGallons,
                    gvwrLbs: profile.gvwrLbs,
                    trailerMake: profile.trailerMake,
                    trailerModel: profile.trailerModel,
                    trailerYear: profile.trailerYear,
                    trailerVin: profile.trailerVin,
                    trailerPlate: profile.trailerPlate,
                    trailerInsuranceCarrier: profile.trailerInsuranceCarrier,
                    trailerPolicyNumber: profile.trailerPolicyNumber,
                    trailerGvwrLbs: profile.trailerGvwrLbs,
                    trailerType: profile.trailerType,
                    companyName: profile.companyName,
                    mcNumber: profile.mcNumber,
                    dotNumber: profile.dotNumber,
                    insuranceCarrier: profile.insuranceCarrier,
                    policyNumber: profile.policyNumber,
                  } as Driver;
                  
                  console.log('[auth] ✅ Driver profile fully loaded and restored');
                } else {
                  console.log('[auth] ⚠️ No saved profile found, creating default driver profile');
                  // Create default profile if none exists
                  userObject = {
                    id: firebaseUser.uid,
                    role: 'driver',
                    email,
                    name,
                    phone: '',
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
                    mpgRated: 8.5,
                    isAvailable: true,
                    verificationStatus: 'verified',
                  } as Driver;
                }
              } catch (profileError) {
                console.warn('[auth] ❌ Failed to load driver profile, using default:', profileError);
                // Fallback to default profile
                userObject = {
                  id: firebaseUser.uid,
                  role: 'driver',
                  email,
                  name,
                  phone: '',
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
                  mpgRated: 8.5,
                  isAvailable: true,
                  verificationStatus: 'verified',
                } as Driver;
              }
            }
            
            setUser(userObject);
            setUserId(firebaseUser.uid);
            setHasSignedInThisSession(true);
            console.log(`[auth] User authenticated: ${userObject.role} - ${userObject.email}`);
            
          } else {
            // User is signed out
            setUser(null);
            setUserId(null);
            setHasSignedInThisSession(false);
            console.log('[auth] User signed out');
          }
          
          if (mounted) {
            setIsLoading(false);
          }
        });
        
        if (mounted) {
          setIsFirebaseAuthenticated(true);
        }
        
      } catch (error: any) {
        console.error('[auth] Auth initialization error:', error);
        if (mounted) {
          setIsLoading(false);
        }
      }
    };
    
    initAuth();
    
    return () => {
      mounted = false;
      if (unsubscribe) unsubscribe();
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
      await AsyncStorage.removeItem('auth:emergency:user');
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