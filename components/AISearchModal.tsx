import { borderRadius, colors, fonts, spacing } from '@/constants/theme';
import { BlurView } from 'expo-blur';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface AISearchModalProps {
    visible: boolean;
    query: string;
    isThinking: boolean;
    onQueryChange: (text: string) => void;
    onSearch: () => void;
    onClose: () => void;
}

export default function AISearchModal({
    visible,
    query,
    isThinking,
    onQueryChange,
    onSearch,
    onClose,
}: AISearchModalProps) {
    if (!visible) return null;

    return (
        <View style={styles.overlay}>
            <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={styles.content}>
                <Text style={styles.title}>Magic Search 🪄</Text>
                <Text style={styles.subtitle}>
                    "Find a romantic cafe between here and Lalpur serving vegan food..."
                </Text>

                <TextInput
                    style={styles.input}
                    placeholder="Ask for anything..."
                    placeholderTextColor={colors.textSecondary}
                    value={query}
                    onChangeText={onQueryChange}
                    multiline
                    autoFocus
                />

                <TouchableOpacity
                    style={styles.searchButton}
                    onPress={onSearch}
                    disabled={isThinking}
                >
                    {isThinking ? (
                        <ActivityIndicator color={colors.surface} />
                    ) : (
                        <Text style={styles.searchButtonText}>✨ MAGIC SEARCH</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                    <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        padding: spacing.xl,
        zIndex: 200,
    },
    content: {
        backgroundColor: colors.surface,
        padding: spacing.xxl,
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        borderColor: colors.border,
    },
    title: {
        fontFamily: fonts.displayBoldItalic,
        fontSize: 32,
        color: colors.textPrimary,
        marginBottom: spacing.sm,
        textAlign: 'center',
    },
    subtitle: {
        fontFamily: fonts.monoRegular,
        fontSize: 12,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: spacing.xxl,
        fontStyle: 'italic',
    },
    input: {
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        color: colors.textPrimary,
        fontFamily: fonts.monoRegular,
        fontSize: 16,
        height: 100,
        textAlignVertical: 'top',
        marginBottom: spacing.xxl,
    },
    searchButton: {
        backgroundColor: colors.accentCyan,
        padding: spacing.lg,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    searchButtonText: {
        fontFamily: fonts.monoBold,
        fontSize: 14,
        color: colors.surface,
        letterSpacing: 1,
    },
    closeButton: {
        padding: spacing.md,
        alignItems: 'center',
    },
    closeButtonText: {
        fontFamily: fonts.monoRegular,
        color: colors.textSecondary,
    },
});
