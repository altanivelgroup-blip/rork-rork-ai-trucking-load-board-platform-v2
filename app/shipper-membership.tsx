// app/shipper-membership.tsx
import React, { useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, TextInput, Switch, ActivityIndicator } from "react-native";
import { Stack, useRouter } from "expo-router";
import { theme } from "@/constants/theme";
import { Check, X, Star, ChevronDown, ChevronUp } from "lucide-react-native";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/Toast";
import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { db } from "@/utils/firebase";

type PlanKey = "shipper-basic" | "shipper-pro" | "shipper-enterprise";

export default function ShipperMembershipScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  const currentPlan = user?.membershipTier || 'basic';
  const showDevTools = process.env.EXPO_PUBLIC_SHOW_DEV_TOOLS === 'true';
  
  const plans = useMemo(
    () => [
      {
        key: "shipper-basic" as PlanKey,
        name: "Basic",
        price: "Free",
        highlight: null as "popular" | "value" | null,
        features: [
          { label: "Post Loads / Month", ok: true, note: "3" },
          { label: "CSV Bulk Upload", ok: false },
          { label: "Load Visibility", ok: false, note: "Standard" },
          { label: "Shipper Dashboard", ok: true, note: "Basic" },
          { label: "Driver Ratings", ok: true, note: "View Only" },
          { label: "Team Members", ok: true, note: "1" },
          { label: "Support", ok: true, note: "Standard" },
        ],
        cta: "Start with Basic",
      },
      {
        key: "shipper-pro" as PlanKey,
        name: "Pro",
        price: "$49.99/mo",
        highlight: "popular" as const,
        features: [
          { label: "Post Loads / Month", ok: true, note: "50" },
          { label: "CSV Bulk Upload", ok: true, note: "Up to 50" },
          { label: "Load Visibility", ok: true, note: "Boosted" },
          { label: "Shipper Dashboard", ok: true, note: "Advanced" },
          { label: "Driver Ratings + History", ok: true },
          { label: "Team Members", ok: true, note: "Up to 3" },
          { label: "Support", ok: true, note: "Priority" },
        ],
        cta: "Upgrade to Pro",
      },
      {
        key: "shipper-enterprise" as PlanKey,
        name: "Enterprise",
        price: "$199/mo",
        highlight: "value" as const,
        features: [
          { label: "Post Loads / Month", ok: true, note: "Unlimited" },
          { label: "CSV Bulk Upload", ok: true, note: "Unlimited" },
          { label: "Placement", ok: true, note: "Priority" },
          { label: "Account Manager", ok: true, note: "Dedicated" },
          { label: "Fleet Reporting & Analytics", ok: true },
          { label: "Team Members", ok: true, note: "Unlimited" },
          { label: "Branding", ok: true, note: "Logo + Profile" },
        ],
        cta: "Contact Sales",
      },
    ],
    []
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Shipper Membership" }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.h1}>Choose your Shipper plan</Text>
        <Text style={styles.sub}>
          CSV bulk uploads are available for Pro and Enterprise.
        </Text>

        <View style={styles.grid}>
          {plans.map((p) => {
            const planKey = p.key.replace('shipper-', '') as 'basic' | 'pro' | 'enterprise';
            const isCurrentPlan = currentPlan === planKey;
            
            return (
              <PlanCard
                key={p.key}
                name={p.name}
                price={p.price}
                highlight={p.highlight}
                features={p.features}
                cta={isCurrentPlan ? 'Current Plan' : p.cta}
                isCurrentPlan={isCurrentPlan}
                onPress={() => {
                  console.log("[ShipperMembership] choose", p.key);
                  
                  if (isCurrentPlan) {
                    // Already on this plan, just show payment methods
                    router.push('/payment-methods');
                    return;
                  }
                  
                  if (p.key === 'shipper-basic') {
                    // Basic plan is free, no payment needed
                    router.push('/payment-methods?plan=basic');
                  } else if (p.key === 'shipper-pro') {
                    // Navigate to payment methods with pro plan
                    router.push('/payment-methods?plan=pro');
                  } else if (p.key === 'shipper-enterprise') {
                    // Navigate to payment methods with enterprise plan
                    router.push('/payment-methods?plan=enterprise');
                  }
                }}
              />
            );
          })}
        </View>
        
        {showDevTools && <TestPaymentPanel />}
      </ScrollView>
    </View>
  );
}

function PlanCard({
  name,
  price,
  features,
  cta,
  highlight,
  isCurrentPlan = false,
  onPress,
}: {
  name: string;
  price: string;
  features: { label: string; ok: boolean; note?: string }[];
  cta: string;
  highlight: "popular" | "value" | null;
  isCurrentPlan?: boolean;
  onPress: () => void;
}) {
  return (
    <View style={[styles.card, highlight && styles.cardHighlight]}>
      {!!highlight && (
        <View style={[styles.ribbon, highlight === "popular" ? styles.ribbonPopular : styles.ribbonValue]}>
          <Star size={14} color="#fff" />
          <Text style={styles.ribbonText}>{highlight === "popular" ? "Most Popular" : "Best Value"}</Text>
        </View>
      )}

      <Text style={styles.planName}>{name}</Text>
      <Text style={styles.price}>{price}</Text>

      <View style={styles.divider} />

      <View style={styles.featuresContainer}>
        {features.map((f, i) => (
          <View key={`${f.label}-${i}`} style={styles.row}>
            {f.ok ? (
              <Check size={18} color={theme.colors.primary} />
            ) : (
              <X size={18} color="#94a3b8" />
            )}
            <Text style={styles.featureText}>
              {f.label}
              {f.note ? <Text style={styles.note}> — {f.note}</Text> : null}
            </Text>
          </View>
        ))}
      </View>

      <Pressable 
        onPress={onPress} 
        style={[
          styles.cta, 
          isCurrentPlan && styles.ctaCurrent
        ]}
      >
        <Text style={[
          styles.ctaText,
          isCurrentPlan && styles.ctaTextCurrent
        ]}>{cta}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.lightGray },
  scroll: { padding: 16, paddingBottom: 32 },
  featuresContainer: { gap: 10 },
  h1: { fontSize: theme.fontSize.xl, fontWeight: "800", color: theme.colors.dark, textAlign: "center" },
  sub: { color: theme.colors.gray, textAlign: "center", marginTop: 6, marginBottom: 16 },
  grid: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  card: {
    width: 320,
    backgroundColor: theme.colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    position: "relative",
  },
  cardHighlight: {
    borderColor: theme.colors.primary,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  ribbon: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  ribbonPopular: { backgroundColor: theme.colors.primary },
  ribbonValue: { backgroundColor: "#0ea5e9" },
  ribbonText: { color: "#fff", fontWeight: "800", fontSize: 12 },
  planName: { fontSize: theme.fontSize.lg, fontWeight: "800", color: theme.colors.dark },
  price: { fontSize: theme.fontSize.xl, fontWeight: "900", marginTop: 4, color: theme.colors.primary },
  divider: { height: 1, backgroundColor: theme.colors.border, marginVertical: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  featureText: { color: theme.colors.dark },
  note: { color: theme.colors.gray },
  cta: {
    marginTop: 16,
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  ctaCurrent: {
    backgroundColor: theme.colors.lightGray,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  ctaText: { color: "#fff", fontWeight: "800" },
  ctaTextCurrent: { color: theme.colors.gray },
});

function TestPaymentPanel() {
  const { user } = useAuth();
  const toast = useToast();
  const router = useRouter();
  
  const [showPanel, setShowPanel] = useState<boolean>(false);
  const [selectedPlan, setSelectedPlan] = useState<'pro' | 'enterprise'>('pro');
  const [transactionId, setTransactionId] = useState<string>(`TEST-${Date.now()}`);
  const [amount, setAmount] = useState<string>('49.99');
  const [currency] = useState<string>('USD');
  const [dryRun, setDryRun] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // Update amount when plan changes
  React.useEffect(() => {
    setAmount(selectedPlan === 'pro' ? '49.99' : '199.00');
  }, [selectedPlan]);
  
  const handleSimulate = async () => {
    try {
      if (!transactionId.trim()) {
        toast.show('Enter a transaction ID.', 'error');
        return;
      }
      
      console.log('[TestPayment] Simulation:', {
        plan: selectedPlan,
        transactionId: transactionId.trim(),
        amount: parseFloat(amount),
        currency,
        dryRun: true
      });
      
      toast.show('Simulation complete — no data written.', 'success');
    } catch (error: any) {
      console.warn('[TestPayment] Simulation error:', error);
      toast.show('Simulation failed.', 'error');
    }
  };
  
  const handleConfirmActivate = async () => {
    if (!user) {
      toast.show('Sign in required', 'error');
      return;
    }
    
    if (!transactionId.trim()) {
      toast.show('Enter a transaction ID.', 'error');
      return;
    }
    
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 0.01) {
      toast.show('Amount must be ≥ 0.01', 'error');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const txId = transactionId.trim();
      
      // Check if transaction already exists
      const paymentDoc = await getDoc(doc(db, 'payments', txId));
      if (paymentDoc.exists()) {
        toast.show('Transaction already recorded.', 'error');
        return;
      }
      
      // Compute expiration date (30 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      
      // Update user membership
      await setDoc(doc(db, 'users', user.id), {
        membership: {
          plan: selectedPlan,
          status: 'active',
          provider: 'manual',
          lastTxnId: txId,
          startedAt: serverTimestamp(),
          expiresAt: expiresAt
        }
      }, { merge: true });
      
      // Create payment record
      await setDoc(doc(db, 'payments', txId), {
        uid: user.id,
        plan: selectedPlan,
        amount: numAmount,
        currency,
        provider: 'manual',
        status: 'captured',
        createdAt: serverTimestamp()
      });
      
      const formattedDate = expiresAt.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
      });
      
      toast.show(`✅ ${selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)} activated • Expires ${formattedDate}`, 'success', 4000);
      
      // Reset form
      setTransactionId(`TEST-${Date.now()}`);
      setAmount(selectedPlan === 'pro' ? '49.99' : '199.00');
      
    } catch (error: any) {
      console.warn('[TestPayment] Activation error:', error);
      toast.show(`Activation failed: ${error.code || 'unknown'}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <View style={testStyles.container}>
      <Pressable 
        style={testStyles.header}
        onPress={() => setShowPanel(!showPanel)}
      >
        <Text style={testStyles.headerText}>Test Payment (Manual)</Text>
        {showPanel ? (
          <ChevronUp size={20} color={theme.colors.gray} />
        ) : (
          <ChevronDown size={20} color={theme.colors.gray} />
        )}
      </Pressable>
      
      {showPanel && (
        <View style={testStyles.panel}>
          {/* Dry Run Toggle */}
          <View style={testStyles.row}>
            <Text style={testStyles.label}>Dry Run (no writes)</Text>
            <Switch
              value={dryRun}
              onValueChange={setDryRun}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            />
          </View>
          
          {/* Plan Selector */}
          <View style={testStyles.section}>
            <Text style={testStyles.sectionTitle}>Plan</Text>
            <View style={testStyles.radioGroup}>
              <Pressable
                style={[testStyles.radioOption, selectedPlan === 'pro' && testStyles.radioSelected]}
                onPress={() => setSelectedPlan('pro')}
              >
                <View style={[testStyles.radio, selectedPlan === 'pro' && testStyles.radioActive]} />
                <Text style={testStyles.radioText}>Pro</Text>
              </Pressable>
              <Pressable
                style={[testStyles.radioOption, testStyles.radioDisabled]}
                disabled
              >
                <View style={[testStyles.radio, testStyles.radioInactive]} />
                <Text style={[testStyles.radioText, testStyles.radioTextDisabled]}>Enterprise (disabled)</Text>
              </Pressable>
            </View>
          </View>
          
          {/* Transaction ID */}
          <View style={testStyles.section}>
            <Text style={testStyles.sectionTitle}>Transaction ID</Text>
            <TextInput
              style={testStyles.input}
              value={transactionId}
              onChangeText={setTransactionId}
              placeholder="Enter transaction ID"
              placeholderTextColor={theme.colors.gray}
            />
          </View>
          
          {/* Amount */}
          <View style={testStyles.section}>
            <Text style={testStyles.sectionTitle}>Amount</Text>
            <TextInput
              style={testStyles.input}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              keyboardType="decimal-pad"
              placeholderTextColor={theme.colors.gray}
            />
          </View>
          
          {/* Currency */}
          <View style={testStyles.section}>
            <Text style={testStyles.sectionTitle}>Currency</Text>
            <View style={testStyles.currencyContainer}>
              <Text style={testStyles.currencyText}>USD</Text>
            </View>
          </View>
          
          {/* Buttons */}
          <View style={testStyles.buttonGroup}>
            <Pressable
              style={testStyles.simulateButton}
              onPress={handleSimulate}
            >
              <Text style={testStyles.simulateButtonText}>Simulate</Text>
            </Pressable>
            
            <Pressable
              style={[
                testStyles.confirmButton,
                (dryRun || isLoading) && testStyles.confirmButtonDisabled
              ]}
              onPress={handleConfirmActivate}
              disabled={dryRun || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={[
                  testStyles.confirmButtonText,
                  (dryRun || isLoading) && testStyles.confirmButtonTextDisabled
                ]}>Confirm & Activate</Text>
              )}
            </Pressable>
          </View>
          
          <Pressable
            style={testStyles.dashboardButton}
            onPress={() => router.push('/shipper-dashboard')}
          >
            <Text style={testStyles.dashboardButtonText}>Go to Dashboard</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const testStyles = StyleSheet.create({
  container: {
    marginTop: 24,
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#f8fafc',
  },
  headerText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  panel: {
    padding: 16,
    gap: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.dark,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.dark,
  },
  radioGroup: {
    gap: 12,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  radioSelected: {},
  radioDisabled: {
    opacity: 0.5,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  radioActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  radioInactive: {
    borderColor: theme.colors.border,
  },
  radioText: {
    fontSize: 14,
    color: theme.colors.dark,
  },
  radioTextDisabled: {
    color: theme.colors.gray,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: theme.colors.dark,
    backgroundColor: theme.colors.white,
  },
  currencyContainer: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f8fafc',
  },
  currencyText: {
    fontSize: 14,
    color: theme.colors.gray,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  simulateButton: {
    flex: 1,
    backgroundColor: theme.colors.lightGray,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  simulateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: theme.colors.border,
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  confirmButtonTextDisabled: {
    color: theme.colors.gray,
  },
  dashboardButton: {
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#0ea5e9',
  },
  dashboardButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0ea5e9',
  },
});
