export interface VenueScoreInput {
    tags: Record<string, string>;
    distance?: number;
    latitude?: number;
    longitude?: number;
}

export const SCORE_WEIGHTS = {
    DISTANCE: 25,
    POPULARITY: 20,
    AMENITIES: 20,
    TIME: 15,
    EXISTING: 20,
};

/**
 * Calculate distance-based score (0-25 points)
 */
function calculateDistanceScore(distance?: number): number {
    if (!distance) return 5; // Default if distance not provided

    if (distance < 0.5) return 25;  // Within 500m
    if (distance < 1) return 20;    // 500m - 1km
    if (distance < 2) return 15;    // 1km - 2km
    if (distance < 5) return 10;    // 2km - 5km
    return 5;                       // 5km+
}

/**
 * Calculate popularity score from OSM tags (0-20 points)
 */
function calculatePopularityScore(tags: Record<string, string>): number {
    let score = 0;

    // Notable/documented places
    if (tags.wikidata) score += 10;
    if (tags.wikipedia) score += 8;
    if (tags.brand) score += 5;

    // Cuisine variety (more cuisines = more popular/versatile)
    const cuisines = tags.cuisine?.split(';') || [];
    score += Math.min(cuisines.length * 3, 9);

    return Math.min(score, 20);
}

/**
 * Calculate amenities score (0-20 points)
 */
function calculateAmenitiesScore(tags: Record<string, string>): number {
    let score = 0;

    if (tags.outdoor_seating === 'yes') score += 5;
    if (tags.internet_access?.includes('wifi') || tags.internet_access === 'wlan') score += 3;
    if (tags.wheelchair === 'yes') score += 5;
    if (tags['payment:cards'] === 'yes' || tags['payment:credit_cards'] === 'yes') score += 3;
    if (tags.reservation === 'yes' || tags.reservation === 'required') score += 4;

    return Math.min(score, 20);
}

/**
 * Check if venue is currently open (simplified - real implementation needs opening_hours parser)
 */
function calculateTimeScore(tags: Record<string, string>): number {
    const openingHours = tags.opening_hours;
    if (!openingHours) return 0;

    // Simple heuristics (real implementation would parse opening_hours)
    if (openingHours === '24/7') return 15;
    if (openingHours.includes('Mo-Su')) return 12; // Open all week
    if (openingHours.toLowerCase().includes('closed')) return 0;

    // Default: assume open if has hours
    return 10;
}

/**
 * Score a venue based on its OSM tags, distance, and selected vibe filters
 * @param tags - OSM node tags
 * @param distance - Distance from search location in km
 * @param vibes - Selected vibe filters (aesthetic, cozy, upscale, casual)
 * @returns Score from 0-100
 */
export function scoreVenue(
    tags: Record<string, string>,
    vibes?: ('aesthetic' | 'cozy' | 'upscale' | 'casual')[],
    distance?: number
): number {
    let score = 0;

    // 1. Distance Score (0-25 points)
    score += calculateDistanceScore(distance);

    // 2. Popularity Score (0-20 points)
    score += calculatePopularityScore(tags);

    // 3. Amenities Score (0-20 points)
    score += calculateAmenitiesScore(tags);

    // 4. Time Score (0-15 points)
    score += calculateTimeScore(tags);

    // 5. Existing Factors (0-20 points)
    if (tags.opening_hours) score += 10;
    if (tags.website || tags['contact:website']) score += 10;

    // 6. Vibe-based scoring (bonus/penalty)
    const name = tags.name?.toLowerCase() || '';
    const description = tags.description?.toLowerCase() || '';
    const searchText = `${name} ${description}`;

    const aestheticKeywords = ['roastery', 'garden', 'lounge', 'roof', 'art', 'gallery', 'studio', 'atelier'];
    const cozyKeywords = ['cozy', 'cottage', 'nook', 'hideaway', 'corner', 'den'];
    const upscaleKeywords = ['fine', 'gourmet', 'bistro', 'wine', 'speakeasy', 'club'];
    const casualKeywords = ['cafe', 'diner', 'pub', 'tavern', 'grill', 'spot'];

    if (vibes && vibes.length > 0) {
        let vibeMatch = false;

        if (vibes.includes('aesthetic') && aestheticKeywords.some(kw => searchText.includes(kw))) {
            score += 10;
            vibeMatch = true;
        }
        if (vibes.includes('cozy') && cozyKeywords.some(kw => searchText.includes(kw))) {
            score += 10;
            vibeMatch = true;
        }
        if (vibes.includes('upscale') && upscaleKeywords.some(kw => searchText.includes(kw))) {
            score += 10;
            vibeMatch = true;
        }
        if (vibes.includes('casual') && casualKeywords.some(kw => searchText.includes(kw))) {
            score += 10;
            vibeMatch = true;
        }

        // Penalty for not matching any selected vibes
        if (!vibeMatch) {
            score -= 10;
        }
    } else {
        // No vibe filter - give base boost for any vibe keyword
        const allVibeKeywords = [...aestheticKeywords, ...cozyKeywords, ...upscaleKeywords];
        if (allVibeKeywords.some(kw => searchText.includes(kw))) {
            score += 5;
        }
    }

    // Ensure score is between 0-100
    return Math.max(0, Math.min(100, score));
}
