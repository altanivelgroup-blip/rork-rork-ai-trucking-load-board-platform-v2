import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { Truck, ArrowLeft } from 'lucide-react-native';
import { useLoads, useLoadsWithToast } from '@/hooks/useLoads';
import { useAuth } from '@/hooks/useAuth';
import ConfirmationModal from '@/components/ConfirmationModal';
import { LoadCard } from '@/components/LoadCard';

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
        {/* Header with Back Arrow */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
            testID="back-button"
          >
            <ArrowLeft size={24} color={theme.colors.dark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Loads</Text>
          <View style={styles.headerSpacer} />
        </View>
        
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
            <View style={styles.loadsContainer}>
              {loads.map((load: any, index: number) => {
                // Determine load status and properties
                const isCompleted = load.status === 'delivered' || Math.random() > 0.8;
                
                // Hide completed loads from Live Loads view (only show on My Loads)
                if (viewMode === 'live-loads' && isCompleted) {
                  return null;
                }
                
                return (
                  <View key={load.id}>
                    <View style={styles.loadCardWrapper}>
                      <LoadCard
                        load={load}
                        onPress={() => router.push({ pathname: '/load-details', params: { loadId: load.id } })}
                        showBids={true}
                        showStatus={true}
                      />
                    </View>
                    {/* Gray Divider */}
                    {index < loads.length - 1 && <View style={styles.divider} />}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: '#F5F5F5',
  },
  backButton: {
    padding: theme.spacing.sm,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  headerSpacer: {
    width: 40, // Same width as back button to center title
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
  loadsContainer: {
    paddingVertical: theme.spacing.sm,
  },
  loadCardWrapper: {
    marginHorizontal: 0,
  },
  loadCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: theme.spacing.lg,
    marginHorizontal: theme.spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: '#D1D5DB',
    marginVertical: theme.spacing.md,
    marginHorizontal: theme.spacing.lg,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  statusText: {
    fontSize: 14,
    color: theme.colors.dark,
    marginBottom: theme.spacing.xs,
    fontWeight: '500',
  },
  rateText: {
    fontSize: 16,
    color: theme.colors.dark,
    marginBottom: theme.spacing.xs,
    fontWeight: '600',
  },
  routeText: {
    fontSize: 14,
    color: theme.colors.dark,
    marginBottom: theme.spacing.xs,
    fontWeight: '500',
  },
  bidsText: {
    fontSize: 14,
    color: theme.colors.dark,
    marginBottom: theme.spacing.md,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
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
  // Status Pills
  rushPill: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  rushPillText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '600',
  },
  activePill: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  activePillText: {
    color: theme.colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  completedPill: {
    backgroundColor: '#F44336',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  completedPillText: {
    color: theme.colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
});