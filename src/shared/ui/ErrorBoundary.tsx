import { Component, type ErrorInfo, type ReactNode } from 'react';

import { logClientError } from '@/shared/lib/logger';

import { ErrorState } from './ErrorState';

export interface ErrorBoundaryProps {
  screen: string;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Граница ошибок раздела (ERR-11): падение одного экрана не роняет приложение целиком.
 * Единственный классовый компонент проекта — у React нет хука для componentDidCatch.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    logClientError({
      screen: this.props.screen,
      code: 'ui_crash',
      message: error.message,
      details: info.componentStack ?? '',
    });
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <ErrorState
          message="Раздел не загрузился из-за ошибки"
          onRetry={() => this.setState({ hasError: false })}
        />
      );
    }
    return this.props.children;
  }
}
