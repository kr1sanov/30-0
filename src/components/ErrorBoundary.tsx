'use client';

import React from 'react';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
          <div className="text-5xl mb-4">😵</div>
          <h2 className="text-xl font-black text-[#FFFFFF] mb-2">
            Что-то пошло не так
          </h2>
          <p className="text-sm text-[#9CA3AF] mb-6 max-w-md">
            Произошла непредвиденная ошибка. Попробуйте обновить страницу или начать заново.
          </p>
          {this.state.error && (
            <p className="text-xs text-[#64748b] mb-4 max-w-md font-mono bg-[#0A0A0A] p-3 rounded-lg">
              {this.state.error.message}
            </p>
          )}
          <Button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="bg-[#00C896] hover:bg-[#00A67A] text-white font-bold rounded-xl px-6"
          >
            🔄 Обновить страницу
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
