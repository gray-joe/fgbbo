import AppLayout from "../components/AppLayout";

export default function LeaguesPage() {
  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-pastel-blue via-white to-pastel-pink p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              Leagues
            </h1>
            <p className="text-gray-700 text-lg">
              Join leagues and compete with other bakers!
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* My Leagues */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/30">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">My Leagues</h2>
              <div className="space-y-4">
                <div className="p-4 bg-pastel-blue/20 rounded-lg border border-pastel-blue/30">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-gray-800">Office Bakers</h3>
                    <span className="text-sm bg-pastel-blue text-gray-800 px-2 py-1 rounded-full">#2</span>
                  </div>
                  <p className="text-gray-600 text-sm mb-2">24 players • Private League</p>
                  <div className="flex items-center space-x-4 text-sm">
                    <span className="text-gray-600">Points: 156</span>
                    <span className="text-gray-600">Behind: 12</span>
                  </div>
                </div>

                <div className="p-4 bg-pastel-pink/20 rounded-lg border border-pastel-pink/30">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-gray-800">Family Bakers</h3>
                    <span className="text-sm bg-pastel-pink text-gray-800 px-2 py-1 rounded-full">#1</span>
                  </div>
                  <p className="text-gray-600 text-sm mb-2">8 players • Private League</p>
                  <div className="flex items-center space-x-4 text-sm">
                    <span className="text-gray-600">Points: 142</span>
                    <span className="text-gray-600">Lead: 8</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Available Leagues */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/30">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Available Leagues</h2>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-gray-800">Public Bakers</h3>
                    <span className="text-sm bg-gray-200 text-gray-600 px-2 py-1 rounded-full">Public</span>
                  </div>
                  <p className="text-gray-600 text-sm mb-2">156 players • Open to join</p>
                  <button className="w-full bg-pastel-blue text-gray-800 py-2 px-4 rounded-lg font-medium hover:bg-pastel-blue-dark transition-colors">
                    Join League
                  </button>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-gray-800">Baking Enthusiasts</h3>
                    <span className="text-sm bg-gray-200 text-gray-600 px-2 py-1 rounded-full">Public</span>
                  </div>
                  <p className="text-gray-600 text-sm mb-2">89 players • Open to join</p>
                  <button className="w-full bg-pastel-pink text-gray-800 py-2 px-4 rounded-lg font-medium hover:bg-pastel-pink-dark transition-colors">
                    Join League
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Create League */}
          <div className="mt-8 bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/30">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Create New League</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="League Name"
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pastel-blue focus:border-transparent transition-all bg-white text-gray-800"
              />
              <select className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pastel-blue focus:border-transparent transition-all bg-white text-gray-800">
                <option>Private League</option>
                <option>Public League</option>
              </select>
            </div>
            <button className="mt-4 bg-gradient-to-r from-pastel-blue to-pastel-pink text-gray-800 py-3 px-6 rounded-lg font-semibold hover:from-pastel-blue-dark hover:to-pastel-pink-dark transition-all duration-200">
              Create League
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
