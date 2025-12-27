/**
 * Deep Link Utilities
 * For generating shareable venue links
 * 100% Free - uses expo-linking
 */

import { Venue } from '@/services/hybridVenues';
import * as Linking from 'expo-linking';

const APP_SCHEME = 'meetpointprotocol';

/**
 * Generate a shareable deep link for a venue
 */
export function generateVenueLink(venue: Venue): string {
    const params = new URLSearchParams({
        id: venue.id,
        name: venue.name,
        lat: venue.latitude.toString(),
        lng: venue.longitude.toString(),
    });

    return `${APP_SCHEME}://venue?${params.toString()}`;
}

/**
 * Generate a shareable invite link with date details
 */
export function generateInviteLink(venue: Venue, dateTime?: Date): string {
    const params = new URLSearchParams({
        id: venue.id,
        name: venue.name,
        lat: venue.latitude.toString(),
        lng: venue.longitude.toString(),
    });

    if (dateTime) {
        params.set('time', dateTime.toISOString());
    }

    return `${APP_SCHEME}://invite?${params.toString()}`;
}

/**
 * Generate a web fallback link (Google Maps)
 */
export function generateMapsLink(venue: Venue): string {
    return `https://www.google.com/maps/search/?api=1&query=${venue.latitude},${venue.longitude}`;
}

/**
 * Parse a venue from a deep link URL
 */
export function parseVenueFromLink(url: string): Partial<Venue> | null {
    try {
        const parsed = Linking.parse(url);

        if (!parsed.queryParams) return null;

        const { id, name, lat, lng } = parsed.queryParams as Record<string, string>;

        if (!id || !name || !lat || !lng) return null;

        return {
            id,
            name,
            latitude: parseFloat(lat),
            longitude: parseFloat(lng),
            tags: {},
            score: 0,
        };
    } catch {
        return null;
    }
}

/**
 * Create a share message with venue details
 */
export function createShareMessage(venue: Venue, dateTime?: Date): string {
    const mapsLink = generateMapsLink(venue);

    let message = `Let's meet at ${venue.name}! 📍\n\n`;

    if (dateTime) {
        message += `📅 ${dateTime.toLocaleDateString()} at ${dateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\n`;
    }

    message += `📍 ${mapsLink}\n\n`;
    message += `Sent via MeetPoint Protocol ✨`;

    return message;
}

/**
 * Get the initial URL if app was opened via deep link
 */
export async function getInitialURL(): Promise<string | null> {
    const url = await Linking.getInitialURL();
    return url;
}

/**
 * Listen for incoming deep links
 */
export function addLinkListener(callback: (url: string) => void) {
    const subscription = Linking.addEventListener('url', (event) => {
        callback(event.url);
    });
    return subscription;
}
