// ZIP code sanitization and endpoint extraction utilities

/**
 * Sanitizes a ZIP code from messy strings like "las vegas nv 89011"
 * Returns clean 5-digit ZIP or null if not found
 */
export function sanitizeZip(input: string | null | undefined): string | null {
  if (!input || typeof input !== 'string') return null;
  
  // Look for 5-digit ZIP patterns in the string
  const zipMatch = input.match(/\b\d{5}\b/);
  return zipMatch ? zipMatch[0] : null;
}

/**
 * Extracts origin and destination endpoints from load object
 * Returns both clean ZIPs and freeform text for fallback geocoding
 */
export function extractEndpoints(load: any): {
  origin: { zip: string | null; text: string | null };
  destination: { zip: string | null; text: string | null };
} {
  if (!load) {
    return {
      origin: { zip: null, text: null },
      destination: { zip: null, text: null }
    };
  }

  // Extract origin data
  const originFields = [
    load.origin?.zip,
    load.pickupZip,
    load.originZip,
    load.srcZip,
    load.fromZip,
    load.origin?.postal,
    load.pickup?.zip,
    load.origin?.zipCode
  ];

  const originTextFields = [
    load.origin?.address,
    load.pickupAddress,
    load.originAddress,
    load.pickup?.address,
    // Combine city, state, zip for freeform
    [load.origin?.city, load.origin?.state, load.origin?.zip].filter(Boolean).join(', '),
    [load.pickup?.city, load.pickup?.state, load.pickup?.zip].filter(Boolean).join(', ')
  ];

  // Extract destination data
  const destFields = [
    load.destination?.zip,
    load.destZip,
    load.deliveryZip,
    load.toZip,
    load.destination?.postal,
    load.dropoff?.zip,
    load.destination?.zipCode
  ];

  const destTextFields = [
    load.destination?.address,
    load.deliveryAddress,
    load.destAddress,
    load.dropoff?.address,
    // Combine city, state, zip for freeform
    [load.destination?.city, load.destination?.state, load.destination?.zip].filter(Boolean).join(', '),
    [load.dropoff?.city, load.dropoff?.state, load.dropoff?.zip].filter(Boolean).join(', ')
  ];

  // Find first valid ZIP for each endpoint
  let originZip: string | null = null;
  let destZip: string | null = null;

  for (const field of originFields) {
    const zip = sanitizeZip(String(field || ''));
    if (zip) {
      originZip = zip;
      break;
    }
  }

  for (const field of destFields) {
    const zip = sanitizeZip(String(field || ''));
    if (zip) {
      destZip = zip;
      break;
    }
  }

  // Find first non-empty text for each endpoint
  let originText: string | null = null;
  let destText: string | null = null;

  for (const field of originTextFields) {
    if (field && typeof field === 'string' && field.trim().length > 0) {
      originText = field.trim();
      break;
    }
  }

  for (const field of destTextFields) {
    if (field && typeof field === 'string' && field.trim().length > 0) {
      destText = field.trim();
      break;
    }
  }

  return {
    origin: { zip: originZip, text: originText },
    destination: { zip: destZip, text: destText }
  };
}