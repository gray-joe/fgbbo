import { Metadata } from 'next'
import AppLayout from '../components/AppLayout'

export const metadata: Metadata = {
  title: 'Scoring System - GBBO Fantasy League',
  description: 'Learn how the scoring system works in the Great British Bake Off Fantasy League'
}

export default function ScoringPage() {
  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-pastel-blue via-white to-pastel-pink p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-4">
              🏆 Scoring System
            </h1>
            <p className="text-gray-700 text-lg">
              How points are awarded in the GBBO Fantasy League
            </p>
          </div>

          {/* Main Content */}
          <div className="space-y-8">
            {/* Positive Points Section */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-white/30">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <span className="text-3xl mr-3">✅</span>
                Correct Predictions
              </h2>
              <p className="text-gray-700 mb-6">
                Earn points by correctly predicting the outcomes of each week's challenges.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Star Baker */}
                <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg p-6 border border-yellow-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-800">Star Baker</h3>
                    <span className="text-2xl font-bold text-yellow-600">+5 points</span>
                  </div>
                  <p className="text-gray-700 text-sm">
                    Correctly predict who will be named Star Baker for the week
                  </p>
                </div>

                {/* Technical Winner */}
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-800">Technical Winner</h3>
                    <span className="text-2xl font-bold text-blue-600">+3 points</span>
                  </div>
                  <p className="text-gray-700 text-sm">
                    Correctly predict who will win the Technical Challenge
                  </p>
                </div>

                {/* Eliminated */}
                <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-lg p-6 border border-red-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-800">Eliminated</h3>
                    <span className="text-2xl font-bold text-red-600">+3 points</span>
                  </div>
                  <p className="text-gray-700 text-sm">
                    Correctly predict who will be eliminated this week
                  </p>
                </div>

                {/* Handshake */}
                <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-800">Paul's Handshake</h3>
                    <span className="text-2xl font-bold text-green-600">+2 points</span>
                  </div>
                  <p className="text-gray-700 text-sm">
                    Correctly predict who will receive a handshake from Paul Hollywood
                  </p>
                </div>

                {/* Weekly Special */}
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-800">Weekly Special</h3>
                    <span className="text-2xl font-bold text-purple-600">+3 points</span>
                  </div>
                  <p className="text-gray-700 text-sm">
                    Correctly predict the weekly special achievement
                  </p>
                </div>

                {/* Overall Winner */}
                <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg p-6 border border-yellow-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-800">Overall Winner</h3>
                    <span className="text-2xl font-bold text-yellow-600">+10 points</span>
                  </div>
                  <p className="text-gray-700 text-sm">
                    Correctly predict the overall winner of the competition
                  </p>
                </div>

                {/* Overall Finalist 1 */}
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-800">Overall Finalist #1</h3>
                    <span className="text-2xl font-bold text-purple-600">+5 points</span>
                  </div>
                  <p className="text-gray-700 text-sm">
                    Correctly predict the first overall finalist (top 3)
                  </p>
                </div>

                {/* Overall Finalist 2 */}
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-800">Overall Finalist #2</h3>
                    <span className="text-2xl font-bold text-purple-600">+5 points</span>
                  </div>
                  <p className="text-gray-700 text-sm">
                    Correctly predict the second overall finalist (top 3)
                  </p>
                </div>

                {/* Overall Finalist 3 */}
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-800">Overall Finalist #3</h3>
                    <span className="text-2xl font-bold text-purple-600">+5 points</span>
                  </div>
                  <p className="text-gray-700 text-sm">
                    Correctly predict the third overall finalist (top 3)
                  </p>
                </div>

                {/* Perfect Week Bonus */}
                <div className="bg-gradient-to-r from-pink-50 to-pink-100 rounded-lg p-6 border border-pink-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-800">Perfect Week</h3>
                    <span className="text-2xl font-bold text-pink-600">+2 points</span>
                  </div>
                  <p className="text-gray-700 text-sm">
                    Bonus points for getting ALL predictions correct in one week
                  </p>
                </div>
              </div>
            </div>

            {/* Penalty Points Section */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-white/30">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <span className="text-3xl mr-3">⚠️</span>
                Penalty Points
              </h2>
              <p className="text-gray-700 mb-6">
                Lose points for particularly bad predictions that show you're completely off track.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Star Baker Penalty */}
                <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-lg p-6 border border-red-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-800">Star Baker Eliminated</h3>
                    <span className="text-2xl font-bold text-red-600">-1 point</span>
                  </div>
                  <p className="text-gray-700 text-sm">
                    Penalty if your predicted Star Baker gets eliminated instead
                  </p>
                </div>

                {/* Eliminated Penalty */}
                <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-6 border border-orange-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-800">Eliminated Wins Star Baker</h3>
                    <span className="text-2xl font-bold text-orange-600">-1 point</span>
                  </div>
                  <p className="text-gray-700 text-sm">
                    Penalty if your predicted eliminated baker wins Star Baker instead
                  </p>
                </div>
              </div>
            </div>

            {/* How It Works Section */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-white/30">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <span className="text-3xl mr-3">📋</span>
                How It Works
              </h2>
              
              <div className="space-y-4 text-gray-700">
                <div className="flex items-start">
                  <span className="bg-pastel-blue text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">1</span>
                  <p>Make your predictions for each week before the episode airs</p>
                </div>
                <div className="flex items-start">
                  <span className="bg-pastel-blue text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">2</span>
                  <p>Once the week is locked, you cannot change your predictions</p>
                </div>
                <div className="flex items-start">
                  <span className="bg-pastel-blue text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">3</span>
                  <p>After the episode, results are entered and scores are calculated automatically</p>
                </div>
                <div className="flex items-start">
                  <span className="bg-pastel-blue text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">4</span>
                  <p>Points are awarded for correct predictions and penalties for particularly bad ones</p>
                </div>
                <div className="flex items-start">
                  <span className="bg-pastel-blue text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">5</span>
                  <p>Your total score accumulates across all weeks to determine your league position</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
