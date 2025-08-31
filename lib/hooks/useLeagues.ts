'use client'

import { useState, useEffect } from 'react'
import { 
  getUserLeagues,
  getLeagueLeaderboard,
  createLeague,
  UserLeague,
  LeagueLeaderboardEntry
} from '../leagues'

export function useUserLeagues() {
  const [leagues, setLeagues] = useState<UserLeague[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchLeagues() {
      try {
        setLoading(true)
        setError(null)
        const data = await getUserLeagues()
        setLeagues(data || [])
      } catch (err) {
        console.error('Error fetching user leagues:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch user leagues')
        setLeagues([])
      } finally {
        setLoading(false)
      }
    }

    fetchLeagues()
  }, [])

  const refetch = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getUserLeagues()
      setLeagues(data || [])
    } catch (err) {
      console.error('Error fetching user leagues:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch user leagues')
      setLeagues([])
    } finally {
      setLoading(false)
    }
  }

  return { leagues, loading, error, refetch }
}

export function useLeagueLeaderboard(leagueId: string | null) {
  const [leaderboard, setLeaderboard] = useState<LeagueLeaderboardEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!leagueId) {
      setLeaderboard([])
      setLoading(false)
      return
    }

    async function fetchLeaderboard() {
      try {
        setLoading(true)
        setError(null)
        if (leagueId) {
          const data = await getLeagueLeaderboard(leagueId)
          setLeaderboard(data)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch league leaderboard')
      } finally {
        setLoading(false)
      }
    }

    fetchLeaderboard()
  }, [leagueId])

  const refetch = async () => {
    if (!leagueId) return
    try {
      setLoading(true)
      setError(null)
      const data = await getLeagueLeaderboard(leagueId)
      setLeaderboard(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch league leaderboard')
    } finally {
      setLoading(false)
    }
  }

  return { leaderboard, loading, error, refetch }
}

export function useLeagueOperations() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createLeagueOperation = async (name: string, description?: string, maxMembers?: number) => {
    try {
      setLoading(true)
      setError(null)
      const result = await createLeague(name, description, maxMembers || 50)
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create league'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    error,
    createLeague: createLeagueOperation,
  }
}
