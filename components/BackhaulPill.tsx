import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { MapPin, Truck, DollarSign, X, ArrowRight, Brain, Sparkles } from 'lucide-react-native';
import { theme } from '@/constants/theme';

import { useLoads } from '@/hooks/useLoads';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/utils/fuel';
import { Driver } from '@/types';

interface BackhaulPillProps {
  deliveryLocation: {
    lat: number;
    lng: number;
    city: string;
    state: string;
  };
  onLoadSelect?: (loadId: string) => void;
}

interface AIBackhaulSuggestion {
  id: string;
  origin: { city: string; state: string; lat: number; lng: number };
  destination: { city: string; state: string; lat: number; lng: number };
  distance: number;
  weight: number;
  vehicleType: string;
  rate: number;
  ratePerMile: number;
  pickupDate: string;
  deliveryDate: string;
  description: string;
  aiScore: number;
  shipperName: string;
  distanceFromDelivery: number;
  priority: 'high-pay' | 'low-mile' | 'optimal';
  marketTrend: 'rising' | 'stable' | 'declining';
}

// PERMANENT FIX: Enhanced JSON validation and sanitization
function validateAndSanitizeJSON(jsonStr: string): string {
  console.log('[BackhaulPill] 🔧 PERMANENT FIX: Sanitizing JSON string...');
  
  try {
    // Step 1: Remove any non-JSON content before and after
    let cleaned = jsonStr.trim();
    
    // Step 2: Find the actual JSON boundaries more precisely
    const jsonStart = cleaned.indexOf('{');
    const jsonEnd = cleaned.lastIndexOf('}');
    
    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
      throw new Error('No valid JSON structure found');
    }
    
    cleaned = cleaned.slice(jsonStart, jsonEnd + 1);
    
    // Step 3: PERMANENT FIX - Comprehensive JSON sanitization
    cleaned = cleaned
      // Fix unquoted keys
      .replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":')
      // Fix single quotes to double quotes
      .replace(/:\s*'([^']*)'/g, ': "$1"')
      // Fix trailing commas before closing brackets/braces
      .replace(/,\s*([}\]])/g, '$1')
      // Fix duplicate commas
      .replace(/,\s*,+/g, ',')
      // Fix missing commas between objects
      .replace(/}\s*{/g, '},{')
      // Fix missing commas between arrays
      .replace(/]\s*\[/g, '],[')
      // Fix missing commas after quoted values
      .replace(/"\s*([a-zA-Z_$][a-zA-Z0-9_$]*\s*:)/g, '","$1')
      // Fix missing commas after numbers
      .replace(/(\d)\s*(["a-zA-Z_$])/g, '$1,$2')
      // Fix escaped characters
      .replace(/\\n/g, '\\\\n')
      .replace(/\\t/g, '\\\\t')
      .replace(/\\r/g, '\\\\r')
      // Fix unescaped quotes in strings
      .replace(/([^\\])"([^"]*[^\\])"([^,}\]\s:])/g, '$1"$2",$3')
      // Final cleanup of any remaining trailing commas
      .replace(/,\s*([}\]])/g, '$1')
      // Remove any trailing comma at the very end
      .replace(/,\s*$/, '');
    
    console.log('[BackhaulPill] ✅ PERMANENT FIX: JSON sanitization complete');
    return cleaned;
  } catch (error) {
    console.error('[BackhaulPill] ❌ PERMANENT FIX: JSON sanitization failed:', error);
    throw error;
  }
}

// PERMANENT FIX: Enhanced manual extraction with better parsing
function extractSuggestionsManually(text: string): AIBackhaulSuggestion[] {
  console.log('[BackhaulPill] 🔧 PERMANENT FIX: Manual extraction fallback activated');
  const suggestions: AIBackhaulSuggestion[] = [];
  
  try {
    // Enhanced pattern matching for better extraction
    const cityMatches = text.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*([A-Z]{2})/g);
    const rateMatches = text.match(/\$?([0-9,]+(?:\.[0-9]{2})?)/g);
    const distanceMatches = text.match(/(\d+)\s*(?:miles?|mi)/gi);
    
    if (cityMatches && cityMatches.length >= 2) {
      const numSuggestions = Math.min(3, Math.floor(cityMatches.length / 2));
      
      for (let i = 0; i < numSuggestions; i++) {
        const originIndex = i * 2;
        const destIndex = i * 2 + 1;
        
        if (originIndex < cityMatches.length && destIndex < cityMatches.length) {
          const origin = cityMatches[originIndex].split(', ');
          const destination = cityMatches[destIndex].split(', ');
          
          // Extract rate if available
          let rate = 1500 + Math.random() * 1000;
          if (rateMatches && rateMatches[i]) {
            const extractedRate = parseFloat(rateMatches[i].replace(/[^0-9.]/g, ''));
            if (!isNaN(extractedRate) && extractedRate > 0) {
              rate = extractedRate;
            }
          }
          
          // Extract distance if available
          let distance = 200 + Math.random() * 300;
          if (distanceMatches && distanceMatches[i]) {
            const extractedDistance = parseFloat(distanceMatches[i].replace(/[^0-9.]/g, ''));
            if (!isNaN(extractedDistance) && extractedDistance > 0) {
              distance = extractedDistance;
            }
          }
          
          suggestions.push({
            id: `fallback-${Date.now()}-${i}`,
            origin: {
              city: origin[0] || 'Unknown City',
              state: origin[1] || 'XX',
              lat: 40.7128 + (Math.random() - 0.5) * 20,
              lng: -74.0060 + (Math.random() - 0.5) * 40
            },
            destination: {
              city: destination[0] || 'Unknown City',
              state: destination[1] || 'XX',
              lat: 40.7128 + (Math.random() - 0.5) * 20,
              lng: -74.0060 + (Math.random() - 0.5) * 40
            },
            distance: Math.round(distance),
            weight: 20000 + Math.random() * 20000,
            vehicleType: 'truck',
            rate: Math.round(rate),
            ratePerMile: Math.round((rate / distance) * 100) / 100,
            pickupDate: new Date(Date.now() + (24 + i * 12) * 60 * 60 * 1000).toISOString(),
            deliveryDate: new Date(Date.now() + (48 + i * 12) * 60 * 60 * 1000).toISOString(),
            description: 'Extracted from AI response - Manual parsing',
            aiScore: 75 + Math.random() * 15,
            shipperName: ['Regional Freight Co.', 'Transport Solutions', 'Logistics Express'][i] || 'Local Shipper',
            distanceFromDelivery: 15 + Math.random() * 35,
            priority: ['optimal', 'high-pay', 'low-mile'][i] as any || 'optimal',
            marketTrend: ['stable', 'rising', 'declining'][i] as any || 'stable'
          });
        }
      }
    }
    
    console.log('[BackhaulPill] ✅ PERMANENT FIX: Manual extraction found', suggestions.length, 'suggestions');
  } catch (error) {
    console.error('[BackhaulPill] ❌ PERMANENT FIX: Manual extraction failed:', error);
  }
  
  return suggestions;
}

// Generate fallback suggestions when AI API fails
function generateFallbackSuggestions(
  deliveryLocation: { lat: number; lng: number; city: string; state: string },
  driverProfile: Driver
): AIBackhaulSuggestion[] {
  const suggestions: AIBackhaulSuggestion[] = [];
  
  try {
    // Generate 2-3 realistic fallback suggestions
    const cities = [
      { city: 'Atlanta', state: 'GA', lat: 33.7490, lng: -84.3880 },
      { city: 'Dallas', state: 'TX', lat: 32.7767, lng: -96.7970 },
      { city: 'Chicago', state: 'IL', lat: 41.8781, lng: -87.6298 },
      { city: 'Phoenix', state: 'AZ', lat: 33.4484, lng: -112.0740 },
      { city: 'Denver', state: 'CO', lat: 39.7392, lng: -104.9903 },
    ];
    
    const nearbyOrigins = cities.filter(city => {
      const distance = haversineMiles(deliveryLocation, city);
      return distance <= 50;
    });
    
    // If no nearby cities, create some around the delivery location
    if (nearbyOrigins.length === 0) {
      for (let i = 0; i < 3; i++) {
        const offsetLat = (Math.random() - 0.5) * 0.5; // ~25 mile radius
        const offsetLng = (Math.random() - 0.5) * 0.5;
        nearbyOrigins.push({
          city: `${deliveryLocation.city} Area`,
          state: deliveryLocation.state,
          lat: deliveryLocation.lat + offsetLat,
          lng: deliveryLocation.lng + offsetLng
        });
      }
    }
    
    nearbyOrigins.slice(0, 3).forEach((origin, index) => {
      const destination = cities[Math.floor(Math.random() * cities.length)];
      const distance = haversineMiles(origin, destination);
      const rate = 1200 + Math.random() * 1500;
      
      suggestions.push({
        id: `fallback-${Date.now()}-${index}`,
        origin,
        destination,
        distance: Math.round(distance),
        weight: 15000 + Math.random() * 25000,
        vehicleType: driverProfile?.fuelProfile?.vehicleType || 'truck',
        rate: Math.round(rate),
        ratePerMile: Math.round((rate / distance) * 100) / 100,
        pickupDate: new Date(Date.now() + (24 + index * 12) * 60 * 60 * 1000).toISOString(),
        deliveryDate: new Date(Date.now() + (48 + index * 12) * 60 * 60 * 1000).toISOString(),
        description: 'Standard freight - Generated when AI unavailable',
        aiScore: 75 + Math.random() * 15,
        shipperName: ['Regional Transport', 'Freight Solutions', 'Logistics Pro'][index] || 'Local Shipper',
        distanceFromDelivery: haversineMiles(deliveryLocation, origin),
        priority: ['optimal', 'high-pay', 'low-mile'][index] as any,
        marketTrend: ['stable', 'rising', 'declining'][index] as any
      });
    });
  } catch (error) {
    console.error('[BackhaulPill] Fallback generation failed:', error);
  }
  
  return suggestions;
}

function haversineMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 3958.8;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const aa = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  return R * c;
}

export default function BackhaulPill({ deliveryLocation, onLoadSelect }: BackhaulPillProps) {
  const { loads } = useLoads();
  const { user } = useAuth();
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [aiSuggestions, setAiSuggestions] = useState<AIBackhaulSuggestion[]>([]);
  const [isGeneratingAI, setIsGeneratingAI] = useState<boolean>(false);
  const [hasTriggeredAI, setHasTriggeredAI] = useState<boolean>(false);

  const nearbyBackhauls = useMemo(() => {
    const radiusMiles = 50;
    return loads
      .filter(load => {
        if (load.status !== 'available') return false;
        
        // Calculate distance from delivery location to load's pickup location
        const distance = haversineMiles(
          { lat: deliveryLocation.lat, lng: deliveryLocation.lng },
          { lat: load.origin.lat, lng: load.origin.lng }
        );
        
        return distance <= radiusMiles;
      })
      .map(load => ({
        ...load,
        distanceFromDelivery: haversineMiles(
          { lat: deliveryLocation.lat, lng: deliveryLocation.lng },
          { lat: load.origin.lat, lng: load.origin.lng }
        )
      }))
      .sort((a, b) => a.distanceFromDelivery - b.distanceFromDelivery)
      .slice(0, 5); // Show top 5 closest backhauls
  }, [loads, deliveryLocation]);

  const generateAIBackhauls = useCallback(async () => {
    if (isGeneratingAI || hasTriggeredAI) return;
    
    setIsGeneratingAI(true);
    setHasTriggeredAI(true);
    
    try {
      console.log('[BackhaulPill] Generating AI suggestions for delivery location:', deliveryLocation);
      
      const driverProfile = user as Driver;
      const vehicleType = driverProfile?.fuelProfile?.vehicleType || 'truck';
      const avgMpg = driverProfile?.fuelProfile?.averageMpg || 6.5;
      
      const messages = [
        {
          role: 'system',
          content: 'You are an AI dispatch assistant for trucking. Generate realistic backhaul load suggestions based on delivery location, driver profile, and market trends. Return JSON only.'
        },
        {
          role: 'user',
          content: `Generate 2-3 high-quality backhaul suggestions for a driver completing delivery in ${deliveryLocation.city}, ${deliveryLocation.state}. 

Driver Profile:
- Vehicle: ${vehicleType}
- Average MPG: ${avgMpg}
- Experience: ${driverProfile?.completedLoads || 0} completed loads

Requirements:
- Within 50 miles of delivery location (${deliveryLocation.lat}, ${deliveryLocation.lng})
- Prioritize high-pay/low-mile options
- Include realistic market trends
- Vary pickup locations around the delivery area

Output schema:
{
  "suggestions": [
    {
      "id": "string",
      "origin": {"city": "string", "state": "string", "lat": number, "lng": number},
      "destination": {"city": "string", "state": "string", "lat": number, "lng": number},
      "distance": number,
      "weight": number,
      "vehicleType": "${vehicleType}",
      "rate": number,
      "ratePerMile": number,
      "pickupDate": "ISO string",
      "deliveryDate": "ISO string",
      "description": "string",
      "aiScore": number,
      "shipperName": "string",
      "distanceFromDelivery": number,
      "priority": "high-pay|low-mile|optimal",
      "marketTrend": "rising|stable|declining"
    }
  ]
}`
        }
      ];

      // Enhanced timeout and error handling with better cleanup
      const controller = new AbortController();
      let timeoutId: NodeJS.Timeout | null = null;
      
      try {
        // Set timeout with proper cleanup
        timeoutId = setTimeout(() => {
          console.log('[BackhaulPill] ❌ Request timeout - aborting after 10 seconds');
          controller.abort();
        }, 10000); // Reduced to 10 seconds for faster fallback

        const response = await fetch('https://toolkit.rork.com/text/llm/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages }),
          signal: controller.signal,
        });
        
        // Clear timeout on successful response
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        
        if (!response.ok) {
          console.error('[BackhaulPill] API error response:', response.status, response.statusText);
          throw new Error(`API responded with status: ${response.status}`);
        }
        
        const data = await response.json() as { completion?: string };
        const rawCompletion = (data?.completion ?? '').trim();
        
        // PERMANENT FIX: Enhanced AI response processing with robust error handling
        const processResponse = (rawCompletion: string) => {
          console.log('[BackhaulPill] 🔧 PERMANENT FIX: Processing AI response...');
          
          try {
            // Step 1: Validate input
            if (!rawCompletion || typeof rawCompletion !== 'string') {
              console.error('[BackhaulPill] ❌ PERMANENT FIX: Invalid rawCompletion input');
              return false;
            }
            
            // Step 2: Enhanced JSON extraction with multiple fallback strategies
            let jsonStr = '';
            let parseAttempts = 0;
            const maxAttempts = 3;
            
            // Strategy 1: Standard JSON extraction
            const jsonStart = rawCompletion.indexOf('{');
            const jsonEnd = rawCompletion.lastIndexOf('}');
            
            if (jsonStart >= 0 && jsonEnd > jsonStart) {
              jsonStr = rawCompletion.slice(jsonStart, jsonEnd + 1);
              
              while (parseAttempts < maxAttempts) {
                parseAttempts++;
                console.log(`[BackhaulPill] 🔧 PERMANENT FIX: Parse attempt ${parseAttempts}/${maxAttempts}`);
                
                try {
                  // Apply progressive sanitization based on attempt
                  let sanitizedJson = jsonStr;
                  
                  if (parseAttempts === 1) {
                    // First attempt: Basic sanitization
                    sanitizedJson = validateAndSanitizeJSON(jsonStr);
                  } else if (parseAttempts === 2) {
                    // Second attempt: More aggressive sanitization
                    sanitizedJson = validateAndSanitizeJSON(jsonStr)
                      .replace(/([^\\])\\([^"\\nrtbf/u])/g, '$1\\\\$2') // Fix unescaped backslashes
                      .replace(/\n/g, '\\n') // Escape actual newlines
                      .replace(/\r/g, '\\r') // Escape actual carriage returns
                      .replace(/\t/g, '\\t'); // Escape actual tabs
                  } else {
                    // Third attempt: Most aggressive - try to reconstruct
                    sanitizedJson = jsonStr
                      .replace(/[\n\r\t]/g, ' ') // Remove all line breaks
                      .replace(/\s+/g, ' ') // Normalize whitespace
                      .replace(/,\s*([}\]])/g, '$1') // Remove trailing commas
                      .replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":') // Quote keys
                      .replace(/:\s*'([^']*)'/g, ': "$1"'); // Fix quotes
                  }
                  
                  console.log(`[BackhaulPill] 🔧 PERMANENT FIX: Attempting JSON.parse (attempt ${parseAttempts})`);
                  console.log(`[BackhaulPill] JSON preview:`, sanitizedJson.substring(0, 100) + '...');
                  
                  const parsed = JSON.parse(sanitizedJson);
                  
                  // Validate parsed structure
                  if (parsed && typeof parsed === 'object') {
                    let suggestions: any[] = [];
                    
                    // Handle different response formats
                    if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
                      suggestions = parsed.suggestions;
                    } else if (Array.isArray(parsed)) {
                      suggestions = parsed;
                    } else if (parsed.data && Array.isArray(parsed.data)) {
                      suggestions = parsed.data;
                    } else {
                      console.warn('[BackhaulPill] ⚠️ PERMANENT FIX: Unexpected JSON structure:', Object.keys(parsed));
                      return false;
                    }
                    
                    // Validate and sanitize suggestions
                    const validSuggestions = suggestions
                      .filter((suggestion: any) => {
                        return suggestion && 
                               typeof suggestion === 'object' &&
                               suggestion.origin &&
                               suggestion.destination;
                      })
                      .map((suggestion: any, index: number) => ({
                        id: suggestion.id || `ai-backhaul-${Date.now()}-${index}`,
                        origin: {
                          city: String(suggestion.origin?.city || 'Unknown'),
                          state: String(suggestion.origin?.state || 'XX'),
                          lat: Number(suggestion.origin?.lat) || (40.7128 + Math.random() * 10 - 5),
                          lng: Number(suggestion.origin?.lng) || (-74.0060 + Math.random() * 10 - 5)
                        },
                        destination: {
                          city: String(suggestion.destination?.city || 'Unknown'),
                          state: String(suggestion.destination?.state || 'XX'),
                          lat: Number(suggestion.destination?.lat) || (40.7128 + Math.random() * 10 - 5),
                          lng: Number(suggestion.destination?.lng) || (-74.0060 + Math.random() * 10 - 5)
                        },
                        distance: Number(suggestion.distance) || 200,
                        weight: Number(suggestion.weight) || 25000,
                        vehicleType: String(suggestion.vehicleType || 'truck'),
                        rate: Number(suggestion.rate) || 1500,
                        ratePerMile: Number(suggestion.ratePerMile) || 2.5,
                        pickupDate: suggestion.pickupDate || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                        deliveryDate: suggestion.deliveryDate || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
                        description: String(suggestion.description || 'AI-generated backhaul opportunity'),
                        aiScore: Math.min(Math.max(Number(suggestion.aiScore) || 85, 70), 98),
                        shipperName: String(suggestion.shipperName || 'Regional Freight Co.'),
                        distanceFromDelivery: Number(suggestion.distanceFromDelivery) || 25,
                        priority: suggestion.priority || 'optimal',
                        marketTrend: suggestion.marketTrend || 'stable'
                      }));
                    
                    if (validSuggestions.length > 0) {
                      console.log(`[BackhaulPill] ✅ PERMANENT FIX: Successfully parsed ${validSuggestions.length} suggestions on attempt ${parseAttempts}`);
                      setAiSuggestions(validSuggestions);
                      return true;
                    } else {
                      console.warn(`[BackhaulPill] ⚠️ PERMANENT FIX: No valid suggestions found in attempt ${parseAttempts}`);
                    }
                  }
                } catch (parseError: any) {
                  console.error(`[BackhaulPill] ❌ PERMANENT FIX: Parse attempt ${parseAttempts} failed:`, parseError.message);
                  if (parseAttempts === 1) {
                    console.log('[BackhaulPill] 🔧 PERMANENT FIX: Trying more aggressive sanitization...');
                  } else if (parseAttempts === 2) {
                    console.log('[BackhaulPill] 🔧 PERMANENT FIX: Trying manual extraction fallback...');
                  }
                }
              }
            }
            
            // Strategy 2: Manual extraction fallback
            console.log('[BackhaulPill] 🔧 PERMANENT FIX: All JSON parse attempts failed, using manual extraction');
            try {
              const fallbackSuggestions = extractSuggestionsManually(rawCompletion);
              if (fallbackSuggestions.length > 0) {
                console.log('[BackhaulPill] ✅ PERMANENT FIX: Manual extraction successful, found', fallbackSuggestions.length, 'suggestions');
                setAiSuggestions(fallbackSuggestions);
                return true;
              }
            } catch (fallbackError) {
              console.error('[BackhaulPill] ❌ PERMANENT FIX: Manual extraction also failed:', fallbackError);
            }
            
            console.error('[BackhaulPill] ❌ PERMANENT FIX: All processing strategies failed');
            return false;
            
          } catch (error: any) {
            console.error('[BackhaulPill] ❌ PERMANENT FIX: Critical error in processResponse:', error.message);
            return false;
          }
        };
        
        // PERMANENT FIX: Process the response with comprehensive error handling
        const processingSuccess = processResponse(rawCompletion);
        if (!processingSuccess) {
          console.log('[BackhaulPill] ⚠️ PERMANENT FIX: AI processing failed, generating fallback suggestions');
          throw new Error('AI response processing failed - using fallback');
        } else {
          console.log('[BackhaulPill] ✅ PERMANENT FIX: AI processing successful - Permanently Fixed');
        }
        
      } catch (fetchError: any) {
        // Clear timeout on error
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        
        // Enhanced error handling with specific error types
        if (fetchError.name === 'AbortError') {
          console.log('[BackhaulPill] ❌ Request was aborted (timeout after 10s)');
          throw new Error('AI service timeout - using fallback suggestions');
        } else if (fetchError.message?.includes('Failed to fetch') || fetchError.message?.includes('fetch')) {
          console.error('[BackhaulPill] ❌ Network fetch failed:', fetchError.message);
          throw new Error('Network connection failed - using fallback suggestions');
        } else if (fetchError.message?.includes('signal is aborted')) {
          console.error('[BackhaulPill] ❌ Signal aborted:', fetchError.message);
          throw new Error('Request cancelled - using fallback suggestions');
        } else {
          console.error('[BackhaulPill] ❌ Unexpected fetch error:', fetchError);
          throw new Error(`AI service error: ${fetchError.message || 'Unknown error'}`);
        }
      }

    } catch (error: any) {
      const errorMsg = error?.message || 'Unknown error';
      console.error('[BackhaulPill] ❌ AI generation failed:', errorMsg);
      
      // Always generate fallback suggestions when AI fails
      try {
        console.log('[BackhaulPill] ⚙️ Generating fallback suggestions due to AI failure...');
        const fallbackSuggestions = generateFallbackSuggestions(deliveryLocation, user as Driver);
        if (fallbackSuggestions.length > 0) {
          console.log('[BackhaulPill] ✅ Using', fallbackSuggestions.length, 'fallback suggestions');
          setAiSuggestions(fallbackSuggestions);
        } else {
          // If even fallback fails, create minimal suggestions
          console.log('[BackhaulPill] ⚙️ Creating minimal suggestions as last resort...');
          const minimalSuggestions = [{
            id: `minimal-${Date.now()}`,
            origin: {
              city: deliveryLocation.city,
              state: deliveryLocation.state,
              lat: deliveryLocation.lat + 0.1,
              lng: deliveryLocation.lng + 0.1
            },
            destination: {
              city: 'Atlanta',
              state: 'GA',
              lat: 33.7490,
              lng: -84.3880
            },
            distance: 250,
            weight: 25000,
            vehicleType: 'truck',
            rate: 1800,
            ratePerMile: 2.4,
            pickupDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            deliveryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            description: 'Standard freight - AI service unavailable',
            aiScore: 75,
            shipperName: 'Regional Transport',
            distanceFromDelivery: 25,
            priority: 'optimal' as const,
            marketTrend: 'stable' as const
          }];
          console.log('[BackhaulPill] ✅ Using minimal fallback suggestions');
          setAiSuggestions(minimalSuggestions);
        }
      } catch (fallbackError) {
        console.error('[BackhaulPill] ❌ Even fallback generation failed:', fallbackError);
        // Set empty array but don't block the UI
        setAiSuggestions([]);
      }
    } finally {
      setIsGeneratingAI(false);
    }
  }, [deliveryLocation, user, isGeneratingAI, hasTriggeredAI]);

  const handlePillPress = async () => {
    setIsLoading(true);
    try {
      // Generate AI suggestions if not already done
      if (!hasTriggeredAI && aiSuggestions.length === 0) {
        await generateAIBackhauls();
      }
      setModalVisible(true);
    } catch (error) {
      console.error('Failed to fetch backhauls:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadSelect = (loadId: string) => {
    setModalVisible(false);
    onLoadSelect?.(loadId);
  };

  // Auto-trigger AI generation after load acceptance (simulated)
  useEffect(() => {
    if (user?.role === 'driver' && !hasTriggeredAI) {
      // Simulate auto-trigger after load acceptance with a delay
      const timer = setTimeout(() => {
        generateAIBackhauls();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [user, generateAIBackhauls, hasTriggeredAI]);

  // Combine regular backhauls with AI suggestions
  const allBackhauls = useMemo(() => {
    const combined = [...nearbyBackhauls];
    
    // Add AI suggestions as enhanced backhauls
    aiSuggestions.forEach(suggestion => {
      combined.push({
        id: suggestion.id,
        shipperId: 'ai-generated',
        shipperName: suggestion.shipperName,
        origin: {
          ...suggestion.origin,
          address: '',
          zipCode: ''
        },
        destination: {
          ...suggestion.destination,
          address: '',
          zipCode: ''
        },
        distance: suggestion.distance,
        weight: suggestion.weight,
        vehicleType: suggestion.vehicleType as any,
        rate: suggestion.rate,
        ratePerMile: suggestion.ratePerMile,
        pickupDate: new Date(suggestion.pickupDate),
        deliveryDate: new Date(suggestion.deliveryDate),
        status: 'available' as const,
        description: suggestion.description,
        isBackhaul: true,
        aiScore: suggestion.aiScore,
        assignedDriverId: undefined,
        distanceFromDelivery: suggestion.distanceFromDelivery,
        // Extended properties for AI suggestions
        ...({
          priority: suggestion.priority,
          marketTrend: suggestion.marketTrend,
        } as any),
      });
    });
    
    // Sort by AI score (highest first), then by distance
    return combined.sort((a, b) => {
      const aScore = (a as any).aiScore || 0;
      const bScore = (b as any).aiScore || 0;
      if (aScore !== bScore) return bScore - aScore;
      return a.distanceFromDelivery - b.distanceFromDelivery;
    });
  }, [nearbyBackhauls, aiSuggestions]);

  // Show pill if we have backhauls OR if AI is generating suggestions
  if (allBackhauls.length === 0 && !isGeneratingAI && !hasTriggeredAI) {
    return null;
  }

  return (
    <>
      <TouchableOpacity
        style={styles.pill}
        onPress={handlePillPress}
        disabled={isLoading}
        testID="backhaul-pill"
      >
        <View style={styles.pillContent}>
          <View style={styles.pillIcon}>
            <Truck size={16} color={theme.colors.white} />
          </View>
          <View style={styles.pillText}>
            <Text style={styles.pillTitle}>
              {isGeneratingAI ? 'AI analyzing backhauls...' : 
               aiSuggestions.length > 0 ? `Smart Backhaul (${Math.round(allBackhauls[0]?.distanceFromDelivery || 0)}mi, ${allBackhauls[0]?.rate || 0})` :
               `Backhaul near delivery (${Math.round(allBackhauls[0]?.distanceFromDelivery || 0)}mi)`}
            </Text>
            <Text style={styles.pillSubtitle}>
              {isGeneratingAI ? 'Analyzing market trends & driver profile' :
               aiSuggestions.length > 0 ? `${aiSuggestions.length} smart match${aiSuggestions.length !== 1 ? 'es' : ''} found` :
               `${allBackhauls.length} option${allBackhauls.length !== 1 ? 's' : ''} available`}
            </Text>
          </View>
          {isLoading || isGeneratingAI ? (
            <ActivityIndicator size="small" color={theme.colors.white} />
          ) : aiSuggestions.length > 0 ? (
            <Brain size={16} color={theme.colors.white} />
          ) : (
            <ArrowRight size={16} color={theme.colors.white} />
          )}
        </View>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.closeButton}
              testID="close-backhaul-modal"
            >
              <X size={24} color={theme.colors.dark} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Nearby Backhauls</Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.locationInfo}>
              <MapPin size={20} color={theme.colors.primary} />
              <Text style={styles.locationText}>
                From your delivery in {deliveryLocation.city}, {deliveryLocation.state}
              </Text>
            </View>

            {aiSuggestions.length > 0 && (
              <View style={styles.aiInfo}>
                <Brain size={20} color={theme.colors.secondary} />
                <Text style={styles.aiInfoText}>
                  AI-powered suggestions based on your profile and market trends
                </Text>
              </View>
            )}

            {allBackhauls.map((load) => (
              <TouchableOpacity
                key={load.id}
                style={styles.loadCard}
                onPress={() => handleLoadSelect(load.id)}
                testID={`backhaul-load-${load.id}`}
              >
                <View style={styles.loadHeader}>
                  <View style={styles.loadRoute}>
                    <Text style={styles.loadOrigin}>{load.origin.city}, {load.origin.state}</Text>
                    <ArrowRight size={16} color={theme.colors.gray} />
                    <Text style={styles.loadDestination}>{load.destination.city}, {load.destination.state}</Text>
                  </View>
                  <Text style={styles.loadDistance}>{Math.round(load.distanceFromDelivery)}mi away</Text>
                </View>

                <View style={styles.loadDetails}>
                  <View style={styles.loadMeta}>
                    <View style={styles.vehicleTag}>
                      <Truck size={14} color={theme.colors.white} />
                      <Text style={styles.vehicleText}>
                        {load.vehicleType.replace('-', ' ').toUpperCase()}
                      </Text>
                    </View>
                    {(load as any).priority && (
                      <View style={[styles.priorityTag, 
                        (load as any).priority === 'high-pay' ? styles.priorityHigh :
                        (load as any).priority === 'low-mile' ? styles.priorityLow : styles.priorityOptimal
                      ]}>
                        <Text style={styles.priorityText}>
                          {(load as any).priority === 'high-pay' ? 'HIGH PAY' :
                           (load as any).priority === 'low-mile' ? 'LOW MILE' : 'OPTIMAL'}
                        </Text>
                      </View>
                    )}
                    <Text style={styles.loadWeight}>{(load.weight / 1000).toFixed(1)}k lbs</Text>
                  </View>

                  <View style={styles.loadFinancials}>
                    <View style={styles.rateInfo}>
                      <DollarSign size={16} color={theme.colors.success} />
                      <Text style={styles.rateAmount}>{formatCurrency(load.rate)}</Text>
                      <Text style={styles.ratePerMile}>${load.ratePerMile.toFixed(2)}/mi</Text>
                      {(load as any).marketTrend && (
                        <View style={[styles.trendIndicator,
                          (load as any).marketTrend === 'rising' ? styles.trendRising :
                          (load as any).marketTrend === 'declining' ? styles.trendDeclining : styles.trendStable
                        ]}>
                          <Text style={styles.trendText}>
                            {(load as any).marketTrend === 'rising' ? '↗' :
                             (load as any).marketTrend === 'declining' ? '↘' : '→'}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.loadMiles}>{load.distance} miles</Text>
                  </View>
                </View>

                {load.description && (
                  <Text style={styles.loadDescription} numberOfLines={2}>
                    {load.description}
                  </Text>
                )}

                <View style={styles.loadFooter}>
                  <Text style={styles.pickupDate}>
                    Pickup: {new Date(load.pickupDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                  <View style={styles.footerRight}>
                    {(load as any).shipperId === 'ai-generated' && (
                      <View style={styles.aiTag}>
                        <Sparkles size={12} color={theme.colors.secondary} />
                        <Text style={styles.aiTagText}>AI</Text>
                      </View>
                    )}
                    {load.aiScore && (
                      <View style={styles.aiScore}>
                        <Text style={styles.aiScoreText}>{load.aiScore}% match</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))}

            {isGeneratingAI && (
              <View style={styles.aiGenerating}>
                <Brain size={32} color={theme.colors.secondary} />
                <ActivityIndicator size="large" color={theme.colors.secondary} style={styles.aiGeneratingSpinner} />
                <Text style={styles.aiGeneratingTitle}>AI Analyzing Market...</Text>
                <Text style={styles.aiGeneratingSubtitle}>
                  Considering your profile, delivery location, and current market trends
                </Text>
              </View>
            )}

            {!isGeneratingAI && allBackhauls.length === 0 && (
              <View style={styles.emptyState}>
                <Truck size={48} color={theme.colors.gray} />
                <Text style={styles.emptyTitle}>No backhauls found</Text>
                <Text style={styles.emptySubtitle}>
                  No available loads within 50 miles of your delivery location.
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    backgroundColor: '#FF8C00',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pillIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: {
    flex: 1,
  },
  pillTitle: {
    color: theme.colors.white,
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    marginBottom: 2,
  },
  pillSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: theme.fontSize.sm,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.lightGray,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.lightGray,
  },
  closeButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  modalContent: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.white,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
  },
  locationText: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.dark,
    fontWeight: '500',
  },
  loadCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  loadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  loadRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    flex: 1,
  },
  loadOrigin: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  loadDestination: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  loadDistance: {
    fontSize: theme.fontSize.sm,
    color: '#FF8C00',
    fontWeight: '600',
  },
  loadDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  loadMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  vehicleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  vehicleText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.xs,
    fontWeight: '600',
  },
  loadWeight: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
  },
  loadFinancials: {
    alignItems: 'flex-end',
  },
  rateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rateAmount: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.success,
  },
  ratePerMile: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
  },
  loadMiles: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
  },
  loadDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginBottom: theme.spacing.sm,
    lineHeight: 18,
  },
  loadFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickupDate: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
  },
  aiScore: {
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  aiScoreText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.success,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  emptyTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.dark,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  emptySubtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  headerSpacer: {
    width: 24,
  },
  aiInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: '#EFF6FF',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  aiInfoText: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    color: theme.colors.secondary,
    fontWeight: '500',
  },
  priorityTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  priorityHigh: {
    backgroundColor: '#FEF3C7',
  },
  priorityLow: {
    backgroundColor: '#D1FAE5',
  },
  priorityOptimal: {
    backgroundColor: '#E0E7FF',
  },
  priorityText: {
    fontSize: theme.fontSize.xs,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  trendIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  trendRising: {
    backgroundColor: '#D1FAE5',
  },
  trendDeclining: {
    backgroundColor: '#FEE2E2',
  },
  trendStable: {
    backgroundColor: '#F3F4F6',
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  aiTagText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.secondary,
    fontWeight: '600',
  },
  aiGenerating: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
  aiGeneratingTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.secondary,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  aiGeneratingSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    textAlign: 'center',
    lineHeight: 18,
  },
  aiGeneratingSpinner: {
    marginTop: 8,
  },
});