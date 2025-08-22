import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { Fuel, Gauge, Info, Layers, ShieldAlert, Book, Truck, Wrench } from 'lucide-react-native';

interface EquipmentItem {
  id: string;
  name: string;
  year: number;
  makeModel: string;
  type: 'truck' | 'trailer';
  miles: number;
  mpg?: number;
  nextServiceMiles: number;
  alerts: number;
  health: 'Excellent' | 'Good' | 'Warning';
  subtype: string;
}

const MOCK_DATA: EquipmentItem[] = [
  { id: 't1', name: 'Main Hotshot', year: 2021, makeModel: 'Ford F-350', type: 'truck', miles: 87500, mpg: 12.5, nextServiceMiles: 90000, alerts: 1, health: 'Good', subtype: 'Hotshot Truck' },
  { id: 't2', name: 'City Runner', year: 2020, makeModel: 'Mercedes Sprinter 2500', type: 'truck', miles: 65000, mpg: 18.2, nextServiceMiles: 70000, alerts: 0, health: 'Excellent', subtype: 'Cargo Van' },
  { id: 't3', name: 'Heavy Hauler', year: 2019, makeModel: 'Freightliner Cascadia', type: 'truck', miles: 125000, mpg: 8.5, nextServiceMiles: 127500, alerts: 2, health: 'Warning', subtype: 'Box Truck' },
  { id: 'r1', name: 'Gooseneck 40ft', year: 2021, makeModel: 'PJ', type: 'trailer', miles: 74000, nextServiceMiles: 80000, alerts: 0, health: 'Good', subtype: 'Flatbed Trailer' },
];

export default function EquipmentScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<'trucks' | 'trailers'>('trucks');

  const filtered = useMemo(() => MOCK_DATA.filter(i => (tab === 'trucks' ? i.type === 'truck' : i.type === 'trailer')), [tab]);

  const goMaintenance = (item: EquipmentItem) => {
    console.log('Navigating to maintenance for:', item.name);
    router.push('/maintenance');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Equipment & Maintenance' }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.h1} testID="equip-title">Equipment & Maintenance</Text>

        <View style={styles.toggle}>
          <TouchableOpacity testID="tab-trucks" accessibilityRole="button" activeOpacity={0.8} onPress={() => setTab('trucks')} style={[styles.tab, tab === 'trucks' && styles.tabActive]}> 
            <Truck size={16} color={tab === 'trucks' ? theme.colors.white : theme.colors.dark} />
            <Text style={[styles.tabText, tab === 'trucks' && styles.tabTextActive]}>Trucks</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="tab-trailers" accessibilityRole="button" activeOpacity={0.8} onPress={() => setTab('trailers')} style={[styles.tab, tab === 'trailers' && styles.tabActive]}>
            <Layers size={16} color={tab === 'trailers' ? theme.colors.white : theme.colors.dark} />
            <Text style={[styles.tabText, tab === 'trailers' && styles.tabTextActive]}>Trailers</Text>
          </TouchableOpacity>
        </View>

        {filtered.map((item) => (
          <View key={item.id} style={styles.card} testID={`equip-${item.id}`}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardSubtitle}>{item.year} {item.makeModel}</Text>
                <Text style={styles.cardLink}>{item.subtype}</Text>
              </View>
              <View style={styles.healthPill}>
                <Text style={[styles.healthText, item.health === 'Warning' ? styles.healthWarn : item.health === 'Excellent' ? styles.healthOk : styles.healthGood]}>{item.health}</Text>
              </View>
            </View>

            <View style={styles.metrics}>
              <View style={styles.metric}><Gauge size={14} color={theme.colors.gray} /><Text style={styles.metricText}>{item.miles.toLocaleString()} mi</Text></View>
              {typeof item.mpg === 'number' && <View style={styles.metric}><Fuel size={14} color={theme.colors.gray} /><Text style={styles.metricText}>{item.mpg} MPG</Text></View>}
              <View style={styles.metric}><Info size={14} color={theme.colors.gray} /><Text style={styles.metricText}>Next: {item.nextServiceMiles.toLocaleString()} mi</Text></View>
            </View>

            {item.alerts > 0 && (
              <View style={styles.alertBanner}>
                <ShieldAlert size={14} color={theme.colors.danger} />
                <Text style={styles.alertText}>{item.alerts} urgent maintenance {item.alerts === 1 ? 'alert' : 'alerts'}</Text>
              </View>
            )}

            <View style={styles.actions}>
              <TouchableOpacity style={[styles.actionBtn]} onPress={() => goMaintenance(item)} testID={`schedule-${item.id}`}>
                <Wrench size={16} color={theme.colors.primary} />
                <Text style={styles.actionText}>Schedule Service</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.emergency]} onPress={() => console.log('Emergency')}>
                <Book size={16} color={theme.colors.danger} />
                <Text style={[styles.actionText, { color: theme.colors.danger }]}>Emergency</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Maintenance Alerts</Text>
        <View style={styles.alertItem}>
          <Text style={styles.alertTitle}>Oil Change Due</Text>
          <Text style={styles.alertAmount}>$150</Text>
        </View>
        <Text style={styles.alertSub}>Regular oil change and filter replacement due in 500 miles</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.lightGray },
  scroll: { paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.lg },
  h1: { fontSize: theme.fontSize.lg, fontWeight: '800', color: theme.colors.dark, marginVertical: theme.spacing.sm },
  toggle: { flexDirection: 'row', gap: 8, marginBottom: theme.spacing.sm },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, backgroundColor: theme.colors.white },
  tabActive: { backgroundColor: theme.colors.primary },
  tabText: { fontSize: theme.fontSize.sm, color: theme.colors.dark, fontWeight: '700' },
  tabTextActive: { color: theme.colors.white },
  card: { backgroundColor: theme.colors.white, borderRadius: 16, padding: 14, marginTop: 12, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  cardTitle: { fontSize: theme.fontSize.md, fontWeight: '800', color: theme.colors.dark },
  cardSubtitle: { color: theme.colors.gray, marginTop: 2 },
  cardLink: { color: theme.colors.primary, fontWeight: '700', marginTop: 2 },
  healthPill: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, backgroundColor: '#F1F5F9' },
  healthText: { fontWeight: '800' },
  healthOk: { color: '#10B981' },
  healthGood: { color: '#22C55E' },
  healthWarn: { color: '#F59E0B' },
  metrics: { flexDirection: 'row', gap: 16, marginTop: 10 },
  metric: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metricText: { color: theme.colors.gray },
  alertBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEE2E2', padding: 10, borderRadius: 10, marginTop: 10 },
  alertText: { color: theme.colors.danger, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 10 },
  actionBtn: { flex: 1, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, backgroundColor: '#F1F5F9' },
  emergency: { backgroundColor: '#FEE2E2' },
  actionText: { fontWeight: '700', color: theme.colors.primary },
  sectionTitle: { fontSize: theme.fontSize.md, fontWeight: '800', color: theme.colors.dark, marginTop: 18 },
  alertItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  alertTitle: { fontWeight: '800' },
  alertAmount: { fontWeight: '800' },
  alertSub: { color: theme.colors.gray, marginTop: 4 },
});