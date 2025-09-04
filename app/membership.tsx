// app/membership.tsx
import React, { useMemo } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { Stack } from "expo-router";
import { theme } from "@/constants/theme";
import { Check, X, Star } from "lucide-react-native";

type PlanKey = "driver-basic" | "driver-pro";

export default function DriverMembershipScreen() {
  const plans = useMemo(
    () => [
      {
        key: "driver-basic" as PlanKey,
        name: "Basic",
        price: "$9.99/mo",
        highlight: null as "popular" | "value" | null,
        features: [
          { label: "Load Board Access", ok: true },
          { label: "Daily Searches", ok: false, note: "Limited" },
          { label: "Profile & Reputation (completed loads)", ok: true },
          { label: "Driver Rankings & Badges", ok: false },
          { label: "AI Load Recommendations", ok: false },
          { label: "Driver Deals & Discounts", ok: false },
          { label: "Saved Searches & Alerts", ok: false },
          { label: "Support: Standard", ok: true },
        ],
        cta: "Choose Basic",
      },
      {
        key: "driver-pro" as PlanKey,
        name: "Pro",
        price: "$29.99/mo",
        highlight: "popular" as const,
        features: [
          { label: "Load Board Access", ok: true, note: "Unlimited" },
          { label: "Daily Searches", ok: true, note: "Unlimited" },
          { label: "Profile & Reputation (completed loads)", ok: true },
          { label: "Driver Rankings & Badges", ok: true },
          { label: "AI Load Recommendations", ok: true },
          { label: "Driver Deals & Discounts", ok: true },
          { label: "Saved Searches & Alerts", ok: true },
          { label: "Support: Priority", ok: true },
        ],
        cta: "Upgrade to Pro",
      },
    ],
    []
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.lightGray }}>
      <Stack.Screen options={{ title: "Driver Membership" }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.h1}>Choose your Driver plan</Text>
        <Text style={styles.sub}>
          Pro pays for itself fast with driver deals and better load matching.
        </Text>

        <View style={styles.grid}>
          {plans.map((p) => (
            <PlanCard
              key={p.key}
              name={p.name}
              price={p.price}
              highlight={p.highlight}
              features={p.features}
              cta={p.cta}
              onPress={() => {
                // TODO: wire to your purchase/upgrade flow
                console.log("[DriverMembership] choose", p.key);
              }}
            />
          ))}
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
  onPress,
}: {
  name: string;
  price: string;
  features: { label: string; ok: boolean; note?: string }[];
  cta: string;
  highlight: "popular" | "value" | null;
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

      <View style={{ gap: 10 }}>
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

      <Pressable onPress={onPress} style={styles.cta}>
        <Text style={styles.ctaText}>{cta}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 32 },
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
  ctaText: { color: "#fff", fontWeight: "800" },
});
