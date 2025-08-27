import { useState, useEffect } from 'react'
import { getParticipants, getActiveParticipants, Participant } from '../participants'

export function useParticipants() {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchParticipants() {
      try {
        setLoading(true)
        setError(null)
        const data = await getParticipants()
        setParticipants(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch participants')
      } finally {
        setLoading(false)
      }
    }

    fetchParticipants()
  }, [])

  return { participants, loading, error, refetch: () => {
    setLoading(true)
    getParticipants().then(setParticipants).catch(err => 
      setError(err instanceof Error ? err.message : 'Failed to fetch participants')
    ).finally(() => setLoading(false))
  }}
}

export function useActiveParticipants() {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchActiveParticipants() {
      try {
        setLoading(true)
        setError(null)
        const data = await getActiveParticipants()
        setParticipants(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch active participants')
      } finally {
        setLoading(false)
      }
    }

    fetchActiveParticipants()
  }, [])

  return { participants, loading, error, refetch: () => {
    setLoading(true)
    getActiveParticipants().then(setParticipants).catch(err => 
      setError(err instanceof Error ? err.message : 'Failed to fetch active participants')
    ).finally(() => setLoading(false))
  }}
}
