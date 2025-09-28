import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { theme } from '@/constants/theme';
// import PhotoUploader from '@/components/PhotoUploader'; // Removed for restructuring
import { auth } from '@/utils/firebase';
import { testFirebaseConnection } from '@/lib/firebase';
import { signInAnonymously } from 'firebase/auth';

export default function PhotoTest() {
  const [uploadedPhotos, setUploadedPhotos] = useState<{id:string;url:string;path:string}[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<string>('Checking...');
  const [authStatus, setAuthStatus] = useState<string>('Checking...');

  useEffect(() => {
    checkFirebaseConnection();
    
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setAuthStatus(`Signed in: ${user.uid.slice(0, 8)}... (${user.isAnonymous ? 'Anonymous' : 'Authenticated'})`);
      } else {
        setAuthStatus('Not signed in');
      }
    });
    
    return unsubscribe;
  }, []);

  const checkFirebaseConnection = async () => {
    try {
      setConnectionStatus('Testing connection...');
      const result = await testFirebaseConnection();
      if (result.success) {
        setConnectionStatus('✅ Firebase connected');
      } else {
        setConnectionStatus(`❌ Connection failed: ${result.error}`);
      }
    } catch (error: any) {
      setConnectionStatus(`❌ Test failed: ${error?.message}`);
    }
  };

  const signInAnonymouslyHandler = async () => {
    try {
      setAuthStatus('Signing in...');
      await signInAnonymously(auth);
      console.log('[PhotoTest] Anonymous sign-in successful');
    } catch (error: any) {
      console.error('[PhotoTest] Anonymous sign-in failed:', error);
      setAuthStatus(`Sign-in failed: ${error?.message}`);
    }
  };

  const handlePhotosUploaded = (items: {id:string;url:string;path:string}[]) => {
    console.log('[PhotoTest] Photos uploaded:', items.length);
    setUploadedPhotos(prev => [...prev, ...items]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Photo Upload Test</Text>
        
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>Connection: {connectionStatus}</Text>
          <Text style={styles.statusText}>Auth: {authStatus}</Text>
          
          {!auth.currentUser && (
            <Pressable onPress={signInAnonymouslyHandler} style={styles.signInButton}>
              <Text style={styles.signInButtonText}>Sign In Anonymously</Text>
            </Pressable>
          )}
          
          <Pressable onPress={checkFirebaseConnection} style={styles.testButton}>
            <Text style={styles.testButtonText}>Test Connection</Text>
          </Pressable>
        </View>

        <View style={styles.uploaderContainer}>
          <Text style={{ color: '#666', fontStyle: 'italic' }}>PhotoUploader removed for restructuring</Text>
        </View>

        <View style={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>
            Uploaded Photos ({uploadedPhotos.length})
          </Text>
          
          {uploadedPhotos.map((photo, index) => (
            <View key={photo.id} style={styles.photoResult}>
              <Text style={styles.photoIndex}>#{index + 1}</Text>
              <Text style={styles.photoUrl} numberOfLines={2}>
                {photo.url}
              </Text>
            </View>
          ))}
          
          {uploadedPhotos.length === 0 && (
            <Text style={styles.noPhotos}>No photos uploaded yet</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.lightGray,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: '800',
    color: theme.colors.dark,
    textAlign: 'center',
    marginBottom: 8,
  },
  statusContainer: {
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statusText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.dark,
    marginBottom: 8,
    fontFamily: 'monospace',
  },
  signInButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 8,
    alignItems: 'center',
  },
  signInButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: theme.fontSize.sm,
  },
  testButton: {
    backgroundColor: theme.colors.gray,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 8,
    alignItems: 'center',
  },
  testButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: theme.fontSize.sm,
  },
  uploaderContainer: {
    backgroundColor: theme.colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  resultsContainer: {
    backgroundColor: theme.colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  resultsTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.dark,
    marginBottom: 12,
  },
  photoResult: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  photoIndex: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.primary,
    marginRight: 12,
    minWidth: 30,
  },
  photoUrl: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.dark,
    flex: 1,
  },
  noPhotos: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});