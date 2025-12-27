/**
 * User Feedback & Analytics Service
 * Tracks venue selections to improve recommendations over time
 */

import { Venue } from '@/services/hybridVenues';
import { supabase } from '@/utils/supabase';

/**
 * Track when a user selects a venue
 */
export async function trackVenueSelection(venue: Venue): Promise<void> {
    try {
        await supabase.from('venue_selections').insert({
            venue_id: venue.id,
            venue_name: venue.name,
            venue_type: venue.tags.amenity || venue.tags.leisure || 'unknown',
            final_score: venue.score,
            ai_recommended: venue.aiRecommended || false,
        });
    } catch (error) {
        // Silent fail - analytics shouldn't break the app
        console.log('Analytics: selection tracking skipped', error);
    }
}

/**
 * Track when a user confirms a date
 */
export async function trackDateConfirmation(venue: Venue): Promise<void> {
    try {
        await supabase.from('venue_selections').insert({
            venue_id: venue.id,
            venue_name: venue.name,
            venue_type: venue.tags.amenity || venue.tags.leisure || 'unknown',
            final_score: venue.score,
            ai_recommended: venue.aiRecommended || false,
            confirmed: true,
        });
    } catch (error) {
        console.log('Analytics: confirmation tracking skipped', error);
    }
}

/**
 * Get popularity boost for a venue based on past selections
 * Returns 0-15 bonus points
 */
export async function getPopularityBoost(venueId: string): Promise<number> {
    try {
        const { count } = await supabase
            .from('venue_selections')
            .select('*', { count: 'exact', head: true })
            .eq('venue_id', venueId);

        if (!count) return 0;

        // Tiered boost based on selection count
        if (count >= 20) return 15;  // Very popular
        if (count >= 10) return 10;  // Popular
        if (count >= 5) return 5;    // Notable
        if (count >= 2) return 2;    // Picked before
        return 0;
    } catch {
        return 0;
    }
}

/**
 * Get top venues by selection count (for "popular this week" feature)
 */
export async function getPopularVenues(limit: number = 10): Promise<{ venue_name: string; count: number }[]> {
    try {
        const { data } = await supabase
            .from('venue_selections')
            .select('venue_name')
            .gte('selected_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
            .limit(500);

        if (!data) return [];

        // Count occurrences
        const counts: Record<string, number> = {};
        for (const row of data) {
            counts[row.venue_name] = (counts[row.venue_name] || 0) + 1;
        }

        // Sort by count
        return Object.entries(counts)
            .map(([venue_name, count]) => ({ venue_name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);
    } catch {
        return [];
    }
}
