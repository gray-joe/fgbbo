export const ERROR_CONFIGS = {
  NETWORK: {
    title: "Connection Error",
    message: "We're having trouble connecting to our servers. Please check your internet connection and try again.",
    icon: "🌐"
  },
  AUTH: {
    title: "Authentication Error", 
    message: "There was a problem with your login. Please try logging in again.",
    icon: "🔐"
  },
  PREDICTIONS: {
    title: "Prediction Error",
    message: "We encountered an error while loading the predictions page. This might be due to missing data or a temporary issue.",
    icon: "📊"
  },
  LEAGUE: {
    title: "League Error",
    message: "There was a problem loading league information. Please try again or contact support if the issue persists.",
    icon: "🏆"
  },
  RESULTS: {
    title: "Results Error", 
    message: "We're having trouble loading the results. Please try again in a moment.",
    icon: "📈"
  },
  GENERIC: {
    title: "Oops! Something went wrong",
    message: "We encountered an unexpected error. Don't worry, our bakers are working hard to fix it!",
    icon: "😵"
  }
} as const;

export type ErrorType = keyof typeof ERROR_CONFIGS;

export function getErrorConfig(type: ErrorType = 'GENERIC') {
  return ERROR_CONFIGS[type];
}

export function createStandardError(type: ErrorType, originalError?: Error) {
  const config = getErrorConfig(type);
  return {
    ...config,
    originalError,
    timestamp: new Date().toISOString()
  };
}

export function determineErrorType(error: Error, context?: string): ErrorType {
  const message = error.message.toLowerCase();
  const contextLower = context?.toLowerCase() || '';

  if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
    return 'NETWORK';
  }
  
  if (message.includes('auth') || message.includes('login') || message.includes('unauthorized')) {
    return 'AUTH';
  }
  
  if (contextLower.includes('prediction') || message.includes('prediction')) {
    return 'PREDICTIONS';
  }
  
  if (contextLower.includes('league') || message.includes('league')) {
    return 'LEAGUE';
  }
  
  if (contextLower.includes('result') || message.includes('result')) {
    return 'RESULTS';
  }
  
  return 'GENERIC';
}
