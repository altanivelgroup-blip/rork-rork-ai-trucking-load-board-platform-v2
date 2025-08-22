import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Driver } from '@/types';

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

export const [AuthProvider, useAuth] = createContextHook<AuthState>(() => {
  const [user, setUser] = useState<Driver | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const init = async () => {
      try {
        const cached = await AsyncStorage.getItem(DRIVER_STORAGE_KEY);
        if (cached) {
          setUser(JSON.parse(cached));
        }
      } catch (e) {
        console.error('[auth] init error', e);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
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

  const updateProfile = useCallback(async (updates: Partial<Driver>) => {
    if (!user) return;
    const updated = { ...user, ...updates };
    setUser(updated);
    await AsyncStorage.setItem(DRIVER_STORAGE_KEY, JSON.stringify(updated));
  }, [user]);

  const value = useMemo(() => ({
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    resetPassword: async (email: string) => {
      console.log('Password reset requested for:', email);
    },
    logout,
    updateProfile,
  }), [user, isLoading, login, register, logout, updateProfile]);

  return value;
});