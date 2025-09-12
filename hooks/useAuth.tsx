import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Driver, Shipper, UserRole } from '@/types';
import { auth, ensureFirebaseAuth, db } from '@/utils/firebase';
import { onAuthStateChanged } from 'firebase/auth';

import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

interface AuthState {
  user: Driver | Shipper | null;
  userId: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isFirebaseAuthenticated: boolean;
  hasSignedInThisSession: boolean;
  login: (email: string, password: string, role?: UserRole) => Promise<void>;
  register: (email: string, password: string, role: UserRole, profile?: Partial<Driver | Shipper>) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<Driver | Shipper>) => Promise<void>;

}

const USER_STORAGE_KEY = 'auth:user:profile';

export const [AuthProvider, useAuth] = createContextHook<AuthState>(() => {
  // Always call all hooks in the same order - never conditionally
  const [user, setUser] = useState<Driver | Shipper | null>(null);
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

  // Firebase auth setup - always called to maintain hook order
  useEffect(() => {
    let isMounted = true;
    let unsubscribe: (() => void) | undefined;
    
    const setupFirebaseAuth = async () => {
      try {
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

  const login = useCallback(async (email: string, password: string, role: UserRole = 'driver') => {
    console.log('[auth] login attempt for', email, 'as', role);
    try {
      // First check if we have cached data for this email/role combination
      const cached = await AsyncStorage.getItem(USER_STORAGE_KEY);
      let mockUser: Driver | Shipper;
      
      if (cached) {
        const cachedUser = JSON.parse(cached);
        if (cachedUser.email === email && cachedUser.role === role) {
          console.log('[auth] using cached user data for', email);
          mockUser = cachedUser;
        } else {
          console.log('[auth] cached user mismatch, creating new user');
          mockUser = await createNewUser(email, role);
        }
      } else {
        console.log('[auth] no cached data, creating new user');
        mockUser = await createNewUser(email, role);
      }
      
      setUser(mockUser);
      setUserId(mockUser.id);
      setIsAnonymous(email === 'guest@example.com');
      setHasSignedInThisSession(true);
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(mockUser));
      console.log('[auth] login successful as', role);
    } catch (error) {
      console.error('[auth] login failed:', error);
      throw error;
    }
  }, []);
  
  const createNewUser = async (email: string, role: UserRole): Promise<Driver | Shipper> => {
    await ensureFirebaseAuth();
    const uid = auth?.currentUser?.uid ?? `local-${Date.now()}`;
    
    if (role === 'shipper') {
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
  };

  const register = useCallback(async (email: string, password: string, role: UserRole, profile?: Partial<Driver | Shipper>) => {
    console.log('[auth] register attempt for', email, 'as', role);
    await ensureFirebaseAuth();
    const uid = auth?.currentUser?.uid ?? `local-${Date.now()}`;
    
    let mockUser: Driver | Shipper;
    
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
    await AsyncStorage.removeItem(USER_STORAGE_KEY);
    setUser(null);
    setIsAnonymous(true);
    setHasSignedInThisSession(false);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    console.log('Password reset requested for:', email);
  }, []);

  const updateProfile = useCallback(async (updates: Partial<Driver | Shipper>) => {
    if (!user) {
      console.log('[auth] updateProfile called but no user found');
      return;
    }
    console.log('[auth] updateProfile called with updates:', JSON.stringify(updates, null, 2));
    const updated = { ...user, ...updates } as Driver | Shipper;
    console.log('[auth] updated user object:', JSON.stringify(updated, null, 2));
    setUser(updated);
    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updated));
    console.log('[auth] profile saved to AsyncStorage');

    try {
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
        console.log(`[auth] ${user.role} profile persisted to Firestore`);
      } else {
        console.log('[auth] no firebase uid, skipped Firestore write');
      }
    } catch (err) {
      console.warn('[auth] Firestore write failed, cached locally only', err);
    }
  }, [user]);



  // Always compute the same value structure to maintain consistency
  const value = useMemo(() => {
    const result: AuthState = {
      user,
      userId,
      isLoading,
      isAuthenticated: !!user && !isAnonymous && hasSignedInThisSession, // Only authenticated if user exists AND not anonymous AND signed in this session
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