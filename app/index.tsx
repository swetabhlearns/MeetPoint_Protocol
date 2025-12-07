import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import * as Location from 'expo-location';
import { fetchVenuesInBoundingBox, Venue, VenueFilters } from '@/services/overpass';
import VenueTicket from '@/components/VenueTicket';
import { createDate } from '@/services/dates';
import { calculateSearchLocation, Coordinates, calculateDistance, formatDistance } from '@/utils/midpoint';
import { geocodeAddress, reverseGeocode } from '@/services/geocoding';
import Animated, { FadeInDown } from 'react-native-reanimated';
import OlaMap from '@/components/OlaMap';
import { AISearchResult } from '@/services/aiSearch';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type SearchMode = 'midpoint' | 'closer_to_me' | 'closer_to_them';

export default function TabOneScreen() {
  const insets = useSafeAreaInsets();
  const [myLocation, setMyLocation] = useState<Coordinates | null>(null);
  const [theirLocation, setTheirLocation] = useState<Coordinates | null>(null);
  const [searchMode, setSearchMode] = useState<SearchMode>('midpoint');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [ticketMode, setTicketMode] = useState(false);
  const [showLocationInput, setShowLocationInput] = useState(true);

  const [myLocationName, setMyLocationName] = useState<string>('Detecting...');
  const [theirLocationName, setTheirLocationName] = useState<string>('');

  const [filters, setFilters] = useState<VenueFilters>({
    types: [],
    diet: 'any',
    vibe: [],
  });

  // AI Search State
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiQuery, setAiQuery] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);

  const handleAISearch = async () => {
    if (!aiQuery.trim()) return;
    setIsAiThinking(true);

    try {
      const { parseNaturalLanguageQuery } = await import('@/services/aiSearch');
      const { getOlaPlaceDetails, searchOlaMapsAutocomplete } = await import('@/services/olaMaps');

      const result = await parseNaturalLanguageQuery(aiQuery);
      console.log('AI Parsed Result:', result);

      if (result) {
        // 1. Update Filters
        const newTypes = (result.venueTypes || []) as ('cafe' | 'bar' | 'restaurant' | 'pub' | 'park')[];
        const newVibe = (result.vibe || []) as ('aesthetic' | 'cozy' | 'upscale' | 'casual')[];

        setFilters({
          types: newTypes,
          diet: result.diet || 'any',
          vibe: newVibe
        });

        // 2. Update Search Mode
        if (result.searchMode) setSearchMode(result.searchMode);

        // 3. Handle Location
        if (result.theirLocationName) {
          // Search for the location name
          const suggestions = await searchOlaMapsAutocomplete(result.theirLocationName, myLocation?.latitude, myLocation?.longitude);
          if (suggestions && suggestions.length > 0) {
            const placeId = suggestions[0].place_id;
            const details = await getOlaPlaceDetails(placeId);
            if (details) {
              setTheirLocation({ latitude: details.lat, longitude: details.lng });
              setTheirLocationName(details.name);
              setShowLocationInput(false);
            }
          }
        }

        setShowAIModal(false);
        setAiQuery('');
      }
    } catch (e) {
      console.error(e);
      alert('AI could not understand that. Try again!');
    } finally {
      setIsAiThinking(false);
    }
  };





  const [theirLatInput, setTheirLatInput] = useState('');
  const [theirLonInput, setTheirLonInput] = useState('');
  const [addressInput, setAddressInput] = useState('');
  const [geocoding, setGeocoding] = useState(false);

  // State for Ola Maps Autocomplete
  const [myLocationInput, setMyLocationInput] = useState('');
  const [theirLocationInput, setTheirLocationInput] = useState('');
  const [mySuggestions, setMySuggestions] = useState<any[]>([]);
  const [theirSuggestions, setTheirSuggestions] = useState<any[]>([]);
  const [isEditingMyLoc, setIsEditingMyLoc] = useState(false);
  const [isEditingTheirLoc, setIsEditingTheirLoc] = useState(false);

  const handleConfirmDate = async () => {
    if (selectedVenue) {
      await createDate(selectedVenue, new Date());
      setTicketMode(true);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          const ranchiLocation = { latitude: 23.3441, longitude: 85.3096 };
          setMyLocation(ranchiLocation);
          setMyLocationName('Ranchi, Jharkhand, India');
          return;
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const coords = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        setMyLocation(coords);

        // Reverse geocode to get name
        const placeName = await reverseGeocode(coords.latitude, coords.longitude);
        setMyLocationName(placeName || 'Current Location');
      } catch (error) {
        console.log('Location error:', error);
        // Default to Ranchi without error message
        setMyLocation({ latitude: 23.3441, longitude: 85.3096 });
        setMyLocationName('Ranchi, Jharkhand, India');
      }
    })();
  }, []);

  // Handle Input Changes for Autocomplete
  const handleMyLocChange = async (text: string) => {
    setMyLocationInput(text);
    if (text.length > 2) {
      const { searchOlaMapsAutocomplete } = await import('@/services/olaMaps');
      const results = await searchOlaMapsAutocomplete(text, myLocation?.latitude, myLocation?.longitude);
      setMySuggestions(results);
    } else {
      setMySuggestions([]);
    }
  };

  const handleTheirLocChange = async (text: string) => {
    setTheirLocationInput(text);
    if (text.length > 2) {
      const { searchOlaMapsAutocomplete } = await import('@/services/olaMaps');
      const results = await searchOlaMapsAutocomplete(text, myLocation?.latitude, myLocation?.longitude);
      setTheirSuggestions(results);
    } else {
      setTheirSuggestions([]);
    }
  };

  // Handle Selection
  const selectMyLocation = async (placeId: string, description: string) => {
    const { getOlaPlaceDetails } = await import('@/services/olaMaps');
    const details = await getOlaPlaceDetails(placeId);

    if (details) {
      setMyLocation({ latitude: details.lat, longitude: details.lng });
      setMyLocationName(details.name);
      setMyLocationInput('');
      setMySuggestions([]);
      setIsEditingMyLoc(false);
    }
  };

  const selectTheirLocation = async (placeId: string, description: string) => {
    const { getOlaPlaceDetails } = await import('@/services/olaMaps');
    const details = await getOlaPlaceDetails(placeId);

    if (details) {
      setTheirLocation({ latitude: details.lat, longitude: details.lng });
      setTheirLocationName(details.name);
      setTheirLocationInput('');
      setTheirSuggestions([]);
      setIsEditingTheirLoc(false);
    }
  };

  // Use GPS for My Location
  const useGPS = async () => {
    try {
      setLoading(true);
      const location = await Location.getCurrentPositionAsync({});
      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setMyLocation(coords);
      const name = await reverseGeocode(coords.latitude, coords.longitude);
      setMyLocationName(name || 'Current Location');
      setIsEditingMyLoc(false);
      setLoading(false);
    } catch (e) {
      console.log(e);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!myLocation || !theirLocation || showLocationInput) return;

    (async () => {
      setLoading(true);
      setVenues([]);

      const searchLocation = calculateSearchLocation({ mode: searchMode, myLocation, theirLocation });

      console.log('🔍 Using Ola Maps (India-specific) to find venues...');

      // Use Ola Maps for India-specific venue data
      const { fetchOlaMapsVenues } = await import('@/services/hybridVenues');
      const fetchedVenues = await fetchOlaMapsVenues(
        searchLocation,
        myLocation,
        filters
      );

      console.log(`Found ${fetchedVenues.length} venues`);

      // AI Enhancement with Groq (LLaMA 3.1)
      try {
        const { enhanceVenuesWithAI } = await import('@/services/aiScoring');
        const enhancedVenues = await enhanceVenuesWithAI(fetchedVenues, {
          romantic: true,
          upscale: filters.vibe?.includes('upscale'),
          casual: filters.vibe?.includes('casual'),
        });
        setVenues(enhancedVenues);
      } catch (error) {
        console.log('AI enhancement skipped:', error);
        setVenues(fetchedVenues);
      }

      setLoading(false);
    })();
  }, [myLocation, theirLocation, filters, searchMode, showLocationInput]);

  if (showLocationInput) {
    return (
      <View style={styles.container}>
        <ScrollView
          style={styles.locationInputContainer}
          contentContainerStyle={styles.locationInputContent}
          showsVerticalScrollIndicator={true}
        >
          <Text style={styles.appTitle}>MeetPoint</Text>
          <Text style={styles.appSubtitle}>Find the perfect place to meet</Text>

          {/* MY LOCATION CARD */}
          <View style={styles.locationCard}>
            <Text style={styles.locationLabel}>YOUR LOCATION</Text>

            {!isEditingMyLoc && myLocation ? (
              <View>
                <Text style={styles.locationName}>{myLocationName}</Text>
                <TouchableOpacity onPress={() => setIsEditingMyLoc(true)}>
                  <Text style={styles.changeText}>Change</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <TextInput
                  style={styles.addressInput}
                  placeholder="Search places in India..."
                  placeholderTextColor="#666"
                  value={myLocationInput}
                  onChangeText={handleMyLocChange}
                />
                <TouchableOpacity onPress={useGPS} style={{ marginTop: 8, marginBottom: 12 }}>
                  <Text style={styles.changeText}>📍 Use GPS Location</Text>
                </TouchableOpacity>

                {mySuggestions.map((item) => (
                  <TouchableOpacity
                    key={item.place_id}
                    style={styles.suggestionItem}
                    onPress={() => selectMyLocation(item.place_id, item.description)}
                  >
                    <View style={styles.suggestionIcon}>
                      <Text>📍</Text>
                    </View>
                    <View style={styles.suggestionContent}>
                      <Text style={styles.suggestionMainText}>
                        {item.structured_formatting?.main_text || item.description.split(',')[0]}
                      </Text>
                      <Text style={styles.suggestionSubText} numberOfLines={1}>
                        {item.structured_formatting?.secondary_text || item.description}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* THEIR LOCATION CARD */}
          <View style={styles.locationCard}>
            <Text style={styles.locationLabel}>THEIR LOCATION</Text>

            {!isEditingTheirLoc && theirLocation ? (
              <View>
                <Text style={styles.locationName}>{theirLocationName}</Text>
                <TouchableOpacity onPress={() => {
                  setTheirLocation(null);
                  setIsEditingTheirLoc(true);
                }}>
                  <Text style={styles.changeText}>Change</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <TextInput
                  style={styles.addressInput}
                  placeholder="Search places (e.g. Lalpur, Ranchi)..."
                  placeholderTextColor="#666"
                  value={theirLocationInput}
                  onChangeText={handleTheirLocChange}
                />

                {theirSuggestions.map((item) => (
                  <TouchableOpacity
                    key={item.place_id}
                    style={styles.suggestionItem}
                    onPress={() => selectTheirLocation(item.place_id, item.description)}
                  >
                    <View style={styles.suggestionIcon}>
                      <Text>📍</Text>
                    </View>
                    <View style={styles.suggestionContent}>
                      <Text style={styles.suggestionMainText}>
                        {item.structured_formatting?.main_text || item.description.split(',')[0]}
                      </Text>
                      <Text style={styles.suggestionSubText} numberOfLines={1}>
                        {item.structured_formatting?.secondary_text || item.description}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.searchModeCard}>
            <Text style={styles.sectionTitle}>SEARCH MODE</Text>
            <View style={styles.modeButtons}>
              {(['midpoint', 'closer_to_me', 'closer_to_them'] as SearchMode[]).map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[styles.modeButton, searchMode === mode && styles.modeButtonActive]}
                  onPress={() => setSearchMode(mode)}
                >
                  <Text style={[styles.modeButtonText, searchMode === mode && styles.modeButtonTextActive]}>
                    {mode === 'midpoint' ? 'Midpoint' : mode === 'closer_to_me' ? 'Closer to Me' : 'Closer to Them'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.filterCard}>
            <Text style={styles.sectionTitle}>FILTERS</Text>

            <Text style={styles.filterLabel}>Type</Text>
            <View style={styles.filterRow}>
              {(['cafe', 'bar', 'restaurant', 'pub', 'park'] as const).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.filterChip, filters.types?.includes(type) && styles.filterChipActive]}
                  onPress={() => {
                    const current = filters.types || [];
                    setFilters({
                      ...filters,
                      types: current.includes(type)
                        ? current.filter(t => t !== type)
                        : [...current, type]
                    });
                  }}
                >
                  <Text style={styles.filterChipText}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.filterLabel}>Diet</Text>
            <View style={styles.filterRow}>
              {(['any', 'vegetarian', 'vegan'] as const).map((diet) => (
                <TouchableOpacity
                  key={diet}
                  style={[styles.filterChip, filters.diet === diet && styles.filterChipActive]}
                  onPress={() => setFilters({ ...filters, diet })}
                >
                  <Text style={styles.filterChipText}>{diet}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.filterLabel}>Vibe</Text>
            <View style={styles.filterRow}>
              {(['aesthetic', 'cozy', 'upscale', 'casual'] as const).map((vibe) => (
                <TouchableOpacity
                  key={vibe}
                  style={[styles.filterChip, filters.vibe?.includes(vibe) && styles.filterChipActive]}
                  onPress={() => {
                    const current = filters.vibe || [];
                    setFilters({
                      ...filters,
                      vibe: current.includes(vibe)
                        ? current.filter(v => v !== vibe)
                        : [...current, vibe]
                    });
                  }}
                >
                  <Text style={styles.filterChipText}>{vibe}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {myLocation && theirLocation ? (
            <TouchableOpacity style={styles.findButton} onPress={() => setShowLocationInput(false)}>
              <Text style={styles.findButtonText}>FIND VENUES</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.findButtonDisabled}>
              <Text style={styles.findButtonTextDisabled}>SET BOTH LOCATIONS TO CONTINUE</Text>
            </View>
          )}

          {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}
        </ScrollView>

        {/* AI Floating Button (Visible on Input Screen) */}
        <TouchableOpacity
          style={styles.aiFab}
          onPress={() => setShowAIModal(true)}
        >
          <Text style={styles.aiFabIcon}>✨</Text>
          <Text style={styles.aiFabText}>Ask AI</Text>
        </TouchableOpacity>

        {/* AI Search Modal */}
        {showAIModal && (
          <View style={styles.aiModalOverlay}>
            <View style={styles.aiModalContent}>
              <Text style={styles.aiModalTitle}>Magic Search 🪄</Text>
              <Text style={styles.aiModalSubtitle}>
                "Find a romantic cafe between here and Lalpur serving vegan food..."
              </Text>

              <TextInput
                style={styles.aiInput}
                placeholder="Ask for anything..."
                placeholderTextColor="#666"
                value={aiQuery}
                onChangeText={setAiQuery}
                multiline
                autoFocus
              />

              <TouchableOpacity
                style={styles.aiSearchButton}
                onPress={handleAISearch}
                disabled={isAiThinking}
              >
                {isAiThinking ? (
                  <ActivityIndicator color="#121212" />
                ) : (
                  <Text style={styles.aiSearchButtonText}>✨ MAGIC SEARCH</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.aiCloseButton}
                onPress={() => setShowAIModal(false)}
              >
                <Text style={styles.aiCloseButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  }

  if (!myLocation) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#E07A5F" />
        <Text style={styles.text}>Getting your location...</Text>
      </View>
    );
  }

  const midpoint = theirLocation ? calculateSearchLocation({ mode: searchMode, myLocation, theirLocation }) : myLocation;

  if (ticketMode && selectedVenue) {
    return (
      <View style={styles.container}>
        <VenueTicket
          venueName={selectedVenue.name}
          time={new Date().toLocaleTimeString()}
          address={`${selectedVenue.latitude.toFixed(4)}, ${selectedVenue.longitude.toFixed(4)}`}
          mapLink={`https://www.openstreetmap.org/?mlat=${selectedVenue.latitude}&mlon=${selectedVenue.longitude}`}
        />
        <TouchableOpacity style={styles.backButton} onPress={() => setTicketMode(false)}>
          <Text style={styles.backButtonText}>← Back to Map</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Background Map */}
      <View style={styles.map}>
        <OlaMap
          height="100%"
          latitude={myLocation?.latitude}
          longitude={myLocation?.longitude}
          markers={[
            ...(myLocation ? [{
              id: 'me',
              latitude: myLocation.latitude,
              longitude: myLocation.longitude,
              title: 'You',
              description: myLocationName,
              color: '#00F0FF'
            }] : []),
            ...(theirLocation ? [{
              id: 'them',
              latitude: theirLocation.latitude,
              longitude: theirLocation.longitude,
              title: 'Them',
              description: theirLocationName,
              color: '#9D00FF'
            }] : []),
            ...venues.map(venue => ({
              id: venue.id,
              latitude: venue.latitude,
              longitude: venue.longitude,
              title: venue.name,
              description: `Score: ${venue.score}`,
              color: venue.aiRecommended ? '#E07A5F' : '#666'
            }))
          ]}
        />
      </View>


      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#E07A5F" />
          <Text style={styles.loadingText}>Finding perfect venues...</Text>
        </View>
      )}

      {!loading && venues.length > 0 && (
        <View style={[styles.venueListContainer, { paddingTop: insets.top }]}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Nearby Venues</Text>
            <Text style={styles.headerSubtitle}>{venues.length} places found</Text>
            <TouchableOpacity
              style={styles.backToInputButton}
              onPress={() => setShowLocationInput(true)}
            >
              <Text style={styles.backToInputText}>← Change Locations</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.venueList}
            scrollEventThrottle={16}
            nestedScrollEnabled={true}
          >
            {venues.map((venue, index) => (
              <Animated.View
                key={venue.id}
                entering={FadeInDown.delay(index * 100).duration(400)}
              >
                <TouchableOpacity
                  style={[
                    styles.venueListItem,
                    venue.aiRecommended && styles.venueListItemAI
                  ]}
                  onPress={() => setSelectedVenue(venue)}
                  activeOpacity={0.7}
                >
                  <View style={styles.venueListContent}>
                    <View style={styles.venueNameRow}>
                      <Text style={styles.venueListName}>{venue.name}</Text>
                      {venue.aiRecommended && (
                        <View style={styles.aiBadge}>
                          <Text style={styles.aiBadgeText}>🤖 AI</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.venueListScore}>
                      SCORE: {Math.round(venue.score)} • {venue.tags.amenity || venue.tags.leisure || 'venue'}
                    </Text>
                    {myLocation && (
                      <Text style={styles.venueDistance}>
                        {formatDistance(calculateDistance(myLocation, {
                          latitude: venue.latitude,
                          longitude: venue.longitude
                        }))} away
                      </Text>
                    )}
                  </View>
                  <View style={[styles.scoreIndicator, { backgroundColor: venue.score > 50 ? '#E07A5F' : '#666' }]} />
                </TouchableOpacity>
              </Animated.View>
            ))}
          </ScrollView>
        </View>
      )}

      {!loading && venues.length === 0 && !showLocationInput && (
        <View style={styles.center}>
          <Text style={styles.text}>No venues found in this area</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setShowLocationInput(true)}
          >
            <Text style={styles.backButtonText}>← Back to Search</Text>
          </TouchableOpacity>
        </View>
      )}

      {selectedVenue && !ticketMode && (
        <>
          <BlurView
            intensity={95}
            tint="dark"
            style={[StyleSheet.absoluteFill, { zIndex: 110, backgroundColor: 'rgba(0,0,0,0.85)' }]}
          />
          <View style={[styles.cardOverlay, { zIndex: 120 }]}>
            <BlurView intensity={80} tint="dark" style={[StyleSheet.absoluteFill, { borderRadius: 24, backgroundColor: 'rgba(20,20,20,0.7)' }]} />
            <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
              <View style={styles.miniMapContainer}>
                <OlaMap
                  height="100%"
                  latitude={selectedVenue.latitude}
                  longitude={selectedVenue.longitude}
                  markers={[{
                    id: selectedVenue.id,
                    latitude: selectedVenue.latitude,
                    longitude: selectedVenue.longitude,
                    title: selectedVenue.name,
                    description: 'Selected Venue',
                    color: '#E07A5F'
                  }]}
                />
              </View>

              <Text style={styles.venueTitle}>{selectedVenue.name}</Text>

              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16 }}>
                  <Text style={{ color: '#E07A5F', fontSize: 16, marginRight: 4 }}>★</Text>
                  <Text style={[styles.venueScore, { marginBottom: 0 }]}>{Math.round(selectedVenue.score)} Match Score</Text>
                </View>
                <Text style={{ color: '#666', fontFamily: 'JetBrainsMono_400Regular' }}>
                  {formatDistance(calculateDistance(myLocation!, {
                    latitude: selectedVenue.latitude,
                    longitude: selectedVenue.longitude
                  }))} away
                </Text>
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
                <View style={styles.tag}>
                  <Text style={styles.tagText}>{selectedVenue.tags.amenity || 'Venue'}</Text>
                </View>
                {selectedVenue.tags.open_now === 'yes' && (
                  <View style={[styles.tag, { borderColor: '#00FF9D' }]}>
                    <Text style={[styles.tagText, { color: '#00FF9D' }]}>OPEN NOW</Text>
                  </View>
                )}
                {selectedVenue.aiRecommended && (
                  <View style={[styles.tag, { borderColor: '#E07A5F', backgroundColor: 'rgba(224, 122, 95, 0.1)' }]}>
                    <Text style={[styles.tagText, { color: '#E07A5F' }]}>AI PICK</Text>
                  </View>
                )}
              </View>

              <Text style={{ color: '#AAA', fontFamily: 'JetBrainsMono_400Regular', marginBottom: 24, lineHeight: 20 }}>
                {selectedVenue.tags['addr:full'] || 'Address details not available'}
              </Text>

              <View style={{ gap: 12 }}>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => handleConfirmDate()}
                >
                  <Text style={styles.primaryButtonText}>LET'S MEET HERE</Text>
                </TouchableOpacity>



                <TouchableOpacity
                  style={[styles.secondaryButton, { borderColor: 'transparent' }]}
                  onPress={() => setSelectedVenue(null)}
                >
                  <Text style={[styles.secondaryButtonText, { color: '#666' }]}>Close</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </>
      )}

      {/* AI Floating Button */}
      {!showLocationInput && !selectedVenue && (
        <TouchableOpacity
          style={styles.aiFab}
          onPress={() => setShowAIModal(true)}
        >
          <Text style={styles.aiFabIcon}>✨</Text>
          <Text style={styles.aiFabText}>Ask AI</Text>
        </TouchableOpacity>
      )}

      {/* AI Search Modal */}
      {showAIModal && (
        <View style={[styles.aiModalOverlay, { backgroundColor: 'transparent' }]}>
          <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.aiModalContent}>
            <Text style={styles.aiModalTitle}>Magic Search 🪄</Text>
            <Text style={styles.aiModalSubtitle}>
              "Find a romantic cafe between here and Lalpur serving vegan food..."
            </Text>

            <TextInput
              style={styles.aiInput}
              placeholder="Ask for anything..."
              placeholderTextColor="#666"
              value={aiQuery}
              onChangeText={setAiQuery}
              multiline
              autoFocus
            />

            <TouchableOpacity
              style={styles.aiSearchButton}
              onPress={handleAISearch}
              disabled={isAiThinking}
            >
              {isAiThinking ? (
                <ActivityIndicator color="#121212" />
              ) : (
                <Text style={styles.aiSearchButtonText}>✨ MAGIC SEARCH</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.aiCloseButton}
              onPress={() => setShowAIModal(false)}
            >
              <Text style={styles.aiCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      {/* AI Floating Button */}
      {!showLocationInput && !selectedVenue && (
        <TouchableOpacity
          style={styles.aiFab}
          onPress={() => setShowAIModal(true)}
        >
          <Text style={styles.aiFabIcon}>✨</Text>
          <Text style={styles.aiFabText}>Ask AI</Text>
        </TouchableOpacity>
      )}

      {/* AI Search Modal */}
      {showAIModal && (
        <View style={styles.aiModalOverlay}>
          <View style={styles.aiModalContent}>
            <Text style={styles.aiModalTitle}>Magic Search 🪄</Text>
            <Text style={styles.aiModalSubtitle}>
              "Find a romantic cafe between here and Lalpur serving vegan food..."
            </Text>

            <TextInput
              style={styles.aiInput}
              placeholder="Ask for anything..."
              placeholderTextColor="#666"
              value={aiQuery}
              onChangeText={setAiQuery}
              multiline
              autoFocus
            />

            <TouchableOpacity
              style={styles.aiSearchButton}
              onPress={handleAISearch}
              disabled={isAiThinking}
            >
              {isAiThinking ? (
                <ActivityIndicator color="#121212" />
              ) : (
                <Text style={styles.aiSearchButtonText}>✨ MAGIC SEARCH</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.aiCloseButton}
              onPress={() => setShowAIModal(false)}
            >
              <Text style={styles.aiCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  aiFab: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    backgroundColor: '#00F0FF', // Cyan
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: "#00F0FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 100,
  },
  aiFabIcon: {
    fontSize: 20,
  },
  aiFabText: {
    fontFamily: 'JetBrainsMono_700Bold',
    color: '#121212',
    fontSize: 14,
  },
  aiModalOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(5, 5, 5, 0.95)',
    justifyContent: 'center',
    padding: 20,
    zIndex: 200,
  },
  aiModalContent: {
    backgroundColor: '#121212',
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#333',
  },
  aiModalTitle: {
    fontFamily: 'PlayfairDisplay_700Bold_Italic',
    fontSize: 32,
    color: '#EAEAEA',
    marginBottom: 8,
    textAlign: 'center',
  },
  aiModalSubtitle: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    fontStyle: 'italic',
  },
  aiInput: {
    backgroundColor: '#050505',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 16,
    padding: 16,
    color: '#EAEAEA',
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 16,
    height: 100,
    textAlignVertical: 'top',
    marginBottom: 24,
  },
  aiSearchButton: {
    backgroundColor: '#00F0FF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  aiSearchButtonText: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 14,
    color: '#121212',
    letterSpacing: 1,
  },
  aiCloseButton: {
    padding: 12,
    alignItems: 'center',
  },
  aiCloseButtonText: {
    fontFamily: 'JetBrainsMono_400Regular',
    color: '#666',
  },
  container: {
    flex: 1,
    backgroundColor: '#050505',
  },
  map: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#050505',
  },
  text: {
    color: '#EAEAEA',
    fontFamily: 'JetBrainsMono_400Regular',
    marginTop: 16,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(5, 5, 5, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#EAEAEA',
    fontFamily: 'JetBrainsMono_400Regular',
    marginTop: 16,
    fontSize: 14,
  },
  marker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  markerText: {
    color: '#FFF',
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 10,
  },
  venueListContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#050505',
    // Removed shadows since it's full screen now
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontFamily: 'PlayfairDisplay_700Bold_Italic',
    fontSize: 24,
    color: '#EAEAEA',
  },
  headerSubtitle: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  backToInputButton: {
    marginTop: 12,
    padding: 8,
    backgroundColor: '#333',
  },
  backToInputText: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 12,
    color: '#EAEAEA',
  },
  venueList: {
    flex: 1,
    backgroundColor: '#050505',
  },
  venueListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16, // Add side margins
    marginBottom: 12,     // Increased spacing between cards
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,     // Rounded corners for card look
  },
  venueListItemAI: {
    backgroundColor: '#1a1a1a',
    borderColor: '#E07A5F',
    borderWidth: 2,
  },
  venueListContent: {
    flex: 1,
  },
  venueNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  aiBadge: {
    backgroundColor: 'rgba(224, 122, 95, 0.15)', // Transparent terracotta
    borderWidth: 1,
    borderColor: '#E07A5F',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  aiBadgeText: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 10,
    color: '#E07A5F',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  venueListName: {
    color: '#EAEAEA',
    fontFamily: 'JetBrainsMono_700Bold', // Changed to match app design
    fontSize: 16,
    marginBottom: 4,
    textTransform: 'uppercase', // Tech vibe
  },
  venueListScore: {
    color: '#E07A5F',
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 10,
    textTransform: 'uppercase',
  },
  venueDistance: {
    color: '#00F0FF',
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 10,
    marginTop: 4,
  },
  scoreIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginLeft: 12,
  },
  miniMapContainer: {
    height: 150,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
  },
  cardOverlay: {
    position: 'absolute',
    bottom: 90, // Lifted up to avoid bottom tab bar
    left: 0,
    right: 0,
    marginHorizontal: 16, // Add side margins for floating look
    backgroundColor: '#161616', // Slightly lighter than background for depth
    padding: 20,
    borderRadius: 24, // Consistent rounded corners
    borderWidth: 1,
    borderColor: '#333',
    maxHeight: '80%', // Limit height
    // Deep premium shadow
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 20,
  },
  venueTitle: {
    fontFamily: 'JetBrainsMono_700Bold', // Changed to match app design
    fontSize: 20,
    color: '#EAEAEA',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  venueScore: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 12,
    color: '#E07A5F',
    marginBottom: 16,
  },
  confirmButton: {
    backgroundColor: '#E07A5F',
    padding: 16,
    alignItems: 'center',
    marginBottom: 8,
  },
  confirmButtonText: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 14,
    color: '#121212',
  },
  closeButton: {
    padding: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 12,
    color: '#666',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: '#121212',
    padding: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  backButtonText: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 14,
    color: '#EAEAEA',
  },
  locationInputContainer: {
    flex: 1,
    backgroundColor: '#050505',
  },
  locationInputContent: {
    padding: 20,
    paddingBottom: 120,
  },
  appTitle: {
    fontFamily: 'PlayfairDisplay_700Bold_Italic',
    fontSize: 48,
    color: '#EAEAEA',
    marginBottom: 8,
  },
  appSubtitle: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 14,
    color: '#666',
    marginBottom: 32,
  },
  locationCard: {
    backgroundColor: '#121212',
    padding: 20,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 16,
  },
  locationLabel: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 10,
    color: '#E07A5F',
    marginBottom: 8,
    letterSpacing: 1,
  },
  locationName: {
    fontFamily: 'PlayfairDisplay_700Bold_Italic',
    fontSize: 18,
    color: '#EAEAEA',
    marginBottom: 4,
  },
  locationCoords: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  locationStatus: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 12,
    color: '#00F0FF',
    marginTop: 4,
  },
  changeText: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 12,
    color: '#E07A5F',
    marginTop: 8,
  },
  addressSearchContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  addressInput: {
    flex: 1,
    backgroundColor: '#050505',
    borderWidth: 1,
    borderColor: '#333',
    padding: 12,
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 14,
    color: '#EAEAEA',
  },
  coordinateInputs: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#050505',
    borderWidth: 1,
    borderColor: '#333',
    padding: 12,
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 14,
    color: '#EAEAEA',
  },
  setButton: {
    backgroundColor: '#E07A5F',
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  setButtonDisabled: {
    backgroundColor: '#666',
  },
  setButtonText: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 12,
    color: '#121212',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#333',
  },
  dividerText: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 10,
    color: '#666',
    marginHorizontal: 12,
  },
  searchModeCard: {
    backgroundColor: '#121212',
    padding: 20,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 12,
    color: '#E07A5F',
    marginBottom: 12,
    letterSpacing: 1,
  },
  modeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  modeButton: {
    flex: 1,
    padding: 12,
    backgroundColor: '#050505',
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: '#E07A5F',
    borderColor: '#E07A5F',
  },
  modeButtonText: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 10,
    color: '#666',
  },
  modeButtonTextActive: {
    color: '#121212',
    fontFamily: 'JetBrainsMono_700Bold',
  },
  filterCard: {
    backgroundColor: '#121212',
    padding: 20,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 16,
  },
  filterLabel: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 10,
    color: '#666',
    marginBottom: 8,
    marginTop: 12,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#050505',
    borderWidth: 1,
    borderColor: '#333',
  },
  filterChipActive: {
    backgroundColor: '#E07A5F',
    borderColor: '#E07A5F',
  },
  filterChipText: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 10,
    color: '#EAEAEA',
  },
  findButton: {
    backgroundColor: '#E07A5F',
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  findButtonText: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 14,
    color: '#121212',
  },
  findButtonDisabled: {
    backgroundColor: '#333',
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  findButtonTextDisabled: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 12,
    color: '#666',
  },
  errorText: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 12,
    color: '#FF006E',
    textAlign: 'center',
  },
  locationPin: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationPinInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  midpointPin: {
    alignItems: 'center',
  },
  midpointPinInner: {
    width: 20,
    height: 20,
    backgroundColor: '#E07A5F',
    borderWidth: 2,
    borderColor: 'white',
    transform: [{ rotate: '45deg' }],
  },
  midpointLabel: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 8,
    color: '#EAEAEA',
    backgroundColor: '#121212',
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginTop: 4,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    backgroundColor: '#050505',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  suggestionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionMainText: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 14,
    color: '#EAEAEA',
    marginBottom: 2,
  },
  suggestionSubText: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 10,
    color: '#666',
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#333',
  },
  tagText: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 10,
    color: '#EAEAEA',
  },
  primaryButton: {
    backgroundColor: '#E07A5F',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 14,
    color: '#121212',
    letterSpacing: 1,
  },
  secondaryButton: {
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  secondaryButtonText: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 14,
    color: '#EAEAEA',
  },
});
