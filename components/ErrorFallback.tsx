import React, { memo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { AlertTriangle, RefreshCw } from 'lucide-react-native';

interface ErrorFallbackProps {
  error?: Error | null;
  onReset?: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, onReset }) => {
  console.log('[ErrorFallback] rendering with error:', error?.message);
  return (
    <View style={styles.container} testID="error-fallback">
      <View style={styles.iconWrap}>
        <AlertTriangle color="#ef4444" size={48} />
      </View>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.message} numberOfLines={3}>
        {error?.message ?? 'An unexpected error occurred.'}
      </Text>
      <TouchableOpacity
        onPress={onReset}
        style={styles.button}
        accessibilityRole="button"
        testID="error-fallback-reset"
      >
        <RefreshCw color="#ffffff" size={18} />
        <Text style={styles.buttonText}>Try again</Text>
      </TouchableOpacity>
    </View>
  );
};

export default memo(ErrorFallback);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#0b1220',
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#1f2937',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#ffffff',
  },
  message: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center' as const,
  },
  button: {
    marginTop: 20,
    minWidth: 44,
    minHeight: 44,
    flexDirection: 'row' as const,
    gap: 8,
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600' as const,
    marginLeft: 8,
  },
});
