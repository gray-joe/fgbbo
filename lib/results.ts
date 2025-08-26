import { supabase } from './supabase'
import { Participant } from './participants'

export interface WeeklyResult {
  id: string
  week: number
  participant_id: string
  star_baker: boolean
  technical_winner: boolean
  eliminated: boolean
  handshake: boolean
  weekly_special: boolean
  created_at?: string
  updated_at?: string
}

export interface WeeklyResultWithParticipant extends WeeklyResult {
  participant: Participant
}

export interface WeeklySummary {
  week: number
  total_participants: number
  star_bakers: number
  technical_winners: number
  eliminated_count: number
  handshakes: number
  weekly_specials: number
}

// Get all results for a specific week
export async function getWeeklyResults(week: number): Promise<WeeklyResultWithParticipant[]> {
  try {
    const { data, error } = await supabase
      .from('results')
      .select(`
        *,
        participant:participants(*)
      `)
      .eq('week', week)
      .order('participant(name)')

    if (error) {
      console.error('Error fetching weekly results:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error in getWeeklyResults:', error)
    throw error
  }
}

// Get all results across all weeks
export async function getAllResults(): Promise<WeeklyResultWithParticipant[]> {
  try {
    const { data, error } = await supabase
      .from('results')
      .select(`
        *,
        participant:participants(*)
      `)
      .order('week', { ascending: true })
      .order('participant(name)')

    if (error) {
      console.error('Error fetching all results:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error in getAllResults:', error)
    throw error
  }
}

// Get weekly summaries
export async function getWeeklySummaries(): Promise<WeeklySummary[]> {
  try {
    const { data, error } = await supabase
      .from('weekly_summaries')
      .select('*')
      .order('week', { ascending: true })

    if (error) {
      console.error('Error fetching weekly summaries:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error in getWeeklySummaries:', error)
    throw error
  }
}

// Create or update results for a specific week and participant
export async function upsertWeeklyResult(
  week: number,
  participantId: string,
  results: Partial<Omit<WeeklyResult, 'id' | 'week' | 'participant_id' | 'created_at' | 'updated_at'>>
): Promise<WeeklyResult> {
  try {
    // Use Supabase's upsert with proper conflict resolution
    const { data, error } = await supabase
      .from('results')
      .upsert({
        week,
        participant_id: participantId,
        ...results
      }, {
        onConflict: 'week,participant_id' // Specify the conflict resolution columns
      })
      .select()
      .single()

    if (error) {
      console.error('Error upserting weekly result:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Error in upsertWeeklyResult:', error)
    throw error
  }
}

// Create results for all participants in a week
export async function createWeeklyResults(
  week: number,
  results: Array<{
    participantId: string
    star_baker?: boolean
    technical_winner?: boolean
    eliminated?: boolean
    handshake?: boolean
    weekly_special?: boolean
  }>
): Promise<WeeklyResult[]> {
  try {
    const resultsData = results.map(result => ({
      week,
      participant_id: result.participantId,
      star_baker: result.star_baker || false,
      technical_winner: result.technical_winner || false,
      eliminated: result.eliminated || false,
      handshake: result.handshake || false,
      weekly_special: result.weekly_special || false
    }))

    const { data, error } = await supabase
      .from('results')
      .upsert(resultsData, {
        onConflict: 'week,participant_id' // Specify the conflict resolution columns
      })
      .select()

    if (error) {
      console.error('Error creating weekly results:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error in createWeeklyResults:', error)
    throw error
  }
}

// Get results for a specific participant across all weeks
export async function getParticipantResults(participantId: string): Promise<WeeklyResult[]> {
  try {
    const { data, error } = await supabase
      .from('results')
      .select('*')
      .eq('participant_id', participantId)
      .order('week', { ascending: true })

    if (error) {
      console.error('Error fetching participant results:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error in getParticipantResults:', error)
    throw error
  }
}

// Delete all results for a specific week
export async function deleteWeeklyResults(week: number): Promise<void> {
  try {
    const { error } = await supabase
      .from('results')
      .delete()
      .eq('week', week)

    if (error) {
      console.error('Error deleting weekly results:', error)
      throw error
    }
  } catch (error) {
    console.error('Error in deleteWeeklyResults:', error)
    throw error
  }
}
