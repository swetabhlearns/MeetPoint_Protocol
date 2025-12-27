import VenueTicket from '@/components/VenueTicket';
import { borderRadius, colors, fonts, spacing } from '@/constants/theme';
import DateHistoryScreen from '@/screens/DateHistoryScreen';
import FavoritesScreen from '@/screens/FavoritesScreen';
import LocationInputScreen from '@/screens/LocationInputScreen';
import VenueListScreen from '@/screens/VenueListScreen';
import { reverseGeocode } from '@/services/geocoding';
import { useAppStore } from '@/store/useAppStore';
import { useFavoritesStore } from '@/store/useFavoritesStore';
import { getSession, onAuthStateChange } from '@/utils/auth';
import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ScreenType = 'locationInput' | 'venueList' | 'favorites' | 'history' | 'ticket';

export default function TabOneScreen() {
  const insets = useSafeAreaInsets();
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('locationInput');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null); // null = loading
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const { loadFavorites } = useFavoritesStore();

  const {
    myLocation,
    selectedVenue,
    setMyLocation,
    setSelectedVenue,
    showLocationInput,
    setShowLocationInput,
  } = useAppStore();

  // Check auth on mount
  useEffect(() => {
    getSession().then(session => {
      setIsAuthenticated(!!session);
      setUserEmail(session?.user?.email || null);
    });

    const { data: { subscription } } = onAuthStateChange((session) => {
      setIsAuthenticated(!!session);
      setUserEmail(session?.user?.email || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load favorites on mount
  useEffect(() => {
    if (isAuthenticated) {
      loadFavorites();
    }
  }, [isAuthenticated]);

  // Initialize user location on mount
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          const ranchiLocation = { latitude: 23.3441, longitude: 85.3096 };
          setMyLocation(ranchiLocation, 'Ranchi, Jharkhand, India');
          return;
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const coords = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };

        const placeName = await reverseGeocode(coords.latitude, coords.longitude);
        setMyLocation(coords, placeName || 'Current Location');
      } catch (error) {
        console.log('Location error:', error);
        setMyLocation({ latitude: 23.3441, longitude: 85.3096 }, 'Ranchi, Jharkhand, India');
      }
    })();
  }, []);

  // Sync with legacy showLocationInput state
  useEffect(() => {
    if (showLocationInput && currentScreen !== 'locationInput') {
      setCurrentScreen('locationInput');
    }
  }, [showLocationInput]);

  // Auth Loading State
  // TEMPORARILY DISABLED FOR DEBUGGING
  // if (isAuthenticated === null) {
  //   return (
  //     <View style={styles.authLoading}>
  //       <ActivityIndicator size="large" color={colors.accent} />
  //       <Text style={styles.authLoadingText}>Checking authentication...</Text>
  //     </View>
  //   );
  // }

  // Not authenticated - show auth screen
  // TEMPORARILY DISABLED FOR DEBUGGING
  // if (!isAuthenticated) {
  //   return <AuthScreen />;
  // }

  // Ticket Screen
  if (currentScreen === 'ticket' && selectedVenue) {
    return (
      <View style={styles.container}>
        <VenueTicket
          venueName={selectedVenue.name}
          time={new Date().toLocaleTimeString()}
          address={`${selectedVenue.latitude.toFixed(4)}, ${selectedVenue.longitude.toFixed(4)}`}
          mapLink={`https://www.openstreetmap.org/?mlat=${selectedVenue.latitude}&mlon=${selectedVenue.longitude}`}
        />
        <TouchableOpacity
          style={[styles.backButton, { top: insets.top + 10 }]}
          onPress={() => setCurrentScreen('venueList')}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Favorites Screen
  if (currentScreen === 'favorites') {
    return (
      <FavoritesScreen
        onBack={() => setCurrentScreen('locationInput')}
        onSelectVenue={(venue) => {
          setSelectedVenue(venue);
          setCurrentScreen('venueList');
        }}
      />
    );
  }

  // Date History Screen
  if (currentScreen === 'history') {
    return (
      <DateHistoryScreen onBack={() => setCurrentScreen('locationInput')} />
    );
  }


  // Location Input Screen
  if (currentScreen === 'locationInput' || showLocationInput) {
    return (
      <View style={styles.container}>
        <LocationInputScreen
          onFindVenues={() => {
            setShowLocationInput(false);
            setCurrentScreen('venueList');
          }}
        />

        {/* Bottom Navigation */}
        <View style={[styles.bottomNav, { paddingBottom: insets.bottom + spacing.md }]}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => setCurrentScreen('favorites')}
          >
            <Text style={styles.navIcon}>💜</Text>
            <Text style={styles.navLabel}>Favorites</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navButton}
            onPress={() => setCurrentScreen('history')}
          >
            <Text style={styles.navIcon}>📅</Text>
            <Text style={styles.navLabel}>History</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navButton}
            onPress={async () => {
              const { signOut } = await import('@/utils/auth');
              await signOut();
            }}
          >
            <Text style={styles.navIcon}>🚪</Text>
            <Text style={styles.navLabel}>Logout</Text>
          </TouchableOpacity>


        </View>
      </View>
    );
  }

  // Venue List Screen
  return (
    <VenueListScreen
      onBack={() => {
        setShowLocationInput(true);
        setCurrentScreen('locationInput');
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  backButton: {
    position: 'absolute',
    left: 20,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
  },
  backButtonText: {
    fontFamily: fonts.monoBold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  navButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  navIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  navLabel: {
    fontFamily: fonts.monoRegular,
    fontSize: 10,
    color: colors.textSecondary,
  },
  authLoading: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
  },
  authLoadingText: {
    fontFamily: fonts.monoRegular,
    fontSize: 14,
    color: colors.textSecondary,
  },
});
