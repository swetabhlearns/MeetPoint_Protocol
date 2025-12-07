import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';

interface OlaMapProps {
  latitude: number;
  longitude: number;
  markers?: {
    id: string;
    latitude: number;
    longitude: number;
    title: string;
    description?: string;
    color?: string;
  }[];
  height?: number | string;
}

export default function OlaMap({ latitude, longitude, markers = [], height = '100%' }: OlaMapProps) {
  const webViewRef = useRef<WebView>(null);
  const apiKey = process.env.EXPO_PUBLIC_OLA_MAPS_API_KEY || '';

  const htmlContent = `
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
          const map = new maplibregl.Map({
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

          // Add Markers
          const markers = ${JSON.stringify(markers)};
          
          markers.forEach(m => {
            // Create DOM element for marker
            const el = document.createElement('div');
            el.className = 'marker';
            if(m.color) el.style.backgroundColor = m.color;

            // Add marker to map
            new maplibregl.Marker(el)
              .setLngLat([m.longitude, m.latitude])
              .setPopup(new maplibregl.Popup({ offset: 25 })
                .setHTML('<div class="marker-popup"><b>' + m.title + '</b><br>' + (m.description || '') + '</div>'))
              .addTo(map);
          });

          // Handle updates from React Native
          window.addEventListener('message', function(event) {
            const data = JSON.parse(event.data);
            if (data.type === 'updateCenter') {
               map.flyTo({ center: [data.longitude, data.latitude], zoom: 15 });
            }
          });
        </script>
      </body>
    </html>
  `;

  // Update map when center changes
  useEffect(() => {
    if (webViewRef.current) {
      // We could send a message here, but simpler to just let React re-render the HTML string for now
      // or effectively we rely on the component mount mostly.
      // For smoother updates, message passing is better.
      const script = `
          if (window.map) {
             window.map.flyTo({ center: [${longitude}, ${latitude}], zoom: 15 });
          }
        `;
      webViewRef.current.injectJavaScript(script);
    }
  }, [latitude, longitude]);

  return (
    <View style={[styles.container, { height: height as any }]}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        style={styles.webview}
        scrollEnabled={false}
      />
      {!apiKey && (
        <View style={styles.errorOverlay}>
          <ActivityIndicator color="#E07A5F" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#050505',
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    backgroundColor: '#050505',
    opacity: 0.99, // Hack to fix some android glitching
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  }
});
