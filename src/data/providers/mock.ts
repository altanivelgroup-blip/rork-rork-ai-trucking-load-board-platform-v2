import { LoadItem, LoadsProvider } from './types';

export class MockProvider implements LoadsProvider {
  name = "Mock";

  async fetchLoads(params?: { lane?: { origin?: string; destination?: string }, page?: number }): Promise<LoadItem[]> {
    try {
      // Import the JSON data
      const mockData = require('../mock/loads.json') as LoadItem[];
      
      if (!Array.isArray(mockData)) {
        console.warn('[MockProvider] Invalid JSON format, returning empty array');
        return [];
      }

      // Update timestamps to make loads appear fresh
      const now = new Date();
      const updatedLoads = mockData.map(load => {
        const postedAt = new Date(load.postedAt);
        const isOld = postedAt < new Date(now.getTime() - 24 * 60 * 60 * 1000); // older than 24h
        
        if (isOld) {
          // Update to now ± random(5–45 minutes)
          const randomMinutes = Math.floor(Math.random() * 40) + 5; // 5-45 minutes
          const freshTimestamp = new Date(now.getTime() - randomMinutes * 60 * 1000);
          
          return {
            ...load,
            postedAt: freshTimestamp.toISOString()
          };
        }
        
        return load;
      });

      // Apply basic filtering if lane params provided
      let filtered = updatedLoads;
      if (params?.lane?.origin) {
        const origin = params.lane.origin.toLowerCase();
        filtered = filtered.filter(load => 
          load.origin.toLowerCase().includes(origin)
        );
      }
      if (params?.lane?.destination) {
        const destination = params.lane.destination.toLowerCase();
        filtered = filtered.filter(load => 
          load.destination.toLowerCase().includes(destination)
        );
      }

      console.log(`[MockProvider] Returning ${filtered.length} loads`);
      return filtered;
      
    } catch (error) {
      console.error('[MockProvider] Failed to load mock data:', error);
      return []; // Never crash - return empty array
    }
  }
}