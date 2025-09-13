import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Wifi, WifiOff, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react-native';
import { testFirebaseConnectivity } from '@/utils/firebase';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

interface ConnectionStatus {
  connected: boolean;
  error?: string;
  details: {
    networkOnline: boolean;
    firebaseReachable: boolean;
    authWorking: boolean;
    firestoreWorking: boolean;
  };
}

export default function FirebaseConnectionStatus() {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const { online } = useOnlineStatus();

  const checkConnection = async () => {
    setIsLoading(true);
    try {
      const result = await testFirebaseConnectivity();
      setStatus(result);
      setLastChecked(new Date());
      console.log('[FIREBASE_STATUS] Connection test result:', result);
    } catch (error: any) {
      console.error('[FIREBASE_STATUS] Connection test failed:', error);
      setStatus({
        connected: false,
        error: error.message || 'Connection test failed',
        details: {
          networkOnline: false,
          firebaseReachable: false,
          authWorking: false,
          firestoreWorking: false,
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkConnection();
    
    // Auto-check every 30 seconds if there are connection issues
    const interval = setInterval(() => {
      if (!status?.connected || !online) {
        checkConnection();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [online]);

  // Don't show anything if everything is working fine
  if (status?.connected && online) {
    return null;
  }

  const getStatusColor = () => {
    if (!online) return '#ef4444'; // Red for offline
    if (status?.connected) return '#10b981'; // Green for connected
    if (status?.details.networkOnline && status?.details.authWorking) return '#f59e0b'; // Yellow for partial
    return '#ef4444'; // Red for disconnected
  };

  const getStatusIcon = () => {
    const color = '#ffffff';
    const size = 16;
    
    if (isLoading) return <ActivityIndicator size="small" color={color} />;
    if (!online) return <WifiOff color={color} size={size} />;
    if (status?.connected) return <CheckCircle color={color} size={size} />;
    if (status?.details.networkOnline) return <AlertTriangle color={color} size={size} />;
    return <WifiOff color={color} size={size} />;
  };

  const getStatusMessage = () => {
    if (!online) return 'No internet connection';
    if (isLoading) return 'Checking Firebase connection...';
    if (status?.connected) return 'Firebase connected';
    if (status?.error) {
      if (status.error.includes('internet')) return 'No internet connection';
      if (status.error.includes('timeout')) return 'Firebase connection timeout';
      if (status.error.includes('unavailable')) return 'Firebase service unavailable';
      return 'Firebase connection issues';
    }
    return 'Connecting to Firebase...';
  };

  const getDetailedStatus = () => {
    if (!status?.details) return null;
    
    const issues = [];
    if (!status.details.networkOnline) issues.push('Network');
    if (!status.details.firebaseReachable) issues.push('Firebase API');
    if (!status.details.authWorking) issues.push('Authentication');
    if (!status.details.firestoreWorking) issues.push('Database');
    
    return issues.length > 0 ? `Issues: ${issues.join(', ')}` : null;
  };

  return (
    <View style={[styles.container, { backgroundColor: getStatusColor() }]} testID="firebase-connection-status">
      <View style={styles.content}>
        {getStatusIcon()}
        <View style={styles.textContainer}>
          <Text style={styles.mainText}>{getStatusMessage()}</Text>
          {getDetailedStatus() && (
            <Text style={styles.detailText}>{getDetailedStatus()}</Text>
          )}
          {lastChecked && (
            <Text style={styles.timestampText}>
              Last checked: {lastChecked.toLocaleTimeString()}
            </Text>
          )}
        </View>
      </View>
      
      <TouchableOpacity 
        style={styles.refreshButton} 
        onPress={checkConnection}
        disabled={isLoading}
        testID="refresh-connection"
      >
        <RefreshCw 
          color="#ffffff" 
          size={14} 
          style={isLoading ? styles.spinning : undefined}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1000,
    minHeight: 44,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  textContainer: {
    flex: 1,
  },
  mainText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  detailText: {
    color: '#ffffff',
    fontSize: 11,
    opacity: 0.9,
    marginTop: 1,
  },
  timestampText: {
    color: '#ffffff',
    fontSize: 10,
    opacity: 0.8,
    marginTop: 1,
  },
  refreshButton: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  spinning: {
    // Note: CSS animations don't work in React Native
    // This would need to be implemented with Animated API if needed
  },
});