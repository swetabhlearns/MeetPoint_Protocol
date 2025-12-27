import { borderRadius, colors, fonts, shadows, spacing } from '@/constants/theme';
import { Venue } from '@/services/hybridVenues';
import { useFavoritesStore } from '@/store/useFavoritesStore';
import { addDateToCalendar } from '@/utils/calendar';
import { createShareMessage, generateMapsLink } from '@/utils/deepLinks';
import { calculateDistance, Coordinates, formatDistance } from '@/utils/midpoint';
import { BlurView } from 'expo-blur';
import React, { useState } from 'react';
import { Alert, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import OlaMap from './OlaMap';

interface VenueDetailSheetProps {
    venue: Venue;
    userLocation: Coordinates;
    onConfirm: () => void;
    onClose: () => void;
}

export default function VenueDetailSheet({
    venue,
    userLocation,
    onConfirm,
    onClose,
}: VenueDetailSheetProps) {
    const [isAddingToCalendar, setIsAddingToCalendar] = useState(false);
    const { isFavorite, toggleFavorite } = useFavoritesStore();
    const isVenueFavorite = isFavorite(venue.id);

    const distance = calculateDistance(userLocation, {
        latitude: venue.latitude,
        longitude: venue.longitude,
    });

    const handleShare = async () => {
        try {
            const message = createShareMessage(venue);
            await Share.share({
                message,
                title: `Let's meet at ${venue.name}`,
            });
        } catch (error) {
            console.error('Share failed:', error);
        }
    };

    const handleAddToCalendar = async () => {
        setIsAddingToCalendar(true);

        const dateTime = new Date();
        dateTime.setHours(dateTime.getHours() + 2); // Default to 2 hours from now

        const result = await addDateToCalendar({
            title: venue.name,
            location: generateMapsLink(venue),
            startDate: dateTime,
            notes: `Date at ${venue.name}\n\n${generateMapsLink(venue)}\n\nCreated by MeetPoint Protocol`,
        });

        setIsAddingToCalendar(false);

        if (result.success) {
            Alert.alert('Added to Calendar! 📅', 'Event created with reminders set.');
        } else {
            Alert.alert('Could not add to calendar', result.error || 'Unknown error');
        }
    };

    return (
        <>
            <BlurView
                intensity={95}
                tint="dark"
                style={[StyleSheet.absoluteFill, styles.backdrop]}
            />
            <View style={styles.container}>
                <BlurView
                    intensity={80}
                    tint="dark"
                    style={[StyleSheet.absoluteFill, styles.sheetBackground]}
                />
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {/* Mini Map */}
                    <View style={styles.mapContainer}>
                        <OlaMap
                            height="100%"
                            latitude={venue.latitude}
                            longitude={venue.longitude}
                            markers={[{
                                id: venue.id,
                                latitude: venue.latitude,
                                longitude: venue.longitude,
                                title: venue.name,
                                description: 'Selected Venue',
                                color: colors.accent,
                            }]}
                        />
                    </View>

                    {/* Header with Favorite */}
                    <View style={styles.headerRow}>
                        <Text style={styles.title}>{venue.name}</Text>
                        <TouchableOpacity onPress={() => toggleFavorite(venue)}>
                            <Text style={styles.favoriteIcon}>
                                {isVenueFavorite ? '💜' : '🤍'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Score and Distance */}
                    <View style={styles.metaRow}>
                        <View style={styles.metaItem}>
                            <Text style={styles.starIcon}>★</Text>
                            <Text style={styles.score}>{Math.round(venue.score)} Match Score</Text>
                        </View>
                        <Text style={styles.distance}>{formatDistance(distance)} away</Text>
                    </View>

                    {/* Tags */}
                    <View style={styles.tagsRow}>
                        <View style={styles.tag}>
                            <Text style={styles.tagText}>{venue.tags.amenity || 'Venue'}</Text>
                        </View>
                        {venue.tags.open_now === 'yes' && (
                            <View style={[styles.tag, styles.tagOpen]}>
                                <Text style={[styles.tagText, styles.tagTextOpen]}>OPEN NOW</Text>
                            </View>
                        )}
                        {venue.aiRecommended && (
                            <View style={[styles.tag, styles.tagAI]}>
                                <Text style={[styles.tagText, styles.tagTextAI]}>AI PICK</Text>
                            </View>
                        )}
                    </View>

                    {/* Address */}
                    <Text style={styles.address}>
                        {venue.tags['addr:full'] || 'Address details not available'}
                    </Text>

                    {/* Quick Actions */}
                    <View style={styles.quickActions}>
                        <TouchableOpacity style={styles.quickAction} onPress={handleShare}>
                            <Text style={styles.quickActionIcon}>📤</Text>
                            <Text style={styles.quickActionText}>Share</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.quickAction}
                            onPress={handleAddToCalendar}
                            disabled={isAddingToCalendar}
                        >
                            <Text style={styles.quickActionIcon}>📅</Text>
                            <Text style={styles.quickActionText}>
                                {isAddingToCalendar ? 'Adding...' : 'Calendar'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.quickAction}
                            onPress={() => toggleFavorite(venue)}
                        >
                            <Text style={styles.quickActionIcon}>{isVenueFavorite ? '💜' : '🤍'}</Text>
                            <Text style={styles.quickActionText}>
                                {isVenueFavorite ? 'Saved' : 'Save'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Actions */}
                    <View style={styles.actions}>
                        <TouchableOpacity style={styles.primaryButton} onPress={onConfirm}>
                            <Text style={styles.primaryButtonText}>LET'S MEET HERE</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                            <Text style={styles.closeButtonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        zIndex: 110,
        backgroundColor: 'rgba(0,0,0,0.85)',
    },
    container: {
        position: 'absolute',
        bottom: 90,
        left: 0,
        right: 0,
        marginHorizontal: spacing.lg,
        backgroundColor: colors.surfaceElevated,
        padding: spacing.xl,
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        borderColor: colors.border,
        maxHeight: '80%',
        zIndex: 120,
        ...shadows.modal,
    },
    sheetBackground: {
        borderRadius: borderRadius.xl,
        backgroundColor: 'rgba(20,20,20,0.7)',
    },
    scrollContent: {
        paddingBottom: 40,
    },
    mapContainer: {
        height: 150,
        marginBottom: spacing.lg,
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing.sm,
    },
    title: {
        fontFamily: fonts.monoBold,
        fontSize: 20,
        color: colors.textPrimary,
        textTransform: 'uppercase',
        flex: 1,
    },
    favoriteIcon: {
        fontSize: 24,
        marginLeft: spacing.md,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: spacing.lg,
    },
    starIcon: {
        color: colors.accent,
        fontSize: 16,
        marginRight: spacing.xs,
    },
    score: {
        fontFamily: fonts.monoRegular,
        fontSize: 12,
        color: colors.accent,
    },
    distance: {
        color: colors.textSecondary,
        fontFamily: fonts.monoRegular,
    },
    tagsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    tag: {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.sm,
        borderWidth: 1,
        borderColor: colors.border,
    },
    tagText: {
        fontFamily: fonts.monoBold,
        fontSize: 10,
        color: colors.textPrimary,
    },
    tagOpen: {
        borderColor: colors.accentGreen,
    },
    tagTextOpen: {
        color: colors.accentGreen,
    },
    tagAI: {
        borderColor: colors.accent,
        backgroundColor: 'rgba(224, 122, 95, 0.1)',
    },
    tagTextAI: {
        color: colors.accent,
    },
    address: {
        color: '#AAA',
        fontFamily: fonts.monoRegular,
        marginBottom: spacing.lg,
        lineHeight: 20,
    },
    quickActions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: spacing.lg,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: colors.border,
        marginBottom: spacing.lg,
    },
    quickAction: {
        alignItems: 'center',
        gap: spacing.xs,
    },
    quickActionIcon: {
        fontSize: 24,
    },
    quickActionText: {
        fontFamily: fonts.monoRegular,
        fontSize: 10,
        color: colors.textSecondary,
    },
    actions: {
        gap: spacing.md,
    },
    primaryButton: {
        backgroundColor: colors.accent,
        padding: spacing.lg,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
    },
    primaryButtonText: {
        fontFamily: fonts.monoBold,
        fontSize: 14,
        color: colors.surface,
        letterSpacing: 1,
    },
    closeButton: {
        padding: spacing.lg,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
    },
    closeButtonText: {
        fontFamily: fonts.monoRegular,
        fontSize: 14,
        color: colors.textSecondary,
    },
});
