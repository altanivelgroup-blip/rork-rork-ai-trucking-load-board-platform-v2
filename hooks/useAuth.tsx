import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { Driver, Shipper, Admin, UserRole } from '@/types';
import { auth, db } from '@/utils/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';

// ✨ NEW: use lib/firebase helpers for driver profile read/write
import { getDriverProfile, saveDriverProfile } from '@/lib/firebase';

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

// --- helpers to keep MPG consistent everywhere ---
function toNumber(v: any): number | undefined {
  const n = typeof v === 'string' ? Number(v) : v;
  return Number.isFinite(n) ? n : undefined;
}
function pickMpg(obj: any): number | undefined {
  const a = toNumber(obj?.mpgRated);
  const b = toNumber(obj?.fuelProfile?.averageMpg);
  return a ?? b;
}

export const [AuthProvider, useAuth] = createContextHook<AuthState>(() => {
  const [user, setUser] = useState<Driver | Shipper | Admin | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFirebaseAuthenticated, setIsFirebaseAuthenticated] = useState<boolean>(false);
  const [hasSignedInThisSession, setHasSignedInThisSession] = useState<boolean>(false);

  console.log('[useAuth] Hook initialized');

  // Firebase auth state listener
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let mounted = true;

    const initAuth = async () => {
      try {
        console.log('[auth] Starting simple auth initialization...');

        const timeoutId = setTimeout(() => {
          if (mounted) {
            console.log('[auth] Auth initialization timeout, setting loading to false');
            setIsLoading(false);
          }
        }, 3000);

        unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          clearTimeout(timeoutId);
          if (!mounted) return;

          console.log('[auth] Firebase auth state changed:', firebaseUser ? `${firebaseUser.uid} (${firebaseUser.email})` : 'signed out');

          if (firebaseUser) {
            // Determine role
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

            // Build user object
            const email = firebaseUser.email || '';
            const name = email.split('@')[0].toUpperCase();

            let userObject: Driver | Shipper | Admin;
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
              // DRIVER: load saved profile and normalize MPG
              console.log('[auth] Loading driver profile from Firestore...');
              try {
                const profileResult = await getDriverProfile(firebaseUser.uid);

                if (profileResult.success && profileResult.data) {
                  const profile: any = profileResult.data;

                  // normalize MPG from either field
                  const mpg = pickMpg(profile);
                  const resolvedMpg = mpg ?? 8.5; // only fall back if truly missing

                  console.log('[auth] ✅ Loaded driver profile (normalized MPG):', {
                    name: profile.fullName || profile.name,
                    email: profile.email,
                    vehicle: `${profile.vehicleMake ?? ''} ${profile.vehicleModel ?? ''}`.trim(),
                    mpgRated: profile.mpgRated,
                    fuelProfileAvg: profile.fuelProfile?.averageMpg,
                    resolvedMpg
                  });

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
                    fuelProfile: {
                      vehicleType: profile.truckType || 'truck',
                      averageMpg: resolvedMpg, // 🔒 single source of truth in UI
                      fuelPricePerGallon: 3.85,
                      fuelType: profile.fuelType || 'diesel',
                      tankCapacity: profile.tankGallons || 150,
                      ...(profile.fuelProfile ?? {}),
                    },
                    mpgRated: resolvedMpg, // 🔒 mirror for compatibility
                    isAvailable: true,
                    verificationStatus: profile.verificationStatus || 'verified',

                    // Persist the rest of the saved fields
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
                } else {
                  console.log('[auth] ⚠️ No saved profile found, creating default driver profile');
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
            setUser(null);
            setUserId(null);
            setHasSignedInThisSession(false);
            console.log('[auth] User signed out');
          }

          if (mounted) setIsLoading(false);
        });

        if (mounted) setIsFirebaseAuthenticated(true);
      } catch (error: any) {
        console.error('[auth] Auth initialization error:', error);
        if (mounted) setIsLoading(false);
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
    // handled by auth listener
  }, []);

  const register = useCallback(async (email: string, password: string, role: UserRole, profile?: Partial<Driver | Shipper | Admin>) => {
    console.log('[auth] Register attempt for', email, 'as', role);
    // handled by auth listener
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

    // --- If DRIVER and MPG is present, save to drivers/{uid} with mirror write ---
    let writtenFromFirestore: any | null = null;
    try {
      if (user.role === 'driver' && user.id) {
        const mpgIncoming =
          toNumber((updates as any).mpgRated) ??
          toNumber((updates as any)?.fuelProfile?.averageMpg);

        // Only call driver profile saver if MPG or closely related fuel fields are changing
        if (mpgIncoming != null || (updates as any).fuelType || (updates as any).truckType || (updates as any).tankGallons) {
          const payload: any = {
            userId: user.id,
          };
          if (mpgIncoming != null) payload.mpgRated = mpgIncoming;
          if ((updates as any).fuelType) payload.fuelType = (updates as any).fuelType;
          if ((updates as any).truckType) payload.truckType = (updates as any).truckType;
          if ((updates as any).tankGallons != null) payload.tankGallons = (updates as any).tankGallons;

          const res = await saveDriverProfile(payload);
          writtenFromFirestore = res?.written ?? null;

          console.log('[auth] Driver MPG persisted to Firestore:', writtenFromFirestore);
        }
      }
    } catch (e) {
      console.warn('[auth] Firestore driver profile save skipped/failed (local state still updated):', e);
    }

    // --- Build updated local state with normalized MPG (UI updates instantly) ---
    const prev = user as any;
    const next: any = { ...prev, ...(updates as any) };

    // Apply any written MPG mirror coming back from Firestore
    if (writtenFromFirestore) {
      next.mpgRated = writtenFromFirestore.mpgRated ?? next.mpgRated;
      next.fuelProfile = {
        ...(next.fuelProfile ?? {}),
        ...(writtenFromFirestore.fuelProfile ?? {}),
      };
    }

    // Normalize MPG locally if present in updates
    const updatedMpg =
      toNumber(next.mpgRated) ??
      toNumber(next.fuelProfile?.averageMpg);

    if (updatedMpg != null) {
      next.mpgRated = updatedMpg;
      next.fuelProfile = {
        ...(next.fuelProfile ?? {}),
        averageMpg: updatedMpg,
      };
    }

    setUser(next as Driver | Shipper | Admin);

    try {
      const userDataString = JSON.stringify(next);
      await AsyncStorage.setItem(USER_STORAGE_KEY, userDataString);
      console.log('[auth] Profile updated and cached');

      // Optional bypass for known test users
      const currentEmail = (next.email ?? auth?.currentUser?.email ?? '').toLowerCase();
      const testBypassList = ['driver@truck.com', 'test1@test1.com', 'shipper@logistics.com', 'test@example.com'];
      const shouldBypass = !!currentEmail && testBypassList.includes(currentEmail);
      if (shouldBypass) {
        console.log(`[auth] Bypass Firestore user-doc write for test user: ${currentEmail}`);
        return;
      }

      // Best-effort user doc update (role + profileData)
      if (auth?.currentUser?.uid) {
        const uid = auth.currentUser.uid;
        const userRef = doc(db, 'users', uid);

        const profileData = {
          fullName: next.name,
          email: next.email,
          phone: (next as any).phone || '',
          company: (next as any).company || ''
        };

        const userDoc = {
          role: next.role,
          profileData,
          updatedAt: serverTimestamp()
        };

        try {
          await setDoc(userRef, userDoc, { merge: true });
          console.log('[auth] Profile updated in Firestore (users collection)');
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
