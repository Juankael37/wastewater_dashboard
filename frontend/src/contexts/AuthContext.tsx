import React, { createContext, useContext, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { authApi } from '../services/api'

// Types
interface User {
  id: string
  username: string
  email?: string
  full_name?: string
  role: 'admin' | 'operator' | 'client'
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  signIn: (username: string, password: string) => Promise<void>
  signUp: (username: string, password: string, email?: string) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  checkAuth: () => Promise<boolean>
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const getRoleFromUser = (apiUser: any): 'admin' | 'operator' | 'client' => {
    const rawRole = apiUser?.user_metadata?.role || apiUser?.profile?.role || 'operator'
    if (rawRole === 'admin' || rawRole === 'client' || rawRole === 'operator') {
      return rawRole
    }
    return 'operator'
  }

  const getDisplayName = (apiUser: any): string => {
    return (
      apiUser?.profile?.full_name ||
      apiUser?.user_metadata?.full_name ||
      apiUser?.email ||
      'user'
    )
  }

  // Check for existing session on mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        setIsLoading(true)
        const authStatus = await authApi.checkAuth()
        
        if (authStatus.authenticated && authStatus.user) {
          const role = getRoleFromUser(authStatus.user)
          const email = authStatus.user.email || ''
          const fullName = getDisplayName(authStatus.user)
          setUser({
            id: authStatus.user.id,
            username: fullName,
            email,
            full_name: fullName,
            role: role as 'admin' | 'operator' | 'client'
          })
        } else {
          setUser(null)
        }
      } catch (error) {
        console.error('Auth check error:', error)
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuthStatus()

    // Check auth status every 5 minutes
    const interval = setInterval(checkAuthStatus, 5 * 60 * 1000)
    
    return () => {
      clearInterval(interval)
    }
  }, [])

  // Sign in function
  const signIn = async (usernameOrEmail: string, password: string) => {
    try {
      setIsLoading(true)
      const response = await authApi.login(usernameOrEmail, password)
      const role = getRoleFromUser(response.user)
      const email = response.user?.email || usernameOrEmail
      const fullName = getDisplayName(response.user)
      setUser({
        id: response.user?.id,
        username: fullName,
        email,
        full_name: fullName,
        role,
      })
      toast.success('Signed in successfully')
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign in')
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  // Sign up function
  const signUp = async (
    username: string,
    password: string,
    email?: string
  ) => {
    try {
      setIsLoading(true)
      const registrationEmail = email || username
      await authApi.register(registrationEmail, password, username, 'operator')
      toast.success('Account created successfully! You can now sign in.')
    } catch (error: any) {
      toast.error(error.message || 'Failed to create account')
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  // Sign out function
  const signOut = async () => {
    try {
      setIsLoading(true)
      await authApi.logout()
      setUser(null)
      toast.success('Signed out successfully')
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign out')
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  // Reset password function
  const resetPassword = async (_email: string) => {
    try {
      // Note: Flask backend doesn't have password reset yet
      // This is a placeholder for future implementation
      toast.success('Password reset feature coming soon')
      // throw new Error('Password reset not implemented')
    } catch (error: any) {
      toast.error(error.message || 'Failed to send reset email')
      throw error
    }
  }

  // Check auth status
  const checkAuth = async (): Promise<boolean> => {
    try {
      const authStatus = await authApi.checkAuth()
      if (authStatus.authenticated && authStatus.user && !user) {
        const role = getRoleFromUser(authStatus.user)
        const email = authStatus.user.email || ''
        const fullName = getDisplayName(authStatus.user)
        setUser({
          id: authStatus.user.id,
          username: fullName,
          email,
          full_name: fullName,
          role
        })
      } else if (!authStatus.authenticated && user) {
        setUser(null)
      }
      return authStatus.authenticated
    } catch (error) {
      console.error('Auth check error:', error)
      return false
    }
  }

  // Context value
  const value = {
    user,
    isLoading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    checkAuth,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}