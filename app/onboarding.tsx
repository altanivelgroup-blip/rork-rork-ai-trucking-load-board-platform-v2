import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { ShieldCheck, Truck, Sparkles } from 'lucide-react-native';

const HERO = 'https://images.unsplash.com/photo-1501706362039-c06b2d715385?q=80&w=1600&auto=format&fit=crop';
const CARD1 = 'https://images.unsplash.com/photo-1518655048521-f130df041f66?q=80&w=1600&auto=format&fit=crop';
const CARD2 = 'https://images.unsplash.com/photo-1549890762-0a3f8933bcf7?q=80&w=1600&auto=format&fit=crop';

export default function OnboardingScreen() {
  const router = useRouter();

  const goLogin = useCallback(() => router.replace('/login'), [router]);
  const goDashboard = useCallback(() => router.replace('/dashboard'), [router]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Welcome', headerShown: false }} />
      <ScrollView contentContainerStyle={styles.scroll} testID="onboarding-scroll">
        <View style={styles.heroWrap}>
          <Image source={{ uri: HERO }} style={styles.hero} resizeMode="cover" accessibilityLabel="Hero trucking image" />
          <View style={styles.heroOverlay} />
          <View style={styles.heroContent}>
            <Text style={styles.appName}>Rork Load Board</Text>
            <Text style={styles.tagline}>Find better loads. Drive smarter.</Text>
            <TouchableOpacity style={styles.ctaPrimary} onPress={goDashboard} testID="onboarding-get-started">
              <Text style={styles.ctaPrimaryText}>Get Started</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.ctaSecondary} onPress={goLogin} testID="onboarding-login">
              <Text style={styles.ctaSecondaryText}>I already have an account</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.cardsRow}>
          <View style={styles.card} testID="onboarding-card-ai">
            <Image source={{ uri: CARD1 }} style={styles.cardImage} resizeMode="cover" />
            <View style={styles.cardBody}>
              <View style={styles.cardIcon}><Sparkles color={theme.colors.primary} size={18} /></View>
              <Text style={styles.cardTitle}>AI Matching</Text>
              <Text style={styles.cardText}>We highlight best-fit loads with an AI score so you can accept with confidence.</Text>
            </View>
          </View>

          <View style={styles.card} testID="onboarding-card-secure">
            <Image source={{ uri: CARD2 }} style={styles.cardImage} resizeMode="cover" />
            <View style={styles.cardBody}>
              <View style={styles.cardIcon}><ShieldCheck color={theme.colors.success} size={18} /></View>
              <Text style={styles.cardTitle}>Secure & Transparent</Text>
              <Text style={styles.cardText}>Clear rates, verified shippers, and tools to protect your revenue.</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Truck color={theme.colors.primary} size={20} />
          <Text style={styles.footerText}>Capture this screen for App Store review screenshots.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.lightGray },
  scroll: { paddingBottom: theme.spacing.xl },
  heroWrap: { position: 'relative', width: '100%', height: Math.min(520, Math.max(360, Dimensions.get('window').height * 0.6)) },
  hero: { position: 'absolute', width: '100%', height: '100%', top: 0, left: 0 },
  heroOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.35)' },
  heroContent: { position: 'absolute', bottom: 24, left: 20, right: 20, gap: 10 },
  appName: { color: theme.colors.white, fontSize: 32, fontWeight: '800' as const },
  tagline: { color: theme.colors.white, fontSize: theme.fontSize.md },
  ctaPrimary: { backgroundColor: theme.colors.primary, paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  ctaPrimaryText: { color: theme.colors.white, fontWeight: '700' as const, fontSize: theme.fontSize.md },
  ctaSecondary: { paddingVertical: 10, alignItems: 'center' },
  ctaSecondaryText: { color: theme.colors.white },

  cardsRow: { paddingHorizontal: 16, marginTop: 16 },
  card: { backgroundColor: theme.colors.white, borderRadius: 16, overflow: 'hidden', marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 1 },
  cardImage: { width: '100%', height: 140 },
  cardBody: { padding: 12 },
  cardIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  cardTitle: { fontSize: theme.fontSize.md, fontWeight: '700' as const, color: theme.colors.dark, marginBottom: 4 },
  cardText: { color: theme.colors.gray, fontSize: theme.fontSize.sm },

  footer: { paddingHorizontal: 16, paddingVertical: 20, flexDirection: 'row', alignItems: 'center', gap: 8 },
  footerText: { color: theme.colors.gray },
});