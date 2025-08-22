import { Stack } from "expo-router";
import React from "react";
import { View, Text, StyleSheet, Linking, TouchableOpacity, ScrollView } from "react-native";

import { theme } from "@/constants/theme";
import { Mail, MessageCircle, Phone } from "lucide-react-native";

export default function ContactScreen() {
  return (
    <View style={styles.container} testID="contact-screen">

      <Stack.Screen options={{ title: "Contact" }} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.h1}>We’re here to help</Text>
        <Text style={styles.subtitle}>Reach our team about loads, billing, or account support.</Text>

        <View style={styles.card}>
          <View style={styles.row}>
            <Mail color={theme.colors.primary} size={22} />
            <Text style={styles.title}>Email</Text>
          </View>
          <TouchableOpacity
            accessibilityRole="link"
            onPress={() => Linking.openURL("mailto:support@loadrush.com")}
            testID="contact-email"
            style={styles.action}
          >
            <Text style={styles.actionText}>support@loadrush.com</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.row}>
            <Phone color={theme.colors.primary} size={22} />
            <Text style={styles.title}>Phone</Text>
          </View>
          <TouchableOpacity
            accessibilityRole="link"
            onPress={() => Linking.openURL("tel:+1234567890")}
            testID="contact-phone"
            style={styles.action}
          >
            <Text style={styles.actionText}>+1 (234) 567‑890</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.row}>
            <MessageCircle color={theme.colors.primary} size={22} />
            <Text style={styles.title}>In‑app chat</Text>
          </View>
          <Text style={styles.note}>Chat support launches soon. For now, email us and we’ll respond fast.</Text>
        </View>
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
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  h1: {
    color: theme.colors.dark,
    fontSize: theme.fontSize.xl,
    fontWeight: "700" as const,
    textAlign: "center" as const,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    color: theme.colors.gray,
    fontSize: theme.fontSize.sm,
    textAlign: "center" as const,
    marginBottom: theme.spacing.lg,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  row: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginBottom: theme.spacing.sm,
  },
  title: {
    color: theme.colors.dark,
    fontSize: theme.fontSize.lg,
    fontWeight: "600" as const,
    marginLeft: theme.spacing.sm,
  },
  action: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: "center" as const,
  },
  actionText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.md,
    fontWeight: "700" as const,
  },
  note: {
    color: theme.colors.gray,
    fontSize: theme.fontSize.sm,
  },
});
