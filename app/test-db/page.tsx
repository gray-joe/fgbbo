"use client";

import { useState, useEffect } from "react";
import AppLayout from "../components/AppLayout";
import { supabase } from "../../lib/supabase";
import { getParticipants } from "../../lib/participants";

export default function TestDBPage() {
  const [connectionStatus, setConnectionStatus] = useState<string>("Testing...");
  const [participants, setParticipants] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    testConnection();
  }, []);

  const testConnection = async () => {
    try {
      setConnectionStatus("Testing connection...");
      
      // Test basic connection
      const { data, error } = await supabase
        .from('participants')
        .select('count')
        .limit(1);

      if (error) {
        throw error;
      }

      setConnectionStatus("✅ Connected successfully!");
      
      // Fetch participants
      const participantsData = await getParticipants();
      setParticipants(participantsData);
      
    } catch (err) {
      setConnectionStatus("❌ Connection failed");
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  return (
    <AppLayout>
      <div className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              Database Connection Test
            </h1>
            <p className="text-gray-700 text-lg">
              Testing Supabase integration
            </p>
          </div>

          {/* Connection Status */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 mb-8 border border-white/30">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Connection Status</h2>
            <div className="flex items-center space-x-3">
              <span className="text-lg">{connectionStatus}</span>
              <button
                onClick={testConnection}
                className="px-4 py-2 bg-pastel-blue text-gray-800 rounded-lg font-medium hover:bg-pastel-blue-dark transition-colors"
              >
                Test Again
              </button>
            </div>
            
            {error && (
              <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                <strong>Error:</strong> {error}
              </div>
            )}
          </div>

          {/* Environment Variables */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 mb-8 border border-white/30">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Environment Variables</h2>
            <div className="space-y-2">
              <div>
                <strong>SUPABASE_URL:</strong> 
                <span className="ml-2 text-gray-600">
                  {process.env.NEXT_PUBLIC_SUPABASE_URL ? 
                    `${process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 20)}...` : 
                    'Not set'
                  }
                </span>
              </div>
              <div>
                <strong>SUPABASE_ANON_KEY:</strong> 
                <span className="ml-2 text-gray-600">
                  {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 
                    `${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 20)}...` : 
                    'Not set'
                  }
                </span>
              </div>
            </div>
          </div>

          {/* Participants Data */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/30">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Participants Data</h2>
            
            {participants.length === 0 ? (
              <p className="text-gray-600">No participants found in database.</p>
            ) : (
              <div className="space-y-2">
                <p className="text-gray-600 mb-4">Found {participants.length} participants:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {participants.map((participant) => (
                    <div
                      key={participant.id}
                      className={`p-4 rounded-lg border ${
                        participant.eliminated
                          ? 'bg-gray-100 border-gray-300'
                          : 'bg-gradient-to-r from-pastel-blue/20 to-pastel-pink/20 border-pastel-blue/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`font-medium ${participant.eliminated ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
                          {participant.name}
                        </span>
                        {participant.eliminated && (
                          <span className="px-2 py-1 bg-red-100 text-red-800 text-sm rounded-full">
                            Eliminated
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        ID: {participant.id}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
