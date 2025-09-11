import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { 
  FileText, 
  Plus, 
  Edit3, 
  Trash2, 
  Copy, 
  Star,
  Package,
  MapPin,
  DollarSign
} from 'lucide-react-native';

type LoadTemplate = {
  id: string;
  name: string;
  description: string;
  originCity: string;
  originState: string;
  destinationCity: string;
  destinationState: string;
  vehicleType: string;
  weight: number;
  rate: number;
  isDefault: boolean;
  createdAt: Date;
  usageCount: number;
};

export default function LoadTemplatesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const isShipper = user?.role === 'shipper';
  
  // Mock templates data
  const [templates] = useState<LoadTemplate[]>([
    {
      id: '1',
      name: 'Chicago to Dallas Route',
      description: 'Regular weekly shipment for automotive parts',
      originCity: 'Chicago',
      originState: 'IL',
      destinationCity: 'Dallas',
      destinationState: 'TX',
      vehicleType: 'Car Carrier',
      weight: 40000,
      rate: 2800,
      isDefault: true,
      createdAt: new Date('2024-01-15'),
      usageCount: 24
    },
    {
      id: '2',
      name: 'West Coast Express',
      description: 'High-value vehicle transport to California',
      originCity: 'Detroit',
      originState: 'MI',
      destinationCity: 'Los Angeles',
      destinationState: 'CA',
      vehicleType: 'Enclosed Carrier',
      weight: 35000,
      rate: 4200,
      isDefault: false,
      createdAt: new Date('2024-02-01'),
      usageCount: 12
    },
    {
      id: '3',
      name: 'Southeast Distribution',
      description: 'Multi-stop delivery route',
      originCity: 'Atlanta',
      originState: 'GA',
      destinationCity: 'Miami',
      destinationState: 'FL',
      vehicleType: 'Car Carrier',
      weight: 38000,
      rate: 1850,
      isDefault: false,
      createdAt: new Date('2024-02-10'),
      usageCount: 8
    }
  ]);
  
  // Redirect non-shippers
  React.useEffect(() => {
    if (user && !isShipper) {
      router.replace('/(tabs)/dashboard');
    }
  }, [user, isShipper, router]);

  const handleCreateTemplate = useCallback(() => {
    router.push('/post-load?template=new');
  }, [router]);

  const handleUseTemplate = useCallback((template: LoadTemplate) => {
    router.push({
      pathname: '/post-load',
      params: {
        templateId: template.id,
        originCity: template.originCity,
        originState: template.originState,
        destinationCity: template.destinationCity,
        destinationState: template.destinationState,
        vehicleType: template.vehicleType,
        weight: template.weight.toString(),
        rate: template.rate.toString()
      }
    });
  }, [router]);

  const handleEditTemplate = useCallback((template: LoadTemplate) => {
    Alert.alert(
      'Edit Template',
      `Edit "${template.name}" template?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Edit', onPress: () => console.log('Edit template:', template.id) }
      ]
    );
  }, []);

  const handleDuplicateTemplate = useCallback((template: LoadTemplate) => {
    Alert.alert(
      'Duplicate Template',
      `Create a copy of "${template.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Duplicate', onPress: () => console.log('Duplicate template:', template.id) }
      ]
    );
  }, []);

  const handleDeleteTemplate = useCallback((template: LoadTemplate) => {
    Alert.alert(
      'Delete Template',
      `Are you sure you want to delete "${template.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => console.log('Delete template:', template.id) 
        }
      ]
    );
  }, []);

  if (!isShipper) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Load Templates',
          headerRight: () => (
            <TouchableOpacity
              onPress={handleCreateTemplate}
              style={styles.headerButton}
            >
              <Plus size={20} color={theme.colors.primary} />
            </TouchableOpacity>
          )
        }} 
      />
      <ScrollView 
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16 }]} 
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.heading}>Load Templates</Text>
          <Text style={styles.subheading}>Save time with reusable load configurations</Text>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <FileText size={20} color={theme.colors.primary} />
            <Text style={styles.statValue}>{templates.length}</Text>
            <Text style={styles.statLabel}>Templates</Text>
          </View>
          <View style={styles.statCard}>
            <Copy size={20} color={theme.colors.success} />
            <Text style={styles.statValue}>{templates.reduce((sum, t) => sum + t.usageCount, 0)}</Text>
            <Text style={styles.statLabel}>Total Uses</Text>
          </View>
          <View style={styles.statCard}>
            <Star size={20} color={theme.colors.warning} />
            <Text style={styles.statValue}>{templates.filter(t => t.isDefault).length}</Text>
            <Text style={styles.statLabel}>Favorites</Text>
          </View>
        </View>

        {/* Create New Template Button */}
        <TouchableOpacity 
          style={styles.createButton}
          onPress={handleCreateTemplate}
          testID="create-template-button"
        >
          <Plus size={20} color={theme.colors.white} />
          <Text style={styles.createButtonText}>Create New Template</Text>
        </TouchableOpacity>

        {/* Templates List */}
        <View style={styles.templatesContainer}>
          {templates.map((template) => (
            <View key={template.id} style={styles.templateCard}>
              <View style={styles.templateHeader}>
                <View style={styles.templateTitleRow}>
                  <Text style={styles.templateName}>{template.name}</Text>
                  {template.isDefault && (
                    <View style={styles.defaultBadge}>
                      <Star size={12} color={theme.colors.warning} />
                    </View>
                  )}
                </View>
                <View style={styles.templateActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleEditTemplate(template)}
                  >
                    <Edit3 size={16} color={theme.colors.gray} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDuplicateTemplate(template)}
                  >
                    <Copy size={16} color={theme.colors.gray} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDeleteTemplate(template)}
                  >
                    <Trash2 size={16} color={theme.colors.danger} />
                  </TouchableOpacity>
                </View>
              </View>
              
              <Text style={styles.templateDescription}>{template.description}</Text>
              
              <View style={styles.templateDetails}>
                <View style={styles.detailRow}>
                  <MapPin size={14} color={theme.colors.gray} />
                  <Text style={styles.detailText}>
                    {template.originCity}, {template.originState} → {template.destinationCity}, {template.destinationState}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Package size={14} color={theme.colors.gray} />
                  <Text style={styles.detailText}>
                    {template.vehicleType} • {template.weight.toLocaleString()} lbs
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <DollarSign size={14} color={theme.colors.gray} />
                  <Text style={styles.detailText}>
                    ${template.rate.toLocaleString()} • Used {template.usageCount} times
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.useTemplateButton}
                onPress={() => handleUseTemplate(template)}
                testID={`use-template-${template.id}`}
              >
                <Text style={styles.useTemplateText}>Use This Template</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {templates.length === 0 && (
          <View style={styles.emptyState}>
            <FileText size={48} color={theme.colors.gray} />
            <Text style={styles.emptyTitle}>No Templates Yet</Text>
            <Text style={styles.emptySubtitle}>
              Create your first load template to save time on future postings
            </Text>
            <TouchableOpacity 
              style={styles.emptyButton}
              onPress={handleCreateTemplate}
            >
              <Text style={styles.emptyButtonText}>Create Template</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.lightGray,
  },
  scroll: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  headerButton: {
    padding: theme.spacing.sm,
  },
  header: {
    marginBottom: theme.spacing.lg,
  },
  heading: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.dark,
    marginBottom: 4,
  },
  subheading: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.white,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  statValue: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.dark,
    marginTop: theme.spacing.xs,
  },
  statLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray,
    marginTop: 2,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  createButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.white,
  },
  templatesContainer: {
    gap: theme.spacing.md,
  },
  templateCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  templateTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: theme.spacing.sm,
  },
  templateName: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.dark,
    flex: 1,
  },
  defaultBadge: {
    backgroundColor: '#FEF3C7',
    padding: 4,
    borderRadius: 12,
  },
  templateActions: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  actionButton: {
    padding: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.lightGray,
  },
  templateDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginBottom: theme.spacing.md,
  },
  templateDetails: {
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  detailText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    flex: 1,
  },
  useTemplateButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  useTemplateText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.white,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  emptyTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.dark,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  emptySubtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  emptyButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
  },
  emptyButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.white,
  },
});