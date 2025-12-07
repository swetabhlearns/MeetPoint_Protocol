/**
 * Google Places API (New) Integration
 * Best data quality for India with $200/month free credit
 * ~70,000 requests/month in India (India-specific pricing)
 */

export interface GooglePlace {
    id: string;
    displayName: {
        text: string;
        languageCode: string;
    };
    formattedAddress?: string;
    location: {
        latitude: number;
        longitude: number;
    };
    rating?: number;
    userRatingCount?: number;
    priceLevel?: string;
    types?: string[];
    businessStatus?: string;
}

export interface GooglePlacesResponse {
    places: GooglePlace[];
}

/**
 * Search for nearby places using Google Places API (New)
 */
export async function searchGooglePlaces(
    latitude: number,
    longitude: number,
    radius: number = 2000, // meters
    includedTypes?: string[], // e.g., ['restaurant', 'cafe', 'bar']
    maxResultCount: number = 20
): Promise<GooglePlace[]> {
    try {
        const apiKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;

        if (!apiKey) {
            console.error('Google Places API key not found');
            return [];
        }

        console.log(`🔍 Searching Google Places near ${latitude}, ${longitude}`);

        const requestBody = {
            includedTypes: includedTypes || ['restaurant', 'cafe', 'bar', 'night_club'],
            maxResultCount,
            locationRestriction: {
                circle: {
                    center: {
                        latitude,
                        longitude,
                    },
                    radius,
                },
            },
        };

        const response = await fetch(
            'https://places.googleapis.com/v1/places:searchNearby',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': apiKey,
                    'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.priceLevel,places.types,places.businessStatus',
                },
                body: JSON.stringify(requestBody),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Google Places API error:', response.status, errorText);
            return [];
        }

        const data: GooglePlacesResponse = await response.json();
        const places = data.places || [];

        console.log(`✅ Found ${places.length} Google Places`);

        return places;
    } catch (error) {
        console.error('Google Places search failed:', error);
        return [];
    }
}

/**
 * Google Places type mappings for filters
 */
export const GOOGLE_PLACE_TYPES = {
    RESTAURANT: 'restaurant',
    CAFE: 'cafe',
    BAR: 'bar',
    NIGHT_CLUB: 'night_club',
    PARK: 'park',
    COFFEE_SHOP: 'coffee_shop',
};

/**
 * Get type filter based on user preferences
 */
export function getGooglePlaceTypes(filters?: {
    types?: ('cafe' | 'bar' | 'restaurant' | 'pub' | 'park')[];
}): string[] {
    if (!filters?.types || filters.types.length === 0) {
        return ['restaurant', 'cafe', 'bar', 'night_club'];
    }

    const typeMap: Record<string, string> = {
        cafe: 'cafe',
        bar: 'bar',
        restaurant: 'restaurant',
        pub: 'night_club',
        park: 'park',
    };

    return filters.types
        .map(type => typeMap[type])
        .filter(Boolean);
}
