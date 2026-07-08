// Three-tab floating navpill — Home / Companions / You (no center "+" FAB). Warm Sanctuary,
// opaque. The cosmic chat/memory/profile routes are kept reachable but off the bar until they're
// ported as one-offs / removed. The paywall is a root-level modal (app/premium.tsx), not a tab.
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FONTS, RADIUS, SPACE, type ThemeColors, type ThemeShadows } from '@/constants/design';
import { useApp } from '@/context/AppContext';
import { usePushRegistration } from '@/hooks/usePushRegistration';
import { useTheme } from '@/hooks/useTheme';

/**
 * The floating navpill's style, shared so screens that hide the tab bar per-screen (Select mode
 * replaces it with a contextual action bar, roster spec §12) can RESTORE it exactly: a per-screen
 * `tabBarStyle` fully replaces the navigator-level one — `undefined` does not fall back.
 */
export function tabBarPillStyle(colors: ThemeColors, shadows: ThemeShadows, bottomInset: number): ViewStyle {
  return {
    position: 'absolute',
    // Sits right on the home-indicator safe area (not floated above it),
    // and clearly narrower than the screen so it reads as a pill.
    // NOTE: left/right are ignored on the absolute tab bar (react-navigation
    // pins them internally) — margins are what actually inset it.
    bottom: bottomInset,
    marginHorizontal: SPACE.xxxl,
    height: 64,
    borderRadius: RADIUS.pill,
    backgroundColor: colors.navBg,
    borderTopWidth: 0,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.navBorder,
    paddingTop: 8,
    paddingBottom: 8,
    ...shadows.e2,
  };
}

type IconPair = { on: React.ComponentProps<typeof Ionicons>['name']; off: React.ComponentProps<typeof Ionicons>['name'] };
const ICONS: Record<'index' | 'companions' | 'you', IconPair> = {
  index: { on: 'home', off: 'home-outline' },
  companions: { on: 'people', off: 'people-outline' },
  you: { on: 'person', off: 'person-outline' },
};

export default function TabLayout() {
  const { colors, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useApp();
  // Away-reply push: first post-auth arrival asks once + mirrors the device token.
  usePushRegistration(!!user);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.navIdle,
        tabBarLabelStyle: { fontFamily: FONTS.body.medium, fontSize: 11 },
        tabBarStyle: tabBarPillStyle(colors, shadows, insets.bottom),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? ICONS.index.on : ICONS.index.off} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="companions"
        options={{
          title: 'Companions',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? ICONS.companions.on : ICONS.companions.off} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="you"
        options={{
          title: 'You',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? ICONS.you.on : ICONS.you.off} size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
