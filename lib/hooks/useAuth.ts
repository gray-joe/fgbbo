'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../supabase'
import { UserProfile, signUp, signIn, signOut, getUserProfile, isUserAdmin } from '../auth'
import type { User } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Function to fetch user profile
  const fetchUserProfile = async (user: User) => {
    try {
      const userProfile = await getUserProfile(user)
      setProfile(userProfile)
    } catch (err) {
      console.error('Error fetching user profile:', err)
      // Set a basic profile from user metadata as fallback
      setProfile({
        id: user.id,
        email: user.email || '',
        full_name: user.user_metadata?.full_name || '',
        username: user.user_metadata?.username || '',
        display_name: user.user_metadata?.display_name || '',
        is_admin: user.user_metadata?.is_admin || false,
        created_at: user.created_at
      })
    }
  }

  useEffect(() => {
    // Get initial user
    const getInitialUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
        if (user) {
          await fetchUserProfile(user)
        }
      } catch (err) {
        setError('Failed to get user')
        console.error('Error getting user:', err)
      } finally {
        setLoading(false)
      }
    }

    getInitialUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Filter out events that shouldn't trigger loading states
        const shouldShowLoading = ['SIGNED_IN', 'SIGNED_OUT'].includes(event)
        const shouldUpdateUser = ['SIGNED_IN', 'SIGNED_OUT', 'TOKEN_REFRESHED', 'USER_UPDATED'].includes(event)
        
        if (shouldShowLoading) {
          setLoading(true)
        }
        
        if (shouldUpdateUser) {
          if (session?.user) {
            setUser(session.user)
            await fetchUserProfile(session.user)
          } else {
            setUser(null)
            setProfile(null)
          }
        }
        
        if (shouldShowLoading) {
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const handleSignUp = async (email: string, password: string, fullName?: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const { user: newUser, error } = await signUp(email, password, fullName)
      if (error) {
        setError(error.message)
        return { success: false, error: error.message }
      }
      
      if (newUser) {
        setUser(newUser)
        await fetchUserProfile(newUser)
        return { success: true, user: newUser }
      }
      
      return { success: false, error: 'Signup failed' }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Signup failed'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const handleSignIn = async (email: string, password: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const { user: signedInUser, error } = await signIn(email, password)
      if (error) {
        setError(error.message)
        return { success: false, error: error.message }
      }
      
      if (signedInUser) {
        setUser(signedInUser)
        await fetchUserProfile(signedInUser)
        return { success: true, user: signedInUser }
      }
      
      return { success: false, error: 'Sign in failed' }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sign in failed'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const { error } = await signOut()
      if (error) {
        setError(error.message)
        return { success: false, error: error.message }
      }
      
      setUser(null)
      setProfile(null)
      
      // Redirect to homepage after successful logout
      router.push('/')
      
      return { success: true }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sign out failed'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const isAuthenticated = !!user
  const isAdmin = isUserAdmin(user)

  return {
    user,
    profile,
    loading,
    error,
    isAuthenticated,
    isAdmin,
    signUp: handleSignUp,
    signIn: handleSignIn,
    signOut: handleSignOut,
    clearError: () => setError(null)
  }
}
