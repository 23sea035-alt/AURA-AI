// Rate Aura — a calm star rating + optional note, then a warm thank-you. Pushed from You. (Replaces
// the cosmic gold-gradient rating screen; one accent, no glow.)
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackChevron } from '@/components/BackChevron';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { PressableScale } from '@/components/motion';
import { FONTS, RADIUS, SPACE, TYPE } from '@/constants/design';
import { useTheme } from '@/hooks/useTheme';

const LABELS = ['Tap a star to rate', 'Needs work', "It's okay", 'Good', 'Really good', 'Love it'];

export default function RateAppScreen() {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [focused, setFocused] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top + SPACE.md }]}>
        <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
        <BackChevron />
        <View style={styles.thanks}>
          <EmptyState
            emoji="🌟"
            title="Thank you"
            body="Your review helps us make Aura a warmer place for everyone."
          />
          <Button label="Done" onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top + SPACE.md }]}>
        <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + SPACE.xl }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <BackChevron />
          <Text style={[styles.title, { color: colors.textPrimary }]}>Rate Aura</Text>
          <Text style={[styles.sub, { color: colors.textSecondary }]}>
            How has your time with your companion felt?
          </Text>

          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((s) => (
              <PressableScale key={s} haptic="light" hitSlop={6} onPress={() => setRating(s)}>
                <Ionicons
                  name={rating >= s ? 'star' : 'star-outline'}
                  size={40}
                  color={rating >= s ? colors.accent : colors.textTertiary}
                />
              </PressableScale>
            ))}
          </View>
          <Text style={[styles.ratingLabel, { color: colors.textSecondary }]}>{LABELS[rating]}</Text>

          <View
            style={[
              styles.reviewBox,
              { backgroundColor: colors.raised, borderColor: focused ? colors.accent : colors.border },
            ]}
          >
            <TextInput
              style={[styles.reviewInput, { color: colors.textPrimary }]}
              value={review}
              onChangeText={setReview}
              placeholder="Share a little more (optional)"
              placeholderTextColor={colors.textTertiary}
              multiline
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
            />
          </View>

          <View style={styles.action}>
            <Button label="Submit" onPress={() => rating > 0 && setSubmitted(true)} disabled={rating === 0} />
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, paddingHorizontal: SPACE.xl },
  content: { flexGrow: 1, gap: SPACE.md },
  title: { ...TYPE.headline },
  sub: { ...TYPE.body },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: SPACE.sm, marginTop: SPACE.md },
  ratingLabel: { fontFamily: FONTS.body.medium, fontSize: 14, textAlign: 'center' },
  reviewBox: { borderRadius: RADIUS.edit, borderWidth: 1, padding: SPACE.md, marginTop: SPACE.sm },
  reviewInput: { fontFamily: FONTS.body.regular, fontSize: 15, minHeight: 96, textAlignVertical: 'top' },
  action: { marginTop: 'auto', paddingTop: SPACE.lg },
  thanks: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACE.lg, paddingHorizontal: SPACE.xl },
});
