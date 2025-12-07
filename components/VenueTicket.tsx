import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

interface VenueTicketProps {
    venueName: string;
    time: string;
    address: string;
    mapLink: string;
}

export default function VenueTicket({ venueName, time, address, mapLink }: VenueTicketProps) {
    const viewShotRef = useRef<ViewShot>(null);

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
                        {/* Decorative barcode-like elements */}
                        {Array.from({ length: 20 }).map((_, i) => (
                            <View
                                key={i}
                                style={[
                                    styles.barcodeLine,
                                    { width: Math.random() > 0.5 ? 2 : 4, opacity: Math.random() > 0.3 ? 1 : 0.5 }
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
        padding: 20,
    },
    ticket: {
        backgroundColor: '#121212', // Card Surface
        width: 300,
        padding: 24,
        borderRadius: 0, // Sharp corners
        borderWidth: 1,
        borderColor: '#333',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 32,
    },
    brand: {
        color: '#EAEAEA',
        fontFamily: 'JetBrainsMono_700Bold',
        fontSize: 12,
        letterSpacing: 2,
    },
    dot: {
        width: 4,
        height: 4,
        backgroundColor: '#E07A5F', // Accent Warm
        marginHorizontal: 8,
    },
    protocol: {
        color: '#666',
        fontFamily: 'JetBrainsMono_400Regular',
        fontSize: 12,
        letterSpacing: 2,
    },
    content: {
        gap: 24,
    },
    venueName: {
        color: '#EAEAEA',
        fontFamily: 'PlayfairDisplay_700Bold_Italic',
        fontSize: 32,
        lineHeight: 36,
    },
    details: {
        gap: 16,
        borderTopWidth: 1,
        borderTopColor: '#333',
        paddingTop: 16,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    label: {
        color: '#666',
        fontFamily: 'JetBrainsMono_400Regular',
        fontSize: 10,
        textTransform: 'uppercase',
    },
    valueMono: {
        color: '#E07A5F',
        fontFamily: 'JetBrainsMono_400Regular',
        fontSize: 12,
        textAlign: 'right',
        maxWidth: '70%',
    },
    barcodeStrip: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        height: 24,
        marginTop: 16,
        alignItems: 'flex-end',
    },
    barcodeLine: {
        backgroundColor: '#333',
        height: '100%',
    },
    button: {
        marginTop: 20,
        backgroundColor: '#EeaeAe', // Muted text or accent
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 0,
        borderWidth: 1,
        borderColor: '#EeaeAe',
    },
    buttonText: {
        fontFamily: 'JetBrainsMono_700Bold',
        fontSize: 12,
        color: '#121212',
    },
});
