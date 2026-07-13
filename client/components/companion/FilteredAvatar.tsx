// Renders a persona portrait, optionally as one of its "look" outfit recolors. A look swaps in a
// pre-baked variant PNG whose APPAREL ONLY is recolored (mask + multiply, done offline) — so this
// stays a plain <Image> with no runtime filter (the old whole-image feColorMatrix tint is gone: it
// coloured the face/hair/background too, and read as unreliable). Unknown/absent looks fall back to
// the base portrait; a persona with no portrait at all renders its branded duotone + initial.
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Image as RNImage, Text } from 'react-native';

import { avatarFor, lookVariantFor } from '@/components/companion/portraits';
import { AVATAR_INITIAL_COLOR, FONTS, personaColorsFor } from '@/constants/design';
import { DEFAULT_LOOK_ID } from '@/constants/looks';

export function FilteredAvatar({
  personaId,
  lookId = DEFAULT_LOOK_ID,
  size = 96,
}: {
  personaId: string;
  lookId?: string;
  size?: number;
}) {
  const source = lookVariantFor(personaId, lookId) ?? avatarFor(personaId);

  if (!source) {
    // No portrait: a gallery persona whose art is not cut yet renders its branded duotone + initial.
    // A truly custom companion has no persona color — return null so the caller (Avatar) uses its
    // own neutral initials fallback.
    const pc = personaColorsFor(personaId);
    if (!pc) return null;
    return (
      <LinearGradient
        colors={[pc.from, pc.to]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}
      >
        <Text style={{ color: AVATAR_INITIAL_COLOR, fontFamily: FONTS.body.semibold, fontSize: size * 0.4 }}>
          {personaId?.[0]?.toUpperCase() ?? '?'}
        </Text>
      </LinearGradient>
    );
  }

  return <RNImage source={source} style={{ width: size, height: size, borderRadius: size / 2 }} resizeMode="cover" />;
}
