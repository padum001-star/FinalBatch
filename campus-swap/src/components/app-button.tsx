import { ActivityIndicator, Pressable, StyleSheet, type PressableProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AccentColors, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Variant = 'primary' | 'secondary' | 'danger';

export type AppButtonProps = PressableProps & {
  label: string;
  variant?: Variant;
  loading?: boolean;
};

export function AppButton({ label, variant = 'primary', loading, disabled, style, ...rest }: AppButtonProps) {
  const theme = useTheme();
  const isDisabled = disabled || loading;

  const backgroundColor =
    variant === 'primary' ? AccentColors.primary : variant === 'danger' ? AccentColors.danger : theme.backgroundElement;
  const textColor = variant === 'secondary' ? theme.text : '#ffffff';

  return (
    <Pressable
      disabled={isDisabled}
      style={(state) => [
        styles.base,
        { backgroundColor, opacity: isDisabled ? 0.6 : state.pressed ? 0.85 : 1 },
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <ThemedText type="smallBold" style={{ color: textColor }}>
          {label}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
