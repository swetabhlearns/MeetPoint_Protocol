/**
 * AI Curation Service
 * Hybrid mode: First curates existing venues, then discovers new venues progressively
 */

import Groq from 'groq-sdk';
import { Venue } from './hybridVenues';

const groq = new Groq({
    apiKey: process.env.EXPO_PUBLIC_GROQ_API_KEY || '',
});

export interface AICuratedResult {
    venues: Venue[];
    aiInsight: string;
    curationType: 'romantic' | 'casual' | 'adventurous' | 'budget' | 'premium';
    isLoadingMore?: boolean;
}

/**
 * Hybrid AI Curation
 * 1. Instantly curates top 5 from existing venues
 * 2. In background, discovers new venues and adds them progressively
 */
export async function hybridCurateVenues(
    existingVenues: Venue[],
    userQuery: string,
    location: { latitude: number; longitude: number },
    locationName: string,
    context?: {
        weather?: { isRaining: boolean; temperature: number };
        timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
    },
    onVenueDiscovered?: (venue: Venue) => void,
    onDiscoveryComplete?: () => void
): Promise<AICuratedResult> {
    // PHASE 1: Instantly curate existing venues
    const curatedResult = await curateVenuesWithAI(existingVenues, userQuery, context);

    // PHASE 2: Discover new venues in background (fire and forget)
    discoverNewVenues(userQuery, location, locationName, context, onVenueDiscovered, onDiscoveryComplete);

    return {
        ...curatedResult,
        isLoadingMore: true,
    };
}

/**
 * Curate existing venues - picks top 5 matching the query
 */
export async function curateVenuesWithAI(
    venues: Venue[],
    userQuery: string,
    context?: {
        weather?: { isRaining: boolean; temperature: number };
        timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
    }
): Promise<AICuratedResult> {
    try {
        if (!process.env.EXPO_PUBLIC_GROQ_API_KEY) {
            throw new Error('AI not available');
        }

        console.log(`🤖 AI curating ${venues.length} venues based on: "${userQuery}"`);

        // Prepare venue summaries for AI
        const venueSummaries = venues.slice(0, 30).map((v, i) => ({
            index: i,
            name: v.name,
            type: v.tags.amenity || v.tags.leisure || 'venue',
            rating: v.tags.rating || 'unknown',
            distance: v.tags.distance || 'unknown',
            score: v.score,
        }));

        const contextInfo = context ? `
Current conditions:
- Weather: ${context.weather?.isRaining ? 'Raining' : 'Clear'}, ${context.weather?.temperature}°C
- Time: ${context.timeOfDay || 'unknown'}
` : '';

        const prompt = `You are an expert date planner in India.

User's request: "${userQuery}"
${contextInfo}

Available venues:
${JSON.stringify(venueSummaries, null, 2)}

Pick TOP 5 venues matching the request. Return ONLY JSON:
{
  "selectedIndices": [0, 5, 12, 3, 8],
  "insight": "Brief explanation of picks",
  "curationType": "romantic"
}

curationType options: romantic, casual, adventurous, budget, premium`;

        const completion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.4,
            max_tokens: 300,
        });

        const responseText = completion.choices[0]?.message?.content;
        if (!responseText) throw new Error('No AI response');

        // Extract JSON object from response (handles extra text around it)
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON found in response');

        const result = JSON.parse(jsonMatch[0]);

        const selectedIndices: number[] = result.selectedIndices || [];
        const curatedVenues: Venue[] = selectedIndices
            .filter(i => i >= 0 && i < venues.length)
            .map(i => ({
                ...venues[i],
                aiRecommended: true,
                score: Math.min(venues[i].score + 20, 100),
            }));

        console.log(`✅ AI selected ${curatedVenues.length} venues`);

        return {
            venues: curatedVenues,
            aiInsight: result.insight || 'Here are my top picks for your date!',
            curationType: result.curationType || 'romantic',
        };
    } catch (error) {
        console.error('AI curation failed:', error);

        return {
            venues: venues.slice(0, 5).map(v => ({ ...v, aiRecommended: false })),
            aiInsight: 'Here are the top-rated venues in your area.',
            curationType: 'romantic',
        };
    }
}

/**
 * Discover NEW venues via AI and call callback for each one
 */
async function discoverNewVenues(
    userQuery: string,
    location: { latitude: number; longitude: number },
    locationName: string,
    context?: {
        weather?: { isRaining: boolean; temperature: number };
        timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
    },
    onVenueDiscovered?: (venue: Venue) => void,
    onDiscoveryComplete?: () => void
): Promise<void> {
    try {
        if (!process.env.EXPO_PUBLIC_GROQ_API_KEY) {
            onDiscoveryComplete?.();
            return;
        }

        console.log(`🔍 AI discovering new venues for: "${userQuery}"`);

        const contextInfo = context ? `
Weather: ${context.weather?.isRaining ? 'Raining (prefer indoor)' : 'Clear'}
Temperature: ${context.weather?.temperature}°C
Time: ${context.timeOfDay}` : '';

        const prompt = `You are a local expert in ${locationName}, India. 
A user wants: "${userQuery}"
${contextInfo}

Suggest 5 REAL, specific venue names in ${locationName} that match this request.
Must be actual cafes, restaurants, bars, or parks that exist.

Return ONLY a JSON array:
[
  {
    "name": "Exact Venue Name",
    "type": "cafe/restaurant/bar/park",
    "description": "Why it matches (1 sentence)",
    "area": "Neighborhood"
  }
]`;

        const completion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.6,
            max_tokens: 500,
        });

        const responseText = completion.choices[0]?.message?.content;
        if (!responseText) {
            onDiscoveryComplete?.();
            return;
        }

        // Extract JSON array from response (handles extra text around it)
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            console.log('No JSON array found in AI response');
            onDiscoveryComplete?.();
            return;
        }

        let suggestedVenues;
        try {
            suggestedVenues = JSON.parse(jsonMatch[0]);
        } catch (parseError) {
            console.log('Failed to parse AI JSON:', parseError);
            onDiscoveryComplete?.();
            return;
        }

        if (!Array.isArray(suggestedVenues)) {
            onDiscoveryComplete?.();
            return;
        }

        console.log(`✨ AI discovered ${suggestedVenues.length} new venues`);

        // Progressive loading with delay
        for (let i = 0; i < suggestedVenues.length; i++) {
            const suggested = suggestedVenues[i];

            await new Promise(resolve => setTimeout(resolve, 400));

            const newVenue: Venue = {
                id: `ai-discovered-${Date.now()}-${i}`,
                name: suggested.name,
                latitude: location.latitude + (Math.random() - 0.5) * 0.02,
                longitude: location.longitude + (Math.random() - 0.5) * 0.02,
                tags: {
                    name: suggested.name,
                    amenity: suggested.type,
                    description: suggested.description,
                    'addr:full': suggested.area || locationName,
                    ai_discovered: 'yes',
                },
                score: 80 + Math.floor(Math.random() * 15),
                aiRecommended: true,
            };

            console.log(`✨ Discovered: ${newVenue.name}`);
            onVenueDiscovered?.(newVenue);
        }

        onDiscoveryComplete?.();
    } catch (error) {
        console.error('AI venue discovery failed:', error);
        onDiscoveryComplete?.();
    }
}
