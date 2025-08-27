import { useState, useEffect } from 'react'
import { 
  getWeeklyResults, 
  getAllResults, 
  getWeeklySummaries, 
  WeeklyResultWithParticipant, 
  WeeklySummary 
} from '../results'

export function useWeeklyResults(week: number) {
  const [results, setResults] = useState<WeeklyResultWithParticipant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchWeeklyResults() {
      try {
        setLoading(true)
        setError(null)
        const data = await getWeeklyResults(week)
        setResults(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch weekly results')
      } finally {
        setLoading(false)
      }
    }

    fetchWeeklyResults()
  }, [week])

  return { 
    results, 
    loading, 
    error, 
    refetch: () => {
      setLoading(true)
      getWeeklyResults(week).then(setResults).catch(err => 
        setError(err instanceof Error ? err.message : 'Failed to fetch weekly results')
      ).finally(() => setLoading(false))
    }
  }
}

export function useAllResults() {
  const [results, setResults] = useState<WeeklyResultWithParticipant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAllResults() {
      try {
        setLoading(true)
        setError(null)
        const data = await getAllResults()
        setResults(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch all results')
      } finally {
        setLoading(false)
      }
    }

    fetchAllResults()
  }, [])

  return { 
    results, 
    loading, 
    error, 
    refetch: () => {
      setLoading(true)
      getAllResults().then(setResults).catch(err => 
        setError(err instanceof Error ? err.message : 'Failed to fetch all results')
      ).finally(() => setLoading(false))
    }
  }
}

export function useWeeklySummaries() {
  const [summaries, setSummaries] = useState<WeeklySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchWeeklySummaries() {
      try {
        setLoading(true)
        setError(null)
        const data = await getWeeklySummaries()
        setSummaries(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch weekly summaries')
      } finally {
        setLoading(false)
      }
    }

    fetchWeeklySummaries()
  }, [])

  return { 
    summaries, 
    loading, 
    error, 
    refetch: () => {
      setLoading(true)
      getWeeklySummaries().then(setSummaries).catch(err => 
        setError(err instanceof Error ? err.message : 'Failed to fetch weekly summaries')
      ).finally(() => setLoading(false))
    }
  }
}
