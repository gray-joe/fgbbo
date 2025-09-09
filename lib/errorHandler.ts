export function setupGlobalErrorHandling() {
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    
    if (process.env.NODE_ENV === 'development') {
      console.error('Stack trace:', event.reason?.stack);
    }
  });

  window.addEventListener('error', (event) => {
    console.error('Uncaught error:', event.error);
    
    if (process.env.NODE_ENV === 'development') {
      console.error('Stack trace:', event.error?.stack);
    }
  });
}

export function reportError(error: Error, context?: Record<string, any>) {
  console.error('Error reported:', error, context);
}

export async function safeAsync<T>(
  asyncFn: () => Promise<T>,
  fallback?: T,
  context?: string
): Promise<T | undefined> {
  try {
    return await asyncFn();
  } catch (error) {
    console.error(`Error in ${context || 'async function'}:`, error);
    reportError(error instanceof Error ? error : new Error(String(error)), { context });
    return fallback;
  }
}

export function safeSync<T>(
  syncFn: () => T,
  fallback?: T,
  context?: string
): T | undefined {
  try {
    return syncFn();
  } catch (error) {
    console.error(`Error in ${context || 'sync function'}:`, error);
    reportError(error instanceof Error ? error : new Error(String(error)), { context });
    return fallback;
  }
}
