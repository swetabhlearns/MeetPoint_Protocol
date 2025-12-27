import { borderRadius, colors, fonts, spacing } from '@/constants/theme';
import { Venue } from '@/services/hybridVenues';
import { useFavoritesStore } from '@/store/useFavoritesStore';
import { calculateDistance, Coordinates, formatDistance } from '@/utils/midpoint';
import React from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface VenueCardProps {
    venue: Venue;
    index: number;
    userLocation: Coordinates;
    onPress: () => void;
}

export default function VenueCard({ venue, index, userLocation, onPress }: VenueCardProps) {
    const { isFavorite, toggleFavorite } = useFavoritesStore();
    const isVenueFavorite = isFavorite(venue.id);

    const distance = calculateDistance(userLocation, {
        latitude: venue.latitude,
        longitude: venue.longitude,
    });

    const handleFavoritePress = () => {
        toggleFavorite(venue);
    };

    const handlePhotosPress = () => {
        // Open Google search for venue
        const city = venue.tags['addr:full']?.split(',').pop()?.trim() || 'India';
        const query = encodeURIComponent(`${venue.name} ${city}`);
        Linking.openURL(`https://www.google.com/search?q=${query}`);
    };

    return (
        <Animated.View entering={FadeInDown.delay(index * 80).duration(300)}>
            <TouchableOpacity
                style={[styles.container, venue.aiRecommended && styles.containerAI]}
                onPress={onPress}
                activeOpacity={0.7}
            >
                <View style={styles.content}>
                    <View style={styles.nameRow}>
                        <Text style={styles.name} numberOfLines={1}>{venue.name}</Text>
                        {venue.aiRecommended && (
                            <View style={styles.aiBadge}>
                                <Text style={styles.aiBadgeText}>🤖 AI</Text>
                            </View>
                        )}
                    </View>

                    <Text style={styles.score}>
                        SCORE: {Math.round(venue.score)} • {venue.tags.amenity || venue.tags.leisure || 'venue'}
                    </Text>

                    <View style={styles.bottomRow}>
                        <Text style={styles.distance}>
                            {formatDistance(distance)} away
                        </Text>
                        <TouchableOpacity
                            style={styles.zomatoButton}
                            onPress={handlePhotosPress}
                            hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                        >
                            <Text style={styles.zomatoText}>🔍 Google</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Favorite Button */}
                <TouchableOpacity
                    style={styles.favoriteButton}
                    onPress={handleFavoritePress}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Text style={styles.favoriteIcon}>
                        {isVenueFavorite ? '💜' : '🤍'}
                    </Text>
                </TouchableOpacity>

                <View style={[
                    styles.scoreIndicator,
                    { backgroundColor: venue.score > 50 ? colors.accent : colors.textSecondary }
                ]} />
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.lg,
        marginHorizontal: spacing.lg,
        marginBottom: spacing.md,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.md,
    },
    containerAI: {
        backgroundColor: colors.surfaceElevated,
        borderColor: colors.accent,
        borderWidth: 2,
    },
    content: {
        flex: 1,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.xs,
    },
    name: {
        color: colors.textPrimary,
        fontFamily: fonts.monoBold,
        fontSize: 16,
        textTransform: 'uppercase',
        flex: 1,
    },
    aiBadge: {
        backgroundColor: 'rgba(224, 122, 95, 0.15)',
        borderWidth: 1,
        borderColor: colors.accent,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: borderRadius.sm,
    },
    aiBadgeText: {
        fontFamily: fonts.monoBold,
        fontSize: 10,
        color: colors.accent,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    score: {
        color: colors.accent,
        fontFamily: fonts.monoRegular,
        fontSize: 10,
        textTransform: 'uppercase',
    },
    distance: {
        color: colors.accentCyan,
        fontFamily: fonts.monoRegular,
        fontSize: 10,
    },
    bottomRow: {
        flexDirection: 'row' as const,
        alignItems: 'center',
        marginTop: spacing.xs,
        gap: spacing.md,
    },
    zomatoButton: {
        backgroundColor: 'rgba(224, 122, 95, 0.15)',
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: borderRadius.sm,
        borderWidth: 1,
        borderColor: colors.accent,
    },
    zomatoText: {
        fontFamily: fonts.monoBold,
        fontSize: 10,
        color: colors.accent,
    },
    favoriteButton: {
        padding: spacing.sm,
        marginRight: spacing.sm,
    },
    favoriteIcon: {
        fontSize: 18,
    },
    scoreIndicator: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
});
