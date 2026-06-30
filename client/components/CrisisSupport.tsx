// The canonical crisis-support block — grounding, NEVER alarm-red. Uses the calm crisis-green token.
// Shared verbatim by the Safety center and Chat's crisis state. Real tel:/sms: actions.
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View, Text, StyleSheet, Linking } from 'react-native';
import { PressableScale } from '@/components/motion';
import { CRISIS_SUPPORT } from '@/constants/content';
import { FONTS, RADIUS, SPACE } from '@/constants/design';
import { useTheme } from '@/hooks/useTheme';

export function CrisisSupport({ companion }: { companion?: string }) {
  const { colors, shadows } = useTheme();
  const c = CRISIS_SUPPORT;
  return (
    <View style={[styles.card, { backgroundColor: colors.crisisBg }, shadows.e1]}>
      <Text style={[styles.intro, { color: colors.crisisText }]}>{c.intro}</Text>

      <View style={styles.resource}>
        <Text style={[styles.action, { color: colors.crisisText }]}>{c.lifeline.action}</Text>
        <Text style={[styles.detail, { color: colors.crisisText2 }]}>
          {c.lifeline.name} · {c.lifeline.detail}
        </Text>
      </View>
      <View style={styles.resource}>
        <Text style={[styles.action, { color: colors.crisisText }]}>{c.textLine.action}</Text>
        <Text style={[styles.detail, { color: colors.crisisText2 }]}>{c.textLine.name}</Text>
      </View>

      <View style={styles.buttons}>
        <PressableScale
          haptic="light"
          onPress={() => Linking.openURL('tel:988').catch(() => {})}
          accessibilityRole="button"
          accessibilityLabel={c.buttons.call}
          style={[styles.btn, { backgroundColor: colors.crisis }]}
        >
          <Ionicons name="call" size={16} color={colors.onAccent} />
          <Text style={[styles.btnText, { color: colors.onAccent }]}>{c.buttons.call}</Text>
        </PressableScale>
        <PressableScale
          haptic="light"
          onPress={() => Linking.openURL('sms:988').catch(() => {})}
          accessibilityRole="button"
          accessibilityLabel={c.buttons.text}
          style={[styles.btn, { backgroundColor: colors.crisis }]}
        >
          <Ionicons name="chatbubble" size={16} color={colors.onAccent} />
          <Text style={[styles.btnText, { color: colors.onAccent }]}>{c.buttons.text}</Text>
        </PressableScale>
      </View>

      {companion ? (
        <Text style={[styles.keep, { color: colors.crisisText2 }]}>
          {c.keepTalking.replace('{Companion}', companion)}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: RADIUS.card, padding: SPACE.lg, gap: SPACE.md },
  intro: { fontFamily: FONTS.body.medium, fontSize: 15, lineHeight: 21 },
  resource: { gap: 2 },
  action: { fontFamily: FONTS.body.semibold, fontSize: 15 },
  detail: { fontFamily: FONTS.body.regular, fontSize: 13 },
  buttons: { flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.xs },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACE.sm,
    height: 44,
    borderRadius: RADIUS.soft,
  },
  btnText: { fontFamily: FONTS.body.semibold, fontSize: 14 },
  keep: { fontFamily: FONTS.body.regular, fontSize: 13 },
});
