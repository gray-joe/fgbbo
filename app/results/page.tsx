import AppLayout from "../components/AppLayout";

export default function ResultsPage() {
  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-pastel-blue via-white to-pastel-pink p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              Results
            </h1>
            <p className="text-gray-700 text-lg">
              Track your performance and see how your predictions fared!
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Week Selector */}
            <div className="lg:col-span-3 bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/30">
              <div className="flex items-center justify-center space-x-4">
                <button className="px-4 py-2 bg-pastel-blue text-gray-800 rounded-lg font-medium hover:bg-pastel-blue-dark transition-colors">
                  ← Week 2
                </button>
                <h2 className="text-2xl font-bold text-gray-800">Week 3 Results</h2>
                <button className="px-4 py-2 bg-pastel-pink text-gray-800 rounded-lg font-medium hover:bg-pastel-pink-dark transition-colors">
                  Week 4 →
                </button>
              </div>
            </div>

            {/* Your Predictions */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/30">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Your Predictions</h3>
              <div className="space-y-3">
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between">
                    <span className="text-green-700 font-medium">Star Baker</span>
                    <span className="text-green-600 font-bold">+15 pts</span>
                  </div>
                  <p className="text-green-600 text-sm">Predicted: Alice ✓</p>
                </div>
                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-center justify-between">
                    <span className="text-red-700 font-medium">Technical Winner</span>
                    <span className="text-red-600 font-bold">-5 pts</span>
                  </div>
                  <p className="text-red-600 text-sm">Predicted: Bob ✗</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between">
                    <span className="text-green-700 font-medium">Eliminated</span>
                    <span className="text-green-600 font-bold">+10 pts</span>
                  </div>
                  <p className="text-green-600 text-sm">Predicted: Charlie ✓</p>
                </div>
                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center justify-between">
                    <span className="text-yellow-700 font-medium">Handshake</span>
                    <span className="text-yellow-600 font-bold">+5 pts</span>
                  </div>
                  <p className="text-yellow-600 text-sm">Predicted: Diana ✓</p>
                </div>
              </div>
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-center">
                  <p className="text-blue-800 font-bold text-lg">Total: +25 pts</p>
                  <p className="text-blue-600 text-sm">Week 3 Score</p>
                </div>
              </div>
            </div>

            {/* Actual Results */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/30">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Actual Results</h3>
              <div className="space-y-3">
                <div className="p-3 bg-pastel-blue/20 rounded-lg border border-pastel-blue/30">
                  <span className="text-gray-800 font-medium">Star Baker</span>
                  <p className="text-gray-700 text-sm">Alice</p>
                </div>
                <div className="p-3 bg-pastel-pink/20 rounded-lg border border-pastel-pink/30">
                  <span className="text-gray-800 font-medium">Technical Winner</span>
                  <p className="text-gray-700 text-sm">Eve</p>
                </div>
                <div className="p-3 bg-red-100 rounded-lg border border-red-200">
                  <span className="text-gray-800 font-medium">Eliminated</span>
                  <p className="text-gray-700 text-sm">Charlie</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-lg border border-yellow-200">
                  <span className="text-gray-800 font-medium">Handshake</span>
                  <p className="text-gray-700 text-sm">Diana</p>
                </div>
              </div>
            </div>

            {/* League Standings */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/30">
              <h3 className="text-xl font-bold text-gray-800 mb-4">League Standings</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-yellow-100 rounded-lg">
                  <span className="font-medium text-gray-800">🥇 You</span>
                  <span className="font-bold text-gray-800">156 pts</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-100 rounded-lg">
                  <span className="font-medium text-gray-800">🥈 Sarah</span>
                  <span className="font-bold text-gray-800">144 pts</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-orange-100 rounded-lg">
                  <span className="font-medium text-gray-800">🥉 Mike</span>
                  <span className="font-bold text-gray-800">138 pts</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-800">4. Emma</span>
                  <span className="font-bold text-gray-800">132 pts</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-800">5. Tom</span>
                  <span className="font-bold text-gray-800">128 pts</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
