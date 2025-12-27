/**
 * Routing Service
 * Uses Ola Maps Directions API to get route between two locations
 */

export interface RouteInfo {
    polyline: string;  // Encoded polyline
    distance: number;  // meters
    duration: number;  // seconds
    points: Coordinates[];  // Decoded waypoints
}

export interface Coordinates {
    latitude: number;
    longitude: number;
}

/**
 * Get route between two locations using Ola Maps Directions API
 */
export async function getRouteBetweenLocations(
    origin: Coordinates,
    destination: Coordinates
): Promise<RouteInfo | null> {
    try {
        const apiKey = process.env.EXPO_PUBLIC_OLA_MAPS_API_KEY;
        if (!apiKey) {
            console.error('Ola Maps API key not found');
            return null;
        }

        console.log(`🛣️ Getting route from ${origin.latitude},${origin.longitude} to ${destination.latitude},${destination.longitude}`);

        // Ola Maps Directions Basic API - uses query params
        const url = `https://api.olamaps.io/routing/v1/directions/basic?` +
            `origin=${origin.latitude},${origin.longitude}&` +
            `destination=${destination.latitude},${destination.longitude}&` +
            `api_key=${apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'X-Request-Id': `route-${Date.now()}`
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Routing API error:', response.status, errorText);
            return null;
        }

        const data = await response.json();

        if (!data.routes || data.routes.length === 0) {
            console.log('No routes found');
            return null;
        }

        const route = data.routes[0];
        const leg = route.legs?.[0];

        if (!leg) {
            return null;
        }

        // Get encoded polyline (may not be present in basic API)
        const encodedPolyline = route.overview_polyline?.points ||
            leg.polyline?.encodedPolyline ||
            route.polyline?.encodedPolyline ||
            '';

        // Decode polyline or generate interpolated points
        let points: Coordinates[];
        if (encodedPolyline && encodedPolyline.length > 0) {
            points = decodePolyline(encodedPolyline);
        } else {
            // Basic API doesn't return polyline - generate 10 interpolated points
            console.log('🔸 No polyline, generating interpolated points');
            points = generateInterpolatedPoints(origin, destination, 10);
        }

        console.log(`✅ Route found: ${leg.distance}m, ${leg.duration}s, ${points.length} points`);

        return {
            polyline: encodedPolyline,
            distance: leg.distance || 0,
            duration: leg.duration || 0,
            points,
        };
    } catch (error) {
        console.error('Routing failed:', error);
        return null;
    }
}

/**
 * Generate evenly-spaced points between two coordinates
 */
function generateInterpolatedPoints(
    start: Coordinates,
    end: Coordinates,
    numPoints: number
): Coordinates[] {
    const points: Coordinates[] = [];

    for (let i = 0; i < numPoints; i++) {
        const t = i / (numPoints - 1);
        points.push({
            latitude: start.latitude + t * (end.latitude - start.latitude),
            longitude: start.longitude + t * (end.longitude - start.longitude),
        });
    }

    return points;
}

/**
 * Decode Google-style encoded polyline string to coordinates
 * https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 */
export function decodePolyline(encoded: string): Coordinates[] {
    const points: Coordinates[] = [];
    let index = 0;
    const len = encoded.length;
    let lat = 0;
    let lng = 0;

    while (index < len) {
        let b: number;
        let shift = 0;
        let result = 0;

        // Decode latitude
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);

        const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
        lat += dlat;

        shift = 0;
        result = 0;

        // Decode longitude
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);

        const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
        lng += dlng;

        points.push({
            latitude: lat / 1e5,
            longitude: lng / 1e5,
        });
    }

    return points;
}

/**
 * Sample evenly-spaced points along a route
 */
export function samplePointsAlongRoute(
    points: Coordinates[],
    numSamples: number = 5
): Coordinates[] {
    if (points.length <= numSamples) {
        return points;
    }

    const samples: Coordinates[] = [];
    const step = (points.length - 1) / (numSamples - 1);

    for (let i = 0; i < numSamples; i++) {
        const index = Math.round(i * step);
        samples.push(points[Math.min(index, points.length - 1)]);
    }

    return samples;
}

/**
 * Calculate minimum distance from a point to a polyline (route)
 */
export function distanceToRoute(
    point: Coordinates,
    routePoints: Coordinates[]
): number {
    let minDistance = Infinity;

    for (const routePoint of routePoints) {
        const dist = haversineDistance(point, routePoint);
        if (dist < minDistance) {
            minDistance = dist;
        }
    }

    return minDistance;
}

/**
 * Haversine distance in meters
 */
function haversineDistance(a: Coordinates, b: Coordinates): number {
    const R = 6371000; // Earth radius in meters
    const dLat = (b.latitude - a.latitude) * Math.PI / 180;
    const dLon = (b.longitude - a.longitude) * Math.PI / 180;

    const lat1 = a.latitude * Math.PI / 180;
    const lat2 = b.latitude * Math.PI / 180;

    const sin1 = Math.sin(dLat / 2);
    const sin2 = Math.sin(dLon / 2);

    const h = sin1 * sin1 + Math.cos(lat1) * Math.cos(lat2) * sin2 * sin2;
    return 2 * R * Math.asin(Math.sqrt(h));
}
