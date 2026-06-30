// Three-tab floating navpill — Home / Companions / You (no center "+" FAB). Warm Sanctuary,
// opaque. The cosmic chat/memory/premium/profile routes are kept reachable but off the bar
// (href:null) until they're ported as one-offs / removed.
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FONTS, RADIUS, SPACE } from '@/constants/design';
import { useTheme } from '@/hooks/useTheme';

type IconPair = { on: React.ComponentProps<typeof Ionicons>['name']; off: React.ComponentProps<typeof Ionicons>['name'] };
const ICONS: Record<'index' | 'companions' | 'you', IconPair> = {
  index: { on: 'home', off: 'home-outline' },
  companions: { on: 'people', off: 'people-outline' },
  you: { on: 'person', off: 'person-outline' },
};

export default function TabLayout() {
  const { colors, shadows } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.navIdle,
        tabBarLabelStyle: { fontFamily: FONTS.body.medium, fontSize: 11 },
        tabBarStyle: {
          position: 'absolute',
          bottom: insets.bottom + SPACE.sm,
          left: SPACE.xl,
          right: SPACE.xl,
          height: 64,
          borderRadius: RADIUS.pill,
          backgroundColor: colors.navBg,
          borderTopWidth: 0,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.navBorder,
          paddingTop: 8,
          paddingBottom: 8,
          ...shadows.e2,
        },
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
      <Tabs.Screen name="premium" options={{ href: null }} />
    </Tabs>
  );
}
