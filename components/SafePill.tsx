import React from 'react';
import { View, Text, ViewStyle, TextStyle, StyleSheet } from 'react-native';

type Props = {
  label: string;
  variant?: 'active' | 'expired' | 'free';
  style?: ViewStyle;
  textStyle?: TextStyle;
};

export const SafePill: React.FC<Props> = ({ label, variant = 'free', style, textStyle }) => {
  const bg = variant === 'active' ? '#059669' : variant === 'expired' ? '#FEF3C7' : '#F3F4F6';
  const fg = variant === 'active' ? '#FFFFFF' : variant === 'expired' ? '#92400E' : '#374151';

  return (
    <View style={[styles.base, { backgroundColor: bg }, style]} testID="safe-pill">
      <Text style={[styles.text, { color: fg }, textStyle]} numberOfLines={1}>
        {label}
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
