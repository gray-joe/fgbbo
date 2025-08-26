'use client'

import { useState, useEffect } from 'react'
import { 
  getUserPredictions, 
  getWeeklyPredictions, 
  saveWeeklyPredictions,
  deleteUserPredictions,
  PredictionWithParticipant,
  WeeklyPrediction
} from '../predictions'

export function useUserPredictions(userId: string | null) {
  const [predictions, setPredictions] = useState<PredictionWithParticipant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) {
      setPredictions([])
      setLoading(false)
      return
    }

    async function fetchPredictions() {
      if (!userId) return
      try {
        setLoading(true)
        setError(null)
        const data = await getUserPredictions(userId!)
        setPredictions(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch predictions')
      } finally {
        setLoading(false)
      }
    }

    fetchPredictions()
  }, [userId])

  const refetch = async () => {
    if (!userId) return
    try {
      setLoading(true)
      setError(null)
              const data = await getUserPredictions(userId!)
      setPredictions(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch predictions')
    } finally {
      setLoading(false)
    }
  }

  return { predictions, loading, error, refetch }
}

export function useWeeklyPredictions(userId: string | null, week: number) {
  const [predictions, setPredictions] = useState<PredictionWithParticipant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) {
      setPredictions([])
      setLoading(false)
      return
    }

    async function fetchWeeklyPredictions() {
      if (!userId) return
      try {
        setLoading(true)
        setError(null)
        const data = await getWeeklyPredictions(userId!, week)
        setPredictions(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch weekly predictions')
      } finally {
        setLoading(false)
      }
    }

    fetchWeeklyPredictions()
  }, [userId, week])

  const savePredictions = async (weeklyPredictions: WeeklyPrediction) => {
    if (!userId) throw new Error('User not authenticated')
    
    try {
      setLoading(true)
      setError(null)
              await saveWeeklyPredictions(userId!, week, weeklyPredictions)
      await refetch()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save predictions')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const refetch = async () => {
    if (!userId) return
    try {
      setLoading(true)
      setError(null)
              const data = await getWeeklyPredictions(userId!, week)
      setPredictions(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch weekly predictions')
    } finally {
      setLoading(false)
    }
  }

  return { 
    predictions, 
    loading, 
    error, 
    savePredictions, 
    refetch 
  }
}

export function usePredictionsManager(userId: string | null) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deleteAllPredictions = async () => {
    if (!userId) throw new Error('User not authenticated')
    
    try {
      setLoading(true)
      setError(null)
      await deleteUserPredictions(userId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete predictions')
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { loading, error, deleteAllPredictions }
}
