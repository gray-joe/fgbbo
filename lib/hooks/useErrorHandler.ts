import { useState, useCallback } from 'react';

interface ErrorState {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
}

export function useErrorHandler() {
  const [errorState, setErrorState] = useState<ErrorState>({
    hasError: false,
    error: null,
    errorInfo: null
  });

  const handleError = useCallback((error: Error, errorInfo?: any) => {
    console.error('Error caught by useErrorHandler:', error, errorInfo);
    setErrorState({
      hasError: true,
      error,
      errorInfo
    });
  }, []);

  const clearError = useCallback(() => {
    setErrorState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  }, []);

  const reset = useCallback(() => {
    clearError();
    window.location.reload();
  }, [clearError]);

  const goHome = useCallback(() => {
    clearError();
    window.location.href = '/';
  }, [clearError]);

  return {
    ...errorState,
    handleError,
    clearError,
    reset,
    goHome
  };
}