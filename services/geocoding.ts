/**
 * Geocode an address to coordinates using Nominatim (OpenStreetMap)
 */
export interface GeocodingResult {
    latitude: number;
    longitude: number;
    displayName: string;
}

export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
    try {
        const encodedAddress = encodeURIComponent(address);
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=1`,
            {
                headers: {
                    'User-Agent': 'MeetPoint_Protocol/1.0',
                },
            }
        );

        const data = await response.json();

        if (data && data.length > 0) {
            return {
                latitude: parseFloat(data[0].lat),
                longitude: parseFloat(data[0].lon),
                displayName: data[0].display_name,
            };
        }

        return null;
    } catch (error) {
        console.error('Geocoding error:', error);
        return null;
    }
}

/**
 * Reverse geocode coordinates to an address
 */
export async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
            {
                headers: {
                    'User-Agent': 'MeetPoint_Protocol/1.0',
                },
            }
        );

        const data = await response.json();

        if (data && data.display_name) {
            return data.display_name;
        }

        return null;
    } catch (error) {
        console.error('Reverse geocoding error:', error);
        return null;
    }
}
