import AppLayout from "../components/AppLayout";

export default function AccountPage() {
  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-pastel-blue via-white to-pastel-pink p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              Account Settings
            </h1>
            <p className="text-gray-700 text-lg">
              Manage your profile and preferences
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Profile Information */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/30">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Profile Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Display Name
                  </label>
                  <input
                    type="text"
                    defaultValue="BakingMaster"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pastel-blue focus:border-transparent transition-all bg-white text-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    defaultValue="baker@example.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pastel-blue focus:border-transparent transition-all bg-white text-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Bio
                  </label>
                  <textarea
                    rows={3}
                    defaultValue="Passionate baker and GBBO enthusiast. Love making sourdough and pastries!"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pastel-blue focus:border-transparent transition-all bg-white text-gray-800"
                  />
                </div>
                <button className="w-full bg-pastel-blue text-gray-800 py-3 px-4 rounded-lg font-semibold hover:bg-pastel-blue-dark transition-all duration-200">
                  Update Profile
                </button>
              </div>
            </div>

            {/* Account Settings */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/30">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Account Settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Current Password
                  </label>
                  <input
                    type="password"
                    placeholder="Enter current password"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pastel-blue focus:border-transparent transition-all bg-white text-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    placeholder="Enter new password"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pastel-blue focus:border-transparent transition-all bg-white text-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    placeholder="Confirm new password"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pastel-blue focus:border-transparent transition-all bg-white text-gray-800"
                  />
                </div>
                <button className="w-full bg-pastel-pink text-gray-800 py-3 px-4 rounded-lg font-semibold hover:bg-pastel-pink-dark transition-all duration-200">
                  Change Password
                </button>
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div className="mt-8 bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/30">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Preferences</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800">Notifications</h3>
                <label className="flex items-center">
                  <input type="checkbox" defaultChecked className="rounded border-gray-300 text-pastel-blue focus:ring-pastel-blue mr-3" />
                  <span className="text-gray-700">Email notifications</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" defaultChecked className="rounded border-gray-300 text-pastel-blue focus:ring-pastel-blue mr-3" />
                  <span className="text-gray-700">Weekly reminders</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="rounded border-gray-300 text-pastel-blue focus:ring-pastel-blue mr-3" />
                  <span className="text-gray-700">League updates</span>
                </label>
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800">Privacy</h3>
                <label className="flex items-center">
                  <input type="checkbox" defaultChecked className="rounded border-gray-300 text-pastel-blue focus:ring-pastel-blue mr-3" />
                  <span className="text-gray-700">Public profile</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="rounded border-gray-300 text-pastel-blue focus:ring-pastel-blue mr-3" />
                  <span className="text-gray-700">Show predictions</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" defaultChecked className="rounded border-gray-300 text-pastel-blue focus:ring-pastel-blue mr-3" />
                  <span className="text-gray-700">Allow friend requests</span>
                </label>
              </div>
            </div>
            <button className="mt-6 bg-gradient-to-r from-pastel-blue to-pastel-pink text-gray-800 py-3 px-6 rounded-lg font-semibold hover:from-pastel-blue-dark hover:to-pastel-pink-dark transition-all duration-200">
              Save Preferences
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
