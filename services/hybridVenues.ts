import { Venue } from './overpass';
import { searchOlaMapsNearby, OlaPlace, getOlaPlaceTypes } from './olaMaps';
import { scoreVenue } from '@/utils/ScoreVenue';

/**
 * Convert Ola Maps place to standard Venue format
 */
// Helper to calculate distance between two points in km
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

function olaPlaceToVenue(
  olaPlace: any, // Using any because structure varies after geocoding
  userLocation: { latitude: number; longitude: number },
  filters?: any
): Venue {
  if (!olaPlace.geometry?.location) {
    console.warn(`⚠️ Missing geometry for ${olaPlace.name || 'unknown venue'}`);
  }

  const lat = olaPlace.geometry?.location?.lat || 0;
  const lng = olaPlace.geometry?.location?.lng || 0;

  // Calculate real distance from user
  const distKm = calculateDistance(
    userLocation.latitude,
    userLocation.longitude,
    lat,
    lng
  );

  // Format distance for display (e.g., "2.5 km" or "800 m")
  const distDisplay = distKm < 1
    ? `${Math.round(distKm * 1000)} m`
    : `${distKm.toFixed(1)} km`;

  const venue: Venue = {
    id: `ola-${olaPlace.place_id}`,
    name: olaPlace.name || olaPlace.structured_formatting?.main_text || 'Unknown Venue',
    latitude: lat,
    longitude: lng,
    tags: {
      name: olaPlace.name || olaPlace.structured_formatting?.main_text || 'Unknown Venue',
      'addr:full': olaPlace.formatted_address || olaPlace.description || olaPlace.vicinity || '',
      amenity: olaPlace.types?.[0] || 'venue',
      distance: distDisplay, // Use our calculated distance!
      rating: olaPlace.rating?.toString() || '',
      user_ratings_total: olaPlace.user_ratings_total?.toString() || '',
      open_now: olaPlace.opening_hours?.open_now ? 'yes' : 'no',
    },
    score: 0,
    aiRecommended: false,
  };

  // Fix scoreVenue call - signature is (tags, vibes, distance)
  venue.score = scoreVenue(
    venue.tags,
    filters?.vibe,
    distKm // Use calculated distance for scoring
  );

  // Boost venues with high ratings
  if (olaPlace.rating) {
    const ratingBoost = Math.min((olaPlace.rating - 3) * 5, 20);
    venue.score += Math.max(ratingBoost, 0);
  }

  // Boost venues with many reviews (popularity)
  if (olaPlace.user_ratings_total) {
    const popularityBoost = Math.min(olaPlace.user_ratings_total / 100, 10);
    venue.score += popularityBoost;
  }

  return venue;
}

/**
 * Fetch venues using Ola Maps API
 * Best for India with 5 million free calls/month!
 */
export async function fetchOlaMapsVenues(
  midpoint: { latitude: number; longitude: number },
  userLocation: { latitude: number; longitude: number },
  filters?: {
    types?: ('cafe' | 'bar' | 'restaurant' | 'pub' | 'park')[];
    diet?: 'any' | 'vegetarian' | 'vegan';
    vibe?: ('aesthetic' | 'cozy' | 'upscale' | 'casual')[];
  }
): Promise<Venue[]> {
  try {
    console.log('🔄 Fetching venues from Ola Maps (India-specific)');

    // Search multiple categories in parallel to get more results
    const categories = ['restaurant', 'cafe', 'bar'];
    // Add 'park' if explicitly requested
    if (filters?.types?.includes('park')) categories.push('park');

    console.log(`Searching categories: ${categories.join(', ')}`);

    const searchPromises = categories.map(cat =>
      searchOlaMapsNearby(
        midpoint.latitude,
        midpoint.longitude,
        10000, // Increased to 10km radius for better results
        cat
      )
    );

    const results = await Promise.all(searchPromises);

    // Combine all results
    const allPlaces = results.flat();
    console.log(`✅ Total raw results: ${allPlaces.length}`);

    // Deduplicate venues based on place_id or place_id inside id
    const seenIds = new Set<string>();
    const unwantedTypes = ['school', 'university', 'college', 'hospital', 'lodging', 'finance', 'post_office'];

    const uniqueOlaPlaces = allPlaces.filter(p => {
      if (!p.place_id) return false;
      if (seenIds.has(p.place_id)) return false;

      // Strict Type Filtering: Remove colleges, hospitals, etc.
      if (p.types && p.types.some(t => unwantedTypes.includes(t))) {
        // Whitelist exception: restaurant/cafe/bar inside a hotel (lodging) might be okay, but for now remove
        return false;
      }

      seenIds.add(p.place_id);
      return true;
    });

    console.log(`✅ Deduplicated: ${allPlaces.length} -> ${uniqueOlaPlaces.length} unique venues`);

    const convertedVenues = uniqueOlaPlaces.map(op =>
      olaPlaceToVenue(op, userLocation, filters)
    );

    console.log(`✅ Converted ${convertedVenues.length} Ola Maps venues`);

    // Sort by score
    convertedVenues.sort((a, b) => b.score - a.score);

    return convertedVenues;
  } catch (error) {
    console.error('Ola Maps venue fetch failed:', error);
    return [];
  }
}
