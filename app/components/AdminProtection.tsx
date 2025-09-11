"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/hooks/useAuth';
import ErrorScreen from './ErrorScreen';

interface AdminProtectionProps {
  children: React.ReactNode;
}

export default function AdminProtection({ children }: AdminProtectionProps) {
  const { user, isAuthenticated, isAdmin, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If not loading and user is not authenticated, redirect to login
    if (!loading && !isAuthenticated) {
      router.push('/');
      return;
    }

    // If not loading and user is authenticated but not admin, redirect to dashboard
    if (!loading && isAuthenticated && !isAdmin) {
      router.push('/dashboard');
      return;
    }
  }, [isAuthenticated, isAdmin, loading, router]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pastel-blue via-white to-pastel-pink flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-white/30 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-pastel-blue mx-auto mb-4"></div>
            <p className="text-gray-700 text-lg">Checking admin access...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error if not authenticated
  if (!isAuthenticated) {
    return (
      <ErrorScreen
        title="Authentication Required"
        message="You must be logged in to access this page."
        onGoHome={() => router.push('/')}
      />
    );
  }

  // Show error if not admin
  if (!isAdmin) {
    return (
      <ErrorScreen
        title="Access Denied"
        message="You don't have permission to access this admin page. Only administrators can manage this content."
        onGoHome={() => router.push('/dashboard')}
      />
    );
  }

  // User is authenticated and is admin, show the protected content
  return <>{children}</>;
}
