import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform } from 'react-native';
import { AlertTriangle, RefreshCw } from 'lucide-react-native';

interface GlobalErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface GlobalErrorBoundaryProps {
  children: React.ReactNode;
}

export default class GlobalErrorBoundary extends React.Component<GlobalErrorBoundaryProps, GlobalErrorBoundaryState> {
  state: GlobalErrorBoundaryState = { 
    hasError: false, 
    error: null, 
    errorInfo: null 
  };

  static getDerivedStateFromError(error: Error): Partial<GlobalErrorBoundaryState> {
    console.error('[GlobalErrorBoundary] getDerivedStateFromError:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[GlobalErrorBoundary] componentDidCatch:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });
    
    this.setState({ errorInfo });
  }

  handleRetry = () => {
    console.log('[GlobalErrorBoundary] Retry requested - performing hard reload');
    
    if (Platform.OS === 'web') {
      // Hard reload for web
      window.location.reload();
    } else {
      // For native, reset the error boundary state
      // In a real app, you might want to restart the app entirely
      this.setState({ 
        hasError: false, 
        error: null, 
        errorInfo: null 
      });
    }
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || 'Unknown startup error';
      const errorStack = this.state.error?.stack || 'No stack trace available';
      
      return (
        <View style={styles.container} testID="global-error-boundary">
          <View style={styles.iconWrap}>
            <AlertTriangle color="#ef4444" size={48} />
          </View>
          
          <Text style={styles.title}>⚠️ App Startup Error</Text>
          
          <Text style={styles.errorMessage} numberOfLines={4}>
            {errorMessage}
          </Text>
          
          <TouchableOpacity
            onPress={this.handleRetry}
            style={styles.retryButton}
            accessibilityRole="button"
            testID="global-error-retry"
          >
            <RefreshCw color="#ffffff" size={18} />
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
          
          <Text style={styles.debugInfo} numberOfLines={8}>
            Stack: {errorStack.substring(0, 200)}...
          </Text>
        </View>
      );
    }
    
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#0f172a',
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#ffffff',
    textAlign: 'center' as const,
    marginBottom: 16,
  },
  errorMessage: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center' as const,
    marginBottom: 24,
    paddingHorizontal: 16,
    backgroundColor: '#1e1e1e',
    padding: 12,
    borderRadius: 8,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  retryButton: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 24,
    minWidth: 120,
    gap: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  debugInfo: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center' as const,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    backgroundColor: '#1e1e1e',
    padding: 8,
    borderRadius: 4,
    maxWidth: '100%',
  },
});