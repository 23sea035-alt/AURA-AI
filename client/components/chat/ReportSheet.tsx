// Report sheet — a low-friction, non-punitive bottom sheet for flagging an AI message.
// Ports the locked prototype (oneoff-app.jsx → ReportSheet): title + reassurance line, reason
// pills (one-select), an optional free-text note, then Cancel / Submit (disabled until a reason
// is picked). Submit hands the reason + note up; the caller fires the report and shows a toast.
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';

import BottomSheet from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { PressableScale } from '@/components/motion';
import { CHAT } from '@/constants/content';
import { withAppName } from '@/constants/content/brand';
import { FONTS, RADIUS, SPACE, TYPE } from '@/constants/design';
import { useTheme } from '@/hooks/useTheme';

export function ReportSheet({
  visible,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (reason: string, note: string) => void;
}) {
  const { colors } = useTheme();
  const r = CHAT.report;
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const reset = () => {
    setReason(null);
    setNote('');
  };
  const handleClose = () => {
    reset();
    onClose();
  };
  const handleSubmit = () => {
    if (!reason) return;
    onSubmit(reason, note.trim());
    reset();
  };

  return (
    <BottomSheet visible={visible} onClose={handleClose}>
      <View style={styles.wrap}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{withAppName(r.title)}</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>{r.body}</Text>

        <View style={styles.chips}>
          {r.reasons.map((opt) => {
            const on = reason === opt;
            return (
              <PressableScale
                key={opt}
                haptic="light"
                onPress={() => setReason(opt)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={[
                  styles.chip,
                  { backgroundColor: on ? colors.accent : colors.raised, borderColor: on ? colors.accent : colors.border },
                ]}
              >
                <Text style={[styles.chipText, { color: on ? colors.onAccent : colors.textSecondary }]}>{opt}</Text>
              </PressableScale>
            );
          })}
        </View>

        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder={r.notePlaceholder}
          placeholderTextColor={colors.textTertiary}
          multiline
          style={[styles.note, { backgroundColor: colors.raised, borderColor: colors.border, color: colors.textPrimary }]}
        />

        <View style={styles.actions}>
          <Button label={r.cancel} variant="secondary" size="md" onPress={handleClose} style={styles.cancel} />
          <Button label={r.submit} size="md" onPress={handleSubmit} disabled={!reason} style={styles.submit} />
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: SPACE.xs, gap: SPACE.md },
  title: { ...TYPE.title },
  body: { ...TYPE.body, fontSize: 14, lineHeight: 20 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm },
  chip: { paddingHorizontal: SPACE.lg, paddingVertical: SPACE.sm, borderRadius: RADIUS.pill, borderWidth: 1 },
  chipText: { fontFamily: FONTS.body.semibold, fontSize: 13.5 },
  note: {
    minHeight: 56,
    borderWidth: 1,
    borderRadius: RADIUS.soft,
    paddingHorizontal: SPACE.md,
    paddingVertical: SPACE.md,
    fontFamily: FONTS.body.regular,
    fontSize: 15,
    lineHeight: 21,
    textAlignVertical: 'top',
  },
  actions: { flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.xs },
  cancel: { borderRadius: RADIUS.pill },
  submit: { flex: 1, borderRadius: RADIUS.pill },
});
