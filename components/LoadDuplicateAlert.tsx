import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { AlertTriangle, Merge, Trash2, Eye, X } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { trpc } from '@/lib/trpc';

interface LoadData {
  title?: string;
  origin: string;
  destination: string;
  pickupDate?: string;
  deliveryDate?: string;
  rate: number;
  equipmentType?: string;
}

interface Props {
  newLoad: LoadData;
  onAction: (action: 'proceed' | 'cancel' | 'merge' | 'replace') => void;
  style?: any;
}

export default function LoadDuplicateAlert({ newLoad, onAction, style }: Props) {
  const [isChecking, setIsChecking] = useState(false);
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [showDetails, setShowDetails] = useState(false);

  const checkDuplicatesMutation = trpc.loads.checkDuplicates.useMutation();

  const checkForDuplicates = useCallback(async () => {
    try {
      setIsChecking(true);
      
      const result = await checkDuplicatesMutation.mutateAsync({
        loads: [newLoad],
        threshold: 0.85,
        checkExisting: true
      });
      
      if (result.duplicates.length > 0) {
        setDuplicates(result.duplicates);
        setShowDetails(true);
      } else {
        onAction('proceed');
      }
      
    } catch (error) {
      console.error('Duplicate check failed:', error);
      // Proceed anyway if check fails
      onAction('proceed');
    } finally {
      setIsChecking(false);
    }
  }, [newLoad, checkDuplicatesMutation, onAction]);

  React.useEffect(() => {
    checkForDuplicates();
  }, [checkForDuplicates]);

  if (isChecking) {
    return (
      <View style={[styles.container, styles.loadingContainer, style]}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Checking for duplicates...</Text>
      </View>
    );
  }

  if (duplicates.length === 0) {
    return null; // No duplicates found, component will auto-proceed
  }

  const topDuplicate = duplicates[0];
  const similarity = Math.round(topDuplicate.similarity.overall * 100);

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <AlertTriangle size={20} color={theme.colors.warning} />
        <Text style={styles.title}>Potential Duplicate Detected</Text>
        <TouchableOpacity onPress={() => onAction('cancel')} style={styles.closeButton}>
          <X size={16} color={theme.colors.gray} />
        </TouchableOpacity>
      </View>

      <Text style={styles.description}>
        Found {similarity}% similar load: {newLoad.origin} → {newLoad.destination}
      </Text>

      {showDetails && (
        <View style={styles.detailsContainer}>
          <Text style={styles.aiReason}>
            🤖 {topDuplicate.aiReason}
          </Text>
          
          <View style={styles.similarityBreakdown}>
            <Text style={styles.breakdownTitle}>Similarity Breakdown:</Text>
            <View style={styles.breakdownGrid}>
              <View style={styles.breakdownItem}>
                <Text style={styles.breakdownLabel}>Route</Text>
                <Text style={styles.breakdownValue}>
                  {Math.round(topDuplicate.similarity.location * 100)}%
                </Text>
              </View>
              <View style={styles.breakdownItem}>
                <Text style={styles.breakdownLabel}>Rate</Text>
                <Text style={styles.breakdownValue}>
                  {Math.round(topDuplicate.similarity.rate * 100)}%
                </Text>
              </View>
              <View style={styles.breakdownItem}>
                <Text style={styles.breakdownLabel}>Timing</Text>
                <Text style={styles.breakdownValue}>
                  {Math.round(topDuplicate.similarity.timing * 100)}%
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.secondaryButton]} 
          onPress={() => onAction('cancel')}
        >
          <X size={16} color={theme.colors.gray} />
          <Text style={styles.secondaryButtonText}>Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.warningButton]} 
          onPress={() => {
            Alert.alert(
              'Replace Existing Load?',
              'This will delete the existing similar load and create the new one.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Replace', style: 'destructive', onPress: () => onAction('replace') }
              ]
            );
          }}
        >
          <Trash2 size={16} color={theme.colors.warning} />
          <Text style={styles.warningButtonText}>Replace</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.primaryButton]} 
          onPress={() => onAction('proceed')}
        >
          <Eye size={16} color={theme.colors.white} />
          <Text style={styles.primaryButtonText}>Post Anyway</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FEF3C7',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.warning,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  loadingText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  title: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.warning,
    flex: 1,
  },
  closeButton: {
    padding: theme.spacing.xs,
  },
  description: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.dark,
    marginBottom: theme.spacing.md,
    lineHeight: 18,
  },
  detailsContainer: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  aiReason: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.dark,
    fontStyle: 'italic',
    marginBottom: theme.spacing.sm,
    lineHeight: 18,
  },
  similarityBreakdown: {
    marginTop: theme.spacing.sm,
  },
  breakdownTitle: {
    fontSize: theme.fontSize.xs,
    fontWeight: '600',
    color: theme.colors.gray,
    marginBottom: theme.spacing.xs,
  },
  breakdownGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  breakdownItem: {
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray,
  },
  breakdownValue: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.dark,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    gap: theme.spacing.xs,
  },
  secondaryButton: {
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.gray,
  },
  secondaryButtonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.gray,
  },
  warningButton: {
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.warning,
  },
  warningButtonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.warning,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
  },
  primaryButtonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.white,
  },
});