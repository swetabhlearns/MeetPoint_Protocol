import { scoreVenue } from '@/utils/ScoreVenue';

export interface OverpassElement {
    id: number;
    lat: number;
    lon: number;
    tags?: Record<string, string>;
    type?: string;
}

export interface Venue {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    tags: Record<string, string>;
    score: number;
    aiRecommended?: boolean; // Flag for AI-boosted venues
}

const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';

export interface VenueFilters {
    types?: ('cafe' | 'bar' | 'restaurant' | 'pub' | 'park')[];
    diet?: 'any' | 'vegetarian' | 'vegan';
    vibe?: ('aesthetic' | 'cozy' | 'upscale' | 'casual')[];
}

export async function fetchVenuesInBoundingBox(
    minLat: number,
    minLon: number,
    maxLat: number,
    maxLon: number,
    filters?: VenueFilters
): Promise<Venue[]> {
    const bbox = `${minLat},${minLon},${maxLat},${maxLon}`;

    // Calculate center point for distance calculations
    const centerLat = (minLat + maxLat) / 2;
    const centerLon = (minLon + maxLon) / 2;

    // Build amenity filter based on selected types
    let amenityFilter = '';
    if (filters?.types && filters.types.length > 0) {
        const amenities = filters.types.map(t => {
            if (t === 'park') {
                return `node["leisure"="park"](${bbox});`;
            }
            return `node["amenity"="${t}"](${bbox});`;
        }).join('\n    ');
        amenityFilter = amenities;
    } else {
        // Default: all venue types
        amenityFilter = `
    node["amenity"="cafe"](${bbox});
    node["amenity"="bar"](${bbox});
    node["amenity"="restaurant"](${bbox});
    node["amenity"="pub"](${bbox});
    node["leisure"="park"](${bbox});
    node["leisure"="garden"](${bbox});`;
    }

    const query = `
  [out:json][timeout:10];
  (
    ${amenityFilter}
  );
  out body;
  >;
  out skel qt;
  `;

    try {
        const response = await fetch(OVERPASS_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `data=${encodeURIComponent(query)}`,
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Overpass API Error:', response.status, errorText);
            throw new Error(`Overpass API Error: ${response.status} - ${errorText.substring(0, 100)}`);
        }

        const data = await response.json();
        const venues: Venue[] = [];

        if (data.elements) {
            for (const el of data.elements) {
                if (el.type === 'node' && el.tags && el.tags.name) {
                    // Apply diet filter
                    if (filters?.diet && filters.diet !== 'any') {
                        const isVegan = el.tags['diet:vegan'] === 'yes' || el.tags['diet:vegan'] === 'only';
                        const isVegetarian = isVegan || el.tags['diet:vegetarian'] === 'yes' || el.tags['diet:vegetarian'] === 'only';

                        if (filters.diet === 'vegan' && !isVegan) {
                            continue;
                        }
                        if (filters.diet === 'vegetarian' && !isVegetarian) {
                            continue;
                        }
                    }

                    // Calculate distance from center point (in km)
                    const distance = calculateDistance(
                        centerLat,
                        centerLon,
                        el.lat,
                        el.lon
                    );

                    const score = scoreVenue(el.tags, filters?.vibe, distance);
                    venues.push({
                        id: el.id.toString(),
                        name: el.tags.name,
                        latitude: el.lat,
                        longitude: el.lon,
                        tags: el.tags,
                        score,
                    });
                }
            }
        }

        // Sort by score (highest first)
        venues.sort((a, b) => b.score - a.score);

        return venues;
    } catch (error) {
        console.error('Failed to fetch venues from Overpass:', error);
        return [];
    }
}

/**
 * Calculate distance between two points using Haversine formula
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
