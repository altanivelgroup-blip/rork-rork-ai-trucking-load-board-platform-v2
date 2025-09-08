import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';

let CronTestScreen: React.ComponentType | null = null;
if (typeof __DEV__ !== 'undefined' && __DEV__) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  CronTestScreen = require('@/components/dev/CronTestScreen').default;
}

export default function DevCronRoute() {
  if (!(typeof __DEV__ !== 'undefined' && __DEV__)) {
    return (
      <View style={styles.locked} testID="dev-cron-locked">
        <Stack.Screen options={{ title: 'Unavailable' }} />
        <Text style={styles.lockedText}>Dev-only screen. Not available in production builds.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container} testID="dev-cron-route">
      <Stack.Screen options={{ title: 'Cron Test (Dev)' }} />
      {CronTestScreen ? <CronTestScreen /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F8',
  },
  locked: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#FFF',
  },
  lockedText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});
