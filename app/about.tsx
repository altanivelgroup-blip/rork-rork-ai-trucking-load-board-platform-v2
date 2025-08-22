import React from 'react';

import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { theme } from '@/constants/theme';

export default function AboutScreen() {
  return (
    <>

      <ScrollView contentContainerStyle={styles.container} testID="about-scroll">
        <View style={styles.header}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1519638399535-1b036603ac77?q=80&w=1600&auto=format&fit=crop' }}
            style={styles.hero}
            resizeMode="cover"
          />
          <View style={styles.overlay} />
          <Text style={styles.title} testID="about-title">About LoadRush</Text>
          <Text style={styles.subtitle}>AI-powered load board for car haulers and hotshot drivers</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Our Mission</Text>
          <Text style={styles.paragraph}>
            LoadRush helps car haulers, hotshot drivers, and brokers move faster. We combine real-time load data
            with AI-assisted search, voice input, and intelligent backhaul suggestions to maximize your revenue and
            reduce deadhead miles.
          </Text>
        </View>

        <View style={styles.grid}>
          <View style={styles.card} testID="about-card-speed">
            <Text style={styles.cardTitle}>Find Loads Fast</Text>
            <Text style={styles.cardText}>Voice search, saved filters, and instant results tailored to your equipment.</Text>
          </View>
          <View style={styles.card} testID="about-card-backhaul">
            <Text style={styles.cardTitle}>Smart Backhaul</Text>
            <Text style={styles.cardText}>Auto-detect delivery and surface nearby return loads within your radius.</Text>
          </View>
          <View style={styles.card} testID="about-card-trust">
            <Text style={styles.cardTitle}>Built for Trust</Text>
            <Text style={styles.cardText}>Ratings, documents, and safety tools streamline pickup and delivery.</Text>
          </View>
        </View>

        <View style={[styles.section, { paddingBottom: theme.spacing.xl }]}>
          <Text style={styles.sectionTitle}>Who We Serve</Text>
          <Text style={styles.paragraph}>
            • Car haulers seeking high-quality auto transport loads{"\n"}
            • Hotshot trucking owner-operators and small fleets{ "\n" }
            • Brokers posting vehicle shipping and expedited freight
          </Text>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: theme.spacing.xl,
    backgroundColor: theme.colors.lightGray,
  },
  header: {
    height: 200,
    justifyContent: 'flex-end',
    padding: theme.spacing.lg,
  },
  hero: {
    ...StyleSheet.absoluteFillObject as any,
    width: '100%',
    height: '100%',
    borderBottomLeftRadius: theme.borderRadius.lg,
    borderBottomRightRadius: theme.borderRadius.lg,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject as any,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderBottomLeftRadius: theme.borderRadius.lg,
    borderBottomRightRadius: theme.borderRadius.lg,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: theme.colors.white,
  },
  subtitle: {
    marginTop: 2,
    marginBottom: theme.spacing.md,
    color: theme.colors.white,
    opacity: 0.9,
  },
  section: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.dark,
    marginBottom: theme.spacing.xs,
  },
  paragraph: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    lineHeight: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap' as const,
    gap: 12,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  card: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: theme.colors.white,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  cardTitle: {
    fontWeight: '700',
    color: theme.colors.dark,
    marginBottom: 6,
  },
  cardText: {
    color: theme.colors.gray,
    fontSize: theme.fontSize.sm,
  },
});
