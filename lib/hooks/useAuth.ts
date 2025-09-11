'use client'

import { useState, useEffect, useRef } from 'react'
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
  
  // Use ref to track current user state in auth event handlers
  const userRef = useRef<User | null>(null)

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
        userRef.current = user
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
        // Only show loading for actual sign in/out events, but not if user is already authenticated
        const shouldShowLoading = ['SIGNED_IN', 'SIGNED_OUT'].includes(event) && !userRef.current
        
        if (shouldShowLoading) {
          setLoading(true)
        }
        
        // Handle different event types
        switch (event) {
          case 'SIGNED_IN':
            // Only handle SIGNED_IN if we don't already have a user
            if (!userRef.current && session?.user) {
              setUser(session.user)
              userRef.current = session.user
              await fetchUserProfile(session.user)
            }
            setLoading(false)
            break
            
          case 'SIGNED_OUT':
            setUser(null)
            setProfile(null)
            userRef.current = null
            setLoading(false)
            break
            
          case 'TOKEN_REFRESHED':
          case 'USER_UPDATED':
            // Update user data without showing loading state
            if (session?.user) {
              setUser(session.user)
              userRef.current = session.user
              // Always fetch profile for these events to keep data fresh
              await fetchUserProfile(session.user)
            }
            break
            
          default:
            // For any other events, just update user data without loading state
            if (session?.user) {
              setUser(session.user)
              userRef.current = session.user
            } else {
              setUser(null)
              setProfile(null)
              userRef.current = null
            }
            break
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
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
  const isAdmin = profile?.is_admin || false

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
