"use client";

import { useState, useEffect } from "react";
import AppLayout from "../../components/AppLayout";
import { useParticipants } from "../../../lib/hooks/useParticipants";
import { useWeeklyResults } from "../../../lib/hooks/useResults";
import { useAllResults } from "../../../lib/hooks/useResults";
import { upsertWeeklyResult, deleteWeeklyResults } from "../../../lib/results";
import { Participant } from "../../../lib/participants";
import { calculateWeekScores } from "../../../lib/scores";

export default function AdminResultsPage() {
  const { participants, loading: participantsLoading, error: participantsError } = useParticipants();
  const [currentWeek, setCurrentWeek] = useState(1);
  const { results: weeklyResults, loading: resultsLoading, error: resultsError, refetch } = useWeeklyResults(currentWeek);
  const { results: allResults, loading: allResultsLoading } = useAllResults();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Create a map of participant results for easy access
  const resultsMap = new Map(weeklyResults.map(result => [result.participant_id, result]));

  // Check if participants were eliminated in previous weeks
  const getEliminatedInPreviousWeeks = (participantId: string) => {
    if (currentWeek <= 1) return false;
    
    return allResults.some(result => 
      result.participant_id === participantId && 
      result.eliminated && 
      result.week < currentWeek
    );
  };

  // State for form data
  const [formData, setFormData] = useState<Map<string, {
    star_baker: boolean;
    technical_winner: boolean;
    eliminated: boolean;
    handshake: boolean;
    weekly_special: boolean;
  }>>(new Map());

  // Initialize form data when participants or results change
  useEffect(() => {
    const newFormData = new Map();
    participants.forEach(participant => {
      const existingResult = resultsMap.get(participant.id);
      newFormData.set(participant.id, {
        star_baker: existingResult?.star_baker || false,
        technical_winner: existingResult?.technical_winner || false,
        eliminated: existingResult?.eliminated || false,
        handshake: existingResult?.handshake || false,
        weekly_special: existingResult?.weekly_special || false,
      });
    });
    setFormData(newFormData);
  }, [participants, weeklyResults]);

  const handleCheckboxChange = (participantId: string, field: string, value: boolean) => {
    // Don't allow changes for participants eliminated in previous weeks
    if (getEliminatedInPreviousWeeks(participantId)) {
      return;
    }

    setFormData(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(participantId) || {
        star_baker: false,
        technical_winner: false,
        eliminated: false,
        handshake: false,
        weekly_special: false,
      };
      newMap.set(participantId, { ...current, [field]: value });
      return newMap;
    });
  };

  const handleSaveResults = async () => {
    setSaving(true);
    setSaveError(null);

    try {
      // Save all the weekly results
      const promises = Array.from(formData.entries()).map(([participantId, data]) =>
        upsertWeeklyResult(currentWeek, participantId, data)
      );

      await Promise.all(promises);
      
      // Automatically calculate scores for this week after saving results
      try {
        await calculateWeekScores(currentWeek);
        console.log(`Scores calculated for Week ${currentWeek}`);
      } catch (scoreError) {
        console.error(`Failed to calculate scores for Week ${currentWeek}:`, scoreError);
        // Don't fail the entire save operation if score calculation fails
      }
      
      refetch(); // Refresh the data
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 5000); // Hide success message after 5 seconds
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save results');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteWeek = async () => {
    if (!confirm(`Are you sure you want to delete all results for Week ${currentWeek}?`)) {
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      await deleteWeeklyResults(currentWeek);
      
      // Recalculate scores for this week and subsequent weeks since deleting a week affects later calculations
      try {
        // Recalculate scores for the deleted week (will clear them)
        await calculateWeekScores(currentWeek);
        
        // Recalculate scores for subsequent weeks that might be affected
        const maxWeek = Math.max(...Array.from(formData.keys()).map(() => currentWeek + 1));
        for (let week = currentWeek + 1; week <= maxWeek; week++) {
          try {
            await calculateWeekScores(week);
            console.log(`Scores recalculated for Week ${week}`);
          } catch (weekError) {
            console.error(`Failed to recalculate scores for Week ${week}:`, weekError);
          }
        }
      } catch (scoreError) {
        console.error(`Failed to recalculate scores after deleting Week ${currentWeek}:`, scoreError);
        // Don't fail the entire delete operation if score calculation fails
      }
      
      refetch();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to delete results');
    } finally {
      setSaving(false);
    }
  };

  if (participantsLoading || resultsLoading || allResultsLoading) {
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

  if (participantsError || resultsError) {
    return (
      <AppLayout>
        <div className="min-h-screen p-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center">
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                <strong>Error:</strong> {participantsError || resultsError}
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              Manage Weekly Results
            </h1>
            <p className="text-gray-700 text-lg">
              Add and edit results for each week of the competition
            </p>
          </div>

          {/* Week Selector */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 mb-8 border border-white/30">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Week {currentWeek}</h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentWeek(Math.max(1, currentWeek - 1))}
                  disabled={currentWeek === 1}
                  className="px-4 py-2 bg-blue-100 text-gray-800 rounded-lg font-medium hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← Previous Week
                </button>
                <button
                  onClick={() => setCurrentWeek(currentWeek + 1)}
                  className="px-4 py-2 bg-blue-100 text-gray-800 rounded-lg font-medium hover:bg-blue-200 transition-colors"
                >
                  Next Week →
                </button>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {saveError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
              <strong>Error:</strong> {saveError}
              <button
                onClick={() => setSaveError(null)}
                className="float-right font-bold"
              >
                ×
              </button>
            </div>
          )}

          {/* Success Display */}
          {saveSuccess && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
              <strong>Success!</strong> Results saved and scores calculated for Week {currentWeek}.
              <button
                onClick={() => setSaveSuccess(false)}
                className="float-right font-bold"
              >
                ×
              </button>
            </div>
          )}

          {/* Info Display */}
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded mb-6">
            <div className="flex items-center">
              <span className="text-blue-500 mr-2">ℹ️</span>
              <span className="text-sm">
                <strong>Note:</strong> User scores are automatically calculated when you save results. 
                No need to manually calculate scores - the system handles this automatically!
              </span>
            </div>
          </div>

          {/* Results Form */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 mb-8 border border-white/30">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-800">Participant</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-800">⭐ Star Baker</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-800">🏆 Technical Winner</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-800">😢 Eliminated</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-800">🤝 Handshake</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-800">✨ Weekly Special</th>
                  </tr>
                </thead>
                <tbody>
                  {participants.map((participant) => {
                    const participantData = formData.get(participant.id) || {
                      star_baker: false,
                      technical_winner: false,
                      eliminated: false,
                      handshake: false,
                      weekly_special: false,
                    };

                    const eliminatedInPreviousWeeks = getEliminatedInPreviousWeeks(participant.id);
                    const isDisabled = eliminatedInPreviousWeeks;

                    return (
                      <tr 
                        key={participant.id} 
                        className={`border-b border-gray-100 hover:bg-gray-50 ${
                          isDisabled ? 'opacity-50 bg-gray-100' : ''
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              isDisabled 
                                ? 'bg-gray-300' 
                                : 'bg-gradient-to-br from-blue-200 to-blue-300'
                            }`}>
                              <span className="text-sm">👩‍🍳</span>
                            </div>
                            <div>
                              <span className={`font-medium ${
                                isDisabled ? 'text-gray-500' : 'text-gray-800'
                              }`}>
                                {participant.name}
                              </span>
                              {isDisabled && (
                                <div className="text-xs text-gray-400 mt-1">
                                  Eliminated in previous week
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="text-center py-3 px-4">
                          <input
                            type="checkbox"
                            checked={participantData.star_baker}
                            onChange={(e) => handleCheckboxChange(participant.id, 'star_baker', e.target.checked)}
                            disabled={isDisabled}
                            className={`w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 ${
                              isDisabled 
                                ? 'bg-gray-200 cursor-not-allowed' 
                                : 'bg-gray-100 focus:ring-blue-500'
                            }`}
                          />
                        </td>
                        <td className="text-center py-3 px-4">
                          <input
                            type="checkbox"
                            checked={participantData.technical_winner}
                            onChange={(e) => handleCheckboxChange(participant.id, 'technical_winner', e.target.checked)}
                            disabled={isDisabled}
                            className={`w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 ${
                              isDisabled 
                                ? 'bg-gray-200 cursor-not-allowed' 
                                : 'bg-gray-100 focus:ring-blue-500'
                            }`}
                          />
                        </td>
                        <td className="text-center py-3 px-4">
                          <input
                            type="checkbox"
                            checked={participantData.eliminated}
                            onChange={(e) => handleCheckboxChange(participant.id, 'eliminated', e.target.checked)}
                            disabled={isDisabled}
                            className={`w-5 h-5 text-red-600 border-gray-300 rounded focus:ring-2 ${
                              isDisabled 
                                ? 'bg-gray-200 cursor-not-allowed' 
                                : 'bg-gray-100 focus:ring-red-500'
                            }`}
                          />
                        </td>
                        <td className="text-center py-3 px-4">
                          <input
                            type="checkbox"
                            checked={participantData.handshake}
                            onChange={(e) => handleCheckboxChange(participant.id, 'handshake', e.target.checked)}
                            disabled={isDisabled}
                            className={`w-5 h-5 text-yellow-600 border-gray-300 rounded focus:ring-2 ${
                              isDisabled 
                                ? 'bg-gray-200 cursor-not-allowed' 
                                : 'bg-gray-100 focus:ring-yellow-500'
                            }`}
                          />
                        </td>
                        <td className="text-center py-3 px-4">
                          <input
                            type="checkbox"
                            checked={participantData.weekly_special}
                            onChange={(e) => handleCheckboxChange(participant.id, 'weekly_special', e.target.checked)}
                            disabled={isDisabled}
                            className={`w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-2 ${
                              isDisabled 
                                ? 'bg-gray-200 cursor-not-allowed' 
                                : 'bg-gray-100 focus:ring-purple-500'
                            }`}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center">
            <button
              onClick={handleDeleteWeek}
              disabled={saving}
              className="px-6 py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Deleting...' : 'Delete Week Results'}
            </button>
            
            <button
              onClick={handleSaveResults}
              disabled={saving}
              className="px-8 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Week Results'}
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
