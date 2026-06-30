// Standardized entrance/exit animations built on the motion tokens. Reanimated
// layout animations run on the UI thread and (via ReduceMotion.System) auto-honor
// the OS Reduce-Motion setting — disabling the transform travel while keeping a
// safe fade. Exits are shorter/quieter than entrances.

import { FadeIn, FadeInDown, FadeOut, ReduceMotion } from 'react-native-reanimated';
import { DURATION, STAGGER_MS } from '@/constants/motion';

/**
 * Staggered "rise + fade" entrance. Pass the item's index so siblings cascade.
 * Use on list items, stacked cards, message rows, etc.
 */
export const enterUp = (index = 0) =>
  FadeInDown.delay(index * STAGGER_MS)
    .duration(DURATION.normal)
    .reduceMotion(ReduceMotion.System);

/** Plain fade-in for hero/standalone elements. */
export const fadeIn = (index = 0) =>
  FadeIn.delay(index * STAGGER_MS)
    .duration(DURATION.normal)
    .reduceMotion(ReduceMotion.System);

/** Quieter, shorter exit. */
export const fadeOut = () => FadeOut.duration(DURATION.fast).reduceMotion(ReduceMotion.System);
