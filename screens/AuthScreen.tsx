import { borderRadius, colors, fonts, spacing } from '@/constants/theme';
import { signInWithMagicLink } from '@/utils/auth';
import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface AuthScreenProps {
    onSkip?: () => void;
}

export default function AuthScreen({ onSkip }: AuthScreenProps) {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSent, setIsSent] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        if (!email.includes('@')) {
            setError('Please enter a valid email');
            return;
        }

        setIsLoading(true);
        setError(null);

        const { error: authError } = await signInWithMagicLink(email);

        setIsLoading(false);

        if (authError) {
            setError(authError.message);
        } else {
            setIsSent(true);
        }
    };

    if (isSent) {
        return (
            <View style={styles.container}>
                <View style={styles.content}>
                    <Text style={styles.emoji}>✉️</Text>
                    <Text style={styles.title}>Check your email</Text>
                    <Text style={styles.subtitle}>
                        We sent a magic link to{'\n'}
                        <Text style={styles.emailHighlight}>{email}</Text>
                    </Text>
                    <Text style={styles.hint}>
                        Click the link in the email to sign in
                    </Text>

                    <TouchableOpacity style={styles.secondaryButton} onPress={() => setIsSent(false)}>
                        <Text style={styles.secondaryButtonText}>Use different email</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={styles.content}>
                <Text style={styles.title}>MeetPoint</Text>
                <Text style={styles.subtitle}>Sign in to save your dates and favorites</Text>

                <TextInput
                    style={styles.input}
                    placeholder="your@email.com"
                    placeholderTextColor={colors.textSecondary}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                />

                {error && <Text style={styles.error}>{error}</Text>}

                <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={handleSubmit}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator color={colors.surface} />
                    ) : (
                        <Text style={styles.primaryButtonText}>Send Magic Link</Text>
                    )}
                </TouchableOpacity>

                {onSkip && (
                    <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
                        <Text style={styles.skipButtonText}>Skip for now</Text>
                    </TouchableOpacity>
                )}

                <Text style={styles.privacy}>
                    No password required. We'll send you a secure link.
                </Text>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        justifyContent: 'center',
    },
    content: {
        padding: spacing.xxl,
        alignItems: 'center',
    },
    emoji: {
        fontSize: 64,
        marginBottom: spacing.lg,
    },
    title: {
        fontFamily: fonts.displayBoldItalic,
        fontSize: 36,
        color: colors.textPrimary,
        marginBottom: spacing.sm,
        textAlign: 'center',
    },
    subtitle: {
        fontFamily: fonts.monoRegular,
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: spacing.xxxl,
        lineHeight: 22,
    },
    emailHighlight: {
        color: colors.accent,
        fontFamily: fonts.monoBold,
    },
    hint: {
        fontFamily: fonts.monoRegular,
        fontSize: 12,
        color: colors.textSecondary,
        textAlign: 'center',
        marginTop: spacing.lg,
    },
    input: {
        width: '100%',
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.md,
        padding: spacing.lg,
        fontFamily: fonts.monoRegular,
        fontSize: 16,
        color: colors.textPrimary,
        marginBottom: spacing.lg,
        textAlign: 'center',
    },
    error: {
        fontFamily: fonts.monoRegular,
        fontSize: 12,
        color: colors.accentRed,
        marginBottom: spacing.lg,
    },
    primaryButton: {
        width: '100%',
        backgroundColor: colors.accent,
        padding: spacing.lg,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    primaryButtonText: {
        fontFamily: fonts.monoBold,
        fontSize: 14,
        color: colors.surface,
        letterSpacing: 1,
    },
    secondaryButton: {
        marginTop: spacing.xxl,
        padding: spacing.md,
    },
    secondaryButtonText: {
        fontFamily: fonts.monoRegular,
        fontSize: 14,
        color: colors.accent,
    },
    skipButton: {
        padding: spacing.md,
    },
    skipButtonText: {
        fontFamily: fonts.monoRegular,
        fontSize: 14,
        color: colors.textSecondary,
    },
    privacy: {
        fontFamily: fonts.monoRegular,
        fontSize: 10,
        color: colors.textMuted,
        textAlign: 'center',
        marginTop: spacing.xxl,
    },
});
