import React from 'react';
import ErrorFallback from './ErrorFallback';
import Logger from '@/utils/logger';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  safeRoute?: string;
  onNavigate?: (to: string) => void;
}

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    console.log('[ErrorBoundary] getDerivedStateFromError', error?.message);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.log('[ErrorBoundary] componentDidCatch', error?.message, info?.componentStack);
    Logger.logError('ReactErrorBoundary', error, { componentStack: info?.componentStack }).catch(() => {});
  }

  handleReset = () => {
    try {
      console.log('[ErrorBoundary] reset requested');
      Logger.logEvent('error_reset_click').catch(() => {});
      const dest = this.props.safeRoute ?? '/';
      if (this.props.onNavigate && dest) {
        console.log('[ErrorBoundary] navigating to safe route:', dest);
        this.props.onNavigate(dest);
      }
    } catch (e) {
      console.log('[ErrorBoundary] navigate failed, continuing with local reset', e);
    } finally {
      this.setState({ hasError: false, error: null });
    }
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} onReset={this.handleReset} />;
    }
    return this.props.children;
  }
}
