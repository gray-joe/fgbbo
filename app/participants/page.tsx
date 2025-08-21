import AppLayout from "../components/AppLayout";

export default function ParticipantsPage() {
  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-pastel-blue via-white to-pastel-pink p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              Participants
            </h1>
            <p className="text-gray-700 text-lg">
              Meet the bakers competing in this season!
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Active Participants */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/30">
              <div className="text-center mb-4">
                <div className="w-20 h-20 bg-gradient-to-br from-pastel-blue to-pastel-pink rounded-full mx-auto mb-3 flex items-center justify-center">
                  <span className="text-2xl">👩‍🍳</span>
                </div>
                <h3 className="text-xl font-bold text-gray-800">Alice</h3>
                <p className="text-gray-600 text-sm">Week 3: Star Baker</p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Star Baker:</span>
                  <span className="font-medium text-green-600">2 times</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Technical Wins:</span>
                  <span className="font-medium text-blue-600">1 time</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Handshakes:</span>
                  <span className="font-medium text-yellow-600">1 time</span>
                </div>
              </div>
            </div>

            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/30">
              <div className="text-center mb-4">
                <div className="w-20 h-20 bg-gradient-to-br from-pastel-blue to-pastel-pink rounded-full mx-auto mb-3 flex items-center justify-center">
                  <span className="text-2xl">👨‍🍳</span>
                </div>
                <h3 className="text-xl font-bold text-gray-800">Bob</h3>
                <p className="text-gray-600 text-sm">Week 2: Technical Winner</p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Star Baker:</span>
                  <span className="font-medium text-green-600">0 times</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Technical Wins:</span>
                  <span className="font-medium text-blue-600">1 time</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Handshakes:</span>
                  <span className="font-medium text-yellow-600">0 times</span>
                </div>
              </div>
            </div>

            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/30">
              <div className="text-center mb-4">
                <div className="w-20 h-20 bg-gradient-to-br from-pastel-blue to-pastel-pink rounded-full mx-auto mb-3 flex items-center justify-center">
                  <span className="text-2xl">👩‍🍳</span>
                </div>
                <h3 className="text-xl font-bold text-gray-800">Charlie</h3>
                <p className="text-gray-600 text-sm">Week 3: Eliminated</p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Star Baker:</span>
                  <span className="font-medium text-green-600">0 times</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Technical Wins:</span>
                  <span className="font-medium text-blue-600">0 times</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Handshakes:</span>
                  <span className="font-medium text-yellow-600">0 times</span>
                </div>
              </div>
            </div>

            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/30">
              <div className="text-center mb-4">
                <div className="w-20 h-20 bg-gradient-to-br from-pastel-blue to-pastel-pink rounded-full mx-auto mb-3 flex items-center justify-center">
                  <span className="text-2xl">👩‍🍳</span>
                </div>
                <h3 className="text-xl font-bold text-gray-800">Diana</h3>
                <p className="text-gray-600 text-sm">Week 3: Handshake</p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Star Baker:</span>
                  <span className="font-medium text-green-600">0 times</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Technical Wins:</span>
                  <span className="font-medium text-blue-600">0 times</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Handshakes:</span>
                  <span className="font-medium text-yellow-600">1 time</span>
                </div>
              </div>
            </div>

            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/30">
              <div className="text-center mb-4">
                <div className="w-20 h-20 bg-gradient-to-br from-pastel-blue to-pastel-pink rounded-full mx-auto mb-3 flex items-center justify-center">
                  <span className="text-2xl">👩‍🍳</span>
                </div>
                <h3 className="text-xl font-bold text-gray-800">Eve</h3>
                <p className="text-gray-600 text-sm">Week 3: Technical Winner</p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Star Baker:</span>
                  <span className="font-medium text-green-600">0 times</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Technical Wins:</span>
                  <span className="font-medium text-blue-600">1 time</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Handshakes:</span>
                  <span className="font-medium text-yellow-600">0 times</span>
                </div>
              </div>
            </div>

            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/30">
              <div className="text-center mb-4">
                <div className="w-20 h-20 bg-gradient-to-br from-pastel-blue to-pastel-pink rounded-full mx-auto mb-3 flex items-center justify-center">
                  <span className="text-2xl">👨‍🍳</span>
                </div>
                <h3 className="text-xl font-bold text-gray-800">Frank</h3>
                <p className="text-gray-600 text-sm">Week 2: Eliminated</p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Star Baker:</span>
                  <span className="font-medium text-green-600">0 times</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Technical Wins:</span>
                  <span className="font-medium text-blue-600">0 times</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Handshakes:</span>
                  <span className="font-medium text-yellow-600">0 times</span>
                </div>
              </div>
            </div>
          </div>

          {/* Eliminated Participants */}
          <div className="mt-8 bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/30">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Eliminated This Season</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="w-16 h-16 bg-red-100 rounded-full mx-auto mb-2 flex items-center justify-center">
                  <span className="text-xl">👨‍🍳</span>
                </div>
                <h3 className="font-bold text-gray-800">Frank</h3>
                <p className="text-red-600 text-sm">Week 2</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="w-16 h-16 bg-red-100 rounded-full mx-auto mb-2 flex items-center justify-center">
                  <span className="text-xl">👩‍🍳</span>
                </div>
                <h3 className="font-bold text-gray-800">Charlie</h3>
                <p className="text-red-600 text-sm">Week 3</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
