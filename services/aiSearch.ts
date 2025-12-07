import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.EXPO_PUBLIC_GROQ_API_KEY, dangerouslyAllowBrowser: true });

export interface AISearchResult {
    theirLocationName: string | null;
    venueTypes: ('cafe' | 'bar' | 'restaurant' | 'pub' | 'park')[];
    vibe: ('aesthetic' | 'cozy' | 'upscale' | 'casual')[];
    diet: 'any' | 'vegetarian' | 'vegan';
    searchMode: 'midpoint' | 'closer_to_me' | 'closer_to_them';
}

/**
 * Parses a natural language query into structured search parameters using LLaMA 3.1
 */
export async function parseNaturalLanguageQuery(query: string): Promise<AISearchResult | null> {
    try {
        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are an AI search parser for a meetup app. Extract parameters from the user's natural language query.
          
          OUTPUT FORMAT (JSON only):
          {
            "theirLocationName": string | null, // e.g., "Lalpur, Ranchi". If user says "near me" or doesn't mention a second location, return null.
            "venueTypes": string[], // Allowed: ["cafe", "bar", "restaurant", "pub", "park"]
            "vibe": string[], // Allowed: ["aesthetic", "cozy", "upscale", "casual"]
            "diet": string, // Allowed: "any", "vegetarian", "vegan"
            "searchMode": string // Allowed: "midpoint", "closer_to_me", "closer_to_them". Default "midpoint".
          }

          EXAMPLES:
          Input: "Find a romantic cafe between here and Lalpur for vegans"
          Output: { "theirLocationName": "Lalpur", "venueTypes": ["cafe"], "vibe": ["aesthetic", "cozy"], "diet": "vegan", "searchMode": "midpoint" }

          Input: "Casual pub near my location"
          Output: { "theirLocationName": null, "venueTypes": ["pub"], "vibe": ["casual"], "diet": "any", "searchMode": "closer_to_me" }
          `
                },
                {
                    role: "user",
                    content: query
                }
            ],
            model: "llama-3.3-70b-versatile", // Using 70b for better reasoning
            temperature: 0.1, // Deterministic
            response_format: { type: "json_object" }
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) return null;

        const result = JSON.parse(content) as AISearchResult;
        return result;

    } catch (error) {
        console.error("AI Parsing Error:", error);
        return null;
    }
}
