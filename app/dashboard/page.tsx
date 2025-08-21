import AppLayout from "../components/AppLayout";

export default function DashboardPage() {
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
                <p className="text-3xl font-bold text-pastel-blue">Week 3</p>
                <p className="text-gray-600 text-sm">Predictions due in 2 days</p>
              </div>
            </div>

            {/* League Position */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/30">
              <div className="text-center">
                <span className="text-4xl">🏆</span>
                <h3 className="text-xl font-bold text-gray-800 mt-2">League Position</h3>
                <p className="text-3xl font-bold text-pastel-pink">#2</p>
                <p className="text-gray-600 text-sm">Out of 24 players</p>
              </div>
            </div>

            {/* Total Points */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/30">
              <div className="text-center">
                <span className="text-4xl">⭐</span>
                <h3 className="text-xl font-bold text-gray-800 mt-2">Total Points</h3>
                <p className="text-3xl font-bold text-green-500">156</p>
                <p className="text-gray-600 text-sm">+12 this week</p>
              </div>
            </div>

            {/* Recent Results */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/30 md:col-span-2 lg:col-span-3">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Recent Results</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="text-green-600 font-medium">✅ Week 2 - Star Baker Correct!</span>
                  <span className="text-green-600 font-bold">+15 pts</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <span className="text-red-600 font-medium">❌ Week 2 - Eliminated Wrong</span>
                  <span className="text-red-600 font-bold">-5 pts</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="text-green-600 font-medium">✅ Week 1 - Technical Winner Correct!</span>
                  <span className="text-green-600 font-bold">+10 pts</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
