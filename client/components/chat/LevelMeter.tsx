// Live recording meter — a scrolling row of bars driven by the mic input level (0..1). Newest sample
// enters on the right and scrolls left, so it reads as a waveform responding to the user's voice.
// Resets flat when not recording.
import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';

const BARS = 24;
const MIN_H = 3;
const MAX_H = 22;
const TICK_MS = 90;

interface LevelMeterProps {
  level: number; // 0..1 current input level
  active: boolean; // recording?
  color: string;
}

export function LevelMeter({ level, active, color }: LevelMeterProps) {
  const [bars, setBars] = useState<number[]>(() => new Array(BARS).fill(0));
  const levelRef = useRef(0);
  levelRef.current = level;

  useEffect(() => {
    if (!active) {
      setBars(new Array(BARS).fill(0));
      return;
    }
    const id = setInterval(() => {
      setBars((prev) => [...prev.slice(1), levelRef.current]);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [active]);

  return (
    <View style={styles.meter}>
      {bars.map((v, i) => (
        <View
          key={i}
          style={[styles.bar, { height: MIN_H + v * MAX_H, backgroundColor: color, opacity: 0.35 + v * 0.65 }]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  meter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
    height: MIN_H + MAX_H,
  },
  bar: { width: 3, borderRadius: 1.5 },
});
