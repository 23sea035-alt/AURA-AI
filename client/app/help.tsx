// Help / support — a short FAQ of expand-in-place disclosure rows + a quiet Contact support footer.
// Calm utility: neutral rows, soft height ease (reduce-motion honored), chevron flips on open.
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Linking } from 'react-native';
import Animated, { FadeIn, LinearTransition, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackChevron } from '@/components/BackChevron';
import { ListGroup } from '@/components/ListGroup';
import { PressableScale } from '@/components/motion';
import { HELP, withAppName } from '@/constants/content';
import { FONTS, SPACE, TYPE } from '@/constants/design';
import { useTheme } from '@/hooks/useTheme';

function FaqRow({
  question,
  answer,
  open,
  onToggle,
  first,
}: {
  question: string;
  answer: string;
  open: boolean;
  onToggle: () => void;
  first: boolean;
}) {
  const { colors } = useTheme();
  const reduce = useReducedMotion();
  return (
    <Animated.View
      layout={reduce ? undefined : LinearTransition.duration(220)}
      style={!first ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider } : undefined}
    >
      <PressableScale onPress={onToggle} haptic="light" style={styles.faqHead}>
        <Text style={[styles.faqQ, { color: colors.textPrimary }]}>{question}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={17} color={colors.textTertiary} />
      </PressableScale>
      {open ? (
        <Animated.Text
          entering={reduce ? undefined : FadeIn.duration(180)}
          style={[styles.faqA, { color: colors.textSecondary }]}
        >
          {answer}
        </Animated.Text>
      ) : null}
    </Animated.View>
  );
}

export default function HelpScreen() {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState<number | null>(null);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top + SPACE.md }]}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + SPACE.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <BackChevron />
        <Text style={[styles.title, { color: colors.textPrimary }]}>Help</Text>
        <ListGroup label="Frequently asked">
          {HELP.faq.map((item, i) => (
            <FaqRow
              key={item.topic}
              question={withAppName(item.question)}
              answer={withAppName(item.answer)}
              open={open === i}
              onToggle={() => setOpen((o) => (o === i ? null : i))}
              first={i === 0}
            />
          ))}
        </ListGroup>
        <PressableScale
          haptic="light"
          onPress={() => Linking.openURL('mailto:support@aura.app').catch(() => {})}
          style={styles.contactBtn}
        >
          <Text style={[styles.contact, { color: colors.textSecondary }]}>{HELP.contact}</Text>
        </PressableScale>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: SPACE.xl },
  content: { gap: SPACE.md },
  title: { ...TYPE.headline, marginBottom: SPACE.xs },
  faqHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.md,
    paddingHorizontal: SPACE.lg,
    paddingVertical: SPACE.md,
    minHeight: 52,
  },
  faqQ: { flex: 1, fontFamily: FONTS.body.medium, fontSize: 15, lineHeight: 21 },
  faqA: { paddingHorizontal: SPACE.lg, paddingBottom: SPACE.lg, fontFamily: FONTS.body.regular, fontSize: 14, lineHeight: 22 },
  contactBtn: { alignItems: 'center', paddingVertical: SPACE.md, marginTop: SPACE.sm },
  contact: { fontFamily: FONTS.body.medium, fontSize: 14 },
});
