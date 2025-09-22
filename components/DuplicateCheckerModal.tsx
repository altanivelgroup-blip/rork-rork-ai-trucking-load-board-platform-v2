import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { X, AlertTriangle, CheckCircle, Merge, Trash2, Eye, Brain } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { useDuplicateChecker } from '@/hooks/useDuplicateChecker';

interface DuplicateMatch {
  loadIndex: number;
  existingLoadId?: string;
  similarity: {
    overall: number;
    location: number;
    rate: number;
    timing: number;
    equipment: number;
  };
  matchType: 'exact' | 'high' | 'medium';
  conflictFields: string[];
  recommendation: 'delete_existing' | 'merge' | 'keep_both' | 'skip_new';
  aiReason: string;
}

interface DuplicateCheckResult {
  duplicates: DuplicateMatch[];
  suggestions: {
    totalDuplicates: number;
    recommendedActions: {
      delete: number;
      merge: number;
      skip: number;
    };
    aiInsights: string[];
  };
}

interface LoadData {
  title?: string;
  origin: string;
  destination: string;
  pickupDate?: string;
  deliveryDate?: string;
  rate: number;
  equipmentType?: string;
  weight?: number;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  loads: LoadData[];
  onResolved: (resolvedLoads: LoadData[], removedIndices: number[]) => void;
}

export default function DuplicateCheckerModal({ visible, onClose, loads, onResolved }: Props) {
  const [checkResult, setCheckResult] = useState<DuplicateCheckResult | null>(null);
  const [selectedActions, setSelectedActions] = useState<Record<number, string>>({});
  const [showDetails, setShowDetails] = useState<Record<number, boolean>>({});

  const { checkDuplicates, isChecking } = useDuplicateChecker();

  const runDuplicateCheck = useCallback(async () => {
    if (loads.length === 0) return;

    try {
      console.log('[DuplicateCheckerModal] Running duplicate check for', loads.length, 'loads');
      const result = await checkDuplicates(loads, { threshold: 0.8, checkExisting: true });
      if (!result) {
        console.warn('[DuplicateCheckerModal] Duplicate check returned null');
        Alert.alert('Notice', 'Could not run server check. Used offline detector.');
        return;
      }
      setCheckResult(result);

      const initialActions: Record<number, string> = {};
      result.duplicates.forEach(dup => {
        initialActions[dup.loadIndex] = dup.recommendation;
      });
      setSelectedActions(initialActions);
    } catch (error: any) {
      console.error('Duplicate check failed:', error);
      Alert.alert('Error', 'Duplicate check failed. We switched to an offline check. Please try again.');
    }
  }, [loads, checkDuplicates]);

  const toggleDetails = useCallback((index: number) => {
    setShowDetails(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  }, []);

  const updateAction = useCallback((loadIndex: number, action: string) => {
    setSelectedActions(prev => ({
      ...prev,
      [loadIndex]: action
    }));
  }, []);

  const applyResolutions = useCallback(() => {
    console.log('[DuplicateCheckerModal] Apply resolutions called');
    console.log('[DuplicateCheckerModal] checkResult:', !!checkResult);
    console.log('[DuplicateCheckerModal] selectedActions:', selectedActions);
    
    if (!checkResult) {
      console.warn('[DuplicateCheckerModal] No check result available');
      return;
    }

    try {
      const removedIndices: number[] = [];
      const resolvedLoads = loads.filter((load, index) => {
        const action = selectedActions[index];
        if (action === 'skip_new' || action === 'delete_existing') {
          removedIndices.push(index);
          return false;
        }
        return true;
      });

      console.log('[DuplicateCheckerModal] Resolution summary:', {
        originalLoads: loads.length,
        resolvedLoads: resolvedLoads.length,
        removedCount: removedIndices.length,
        removedIndices
      });

      // Close modal first to prevent UI issues
      onClose();
      
      // Apply resolutions after a small delay to ensure modal is closed
      setTimeout(() => {
        try {
          onResolved(resolvedLoads, removedIndices);
        } catch (resolveError: any) {
          console.error('[DuplicateCheckerModal] Error in onResolved callback:', resolveError);
        }
      }, 100);
      
    } catch (error: any) {
      console.error('[DuplicateCheckerModal] Error applying resolutions:', error);
      Alert.alert('Error', 'Failed to apply resolutions. Please try again.');
    }
  }, [checkResult, loads, selectedActions, onResolved, onClose]);

  const getMatchTypeColor = (matchType: string) => {
    switch (matchType) {
      case 'exact': return theme.colors.danger;
      case 'high': return theme.colors.warning;
      case 'medium': return theme.colors.primary;
      default: return theme.colors.gray;
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'delete_existing': return <Trash2 size={16} color={theme.colors.danger} />;
      case 'merge': return <Merge size={16} color={theme.colors.warning} />;
      case 'keep_both': return <CheckCircle size={16} color={theme.colors.success} />;
      case 'skip_new': return <X size={16} color={theme.colors.gray} />;
      default: return <Eye size={16} color={theme.colors.gray} />;
    }
  };

  const formatSimilarity = (score: number) => `${Math.round(score * 100)}%`;

  // Auto-run check when modal opens and reset state when modal closes
  React.useEffect(() => {
    if (visible && loads.length > 0 && !checkResult && !isChecking) {
      runDuplicateCheck();
    } else if (!visible) {
      // Reset state when modal closes
      setCheckResult(null);
      setSelectedActions({});
      setShowDetails({});
    }
  }, [visible, loads.length, checkResult, isChecking, runDuplicateCheck]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Brain size={24} color={theme.colors.primary} />
            <Text style={styles.title}>AI Duplicate Checker</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={theme.colors.gray} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {isChecking ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Analyzing {loads.length} loads for duplicates...</Text>
              <Text style={styles.loadingSubtext}>Using AI to detect similarities in routes, pricing, and timing</Text>
            </View>
          ) : checkResult ? (
            <>
              <View style={styles.insightsContainer}>
                <Text style={styles.sectionTitle}>🧠 AI Analysis</Text>
                {checkResult.suggestions.aiInsights.map((insight, index) => (
                  <View key={index} style={styles.insightItem}>
                    <Text style={styles.insightText}>• {insight}</Text>
                  </View>
                ))}
              </View>

              {/* Summary */}
              <View style={styles.summaryContainer}>
                <Text style={styles.sectionTitle}>Summary</Text>
                <View style={styles.summaryGrid}>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryNumber}>{checkResult.suggestions.totalDuplicates}</Text>
                    <Text style={styles.summaryLabel}>Duplicates Found</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryNumber, { color: theme.colors.danger }]}>
                      {checkResult.suggestions.recommendedActions.delete}
                    </Text>
                    <Text style={styles.summaryLabel}>Recommended Deletions</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryNumber, { color: theme.colors.warning }]}>
                      {checkResult.suggestions.recommendedActions.merge}
                    </Text>
                    <Text style={styles.summaryLabel}>Potential Merges</Text>
                  </View>
                </View>
              </View>

              {/* Duplicate Details */}
              {checkResult.duplicates.length > 0 ? (
                <View style={styles.duplicatesContainer}>
                  <Text style={styles.sectionTitle}>Duplicate Details</Text>
                  {checkResult.duplicates.map((duplicate, index) => {
                    const load = loads[duplicate.loadIndex];
                    const isExpanded = showDetails[duplicate.loadIndex];
                    const selectedAction = selectedActions[duplicate.loadIndex] || duplicate.recommendation;

                    return (
                      <View key={index} style={styles.duplicateCard}>
                        <TouchableOpacity
                          style={styles.duplicateHeader}
                          onPress={() => toggleDetails(duplicate.loadIndex)}
                        >
                          <View style={styles.duplicateHeaderLeft}>
                            <View style={[
                              styles.matchTypeBadge,
                              { backgroundColor: getMatchTypeColor(duplicate.matchType) }
                            ]}>
                              <Text style={styles.matchTypeText}>
                                {duplicate.matchType.toUpperCase()}
                              </Text>
                            </View>
                            <View style={styles.loadInfo}>
                              <Text style={styles.loadTitle} numberOfLines={1}>
                                {load.title || `${load.origin} → ${load.destination}`}
                              </Text>
                              <Text style={styles.loadSubtitle}>
                                ${load.rate.toLocaleString()} • {formatSimilarity(duplicate.similarity.overall)} match
                              </Text>
                            </View>
                          </View>
                          <View style={styles.duplicateHeaderRight}>
                            {getActionIcon(selectedAction)}
                            <Text style={styles.expandIcon}>{isExpanded ? '−' : '+'}</Text>
                          </View>
                        </TouchableOpacity>

                        {isExpanded && (
                          <View style={styles.duplicateDetails}>
                            {/* AI Reasoning */}
                            <View style={styles.aiReasonContainer}>
                              <Text style={styles.aiReasonTitle}>🤖 AI Analysis:</Text>
                              <Text style={styles.aiReasonText}>{duplicate.aiReason}</Text>
                            </View>

                            {/* Similarity Breakdown */}
                            <View style={styles.similarityContainer}>
                              <Text style={styles.similarityTitle}>Similarity Breakdown:</Text>
                              <View style={styles.similarityGrid}>
                                <View style={styles.similarityItem}>
                                  <Text style={styles.similarityLabel}>Location</Text>
                                  <Text style={styles.similarityValue}>
                                    {formatSimilarity(duplicate.similarity.location)}
                                  </Text>
                                </View>
                                <View style={styles.similarityItem}>
                                  <Text style={styles.similarityLabel}>Rate</Text>
                                  <Text style={styles.similarityValue}>
                                    {formatSimilarity(duplicate.similarity.rate)}
                                  </Text>
                                </View>
                                <View style={styles.similarityItem}>
                                  <Text style={styles.similarityLabel}>Timing</Text>
                                  <Text style={styles.similarityValue}>
                                    {formatSimilarity(duplicate.similarity.timing)}
                                  </Text>
                                </View>
                                <View style={styles.similarityItem}>
                                  <Text style={styles.similarityLabel}>Equipment</Text>
                                  <Text style={styles.similarityValue}>
                                    {formatSimilarity(duplicate.similarity.equipment)}
                                  </Text>
                                </View>
                              </View>
                            </View>

                            {/* Action Selection */}
                            <View style={styles.actionContainer}>
                              <Text style={styles.actionTitle}>Choose Action:</Text>
                              <View style={styles.actionButtons}>
                                {[
                                  { key: 'delete_existing', label: 'Delete', icon: 'trash' },
                                  { key: 'merge', label: 'Merge', icon: 'merge' },
                                  { key: 'keep_both', label: 'Keep Both', icon: 'check' },
                                  { key: 'skip_new', label: 'Skip New', icon: 'x' }
                                ].map(action => (
                                  <TouchableOpacity
                                    key={action.key}
                                    style={[
                                      styles.actionButton,
                                      selectedAction === action.key && styles.actionButtonSelected
                                    ]}
                                    onPress={() => updateAction(duplicate.loadIndex, action.key)}
                                  >
                                    {getActionIcon(action.key)}
                                    <Text style={[
                                      styles.actionButtonText,
                                      selectedAction === action.key && styles.actionButtonTextSelected
                                    ]}>
                                      {action.label}
                                    </Text>
                                  </TouchableOpacity>
                                ))}
                              </View>
                            </View>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.noDuplicatesContainer}>
                  <CheckCircle size={48} color={theme.colors.success} />
                  <Text style={styles.noDuplicatesTitle}>No Duplicates Found!</Text>
                  <Text style={styles.noDuplicatesText}>
                    All {loads.length} loads appear to be unique. You're ready to proceed with the upload.
                  </Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.initialContainer}>
              <AlertTriangle size={48} color={theme.colors.warning} />
              <Text style={styles.initialTitle}>Ready to Check for Duplicates</Text>
              <Text style={styles.initialText}>
                We'll analyze your {loads.length} loads using AI to detect potential duplicates based on:
              </Text>
              <View style={styles.featureList}>
                <Text style={styles.featureItem}>• Route similarity (pickup & delivery locations)</Text>
                <Text style={styles.featureItem}>• Rate comparison and pricing patterns</Text>
                <Text style={styles.featureItem}>• Timing overlap and scheduling conflicts</Text>
                <Text style={styles.featureItem}>• Equipment type matching</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Footer Actions */}
        <View style={styles.footer}>
          {checkResult && checkResult.duplicates.length > 0 ? (
            <>
              <TouchableOpacity testID="duplicate-check-cancel" style={styles.secondaryButton} onPress={onClose}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="duplicate-check-apply" style={styles.primaryButton} onPress={applyResolutions}>
                <Text style={styles.primaryButtonText}>Apply Resolutions</Text>
              </TouchableOpacity>
            </>
          ) : checkResult ? (
            <TouchableOpacity testID="duplicate-check-continue" style={styles.primaryButton} onPress={onClose}>
              <Text style={styles.primaryButtonText}>Continue with Upload</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              testID="duplicate-check-start"
              style={[styles.primaryButton, isChecking && styles.primaryButtonDisabled]} 
              onPress={runDuplicateCheck}
              disabled={isChecking}
            >
              <Text style={styles.primaryButtonText}>
                {isChecking ? 'Checking...' : 'Start Duplicate Check'}
              </Text>
            </TouchableOpacity>
          )}
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
    padding: theme.spacing.md,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  title: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.dark,
  },
  closeButton: {
    padding: theme.spacing.xs,
  },
  content: {
    flex: 1,
    padding: theme.spacing.md,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xl * 2,
  },
  loadingText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
  },
  insightsContainer: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.dark,
    marginBottom: theme.spacing.sm,
  },
  insightItem: {
    marginBottom: theme.spacing.xs,
  },
  insightText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    lineHeight: 20,
  },
  summaryContainer: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  summaryLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },
  duplicatesContainer: {
    marginBottom: theme.spacing.md,
  },
  duplicateCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    overflow: 'hidden',
  },
  duplicateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
  },
  duplicateHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: theme.spacing.sm,
  },
  matchTypeBadge: {
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  matchTypeText: {
    fontSize: theme.fontSize.xs,
    fontWeight: '700',
    color: theme.colors.white,
  },
  loadInfo: {
    flex: 1,
  },
  loadTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  loadSubtitle: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray,
    marginTop: 2,
  },
  duplicateHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  expandIcon: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.gray,
  },
  duplicateDetails: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  aiReasonContainer: {
    backgroundColor: '#F0F9FF',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  aiReasonTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  aiReasonText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.dark,
    lineHeight: 18,
  },
  similarityContainer: {
    backgroundColor: '#F9FAFB',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  similarityTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: theme.spacing.xs,
  },
  similarityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  similarityItem: {
    alignItems: 'center',
    minWidth: 60,
  },
  similarityLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.gray,
  },
  similarityValue: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.dark,
    marginTop: 2,
  },
  actionContainer: {
    backgroundColor: '#FFFBEB',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  actionTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: theme.spacing.xs,
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.white,
    gap: theme.spacing.xs / 2,
  },
  actionButtonSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  actionButtonText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.dark,
    fontWeight: '600',
  },
  actionButtonTextSelected: {
    color: theme.colors.white,
  },
  noDuplicatesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xl * 2,
  },
  noDuplicatesTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.success,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  noDuplicatesText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  initialContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xl,
  },
  initialTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.dark,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  initialText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  featureList: {
    marginTop: theme.spacing.md,
    alignSelf: 'stretch',
  },
  featureItem: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginBottom: theme.spacing.xs,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.white,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  primaryButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    backgroundColor: theme.colors.gray,
  },
  primaryButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.white,
  },
});