import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Crown, Star, Check, CreditCard } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';


type MembershipTier = 'basic' | 'pro' | 'enterprise';

interface MembershipPlan {
  tier: MembershipTier;
  name: string;
  price: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  popular?: boolean;
}

export default function MembershipScreen() {
  const router = useRouter();
  const { user, updateProfile } = useAuth();


  const currentTier: MembershipTier = (user?.membershipTier as MembershipTier) || 'basic';
  const isPremium = currentTier !== 'basic';

  const plans: MembershipPlan[] = [
    {
      tier: 'basic',
      name: 'Basic',
      price: 'Free',
      description: 'Essential features for getting started',
      features: [
        'Browse available loads',
        'Basic load filtering',
        'Standard support',
        'Basic driver profile',
        'Up to 5 load applications per day'
      ]
    },
    {
      tier: 'pro',
      name: 'Pro',
      price: '$49/month',
      description: 'Advanced features for professional drivers',
      features: [
        'All Basic features',
        'Unlimited load applications',
        'Priority placement in search',
        'Advanced filtering & sorting',
        'Load alerts & notifications',
        'Priority customer support',
        'Pro badge on profile'
      ],
      highlighted: true,
      popular: true
    },
    {
      tier: 'enterprise',
      name: 'Enterprise',
      price: '$99/month',
      description: 'Complete solution for fleet operators',
      features: [
        'All Pro features',
        'Fleet management dashboard',
        'Multiple driver accounts',
        'Advanced analytics & reporting',
        'Dedicated account manager',
        'Custom integrations',
        'White-label options'
      ],
      highlighted: true
    }
  ];



  const processDowngrade = useCallback(async () => {
    try {
      await updateProfile({ membershipTier: 'basic' });
      
      Alert.alert(
        'Membership Updated',
        'You have been downgraded to Basic membership. Your premium benefits will end at the next billing cycle.',
        [{ text: 'OK', style: 'default' }]
      );
    } catch {
      Alert.alert(
        'Update Failed',
        'There was an issue updating your membership. Please try again.',
        [{ text: 'OK', style: 'default' }]
      );
    }
  }, [updateProfile]);

  const handlePlanSelection = useCallback(async (selectedTier: MembershipTier) => {
    if (selectedTier === currentTier) return;
    
    if (selectedTier !== 'basic') {
      // Navigate to payment methods with selected plan
      router.push(`/payment-methods?plan=${selectedTier}`);
    } else {
      // Downgrade to Basic
      Alert.alert(
        'Downgrade to Basic',
        'You will lose premium benefits including unlimited applications and priority placement. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Downgrade', onPress: () => processDowngrade() }
        ]
      );
    }
  }, [currentTier, router, processDowngrade]);



  return (
    <View style={styles.container} testID="membershipScreen">
      <Stack.Screen options={{ title: 'Membership', headerTitleAlign: 'center' }} />
      
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Current Status */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            {currentTier === 'enterprise' ? (
              <Crown color={theme.colors.secondary} size={24} />
            ) : currentTier === 'pro' ? (
              <Crown color={theme.colors.warning} size={24} />
            ) : (
              <Star color={theme.colors.gray} size={24} />
            )}
            <View style={styles.statusInfo}>
              <Text style={styles.statusTitle}>Current Plan</Text>
              <Text style={styles.statusPlan}>
                {currentTier === 'enterprise' ? 'Enterprise Member' : 
                 currentTier === 'pro' ? 'Pro Member' : 'Basic Member'}
              </Text>
            </View>
            {isPremium && (
              <View style={[
                styles.vipBadge,
                currentTier === 'enterprise' && { backgroundColor: theme.colors.secondary }
              ]}>
                <Text style={styles.vipBadgeText}>
                  {currentTier === 'enterprise' ? 'ENT' : 'PRO'}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.statusDescription}>
            {currentTier === 'enterprise'
              ? 'You have access to all enterprise features including fleet management and dedicated support.'
              : currentTier === 'pro'
              ? 'You have access to all pro features including unlimited applications and priority placement.'
              : 'You have access to basic load board features. Upgrade for premium benefits.'
            }
          </Text>
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
                  {plan.popular && (
                    <View style={styles.popularBadge}>
                      <Star color={theme.colors.white} size={12} />
                      <Text style={styles.popularBadgeText}>Most Popular</Text>
                    </View>
                  )}
                  <Text style={styles.planPrice}>{plan.price}</Text>
                </View>
                {currentTier === plan.tier && (
                  <View style={styles.activeBadge}>
                    <Check color={theme.colors.white} size={16} />
                    <Text style={styles.activeBadgeText}>Current</Text>
                  </View>
                )}
              </View>
              
              <Text style={styles.planDescription}>{plan.description}</Text>
              
              <View style={styles.featuresContainer}>
                {plan.features.map((feature) => (
                  <View key={feature} style={styles.featureRow}>
                    <Check color={theme.colors.success} size={16} />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>
              
              {currentTier !== plan.tier && (
                <TouchableOpacity 
                  style={[
                    styles.selectPlanButton,
                    plan.highlighted && styles.selectPlanButtonHighlighted
                  ]}
                  onPress={() => handlePlanSelection(plan.tier)}
                  testID={`selectPlan-${plan.tier}`}
                >
                  <Text style={[
                    styles.selectPlanText,
                    plan.highlighted && styles.selectPlanTextHighlighted
                  ]}>
                    {plan.tier === 'basic' ? 'Downgrade' : 'Select Plan'}
                  </Text>
                </TouchableOpacity>
              )}
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
          Premium memberships are billed monthly. You can upgrade or downgrade at any time. 
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
  popularBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: theme.colors.warning,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4 as unknown as number,
    marginBottom: 8,
  },
  popularBadgeText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.xs,
    fontWeight: '700' as const,
  },
  selectPlanButton: {
    backgroundColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center' as const,
    marginTop: theme.spacing.md,
  },
  selectPlanButtonHighlighted: {
    backgroundColor: theme.colors.primary,
  },
  selectPlanText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.gray,
  },
  selectPlanTextHighlighted: {
    color: theme.colors.white,
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
