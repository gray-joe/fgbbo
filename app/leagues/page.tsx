"use client";

import { useState } from "react";
import AppLayout from "../components/AppLayout";
import { useAuth } from "../../lib/hooks/useAuth";
import { useUserLeagues } from "../../lib/hooks/useLeagues";
import { useLeagueOperations } from "../../lib/hooks/useLeagues";
import { UserLeague, joinLeagueByInviteCode } from "../../lib/leagues";

export default function LeaguesPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { leagues: userLeagues, loading: userLoading, refetch: refetchUser } = useUserLeagues();
  const { loading: operationsLoading, error: operationsError, createLeague } = useLeagueOperations();
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    name: "",
    description: "",
    maxMembers: 50
  });
  const [joinFormData, setJoinFormData] = useState({
    inviteCode: ""
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
      const newLeague = await createLeague(
        createFormData.name.trim(),
        createFormData.description.trim() || undefined,
        createFormData.maxMembers
      );
      
      setCreateFormData({ name: "", description: "", maxMembers: 50 });
      setShowCreateForm(false);
      refetchUser();
      
      // Show success message with invite code
      alert(`League "${newLeague.name}" created successfully!\n\nInvite Code: ${newLeague.invite_code}\n\nShare this code with friends to let them join your league!`);
    } catch (error) {
      console.error("Failed to create league:", error);
      alert("Failed to create league. Please try again.");
    }
  };

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!joinFormData.inviteCode.trim()) {
      alert("Invite code is required");
      return;
    }

    try {
      const { success, message } = await joinLeagueByInviteCode(joinFormData.inviteCode.trim());
      if (success) {
        setJoinFormData({ inviteCode: "" });
        setShowJoinForm(false);
        refetchUser();
        alert("Successfully joined league!");
      } else {
        alert(message);
      }
    } catch (error) {
      console.error("Failed to join league:", error);
      alert("Failed to join league. Please try again.");
    }
  };

  const getOrdinalSuffix = (num: number) => {
    if (num > 3 && num < 21) return 'th';
    switch (num % 10) {
      case 1:  return "st";
      case 2:  return "nd";
      case 3:  return "rd";
      default: return "th";
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pastel-blue focus:border-transparent text-gray-800 placeholder-gray-500"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pastel-blue focus:border-transparent text-gray-800 placeholder-gray-500"
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pastel-blue focus:border-transparent text-gray-800 placeholder-gray-500"
                      min="2"
                      max="100"
                    />
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start space-x-2">
                      <span className="text-blue-600 text-lg">ℹ️</span>
                      <div className="text-sm text-blue-800">
                        <p className="font-medium mb-1">Invite Code</p>
                        <p>A unique invite code (e.g., GBBO12345678) will be automatically generated when you create the league. Share this code with friends to let them join!</p>
                      </div>
                    </div>
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
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/30">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Your Leagues</h2>
            
            {userLeagues.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">You haven't joined any leagues yet.</p>
                <p className="text-gray-500 text-sm mt-2">Create a new league or join one using an invite code!</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {userLeagues.map((league) => (
                  <div 
                    key={`user-league-${league.league_id}`}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800">{league.league_name}</h3>
                        {league.league_description && (
                          <p className="text-gray-600 text-sm mt-1">{league.league_description}</p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        {league.is_owner && (
                          <span className="text-xs bg-pastel-blue text-white px-2 py-1 rounded-full">
                            Owner
                          </span>
                        )}
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                          {league.invite_code}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-6 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Position:</span>
                          <span className={`ml-1 font-bold ${
                            league.user_position === 1 ? 'text-yellow-600' :
                            league.user_position === 2 ? 'text-gray-500' :
                            league.user_position === 3 ? 'text-amber-600' :
                            'text-gray-800'
                          }`}>
                            {league.user_position > 0 ? `${league.user_position}${getOrdinalSuffix(league.user_position)}` : 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">Points:</span>
                          <span className="ml-1 font-bold text-gray-800">
                            {league.user_total_points}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <a
                          href={`/leagues/${league.league_id}`}
                          className="bg-gradient-to-r from-pastel-blue to-pastel-pink text-gray-800 py-2 px-4 rounded-lg font-medium hover:from-pastel-blue-dark hover:to-pastel-pink-dark transition-all duration-200"
                        >
                          View Standings
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Join League by Code */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 mb-8 border border-white/30">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-800">Join League</h2>
              <button
                onClick={() => setShowJoinForm(!showJoinForm)}
                disabled={operationsLoading}
                className="bg-gradient-to-r from-pastel-blue to-pastel-pink text-gray-800 py-2 px-4 rounded-lg font-medium hover:from-pastel-blue-dark hover:to-pastel-pink-dark transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {showJoinForm ? "Cancel" : "Join by Code"}
              </button>
            </div>
            
            {showJoinForm && (
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <form onSubmit={handleJoinByCode} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Invite Code *
                    </label>
                    <input
                      type="text"
                      value={joinFormData.inviteCode}
                      onChange={(e) => setJoinFormData(prev => ({ ...prev, inviteCode: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pastel-blue focus:border-transparent text-gray-800 placeholder-gray-500"
                      placeholder="Enter league invite code (e.g., GBBO1234)"
                      required
                    />
                    <p className="text-sm text-gray-600 mt-1">
                      Ask the league owner for their invite code
                    </p>
                  </div>
                  
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={operationsLoading}
                      className="bg-gradient-to-r from-pastel-blue to-pastel-pink text-gray-800 py-2 px-4 rounded-lg font-medium hover:from-pastel-blue-dark hover:to-pastel-pink-dark transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {operationsLoading ? "Joining..." : "Join League"}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
