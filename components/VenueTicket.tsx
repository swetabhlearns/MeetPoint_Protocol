import { colors, fonts, spacing } from '@/constants/theme';
import * as Sharing from 'expo-sharing';
import React, { useMemo, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ViewShot, { captureRef } from 'react-native-view-shot';

interface VenueTicketProps {
    venueName: string;
    time: string;
    address: string;
    mapLink: string;
}

// Simple hash function for deterministic barcode
function hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
}

// Generate deterministic barcode pattern based on venue name
function generateBarcodePattern(venueName: string): { width: number; opacity: number }[] {
    const hash = hashString(venueName);
    const pattern: { width: number; opacity: number }[] = [];

    for (let i = 0; i < 20; i++) {
        // Use hash bits to determine width and opacity
        const bit1 = (hash >> (i * 2)) & 1;
        const bit2 = (hash >> (i * 2 + 1)) & 1;

        pattern.push({
            width: bit1 ? 4 : 2,
            opacity: bit2 ? 1 : 0.5,
        });
    }

    return pattern;
}

export default function VenueTicket({ venueName, time, address, mapLink }: VenueTicketProps) {
    const viewShotRef = useRef<ViewShot>(null);

    // Generate deterministic barcode pattern
    const barcodePattern = useMemo(() => generateBarcodePattern(venueName), [venueName]);

    const shareTicket = async () => {
        try {
            if (viewShotRef.current) {
                // @ts-ignore: capture method exists on ref
                const uri = await captureRef(viewShotRef, {
                    format: 'png',
                    quality: 0.9,
                    result: 'tmpfile',
                });

                if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(uri);
                } else {
                    console.log('Sharing not available, URI:', uri);
                }
            }
        } catch (error) {
            console.error('Error generating ticket:', error);
        }
    };

    return (
        <View style={styles.container}>
            <ViewShot ref={viewShotRef} style={styles.ticket} options={{ format: 'png', quality: 0.9 }}>
                <View style={styles.header}>
                    <Text style={styles.brand}>MEETPOINT</Text>
                    <View style={styles.dot} />
                    <Text style={styles.protocol}>PROTOCOL</Text>
                </View>

                <View style={styles.content}>
                    <Text style={styles.venueName}>{venueName}</Text>

                    <View style={styles.details}>
                        <View style={styles.row}>
                            <Text style={styles.label}>TIME</Text>
                            <Text style={styles.valueMono}>{time}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>LOC</Text>
                            <Text style={styles.valueMono} numberOfLines={2}>{address}</Text>
                        </View>
                    </View>

                    <View style={styles.barcodeStrip}>
                        {barcodePattern.map((bar, i) => (
                            <View
                                key={i}
                                style={[
                                    styles.barcodeLine,
                                    { width: bar.width, opacity: bar.opacity }
                                ]}
                            />
                        ))}
                    </View>
                </View>
            </ViewShot>

            <TouchableOpacity onPress={shareTicket} style={styles.button}>
                <Text style={styles.buttonText}>SHARE TICKET</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xl,
    },
    ticket: {
        backgroundColor: colors.surface,
        width: 300,
        padding: spacing.xxl,
        borderRadius: 0,
        borderWidth: 1,
        borderColor: colors.border,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.xxxl,
    },
    brand: {
        color: colors.textPrimary,
        fontFamily: fonts.monoBold,
        fontSize: 12,
        letterSpacing: 2,
    },
    dot: {
        width: 4,
        height: 4,
        backgroundColor: colors.accent,
        marginHorizontal: spacing.sm,
    },
    protocol: {
        color: colors.textSecondary,
        fontFamily: fonts.monoRegular,
        fontSize: 12,
        letterSpacing: 2,
    },
    content: {
        gap: spacing.xxl,
    },
    venueName: {
        color: colors.textPrimary,
        fontFamily: fonts.displayBoldItalic,
        fontSize: 32,
        lineHeight: 36,
    },
    details: {
        gap: spacing.lg,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingTop: spacing.lg,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    label: {
        color: colors.textSecondary,
        fontFamily: fonts.monoRegular,
        fontSize: 10,
        textTransform: 'uppercase',
    },
    valueMono: {
        color: colors.accent,
        fontFamily: fonts.monoRegular,
        fontSize: 12,
        textAlign: 'right',
        maxWidth: '70%',
    },
    barcodeStrip: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        height: 24,
        marginTop: spacing.lg,
        alignItems: 'flex-end',
    },
    barcodeLine: {
        backgroundColor: colors.border,
        height: '100%',
    },
    button: {
        marginTop: spacing.xl,
        backgroundColor: colors.textPrimary,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xxl,
        borderRadius: 0,
        borderWidth: 1,
        borderColor: colors.textPrimary,
    },
    buttonText: {
        fontFamily: fonts.monoBold,
        fontSize: 12,
        color: colors.surface,
    },
});
