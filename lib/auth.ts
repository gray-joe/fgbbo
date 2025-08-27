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

// Get user profile from metadata
export function getUserProfile(user: User | null): UserProfile | null {
  if (!user) return null
  
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

// Update user profile
export async function updateUserProfile(updates: Partial<UserProfile>): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.updateUser({
    data: updates
  })
  
  return { error }
}

// Check if user is admin
export function isUserAdmin(user: User | null): boolean {
  return user?.user_metadata?.is_admin || false
}

// Update admin status (only for existing admins)
export async function updateAdminStatus(userId: string, isAdmin: boolean): Promise<{ error: AuthError | null }> {
  // This would typically be done through a secure admin API
  // For now, we'll update the user's metadata directly
  const { error } = await supabase.auth.admin.updateUserById(userId, {
    user_metadata: { is_admin: isAdmin }
  })
  
  return { error }
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
