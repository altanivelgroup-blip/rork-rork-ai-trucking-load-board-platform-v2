import { Stack } from "expo-router";
import React from "react";
import { View, Text, StyleSheet, Linking, TouchableOpacity, ScrollView } from "react-native";
import Head from "expo-router/head";
import { theme } from "@/constants/theme";
import { Mail, MessageCircle, Phone } from "lucide-react-native";

export default function ContactScreen() {
  return (
    <View style={styles.container} testID="contact-screen">
      <Head>
        <title>{`Contact LoadRush: Support for Hotshot Trucking Loads & Car Hauler Jobs`}</title>
        <meta name="description" content="Need help with our auto transport load board? Contact LoadRush for questions on truck load finder tools, car hauler jobs, or hotshot dispatch loads." />
      </Head>
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
  card: {
    backgroundColor: "#121a2b",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1f2a44",
    marginBottom: 12,
  },
  row: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8 as unknown as number,
    marginBottom: 8,
  },
  title: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "600" as const,
  },
  action: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center" as const,
  },
  actionText: {
    color: "#0b1220",
    fontSize: 16,
    fontWeight: "700" as const,
  },
  note: {
    color: "#c6d0e1",
    fontSize: 14,
  },
});
