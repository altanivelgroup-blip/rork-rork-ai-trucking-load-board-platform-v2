// app/shipper-membership.tsx
import React, { useMemo } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { Stack, useRouter } from "expo-router";
import { theme } from "@/constants/theme";
import { Check, X, Star } from "lucide-react-native";
import { useAuth } from "@/hooks/useAuth";

type PlanKey = "shipper-basic" | "shipper-pro" | "shipper-enterprise";

export default function ShipperMembershipScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  const currentPlan = user?.membershipTier || 'basic';
  
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
          <View key={i} style={styles.row}>
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
