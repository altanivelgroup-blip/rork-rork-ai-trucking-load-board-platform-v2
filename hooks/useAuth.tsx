import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Driver } from '@/types';
import { getFirebase } from '@/utils/firebase';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
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

const driverConverter: FirestoreDataConverter<Driver> = {
  toFirestore: (driver: Driver) => {
    return {
      ...driver,
      createdAt: driver.createdAt,
    } as Record<string, unknown>;
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
  const { auth, db } = getFirebase();
  const [user, setUser] = useState<Driver | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    (async () => {
      try {
        const cached = await AsyncStorage.getItem(DRIVER_STORAGE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached) as Driver;
          setUser(parsed);
        }
      } catch (e) {
        console.error('[auth] load cached user error', e);
      } finally {
        setIsLoading(false);
      }

      unsub = onAuthStateChanged(auth, async (fbUser) => {
        console.log('[auth] onAuthStateChanged', fbUser?.uid);
        if (!fbUser) {
          setUser(null);
          await AsyncStorage.removeItem(DRIVER_STORAGE_KEY);
          return;
        }
        const profile = await fetchOrCreateProfile(db, fbUser);
        setUser(profile);
        await AsyncStorage.setItem(DRIVER_STORAGE_KEY, JSON.stringify(profile));
      });
    })();

    return () => {
      if (unsub) unsub();
    };
  }, [auth, db]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const profile = await fetchOrCreateProfile(db, cred.user);
      setUser(profile);
      await AsyncStorage.setItem(DRIVER_STORAGE_KEY, JSON.stringify(profile));
    } catch (e) {
      console.error('[auth] login error', e);
      throw e as Error;
    } finally {
      setIsLoading(false);
    }
  }, [auth, db]);

  const register = useCallback(async (email: string, password: string, profile?: Partial<Driver>) => {
    try {
      setIsLoading(true);
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const base: Driver = buildDefaultDriver(cred.user, profile);
      await setDoc(doc(db, 'profiles', cred.user.uid), {
        ...base,
        createdAt: serverTimestamp(),
      });
      setUser(base);
      await AsyncStorage.setItem(DRIVER_STORAGE_KEY, JSON.stringify(base));
    } catch (e) {
      console.error('[auth] register error', e);
      throw e as Error;
    } finally {
      setIsLoading(false);
    }
  }, [auth, db]);

  const logout = useCallback(async () => {
    try {
      setIsLoading(true);
      await signOut(auth);
    } catch (e) {
      console.error('[auth] logout error', e);
    } finally {
      await AsyncStorage.removeItem(DRIVER_STORAGE_KEY);
      setUser(null);
      setIsLoading(false);
    }
  }, [auth]);

  const updateProfile = useCallback(async (updates: Partial<Driver>) => {
    try {
      if (!user) return;
      const ref = doc(db, 'profiles', user.id);
      await updateDoc(ref, updates as Partial<Driver>);
      const updated = { ...user, ...updates } satisfies Driver;
      setUser(updated);
      await AsyncStorage.setItem(DRIVER_STORAGE_KEY, JSON.stringify(updated));
      if (updates.email && updates.email !== user.email) {
        try {
          await fbUpdateEmail(auth.currentUser!, updates.email);
        } catch (err) {
          console.warn('[auth] update email failed', err);
        }
      }
      if ((updates as { password?: string }).password) {
        try {
          await fbUpdatePassword(auth.currentUser!, (updates as { password: string }).password);
        } catch (err) {
          console.warn('[auth] update password failed', err);
        }
      }
    } catch (e) {
      console.error('[auth] update profile error', e);
      throw e as Error;
    }
  }, [auth, db, user]);

  const value = useMemo(() => ({
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    updateProfile,
  }), [user, isLoading, login, register, logout, updateProfile]);

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
    await setDoc(doc(db, 'profiles', fbUser.uid), {
      ...created,
      createdAt: serverTimestamp(),
    });
    return created;
  } catch (e) {
    console.error('[auth] fetchOrCreateProfile error', e);
    // Fallback minimal profile
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
