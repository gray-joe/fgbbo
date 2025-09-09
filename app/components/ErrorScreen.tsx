"use client";

import React from 'react';

interface ErrorScreenProps {
  error?: Error;
  errorInfo?: any;
  onRetry?: () => void;
  onGoHome?: () => void;
  title?: string;
  message?: string;
  showDetails?: boolean;
}

export default function ErrorScreen({
  error,
  errorInfo,
  onRetry,
  onGoHome,
  title = "Oops! Something went wrong",
  message = "We encountered an unexpected error. Don't worry, our bakers are working hard to fix it!",
  showDetails = false
}: ErrorScreenProps) {
  const handleReload = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  const handleGoHome = () => {
    if (onGoHome) {
      onGoHome();
    } else {
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pastel-blue via-white to-pastel-pink flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-white/30 text-center">
          {/* Error Icon */}
          <div className="text-6xl mb-6">😵</div>
          
          {/* Error Title */}
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            {title}
          </h1>
          
          {/* Error Description */}
          <p className="text-gray-600 text-lg mb-6">
            {message}
          </p>

          {/* Error Details (only if showDetails is true and we have error info) */}
          {showDetails && error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
              <h3 className="text-sm font-semibold text-red-800 mb-2">Error Details:</h3>
              <p className="text-xs text-red-700 font-mono break-all">
                {error.message}
              </p>
              {errorInfo && (
                <details className="mt-2">
                  <summary className="text-xs text-red-700 cursor-pointer">Stack Trace</summary>
                  <pre className="text-xs text-red-600 mt-2 whitespace-pre-wrap">
                    {errorInfo.componentStack || errorInfo}
                  </pre>
                </details>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleReload}
              className="bg-gradient-to-r from-pastel-blue to-pastel-pink text-gray-800 py-3 px-6 rounded-xl font-semibold hover:from-pastel-blue-dark hover:to-pastel-pink-dark transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              🔄 Try Again
            </button>
            <button
              onClick={handleGoHome}
              className="bg-gray-100 text-gray-700 py-3 px-6 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              🏠 Go Home
            </button>
          </div>

          {/* Help Text */}
          <div className="mt-8 text-sm text-gray-500">
            <p>
              If this problem persists, please contact support or try refreshing the page.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
