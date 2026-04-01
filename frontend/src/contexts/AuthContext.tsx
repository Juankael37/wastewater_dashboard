import React, { createContext, useContext, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { authApi } from '../services/api'

// Types
interface User {
  id: number
  username: string
  email?: string
  role?: string
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

  // Check for existing session on mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        setIsLoading(true)
        const authStatus = await authApi.checkAuth()
        
        if (authStatus.authenticated && authStatus.username) {
          setUser({
            id: 1, // This would come from the backend in a real implementation
            username: authStatus.username,
            role: 'operator' // Default role, would come from backend
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
  const signIn = async (username: string, password: string) => {
    try {
      setIsLoading(true)
      await authApi.login(username, password)
      
      // After successful login, check auth status
      const authStatus = await authApi.checkAuth()
      
      if (authStatus.authenticated && authStatus.username) {
        setUser({
          id: 1,
          username: authStatus.username,
          role: 'operator'
        })
        toast.success('Signed in successfully')
      } else {
        throw new Error('Authentication failed')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign in')
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  // Sign up function
  const signUp = async (username: string, password: string, email?: string) => {
    try {
      setIsLoading(true)
      await authApi.register(username, password, email)
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
  const resetPassword = async (email: string) => {
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
      if (authStatus.authenticated && authStatus.username && !user) {
        setUser({
          id: 1,
          username: authStatus.username,
          role: 'operator'
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