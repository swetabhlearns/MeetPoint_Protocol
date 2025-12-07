/**
 * Ola Maps API Integration
 * Best for India with 5 million free API calls per month!
 * No credit card required
 */

export interface OlaPlace {
    place_id: string;
    reference: string;
    description: string;
    structured_formatting: {
        main_text: string;
        secondary_text: string;
    };
    types: string[];
    distance_meters?: number;
}

export interface OlaNearbySearchResponse {
    predictions: OlaPlace[];
    status: string;
    error_message?: string;
}

/**
 * Geocode an Ola place_id to get coordinates
 */
async function geocodeOlaPlace(placeId: string, apiKey: string): Promise<{ lat: number; lng: number } | null> {
    try {
        const response = await fetch(
            `https://api.olamaps.io/places/v1/details?place_id=${placeId}&api_key=${apiKey}`
        );

        if (!response.ok) {
            return null;
        }

        const data = await response.json();

        if (data.result?.geometry?.location) {
            return {
                lat: data.result.geometry.location.lat,
                lng: data.result.geometry.location.lng
            };
        }

        return null;
    } catch (error) {
        console.error('Geocoding failed:', error);
        return null;
    }
}

/**
 * Search for nearby places using Ola Maps Nearby Search API
 */
export async function searchOlaMapsNearby(
    latitude: number,
    longitude: number,
    radius: number = 2000, // meters
    type?: string, // Single type: 'restaurant', 'cafe', etc.
    keyword?: string
): Promise<OlaPlace[]> {
    try {
        const apiKey = process.env.EXPO_PUBLIC_OLA_MAPS_API_KEY;

        if (!apiKey) {
            console.error('Ola Maps API key not found');
            return [];
        }

        console.log(`🔍 Searching Ola Maps (Advanced) near ${latitude}, ${longitude}`);

        const params = new URLSearchParams({
            layers: 'venue',
            location: `${latitude},${longitude}`,
            radius: radius.toString(),
            api_key: apiKey,
        });

        // Ola Maps only accepts single type, not pipe-separated
        if (type) {
            params.append('types', type);
        }

        if (keyword) {
            params.append('keyword', keyword);
        }

        // Use ADVANCED endpoint which includes full venue data with coordinates
        const response = await fetch(
            `https://api.olamaps.io/places/v1/nearbysearch/advanced?${params}`,
            {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Ola Maps API error:', response.status, errorText);
            return [];
        }

        const data: any = await response.json(); // Use any to be flexible with response structure

        console.log('📦 Ola Maps raw response:', JSON.stringify(data, null, 2));

        if (data.status !== 'OK' && data.status !== 'ok') {
            console.error('Ola Maps API status:', data.status);
            // Don't return empty if we got venues despite status
            const hasData = (data.predictions && data.predictions.length > 0) || (data.results && data.results.length > 0);
            if (!hasData) {
                console.log('⚠️ No venues in response');
                return [];
            }
        }

        // The Advanced API might use 'results' like standard APIs, or 'predictions' like the basic one.
        const places = data.results || data.predictions || [];
        console.log(`✅ Found ${places.length} raw results`);

        // Check if places have geometry. If not, we MUST geocode them.
        const placesWithGeometry = await Promise.all(places.map(async (place: any) => {
            if (place.geometry && place.geometry.location) {
                return place;
            }

            // Enrich with details
            if (place.place_id) {
                const details = await getOlaPlaceDetails(place.place_id);
                if (details) {
                    return {
                        ...place,
                        geometry: {
                            location: {
                                lat: details.lat,
                                lng: details.lng
                            }
                        },
                        name: details.name,
                        formatted_address: details.formatted_address
                    };
                }
            }
            return null;
        }));

        // Filter out failures
        const validPlaces = placesWithGeometry.filter((p: any) => p !== null);
        console.log(`✅ ${validPlaces.length} venues enriched with geometry`);

        return validPlaces;
    } catch (error) {
        console.error('Ola Maps search failed:', error);
        return [];
    }
}

/**
 * Ola Maps place types for filters
 */
export const OLA_PLACE_TYPES = {
    RESTAURANT: 'restaurant',
    CAFE: 'cafe',
    BAR: 'bar',
    NIGHT_CLUB: 'night_club',
    PARK: 'park',
    FOOD: 'food',
};

/**
 * Get type filter based on user preferences
 */
export function getOlaPlaceTypes(filters?: {
    types?: ('cafe' | 'bar' | 'restaurant' | 'pub' | 'park')[];
}): string {
    // Ola Maps only accepts single type, so prioritize restaurant
    if (!filters?.types || filters.types.length === 0) {
        return 'restaurant';
    }

    const typeMap: Record<string, string> = {
        cafe: 'cafe',
        bar: 'bar',
        restaurant: 'restaurant',
        pub: 'bar', // Ola doesn't have night_club, use bar
        park: 'park',
    };

    // Return first valid type
    for (const type of filters.types) {
        if (typeMap[type]) {
            return typeMap[type];
        }
    }

    return 'restaurant';
}

/**
 * Autocomplete search for places
 */
export async function searchOlaMapsAutocomplete(
    query: string,
    latitude?: number,
    longitude?: number
): Promise<OlaPlace[]> {
    try {
        const apiKey = process.env.EXPO_PUBLIC_OLA_MAPS_API_KEY;
        if (!apiKey) return [];

        const params = new URLSearchParams({
            input: query,
            api_key: apiKey,
        });

        if (latitude && longitude) {
            params.append('location', `${latitude},${longitude}`);
            params.append('radius', '50000'); // 50km radius bias
        }

        const response = await fetch(
            `https://api.olamaps.io/places/v1/autocomplete?${params}`,
            {
                headers: { 'Accept': 'application/json' }
            }
        );

        if (!response.ok) return [];

        const data = await response.json();
        return data.predictions || [];
    } catch (error) {
        console.error('Ola Autocomplete failed:', error);
        return [];
    }
}

/**
 * Get details for a specific place (coordinates + address)
 */
export async function getOlaPlaceDetails(placeId: string): Promise<{
    lat: number;
    lng: number;
    name: string;
    formatted_address: string;
} | null> {
    try {
        const apiKey = process.env.EXPO_PUBLIC_OLA_MAPS_API_KEY;
        if (!apiKey) return null;

        const response = await fetch(
            `https://api.olamaps.io/places/v1/details?place_id=${placeId}&api_key=${apiKey}`
        );

        if (!response.ok) return null;

        const data = await response.json();
        const result = data.result;

        if (!result || !result.geometry?.location) {
            return null;
        }

        return {
            lat: result.geometry.location.lat,
            lng: result.geometry.location.lng,
            name: result.name || result.formatted_address,
            formatted_address: result.formatted_address
        };

    } catch (error) {
        console.error('Ola Details failed:', error);
        return null;
    }
}
