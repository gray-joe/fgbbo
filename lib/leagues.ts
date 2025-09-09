import { supabase } from './supabase'

export interface League {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  max_members: number;
  created_at: string;
  updated_at: string;
  invite_code: string;
}

export interface LeagueMember {
  id: string;
  league_id: string;
  user_id: string;
  joined_at: string;
  is_active: boolean;
}

export interface LeagueSummary {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  max_members: number;
  created_at: string;
  updated_at: string;
  owner_name: string;
  member_count: number;
  active_members: number;
}

export interface LeagueLeaderboardEntry {
  league_id: string;
  league_name: string;
  user_id: string;
  total_points: number;
  star_baker_points: number;
  technical_winner_points: number;
  eliminated_points: number;
  handshake_points: number;
  weekly_special_points: number;
  bonus_points: number;
  penalty_points: number;
  week: number;
  user_name: string;
  joined_at: string;
  position: number;
}

export interface UserLeague {
  league_id: string;
  league_name: string;
  league_description?: string;
  is_owner: boolean;
  member_count: number;
  active_members: number;
  user_position: number;
  user_total_points: number;
  invite_code: string;
}

export async function createLeague(
  name: string,
  description?: string,
  maxMembers: number = 50
): Promise<League> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const inviteCode = 'GBBO' + Math.random().toString(36).substring(2, 10).toUpperCase()

    const { data: leagueData, error: leagueError } = await supabase
      .from('leagues')
      .insert({
        name,
        description,
        owner_id: user.id,
        max_members: maxMembers,
        invite_code: inviteCode
      })
      .select()
      .single()

    if (leagueError) {
      console.error('Error creating league:', leagueError)
      throw leagueError
    }

    const { error: memberError } = await supabase
      .from('league_members')
      .insert({
        league_id: leagueData.id,
        user_id: user.id,
        is_active: true
      })

    if (memberError) {
      console.error('Error adding creator as member:', memberError)
      console.warn('League created but failed to add creator as member. League ID:', leagueData.id)
    }

    return leagueData
  } catch (error) {
    console.error('Error in createLeague:', error)
    throw error
  }
}

export async function getUserLeagues(): Promise<UserLeague[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data: memberships, error: membershipError } = await supabase
      .from('league_members')
      .select(`
        league_id,
        is_active,
        joined_at
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (membershipError) {
      console.error('Error fetching league memberships:', membershipError)
      throw membershipError
    }

    if (!memberships || memberships.length === 0) {
      return []
    }

    const leagueIds = memberships.map(m => m.league_id)
    const { data: leagues, error: leaguesError } = await supabase
      .from('leagues')
      .select('*')
      .in('id', leagueIds)

    if (leaguesError) {
      console.error('Error fetching leagues:', leaguesError)
      throw leaguesError
    }

    const userLeagues: UserLeague[] = []
    
    for (const league of leagues || []) {
      try {
        const leaderboard = await getLeagueLeaderboard(league.id)
        
        const userEntry = leaderboard.find(entry => entry.user_id === user.id)
        const userPosition = userEntry?.position || 0
        const userTotalPoints = userEntry?.total_points || 0

        userLeagues.push({
          league_id: league.id,
          league_name: league.name,
          league_description: league.description,
          is_owner: league.owner_id === user.id,
          member_count: 0,
          active_members: 0,
          user_position: userPosition,
          user_total_points: userTotalPoints,
          invite_code: league.invite_code
        })
      } catch (error) {
        console.error(`Error getting leaderboard for league ${league.id}:`, error)
        userLeagues.push({
          league_id: league.id,
          league_name: league.name,
          league_description: league.description,
          is_owner: league.owner_id === user.id,
          member_count: 0,
          active_members: 0,
          user_position: 0,
          user_total_points: 0,
          invite_code: league.invite_code
        })
      }
    }

    return userLeagues
  } catch (error) {
    console.error('Error in getUserLeagues:', error)
    throw error
  }
}

export async function getLeagueLeaderboard(leagueId: string): Promise<LeagueLeaderboardEntry[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data: membership, error: membershipError } = await supabase
      .from('league_members')
      .select('id')
      .eq('league_id', leagueId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (membershipError) {
      console.error('Error checking league membership:', membershipError)
      throw new Error('You are not a member of this league')
    }

    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('name')
      .eq('id', leagueId)
      .single()

    if (leagueError) {
      console.error('Error fetching league:', leagueError)
      throw new Error('League not found')
    }

    const { data: members, error: membersError } = await supabase
      .from('league_members')
      .select(`
        user_id,
        joined_at,
        is_active
      `)
      .eq('league_id', leagueId)
      .eq('is_active', true)

    if (membersError) {
      console.error('Error fetching league members:', membersError)
      throw membersError
    }

    if (!members || members.length === 0) {
      return []
    }

    const userIds = members.map(m => m.user_id)
    
    const { data: userScores, error: scoresError } = await supabase
      .from('user_scores')
      .select('*')
      .in('user_id', userIds)

    if (scoresError) {
      console.error('Error fetching user scores:', scoresError)
    }

    const { data: userProfiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('user_id, display_name')
      .in('user_id', userIds)

    if (profilesError) {
      console.error('Error fetching user profiles:', profilesError)
    }

    const scoresMap = new Map()
    userScores?.forEach(score => {
      const existing = scoresMap.get(score.user_id) || {
        total_points: 0,
        star_baker_points: 0,
        technical_winner_points: 0,
        eliminated_points: 0,
        handshake_points: 0,
        weekly_special_points: 0,
        bonus_points: 0,
        penalty_points: 0,
        week: 0
      }
      
      existing.total_points += score.total_points || 0
      existing.star_baker_points += score.star_baker_points || 0
      existing.technical_winner_points += score.technical_winner_points || 0
      existing.eliminated_points += score.eliminated_points || 0
      existing.handshake_points += score.handshake_points || 0
      existing.weekly_special_points += score.weekly_special_points || 0
      existing.bonus_points += score.bonus_points || 0
      existing.penalty_points += score.penalty_points || 0
      existing.week = Math.max(existing.week, score.week || 0)
      
      scoresMap.set(score.user_id, existing)
    })

    const leaderboardEntries: LeagueLeaderboardEntry[] = members.map(member => {
      const scores = scoresMap.get(member.user_id) || {
        total_points: 0,
        star_baker_points: 0,
        technical_winner_points: 0,
        eliminated_points: 0,
        handshake_points: 0,
        weekly_special_points: 0,
        bonus_points: 0,
        penalty_points: 0,
        week: 0
      }

      const userProfile = userProfiles?.find(p => p.user_id === member.user_id)
      const displayName = userProfile?.display_name || member.user_id.slice(0, 8) + '...'

      return {
        league_id: leagueId,
        league_name: league.name,
        user_id: member.user_id,
        total_points: scores.total_points,
        star_baker_points: scores.star_baker_points,
        technical_winner_points: scores.technical_winner_points,
        eliminated_points: scores.eliminated_points,
        handshake_points: scores.handshake_points,
        weekly_special_points: scores.weekly_special_points,
        bonus_points: scores.bonus_points,
        penalty_points: scores.penalty_points,
        week: scores.week,
        user_name: displayName,
        joined_at: member.joined_at,
        position: 0
      }
    })

    leaderboardEntries.sort((a, b) => {
      if (b.total_points !== a.total_points) {
        return b.total_points - a.total_points
      }
      if (b.star_baker_points !== a.star_baker_points) {
        return b.star_baker_points - a.star_baker_points
      }
      if (b.technical_winner_points !== a.technical_winner_points) {
        return b.technical_winner_points - a.technical_winner_points
      }
      if (b.eliminated_points !== a.eliminated_points) {
        return b.eliminated_points - a.eliminated_points
      }
      if (b.handshake_points !== a.handshake_points) {
        return b.handshake_points - a.handshake_points
      }
      return a.user_name.localeCompare(b.user_name)
    })

    leaderboardEntries.forEach((entry, index) => {
      entry.position = index + 1
    })

    return leaderboardEntries
  } catch (error) {
    console.error('Error in getLeagueLeaderboard:', error)
    throw error
  }
}

export async function joinLeagueByInviteCode(inviteCode: string): Promise<{ success: boolean; message: string; leagueId?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('*')
      .eq('invite_code', inviteCode)
      .single()

    if (leagueError) {
      if (leagueError.code === 'PGRST116') {
        return { success: false, message: 'Invalid invite code. Please check the code and try again.' }
      }
      console.error('Error finding league:', leagueError)
      throw leagueError
    }

    const { data: existingMembership, error: membershipCheckError } = await supabase
      .from('league_members')
      .select('id, is_active')
      .eq('league_id', league.id)
      .eq('user_id', user.id)
      .single()

    if (membershipCheckError && membershipCheckError.code !== 'PGRST116') {
      console.error('Error checking existing membership:', membershipCheckError)
      throw membershipCheckError
    }

    if (existingMembership) {
      if (existingMembership.is_active) {
        return { success: false, message: 'You are already a member of this league.' }
      } else {
        const { error: reactivateError } = await supabase
          .from('league_members')
          .update({ is_active: true })
          .eq('id', existingMembership.id)

        if (reactivateError) {
          console.error('Error reactivating membership:', reactivateError)
          throw reactivateError
        }

        return { 
          success: true, 
          message: 'Welcome back! Your membership has been reactivated.',
          leagueId: league.id
        }
      }
    }

    const { data: memberCount, error: countError } = await supabase
      .from('league_members')
      .select('id', { count: 'exact' })
      .eq('league_id', league.id)
      .eq('is_active', true)

    if (countError) {
      console.error('Error checking member count:', countError)
      throw countError
    }

    if (memberCount && memberCount.length >= league.max_members) {
      return { success: false, message: 'This league is full. Please try another league.' }
    }

    const { error: joinError } = await supabase
      .from('league_members')
      .insert({
        league_id: league.id,
        user_id: user.id,
        is_active: true
      })

    if (joinError) {
      console.error('Error joining league:', joinError)
      throw joinError
    }

    return { 
      success: true, 
      message: `Successfully joined "${league.name}"!`,
      leagueId: league.id
    }

  } catch (error) {
    console.error('Error in joinLeagueByInviteCode:', error)
    throw error
  }
}
