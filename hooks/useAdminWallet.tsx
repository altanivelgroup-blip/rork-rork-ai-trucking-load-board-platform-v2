import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from './useAuth';
import { useLoads } from './useLoads';

export interface AdminFeeMetrics {
  dailySignUps: number;
  dailyCompletedDeliveries: number;
  dailyFeeEarnings: number;
  weeklySignUps: number;
  weeklyCompletedDeliveries: number;
  weeklyFeeEarnings: number;
  monthlySignUps: number;
  monthlyCompletedDeliveries: number;
  monthlyFeeEarnings: number;
  totalPlatformFees: number;
  totalUsers: number;
  totalCompletedLoads: number;
}

export interface AdminFeeTransaction {
  id: string;
  type: 'signup_fee' | 'delivery_fee' | 'platform_fee';
  amount: number;
  description: string;
  date: Date;
  userId?: string;
  loadId?: string;
  status: 'completed' | 'pending';
}

export interface AdminWalletState {
  metrics: AdminFeeMetrics;
  transactions: AdminFeeTransaction[];
  isLoading: boolean;
  refreshMetrics: () => Promise<void>;
  getDailyTrend: () => { signUps: number; deliveries: number; fees: number }[];
  getWeeklyTrend: () => { week: string; signUps: number; deliveries: number; fees: number }[];
}

const ADMIN_WALLET_STORAGE_KEY = 'admin_wallet_data_v1';
const SIGNUP_FEE = 25; // $25 per new member signup
const DELIVERY_FEE_RATE = 0.05; // 5% of delivery value

export const [AdminWalletProvider, useAdminWallet] = createContextHook<AdminWalletState>(() => {
  const { user } = useAuth();
  const { loads } = useLoads();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [transactions, setTransactions] = useState<AdminFeeTransaction[]>([]);
  const [metrics, setMetrics] = useState<AdminFeeMetrics>({
    dailySignUps: 0,
    dailyCompletedDeliveries: 0,
    dailyFeeEarnings: 0,
    weeklySignUps: 0,
    weeklyCompletedDeliveries: 0,
    weeklyFeeEarnings: 0,
    monthlySignUps: 0,
    monthlyCompletedDeliveries: 0,
    monthlyFeeEarnings: 0,
    totalPlatformFees: 0,
    totalUsers: 0,
    totalCompletedLoads: 0,
  });

  // Load admin wallet data from storage
  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    
    const loadAdminWalletData = async () => {
      try {
        console.log('[AdminWallet] Loading admin wallet data...');
        const stored = await AsyncStorage.getItem(ADMIN_WALLET_STORAGE_KEY);
        
        if (stored) {
          const data = JSON.parse(stored);
          setTransactions(data.transactions?.map((t: any) => ({
            ...t,
            date: new Date(t.date)
          })) || []);
          setMetrics(data.metrics || generateInitialMetrics());
        } else {
          // Initialize with seed data for demo
          const seedData = generateSeedAdminData();
          setTransactions(seedData.transactions);
          setMetrics(seedData.metrics);
        }
      } catch (error) {
        console.error('[AdminWallet] Error loading admin wallet data:', error);
        // Fallback to seed data
        const seedData = generateSeedAdminData();
        setTransactions(seedData.transactions);
        setMetrics(seedData.metrics);
      } finally {
        setIsLoading(false);
      }
    };

    loadAdminWalletData();
  }, [user]);

  // Sync with loads data to calculate delivery fees
  useEffect(() => {
    if (!user || user.role !== 'admin' || !loads.length) return;

    const completedLoads = loads.filter(load => load.status === 'delivered');
    
    // Add delivery fee transactions for new completed loads
    completedLoads.forEach(load => {
      const existingTransaction = transactions.find(t => t.loadId === load.id && t.type === 'delivery_fee');
      if (!existingTransaction && load.rate) {
        const feeAmount = Math.round(load.rate * DELIVERY_FEE_RATE * 100) / 100;
        
        const newTransaction: AdminFeeTransaction = {
          id: `delivery_fee_${load.id}`,
          type: 'delivery_fee',
          amount: feeAmount,
          description: `5% delivery fee - ${load.origin?.city || 'Unknown'} to ${load.destination?.city || 'Unknown'}`,
          date: load.deliveryDate ? new Date(load.deliveryDate) : new Date(),
          loadId: load.id,
          status: 'completed',
        };

        addTransaction(newTransaction);
      }
    });
  }, [loads, user, transactions]);

  const persistAdminWalletData = useCallback(async (data: any) => {
    if (!user || user.role !== 'admin') return;
    
    try {
      await AsyncStorage.setItem(ADMIN_WALLET_STORAGE_KEY, JSON.stringify(data));
      console.log('[AdminWallet] Admin wallet data persisted successfully');
    } catch (error) {
      console.error('[AdminWallet] Error persisting admin wallet data:', error);
    }
  }, [user]);

  const addTransaction = useCallback(async (transaction: Omit<AdminFeeTransaction, 'id'>) => {
    const newTransaction: AdminFeeTransaction = {
      ...transaction,
      id: transaction.loadId ? `${transaction.type}_${transaction.loadId}` : `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    const updatedTransactions = [...transactions, newTransaction];
    setTransactions(updatedTransactions);

    // Recalculate metrics
    const updatedMetrics = calculateMetricsFromTransactions(updatedTransactions, loads);
    setMetrics(updatedMetrics);

    // Persist to storage
    await persistAdminWalletData({
      transactions: updatedTransactions,
      metrics: updatedMetrics,
    });
  }, [transactions, loads, persistAdminWalletData]);

  const refreshMetrics = useCallback(async () => {
    console.log('[AdminWallet] Refreshing metrics...');
    const updatedMetrics = calculateMetricsFromTransactions(transactions, loads);
    setMetrics(updatedMetrics);
    
    await persistAdminWalletData({
      transactions,
      metrics: updatedMetrics,
    });
    
    console.log('[AdminWallet] Metrics refreshed - Daily fees tracked');
  }, [transactions, loads, persistAdminWalletData]);

  const getDailyTrend = useCallback(() => {
    const now = new Date();
    const trends: { signUps: number; deliveries: number; fees: number }[] = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      
      const dayTransactions = transactions.filter(t => 
        t.date >= dayStart && t.date < dayEnd
      );
      
      const signUps = dayTransactions.filter(t => t.type === 'signup_fee').length;
      const deliveries = dayTransactions.filter(t => t.type === 'delivery_fee').length;
      const fees = dayTransactions.reduce((sum, t) => sum + t.amount, 0);
      
      trends.push({ signUps, deliveries, fees: Math.round(fees * 100) / 100 });
    }
    
    return trends;
  }, [transactions]);

  const getWeeklyTrend = useCallback(() => {
    const now = new Date();
    const trends: { week: string; signUps: number; deliveries: number; fees: number }[] = [];
    
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(now.getTime() - (i * 7 * 24 * 60 * 60 * 1000));
      const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      const weekTransactions = transactions.filter(t => 
        t.date >= weekStart && t.date < weekEnd
      );
      
      const signUps = weekTransactions.filter(t => t.type === 'signup_fee').length;
      const deliveries = weekTransactions.filter(t => t.type === 'delivery_fee').length;
      const fees = weekTransactions.reduce((sum, t) => sum + t.amount, 0);
      
      const weekLabel = `Week ${4 - i}`;
      trends.push({ week: weekLabel, signUps, deliveries, fees: Math.round(fees * 100) / 100 });
    }
    
    return trends;
  }, [transactions]);

  const value: AdminWalletState = useMemo(() => ({
    metrics,
    transactions,
    isLoading,
    refreshMetrics,
    getDailyTrend,
    getWeeklyTrend,
  }), [
    metrics,
    transactions,
    isLoading,
    refreshMetrics,
    getDailyTrend,
    getWeeklyTrend,
  ]);

  return value;
});

// Helper functions
function generateInitialMetrics(): AdminFeeMetrics {
  return {
    dailySignUps: 0,
    dailyCompletedDeliveries: 0,
    dailyFeeEarnings: 0,
    weeklySignUps: 0,
    weeklyCompletedDeliveries: 0,
    weeklyFeeEarnings: 0,
    monthlySignUps: 0,
    monthlyCompletedDeliveries: 0,
    monthlyFeeEarnings: 0,
    totalPlatformFees: 0,
    totalUsers: 0,
    totalCompletedLoads: 0,
  };
}

function generateSeedAdminData(): { transactions: AdminFeeTransaction[]; metrics: AdminFeeMetrics } {
  const now = new Date();
  const transactions: AdminFeeTransaction[] = [];
  
  // Generate signup fee transactions for the last 30 days
  for (let i = 0; i < 30; i++) {
    const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
    const signupsPerDay = Math.floor(Math.random() * 8) + 2; // 2-10 signups per day
    
    for (let j = 0; j < signupsPerDay; j++) {
      const signupTime = new Date(date.getTime() + (Math.random() * 24 * 60 * 60 * 1000));
      transactions.push({
        id: `signup_${i}_${j}`,
        type: 'signup_fee',
        amount: SIGNUP_FEE,
        description: `New member signup fee - User #${1000 + i * 10 + j}`,
        date: signupTime,
        userId: `user_${1000 + i * 10 + j}`,
        status: 'completed',
      });
    }
  }
  
  // Generate delivery fee transactions for the last 30 days
  for (let i = 0; i < 30; i++) {
    const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
    const deliveriesPerDay = Math.floor(Math.random() * 15) + 5; // 5-20 deliveries per day
    
    for (let j = 0; j < deliveriesPerDay; j++) {
      const deliveryTime = new Date(date.getTime() + (Math.random() * 24 * 60 * 60 * 1000));
      const loadValue = 1000 + Math.random() * 3000; // $1000-$4000 per load
      const feeAmount = Math.round(loadValue * DELIVERY_FEE_RATE * 100) / 100;
      
      transactions.push({
        id: `delivery_${i}_${j}`,
        type: 'delivery_fee',
        amount: feeAmount,
        description: `5% delivery fee - Load #${2000 + i * 20 + j} ($${loadValue.toFixed(0)})`,
        date: deliveryTime,
        loadId: `load_${2000 + i * 20 + j}`,
        status: 'completed',
      });
    }
  }
  
  // Sort transactions by date (newest first)
  transactions.sort((a, b) => b.date.getTime() - a.date.getTime());
  
  // Calculate metrics from transactions
  const metrics = calculateMetricsFromTransactions(transactions, []);
  
  return { transactions, metrics };
}

function calculateMetricsFromTransactions(transactions: AdminFeeTransaction[], loads: any[]): AdminFeeMetrics {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  // Daily metrics
  const dailyTransactions = transactions.filter(t => t.date >= today);
  const dailySignUps = dailyTransactions.filter(t => t.type === 'signup_fee').length;
  const dailyDeliveries = dailyTransactions.filter(t => t.type === 'delivery_fee').length;
  const dailyFeeEarnings = dailyTransactions.reduce((sum, t) => sum + t.amount, 0);
  
  // Weekly metrics
  const weeklyTransactions = transactions.filter(t => t.date >= weekAgo);
  const weeklySignUps = weeklyTransactions.filter(t => t.type === 'signup_fee').length;
  const weeklyDeliveries = weeklyTransactions.filter(t => t.type === 'delivery_fee').length;
  const weeklyFeeEarnings = weeklyTransactions.reduce((sum, t) => sum + t.amount, 0);
  
  // Monthly metrics
  const monthlyTransactions = transactions.filter(t => t.date >= monthAgo);
  const monthlySignUps = monthlyTransactions.filter(t => t.type === 'signup_fee').length;
  const monthlyDeliveries = monthlyTransactions.filter(t => t.type === 'delivery_fee').length;
  const monthlyFeeEarnings = monthlyTransactions.reduce((sum, t) => sum + t.amount, 0);
  
  // Total metrics
  const totalPlatformFees = transactions.reduce((sum, t) => sum + t.amount, 0);
  const totalUsers = new Set(transactions.filter(t => t.userId).map(t => t.userId)).size;
  const totalCompletedLoads = transactions.filter(t => t.type === 'delivery_fee').length;
  
  return {
    dailySignUps,
    dailyCompletedDeliveries: dailyDeliveries,
    dailyFeeEarnings: Math.round(dailyFeeEarnings * 100) / 100,
    weeklySignUps,
    weeklyCompletedDeliveries: weeklyDeliveries,
    weeklyFeeEarnings: Math.round(weeklyFeeEarnings * 100) / 100,
    monthlySignUps,
    monthlyCompletedDeliveries: monthlyDeliveries,
    monthlyFeeEarnings: Math.round(monthlyFeeEarnings * 100) / 100,
    totalPlatformFees: Math.round(totalPlatformFees * 100) / 100,
    totalUsers,
    totalCompletedLoads,
  };
}