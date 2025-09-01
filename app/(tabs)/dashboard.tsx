import React, { useMemo, useCallback, useState, memo } from 'react';
import { View, Text, StyleSheet, ScrollView, ImageBackground, TouchableOpacity, Switch, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'expo-router';
import { Truck, Star, Package, ArrowRight, MapPin, Mic } from 'lucide-react-native';
import { mockLoads } from '@/mocks/loads';
import { SORT_DROPDOWN_ENABLED } from '@/constants/flags';
import { SortDropdown } from '@/components/SortDropdown';

interface RecentLoadProps {
  id: string;
  originCity: string;
  originState: string;
  destinationCity: string;
  destinationState: string;
  pickupDate: string | number | Date;
  weight: number;
  rate: number;
  onPress: (id: string) => void;
}

function formatUSD(amount: number): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount ?? 0);
  } catch (_e) {
    const n = Number(amount ?? 0);
    const parts = Math.round(n).toString().split('');
    for (let i = parts.length - 3; i > 0; i -= 3) parts.splice(i, 0, ',');
    return `$${parts.join('')}`;
  }
}

const RecentLoadRow = memo<RecentLoadProps>(({ id, originCity, originState, destinationCity, destinationState, pickupDate, weight, rate, onPress }) => {
  return (
    <TouchableOpacity key={id} onPress={() => onPress(id)} style={styles.loadRow} testID={`recent-load-${id}`}>
      <View style={styles.loadLeft}>
        <Text style={styles.loadTitle}>{originCity}, {originState}</Text>
        <Text style={styles.loadSub}>{destinationCity}, {destinationState}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>Pickup: {new Date(pickupDate as any).toLocaleDateString?.() ?? String(pickupDate)}</Text>
          <Text style={styles.metaDot}>•</Text>
          <Text style={styles.metaText}>{weight} lbs</Text>
        </View>
      </View>
      <View style={styles.loadRight}>
        <View style={styles.priceChip}>
          <Text style={styles.priceChipText}>{formatUSD(rate)}</Text>
        </View>
        <Text style={styles.favorite}>Favorite</Text>
      </View>
    </TouchableOpacity>
  );
});

export default function DashboardScreen() {
  console.log('[Dashboard] rendering');
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [backhaulOn, setBackhaulOn] = useState<boolean>(false);
  const [origin, setOrigin] = useState<string>('');
  const [destination, setDestination] = useState<string>('');
  const [minWeight, setMinWeight] = useState<string>('');
  const [minPrice, setMinPrice] = useState<string>('');
  const sortOptions = useMemo(() => ['Best', 'Newest', 'Highest $', 'Lightest'] as const, []);
  const [sort, setSort] = useState<(typeof sortOptions)[number]>('Best');
  const handleSortChange = useCallback((next: string) => {
    const valid = sortOptions.find(o => o === next);
    if (valid) setSort(valid);
  }, [sortOptions]);

  console.log('[Dashboard] user:', user?.name, 'isLoading:', isLoading);

  const recentLoads = useMemo(() => mockLoads?.slice(0, 3) ?? [], []);
  const lastDelivery = useMemo(() => recentLoads[0]?.destination, [recentLoads]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Please log in to continue</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleViewAll = useCallback(() => {
    const params: Record<string, string> = {};
    if (origin) params.origin = origin;
    if (destination) params.destination = destination;
    if (minWeight) params.minWeight = minWeight;
    if (minPrice) params.minPrice = minPrice;
    if (sort) params.sort = sort;
    router.push({ pathname: '/(tabs)/(loads)/loads', params });
  }, [router, origin, destination, minWeight, minPrice, sort]);

  const handleOpenLoad = useCallback((loadId: string) => {
    router.push({ pathname: '/load-details', params: { loadId } });
  }, [router]);

  const toggleBackhaul = useCallback((value: boolean) => {
    setBackhaulOn(value);
    if (value && lastDelivery) {
      router.push('/(tabs)/(loads)/loads');
    }
  }, [lastDelivery, router]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ImageBackground
          source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/uzyvqegm8riqj7x0yy7p9' }}
          style={styles.hero}
          imageStyle={styles.heroImage}
          resizeMode="cover"
        >
          <View style={styles.heroOverlay} />
          <Text style={styles.heroTitle} testID="dashboard-hero-title">LoadRun</Text>
          <Text style={styles.heroSubtitle} testID="dashboard-hero-subtitle">AI Load Board for Car Haulers</Text>
        </ImageBackground>

        <View style={styles.welcomeRow}>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.welcomeName}>{user?.name?.split(' ')[0] ?? 'Driver'}</Text>
          <TouchableOpacity style={styles.voiceButton} testID="dashboard-voice-capture">
            <Mic size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard} testID="stat-available-loads">
            <Truck size={20} color={theme.colors.primary} />
            <Text style={styles.statValue}>{mockLoads?.length ?? 0}</Text>
            <Text style={styles.statLabel}>Available Loads</Text>
          </View>
          <View style={styles.statCard} testID="stat-rating">
            <Star size={20} color={theme.colors.warning} />
            <Text style={styles.statValue}>{user?.rating?.toString() ?? '4.8'}</Text>
            <Text style={styles.statLabel}>Your Rating</Text>
          </View>
          <View style={styles.statCard} testID="stat-completed">
            <Package size={20} color={theme.colors.gray} />
            <Text style={styles.statValue}>{user?.completedLoads ?? 24}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
        </View>

        <View style={styles.filtersRow}>
          <TextInput
            style={styles.input}
            placeholder="Origin"
            placeholderTextColor={theme.colors.gray}
            value={origin}
            onChangeText={setOrigin}
            testID="filter-origin"
          />
          <TextInput
            style={styles.input}
            placeholder="Destination"
            placeholderTextColor={theme.colors.gray}
            value={destination}
            onChangeText={setDestination}
            testID="filter-destination"
          />
          <TextInput
            style={styles.input}
            placeholder="Weight ≥"
            placeholderTextColor={theme.colors.gray}
            keyboardType="numeric"
            value={minWeight}
            onChangeText={setMinWeight}
            testID="filter-weight"
          />
          <TextInput
            style={styles.input}
            placeholder="Price ≥"
            placeholderTextColor={theme.colors.gray}
            keyboardType="numeric"
            value={minPrice}
            onChangeText={setMinPrice}
            testID="filter-price"
          />
          {SORT_DROPDOWN_ENABLED ? (
            <SortDropdown value={sort} options={sortOptions as unknown as string[]} onChange={handleSortChange} testID="filter-sort" />
          ) : (
            <TouchableOpacity
              style={styles.sortChip}
              onPress={() => {
                const opts = sortOptions;
                const idx = opts.indexOf(sort);
                const next = opts[(idx + 1) % opts.length];
                setSort(next);
              }}
              testID="filter-sort"
              accessibilityRole="button"
            >
              <Text style={styles.sortChipText}>{sort}</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Loads</Text>
          <TouchableOpacity onPress={handleViewAll} accessibilityRole="button">
            <View style={styles.viewAllRow}>
              <Text style={styles.viewAllText}>View All</Text>
              <ArrowRight size={16} color={theme.colors.primary} />
            </View>
          </TouchableOpacity>
        </View>

        <View>
          {recentLoads?.map((l) => (
            <RecentLoadRow
              key={l.id}
              id={l.id}
              originCity={l.origin?.city ?? 'Unknown'}
              originState={l.origin?.state ?? 'Unknown'}
              destinationCity={l.destination?.city ?? 'Unknown'}
              destinationState={l.destination?.state ?? 'Unknown'}
              pickupDate={l.pickupDate ?? new Date()}
              weight={l.weight ?? 0}
              rate={l.rate ?? 0}
              onPress={handleOpenLoad}
            />
          )) ?? []}
        </View>

        <View style={styles.backhaulCard} testID="backhaul-toggle-card">
          <View style={styles.backhaulRow}>
            <MapPin size={22} color="#1D4ED8" />
            <Text style={styles.backhaulTitle}>Backhaul near delivery (50mi)</Text>
          </View>
          <Text style={styles.backhaulSub} numberOfLines={2}>
            {lastDelivery ? `${lastDelivery.city}, ${lastDelivery.state}` : 'No recent delivery found'}
          </Text>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Show backhaul loads</Text>
            <Switch
              value={backhaulOn}
              onValueChange={(val) => {
                if (val && !lastDelivery) {
                  console.log('Backhaul: cannot enable without a recent delivery');
                  return;
                }
                toggleBackhaul(val);
              }}
              trackColor={{ false: theme.colors.gray, true: '#EA580C' }}
              thumbColor={theme.colors.white}
              disabled={false}
              testID="backhaul-switch"
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.lightGray,
  },
  content: {
    paddingBottom: theme.spacing.xl,
  },
  hero: {
    height: 160,
    justifyContent: 'flex-end',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.primary,
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
  },
  heroImage: {
    borderRadius: theme.borderRadius.lg,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: theme.borderRadius.lg,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.white,
  },
  heroSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.white,
    opacity: 0.9,
    marginTop: 2,
    marginBottom: 2,
  },
  welcomeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    justifyContent: 'space-between',
  },
  voiceButton: {
    padding: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.lightGray,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.gray,
  },
  welcomeText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
  },
  welcomeName: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.dark,
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.white,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.dark,
  },
  statLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray,
  },
  sectionHeader: {
    marginTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filtersRow: {
    marginTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.dark,
  },
  viewAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    color: theme.colors.primary,
    fontWeight: '600',
    marginRight: 6,
  },
  loadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  loadLeft: {
    flex: 1,
    paddingRight: theme.spacing.md,
  },
  loadRight: {
    alignItems: 'flex-end',
  },
  loadTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  loadSub: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  metaText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray,
  },
  metaDot: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray,
  },
  price: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  priceChip: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9999,
    minWidth: 80,
    alignItems: 'center',
  },
  priceChipText: {
    color: theme.colors.white,
    fontWeight: '600',
    fontSize: theme.fontSize.md,
  },
  favorite: {
    marginTop: 6,
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray,
  },
  backhaulCard: {
    backgroundColor: '#EA580C',
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.xl,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: '#C2410C',
    shadowColor: '#9A3412',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  backhaulRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backhaulTitle: {
    marginLeft: 6,
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.white,
  },
  backhaulSub: {
    marginTop: 4,
    fontSize: theme.fontSize.sm,
    color: theme.colors.white,
    opacity: 0.9,
  },
  toggleRow: {
    marginTop: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.white,
  },
  sortChip: {
    backgroundColor: theme.colors.white,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: theme.colors.lightGray,
  },
  sortChipText: {
    color: theme.colors.dark,
    fontWeight: '600',
    fontSize: theme.fontSize.sm,
  },
  input: {
    backgroundColor: theme.colors.white,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.lightGray,
    minWidth: 120,
    flexGrow: 1,
  },
});
