"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import AppLayout from "../../components/AppLayout";
import { useAuth } from "../../../lib/hooks/useAuth";
import { useLeagueLeaderboard } from "../../../lib/hooks/useLeagues";
import { supabase } from "../../../lib/supabase";

export default function LeagueStandingsPage() {
  const params = useParams();
  const leagueId = params.id as string;
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { leaderboard, loading: leaderboardLoading, error: leaderboardError, refetch } = useLeagueLeaderboard(leagueId);
  
  const [league, setLeague] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLeagueData() {
      if (!leagueId) return;
      
      try {
        setLoading(true);
        setError(null);

        // Fetch league details
        const { data: leagueData, error: leagueError } = await supabase
          .from('leagues')
          .select('*')
          .eq('id', leagueId)
          .single();

        if (leagueError) {
          console.error('Error fetching league:', leagueError);
          setError('Failed to load league details');
          return;
        }

        setLeague(leagueData);
      } catch (err) {
        console.error('Error in fetchLeagueData:', err);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchLeagueData();
  }, [leagueId]);

  // Show loading state
  if (authLoading || loading || leaderboardLoading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gradient-to-br from-pastel-blue via-white to-pastel-pink p-4 sm:p-6 md:p-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 sm:h-32 w-16 sm:w-32 border-b-2 border-blue-400 mx-auto"></div>
              <p className="text-sm sm:text-base text-gray-700 mt-4">Loading league standings...</p>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gradient-to-br from-pastel-blue via-white to-pastel-pink p-4 sm:p-6 md:p-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center">
              <div className="bg-blue-100 border border-blue-400 text-blue-700 px-3 sm:px-4 py-3 rounded text-sm sm:text-base">
                <strong>Login Required:</strong> Please log in to view league standings.
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Show error state
  if (error || leaderboardError) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gradient-to-br from-pastel-blue via-white to-pastel-pink p-4 sm:p-6 md:p-8">
          <div className="max-w-6xl mx-auto">
            <div className="bg-red-100 border border-red-400 text-red-700 px-3 sm:px-4 py-3 rounded mb-4 sm:mb-6 text-sm sm:text-base">
              <strong>Error:</strong> {error || leaderboardError}
            </div>
            <a 
              href="/leagues" 
              className="w-full sm:w-auto text-center bg-gradient-to-r from-pastel-blue to-pastel-pink text-gray-800 py-3 px-4 rounded-lg font-medium hover:from-pastel-blue-dark hover:to-pastel-pink-dark transition-all duration-200"
            >
              ← Back to Leagues
            </a>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Show not found state
  if (!league) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gradient-to-br from-pastel-blue via-white to-pastel-pink p-4 sm:p-6 md:p-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center">
              <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-3 sm:px-4 py-3 rounded mb-4 sm:mb-6 text-sm sm:text-base">
                <strong>League Not Found:</strong> The requested league could not be found.
              </div>
              <a 
                href="/leagues" 
                className="w-full sm:w-auto text-center bg-gradient-to-r from-pastel-blue to-pastel-pink text-gray-800 py-3 px-4 rounded-lg font-medium hover:from-pastel-blue-dark hover:to-pastel-pink-dark transition-all duration-200"
              >
                ← Back to Leagues
              </a>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-pastel-blue via-white to-pastel-pink p-4 sm:p-6 md:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center justify-between mb-4">
              <a 
                href="/leagues" 
                className="text-pastel-blue hover:text-pastel-blue-dark transition-colors text-sm sm:text-base"
              >
                ← Back to Leagues
              </a>
            </div>
            
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 mb-2">
              {league.name}
            </h1>
            
            {league.description && (
              <p className="text-sm sm:text-base text-gray-700 mb-4">{league.description}</p>
            )}
            
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
              <div>Created: {new Date(league.created_at || '').toLocaleDateString()}</div>
              <div>Max Members: {league.max_members}</div>
            </div>
          </div>

          {/* Leaderboard */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-4 sm:p-6 border border-white/30">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">League Standings</h2>
            
            {leaderboard.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">No standings available yet.</p>
                <p className="text-gray-500 text-sm mt-2">Scores will appear here once results are submitted.</p>
              </div>
            ) : (
              <>
                {/* Mobile Card Layout */}
                <div className="block lg:hidden space-y-3">
                  {leaderboard.map((entry) => (
                    <div 
                      key={entry.user_id} 
                      className={`border border-gray-200 rounded-lg p-4 ${
                        entry.user_id === user?.id ? 'bg-pastel-blue/10 border-pastel-blue/30' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center">
                            <span className={`font-bold text-lg ${
                              entry.position === 1 ? 'text-yellow-600' :
                              entry.position === 2 ? 'text-gray-500' :
                              entry.position === 3 ? 'text-amber-600' :
                              'text-gray-700'
                            }`}>
                              {entry.position}
                            </span>
                            {entry.position <= 3 && (
                              <span className="ml-2 text-xl">
                                {entry.position === 1 ? '🥇' : 
                                 entry.position === 2 ? '🥈' : '🥉'}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-800">
                              {entry.user_name}
                            </span>
                            {entry.user_id === user?.id && (
                              <span className="text-xs bg-pastel-blue text-white px-2 py-1 rounded-full">
                                You
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-gray-800">
                            {entry.total_points}
                          </div>
                          <div className="text-xs text-gray-500">Total Points</div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">⭐ Star Baker:</span>
                          <span className="font-medium">{entry.star_baker_points}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">🏆 Technical:</span>
                          <span className="font-medium">{entry.technical_winner_points}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">😢 Eliminated:</span>
                          <span className="font-medium">{entry.eliminated_points}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">🤝 Handshake:</span>
                          <span className="font-medium">{entry.handshake_points}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">✨ Special:</span>
                          <span className="font-medium">{entry.weekly_special_points}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">🎉 Bonus:</span>
                          <span className="font-medium">{entry.bonus_points}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Desktop Table Layout */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Position</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Player</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Total Points</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Star Baker</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Technical</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Eliminated</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Handshake</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Special</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Bonus</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.map((entry) => (
                        <tr 
                          key={entry.user_id} 
                          className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                            entry.user_id === user?.id ? 'bg-pastel-blue/10' : ''
                          }`}
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center">
                              <span className={`font-bold text-lg ${
                                entry.position === 1 ? 'text-yellow-600' :
                                entry.position === 2 ? 'text-gray-500' :
                                entry.position === 3 ? 'text-amber-600' :
                                'text-gray-700'
                              }`}>
                                {entry.position}
                              </span>
                              {entry.position <= 3 && (
                                <span className="ml-2 text-2xl">
                                  {entry.position === 1 ? '🥇' : 
                                   entry.position === 2 ? '🥈' : '🥉'}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center">
                              <span className="font-medium text-gray-800">
                                {entry.user_name}
                              </span>
                              {entry.user_id === user?.id && (
                                <span className="ml-2 text-xs bg-pastel-blue text-white px-2 py-1 rounded-full">
                                  You
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-gray-800">
                            {entry.total_points}
                          </td>
                          <td className="py-3 px-4 text-right text-gray-600">
                            {entry.star_baker_points}
                          </td>
                          <td className="py-3 px-4 text-right text-gray-600">
                            {entry.technical_winner_points}
                          </td>
                          <td className="py-3 px-4 text-right text-gray-600">
                            {entry.eliminated_points}
                          </td>
                          <td className="py-3 px-4 text-right text-gray-600">
                            {entry.handshake_points}
                          </td>
                          <td className="py-3 px-4 text-right text-gray-600">
                            {entry.weekly_special_points}
                          </td>
                          <td className="py-3 px-4 text-right text-gray-600">
                            {entry.bonus_points}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
