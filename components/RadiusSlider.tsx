import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '@/constants/theme';

interface RadiusSliderProps {
  value: number;
  onValueChange: (value: number) => void;
  options?: number[];
}

const DEFAULT_OPTIONS = [25, 50, 100, 250];

export const RadiusSlider: React.FC<RadiusSliderProps> = ({
  value,
  onValueChange,
  options = DEFAULT_OPTIONS,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Search Radius</Text>
      <View style={styles.optionsContainer}>
        {options.map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.option,
              value === option && styles.optionActive,
            ]}
            onPress={() => onValueChange(option)}
            testID={`radius-option-${option}`}
          >
            <Text
              style={[
                styles.optionText,
                value === option && styles.optionTextActive,
              ]}
            >
              {option} mi
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: 8,
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  option: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.lightGray,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.lightGray,
  },
  optionActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  optionTextActive: {
    color: theme.colors.white,
  },
});