"use client";

import { useState, useEffect } from "react";
import AppLayout from "../components/AppLayout";
import { useActiveParticipants } from "../../lib/hooks/useParticipants";
import { useWeeklyPredictions } from "../../lib/hooks/usePredictions";
import { useWeekLockStatus } from "../../lib/hooks/useWeekLocks";
import { useAuth } from "../../lib/hooks/useAuth";
import { Participant } from "../../lib/participants";
import { WeeklyPrediction } from "../../lib/predictions";

export default function PredictionsPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { participants, loading: participantsLoading, error: participantsError } = useActiveParticipants();
  const [currentWeek, setCurrentWeek] = useState(1);
  const [predictions, setPredictions] = useState<WeeklyPrediction>({
    week: 1,
    star_baker: "",
    technical_winner: "",
    eliminated: "",
    handshake: "",
    weekly_special: "",
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const { predictions: existingPredictions, loading: predictionsLoading, savePredictions } = useWeeklyPredictions(
    user?.id || null, 
    currentWeek
  );

  const { isLocked, loading: lockLoading } = useWeekLockStatus(currentWeek);

  // Update current week when it changes
  useEffect(() => {
    setPredictions(prev => ({
      ...prev,
      week: currentWeek
    }));
  }, [currentWeek]);

  // Load existing predictions when they change
  useEffect(() => {
    if (existingPredictions.length > 0) {
      const newPredictions: WeeklyPrediction = {
        week: currentWeek,
        star_baker: "",
        technical_winner: "",
        eliminated: "",
        handshake: "",
        weekly_special: "",
      };

      existingPredictions.forEach(pred => {
        switch (pred.prediction_type) {
          case 'star_baker':
            newPredictions.star_baker = pred.participant_id;
            break;
          case 'technical_winner':
            newPredictions.technical_winner = pred.participant_id;
            break;
          case 'eliminated':
            newPredictions.eliminated = pred.participant_id;
            break;
          case 'handshake':
            newPredictions.handshake = pred.participant_id;
            break;
          case 'weekly_special':
            newPredictions.weekly_special = pred.participant_id;
            break;
        }
      });

      setPredictions(newPredictions);
    } else {
      // Reset predictions if none exist for this week
      setPredictions({
        week: currentWeek,
        star_baker: "",
        technical_winner: "",
        eliminated: "",
        handshake: "",
        weekly_special: "",
      });
    }
  }, [existingPredictions, currentWeek]);

  const handlePredictionChange = (category: keyof WeeklyPrediction, value: string) => {
    // Don't allow changes if the week is locked
    if (isLocked === true) {
      return;
    }

    setPredictions(prev => ({
      ...prev,
      [category]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      setSaveError("Please log in to save predictions");
      return;
    }

    if (isLocked === true) {
      setSaveError("This week is locked. Predictions cannot be changed.");
      return;
    }

    try {
      setSaving(true);
      setSaveError(null);
      setSaveSuccess(false);

      await savePredictions(predictions);
      setSaveSuccess(true);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save predictions');
    } finally {
      setSaving(false);
    }
  };

  // Show loading state
  if (authLoading || participantsLoading || predictionsLoading || lockLoading) {
    return (
      <AppLayout>
        <div className="min-h-screen p-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-400 mx-auto"></div>
              <p className="text-gray-700 text-lg mt-4">Loading...</p>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Show error state
  if (participantsError) {
    return (
      <AppLayout>
        <div className="min-h-screen p-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center">
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                <strong>Error:</strong> {participantsError}
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Show login required message
  if (!isAuthenticated) {
    return (
      <AppLayout>
        <div className="min-h-screen p-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center">
              <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
                <strong>Login Required:</strong> Please log in to make predictions.
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
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              Weekly Predictions
            </h1>
            <p className="text-gray-700 text-lg">
              Make your predictions for Week {currentWeek} and bake your way to victory!
            </p>
          </div>

          {/* Week Lock Warning */}
          {isLocked === true && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
              <strong>⚠️ Week {currentWeek} is Locked:</strong> This week's predictions cannot be changed. 
              The episode has aired and results are being calculated.
            </div>
          )}

          {/* Success/Error Messages */}
          {saveSuccess && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
              <strong>Success!</strong> Your predictions for Week {currentWeek} have been saved.
            </div>
          )}

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

          {/* Week Selector */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 mb-8 border border-white/30">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Week {currentWeek}</h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentWeek(Math.max(1, currentWeek - 1))}
                  disabled={currentWeek === 1}
                  className="px-4 py-2 bg-pastel-blue text-gray-800 rounded-lg font-medium hover:bg-pastel-blue-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← Previous Week
                </button>
                <button
                  onClick={() => setCurrentWeek(currentWeek + 1)}
                  className="px-4 py-2 bg-pastel-pink text-gray-800 rounded-lg font-medium hover:bg-pastel-pink-dark transition-colors"
                >
                  Next Week →
                </button>
              </div>
            </div>
          </div>

          {/* Predictions Form */}
          <div className={`bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-white/30 ${
            isLocked === true ? 'opacity-75' : ''
          }`}>
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Star Baker */}
              <div className="bg-gradient-to-r from-pastel-blue/20 to-pastel-blue/10 rounded-xl p-6 border border-pastel-blue/30">
                <div className="flex items-center mb-4">
                  <span className="text-3xl mr-3">⭐</span>
                  <h3 className="text-xl font-bold text-gray-800">Star Baker</h3>
                </div>
                <p className="text-gray-600 mb-4">
                  Who will be crowned Star Baker this week?
                </p>
                <select
                  value={predictions.star_baker}
                  onChange={(e) => handlePredictionChange("star_baker", e.target.value)}
                  disabled={isLocked === true}
                  className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pastel-blue focus:border-transparent transition-all bg-white text-gray-800 ${
                    isLocked === true ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  required
                >
                  <option value="">Select Star Baker</option>
                  {participants.map((participant) => (
                    <option key={participant.id} value={participant.id}>
                      {participant.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Technical Winner */}
              <div className="bg-gradient-to-r from-pastel-pink/20 to-pastel-pink/10 rounded-xl p-6 border border-pastel-pink/30">
                <div className="flex items-center mb-4">
                  <span className="text-3xl mr-3">🏆</span>
                  <h3 className="text-xl font-bold text-gray-800">Technical Challenge Winner</h3>
                </div>
                <p className="text-gray-600 mb-4">
                  Who will triumph in the technical challenge?
                </p>
                <select
                  value={predictions.technical_winner}
                  onChange={(e) => handlePredictionChange("technical_winner", e.target.value)}
                  disabled={isLocked === true}
                  className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pastel-pink focus:border-transparent transition-all bg-white text-gray-800 ${
                    isLocked === true ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  required
                >
                  <option value="">Select Technical Winner</option>
                  {participants.map((participant) => (
                    <option key={participant.id} value={participant.id}>
                      {participant.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Eliminated */}
              <div className="bg-gradient-to-r from-red-100 to-red-50 rounded-xl p-6 border border-red-200">
                <div className="flex items-center mb-4">
                  <span className="text-3xl mr-3">😢</span>
                  <h3 className="text-xl font-bold text-gray-800">Eliminated</h3>
                </div>
                <p className="text-gray-600 mb-4">
                  Who will be sent home this week?
                </p>
                <select
                  value={predictions.eliminated}
                  onChange={(e) => handlePredictionChange("eliminated", e.target.value)}
                  disabled={isLocked === true}
                  className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-400 focus:border-transparent transition-all bg-white text-gray-800 ${
                    isLocked === true ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  required
                >
                  <option value="">Select Eliminated Contestant</option>
                  {participants.map((participant) => (
                    <option key={participant.id} value={participant.id}>
                      {participant.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Handshake */}
              <div className="bg-gradient-to-r from-yellow-100 to-yellow-50 rounded-xl p-6 border border-yellow-200">
                <div className="flex items-center mb-4">
                  <span className="text-3xl mr-3">🤝</span>
                  <h3 className="text-xl font-bold text-gray-800">Paul Hollywood Handshake</h3>
                </div>
                <p className="text-gray-600 mb-4">
                  Who will receive the coveted handshake from Paul?
                </p>
                <select
                  value={predictions.handshake}
                  onChange={(e) => handlePredictionChange("handshake", e.target.value)}
                  disabled={isLocked === true}
                  className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all bg-white text-gray-800 ${
                    isLocked === true ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <option value="">Select Handshake Recipient (Optional)</option>
                  {participants.map((participant) => (
                    <option key={participant.id} value={participant.id}>
                      {participant.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Weekly Special */}
              <div className="bg-gradient-to-r from-purple-100 to-purple-50 rounded-xl p-6 border border-purple-200">
                <div className="flex items-center mb-4">
                  <span className="text-3xl mr-3">✨</span>
                  <h3 className="text-xl font-bold text-gray-800">Weekly Special</h3>
                </div>
                <p className="text-gray-600 mb-4">
                  Who will achieve something special this week?
                </p>
                <select
                  value={predictions.weekly_special}
                  onChange={(e) => handlePredictionChange("weekly_special", e.target.value)}
                  disabled={isLocked === true}
                  className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all bg-white text-gray-800 ${
                    isLocked === true ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <option value="">Select Weekly Special (Optional)</option>
                  {participants.map((participant) => (
                    <option key={participant.id} value={participant.id}>
                      {participant.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Submit Button */}
              <div className="text-center pt-6">
                <button
                  type="submit"
                  disabled={saving || isLocked === true}
                  className="bg-gradient-to-r from-pastel-blue to-pastel-pink text-gray-800 py-4 px-8 rounded-xl font-bold text-lg hover:from-pastel-blue-dark hover:to-pastel-pink-dark transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : isLocked === true ? 'Week Locked' : `Submit Week ${currentWeek} Predictions`}
                </button>
              </div>
            </form>
          </div>

          {/* Current Predictions Summary */}
          {Object.values(predictions).some(value => value !== "") && (
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 mt-8 border border-white/30">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Your Week {currentWeek} Predictions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {predictions.star_baker && (
                  <div className="flex items-center space-x-3 p-3 bg-pastel-blue/20 rounded-lg">
                    <span className="text-2xl">⭐</span>
                    <span className="text-gray-700">
                      <strong>Star Baker:</strong> {participants.find(p => p.id === predictions.star_baker)?.name}
                    </span>
                  </div>
                )}
                {predictions.technical_winner && (
                  <div className="flex items-center space-x-3 p-3 bg-pastel-pink/20 rounded-lg">
                    <span className="text-2xl">🏆</span>
                    <span className="text-gray-700">
                      <strong>Technical Winner:</strong> {participants.find(p => p.id === predictions.technical_winner)?.name}
                    </span>
                  </div>
                )}
                {predictions.eliminated && (
                  <div className="flex items-center space-x-3 p-3 bg-red-100 rounded-lg">
                    <span className="text-2xl">😢</span>
                    <span className="text-gray-700">
                      <strong>Eliminated:</strong> {participants.find(p => p.id === predictions.eliminated)?.name}
                    </span>
                  </div>
                )}
                {predictions.handshake && (
                  <div className="flex items-center space-x-3 p-3 bg-yellow-100 rounded-lg">
                    <span className="text-2xl">🤝</span>
                    <span className="text-gray-700">
                      <strong>Handshake:</strong> {participants.find(p => p.id === predictions.handshake)?.name}
                    </span>
                  </div>
                )}
                {predictions.weekly_special && (
                  <div className="flex items-center space-x-3 p-3 bg-purple-100 rounded-lg">
                    <span className="text-2xl">✨</span>
                    <span className="text-gray-700">
                      <strong>Weekly Special:</strong> {participants.find(p => p.id === predictions.weekly_special)?.name}
                    </span>
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
