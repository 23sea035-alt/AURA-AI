import {
  HankenGrotesk_400Regular,
  HankenGrotesk_500Medium,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
  useFonts as useHankenFonts,
} from '@expo-google-fonts/hanken-grotesk';
import {
  Newsreader_400Regular,
  Newsreader_500Medium,
  Newsreader_600SemiBold,
  useFonts as useNewsreaderFonts,
} from '@expo-google-fonts/newsreader';
import { ClerkProvider } from '@clerk/clerk-expo';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { DEV_USE_MOCKS } from '@/constants/devFlags';
import { AppProvider } from '@/context/AppContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { tokenCache } from '@/lib/clerk';
import { CLERK_PUBLISHABLE_KEY } from '@/lib/env';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

// Clerk mounts only in live mode (lib/backend.ts routes auth seams to it);
// mock mode never starts a session and needs no key. DEV_USE_MOCKS is fixed at
// bundle time, so this branch never changes within a running app.
const clerkActive = !DEV_USE_MOCKS && !!CLERK_PUBLISHABLE_KEY;

function AuthGate({ children }: { children: React.ReactNode }) {
  if (!clerkActive) return <>{children}</>;
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
      {children}
    </ClerkProvider>
  );
}

function RootLayoutNav() {
  return (
    // Deliberate navigation grammar: pushed screens slide from the right (which
    // also enables the native iOS back-swipe — `fade` silently disables it), and
    // the pop gesture works from anywhere on the screen, not just the edge
    // (nothing pushed owns a horizontal pan). Boot/identity boundaries
    // cross-fade; hero surfaces rise from the bottom; the paywall is the ONE
    // modal sheet.
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        fullScreenGestureEnabled: true,
      }}
    >
      <Stack.Screen name="index" options={{ animation: 'fade' }} />
      <Stack.Screen name="welcome" options={{ animation: 'fade' }} />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="age-verification" />
      <Stack.Screen name="ai-disclosure" />
      <Stack.Screen name="ai-consent" />
      <Stack.Screen name="(auth)" />
      {/* Entering the tab world is an identity boundary (replace), not a push. */}
      <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
      <Stack.Screen name="chat/[id]" />
      <Stack.Screen
        name="voice-call"
        options={{ animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="companion/create"
        options={{ animation: 'slide_from_bottom' }}
      />
      {/* Paywall is a real modal sheet — covers the tab bar, native swipe-to-dismiss. */}
      <Stack.Screen name="premium" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  // Warm Sanctuary families (design.ts FONTS) — display (Newsreader) + body (Hanken Grotesk).
  const [newsreaderLoaded, newsreaderError] = useNewsreaderFonts({
    Newsreader_400Regular,
    Newsreader_500Medium,
    Newsreader_600SemiBold,
  });
  const [hankenLoaded, hankenError] = useHankenFonts({
    HankenGrotesk_400Regular,
    HankenGrotesk_500Medium,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
  });

  const fontsLoaded = newsreaderLoaded && hankenLoaded;
  const fontError = newsreaderError || hankenError;

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <ThemeProvider>
                <AuthGate>
                  <AppProvider>
                    <StatusBar style="auto" />
                    <RootLayoutNav />
                  </AppProvider>
                </AuthGate>
              </ThemeProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
