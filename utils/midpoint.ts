export interface Coordinates {
    latitude: number;
    longitude: number;
}

export interface MidpointOptions {
    mode: 'midpoint' | 'closer_to_me' | 'closer_to_them';
    myLocation: Coordinates;
    theirLocation: Coordinates;
}

/**
 * Calculate the geographic midpoint between two locations
 */
export function calculateMidpoint(
    location1: Coordinates,
    location2: Coordinates
): Coordinates {
    const lat1 = (location1.latitude * Math.PI) / 180;
    const lat2 = (location2.latitude * Math.PI) / 180;
    const lon1 = (location1.longitude * Math.PI) / 180;
    const lon2 = (location2.longitude * Math.PI) / 180;

    const dLon = lon2 - lon1;

    const Bx = Math.cos(lat2) * Math.cos(dLon);
    const By = Math.cos(lat2) * Math.sin(dLon);

    const lat3 = Math.atan2(
        Math.sin(lat1) + Math.sin(lat2),
        Math.sqrt((Math.cos(lat1) + Bx) * (Math.cos(lat1) + Bx) + By * By)
    );

    const lon3 = lon1 + Math.atan2(By, Math.cos(lat1) + Bx);

    return {
        latitude: (lat3 * 180) / Math.PI,
        longitude: (lon3 * 180) / Math.PI,
    };
}

/**
 * Calculate search location based on mode
 */
export function calculateSearchLocation(options: MidpointOptions): Coordinates {
    const { mode, myLocation, theirLocation } = options;

    switch (mode) {
        case 'midpoint':
            return calculateMidpoint(myLocation, theirLocation);

        case 'closer_to_me':
            // 70% towards me, 30% towards them
            return {
                latitude: myLocation.latitude * 0.7 + theirLocation.latitude * 0.3,
                longitude: myLocation.longitude * 0.7 + theirLocation.longitude * 0.3,
            };

        case 'closer_to_them':
            // 30% towards me, 70% towards them
            return {
                latitude: myLocation.latitude * 0.3 + theirLocation.latitude * 0.7,
                longitude: myLocation.longitude * 0.3 + theirLocation.longitude * 0.7,
            };

        default:
            return calculateMidpoint(myLocation, theirLocation);
    }
}

/**
 * Calculate distance between two coordinates in kilometers
 */
export function calculateDistance(
    location1: Coordinates,
    location2: Coordinates
): number {
    const R = 6371; // Earth's radius in km
    const dLat = ((location2.latitude - location1.latitude) * Math.PI) / 180;
    const dLon = ((location2.longitude - location1.longitude) * Math.PI) / 180;

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((location1.latitude * Math.PI) / 180) *
        Math.cos((location2.latitude * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Format distance for display
 */
export function formatDistance(km: number): string {
    if (km < 1) {
        return `${Math.round(km * 1000)}m`;
    }
    return `${km.toFixed(1)}km`;
}
