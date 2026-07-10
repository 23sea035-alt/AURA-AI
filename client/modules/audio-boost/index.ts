// JS face of the AudioBoost native module (ios/AudioBoostModule.swift): boosted local-file
// playback for persona voices that need amplification past expo-audio's 1.0 volume ceiling,
// with the same pitch-preserving playback rate the stock player offers (speaking pace).
import { requireNativeModule } from 'expo-modules-core';

interface AudioBoostNative {
  play(uri: string, gainDb: number, rate: number): Promise<void>;
  stop(): void;
}

const AudioBoost = requireNativeModule<AudioBoostNative>('AudioBoost');

/** Play a local audio file boosted by gainDb at a pitch-preserved playback rate;
 * resolves when playback actually finishes. */
export function playBoosted(uri: string, gainDb: number, rate = 1.0): Promise<void> {
  return AudioBoost.play(uri, gainDb, rate);
}

/** Stop any in-flight boosted playback (resolves its play() promise). */
export function stopBoosted(): void {
  AudioBoost.stop();
}
