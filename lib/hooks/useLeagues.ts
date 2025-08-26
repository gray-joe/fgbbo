'use client'

import { useState, useEffect } from 'react'
import { 
  getUserLeagues,
  getLeague,
  getLeagueLeaderboard,
  getLeagueMembers,
  createLeague,
  joinLeague,
  leaveLeague,
  updateLeague,
  deleteLeague,
  removeLeagueMember,
  isLeagueOwner,
  isLeagueMember,
  UserLeague,
  LeagueSummary,
  LeagueLeaderboardEntry,
  LeagueMemberWithDetails
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
        // Don't set error for "no leagues" case, just return empty array
        if (err instanceof Error && err.message.includes('structure of query')) {
          setLeagues([])
        } else {
          setError(err instanceof Error ? err.message : 'Failed to fetch user leagues')
        }
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
      // Don't set error for "no leagues" case, just return empty array
      if (err instanceof Error && err.message.includes('structure of query')) {
        setLeagues([])
      } else {
        setError(err instanceof Error ? err.message : 'Failed to fetch user leagues')
      }
    } finally {
      setLoading(false)
    }
  }

  return { leagues, loading, error, refetch }
}

export function useLeague(leagueId: string | null) {
  const [league, setLeague] = useState<LeagueSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!leagueId) {
      setLeague(null)
      setLoading(false)
      return
    }

    async function fetchLeague() {
      try {
        setLoading(true)
        setError(null)
        if (leagueId) {
          const data = await getLeague(leagueId)
          setLeague(data)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch league')
      } finally {
        setLoading(false)
      }
    }

    fetchLeague()
  }, [leagueId])

  const refetch = async () => {
    if (!leagueId) return
    try {
      setLoading(true)
      setError(null)
      const data = await getLeague(leagueId)
      setLeague(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch league')
    } finally {
      setLoading(false)
    }
  }

  return { league, loading, error, refetch }
}

export function useLeagueLeaderboard(leagueId: string | null) {
  const [leaderboard, setLeaderboard] = useState<LeagueLeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
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

export function useLeagueMembers(leagueId: string | null) {
  const [members, setMembers] = useState<LeagueMemberWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!leagueId) {
      setMembers([])
      setLoading(false)
      return
    }

    async function fetchMembers() {
      try {
        setLoading(true)
        setError(null)
        if (leagueId) {
          const data = await getLeagueMembers(leagueId)
          setMembers(data)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch league members')
      } finally {
        setLoading(false)
      }
    }

    fetchMembers()
  }, [leagueId])

  const refetch = async () => {
    if (!leagueId) return
    try {
      setLoading(true)
      setError(null)
      const data = await getLeagueMembers(leagueId)
      setMembers(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch league members')
    } finally {
      setLoading(false)
    }
  }

  return { members, loading, error, refetch }
}

export function useLeagueOperations() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createLeagueOperation = async (
    name: string,
    description?: string,
    maxMembers: number = 50
  ) => {
    try {
      setLoading(true)
      setError(null)
      const result = await createLeague(name, description, maxMembers)
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create league')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const joinLeagueOperation = async (leagueId: string) => {
    try {
      setLoading(true)
      setError(null)
      const result = await joinLeague(leagueId)
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join league')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const leaveLeagueOperation = async (leagueId: string) => {
    try {
      setLoading(true)
      setError(null)
      await leaveLeague(leagueId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to leave league')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const updateLeagueOperation = async (
    leagueId: string,
    updates: Partial<{ name: string; description?: string; max_members: number }>
  ) => {
    try {
      setLoading(true)
      setError(null)
      const result = await updateLeague(leagueId, updates)
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update league')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const deleteLeagueOperation = async (leagueId: string) => {
    try {
      setLoading(true)
      setError(null)
      await deleteLeague(leagueId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete league')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const removeMemberOperation = async (leagueId: string, userId: string) => {
    try {
      setLoading(true)
      setError(null)
      await removeLeagueMember(leagueId, userId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member')
      throw err
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    error,
    createLeague: createLeagueOperation,
    joinLeague: joinLeagueOperation,
    leaveLeague: leaveLeagueOperation,
    updateLeague: updateLeagueOperation,
    deleteLeague: deleteLeagueOperation,
    removeMember: removeMemberOperation
  }
}

export function useLeaguePermissions(leagueId: string | null) {
  const [isOwner, setIsOwner] = useState(false)
  const [isMember, setIsMember] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!leagueId) {
      setIsOwner(false)
      setIsMember(false)
      setLoading(false)
      return
    }

    async function checkPermissions() {
      try {
        setLoading(true)
        setError(null)
        if (leagueId) {
          const [ownerResult, memberResult] = await Promise.all([
            isLeagueOwner(leagueId),
            isLeagueMember(leagueId)
          ])
          setIsOwner(ownerResult)
          setIsMember(memberResult)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to check permissions')
      } finally {
        setLoading(false)
      }
    }

    checkPermissions()
  }, [leagueId])

  return { isOwner, isMember, loading, error }
}
