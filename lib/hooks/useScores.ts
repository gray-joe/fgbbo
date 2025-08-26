'use client'

import { useState, useEffect } from 'react'
import { 
  getUserScores, 
  getWeekScores, 
  getLeaderboard,
  calculateWeekScores,
  getUserTotalScore,
  getUserWeeklyBreakdown,
  UserScore,
  UserScoreWithDetails,
  getUserLeaguePosition
} from '../scores'

export function useUserScores(userId: string | null) {
  const [scores, setScores] = useState<UserScore[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) {
      setScores([])
      setLoading(false)
      return
    }

    async function fetchScores() {
      try {
        setLoading(true)
        setError(null)
        if (userId) {
          const data = await getUserScores(userId)
          setScores(data)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch scores')
      } finally {
        setLoading(false)
      }
    }

    fetchScores()
  }, [userId])

  const refetch = async () => {
    if (!userId) return
    try {
      setLoading(true)
      setError(null)
      const data = await getUserScores(userId)
      setScores(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch scores')
    } finally {
      setLoading(false)
    }
  }

  return { scores, loading, error, refetch }
}

export function useWeekScores(week: number) {
  const [scores, setScores] = useState<UserScoreWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchWeekScores() {
      try {
        setLoading(true)
        setError(null)
        const data = await getWeekScores(week)
        setScores(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch week scores')
      } finally {
        setLoading(false)
      }
    }

    fetchWeekScores()
  }, [week])

  const refetch = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getWeekScores(week)
      setScores(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch week scores')
    } finally {
      setLoading(false)
    }
  }

  return { scores, loading, error, refetch }
}

export function useLeaderboard() {
  const [leaderboard, setLeaderboard] = useState<UserScoreWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        setLoading(true)
        setError(null)
        const data = await getLeaderboard()
        setLeaderboard(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch leaderboard')
      } finally {
        setLoading(false)
      }
    }

    fetchLeaderboard()
  }, [])

  const refetch = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getLeaderboard()
      setLeaderboard(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch leaderboard')
    } finally {
      setLoading(false)
    }
  }

  return { leaderboard, loading, error, refetch }
}

export function useScoreCalculation() {
  const [calculating, setCalculating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const calculateScores = async (week: number) => {
    try {
      setCalculating(true)
      setError(null)
      await calculateWeekScores(week)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate scores')
      throw err
    } finally {
      setCalculating(false)
    }
  }

  return { calculating, error, calculateScores }
}

export function useUserTotalScore(userId: string | null) {
  const [totalScore, setTotalScore] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) {
      setTotalScore(0)
      setLoading(false)
      return
    }

    async function fetchTotalScore() {
      try {
        setLoading(true)
        setError(null)
        if (userId) {
          const score = await getUserTotalScore(userId)
          setTotalScore(score)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch total score')
      } finally {
        setLoading(false)
      }
    }

    fetchTotalScore()
  }, [userId])

  return { totalScore, loading, error }
}

export function useUserWeeklyBreakdown(userId: string | null) {
  const [breakdown, setBreakdown] = useState<{
    week: number
    total_points: number
    breakdown: {
      star_baker: number
      technical_winner: number
      eliminated: number
      handshake: number
      weekly_special: number
      bonus: number
    }
  }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) {
      setBreakdown([])
      setLoading(false)
      return
    }

    async function fetchBreakdown() {
      try {
        setLoading(true)
        setError(null)
        if (userId) {
          const data = await getUserWeeklyBreakdown(userId)
          setBreakdown(data)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch weekly breakdown')
      } finally {
        setLoading(false)
      }
    }

    fetchBreakdown()
  }, [userId])

  return { breakdown, loading, error }
}

export function useUserLeaguePosition(userId: string | null) {
  const [position, setPosition] = useState<{ position: number; totalPlayers: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setPosition(null);
      setLoading(false);
      return;
    }

    async function fetchPosition() {
      try {
        setLoading(true);
        setError(null);
        if (userId) {
          const data = await getUserLeaguePosition(userId);
          setPosition(data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch league position');
      } finally {
        setLoading(false);
      }
    }

    fetchPosition();
  }, [userId]);

  return { position, loading, error };
}
