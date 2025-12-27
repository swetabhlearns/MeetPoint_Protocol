import { borderRadius, colors, fonts, spacing } from '@/constants/theme';
import { useFavoritesStore } from '@/store/useFavoritesStore';
import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface FavoritesScreenProps {
    onBack: () => void;
    onSelectVenue: (venue: any) => void;
}

export default function FavoritesScreen({ onBack, onSelectVenue }: FavoritesScreenProps) {
    const insets = useSafeAreaInsets();
    const { favorites, isLoaded, loadFavorites, removeFavorite } = useFavoritesStore();

    useEffect(() => {
        if (!isLoaded) {
            loadFavorites();
        }
    }, [isLoaded, loadFavorites]);

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Text style={styles.backButtonText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Favorites</Text>
                <Text style={styles.count}>{favorites.length} saved</Text>
            </View>

            <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
                {favorites.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyEmoji}>💜</Text>
                        <Text style={styles.emptyTitle}>No favorites yet</Text>
                        <Text style={styles.emptyText}>
                            Tap the heart on any venue to save it here
                        </Text>
                    </View>
                ) : (
                    favorites.map((venue, index) => (
                        <Animated.View
                            key={venue.id}
                            entering={FadeInDown.delay(index * 50).duration(300)}
                        >
                            <TouchableOpacity
                                style={styles.venueCard}
                                onPress={() => onSelectVenue(venue)}
                            >
                                <View style={styles.venueInfo}>
                                    <Text style={styles.venueName}>{venue.name}</Text>
                                    <Text style={styles.venueType}>
                                        {venue.tags.amenity || venue.tags.leisure || 'Venue'}
                                    </Text>
                                </View>

                                <TouchableOpacity
                                    style={styles.removeButton}
                                    onPress={() => removeFavorite(venue.id)}
                                >
                                    <Text style={styles.removeIcon}>✕</Text>
                                </TouchableOpacity>
                            </TouchableOpacity>
                        </Animated.View>
                    ))
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
    header: {
        padding: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backButton: {
        marginBottom: spacing.md,
    },
    backButtonText: {
        fontFamily: fonts.monoBold,
        fontSize: 12,
        color: colors.accent,
    },
    title: {
        fontFamily: fonts.displayBoldItalic,
        fontSize: 28,
        color: colors.textPrimary,
    },
    count: {
        fontFamily: fonts.monoRegular,
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: spacing.xs,
    },
    list: {
        flex: 1,
    },
    listContent: {
        padding: spacing.lg,
    },
    emptyState: {
        alignItems: 'center',
        paddingTop: 80,
    },
    emptyEmoji: {
        fontSize: 48,
        marginBottom: spacing.lg,
    },
    emptyTitle: {
        fontFamily: fonts.displayBoldItalic,
        fontSize: 24,
        color: colors.textPrimary,
        marginBottom: spacing.sm,
    },
    emptyText: {
        fontFamily: fonts.monoRegular,
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    venueCard: {
        backgroundColor: colors.surface,
        padding: spacing.lg,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    venueInfo: {
        flex: 1,
    },
    venueName: {
        fontFamily: fonts.monoBold,
        fontSize: 14,
        color: colors.textPrimary,
        textTransform: 'uppercase',
        marginBottom: spacing.xs,
    },
    venueType: {
        fontFamily: fonts.monoRegular,
        fontSize: 10,
        color: colors.accent,
        textTransform: 'uppercase',
    },
    removeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.surfaceElevated,
        justifyContent: 'center',
        alignItems: 'center',
    },
    removeIcon: {
        color: colors.textSecondary,
        fontSize: 14,
    },
});
