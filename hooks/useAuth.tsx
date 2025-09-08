import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Driver } from '@/types';
import { auth, ensureFirebaseAuth, db } from '@/utils/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useToast } from '@/components/Toast';
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
  const [user, setUser] = useState<Driver | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFirebaseAuthenticated, setIsFirebaseAuthenticated] = useState<boolean>(false);
  const toast = useToast();

  useEffect(() => {
    let isMounted = true;
    
    const init = async () => {
      try {
        console.log('[auth] initializing...');
        
        // First, try to authenticate with Firebase anonymously
        const firebaseAuthSuccess = await ensureFirebaseAuth();
        
        if (!isMounted) return;
        
        if (firebaseAuthSuccess) {
          console.log('[auth] Firebase authentication successful');
          setIsFirebaseAuthenticated(true);
          
          // Set up Firebase auth state listener
          const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            if (firebaseUser) {
              console.log('[auth] Firebase user state changed:', firebaseUser.uid);
              setUserId(firebaseUser.uid);
              setIsFirebaseAuthenticated(true);
            } else {
              console.log('[auth] Firebase user signed out');
              setUserId(null);
              setIsFirebaseAuthenticated(false);
            }
          });
          
          // Clean up listener when component unmounts
          if (isMounted) {
            // Store the unsubscribe function for cleanup
            (init as any).unsubscribe = unsubscribe;
          }
        } else {
          console.log('[auth] Firebase authentication failed');
          if (isMounted) {
            toast.show('Sign-in failed, please refresh.', 'error');
          }
        }
        
        // Load cached user profile
        const cached = await AsyncStorage.getItem(DRIVER_STORAGE_KEY);
        
        if (!isMounted) return;
        
        if (cached) {
          console.log('[auth] found cached user');
          setUser(JSON.parse(cached));
        } else {
          console.log('[auth] no cached user found');
        }
      } catch (e) {
        console.error('[auth] init error', e);
        if (isMounted) {
          toast.show('Sign-in failed, please refresh.', 'error');
        }
      } finally {
        if (isMounted) {
          console.log('[auth] initialization complete');
          setIsLoading(false);
        }
      }
    };
    
    const timer = setTimeout(init, 50);
    
    return () => {
      isMounted = false;
      clearTimeout(timer);
      // Clean up Firebase auth listener if it exists
      if ((init as any).unsubscribe) {
        (init as any).unsubscribe();
      }
    };
  }, [toast]);

  const login = useCallback(async (email: string, password: string) => {
    console.log('[auth] login attempt for', email);
    const mockUser: Driver = {
      id: '1',
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
    };
    
    setUser(mockUser);
    await AsyncStorage.setItem(DRIVER_STORAGE_KEY, JSON.stringify(mockUser));
    console.log('[auth] login successful');
  }, []);

  const register = useCallback(async (email: string, password: string, profile?: Partial<Driver>) => {
    const mockUser: Driver = {
      id: '1',
      role: 'driver',
      email,
      name: profile?.name || 'New Driver',
      phone: profile?.phone || '',
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
    };
    
    setUser(mockUser);
    await AsyncStorage.setItem(DRIVER_STORAGE_KEY, JSON.stringify(mockUser));
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem(DRIVER_STORAGE_KEY);
    setUser(null);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    console.log('Password reset requested for:', email);
  }, []);

  const updateProfile = useCallback(async (updates: Partial<Driver>) => {
    if (!user) return;
    const updated: Driver = { ...user, ...updates } as Driver;
    setUser(updated);
    await AsyncStorage.setItem(DRIVER_STORAGE_KEY, JSON.stringify(updated));

    try {
      if (auth?.currentUser?.uid) {
        const uid = auth.currentUser.uid;
        const ref = doc(db, 'drivers', uid);
        const payload: Record<string, unknown> = {
          displayName: updated.name ?? '',
          email: updated.email ?? '',
          vehicleMake: (updates as any).vehicleMake ?? updated.vehicleMake ?? null,
          vehicleModel: (updates as any).vehicleModel ?? updated.vehicleModel ?? null,
          vehicleYear: (updates as any).vehicleYear ?? updated.vehicleYear ?? null,
          fuelType: (updates as any).fuelType ?? updated.fuelType ?? null,
          mpgRated: (updates as any).mpgRated ?? updated.mpgRated ?? null,
          vin: (updates as any).vin ?? updated.vin ?? null,
          plate: (updates as any).plate ?? updated.plate ?? null,
          tankGallons: (updates as any).tankGallons ?? (updated.tankGallons ?? null),
          gvwrLbs: (updates as any).gvwrLbs ?? (updated.gvwrLbs ?? null),
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

  const value = useMemo(() => ({
    user,
    userId,
    isLoading,
    isAuthenticated: !!user,
    isFirebaseAuthenticated,
    login,
    register,
    resetPassword,
    logout,
    updateProfile,
  }), [user, userId, isLoading, isFirebaseAuthenticated, login, register, resetPassword, logout, updateProfile]);

  return value;
});