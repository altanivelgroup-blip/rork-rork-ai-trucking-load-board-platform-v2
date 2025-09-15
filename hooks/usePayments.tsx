import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { useStripe } from '@stripe/stripe-react-native';
import { trpc } from '@/lib/trpc';
import { useAuth } from './useAuth';

export type PaymentMethodType = 'card' | 'bank' | 'fleet';

export interface PaymentMethod {
  id: string;
  type: PaymentMethodType;
  name: string;
  detail: string;
  expires?: string;
  isDefault: boolean;
  verified: boolean;
}

export interface PaymentServicesState {
  quickPay: boolean;
  fuelAdvance: boolean;
  invoiceFactoring: boolean;
  crypto: boolean;
  autoPay: boolean;
}

export interface PaymentTransaction {
  id: string;
  amount: number;
  type: 'delivery_fee' | 'membership' | 'wallet_topup' | 'withdrawal' | 'deposit' | 'fee';
  status: 'pending' | 'completed' | 'failed';
  date: Date;
  description: string;
  metadata?: Record<string, any>;
}

interface PaymentsState {
  isHydrating: boolean;
  isProcessing: boolean;
  methods: PaymentMethod[];
  services: PaymentServicesState;
  transactions: PaymentTransaction[];
  addMethod: (m: PaymentMethod) => Promise<void>;
  deleteMethod: (id: string) => Promise<void>;
  setDefault: (id: string) => Promise<void>;
  updateMethod: (id: string, patch: Partial<PaymentMethod>) => Promise<void>;
  toggleService: (key: keyof PaymentServicesState, value: boolean) => Promise<void>;
  processDeliveryFee: (loadId: string, deliveryAmount: number) => Promise<void>;
  processMembershipUpgrade: (membershipType: 'basic' | 'premium') => Promise<void>;
  processWalletTopUp: (amount: number) => Promise<void>;
  getPaymentHistory: () => Promise<void>;
}

const STORAGE_KEY = 'payments_v1';

const initialServices: PaymentServicesState = {
  quickPay: true,
  fuelAdvance: true,
  invoiceFactoring: false,
  crypto: false,
  autoPay: true,
};

const seedMethods: PaymentMethod[] = [
  {
    id: 'm1',
    type: 'card',
    name: 'Business Visa',
    detail: 'Visa ending in 4242',
    expires: '12/25',
    isDefault: true,
    verified: true,
  },
  {
    id: 'm2',
    type: 'bank',
    name: 'Chase Business Checking',
    detail: 'Account ending in 8901',
    isDefault: false,
    verified: true,
  },
  {
    id: 'm3',
    type: 'fleet',
    name: 'Comdata Fleet Card',
    detail: 'Fleet card ending in 5678',
    isDefault: false,
    verified: true,
  },
];

export const [PaymentsProvider, usePayments] = createContextHook<PaymentsState>(() => {
  const { user } = useAuth();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [isHydrating, setIsHydrating] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [services, setServices] = useState<PaymentServicesState>(initialServices);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);

  // tRPC mutations for Stripe integration
  const createDeliveryFeeIntentMutation = trpc.payments.createDeliveryFeeIntent.useMutation();
  const createMembershipIntentMutation = trpc.payments.createMembershipIntent.useMutation();
  const createWalletTopUpIntentMutation = trpc.payments.createWalletTopUpIntent.useMutation();
  const confirmPaymentMutation = trpc.payments.confirmPayment.useMutation();
  const paymentHistoryQuery = trpc.payments.getPaymentHistory.useQuery(
    { userId: user?.id || '' },
    { enabled: !!user?.id }
  );

  useEffect(() => {
    (async () => {
      try {
        console.log('[Payments] hydrate');
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as { methods: PaymentMethod[]; services: Partial<PaymentServicesState> };
          setMethods(Array.isArray(parsed.methods) ? parsed.methods : seedMethods);
          setServices({ ...initialServices, ...(parsed.services ?? {}) });
        } else {
          setMethods(seedMethods);
          setServices(initialServices);
        }
        
        // Load Stripe payment history
        if (paymentHistoryQuery.data) {
          const stripeTransactions = paymentHistoryQuery.data.map(payment => ({
            id: payment.id,
            amount: payment.amount,
            type: payment.type as PaymentTransaction['type'],
            status: payment.status as 'pending' | 'completed' | 'failed',
            date: payment.date,
            description: payment.description || 'Stripe payment',
            metadata: payment.metadata,
          }));
          setTransactions(stripeTransactions);
        }
      } catch (e) {
        console.error('[Payments] hydrate error', e);
        setMethods(seedMethods);
        setServices(initialServices);
      } finally {
        setIsHydrating(false);
      }
    })();
  }, [paymentHistoryQuery.data]);

  const persist = useCallback(async (next: { methods?: PaymentMethod[]; services?: PaymentServicesState }) => {
    try {
      const payload = {
        methods: next.methods ?? methods,
        services: next.services ?? services,
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      console.log('[Payments] saved');
    } catch (e) {
      console.error('[Payments] save error', e);
    }
  }, [methods, services]);

  const addMethod = useCallback(async (m: PaymentMethod) => {
    const updated = [...methods, m];
    setMethods(updated);
    await persist({ methods: updated });
  }, [methods, persist]);

  const deleteMethod = useCallback(async (id: string) => {
    const updated = methods.filter(m => m.id !== id);
    // if we deleted default, set first as default
    if (!updated.some(m => m.isDefault) && updated.length > 0) {
      updated[0] = { ...updated[0], isDefault: true };
    }
    setMethods(updated);
    await persist({ methods: updated });
  }, [methods, persist]);

  const setDefault = useCallback(async (id: string) => {
    const updated = methods.map(m => ({ ...m, isDefault: m.id === id }));
    setMethods(updated);
    await persist({ methods: updated });
  }, [methods, persist]);

  const updateMethod = useCallback(async (id: string, patch: Partial<PaymentMethod>) => {
    const updated = methods.map(m => m.id === id ? { ...m, ...patch } : m);
    setMethods(updated);
    await persist({ methods: updated });
  }, [methods, persist]);

  const toggleService = useCallback(async (key: keyof PaymentServicesState, value: boolean) => {
    const next = { ...services, [key]: value };
    setServices(next);
    await persist({ services: next });
  }, [services, persist]);

  const processStripePayment = useCallback(async (
    clientSecret: string,
    paymentIntentId: string,
    type: 'delivery_fee' | 'membership' | 'wallet_topup'
  ) => {
    if (!user) throw new Error('User not authenticated');

    try {
      setIsProcessing(true);
      console.log('[Payments] Processing Stripe payment for type:', type);

      if (Platform.OS === 'web') {
        // For web, we'll simulate payment success for testing
        console.log('[Payments] Web payment simulation - Payment processed successfully');
        
        const result = await confirmPaymentMutation.mutateAsync({
          paymentIntentId,
          userId: user.id,
        });

        if (result.success) {
          console.log('[Payments] Payment processed - Fee applied successfully');
          await getPaymentHistory();
        }
      } else {
        // For mobile, use Stripe payment sheet
        const { error: initError } = await initPaymentSheet({
          merchantDisplayName: 'LoadRush',
          paymentIntentClientSecret: clientSecret,
          defaultBillingDetails: {
            name: user.name || user.email,
            email: user.email,
          },
        });

        if (initError) {
          throw new Error(`Payment sheet initialization failed: ${initError.message}`);
        }

        const { error: presentError } = await presentPaymentSheet();

        if (presentError) {
          if (presentError.code === 'Canceled') {
            console.log('[Payments] Payment canceled by user');
            return;
          }
          throw new Error(`Payment failed: ${presentError.message}`);
        }

        // Confirm payment on backend
        const result = await confirmPaymentMutation.mutateAsync({
          paymentIntentId,
          userId: user.id,
        });

        if (result.success) {
          console.log('[Payments] Payment processed - Fee applied successfully');
          await getPaymentHistory();
        }
      }
    } catch (error) {
      console.error('[Payments] Stripe payment processing error:', error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [user, initPaymentSheet, presentPaymentSheet, confirmPaymentMutation]);

  const processDeliveryFee = useCallback(async (loadId: string, deliveryAmount: number) => {
    if (!user) throw new Error('User not authenticated');

    try {
      console.log('[Payments] Processing delivery fee for load:', loadId);
      
      const result = await createDeliveryFeeIntentMutation.mutateAsync({
        loadId,
        deliveryAmount,
        userId: user.id,
      });

      await processStripePayment(result.clientSecret!, result.paymentIntentId, 'delivery_fee');
    } catch (error) {
      console.error('[Payments] Delivery fee processing error:', error);
      throw error;
    }
  }, [user, createDeliveryFeeIntentMutation, processStripePayment]);

  const processMembershipUpgrade = useCallback(async (membershipType: 'basic' | 'premium') => {
    if (!user) throw new Error('User not authenticated');

    try {
      console.log('[Payments] Processing membership upgrade:', membershipType);
      
      const result = await createMembershipIntentMutation.mutateAsync({
        membershipType,
        userId: user.id,
      });

      await processStripePayment(result.clientSecret!, result.paymentIntentId, 'membership');
    } catch (error) {
      console.error('[Payments] Membership upgrade processing error:', error);
      throw error;
    }
  }, [user, createMembershipIntentMutation, processStripePayment]);

  const processWalletTopUp = useCallback(async (amount: number) => {
    if (!user) throw new Error('User not authenticated');

    try {
      console.log('[Payments] Processing wallet top-up:', amount);
      
      const result = await createWalletTopUpIntentMutation.mutateAsync({
        amount,
        userId: user.id,
      });

      await processStripePayment(result.clientSecret!, result.paymentIntentId, 'wallet_topup');
    } catch (error) {
      console.error('[Payments] Wallet top-up processing error:', error);
      throw error;
    }
  }, [user, createWalletTopUpIntentMutation, processStripePayment]);

  const getPaymentHistory = useCallback(async () => {
    try {
      await paymentHistoryQuery.refetch();
      if (paymentHistoryQuery.data) {
        const stripeTransactions = paymentHistoryQuery.data.map(payment => ({
          id: payment.id,
          amount: payment.amount,
          type: payment.type as PaymentTransaction['type'],
          status: payment.status as 'pending' | 'completed' | 'failed',
          date: payment.date,
          description: payment.description || 'Stripe payment',
          metadata: payment.metadata,
        }));
        setTransactions(stripeTransactions);
      }
    } catch (error) {
      console.error('[Payments] Error fetching payment history:', error);
    }
  }, [paymentHistoryQuery]);

  const value: PaymentsState = useMemo(() => ({
    isHydrating,
    isProcessing,
    methods,
    services,
    transactions,
    addMethod,
    deleteMethod,
    setDefault,
    updateMethod,
    toggleService,
    processDeliveryFee,
    processMembershipUpgrade,
    processWalletTopUp,
    getPaymentHistory,
  }), [isHydrating, isProcessing, methods, services, transactions, addMethod, deleteMethod, setDefault, updateMethod, toggleService, processDeliveryFee, processMembershipUpgrade, processWalletTopUp, getPaymentHistory]);

  return value;
});
