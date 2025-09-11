import React from 'react';
import { View, Text, ViewStyle, TextStyle, StyleSheet } from 'react-native';

type Variant = 'active' | 'expired' | 'free';
type Color = 'gray' | 'green' | 'blue' | 'amber';

type Props = {
  label?: string;
  children?: string;
  variant?: Variant;
  color?: Color;
  style?: ViewStyle;
  textStyle?: TextStyle;
};

const colorMap: Record<Color, { bg: string; fg: string }> = {
  gray: { bg: '#F3F4F6', fg: '#374151' },
  green: { bg: '#059669', fg: '#FFFFFF' },
  blue: { bg: '#2563EB', fg: '#FFFFFF' },
  amber: { bg: '#FEF3C7', fg: '#92400E' },
};

const variantToColor: Record<Variant, Color> = {
  active: 'green',
  expired: 'amber',
  free: 'gray',
};

export const SafePill: React.FC<Props> = ({ label, children, variant = 'free', color, style, textStyle }) => {
  const resolvedColor: Color = color ?? variantToColor[variant];
  const { bg, fg } = colorMap[resolvedColor];
  const content = label ?? children ?? '';

  return (
    <View style={[styles.base, { backgroundColor: bg }, style]} testID="safe-pill">
      <Text style={[styles.text, { color: fg }, textStyle]} numberOfLines={1}>
        {content}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    fontWeight: '600',
    fontSize: 14,
  },
});

export default SafePill;
