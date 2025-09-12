import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { Truck } from 'lucide-react-native';
import { useLoads, useLoadsWithToast } from '@/hooks/useLoads';
import { useAuth } from '@/hooks/useAuth';
import ConfirmationModal from '@/components/ConfirmationModal';

export default function MyLoadsScreen() {
  // Always call all hooks first to maintain hook order
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { filteredLoads, isLoading } = useLoads();
  const { deleteLoadWithToast } = useLoadsWithToast();
  

  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ visible: boolean; loadId: string | null }>({ visible: false, loadId: null });
  const [viewMode, setViewMode] = useState<'my-loads' | 'live-loads'>('my-loads');
  
  const handleDeleteLoad = async (loadId: string) => {
    try {
      await deleteLoadWithToast(loadId);
      setDeleteConfirmModal({ visible: false, loadId: null });
    } catch (error) {
      console.error('Failed to delete load:', error);
    }
  };
  
  const loads = useMemo(() => {
    let filtered = filteredLoads;
    
    if (viewMode === 'my-loads') {
      // Show only loads posted by this shipper
      filtered = filtered.filter(load => load.shipperId === user?.id);
    }
    // For 'live-loads', show all available loads
    
    return filtered;
  }, [filteredLoads, viewMode, user?.id]);
  
  // Redirect non-shippers
  useEffect(() => {
    if (user && user.role !== 'shipper') {
      router.replace('/(tabs)/dashboard');
    }
  }, [user, router]);
  
  const isShipper = user?.role === 'shipper';
  
  if (!isShipper) {
    return null;
  }
  

  
  return (
    <>
      <Stack.Screen options={{ 
        headerShown: false
      }} />
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Toggle Section */}
        <View style={styles.toggleSection}>
          <View style={styles.toggleContainer}>
            <TouchableOpacity 
              style={[styles.toggleOption, viewMode === 'my-loads' && styles.toggleOptionActive]}
              onPress={() => setViewMode('my-loads')}
              testID="my-loads-toggle"
            >
              <Text style={[styles.toggleText, viewMode === 'my-loads' && styles.toggleTextActive]}>My Loads</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.toggleOption, viewMode === 'live-loads' && styles.toggleOptionActive]}
              onPress={() => setViewMode('live-loads')}
              testID="live-loads-toggle"
            >
              <Text style={[styles.toggleText, viewMode === 'live-loads' && styles.toggleTextActive]}>Live Loads</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <Truck size={32} color={theme.colors.primary} />
              <Text style={styles.aiLabel}>AI</Text>
            </View>
          </View>
          <Text style={styles.appName}>LoadRun</Text>
          <Text style={styles.appSubtitle}>AI Load Board for Car Haulers</Text>
        </View>
        
        {/* Content Section */}
        <View style={styles.contentHeader}>
          <Text style={styles.sectionTitle}>My Loads</Text>
        </View>
        
        <ScrollView 
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + theme.spacing.xl }]}
        >
          {isLoading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Loading loads...</Text>
            </View>
          ) : loads.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>
                {viewMode === 'my-loads' 
                  ? 'No loads posted yet' 
                  : 'No loads available'
                }
              </Text>
            </View>
          ) : (
            <View style={styles.loadsGrid}>
              {loads.map((load: any, index: number) => {
                const rateVal = load.rate ?? 800;
                const bidsCount = Math.floor(Math.random() * 3) + 2;
                
                return (
                  <View
                    key={load.id}
                    style={[styles.loadCard, index % 2 === 1 && styles.loadCardRight]}
                    testID={`load-${load.id}`}
                  >
                    <View style={styles.loadCardHeader}>
                      <Text style={styles.statusLabel}>Status: <Text style={styles.statusValue}>Active</Text></Text>
                    </View>
                    
                    <Text style={styles.rateLabel}>Rate: <Text style={styles.rateValue}>${rateVal}</Text></Text>
                    
                    <View style={styles.bidsContainer}>
                      <Text style={styles.bidsLabel}>Bids: <Text style={styles.bidsValue}>{bidsCount}</Text></Text>
                      <Text style={styles.bidsCount}>{bidsCount}</Text>
                    </View>
                    
                    <Text style={styles.routeLabel}>Route: LA to Phoenix</Text>
                    
                    <View style={styles.actionButtons}>
                      <TouchableOpacity 
                        style={styles.editButton}
                        onPress={() => router.push({ pathname: '/load-edit', params: { loadId: load.id } })}
                        testID={`edit-${load.id}`}
                      >
                        <Text style={styles.editButtonText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.trackButton}
                        onPress={() => router.push({ pathname: '/load-details', params: { loadId: load.id } })}
                        testID={`track-${load.id}`}
                      >
                        <Text style={styles.trackButtonText}>Track</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
          
          <Text style={styles.apiUpdateText}>Updated via API</Text>
        </ScrollView>
        
        <ConfirmationModal
          visible={deleteConfirmModal.visible}
          title="Delete Load"
          message="Are you sure you want to delete this load? This action cannot be undone and will remove it from all connected dashboards."
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={() => {
            if (deleteConfirmModal.loadId) {
              handleDeleteLoad(deleteConfirmModal.loadId);
            }
          }}
          onCancel={() => setDeleteConfirmModal({ visible: false, loadId: null })}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  toggleSection: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    borderRadius: 25,
    padding: 4,
    width: 300,
  },
  toggleOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: theme.spacing.md,
    borderRadius: 20,
    alignItems: 'center',
  },
  toggleOptionActive: {
    backgroundColor: theme.colors.primary,
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  toggleTextActive: {
    color: theme.colors.white,
  },
  logoSection: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    backgroundColor: '#F5F5F5',
  },
  logoContainer: {
    marginBottom: theme.spacing.md,
  },
  logoIcon: {
    width: 80,
    height: 80,
    backgroundColor: '#E3F2FD',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  aiLabel: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: theme.colors.primary,
    color: theme.colors.white,
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.dark,
    marginBottom: 4,
  },
  appSubtitle: {
    fontSize: 14,
    color: theme.colors.gray,
  },
  contentHeader: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.dark,
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
    marginTop: theme.spacing.md,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.dark,
    textAlign: 'center',
  },
  loadsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  loadCard: {
    width: '48%',
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loadCardRight: {
    marginLeft: '4%',
  },
  loadCardHeader: {
    backgroundColor: '#2C3E50',
    marginHorizontal: -theme.spacing.md,
    marginTop: -theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    marginBottom: theme.spacing.sm,
  },
  statusLabel: {
    fontSize: 14,
    color: theme.colors.white,
    fontWeight: '500',
  },
  statusValue: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  rateLabel: {
    fontSize: 14,
    color: theme.colors.dark,
    marginBottom: theme.spacing.sm,
    fontWeight: '500',
  },
  rateValue: {
    fontWeight: '700',
  },
  bidsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  bidsLabel: {
    fontSize: 14,
    color: theme.colors.dark,
    fontWeight: '500',
  },
  bidsValue: {
    fontWeight: '700',
  },
  bidsCount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.dark,
  },
  routeLabel: {
    fontSize: 14,
    color: theme.colors.dark,
    marginBottom: theme.spacing.md,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  editButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm,
    borderRadius: 8,
    alignItems: 'center',
  },
  editButtonText: {
    color: theme.colors.white,
    fontWeight: '600',
    fontSize: 14,
  },
  trackButton: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingVertical: theme.spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    alignItems: 'center',
  },
  trackButtonText: {
    color: theme.colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  apiUpdateText: {
    fontSize: 12,
    color: theme.colors.gray,
    textAlign: 'left',
    marginTop: theme.spacing.lg,
  },
});