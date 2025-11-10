import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { logger } from '@/lib/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to error tracking service in production
    if (import.meta.env.PROD) {
      // Example: Sentry.captureException(error, { contexts: { react: errorInfo } });
      logger.error('Error caught by boundary:', error, errorInfo);
    } else {
      logger.error('Error caught by boundary:', error, errorInfo);
    }

    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-white">
          <Card className="max-w-2xl w-full border-red-200 bg-white">
            <CardHeader>
              <div className="flex items-center gap-3">
                <AlertCircle className="h-6 w-6 text-red-600" />
                <CardTitle className="text-xl font-bold text-red-600">
                  Something went wrong
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-[var(--portal-text-secondary)]">
                We're sorry, but something unexpected happened. Please try refreshing the page.
              </p>
              {import.meta.env.DEV && this.state.error && (
                <details className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <summary className="cursor-pointer font-semibold text-sm mb-2">
                    Error Details (Development Only)
                  </summary>
                  <pre className="text-xs overflow-auto max-h-64">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}
              <div className="flex gap-3">
                <Button
                  onClick={this.handleReset}
                  className="bg-[var(--portal-accent)] hover:bg-[var(--portal-accent)]/90 text-white"
                >
                  Try Again
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.location.reload()}
                >
                  Refresh Page
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

