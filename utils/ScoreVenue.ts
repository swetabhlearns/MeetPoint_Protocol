/**
 * MeetPoint Protocol - Venue Scoring Algorithm v2
 * Enhanced with smooth decay, weather awareness, and date-friendly scoring
 */

export interface VenueScoreInput {
    tags: Record<string, string>;
    distance?: number;
    latitude?: number;
    longitude?: number;
}

// Configurable weights - tune these based on user feedback
export const SCORE_WEIGHTS = {
    DISTANCE: 15,      // Reduced from 25
    POPULARITY: 15,
    AMENITIES: 15,
    TIME: 10,          // Reduced from 15
    PURPOSE: 20,       // Renamed from DATE_FRIENDLY, increased from 15
    EXISTING: 5,       // Reduced from 10
    VIBE: 20,          // Increased from 10 - filters matter more!
} as const;

// Date-friendly keywords with point values
const DATE_FRIENDLY_KEYWORDS: Record<string, number> = {
    // Romantic ambiance
    'romantic': 8,
    'candlelight': 6,
    'candle': 5,
    'intimate': 6,
    'cozy': 5,
    'quiet': 4,

    // Scenic/photo-worthy
    'rooftop': 7,
    'terrace': 6,
    'garden': 5,
    'view': 5,
    'scenic': 5,
    'lakeside': 6,
    'riverside': 6,

    // Premium experience
    'lounge': 5,
    'wine': 5,
    'cocktail': 4,
    'speakeasy': 7,
    'bistro': 5,
    'gourmet': 5,

    // Entertainment
    'live': 4,
    'music': 4,
    'jazz': 5,
    'acoustic': 4,

    // Desserts (ending on sweet note)
    'dessert': 3,
    'patisserie': 4,
    'bakery': 3,
    'chocolate': 3,

    // Indian casual date spots
    'dhaba': 3,
    'chai': 3,
    'kulfi': 2,
    'lassi': 2,
};

/**
 * Calculate distance score with smooth exponential decay
 * Closer venues score exponentially higher
 */
function calculateDistanceScore(distance?: number): number {
    if (!distance || distance <= 0) return 15; // Default for unknown distance

    // Exponential decay: score = max * e^(-decay * distance)
    // At 0km = 25, at 1km ≈ 15, at 2km ≈ 9, at 5km ≈ 2
    const maxScore = SCORE_WEIGHTS.DISTANCE;
    const decayRate = 0.5;

    return Math.round(maxScore * Math.exp(-decayRate * distance));
}

/**
 * Calculate popularity score from OSM tags
 */
function calculatePopularityScore(tags: Record<string, string>): number {
    let score = 0;
    const maxScore = SCORE_WEIGHTS.POPULARITY;

    // Notable/documented places
    if (tags.wikidata) score += 6;
    if (tags.wikipedia) score += 5;
    if (tags.brand) score += 4;

    // Cuisine variety (more cuisines = more popular/versatile)
    const cuisines = tags.cuisine?.split(';') || [];
    score += Math.min(cuisines.length * 2, 6);

    // Social presence
    if (tags.instagram || tags['contact:instagram']) score += 3;
    if (tags.facebook || tags['contact:facebook']) score += 2;

    return Math.min(score, maxScore);
}

/**
 * Calculate amenities score
 */
function calculateAmenitiesScore(tags: Record<string, string>): number {
    let score = 0;
    const maxScore = SCORE_WEIGHTS.AMENITIES;

    if (tags.outdoor_seating === 'yes') score += 4;
    if (tags.internet_access?.includes('wifi') || tags.internet_access === 'wlan') score += 2;
    if (tags.wheelchair === 'yes') score += 3;
    if (tags['payment:cards'] === 'yes' || tags['payment:credit_cards'] === 'yes') score += 2;
    if (tags['payment:upi'] === 'yes') score += 2; // UPI is important in India
    if (tags.reservation === 'yes' || tags.reservation === 'required') score += 3;
    if (tags.air_conditioning === 'yes') score += 2; // Important in hot Indian climate

    return Math.min(score, maxScore);
}

/**
 * Calculate time/availability score
 */
function calculateTimeScore(tags: Record<string, string>): number {
    const openingHours = tags.opening_hours;
    if (!openingHours) return 3; // Small score for unknown (might still be open)

    const maxScore = SCORE_WEIGHTS.TIME;

    // 24/7 venues
    if (openingHours === '24/7') return maxScore;

    // Open all week
    if (openingHours.includes('Mo-Su')) return Math.round(maxScore * 0.9);

    // Closed indicator
    if (openingHours.toLowerCase().includes('closed')) return 0;

    // Has hours (probably open)
    return Math.round(maxScore * 0.7);
}

/**
 * Calculate purpose-based score (not just romantic dates!)
 */
function calculatePurposeScore(tags: Record<string, string>): number {
    let score = 0;
    const maxScore = SCORE_WEIGHTS.PURPOSE;

    // Combine all text sources
    const searchText = [
        tags.name || '',
        tags.description || '',
        tags.cuisine || '',
        tags.amenity || '',
        tags.note || '',
    ].join(' ').toLowerCase();

    // Check for purpose keywords
    for (const [keyword, points] of Object.entries(DATE_FRIENDLY_KEYWORDS)) {
        if (searchText.includes(keyword)) {
            score += points;
        }
    }

    // Bonus for private dining
    if (tags.private_dining === 'yes') score += 5;

    // Bonus for vegetarian-friendly (common requirement in India)
    if (tags['diet:vegetarian'] === 'yes' || tags['diet:vegetarian'] === 'only') score += 3;

    return Math.min(score, maxScore);
}

/**
 * Calculate existing data quality score
 */
function calculateExistingScore(tags: Record<string, string>): number {
    let score = 0;
    const maxScore = SCORE_WEIGHTS.EXISTING;

    if (tags.opening_hours) score += 4;
    if (tags.website || tags['contact:website']) score += 3;
    if (tags.phone || tags['contact:phone']) score += 2;
    if (tags['addr:full'] || tags['addr:street']) score += 1;

    return Math.min(score, maxScore);
}

/**
 * Calculate vibe matching score
 * New purpose-based vibes: date, work, rooftop, chill, party
 */
function calculateVibeScore(
    tags: Record<string, string>,
    vibes?: ('date' | 'work' | 'rooftop' | 'chill' | 'party')[]
): number {
    if (!vibes || vibes.length === 0) return 10; // Neutral score (increased from 5)

    const maxScore = SCORE_WEIGHTS.VIBE;
    const name = tags.name?.toLowerCase() || '';
    const description = tags.description?.toLowerCase() || '';
    const amenity = tags.amenity?.toLowerCase() || '';
    const searchText = `${name} ${description} ${amenity}`;

    const vibeKeywords: Record<string, string[]> = {
        date: ['romantic', 'candlelight', 'intimate', 'cozy', 'lounge', 'wine', 'bistro', 'fine', 'garden', 'terrace', 'quiet'],
        work: ['cafe', 'coffee', 'wifi', 'cowork', 'study', 'library', 'quiet', 'laptop', 'workspace', 'hub'],
        rooftop: ['rooftop', 'terrace', 'roof', 'sky', 'view', 'top', 'balcony', 'open', 'outdoor'],
        chill: ['laid-back', 'casual', 'relax', 'hangout', 'spot', 'pub', 'taproom', 'beer', 'sports', 'dhaba'],
        party: ['club', 'nightclub', 'bar', 'disco', 'dance', 'dj', 'lounge', 'loud', 'music', 'live'],
    };

    let matchCount = 0;

    for (const vibe of vibes) {
        const keywords = vibeKeywords[vibe] || [];
        if (keywords.some(kw => searchText.includes(kw))) {
            matchCount++;
        }
    }

    if (matchCount === 0) {
        return 0; // No penalty, just no bonus
    }

    // Bonus scales with number of matches
    return Math.min(10 + (matchCount * 5), maxScore);
}

/**
 * Apply weather-based modifier to score
 */
export function applyWeatherModifier(
    tags: Record<string, string>,
    weather: { isRaining: boolean; temperature: number } | null
): number {
    if (!weather) return 0;

    const isOutdoor = tags.leisure === 'park' ||
        tags.leisure === 'garden' ||
        tags.outdoor_seating === 'yes' ||
        tags.outdoor_seating === 'only';

    // Rainy weather
    if (weather.isRaining) {
        if (isOutdoor) return -20; // Heavy penalty
        if (tags.air_conditioning === 'yes') return +5; // Indoor AC venue bonus
        return 0;
    }

    // Extreme heat (common in India)
    if (weather.temperature > 38) {
        if (isOutdoor) return -15;
        if (tags.air_conditioning === 'yes') return +8;
        return 0;
    }

    // Hot weather
    if (weather.temperature > 32) {
        if (isOutdoor) return -5;
        if (tags.air_conditioning === 'yes') return +3;
        return 0;
    }

    // Pleasant weather bonus for outdoor venues
    if (weather.temperature >= 18 && weather.temperature <= 28) {
        if (isOutdoor) return +10;
    }

    return 0;
}

/**
 * Main scoring function
 * @param tags - OSM/venue tags
 * @param vibes - Selected vibe filters
 * @param distance - Distance from search location in km
 * @param weather - Current weather (optional)
 * @returns Score from 0-100
 */
export function scoreVenue(
    tags: Record<string, string>,
    vibes?: ('date' | 'work' | 'rooftop' | 'chill' | 'party')[],
    distance?: number,
    weather?: { isRaining: boolean; temperature: number } | null
): number {
    let score = 0;

    // Component scores
    score += calculateDistanceScore(distance);
    score += calculatePopularityScore(tags);
    score += calculateAmenitiesScore(tags);
    score += calculateTimeScore(tags);
    score += calculatePurposeScore(tags);
    score += calculateExistingScore(tags);
    score += calculateVibeScore(tags, vibes);

    // Weather modifier (can be negative)
    if (weather) {
        score += applyWeatherModifier(tags, weather);
    }

    // Ensure score is between 0-100
    return Math.max(0, Math.min(100, score));
}

/**
 * Get a breakdown of the score components (useful for debugging/transparency)
 */
export function getScoreBreakdown(
    tags: Record<string, string>,
    vibes?: ('date' | 'work' | 'rooftop' | 'chill' | 'party')[],
    distance?: number,
    weather?: { isRaining: boolean; temperature: number } | null
): Record<string, number> {
    return {
        distance: calculateDistanceScore(distance),
        popularity: calculatePopularityScore(tags),
        amenities: calculateAmenitiesScore(tags),
        time: calculateTimeScore(tags),
        purpose: calculatePurposeScore(tags),
        existing: calculateExistingScore(tags),
        vibe: calculateVibeScore(tags, vibes),
        weather: weather ? applyWeatherModifier(tags, weather) : 0,
        total: scoreVenue(tags, vibes, distance, weather),
    };
}
