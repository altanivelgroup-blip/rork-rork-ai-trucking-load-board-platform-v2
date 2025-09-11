import { useState, useCallback } from 'react';
import { trpc } from '@/lib/trpc';

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

interface DuplicateCheckOptions {
  threshold?: number;
  checkExisting?: boolean;
}

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

export function useDuplicateChecker() {
  const [isChecking, setIsChecking] = useState(false);
  const [lastResult, setLastResult] = useState<DuplicateCheckResult | null>(null);
  
  const checkDuplicatesMutation = trpc.loads.checkDuplicates.useMutation();

  const checkDuplicates = useCallback(async (
    loads: LoadData[], 
    options: DuplicateCheckOptions = {}
  ): Promise<DuplicateCheckResult | null> => {
    if (loads.length === 0) return null;

    try {
      setIsChecking(true);
      
      const result = await checkDuplicatesMutation.mutateAsync({
        loads,
        threshold: options.threshold || 0.80,
        checkExisting: options.checkExisting ?? true
      });
      
      setLastResult(result);
      return result;
      
    } catch (error) {
      console.error('Duplicate check failed:', error);
      return null;
    } finally {
      setIsChecking(false);
    }
  }, [checkDuplicatesMutation]);

  const checkSingleLoad = useCallback(async (
    load: LoadData,
    options: DuplicateCheckOptions = {}
  ): Promise<DuplicateMatch[]> => {
    const result = await checkDuplicates([load], options);
    return result?.duplicates || [];
  }, [checkDuplicates]);

  const hasDuplicates = useCallback((result: DuplicateCheckResult | null): boolean => {
    return (result?.duplicates.length || 0) > 0;
  }, []);

  const getRecommendedActions = useCallback((result: DuplicateCheckResult | null) => {
    if (!result) return { delete: 0, merge: 0, skip: 0, keep: 0 };
    
    return result.duplicates.reduce(
      (acc, dup) => {
        switch (dup.recommendation) {
          case 'delete_existing':
            acc.delete++;
            break;
          case 'merge':
            acc.merge++;
            break;
          case 'skip_new':
            acc.skip++;
            break;
          case 'keep_both':
            acc.keep++;
            break;
        }
        return acc;
      },
      { delete: 0, merge: 0, skip: 0, keep: 0 }
    );
  }, []);

  const getHighestSimilarity = useCallback((result: DuplicateCheckResult | null): number => {
    if (!result || result.duplicates.length === 0) return 0;
    
    return Math.max(...result.duplicates.map(dup => dup.similarity.overall));
  }, []);

  const getAIInsights = useCallback((result: DuplicateCheckResult | null): string[] => {
    return result?.suggestions.aiInsights || [];
  }, []);

  const filterByMatchType = useCallback((
    result: DuplicateCheckResult | null, 
    matchType: 'exact' | 'high' | 'medium'
  ): DuplicateMatch[] => {
    if (!result) return [];
    return result.duplicates.filter(dup => dup.matchType === matchType);
  }, []);

  const reset = useCallback(() => {
    setLastResult(null);
  }, []);

  return {
    // State
    isChecking,
    lastResult,
    
    // Actions
    checkDuplicates,
    checkSingleLoad,
    reset,
    
    // Helpers
    hasDuplicates,
    getRecommendedActions,
    getHighestSimilarity,
    getAIInsights,
    filterByMatchType,
  };
}