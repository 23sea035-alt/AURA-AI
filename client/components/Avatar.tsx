// Companion avatar — the curated portrait for a known persona, or a warm initials fallback for
// created companions. Pill radius, warm tonal (never a glowing orb).
import { Image } from 'expo-image';
import React from 'react';
import { View, Text, StyleSheet, type ImageSourcePropType } from 'react-native';
import { FONTS } from '@/constants/design';
import { useTheme } from '@/hooks/useTheme';

const AVATARS: Record<string, ImageSourcePropType> = {
  aurora: require('../assets/avatars/aurora.png'),
  orion: require('../assets/avatars/orion.png'),
  lyra: require('../assets/avatars/lyra.png'),
};

export function avatarFor(id: string): ImageSourcePropType | undefined {
  return AVATARS[id?.toLowerCase?.()];
}

export function Avatar({ id, name, size = 56 }: { id: string; name: string; size?: number }) {
  const { colors } = useTheme();
  const src = avatarFor(id);
  if (src) {
    return <Image source={src} style={{ width: size, height: size, borderRadius: size / 2 }} contentFit="cover" />;
  }
  return (
    <View
      style={[
        styles.fallback,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.avatar },
      ]}
    >
      <Text style={[styles.initial, { color: colors.avatarText, fontSize: size * 0.4 }]}>
        {name?.[0]?.toUpperCase() ?? '?'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center' },
  initial: { fontFamily: FONTS.body.semibold },
});
