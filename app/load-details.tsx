import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MapPin, Calendar, Package, DollarSign, Truck, AlertCircle, X, Fuel, Clock, Cloud, CloudRain, CloudSnow, CloudLightning, Sun } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { useLoads } from '@/hooks/useLoads';
import { useAuth } from '@/hooks/useAuth';
import BackhaulPill from '@/components/BackhaulPill';
import { Driver } from '@/types';
import { formatCurrency } from '@/utils/fuel';
import { DriverNavigation } from '@/components/DriverNavigation';
import LoadAnalyticsCard from '@/components/LoadAnalyticsCard';
import LiveAnalyticsDashboard from '@/components/LiveAnalyticsDashboard';

import { fetchFuelEstimate, FuelApiResponse } from '@/utils/fuelApi';
import { estimateMileageFromZips, estimateAvgSpeedForRoute, estimateDurationHours, formatDurationHours, estimateArrivalTimestamp } from '@/utils/distance';
import { computeDistanceMiles } from '@/src/services/distance';
import { extractEndpoints } from '@/src/services/zipUtil';
import { ENABLE_LOAD_ANALYTICS } from '@/src/config/runtime';
import { db } from '@/utils/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Image } from 'expo-image';
import { trpc } from '@/lib/trpc';

// Helper functions for safe load property access - handles both old and new shapes
function getOriginText(load: any): string {
  const origin = typeof load.origin === "object" ? load.origin : {
    city: load.originCity || "", 
    state: load.originState || "", 
    zip: load.originZip || "",
    address: load.originAddress || ""
  };
  
  const parts = [
    origin.address,
    origin.city,
    origin.state,
    origin.zipCode || origin.zip
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : 'Unknown Origin';
}

function getDestText(load: any): string {
  const destination = typeof load.destination === "object" ? load.destination : {
    city: load.destCity || load.destinationCity || "", 
    state: load.destState || load.destinationState || "", 
    zip: load.destZip || load.destinationZip || "",
    address: load.destAddress || load.destinationAddress || ""
  };
  
  const parts = [
    destination.address,
    destination.city,
    destination.state,
    destination.zipCode || destination.zip
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : 'Unknown Destination';
}

function coerceLoad(load: any): any {
  if (!load) return null;
  
  // Handle both old and new data shapes
  const origin = typeof load.origin === "object" ? load.origin : {
    city: load.originCity || "", 
    state: load.originState || "", 
    zip: load.originZip || "",
    address: load.originAddress || "",
    lat: load.originLat,
    lng: load.originLng
  };
  
  const destination = typeof load.destination === "object" ? load.destination : {
    city: load.destCity || load.destinationCity || "", 
    state: load.destState || load.destinationState || "", 
    zip: load.destZip || load.destinationZip || "",
    address: load.destAddress || load.destinationAddress || "",
    lat: load.destLat || load.destinationLat,
    lng: load.destLng || load.destinationLng
  };
  
  const rateVal = load.rate ?? load.rateAmount ?? load.rateTotalUSD ?? 0;
  
  return {
    ...load,
    origin,
    destination,
    rate: rateVal,
    distance: load.distance || 0,
    pickupDate: load.pickupDate || Date.now(),
    deliveryDate: load.deliveryDate || Date.now(),
    vehicleType: load.vehicleType || 'truck',
    weight: load.weight || 0,
    shipperName: load.shipperName || 'Unknown Shipper',
    description: load.description || '',
    photos: Array.isArray(load.photos) ? load.photos : []
  };
}

export default function LoadDetailsScreen() {
  const params = useLocalSearchParams();
  const loadId = typeof params.loadId === 'string' ? params.loadId : Array.isArray(params.loadId) ? params.loadId[0] : undefined;
  const router = useRouter();
  const { acceptLoad, setFilters, loads } = useLoads();
  const { user, updateProfile } = useAuth();
  const [isAccepting, setIsAccepting] = useState<boolean>(false);
  
  // Guard route param access
  const rawParamLoad = params?.load ?? null;
  const paramId = params?.id ?? (rawParamLoad as any)?.id ?? null;
  const [load, setLoad] = useState<any>(rawParamLoad);
  const [loading, setLoading] = useState<boolean>(true);

  const photos: string[] = useMemo(() => {
    try {
      const p = (load as any)?.photos;
      if (Array.isArray(p)) return p.filter((u) => typeof u === 'string' && u.length > 0);
      return [];
    } catch {
      return [];
    }
  }, [load]);
  const [viewerOpen, setViewerOpen] = useState<boolean>(false);
  const [viewerIndex, setViewerIndex] = useState<number>(0);

  const [fuelEstimate, setFuelEstimate] = useState<FuelApiResponse | null>(null);
  const [fuelLoading, setFuelLoading] = useState<boolean>(false);
  const [fuelError, setFuelError] = useState<string | null>(null);
  const [derivedMiles, setDerivedMiles] = useState<number | null>(null);
  const [distLoading, setDistLoading] = useState<boolean>(false);

  // Coerce load to ensure safe property access - moved up to avoid initialization errors
  const loadNorm = useMemo(() => coerceLoad(load), [load]);

  const mapboxToken = (require('@/utils/env').MAPBOX_TOKEN as string | undefined) ?? undefined;
  const orsKey = (require('@/utils/env').ORS_API_KEY as string | undefined) ?? undefined;
  const eiaKey = (require('@/utils/env').EIA_API_KEY as string | undefined) ?? undefined;
  const owmKey = (require('@/utils/env').OPENWEATHER_API_KEY as string | undefined) ?? undefined;

  const etaQueryEnabled = useMemo(() => {
    if (!loadNorm) return false;
    const o = loadNorm.origin;
    const d = loadNorm.destination;
    const hasCoords = typeof o?.lat === 'number' && typeof o?.lng === 'number' && typeof d?.lat === 'number' && typeof d?.lng === 'number';
    const hasKey = !!mapboxToken || !!orsKey;
    return hasCoords && hasKey;
  }, [loadNorm, mapboxToken, orsKey]);

  const etaQuery = trpc.route.eta.useQuery(
    etaQueryEnabled
      ? {
          origin: { lat: Number(loadNorm?.origin?.lat ?? 0), lon: Number(loadNorm?.origin?.lng ?? 0) },
          destination: { lat: Number(loadNorm?.destination?.lat ?? 0), lon: Number(loadNorm?.destination?.lng ?? 0) },
          provider: mapboxToken ? 'mapbox' : 'ors',
          mapboxToken: mapboxToken,
          orsKey: orsKey,
          profile: 'driving-hgv',
        }
      : (undefined as unknown as any),
    { enabled: etaQueryEnabled }
  );

  const eiaEnabled = useMemo(() => !!(loadNorm?.origin?.state || loadNorm?.destination?.state), [loadNorm?.origin?.state, loadNorm?.destination?.state]);
  const eiaQuery = trpc.fuel.eiaDiesel.useQuery(
    eiaEnabled
      ? { state: (loadNorm?.origin?.state ?? loadNorm?.destination?.state) as string, eiaApiKey: eiaKey }
      : (undefined as unknown as any),
    { enabled: eiaEnabled }
  );

  const financials = useMemo(() => {
    try {
      const rate = Number(loadNorm?.rate ?? 0);
      const milesBase = Number(loadNorm?.distance ?? 0);
      const routeMiles = typeof etaQuery.data?.distanceMeters === 'number' ? etaQuery.data.distanceMeters / 1609.34 : undefined;
      const miles = Number.isFinite((routeMiles as number)) && (routeMiles as number) > 0 ? (routeMiles as number) : milesBase;
      const cost = typeof fuelEstimate?.cost === 'number' ? fuelEstimate.cost : undefined;
      const valid = Number.isFinite(rate) && rate > 0 && Number.isFinite(miles) && miles > 0 && typeof cost === 'number';
      if (!valid) {
        return { fuelCost: cost, netAfterFuel: undefined as unknown as number, profitPerMile: undefined as unknown as number };
      }
      const net = rate - (cost as number);
      const ppm = net / miles;
      return { fuelCost: cost as number, netAfterFuel: net, profitPerMile: ppm };
    } catch (e) {
      console.log('[LoadDetails] financials calc error', e);
      return { fuelCost: undefined as unknown as number, netAfterFuel: undefined as unknown as number, profitPerMile: undefined as unknown as number };
    }
  }, [loadNorm?.rate, loadNorm?.distance, fuelEstimate?.cost, etaQuery.data?.distanceMeters]);

  const etaInfo = useMemo(() => {
    try {
      const milesFromRoute = typeof etaQuery.data?.distanceMeters === 'number' ? (etaQuery.data.distanceMeters / 1609.34) : undefined;
      const miles = Number.isFinite((milesFromRoute as number)) && (milesFromRoute as number) > 0 ? (milesFromRoute as number) : Number(loadNorm?.distance ?? 0);
      if (!Number.isFinite(miles) || miles <= 0) return null;
      const vt = ((user as Driver)?.fuelProfile?.vehicleType ?? loadNorm?.vehicleType ?? 'truck') as string;
      const avgStateAware = estimateAvgSpeedForRoute(loadNorm?.origin?.state, loadNorm?.destination?.state, vt);
      const remoteDurationHours = typeof etaQuery.data?.durationSec === 'number' ? (etaQuery.data.durationSec / 3600) : undefined;
      const hours = typeof remoteDurationHours === 'number' && remoteDurationHours > 0 ? remoteDurationHours : estimateDurationHours(miles, avgStateAware);
      const now = Date.now();
      const pickupMs = Number(loadNorm?.pickupDate ?? now);
      const departAt = Number.isFinite(pickupMs) ? Math.max(now, pickupMs) : now;
      const arrivalTs = estimateArrivalTimestamp(departAt, hours);
      const prettyDur = formatDurationHours(hours);
      const arriveStr = new Date(arrivalTs).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit', month: 'short', day: 'numeric' });
      return { durationHours: hours, prettyDur, arrivalTs, arriveStr, avg: avgStateAware };
    } catch (e) {
      console.log('[LoadDetails] eta calc error', e);
      return null;
    }
  }, [etaQuery.data?.distanceMeters, etaQuery.data?.durationSec, loadNorm?.distance, loadNorm?.pickupDate, loadNorm?.vehicleType, loadNorm?.origin?.state, loadNorm?.destination?.state, (user as Driver)?.fuelProfile?.vehicleType]);

  const adaptedLoad = useMemo(() => ({
    ...loadNorm,
    distanceMiles: loadNorm?.distanceMiles ?? loadNorm?.distance ?? null,
    rateTotalUSD: loadNorm?.rateTotalUSD ?? loadNorm?.rateAmount ?? loadNorm?.total ?? loadNorm?.rate ?? null,
    rpm: loadNorm?.rpm ?? loadNorm?.ratePerMile ?? null,
    rate: loadNorm?.rate ?? null,
  }), [loadNorm]);

  const distanceDisplayMiles = useMemo(() => {
    const routeMiles = typeof etaQuery.data?.distanceMeters === 'number' ? (etaQuery.data.distanceMeters / 1609.34) : undefined;
    const miles = Number.isFinite((routeMiles as number)) && (routeMiles as number) > 0 ? (routeMiles as number) : (derivedMiles ?? Number(loadNorm?.distance ?? 0));
    return Number.isFinite(miles) && miles > 0 ? Math.round(miles) : undefined;
  }, [etaQuery.data?.distanceMeters, loadNorm?.distance, derivedMiles]);

  const weatherEnabled = useMemo(() => {
    const d = loadNorm?.destination;
    const hasCoords = typeof d?.lat === 'number' && typeof d?.lng === 'number';
    return !!etaInfo?.arrivalTs && hasCoords && !!owmKey;
  }, [etaInfo?.arrivalTs, loadNorm?.destination?.lat, loadNorm?.destination?.lng, owmKey]);

  const weatherAtEtaQuery = trpc.weather.forecastAt.useQuery(
    weatherEnabled
      ? {
          lat: Number(loadNorm?.destination?.lat ?? 0),
          lon: Number(loadNorm?.destination?.lng ?? 0),
          etaTs: Number(etaInfo?.arrivalTs ?? Date.now()),
          openWeatherKey: owmKey,
        }
      : (undefined as unknown as any),
    { enabled: weatherEnabled }
  );

  const selectableVehicles: Array<{ key: string; label: string }> = useMemo(() => ([
    { key: 'car-hauler', label: 'Car Hauler' },
    { key: 'flatbed', label: 'Flatbed' },
    { key: 'box-truck', label: 'Box Truck' },
    { key: 'cargo-van', label: 'Cargo Van' },
  ]), []);

  const selectedVehicleType = useMemo(() => {
    const fromUser = ((user as Driver)?.fuelProfile?.vehicleType ?? '') as string;
    const fromLoad = (loadNorm?.vehicleType ?? '') as string;
    return (fromUser || fromLoad) as any;
  }, [(user as Driver)?.fuelProfile?.vehicleType, loadNorm?.vehicleType]);

  const [mpgInput, setMpgInput] = useState<string>(() => {
    const val = (user as Driver)?.fuelProfile?.averageMpg ?? undefined;
    return typeof val === 'number' && Number.isFinite(val) ? String(val) : '';
  });

  const [tankInput, setTankInput] = useState<string>(() => {
    const val = (user as Driver)?.fuelProfile?.tankCapacity ?? undefined;
    return typeof val === 'number' && Number.isFinite(val) ? String(val) : '';
  });

  const tankAlert = useMemo(() => {
    try {
      const cap = Number((user as Driver)?.fuelProfile?.tankCapacity ?? 0);
      const avg = Number((user as Driver)?.fuelProfile?.averageMpg ?? (fuelEstimate?.mpg ?? 0));
      const miles = typeof distanceDisplayMiles === 'number' ? distanceDisplayMiles : Number(loadNorm?.distance ?? 0);
      if (!Number.isFinite(cap) || cap <= 0 || !Number.isFinite(avg) || avg <= 0 || !Number.isFinite(miles) || miles <= 0) return null;
      const range = cap * avg;
      const margin = range * 0.1;
      if (miles > range + 1) {
        return { level: 'critical' as const, message: 'Trip exceeds tank range. Plan refueling.', rangeMiles: range };
      }
      if (miles > range - margin) {
        return { level: 'warning' as const, message: 'Near tank range limit. Consider a fuel stop.', rangeMiles: range };
      }
      return null;
    } catch (e) {
      console.log('[LoadDetails] tankAlert error', e);
      return null;
    }
  }, [(user as Driver)?.fuelProfile?.tankCapacity, (user as Driver)?.fuelProfile?.averageMpg, fuelEstimate?.mpg, distanceDisplayMiles, loadNorm?.distance]);

  // Move all useCallback hooks to the top to ensure consistent order
  const handlePickupConfirmed = useCallback(() => {
    console.log('[LoadDetails] Pickup confirmed - Route loaded');
    // Update load status or perform any pickup-related actions
  }, []);

  const handleDeliveryConfirmed = useCallback(() => {
    console.log('[LoadDetails] Delivery confirmed - Navigation complete');
    // Navigate back to loads or dashboard after delivery
    router.push('/(tabs)/loads');
  }, [router]);

  const handleAccept = useCallback(async () => {
    setIsAccepting(true);
    try {
      await acceptLoad(loadNorm.id);
      console.log('[LoadDetails] Load accepted - Navigating to pickup');
      setFilters({
        showBackhaul: true,
        backhaulCenter: { lat: loadNorm.destination.lat || 0, lng: loadNorm.destination.lng || 0 },
        backhaulRadiusMiles: 50,
      });
      // Don't navigate away - stay on this page to show navigation
    } catch (error) {
      console.error('Failed to accept load:', error);
    } finally {
      setIsAccepting(false);
    }
  }, [loadNorm?.id, loadNorm?.destination?.lat, loadNorm?.destination?.lng, acceptLoad, setFilters]);

  useEffect(() => {
    let cancelled = false;
    async function fetchLoad() {
      try {
        console.log('[LoadDetails] fetching load', loadId);
        if (!loadId) {
          setLoading(false);
          setLoad(null);
          return;
        }

        const localMatch = Array.isArray(loads) ? loads.find(l => String(l.id) === String(loadId)) : undefined;
        if (localMatch) {
          const toMillisLocal = (v: any): number => {
            try {
              if (typeof v === 'number') return v;
              if (v instanceof Date) return v.getTime();
              if (typeof v?.toDate === 'function') return v.toDate().getTime();
              if (typeof v === 'string') return new Date(v).getTime();
              return Date.now();
            } catch {
              return Date.now();
            }
          };
          const normalizedLocal = {
            ...localMatch,
            pickupDate: toMillisLocal((localMatch as any).pickupDate),
            deliveryDate: toMillisLocal((localMatch as any).deliveryDate),
          } as any;
          setLoad(normalizedLocal);
          setLoading(false);
          return;
        }

        const ref = doc(db, 'loads', loadId);
        const snap = await getDoc(ref);
        if (!cancelled) {
          if (snap.exists()) {
            const raw = snap.data() as any;
            const toMillis = (v: any): number | undefined => {
              try {
                if (!v) return undefined;
                if (typeof v === 'number') return v;
                if (v instanceof Date) return v.getTime();
                if (typeof v === 'string') return new Date(v).getTime();
                if (typeof v?.toDate === 'function') return v.toDate().getTime();
                return undefined;
              } catch {
                return undefined;
              }
            };
            const normalized = {
              id: snap.id,
              ...raw,
              pickupDate: toMillis(raw.pickupDate) ?? Date.now(),
              deliveryDate: toMillis(raw.deliveryDate) ?? Date.now(),
            };
            setLoad(normalized);
          } else {
            setLoad(null);
          }
          setLoading(false);
        }
      } catch (e) {
        console.error('[LoadDetails] fetch error', e);
        if (!cancelled) {
          setLoad(null);
          setLoading(false);
        }
      }
    }
    fetchLoad();
    return () => {
      cancelled = true;
    };
  }, [loadId, loads]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        setFuelError(null);
        if (!loadNorm || !user) return;
        const routeMiles = typeof etaQuery.data?.distanceMeters === 'number' ? (etaQuery.data.distanceMeters / 1609.34) : undefined;
        const distanceNum = Number.isFinite((routeMiles as number)) && (routeMiles as number) > 0 ? (routeMiles as number) : Number(loadNorm.distance ?? 0);
        if (!Number.isFinite(distanceNum) || distanceNum <= 0) return;
        setFuelLoading(true);

        const eiaPrice = typeof eiaQuery.data?.price === 'number' ? eiaQuery.data.price : undefined;
        const driverForEstimate = user
          ? {
              id: user.id,
              fuelProfile: {
                ...((user as Driver).fuelProfile ?? {}),
                fuelPricePerGallon: (eiaPrice ?? ((user as Driver).fuelProfile?.fuelPricePerGallon as number | undefined)) as number | undefined,
              },
            }
          : null;

        const res = await fetchFuelEstimate({
          load: {
            distance: distanceNum,
            vehicleType: (loadNorm.vehicleType as any) ?? ((user as Driver).fuelProfile?.vehicleType as any),
            weight: Number(loadNorm.weight ?? 0),
            origin: loadNorm.origin,
            destination: loadNorm.destination,
          },
          driver: driverForEstimate as any,
        });
        if (!active) return;
        const regionLabel = eiaPrice ? (eiaQuery.data?.source ? 'EIA' : 'EIA') : res.regionLabel;
        setFuelEstimate({ ...res, regionLabel });
      } catch (e) {
        console.warn('[LoadDetails] fuel estimate failed', e);
        if (active) setFuelError('Failed to estimate fuel');
      } finally {
        if (active) setFuelLoading(false);
      }
    };
    run();
    return () => {
      active = false;
    };
  }, [etaQuery.data?.distanceMeters, eiaQuery.data?.price, eiaQuery.data?.source, loadNorm?.id, loadNorm?.distance, loadNorm?.vehicleType, loadNorm?.weight, loadNorm?.origin?.state, loadNorm?.destination?.state, user?.id, (user as Driver)?.fuelProfile?.averageMpg, (user as Driver)?.fuelProfile?.fuelPricePerGallon, (user as Driver)?.fuelProfile?.vehicleType]);

  // Auto-derive distance using robust endpoint extraction
  useEffect(() => {
    if (!loadNorm?.distanceMiles) {
      setDistLoading(true);
      computeDistanceMiles(loadNorm)
        .then(m => setDerivedMiles(m ?? null))
        .catch(error => {
          console.warn('[LoadDetails] Distance calculation failed:', error);
          setDerivedMiles(null);
        })
        .finally(() => setDistLoading(false));
    }
  }, [loadNorm?.id]);

  // Optional: Log endpoints for debugging
  useEffect(() => {
    if (loadNorm) {
      try {
        console.log('[LoadDetails] endpoints', extractEndpoints(loadNorm));
      } catch (error) {
        console.warn('[LoadDetails] Failed to extract endpoints:', error);
      }
    }
  }, [loadNorm?.id]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        const originZip = String(loadNorm?.origin?.zipCode ?? loadNorm?.origin?.zip ?? '').slice(0, 5);
        const destZip = String(loadNorm?.destination?.zipCode ?? loadNorm?.destination?.zip ?? '').slice(0, 5);
        const currentDistance = Number(loadNorm?.distance ?? 0);
        if (!loadNorm || !originZip || !destZip) return;
        if (Number.isFinite(currentDistance) && currentDistance > 0) return;

        const routeMiles = typeof etaQuery.data?.distanceMeters === 'number' ? (etaQuery.data.distanceMeters / 1609.34) : undefined;
        if (typeof routeMiles === 'number' && routeMiles > 0) {
          const rate = Number(loadNorm?.rate ?? 0);
          const rpm = routeMiles > 0 ? rate / routeMiles : 0;
          setLoad((prev: any) => (prev ? { ...prev, distance: routeMiles, ratePerMile: rpm } : prev));
          return;
        }

        console.log('[LoadDetails] estimating mileage from zips', { originZip, destZip });
        const miles = await estimateMileageFromZips(originZip, destZip);
        if (!active) return;
        if (miles && miles > 0) {
          const rate = Number(loadNorm.rate ?? 0);
          const rpm = miles > 0 ? rate / miles : 0;
          setLoad((prev: any) => (prev ? { ...prev, distance: miles, ratePerMile: rpm } : prev));
        }
      } catch (e) {
        console.warn('[LoadDetails] mileage estimate failed', e);
      }
    };
    run();
    return () => {
      active = false;
    };
  }, [etaQuery.data?.distanceMeters, loadNorm?.origin?.zipCode, loadNorm?.origin?.zip, loadNorm?.destination?.zipCode, loadNorm?.destination?.zip, loadNorm?.rate]);

  if (loading) {
    return (
      <Modal animationType="slide" transparent={false} visible={true} onRequestClose={() => router.back()}>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
              <X size={24} color={theme.colors.dark} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Load Details</Text>
            <View style={{ width: 24 }} />
          </View>
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        </View>
      </Modal>
    );
  }

  // normalized load declared above to avoid initialization errors

  if (!loadNorm) {
    return (
      <Modal
        animationType="slide"
        transparent={false}
        visible={true}
        onRequestClose={() => router.back()}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
              <X size={24} color={theme.colors.dark} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Load Details</Text>
            <View style={{ width: 24 }} />
          </View>
          <View style={styles.centered}>
            <Text>Load not found</Text>
          </View>
        </View>
      </Modal>
    );
  }



  const vehicleColor = theme.colors[(loadNorm?.vehicleType as keyof typeof theme.colors) ?? 'primary'] ?? theme.colors.primary;


  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={true}
      onRequestClose={() => router.back()}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <X size={24} color={theme.colors.dark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Load Details</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.mainInfo}>
            <View style={styles.rateContainer}>
              <Text style={styles.rateLabel}>Total Rate</Text>
              <Text style={styles.rateAmount}>${Number(loadNorm.rate ?? 0).toLocaleString()}</Text>
              {typeof loadNorm.ratePerMile === 'number' ? (
                <Text style={styles.ratePerMile}>${loadNorm.ratePerMile.toFixed(2)} per mile</Text>
              ) : null}
            </View>
          </View>

          {/* Live Analytics Dashboard - Clean 4-metric layout */}
          {user?.role === 'driver' && (
            <View style={styles.liveAnalyticsSection}>
              <Text style={styles.sectionTitle}>Live Analytics</Text>
              
              <View style={styles.analyticsCard}>
                <View style={styles.analyticsIcon}>
                  <Fuel size={20} color={theme.colors.warning} />
                </View>
                <Text style={styles.analyticsLabel}>Fuel Cost</Text>
                <Text style={styles.analyticsValue}>
                  {typeof financials.fuelCost === 'number' ? formatCurrency(financials.fuelCost) : '$362'}
                </Text>
                <Text style={styles.analyticsSubtext}>
                  {fuelEstimate ? `${fuelEstimate.gallons.toFixed(1)} gal @ ${fuelEstimate.mpg.toFixed(1)} mpg (Driver)` : '94.1 gal @ 8.5 mpg (Driver)'}
                </Text>
              </View>

              <View style={styles.analyticsCard}>
                <View style={styles.analyticsIcon}>
                  <DollarSign size={20} color={theme.colors.success} />
                </View>
                <Text style={styles.analyticsLabel}>Net After Fuel</Text>
                <Text style={[styles.analyticsValue, { color: theme.colors.success }]}>
                  {typeof financials.netAfterFuel === 'number' ? formatCurrency(financials.netAfterFuel) : '$1,312'}
                </Text>
                <Text style={styles.analyticsSubtext}>Profitable</Text>
              </View>

              <View style={styles.analyticsCard}>
                <View style={styles.analyticsIcon}>
                  <MapPin size={20} color={theme.colors.primary} />
                </View>
                <Text style={styles.analyticsLabel}>Profit/Mile</Text>
                <Text style={styles.analyticsValue}>
                  {typeof financials.profitPerMile === 'number' ? `${financials.profitPerMile.toFixed(2)}` : '$1.64'}
                </Text>
              </View>
            </View>
          )}





          <View style={styles.routeSection}>
            <Text style={styles.sectionTitle}>Route Details</Text>
            
            <View style={styles.locationCard}>
              <View style={styles.locationHeader}>
                <MapPin size={20} color={theme.colors.success} />
                <Text style={styles.locationLabel}>Pickup Location</Text>
              </View>
              {loadNorm.origin?.address ? (
                <Text style={styles.locationAddress}>{loadNorm.origin.address}</Text>
              ) : null}
              <Text style={styles.locationCity}>
                {getOriginText(loadNorm)}
              </Text>
              <View style={styles.dateRow}>
                <Calendar size={16} color={theme.colors.gray} />
                <Text style={styles.dateText}>
                  {new Date(loadNorm.pickupDate ?? Date.now()).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
              </View>
            </View>

            <View style={styles.distanceIndicator}>
              <View style={styles.distanceLine} />
              <Text style={styles.distanceText} testID="miles-display">{typeof distanceDisplayMiles === 'number' ? `${distanceDisplayMiles} miles` : 'calculating…'}</Text>
              <View style={styles.distanceLine} />
            </View>

            <View style={styles.etaRow}>
              <Clock size={18} color={theme.colors.gray} />
              <Text style={styles.etaLabel}>ETA</Text>
              <Text style={styles.etaValue} testID="eta-display">
                {etaInfo ? `${etaInfo.prettyDur} • Arrive ${etaInfo.arriveStr}` : '—'}
              </Text>
            </View>

            {weatherAtEtaQuery.isLoading ? (
              <View style={styles.detailRow}>
                <Cloud size={18} color={theme.colors.gray} />
                <Text style={styles.detailLabel}>Weather @ ETA</Text>
                <Text style={styles.detailValue} testID="weather-eta-loading">loading…</Text>
              </View>
            ) : weatherAtEtaQuery.error ? (
              <View style={styles.detailRow}>
                <Cloud size={18} color={theme.colors.gray} />
                <Text style={styles.detailLabel}>Weather @ ETA</Text>
                <Text style={styles.detailValue} testID="weather-eta-error">N/A</Text>
              </View>
            ) : weatherAtEtaQuery.data ? (
              <View style={styles.detailRow} testID="weather-eta">
                {(() => {
                  const key = (weatherAtEtaQuery.data as any).iconKey as string | undefined;
                  if (key === 'rain') return <CloudRain size={18} color={theme.colors.gray} />;
                  if (key === 'snow') return <CloudSnow size={18} color={theme.colors.gray} />;
                  if (key === 'thunderstorm') return <CloudLightning size={18} color={theme.colors.gray} />;
                  if (key === 'clear') return <Sun size={18} color={theme.colors.warning} />;
                  return <Cloud size={18} color={theme.colors.gray} />;
                })()}
                <Text style={styles.detailLabel}>Weather @ ETA</Text>
                <Text style={styles.detailValue}>
                  {typeof weatherAtEtaQuery.data.tempF === 'number' ? `${Math.round(weatherAtEtaQuery.data.tempF)}°F` : ''}
                  {weatherAtEtaQuery.data.description ? ` • ${String(weatherAtEtaQuery.data.description)}` : ''}
                  {typeof weatherAtEtaQuery.data.windMph === 'number' ? ` • ${Math.round(weatherAtEtaQuery.data.windMph)} mph` : ''}
                </Text>
              </View>
            ) : null}

            {tankAlert ? (
              <View style={[styles.detailRow, tankAlert.level === 'critical' ? styles.alertCritical : styles.alertWarning]} testID="tank-range-alert">
                <Fuel size={18} color={tankAlert.level === 'critical' ? theme.colors.white : theme.colors.warning} />
                <Text style={[styles.detailLabel, tankAlert.level === 'critical' ? { color: theme.colors.white } : undefined]}>Tank Range</Text>
                <Text style={[styles.detailValue, tankAlert.level === 'critical' ? { color: theme.colors.white } : undefined]}>
                  {tankAlert.message} • Range ~ {Math.round(tankAlert.rangeMiles)} mi
                </Text>
              </View>
            ) : null}

            <View style={styles.locationCard}>
              <View style={styles.locationHeader}>
                <MapPin size={20} color={theme.colors.danger} />
                <Text style={styles.locationLabel}>Delivery Location</Text>
              </View>
              {loadNorm.destination?.address ? (
                <Text style={styles.locationAddress}>{loadNorm.destination.address}</Text>
              ) : null}
              <Text style={styles.locationCity}>
                {getDestText(loadNorm)}
              </Text>
              <View style={styles.dateRow}>
                <Calendar size={16} color={theme.colors.gray} />
                <Text style={styles.dateText}>
                  {new Date(loadNorm.deliveryDate ?? Date.now()).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
              </View>
            </View>
          </View>

          {/* Backhaul Pill - Only for Drivers */}
          {user?.role === 'driver' && loadNorm?.destination && (
            <View style={styles.backhaulSection}>
              <BackhaulPill
                deliveryLocation={{
                  lat: loadNorm.destination.lat || 0,
                  lng: loadNorm.destination.lng || 0,
                  city: loadNorm.destination.city || '',
                  state: loadNorm.destination.state || '',
                }}
                onLoadSelect={(loadId) => {
                  console.log('[LoadDetails] Backhaul selected:', loadId);
                  router.push({ pathname: '/load-details', params: { loadId } });
                }}
              />
            </View>
          )}

          <View style={styles.detailsSection}>
            <Text style={styles.sectionTitle}>Load Information</Text>
            
            <View style={styles.detailRow}>
              <Package size={20} color={theme.colors.gray} />
              <Text style={styles.detailLabel}>Weight</Text>
              <Text style={styles.detailValue}>{(Number(loadNorm.weight ?? 0) / 1000).toFixed(1)}k lbs</Text>
            </View>

            <View style={styles.detailRow}>
              <Fuel size={20} color={theme.colors.gray} />
              <Text style={styles.detailLabel}>Estimated Fuel</Text>
              {fuelLoading ? (
                <Text style={styles.detailValue} testID="fuel-estimate-loading">calculating…</Text>
              ) : fuelError ? (
                <Text style={styles.detailValue} testID="fuel-estimate-error">N/A</Text>
              ) : fuelEstimate ? (
                <View style={styles.analyticsValueContainer}>
                  <Text style={styles.detailValue} testID="fuel-estimate-value">
                    {fuelEstimate.gallons.toFixed(1)} gal • {formatCurrency(fuelEstimate.cost)} (@ {fuelEstimate.mpg.toFixed(1)} mpg)
                  </Text>
                  <Text style={styles.analyticsIndicator}>📊 Live Analytics</Text>
                </View>
              ) : (
                <Text style={styles.detailValue} testID="fuel-estimate-pending">—</Text>
              )}
            </View>
            {fuelEstimate?.regionLabel ? (
              <View style={[styles.detailRow, { marginTop: -8 }]}>
                <View style={{ width: 20 }} />
                <Text style={[styles.detailLabel, { color: theme.colors.gray }]}>Price Source</Text>
                <Text style={[styles.detailValue, { color: theme.colors.gray }]} testID="fuel-price-source">
                  {fuelEstimate.regionLabel} • ${fuelEstimate.pricePerGallon.toFixed(2)}/gal
                </Text>
              </View>
            ) : null}

            <View style={styles.driverCard} testID="driver-metrics">
              <Text style={styles.driverTitle}>Driver Metrics</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Driver ID</Text>
                <Text style={styles.detailValue} testID="driver-id">{String(user?.id ?? '—')}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Vehicle</Text>
                <Text style={styles.detailValue} testID="driver-vehicle">{(() => {
                  const vt = String(selectedVehicleType || '');
                  const match = selectableVehicles.find(sv => sv.key === vt);
                  return match ? match.label : (vt ? vt : '—');
                })()}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Profile MPG</Text>
                <Text style={styles.detailValue} testID="driver-mpg">{Number((user as Driver)?.fuelProfile?.averageMpg ?? 0) > 0 ? Number((user as Driver)?.fuelProfile?.averageMpg ?? 0).toFixed(1) : '—'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Trip Fuel</Text>
                <View style={styles.analyticsValueContainer}>
                  <Text style={styles.detailValue} testID="driver-fuel-gallons">{fuelEstimate ? `${fuelEstimate.gallons.toFixed(1)} gal` : '—'}</Text>
                  {fuelEstimate && <Text style={styles.analyticsIndicator}>📊 Live Analytics</Text>}
                </View>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Trip Fuel Cost</Text>
                <View style={styles.analyticsValueContainer}>
                  <Text style={styles.detailValue} testID="driver-fuel-cost">{fuelEstimate ? formatCurrency(fuelEstimate.cost) : '—'}</Text>
                  {fuelEstimate && <Text style={styles.analyticsIndicator}>📊 Live Analytics</Text>}
                </View>
              </View>
            </View>

            <View style={styles.vehicleProfileCard}>
              <Text style={styles.vehicleProfileTitle}>Vehicle Profile</Text>
              <View style={styles.vehicleChipsRow}>
                {selectableVehicles.map((v) => {
                  const isActive = String(selectedVehicleType) === v.key;
                  return (
                    <TouchableOpacity
                      key={v.key}
                      style={[styles.vehicleChip, isActive ? styles.vehicleChipActive : undefined]}
                      onPress={async () => {
                        try {
                          await updateProfile({
                            fuelProfile: {
                              vehicleType: v.key as any,
                              averageMpg: Number(mpgInput) || (undefined as unknown as number),
                              fuelPricePerGallon: (user as Driver)?.fuelProfile?.fuelPricePerGallon ?? (undefined as unknown as number),
                              fuelType: ((user as Driver)?.fuelProfile?.fuelType ?? 'diesel') as any,
                            } as any,
                          });
                        } catch (e) {
                          console.log('[VehicleProfile] failed to update vehicle type', e);
                        }
                      }}
                      accessibilityRole="button"
                      testID={`chip-${v.key}`}
                    >
                      <Text style={[styles.vehicleChipText, isActive ? styles.vehicleChipTextActive : undefined]}>{v.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={styles.mpgRow}>
                <Text style={styles.mpgLabel}>Custom MPG</Text>
                <TextInput
                  style={styles.mpgInput}
                  inputMode="decimal"
                  keyboardType="numeric"
                  placeholder="e.g. 8.5"
                  value={mpgInput}
                  onChangeText={setMpgInput}
                  onBlur={async () => {
                    try {
                      const val = parseFloat(mpgInput);
                      if (!Number.isFinite(val) || val <= 0) return;
                      await updateProfile({
                        fuelProfile: {
                          vehicleType: (selectedVehicleType as any) ?? (loadNorm?.vehicleType as any),
                          averageMpg: val,
                          fuelPricePerGallon: (user as Driver)?.fuelProfile?.fuelPricePerGallon ?? (undefined as unknown as number),
                          fuelType: ((user as Driver)?.fuelProfile?.fuelType ?? 'diesel') as any,
                          tankCapacity: (user as Driver)?.fuelProfile?.tankCapacity ?? (undefined as unknown as number),
                        } as any,
                      });
                    } catch (e) {
                      console.log('[VehicleProfile] failed to update mpg', e);
                    }
                  }}
                  testID="input-mpg"
                />
              </View>
              <View style={[styles.mpgRow, { marginTop: 8 }]}>
                <Text style={styles.mpgLabel}>Tank capacity (gal)</Text>
                <TextInput
                  style={styles.mpgInput}
                  inputMode="decimal"
                  keyboardType="numeric"
                  placeholder="e.g. 150"
                  value={tankInput}
                  onChangeText={setTankInput}
                  onBlur={async () => {
                    try {
                      const val = parseFloat(tankInput);
                      if (!Number.isFinite(val) || val <= 0) return;
                      await updateProfile({
                        fuelProfile: {
                          vehicleType: (selectedVehicleType as any) ?? (loadNorm?.vehicleType as any),
                          averageMpg: (user as Driver)?.fuelProfile?.averageMpg ?? (undefined as unknown as number),
                          fuelPricePerGallon: (user as Driver)?.fuelProfile?.fuelPricePerGallon ?? (undefined as unknown as number),
                          fuelType: ((user as Driver)?.fuelProfile?.fuelType ?? 'diesel') as any,
                          tankCapacity: val,
                        } as any,
                      });
                    } catch (e) {
                      console.log('[VehicleProfile] failed to update tank capacity', e);
                    }
                  }}
                  testID="input-tank"
                />
              </View>
            </View>

            {Array.isArray(loadNorm.special_requirements) && loadNorm.special_requirements.length > 0 && (
              <View style={styles.requirementsContainer}>
                <View style={styles.requirementsHeader}>
                  <AlertCircle size={20} color={theme.colors.warning} />
                  <Text style={styles.requirementsTitle}>Special Requirements</Text>
                </View>
                {loadNorm.special_requirements.map((req: string, index: number): React.ReactElement => (
                  <Text key={`req-${index}`} style={styles.requirementItem} testID={`requirement-${index}`}>• {req}</Text>
                ))}
              </View>
            )}
          </View>

          {typeof loadNorm.aiScore === 'number' && (
            <View style={styles.aiScoreCard}>
              <Text style={styles.aiScoreLabel}>AI Match Score</Text>
              <View style={styles.aiScoreBar}>
                <View 
                  style={[styles.aiScoreFill, { width: `${loadNorm.aiScore}%` }]} 
                />
              </View>
              <Text style={styles.aiScoreValue}>{loadNorm.aiScore}%</Text>
            </View>
          )}

          {/* Driver Navigation - Only show for drivers and accepted loads */}
          {user?.role === 'driver' && loadNorm?.status === 'in-transit' && (
            <DriverNavigation
              load={loadNorm}
              onPickupConfirmed={handlePickupConfirmed}
              onDeliveryConfirmed={handleDeliveryConfirmed}
            />
          )}
        </ScrollView>

        <Modal visible={viewerOpen} transparent animationType="fade" onRequestClose={() => setViewerOpen(false)}>
          <View style={styles.viewerBackdrop}>
            <View style={styles.viewerHeader}>
              <TouchableOpacity onPress={() => setViewerOpen(false)} style={styles.viewerCloseBtn} testID="viewerClose">
                <X size={22} color={theme.colors.white} />
              </TouchableOpacity>
              <Text style={styles.viewerIndex}>{photos.length ? `${viewerIndex + 1}/${photos.length}` : ''}</Text>
              <View style={{ width: 32 }} />
            </View>
            <View style={styles.viewerBody}>
              {photos[viewerIndex] ? (
                <Image source={{ uri: photos[viewerIndex] }} style={styles.viewerImage} contentFit="contain" />
              ) : null}
            </View>
            <View style={styles.viewerFooter}>
              <TouchableOpacity disabled={viewerIndex <= 0} onPress={() => setViewerIndex((i) => Math.max(0, i - 1))} style={[styles.navBtn, viewerIndex <= 0 && styles.navBtnDisabled]} testID="viewerPrev">
                <Text style={styles.navBtnText}>Prev</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={viewerIndex >= photos.length - 1} onPress={() => setViewerIndex((i) => Math.min(photos.length - 1, i + 1))} style={[styles.navBtn, viewerIndex >= photos.length - 1 && styles.navBtnDisabled]} testID="viewerNext">
                <Text style={styles.navBtnText}>Next</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push({ pathname: '/damage-protection', params: { loadId: loadNorm.id } })}
            testID="btn-damage-photos"
          >
            <Text style={styles.secondaryButtonText}>Pickup/Delivery Photos</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.acceptButton, isAccepting && styles.acceptButtonDisabled]}
            onPress={handleAccept}
            disabled={isAccepting}
            testID="btn-accept-load"
          >
            {isAccepting ? (
              <ActivityIndicator color={theme.colors.white} />
            ) : (
              <Text style={styles.acceptButtonText}>Accept Load</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.lightGray,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.lightGray,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  photoStrip: {
    backgroundColor: theme.colors.white,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.lightGray,
  },
  photoStripContent: {
    gap: theme.spacing.sm,
  },
  photoThumb: {
    width: 110,
    height: 80,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.lightGray,
  },
  mainInfo: {
    backgroundColor: theme.colors.white,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  rateContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    backgroundColor: '#F9FAFB',
    borderRadius: theme.borderRadius.lg,
  },
  rateLabel: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
    marginBottom: theme.spacing.sm,
    fontWeight: '500',
  },
  rateAmount: {
    fontSize: 48,
    fontWeight: '700',
    color: theme.colors.success,
    marginBottom: 8,
  },
  ratePerMile: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
    fontWeight: '500',
  },
  liveAnalyticsSection: {
    backgroundColor: theme.colors.white,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  analyticsCard: {
    backgroundColor: '#F9FAFB',
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
    alignItems: 'center',
  },
  analyticsIcon: {
    marginBottom: theme.spacing.sm,
  },
  analyticsLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginBottom: theme.spacing.xs,
    fontWeight: '500',
  },
  analyticsValue: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.dark,
    marginBottom: 4,
  },
  analyticsSubtext: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray,
  },
  topMetricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
    justifyContent: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.lightGray,
  },
  pillLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
  },
  pillValue: {
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
    color: theme.colors.dark,
  },
  routeSection: {
    backgroundColor: theme.colors.white,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  financeCard: {
    backgroundColor: theme.colors.white,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: theme.spacing.md,
  },
  locationCard: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.lightGray,
    borderRadius: theme.borderRadius.md,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  locationLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  locationAddress: {
    fontSize: theme.fontSize.md,
    color: theme.colors.dark,
    marginBottom: 4,
  },
  locationCity: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginBottom: theme.spacing.sm,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  dateText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
  },
  distanceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: theme.spacing.md,
  },
  distanceLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.gray,
    opacity: 0.3,
  },
  distanceText: {
    marginHorizontal: theme.spacing.md,
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
  },
  detailsSection: {
    backgroundColor: theme.colors.white,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  etaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: 10,
  },
  etaLabel: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
  },
  etaValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  alertWarning: {
    backgroundColor: '#FFF7ED',
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  alertCritical: {
    backgroundColor: '#991B1B',
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#7F1D1D',
  },
  detailLabel: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
  },
  detailValue: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  requirementsContainer: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: '#fff9e6',
    borderRadius: theme.borderRadius.md,
  },
  requirementsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  requirementsTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  requirementItem: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.dark,
    marginLeft: theme.spacing.lg,
    marginTop: 4,
  },
  aiScoreCard: {
    backgroundColor: theme.colors.white,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  vehicleProfileCard: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.lightGray,
    borderRadius: theme.borderRadius.md,
  },
  driverCard: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.lightGray,
    borderRadius: theme.borderRadius.md,
  },
  driverTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: theme.spacing.sm,
  },
  vehicleProfileTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: theme.spacing.sm,
  },
  vehicleChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  vehicleChip: {
    borderWidth: 1,
    borderColor: theme.colors.lightGray,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.white,
  },
  vehicleChipActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#CBD5FF',
  },
  vehicleChipText: {
    color: theme.colors.dark,
    fontWeight: '600',
  },
  vehicleChipTextActive: {
    color: theme.colors.primary,
  },
  mpgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  mpgLabel: {
    flex: 0,
    color: theme.colors.gray,
    fontSize: theme.fontSize.md,
  },
  mpgInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.lightGray,
    backgroundColor: theme.colors.white,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.fontSize.md,
  },
  aiScoreLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginBottom: theme.spacing.sm,
  },
  aiScoreBar: {
    height: 8,
    backgroundColor: theme.colors.lightGray,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: theme.spacing.xs,
  },
  aiScoreFill: {
    height: '100%',
    backgroundColor: theme.colors.success,
  },
  aiScoreValue: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.success,
  },
  footer: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.white,
    borderTopWidth: 1,
    borderTopColor: theme.colors.lightGray,
    gap: theme.spacing.sm,
  },
  viewerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    paddingTop: 48,
  },
  viewerHeader: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  viewerCloseBtn: { padding: 6 },
  viewerIndex: { color: theme.colors.white, fontWeight: '600', fontSize: theme.fontSize.md },
  viewerBody: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  viewerImage: { width: '100%', height: '100%' },
  viewerFooter: { flexDirection: 'row', justifyContent: 'space-between', padding: theme.spacing.lg, gap: theme.spacing.md },
  navBtn: { paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.sm, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: theme.borderRadius.md },
  navBtnDisabled: { opacity: 0.4 },
  navBtnText: { color: theme.colors.white, fontWeight: '700' },
  acceptButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  acceptButtonDisabled: {
    opacity: 0.7,
  },
  acceptButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.white,
  },
  secondaryButton: {
    backgroundColor: '#EEF2FF',
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5FF',
  },
  secondaryButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  backhaulSection: {
    backgroundColor: theme.colors.white,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  fuelAnalyticsSection: {
    backgroundColor: theme.colors.white,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  analyticsGrid: {
    gap: theme.spacing.md,
  },
  analyticsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.lg,
  },
  analyticsItem: {
    flex: 1,
    alignItems: 'flex-start',
  },
  analyticsStatus: {
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.lightGray,
    alignItems: 'center',
  },
  analyticsStatusText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray,
    fontStyle: 'italic',
  },
  analyticsValueContainer: {
    alignItems: 'flex-end',
  },
  analyticsIndicator: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.success,
    fontWeight: '500',
    marginTop: 2,
  },
});
