import OlaMap from '@/components/OlaMap';
import VenueCard from '@/components/VenueCard';
import VenueDetailSheet from '@/components/VenueDetailSheet';
import { borderRadius, colors, fonts, spacing } from '@/constants/theme';
import { AICuratedResult, hybridCurateVenues } from '@/services/aiCuration';
import { trackDateConfirmation } from '@/services/analytics';
import { createDate } from '@/services/dates';
import { fetchOlaMapsVenues } from '@/services/hybridVenues';
import { getCurrentWeather, getWeatherEmoji, WeatherData } from '@/services/weather';
import { useAppStore } from '@/store/useAppStore';
import { calculateSearchLocation } from '@/utils/midpoint';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface VenueListScreenProps {
    onBack: () => void;
}

export default function VenueListScreen({ onBack }: VenueListScreenProps) {
    const insets = useSafeAreaInsets();
    const [weather, setWeather] = useState<WeatherData | null>(null);

    const {
        myLocation,
        myLocationName,
        theirLocation,
        theirLocationName,
        searchMode,
        filters,
        venues,
        selectedVenue,
        isLoading,
        isEnhancingWithAI,
        error,
        showAIModal,
        ticketMode,
        setVenues,
        setSelectedVenue,
        setLoading,
        setEnhancingWithAI,
        setError,
        setShowAIModal,
        setTicketMode,
        getCachedVenues,
        setCachedVenues,
        setFilters,
        setSearchMode,
        setTheirLocation,
    } = useAppStore();

    const [aiQuery, setAiQuery] = useState('');
    const [isAiThinking, setIsAiThinking] = useState(false);
    const [aiCuratedResult, setAiCuratedResult] = useState<AICuratedResult | null>(null);
    const [showingAICurated, setShowingAICurated] = useState(false);

    // Generate cache key - includes ALL filters
    const getCacheKey = () => {
        if (!myLocation || !theirLocation) return null;
        const searchLoc = calculateSearchLocation({ mode: searchMode, myLocation, theirLocation });
        const vibeKey = filters.vibe?.sort().join('-') || 'any';
        return `${searchLoc.latitude.toFixed(3)}_${searchLoc.longitude.toFixed(3)}_${filters.types?.join('-')}_${filters.diet}_${vibeKey}`;
    };

    // Fetch weather on mount
    useEffect(() => {
        if (myLocation) {
            getCurrentWeather(myLocation.latitude, myLocation.longitude)
                .then(setWeather)
                .catch(() => setWeather(null));
        }
    }, [myLocation]);

    // Fetch venues on mount or when dependencies change
    useEffect(() => {
        if (!myLocation || !theirLocation) return;

        const fetchVenues = async () => {
            setLoading(true);
            setVenues([]);
            setError(null);

            const cacheKey = getCacheKey();

            // Check cache first
            if (cacheKey) {
                const cached = await getCachedVenues(cacheKey);
                if (cached && cached.length > 0) {
                    console.log('📦 Using cached venues');
                    setVenues(cached);
                    setLoading(false);
                    return;
                }
            }

            console.log('🔍 Fetching venues...');

            try {
                let fetchedVenues: any[] = [];

                // Route-based search when both locations are set
                if (theirLocation) {
                    try {
                        const { fetchVenuesAlongRoute } = await import('@/services/hybridVenues');
                        console.log('🛣️ Using route-based venue search');

                        const result = await fetchVenuesAlongRoute(
                            myLocation,
                            theirLocation,
                            myLocation,
                            filters
                        );

                        fetchedVenues = result?.venues || [];

                        if (fetchedVenues.length > 0) {
                            console.log(`✅ Found ${fetchedVenues.length} venues along route`);
                        } else {
                            throw new Error('No venues from route search');
                        }
                    } catch (routeError) {
                        console.log('⚠️ Route search failed, using midpoint:', routeError);
                        const midpoint = {
                            latitude: (myLocation.latitude + theirLocation.latitude) / 2,
                            longitude: (myLocation.longitude + theirLocation.longitude) / 2,
                        };
                        fetchedVenues = await fetchOlaMapsVenues(midpoint, myLocation, filters);
                        console.log(`📍 Found ${fetchedVenues.length} venues at midpoint`);
                    }
                } else {
                    // Single location - use regular search
                    fetchedVenues = await fetchOlaMapsVenues(myLocation, myLocation, filters);
                    console.log(`Found ${fetchedVenues.length} venues`);
                }

                if (fetchedVenues.length === 0) {
                    setError('No venues found in this area. Try adjusting your filters.');
                    setLoading(false);
                    return;
                }

                // Show venues immediately (NO AI enhancement initially)
                setVenues(fetchedVenues);
                setLoading(false);

                // Cache the results
                if (cacheKey) {
                    await setCachedVenues(cacheKey, fetchedVenues);
                }

                // Reset AI curated view when new venues load
                setShowingAICurated(false);
                setAiCuratedResult(null);
            } catch (err) {
                console.error('Venue fetch error:', err);
                setError('Failed to load venues. Please try again.');
                setLoading(false);
            }
        };

        fetchVenues();
    }, [myLocation, theirLocation, filters, searchMode]);


    const handleConfirmDate = async () => {
        if (selectedVenue) {
            // Track the confirmation for analytics
            await trackDateConfirmation(selectedVenue);
            await createDate(selectedVenue, new Date());
            setTicketMode(true);
        }
    };

    // Direct AI curation - no modal needed
    const handleDirectAICuration = async () => {
        if (venues.length === 0 || !myLocation) {
            alert('No venues loaded to curate');
            return;
        }

        setIsAiThinking(true);

        try {
            // Build dynamic query from user's context
            const locationContext = theirLocationName
                ? `between ${myLocationName || 'my location'} and ${theirLocationName}`
                : `near ${myLocationName || 'my location'}`;

            const typeFilters = filters.types?.length
                ? filters.types.join(', ')
                : 'any type';

            const dietFilter = filters.diet !== 'any'
                ? filters.diet
                : '';

            const vibeFilters = filters.vibe?.length
                ? `with ${filters.vibe.join(', ')} vibe`
                : '';

            // Build the query dynamically
            const dynamicQuery = `Find the best ${typeFilters} spots ${locationContext}${dietFilter ? `, ${dietFilter} friendly` : ''}${vibeFilters ? ` ${vibeFilters}` : ''}`;

            console.log('🤖 AI Query:', dynamicQuery);

            const curatedResult = await hybridCurateVenues(
                venues,
                dynamicQuery,
                myLocation,
                myLocationName || 'your area',
                {
                    weather: weather ? { isRaining: weather.isRaining, temperature: weather.temperature } : undefined,
                    timeOfDay: getTimeOfDay(),
                },
                // Callback: Add each discovered venue to the curated list
                (newVenue) => {
                    setAiCuratedResult(prev => {
                        if (!prev) return prev;
                        return {
                            ...prev,
                            venues: [...prev.venues, newVenue],
                        };
                    });
                },
                // Callback: Discovery complete
                () => {
                    setAiCuratedResult(prev => prev ? { ...prev, isLoadingMore: false } : prev);
                }
            );

            setAiCuratedResult(curatedResult);
            setShowingAICurated(true);
        } catch (e) {
            console.error(e);
            alert('AI curation failed. Try again!');
        } finally {
            setIsAiThinking(false);
        }
    };

    // Helper to get time of day
    const getTimeOfDay = (): 'morning' | 'afternoon' | 'evening' | 'night' => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) return 'morning';
        if (hour >= 12 && hour < 17) return 'afternoon';
        if (hour >= 17 && hour < 21) return 'evening';
        return 'night';
    };

    // Handle switching back to all venues
    const handleShowAllVenues = () => {
        setShowingAICurated(false);
        setAiCuratedResult(null);
    };

    if (!myLocation) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={colors.accent} />
                <Text style={styles.loadingText}>Getting your location...</Text>
            </View>
        );
    }

    // Map markers
    const markers = [
        ...(myLocation ? [{
            id: 'me',
            latitude: myLocation.latitude,
            longitude: myLocation.longitude,
            title: 'You',
            description: myLocationName,
            color: colors.accentCyan,
        }] : []),
        ...(theirLocation ? [{
            id: 'them',
            latitude: theirLocation.latitude,
            longitude: theirLocation.longitude,
            title: 'Them',
            description: theirLocationName,
            color: colors.accentPurple,
        }] : []),
        ...venues.map(venue => ({
            id: venue.id,
            latitude: venue.latitude,
            longitude: venue.longitude,
            title: venue.name,
            description: `Score: ${venue.score}`,
            color: venue.aiRecommended ? colors.accent : colors.textSecondary,
        })),
    ];

    return (
        <View style={styles.container}>
            {/* Background Map */}
            <View style={styles.map}>
                <OlaMap
                    height="100%"
                    latitude={myLocation?.latitude}
                    longitude={myLocation?.longitude}
                    markers={markers}
                />
            </View>

            {/* Loading Overlay */}
            {isLoading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color={colors.accent} />
                    <Text style={styles.loadingText}>Finding perfect venues...</Text>
                </View>
            )}

            {/* AI Curated View */}
            {showingAICurated && aiCuratedResult && (
                <View style={[styles.venueListContainer, { paddingTop: insets.top }]}>
                    <View style={styles.header}>
                        <View style={styles.aiInsightBanner}>
                            <Text style={styles.aiInsightEmoji}>✨</Text>
                            <View style={styles.aiInsightContent}>
                                <Text style={styles.aiInsightTitle}>AI Picks for You</Text>
                                <Text style={styles.aiInsightText}>{aiCuratedResult.aiInsight}</Text>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.showAllButton} onPress={handleShowAllVenues}>
                            <Text style={styles.showAllButtonText}>← Show All {venues.length} Venues</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.venueList} scrollEventThrottle={16} nestedScrollEnabled={true}>
                        {aiCuratedResult.venues.map((venue, index) => (
                            <VenueCard
                                key={venue.id}
                                venue={venue}
                                index={index}
                                userLocation={myLocation}
                                onPress={() => setSelectedVenue(venue)}
                            />
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* Normal Venue List */}
            {!isLoading && venues.length > 0 && !showingAICurated && (
                <View style={[styles.venueListContainer, { paddingTop: insets.top }]}>
                    <View style={styles.header}>
                        <View style={styles.headerRow}>
                            <Text style={styles.headerTitle}>Nearby Venues</Text>
                            {weather && (
                                <View style={styles.weatherBadge}>
                                    <Text style={styles.weatherIcon}>{getWeatherEmoji(weather.weatherCode)}</Text>
                                    <Text style={styles.weatherTemp}>{weather.temperature}°</Text>
                                </View>
                            )}
                        </View>
                        <View style={styles.headerMeta}>
                            <Text style={styles.headerSubtitle}>{venues.length} places found</Text>
                            {weather?.isRaining && (
                                <Text style={styles.weatherWarning}>☔ Outdoor venues deprioritized</Text>
                            )}
                        </View>
                        <TouchableOpacity style={styles.backButton} onPress={onBack}>
                            <Text style={styles.backButtonText}>← Change Locations</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={styles.venueList}
                        scrollEventThrottle={16}
                        nestedScrollEnabled={true}
                    >
                        {venues.map((venue, index) => (
                            <VenueCard
                                key={venue.id}
                                venue={venue}
                                index={index}
                                userLocation={myLocation}
                                onPress={() => setSelectedVenue(venue)}
                            />
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* Empty State */}
            {!isLoading && venues.length === 0 && (
                <View style={styles.center}>
                    <Text style={styles.emptyText}>{error || 'No venues found in this area'}</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={onBack}>
                        <Text style={styles.retryButtonText}>← Back to Search</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Venue Detail Sheet */}
            {selectedVenue && !ticketMode && (
                <VenueDetailSheet
                    venue={selectedVenue}
                    userLocation={myLocation}
                    onConfirm={handleConfirmDate}
                    onClose={() => setSelectedVenue(null)}
                />
            )}

            {/* AI FAB - directly curates without modal */}
            {!selectedVenue && !showingAICurated && (
                <TouchableOpacity
                    style={styles.aiFab}
                    onPress={handleDirectAICuration}
                    disabled={isAiThinking}
                >
                    <Text style={styles.aiFabIcon}>{isAiThinking ? '⏳' : '✨'}</Text>
                    <Text style={styles.aiFabText}>{isAiThinking ? 'Curating...' : 'AI Picks'}</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    map: {
        flex: 1,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(5, 5, 5, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: colors.textPrimary,
        fontFamily: fonts.monoRegular,
        marginTop: spacing.lg,
        fontSize: 14,
    },
    venueListContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: colors.background,
    },
    header: {
        padding: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    weatherBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
        gap: spacing.xs,
    },
    weatherIcon: {
        fontSize: 16,
    },
    weatherTemp: {
        fontFamily: fonts.monoBold,
        fontSize: 12,
        color: colors.textPrimary,
    },
    weatherWarning: {
        fontFamily: fonts.monoRegular,
        fontSize: 10,
        color: colors.accentCyan,
        marginTop: spacing.xs,
    },
    aiInsightBanner: {
        flexDirection: 'row',
        backgroundColor: colors.surfaceElevated,
        padding: spacing.lg,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.accent,
        marginBottom: spacing.md,
        gap: spacing.md,
    },
    aiInsightEmoji: {
        fontSize: 28,
    },
    aiInsightContent: {
        flex: 1,
    },
    aiInsightTitle: {
        fontFamily: fonts.monoBold,
        fontSize: 14,
        color: colors.accent,
        marginBottom: spacing.xs,
    },
    aiInsightText: {
        fontFamily: fonts.monoRegular,
        fontSize: 12,
        color: colors.textSecondary,
        lineHeight: 18,
    },
    showAllButton: {
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    showAllButtonText: {
        fontFamily: fonts.monoBold,
        fontSize: 12,
        color: colors.textPrimary,
        textAlign: 'center',
    },
    headerTitle: {
        fontFamily: fonts.displayBoldItalic,
        fontSize: 24,
        color: colors.textPrimary,
    },
    headerMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    headerSubtitle: {
        fontFamily: fonts.monoRegular,
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: spacing.xs,
    },
    aiEnhancing: {
        fontFamily: fonts.monoRegular,
        fontSize: 10,
        color: colors.accentCyan,
        marginTop: spacing.xs,
    },
    backButton: {
        marginTop: spacing.md,
        padding: spacing.sm,
        backgroundColor: colors.border,
    },
    backButtonText: {
        fontFamily: fonts.monoBold,
        fontSize: 12,
        color: colors.textPrimary,
    },
    venueList: {
        flex: 1,
        backgroundColor: colors.background,
    },
    emptyText: {
        color: colors.textPrimary,
        fontFamily: fonts.monoRegular,
        textAlign: 'center',
        marginBottom: spacing.lg,
    },
    retryButton: {
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    retryButtonText: {
        fontFamily: fonts.monoBold,
        fontSize: 14,
        color: colors.textPrimary,
    },
    aiFab: {
        position: 'absolute',
        bottom: 30,
        alignSelf: 'center',
        backgroundColor: colors.accentCyan,
        paddingHorizontal: spacing.xxl,
        paddingVertical: spacing.lg,
        borderRadius: 30,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        shadowColor: colors.accentCyan,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 8,
        zIndex: 100,
    },
    aiFabIcon: {
        fontSize: 20,
    },
    aiFabText: {
        fontFamily: fonts.monoBold,
        color: colors.surface,
        fontSize: 14,
    },
});
