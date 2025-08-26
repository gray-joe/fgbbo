"use client";

import AppLayout from "../components/AppLayout";
import { useParticipants } from "../../lib/hooks/useParticipants";
import { useAllResults } from "../../lib/hooks/useResults";
import { Participant } from "../../lib/participants";

export default function ParticipantsPage() {
  const { participants, loading: participantsLoading, error: participantsError } = useParticipants();
  const { results: allResults, loading: resultsLoading, error: resultsError } = useAllResults();

  // Calculate achievements for each participant
  const getParticipantAchievements = (participantId: string) => {
    const participantResults = allResults.filter(result => result.participant_id === participantId);
    
    return {
      star_baker: participantResults.filter(r => r.star_baker).length,
      technical_winner: participantResults.filter(r => r.technical_winner).length,
      handshake: participantResults.filter(r => r.handshake).length,
      weekly_special: participantResults.filter(r => r.weekly_special).length,
      eliminated_week: participantResults.find(r => r.eliminated)?.week || null,
      total_weeks: new Set(participantResults.map(r => r.week)).size
    };
  };

  // Determine active vs eliminated participants based on results
  const getParticipantStatus = (participantId: string) => {
    const achievements = getParticipantAchievements(participantId);
    return {
      isEliminated: achievements.eliminated_week !== null,
      eliminatedWeek: achievements.eliminated_week,
      achievements
    };
  };

  // Show loading state
  if (participantsLoading || resultsLoading) {
    return (
      <AppLayout>
        <div className="min-h-screen p-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-400 mx-auto"></div>
              <p className="text-gray-700 text-lg mt-4">Loading participants...</p>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Show error state
  if (participantsError || resultsError) {
    return (
      <AppLayout>
        <div className="min-h-screen p-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center">
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                <strong>Error:</strong> {participantsError || resultsError}
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Separate active and eliminated participants based on results data
  const activeParticipants = participants.filter(p => !getParticipantStatus(p.id).isEliminated);
  const eliminatedParticipants = participants.filter(p => getParticipantStatus(p.id).isEliminated);

  return (
    <AppLayout>
      <div className="min-h-screen p-8">
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
            {activeParticipants.length === 0 ? (
              <div className="col-span-full text-center py-8">
                <p className="text-gray-600 text-lg">No active participants found.</p>
              </div>
            ) : (
              activeParticipants.map((participant) => {
                const achievements = getParticipantAchievements(participant.id);
                
                return (
                  <div key={participant.id} className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/30">
                    <div className="text-center mb-4">
                      <div className="w-20 h-20 bg-gradient-to-br from-blue-200 to-blue-300 rounded-full mx-auto mb-3 flex items-center justify-center">
                        <span className="text-2xl">👩‍🍳</span>
                      </div>
                      <h3 className="text-xl font-bold text-gray-800">{participant.name}</h3>
                      <p className="text-gray-600 text-sm">Still in the competition</p>
                      <p className="text-gray-500 text-xs mt-1">{achievements.total_weeks} week{achievements.total_weeks !== 1 ? 's' : ''} active</p>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                        <span className="text-gray-700 text-sm flex items-center">
                          ⭐ Star Baker
                        </span>
                        <span className="font-bold text-blue-600 text-lg">{achievements.star_baker}</span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-purple-50 rounded-lg">
                        <span className="text-gray-700 text-sm flex items-center">
                          🏆 Technical Winner
                        </span>
                        <span className="font-bold text-purple-600 text-lg">{achievements.technical_winner}</span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-yellow-50 rounded-lg">
                        <span className="text-gray-700 text-sm flex items-center">
                          🤝 Handshake
                        </span>
                        <span className="font-bold text-yellow-600 text-lg">{achievements.handshake}</span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                        <span className="text-gray-700 text-sm flex items-center">
                          ✨ Weekly Special
                        </span>
                        <span className="font-bold text-green-600 text-lg">{achievements.weekly_special}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Eliminated Participants */}
          {eliminatedParticipants.length > 0 && (
            <div className="mt-8 bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/30">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Eliminated This Season</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                 {eliminatedParticipants.map((participant) => {
                   const status = getParticipantStatus(participant.id);
                   
                   return (
                     <div key={participant.id} className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                       <div className="w-16 h-16 bg-red-100 rounded-full mx-auto mb-2 flex items-center justify-center">
                         <span className="text-xl">👨‍🍳</span>
                       </div>
                       <h3 className="font-bold text-gray-800">{participant.name}</h3>
                       <p className="text-red-600 text-sm mb-2">
                         Eliminated Week {status.eliminatedWeek}
                       </p>
                                             <div className="text-xs text-gray-600 space-y-1">
                         {status.achievements.star_baker > 0 && (
                           <div>⭐ {status.achievements.star_baker} Star Baker{status.achievements.star_baker !== 1 ? 's' : ''}</div>
                         )}
                         {status.achievements.technical_winner > 0 && (
                           <div>🏆 {status.achievements.technical_winner} Technical Win{status.achievements.technical_winner !== 1 ? 's' : ''}</div>
                         )}
                         {status.achievements.handshake > 0 && (
                           <div>🤝 {status.achievements.handshake} Handshake{status.achievements.handshake !== 1 ? 's' : ''}</div>
                         )}
                         {status.achievements.weekly_special > 0 && (
                           <div>✨ {status.achievements.weekly_special} Weekly Special{status.achievements.weekly_special !== 1 ? 's' : ''}</div>
                         )}
                         {status.achievements.star_baker === 0 && status.achievements.technical_winner === 0 && 
                          status.achievements.handshake === 0 && status.achievements.weekly_special === 0 && (
                           <div className="text-gray-500">No awards won</div>
                         )}
                       </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
