import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from './useAuth';
import { useLoads } from './useLoads';
import { calculateLoadCostBreakdown, formatNetCurrency, formatEarningsBreakdown } from '@/utils/fuelCostCalculator';

export type TransactionType = 'earning' | 'withdrawal' | 'fee' | 'bonus' | 'fuel_advance' | 'deposit' | 'load_posting' | 'platform_fee' | 'premium_placement';

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  description: string;
  date: Date;
  loadId?: string;
  status: 'pending' | 'completed' | 'failed';
  feeAmount?: number;
  netAmount?: number;
  milesDriven?: number;
  fuelCost?: number;
  grossAmount?: number;
  costBreakdown?: {
    grossEarnings: number;
    fuelCost: number;
    platformFee: number;
    netEarnings: number;
    netPerMile: number;
  };
}

export interface MonthlyStats {
  month: string;
  year: number;
  totalLoads: number;
  totalEarnings: number;
  totalMiles: number;
  avgPerMile: number;
  totalFuelCost: number;
  netProfit: number;
  platformFees: number;
  avgNetPerMile: number;
  profitMargin: number;
}

export interface WalletState {
  balance: number;
  pendingEarnings: number;
  totalEarnings: number;
  totalWithdrawn: number;
  transactions: Transaction[];
  monthlyStats: MonthlyStats[];
  isLoading: boolean;
  withdraw: (amount: number, method: string) => Promise<void>;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<void>;
  getMonthlyStats: (month: number, year: number) => MonthlyStats | null;
  calculatePlatformFee: (amount: number) => number;
  getNetEarnings: (grossAmount: number) => number;
}

const WALLET_STORAGE_KEY = 'wallet_data_v1';
const PLATFORM_FEE_RATE = 0.03; // 3% platform fee

export const [WalletProvider, useWallet] = createContextHook<WalletState>(() => {
  const { user } = useAuth();
  const { loads } = useLoads();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const [pendingEarnings, setPendingEarnings] = useState<number>(0);
  const [totalEarnings, setTotalEarnings] = useState<number>(0);
  const [totalWithdrawn, setTotalWithdrawn] = useState<number>(0);

  // Load wallet data from storage
  useEffect(() => {
    if (!user) return;
    
    const loadWalletData = async () => {
      try {
        console.log('[Wallet] Loading wallet data for user:', user.id);
        const stored = await AsyncStorage.getItem(`${WALLET_STORAGE_KEY}_${user.id}`);
        
        if (stored) {
          const data = JSON.parse(stored);
          setTransactions(data.transactions?.map((t: any) => ({
            ...t,
            date: new Date(t.date)
          })) || []);
          setBalance(data.balance || 0);
          setPendingEarnings(data.pendingEarnings || 0);
          setTotalEarnings(data.totalEarnings || 0);
          setTotalWithdrawn(data.totalWithdrawn || 0);
        } else {
          // Initialize with seed data for demo
          const seedTransactions = generateSeedTransactions(user.role);
          setTransactions(seedTransactions);
          const seedBalance = calculateBalanceFromTransactions(seedTransactions);
          setBalance(seedBalance.available);
          setPendingEarnings(seedBalance.pending);
          setTotalEarnings(seedBalance.total);
          setTotalWithdrawn(seedBalance.withdrawn);
        }
      } catch (error) {
        console.error('[Wallet] Error loading wallet data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadWalletData();
  }, [user]);

  // PERMANENT FIX: Enhanced post-delivery analytics with comprehensive cost breakdown
  useEffect(() => {
    if (!user || !loads.length) return;

    console.log('[Wallet] 💰 PERMANENT POST-DELIVERY ANALYTICS - Checking for new completed loads');
    console.log('[Wallet] Driver:', user.name, 'ID:', user.id);
    
    const completedLoads = loads.filter(load => 
      load.status === 'delivered' && 
      load.assignedDriverId === user.id
    );
    
    console.log('[Wallet] 📊 Found', completedLoads.length, 'completed loads for analytics processing');

    // PERMANENT FIX: Enhanced post-delivery analytics with comprehensive cost breakdown
    completedLoads.forEach(load => {
      // Use functional state update to get current transactions without dependency
      setTransactions(currentTransactions => {
        const existingTransaction = currentTransactions.find(t => t.loadId === load.id);
        if (!existingTransaction && load.rate) {
          console.log('[Wallet] 💰 PERMANENT POST-DELIVERY ANALYTICS - Processing load:', load.id);
          console.log('[Wallet] Load details:', {
            id: load.id,
            rate: load.rate,
            distance: load.distance,
            origin: `${load.origin?.city}, ${load.origin?.state}`,
            destination: `${load.destination?.city}, ${load.destination?.state}`,
            deliveryDate: load.deliveryDate
          });
          
          // PERMANENT FIX: Calculate comprehensive cost breakdown including fuel
          const costBreakdown = calculateLoadCostBreakdown(load, user as any);
          
          console.log('[Wallet] 📊 PERMANENT COST BREAKDOWN:', {
            grossEarnings: costBreakdown.grossEarnings,
            fuelCost: costBreakdown.fuelCost,
            platformFee: costBreakdown.platformFee,
            netEarnings: costBreakdown.netEarnings,
            netPerMile: costBreakdown.netPerMile,
            profitMargin: ((costBreakdown.netEarnings / costBreakdown.grossEarnings) * 100).toFixed(1) + '%'
          });
          
          const newTransaction: Transaction = {
            id: `load_${load.id}`,
            amount: costBreakdown.netEarnings, // Use net earnings as the main amount
            grossAmount: costBreakdown.grossEarnings,
            type: 'earning',
            description: `${load.description || 'Load'} - ${load.origin?.city || 'Unknown'} to ${load.destination?.city || 'Unknown'}`,
            date: load.deliveryDate ? new Date(load.deliveryDate) : new Date(),
            loadId: load.id,
            status: 'completed',
            feeAmount: costBreakdown.platformFee,
            netAmount: costBreakdown.netEarnings,
            milesDriven: load.distance || 0,
            fuelCost: costBreakdown.fuelCost,
            costBreakdown: {
              grossEarnings: costBreakdown.grossEarnings,
              fuelCost: costBreakdown.fuelCost,
              platformFee: costBreakdown.platformFee,
              netEarnings: costBreakdown.netEarnings,
              netPerMile: costBreakdown.netPerMile,
            },
          };

          const updatedTransactions = [...currentTransactions, newTransaction];
          
          // PERMANENT FIX: Recalculate balances and persist with enhanced analytics
          const balances = calculateBalanceFromTransactions(updatedTransactions);
          setBalance(balances.available);
          setPendingEarnings(balances.pending);
          setTotalEarnings(balances.total);
          setTotalWithdrawn(balances.withdrawn);

          console.log('[Wallet] 💰 PERMANENT WALLET UPDATE:', {
            newBalance: balances.available,
            totalEarnings: balances.total,
            transactionCount: updatedTransactions.length,
            latestTransaction: {
              id: newTransaction.id,
              netAmount: newTransaction.netAmount,
              fuelCost: newTransaction.fuelCost,
              profitMargin: newTransaction.costBreakdown ? 
                ((newTransaction.costBreakdown.netEarnings / newTransaction.costBreakdown.grossEarnings) * 100).toFixed(1) + '%' : 'N/A'
            }
          });

          // PERMANENT FIX: Persist to multiple storage locations for reliability
          if (user) {
            const walletData = {
              transactions: updatedTransactions,
              balance: balances.available,
              pendingEarnings: balances.pending,
              totalEarnings: balances.total,
              totalWithdrawn: balances.withdrawn,
              lastUpdated: new Date().toISOString(),
              analyticsVersion: '2.0-permanent'
            };
            
            // Store in multiple locations for data recovery
            const storagePromises = [
              AsyncStorage.setItem(`${WALLET_STORAGE_KEY}_${user.id}`, JSON.stringify(walletData)),
              AsyncStorage.setItem(`wallet:backup:${user.id}`, JSON.stringify(walletData)),
              AsyncStorage.setItem(`analytics:wallet:${user.id}`, JSON.stringify(walletData)),
              AsyncStorage.setItem(`post-delivery:${load.id}`, JSON.stringify(newTransaction))
            ];
            
            Promise.allSettled(storagePromises).then(results => {
              const successful = results.filter(r => r.status === 'fulfilled').length;
              console.log('[Wallet] ✅ PERMANENT PERSISTENCE - Saved to', successful, 'of', results.length, 'storage locations');
            }).catch(error => {
              console.error('[Wallet] ❌ PERMANENT PERSISTENCE - Error persisting wallet data:', error);
            });
          }
          
          return updatedTransactions;
        }
        return currentTransactions;
      });
    });
  }, [loads, user]); // FIXED: Removed transactions from dependencies

  const persistWalletData = useCallback(async (data: any) => {
    if (!user) return;
    
    try {
      await AsyncStorage.setItem(`${WALLET_STORAGE_KEY}_${user.id}`, JSON.stringify(data));
      console.log('[Wallet] Data persisted successfully');
    } catch (error) {
      console.error('[Wallet] Error persisting wallet data:', error);
    }
  }, [user]);

  const calculatePlatformFee = useCallback((amount: number): number => {
    return Math.round(amount * PLATFORM_FEE_RATE * 100) / 100;
  }, []);

  const getNetEarnings = useCallback((grossAmount: number): number => {
    return grossAmount - calculatePlatformFee(grossAmount);
  }, [calculatePlatformFee]);

  const addTransaction = useCallback(async (transaction: Omit<Transaction, 'id'>) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: transaction.loadId || `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    const updatedTransactions = [...transactions, newTransaction];
    setTransactions(updatedTransactions);

    // Recalculate balances
    const balances = calculateBalanceFromTransactions(updatedTransactions);
    setBalance(balances.available);
    setPendingEarnings(balances.pending);
    setTotalEarnings(balances.total);
    setTotalWithdrawn(balances.withdrawn);

    // Persist to storage
    await persistWalletData({
      transactions: updatedTransactions,
      balance: balances.available,
      pendingEarnings: balances.pending,
      totalEarnings: balances.total,
      totalWithdrawn: balances.withdrawn,
    });
  }, [transactions, persistWalletData]);

  const withdraw = useCallback(async (amount: number, method: string) => {
    if (amount > balance) {
      throw new Error('Insufficient balance');
    }

    const withdrawalTransaction: Transaction = {
      id: `withdrawal_${Date.now()}`,
      amount: -amount,
      type: 'withdrawal',
      description: `Withdrawal to ${method}`,
      date: new Date(),
      status: 'pending',
    };

    await addTransaction(withdrawalTransaction);
  }, [balance, addTransaction]);

  const monthlyStats = useMemo((): MonthlyStats[] => {
    const statsMap = new Map<string, MonthlyStats>();

    transactions.forEach(transaction => {
      const date = transaction.date;
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      
      if (!statsMap.has(key)) {
        statsMap.set(key, {
          month: date.toLocaleString('default', { month: 'long' }),
          year: date.getFullYear(),
          totalLoads: 0,
          totalEarnings: 0,
          totalMiles: 0,
          avgPerMile: 0,
          totalFuelCost: 0,
          netProfit: 0,
          platformFees: 0,
          avgNetPerMile: 0,
          profitMargin: 0,
        });
      }

      const stats = statsMap.get(key)!;
      
      if (transaction.type === 'earning') {
        stats.totalLoads += 1;
        stats.totalEarnings += transaction.grossAmount || transaction.amount;
        stats.totalMiles += transaction.milesDriven || 0;
        stats.totalFuelCost += transaction.fuelCost || 0;
        stats.platformFees += transaction.feeAmount || 0;
        stats.netProfit += transaction.netAmount || transaction.amount;
      }
    });

    // Calculate averages and profit margins
    statsMap.forEach(stats => {
      if (stats.totalMiles > 0) {
        stats.avgPerMile = Math.round((stats.totalEarnings / stats.totalMiles) * 100) / 100;
        stats.avgNetPerMile = Math.round((stats.netProfit / stats.totalMiles) * 100) / 100;
      }
      if (stats.totalEarnings > 0) {
        stats.profitMargin = Math.round((stats.netProfit / stats.totalEarnings) * 100 * 100) / 100;
      }
    });

    return Array.from(statsMap.values()).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return new Date(`${a.month} 1, ${a.year}`).getMonth() - new Date(`${b.month} 1, ${b.year}`).getMonth();
    });
  }, [transactions]);

  const getMonthlyStats = useCallback((month: number, year: number): MonthlyStats | null => {
    return monthlyStats.find(stats => 
      stats.year === year && 
      new Date(`${stats.month} 1, ${stats.year}`).getMonth() === month
    ) || null;
  }, [monthlyStats]);

  const value: WalletState = useMemo(() => ({
    balance,
    pendingEarnings,
    totalEarnings,
    totalWithdrawn,
    transactions,
    monthlyStats,
    isLoading,
    withdraw,
    addTransaction,
    getMonthlyStats,
    calculatePlatformFee,
    getNetEarnings,
  }), [
    balance,
    pendingEarnings,
    totalEarnings,
    totalWithdrawn,
    transactions,
    monthlyStats,
    isLoading,
    withdraw,
    addTransaction,
    getMonthlyStats,
    calculatePlatformFee,
    getNetEarnings,
  ]);

  return value;
});

// Helper functions
function generateSeedTransactions(userRole?: string): Transaction[] {
  const now = new Date();
  const transactions: Transaction[] = [];
  
  if (userRole === 'shipper') {
    // Generate shipper expense transactions
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getTime() - (i * 2 * 24 * 60 * 60 * 1000)); // Every 2 days
      const expenseAmount = 25 + Math.random() * 75; // $25-$100 per load posting
      
      transactions.push({
        id: `expense_${i}`,
        amount: -Math.round(expenseAmount * 100) / 100,
        type: 'load_posting',
        description: `Load posting fee - ${getRandomCity()} to ${getRandomCity()}`,
        date,
        status: 'completed',
        feeAmount: Math.round(expenseAmount * 100) / 100,
      });
    }
    
    // Add platform fees
    for (let i = 0; i < 8; i++) {
      const date = new Date(now.getTime() - (i * 4 * 24 * 60 * 60 * 1000)); // Every 4 days
      const feeAmount = 15 + Math.random() * 35; // $15-$50
      
      transactions.push({
        id: `platform_fee_${i}`,
        amount: -Math.round(feeAmount * 100) / 100,
        type: 'platform_fee',
        description: `Platform service fee - Load #${1000 + i}`,
        date,
        status: 'completed',
        feeAmount: Math.round(feeAmount * 100) / 100,
      });
    }
    
    // Add premium placement fees
    for (let i = 0; i < 5; i++) {
      const date = new Date(now.getTime() - (i * 7 * 24 * 60 * 60 * 1000)); // Weekly
      const premiumAmount = 50 + Math.random() * 100; // $50-$150
      
      transactions.push({
        id: `premium_${i}`,
        amount: -Math.round(premiumAmount * 100) / 100,
        type: 'premium_placement',
        description: `Premium load placement - Featured listing`,
        date,
        status: 'completed',
        feeAmount: Math.round(premiumAmount * 100) / 100,
      });
    }
    
    // Add some deposits (money added to account)
    transactions.push({
      id: 'deposit_1',
      amount: 1000,
      type: 'deposit',
      description: 'Account funding - Bank transfer',
      date: new Date(now.getTime() - (10 * 24 * 60 * 60 * 1000)),
      status: 'completed',
    });
    
    transactions.push({
      id: 'deposit_2',
      amount: 500,
      type: 'deposit',
      description: 'Account funding - Credit card',
      date: new Date(now.getTime() - (20 * 24 * 60 * 60 * 1000)),
      status: 'completed',
    });
    
  } else {
    // Generate driver earning transactions (existing logic)
    for (let i = 0; i < 15; i++) {
      const date = new Date(now.getTime() - (i * 3 * 24 * 60 * 60 * 1000)); // Every 3 days
      const grossAmount = 1200 + Math.random() * 2000; // $1200-$3200
      const platformFee = Math.round(grossAmount * PLATFORM_FEE_RATE * 100) / 100;
      const miles = 300 + Math.random() * 500; // 300-800 miles
      const fuelCost = miles * (3.5 + Math.random() * 1.5) * 0.15; // Rough fuel cost calculation
      const netAmount = grossAmount - platformFee - fuelCost;
      const netPerMile = miles > 0 ? netAmount / miles : 0;
      
      transactions.push({
        id: `seed_${i}`,
        amount: Math.round(netAmount * 100) / 100, // Use net as main amount
        grossAmount,
        type: 'earning',
        description: `Load ${i + 1} - ${getRandomCity()} to ${getRandomCity()}`,
        date,
        status: 'completed',
        feeAmount: platformFee,
        netAmount: Math.round(netAmount * 100) / 100,
        milesDriven: Math.round(miles),
        fuelCost: Math.round(fuelCost * 100) / 100,
        costBreakdown: {
          grossEarnings: grossAmount,
          fuelCost: Math.round(fuelCost * 100) / 100,
          platformFee,
          netEarnings: Math.round(netAmount * 100) / 100,
          netPerMile: Math.round(netPerMile * 100) / 100,
        },
      });
    }
    
    // Add some withdrawals
    transactions.push({
      id: 'withdrawal_1',
      amount: -2500,
      type: 'withdrawal',
      description: 'Bank Transfer - Chase Checking',
      date: new Date(now.getTime() - (5 * 24 * 60 * 60 * 1000)),
      status: 'completed',
    });
    
    transactions.push({
      id: 'withdrawal_2',
      amount: -1800,
      type: 'withdrawal',
      description: 'Bank Transfer - Chase Checking',
      date: new Date(now.getTime() - (12 * 24 * 60 * 60 * 1000)),
      status: 'completed',
    });
  }
  
  return transactions.sort((a, b) => b.date.getTime() - a.date.getTime());
}

function calculateBalanceFromTransactions(transactions: Transaction[]) {
  let available = 0;
  let pending = 0;
  let total = 0;
  let withdrawn = 0;
  
  transactions.forEach(transaction => {
    if (transaction.type === 'earning') {
      total += transaction.grossAmount || transaction.amount;
      if (transaction.status === 'completed') {
        available += transaction.netAmount || transaction.amount;
      } else {
        pending += transaction.netAmount || transaction.amount;
      }
    } else if (transaction.type === 'withdrawal') {
      if (transaction.status === 'completed') {
        available += transaction.amount; // Amount is negative
        withdrawn += Math.abs(transaction.amount);
      } else {
        pending += transaction.amount; // Pending withdrawal
      }
    } else if (transaction.type === 'fee' || transaction.type === 'load_posting' || transaction.type === 'platform_fee' || transaction.type === 'premium_placement') {
      if (transaction.status === 'completed') {
        available += transaction.amount; // Amount is negative for expenses
        total += Math.abs(transaction.amount); // Track total expenses
      } else {
        pending += transaction.amount; // Pending expense
      }
    } else if (transaction.type === 'deposit') {
      if (transaction.status === 'completed') {
        available += transaction.amount; // Amount is positive for deposits
      } else {
        pending += transaction.amount; // Pending deposit
      }
    }
  });
  
  return {
    available: Math.round(available * 100) / 100,
    pending: Math.round(pending * 100) / 100,
    total: Math.round(total * 100) / 100,
    withdrawn: Math.round(withdrawn * 100) / 100,
  };
}

function getRandomCity(): string {
  const cities = [
    'Los Angeles, CA',
    'Phoenix, AZ',
    'Dallas, TX',
    'Houston, TX',
    'Atlanta, GA',
    'Miami, FL',
    'Chicago, IL',
    'Denver, CO',
    'Las Vegas, NV',
    'Seattle, WA',
  ];
  return cities[Math.floor(Math.random() * cities.length)];
}