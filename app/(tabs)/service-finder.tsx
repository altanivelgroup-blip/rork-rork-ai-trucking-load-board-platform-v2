import React, { useCallback, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Linking,
  Platform,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { theme } from '@/constants/theme';
import { Wrench, MapPin, Phone, ExternalLink, Navigation, AlertTriangle, LocateFixed, Bot } from 'lucide-react-native';


interface ServiceResult {
  id: string;
  name: string;
  category: string;
  address?: string;
  city?: string;
  state?: string;
  distanceMiles?: number;
  phone?: string;
  website?: string;
  notes?: string;
}
interface Coordinates { latitude: number; longitude: number }

import { VoiceCapture } from '@/components/VoiceCapture';
import { PermissionEducation } from '@/components/PermissionEducation';

export default function ServiceFinderScreen() {
  const params = useLocalSearchParams<{ q?: string }>();
  const initialQuery = useMemo(() => (typeof params.q === 'string' ? params.q : ''), [params.q]);

  const [query, setQuery] = useState<string>(initialQuery);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ServiceResult[]>([]);
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [eduVisible, setEduVisible] = useState<boolean>(false);
  const radiusMiles = 100 as const;

  const openLink = useCallback(async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        console.log('[ServiceFinder] Cannot open url', url);
      }
    } catch (e) {
      console.log('[ServiceFinder] openLink error', e);
    }
  }, []);

  const dialNumber = useCallback(async (phone?: string) => {
    if (!phone) return;
    const scheme = Platform.OS === 'ios' ? 'telprompt:' : 'tel:';
    await openLink(`${scheme}${phone}`);
  }, [openLink]);

  const getGeo = useCallback(async (): Promise<Coordinates | null> => {
    try {
      if (Platform.OS === 'web') {
        if (typeof navigator !== 'undefined' && navigator.geolocation) {
          const position = await new Promise<any>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 });
          });
          const { latitude, longitude } = position.coords;
          return { latitude, longitude };
        }
        setError('Geolocation not available in this browser.');
        return null;
      } else {
        const Location = await import('expo-location');
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError('Location permission denied.');
          return null;
        }
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      }
    } catch (e) {
      console.log('[ServiceFinder] getGeo error', e);
      setError('Failed to get location.');
      return null;
    }
  }, []);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    setError(null);
    setResults([]);

    try {
      const system = 'You are an AI that returns nearby truck services as compact JSON only. Do not include prose. Output strictly as {"services": Service[]} where Service = { id, name, category, address?, city?, state?, distanceMiles?, phone?, website?, notes? }. If coordinates and radius are provided, only return services within that radius and include numeric distanceMiles.';
      const where = coords ? `near lat ${coords.latitude}, lon ${coords.longitude} within ${radiusMiles} miles` : 'in the specified area';
      const user = `Find truck maintenance/service centers ${where}. Query: ${query}. Strictly cap results to ${radiusMiles} miles if coordinates provided. Return 8 best options with phone, address, website when possible. Ensure distanceMiles is a number.`;

      console.log('[ServiceFinder] querying AI with', { query });
      const response = await fetch('https://toolkit.rork.com/text/llm/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        }),
      });

      const data = (await response.json()) as { completion?: string };
      const raw = data?.completion ?? '';
      console.log('[ServiceFinder] AI raw completion', raw);

      let parsed: { services?: ServiceResult[] } = {};
      try {
        const jsonStart = raw.indexOf('{');
        const jsonEnd = raw.lastIndexOf('}');
        const json = jsonStart >= 0 && jsonEnd > jsonStart ? raw.slice(jsonStart, jsonEnd + 1) : raw;
        parsed = JSON.parse(json) as { services?: ServiceResult[] };
      } catch (e) {
        console.log('[ServiceFinder] JSON parse fallback error', e);
        setError('Could not parse AI response. Please refine your query.');
        return;
      }

      const items = (parsed.services ?? []).map((s, idx) => ({
        id: s.id ?? String(idx + 1),
        name: s.name ?? 'Service',
        category: s.category ?? 'General',
        address: s.address,
        city: s.city,
        state: s.state,
        distanceMiles: typeof s.distanceMiles === 'number' ? s.distanceMiles : undefined,
        phone: s.phone,
        website: s.website,
        notes: s.notes,
      }));

      setResults(items);
    } catch (e) {
      console.log('[ServiceFinder] AI search error', e);
      setError('Failed to search services. Please try again.');
    } finally {
      setIsSearching(false);
    }
  }, [query]);

  const renderItem = useCallback(({ item }: { item: ServiceResult }) => (
    <View style={styles.card} testID={`service-card-${item.id}`}>
      <View style={styles.cardHeader}>
        <Wrench size={18} color={theme.colors.primary} />
        <Text style={styles.cardTitle}>{item.name}</Text>
      </View>
      <Text style={styles.cardSubtitle}>{item.category}</Text>
      {item.address || item.city || item.state ? (
        <View style={styles.row}>
          <MapPin size={16} color={theme.colors.gray} />
          <Text style={styles.rowText}>
            {item.address ? `${item.address}, ` : ''}{item.city ?? ''}{item.city && item.state ? ', ' : ''}{item.state ?? ''}
          </Text>
        </View>
      ) : null}
      {typeof item.distanceMiles === 'number' ? (
        <Text style={styles.distance}>{item.distanceMiles.toFixed(1)} mi away</Text>
      ) : null}
      {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}

      <View style={styles.actions}>
        {item.phone ? (
          <TouchableOpacity style={styles.actionBtn} onPress={() => dialNumber(item.phone)} testID={`call-${item.id}`}>
            <Phone size={16} color={theme.colors.white} />
            <Text style={styles.actionText}>Call</Text>
          </TouchableOpacity>
        ) : null}
        {item.website ? (
          <TouchableOpacity style={[styles.actionBtn, styles.secondaryBtn]} onPress={() => openLink(item.website!)} testID={`website-${item.id}`}>
            <ExternalLink size={16} color={theme.colors.primary} />
            <Text style={styles.secondaryText}>Website</Text>
          </TouchableOpacity>
        ) : null}
        {(item.address || item.city) ? (
          <TouchableOpacity
            style={[styles.actionBtn, styles.secondaryBtn]}
            onPress={() => openLink(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${item.address ?? ''} ${item.city ?? ''} ${item.state ?? ''}`.trim())}`)}
            testID={`directions-${item.id}`}
          >
            <Navigation size={16} color={theme.colors.primary} />
            <Text style={styles.secondaryText}>Directions</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  ), [dialNumber, openLink]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Wrench size={28} color={theme.colors.primary} />
        <Text style={styles.title}>Service Finder</Text>
      </View>

      <View style={styles.searchBar}>
        <TextInput
          style={styles.input}
          placeholder="Describe service (e.g., 'Trailer brake repair')"
          placeholderTextColor={theme.colors.gray}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          multiline
          testID="service-query-input"
        />
        <View style={styles.ctaColumn}>
          <TouchableOpacity
            style={[styles.locateBtn]}
            onPress={() => setEduVisible(true)}
            testID="use-location-btn"
          >
            <LocateFixed size={18} color={theme.colors.primary} />
            <Text style={styles.locateText}>Use 100mi</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.searchBtn, isSearching && styles.searchBtnDisabled]} onPress={handleSearch} disabled={isSearching} testID="service-search-btn">
            {isSearching ? (
              <ActivityIndicator color={theme.colors.white} />
            ) : (
              <Text style={styles.searchBtnText}>Find</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.searchBtn, styles.aiBtn]} onPress={handleSearch} disabled={isSearching} testID="service-ai-btn">
            <Bot size={16} color={theme.colors.white} />
            <Text style={styles.searchBtnText}>AI</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ paddingHorizontal: 12 }}>
        <VoiceCapture onTranscribed={(t) => setQuery((prev) => (prev ? `${prev} ${t}` : t))} size="sm" label="Speak query" testID="service-voice" />
      </View>

      {coords ? (
        <View style={styles.infoBox} testID="coords-info">
          <MapPin size={14} color={theme.colors.gray} />
          <Text style={styles.infoText}>Searching within {radiusMiles}mi of your location ({coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)})</Text>
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorBox} testID="service-error">
          <AlertTriangle size={16} color={theme.colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={results.length === 0 ? styles.emptyList : styles.list}
        ListEmptyComponent={!isSearching ? (
          <View style={styles.empty} testID="service-empty">
            <Text style={styles.emptyTitle}>Search truck services with AI</Text>
            <Text style={styles.emptySubtitle}>Describe what you need and where. We will fetch nearby options.</Text>
          </View>
        ) : null}
      />
      <PermissionEducation
        type="location"
        visible={eduVisible}
        onCancel={() => setEduVisible(false)}
        onContinue={async () => {
          setEduVisible(false);
          const c = await getGeo();
          if (c) {
            console.log('[ServiceFinder] got coords', c);
            setCoords(c);
          }
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.lightGray },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.lightGray,
  },
  title: { fontSize: theme.fontSize.lg, fontWeight: '700', color: theme.colors.dark },

  searchBar: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    minHeight: 44,
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: theme.fontSize.md,
    color: theme.colors.dark,
  },
  ctaColumn: { gap: 8, justifyContent: 'flex-end' },
  searchBtn: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  aiBtn: { backgroundColor: theme.colors.dark },
  searchBtnDisabled: { opacity: 0.7 },
  searchBtnText: { color: theme.colors.white, fontWeight: '700' },

  locateBtn: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  locateText: { color: theme.colors.primary, fontWeight: '700' },

  infoBox: {
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  infoText: { color: theme.colors.gray },

  errorBox: {
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#FFECEC',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorText: { color: theme.colors.danger },

  list: { paddingHorizontal: 12, paddingBottom: 24 },
  emptyList: { paddingHorizontal: 12, paddingTop: 48 },
  empty: { alignItems: 'center', gap: 6 },
  emptyTitle: { fontSize: theme.fontSize.md, fontWeight: '600', color: theme.colors.dark },
  emptySubtitle: { color: theme.colors.gray, textAlign: 'center' },

  card: {
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: theme.fontSize.md, fontWeight: '700', color: theme.colors.dark },
  cardSubtitle: { color: theme.colors.gray, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  rowText: { color: theme.colors.dark, flex: 1 },
  distance: { marginTop: 6, color: theme.colors.gray },
  notes: { marginTop: 6, color: theme.colors.dark },

  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 10,
    backgroundColor: theme.colors.primary,
  },
  secondaryBtn: { backgroundColor: theme.colors.white, borderWidth: 1, borderColor: theme.colors.lightGray },
  actionText: { color: theme.colors.white, fontWeight: '700' },
  secondaryText: { color: theme.colors.primary, fontWeight: '700' },
});
