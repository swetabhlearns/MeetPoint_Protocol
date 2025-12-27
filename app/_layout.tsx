import { JetBrainsMono_400Regular, JetBrainsMono_500Medium, JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono';
import { PlayfairDisplay_400Regular, PlayfairDisplay_700Bold_Italic, useFonts } from '@expo-google-fonts/playfair-display';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import 'react-native-reanimated';

import NoiseBackground from '@/components/NoiseBackground';
import { colors, fonts, spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { APIKeyStatus, getMissingKeysMessage, validateAPIKeys } from '@/utils/apiKeys';
import { supabase } from '@/utils/supabase';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [apiKeyStatus, setApiKeyStatus] = useState<APIKeyStatus | null>(null);

  const [loaded] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_700Bold_Italic,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
  });

  // Handle deep link for auth callback
  useEffect(() => {
    const handleDeepLink = async (url: string) => {
      console.log('🔗 Deep link received:', url);

      // Check if this is an auth callback
      if (url.includes('access_token') || url.includes('#access_token')) {
        try {
          // Extract hash fragment (tokens come after #)
          const hashIndex = url.indexOf('#');
          if (hashIndex !== -1) {
            const hashParams = new URLSearchParams(url.substring(hashIndex + 1));
            const accessToken = hashParams.get('access_token');
            const refreshToken = hashParams.get('refresh_token');

            if (accessToken && refreshToken) {
              console.log('🔐 Setting Supabase session from deep link');
              const { error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });

              if (error) {
                console.error('Auth session error:', error);
              } else {
                console.log('✅ Session set successfully!');
              }
            }
          }
        } catch (e) {
          console.error('Deep link auth error:', e);
        }
      }
    };

    // Handle initial URL (app opened via deep link)
    Linking.getInitialURL().then(url => {
      if (url) handleDeepLink(url);
    });

    // Handle URL changes while app is open
    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (loaded) {
      // Validate API keys on startup
      const status = validateAPIKeys();
      setApiKeyStatus(status);

      if (!status.isValid) {
        console.warn('⚠️ Missing API keys:', status.missingKeys);
      }

      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <NoiseBackground />

      {/* API Key Warning Banner */}
      {apiKeyStatus && !apiKeyStatus.isValid && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>
            ⚠️ {getMissingKeysMessage(apiKeyStatus)}
          </Text>
        </View>
      )}

      <Stack screenOptions={{
        contentStyle: { backgroundColor: 'transparent' },
        headerShown: false
      }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  warningBanner: {
    backgroundColor: colors.accentRed,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    zIndex: 1000,
  },
  warningText: {
    color: colors.textPrimary,
    fontFamily: fonts.monoRegular,
    fontSize: 12,
    textAlign: 'center',
  },
});
