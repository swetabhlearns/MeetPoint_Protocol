import { Venue, VenueFilters } from '@/services/hybridVenues';
import { Coordinates } from '@/utils/midpoint';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

type SearchMode = 'midpoint' | 'closer_to_me' | 'closer_to_them';

interface AppState {
    // Location State
    myLocation: Coordinates | null;
    myLocationName: string;
    theirLocation: Coordinates | null;
    theirLocationName: string;

    // Search State
    searchMode: SearchMode;
    filters: VenueFilters;

    // Venue State
    venues: Venue[];
    selectedVenue: Venue | null;
    isLoading: boolean;
    isEnhancingWithAI: boolean;
    error: string | null;

    // UI State
    showLocationInput: boolean;
    showAIModal: boolean;
    ticketMode: boolean;

    // Actions
    setMyLocation: (coords: Coordinates | null, name?: string) => void;
    setTheirLocation: (coords: Coordinates | null, name?: string) => void;
    setSearchMode: (mode: SearchMode) => void;
    setFilters: (filters: VenueFilters) => void;
    setVenues: (venues: Venue[]) => void;
    setSelectedVenue: (venue: Venue | null) => void;
    setLoading: (loading: boolean) => void;
    setEnhancingWithAI: (enhancing: boolean) => void;
    setError: (error: string | null) => void;
    setShowLocationInput: (show: boolean) => void;
    setShowAIModal: (show: boolean) => void;
    setTicketMode: (mode: boolean) => void;

    // Cache helpers
    getCachedVenues: (key: string) => Promise<Venue[] | null>;
    setCachedVenues: (key: string, venues: Venue[]) => Promise<void>;
}

const CACHE_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

export const useAppStore = create<AppState>((set, get) => ({
    // Initial State
    myLocation: null,
    myLocationName: 'Detecting...',
    theirLocation: null,
    theirLocationName: '',
    searchMode: 'midpoint',
    filters: { types: [], diet: 'any', vibe: [] },
    venues: [],
    selectedVenue: null,
    isLoading: false,
    isEnhancingWithAI: false,
    error: null,
    showLocationInput: true,
    showAIModal: false,
    ticketMode: false,

    // Actions
    setMyLocation: (coords, name) => set({
        myLocation: coords,
        ...(name && { myLocationName: name })
    }),

    setTheirLocation: (coords, name) => set({
        theirLocation: coords,
        ...(name && { theirLocationName: name })
    }),

    setSearchMode: (mode) => set({ searchMode: mode }),

    setFilters: (filters) => set({ filters }),

    setVenues: (venues) => set({ venues }),

    setSelectedVenue: (venue) => set({ selectedVenue: venue }),

    setLoading: (loading) => set({ isLoading: loading }),

    setEnhancingWithAI: (enhancing) => set({ isEnhancingWithAI: enhancing }),

    setError: (error) => set({ error }),

    setShowLocationInput: (show) => set({ showLocationInput: show }),

    setShowAIModal: (show) => set({ showAIModal: show }),

    setTicketMode: (mode) => set({ ticketMode: mode }),

    // Cache helpers
    getCachedVenues: async (key: string) => {
        try {
            const cached = await AsyncStorage.getItem(`venues_${key}`);
            if (cached) {
                const { venues, timestamp } = JSON.parse(cached);
                if (Date.now() - timestamp < CACHE_EXPIRY_MS) {
                    return venues as Venue[];
                }
            }
            return null;
        } catch {
            return null;
        }
    },

    setCachedVenues: async (key: string, venues: Venue[]) => {
        try {
            await AsyncStorage.setItem(
                `venues_${key}`,
                JSON.stringify({ venues, timestamp: Date.now() })
            );
        } catch {
            // Ignore cache write errors
        }
    },
}));

// Selector hooks for performance
export const useMyLocation = () => useAppStore((s) => s.myLocation);
export const useTheirLocation = () => useAppStore((s) => s.theirLocation);
export const useVenues = () => useAppStore((s) => s.venues);
export const useSelectedVenue = () => useAppStore((s) => s.selectedVenue);
export const useIsLoading = () => useAppStore((s) => s.isLoading);
