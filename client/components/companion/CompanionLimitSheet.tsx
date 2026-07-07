// The two at-limit cases (roster spec §4), as one bottom sheet — never a paywall redirect.
//   active-full: active == cap, total has room → archive to make room (free also sees Go Premium).
//   total-full:  total == cap — archiving can't help (archived rows still count) → manage archived.
// Hosts wire the CTAs: "Archive a companion" / "Manage archived" drop into the roster in Select
// mode on the matching subtab; "Go Premium" opens the paywall. The copy also carries the §13
// downgrade reassurance when actives sit OVER the cap (soft-lock, never data loss).
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { activeCompanionCap, totalCompanionCap } from '@aura/shared';

import BottomSheet from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { COMPANIONS } from '@/constants/content';
import { SPACE, TYPE } from '@/constants/design';
import { useTheme } from '@/hooks/useTheme';

export type CompanionLimitKind = 'active_full' | 'total_full';

interface Props {
  /** Which cap was hit; null keeps the sheet closed. */
  kind: CompanionLimitKind | null;
  onClose: () => void;
  isPremium: boolean;
  /** Actives currently held — drives the §13 over-cap note after a downgrade. */
  activeCount: number;
  /** Drop into the roster in Select mode: Active tab (archive) / Archived tab (manage). */
  onArchive: () => void;
  onManageArchived: () => void;
  /** Open the paywall (free callers only — premium never sees the upsell here). */
  onGoPremium: () => void;
}

export function CompanionLimitSheet({
  kind,
  onClose,
  isPremium,
  activeCount,
  onArchive,
  onManageArchived,
  onGoPremium,
}: Props) {
  const { colors } = useTheme();
  const copy = kind === 'total_full' ? COMPANIONS.limitSheet.totalFull : COMPANIONS.limitSheet.activeFull;
  const cap = kind === 'total_full' ? totalCompanionCap(isPremium) : activeCompanionCap(isPremium);
  const overCap = kind === 'active_full' && activeCount > cap;

  const act = (fn: () => void) => () => {
    onClose();
    fn();
  };

  return (
    <BottomSheet visible={kind !== null} onClose={onClose} scrollable={false}>
      <View style={styles.body}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {copy.titleTemplate.replace('{cap}', String(cap))}
        </Text>
        <Text style={[styles.text, { color: colors.textSecondary }]}>
          {isPremium ? copy.bodyPremium : copy.bodyFree}
        </Text>
        {overCap ? (
          <Text style={[styles.note, { color: colors.textTertiary }]}>
            {COMPANIONS.limitSheet.activeFull.overCapNote}
          </Text>
        ) : null}
        <View style={styles.actions}>
          {kind === 'total_full' ? (
            <Button label={COMPANIONS.limitSheet.totalFull.manageCta} onPress={act(onManageArchived)} />
          ) : (
            <Button label={COMPANIONS.limitSheet.activeFull.archiveCta} onPress={act(onArchive)} />
          )}
          {!isPremium ? (
            <Button label={COMPANIONS.limitSheet.premiumCta} variant="tinted" onPress={act(onGoPremium)} />
          ) : null}
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: SPACE.sm, paddingTop: SPACE.xs },
  title: { ...TYPE.title },
  text: { ...TYPE.body },
  note: { ...TYPE.caption },
  actions: { gap: SPACE.sm, marginTop: SPACE.md },
});
