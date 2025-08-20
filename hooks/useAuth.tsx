import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Logger from '@/utils/logger';
import { Driver } from '@/types';
import { getFirebase } from '@/utils/firebase';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  User as FirebaseUser,
  updateEmail as fbUpdateEmail,
  updatePassword as fbUpdatePassword,
  signOut,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  FirestoreDataConverter,
} from 'firebase/firestore';

interface AuthState {
  user: Driver | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, profile?: Partial<Driver>) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<Driver>) => Promise<void>;
}

const DRIVER_STORAGE_KEY = 'auth:user:driver';

function toDate(d: unknown): Date | undefined {
  if (!d) return undefined;
  if (d instanceof Date) return d;
  if (d instanceof Timestamp) return d.toDate();
  return undefined;
}

function removeUndefined<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const walk = (val: unknown): unknown => {
    if (Array.isArray(val)) return val.map(walk);
    if (val && typeof val === 'object' && !(val instanceof Date)) {
      const out: Record<string, unknown> = {};
      Object.entries(val as Record<string, unknown>).forEach(([k, v]) => {
        if (v === undefined) return;
        const w = walk(v);
        if (w !== undefined) out[k] = w;
      });
      return out;
    }
    return val === undefined ? undefined : val;
  };
  return walk(obj) as Record<string, unknown>;
}

const driverConverter: FirestoreDataConverter<Driver> = {
  toFirestore: (driver: Driver) => {
    return removeUndefined({
      ...driver,
      createdAt: driver.createdAt,
    });
  },
  fromFirestore: (snap) => {
    const data = snap.data();
    return {
      id: data.id as string,
      role: 'driver',
      email: data.email as string,
      name: (data.name as string) ?? '',
      phone: (data.phone as string) ?? '',
      company: data.company as string | undefined,
      membershipTier: (data.membershipTier as Driver['membershipTier']) ?? 'basic',
      createdAt: toDate(data.createdAt) ?? new Date(),
      cdlNumber: (data.cdlNumber as string) ?? '',
      vehicleTypes: (data.vehicleTypes as Driver['vehicleTypes']) ?? [],
      rating: (data.rating as number) ?? 0,
      completedLoads: (data.completedLoads as number) ?? 0,
      documents: (data.documents as Driver['documents']) ?? [],
      wallet: (data.wallet as Driver['wallet']) ?? {
        balance: 0,
        pendingEarnings: 0,
        totalEarnings: 0,
        transactions: [],
      },
      currentLocation: data.currentLocation as Driver['currentLocation'],
      isAvailable: (data.isAvailable as boolean) ?? true,
      mcNumber: data.mcNumber as string | undefined,
      dotNumber: data.dotNumber as string | undefined,
      insuranceCarrier: data.insuranceCarrier as string | undefined,
      insurancePolicy: data.insurancePolicy as string | undefined,
      vehicleInfo: data.vehicleInfo as string | undefined,
      trailerInfo: data.trailerInfo as string | undefined,
      verificationStatus: (data.verificationStatus as Driver['verificationStatus']) ?? 'unverified',
    } satisfies Driver;
  },
};

export const [AuthProvider, useAuth] = createContextHook<AuthState>(() => {
  const [user, setUser] = useState<Driver | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [firebaseServices, setFirebaseServices] = useState<ReturnType<typeof getFirebase> | null>(null);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    (async () => {
      try {
        console.log('[auth] initializing firebase services');
        Logger.logEvent('auth_init_start').catch(() => {});
        const services = getFirebase();
        setFirebaseServices(services);
        console.log('[auth] firebase services initialized');
        Logger.logEvent('auth_init_ready').catch(() => {});
        
        const cached = await AsyncStorage.getItem(DRIVER_STORAGE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached) as Driver;
          setUser(parsed);
          console.log('[auth] loaded cached user');
        }

        unsub = onAuthStateChanged(services.auth, async (fbUser) => {
          console.log('[auth] onAuthStateChanged', fbUser?.uid);
          Logger.logEvent('auth_state_changed', { uid: fbUser?.uid ?? null }).catch(() => {});
          try {
            if (!fbUser) {
              setUser(null);
              await AsyncStorage.removeItem(DRIVER_STORAGE_KEY);
            } else {
              const profile = await fetchOrCreateProfile(services.db, fbUser);
              setUser(profile);
              await AsyncStorage.setItem(DRIVER_STORAGE_KEY, JSON.stringify(profile));
            }
          } catch (profileError) {
            console.error('[auth] profile fetch/create error', profileError);
          } finally {
            setIsLoading(false);
          }
        });
      } catch (e) {
        console.error('[auth] initialization error', e);
        Logger.logError('auth_init_error', e).catch(() => {});
        setIsLoading(false);
      }
    })();

    return () => {
      if (unsub) unsub();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    if (!firebaseServices) throw new Error('Firebase not initialized');
    try {
      setIsLoading(true);
      const cred = await signInWithEmailAndPassword(firebaseServices.auth, email, password);
      const profile = await fetchOrCreateProfile(firebaseServices.db, cred.user);
      setUser(profile);
      await AsyncStorage.setItem(DRIVER_STORAGE_KEY, JSON.stringify(profile));
    } catch (e) {
      console.error('[auth] login error', e);
      Logger.logError('auth_login_error', e, { email }).catch(() => {});
      throw e as Error;
    } finally {
      setIsLoading(false);
    }
  }, [firebaseServices]);

  const register = useCallback(async (email: string, password: string, profile?: Partial<Driver>) => {
    if (!firebaseServices) throw new Error('Firebase not initialized');
    try {
      setIsLoading(true);
      const cred = await createUserWithEmailAndPassword(firebaseServices.auth, email, password);
      const base: Driver = buildDefaultDriver(cred.user, profile);
      const payload = removeUndefined({
        ...base,
        createdAt: serverTimestamp(),
      });
      await setDoc(doc(firebaseServices.db, 'profiles', cred.user.uid), payload);
      setUser(base);
      await AsyncStorage.setItem(DRIVER_STORAGE_KEY, JSON.stringify(base));
    } catch (e) {
      console.error('[auth] register error', e);
      Logger.logError('auth_register_error', e, { email }).catch(() => {});
      throw e as Error;
    } finally {
      setIsLoading(false);
    }
  }, [firebaseServices]);

  const logout = useCallback(async () => {
    if (!firebaseServices) return;
    try {
      setIsLoading(true);
      await signOut(firebaseServices.auth);
    } catch (e) {
      console.error('[auth] logout error', e);
      Logger.logError('auth_logout_error', e).catch(() => {});
    } finally {
      await AsyncStorage.removeItem(DRIVER_STORAGE_KEY);
      setUser(null);
      setIsLoading(false);
    }
  }, [firebaseServices]);

  const updateProfile = useCallback(async (updates: Partial<Driver>) => {
    if (!firebaseServices || !user) return;
    try {
      const ref = doc(firebaseServices.db, 'profiles', user.id);
      const cleaned = removeUndefined(updates as Record<string, unknown>);
      await updateDoc(ref, cleaned as Partial<Driver>);
      const updated = { ...user, ...updates } satisfies Driver;
      setUser(updated);
      await AsyncStorage.setItem(DRIVER_STORAGE_KEY, JSON.stringify(updated));
      if (updates.email && updates.email !== user.email) {
        try {
          await fbUpdateEmail(firebaseServices.auth.currentUser!, updates.email);
        } catch (err) {
          console.warn('[auth] update email failed', err);
        }
      }
      if ((updates as { password?: string }).password) {
        try {
          await fbUpdatePassword(firebaseServices.auth.currentUser!, (updates as { password: string }).password);
        } catch (err) {
          console.warn('[auth] update password failed', err);
        }
      }
    } catch (e) {
      console.error('[auth] update profile error', e);
      Logger.logError('auth_update_profile_error', e).catch(() => {});
      throw e as Error;
    }
  }, [firebaseServices, user]);

  const value = useMemo(() => ({
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    resetPassword: async (email: string) => {
      if (!firebaseServices) throw new Error('Firebase not initialized');
      try {
        await sendPasswordResetEmail(firebaseServices.auth, email);
      } catch (e) {
        console.error('[auth] reset password error', e);
        Logger.logError('auth_reset_password_error', e, { email }).catch(() => {});
        throw e as Error;
      }
    },
    logout,
    updateProfile,
  }), [user, isLoading, login, register, firebaseServices, logout, updateProfile]);

  return value;
});

async function fetchOrCreateProfile(db: ReturnType<typeof getFirebase>['db'], fbUser: FirebaseUser): Promise<Driver> {
  try {
    const ref = doc(db, 'profiles', fbUser.uid).withConverter(driverConverter);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const driver = snap.data();
      return driver;
    }
    const created = buildDefaultDriver(fbUser);
    const payload = removeUndefined({
      ...created,
      createdAt: serverTimestamp(),
    });
    await setDoc(doc(db, 'profiles', fbUser.uid), payload);
    return created;
  } catch (e) {
    console.error('[auth] fetchOrCreateProfile error', e);
    Logger.logError('auth_fetch_or_create_profile_error', e).catch(() => {});
    return buildDefaultDriver(fbUser);
  }
}

function buildDefaultDriver(fbUser: FirebaseUser, profile?: Partial<Driver>): Driver {
  const base: Driver = {
    id: fbUser.uid,
    role: 'driver',
    email: fbUser.email ?? (profile?.email ?? ''),
    name: profile?.name ?? (fbUser.displayName ?? ''),
    phone: profile?.phone ?? '',
    company: profile?.company,
    membershipTier: profile?.membershipTier ?? 'basic',
    createdAt: new Date(),
    cdlNumber: profile?.cdlNumber ?? '',
    vehicleTypes: profile?.vehicleTypes ?? [],
    rating: profile?.rating ?? 0,
    completedLoads: profile?.completedLoads ?? 0,
    documents: profile?.documents ?? [],
    wallet: profile?.wallet ?? {
      balance: 0,
      pendingEarnings: 0,
      totalEarnings: 0,
      transactions: [],
    },
    currentLocation: profile?.currentLocation,
    isAvailable: profile?.isAvailable ?? true,
    mcNumber: profile?.mcNumber,
    dotNumber: profile?.dotNumber,
    insuranceCarrier: profile?.insuranceCarrier,
    insurancePolicy: profile?.insurancePolicy,
    vehicleInfo: profile?.vehicleInfo,
    trailerInfo: profile?.trailerInfo,
    verificationStatus: profile?.verificationStatus ?? 'unverified',
  };
  return base;
}
