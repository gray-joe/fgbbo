"use client";

import { useParams, redirect } from "next/navigation";
import AppLayout from "../../../components/AppLayout";
import { useAuth } from "../../../../lib/hooks/useAuth";
import { joinLeagueByInviteCode } from "../../../../lib/leagues";

export default function LeaguesPage() {
  const params = useParams();
  const joinCode = params.code as string;

  const { user, isAuthenticated, loading: authLoading } = useAuth();

  // Show loading state for initial auth loading
  if (authLoading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gradient-to-br from-pastel-blue via-white to-pastel-pink p-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-400 mx-auto"></div>
              <p className="text-gray-700 text-lg mt-4">Loading...</p>
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

  const joinByCode = async (code: string) => {
    try {
      const { success, message } = await joinLeagueByInviteCode(code.trim());
      if (success) {
        alert("Successfully joined league!");
      } else {
        alert(message);
      }
    } catch (error) {
      console.log("Failed to join league:", error);
      alert("Failed to join league. Please try again.");
    }
    redirect("/leagues");
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-pastel-blue via-white to-pastel-pink p-4 sm:p-6 md:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 mb-2">
              Leagues
            </h1>
            <p className="text-sm sm:text-base text-gray-700">
              Join league: {joinCode}
            </p>
          </div>

          {/* Join League Button */}
          <div className="text-center mb-6 sm:mb-8">
            <button
              onClick={() => joinByCode(joinCode)}
              className="w-full sm:w-auto bg-gradient-to-r from-pastel-blue to-pastel-pink text-gray-800 py-3 px-4 sm:px-6 rounded-xl font-bold text-base sm:text-lg hover:from-pastel-blue-dark hover:to-pastel-pink-dark transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Join
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
