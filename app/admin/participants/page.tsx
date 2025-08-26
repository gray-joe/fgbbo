"use client";

import { useState, useEffect } from "react";
import AppLayout from "../../components/AppLayout";
import { getParticipants, createParticipant, updateParticipant, eliminateParticipant, Participant } from "../../../lib/participants";

export default function AdminParticipantsPage() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newParticipantName, setNewParticipantName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  useEffect(() => {
    fetchParticipants();
  }, []);

  const fetchParticipants = async () => {
    try {
      setLoading(true);
      const data = await getParticipants();
      setParticipants(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch participants');
    } finally {
      setLoading(false);
    }
  };

  const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newParticipantName.trim()) return;

    try {
      await createParticipant({
        name: newParticipantName.trim(),
        eliminated: false
      });
      setNewParticipantName("");
      fetchParticipants();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add participant');
    }
  };

  const handleUpdateParticipant = async (id: string) => {
    if (!editingName.trim()) return;

    try {
      await updateParticipant(id, { name: editingName.trim() });
      setEditingId(null);
      setEditingName("");
      fetchParticipants();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update participant');
    }
  };

  const handleEliminateParticipant = async (id: string) => {
    try {
      await eliminateParticipant(id);
      fetchParticipants();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to eliminate participant');
    }
  };

  const startEditing = (participant: Participant) => {
    setEditingId(participant.id);
    setEditingName(participant.name);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName("");
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen p-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-pastel-blue mx-auto"></div>
              <p className="text-gray-700 text-lg mt-4">Loading participants...</p>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              Manage Participants
            </h1>
            <p className="text-gray-700 text-lg">
              Add, edit, and manage Great British Bake Off contestants
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
              <strong>Error:</strong> {error}
              <button
                onClick={() => setError(null)}
                className="float-right font-bold"
              >
                ×
              </button>
            </div>
          )}

          {/* Add New Participant */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 mb-8 border border-white/30">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Add New Participant</h2>
            <form onSubmit={handleAddParticipant} className="flex gap-4">
              <input
                type="text"
                value={newParticipantName}
                onChange={(e) => setNewParticipantName(e.target.value)}
                placeholder="Enter participant name"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pastel-blue focus:border-transparent transition-all bg-white text-gray-800"
                required
              />
              <button
                type="submit"
                className="px-6 py-3 bg-pastel-blue text-gray-800 rounded-lg font-medium hover:bg-pastel-blue-dark transition-colors"
              >
                Add Participant
              </button>
            </form>
          </div>

          {/* Participants List */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/30">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Current Participants</h2>
            
            {participants.length === 0 ? (
              <p className="text-gray-600 text-center py-8">No participants found. Add some contestants to get started!</p>
            ) : (
              <div className="space-y-4">
                {participants.map((participant) => (
                  <div
                    key={participant.id}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      participant.eliminated
                        ? 'bg-gray-100 border-gray-300'
                        : 'bg-gradient-to-r from-pastel-blue/20 to-pastel-pink/20 border-pastel-blue/30'
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      {editingId === participant.id ? (
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pastel-blue focus:border-transparent transition-all bg-white text-gray-800"
                        />
                      ) : (
                        <span className={`text-lg font-medium ${participant.eliminated ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
                          {participant.name}
                        </span>
                      )}
                      {participant.eliminated && (
                        <span className="px-2 py-1 bg-red-100 text-red-800 text-sm rounded-full">
                          Eliminated
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {editingId === participant.id ? (
                        <>
                          <button
                            onClick={() => handleUpdateParticipant(participant.id)}
                            className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 transition-colors"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600 transition-colors"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEditing(participant)}
                            className="px-3 py-1 bg-pastel-blue text-gray-800 rounded text-sm hover:bg-pastel-blue-dark transition-colors"
                          >
                            Edit
                          </button>
                          {!participant.eliminated && (
                            <button
                              onClick={() => handleEliminateParticipant(participant.id)}
                              className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition-colors"
                            >
                              Eliminate
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
