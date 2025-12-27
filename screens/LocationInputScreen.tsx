import { colors, fonts, spacing } from '@/constants/theme';
import { parseNaturalLanguageQuery } from '@/services/aiSearch';
import { reverseGeocode } from '@/services/geocoding';
import { getOlaPlaceDetails, searchOlaMapsAutocomplete } from '@/services/olaMaps';
import { useAppStore } from '@/store/useAppStore';
import * as Location from 'expo-location';
import debounce from 'lodash.debounce';
import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type SearchMode = 'midpoint' | 'closer_to_me' | 'closer_to_them';

interface LocationInputScreenProps {
    onFindVenues: () => void;
}

export default function LocationInputScreen({ onFindVenues }: LocationInputScreenProps) {
    const {
        myLocation,
        myLocationName,
        theirLocation,
        theirLocationName,
        searchMode,
        filters,
        showAIModal,
        setMyLocation,
        setTheirLocation,
        setSearchMode,
        setFilters,
        setShowAIModal,
    } = useAppStore();

    const [myLocationInput, setMyLocationInput] = useState('');
    const [theirLocationInput, setTheirLocationInput] = useState('');
    const [mySuggestions, setMySuggestions] = useState<any[]>([]);
    const [theirSuggestions, setTheirSuggestions] = useState<any[]>([]);
    const [isEditingMyLoc, setIsEditingMyLoc] = useState(false);
    const [isEditingTheirLoc, setIsEditingTheirLoc] = useState(!theirLocation);
    const [aiQuery, setAiQuery] = useState('');
    const [isAiThinking, setIsAiThinking] = useState(false);
    const [isGeolocating, setIsGeolocating] = useState(false);

    // Debounced autocomplete search
    const debouncedMyLocSearch = useMemo(
        () => debounce(async (text: string) => {
            if (text.length > 2) {
                const results = await searchOlaMapsAutocomplete(text, myLocation?.latitude, myLocation?.longitude);
                setMySuggestions(results);
            } else {
                setMySuggestions([]);
            }
        }, 300),
        [myLocation]
    );

    const debouncedTheirLocSearch = useMemo(
        () => debounce(async (text: string) => {
            if (text.length > 2) {
                const results = await searchOlaMapsAutocomplete(text, myLocation?.latitude, myLocation?.longitude);
                setTheirSuggestions(results);
            } else {
                setTheirSuggestions([]);
            }
        }, 300),
        [myLocation]
    );

    const handleMyLocChange = useCallback((text: string) => {
        setMyLocationInput(text);
        debouncedMyLocSearch(text);
    }, [debouncedMyLocSearch]);

    const handleTheirLocChange = useCallback((text: string) => {
        setTheirLocationInput(text);
        debouncedTheirLocSearch(text);
    }, [debouncedTheirLocSearch]);

    const selectMyLocation = async (placeId: string) => {
        const details = await getOlaPlaceDetails(placeId);
        if (details) {
            setMyLocation({ latitude: details.lat, longitude: details.lng }, details.name);
            setMyLocationInput('');
            setMySuggestions([]);
            setIsEditingMyLoc(false);
        }
    };

    const selectTheirLocation = async (placeId: string) => {
        const details = await getOlaPlaceDetails(placeId);
        if (details) {
            setTheirLocation({ latitude: details.lat, longitude: details.lng }, details.name);
            setTheirLocationInput('');
            setTheirSuggestions([]);
            setIsEditingTheirLoc(false);
        }
    };

    const useGPS = async () => {
        try {
            setIsGeolocating(true);
            const location = await Location.getCurrentPositionAsync({});
            const coords = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            };
            const name = await reverseGeocode(coords.latitude, coords.longitude);
            setMyLocation(coords, name || 'Current Location');
            setIsEditingMyLoc(false);
        } catch (e) {
            console.log(e);
        } finally {
            setIsGeolocating(false);
        }
    };

    const handleAISearch = async () => {
        if (!aiQuery.trim()) return;
        setIsAiThinking(true);

        try {
            console.log('🤖 AI Search started:', aiQuery);
            const result = await parseNaturalLanguageQuery(aiQuery);
            console.log('🤖 AI Result:', result);

            if (result) {
                const newTypes = (result.venueTypes || []) as ('cafe' | 'bar' | 'restaurant' | 'pub')[];
                const newVibe = (result.vibe || []) as unknown as ('date' | 'work' | 'rooftop' | 'chill' | 'party')[];

                setFilters({
                    types: newTypes.length > 0 ? newTypes : ['cafe', 'restaurant', 'bar'],
                    diet: result.diet || 'any',
                    vibe: newVibe,
                });

                if (result.searchMode) setSearchMode(result.searchMode);

                if (result.theirLocationName) {
                    const suggestions = await searchOlaMapsAutocomplete(result.theirLocationName, myLocation?.latitude, myLocation?.longitude);
                    if (suggestions?.length > 0) {
                        const details = await getOlaPlaceDetails(suggestions[0].place_id);
                        if (details) {
                            setTheirLocation({ latitude: details.lat, longitude: details.lng }, details.name);
                        }
                    }
                }

                setShowAIModal(false);
                setAiQuery('');
                alert(`✨ Applied: ${newTypes.join(', ') || 'all types'} • ${newVibe.join(', ') || 'any vibe'}`);
            } else {
                alert('AI could not parse your request. Try being more specific!');
            }
        } catch (e) {
            console.error('AI Search Error:', e);
            alert('AI search failed. Check your GROQ_API_KEY.');
        } finally {
            setIsAiThinking(false);
        }
    };

    const canProceed = myLocation && theirLocation;

    return (
        <View style={styles.container}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={true}
            >
                <Text style={styles.appTitle}>MeetPoint</Text>
                <Text style={styles.appSubtitle}>Find the perfect place to meet</Text>

                {/* MY LOCATION CARD */}
                <View style={styles.card}>
                    <Text style={styles.cardLabel}>YOUR LOCATION</Text>

                    {!isEditingMyLoc && myLocation ? (
                        <View>
                            <Text style={styles.locationName}>{myLocationName}</Text>
                            <TouchableOpacity onPress={() => setIsEditingMyLoc(true)}>
                                <Text style={styles.changeText}>Change</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View>
                            <TextInput
                                style={styles.input}
                                placeholder="Search places in India..."
                                placeholderTextColor={colors.textSecondary}
                                value={myLocationInput}
                                onChangeText={handleMyLocChange}
                            />
                            <TouchableOpacity onPress={useGPS} style={styles.gpsButton} disabled={isGeolocating}>
                                <Text style={styles.changeText}>
                                    {isGeolocating ? '📍 Detecting...' : '📍 Use GPS Location'}
                                </Text>
                            </TouchableOpacity>

                            {mySuggestions.map((item) => (
                                <TouchableOpacity
                                    key={item.place_id}
                                    style={styles.suggestionItem}
                                    onPress={() => selectMyLocation(item.place_id)}
                                >
                                    <View style={styles.suggestionIcon}>
                                        <Text>📍</Text>
                                    </View>
                                    <View style={styles.suggestionContent}>
                                        <Text style={styles.suggestionMainText}>
                                            {item.structured_formatting?.main_text || item.description.split(',')[0]}
                                        </Text>
                                        <Text style={styles.suggestionSubText} numberOfLines={1}>
                                            {item.structured_formatting?.secondary_text || item.description}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                {/* THEIR LOCATION CARD */}
                <View style={styles.card}>
                    <Text style={styles.cardLabel}>THEIR LOCATION</Text>

                    {!isEditingTheirLoc && theirLocation ? (
                        <View>
                            <Text style={styles.locationName}>{theirLocationName}</Text>
                            <TouchableOpacity onPress={() => {
                                setTheirLocation(null);
                                setIsEditingTheirLoc(true);
                            }}>
                                <Text style={styles.changeText}>Change</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View>
                            <TextInput
                                style={styles.input}
                                placeholder="Search places (e.g. Lalpur, Ranchi)..."
                                placeholderTextColor={colors.textSecondary}
                                value={theirLocationInput}
                                onChangeText={handleTheirLocChange}
                            />

                            {theirSuggestions.map((item) => (
                                <TouchableOpacity
                                    key={item.place_id}
                                    style={styles.suggestionItem}
                                    onPress={() => selectTheirLocation(item.place_id)}
                                >
                                    <View style={styles.suggestionIcon}>
                                        <Text>📍</Text>
                                    </View>
                                    <View style={styles.suggestionContent}>
                                        <Text style={styles.suggestionMainText}>
                                            {item.structured_formatting?.main_text || item.description.split(',')[0]}
                                        </Text>
                                        <Text style={styles.suggestionSubText} numberOfLines={1}>
                                            {item.structured_formatting?.secondary_text || item.description}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                {/* SEARCH MODE */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>SEARCH MODE</Text>
                    <View style={styles.modeButtons}>
                        {(['midpoint', 'closer_to_me', 'closer_to_them'] as SearchMode[]).map((mode) => (
                            <TouchableOpacity
                                key={mode}
                                style={[styles.modeButton, searchMode === mode && styles.modeButtonActive]}
                                onPress={() => setSearchMode(mode)}
                            >
                                <Text style={[styles.modeButtonText, searchMode === mode && styles.modeButtonTextActive]}>
                                    {mode === 'midpoint' ? 'Midpoint' : mode === 'closer_to_me' ? 'Closer to Me' : 'Closer to Them'}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* FILTERS */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>FILTERS</Text>

                    <Text style={styles.filterLabel}>Type</Text>
                    <View style={styles.filterRow}>
                        {(['cafe', 'bar', 'restaurant', 'pub'] as const).map((type) => (
                            <TouchableOpacity
                                key={type}
                                style={[styles.filterChip, filters.types?.includes(type) && styles.filterChipActive]}
                                onPress={() => {
                                    const current = filters.types || [];
                                    setFilters({
                                        ...filters,
                                        types: current.includes(type)
                                            ? current.filter(t => t !== type)
                                            : [...current, type],
                                    });
                                }}
                            >
                                <Text style={styles.filterChipText}>{type}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.filterLabel}>Diet</Text>
                    <View style={styles.filterRow}>
                        {(['any', 'vegetarian', 'vegan'] as const).map((diet) => (
                            <TouchableOpacity
                                key={diet}
                                style={[styles.filterChip, filters.diet === diet && styles.filterChipActive]}
                                onPress={() => setFilters({ ...filters, diet })}
                            >
                                <Text style={styles.filterChipText}>{diet}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.filterLabel}>Vibe</Text>
                    <View style={styles.filterRow}>
                        {([
                            { id: 'date', label: '💕 Date' },
                            { id: 'work', label: '💻 Work' },
                            { id: 'rooftop', label: '🌆 Rooftop' },
                            { id: 'chill', label: '😎 Chill' },
                            { id: 'party', label: '🎉 Party' },
                        ] as const).map(({ id, label }) => (
                            <TouchableOpacity
                                key={id}
                                style={[styles.filterChip, filters.vibe?.includes(id as any) && styles.filterChipActive]}
                                onPress={() => {
                                    const current = filters.vibe || [];
                                    setFilters({
                                        ...filters,
                                        vibe: current.includes(id as any)
                                            ? current.filter(v => v !== id)
                                            : [...current, id as any],
                                    });
                                }}
                            >
                                <Text style={styles.filterChipText}>{label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* FIND BUTTON */}
                {canProceed ? (
                    <TouchableOpacity style={styles.findButton} onPress={onFindVenues}>
                        <Text style={styles.findButtonText}>FIND VENUES</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={styles.findButtonDisabled}>
                        <Text style={styles.findButtonTextDisabled}>SET BOTH LOCATIONS TO CONTINUE</Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: spacing.xl,
        paddingBottom: 120,
    },
    appTitle: {
        fontFamily: fonts.displayBoldItalic,
        fontSize: 48,
        color: colors.textPrimary,
        marginBottom: spacing.sm,
    },
    appSubtitle: {
        fontFamily: fonts.monoRegular,
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: spacing.xxxl,
    },
    card: {
        backgroundColor: colors.surface,
        padding: spacing.xl,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: spacing.lg,
    },
    cardLabel: {
        fontFamily: fonts.monoBold,
        fontSize: 10,
        color: colors.accent,
        marginBottom: spacing.sm,
        letterSpacing: 1,
    },
    locationName: {
        fontFamily: fonts.displayBoldItalic,
        fontSize: 18,
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },
    changeText: {
        fontFamily: fonts.monoBold,
        fontSize: 12,
        color: colors.accent,
        marginTop: spacing.sm,
    },
    input: {
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.md,
        fontFamily: fonts.monoRegular,
        fontSize: 14,
        color: colors.textPrimary,
    },
    gpsButton: {
        marginTop: spacing.sm,
        marginBottom: spacing.md,
    },
    suggestionItem: {
        padding: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.background,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    suggestionIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.surfaceElevated,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    suggestionContent: {
        flex: 1,
    },
    suggestionMainText: {
        fontFamily: fonts.monoBold,
        fontSize: 14,
        color: colors.textPrimary,
        marginBottom: 2,
    },
    suggestionSubText: {
        fontFamily: fonts.monoRegular,
        fontSize: 10,
        color: colors.textSecondary,
    },
    sectionTitle: {
        fontFamily: fonts.monoBold,
        fontSize: 12,
        color: colors.accent,
        marginBottom: spacing.md,
        letterSpacing: 1,
    },
    modeButtons: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    modeButton: {
        flex: 1,
        padding: spacing.md,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
    },
    modeButtonActive: {
        backgroundColor: colors.accent,
        borderColor: colors.accent,
    },
    modeButtonText: {
        fontFamily: fonts.monoRegular,
        fontSize: 10,
        color: colors.textSecondary,
    },
    modeButtonTextActive: {
        color: colors.surface,
        fontFamily: fonts.monoBold,
    },
    filterLabel: {
        fontFamily: fonts.monoBold,
        fontSize: 10,
        color: colors.textSecondary,
        marginBottom: spacing.sm,
        marginTop: spacing.md,
    },
    filterRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    filterChip: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
    },
    filterChipActive: {
        backgroundColor: colors.accent,
        borderColor: colors.accent,
    },
    filterChipText: {
        fontFamily: fonts.monoRegular,
        fontSize: 10,
        color: colors.textPrimary,
    },
    findButton: {
        backgroundColor: colors.accent,
        padding: spacing.lg,
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    findButtonText: {
        fontFamily: fonts.monoBold,
        fontSize: 14,
        color: colors.surface,
    },
    findButtonDisabled: {
        backgroundColor: colors.border,
        padding: spacing.lg,
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    findButtonTextDisabled: {
        fontFamily: fonts.monoBold,
        fontSize: 12,
        color: colors.textSecondary,
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
