import React, { useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { Truck, DollarSign, Package, TrendingUp, Eye, Edit, Trash2 } from 'lucide-react-native';
import { useLoads } from '@/hooks/useLoads';

interface LoadRowProps {
  id: string;
  title: string;
  originCity: string;
  destinationCity: string;
  rate: number;
  status: string;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

function LoadRow({ id, title, originCity, destinationCity, rate, status, onView, onEdit, onDelete }: LoadRowProps) {
  const statusColor = status === 'available' ? '#10b981' : status === 'in-transit' ? '#f59e0b' : '#6b7280';
  
  return (
    <View style={styles.loadRow} testID={`load-row-${id}`}>
      <View style={styles.loadInfo}>
        <Text style={styles.loadTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.loadRoute}>{originCity} → {destinationCity}</Text>
        <View style={styles.loadMeta}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{status}</Text>
          </View>
          <Text style={styles.loadRate}>${rate}</Text>
        </View>
      </View>
      <View style={styles.loadActions}>
        <TouchableOpacity onPress={() => onView(id)} style={styles.actionBtn} testID={`view-${id}`}>
          <Eye size={16} color={theme.colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onEdit(id)} style={styles.actionBtn} testID={`edit-${id}`}>
          <Edit size={16} color={theme.colors.gray} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onDelete(id)} style={styles.actionBtn} testID={`delete-${id}`}>
          <Trash2 size={16} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function ShipperDashboard() {
  const router = useRouter();
  const { loads } = useLoads();
  
  const shipperLoads = useMemo(() => {
    return loads.filter(load => load.shipperId === 'current-shipper');
  }, [loads]);
  
  const stats = useMemo(() => {
    const totalLoads = shipperLoads.length;
    const activeLoads = shipperLoads.filter(l => l.status === 'available').length;
    const totalRevenue = shipperLoads.reduce((sum, l) => sum + (l.rate || 0), 0);
    const avgRate = totalLoads > 0 ? totalRevenue / totalLoads : 0;
    
    return { totalLoads, activeLoads, totalRevenue, avgRate };
  }, [shipperLoads]);
  
  const handleViewLoad = useCallback((loadId: string) => {
    console.log('Viewing load:', loadId);
    router.push({ pathname: '/load-details', params: { loadId } });
  }, [router]);
  
  const handleEditLoad = useCallback((loadId: string) => {
    console.log('Editing load:', loadId);
    // Navigate to edit load page
  }, []);
  
  const handleDeleteLoad = useCallback((loadId: string) => {
    console.log('Deleting load:', loadId);
    // Implement delete functionality
  }, []);
  
  const handlePostNewLoad = useCallback(() => {
    router.push('/(tabs)/post-load');
  }, [router]);
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Shipper Dashboard</Text>
          <Text style={styles.subtitle}>Manage your loads and track performance</Text>
        </View>
        
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Package size={24} color={theme.colors.primary} />
            <Text style={styles.statValue}>{stats.totalLoads}</Text>
            <Text style={styles.statLabel}>Total Loads</Text>
          </View>
          <View style={styles.statCard}>
            <Truck size={24} color="#10b981" />
            <Text style={styles.statValue}>{stats.activeLoads}</Text>
            <Text style={styles.statLabel}>Active Loads</Text>
          </View>
          <View style={styles.statCard}>
            <DollarSign size={24} color="#f59e0b" />
            <Text style={styles.statValue}>${stats.totalRevenue.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Total Revenue</Text>
          </View>
          <View style={styles.statCard}>
            <TrendingUp size={24} color="#8b5cf6" />
            <Text style={styles.statValue}>${Math.round(stats.avgRate)}</Text>
            <Text style={styles.statLabel}>Avg Rate</Text>
          </View>
        </View>
        
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Loads</Text>
            <TouchableOpacity onPress={handlePostNewLoad} style={styles.postBtn}>
              <Text style={styles.postBtnText}>Post New Load</Text>
            </TouchableOpacity>
          </View>
          
          {shipperLoads.length === 0 ? (
            <View style={styles.emptyState}>
              <Package size={48} color={theme.colors.gray} />
              <Text style={styles.emptyTitle}>No loads posted yet</Text>
              <Text style={styles.emptySubtitle}>Start by posting your first load</Text>
              <TouchableOpacity onPress={handlePostNewLoad} style={styles.emptyBtn}>
                <Text style={styles.emptyBtnText}>Post a Load</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.loadsList}>
              {shipperLoads.map((load) => (
                <LoadRow
                  key={load.id}
                  id={load.id}
                  title={load.description || 'Untitled Load'}
                  originCity={load.origin?.city || 'Unknown'}
                  destinationCity={load.destination?.city || 'Unknown'}
                  rate={load.rate || 0}
                  status={load.status}
                  onView={handleViewLoad}
                  onEdit={handleEditLoad}
                  onDelete={handleDeleteLoad}
                />
              ))}
            </View>
          )}
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
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  header: {
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.dark,
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: theme.colors.white,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statValue: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.dark,
    marginTop: theme.spacing.xs,
  },
  statLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginTop: 2,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.dark,
  },
  postBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  postBtnText: {
    color: theme.colors.white,
    fontWeight: '600',
    fontSize: theme.fontSize.sm,
  },
  loadsList: {
    gap: theme.spacing.sm,
  },
  loadRow: {
    backgroundColor: theme.colors.white,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  loadInfo: {
    flex: 1,
    paddingRight: theme.spacing.sm,
  },
  loadTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  loadRoute: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginTop: 2,
  },
  loadMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
    gap: theme.spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.xs,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  loadRate: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  loadActions: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  actionBtn: {
    padding: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.lightGray,
  },
  emptyState: {
    alignItems: 'center',
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
  },
  emptyTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.dark,
    marginTop: theme.spacing.md,
  },
  emptySubtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
  },
  emptyBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.md,
  },
  emptyBtnText: {
    color: theme.colors.white,
    fontWeight: '600',
    fontSize: theme.fontSize.md,
  },
});