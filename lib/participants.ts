import { supabase } from './supabase'

export interface Participant {
  id: string
  name: string
  eliminated: boolean
  created_at?: string
  updated_at?: string
}

export async function getParticipants(): Promise<Participant[]> {
  try {
    const { data, error } = await supabase
      .from('participants')
      .select('*')
      .order('name')

    if (error) {
      console.error('Error fetching participants:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error in getParticipants:', error)
    throw error
  }
}

export async function getActiveParticipants(): Promise<Participant[]> {
  try {
    const { data, error } = await supabase
      .from('participants')
      .select('*')
      .eq('eliminated', false)
      .order('name')

    if (error) {
      console.error('Error fetching active participants:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error in getActiveParticipants:', error)
    throw error
  }
}

export async function createParticipant(participant: Omit<Participant, 'id' | 'created_at' | 'updated_at'>): Promise<Participant> {
  try {
    const { data, error } = await supabase
      .from('participants')
      .insert([participant])
      .select()
      .single()

    if (error) {
      console.error('Error creating participant:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Error in createParticipant:', error)
    throw error
  }
}

export async function updateParticipant(id: string, updates: Partial<Participant>): Promise<Participant> {
  try {
    const { data, error } = await supabase
      .from('participants')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating participant:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Error in updateParticipant:', error)
    throw error
  }
}

export async function eliminateParticipant(id: string): Promise<Participant> {
  return updateParticipant(id, { eliminated: true })
}
