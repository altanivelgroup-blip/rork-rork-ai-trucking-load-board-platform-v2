import { Stack } from "expo-router";
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform } from "react-native";
import { theme } from "@/constants/theme";

import { CheckCircle2, ShieldCheck, Zap, Wallet } from "lucide-react-native";

type Plan = {
  id: string;
  name: string;
  priceLabel: string;
  cta: string;
  features: string[];
  highlight?: boolean;
};

const plans: Plan[] = [
  {
    id: "driver",
    name: "Driver",
    priceLabel: "$X/month",
    cta: "Start Driver Plan",
    features: [
      "Unlimited access to car hauling loads",
      "Hotshot trucking load alerts",
      "AI truck load finder tools",
      "In‑app document uploads",
    ],
    highlight: true,
  },
  {
    id: "broker",
    name: "Broker",
    priceLabel: "$X/month",
    cta: "Start Broker Plan",
    features: [
      "Post unlimited vehicle shipping loads",
      "Priority driver matching",
      "Analytics & performance insights",
      "CSV export for posted loads",
    ],
  },
];

function PricingCard({ plan, onSelect }: { plan: Plan; onSelect: (id: string) => void }) {
  return (
    <View style={[styles.card, plan.highlight ? styles.cardHighlight : null]} testID={`pricing-card-${plan.id}`}>
      <View style={styles.cardHeader}>
        <View style={styles.iconWrap}>
          {plan.id === "driver" ? (
            <Zap color={theme.colors.primary} size={22} />
          ) : plan.id === "broker" ? (
            <ShieldCheck color={theme.colors.primary} size={22} />
          ) : (
            <Wallet color={theme.colors.primary} size={22} />
          )}
        </View>
        <Text style={styles.cardTitle}>{plan.name}</Text>
      </View>
      <Text style={styles.price} accessibilityLabel={`${plan.name} ${plan.priceLabel}`}>{plan.priceLabel}</Text>
      <View style={styles.features}>
        {plan.features.map((f, idx) => (
          <View key={`${plan.id}-f-${idx}`} style={styles.featureRow}>
            <CheckCircle2 color={theme.colors.success} size={18} />
            <Text style={styles.featureText}>{f}</Text>
          </View>
        ))}
      </View>
      <TouchableOpacity onPress={() => onSelect(plan.id)} style={styles.cta} activeOpacity={0.8} testID={`pricing-cta-${plan.id}`}>
        <Text style={styles.ctaText}>{plan.cta}</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function PricingScreen() {
  const onSelect = (id: string) => {
    try {
      Alert.alert("Coming soon", Platform.select({ web: "Billing is coming soon.", default: "Billing is coming soon." }) ?? "Billing is coming soon.");
    } catch {}
  };

  return (
    <View style={styles.container} testID="pricing-screen">

      <Stack.Screen options={{ title: "Pricing" }} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.h1}>Simple pricing for drivers and brokers</Text>
        <Text style={styles.subtitle}>Unlock car hauling loads, hotshot dispatch, and powerful tools.</Text>
        <View style={styles.grid}>
          {plans.map((p) => (
            <PricingCard key={p.id} plan={p} onSelect={onSelect} />
          ))}
        </View>
        <View style={styles.faq}>
          <Text style={styles.faqTitle}>FAQs</Text>
          <Text style={styles.faqQ}>Can I cancel anytime?</Text>
          <Text style={styles.faqA}>Yes. Manage your plan in settings. Access continues through the current period.</Text>
          <Text style={styles.faqQ}>Do you offer trials?</Text>
          <Text style={styles.faqA}>Trials and promos may be available during launch windows.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b1220",
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  h1: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "700" as const,
    textAlign: "center" as const,
    marginBottom: 6,
  },
  subtitle: {
    color: "#9aa4b2",
    fontSize: 14,
    textAlign: "center" as const,
    marginBottom: 18,
  },
  grid: {
    gap: 16 as unknown as number,
  },
  card: {
    backgroundColor: "#121a2b",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1f2a44",
  },
  cardHighlight: {
    borderColor: theme.colors.primary,
  },
  cardHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8 as unknown as number,
    marginBottom: 8,
  },
  cardTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "600" as const,
  },
  iconWrap: {
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  price: {
    color: theme.colors.primary,
    fontSize: 22,
    fontWeight: "700" as const,
    marginBottom: 12,
  },
  features: {
    gap: 8 as unknown as number,
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8 as unknown as number,
  },
  featureText: {
    color: "#d5d9e2",
    fontSize: 14,
  },
  cta: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center" as const,
  },
  ctaText: {
    color: "#0b1220",
    fontSize: 16,
    fontWeight: "700" as const,
  },
  faq: {
    marginTop: 28,
    gap: 6 as unknown as number,
  },
  faqTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700" as const,
    marginBottom: 6,
  },
  faqQ: {
    color: "#c6d0e1",
    fontSize: 14,
    fontWeight: "600" as const,
  },
  faqA: {
    color: "#9aa4b2",
    fontSize: 14,
  },
});
