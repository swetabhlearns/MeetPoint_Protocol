import { colors } from '@/constants/theme';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

interface Marker {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  description?: string;
  color?: string;
}

interface OlaMapProps {
  latitude: number;
  longitude: number;
  markers?: Marker[];
  height?: number | string;
}

export default function OlaMap({ latitude, longitude, markers = [], height = '100%' }: OlaMapProps) {
  const webViewRef = useRef<WebView>(null);
  const apiKey = process.env.EXPO_PUBLIC_OLA_MAPS_API_KEY || '';
  const isInitialized = useRef(false);

  // Memoize the initial HTML to prevent unnecessary re-renders
  const htmlContent = useMemo(() => `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <script src="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js"></script>
        <link href="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css" rel="stylesheet" />
        <style>
          body { margin: 0; padding: 0; }
          #map { position: absolute; top: 0; bottom: 0; width: 100%; height: 100%; }
          .marker {
            width: 20px;
            height: 20px;
            background-color: #E07A5F;
            border: 2px solid white;
            border-radius: 50%;
            cursor: pointer;
          }
          .marker-popup {
            color: #333;
            font-family: monospace;
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          let map = null;
          let markerInstances = {};

          function initMap() {
            map = new maplibregl.Map({
              container: 'map',
              style: 'https://api.olamaps.io/styleEditor/v1/styleEdit/styles/5477cffd-10a3-4d29-a18a-6df86b44052b/midway?api_key=${apiKey}',
              center: [${longitude}, ${latitude}],
              zoom: 14,
              attributionControl: false,
              transformRequest: (url, resourceType) => {
                if (url.includes('olamaps.io') && !url.includes('api_key=')) {
                  return {
                    url: url + (url.includes('?') ? '&' : '?') + 'api_key=${apiKey}'
                  }
                }
                return { url };
              }
            });

            map.addControl(new maplibregl.NavigationControl(), 'top-right');
            
            // Notify React Native that map is ready
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapReady' }));
          }

          function updateMarkers(markers) {
            // Remove old markers that are no longer in the list
            const newIds = new Set(markers.map(m => m.id));
            Object.keys(markerInstances).forEach(id => {
              if (!newIds.has(id)) {
                markerInstances[id].remove();
                delete markerInstances[id];
              }
            });

            // Add or update markers
            markers.forEach(m => {
              if (markerInstances[m.id]) {
                // Update existing marker position
                markerInstances[m.id].setLngLat([m.longitude, m.latitude]);
              } else {
                // Create new marker
                const el = document.createElement('div');
                el.className = 'marker';
                if (m.color) el.style.backgroundColor = m.color;

                const marker = new maplibregl.Marker(el)
                  .setLngLat([m.longitude, m.latitude])
                  .setPopup(new maplibregl.Popup({ offset: 25 })
                    .setHTML('<div class="marker-popup"><b>' + m.title + '</b><br>' + (m.description || '') + '</div>'))
                  .addTo(map);
                
                markerInstances[m.id] = marker;
              }
            });
          }

          function updateCenter(lat, lng, zoom) {
            if (map) {
              map.flyTo({ center: [lng, lat], zoom: zoom || 15 });
            }
          }

          // Handle messages from React Native
          document.addEventListener('message', function(event) {
            try {
              const data = JSON.parse(event.data);
              switch(data.type) {
                case 'updateMarkers':
                  updateMarkers(data.markers);
                  break;
                case 'updateCenter':
                  updateCenter(data.latitude, data.longitude, data.zoom);
                  break;
              }
            } catch(e) {
              console.error('Message parse error:', e);
            }
          });

          // Also listen for window message (Android)
          window.addEventListener('message', function(event) {
            try {
              const data = JSON.parse(event.data);
              switch(data.type) {
                case 'updateMarkers':
                  updateMarkers(data.markers);
                  break;
                case 'updateCenter':
                  updateCenter(data.latitude, data.longitude, data.zoom);
                  break;
              }
            } catch(e) {
              console.error('Message parse error:', e);
            }
          });

          initMap();
        </script>
      </body>
    </html>
  `, [apiKey]); // Only recreate if API key changes

  // Send marker updates via postMessage instead of re-rendering HTML
  const sendMarkersUpdate = useCallback(() => {
    if (webViewRef.current && isInitialized.current) {
      webViewRef.current.postMessage(JSON.stringify({
        type: 'updateMarkers',
        markers,
      }));
    }
  }, [markers]);

  // Send center updates via postMessage
  const sendCenterUpdate = useCallback(() => {
    if (webViewRef.current && isInitialized.current) {
      webViewRef.current.postMessage(JSON.stringify({
        type: 'updateCenter',
        latitude,
        longitude,
      }));
    }
  }, [latitude, longitude]);

  // Update markers when they change
  useEffect(() => {
    sendMarkersUpdate();
  }, [markers, sendMarkersUpdate]);

  // Update center when it changes
  useEffect(() => {
    sendCenterUpdate();
  }, [latitude, longitude, sendCenterUpdate]);

  const handleMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'mapReady') {
        isInitialized.current = true;
        // Send initial markers after map is ready
        sendMarkersUpdate();
      }
    } catch (e) {
      // Ignore parse errors
    }
  }, [sendMarkersUpdate]);

  return (
    <View style={[styles.container, { height: height as any }]}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        style={styles.webview}
        scrollEnabled={false}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
      />
      {!apiKey && (
        <View style={styles.errorOverlay}>
          <ActivityIndicator color={colors.accent} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    backgroundColor: colors.background,
    opacity: 0.99, // Hack to fix some android glitching
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  }
});
