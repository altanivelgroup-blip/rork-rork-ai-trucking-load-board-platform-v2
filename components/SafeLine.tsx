import React from 'react';
import { Text, TextStyle, StyleSheet } from 'react-native';

type Props = { children: string; style?: TextStyle };

export const SafeLine: React.FC<Props> = ({ children, style }) => {
  return (
    <Text style={[styles.text, style]} numberOfLines={2} testID="safe-line">
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  text: {
    color: '#6B7280',
    fontSize: 12,
  },
});

export default SafeLine;
