"use client";

import { useState } from "react";
import AppLayout from "../../components/AppLayout";
import AdminProtection from "../../components/AdminProtection";
import { useWeekLocks } from "../../../lib/hooks/useWeekLocks";
import { useAuth } from "../../../lib/hooks/useAuth";

function AdminWeekLocksPageContent() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { weekLocks, loading, error, lockWeek, unlockWeek } = useWeekLocks();
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  if (authLoading || loading) {
    return (
      <AppLayout>
        <div className="min-h-screen p-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-400 mx-auto"></div>
              <p className="text-gray-700 text-lg mt-4">Loading...</p>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!isAuthenticated) {
    return (
      <AppLayout>
        <div className="min-h-screen p-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center">
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                <strong>Access Denied:</strong> You must be an admin to view this page.
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="min-h-screen p-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center">
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                <strong>Error:</strong> {error}
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  const handleLockWeek = async (week: number) => {
    try {
      setActionLoading(week);
      await lockWeek(week);
    } catch (error) {
      console.error('Failed to lock week:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnlockWeek = async (week: number) => {
    try {
      setActionLoading(week);
      await unlockWeek(week);
    } catch (error) {
      console.error('Failed to unlock week:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const allWeeks = Array.from({ length: 12 }, (_, i) => i + 1);
  const lockedWeeks = weekLocks.map(lock => lock.week);

  return (
    <AppLayout>
      <div className="min-h-screen p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              Manage Week Locks
            </h1>
            <p className="text-gray-700 text-lg">
              Control when users can make predictions by locking weeks
            </p>
          </div>

          {/* Information Panel */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
            <div className="flex items-start space-x-3">
              <div className="text-blue-600 text-xl">ℹ️</div>
              <div>
                <h3 className="text-lg font-semibold text-blue-800 mb-2">How Week Locks Work</h3>
                <ul className="text-blue-700 space-y-1 text-sm">
                  <li>• <strong>Locked weeks:</strong> Users cannot make or change predictions</li>
                  <li>• <strong>Unlocked weeks:</strong> Users can freely make and edit predictions</li>
                  <li>• <strong>Locking a week:</strong> Prevents any further prediction changes</li>
                  <li>• <strong>Unlocking a week:</strong> Allows users to modify predictions again</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Week Locks Grid */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/30">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Week Status</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {allWeeks.map((week) => {
                const isLocked = lockedWeeks.includes(week);
                const isLoading = actionLoading === week;
                const lockInfo = weekLocks.find(lock => lock.week === week);

                return (
                  <div
                    key={week}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                      isLocked
                        ? 'bg-red-50 border-red-200'
                        : 'bg-green-50 border-green-200'
                    }`}
                  >
                    <div className="text-center">
                      <h3 className={`text-lg font-bold mb-2 ${
                        isLocked ? 'text-red-700' : 'text-green-700'
                      }`}>
                        Week {week}
                      </h3>
                      
                      <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium mb-3 ${
                        isLocked
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {isLocked ? '🔒 Locked' : '🔓 Unlocked'}
                      </div>

                      {isLocked && lockInfo && (
                        <div className="text-xs text-red-600 mb-3">
                          Locked at: {new Date(lockInfo.locked_at).toLocaleDateString()}
                        </div>
                      )}

                      <button
                        onClick={() => isLocked ? handleUnlockWeek(week) : handleLockWeek(week)}
                        disabled={isLoading}
                        className={`w-full px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                          isLocked
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : 'bg-red-600 hover:bg-red-700 text-white'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {isLoading ? (
                          <span className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            {isLocked ? 'Unlocking...' : 'Locking...'}
                          </span>
                        ) : (
                          isLocked ? '🔓 Unlock Week' : '🔒 Lock Week'
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Current Status Summary */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 mt-8 border border-white/30">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Current Status Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="text-2xl font-bold text-green-600">
                  {allWeeks.length - lockedWeeks.length}
                </div>
                <div className="text-green-700">Weeks Available</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="text-2xl font-bold text-red-600">
                  {lockedWeeks.length}
                </div>
                <div className="text-red-700">Weeks Locked</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-2xl font-bold text-blue-600">
                  {allWeeks.length}
                </div>
                <div className="text-blue-700">Total Weeks</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default function AdminWeekLocksPage() {
  return (
    <AdminProtection>
      <AdminWeekLocksPageContent />
    </AdminProtection>
  );
}
