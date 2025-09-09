import { supabase } from './supabase'

export interface UserScore {
  id: string
  user_id: string
  week: number
  total_points: number
  star_baker_points: number
  technical_winner_points: number
  eliminated_points: number
  handshake_points: number
  weekly_special_points: number
  bonus_points: number
  penalty_points: number
  created_at?: string
  updated_at?: string
}

export interface UserScoreWithDetails extends UserScore {
  user_name: string
}

export interface ScoringConfig {
  id: string
  category: string
  points: number
  description: string
}

// Get all scores for a specific user
export async function getUserScores(userId: string): Promise<UserScore[]> {
  try {
    const { data, error } = await supabase
      .from('user_scores')
      .select('*')
      .eq('user_id', userId)
      .order('week', { ascending: true })

    if (error) {
      console.error('Error fetching user scores:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error in getUserScores:', error)
    throw error
  }
}

// Get scores for a specific week
export async function getWeekScores(week: number): Promise<UserScoreWithDetails[]> {
  try {
    const { data, error } = await supabase
      .from('user_scores_with_details')
      .select('*')
      .eq('week', week)
      .order('total_points', { ascending: false })

    if (error) {
      console.error('Error fetching week scores:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error in getWeekScores:', error)
    throw error
  }
}

// Get all scores across all weeks (leaderboard)
export async function getLeaderboard(): Promise<UserScoreWithDetails[]> {
  try {
    const { data, error } = await supabase
      .from('user_scores_with_details')
      .select('*')
      .order('total_points', { ascending: false })

    if (error) {
      console.error('Error fetching leaderboard:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error in getLeaderboard:', error)
    throw error
  }
}

// Get leaderboard with user positions
export async function getLeaderboardWithPositions(): Promise<Array<UserScoreWithDetails & { position: number }>> {
  try {
    const { data, error } = await supabase
      .from('user_scores_with_details')
      .select('*')
      .order('total_points', { ascending: false })

    if (error) {
      console.error('Error fetching leaderboard with positions:', error)
      throw error
    }

    // Calculate positions (handle ties)
    const leaderboard = (data || []).map((score, index) => {
      let position = index + 1;
      
      // Handle ties - if previous score is the same, use same position
      if (index > 0 && data![index - 1].total_points === score.total_points) {
        position = (data as any)[index - 1].position;
      }
      
      return {
        ...score,
        position
      };
    });

    return leaderboard;
  } catch (error) {
    console.error('Error in getLeaderboardWithPositions:', error)
    throw error
  }
}

// Get user's league position
export async function getUserLeaguePosition(userId: string): Promise<{ position: number; totalPlayers: number } | null> {
  try {
    const leaderboard = await getLeaderboardWithPositions();
    const userPosition = leaderboard.find(entry => entry.user_id === userId);
    
    if (!userPosition) {
      return null;
    }

    return {
      position: userPosition.position,
      totalPlayers: leaderboard.length
    };
  } catch (error) {
    console.error('Error in getUserLeaguePosition:', error)
    throw error
  }
}

// Get user's league position within their primary league
export async function getUserPrimaryLeaguePosition(userId: string): Promise<{ position: number; totalPlayers: number; leagueName: string } | null> {
  try {
    // First, get the user's leagues using the RPC function
    const { data: userLeagues, error: leaguesError } = await supabase
      .rpc('get_user_leagues', { user_uuid: userId });

    if (leaguesError) {
      console.error('Error fetching user leagues:', leaguesError);
      return null;
    }

    if (!userLeagues || userLeagues.length === 0) {
      return null; // User is not in any leagues
    }

    // Get the first league (primary league) and its position
    const primaryLeague = userLeagues[0];
    
    return {
      position: primaryLeague.user_position || 0,
      totalPlayers: primaryLeague.active_members || 0,
      leagueName: primaryLeague.league_name || 'Unknown League'
    };
  } catch (error) {
    console.error('Error in getUserPrimaryLeaguePosition:', error);
    return null;
  }
}

// Calculate scores for a specific week
export async function calculateWeekScores(week: number): Promise<void> {
  try {
    const { error } = await supabase
      .rpc('calculate_week_scores', { target_week: week })

    if (error) {
      console.error('Error calculating week scores:', error)
      throw error
    }
  } catch (error) {
    console.error('Error in calculateWeekScores:', error)
    throw error
  }
}

// Get scoring configuration
export async function getScoringConfig(): Promise<ScoringConfig[]> {
  try {
    const { data, error } = await supabase
      .from('scoring_config')
      .select('*')
      .order('points', { ascending: false })

    if (error) {
      console.error('Error fetching scoring config:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error in getScoringConfig:', error)
    throw error
  }
}

// Update scoring configuration (admin only)
export async function updateScoringConfig(
  category: string, 
  points: number
): Promise<ScoringConfig> {
  try {
    const { data, error } = await supabase
      .from('scoring_config')
      .update({ points })
      .eq('category', category)
      .select()
      .single()

    if (error) {
      console.error('Error updating scoring config:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Error in updateScoringConfig:', error)
    throw error
  }
}

// Get user's total score across all weeks
export async function getUserTotalScore(userId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('user_scores')
      .select('total_points')
      .eq('user_id', userId)

    if (error) {
      console.error('Error fetching user total score:', error)
      throw error
    }

    return data?.reduce((sum, score) => sum + score.total_points, 0) || 0
  } catch (error) {
    console.error('Error in getUserTotalScore:', error)
    throw error
  }
}

// Get user's weekly breakdown
export async function getUserWeeklyBreakdown(userId: string): Promise<{
  week: number
  total_points: number
  breakdown: {
    star_baker: number
    technical_winner: number
    eliminated: number
    handshake: number
    weekly_special: number
    bonus: number
    penalty: number
  }
}[]> {
  try {
    const scores = await getUserScores(userId)
    
    return scores.map(score => ({
      week: score.week,
      total_points: score.total_points,
      breakdown: {
        star_baker: score.star_baker_points,
        technical_winner: score.technical_winner_points,
        eliminated: score.eliminated_points,
        handshake: score.handshake_points,
        weekly_special: score.weekly_special_points,
        bonus: score.bonus_points,
        penalty: score.penalty_points
      }
    }))
  } catch (error) {
    console.error('Error in getUserWeeklyBreakdown:', error)
    throw error
  }
}
