// Per-persona playback boost (dB), applied through the native AudioBoost module
// (modules/audio-boost — AVAudioEngine EQ gain). Inworld's synth API has no volume field and
// expo-audio's volume clamps at 1.0, so quiet casts get amplified at playback instead
// (docs/specs/voice-casting-guide.md §Output volume).
//
// Values come from `cd server && pnpm voices:levels` (EBU R128 survey of the audition clips,
// 2026-07-10): gain ≈ (cast median −21.3 LUFS − persona integrated LUFS), capped ~1 dB under the
// worst measured take's true-peak headroom so boosted playback stays clear of clipping. Take
// variance is ~±2 dB loudness / up to 4 dB peak, so the caps are computed against worst takes.
// Re-run the survey and revisit these when a persona is recast.
export const PERSONA_GAIN_DB: Record<string, number> = {
  thea: 9, // −32.6 LUFS, quietest of the cast; peak headroom caps the full +11.3 parity gap
  soren: 4, // −28.2 LUFS; peak-limited (clips above ~+5)
  sage: 4, // −27.2 LUFS; peak-limited (clips above ~+5.4)
  aurora: 3.5, // −24.8 LUFS; full gap fits inside headroom
  selene: 1, // −21.6 LUFS ≈ cast median, but her soft timbre reads quieter than it measures
};

/** Playback gain for a persona (0 = play through the normal expo-audio path untouched). */
export function gainDbFor(personaKey: string | null | undefined): number {
  return (personaKey && PERSONA_GAIN_DB[personaKey.toLowerCase()]) || 0;
}
