// app/membership.tsx
import React, { useMemo } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { Stack, useRouter } from "expo-router";

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

const COLORS = {
  bg: "#f5f5f5",
  card: "#ffffff",
  border: "#e5e7eb",
  dark: "#111827",
  gray: "#6b7280",
  primary: "#1f5fff",
  white: "#ffffff",
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
    // Safe, simple route. We'll create this file next.
    router.push(`/subscribe/${key}`);
  };

  return (
    <>
      <Stack.Screen
        options={{ title: "Driver Membership", headerTitleAlign: "center" }}
      />
      <ScrollView style={styles.screen} contentContainerStyle={styles.scroll}>
        <Text style={styles.heading}>Pick your plan</Text>
        <Text style={styles.subheading}>Upgrade anytime. Cancel anytime.</Text>

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
        plan.highlight && { borderColor: COLORS.primary, borderWidth: 2 },
      ]}
    >
      {plan.highlight && (
        <View style={styles.ribbon}>
          <Text style={styles.ribbonText}>★ Recommended</Text>
        </View>
      )}

      <Text style={styles.planName}>{plan.name}</Text>
      <Text style={styles.planPrice}>{plan.price}</Text>
      <Text style={styles.planTagline}>{plan.tagline}</Text>

      <View style={styles.features}>
        {plan.features.map((f, idx) => (
          <View key={idx} style={styles.featureRow}>
            <Text style={[styles.featureIcon, !f.ok && styles.featureIconOff]}>
              {f.ok ? "✓" : "✕"}
            </Text>
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
  screen: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: 16, paddingBottom: 28 },
  heading: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.dark,
    textAlign: "center",
  },
  subheading: { marginTop: 6, textAlign: "center", color: COLORS.gray },
  grid: { marginTop: 14, gap: 12 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    borderColor: COLORS.border,
    borderWidth: 1,
  },
  planName: { fontSize: 18, fontWeight: "800", color: COLORS.dark },
  planPrice: {
    marginTop: 6,
    fontSize: 22,
    fontWeight: "900",
    color: COLORS.primary,
  },
  planTagline: { marginTop: 2, color: COLORS.gray },
  features: { marginTop: 12, gap: 8 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  featureIcon: { width: 18, textAlign: "center", color: COLORS.primary },
  featureIconOff: { color: "#94a3b8" },
  featureText: { color: COLORS.dark },
  featureOff: { color: "#94a3b8", textDecorationLine: "line-through" },
  cta: {
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaPrimary: { backgroundColor: COLORS.primary },
  ctaSecondary: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  ctaText: { fontWeight: "800", fontSize: 16 },
  ctaTextPrimary: { color: COLORS.white },
  ctaTextSecondary: { color: COLORS.primary },
  disclaimer: {
    marginTop: 18,
    color: COLORS.gray,
    fontSize: 12,
    textAlign: "center",
  },
  ribbon: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  ribbonText: { color: "#fff", fontWeight: "800", fontSize: 12 },
});
