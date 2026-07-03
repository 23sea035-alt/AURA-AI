// Companion avatar — the curated portrait for a known persona, or a warm initials fallback for
// created companions. Pill radius, warm tonal (never a glowing orb).
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { View, Text, StyleSheet, type ImageSourcePropType } from 'react-native';
import { AVATAR_INITIAL_COLOR, FONTS } from '@/constants/design';
import { useTheme } from '@/hooks/useTheme';

const AVATARS: Record<string, ImageSourcePropType> = {
  aurora: require('../assets/avatars/aurora.png'),
  orion: require('../assets/avatars/orion.png'),
  lyra: require('../assets/avatars/lyra.png'),
};

export function avatarFor(id: string): ImageSourcePropType | undefined {
  return AVATARS[id?.toLowerCase?.()];
}

// Fallback background (created companions, no portrait): a warm duotone from the companion's own
// colorFrom→colorTo when given (so it reads branded, not a flat stock circle), else a single
// `color` monogram tone (e.g. the user's own avatar), else the neutral theme avatar tone. Portrait
// avatars (known personas) ignore all of these.
export function Avatar({
  id,
  name,
  size = 56,
  color,
  colorFrom,
  colorTo,
}: {
  id: string;
  name: string;
  size?: number;
  color?: string;
  colorFrom?: string;
  colorTo?: string;
}) {
  const { colors } = useTheme();
  const src = avatarFor(id);
  if (src) {
    return <Image source={src} style={{ width: size, height: size, borderRadius: size / 2 }} contentFit="cover" />;
  }

  const duotone = !!(colorFrom && colorTo);
  const round = { width: size, height: size, borderRadius: size / 2 };
  // a light cream initial reads on every warm monogram tone / duotone
  const initial = (
    <Text
      style={[
        styles.initial,
        { color: color || duotone ? AVATAR_INITIAL_COLOR : colors.avatarText, fontSize: size * 0.4 },
      ]}
    >
      {name?.[0]?.toUpperCase() ?? '?'}
    </Text>
  );

  if (duotone) {
    return (
      <LinearGradient colors={[colorFrom!, colorTo!]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.fallback, round]}>
        {initial}
      </LinearGradient>
    );
  }
  return <View style={[styles.fallback, round, { backgroundColor: color ?? colors.avatar }]}>{initial}</View>;
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center' },
  initial: { fontFamily: FONTS.body.semibold },
});
