import { supabase } from './supabase'
import { User, AuthError } from '@supabase/supabase-js'

export interface UserProfile {
  id: string
  email: string
  full_name?: string
  username?: string
  display_name?: string
  is_admin: boolean
  created_at: string
}

export interface AuthUser {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  error: string | null
}

// Sign up with email and password
export async function signUp(email: string, password: string, fullName?: string): Promise<{ user: User | null; error: AuthError | null }> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        is_admin: false, // Default to regular user
      }
    }
  })
  
  if (data.user && !error) {
    // Create user profile in user_profiles table
    try {
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          user_id: data.user.id,
          display_name: fullName || email.split('@')[0] // Use email prefix as default display name
        })
      
      if (profileError) {
        console.error('Error creating user profile:', profileError)
        // Don't fail signup if profile creation fails
      }
    } catch (profileErr) {
      console.error('Error creating user profile:', profileErr)
      // Don't fail signup if profile creation fails
    }
  }
  
  return { user: data.user, error }
}

// Sign in with email and password
export async function signIn(email: string, password: string): Promise<{ user: User | null; error: AuthError | null }> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  
  return { user: data.user, error }
}

// Sign out
export async function signOut(): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.signOut()
  return { error }
}

// Get current user
export async function getCurrentUser(): Promise<User | null> {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// Get user profile from user_profiles table and metadata
export async function getUserProfile(user: User | null): Promise<UserProfile | null> {
  if (!user) return null
  
  try {
    // Try to get profile from user_profiles table first
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('display_name')
      .eq('user_id', user.id)
      .single()
    
    let displayName = user.user_metadata?.display_name || ''
    
    if (!profileError && profileData) {
      displayName = profileData.display_name
    }
    
    return {
      id: user.id,
      email: user.email || '',
      full_name: user.user_metadata?.full_name || '',
      username: user.user_metadata?.username || '',
      display_name: displayName,
      is_admin: user.user_metadata?.is_admin || false,
      created_at: user.created_at
    }
  } catch (error) {
    console.error('Error fetching user profile:', error)
    // Fallback to metadata only
    return {
      id: user.id,
      email: user.email || '',
      full_name: user.user_metadata?.full_name || '',
      username: user.user_metadata?.username || '',
      display_name: user.user_metadata?.display_name || '',
      is_admin: user.user_metadata?.is_admin || false,
      created_at: user.created_at
    }
  }
}

// Update user profile
export async function updateUserProfile(updates: Partial<UserProfile>): Promise<{ error: any }> {
  try {
    // Update user_profiles table if display_name is being updated
    if (updates.display_name && updates.display_name.trim()) {
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: updates.id!,
          display_name: updates.display_name.trim()
        }, {
          onConflict: 'user_id'
        })
      
      if (profileError) {
        console.error('Error updating user profile:', profileError)
        return { error: profileError }
      }
    }
    
    // Update auth metadata for other fields
    const metadataUpdates: any = {}
    if (updates.full_name !== undefined) metadataUpdates.full_name = updates.full_name
    if (updates.username !== undefined) metadataUpdates.username = updates.username
    
    if (Object.keys(metadataUpdates).length > 0) {
      const { error: authError } = await supabase.auth.updateUser({
        data: metadataUpdates
      })
      
      if (authError) {
        return { error: authError }
      }
    }
    
    return { error: null }
  } catch (error) {
    console.error('Error updating user profile:', error)
    return { error: error }
  }
}

// Check if user is admin
export function isUserAdmin(user: User | null): boolean {
  return user?.user_metadata?.is_admin || false
}

// Reset password
export async function resetPassword(email: string): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.resetPasswordForEmail(email)
  return { error }
}

// Update password
export async function updatePassword(newPassword: string): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.updateUser({
    password: newPassword
  })
  
  return { error }
}

// Listen to auth state changes
export function onAuthStateChange(callback: (event: string, session: any) => void) {
  return supabase.auth.onAuthStateChange(callback)
}
