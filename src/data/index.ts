import { MockProvider } from './providers/mock';
import { LoadItem } from './providers/types';

export const providers = [new MockProvider()];

export async function fetchAll(params?: any): Promise<LoadItem[]> {
  try {
    const results = await Promise.all(
      providers.map(p => 
        p.fetchLoads(params).catch(error => {
          console.warn(`[fetchAll] Provider ${p.name} failed:`, error);
          return [];
        })
      )
    );
    
    const allLoads = results.flat();
    
    // Sort by postedAt descending (newest first)
    return allLoads.sort((a, b) => 
      Date.parse(b.postedAt) - Date.parse(a.postedAt)
    );
  } catch (error) {
    console.error('[fetchAll] Critical error:', error);
    return []; // Never crash
  }
}

export * from './providers/types';