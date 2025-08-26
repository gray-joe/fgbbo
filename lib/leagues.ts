import { supabase } from './supabase'

export interface League {
  id: string
  name: string
  description?: string
  owner_id: string
  max_members: number
  created_at?: string
  updated_at?: string
}

export interface LeagueWithOwner extends League {
  owner_name: string
}

export interface LeagueMember {
  id: string
  league_id: string
  user_id: string
  joined_at?: string
  is_active: boolean
}

export interface LeagueMemberWithDetails extends LeagueMember {
  user_name: string
}

export interface LeagueSummary {
  id: string
  name: string
  description?: string
  owner_id: string
  max_members: number
  created_at?: string
  updated_at?: string
  owner_display_name: string
  member_count: number
  active_members: number
}

export interface LeagueLeaderboardEntry {
  league_id: string
  user_id: string
  total_points: number
  star_baker_points: number
  technical_winner_points: number
  eliminated_points: number
  handshake_points: number
  weekly_special_points: number
  bonus_points: number
  position: number
  user_display_name: string
}

export interface UserLeague {
  league_id: string
  league_name: string
  league_description?: string
  is_owner: boolean
  member_count: number
  active_members: number
  user_position: number
  user_total_points: number
}

// Create a new league
export async function createLeague(
  name: string,
  description?: string,
  maxMembers: number = 50
): Promise<League> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('leagues')
      .insert({
        name,
        description,
        owner_id: user.id,

        max_members: maxMembers
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating league:', error)
      throw error
    }

    // Automatically add the creator as a member
    await joinLeague(data.id)

    return data
  } catch (error) {
    console.error('Error in createLeague:', error)
    throw error
  }
}



// Get user's leagues
export async function getUserLeagues(): Promise<UserLeague[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .rpc('get_user_leagues', { user_uuid: user.id })

    if (error) {
      console.error('Error fetching user leagues:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error in getUserLeagues:', error)
    throw error
  }
}

// Get league details
export async function getLeague(leagueId: string): Promise<LeagueSummary> {
  try {
    const { data, error } = await supabase
      .from('league_summary')
      .select('*')
      .eq('id', leagueId)
      .single()

    if (error) {
      console.error('Error fetching league:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Error in getLeague:', error)
    throw error
  }
}

// Join a league
export async function joinLeague(leagueId: string): Promise<LeagueMember> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Check if league is full
    const league = await getLeague(leagueId)
    if (league.active_members >= league.max_members) {
      throw new Error('League is full')
    }

    const { data, error } = await supabase
      .from('league_members')
      .insert({
        league_id: leagueId,
        user_id: user.id
      })
      .select()
      .single()

    if (error) {
      console.error('Error joining league:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Error in joinLeague:', error)
    throw error
  }
}

// Leave a league
export async function leaveLeague(leagueId: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { error } = await supabase
      .from('league_members')
      .update({ is_active: false })
      .eq('league_id', leagueId)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error leaving league:', error)
      throw error
    }
  } catch (error) {
    console.error('Error in leaveLeague:', error)
    throw error
  }
}

// Get league leaderboard
export async function getLeagueLeaderboard(leagueId: string): Promise<LeagueLeaderboardEntry[]> {
  try {
    const { data, error } = await supabase
      .from('league_leaderboard')
      .select('*')
      .eq('league_id', leagueId)
      .order('position', { ascending: true })

    if (error) {
      console.error('Error fetching league leaderboard:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error in getLeagueLeaderboard:', error)
    throw error
  }
}

// Get league members
export async function getLeagueMembers(leagueId: string): Promise<LeagueMemberWithDetails[]> {
  try {
    const { data, error } = await supabase
      .from('league_members_with_details')
      .select('*')
      .eq('league_id', leagueId)
      .eq('is_active', true)
      .order('joined_at', { ascending: true })

    if (error) {
      console.error('Error fetching league members:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error in getLeagueMembers:', error)
    throw error
  }
}

// Update league details (owner only)
export async function updateLeague(
  leagueId: string,
  updates: Partial<Pick<League, 'name' | 'description' | 'max_members'>>
): Promise<League> {
  try {
    const { data, error } = await supabase
      .from('leagues')
      .update(updates)
      .eq('id', leagueId)
      .select()
      .single()

    if (error) {
      console.error('Error updating league:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Error in updateLeague:', error)
    throw error
  }
}

// Delete league (owner only)
export async function deleteLeague(leagueId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('leagues')
      .delete()
      .eq('id', leagueId)

    if (error) {
      console.error('Error deleting league:', error)
      throw error
    }
  } catch (error) {
    console.error('Error in deleteLeague:', error)
    throw error
  }
}

// Remove member from league (owner only)
export async function removeLeagueMember(leagueId: string, userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('league_members')
      .update({ is_active: false })
      .eq('league_id', leagueId)
      .eq('user_id', userId)

    if (error) {
      console.error('Error removing league member:', error)
      throw error
    }
  } catch (error) {
    console.error('Error in removeLeagueMember:', error)
    throw error
  }
}

// Check if user is league owner
export async function isLeagueOwner(leagueId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const league = await getLeague(leagueId)
    return league.owner_id === user.id
  } catch (error) {
    console.error('Error in isLeagueOwner:', error)
    return false
  }
}

// Check if user is league member
export async function isLeagueMember(leagueId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { data, error } = await supabase
      .from('league_members')
      .select('id')
      .eq('league_id', leagueId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error checking league membership:', error)
      throw error
    }

    return !!data
  } catch (error) {
    console.error('Error in isLeagueMember:', error)
    return false
  }
}
