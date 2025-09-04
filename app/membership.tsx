// app/membership.tsx
import React, { useMemo } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { Stack, useRouter } from "expo-router";
import { theme } from "@/constants/theme";
import { Check, X, Star } from "lucide-react-native";

type PlanKey = "driver-basic" | "driver-pro";

type Plan = {
  key: PlanKey;
  name: string;
  price: string;
  tagline: string;
  cta: string;
  features: { text: string; ok: boolean }[];
  highlight?: boolean;
};

export default function DriverMembershipScreen() {
  const router = useRouter();

  const plans: Plan[] = useMemo(
    () => [
      {
        key: "driver-basic",
        name: "Basic",
        price: "$9.99/mo",
        tagline: "Core access to the load board",
        cta: "Choose Basic",
        features: [
          { text: "Load board access", ok: true },
          { text: "Driver rankings & tiers", ok: false },
          { text: "Driver deals & benefits", ok: false },
          { text: "Email & chat support", ok: true },
        ],
      },
      {
        key: "driver-pro",
        name: "Pro",
        price: "$29.99/mo",
        tagline: "Everything in Basic plus pro tools",
        cta: "Choose Pro",
        highlight: true,
        features: [
          { text: "Load board access", ok: true },
          { text: "Driver rankings & tiers", ok: true },
          { text: "Driver deals & benefits", ok: true },
          { text: "Priority support", ok: true },
        ],
      },
    ],
    []
  );

  const onSelect = (key: PlanKey) => {
    // Navigate to your checkout flow. These routes are simple & memorable.
    // Create `app/subscribe/[plan].tsx` (stub below) if you don’t have it yet.
    router.push(`/subscribe/${key}`);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: "Driver Membership",
          headerTitleAlign: "center",
        }}
      />
      <ScrollView
        style={styles.screen}
        contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
      >
        <Text style={styles.heading}>Pick your plan</Text>
        <Text style={styles.subheading}>
          Upgrade anytime. Cancel anytime.
        </Text>

        <View style={styles.grid}>
          {plans.map((p) => (
            <PlanCard key={p.key} plan={p} onSelect={() => onSelect(p.key)} />
          ))}
        </View>

        <Text style={styles.disclaimer}>
          By continuing, you agree to our Terms of Service and acknowledge our
          Privacy Policy.
        </Text>
      </ScrollView>
    </>
  );
}

function PlanCard({
  plan,
  onSelect,
}: {
  plan: Plan;
  onSelect: () => void;
}) {
  return (
    <View
      style={[
        styles.card,
        plan.highlight && { borderColor: theme.colors.primary, borderWidth: 2 },
      ]}
    >
      {plan.highlight && (
        <View style={styles.ribbon}>
          <Star size={14} color="#fff" />
          <Text style={styles.ribbonText}>Recommended</Text>
        </View>
      )}

      <Text style={styles.planName}>{plan.name}</Text>
      <Text style={styles.planPrice}>{plan.price}</Text>
      <Text style={styles.planTagline}>{plan.tagline}</Text>

      <View style={styles.features}>
        {plan.features.map((f, idx) => (
          <View key={idx} style={styles.featureRow}>
            {f.ok ? (
              <Check size={18} color={theme.colors.primary} />
            ) : (
              <X size={18} color="#94a3b8" />
            )}
            <Text style={[styles.featureText, !f.ok && styles.featureOff]}>
              {f.text}
            </Text>
          </View>
        ))}
      </View>

      <Pressable
        onPress={onSelect}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.cta,
          plan.highlight ? styles.ctaPrimary : styles.ctaSecondary,
          pressed && { opacity: 0.9 },
        ]}
      >
        <Text
          style={[
            styles.ctaText,
            plan.highlight ? styles.ctaTextPrimary : styles.ctaTextSecondary,
          ]}
        >
          {plan.cta}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.lightGray },
  heading: {
    fontSize: theme.fontSize.xl,
    fontWeight: "800",
    color: theme.colors.dark,
    textAlign: "center",
  },
  subheading: {
    marginTop: 6,
    textAlign: "center",
    color: theme.colors.gray,
  },
  grid: {
    marginTop: 14,
    gap: 12,
  },
  card: {
    backgroundColor: theme.colors.white,
    borderRadius: 16,
    padding: 16,
    borderColor: theme.colors.border,
    borderWidth: 1,
  },
  planName: {
    fontSize: theme.fontSize.lg,
    fontWeight: "800",
    color: theme.colors.dark,
  },
  planPrice: {
    marginTop: 6,
    fontSize: theme.fontSize.xl,
    fontWeight: "900",
    color: theme.colors.primary,
  },
  planTagline: {
    marginTop: 2,
    color: theme.colors.gray,
  },
  features: { marginTop: 12, gap: 8 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  featureText: { color: theme.colors.dark },
  featureOff: { color: "#94a3b8", textDecorationLine: "line-through" },
  cta: {
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaPrimary: {
    backgroundColor: theme.colors.primary,
  },
  ctaSecondary: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.primary,
    borderWidth: 2,
  },
  ctaText: { fontWeight: "800", fontSize: theme.fontSize.md },
  ctaTextPrimary: { color: theme.colors.white },
  ctaTextSecondary: { color: theme.colors.primary },
  disclaimer: {
    marginTop: 18,
    color: theme.colors.gray,
    fontSize: theme.fontSize.sm,
    textAlign: "center",
  },
  ribbon: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  ribbonText: { color: "#fff", fontWeight: "800", fontSize: 12 },
});
