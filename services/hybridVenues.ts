import { scoreVenue } from '@/utils/ScoreVenue';
import { searchOlaMapsNearby } from './olaMaps';

// Types - moved from overpass.ts
export interface Venue {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  tags: Record<string, string>;
  score: number;
  aiRecommended?: boolean;
}

export interface VenueFilters {
  types?: ('cafe' | 'bar' | 'restaurant' | 'pub')[];
  diet?: 'any' | 'vegetarian' | 'vegan';
  vibe?: ('date' | 'work' | 'rooftop' | 'chill' | 'party')[];
}
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
      website: olaPlace.website || olaPlace.url || '', // Zomato/website link
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
    types?: ('cafe' | 'bar' | 'restaurant' | 'pub')[];
    diet?: 'any' | 'vegetarian' | 'vegan';
    vibe?: ('date' | 'work' | 'rooftop' | 'chill' | 'party')[];
  }
): Promise<Venue[]> {
  try {
    console.log('🔄 Fetching venues from Ola Maps (India-specific)');

    // Search multiple categories in parallel to get more results
    const categories = ['restaurant', 'cafe', 'bar'];

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

    return convertedVenues;
  } catch (error) {
    console.error('Ola Maps venue fetch failed:', error);
    return [];
  }
}

/**
 * Fetch venues along the route between two locations
 * Searches at multiple points along the actual travel path
 */
export async function fetchVenuesAlongRoute(
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number },
  userLocation: { latitude: number; longitude: number },
  filters?: {
    types?: ('cafe' | 'bar' | 'restaurant' | 'pub')[];
    diet?: 'any' | 'vegetarian' | 'vegan';
    vibe?: ('date' | 'work' | 'rooftop' | 'chill' | 'party')[];
  }
): Promise<{ venues: Venue[]; routePoints: { latitude: number; longitude: number }[] }> {
  try {
    console.log('🛣️ [1] Starting route-based venue search');
    console.log('🛣️ [2] Origin:', origin);
    console.log('🛣️ [3] Destination:', destination);

    // Dynamic import INSIDE try-catch
    let routingModule;
    try {
      routingModule = await import('./routing');
      console.log('🛣️ [4] Routing module loaded successfully');
    } catch (importError) {
      console.error('🛣️ [ERROR] Failed to import routing module:', importError);
      throw new Error('Failed to load routing module');
    }

    const { getRouteBetweenLocations, samplePointsAlongRoute, distanceToRoute } = routingModule;

    // Step 1: Get the actual route between locations
    console.log('🛣️ [5] Calling getRouteBetweenLocations...');
    const route = await getRouteBetweenLocations(origin, destination);
    console.log('🛣️ [6] Route result:', route ? 'Found' : 'Not found');

    if (!route || !route.points || route.points.length === 0) {
      console.log('⚠️ [7] No route found, falling back to midpoint search');
      const midpoint = {
        latitude: (origin.latitude + destination.latitude) / 2,
        longitude: (origin.longitude + destination.longitude) / 2,
      };
      const venues = await fetchOlaMapsVenues(midpoint, userLocation, filters);
      return { venues, routePoints: [origin, midpoint, destination] };
    }

    console.log(`🛣️ [7] Route has ${route.points.length} points`);

    // Step 2: Sample 5 points evenly along the route
    const samplePoints = samplePointsAlongRoute(route.points, 5);
    console.log(`📍 [8] Sampling venues at ${samplePoints.length} points along route`);

    // Step 3: Search for venues at each sample point
    const categories = ['restaurant', 'cafe', 'bar'];

    const allVenues: Venue[] = [];
    const seenIds = new Set<string>();

    // Search at each sample point
    for (let i = 0; i < samplePoints.length; i++) {
      const point = samplePoints[i];
      console.log(`🔍 [9.${i}] Searching at point ${i}: ${point.latitude}, ${point.longitude}`);

      try {
        const searchPromises = categories.map(cat =>
          searchOlaMapsNearby(
            point.latitude,
            point.longitude,
            3000,
            cat
          )
        );

        const results = await Promise.all(searchPromises);
        const places = results.flat();
        console.log(`🔍 [9.${i}] Found ${places.length} places at point ${i}`);

        // Convert and deduplicate
        const unwantedTypes = ['school', 'university', 'college', 'hospital', 'lodging', 'finance', 'post_office'];

        for (const p of places) {
          if (!p || !p.place_id || seenIds.has(p.place_id)) continue;
          if (p.types && p.types.some((t: string) => unwantedTypes.includes(t))) continue;

          seenIds.add(p.place_id);

          const venue = olaPlaceToVenue(p, userLocation, filters);

          // Add route proximity bonus
          if (venue.latitude && venue.longitude) {
            const distToRoute = distanceToRoute(
              { latitude: venue.latitude, longitude: venue.longitude },
              route.points
            );

            if (distToRoute < 500) {
              venue.score += 15;
              venue.tags.route_proximity = 'on route';
            } else if (distToRoute < 1000) {
              venue.score += 10;
              venue.tags.route_proximity = 'near route';
            } else if (distToRoute < 2000) {
              venue.score += 5;
              venue.tags.route_proximity = 'accessible';
            }
          }

          allVenues.push(venue);
        }
      } catch (pointError) {
        console.error(`🔍 [9.${i}] Error at point ${i}:`, pointError);
        // Continue to next point
      }
    }

    console.log(`✅ [10] Found ${allVenues.length} unique venues along route`);

    // Sort by score
    allVenues.sort((a, b) => b.score - a.score);

    return { venues: allVenues, routePoints: route.points };
  } catch (error) {
    console.error('🛣️ [ERROR] Route-based venue fetch failed:', error);
    // Return empty but don't crash
    return { venues: [], routePoints: [] };
  }
}
