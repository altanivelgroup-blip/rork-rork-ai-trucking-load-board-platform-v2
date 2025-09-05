import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Crown, Star, Check, CreditCard } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { usePayments } from '@/hooks/usePayments';

type MembershipTier = 'basic' | 'vip';

interface MembershipPlan {
  tier: MembershipTier;
  name: string;
  price: string;
  description: string;
  features: string[];
  highlighted?: boolean;
}

export default function MembershipScreen() {
  const router = useRouter();
  const { user, updateProfile } = useAuth();
  const { methods } = usePayments();
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const currentTier: MembershipTier = user?.membershipTier === 'pro' || user?.membershipTier === 'business' ? 'vip' : 'basic';
  const isVip = currentTier === 'vip';

  const plans: MembershipPlan[] = [
    {
      tier: 'basic',
      name: 'Basic',
      price: 'Free',
      description: 'Access to loads with standard features',
      features: [
        'Browse available loads',
        'Basic load filtering',
        'Standard support',
        'Basic driver profile'
      ]
    },
    {
      tier: 'vip',
      name: 'VIP',
      price: '$10/month',
      description: 'Premium features with priority access',
      features: [
        'All Basic features',
        'Highlighted loads',
        'Priority placement in search',
        'Advanced filtering options',
        'Priority customer support',
        'VIP badge on profile'
      ],
      highlighted: true
    }
  ];

  const processUpgrade = useCallback(async () => {
    setIsProcessing(true);
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Update user profile to VIP
      await updateProfile({ membershipTier: 'pro' });
      
      Alert.alert(
        'Welcome to VIP!',
        'Your membership has been upgraded. You now have access to highlighted loads and priority placement.',
        [{ text: 'Great!', style: 'default' }]
      );
    } catch {
      Alert.alert(
        'Upgrade Failed',
        'There was an issue processing your payment. Please try again.',
        [{ text: 'OK', style: 'default' }]
      );
    } finally {
      setIsProcessing(false);
    }
  }, [updateProfile]);

  const processDowngrade = useCallback(async () => {
    setIsProcessing(true);
    try {
      await updateProfile({ membershipTier: 'basic' });
      
      Alert.alert(
        'Membership Updated',
        'You have been downgraded to Basic membership. Your VIP benefits will end at the next billing cycle.',
        [{ text: 'OK', style: 'default' }]
      );
    } catch {
      Alert.alert(
        'Update Failed',
        'There was an issue updating your membership. Please try again.',
        [{ text: 'OK', style: 'default' }]
      );
    } finally {
      setIsProcessing(false);
    }
  }, [updateProfile]);

  const handleMembershipToggle = useCallback(async (newTier: MembershipTier) => {
    if (newTier === currentTier) return;
    
    if (newTier === 'vip') {
      // Check if user has payment methods
      if (methods.length === 0) {
        Alert.alert(
          'Payment Method Required',
          'Please add a payment method before upgrading to VIP membership.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Add Payment Method', onPress: () => router.push('/payment-methods') }
          ]
        );
        return;
      }

      // Show confirmation for VIP upgrade
      Alert.alert(
        'Upgrade to VIP',
        'You will be charged $10/month for VIP membership. This includes highlighted loads, priority placement, and premium support.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade', onPress: () => processUpgrade() }
        ]
      );
    } else {
      // Downgrade to Basic
      Alert.alert(
        'Downgrade to Basic',
        'You will lose VIP benefits including highlighted loads and priority placement. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Downgrade', onPress: () => processDowngrade() }
        ]
      );
    }
  }, [currentTier, methods.length, router, processUpgrade, processDowngrade]);



  return (
    <View style={styles.container} testID="membershipScreen">
      <Stack.Screen options={{ title: 'Membership', headerTitleAlign: 'center' }} />
      
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Current Status */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            {isVip ? (
              <Crown color={theme.colors.warning} size={24} />
            ) : (
              <Star color={theme.colors.gray} size={24} />
            )}
            <View style={styles.statusInfo}>
              <Text style={styles.statusTitle}>Current Plan</Text>
              <Text style={styles.statusPlan}>
                {isVip ? 'VIP Member' : 'Basic Member'}
              </Text>
            </View>
            {isVip && (
              <View style={styles.vipBadge}>
                <Text style={styles.vipBadgeText}>VIP</Text>
              </View>
            )}
          </View>
          <Text style={styles.statusDescription}>
            {isVip 
              ? 'You have access to all premium features including highlighted loads and priority placement.'
              : 'You have access to basic load board features. Upgrade to VIP for premium benefits.'
            }
          </Text>
        </View>

        {/* Membership Toggle */}
        <View style={styles.toggleCard}>
          <Text style={styles.sectionTitle}>Membership Options</Text>
          
          <View style={styles.toggleContainer}>
            <View style={styles.toggleOption}>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleTitle}>Basic</Text>
                <Text style={styles.togglePrice}>Free</Text>
              </View>
              <Switch
                testID="basicToggle"
                value={!isVip}
                onValueChange={() => handleMembershipToggle('basic')}
                disabled={isProcessing}
                thumbColor={Platform.OS === 'android' ? (!isVip ? theme.colors.white : '#f4f3f4') : undefined}
                trackColor={{ false: '#D1D5DB', true: theme.colors.primary }}
              />
            </View>
            
            <View style={styles.toggleOption}>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleTitle}>VIP</Text>
                <Text style={styles.togglePrice}>$10/month</Text>
              </View>
              <Switch
                testID="vipToggle"
                value={isVip}
                onValueChange={() => handleMembershipToggle('vip')}
                disabled={isProcessing}
                thumbColor={Platform.OS === 'android' ? (isVip ? theme.colors.white : '#f4f3f4') : undefined}
                trackColor={{ false: '#D1D5DB', true: theme.colors.warning }}
              />
            </View>
          </View>
        </View>

        {/* Plan Comparison */}
        <View style={styles.plansContainer}>
          <Text style={styles.sectionTitle}>Plan Comparison</Text>
          
          {plans.map((plan) => (
            <View key={plan.tier} style={[
              styles.planCard,
              plan.highlighted && styles.planCardHighlighted,
              currentTier === plan.tier && styles.planCardActive
            ]}>
              <View style={styles.planHeader}>
                <View style={styles.planTitleContainer}>
                  <Text style={styles.planName}>{plan.name}</Text>
                  <Text style={styles.planPrice}>{plan.price}</Text>
                </View>
                {currentTier === plan.tier && (
                  <View style={styles.activeBadge}>
                    <Check color={theme.colors.white} size={16} />
                    <Text style={styles.activeBadgeText}>Active</Text>
                  </View>
                )}
              </View>
              
              <Text style={styles.planDescription}>{plan.description}</Text>
              
              <View style={styles.featuresContainer}>
                {plan.features.map((feature, index) => (
                  <View key={index} style={styles.featureRow}>
                    <Check color={theme.colors.success} size={16} />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>

        {/* Payment Methods Link */}
        <TouchableOpacity 
          style={styles.paymentMethodsButton}
          onPress={() => router.push('/payment-methods')}
          testID="paymentMethodsButton"
        >
          <CreditCard color={theme.colors.primary} size={20} />
          <Text style={styles.paymentMethodsText}>Manage Payment Methods</Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          VIP membership is billed monthly. You can upgrade or downgrade at any time. 
          By upgrading, you agree to our Terms of Service and Privacy Policy.
        </Text>
      </ScrollView>
    </View>
  );
}



const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.lightGray,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl * 2,
  },
  statusCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statusHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: theme.spacing.sm,
  },
  statusInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  statusTitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginBottom: 2,
  },
  statusPlan: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700' as const,
    color: theme.colors.dark,
  },
  statusDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    lineHeight: 20,
  },
  vipBadge: {
    backgroundColor: theme.colors.warning,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  vipBadgeText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.xs,
    fontWeight: '700' as const,
  },
  toggleCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sectionTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700' as const,
    color: theme.colors.dark,
    marginBottom: theme.spacing.md,
  },
  toggleContainer: {
    gap: theme.spacing.md as unknown as number,
  },
  toggleOption: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingVertical: theme.spacing.sm,
  },
  toggleInfo: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600' as const,
    color: theme.colors.dark,
    marginBottom: 2,
  },
  togglePrice: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
  },
  plansContainer: {
    marginBottom: theme.spacing.lg,
  },
  planCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  planCardHighlighted: {
    borderColor: theme.colors.warning,
    borderWidth: 2,
  },
  planCardActive: {
    backgroundColor: '#f8fafc',
    borderColor: theme.colors.primary,
  },
  planHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: theme.spacing.sm,
  },
  planTitleContainer: {
    flex: 1,
  },
  planName: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700' as const,
    color: theme.colors.dark,
    marginBottom: 2,
  },
  planPrice: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600' as const,
    color: theme.colors.primary,
  },
  planDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginBottom: theme.spacing.md,
    lineHeight: 20,
  },
  activeBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: theme.colors.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4 as unknown as number,
  },
  activeBadgeText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.xs,
    fontWeight: '600' as const,
  },
  featuresContainer: {
    gap: theme.spacing.sm as unknown as number,
  },
  featureRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: theme.spacing.sm as unknown as number,
  },
  featureText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.dark,
    flex: 1,
  },
  paymentMethodsButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.sm as unknown as number,
  },
  paymentMethodsText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.primary,
  },
  disclaimer: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray,
    textAlign: 'center' as const,
    lineHeight: 18,
  },
});
