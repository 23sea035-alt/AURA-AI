// You — the account hub. Apple Settings grammar warmed up: header card (avatar, name, @handle,
// tier pill, edit) + grouped list rows + an isolated confirm-first Sign out + version footer.
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import ConfirmSheet from '@/components/ConfirmSheet';
import { ListGroup, ListRow } from '@/components/ListGroup';
import { PressableScale } from '@/components/motion';
import { Segmented } from '@/components/Segmented';
import { FONTS, RADIUS, SPACE, TYPE } from '@/constants/design';
import { useApp } from '@/context/AppContext';
import { useTheme, type ThemePreference } from '@/hooks/useTheme';

const APPEARANCE_OPTIONS = ['system', 'light', 'dark'] as const;

export default function YouScreen() {
  const { colors, shadows, mode, preference, setPreference } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, logout } = useApp();
  const [signOutOpen, setSignOutOpen] = useState(false);

  const isPremium = !!user?.isPremium;
  const name = user?.name || 'Your account';
  const handle = user?.email ? `@${user.email.split('@')[0]}` : '';

  const handleSignOut = () => {
    setSignOutOpen(false);
    logout();
    router.replace('/welcome');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + SPACE.xl, paddingBottom: insets.bottom + 110 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Screen title — parity with Home/Companions' display headline (and iOS large-title
            grammar: title above the account card). */}
        <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>You</Text>

        {/* Header card */}
        <View style={[styles.header, { backgroundColor: colors.raised }, shadows.e2]}>
          <Avatar id="" name={name} size={56} color={user?.avatarColor} />
          <View style={styles.headerText}>
            <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
              {name}
            </Text>
            {handle ? <Text style={[styles.handle, { color: colors.textSecondary }]}>{handle}</Text> : null}
          </View>
          <View
            style={[
              styles.tier,
              isPremium
                ? { backgroundColor: colors.accent }
                : { borderWidth: 1, borderColor: colors.border },
            ]}
          >
            <Text
              style={[styles.tierText, { color: isPremium ? colors.onAccent : colors.textSecondary }]}
            >
              {isPremium ? 'Premium' : 'Free'}
            </Text>
          </View>
        </View>

        <View style={styles.appearance}>
          <Text style={[styles.groupLabel, { color: colors.textSecondary }]}>Appearance</Text>
          <Segmented
            options={APPEARANCE_OPTIONS}
            value={preference}
            onChange={(v) => setPreference(v as ThemePreference)}
          />
        </View>

        <ListGroup label="Account">
          <ListRow first label="Edit profile" onPress={() => router.push('/edit-profile')} />
          <ListRow label="Sign-in & security" onPress={() => router.push('/sign-in-security')} />
          <ListRow
            label="Subscription"
            detail={isPremium ? 'Manage in App Store' : 'Upgrade to Premium'}
            onPress={() => router.push(isPremium ? '/subscription' : '/premium')}
          />
          <ListRow label="Notifications" onPress={() => router.push('/notifications')} />
          <ListRow label="Voice" onPress={() => router.push('/voice-preferences')} />
        </ListGroup>

        <ListGroup label="Privacy & Safety">
          <ListRow first label="Safety center" onPress={() => router.push('/safety')} />
          <ListRow label="Privacy policy" onPress={() => router.push('/privacy')} />
          <ListRow label="Manage your data" onPress={() => router.push('/account')} />
        </ListGroup>

        <ListGroup label="Support">
          <ListRow first label="Help" onPress={() => router.push('/help')} />
          <ListRow label="Rate Aura" onPress={() => router.push('/rate-app')} />
        </ListGroup>

        <PressableScale haptic="light" onPress={() => setSignOutOpen(true)} style={[styles.signOut, { backgroundColor: colors.raised, borderColor: colors.border }]}>
          <Text style={[styles.signOutText, { color: colors.error }]}>Sign out</Text>
        </PressableScale>

        <Text style={[styles.version, { color: colors.textTertiary }]}>Aura · version 1.0.0</Text>
      </ScrollView>

      <ConfirmSheet
        visible={signOutOpen}
        onClose={() => setSignOutOpen(false)}
        title="Sign out?"
        message="You can sign back in anytime."
        confirmLabel="Sign out"
        destructive
        onConfirm={handleSignOut}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  // Without flex:1, the ScrollView's own viewport sizes to its content instead of stretching to
  // fill the screen — its touchable bounds stop short of the floating tab bar, so a scroll
  // gesture in that gap never reaches the ScrollView at all.
  scroll: { flex: 1 },
  // flexGrow: the content wrapper spans the full frame (not just its own content) so the whole
  // header-to-navbar area stays swipeable even when under-filled.
  content: { flexGrow: 1, paddingHorizontal: SPACE.xl, gap: SPACE.lg },
  screenTitle: { ...TYPE.headline, marginBottom: -SPACE.xs },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.md,
    borderRadius: RADIUS.card,
    padding: SPACE.lg,
  },
  headerText: { flex: 1 },
  appearance: { gap: SPACE.sm },
  groupLabel: { fontFamily: FONTS.body.semibold, fontSize: 13, marginLeft: SPACE.xs },
  name: { ...TYPE.title },
  handle: { fontFamily: FONTS.body.regular, fontSize: 14 },
  tier: { paddingHorizontal: SPACE.md, paddingVertical: SPACE.xs, borderRadius: RADIUS.pill },
  tierText: { fontFamily: FONTS.body.semibold, fontSize: 13 },
  signOut: {
    alignItems: 'center',
    borderRadius: RADIUS.soft,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: SPACE.lg,
    marginTop: SPACE.sm,
  },
  signOutText: { fontFamily: FONTS.body.semibold, fontSize: 16 },
  version: { fontFamily: FONTS.body.regular, fontSize: 12, textAlign: 'center', marginTop: SPACE.sm },
});
