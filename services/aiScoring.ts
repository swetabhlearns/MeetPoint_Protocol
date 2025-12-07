import { supabase } from '@/utils/supabase';
import { analyzeVenueWithAI, VenueAIProfile, calculateAIBoost } from './gemini';
import { Venue } from './overpass';

/**
 * Get AI profile from cache or analyze with Gemini
 */
export async function getOrAnalyzeVenue(
    venueName: string,
    venueType: string,
    cuisine?: string
): Promise<VenueAIProfile | null> {
    try {
        const { data, error } = await supabase
            .from('venue_ai_profiles')
            .select('*')
            .eq('venue_name', venueName)
            .single();

        if (data && !error) {
            return {
                romantic: data.romantic,
                casual: data.casual,
                upscale: data.upscale,
                energetic: data.energetic,
                dateWorthy: data.date_worthy,
            };
        }

        const profile = await analyzeVenueWithAI(venueName, venueType, cuisine);

        if (profile) {
            await supabase
                .from('venue_ai_profiles')
                .upsert({
                    venue_name: venueName,
                    romantic: profile.romantic,
                    casual: profile.casual,
                    upscale: profile.upscale,
                    energetic: profile.energetic,
                    date_worthy: profile.dateWorthy,
                    venue_type: venueType,
                    cuisine: cuisine || null,
                });
        }

        return profile;
    } catch (error) {
        console.error('Error getting/analyzing venue:', error);
        return null;
    }
}

/**
 * Enhance venue scores with AI analysis
 */
export async function enhanceVenuesWithAI(
    venues: Venue[],
    userPreferences?: {
        romantic?: boolean;
        casual?: boolean;
        upscale?: boolean;
        energetic?: boolean;
    }
): Promise<Venue[]> {
    const topVenues = venues.slice(0, 20);
    const remainingVenues = venues.slice(20);

    const enhancedTop = await Promise.all(
        topVenues.map(async (venue) => {
            const profile = await getOrAnalyzeVenue(
                venue.name,
                venue.tags.amenity || venue.tags.leisure || 'venue',
                venue.tags.cuisine
            );

            if (profile) {
                const aiBoost = calculateAIBoost(profile, userPreferences);
                return {
                    ...venue,
                    score: venue.score + aiBoost,
                    aiRecommended: aiBoost >= 10, // Mark as AI-recommended if boost >= 10
                    aiProfile: profile,
                };
            }

            return venue;
        })
    );

    const allVenues = [...enhancedTop, ...remainingVenues];
    allVenues.sort((a, b) => b.score - a.score);

    return allVenues;
}
