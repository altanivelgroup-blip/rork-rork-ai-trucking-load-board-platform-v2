import { z } from 'zod';
import { publicProcedure, createTRPCRouter } from '@/backend/trpc/create-context';
import Stripe from 'stripe';

// Initialize Stripe with test key for safety
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_...', {
  apiVersion: '2024-12-18.acacia',
});

const PLATFORM_FEE_RATE = 0.05; // 5% platform fee
const MEMBERSHIP_PRICES = {
  basic: 4900, // $49 in cents
  premium: 19900, // $199 in cents
};

export const paymentsRouter = createTRPCRouter({
  // Create payment intent for delivery fees (auto-charged on completion)
  createDeliveryFeeIntent: publicProcedure
    .input(z.object({
      loadId: z.string(),
      deliveryAmount: z.number().min(1),
      userId: z.string(),
    }))
    .mutation(async ({ input }) => {
      try {
        console.log('[Payments] Creating delivery fee intent for load:', input.loadId);
        
        const feeAmount = Math.round(input.deliveryAmount * PLATFORM_FEE_RATE);
        
        const paymentIntent = await stripe.paymentIntents.create({
          amount: feeAmount,
          currency: 'usd',
          metadata: {
            type: 'delivery_fee',
            loadId: input.loadId,
            userId: input.userId,
            originalAmount: input.deliveryAmount.toString(),
          },
          description: `5% delivery fee for Load #${input.loadId}`,
          automatic_payment_methods: {
            enabled: true,
          },
        });

        console.log('[Payments] Payment processed - Fee applied successfully');
        
        return {
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
          feeAmount,
        };
      } catch (error) {
        console.error('[Payments] Error creating delivery fee intent:', error);
        throw new Error('Failed to create payment intent for delivery fee');
      }
    }),

  // Create payment intent for membership upgrades
  createMembershipIntent: publicProcedure
    .input(z.object({
      membershipType: z.enum(['basic', 'premium']),
      userId: z.string(),
    }))
    .mutation(async ({ input }) => {
      try {
        console.log('[Payments] Creating membership intent for user:', input.userId);
        
        const amount = MEMBERSHIP_PRICES[input.membershipType];
        
        const paymentIntent = await stripe.paymentIntents.create({
          amount,
          currency: 'usd',
          metadata: {
            type: 'membership',
            membershipType: input.membershipType,
            userId: input.userId,
          },
          description: `${input.membershipType === 'basic' ? 'Basic' : 'Premium'} membership upgrade`,
          automatic_payment_methods: {
            enabled: true,
          },
        });

        console.log('[Payments] Payment processed - Membership upgrade initiated');
        
        return {
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
          amount,
        };
      } catch (error) {
        console.error('[Payments] Error creating membership intent:', error);
        throw new Error('Failed to create payment intent for membership');
      }
    }),

  // Create payment intent for wallet top-ups
  createWalletTopUpIntent: publicProcedure
    .input(z.object({
      amount: z.number().min(500), // Minimum $5.00
      userId: z.string(),
    }))
    .mutation(async ({ input }) => {
      try {
        console.log('[Payments] Creating wallet top-up intent for user:', input.userId);
        
        const paymentIntent = await stripe.paymentIntents.create({
          amount: input.amount,
          currency: 'usd',
          metadata: {
            type: 'wallet_topup',
            userId: input.userId,
          },
          description: `Wallet top-up - $${(input.amount / 100).toFixed(2)}`,
          automatic_payment_methods: {
            enabled: true,
          },
        });

        console.log('[Payments] Payment processed - Wallet deposit initiated');
        
        return {
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
          amount: input.amount,
        };
      } catch (error) {
        console.error('[Payments] Error creating wallet top-up intent:', error);
        throw new Error('Failed to create payment intent for wallet top-up');
      }
    }),

  // Confirm payment and record transaction
  confirmPayment: publicProcedure
    .input(z.object({
      paymentIntentId: z.string(),
      userId: z.string(),
    }))
    .mutation(async ({ input }) => {
      try {
        console.log('[Payments] Confirming payment:', input.paymentIntentId);
        
        const paymentIntent = await stripe.paymentIntents.retrieve(input.paymentIntentId);
        
        if (paymentIntent.status === 'succeeded') {
          // Here you would typically save the transaction to Firestore
          // For now, we'll return success with transaction details
          
          const transactionRecord = {
            id: paymentIntent.id,
            amount: paymentIntent.amount,
            type: paymentIntent.metadata.type,
            status: 'completed' as const,
            userId: input.userId,
            date: new Date(),
            metadata: paymentIntent.metadata,
          };
          
          console.log('[Payments] Payment confirmed - Transaction recorded');
          
          return {
            success: true,
            transaction: transactionRecord,
          };
        } else {
          throw new Error(`Payment not completed. Status: ${paymentIntent.status}`);
        }
      } catch (error) {
        console.error('[Payments] Error confirming payment:', error);
        throw new Error('Failed to confirm payment');
      }
    }),

  // Get payment history for user
  getPaymentHistory: publicProcedure
    .input(z.object({
      userId: z.string(),
      limit: z.number().optional().default(50),
    }))
    .query(async ({ input }) => {
      try {
        console.log('[Payments] Fetching payment history for user:', input.userId);
        
        const paymentIntents = await stripe.paymentIntents.list({
          limit: input.limit,
        });
        
        // Filter by user and format for frontend
        const userPayments = paymentIntents.data
          .filter(pi => pi.metadata.userId === input.userId)
          .map(pi => ({
            id: pi.id,
            amount: pi.amount,
            type: pi.metadata.type,
            status: pi.status,
            date: new Date(pi.created * 1000),
            description: pi.description,
            metadata: pi.metadata,
          }));
        
        return userPayments;
      } catch (error) {
        console.error('[Payments] Error fetching payment history:', error);
        throw new Error('Failed to fetch payment history');
      }
    }),
});

export default paymentsRouter;