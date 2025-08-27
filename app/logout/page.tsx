'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../lib/hooks/useAuth'

export default function LogoutPage() {
  const { signOut } = useAuth()
  const router = useRouter()

  useEffect(() => {
    const performLogout = async () => {
      await signOut()
      router.push('/')
    }
    
    performLogout()
  }, [signOut, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pastel-blue to-pastel-pink">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-pastel-blue mx-auto mb-4"></div>
        <p className="text-gray-700 text-lg">Signing you out...</p>
      </div>
    </div>
  )
}
