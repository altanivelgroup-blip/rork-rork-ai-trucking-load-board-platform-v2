import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useLoads } from '@/hooks/useLoads';
import { Upload, Database, User, FileText } from 'lucide-react-native';

export default function DebugBulkUploadScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { loads } = useLoads();
  const [debugInfo, setDebugInfo] = useState<string>('');

  const runDiagnostics = () => {
    const userLoads = loads.filter(load => 
      load.shipperId === user?.id || 
      (load as any).createdBy === user?.id ||
      (load as any).userId === user?.id
    );
    
    const bulkLoads = loads.filter(load => load.bulkImportId);
    const userBulkLoads = userLoads.filter(load => load.bulkImportId);
    
    const info = `
=== BULK UPLOAD DEBUG INFO ===

User Info:
- User ID: ${user?.id || 'Not logged in'}
- User Email: ${user?.email || 'N/A'}

Loads Summary:
- Total loads in system: ${loads.length}
- User's loads: ${userLoads.length}
- Bulk imported loads (all): ${bulkLoads.length}
- User's bulk imported loads: ${userBulkLoads.length}

Recent User Loads:
${userLoads.slice(0, 3).map((load, i) => `
${i + 1}. ${load.description || 'Untitled'}
   - ID: ${load.id}
   - Rate: $${load.rate || 0}
   - Origin: ${load.origin?.city || 'Unknown'}
   - Destination: ${load.destination?.city || 'Unknown'}
   - Bulk ID: ${load.bulkImportId || 'None'}
   - Shipper ID: ${load.shipperId}
   - Created By: ${(load as any).createdBy || 'N/A'}
`).join('')}

Bulk Loads Details:
${bulkLoads.slice(0, 3).map((load, i) => `
${i + 1}. ${load.description || 'Untitled'}
   - Bulk ID: ${load.bulkImportId}
   - Shipper ID: ${load.shipperId}
   - Created By: ${(load as any).createdBy || 'N/A'}
`).join('')}
    `;
    
    setDebugInfo(info);
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Debug Bulk Upload' }} />
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <FileText size={32} color={theme.colors.primary} />
            <Text style={styles.title}>Bulk Upload Debug</Text>
            <Text style={styles.subtitle}>
              Diagnose bulk upload and shipper dashboard issues
            </Text>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={runDiagnostics}
            >
              <Database size={20} color={theme.colors.white} />
              <Text style={styles.actionButtonText}>Run Diagnostics</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={() => router.push('/csv-bulk-upload')}
            >
              <Upload size={20} color={theme.colors.primary} />
              <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>
                Go to Bulk Upload
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={() => router.push('/shipper-dashboard')}
            >
              <User size={20} color={theme.colors.primary} />
              <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>
                Go to Shipper Dashboard
              </Text>
            </TouchableOpacity>
          </View>

          {debugInfo && (
            <View style={styles.debugOutput}>
              <Text style={styles.debugTitle}>Debug Output:</Text>
              <ScrollView style={styles.debugScroll}>
                <Text style={styles.debugText}>{debugInfo}</Text>
              </ScrollView>
            </View>
          )}
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.lightGray,
  },
  content: {
    padding: theme.spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.dark,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    textAlign: 'center',
    lineHeight: 20,
  },
  actions: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
  },
  secondaryButton: {
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  actionButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.white,
  },
  secondaryButtonText: {
    color: theme.colors.primary,
  },
  debugOutput: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    maxHeight: 400,
  },
  debugTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: theme.spacing.sm,
  },
  debugScroll: {
    maxHeight: 300,
  },
  debugText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.dark,
    fontFamily: 'monospace',
    lineHeight: 16,
  },
});