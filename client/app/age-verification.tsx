// Age gate — the first gate after auth. One warm question, three @quidone wheel columns
// (month / day / year) sharing ONE custom wine selection band, in the brand font, and a gentle
// inline 18+ notice (non-shaming, clears on correction).
import WheelPicker from '@quidone/react-native-wheel-picker';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, type StyleProp, type TextStyle } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackChevron } from '@/components/BackChevron';
import { Button } from '@/components/Button';
import { enterUp } from '@/components/motion';
import { ONBOARDING, withAppName } from '@/constants/content';
import { FONTS, RADIUS, SPACE, TYPE } from '@/constants/design';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/useTheme';
import { isAdult } from '@/utils/age';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const CURRENT_YEAR = new Date().getFullYear();
const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();

const ITEM_H = 40;
const VISIBLE = 5;
const WHEEL_H = ITEM_H * VISIBLE;

type Item = { value: number; label: string };

// Stable data identities — rebuilding these each render makes @quidone re-init its list and
// interrupt an in-flight tap animation (the cause of the off-grid parking on fast taps).
const MONTH_DATA: Item[] = MONTHS.map((label, value) => ({ value, label }));
const YEAR_DATA: Item[] = Array.from({ length: 101 }, (_, i) => {
  const y = CURRENT_YEAR - i;
  return { value: y, label: String(y) };
});

// One wheel column, memoized so tapping a sibling column never re-renders (and interrupts) it.
const Column = memo(function Column({
  data,
  value,
  onChange,
  textStyle,
}: {
  data: Item[];
  value: number;
  onChange: (value: number) => void;
  textStyle: StyleProp<TextStyle>;
}) {
  return (
    <View style={styles.col}>
      <WheelPicker
        data={data}
        value={value}
        onValueChanged={(e) => onChange(e.item.value)}
        itemHeight={ITEM_H}
        visibleItemCount={VISIBLE}
        width="100%"
        enableScrollByTapOnItem={false} // tap-scroll can't survive fast taps (parks off-grid); swipe only
        renderOverlay={null}
        itemTextStyle={textStyle}
      />
    </View>
  );
});

export default function AgeVerificationScreen() {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const { updateUser } = useApp();
  const copy = ONBOARDING.ageGate;

  const today = new Date();
  const [year, setYear] = useState(CURRENT_YEAR - 22); // a neutral, comfortably-adult seed (~22)
  const [month, setMonth] = useState(today.getMonth());
  const [day, setDay] = useState(15);
  const [showUnder18, setShowUnder18] = useState(false);

  const maxDay = daysInMonth(year, month);
  const clampedDay = Math.min(day, maxDay); // e.g. 31 → Feb shows 28 until corrected
  const ok = isAdult(new Date(year, month, clampedDay));

  const dayData = useMemo<Item[]>(
    () => Array.from({ length: maxDay }, (_, i) => ({ value: i + 1, label: String(i + 1) })),
    [maxDay],
  );

  // Current values in a ref so the per-column callbacks stay referentially stable (keeps the
  // memoized columns from re-rendering when a sibling changes).
  const stateRef = useRef({ year, month, day });
  stateRef.current = { year, month, day };

  const clearNotice = () => setShowUnder18(false); // setState bails out when already false
  const onMonth = useCallback((m: number) => {
    const s = stateRef.current;
    setMonth(m);
    if (s.day > daysInMonth(s.year, m)) setDay(daysInMonth(s.year, m));
    clearNotice();
  }, []);
  const onYear = useCallback((y: number) => {
    const s = stateRef.current;
    setYear(y);
    if (s.day > daysInMonth(y, s.month)) setDay(daysInMonth(y, s.month));
    clearNotice();
  }, []);
  const onDay = useCallback((d: number) => {
    setDay(d);
    clearNotice();
  }, []);

  const handleContinue = () => {
    if (ok) {
      updateUser({ birthYear: year, isMinor: false, ageVerified: true });
      router.push('/ai-disclosure');
    } else {
      updateUser({ birthYear: year, isMinor: true, ageVerified: false });
      setShowUnder18(true);
    }
  };

  const textStyle = useMemo(
    () => ({ fontFamily: FONTS.body.semibold, fontSize: 20, color: colors.textPrimary }),
    [colors.textPrimary],
  );

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.bg, paddingTop: insets.top + SPACE.md, paddingBottom: insets.bottom + SPACE.lg },
      ]}
    >
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <BackChevron />

      <View style={styles.header}>
        <Animated.Text entering={enterUp(0)} style={[styles.title, { color: colors.textPrimary }]}>
          {copy.title}
        </Animated.Text>
        <Animated.Text entering={enterUp(1)} style={[styles.body, { color: colors.textSecondary }]}>
          {withAppName(copy.body)}
        </Animated.Text>
      </View>

      {/* Three wheels under one continuous wine band — brand font, snap + tap from the library. */}
      <Animated.View entering={enterUp(2)} style={styles.pickerWrap}>
        <View style={[styles.pickerRow, { height: WHEEL_H }]}>
          <View
            pointerEvents="none"
            style={[
              styles.band,
              { top: (WHEEL_H - ITEM_H) / 2, height: ITEM_H, backgroundColor: colors.accentTint, borderColor: colors.border },
            ]}
          />
          <Column data={MONTH_DATA} value={month} onChange={onMonth} textStyle={textStyle} />
          <Column data={dayData} value={clampedDay} onChange={onDay} textStyle={textStyle} />
          <Column data={YEAR_DATA} value={year} onChange={onYear} textStyle={textStyle} />
        </View>
      </Animated.View>

      <View style={styles.action}>
        {/* Gentle, non-shaming inline notice — absolutely positioned so it never shifts the picker. */}
        {showUnder18 && !ok ? (
          <Animated.View entering={FadeIn.duration(300)} style={styles.notice} pointerEvents="none">
            <Text style={[styles.noticeText, { color: colors.accent }]}>{withAppName(copy.under18)}</Text>
          </Animated.View>
        ) : null}
        <Button label={copy.cta} onPress={handleContinue} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: SPACE.xl },
  header: { marginTop: SPACE.md, marginBottom: SPACE.xl, gap: SPACE.sm },
  title: { ...TYPE.headline },
  body: { ...TYPE.body },
  pickerWrap: { flex: 1, justifyContent: 'center' },
  pickerRow: { flexDirection: 'row', position: 'relative' },
  col: { flex: 1 },
  band: { position: 'absolute', left: 0, right: 0, borderRadius: RADIUS.soft, borderWidth: 1 },
  action: { paddingTop: SPACE.xl },
  notice: { position: 'absolute', left: 0, right: 0, bottom: '100%', alignItems: 'center', paddingBottom: SPACE.md },
  noticeText: { fontFamily: FONTS.body.medium, fontSize: 15, lineHeight: 20, textAlign: 'center' },
});
