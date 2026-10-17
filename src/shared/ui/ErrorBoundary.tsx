import { Component, type ErrorInfo, type ReactNode } from 'react';

import { logError, logWarning } from '@/shared/lib/logger';
import { isChunkLoadError, reloadForNewVersion } from '@/shared/lib/staleBuild';

import { ErrorState } from './ErrorState';

export interface ErrorBoundaryProps {
  screen: string;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  /** Вкладка устарела после деплоя — страница перезагружается за новой версией. */
  isUpdating: boolean;
}

/**
 * Граница ошибок раздела (ERR-11): падение одного экрана не роняет приложение целиком.
 * Единственный классовый компонент проекта — у React нет хука для componentDidCatch.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false, isUpdating: false };

  static getDerivedStateFromError(): Partial<ErrorBoundaryState> {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    const isStale = isChunkLoadError(error);
    // Файл раздела старой версии удалён после деплоя — лечится перезагрузкой (ДЗ6).
    if (isStale && reloadForNewVersion()) this.setState({ isUpdating: true });
    // Устаревшая вкладка — warning: сайт справляется сам; падение экрана — error.
    void (isStale ? logWarning : logError)({
      screen: this.props.screen,
      code: isStale ? 'chunk_load' : 'ui_crash',
      message: error.message,
      details: info.componentStack ?? '',
    });
  }

  override render(): ReactNode {
    if (this.state.isUpdating) {
      return <ErrorState message="Вышла новая версия сайта — обновляем страницу…" />;
    }
    if (this.state.hasError) {
      return (
        <ErrorState
          message="Раздел не загрузился из-за ошибки"
          onRetry={() => this.setState({ hasError: false, isUpdating: false })}
        />
      );
    }
    return this.props.children;
  }
}
