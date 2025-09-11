import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { TRPCError } from '@trpc/server';

const LoadComparisonSchema = z.object({
  title: z.string().optional(),
  origin: z.string(),
  destination: z.string(),
  pickupDate: z.string().optional(),
  deliveryDate: z.string().optional(),
  rate: z.number(),
  equipmentType: z.string().optional(),
  weight: z.number().optional(),
});

const DuplicateCheckRequestSchema = z.object({
  loads: z.array(LoadComparisonSchema),
  threshold: z.number().min(0).max(1).default(0.85), // Similarity threshold
  checkExisting: z.boolean().default(true), // Check against existing loads in DB
});

interface SimilarityScore {
  overall: number;
  location: number;
  rate: number;
  timing: number;
  equipment: number;
}

interface DuplicateMatch {
  loadIndex: number;
  existingLoadId?: string;
  similarity: SimilarityScore;
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

// AI-powered similarity calculation
function calculateSimilarity(load1: any, load2: any): SimilarityScore {
  // Location similarity (origin + destination)
  const locationSim = calculateLocationSimilarity(load1, load2);
  
  // Rate similarity (considering percentage difference)
  const rateSim = calculateRateSimilarity(load1.rate, load2.rate);
  
  // Timing similarity (pickup/delivery dates)
  const timingSim = calculateTimingSimilarity(load1, load2);
  
  // Equipment similarity
  const equipmentSim = calculateEquipmentSimilarity(load1.equipmentType, load2.equipmentType);
  
  // Weighted overall similarity
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
}

function calculateLocationSimilarity(load1: any, load2: any): number {
  const origin1 = normalizeLocation(load1.origin);
  const origin2 = normalizeLocation(load2.origin);
  const dest1 = normalizeLocation(load1.destination);
  const dest2 = normalizeLocation(load2.destination);
  
  const originMatch = calculateStringSimilarity(origin1, origin2);
  const destMatch = calculateStringSimilarity(dest1, dest2);
  
  return (originMatch + destMatch) / 2;
}

function calculateRateSimilarity(rate1: number, rate2: number): number {
  if (!rate1 || !rate2) return 0;
  
  const diff = Math.abs(rate1 - rate2);
  const avg = (rate1 + rate2) / 2;
  const percentDiff = diff / avg;
  
  // High similarity if within 5%, medium if within 15%
  if (percentDiff <= 0.05) return 1.0;
  if (percentDiff <= 0.15) return 0.7;
  if (percentDiff <= 0.30) return 0.4;
  return 0;
}

function calculateTimingSimilarity(load1: any, load2: any): number {
  if (!load1.pickupDate || !load2.pickupDate) return 0.5; // Neutral if dates missing
  
  const date1 = new Date(load1.pickupDate);
  const date2 = new Date(load2.pickupDate);
  
  const daysDiff = Math.abs((date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24));
  
  // Same day = 1.0, within 3 days = 0.8, within week = 0.5
  if (daysDiff === 0) return 1.0;
  if (daysDiff <= 3) return 0.8;
  if (daysDiff <= 7) return 0.5;
  if (daysDiff <= 14) return 0.2;
  return 0;
}

function calculateEquipmentSimilarity(eq1?: string, eq2?: string): number {
  if (!eq1 || !eq2) return 0.5; // Neutral if missing
  
  const norm1 = eq1.toLowerCase().trim();
  const norm2 = eq2.toLowerCase().trim();
  
  if (norm1 === norm2) return 1.0;
  
  // Check for similar equipment types
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
}

function calculateStringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1.0;
  
  // Levenshtein distance for fuzzy matching
  const matrix = [];
  const len1 = s1.length;
  const len2 = s2.length;
  
  for (let i = 0; i <= len2; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= len1; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= len2; i++) {
    for (let j = 1; j <= len1; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  const distance = matrix[len2][len1];
  const maxLen = Math.max(len1, len2);
  
  return maxLen === 0 ? 1 : 1 - (distance / maxLen);
}

function normalizeLocation(location: string): string {
  return location
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function generateAIRecommendation(match: Omit<DuplicateMatch, 'aiReason'>): string {
  const { similarity, matchType, conflictFields } = match;
  
  if (matchType === 'exact') {
    return 'Exact duplicate detected. Recommend deleting existing load to avoid confusion.';
  }
  
  if (similarity.overall > 0.9) {
    if (similarity.rate > 0.9) {
      return 'Near-identical loads with same pricing. Likely duplicate - recommend merging or deleting older entry.';
    } else {
      return 'Same route with different pricing. Could be rate update - recommend replacing existing load.';
    }
  }
  
  if (similarity.location > 0.95 && similarity.timing > 0.8) {
    return 'Same route and timing with different details. Possible load update - review for merge opportunity.';
  }
  
  if (similarity.location > 0.9 && similarity.rate < 0.5) {
    return 'Same route with significantly different rate. Could be different load or pricing error - review carefully.';
  }
  
  return 'Potential duplicate with some differences. Manual review recommended to determine best action.';
}

function determineMatchType(similarity: SimilarityScore): 'exact' | 'high' | 'medium' {
  if (similarity.overall >= 0.95) return 'exact';
  if (similarity.overall >= 0.80) return 'high';
  return 'medium';
}

function determineRecommendation(similarity: SimilarityScore, matchType: string): 'delete_existing' | 'merge' | 'keep_both' | 'skip_new' {
  if (matchType === 'exact') return 'delete_existing';
  if (similarity.overall > 0.9 && similarity.rate > 0.9) return 'delete_existing';
  if (similarity.overall > 0.85) return 'merge';
  if (similarity.location > 0.9 && similarity.rate < 0.5) return 'keep_both';
  return 'skip_new';
}

function identifyConflictFields(load1: any, load2: any, similarity: SimilarityScore): string[] {
  const conflicts: string[] = [];
  
  if (similarity.location < 0.9) conflicts.push('location');
  if (similarity.rate < 0.9) conflicts.push('rate');
  if (similarity.timing < 0.8) conflicts.push('timing');
  if (similarity.equipment < 0.9) conflicts.push('equipment');
  
  return conflicts;
}

export const duplicateCheckerProcedure = publicProcedure
  .input(DuplicateCheckRequestSchema)
  .mutation(async ({ input }) => {
    try {
      const { loads, threshold, checkExisting } = input;
      const duplicates: DuplicateMatch[] = [];
      const aiInsights: string[] = [];
      
      // Check for duplicates within the uploaded batch
      for (let i = 0; i < loads.length; i++) {
        for (let j = i + 1; j < loads.length; j++) {
          const similarity = calculateSimilarity(loads[i], loads[j]);
          
          if (similarity.overall >= threshold) {
            const matchType = determineMatchType(similarity);
            const conflictFields = identifyConflictFields(loads[i], loads[j], similarity);
            const recommendation = determineRecommendation(similarity, matchType);
            
            const match: DuplicateMatch = {
              loadIndex: j, // Mark the later one as duplicate
              similarity,
              matchType,
              conflictFields,
              recommendation,
              aiReason: generateAIRecommendation({ loadIndex: j, similarity, matchType, conflictFields, recommendation })
            };
            
            duplicates.push(match);
          }
        }
      }
      
      // TODO: Check against existing loads in database when checkExisting is true
      // This would require database access and load querying
      
      // Generate AI insights
      if (duplicates.length > 0) {
        aiInsights.push(`Found ${duplicates.length} potential duplicates in your upload.`);
        
        const exactMatches = duplicates.filter(d => d.matchType === 'exact').length;
        const highMatches = duplicates.filter(d => d.matchType === 'high').length;
        
        if (exactMatches > 0) {
          aiInsights.push(`${exactMatches} exact duplicates detected - these should be removed.`);
        }
        
        if (highMatches > 0) {
          aiInsights.push(`${highMatches} high-similarity matches found - review for potential merging.`);
        }
        
        const commonConflicts = duplicates
          .flatMap(d => d.conflictFields)
          .reduce((acc, field) => {
            acc[field] = (acc[field] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
        
        const topConflict = Object.entries(commonConflicts)
          .sort(([,a], [,b]) => b - a)[0];
        
        if (topConflict) {
          aiInsights.push(`Most common difference: ${topConflict[0]} (${topConflict[1]} cases)`);
        }
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
      
      const result: DuplicateCheckResult = {
        duplicates,
        suggestions: {
          totalDuplicates: duplicates.length,
          recommendedActions,
          aiInsights
        }
      };
      
      return result;
      
    } catch (error) {
      console.error('Duplicate checker error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to check for duplicates'
      });
    }
  });