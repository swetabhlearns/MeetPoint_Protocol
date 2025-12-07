/**
 * Foursquare Places API Integration
 * Free tier: 950 calls/day (Developer account)
 * Provides real venue data for accurate recommendations
 */

export interface FoursquareVenue {
    fsq_id: string;
    name: string;
    location: {
        address?: string;
        locality?: string;
        region?: string;
        postcode?: string;
        country?: string;
        formatted_address?: string;
        latitude: number;
        longitude: number;
    };
    categories: Array<{
        id: number;
        name: string;
        icon: {
            prefix: string;
            suffix: string;
        };
    }>;
    distance?: number;
    rating?: number;
    price?: number;
}

/**
 * Search for venues near a location using Foursquare Places API
 */
export async function searchFoursquareVenues(
    latitude: number,
    longitude: number,
    radius: number = 2000, // meters
    categories?: string, // e.g., "13000,13003,13032" for dining
    limit: number = 50
): Promise<FoursquareVenue[]> {
    try {
        const apiKey = process.env.EXPO_PUBLIC_FOURSQUARE_API_KEY;

        if (!apiKey) {
            console.error('Foursquare API key not found');
            return [];
        }

        console.log(`🔍 Searching Foursquare near ${latitude}, ${longitude}`);

        const params = new URLSearchParams({
            ll: `${latitude},${longitude}`,
            radius: radius.toString(),
            limit: limit.toString(),
            ...(categories && { categories }),
        });

        const response = await fetch(
            `https://api.foursquare.com/v3/places/search?${params}`,
            {
                headers: {
                    'Authorization': apiKey,
                    'Accept': 'application/json',
                },
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Foursquare API error:', response.status, errorText);
            return [];
        }

        const data = await response.json();
        const venues = data.results || [];

        console.log(`✅ Found ${venues.length} Foursquare venues`);

        return venues;
    } catch (error) {
        console.error('Foursquare search failed:', error);
        return [];
    }
}

/**
 * Foursquare category IDs for date venues
 */
export const FOURSQUARE_CATEGORIES = {
    // Food & Drink
    RESTAURANT: '13065',
    CAFE: '13032',
    BAR: '13003',
    COFFEE_SHOP: '13034',
    LOUNGE: '13038',

    // Outdoor & Recreation
    PARK: '16000',
    GARDEN: '16011',

    // Combined for date venues
    DATE_VENUES: '13000,13003,13032,13034,13038,13065,16000',
};

/**
 * Get category filter based on user preferences
 */
export function getCategoryFilter(filters?: {
    types?: ('cafe' | 'bar' | 'restaurant' | 'pub' | 'park')[];
}): string {
    if (!filters?.types || filters.types.length === 0) {
        return FOURSQUARE_CATEGORIES.DATE_VENUES;
    }

    const categoryMap: Record<string, string> = {
        cafe: FOURSQUARE_CATEGORIES.CAFE,
        bar: FOURSQUARE_CATEGORIES.BAR,
        restaurant: FOURSQUARE_CATEGORIES.RESTAURANT,
        pub: FOURSQUARE_CATEGORIES.LOUNGE,
        park: FOURSQUARE_CATEGORIES.PARK,
    };

    return filters.types
        .map(type => categoryMap[type])
        .filter(Boolean)
        .join(',');
}
