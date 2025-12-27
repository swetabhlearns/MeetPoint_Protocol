/**
 * Supabase Auth Utilities
 * Using magic link auth (email-based, no password)
 * Free tier: 50,000 MAU
 */

import { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';

export interface AuthState {
    user: User | null;
    session: Session | null;
    isLoading: boolean;
}

/**
 * Sign in with magic link (email)
 */
export async function signInWithMagicLink(email: string): Promise<{ error: Error | null }> {
    try {
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: 'meetpointprotocol://auth/callback',
            },
        });

        if (error) {
            return { error };
        }

        return { error: null };
    } catch (error) {
        return { error: error as Error };
    }
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<{ error: Error | null }> {
    try {
        const { error } = await supabase.auth.signOut();
        return { error: error || null };
    } catch (error) {
        return { error: error as Error };
    }
}

/**
 * Get the current session
 */
export async function getSession(): Promise<Session | null> {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        return session;
    } catch {
        return null;
    }
}

/**
 * Get the current user
 */
export async function getCurrentUser(): Promise<User | null> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        return user;
    } catch {
        return null;
    }
}

/**
 * Listen to auth state changes
 */
export function onAuthStateChange(callback: (session: Session | null) => void) {
    return supabase.auth.onAuthStateChange((event, session) => {
        callback(session);
    });
}
