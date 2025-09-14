import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Driver, Shipper, Admin, UserRole } from '@/types';
import { auth, ensureFirebaseAuth, db } from '@/utils/firebase';
import { onAuthStateChanged } from 'firebase/auth';

import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

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

}

const USER_STORAGE_KEY = 'auth:user:profile';

export const [AuthProvider, useAuth] = createContextHook<AuthState>(() => {
  // Always call all hooks in the same order - never conditionally
  const [user, setUser] = useState<Driver | Shipper | Admin | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFirebaseAuthenticated, setIsFirebaseAuthenticated] = useState<boolean>(false);
  const [isAnonymous, setIsAnonymous] = useState<boolean>(true);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [hasSignedInThisSession, setHasSignedInThisSession] = useState<boolean>(false);
  
  console.log('[useAuth] Hook called - ensuring consistent hook order');

  // Load cached user data but don't auto-authenticate - always called, never conditional
  useEffect(() => {
    let isMounted = true;
    
    const loadCachedUser = async () => {
      try {
        console.log('[auth] loading cached user...');
        const cached = await AsyncStorage.getItem(USER_STORAGE_KEY);
        
        if (!isMounted) return;
        
        if (cached) {
          console.log('[auth] found cached user - but not auto-authenticating');
          // Don't set the user yet - require explicit sign-in
          // const cachedUser = JSON.parse(cached);
          // setUser(cachedUser);
          // setIsAnonymous(false);
        } else {
          console.log('[auth] no cached user found');
        }
        
        setIsInitialized(true);
        setIsLoading(false);
      } catch (e) {
        console.error('[auth] error loading cached user:', e);
        if (isMounted) {
          setIsInitialized(true);
          setIsLoading(false);
        }
      }
    };
    
    // Add small delay to prevent race conditions
    setTimeout(loadCachedUser, 10);
    
    return () => {
      isMounted = false;
    };
  }, []);

  // Enhanced Firebase auth setup with retry logic and user-friendly messages
  useEffect(() => {
    let isMounted = true;
    let unsubscribe: (() => void) | undefined;
    
    const setupFirebaseAuth = async () => {
      try {
        console.log('[auth] ✅ Auth optimized - Setting up enhanced Firebase auth...');
        const authSuccess = await ensureFirebaseAuth();
        
        if (!isMounted) return;
        
        if (authSuccess) {
          console.log('[auth] ✅ Auth optimized - Firebase auth setup successful');
        } else {
          console.warn('[auth] ⚠️ Auth optimization - Firebase auth setup failed, using fallback');
        }
        
        unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
          if (!isMounted) return;
          
          console.log('[auth] ✅ Auth optimized - Firebase auth state changed:', {
            uid: firebaseUser?.uid,
            isAnonymous: firebaseUser?.isAnonymous,
          });
          
          if (firebaseUser) {
            console.log('[auth] ✅ Auth optimized - Sign in successful');
          }
          
          setUserId(firebaseUser?.uid || null);
          setIsFirebaseAuthenticated(!!firebaseUser);
          
          // Only update isAnonymous if we don't have a local user
          if (!user) {
            setIsAnonymous(firebaseUser?.isAnonymous ?? true);
          }
        });
      } catch (error: any) {
        console.warn('[auth] ❌ Auth optimization - Firebase auth setup failed:', error?.message || error);
        if (isMounted) {
          setIsFirebaseAuthenticated(false);
          setUserId(null);
          console.log('[auth] 💡 Auth optimized - Continuing with local auth only');
        }
      }
    };
    
    // Only setup Firebase after initialization is complete
    if (isInitialized) {
      setupFirebaseAuth();
    }
    
    return () => {
      isMounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [isInitialized, user]);

  const createNewUser = useCallback(async (email: string, role: UserRole): Promise<Driver | Shipper | Admin> => {
    await ensureFirebaseAuth();
    const uid = auth?.currentUser?.uid ?? `local-${Date.now()}`;
    
    if (role === 'admin') {
      return {
        id: uid,
        role: 'admin',
        email,
        name: email === 'admin@loadrush.com' ? 'LoadRush Admin' : 'Admin User',
        phone: '',
        membershipTier: 'enterprise',
        createdAt: new Date(),
        permissions: ['analytics', 'user_management', 'load_management', 'system_admin'],
        lastLoginAt: new Date(),
      } as Admin;
    } else if (role === 'shipper') {
      return {
        id: uid,
        role: 'shipper',
        email,
        name: email === 'guest@example.com' ? 'Guest Shipper' : 'Test Shipper',
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
    } else {
      return {
        id: uid,
        role: 'driver',
        email,
        name: email === 'guest@example.com' ? 'Guest Driver' : 'Test Driver',
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
        isAvailable: true,
        verificationStatus: 'verified',
      } as Driver;
    }
  }, []);

  const login = useCallback(async (email: string, password: string, role: UserRole = 'driver') => {
    console.log('[auth] ✅ Auth optimized - Login attempt for', email, 'as', role);
    
    // Enhanced input validation with user-friendly messages
    if (!email || !password) {
      const error = new Error('Email and password are required');
      console.error('[auth] ❌ Auth optimization - Login failed: missing credentials');
      throw error;
    }
    
    // Enhanced email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email !== 'guest@example.com' && !emailRegex.test(email.trim())) {
      const error = new Error('Please enter a valid email address.');
      console.error('[auth] ❌ Auth optimization - Login failed: invalid email format');
      throw error;
    }
    
    try {
      // FIXED: Enhanced Firebase auth integration with proper error handling
      console.log('[auth] Auth optimized - Ensuring Firebase authentication...');
      const firebaseAuthSuccess = await ensureFirebaseAuth();
      if (!firebaseAuthSuccess) {
        console.warn('[auth] ⚠️ Firebase authentication failed, but continuing with local auth');
      } else {
        console.log('[auth] ✅ Firebase authentication successful');
      }
      
      // Check if this is an admin login
      const isAdminLogin = email === 'admin@loadrush.com' || role === 'admin';
      const finalRole = isAdminLogin ? 'admin' : role;
      
      // Enhanced caching logic with better error handling
      const cached = await AsyncStorage.getItem(USER_STORAGE_KEY);
      let mockUser: Driver | Shipper | Admin;
      
      if (cached) {
        try {
          const cachedUser = JSON.parse(cached);
          if (cachedUser.email === email && cachedUser.role === finalRole) {
            console.log('[auth] ✅ Auth optimized - Using cached user data for', email);
            mockUser = cachedUser;
          } else {
            console.log('[auth] Auth optimized - Cached user mismatch, creating new user');
            mockUser = await createNewUser(email, finalRole as UserRole);
          }
        } catch (parseError) {
          console.warn('[auth] ⚠️ Auth optimization - Cached data corrupted, creating new user');
          mockUser = await createNewUser(email, finalRole as UserRole);
        }
      } else {
        console.log('[auth] Auth optimized - No cached data, creating new user');
        mockUser = await createNewUser(email, finalRole as UserRole);
      }
      
      setUser(mockUser);
      setUserId(mockUser.id);
      setIsAnonymous(email === 'guest@example.com');
      setHasSignedInThisSession(true);
      
      // Enhanced storage with error handling
      try {
        await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(mockUser));
        console.log('[auth] ✅ Auth optimized - User data cached successfully');
      } catch (storageError) {
        console.warn('[auth] ⚠️ Auth optimization - Failed to cache user data:', storageError);
      }
      
      console.log('[auth] ✅ Auth optimized - Login successful as', finalRole);
      console.log('[auth] ✅ Auth optimized - Sign in successful');
    } catch (error: any) {
      console.error('[auth] ❌ Auth optimization - Login failed:', error?.message || error);
      throw error;
    }
  }, [createNewUser]);

  const register = useCallback(async (email: string, password: string, role: UserRole, profile?: Partial<Driver | Shipper | Admin>) => {
    console.log('[auth] register attempt for', email, 'as', role);
    await ensureFirebaseAuth();
    const uid = auth?.currentUser?.uid ?? `local-${Date.now()}`;
    
    let mockUser: Driver | Shipper | Admin;
    
    if (role === 'shipper') {
      mockUser = {
        id: uid,
        role: 'shipper',
        email,
        name: profile?.name ?? 'New Shipper',
        phone: profile?.phone ?? '',
        membershipTier: 'basic',
        createdAt: new Date(),
        companyName: (profile as Partial<Shipper>)?.companyName ?? 'New Company',
        verificationStatus: 'unverified',
        totalLoadsPosted: 0,
        activeLoads: 0,
        completedLoads: 0,
        totalRevenue: 0,
        avgRating: 0,
      } as Shipper;
    } else {
      mockUser = {
        id: uid,
        role: 'driver',
        email,
        name: profile?.name ?? 'New Driver',
        phone: profile?.phone ?? '',
        membershipTier: 'basic',
        createdAt: new Date(),
        cdlNumber: '',
        vehicleTypes: [],
        rating: 0,
        completedLoads: 0,
        documents: [],
        wallet: {
          balance: 0,
          pendingEarnings: 0,
          totalEarnings: 0,
          transactions: [],
        },
        isAvailable: true,
        verificationStatus: 'unverified',
        company: profile?.company ?? '',
      } as Driver;
    }

    setUser(mockUser);
    setIsAnonymous(false);
    setHasSignedInThisSession(true);
    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(mockUser));
    console.log('[auth] registration successful as', role);
  }, []);

  const logout = useCallback(async () => {
    console.log('[auth] ✅ Auth optimized - Logging out user...');
    
    try {
      await AsyncStorage.removeItem(USER_STORAGE_KEY);
      console.log('[auth] ✅ Auth optimized - User data cleared from storage');
    } catch (storageError) {
      console.warn('[auth] ⚠️ Auth optimization - Failed to clear storage:', storageError);
    }
    
    setUser(null);
    setIsAnonymous(true);
    setHasSignedInThisSession(false);
    console.log('[auth] ✅ Auth optimized - Logout successful');
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    console.log('Password reset requested for:', email);
  }, []);

  const updateProfile = useCallback(async (updates: Partial<Driver | Shipper | Admin>) => {
    if (!user) {
      console.log('[auth] ⚠️ Auth optimization - updateProfile called but no user found');
      return;
    }
    
    console.log('[auth] ✅ Auth optimized - updateProfile called with updates:', JSON.stringify(updates, null, 2));
    const updated = { ...user, ...updates } as Driver | Shipper | Admin;
    console.log('[auth] Auth optimized - updated user object:', JSON.stringify(updated, null, 2));
    
    setUser(updated);
    
    // Enhanced local storage with error handling
    try {
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updated));
      console.log('[auth] ✅ Auth optimized - Profile saved to AsyncStorage');
    } catch (storageError) {
      console.warn('[auth] ⚠️ Auth optimization - Failed to save profile locally:', storageError);
    }

    // Enhanced Firestore integration with better error handling
    try {
      console.log('[auth] Auth optimized - Syncing profile to Firestore...');
      await ensureFirebaseAuth();
      
      if (auth?.currentUser?.uid) {
        const uid = auth.currentUser.uid;
        const collection = user.role === 'driver' ? 'drivers' : 'shippers';
        const ref = doc(db, collection, uid);
        
        const payload: Record<string, unknown> = {
          displayName: updated.name ?? '',
          email: updated.email ?? '',
          phone: (updated as any).phone ?? null,
          company: (updated as any).company ?? null,
          role: updated.role,
          primaryVehicle: (updates as any).primaryVehicle ?? (updated as any).primaryVehicle ?? null,
          vehicleMake: (updates as any).vehicleMake ?? (updated as any).vehicleMake ?? null,
          vehicleModel: (updates as any).vehicleModel ?? (updated as any).vehicleModel ?? null,
          vehicleYear: (updates as any).vehicleYear ?? (updated as any).vehicleYear ?? null,
          fuelType: (updates as any).fuelType ?? (updated as any).fuelType ?? null,
          mpgRated: (updates as any).mpgRated ?? (updated as any).mpgRated ?? null,
          vin: (updates as any).vin ?? (updated as any).vin ?? null,
          plate: (updates as any).plate ?? (updated as any).plate ?? null,
          tankGallons: (updates as any).tankGallons ?? ((updated as any).tankGallons ?? null),
          gvwrLbs: (updates as any).gvwrLbs ?? ((updated as any).gvwrLbs ?? null),
          trailerMake: (updates as any).trailerMake ?? (updated as any).trailerMake ?? null,
          trailerModel: (updates as any).trailerModel ?? (updated as any).trailerModel ?? null,
          trailerYear: (updates as any).trailerYear ?? (updated as any).trailerYear ?? null,
          trailerVin: (updates as any).trailerVin ?? (updated as any).trailerVin ?? null,
          trailerPlate: (updates as any).trailerPlate ?? (updated as any).trailerPlate ?? null,
          trailerInsuranceCarrier: (updates as any).trailerInsuranceCarrier ?? (updated as any).trailerInsuranceCarrier ?? null,
          trailerPolicyNumber: (updates as any).trailerPolicyNumber ?? (updated as any).trailerPolicyNumber ?? null,
          trailerGvwrLbs: (updates as any).trailerGvwrLbs ?? (updated as any).trailerGvwrLbs ?? null,
          trailerType: (updates as any).trailerType ?? (updated as any).trailerType ?? null,
          vehicleSubtype: (updates as any).vehicleSubtype ?? (updated as any).vehicleSubtype ?? null,
          companyName: (updates as any).companyName ?? (updated as any).companyName ?? null,
          mcNumber: (updates as any).mcNumber ?? (updated as any).mcNumber ?? null,
          dotNumber: (updates as any).dotNumber ?? (updated as any).dotNumber ?? null,
          insuranceCarrier: (updates as any).insuranceCarrier ?? (updated as any).insuranceCarrier ?? null,
          policyNumber: (updates as any).policyNumber ?? (updated as any).policyNumber ?? null,
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        };
        
        await setDoc(ref, payload, { merge: true });
        console.log(`[auth] ✅ Auth optimized - ${user.role} profile persisted to Firestore`);
      } else {
        console.log('[auth] ⚠️ Auth optimization - No Firebase UID, skipped Firestore sync');
      }
    } catch (err: any) {
      console.warn('[auth] ⚠️ Auth optimization - Firestore sync failed, profile cached locally only:', err?.message || err);
    }
  }, [user]);



  // Always compute the same value structure to maintain consistency
  const value = useMemo(() => {
    const result: AuthState = {
      user,
      userId,
      isLoading,
      isAuthenticated: !!user && !isAnonymous && hasSignedInThisSession,
      isFirebaseAuthenticated,
      hasSignedInThisSession,
      login,
      register,
      resetPassword,
      logout,
      updateProfile,
    };
    return result;
  }, [user, userId, isLoading, isFirebaseAuthenticated, isAnonymous, hasSignedInThisSession, login, register, resetPassword, logout, updateProfile]);

  return value;
});