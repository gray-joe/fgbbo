"use client";

import { useState } from "react";
import AppLayout from "../components/AppLayout";
import { useAuth } from "../../lib/hooks/useAuth";
import { useUserLeagues } from "../../lib/hooks/useLeagues";
import { useLeagueOperations } from "../../lib/hooks/useLeagues";
import { UserLeague } from "../../lib/leagues";

export default function LeaguesPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { leagues: userLeagues, loading: userLoading, refetch: refetchUser } = useUserLeagues();
  const { loading: operationsLoading, error: operationsError, createLeague, joinLeague, leaveLeague } = useLeagueOperations();
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    name: "",
    description: "",
    maxMembers: 50
  });

  // Show loading state
  if (authLoading || userLoading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gradient-to-br from-pastel-blue via-white to-pastel-pink p-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-400 mx-auto"></div>
              <p className="text-gray-700 text-lg mt-4">Loading leagues...</p>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gradient-to-br from-pastel-blue via-white to-pastel-pink p-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center">
              <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
                <strong>Login Required:</strong> Please log in to view and manage leagues.
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  const handleCreateLeague = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!createFormData.name.trim()) {
      alert("League name is required");
      return;
    }

    try {
      await createLeague(
        createFormData.name.trim(),
        createFormData.description.trim() || undefined,
        createFormData.maxMembers
      );
      
      setCreateFormData({ name: "", description: "", maxMembers: 50 });
      setShowCreateForm(false);
      refetchUser();
    } catch (error) {
      console.error("Failed to create league:", error);
    }
  };

  const handleLeaveLeague = async (leagueId: string) => {
    if (!confirm("Are you sure you want to leave this league?")) {
      return;
    }

    try {
      await leaveLeague(leagueId);
      refetchUser();
    } catch (error) {
      console.error("Failed to leave league:", error);
    }
  };



  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-pastel-blue via-white to-pastel-pink p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              Leagues
            </h1>
            <p className="text-gray-700 text-lg">
              Join or create leagues to compete with friends and family!
            </p>
          </div>

          {/* Error Display */}
          {operationsError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
              <strong>Error:</strong> {operationsError}
            </div>
          )}

          {/* Create League Button */}
          <div className="text-center mb-8">
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              disabled={operationsLoading}
              className="bg-gradient-to-r from-pastel-blue to-pastel-pink text-gray-800 py-3 px-6 rounded-xl font-bold text-lg hover:from-pastel-blue-dark hover:to-pastel-pink-dark transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {showCreateForm ? "Cancel" : "Create New League"}
            </button>
          </div>

          {/* Create League Form */}
          {showCreateForm && (
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 mb-8 border border-white/30">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Create New League</h2>
              <form onSubmit={handleCreateLeague} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    League Name *
                  </label>
                  <input
                    type="text"
                    value={createFormData.name}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pastel-blue focus:border-transparent"
                    placeholder="Enter league name"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={createFormData.description}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pastel-blue focus:border-transparent"
                    placeholder="Enter league description (optional)"
                    rows={3}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Maximum Members
                    </label>
                    <input
                      type="number"
                      value={createFormData.maxMembers}
                      onChange={(e) => setCreateFormData(prev => ({ ...prev, maxMembers: parseInt(e.target.value) || 50 }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pastel-blue focus:border-transparent"
                      min="2"
                      max="100"
                    />
                  </div>
                  

                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={operationsLoading}
                    className="bg-gradient-to-r from-pastel-blue to-pastel-pink text-gray-800 py-2 px-4 rounded-lg font-medium hover:from-pastel-blue-dark hover:to-pastel-pink-dark transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {operationsLoading ? "Creating..." : "Create League"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* User's Leagues */}
          {userLeagues.length > 0 && (
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 mb-8 border border-white/30">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Your Leagues</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {userLeagues.map((league) => (
                  <div key={`user-league-${league.league_id}`} className="bg-gradient-to-r from-pastel-blue/20 to-pastel-pink/20 rounded-xl p-4 border border-pastel-blue/30">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-gray-800">{league.league_name}</h3>
                      {league.is_owner && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                          Owner
                        </span>
                      )}
                    </div>
                    
                    {league.league_description && (
                      <p className="text-gray-600 text-sm mb-3">{league.league_description}</p>
                    )}
                    
                    <div className="space-y-1 text-sm text-gray-600">
                      <div>Position: #{league.user_position || 'N/A'}</div>
                      <div>Points: {league.user_total_points}</div>
                      <div>Members: {league.active_members}/{league.member_count}</div>
                    </div>
                    
                    <div className="mt-3 space-y-2">
                      <a
                        href={`/leagues/${league.league_id}`}
                        className="block w-full bg-gradient-to-r from-pastel-blue to-pastel-pink text-gray-800 py-2 px-3 rounded-lg text-sm font-medium hover:from-pastel-blue-dark hover:to-pastel-pink-dark transition-all duration-200 text-center"
                      >
                        View Standings
                      </a>
                      <button
                        onClick={() => handleLeaveLeague(league.league_id)}
                        disabled={operationsLoading}
                        className="w-full bg-red-100 text-red-700 py-2 px-3 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Leave League
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}


        </div>
      </div>
    </AppLayout>
  );
}
