// Inline voice-note control for a dictated message: play/pause + a progress scrubber + time, over
// the captured audio clip (Message.audioUri). The transcript stays the canonical text in the bubble;
// this just lets you hear the original. Foreground playback, honors the silent switch.
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, type DimensionValue } from 'react-native';

import { PressableScale } from '@/components/motion';
import { FONTS, SPACE } from '@/constants/design';

let audioModeReady = false;

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

interface VoiceNoteProps {
  uri: string;
  tint: string; // play icon + progress fill + time
  trackColor: string; // inactive scrubber track
}

export function VoiceNote({ uri, tint, trackColor }: VoiceNoteProps) {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    if (audioModeReady) return;
    audioModeReady = true;
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  }, []);

  const duration = status.duration || 0;
  const position = status.currentTime || 0;
  const progress = duration > 0 ? Math.min(position / duration, 1) : 0;
  const label = status.playing || position > 0 ? position : duration;

  const toggle = () => {
    if (status.playing) {
      player.pause();
      return;
    }
    if (status.didJustFinish || (duration > 0 && position >= duration)) player.seekTo(0);
    player.play();
  };

  return (
    <View style={styles.row}>
      <PressableScale
        haptic="light"
        hitSlop={8}
        onPress={toggle}
        accessibilityRole="button"
        accessibilityLabel={status.playing ? 'Pause voice message' : 'Play voice message'}
        style={[styles.play, { borderColor: tint }]}
      >
        <Ionicons name={status.playing ? 'pause' : 'play'} size={15} color={tint} />
      </PressableScale>
      <View style={[styles.track, { backgroundColor: trackColor }]}>
        <View style={[styles.fill, { backgroundColor: tint, width: `${progress * 100}%` as DimensionValue }]} />
      </View>
      <Text style={[styles.time, { color: tint }]}>{formatTime(label)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, marginBottom: SPACE.sm },
  play: { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  track: { flex: 1, height: 3, borderRadius: 2, overflow: 'hidden' },
  fill: { height: 3, borderRadius: 2 },
  time: { fontFamily: FONTS.body.medium, fontSize: 12, minWidth: 32, textAlign: 'right' },
});
