import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Driver, Shipper, Admin, UserRole } from '@/types';
import { auth, ensureFirebaseAuth, db } from '@/utils/firebase';
import { onAuthStateChanged } from 'firebase/auth';

import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ENABLE_LOAD_ANALYTICS } from '@/src/config/runtime';

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
  
  console.log('[useAuth] 🎯 PERMANENT SIGN IN FIX - Hook called with enhanced error handling and consistent hook order');
  
  // PERMANENT FIX: Add comprehensive error tracking and recovery
  const [initError, setInitError] = useState<string | null>(null);
  const [retryAttempts, setRetryAttempts] = useState<number>(0);
  const [lastSuccessfulAuth, setLastSuccessfulAuth] = useState<Date | null>(null);

  // Enhanced auth initialization with error recovery
  useEffect(() => {
    const initAuth = async () => {
      try {
        console.log('[auth] 🎯 PERMANENT SIGN IN FIX - Starting auth initialization, attempt:', retryAttempts + 1);
        
        const cached = await AsyncStorage.getItem(USER_STORAGE_KEY);
        if (cached) {
          try {
            const cachedUser = JSON.parse(cached);
            
            // Validate cached user structure
            if (!cachedUser.id || !cachedUser.role || !cachedUser.email) {
              console.warn('[auth] 🎯 PERMANENT SIGN IN FIX - Invalid cached user structure, clearing cache');
              await AsyncStorage.removeItem(USER_STORAGE_KEY);
              throw new Error('Invalid cached user data');
            }
            
            // Migration: Add fuelProfile to existing drivers if missing
            if (cachedUser.role === 'driver' && !cachedUser.fuelProfile) {
              cachedUser.fuelProfile = {
                vehicleType: 'truck',
                averageMpg: 8.5,
                fuelPricePerGallon: 3.85,
                fuelType: 'diesel',
                tankCapacity: 150,
              };
              // Save the migrated user back to storage
              await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(cachedUser));
              console.log('[auth] ✅ PERMANENT SIGN IN FIX - Migrated existing driver with fuel profile');
            }
            
            setUser(cachedUser);
            setUserId(cachedUser.id);
            setIsAnonymous(cachedUser.email === 'guest@example.com');
            setHasSignedInThisSession(false);
            setLastSuccessfulAuth(new Date());
            setInitError(null);
            
            console.log('[auth] ✅ PERMANENT SIGN IN FIX - Successfully loaded cached user:', {
              role: cachedUser.role,
              email: cachedUser.email,
              isAnonymous: cachedUser.email === 'guest@example.com'
            });
          } catch (parseError) {
            console.error('[auth] 🎯 PERMANENT SIGN IN FIX - Failed to parse cached user, clearing cache:', parseError);
            await AsyncStorage.removeItem(USER_STORAGE_KEY);
            setInitError('Corrupted user data cleared');
          }
        } else {
          console.log('[auth] 🎯 PERMANENT SIGN IN FIX - No cached user found, user needs to sign in');
        }
      } catch (error: any) {
        console.error('[auth] 🎯 PERMANENT SIGN IN FIX - Auth initialization error:', error);
        setInitError(error?.message || 'Unknown initialization error');
        
        // Retry logic for critical failures
        if (retryAttempts < 3) {
          console.log('[auth] 🎯 PERMANENT SIGN IN FIX - Retrying initialization in 2 seconds...');
          setTimeout(() => {
            setRetryAttempts(prev => prev + 1);
          }, 2000);
          return; // Don't set loading to false yet
        }
      } finally {
        setIsLoading(false);
        setIsInitialized(true);
        console.log('[auth] 🎯 PERMANENT SIGN IN FIX - Auth initialization completed');
      }
    };
    
    initAuth();
  }, [retryAttempts]);

  // Firebase setup
  useEffect(() => {
    if (!isInitialized) return;
    
    const setupFirebase = async () => {
      try {
        const success = await ensureFirebaseAuth();
        setIsFirebaseAuthenticated(success);
      } catch (error) {
        setIsFirebaseAuthenticated(false);
      }
    };
    
    setupFirebase();
  }, [isInitialized]);

  // Analytics initialization for drivers - INSTANT ACTIVATION
  useEffect(() => {
    if (!ENABLE_LOAD_ANALYTICS || !user || user.role !== 'driver') return;
    
    console.log('[auth] 🔥 LIVE ANALYTICS ACTIVATED - Driver signed in:', user.name);
    
    // Initialize analytics tracking IMMEDIATELY
    const initAnalytics = async () => {
      try {
        // Log analytics initialization with full driver profile
        console.log('[auth] ⚡ INSTANT ANALYTICS READY:', {
          userId: user.id,
          name: user.name,
          fuelProfile: user.fuelProfile,
          vehicleType: user.fuelProfile?.vehicleType,
          averageMpg: user.fuelProfile?.averageMpg,
          fuelType: user.fuelProfile?.fuelType,
          tankCapacity: user.fuelProfile?.tankCapacity,
          hasSignedInThisSession,
          analyticsReady: true
        });
        
        // Store analytics initialization timestamp with enhanced data
        const analyticsData = {
          lastInitialized: new Date().toISOString(),
          userId: user.id,
          userRole: user.role,
          userName: user.name,
          fuelProfileComplete: !!(user.fuelProfile?.averageMpg && user.fuelProfile?.fuelType),
          vehicleConfigured: !!user.fuelProfile?.vehicleType,
          analyticsEnabled: true,
          sessionId: `session-${Date.now()}`,
          capabilities: {
            fuelCalculation: true,
            distanceCalculation: true,
            etaCalculation: true,
            profitAnalysis: true
          }
        };
        
        await AsyncStorage.setItem('analytics:initialized', JSON.stringify(analyticsData));
        await AsyncStorage.setItem('analytics:driver-profile', JSON.stringify(user.fuelProfile));
        
        console.log('[auth] ✅ ANALYTICS FULLY INITIALIZED - Ready for load calculations');
        console.log('[auth] 🎯 Driver can now see live analytics on all loads instantly!');
        
      } catch (error) {
        console.warn('[auth] ⚠️ Analytics initialization failed:', error);
      }
    };
    
    // Run immediately - no delays
    initAnalytics();
  }, [user, hasSignedInThisSession]);

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
  }, []);

  const login = useCallback(async (email: string, password: string, role: UserRole = 'driver') => {
    console.log('[auth] 🎯 PERMANENT SIGN IN FIX - Login attempt for', email, 'as', role);
    
    // Enhanced input validation with user-friendly messages
    if (!email || !password) {
      const error = new Error('Email and password are required');
      console.error('[auth] ❌ Auth optimization - Login failed: missing credentials');
      throw error;
    }
    
    // Enhanced email validation with better error messages
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const trimmedEmail = email.trim();
    
    if (trimmedEmail !== 'guest@example.com' && !emailRegex.test(trimmedEmail)) {
      console.error('[auth] ❌ Invalid email format:', trimmedEmail);
      console.error('[auth] Email must contain @ symbol and domain with dot (e.g., user@domain.com)');
      
      // Provide specific feedback based on common issues
      let errorMessage = 'Please enter a valid email address.';
      if (!trimmedEmail.includes('@')) {
        errorMessage = 'Email must contain @ symbol (e.g., user@domain.com)';
      } else if (!trimmedEmail.includes('.')) {
        errorMessage = 'Email domain must contain a dot (e.g., user@domain.com)';
      } else if (trimmedEmail.endsWith('@')) {
        errorMessage = 'Email must have a domain after @ (e.g., user@domain.com)';
      } else if (trimmedEmail.startsWith('@')) {
        errorMessage = 'Email must have a username before @ (e.g., user@domain.com)';
      }
      
      const error = new Error(errorMessage);
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
      
      setLastSuccessfulAuth(new Date());
      setInitError(null);
      setRetryAttempts(0);
      
      console.log('[auth] ✅ PERMANENT SIGN IN FIX - Login successful as', finalRole);
      console.log('[auth] 🎯 PERMANENT SIGN IN FIX - Loading complete - Advancing to startup');
      
      // INSTANT ANALYTICS ACTIVATION for drivers
      if (finalRole === 'driver') {
        console.log('[auth] 🔥 DRIVER LOGIN DETECTED - Analytics will activate instantly!');
        console.log('[auth] ⚡ Live analytics will show on all load cards immediately');
      }
    } catch (error: any) {
      console.error('[auth] ❌ PERMANENT SIGN IN FIX - Login failed:', error?.message || error);
      setInitError(error?.message || 'Login failed');
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
        fuelProfile: {
          vehicleType: 'truck',
          averageMpg: 8.5,
          fuelPricePerGallon: 3.85,
          fuelType: 'diesel',
          tankCapacity: 150,
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
    console.log('[auth] 🎯 PERMANENT SIGN IN FIX - Logging out user...');
    
    try {
      await AsyncStorage.removeItem(USER_STORAGE_KEY);
      console.log('[auth] ✅ Auth optimized - User data cleared from storage');
    } catch (storageError) {
      console.warn('[auth] ⚠️ Auth optimization - Failed to clear storage:', storageError);
    }
    
    setUser(null);
    setUserId(null);
    setIsAnonymous(true);
    setHasSignedInThisSession(false);
    setLastSuccessfulAuth(null);
    setInitError(null);
    setRetryAttempts(0);
    console.log('[auth] ✅ PERMANENT SIGN IN FIX - Logout successful');
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
          // Basic Driver Profile Fields
          truckType: (updates as any).truckType ?? (updated as any).truckType ?? null,
          tankSize: (updates as any).tankSize ?? (updated as any).tankSize ?? null,
          fuelTypePreference: (updates as any).fuelTypePreference ?? (updated as any).fuelTypePreference ?? null,
          yearsExperience: (updates as any).yearsExperience ?? (updated as any).yearsExperience ?? null,
          safetyCertifications: (updates as any).safetyCertifications ?? (updated as any).safetyCertifications ?? null,
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
      // PERMANENT FIX: Keep drivers authenticated indefinitely while browsing loads
      isAuthenticated: !!user, // Removed hasSignedInThisSession requirement
      isFirebaseAuthenticated,
      hasSignedInThisSession,
      login,
      register,
      resetPassword,
      logout,
      updateProfile,
    };
    console.log('[useAuth] 🎯 PERMANENT SIGN IN FIX - Auth state computed:', {
      hasUser: !!user,
      userRole: user?.role,
      isAnonymous,
      hasSignedInThisSession,
      isAuthenticated: result.isAuthenticated,
      isLoading,
      initError,
      retryAttempts,
      lastSuccessfulAuth: lastSuccessfulAuth?.toISOString(),
      isInitialized
    });
    return result;
  }, [user, userId, isLoading, isFirebaseAuthenticated, isAnonymous, hasSignedInThisSession, login, register, resetPassword, logout, updateProfile, initError, retryAttempts, lastSuccessfulAuth, isInitialized]);

  return value;
});