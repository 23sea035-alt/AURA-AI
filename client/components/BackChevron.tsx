// Top-left back affordance for pushed/forward screens. expo-router router.back(), with a safe
// fallback to Welcome when there's no back stack (e.g. opened via deep link). iOS has no system
// back, so screens in a forward flow should render this; on Android it mirrors the system back.
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { PressableScale } from '@/components/motion';
import { SPACE } from '@/constants/design';
import { useTheme } from '@/hooks/useTheme';

export function BackChevron({ onPress }: { onPress?: () => void }) {
  const { colors } = useTheme();
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/welcome'));
  return (
    <View style={styles.row}>
      <PressableScale
        onPress={onPress ?? goBack}
        hitSlop={10}
        haptic="light"
        accessibilityRole="button"
        accessibilityLabel="Go back"
        style={styles.btn}
      >
        <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { height: 38, justifyContent: 'center', marginLeft: -6, marginBottom: SPACE.xs },
  btn: { alignSelf: 'flex-start', padding: 6 },
});
