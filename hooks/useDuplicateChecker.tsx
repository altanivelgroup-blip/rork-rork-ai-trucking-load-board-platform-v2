import { useState, useCallback } from 'react';
import { trpc, resolveTrpcUrl } from '@/lib/trpc';

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
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<DuplicateCheckResult | null>(null);

  const checkDuplicatesMutation = trpc.loads.checkDuplicates.useMutation();

  const withTimeout = useCallback(async <T,>(p: Promise<T>, ms: number): Promise<T> => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<T>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('timeout')), ms);
    });
    try {
      const res = await Promise.race([p, timeout]);
      return res as T;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }, []);

  const pingApi = useCallback(async (): Promise<boolean> => {
    try {
      const trpcUrl = resolveTrpcUrl();
      const base = trpcUrl.endsWith('/trpc') ? trpcUrl.slice(0, -5) : trpcUrl;
      const url = base.replace(/\/$/, '') + '/';
      const res = await withTimeout(fetch(url, { method: 'GET' }), 1500);
      return !!res;
    } catch (e) {
      console.warn('[duplicate-check] API ping failed');
      return false;
    }
  }, [withTimeout]);

  const normalizeLocation = useCallback((location: string): string => {
    return location
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }, []);

  const calculateStringSimilarity = useCallback((str1: string, str2: string): number => {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    if (s1 === s2) return 1.0;
    if (!s1 || !s2) return 0;
    const words1 = s1.split(' ');
    const words2 = s2.split(' ');
    const commonWords = words1.filter(word => {
      if (!word || !word.trim()) return false;
      if (word.length > 50) return false;
      return words2.includes(word.trim());
    });
    const totalWords = Math.max(words1.length, words2.length);
    return totalWords > 0 ? commonWords.length / totalWords : 0;
  }, []);

  const calculateRateSimilarity = useCallback((rate1: number, rate2: number): number => {
    if (!rate1 || !rate2) return 0;
    const diff = Math.abs(rate1 - rate2);
    const avg = (rate1 + rate2) / 2;
    const percentDiff = diff / avg;
    if (percentDiff <= 0.05) return 1.0;
    if (percentDiff <= 0.15) return 0.7;
    if (percentDiff <= 0.30) return 0.4;
    return 0;
  }, []);

  const calculateTimingSimilarity = useCallback((date1?: string, date2?: string): number => {
    if (!date1 || !date2) return 0.5;
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0.5;
    const daysDiff = Math.abs((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff === 0) return 1.0;
    if (daysDiff <= 3) return 0.8;
    if (daysDiff <= 7) return 0.5;
    if (daysDiff <= 14) return 0.2;
    return 0;
  }, []);

  const calculateEquipmentSimilarity = useCallback((eq1?: string, eq2?: string): number => {
    if (!eq1 || !eq2) return 0.5;
    const norm1 = eq1.toLowerCase().trim();
    const norm2 = eq2.toLowerCase().trim();
    if (norm1 === norm2) return 1.0;
    const similarTypes = [
      ['truck', 'box-truck', 'box truck'],
      ['trailer', 'flatbed', 'enclosed-trailer'],
      ['van', 'cargo-van', 'cargo van'],
    ];
    for (const group of similarTypes) {
      if (group.includes(norm1) && group.includes(norm2)) {
        return 0.7;
      }
    }
    return calculateStringSimilarity(norm1, norm2);
  }, [calculateStringSimilarity]);

  const calculateLocalSimilarity = useCallback((load1: LoadData, load2: LoadData) => {
    const locationSim = calculateStringSimilarity(
      normalizeLocation(load1.origin + ' ' + load1.destination),
      normalizeLocation(load2.origin + ' ' + load2.destination)
    );
    const rateSim = calculateRateSimilarity(load1.rate, load2.rate);
    const timingSim = calculateTimingSimilarity(load1.pickupDate, load2.pickupDate);
    const equipmentSim = calculateEquipmentSimilarity(load1.equipmentType, load2.equipmentType);
    const overall = (
      locationSim * 0.4 +
      rateSim * 0.3 +
      timingSim * 0.2 +
      equipmentSim * 0.1
    );
    return {
      overall,
      location: locationSim,
      rate: rateSim,
      timing: timingSim,
      equipment: equipmentSim,
    };
  }, [calculateStringSimilarity, calculateRateSimilarity, calculateTimingSimilarity, calculateEquipmentSimilarity, normalizeLocation]);

  const performLocalDuplicateCheck = useCallback(async (
    loads: LoadData[],
    options: DuplicateCheckOptions = {}
  ): Promise<DuplicateCheckResult> => {
    const threshold = options.threshold ?? 0.8;
    const duplicates: DuplicateMatch[] = [];
    const aiInsights: string[] = [];

    for (let i = 0; i < loads.length; i++) {
      for (let j = i + 1; j < loads.length; j++) {
        const similarity = calculateLocalSimilarity(loads[i], loads[j]);
        if (similarity.overall >= threshold) {
          const matchType: 'exact' | 'high' | 'medium' = similarity.overall >= 0.95 ? 'exact' : similarity.overall >= 0.8 ? 'high' : 'medium';
          const conflictFields: string[] = [];
          if (similarity.location < 0.9) conflictFields.push('location');
          if (similarity.rate < 0.9) conflictFields.push('rate');
          if (similarity.timing < 0.8) conflictFields.push('timing');
          if (similarity.equipment < 0.9) conflictFields.push('equipment');
          const recommendation: DuplicateMatch['recommendation'] = matchType === 'exact' ? 'delete_existing' : similarity.overall > 0.85 ? 'merge' : 'skip_new';
          duplicates.push({
            loadIndex: j,
            similarity,
            matchType,
            conflictFields,
            recommendation,
            aiReason: `${matchType} similarity detected (${Math.round(similarity.overall * 100)}% match)`,
          });
        }
      }
    }

    if (duplicates.length > 0) {
      aiInsights.push(`Found ${duplicates.length} potential duplicates in your upload.`);
      const exactMatches = duplicates.filter(d => d.matchType === 'exact').length;
      if (exactMatches > 0) aiInsights.push(`${exactMatches} exact duplicates detected - these should be removed.`);
    } else {
      aiInsights.push('No duplicates detected in your upload. All loads appear unique.');
    }

    const recommendedActions = duplicates.reduce(
      (acc, dup) => {
        if (dup.recommendation === 'delete_existing') acc.delete++;
        else if (dup.recommendation === 'merge') acc.merge++;
        else if (dup.recommendation === 'skip_new') acc.skip++;
        return acc;
      },
      { delete: 0, merge: 0, skip: 0 }
    );

    return {
      duplicates,
      suggestions: {
        totalDuplicates: duplicates.length,
        recommendedActions,
        aiInsights,
      },
    };
  }, [calculateLocalSimilarity]);

  const checkDuplicates = useCallback(async (
    loads: LoadData[],
    options: DuplicateCheckOptions = {}
  ): Promise<DuplicateCheckResult | null> => {
    if (loads.length === 0) return null;

    try {
      setIsChecking(true);
      console.log('[duplicate-check] starting for', loads.length, 'loads');

      const apiUp = await pingApi();
      if (apiUp) {
        try {
          const result = await withTimeout(
            checkDuplicatesMutation.mutateAsync({
              loads,
              threshold: options.threshold ?? 0.8,
              checkExisting: options.checkExisting ?? true,
            }),
            2500
          );
          setLastResult(result);
          console.log('[duplicate-check] trpc success');
          return result;
        } catch (err) {
          console.warn('[duplicate-check] tRPC failed, falling back to local:', err);
        }
      } else {
        console.warn('[duplicate-check] API unreachable, using local fallback');
      }

      const result = await performLocalDuplicateCheck(loads, options);
      setLastResult(result);
      console.log('[duplicate-check] local result computed');
      return result;
    } catch (error) {
      console.warn('[duplicate-check] unexpected error, using local fallback');
      const result = await performLocalDuplicateCheck(loads, options);
      setLastResult(result);
      return result;
    } finally {
      setIsChecking(false);
    }
  }, [checkDuplicatesMutation, pingApi, withTimeout, performLocalDuplicateCheck]);

  const checkSingleLoad = useCallback(async (
    load: LoadData,
    options: DuplicateCheckOptions = {}
  ): Promise<DuplicateMatch[]> => {
    const result = await checkDuplicates([load], options);
    return result?.duplicates ?? [];
  }, [checkDuplicates]);

  const hasDuplicates = useCallback((result: DuplicateCheckResult | null): boolean => {
    return (result?.duplicates.length ?? 0) > 0;
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
    return result?.suggestions.aiInsights ?? [];
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
    isChecking,
    lastResult,
    checkDuplicates,
    checkSingleLoad,
    reset,
    hasDuplicates,
    getRecommendedActions,
    getHighestSimilarity,
    getAIInsights,
    filterByMatchType,
  };
}
