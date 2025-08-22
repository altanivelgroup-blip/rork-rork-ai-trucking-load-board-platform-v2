import React from 'react';
import { View, ActivityIndicator } from 'react-native';

export default function IndexScreen() {
  return (
    <View style={{
      flex: 1,
      backgroundColor: '#0b1220',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <ActivityIndicator size="large" color="#EA580C" />
    </View>
  );
}