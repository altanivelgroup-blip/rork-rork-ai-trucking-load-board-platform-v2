import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Driver } from '@/types';
import { auth, ensureFirebaseAuth, db } from '@/utils/firebase';
import { onAuthStateChanged } from 'firebase/auth';

import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

interface AuthState {
  user: Driver | null;
  userId: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isFirebaseAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, profile?: Partial<Driver>) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<Driver>) => Promise<void>;
}

const DRIVER_STORAGE_KEY = 'auth:user:driver';

export const [AuthProvider, useAuth] = createContextHook<AuthState>(() => {
  // Always call all hooks in the same order - never conditionally
  const [user, setUser] = useState<Driver | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFirebaseAuthenticated, setIsFirebaseAuthenticated] = useState<boolean>(false);
  const [isAnonymous, setIsAnonymous] = useState<boolean>(true);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  
  console.log('[useAuth] Hook called - ensuring consistent hook order');

  // Load cached user data - always called, never conditional
  useEffect(() => {
    let isMounted = true;
    
    const loadCachedUser = async () => {
      try {
        console.log('[auth] loading cached user...');
        const cached = await AsyncStorage.getItem(DRIVER_STORAGE_KEY);
        
        if (!isMounted) return;
        
        if (cached) {
          console.log('[auth] found cached user');
          const cachedUser = JSON.parse(cached);
          setUser(cachedUser);
          setIsAnonymous(false);
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

  // Firebase auth setup - always called to maintain hook order
  useEffect(() => {
    let isMounted = true;
    let unsubscribe: (() => void) | undefined;
    
    const setupFirebaseAuth = async () => {
      try {
        // Only setup Firebase after initial load is complete
        if (!isInitialized) {
          console.log('[auth] Waiting for initialization...');
          return;
        }
        
        console.log('[auth] Setting up Firebase auth...');
        await ensureFirebaseAuth();
        
        if (!isMounted) return;
        
        unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
          if (!isMounted) return;
          
          console.log('[auth] Firebase auth state changed:', {
            uid: firebaseUser?.uid,
            isAnonymous: firebaseUser?.isAnonymous,
          });
          
          setUserId(firebaseUser?.uid || null);
          setIsFirebaseAuthenticated(!!firebaseUser);
          
          // Only update isAnonymous if we don't have a local user
          if (!user) {
            setIsAnonymous(firebaseUser?.isAnonymous ?? true);
          }
        });
      } catch (error) {
        console.warn('[auth] Firebase auth setup failed:', error);
        if (isMounted) {
          setIsFirebaseAuthenticated(false);
          setUserId(null);
        }
      }
    };
    
    setupFirebaseAuth();
    
    return () => {
      isMounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [isInitialized, user]);

  const login = useCallback(async (email: string, password: string) => {
    console.log('[auth] login attempt for', email);
    await ensureFirebaseAuth();
    const uid = auth?.currentUser?.uid ?? `local-${Date.now()}`;
    const mockUser: Driver = {
      id: uid,
      role: 'driver',
      email,
      name: 'Test Driver',
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
    
    setUser(mockUser);
    setIsAnonymous(false); // Mark as not anonymous when user logs in
    await AsyncStorage.setItem(DRIVER_STORAGE_KEY, JSON.stringify(mockUser));
    console.log('[auth] login successful');
  }, []);

  const register = useCallback(async (email: string, password: string, profile?: Partial<Driver>) => {
    await ensureFirebaseAuth();
    const uid = auth?.currentUser?.uid ?? `local-${Date.now()}`;
    const mockUser: Driver = {
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
    } as unknown as Driver;

    setUser(mockUser);
    setIsAnonymous(false); // Mark as not anonymous when user registers
    await AsyncStorage.setItem(DRIVER_STORAGE_KEY, JSON.stringify(mockUser));
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem(DRIVER_STORAGE_KEY);
    setUser(null);
    setIsAnonymous(true); // Reset to anonymous on logout
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    console.log('Password reset requested for:', email);
  }, []);

  const updateProfile = useCallback(async (updates: Partial<Driver>) => {
    if (!user) {
      console.log('[auth] updateProfile called but no user found');
      return;
    }
    console.log('[auth] updateProfile called with updates:', JSON.stringify(updates, null, 2));
    const updated: Driver = { ...user, ...updates } as Driver;
    console.log('[auth] updated user object:', JSON.stringify(updated, null, 2));
    setUser(updated);
    await AsyncStorage.setItem(DRIVER_STORAGE_KEY, JSON.stringify(updated));
    console.log('[auth] profile saved to AsyncStorage');

    try {
      await ensureFirebaseAuth();
      if (auth?.currentUser?.uid) {
        const uid = auth.currentUser.uid;
        const ref = doc(db, 'drivers', uid);
        const payload: Record<string, unknown> = {
          displayName: updated.name ?? '',
          email: updated.email ?? '',
          phone: (updated as any).phone ?? null,
          company: (updated as any).company ?? null,
          primaryVehicle: (updates as any).primaryVehicle ?? updated.primaryVehicle ?? null,
          vehicleMake: (updates as any).vehicleMake ?? updated.vehicleMake ?? null,
          vehicleModel: (updates as any).vehicleModel ?? updated.vehicleModel ?? null,
          vehicleYear: (updates as any).vehicleYear ?? updated.vehicleYear ?? null,
          fuelType: (updates as any).fuelType ?? updated.fuelType ?? null,
          mpgRated: (updates as any).mpgRated ?? updated.mpgRated ?? null,
          vin: (updates as any).vin ?? updated.vin ?? null,
          plate: (updates as any).plate ?? updated.plate ?? null,
          tankGallons: (updates as any).tankGallons ?? (updated.tankGallons ?? null),
          gvwrLbs: (updates as any).gvwrLbs ?? (updated.gvwrLbs ?? null),
          trailerMake: (updates as any).trailerMake ?? updated.trailerMake ?? null,
          trailerModel: (updates as any).trailerModel ?? updated.trailerModel ?? null,
          trailerYear: (updates as any).trailerYear ?? updated.trailerYear ?? null,
          trailerVin: (updates as any).trailerVin ?? updated.trailerVin ?? null,
          trailerPlate: (updates as any).trailerPlate ?? updated.trailerPlate ?? null,
          trailerInsuranceCarrier: (updates as any).trailerInsuranceCarrier ?? updated.trailerInsuranceCarrier ?? null,
          trailerPolicyNumber: (updates as any).trailerPolicyNumber ?? updated.trailerPolicyNumber ?? null,
          trailerGvwrLbs: (updates as any).trailerGvwrLbs ?? updated.trailerGvwrLbs ?? null,
          trailerType: (updates as any).trailerType ?? updated.trailerType ?? null,
          vehicleSubtype: (updates as any).vehicleSubtype ?? updated.vehicleSubtype ?? null,
          companyName: (updates as any).companyName ?? updated.companyName ?? null,
          mcNumber: (updates as any).mcNumber ?? updated.mcNumber ?? null,
          dotNumber: (updates as any).dotNumber ?? updated.dotNumber ?? null,
          insuranceCarrier: (updates as any).insuranceCarrier ?? updated.insuranceCarrier ?? null,
          policyNumber: (updates as any).policyNumber ?? updated.policyNumber ?? null,
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        };
        await setDoc(ref, payload, { merge: true });
        console.log('[auth] driver profile persisted to Firestore');
      } else {
        console.log('[auth] no firebase uid, skipped Firestore write');
      }
    } catch (err) {
      console.warn('[auth] Firestore write failed, cached locally only', err);
    }
  }, [user]);

  // Always compute the same value structure to maintain consistency
  const value = useMemo(() => ({
    user,
    userId,
    isLoading,
    isAuthenticated: !!user && !isAnonymous, // Only authenticated if user exists AND not anonymous
    isFirebaseAuthenticated,
    login,
    register,
    resetPassword,
    logout,
    updateProfile,
  }), [user, userId, isLoading, isFirebaseAuthenticated, isAnonymous, login, register, resetPassword, logout, updateProfile]);

  return value;
});