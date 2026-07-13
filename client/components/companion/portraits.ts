// The curated persona portraits (docs/specs/personas.md — locked flat-gouache
// masters). Lives in its own module so Avatar and FilteredAvatar can both use
// it without importing each other.
import type { ImageSourcePropType } from 'react-native';

const AVATARS: Record<string, ImageSourcePropType> = {
  // Anchors
  aurora: require('../../assets/avatars/aurora.png'),
  orion: require('../../assets/avatars/orion.png'),
  lyra: require('../../assets/avatars/lyra.png'),
  // Gallery (9)
  sage: require('../../assets/avatars/sage.png'),
  amara: require('../../assets/avatars/amara.png'),
  eli: require('../../assets/avatars/eli.png'),
  selene: require('../../assets/avatars/selene.png'),
  soren: require('../../assets/avatars/soren.png'),
  juno: require('../../assets/avatars/juno.png'),
  thea: require('../../assets/avatars/thea.png'),
  cyrus: require('../../assets/avatars/cyrus.png'),
  wren: require('../../assets/avatars/wren.png'),
};

export function avatarFor(id: string): ImageSourcePropType | undefined {
  return AVATARS[id?.toLowerCase?.()];
}

// Per-persona outfit recolors ("looks"). Each is a pre-baked variant of the SAME portrait with only
// the apparel recolored (segment the garment, tint by its luminance so folds/shading carry through)
// — NOT a whole-image tint. Baked offline (client/scripts/dev/bake-look-variants.py) to a plain PNG
// so rendering stays a bare <Image> with zero runtime filters. Every persona ships all three looks.
const LOOK_VARIANTS: Record<string, Partial<Record<string, ImageSourcePropType>>> = {
  aurora: {
    sage: require('../../assets/avatars/looks/aurora-sage.png'),
    rose: require('../../assets/avatars/looks/aurora-rose.png'),
    dusk: require('../../assets/avatars/looks/aurora-dusk.png'),
  },
  orion: {
    sage: require('../../assets/avatars/looks/orion-sage.png'),
    rose: require('../../assets/avatars/looks/orion-rose.png'),
    dusk: require('../../assets/avatars/looks/orion-dusk.png'),
  },
  lyra: {
    sage: require('../../assets/avatars/looks/lyra-sage.png'),
    rose: require('../../assets/avatars/looks/lyra-rose.png'),
    dusk: require('../../assets/avatars/looks/lyra-dusk.png'),
  },
  sage: {
    sage: require('../../assets/avatars/looks/sage-sage.png'),
    rose: require('../../assets/avatars/looks/sage-rose.png'),
    dusk: require('../../assets/avatars/looks/sage-dusk.png'),
  },
  amara: {
    sage: require('../../assets/avatars/looks/amara-sage.png'),
    rose: require('../../assets/avatars/looks/amara-rose.png'),
    dusk: require('../../assets/avatars/looks/amara-dusk.png'),
  },
  eli: {
    sage: require('../../assets/avatars/looks/eli-sage.png'),
    rose: require('../../assets/avatars/looks/eli-rose.png'),
    dusk: require('../../assets/avatars/looks/eli-dusk.png'),
  },
  selene: {
    sage: require('../../assets/avatars/looks/selene-sage.png'),
    rose: require('../../assets/avatars/looks/selene-rose.png'),
    dusk: require('../../assets/avatars/looks/selene-dusk.png'),
  },
  soren: {
    sage: require('../../assets/avatars/looks/soren-sage.png'),
    rose: require('../../assets/avatars/looks/soren-rose.png'),
    dusk: require('../../assets/avatars/looks/soren-dusk.png'),
  },
  juno: {
    sage: require('../../assets/avatars/looks/juno-sage.png'),
    rose: require('../../assets/avatars/looks/juno-rose.png'),
    dusk: require('../../assets/avatars/looks/juno-dusk.png'),
  },
  thea: {
    sage: require('../../assets/avatars/looks/thea-sage.png'),
    rose: require('../../assets/avatars/looks/thea-rose.png'),
    dusk: require('../../assets/avatars/looks/thea-dusk.png'),
  },
  cyrus: {
    sage: require('../../assets/avatars/looks/cyrus-sage.png'),
    rose: require('../../assets/avatars/looks/cyrus-rose.png'),
    dusk: require('../../assets/avatars/looks/cyrus-dusk.png'),
  },
  wren: {
    sage: require('../../assets/avatars/looks/wren-sage.png'),
    rose: require('../../assets/avatars/looks/wren-rose.png'),
    dusk: require('../../assets/avatars/looks/wren-dusk.png'),
  },
};

/** The recolored portrait for a (persona, look), or undefined to use the base portrait. */
export function lookVariantFor(id: string, lookId: string | undefined): ImageSourcePropType | undefined {
  if (!lookId) return undefined;
  return LOOK_VARIANTS[id?.toLowerCase?.()]?.[lookId];
}

/** Look ids this persona has art for (always includes 'default'; drives the look picker). */
export function looksAvailableFor(id: string): string[] {
  return ['default', ...Object.keys(LOOK_VARIANTS[id?.toLowerCase?.()] ?? {})];
}
