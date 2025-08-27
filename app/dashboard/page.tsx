"use client";

import { useState, useEffect } from "react";
import AppLayout from "../components/AppLayout";
import { useAuth } from "../../lib/hooks/useAuth";
import { useUserTotalScore } from "../../lib/hooks/useScores";
import { useUserWeeklyBreakdown } from "../../lib/hooks/useScores";
import { useUserLeaguePosition } from "../../lib/hooks/useScores";
import { useWeeklySummaries } from "../../lib/hooks/useResults";

export default function DashboardPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { totalScore, loading: scoreLoading } = useUserTotalScore(user?.id || null);
  const { breakdown, loading: breakdownLoading } = useUserWeeklyBreakdown(user?.id || null);
  const { position: leaguePosition, loading: positionLoading } = useUserLeaguePosition(user?.id || null);
  const { summaries, loading: summariesLoading } = useWeeklySummaries();

  // Calculate current week (latest week with results + 1, or 1 if no results)
  const getCurrentWeek = () => {
    if (!summaries.length) return 1;
    return Math.max(...summaries.map(s => s.week)) + 1;
  };



  // Get recent results for the user
  const getRecentResults = () => {
    if (!breakdown.length) return [];
    
    // Get the last 3 weeks of results
    const recentWeeks = breakdown
      .sort((a, b) => b.week - a.week)
      .slice(0, 3);
    
    return recentWeeks.map(week => {
      const totalPoints = week.total_points;
      const breakdown = week.breakdown;
      
      // Create a summary of what the user got right/wrong
      const achievements = [];
      if (breakdown.star_baker > 0) achievements.push(`⭐ Star Baker (+${breakdown.star_baker})`);
      if (breakdown.technical_winner > 0) achievements.push(`🏆 Technical (+${breakdown.technical_winner})`);
      if (breakdown.eliminated > 0) achievements.push(`😢 Eliminated (+${breakdown.eliminated})`);
      if (breakdown.handshake > 0) achievements.push(`🤝 Handshake (+${breakdown.handshake})`);
      if (breakdown.weekly_special > 0) achievements.push(`✨ Special (+${breakdown.weekly_special})`);
      if (breakdown.bonus > 0) achievements.push(`🎉 Perfect Week Bonus (+${breakdown.bonus})`);
      
      return {
        week: week.week,
        totalPoints,
        achievements,
        hasResults: totalPoints > 0
      };
    });
  };

  // Calculate points gained this week
  const getThisWeekPoints = () => {
    if (!breakdown.length) return 0;
    const currentWeek = getCurrentWeek();
    const thisWeekBreakdown = breakdown.find(b => b.week === currentWeek - 1); // Previous week
    return thisWeekBreakdown?.total_points || 0;
  };

  // Show loading state
  if (authLoading || scoreLoading || breakdownLoading || positionLoading || summariesLoading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gradient-to-br from-pastel-blue via-white to-pastel-pink p-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-400 mx-auto"></div>
              <p className="text-gray-700 text-lg mt-4">Loading dashboard...</p>
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
        <div className="min-h-screen bg-gradient-to-br from-pastel-blue via-white to-pastel-pink p-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center">
              <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
                <strong>Login Required:</strong> Please log in to view your dashboard.
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  const currentWeek = getCurrentWeek();
  const thisWeekPoints = getThisWeekPoints();
  const recentResults = getRecentResults();

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-pastel-blue via-white to-pastel-pink p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              Dashboard
            </h1>
            <p className="text-gray-700 text-lg">
              Welcome to your GBBO Fantasy League dashboard!
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Current Week Stats */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/30">
              <div className="text-center">
                <span className="text-4xl">📅</span>
                <h3 className="text-xl font-bold text-gray-800 mt-2">Current Week</h3>
                <p className="text-3xl font-bold text-pastel-blue">Week {currentWeek}</p>
                <p className="text-gray-600 text-sm">
                  {currentWeek > 1 ? "Make your predictions!" : "Season starting soon"}
                </p>
              </div>
            </div>

            {/* League Position */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/30">
              <div className="text-center">
                <span className="text-4xl">🏆</span>
                <h3 className="text-xl font-bold text-gray-800 mt-2">League Position</h3>
                <p className="text-3xl font-bold text-pastel-pink">
                  {leaguePosition ? `#${leaguePosition.position}` : 'N/A'}
                </p>
                <p className="text-gray-600 text-sm">
                  {leaguePosition ? `Out of ${leaguePosition.totalPlayers} players` : 'Calculating...'}
                </p>
              </div>
            </div>

            {/* Total Points */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/30">
              <div className="text-center">
                <span className="text-4xl">⭐</span>
                <h3 className="text-xl font-bold text-gray-800 mt-2">Total Points</h3>
                <p className="text-3xl font-bold text-green-500">{totalScore}</p>
                <p className="text-gray-600 text-sm">
                  {thisWeekPoints > 0 ? `+${thisWeekPoints} this week` : 'No points yet'}
                </p>
              </div>
            </div>

            {/* Recent Results */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/30 md:col-span-2 lg:col-span-3">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Recent Results</h3>
              {recentResults.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">No results yet. Make your predictions to start earning points!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentResults.map((result) => (
                    <div 
                      key={result.week} 
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        result.totalPoints > 0 
                          ? 'bg-green-50 border border-green-200' 
                          : 'bg-gray-50 border border-gray-200'
                      }`}
                    >
                      <div className="flex-1">
                        <span className={`font-medium ${
                          result.totalPoints > 0 ? 'text-green-600' : 'text-gray-600'
                        }`}>
                          {result.totalPoints > 0 ? '✅' : '📊'} Week {result.week} - {result.totalPoints} points
                        </span>
                        {result.achievements.length > 0 && (
                          <div className="text-xs text-gray-500 mt-1">
                            {result.achievements.join(' • ')}
                          </div>
                        )}
                      </div>
                      <span className={`font-bold ${
                        result.totalPoints > 0 ? 'text-green-600' : 'text-gray-600'
                      }`}>
                        {result.totalPoints > 0 ? `+${result.totalPoints}` : '0'} pts
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
