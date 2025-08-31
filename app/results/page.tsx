"use client";

import { useState } from "react";
import AppLayout from "../components/AppLayout";
import { useWeeklyResults } from "../../lib/hooks/useResults";
import { useWeeklySummaries } from "../../lib/hooks/useResults";
import { useAllResults } from "../../lib/hooks/useResults";
import { useWeekScores } from "../../lib/hooks/useScores";
import { useAuth } from "../../lib/hooks/useAuth";

export default function ResultsPage() {
  const [currentWeek, setCurrentWeek] = useState(1);
  const [viewMode, setViewMode] = useState<'weekly' | 'accumulated'>('weekly');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  
  const { user, isAuthenticated, isAdmin } = useAuth();
  const { results: weeklyResults, loading, error } = useWeeklyResults(currentWeek);
  const { summaries, loading: summariesLoading } = useWeeklySummaries();
  const { results: allResults, loading: allResultsLoading } = useAllResults();
  const { scores: weekScores, loading: scoresLoading } = useWeekScores(currentWeek);

  // Show loading state
  if (loading || summariesLoading || allResultsLoading || scoresLoading) {
    return (
      <AppLayout>
        <div className="min-h-screen p-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-400 mx-auto"></div>
              <p className="text-gray-700 text-lg mt-4">Loading results...</p>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Show error state
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

  // Get the current week summary
  const currentWeekSummary = summaries.find(s => s.week === currentWeek);
  const maxWeek = summaries.length > 0 ? Math.max(...summaries.map(s => s.week)) : 1;

  // Calculate total participants for the week
  const totalParticipants = currentWeekSummary?.total_participants || 0;
  
  // Calculate remaining participants by counting all participants eliminated up to current week
  const getRemainingParticipants = () => {
    if (!allResults.length) return totalParticipants;
    
    // Count participants eliminated up to and including the current week
    const eliminatedUpToCurrentWeek = new Set();
    allResults.forEach(result => {
      if (result.eliminated && result.week <= currentWeek) {
        eliminatedUpToCurrentWeek.add(result.participant_id);
      }
    });
    
    return totalParticipants - eliminatedUpToCurrentWeek.size;
  };
  
  const remainingParticipants = getRemainingParticipants();

  // Process accumulated results
  const getAccumulatedResults = () => {
    if (!allResults.length) return [];
    
    const participantMap = new Map();
    
    // Group results by participant
    allResults.forEach(result => {
      if (!participantMap.has(result.participant_id)) {
        participantMap.set(result.participant_id, {
          participant: result.participant,
          total_star_baker: 0,
          total_technical_winner: 0,
          total_handshake: 0,
          total_weekly_special: 0,
          eliminated_week: null,
          is_eliminated: false,
          weeks_active: new Set()
        });
      }
      
      const participant = participantMap.get(result.participant_id);
      participant.weeks_active.add(result.week);
      
      if (result.star_baker) participant.total_star_baker++;
      if (result.technical_winner) participant.total_technical_winner++;
      if (result.handshake) participant.total_handshake++;
      if (result.weekly_special) participant.total_weekly_special++;
      if (result.eliminated) {
        participant.eliminated_week = result.week;
        participant.is_eliminated = true;
      }
    });
    
    // Convert to array and sort by elimination week (eliminated first, then by week), then by total achievements
    return Array.from(participantMap.values())
      .sort((a, b) => {
        if (a.is_eliminated && !b.is_eliminated) return -1;
        if (!a.is_eliminated && b.is_eliminated) return 1;
        if (a.is_eliminated && b.is_eliminated) {
          return (a.eliminated_week || 0) - (b.eliminated_week || 0);
        }
        // For active participants, sort by total achievements
        const aScore = a.total_star_baker * 3 + a.total_technical_winner * 2 + a.total_handshake + a.total_weekly_special;
        const bScore = b.total_star_baker * 3 + b.total_technical_winner * 2 + b.total_handshake + b.total_weekly_special;
        return bScore - aScore;
      });
  };

  const accumulatedResults = getAccumulatedResults();
  const totalPages = Math.ceil(accumulatedResults.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentResults = accumulatedResults.slice(startIndex, endIndex);



  return (
    <AppLayout>
      <div className="min-h-screen p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              Results
            </h1>
            <p className="text-gray-700 text-lg">
              Track your performance and see how your predictions fared!
            </p>
          </div>

          {/* View Mode Tabs */}
          <div className="lg:col-span-3 bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/30 mb-8">
            <div className="flex space-x-1">
              <button
                onClick={() => {
                  setViewMode('weekly');
                  setCurrentPage(1);
                }}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all duration-200 ${
                  viewMode === 'weekly'
                    ? 'bg-gradient-to-r from-pastel-blue to-pastel-pink text-gray-800 font-semibold shadow-lg'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Weekly Results
              </button>
              <button
                onClick={() => {
                  setViewMode('accumulated');
                  setCurrentPage(1);
                }}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all duration-200 ${
                  viewMode === 'accumulated'
                    ? 'bg-gradient-to-r from-pastel-blue to-pastel-pink text-gray-800 font-semibold shadow-lg'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Accumulated Results
              </button>
            </div>
          </div>

          {viewMode === 'weekly' ? (
            // Weekly Results View
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Week Selector */}
              <div className="lg:col-span-3 bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/30">
                <div className="flex flex-col items-center mb-6">
                  <div className="flex items-center justify-center space-x-4 mb-4">
                    <button 
                      onClick={() => setCurrentWeek(Math.max(1, currentWeek - 1))}
                      disabled={currentWeek === 1}
                      className="px-4 py-2 bg-blue-100 text-gray-800 rounded-lg font-medium hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ← Week {currentWeek - 1}
                    </button>
                    <h2 className="text-2xl font-bold text-gray-800">Week {currentWeek} Results</h2>
                    <button 
                      onClick={() => setCurrentWeek(Math.min(maxWeek, currentWeek + 1))}
                      disabled={currentWeek >= maxWeek}
                      className="px-4 py-2 bg-blue-100 text-gray-800 rounded-lg font-medium hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Week {currentWeek + 1} →
                    </button>
                  </div>
                </div>
                
                {currentWeekSummary && (
                  <div className="mt-4 text-center text-gray-600">
                    {currentWeekSummary.star_bakers} Star Baker{currentWeekSummary.star_bakers !== 1 ? 's' : ''} • 
                    {currentWeekSummary.technical_winners} Technical Winner{currentWeekSummary.technical_winners !== 1 ? 's' : ''} • 
                    {currentWeekSummary.eliminated_count} Eliminated • 
                    {currentWeekSummary.handshakes} Handshake{currentWeekSummary.handshakes !== 1 ? 's' : ''}
                    {currentWeekSummary.weekly_specials > 0 && (
                      <> • {currentWeekSummary.weekly_specials} Weekly Special{currentWeekSummary.weekly_specials !== 1 ? 's' : ''}</>
                    )}
                  </div>
                )}
              </div>

              {/* Week Statistics */}
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/30">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Week {currentWeek} Statistics</h3>
                {currentWeekSummary ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <span className="text-blue-700 font-medium">Total Participants</span>
                      <span className="text-blue-600 font-bold">{totalParticipants}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                      <span className="text-green-700 font-medium">Still in Competition</span>
                      <span className="text-green-600 font-bold">{remainingParticipants}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                      <span className="text-red-700 font-medium">Eliminated This Week</span>
                      <span className="text-red-600 font-bold">{currentWeekSummary.eliminated_count}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <span className="text-yellow-700 font-medium">Handshakes Awarded</span>
                      <span className="text-yellow-600 font-bold">{currentWeekSummary.handshakes}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-600">No statistics available for Week {currentWeek}.</p>
                  </div>
                )}
              </div>

              {/* Actual Results */}
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/30">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Actual Results</h3>
                {weeklyResults.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600">No results recorded for Week {currentWeek} yet.</p>
                    <p className="text-gray-500 text-sm mt-2">Use the admin panel to add results.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {weeklyResults.filter(r => r.star_baker).map((result) => (
                      <div key={result.id} className="p-3 bg-blue-100 rounded-lg border border-blue-200">
                        <span className="text-gray-800 font-medium">⭐ Star Baker</span>
                        <p className="text-gray-700 text-sm">{result.participant.name}</p>
                      </div>
                    ))}
                    {weeklyResults.filter(r => r.technical_winner).map((result) => (
                      <div key={result.id} className="p-3 bg-purple-100 rounded-lg border border-purple-200">
                        <span className="text-gray-800 font-medium">🏆 Technical Winner</span>
                        <p className="text-gray-700 text-sm">{result.participant.name}</p>
                      </div>
                    ))}
                    {weeklyResults.filter(r => r.eliminated).map((result) => (
                      <div key={result.id} className="p-3 bg-red-100 rounded-lg border border-red-200">
                        <span className="text-gray-800 font-medium">😢 Eliminated</span>
                        <p className="text-gray-700 text-sm">{result.participant.name}</p>
                      </div>
                    ))}
                    {weeklyResults.filter(r => r.handshake).map((result) => (
                      <div key={result.id} className="p-3 bg-yellow-100 rounded-lg border border-yellow-200">
                        <span className="text-gray-800 font-medium">🤝 Handshake</span>
                        <p className="text-gray-700 text-sm">{result.participant.name}</p>
                      </div>
                    ))}
                    {weeklyResults.filter(r => r.weekly_special).map((result) => (
                      <div key={result.id} className="p-3 bg-green-100 rounded-lg border border-green-200">
                        <span className="text-gray-800 font-medium">✨ Weekly Special</span>
                        <p className="text-gray-700 text-sm">{result.participant.name}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* User Scores */}
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/30">
                <h3 className="text-xl font-bold text-gray-800 mb-4">User Scores</h3>
                                 {weekScores.length === 0 ? (
                   <div className="text-center py-8">
                     <p className="text-gray-600">No scores calculated for Week {currentWeek} yet.</p>
                     {isAdmin && (
                       <p className="text-gray-500 text-sm mt-2">Scores are automatically calculated when you save results in the admin panel.</p>
                     )}
                   </div>
                 ) : (
                  <div className="space-y-3">
                    {weekScores.map((score, index) => (
                      <div 
                        key={score.id} 
                        className={`p-3 rounded-lg border ${
                          index === 0 ? 'bg-yellow-50 border-yellow-200' :
                          index === 1 ? 'bg-gray-50 border-gray-200' :
                          index === 2 ? 'bg-orange-50 border-orange-200' :
                          'bg-blue-50 border-blue-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {index === 0 && <span className="text-yellow-600">🥇</span>}
                            {index === 1 && <span className="text-gray-600">🥈</span>}
                            {index === 2 && <span className="text-orange-600">🥉</span>}
                            <span className={`font-medium text-sm ${
                              index === 0 ? 'text-yellow-700' :
                              index === 1 ? 'text-gray-700' :
                              index === 2 ? 'text-orange-700' :
                              'text-blue-700'
                            }`}>
                              {score.user_name}
                            </span>
                          </div>
                          <span className={`font-bold text-lg ${
                            index === 0 ? 'text-yellow-600' :
                            index === 1 ? 'text-gray-600' :
                            index === 2 ? 'text-orange-600' :
                            'text-blue-600'
                          }`}>
                            {score.total_points} pts
                          </span>
                        </div>
                        
                        {/* Score Breakdown */}
                        <div className="mt-2 text-xs text-gray-600 space-y-1">
                          {score.star_baker_points > 0 && (
                            <div>⭐ Star Baker: +{score.star_baker_points}</div>
                          )}
                          {score.technical_winner_points > 0 && (
                            <div>🏆 Technical: +{score.technical_winner_points}</div>
                          )}
                          {score.eliminated_points > 0 && (
                            <div>😢 Eliminated: +{score.eliminated_points}</div>
                          )}
                          {score.handshake_points > 0 && (
                            <div>🤝 Handshake: +{score.handshake_points}</div>
                          )}
                          {score.weekly_special_points > 0 && (
                            <div>✨ Special: +{score.weekly_special_points}</div>
                          )}
                          {score.bonus_points > 0 && (
                            <div>🎉 Bonus: +{score.bonus_points}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Accumulated Results View
            <div className="space-y-8">
              {/* Accumulated Results Header */}
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/30">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Accumulated Results</h2>
                <p className="text-gray-600">
                  Complete competition overview showing all participants' achievements across all weeks
                </p>
              </div>

              {/* Results Table */}
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-white/30 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Participant
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ⭐ Star Baker
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          🏆 Technical
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          🤝 Handshake
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ✨ Special
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Eliminated Week
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {currentResults.map((result, index) => (
                        <tr key={result.participant.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-pastel-pink to-pastel-blue flex items-center justify-center">
                                  <span className="text-sm font-medium text-white">
                                    {result.participant.name.charAt(0)}
                                  </span>
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {result.participant.name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {result.weeks_active.size} week{result.weeks_active.size !== 1 ? 's' : ''} active
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {result.total_star_baker}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              {result.total_technical_winner}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              {result.total_handshake}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {result.total_weekly_special}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            {result.is_eliminated ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                Eliminated
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Active
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                            {result.eliminated_week ? `Week ${result.eliminated_week}` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                    <div className="flex-1 flex justify-between sm:hidden">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-gray-700">
                          Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                          <span className="font-medium">{Math.min(endIndex, accumulatedResults.length)}</span> of{' '}
                          <span className="font-medium">{accumulatedResults.length}</span> results
                        </p>
                      </div>
                      <div>
                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                          <button
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span className="sr-only">Previous</span>
                            ←
                          </button>
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                            <button
                              key={page}
                              onClick={() => setCurrentPage(page)}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                page === currentPage
                                  ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                  : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                              }`}
                            >
                              {page}
                            </button>
                          ))}
                          <button
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span className="sr-only">Next</span>
                            →
                          </button>
                        </nav>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
