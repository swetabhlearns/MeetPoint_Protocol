/**
 * Favorites Store
 * Uses AsyncStorage for local persistence
 * 100% Free - device storage
 */

import { Venue } from '@/services/hybridVenues';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const FAVORITES_KEY = 'meetpoint_favorites';

interface FavoritesState {
    favorites: Venue[];
    isLoaded: boolean;

    // Actions
    loadFavorites: () => Promise<void>;
    addFavorite: (venue: Venue) => Promise<void>;
    removeFavorite: (venueId: string) => Promise<void>;
    isFavorite: (venueId: string) => boolean;
    toggleFavorite: (venue: Venue) => Promise<void>;
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
    favorites: [],
    isLoaded: false,

    loadFavorites: async () => {
        try {
            const stored = await AsyncStorage.getItem(FAVORITES_KEY);
            if (stored) {
                const favorites = JSON.parse(stored) as Venue[];
                set({ favorites, isLoaded: true });
            } else {
                set({ isLoaded: true });
            }
        } catch (error) {
            console.error('Failed to load favorites:', error);
            set({ isLoaded: true });
        }
    },

    addFavorite: async (venue: Venue) => {
        try {
            const current = get().favorites;
            if (current.some(v => v.id === venue.id)) return;

            const updated = [...current, venue];
            await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
            set({ favorites: updated });
        } catch (error) {
            console.error('Failed to add favorite:', error);
        }
    },

    removeFavorite: async (venueId: string) => {
        try {
            const current = get().favorites;
            const updated = current.filter(v => v.id !== venueId);
            await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
            set({ favorites: updated });
        } catch (error) {
            console.error('Failed to remove favorite:', error);
        }
    },

    isFavorite: (venueId: string) => {
        return get().favorites.some(v => v.id === venueId);
    },

    toggleFavorite: async (venue: Venue) => {
        const { isFavorite, addFavorite, removeFavorite } = get();
        if (isFavorite(venue.id)) {
            await removeFavorite(venue.id);
        } else {
            await addFavorite(venue);
        }
    },
}));
