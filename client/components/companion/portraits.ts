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
