"use client";

import { useEffect } from 'react';
import { setupGlobalErrorHandling } from '../../lib/errorHandler';

interface ErrorHandlerProps {
  children: React.ReactNode;
}

export default function ErrorHandler({ children }: ErrorHandlerProps) {
  useEffect(() => {
    setupGlobalErrorHandling();
  }, []);

  return <>{children}</>;
}
