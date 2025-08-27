'use client'

import { useState, useEffect } from 'react'
import { 
  getAllWeekLocks, 
  isWeekLocked, 
  lockWeek, 
  unlockWeek,
  getNextAvailableWeek,
  WeekLock
} from '../weekLocks'

export function useWeekLocks() {
  const [weekLocks, setWeekLocks] = useState<WeekLock[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchWeekLocks() {
      try {
        setLoading(true)
        setError(null)
        const data = await getAllWeekLocks()
        setWeekLocks(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch week locks')
      } finally {
        setLoading(false)
      }
    }

    fetchWeekLocks()
  }, [])

  const lockWeekHandler = async (week: number) => {
    try {
      setLoading(true)
      setError(null)
      const newLock = await lockWeek(week)
      setWeekLocks(prev => [...prev.filter(lock => lock.week !== week), newLock])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to lock week')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const unlockWeekHandler = async (week: number) => {
    try {
      setLoading(true)
      setError(null)
      await unlockWeek(week)
      setWeekLocks(prev => prev.filter(lock => lock.week !== week))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unlock week')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const refetch = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getAllWeekLocks()
      setWeekLocks(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch week locks')
    } finally {
      setLoading(false)
    }
  }

  return { 
    weekLocks, 
    loading, 
    error, 
    lockWeek: lockWeekHandler, 
    unlockWeek: unlockWeekHandler,
    refetch 
  }
}

export function useWeekLockStatus(week: number) {
  const [isLocked, setIsLocked] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function checkWeekLock() {
      try {
        setLoading(true)
        setError(null)
        const locked = await isWeekLocked(week)
        setIsLocked(locked)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to check week lock status')
      } finally {
        setLoading(false)
      }
    }

    checkWeekLock()
  }, [week])

  return { isLocked, loading, error }
}

export function useNextAvailableWeek() {
  const [nextWeek, setNextWeek] = useState<number>(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchNextWeek() {
      try {
        setLoading(true)
        setError(null)
        const week = await getNextAvailableWeek()
        setNextWeek(week)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to get next available week')
      } finally {
        setLoading(false)
      }
    }

    fetchNextWeek()
  }, [])

  return { nextWeek, loading, error }
}
