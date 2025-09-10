import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { theme } from '@/constants/theme';

interface NavigationErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface NavigationErrorBoundaryProps {
  children: React.ReactNode;
  fallbackRoute?: string;
}

export class NavigationErrorBoundary extends React.Component<
  NavigationErrorBoundaryProps,
  NavigationErrorBoundaryState
> {
  constructor(props: NavigationErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): NavigationErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[NavigationErrorBoundary] Navigation error caught:', error);
    console.error('[NavigationErrorBoundary] Error info:', errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  handleGoHome = () => {
    const fallbackRoute = this.props.fallbackRoute || '/(tabs)';
    try {
      router.replace(fallbackRoute as any);
    } catch (routerError) {
      console.error('[NavigationErrorBoundary] Router error:', routerError);
      // If router fails, try to reset state anyway
      this.setState({ hasError: false, error: undefined });
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <Text style={styles.title}>Navigation Error</Text>
            <Text style={styles.message}>
              Something went wrong with navigation. This usually happens due to routing conflicts.
            </Text>
            
            {__DEV__ && this.state.error && (
              <View style={styles.errorDetails}>
                <Text style={styles.errorTitle}>Error Details:</Text>
                <Text style={styles.errorText}>{this.state.error.message}</Text>
              </View>
            )}
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.button} onPress={this.handleRetry}>
                <Text style={styles.buttonText}>Try Again</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.button, styles.primaryButton]} 
                onPress={this.handleGoHome}
              >
                <Text style={[styles.buttonText, styles.primaryButtonText]}>
                  Go to Dashboard
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: theme.colors.gray,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  errorDetails: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    width: '100%',
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  button: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.dark,
  },
  primaryButtonText: {
    color: theme.colors.white,
  },
});

export default NavigationErrorBoundary;