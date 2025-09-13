import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { assignAdminRole, isAdminClient, refreshAdminClaims } from '@/src/lib/authz';
import { getAuth } from 'firebase/auth';

export default function AdminAssignmentScreen() {
  const [email, setEmail] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  const insets = useSafeAreaInsets();

  React.useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    const adminStatus = await isAdminClient();
    setIsAdmin(adminStatus);
  };

  const showMessage = (text: string, type: 'success' | 'error') => {
    if (!text?.trim() || text.length > 500) return;
    if (!type || !['success', 'error'].includes(type)) return;
    
    setMessage(text.trim());
    setMessageType(type);
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 5000);
  };

  const handleAssignAdmin = async () => {
    if (!email.trim()) {
      showMessage('Please enter an email address', 'error');
      return;
    }

    setLoading(true);
    try {
      const result = await assignAdminRole(email);
      
      if (result.success) {
        showMessage(`Admin role assigned to ${email}`, 'success');
        setEmail('');
        await checkAdminStatus();
      } else {
        showMessage(result.error || 'Failed to assign admin role', 'error');
      }
    } catch (error: any) {
      showMessage(error?.message || 'Unknown error occurred', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshClaims = async () => {
    setLoading(true);
    try {
      const newAdminStatus = await refreshAdminClaims();
      setIsAdmin(newAdminStatus);
      showMessage(`Claims refreshed. Admin status: ${newAdminStatus ? 'Yes' : 'No'}`, 'success');
    } catch {
      showMessage('Failed to refresh claims', 'error');
    } finally {
      setLoading(false);
    }
  };

  const currentUser = getAuth().currentUser;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen 
        options={{ 
          title: 'Admin Assignment',
          headerStyle: { backgroundColor: '#f8f9fa' }
        }} 
      />
      
      <View style={styles.content}>
        <Text style={styles.title}>Admin Role Assignment</Text>
        
        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>Current User:</Text>
          <Text style={styles.statusValue}>{currentUser?.email || 'Anonymous'}</Text>
          <Text style={styles.statusLabel}>Admin Status:</Text>
          <Text style={[styles.statusValue, { color: isAdmin ? '#22c55e' : '#ef4444' }]}>
            {isAdmin ? 'Admin' : 'Not Admin'}
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Email to Grant Admin Access:</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Enter email address"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          
          <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleAssignAdmin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Assigning...' : 'Assign Admin Role'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.secondaryButton, loading && styles.buttonDisabled]}
            onPress={handleRefreshClaims}
            disabled={loading}
          >
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>
              Refresh My Claims
            </Text>
          </TouchableOpacity>
        </View>

        {message ? (
          <View style={[styles.messageContainer, messageType === 'success' ? styles.successMessage : styles.errorMessage]}>
            <Text style={[styles.messageText, messageType === 'success' ? styles.successText : styles.errorText]}>
              {message}
            </Text>
          </View>
        ) : null}

        <View style={styles.instructions}>
          <Text style={styles.instructionTitle}>Instructions:</Text>
          <Text style={styles.instructionText}>
            1. Deploy the Firebase function: `firebase deploy --only functions:setAdminRole`
          </Text>
          <Text style={styles.instructionText}>
            2. Only the owner email (altanivelgroup@gmail.com) can assign admin roles
          </Text>
          <Text style={styles.instructionText}>
            3. After assignment, the target user needs to refresh their token
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#1f2937',
  },
  statusCard: {
    backgroundColor: '#f3f4f6',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  form: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#374151',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#ffffff',
  },
  button: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#3b82f6',
  },
  instructions: {
    backgroundColor: '#fef3c7',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#92400e',
  },
  instructionText: {
    fontSize: 14,
    color: '#92400e',
    marginBottom: 4,
  },
  messageContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  successMessage: {
    backgroundColor: '#dcfce7',
    borderColor: '#22c55e',
    borderWidth: 1,
  },
  errorMessage: {
    backgroundColor: '#fef2f2',
    borderColor: '#ef4444',
    borderWidth: 1,
  },
  messageText: {
    fontSize: 14,
    fontWeight: '500',
  },
  successText: {
    color: '#15803d',
  },
  errorText: {
    color: '#dc2626',
  },
});