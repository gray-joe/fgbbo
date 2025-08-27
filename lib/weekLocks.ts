import { supabase } from './supabase'

export interface WeekLock {
  id: string
  week: number
  locked_by: string | null
  locked_at: string
  created_at?: string
  updated_at?: string
}

// Get all week locks
export async function getAllWeekLocks(): Promise<WeekLock[]> {
  try {
    const { data, error } = await supabase
      .from('week_locks')
      .select('*')
      .order('week', { ascending: true })

    if (error) {
      console.error('Error fetching week locks:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error in getAllWeekLocks:', error)
    throw error
  }
}

// Check if a specific week is locked
export async function isWeekLocked(week: number): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .rpc('is_week_locked', { check_week: week })

    if (error) {
      console.error('Error checking week lock:', error)
      throw error
    }

    return data || false
  } catch (error) {
    console.error('Error in isWeekLocked:', error)
    throw error
  }
}

// Lock a week (admin only)
export async function lockWeek(week: number): Promise<WeekLock> {
  try {
    const { data, error } = await supabase
      .from('week_locks')
      .upsert({ week })
      .select()
      .single()

    if (error) {
      console.error('Error locking week:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Error in lockWeek:', error)
    throw error
  }
}

// Unlock a week (admin only)
export async function unlockWeek(week: number): Promise<void> {
  try {
    const { error } = await supabase
      .from('week_locks')
      .delete()
      .eq('week', week)

    if (error) {
      console.error('Error unlocking week:', error)
      throw error
    }
  } catch (error) {
    console.error('Error in unlockWeek:', error)
    throw error
  }
}

// Get the next available week for predictions
export async function getNextAvailableWeek(): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('week_locks')
      .select('week')
      .order('week', { ascending: true })

    if (error) {
      console.error('Error fetching week locks:', error)
      throw error
    }

    const lockedWeeks = data?.map(lock => lock.week) || []
    
    // Find the first week that's not locked
    let nextWeek = 1
    while (lockedWeeks.includes(nextWeek)) {
      nextWeek++
    }

    return nextWeek
  } catch (error) {
    console.error('Error in getNextAvailableWeek:', error)
    throw error
  }
}
