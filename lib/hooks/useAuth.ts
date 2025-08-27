'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { UserProfile, signUp, signIn, signOut, getUserProfile, isUserAdmin } from '../auth'
import type { User } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Get initial user
    const getInitialUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
        if (user) {
          setProfile(getUserProfile(user))
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
        setLoading(true)
        if (session?.user) {
          setUser(session.user)
          setProfile(getUserProfile(session.user))
        } else {
          setUser(null)
          setProfile(null)
        }
        setLoading(false)
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
        setProfile(getUserProfile(newUser))
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
        setProfile(getUserProfile(signedInUser))
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
