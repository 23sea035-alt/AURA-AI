// The curated persona portraits (docs/specs/personas.md — locked flat-gouache
// masters). Lives in its own module so Avatar and FilteredAvatar can both use
// it without importing each other.
import type { ImageSourcePropType } from 'react-native';

const AVATARS: Record<string, ImageSourcePropType> = {
  aurora: require('../../assets/avatars/aurora.png'),
  orion: require('../../assets/avatars/orion.png'),
  lyra: require('../../assets/avatars/lyra.png'),
};

export function avatarFor(id: string): ImageSourcePropType | undefined {
  return AVATARS[id?.toLowerCase?.()];
}
