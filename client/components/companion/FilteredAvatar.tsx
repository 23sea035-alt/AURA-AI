// Renders a persona portrait with a curated "look" mood filter applied — brightness/saturation
// (+contrast) only, chained as react-native-svg feColorMatrix filter primitives. 'default' skips
// SVG entirely (plain Image; cheapest, most common case). No new native dependency: Filter /
// FeColorMatrix / Image are all built into react-native-svg (already installed).
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Image as RNImage, Text } from 'react-native';
import Svg, { Defs, Filter, FeColorMatrix, Image as SvgImage } from 'react-native-svg';

import { avatarFor } from '@/components/companion/portraits';
import { AVATAR_INITIAL_COLOR, FONTS, personaColorsFor } from '@/constants/design';
import { LOOKS, DEFAULT_LOOK_ID, stepsForLook } from '@/constants/looks';

export function FilteredAvatar({
  personaId,
  lookId = DEFAULT_LOOK_ID,
  size = 96,
}: {
  personaId: string;
  lookId?: string;
  size?: number;
}) {
  const source = avatarFor(personaId);
  const look = LOOKS.find((l) => l.id === lookId) ?? LOOKS[0];

  if (!source) {
    // No portrait: a gallery persona whose art is not cut yet renders its branded duotone + initial
    // (the look filter is a no-op without a photo). A truly custom companion has no persona color —
    // return null so the caller (Avatar) uses its own neutral initials fallback.
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
  if (look.ops.length === 0) {
    return <RNImage source={source} style={{ width: size, height: size, borderRadius: size / 2 }} resizeMode="cover" />;
  }

  const steps = stepsForLook(look);
  const filterId = `look-${personaId}-${look.id}`;

  return (
    // Clip to a circle via the Svg host view's own style — react-native-svg's <Svg> backs onto a
    // real native view, so plain RN borderRadius/overflow works without a manual SVG clipPath.
    <Svg width={size} height={size} viewBox="0 0 100 100" style={{ borderRadius: size / 2, overflow: 'hidden' }}>
      <Defs>
        <Filter id={filterId} x="-10%" y="-10%" width="120%" height="120%">
          {steps.map((step, i) => {
            const isLast = i === steps.length - 1;
            const inRef = i === 0 ? 'SourceGraphic' : `s${i - 1}`;
            return (
              <FeColorMatrix
                key={i}
                in={inRef}
                type={step.type}
                values={step.values}
                result={isLast ? undefined : `s${i}`}
              />
            );
          })}
        </Filter>
      </Defs>
      <SvgImage
        x="0"
        y="0"
        width="100"
        height="100"
        href={source}
        preserveAspectRatio="xMidYMid slice"
        filter={`url(#${filterId})`}
      />
    </Svg>
  );
}
