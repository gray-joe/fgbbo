"use client";

import { useState } from "react";
import AppLayout from "../components/AppLayout";

interface Participant {
  id: string;
  name: string;
  eliminated: boolean;
}

interface WeeklyPrediction {
  week: number;
  starBaker: string;
  technicalWinner: string;
  eliminated: string;
  handshake: string;
  weeklySpecial: string;
}

export default function PredictionsPage() {
  // Mock participants data - in a real app this would come from an API
  const participants: Participant[] = [
    { id: "1", name: "Alice", eliminated: false },
    { id: "2", name: "Bob", eliminated: false },
    { id: "3", name: "Charlie", eliminated: false },
    { id: "4", name: "Diana", eliminated: false },
    { id: "5", name: "Eve", eliminated: false },
    { id: "6", name: "Frank", eliminated: false },
    { id: "7", name: "Grace", eliminated: false },
    { id: "8", name: "Henry", eliminated: false },
    { id: "9", name: "Ivy", eliminated: false },
    { id: "10", name: "Jack", eliminated: false },
  ];

  const [currentWeek, setCurrentWeek] = useState(1);
  const [predictions, setPredictions] = useState<WeeklyPrediction>({
    week: 1,
    starBaker: "",
    technicalWinner: "",
    eliminated: "",
    handshake: "",
    weeklySpecial: "",
  });

  const handlePredictionChange = (category: keyof WeeklyPrediction, value: string) => {
    setPredictions(prev => ({
      ...prev,
      [category]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Submit predictions to backend
    console.log("Submitting predictions for week", currentWeek, predictions);
  };

  const availableParticipants = participants.filter(p => !p.eliminated);

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-pastel-blue via-white to-pastel-pink p-8">
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
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-white/30">
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
                  value={predictions.starBaker}
                  onChange={(e) => handlePredictionChange("starBaker", e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pastel-blue focus:border-transparent transition-all bg-white text-gray-800"
                  required
                >
                  <option value="">Select Star Baker</option>
                  {availableParticipants.map((participant) => (
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
                  value={predictions.technicalWinner}
                  onChange={(e) => handlePredictionChange("technicalWinner", e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pastel-pink focus:border-transparent transition-all bg-white text-gray-800"
                  required
                >
                  <option value="">Select Technical Winner</option>
                  {availableParticipants.map((participant) => (
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-400 focus:border-transparent transition-all bg-white text-gray-800"
                  required
                >
                  <option value="">Select Eliminated Contestant</option>
                  {availableParticipants.map((participant) => (
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all bg-white text-gray-800"
                >
                  <option value="">Select Handshake Recipient (Optional)</option>
                  {availableParticipants.map((participant) => (
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
                  value={predictions.weeklySpecial}
                  onChange={(e) => handlePredictionChange("weeklySpecial", e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all bg-white text-gray-800"
                >
                  <option value="">Select Weekly Special (Optional)</option>
                  {availableParticipants.map((participant) => (
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
                  className="bg-gradient-to-r from-pastel-blue to-pastel-pink text-gray-800 py-4 px-8 rounded-xl font-bold text-lg hover:from-pastel-blue-dark hover:to-pastel-pink-dark transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  Submit Week {currentWeek} Predictions
                </button>
              </div>
            </form>
          </div>

          {/* Current Predictions Summary */}
          {Object.values(predictions).some(value => value !== "") && (
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 mt-8 border border-white/30">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Your Week {currentWeek} Predictions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {predictions.starBaker && (
                  <div className="flex items-center space-x-3 p-3 bg-pastel-blue/20 rounded-lg">
                    <span className="text-2xl">⭐</span>
                    <span className="text-gray-700">
                      <strong>Star Baker:</strong> {participants.find(p => p.id === predictions.starBaker)?.name}
                    </span>
                  </div>
                )}
                {predictions.technicalWinner && (
                  <div className="flex items-center space-x-3 p-3 bg-pastel-pink/20 rounded-lg">
                    <span className="text-2xl">🏆</span>
                    <span className="text-gray-700">
                      <strong>Technical Winner:</strong> {participants.find(p => p.id === predictions.technicalWinner)?.name}
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
                {predictions.weeklySpecial && (
                  <div className="flex items-center space-x-3 p-3 bg-purple-100 rounded-lg">
                    <span className="text-2xl">✨</span>
                    <span className="text-gray-700">
                      <strong>Weekly Special:</strong> {participants.find(p => p.id === predictions.weeklySpecial)?.name}
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
