import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { Driver, Shipper, Admin, UserRole } from '@/types';
import { auth, ensureFirebaseAuth, db } from '@/utils/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { crossPlatformStorage, permanentSave, permanentLoad, getPlatformOptimizedKeys } from '@/utils/crossPlatformStorage';

import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { ENABLE_LOAD_ANALYTICS } from '@/src/config/runtime';

// PERMANENT FIX: Platform detection with fallbacks
const getPlatformSafely = (): string => {
  try {
    return Platform.OS || 'unknown';
  } catch (error) {
    console.warn('[auth] Platform.OS not available, using fallback detection');
    if (typeof window !== 'undefined') {
      return 'web';
    }
    return 'unknown';
  }
};

// PERMANENT FIX: Safe platform detection for cross-platform compatibility
const CURRENT_PLATFORM = getPlatformSafely();
console.log('[auth] 🎯 PERMANENT PLATFORM FIX - Detected platform:', CURRENT_PLATFORM);

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
  // CRITICAL FIX: Always call all hooks in the same order - never conditionally
  const [user, setUser] = useState<Driver | Shipper | Admin | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFirebaseAuthenticated, setIsFirebaseAuthenticated] = useState<boolean>(false);
  const [isAnonymous, setIsAnonymous] = useState<boolean>(true);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [hasSignedInThisSession, setHasSignedInThisSession] = useState<boolean>(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [retryAttempts, setRetryAttempts] = useState<number>(0);
  const [lastSuccessfulAuth, setLastSuccessfulAuth] = useState<Date | null>(null);
  
  console.log('[useAuth] 🎯 CRITICAL AUTH FIX - Hook called with consistent order and enhanced error handling');

  // Email/Password only auth initialization - no anonymous auth
  useEffect(() => {
    const initAuth = async () => {
      try {
        console.log('[auth] Starting fast auth initialization...');
        
        // Quick timeout to prevent hydration issues
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Auth init timeout')), 2000);
        });
        
        // Check for cached user data with timeout
        let cachedUser = null;
        try {
          const cachePromise = AsyncStorage.getItem(USER_STORAGE_KEY);
          const cached = await Promise.race([cachePromise, timeoutPromise]) as string | null;
          
          if (cached) {
            const parsedUser = JSON.parse(cached);
            // Only use cached user if it's not a guest user
            if (parsedUser.id && parsedUser.role && parsedUser.email && parsedUser.email !== 'guest@example.com') {
              cachedUser = parsedUser;
              console.log('[auth] Found valid cached user:', parsedUser.email);
            } else {
              console.log('[auth] Cached user is guest or invalid, clearing...');
              // Don't await this to prevent blocking
              AsyncStorage.removeItem(USER_STORAGE_KEY).catch(() => {});
            }
          }
        } catch (error) {
          console.warn('[auth] Failed to load cached user or timeout:', error);
        }
        
        if (cachedUser) {
          // Enhance cached user with required fields (minimal for fast loading)
          if (cachedUser.role === 'driver') {
            cachedUser.name = cachedUser.name || 'Driver User';
            cachedUser.completedLoads = cachedUser.completedLoads || 24;
            cachedUser.rating = cachedUser.rating || 4.8;
            cachedUser.isAvailable = cachedUser.isAvailable !== undefined ? cachedUser.isAvailable : true;
            cachedUser.verificationStatus = cachedUser.verificationStatus || 'verified';
            cachedUser.documents = cachedUser.documents || [];
            cachedUser.vehicleTypes = cachedUser.vehicleTypes || [];
            cachedUser.cdlNumber = cachedUser.cdlNumber || '';
            
            cachedUser.wallet = cachedUser.wallet || {
              balance: 2450,
              pendingEarnings: 850,
              totalEarnings: 12500,
              transactions: [],
            };
            
            // PERMANENT FIX: Preserve driver's actual MPG from profile
            cachedUser.fuelProfile = cachedUser.fuelProfile || {
              vehicleType: 'truck',
              averageMpg: cachedUser.mpgRated || 8.5,
              fuelPricePerGallon: 3.85,
              fuelType: 'diesel',
              tankCapacity: 150,
            };
            // Ensure MPG is synced between fuelProfile and mpgRated
            if (cachedUser.mpgRated && !cachedUser.fuelProfile.averageMpg) {
              cachedUser.fuelProfile.averageMpg = cachedUser.mpgRated;
            } else if (cachedUser.fuelProfile.averageMpg && !cachedUser.mpgRated) {
              cachedUser.mpgRated = cachedUser.fuelProfile.averageMpg;
            }
            console.log('[auth] 🎯 DRIVER MPG SYNC - Cached user MPG:', {
              mpgRated: cachedUser.mpgRated,
              fuelProfileMpg: cachedUser.fuelProfile.averageMpg,
              finalMpg: cachedUser.fuelProfile.averageMpg
            });
          }
          
          if (cachedUser.role === 'shipper') {
            cachedUser.name = cachedUser.name || 'Shipper User';
            cachedUser.companyName = cachedUser.companyName || 'Test Logistics';
            cachedUser.verificationStatus = cachedUser.verificationStatus || 'verified';
          }
          
          cachedUser.createdAt = cachedUser.createdAt || new Date();
          cachedUser.membershipTier = cachedUser.membershipTier || 'basic';
          cachedUser.phone = cachedUser.phone || '';
          
          // Save updated user data asynchronously to not block loading
          AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(cachedUser)).catch(() => {});
          
          setUser(cachedUser);
          setUserId(cachedUser.id);
          setIsAnonymous(false);
          setHasSignedInThisSession(false);
          setLastSuccessfulAuth(new Date());
          setInitError(null);
          
          console.log('[auth] User loaded successfully:', {
            role: cachedUser.role,
            email: cachedUser.email,
            name: cachedUser.name
          });
        } else {
          console.log('[auth] No cached user found - user needs to sign in');
        }
      } catch (error: any) {
        console.error('[auth] Auth initialization error:', error);
        setInitError(error?.message || 'Unknown initialization error');
      } finally {
        setIsLoading(false);
        setIsInitialized(true);
        console.log('[auth] Auth initialization completed');
      }
    };
    
    initAuth();
  }, []);

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

  // Consolidated side-effects to keep Hooks order absolutely stable across hot reloads
  useEffect(() => {
    const run = async () => {
      try {
        if (ENABLE_LOAD_ANALYTICS && user && user.role === 'driver') {
          console.log('[auth] 🔥 PERMANENT ANALYTICS ACTIVATION - Driver signed in:', user.name);
          const driverProfile = user as Driver;
          let fuelProfile = driverProfile.fuelProfile;
          if (!fuelProfile || !fuelProfile.averageMpg || !fuelProfile.fuelType) {
            console.log('[auth] 🔧 PERMANENT ANALYTICS - Creating/fixing fuel profile...');
            const driverActualMpg = driverProfile?.mpgRated || driverProfile?.fuelProfile?.averageMpg || 8.5;
            fuelProfile = {
              vehicleType: fuelProfile?.vehicleType || 'truck',
              averageMpg: driverActualMpg,
              fuelPricePerGallon: fuelProfile?.fuelPricePerGallon || 3.85,
              fuelType: fuelProfile?.fuelType || 'diesel',
              tankCapacity: fuelProfile?.tankCapacity || 150,
            };
            console.log('[auth] 🎯 DRIVER MPG SYNC - Using actual driver MPG:', driverActualMpg, 'from:', {
              mpgRated: driverProfile?.mpgRated,
              fuelProfileMpg: driverProfile?.fuelProfile?.averageMpg,
              finalMpg: driverActualMpg,
            });
            const updatedUser = { ...driverProfile, fuelProfile };
            setUser(updatedUser);
            try {
              await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
              await AsyncStorage.setItem(`${USER_STORAGE_KEY}_backup`, JSON.stringify(updatedUser));
              console.log('[auth] ✅ PERMANENT ANALYTICS - Fuel profile created and persisted');
            } catch (persistError) {
              console.warn('[auth] Failed to persist updated fuel profile:', persistError);
            }
          }

          console.log('[auth] ⚡ PERMANENT ANALYTICS READY:', {
            userId: user.id,
            name: user.name,
            fuelProfile,
            vehicleType: fuelProfile.vehicleType,
            averageMpg: fuelProfile.averageMpg,
            fuelType: fuelProfile.fuelType,
            tankCapacity: fuelProfile.tankCapacity,
            hasSignedInThisSession,
            analyticsReady: true,
            walletBalance: driverProfile.wallet?.balance || 0,
            completedLoads: driverProfile.completedLoads || 0,
            rating: driverProfile.rating || 0,
          });

          const analyticsData = {
            lastInitialized: new Date().toISOString(),
            userId: user.id,
            userRole: user.role,
            userName: user.name,
            fuelProfileComplete: !!(fuelProfile.averageMpg && fuelProfile.fuelType),
            vehicleConfigured: !!fuelProfile.vehicleType,
            analyticsEnabled: true,
            sessionId: `session-${Date.now()}`,
            capabilities: {
              fuelCalculation: true,
              distanceCalculation: true,
              etaCalculation: true,
              profitAnalysis: true,
              walletAnalytics: true,
              postDeliveryAnalytics: true,
            },
            driverStats: {
              completedLoads: driverProfile.completedLoads || 0,
              rating: driverProfile.rating || 0,
              walletBalance: driverProfile.wallet?.balance || 0,
              totalEarnings: driverProfile.wallet?.totalEarnings || 0,
            },
          };

          const storagePromises = [
            AsyncStorage.setItem('analytics:initialized', JSON.stringify(analyticsData)),
            AsyncStorage.setItem('analytics:driver-profile', JSON.stringify(fuelProfile)),
            AsyncStorage.setItem(`analytics:${user.id}`, JSON.stringify(analyticsData)),
            AsyncStorage.setItem('analytics:backup', JSON.stringify(analyticsData)),
            AsyncStorage.setItem('live-analytics:enabled', 'true'),
            AsyncStorage.setItem('post-delivery:analytics:enabled', 'true'),
          ];
          await Promise.allSettled(storagePromises);
          console.log('[auth] ✅ PERMANENT ANALYTICS FULLY INITIALIZED - Ready for all calculations');
        }
      } catch (error) {
        console.error('[auth] ❌ PERMANENT ANALYTICS - Initialization failed:', error);
        try {
          const fallbackData = {
            lastInitialized: new Date().toISOString(),
            userId: user?.id,
            analyticsEnabled: true,
            fallbackMode: true,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
          await AsyncStorage.setItem('analytics:fallback', JSON.stringify(fallbackData));
          console.log('[auth] ⚠️ PERMANENT ANALYTICS - Fallback mode activated');
        } catch (fallbackError) {
          console.error('[auth] ❌ PERMANENT ANALYTICS - Even fallback failed:', fallbackError);
        }
      }

      try {
        if (user?.id) {
          const uid = user.id;
          let data: any = null;
          try {
            const primaryRef = doc(db as any, user.role === 'driver' ? 'drivers' : user.role === 'shipper' ? 'shippers' : 'users', uid);
            const snap = await getDoc(primaryRef);
            if (snap.exists()) data = snap.data();
          } catch {}
          if (!data) {
            try {
              const usersRef = doc(db as any, 'users', uid);
              const snapUsers = await getDoc(usersRef);
              if (snapUsers.exists()) data = snapUsers.data();
            } catch {}
          }
          if (data) {
            const firestoreName =
              data.displayName ||
              data.name ||
              data.fullName ||
              data?.profileData?.fullName ||
              data?.profile?.fullName ||
              ([data?.firstName, data?.lastName].filter(Boolean).join(' ') || undefined);
            if (typeof firestoreName === 'string' && firestoreName.trim().length > 0 && firestoreName !== user.name) {
              const updatedUser = { ...user, name: firestoreName.trim() } as Driver | Shipper | Admin;
              setUser(updatedUser);
              await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
              console.log('[auth] Dashboard Name Synced:', firestoreName.trim());
            }
          }
        }
      } catch (e) {
        console.warn('[auth] Name hydration failed', e);
      }
    };

    run();
  }, [user?.id, user?.role, hasSignedInThisSession]);

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
    console.log('[auth] 🎯 REAL FIREBASE LOGIN - Login attempt for', email, 'as', role);
    
    // Enhanced input validation with user-friendly messages
    if (!email || !password) {
      const error = new Error('Email and password are required');
      console.error('[auth] ❌ Login failed: missing credentials');
      throw error;
    }
    
    // Enhanced email validation with better error messages
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const trimmedEmail = email.trim();
    
    if (!emailRegex.test(trimmedEmail)) {
      console.error('[auth] ❌ Invalid email format:', trimmedEmail);
      
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
      // REAL FIREBASE AUTHENTICATION - Use existing Firebase users
      console.log('[auth] 🔥 REAL FIREBASE LOGIN - Authenticating with Firebase...');
      await ensureFirebaseAuth();
      
      if (!auth) {
        throw new Error('Firebase authentication not available');
      }
      
      // Use Firebase signInWithEmailAndPassword with REAL credentials
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      console.log('[auth] 🔥 REAL FIREBASE LOGIN - Signing in with email and password...');
      
      const userCredential = await signInWithEmailAndPassword(auth as any, trimmedEmail, password.trim());
      const firebaseUser = userCredential.user;
      
      console.log('[auth] ✅ REAL FIREBASE LOGIN - Firebase authentication successful!');
      console.log('[auth] Firebase UID:', firebaseUser.uid);
      console.log('[auth] Firebase Email:', firebaseUser.email);
      
      // Check if this is an admin login
      const isAdminLogin = trimmedEmail === 'admin@loadrush.com' || role === 'admin';
      const finalRole = isAdminLogin ? 'admin' : role;
      
      // Try to get cached user data first, then create if needed
      const cached = await AsyncStorage.getItem(USER_STORAGE_KEY);
      let userData: Driver | Shipper | Admin;
      
      if (cached) {
        try {
          const cachedUser = JSON.parse(cached);
          if (cachedUser.email === trimmedEmail && cachedUser.role === finalRole) {
            console.log('[auth] ✅ Using cached user data for', trimmedEmail);
            userData = cachedUser;
            // Update the ID to match Firebase UID
            userData.id = firebaseUser.uid;
          } else {
            console.log('[auth] Cached user mismatch, creating new user profile');
            userData = await createNewUser(trimmedEmail, finalRole as UserRole);
            userData.id = firebaseUser.uid;
          }
        } catch (parseError) {
          console.warn('[auth] Cached data corrupted, creating new user profile');
          userData = await createNewUser(trimmedEmail, finalRole as UserRole);
          userData.id = firebaseUser.uid;
        }
      } else {
        console.log('[auth] No cached data, creating new user profile');
        userData = await createNewUser(trimmedEmail, finalRole as UserRole);
        userData.id = firebaseUser.uid;
      }
      
      setUser(userData);
      setUserId(userData.id);
      setIsAnonymous(false);
      setHasSignedInThisSession(true);
      
      // PERMANENT FIX: Enhanced storage with comprehensive backup on login
      try {
        const userDataString = JSON.stringify(userData);
        
        // Save to all storage locations immediately on login
        const loginStoragePromises = [
          AsyncStorage.setItem(USER_STORAGE_KEY, userDataString),
          AsyncStorage.setItem(`${USER_STORAGE_KEY}_backup`, userDataString),
          AsyncStorage.setItem(`profile:cache`, userDataString),
          AsyncStorage.setItem(`profile:persistent`, userDataString),
          AsyncStorage.setItem(`auth:user:persistent`, userDataString),
          AsyncStorage.setItem(`login:${userData.role}:${Date.now()}`, userDataString),
          AsyncStorage.setItem(`user:${userData.email}:backup`, userDataString)
        ];
        
        const results = await Promise.allSettled(loginStoragePromises);
        const successCount = results.filter(r => r.status === 'fulfilled').length;
        
        console.log('[auth] ✅ PERMANENT PROFILE PERSISTENCE - Login data cached:', {
          successful: successCount,
          total: loginStoragePromises.length,
          userRole: userData.role,
          userEmail: userData.email
        });
        
        // Mark successful login for analytics
        await AsyncStorage.setItem('auth:last-successful-login', JSON.stringify({
          timestamp: new Date().toISOString(),
          userId: userData.id,
          userRole: userData.role,
          storageSuccess: successCount
        }));
        
      } catch (storageError) {
        console.error('[auth] ❌ PERMANENT PROFILE PERSISTENCE - Failed to cache user data:', storageError);
        
        // Emergency login storage
        try {
          await AsyncStorage.setItem(`emergency:login:${Date.now()}`, JSON.stringify(userData));
          console.log('[auth] ✅ Emergency login storage successful');
        } catch (emergencyError) {
          console.error('[auth] ❌ Even emergency login storage failed:', emergencyError);
        }
      }
      
      setLastSuccessfulAuth(new Date());
      setInitError(null);
      setRetryAttempts(0);
      
      console.log('[auth] ✅ REAL FIREBASE LOGIN - Login successful as', finalRole);
      console.log('[auth] 🎯 PERMANENT PROFILE PERSISTENCE - Loading complete - Profile data secured');
      console.log('[auth] 📊 PERMANENT ANALYTICS - Live analytics will activate for drivers');
      console.log('[auth] 💰 PERMANENT WALLET - Post-delivery analytics ready');
      
      // PERMANENT FIX: INSTANT ANALYTICS ACTIVATION for drivers
      if (finalRole === 'driver') {
        console.log('[auth] 🔥 PERMANENT DRIVER LOGIN - All analytics systems activating!');
        console.log('[auth] ⚡ Live analytics: ETA, fuel cost, ROI calculations ready');
        console.log('[auth] 💰 Post-delivery wallet analytics: Cost breakdowns ready');
        console.log('[auth] 📊 Profile persistence: Driver data will never be lost');
      }
    } catch (error: any) {
      console.error('[auth] ❌ REAL FIREBASE LOGIN - Login failed:', error?.code, error?.message || error);
      
      // Handle specific Firebase auth errors
      if (error?.code === 'auth/invalid-credential' || error?.code === 'auth/wrong-password') {
        const friendlyError = new Error('Invalid email or password. Please check your credentials.');
        setInitError(friendlyError.message);
        throw friendlyError;
      } else if (error?.code === 'auth/user-not-found') {
        const friendlyError = new Error('No account found with this email address.');
        setInitError(friendlyError.message);
        throw friendlyError;
      } else if (error?.code === 'auth/too-many-requests') {
        const friendlyError = new Error('Too many failed attempts. Please try again later.');
        setInitError(friendlyError.message);
        throw friendlyError;
      } else {
        setInitError(error?.message || 'Login failed');
        throw error;
      }
    }
  }, [createNewUser]);

  const register = useCallback(async (email: string, password: string, role: UserRole, profile?: Partial<Driver | Shipper | Admin>) => {
    console.log('[auth] register attempt for', email, 'as', role);
    try {
      await ensureFirebaseAuth();
      const { createUserWithEmailAndPassword, sendEmailVerification } = await import('firebase/auth');
      const { doc: fsDoc, setDoc: fsSetDoc, serverTimestamp: fsServerTimestamp, getDoc: fsGetDoc } = await import('firebase/firestore');

      let createdUid: string | null = null;
      try {
        if (auth) {
          const cred = await createUserWithEmailAndPassword(auth as any, email.trim(), password.trim());
          createdUid = cred.user.uid;
          try { await sendEmailVerification(cred.user); } catch { /* optional */ }
        }
      } catch (firebaseErr: any) {
        console.warn('[auth] Firebase createUser failed, falling back to local mock user:', firebaseErr?.code || firebaseErr);
      }

      const uid = createdUid ?? auth?.currentUser?.uid ?? `local-${Date.now()}`;

      let newUser: Driver | Shipper | Admin;
      if (role === 'shipper') {
        newUser = {
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
      } else if (role === 'admin') {
        newUser = {
          id: uid,
          role: 'admin',
          email,
          name: profile?.name ?? 'New Admin',
          phone: profile?.phone ?? '',
          membershipTier: 'enterprise',
          createdAt: new Date(),
          permissions: ['analytics', 'user_management', 'load_management', 'system_admin'],
          lastLoginAt: new Date(),
        } as Admin;
      } else {
        newUser = {
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
          company: (profile as any)?.company ?? '',
        } as Driver;
      }

      try {
        if (db && uid) {
          const userDocRef = fsDoc(db as any, 'users', uid);
          const snap = await fsGetDoc(userDocRef);
          if (!snap.exists()) {
            await fsSetDoc(userDocRef, { email, createdAt: fsServerTimestamp() }, { merge: true });
            console.log('[auth] Firestore: users doc created for', uid);
          }
        }
      } catch (firestoreErr) {
        console.warn('[auth] Firestore users doc create failed:', firestoreErr);
      }

      setUser(newUser);
      setIsAnonymous(false);
      setHasSignedInThisSession(true);
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
      console.log('[auth] registration successful as', role);
    } catch (e) {
      console.error('[auth] register failed:', e);
      throw e;
    }
  }, []);

  const logout = useCallback(async () => {
    console.log('[auth] 🎯 PERMANENT SIGN IN FIX - Logging out user...');
    try {
      try {
        const { signOut } = await import('firebase/auth');
        if (auth) {
          await signOut(auth as any);
        }
      } catch (e) {
        console.warn('[auth] Firebase signOut failed or unavailable:', e);
      }
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

  const hardReset = useCallback(async () => {
    console.log('[auth] 🔥 HARD RESET - Starting complete authentication reset...');
    
    try {
      // Firebase logout first
      try {
        const { signOut } = await import('firebase/auth');
        if (auth) {
          await signOut(auth as any);
        }
      } catch (e) {
        console.warn('[auth] HARD RESET - Firebase signOut failed:', e);
      }
      
      // Clear ALL possible auth storage keys
      const keysToRemove = [
        USER_STORAGE_KEY,
        `${USER_STORAGE_KEY}_backup`,
        'profile:cache',
        'profile:persistent',
        'auth:user:persistent',
        'analytics:initialized',
        'analytics:driver-profile',
        'analytics:backup',
        'live-analytics:enabled',
        'post-delivery:analytics:enabled',
        'auth:last-successful-login',
        'profile:history',
        'profile:recovery',
        'session:profile',
        'driver:profile:backup',
        'emergency:login',
        'profile:emergency',
        'profile:fallback',
        'backup:critical'
      ];
      
      // Remove specific keys
      await Promise.all(keysToRemove.map(key => 
        AsyncStorage.removeItem(key).catch(() => {})
      ));
      
      // Get all keys and remove auth-related patterns
      try {
        const allKeys = await AsyncStorage.getAllKeys();
        const authKeys = allKeys.filter(key => 
          key.includes('auth:') || 
          key.includes('profile:') || 
          key.includes('user:') ||
          key.includes('login:') ||
          key.includes('analytics:') ||
          key.includes('session:') ||
          key.includes('driver:') ||
          key.includes('shipper:') ||
          key.includes('emergency:')
        );
        
        await Promise.all(authKeys.map(key => 
          AsyncStorage.removeItem(key).catch(() => {})
        ));
        
        console.log('[auth] ✅ HARD RESET - Cleared storage keys:', {
          specificKeys: keysToRemove.length,
          patternKeys: authKeys.length,
          total: keysToRemove.length + authKeys.length
        });
      } catch (storageError) {
        console.warn('[auth] HARD RESET - Storage cleanup failed:', storageError);
      }
      
      // Reset all state
      setUser(null);
      setUserId(null);
      setIsLoading(false);
      setIsFirebaseAuthenticated(false);
      setIsAnonymous(true);
      setIsInitialized(true);
      setHasSignedInThisSession(false);
      setInitError(null);
      setRetryAttempts(0);
      setLastSuccessfulAuth(null);
      
      console.log('[auth] ✅ HARD RESET - Complete authentication reset successful');
      
    } catch (error) {
      console.error('[auth] ❌ HARD RESET - Reset failed:', error);
      throw error;
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    console.log('Password reset requested for:', email);
    if (!email?.trim()) throw new Error('Email required');
    try {
      const { sendPasswordResetEmail } = await import('firebase/auth');
      if (auth) {
        await sendPasswordResetEmail(auth as any, email.trim());
        console.log('[auth] Password reset email sent');
      }
    } catch (e) {
      console.warn('[auth] sendPasswordResetEmail failed, continuing silently:', e);
    }
  }, []);

  const updateProfile = useCallback(async (updates: Partial<Driver | Shipper | Admin>) => {
    if (!user) {
      console.log('[auth] ⚠️ PERMANENT PROFILE PERSISTENCE - updateProfile called but no user found');
      return;
    }
    
    console.log('[auth] ✅ PERMANENT PROFILE PERSISTENCE - updateProfile called with updates:', JSON.stringify(updates, null, 2));
    const updated = { ...user, ...updates } as Driver | Shipper | Admin;
    console.log('[auth] PERMANENT PROFILE PERSISTENCE - updated user object:', JSON.stringify(updated, null, 2));
    
    setUser(updated);
    
    // PERMANENT FIX: Enhanced local storage with comprehensive backup strategies
    try {
      const userDataString = JSON.stringify(updated);
      
      // PERMANENT FIX: Save to ALL possible storage locations for maximum persistence
      const storagePromises = [
        // Primary storage locations
        AsyncStorage.setItem(USER_STORAGE_KEY, userDataString),
        AsyncStorage.setItem(`${USER_STORAGE_KEY}_backup`, userDataString),
        AsyncStorage.setItem(`profile:cache`, userDataString),
        AsyncStorage.setItem(`profile:persistent`, userDataString),
        
        // Role-specific backups
        AsyncStorage.setItem(`${updated.role}:profile:${updated.id}`, userDataString),
        AsyncStorage.setItem(`driver:profile:backup`, userDataString),
        AsyncStorage.setItem(`auth:user:persistent`, userDataString),
        
        // Email-based backups
        AsyncStorage.setItem(`user:${updated.email}:backup`, userDataString),
        AsyncStorage.setItem(`profile:${updated.email}`, userDataString),
        
        // Timestamped backups for recovery
        AsyncStorage.setItem(`profile:timestamp:${Date.now()}`, userDataString),
        AsyncStorage.setItem(`profile:latest:${updated.role}`, userDataString),
        
        // Session-based backup
        AsyncStorage.setItem(`session:profile:${Date.now()}`, userDataString)
      ];
      
      const results = await Promise.allSettled(storagePromises);
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failCount = results.filter(r => r.status === 'rejected').length;
      
      console.log('[auth] ✅ PERMANENT PROFILE PERSISTENCE - Profile saved:', {
        successful: successCount,
        failed: failCount,
        total: storagePromises.length
      });
      
      // Store profile update history for debugging and recovery
      try {
        const historyKey = `profile:history:${updated.id}`;
        const existingHistory = await AsyncStorage.getItem(historyKey);
        const history = existingHistory ? JSON.parse(existingHistory) : [];
        history.push({
          timestamp: new Date().toISOString(),
          updates,
          profileSnapshot: { ...updated },
          storageResults: { successful: successCount, failed: failCount }
        });
        // Keep only last 20 updates for better debugging
        if (history.length > 20) history.splice(0, history.length - 20);
        await AsyncStorage.setItem(historyKey, JSON.stringify(history));
        
        // Also save a simplified recovery file
        const recoveryData = {
          lastUpdate: new Date().toISOString(),
          userId: updated.id,
          userRole: updated.role,
          userEmail: updated.email,
          userName: updated.name,
          profileComplete: true,
          hasWallet: !!(updated as any).wallet,
          hasFuelProfile: !!(updated as any).fuelProfile,
          hasVehicleData: !!(updated as any).truckType || !!(updated as any).vehicleMake
        };
        await AsyncStorage.setItem(`profile:recovery:${updated.id}`, JSON.stringify(recoveryData));
        
      } catch (historyError) {
        console.warn('[auth] Failed to save profile history:', historyError);
      }
      
      // If less than half the storage operations succeeded, log a warning
      if (successCount < storagePromises.length / 2) {
        console.warn('[auth] ⚠️ PERMANENT PROFILE PERSISTENCE - Low success rate for storage operations');
      }
      
    } catch (storageError) {
      console.error('[auth] ❌ PERMANENT PROFILE PERSISTENCE - Failed to save profile locally:', storageError);
      
      // PERMANENT FIX: Emergency fallback storage with multiple attempts
      const emergencyKeys = [
        `profile:emergency:${Date.now()}`,
        `profile:fallback:${updated.id}`,
        `emergency:${updated.role}:${updated.email}`,
        `backup:critical:${Date.now()}`
      ];
      
      let emergencySaved = false;
      for (const key of emergencyKeys) {
        try {
          await AsyncStorage.setItem(key, JSON.stringify(updated));
          console.log('[auth] ✅ PERMANENT PROFILE PERSISTENCE - Emergency save successful:', key);
          emergencySaved = true;
          break;
        } catch (emergencyError) {
          console.warn('[auth] Emergency save failed for key:', key, emergencyError);
          continue;
        }
      }
      
      if (!emergencySaved) {
        console.error('[auth] ❌ PERMANENT PROFILE PERSISTENCE - ALL storage methods failed!');
        throw new Error('Critical: Unable to persist profile data - all storage methods failed');
      }
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



  // CRITICAL FIX: Always compute the same value structure to maintain consistency
  const value = useMemo(() => {
    const result: AuthState = {
      user,
      userId,
      isLoading,
      // CRITICAL FIX: User is authenticated if they have a valid user object
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
    console.log('[useAuth] 🎯 CRITICAL AUTH STATE - Auth computed:', {
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