// Companion avatar — the curated portrait for a known persona (with its saved
// "look" mood filter applied), or a warm initials fallback for created
// companions. Pill radius, warm tonal (never a glowing orb).
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FilteredAvatar } from '@/components/companion/FilteredAvatar';
import { avatarFor } from '@/components/companion/portraits';
import { AVATAR_INITIAL_COLOR, FONTS, personaColorsFor } from '@/constants/design';
import { DEFAULT_LOOK_ID } from '@/constants/looks';
import { useTheme } from '@/hooks/useTheme';

export { avatarFor };

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
  lookId,
}: {
  id: string;
  name: string;
  size?: number;
  color?: string;
  colorFrom?: string;
  colorTo?: string;
  /** The companion's saved look (companions.appearance seam); default = untinted portrait. */
  lookId?: string;
}) {
  const { colors } = useTheme();
  const src = avatarFor(id);
  if (src) {
    if (lookId && lookId !== DEFAULT_LOOK_ID) {
      return <FilteredAvatar personaId={id} lookId={lookId} size={size} />;
    }
    return <Image source={src} style={{ width: size, height: size, borderRadius: size / 2 }} contentFit="cover" />;
  }

  // A gallery persona with no portrait yet falls back to its branded duotone (art-gated 9); an
  // explicit colorFrom/colorTo (e.g. a created companion) always wins over the persona default.
  const pc = colorFrom && colorTo ? undefined : personaColorsFor(id);
  const from = colorFrom ?? pc?.from;
  const to = colorTo ?? pc?.to;
  const duotone = !!(from && to);
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
      <LinearGradient colors={[from!, to!]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.fallback, round]}>
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
