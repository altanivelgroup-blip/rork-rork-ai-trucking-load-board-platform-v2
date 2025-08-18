import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Driver, UserRole } from '@/types';

interface AuthState {
  user: Driver | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<Driver>) => void;
}

export const [AuthProvider, useAuth] = createContextHook<AuthState>(() => {
  const [user, setUser] = useState<Driver | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Failed to load user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    // Mock login - in production, this would call an API
    const mockDriver: Driver = {
      id: '1',
      role: 'driver',
      email,
      name: 'John Driver',
      phone: '555-0123',
      company: 'Independent',
      membershipTier: 'premium',
      createdAt: new Date(),
      cdlNumber: 'CDL123456',
      vehicleTypes: ['flatbed', 'reefer'],
      rating: 4.8,
      completedLoads: 156,
      documents: [],
      wallet: {
        balance: 2450.00,
        pendingEarnings: 850.00,
        totalEarnings: 45600.00,
        transactions: [],
      },
      isAvailable: true,
      verificationStatus: 'unverified',
    };
    
    await AsyncStorage.setItem('user', JSON.stringify(mockDriver));
    setUser(mockDriver);
  };

  const logout = async () => {
    await AsyncStorage.removeItem('user');
    setUser(null);
  };

  const updateProfile = (updates: Partial<Driver>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      AsyncStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    updateProfile,
  };
});