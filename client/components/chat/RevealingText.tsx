// The typing reveal — the signature reply moment. The companion's words write
// themselves in word-by-word like calm handwriting: a held "considering" beat
// happens upstream (the thinking indicator); this component paces the words,
// breathes at sentence ends, and shows a small wine caret while writing.
// Long replies compress so the whole reveal never outstays ~6 seconds.
// Reduce-motion: the full text lands at once (snap-to-final), onDone still fires.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { TYPING } from '@/constants/motion';
import { useTheme } from '@/hooks/useTheme';

const MAX_REVEAL_MS = 6000;
const SENTENCE_END = /[.!?…]["')\]]?$/;

interface RevealingTextProps {
  text: string;
  style?: StyleProp<TextStyle>;
  /** Fires as words land (throttled by cadence) — used to keep the thread pinned to the bottom. */
  onProgress?: () => void;
  onDone?: () => void;
}

export function RevealingText({ text, style, onProgress, onDone }: RevealingTextProps) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const words = useMemo(() => text.split(' '), [text]);
  const [shown, setShown] = useState(reduceMotion ? words.length : 0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doneRef = useRef(false);

  // Compress the cadence for long replies so the payoff stays a moment, not a wait.
  const wordMs = Math.min(TYPING.wordMs, MAX_REVEAL_MS / words.length);

  useEffect(() => {
    if (reduceMotion) {
      setShown(words.length);
      if (!doneRef.current) {
        doneRef.current = true;
        onDone?.();
      }
      return;
    }
    let count = 0;
    const step = () => {
      count += 1;
      setShown(count);
      onProgress?.();
      if (count >= words.length) {
        if (!doneRef.current) {
          doneRef.current = true;
          onDone?.();
        }
        return;
      }
      const pause = SENTENCE_END.test(words[count - 1]) ? TYPING.sentencePauseMs : 0;
      timer.current = setTimeout(step, wordMs + pause);
    };
    timer.current = setTimeout(step, wordMs);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, reduceMotion]);

  const revealing = shown < words.length;

  return (
    <Text style={style}>
      {words.slice(0, shown).join(' ')}
      {revealing ? <Text style={{ color: colors.accent }}>{shown > 0 ? ' ▍' : '▍'}</Text> : null}
    </Text>
  );
}
