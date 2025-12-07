import Groq from 'groq-sdk';

const groq = new Groq({
    apiKey: process.env.EXPO_PUBLIC_GROQ_API_KEY || '',
});

export interface VenueAIProfile {
    romantic: number;      // 0-10: How romantic/intimate
    casual: number;        // 0-10: How casual/relaxed
    upscale: number;       // 0-10: How fancy/upscale
    energetic: number;     // 0-10: How lively/energetic
    dateWorthy: number;    // 0-10: Overall date suitability
}

export interface WebVenue {
    name: string;
    address: string;
    type: string;
    description: string;
    latitude?: number;
    longitude?: number;
}

/**
 * Search the web for best date venues using Groq AI
 */
export async function searchVenuesWithAI(
    location1: string,
    location2: string,
    midpoint: { latitude: number; longitude: number },
    filters?: {
        types?: string[];
        diet?: string;
        vibe?: string[];
    }
): Promise<WebVenue[]> {
    try {
        console.log(`🔍 AI searching for venues between ${location1} and ${location2}`);

        const filterText = filters ? `
Preferences:
- Types: ${filters.types?.join(', ') || 'any'}
- Diet: ${filters.diet || 'any'}
- Vibe: ${filters.vibe?.join(', ') || 'any'}` : '';

        const prompt = `You are a local dating expert. Find the BEST date venues between these two locations:

Location 1: ${location1}
Location 2: ${location2}
Midpoint: ${midpoint.latitude}, ${midpoint.longitude}
${filterText}

Find 10-15 highly-rated, popular date venues (cafes, restaurants, bars, parks) that are:
1. Actually between or near these locations
2. Well-reviewed and popular
3. Good for dates (romantic, nice ambiance)
4. Currently operating

Return ONLY a JSON array of venues with this exact format:
[
  {
    "name": "Venue Name",
    "address": "Full address",
    "type": "cafe/restaurant/bar/park",
    "description": "Brief description (1 sentence)",
    "latitude": 23.123,
    "longitude": 85.456
  }
]

Be accurate with coordinates. Return ONLY the JSON array, no other text.`;

        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            model: 'llama-3.1-8b-instant',
            temperature: 0.5,
            max_tokens: 1500,
        });

        const responseText = completion.choices[0]?.message?.content;

        if (!responseText) {
            console.error('No response from Groq web search');
            return [];
        }

        const cleanResponse = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const venues = JSON.parse(cleanResponse);

        if (Array.isArray(venues)) {
            console.log(`✅ AI found ${venues.length} web venues`);
            return venues;
        }

        console.error('Invalid venue array from AI');
        return [];
    } catch (error) {
        console.error('AI web search failed:', error);
        return [];
    }
}

/**
 * Analyze a venue using Groq (LLaMA 3.1 8B) for semantic understanding
 * Free tier: 14,400 requests/day - perfect for hobby projects!
 */
export async function analyzeVenueWithAI(
    venueName: string,
    venueType: string,
    cuisine?: string,
    description?: string
): Promise<VenueAIProfile | null> {
    try {
        console.log(`🤖 Analyzing venue: ${venueName}`);

        const prompt = `You are a dating venue expert. Analyze this venue for a date:

Name: ${venueName}
Type: ${venueType}
Cuisine: ${cuisine || 'Not specified'}
Description: ${description || 'Not available'}

Rate this venue on these dimensions (0-10 scale):
- romantic: How romantic/intimate is this venue?
- casual: How casual/relaxed is the atmosphere?
- upscale: How fancy/upscale is it?
- energetic: How lively/energetic?
- dateWorthy: Overall suitability for a date (0-10)

Return ONLY valid JSON, no markdown:
{"romantic": X, "casual": X, "upscale": X, "energetic": X, "dateWorthy": X}`;

        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            model: 'llama-3.1-8b-instant', // Fast, free, 14,400 req/day
            temperature: 0.3,
            max_tokens: 150,
        });

        const responseText = completion.choices[0]?.message?.content;

        if (!responseText) {
            console.error('No response from Groq');
            return null;
        }

        const cleanResponse = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const profile = JSON.parse(cleanResponse);

        // Validate scores
        if (
            profile.romantic >= 0 && profile.romantic <= 10 &&
            profile.casual >= 0 && profile.casual <= 10 &&
            profile.upscale >= 0 && profile.upscale <= 10 &&
            profile.energetic >= 0 && profile.energetic <= 10 &&
            profile.dateWorthy >= 0 && profile.dateWorthy <= 10
        ) {
            console.log(`✅ AI analyzed ${venueName}: dateWorthy=${profile.dateWorthy}`);
            return profile;
        }

        console.error('Invalid AI profile scores:', profile);
        return null;
    } catch (error) {
        console.error('Groq AI analysis failed:', error);
        return null;
    }
}

/**
 * Calculate AI-enhanced score boost
 */
export function calculateAIBoost(
    profile: VenueAIProfile,
    userPreferences?: {
        romantic?: boolean;
        casual?: boolean;
        upscale?: boolean;
        energetic?: boolean;
    }
): number {
    let boost = 0;

    // Base boost from date-worthiness
    boost += profile.dateWorthy * 1;

    // Preference-based bonuses
    if (userPreferences) {
        if (userPreferences.romantic && profile.romantic >= 7) boost += 5;
        if (userPreferences.casual && profile.casual >= 7) boost += 3;
        if (userPreferences.upscale && profile.upscale >= 7) boost += 5;
        if (userPreferences.energetic && profile.energetic >= 7) boost += 3;
    }

    // Cap at +20 points
    return Math.min(boost, 20);
}
