import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { useNavigation } from '@/hooks/useNavigation';
import { CheckCircle, ArrowLeft } from 'lucide-react-native';

export default function PickupScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  
  useEffect(() => {
    console.log('[PickupScreen] Loaded successfully');
    console.log('[PickupScreen] Navigation state:', navigation?.state || 'Navigation hook not available');
  }, [navigation]);

  const handleGoBack = () => {
    console.log('[PickupScreen] Going back');
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <ArrowLeft size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pickup Screen</Text>
      </View>
      
      <View style={styles.content}>
        <CheckCircle size={48} color={theme.colors.success} />
        <Text style={styles.title}>Navigation Successful!</Text>
        <Text style={styles.subtitle}>This confirms the routing is working properly.</Text>
        
        {navigation?.state && (
          <View style={styles.debugInfo}>
            <Text style={styles.debugTitle}>Navigation Debug Info:</Text>
            <Text style={styles.debugText}>Online: {navigation.state.isOffline ? 'No' : 'Yes'}</Text>
            <Text style={styles.debugText}>Loading: {navigation.state.isLoading ? 'Yes' : 'No'}</Text>
            <Text style={styles.debugText}>Error: {navigation.state.error || 'None'}</Text>
            <Text style={styles.debugText}>Voice: {navigation.state.voiceEnabled ? 'Enabled' : 'Disabled'}</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.lightGray,
    backgroundColor: theme.colors.white,
  },
  backButton: {
    marginRight: theme.spacing.md,
  },
  headerTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: '600',
    color: theme.colors.dark,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.dark,
    textAlign: 'center',
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  debugInfo: {
    backgroundColor: theme.colors.white,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    width: '100%',
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  debugTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: theme.spacing.sm,
  },
  debugText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginBottom: theme.spacing.xs,
  },
});