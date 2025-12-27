import { borderRadius, colors, fonts, spacing } from '@/constants/theme';
import { DateRecord } from '@/services/dates';
import { supabase } from '@/utils/supabase';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface DateHistoryScreenProps {
    onBack: () => void;
}

export default function DateHistoryScreen({ onBack }: DateHistoryScreenProps) {
    const insets = useSafeAreaInsets();
    const [dates, setDates] = useState<DateRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadDates();
    }, []);

    const loadDates = async () => {
        try {
            const { data, error } = await supabase
                .from('dates')
                .select('*')
                .order('meetup_time', { ascending: false })
                .limit(50);

            if (error) {
                console.error('Failed to load dates:', error);
                return;
            }

            setDates(data || []);
        } catch (error) {
            console.error('Error loading dates:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
        });
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed': return colors.accentGreen;
            case 'cancelled': return colors.accentRed;
            case 'completed': return colors.textSecondary;
            default: return colors.accent;
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Text style={styles.backButtonText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Date History</Text>
                <Text style={styles.count}>{dates.length} dates</Text>
            </View>

            {isLoading ? (
                <View style={styles.loading}>
                    <ActivityIndicator color={colors.accent} />
                </View>
            ) : (
                <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
                    {dates.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyEmoji}>📅</Text>
                            <Text style={styles.emptyTitle}>No dates yet</Text>
                            <Text style={styles.emptyText}>
                                Confirm a venue to see it here
                            </Text>
                        </View>
                    ) : (
                        dates.map((dateRecord, index) => (
                            <Animated.View
                                key={dateRecord.id}
                                entering={FadeInDown.delay(index * 50).duration(300)}
                            >
                                <View style={styles.dateCard}>
                                    <View style={styles.dateHeader}>
                                        <Text style={styles.venueName}>
                                            {dateRecord.venue_details?.name || 'Unknown Venue'}
                                        </Text>
                                        <View style={[styles.statusBadge, { borderColor: getStatusColor(dateRecord.status) }]}>
                                            <Text style={[styles.statusText, { color: getStatusColor(dateRecord.status) }]}>
                                                {dateRecord.status.toUpperCase()}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.dateDetails}>
                                        <Text style={styles.dateText}>
                                            📅 {formatDate(dateRecord.meetup_time)}
                                        </Text>
                                        <Text style={styles.timeText}>
                                            🕐 {formatTime(dateRecord.meetup_time)}
                                        </Text>
                                    </View>

                                    {dateRecord.venue_details?.tags?.amenity && (
                                        <Text style={styles.venueType}>
                                            {dateRecord.venue_details.tags.amenity}
                                        </Text>
                                    )}
                                </View>
                            </Animated.View>
                        ))
                    )}
                </ScrollView>
            )}
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
    loading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
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
    dateCard: {
        backgroundColor: colors.surface,
        padding: spacing.lg,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: spacing.md,
    },
    dateHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing.md,
    },
    venueName: {
        fontFamily: fonts.monoBold,
        fontSize: 14,
        color: colors.textPrimary,
        textTransform: 'uppercase',
        flex: 1,
    },
    statusBadge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: borderRadius.sm,
        borderWidth: 1,
    },
    statusText: {
        fontFamily: fonts.monoBold,
        fontSize: 8,
        letterSpacing: 1,
    },
    dateDetails: {
        flexDirection: 'row',
        gap: spacing.lg,
        marginBottom: spacing.sm,
    },
    dateText: {
        fontFamily: fonts.monoRegular,
        fontSize: 12,
        color: colors.textPrimary,
    },
    timeText: {
        fontFamily: fonts.monoRegular,
        fontSize: 12,
        color: colors.textPrimary,
    },
    venueType: {
        fontFamily: fonts.monoRegular,
        fontSize: 10,
        color: colors.accent,
        textTransform: 'uppercase',
    },
});
