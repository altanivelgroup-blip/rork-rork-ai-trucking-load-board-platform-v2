import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { Brain, Sparkles, Wand2, ListChecks, Map, BarChart3 } from 'lucide-react-native';
import { useLoads } from '@/hooks/useLoads';
import { Load, VehicleType } from '@/types';
import { VoiceCapture } from '@/components/VoiceCapture';

interface AIPlanStep { title: string; detail: string }

export default function AILoadsScreen() {
  const router = useRouter();
  const { filters, setFilters, addLoadsBulk } = useLoads();
  const [prompt, setPrompt] = useState<string>('Find profitable backhauls from current destination within 150 miles for a flatbed.');
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [plan, setPlan] = useState<AIPlanStep[]>([]);
  const [suggested, setSuggested] = useState<Load[]>([]);

  const vehicleKeywords: Record<string, VehicleType> = useMemo(() => ({
    'flatbed': 'flatbed',
    'reefer': 'reefer',
    'box truck': 'box-truck',
    'boxtruck': 'box-truck',
    'cargo van': 'cargo-van',
    'car hauler': 'car-hauler',
    'enclosed': 'enclosed-trailer',
    'trailer': 'trailer',
    'truck': 'truck',
  }), []);

  const applyVoice = useCallback((text: string) => {
    const lower = text.toLowerCase();
    let v: VehicleType | undefined = undefined;
    Object.keys(vehicleKeywords).forEach(k => { if (lower.includes(k)) v = vehicleKeywords[k]; });
    const radiusMatch = lower.match(/(\d{2,3})\s?(mi|miles|mile)/);
    const minRateMatch = lower.match(/\$(\d{2,5})|rate\s*(\d{2,5})/);
    setFilters({
      ...filters,
      vehicleType: v ?? filters.vehicleType,
      backhaulRadiusMiles: radiusMatch ? Number(radiusMatch[1]) : filters.backhaulRadiusMiles,
      minRate: minRateMatch ? Number(minRateMatch[1] || minRateMatch[2]) : filters.minRate,
      showBackhaul: lower.includes('backhaul') ? true : filters.showBackhaul,
    });
  }, [filters, setFilters, vehicleKeywords]);

  const runAI = useCallback(async () => {
    setIsThinking(true);
    setPlan([]);
    try {
      const messages = [
        { role: 'system', content: 'You are a dispatch analyst for trucking. Return JSON only.' },
        { role: 'user', content: `Based on this fleet context, propose backhaul search filters and 3-6 suggested loads. Fleet filters: ${JSON.stringify(filters)}. User prompt: ${prompt}. Output schema: { plan: { title: string, detail: string }[], filters: Partial<${'Load'}> | any, ideas: { title: string, desc: string }[], sampleLoads: { id: string, origin: {city:string,state:string,lat:number,lng:number}, destination: {city:string,state:string,lat:number,lng:number}, distance:number, weight:number, vehicleType: '${Object.values(vehicleKeywords)[0]}', rate:number, ratePerMile:number, pickupDate:string, deliveryDate:string, status:'available', description:string, isBackhaul:boolean, aiScore:number, shipperId:string, shipperName:string }[] }` },
      ] as const;

      const res = await fetch('https://toolkit.rork.com/text/llm/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
      });
      const data = await res.json() as { completion?: string };
      const raw = (data?.completion ?? '').trim();
      const jsonStart = raw.indexOf('{');
      const jsonEnd = raw.lastIndexOf('}');
      const parsed = jsonStart >= 0 ? JSON.parse(raw.slice(jsonStart, jsonEnd + 1)) : null;

      const nextPlan: AIPlanStep[] = Array.isArray(parsed?.plan) ? parsed.plan : [];
      setPlan(nextPlan);

      const sampleLoads = Array.isArray(parsed?.sampleLoads) ? parsed.sampleLoads as any[] : [];
      const casted: Load[] = sampleLoads.map((l, idx) => ({
        id: l.id ?? `ai-${Date.now()}-${idx}`,
        shipperId: l.shipperId ?? 'ai',
        shipperName: l.shipperName ?? 'AI Suggestion',
        origin: l.origin,
        destination: l.destination,
        distance: Number(l.distance ?? 0),
        weight: Number(l.weight ?? 0),
        vehicleType: (l.vehicleType as VehicleType) ?? (filters.vehicleType ?? 'truck'),
        rate: Number(l.rate ?? 0),
        ratePerMile: Number(l.ratePerMile ?? 0),
        pickupDate: new Date(l.pickupDate ?? Date.now()),
        deliveryDate: new Date(l.deliveryDate ?? Date.now()),
        status: 'available',
        description: String(l.description ?? 'AI generated suggestion'),
        isBackhaul: Boolean(l.isBackhaul ?? true),
        aiScore: Number(l.aiScore ?? 90),
        assignedDriverId: undefined,
      }));

      setSuggested(casted);
    } catch (e) {
      console.log('[AI Loads] error', e);
      Alert.alert('AI Error', 'Could not generate suggestions. Try again.');
    } finally {
      setIsThinking(false);
    }
  }, [filters, prompt, vehicleKeywords]);

  const adoptSuggestions = useCallback(async () => {
    if (suggested.length === 0) return;
    await addLoadsBulk(suggested);
    Alert.alert('Added', `${suggested.length} AI loads added to your board.`);
    router.back();
  }, [suggested, addLoadsBulk, router]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'AI for Loads' }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <View style={styles.iconWrap}><Brain size={22} color={theme.colors.secondary} /></View>
          <Text style={styles.title}>AI Assist for Loads & Backhauls</Text>
          <Text style={styles.subtitle}>Describe what you need. We’ll propose filters and sample loads you can add.</Text>
        </View>

        <View style={styles.inputCard}>
          <Text style={styles.label}>Your goal</Text>
          <TextInput
            value={prompt}
            onChangeText={setPrompt}
            placeholder="e.g. Find reefer backhauls within 120 miles paying over $2.50/mi"
            placeholderTextColor={theme.colors.gray}
            style={styles.input}
            multiline
            testID="ai-loads-input"
          />
          <View style={styles.voiceRow}>
            <VoiceCapture onTranscribed={(t) => setPrompt((p) => (p?.length ? `${p} ${t}` : t))} size="sm" label="Speak" />
          </View>
          <TouchableOpacity style={styles.runBtn} onPress={runAI} activeOpacity={0.9} disabled={isThinking} testID="ai-loads-run">
            {isThinking ? <ActivityIndicator color={theme.colors.white} /> : (<>
              <Wand2 size={18} color={theme.colors.white} />
              <Text style={styles.runText}>Generate Plan</Text>
            </>)}
          </TouchableOpacity>
        </View>

        {plan.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Plan</Text>
            {plan.map((s, i) => (
              <View style={styles.stepRow} key={`${s.title}-${i}`}>
                <ListChecks size={18} color={theme.colors.secondary} />
                <View style={styles.stepTextWrap}>
                  <Text style={styles.stepTitle}>{s.title}</Text>
                  <Text style={styles.stepDetail}>{s.detail}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {suggested.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Suggested Loads</Text>
            {suggested.map((l) => (
              <View key={l.id} style={styles.loadCard} testID="ai-suggested-load">
                <View style={styles.loadHeader}>
                  <Map size={16} color={theme.colors.secondary} />
                  <Text style={styles.loadTitle}>{l.origin.city}, {l.origin.state} → {l.destination.city}, {l.destination.state}</Text>
                </View>
                <Text style={styles.loadMeta}>{l.vehicleType.toUpperCase()} • {l.distance} mi • ${l.rate} • {l.ratePerMile.toFixed(2)} $/mi</Text>
                <Text style={styles.loadDesc}>{l.description}</Text>
                <View style={styles.tagsRow}>
                  <View style={styles.tag}><BarChart3 size={14} color={theme.colors.secondary} /><Text style={styles.tagText}>AI {l.aiScore ?? 0}</Text></View>
                  {l.isBackhaul ? <View style={styles.tag}><Sparkles size={14} color={theme.colors.secondary} /><Text style={styles.tagText}>Backhaul</Text></View> : null}
                </View>
              </View>
            ))}
            <TouchableOpacity style={styles.cta} onPress={adoptSuggestions} activeOpacity={0.9} testID="ai-adopt">
              <Text style={styles.ctaText}>Add {suggested.length} to Loads</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Voice to Filters</Text>
          <Text style={styles.infoText}>Say things like “backhaul 150 miles flatbed min rate $1200”. We’ll set filters accordingly.</Text>
          <View style={{ marginTop: 8 }}>
            <VoiceCapture onTranscribed={applyVoice} size="md" label="Capture Voice" />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.lightGray },
  scroll: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xl },
  hero: { alignItems: 'center', marginBottom: theme.spacing.lg },
  iconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  title: { fontSize: 24, color: theme.colors.dark, fontWeight: '800' as const, textAlign: 'center' as const },
  subtitle: { marginTop: 6, color: theme.colors.gray, fontSize: theme.fontSize.md, textAlign: 'center' as const },
  inputCard: { backgroundColor: theme.colors.white, borderRadius: theme.borderRadius.xl, padding: theme.spacing.lg, borderWidth: 1, borderColor: theme.colors.border },
  label: { color: theme.colors.gray, marginBottom: 6 },
  input: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.lg, borderWidth: 1, borderColor: theme.colors.border, padding: theme.spacing.md, minHeight: 80, color: theme.colors.dark },
  voiceRow: { marginTop: 8, alignItems: 'flex-start' as const },
  runBtn: { marginTop: theme.spacing.md, backgroundColor: theme.colors.secondary, paddingVertical: 14, alignItems: 'center' as const, borderRadius: theme.borderRadius.lg, flexDirection: 'row' as const, justifyContent: 'center' as const, gap: 8 },
  runText: { color: theme.colors.white, fontWeight: '800' as const },
  section: { marginTop: theme.spacing.lg, backgroundColor: theme.colors.white, borderRadius: theme.borderRadius.xl, padding: theme.spacing.lg, borderWidth: 1, borderColor: theme.colors.border },
  sectionTitle: { fontSize: theme.fontSize.lg, fontWeight: '800' as const, color: theme.colors.dark, marginBottom: theme.spacing.md },
  stepRow: { flexDirection: 'row' as const, gap: 12, paddingVertical: 6 },
  stepTextWrap: { flex: 1 },
  stepTitle: { fontWeight: '700' as const, color: theme.colors.dark },
  stepDetail: { color: theme.colors.gray },
  loadCard: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md, marginBottom: 10 },
  loadHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6 },
  loadTitle: { fontWeight: '700' as const, color: theme.colors.dark },
  loadMeta: { color: theme.colors.gray, marginTop: 2 },
  loadDesc: { color: theme.colors.dark, marginTop: 6 },
  tagsRow: { flexDirection: 'row' as const, gap: 8, marginTop: 8 },
  tag: { flexDirection: 'row' as const, gap: 6, alignItems: 'center' as const, backgroundColor: '#F1F5F9', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  tagText: { color: theme.colors.dark, fontWeight: '700' as const, fontSize: theme.fontSize.xs },
  cta: { marginTop: theme.spacing.md, backgroundColor: theme.colors.primary, paddingVertical: 16, alignItems: 'center' as const, borderRadius: theme.borderRadius.lg },
  ctaText: { color: theme.colors.white, fontWeight: '800' as const },
  infoText: { color: theme.colors.gray },
});