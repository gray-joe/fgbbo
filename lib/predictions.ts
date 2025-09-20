import { supabase } from './supabase'

export interface Prediction {
  id: string
  user_id: string
  week: number
  participant_id: string
  prediction_type: 'star_baker' | 'technical_winner' | 'eliminated' | 'handshake' | 'weekly_special' | 'winner' | 'finalist1' | 'finalist2' | 'finalist3'
  created_at?: string
  updated_at?: string
}

export interface PredictionWithParticipant extends Prediction {
  participant_name: string
  participant_eliminated: boolean
}

export interface WeeklyPrediction {
  week: number
  star_baker?: string
  technical_winner?: string
  eliminated?: string
  handshake?: string
  weekly_special?: string
  winner?: string
  finalist1?: string
  finalist2?: string
  finalist3?: string
}

// Get all predictions for a user
export async function getUserPredictions(userId: string): Promise<PredictionWithParticipant[]> {
  try {
    const { data, error } = await supabase
      .from('predictions_with_participants')
      .select('*')
      .eq('user_id', userId)
      .order('week', { ascending: true })
      .order('prediction_type')

    if (error) {
      console.error('Error fetching user predictions:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error in getUserPredictions:', error)
    throw error
  }
}

// Get predictions for a specific week and user
export async function getWeeklyPredictions(userId: string, week: number): Promise<PredictionWithParticipant[]> {
  try {
    const { data, error } = await supabase
      .from('predictions_with_participants')
      .select('*')
      .eq('user_id', userId)
      .eq('week', week)

    if (error) {
      console.error('Error fetching weekly predictions:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error in getWeeklyPredictions:', error)
    throw error
  }
}

// Save or update predictions for a week
export async function saveWeeklyPredictions(
  userId: string, 
  week: number, 
  predictions: WeeklyPrediction
): Promise<void> {
  try {
    // First, delete existing predictions for this week and user
    const { error: deleteError } = await supabase
      .from('predictions')
      .delete()
      .eq('user_id', userId)
      .eq('week', week)

    if (deleteError) {
      console.error('Error deleting existing predictions:', deleteError)
      throw deleteError
    }

    // Prepare new predictions to insert
    const predictionsToInsert: Omit<Prediction, 'id' | 'created_at' | 'updated_at'>[] = []

    if (predictions.star_baker) {
      predictionsToInsert.push({
        user_id: userId,
        week,
        participant_id: predictions.star_baker,
        prediction_type: 'star_baker'
      })
    }

    if (predictions.technical_winner) {
      predictionsToInsert.push({
        user_id: userId,
        week,
        participant_id: predictions.technical_winner,
        prediction_type: 'technical_winner'
      })
    }

    if (predictions.eliminated) {
      predictionsToInsert.push({
        user_id: userId,
        week,
        participant_id: predictions.eliminated,
        prediction_type: 'eliminated'
      })
    }

    if (predictions.handshake) {
      predictionsToInsert.push({
        user_id: userId,
        week,
        participant_id: predictions.handshake,
        prediction_type: 'handshake'
      })
    }

    if (predictions.weekly_special) {
      predictionsToInsert.push({
        user_id: userId,
        week,
        participant_id: predictions.weekly_special,
        prediction_type: 'weekly_special'
      })
    }

    if (predictions.winner) {
      predictionsToInsert.push({
        user_id: userId,
        week,
        participant_id: predictions.winner,
        prediction_type: 'winner'
      })
    }

    if (predictions.finalist1) {
      predictionsToInsert.push({
        user_id: userId,
        week,
        participant_id: predictions.finalist1,
        prediction_type: 'finalist1'
      })
    }

    if (predictions.finalist2) {
      predictionsToInsert.push({
        user_id: userId,
        week,
        participant_id: predictions.finalist2,
        prediction_type: 'finalist2'
      })
    }

    if (predictions.finalist3) {
      predictionsToInsert.push({
        user_id: userId,
        week,
        participant_id: predictions.finalist3,
        prediction_type: 'finalist3'
      })
    }

    // Insert new predictions if any exist
    if (predictionsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('predictions')
        .insert(predictionsToInsert)

      if (insertError) {
        console.error('Error inserting predictions:', insertError)
        throw insertError
      }
    }
  } catch (error) {
    console.error('Error in saveWeeklyPredictions:', error)
    throw error
  }
}

// Delete all predictions for a user
export async function deleteUserPredictions(userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('predictions')
      .delete()
      .eq('user_id', userId)

    if (error) {
      console.error('Error deleting user predictions:', error)
      throw error
    }
  } catch (error) {
    console.error('Error in deleteUserPredictions:', error)
    throw error
  }
}

// Get all predictions for a specific week (admin function)
export async function getAllWeekPredictions(week: number): Promise<PredictionWithParticipant[]> {
  try {
    const { data, error } = await supabase
      .from('predictions_with_participants')
      .select('*')
      .eq('week', week)
      .order('user_id')
      .order('prediction_type')

    if (error) {
      console.error('Error fetching all week predictions:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error in getAllWeekPredictions:', error)
    throw error
  }
}
