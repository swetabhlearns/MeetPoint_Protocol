/**
 * API Key Validation Utility
 * Validates required API keys at runtime and provides user feedback
 */

export interface APIKeyStatus {
    isValid: boolean;
    missingKeys: string[];
}

const REQUIRED_KEYS = [
    { key: 'EXPO_PUBLIC_SUPABASE_URL', name: 'Supabase URL' },
    { key: 'EXPO_PUBLIC_SUPABASE_ANON_KEY', name: 'Supabase Key' },
    { key: 'EXPO_PUBLIC_OLA_MAPS_API_KEY', name: 'Ola Maps' },
] as const;

const OPTIONAL_KEYS = [
    { key: 'EXPO_PUBLIC_GROQ_API_KEY', name: 'Groq AI' },
    { key: 'EXPO_PUBLIC_GEMINI_API_KEY', name: 'Gemini AI' },
] as const;

/**
 * Check if all required API keys are present
 */
export function validateAPIKeys(): APIKeyStatus {
    const missingKeys: string[] = [];

    for (const { key, name } of REQUIRED_KEYS) {
        const value = process.env[key];
        if (!value || value.trim() === '') {
            missingKeys.push(name);
        }
    }

    return {
        isValid: missingKeys.length === 0,
        missingKeys,
    };
}

/**
 * Check if a specific optional key is available
 */
export function hasAPIKey(keyName: keyof typeof process.env): boolean {
    const value = process.env[keyName];
    return Boolean(value && value.trim() !== '');
}

/**
 * Get a formatted error message for missing keys
 */
export function getMissingKeysMessage(status: APIKeyStatus): string {
    if (status.isValid) return '';

    return `Missing API keys: ${status.missingKeys.join(', ')}. Please check your .env file.`;
}

/**
 * Check if AI features are available
 */
export function isAIAvailable(): boolean {
    return hasAPIKey('EXPO_PUBLIC_GROQ_API_KEY') || hasAPIKey('EXPO_PUBLIC_GEMINI_API_KEY');
}

/**
 * Check if maps are available
 */
export function isMapsAvailable(): boolean {
    return hasAPIKey('EXPO_PUBLIC_OLA_MAPS_API_KEY');
}
